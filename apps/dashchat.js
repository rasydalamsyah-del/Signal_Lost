/* ============================================================
   apps/dashchat.js
   The main gameplay app. Two views sharing one route:
   - list view  (no params)            -> conversation list
   - thread view (params.chatId)       -> story-driven conversation

   Thread view is entirely driven by core/story.js: this file only
   owns the DOM (typing animation, choice buttons, enabling/disabling
   the text box) and calls into Story for "what happens next".
   ============================================================ */
(function () {

  // shared condition evaluator for node.skipTo — supports:
  //   { when:'allFilled', paths:[...], next }   — every profile path has a value
  //   { when:'flag', flag:'x', equals:true, next } — a story flag matches
  //   { when:'neglect', charId:'char_x', gte:50, next } — that character's
  //     neglect score (Story.computeNeglect) is at/above threshold —
  //     see RANCANGAN_MULTI_KARAKTER.md §5
  //   { when:'jobOverlap', charId:'char_x', next } — player's settled
  //     job matches that character's profession — see §4
  //   { when:'profileEquals', path:'profile.x', equals:val, next } —
  //     generic profile-path equality check (used for the gender-based
  //     starter-picker routing, RANCANGAN_MULTI_KARAKTER.md §10.2)
  //   { when:'charStatGte', charId, stat, gte, next } — that character's
  //     OWN stat (love/trust/jealousy/mood) is at/above threshold —
  //     used to gate persistent job-posting unlocks, see §10.3
  function evalCondition(cond) {
    if (!cond) return false;
    if (cond.when === 'allFilled') {
      const paths = cond.paths || [];
      return paths.length > 0 && paths.every(p => !!AppState.getPath(p));
    }
    if (cond.when === 'flag') {
      return AppState.get().flags[cond.flag] === cond.equals;
    }
    if (cond.when === 'neglect') {
      return Story.computeNeglect(cond.charId) >= (cond.gte || 0);
    }
    if (cond.when === 'jobOverlap') {
      return Story.hasJobOverlap(cond.charId);
    }
    if (cond.when === 'profileEquals') {
      return AppState.getPath(cond.path) === cond.equals;
    }
    if (cond.when === 'charStatGte') {
      const c = AppState.get().characters[cond.charId];
      return !!c && (c.stats[cond.stat] || 0) >= (cond.gte || 0);
    }
    return false;
  }

  // in-game clock timestamp for a chat bubble — NOT the real device
  // clock. Keeps message times consistent with the fictional,
  // ambient-ticking clock (see core/state.js AppState.tick() and
  // RANCANGAN_MULTI_KARAKTER.md §2).
  function pad2(n) { return n.toString().padStart(2, '0'); }
  function gameTimeStamp() {
    const t = AppState.get().phone.time;
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }

  function renderList(root) {
    const s = AppState.get();
    const chatIds = Object.keys(s.chats);

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>DashChat</h1>
          <span class="app-header-sub">${chatIds.length} percakapan</span>
        </div>
        <div class="app-body" id="chat-list"></div>
      </div>
    `;

    const list = root.querySelector('#chat-list');
    if (chatIds.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.dashchat}</div><p>Belum ada percakapan.</p></div>`;
      return;
    }

    chatIds.forEach(id => {
      const chat = s.chats[id];
      const last = chat.messages[chat.messages.length - 1];
      const contact = s.contacts.find(c => c.id === id);
      const row = document.createElement('div');
      row.className = 'list-item';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="avatar">${chat.name[0] || '?'}</div>
        <div class="list-item-main">
          <div class="list-item-title">${chat.name} ${contact && contact.isNew ? '<span style="color:var(--interference);font-size:10px">● baru</span>' : ''}</div>
          <div class="list-item-sub">${last ? last.text : 'Ketuk untuk mulai...'}</div>
        </div>
        <div class="list-item-meta">${last ? last.time : ''}</div>
      `;
      row.addEventListener('click', () => {
        if (contact) contact.isNew = false;
        Router.navigate('dashchat', { chatId: id });
      });
      list.appendChild(row);
    });
  }

  function renderThread(root, chatId) {
    const s = AppState.get();
    const chat = s.chats[chatId];
    if (!chat) return renderList(root);

    // clear the "new" flag the moment this thread is actually opened,
    // regardless of how the player got here (list row tap, or a
    // notification banner tap that jumps straight in)
    const openedContact = s.contacts.find(c => c.id === chatId);
    if (openedContact && openedContact.isNew) { openedContact.isNew = false; AppState.touch(); }

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>${chat.name}</h1>
          <span class="app-header-sub">online</span>
        </div>
        <div class="app-body">
          <div class="chat-messages" id="chat-messages"></div>
          <div class="chat-tap-hint hidden" id="chat-tap-hint">ketuk di mana aja buat lanjut</div>
        </div>
        <div class="chat-choices" id="chat-choices"></div>
        <div class="chat-input-row" id="chat-input-row">
          <input class="chat-input" id="chat-input" type="text" placeholder="Pilih salah satu opsi di atas..." disabled>
          <button class="chat-send" id="chat-send">${ICONS.send}</button>
        </div>
      </div>
    `;

    const msgsEl = root.querySelector('#chat-messages');
    const choicesEl = root.querySelector('#chat-choices');
    const inputRowEl = root.querySelector('#chat-input-row');
    const inputEl = root.querySelector('#chat-input');
    const sendBtn = root.querySelector('#chat-send');

    const bodyEl = root.querySelector('.app-body');
    const tapHintEl = root.querySelector('#chat-tap-hint');

    let isTyping = false;
    let pendingInput = null; // the current node's `input` spec, while we're waiting on it
    let tapTarget = null;    // node id to advance to on next tap-anywhere, while node.holdUntilTap is active
    const myGen = Router.generation(); // snapshot: any navigation (even dashchat -> dashchat
                                        // with a different chatId) bumps this, so async
                                        // callbacks below know to stop touching this DOM

    // Story threads have a matching entry in AppState.story.threads; chats
    // without one (shouldn't normally happen) just behave like a static log.
    const hasStory = !!Story.threadState(chatId);

    function stillHere() {
      return Router.generation() === myGen;
    }

    function showTapHint(nextNodeId) {
      tapTarget = nextNodeId;
      tapHintEl.classList.remove('hidden');
    }

    bodyEl.addEventListener('click', () => {
      if (!tapTarget) return;
      const next = tapTarget;
      tapTarget = null;
      tapHintEl.classList.add('hidden');
      enterNode(next);
    });

    function paint() {
      const bubbles = chat.messages.map(m => `
        <div class="bubble ${m.from === 'me' ? 'bubble-me' : 'bubble-them'}">${m.text}</div>
      `).join('');
      const typingBubble = isTyping
        ? `<div class="typing-dots" aria-label="sedang mengetik"><span></span><span></span><span></span></div>`
        : '';
      msgsEl.innerHTML = bubbles + typingBubble;
      root.querySelector('.app-body').scrollTop = msgsEl.scrollHeight;
    }

    function setInputEnabled(enabled, placeholder) {
      inputEl.disabled = !enabled;
      inputEl.placeholder = placeholder || (enabled ? 'Tulis pesan...' : 'Pilih salah satu opsi di atas...');
      inputRowEl.classList.toggle('chat-input-row-disabled', !enabled);
      if (enabled) inputEl.focus();
    }

    function renderChoices(choices) {
      if (!choices || !choices.length) { choicesEl.innerHTML = ''; return; }
      choicesEl.innerHTML = choices.map((c, i) => `
        <button class="chat-choice-btn" data-i="${i}">${Story.resolveText(c.label)}</button>
      `).join('');
      choicesEl.querySelectorAll('.chat-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.i, 10);
          choicesEl.innerHTML = '';
          pickChoice(choices[i]);
        });
      });
    }

    function pickChoice(choice) {
      AppState.tick(1); // sending something moves the ambient clock forward a bit
      Story.recordInteraction(chatId); // no-op unless chatId is one of the 10 characters
      const time = gameTimeStamp();
      chat.messages.push({ from: 'me', text: Story.resolveText(choice.label), time });
      paint();
      Story.runEffects(chatId, choice.effects);
      AppState.touch();
      setTimeout(() => { if (stillHere()) enterNode(choice.next); }, 350);
    }

    // ---- reveal a node's lines one at a time (typing bubble in between),
    // resuming from wherever we left off if the player navigated away mid-reveal ----
    function revealLines(lines, startIdx, done) {
      if (startIdx >= lines.length) return done();
      isTyping = true;
      paint();
      const delay = 700 + Math.random() * 600;
      setTimeout(() => {
        if (!stillHere()) return;
        isTyping = false;
        AppState.tick(1); // a reply arriving moves the ambient clock forward a bit
        const time = gameTimeStamp();
        chat.messages.push({ from: 'them', text: Story.resolveText(lines[startIdx]), time });
        Story.bumpRevealed(chatId);
        paint();
        setTimeout(() => { if (stillHere()) revealLines(lines, startIdx + 1, done); }, 260);
      }, delay);
    }

    // ---- enter (or resume) a node: reveal its lines, run its effects,
    // then leave the thread waiting on a choice / input / or chain into `next` ----
    function enterNode(nodeId, resuming) {
      const node = Story.getNode(chatId, nodeId);
      if (!node) { setInputEnabled(false); choicesEl.innerHTML = ''; return; } // unwritten content yet

      // conditional branch: used for (1) "skip the whole name-collection
      // block if the player already filled every field in Pengaturan" —
      // see a_profile_gate, and (2) routing based on a story flag, e.g.
      // "did the player already ask for this contact earlier?" — see
      // f_start in the friend thread.
      if (node.skipTo && !resuming && evalCondition(node.skipTo)) {
        enterNode(node.skipTo.next);
        return;
      }

      // don't re-ask a question whose answer is already known (e.g. the
      // player filled this exact field in Pengaturan before opening the chat)
      if (node.input && node.input.savesTo && !resuming) {
        const existing = AppState.getPath(node.input.savesTo);
        if (existing) {
          enterNode(node.input.next);
          return;
        }
      }

      let ts = Story.threadState(chatId);
      if (!resuming || !ts || ts.nodeId !== nodeId) {
        Story.setNode(chatId, nodeId);
        ts = Story.threadState(chatId);
      }

      const lines = node.lines || [];
      const startIdx = ts ? ts.revealedCount : 0;

      const afterReveal = () => {
        if (!stillHere()) return;

        Story.runEffectsOnce(chatId, node.effects);
        AppState.touch();

        // refresh the header in case an effect (renameThread) changed it
        const titleEl = root.querySelector('.app-header h1');
        if (titleEl && s.chats[chatId]) titleEl.textContent = s.chats[chatId].name;

        const tsAfter = Story.threadState(chatId);
        if (!tsAfter || tsAfter.ended) {
          // this thread just ended (e.g. the assistant tutorial finishing) —
          // give the player a beat to read the final line, then bounce to the inbox
          setInputEnabled(false);
          choicesEl.innerHTML = '';
          setTimeout(() => { if (stillHere()) renderList(root); }, 1300);
          return;
        }

        if (node.choices && node.choices.length) {
          if (node.choices.length === 1 && AppState.get().settings.autoAdvance) {
            Story.setAwaiting(chatId, null);
            setInputEnabled(false);
            setTimeout(() => { if (stillHere()) pickChoice(node.choices[0]); }, 500);
          } else {
            setInputEnabled(false);
            Story.setAwaiting(chatId, 'choice');
            renderChoices(node.choices);
          }
        } else if (node.input) {
          choicesEl.innerHTML = '';
          pendingInput = node.input;
          Story.setAwaiting(chatId, 'input');
          setInputEnabled(true, node.input.placeholder);
        } else if (node.gotoScreen) {
          // scripted screen transition (e.g. the time-skip cutscene) —
          // takes over completely, story resumes wherever gotoScreen sends it
          Story.setAwaiting(chatId, null);
          setInputEnabled(false);
          choicesEl.innerHTML = '';
          setTimeout(() => {
            if (!stillHere()) return;
            Router.navigate(node.gotoScreen.id, node.gotoScreen.params || {});
          }, 900);
        } else if (node.holdUntilTap) {
          // this thread is running in parallel with something else the
          // player is doing — don't cascade more lines automatically,
          // just wait for them to actually tap into this conversation
          setInputEnabled(false);
          Story.setAwaiting(chatId, 'tap');
          showTapHint(node.holdUntilTap);
        } else if (node.next) {
          Story.setAwaiting(chatId, null);
          setInputEnabled(false);
          enterNode(node.next);
        } else {
          // dead end: no choices/input/next -- nothing more written yet
          Story.setAwaiting(chatId, null);
          setInputEnabled(false);
        }
      };

      if (startIdx >= lines.length) afterReveal();
      else revealLines(lines, startIdx, afterReveal);
    }

    function send() {
      if (!pendingInput) return; // box is only "live" while a node is asking for input
      const text = inputEl.value.trim();
      if (!text) return;
      AppState.tick(1); // sending something moves the ambient clock forward a bit
      Story.recordInteraction(chatId); // no-op unless chatId is one of the 10 characters
      const time = gameTimeStamp();
      chat.messages.push({ from: 'me', text, time });
      inputEl.value = '';
      paint();
      if (pendingInput.savesTo) AppState.set(pendingInput.savesTo, text);
      const next = pendingInput.next;
      pendingInput = null;
      setInputEnabled(false);
      setTimeout(() => { if (stillHere()) enterNode(next); }, 350);
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    // ---- boot / resume this thread ----
    paint();
    if (hasStory) {
      const ts = Story.threadState(chatId);
      if (ts.awaiting === 'choice') {
        const node = Story.getNode(chatId, ts.nodeId);
        renderChoices(node.choices);
      } else if (ts.awaiting === 'input') {
        const node = Story.getNode(chatId, ts.nodeId);
        pendingInput = node.input;
        setInputEnabled(true, node.input.placeholder);
      } else if (ts.awaiting === 'tap') {
        const node = Story.getNode(chatId, ts.nodeId);
        showTapHint(node.holdUntilTap);
      } else {
        enterNode(ts.nodeId, true); // fresh node, or resume mid-reveal
      }
    }
  }

  Router.register('dashchat', (root, params) => {
    if (params && params.chatId) renderThread(root, params.chatId);
    else renderList(root);
  });
})();
