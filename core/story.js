/* ============================================================
   core/story.js
   The branching-dialogue engine + the actual script.

   NODE SHAPE (every node lives under STORY[threadId][nodeId]):
     lines:   string[]   — bubbles typed out one by one, in order.
                           May contain {{token}} placeholders — see
                           AppState.resolveText for the token list.
     input:   { placeholder, savesTo, next }
                           — enables the text box after `lines` finish.
                           Whatever the player types is saved to the
                           dot-path in `savesTo`, echoed as a "me"
                           bubble, then the thread moves to `next`.
     choices: [{ label, next, effects? }]
                           — stacked buttons above the input row.
                           Picking one echoes `label` as a "me" bubble,
                           runs its `effects`, then moves to `next`.
     next:    string      — if a node has neither `input` nor `choices`,
                           it auto-continues straight into `next` (used
                           to chain several narration beats together
                           without waiting on the player).
     effects: object[]    — run once, right after `lines` finish typing,
                           before choices/input/next are evaluated.
                           See runEffects() below for supported types.
     skipTo:  { when:'allFilled', paths:[...], next }
                           or { when:'flag', flag:'x', equals:true, next }
                           — checked by apps/dashchat.js BEFORE this node's
                           lines are shown. 'allFilled' jumps to `next` if
                           every dot-path already has a value (used so the
                           assistant doesn't re-ask for names the player
                           already filled in Pengaturan). 'flag' jumps to
                           `next` if a story flag matches `equals` (used
                           for branching on an earlier choice, e.g. "did
                           the player already ask for this contact?").
                           Individual `input` nodes also silently skip
                           themselves the same way, per field.
     gotoScreen: { id, params }
                           — hands off to a whole different screen (e.g.
                           the time-skip cutscene) instead of continuing
                           the conversation. That screen is responsible
                           for bringing the player back (see
                           screens/timeSkip.js).
     holdUntilTap: nodeId  — for threads running in parallel with
                           whatever the player is actually doing (e.g. a
                           friend texting while the partner conversation
                           is still open elsewhere): show this node's
                           lines, then stop and wait for a tap anywhere
                           on the chat body — not a button — before
                           moving to `nodeId`. Survives leaving and
                           re-opening the chat.

   A node with none of input/choices/next is a dead end — "no new
   content yet", which is exactly where the current partner script
   stops (cliffhanger). That's intentional, not a bug.
   ============================================================ */

const Story = (function () {

  // ================= THE SCRIPT =================
  const STORY = {

    // ---------------------------------------------------------
    // ASSISTANT — onboarding tutorial. Explains the mechanics in
    // fiction (an in-universe "assistant" on a brand-new phone),
    // collects every profile name the rest of the story needs,
    // then hands off to the partner thread and disappears.
    // ---------------------------------------------------------
    assistant: {

      a_start: {
        lines: [
          'eh, halo.',
          'ini hp baru kamu kan? aku yang bantu setting-in kemarin.',
          'ada beberapa hal yang mau aku pastiin dulu sebelum kamu mulai pake ini.'
        ],
        next: 'a_mech_intro'
      },

      a_mech_intro: {
        lines: [
          'kalo aku nanti nanya sesuatu, jawab aja pake kata-kata sendiri, santai kayak biasa.',
          'tapi kalo aku kasih beberapa pilihan jawaban, pilih aja salah satu, gak usah diketik ulang.'
        ],
        next: 'a_profile_gate'
      },

      // gate: kalau player udah isi semua nama di Pengaturan sebelum buka chat
      // ini, skip seluruh sesi tanya-nama dan langsung ke demo pilihan.
      // (Dipangkas jadi 3 field saja setelah redesign multi-karakter —
      // lihat RANCANGAN_MULTI_KARAKTER.md §6. Field lain dulu di sini
      // sudah dihapus dari profile.)
      a_profile_gate: {
        lines: [],
        skipTo: {
          when: 'allFilled',
          paths: [
            'profile.user.name', 'profile.userMom.name', 'profile.userDad.name'
          ],
          next: 'a_profile_prefilled'
        },
        next: 'a_ask_user_name'
      },
      a_profile_prefilled: {
        lines: [
          'eh, kayaknya semua itu udah keisi dari awal ya.',
          'oke, aku pake yang udah ada aja kalo gitu.'
        ],
        next: 'a_demo_choice'
      },

      // setiap node di bawah ini otomatis di-skip sendiri-sendiri kalau
      // field-nya udah keisi (lihat pengecekan di apps/dashchat.js)
      a_ask_user_name: {
        lines: ['btw aku lupa nanya, nama kamu siapa?'],
        input: { placeholder: 'Ketik nama kamu...', savesTo: 'profile.user.name', next: 'a_ack_user_name' }
      },
      a_ack_user_name: { lines: ['oh, {{user}}. oke.'], next: 'a_ask_user_mom' },

      a_ask_user_mom: {
        lines: ['nama ibu kamu?'],
        input: { placeholder: 'Nama ibu kamu...', savesTo: 'profile.userMom.name', next: 'a_ack_user_mom' }
      },
      a_ack_user_mom: { lines: ['{{userMom}}, oke.'], next: 'a_ask_user_dad' },

      a_ask_user_dad: {
        lines: ['nama ayah kamu?'],
        input: { placeholder: 'Nama ayah kamu...', savesTo: 'profile.userDad.name', next: 'a_ack_user_dad' }
      },
      a_ack_user_dad: { lines: ['{{userDad}}. sip, semuanya udah aku catet.'], next: 'a_demo_choice' },

      // ---- real branching demo: three genuinely different replies ----
      a_demo_choice: {
        lines: ['btw, gimana perasaan kamu soal hp baru ini?'],
        choices: [
          { label: 'Biasa aja sih.', next: 'a_after_casual' },
          { label: 'Jujur, agak was-was.', next: 'a_after_wary' },
          { label: 'Penasaran — kenapa sinyalnya aneh?', next: 'a_after_curious' }
        ]
      },
      a_after_casual: { lines: ['santai. semoga tetep gitu terus ya.'], next: 'a_single_note' },
      a_after_wary:   { lines: ['wajar kok. aku juga sebenernya.'], next: 'a_single_note' },
      a_after_curious:{ lines: ['jujur, aku juga belom nemu jawabannya.'], next: 'a_single_note' },

      a_single_note: {
        lines: [
          'oh iya, kadang nanti cuma ada satu balasan yang bisa kamu pilih.',
          'itu emang gitu doang, bukan masalah — tinggal pilih aja.'
        ],
        next: 'a_single_demo'
      },
      a_single_demo: {
        lines: ['contohnya kayak gini nih.'],
        choices: [ { label: 'Oke, ngerti.', next: 'a_farewell' } ]
      },

      // ---- handoff: assistant disappears. It used to also spawn a
      // single generic "partner" mystery contact right here — that's
      // now superseded by the 10-character system (core/characters.js).
      // Wiring the 10 characters into Contacts/DashChat is a later
      // build step (see RANCANGAN_MULTI_KARAKTER.md §1), so for now
      // the handoff just ends cleanly without spawning anything, to
      // avoid leaving a broken contact that still says "{{partner}}"
      // literally on screen.
      a_farewell: {
        lines: [
          'oke {{user}}, kayaknya itu doang yang perlu kamu tau buat sekarang.',
          'aku bakal ilang dari kontak setelah ini — biasanya emang gitu, jangan kaget ya.',
          'bakal ada beberapa nomor baru yang muncul di kontak kamu nanti.',
          'hati-hati aja sama sinyal di hp ini.'
        ],
        effects: [
          { type: 'endThread', threadId: 'assistant' }
        ]
      }
    },

    // ---------------------------------------------------------
    // DEPRECATED — old single-generic-partner mystery arc ("???").
    // Kept here only as reference/reusable lines while the 10-character
    // system is built; nothing currently spawns this thread (see
    // a_farewell above), so it's inert. Do NOT wire this back up as-is:
    // it reads {{partner}}/{{userFriend}} tokens that no longer exist
    // now that names are baked into core/characters.js instead of a
    // single generic profile.partner slot. Superseded by
    // RANCANGAN_MULTI_KARAKTER.md — will be rewritten per-character
    // in a later content step, not reactivated wholesale.
    // ---------------------------------------------------------
    partner: {
      p_start: {
        lines: ['...', 'kamu masih baca ini kan?', 'gatau harus mulai darimana...'],
        next: 'p_choice1'
      },
      p_choice1: {
        lines: ['ini beneran aku. tau kedengerannya aneh kalo nomor ini asing buat kamu.'],
        choices: [
          { label: 'Siapa ini?', next: 'p_branch_who' },
          { label: 'Kamu kenal aku?', next: 'p_branch_know' },
          { label: '(diem aja, biar dia lanjut ngomong)', next: 'p_branch_silent' }
        ]
      },
      p_branch_who:   { lines: ['pertanyaan yang wajar sih.', 'tapi aku belum siap jawab itu sekarang.'], next: 'p_common1' },
      p_branch_know:  { lines: ['kenal? lebih dari itu kayaknya.', 'tapi... entah kenapa aku belum sanggup cerita lebih jauh sekarang.'], next: 'p_common1' },
      p_branch_silent:{ lines: ['...', 'kamu diem. oke.', 'aku ngerti sih kalo ini kedengeran aneh.'], next: 'p_common1' },

      p_common1: {
        lines: ['yang penting aku masih di sini.', 'aku cerita pelan-pelan ya... entah kenapa susah banget buat mulai.'],
        next: 'p_choice2'
      },
      p_choice2: {
        lines: ['kamu percaya gak sama aku?'],
        choices: [
          { label: 'Belom tau.', next: 'p_branch_unsure' },
          { label: 'Coba aja dulu.', next: 'p_branch_trust' }
        ]
      },
      p_branch_unsure:{ lines: ['jujur, aku juga gak yakin harus percaya diri sendiri sekarang.'], next: 'p_reveal_setup' },
      p_branch_trust: { lines: ['itu... lebih dari yang aku harepin.'], next: 'p_reveal_setup' },

      p_reveal_setup: {
        lines: ['ada satu hal yang pasti gak berubah, walaupun semuanya berasa aneh belakangan ini.', 'nama panggilan yang cuma kamu yang tau.'],
        choices: [ { label: 'Sebutin.', next: 'p_reveal' } ]
      },
      p_reveal: {
        lines: ['ini aku, {{partner}}.'],
        effects: [
          { type: 'renameThread', threadId: 'partner', name: '{{partner}}' },
          { type: 'setFlag', flag: 'partnerRevealed', value: true }
        ],
        next: 'p_after_reveal'
      },
      p_after_reveal: {
        lines: ['maaf ya soal misteri barusan.', 'aku... gatau harus mulai darimana buat cerita apa yang sebenernya kejadian.'],
        next: 'p_ask_friend_gate'
      },

      // ---- side beat: reveal the friend's contact. Branches on whether
      // the player proactively asked (flag set by the choice below) or
      // let the partner bring it up first — either way it ends the same
      // way (a new contact + a time-skip), just with different framing
      // and a different opening flow in the friend thread itself.
      p_ask_friend_gate: {
        lines: ['eh, ngomong-ngomong...'],
        choices: [
          {
            label: 'Boleh minta nomor {{userFriend}}? aku kangen ngobrol.',
            next: 'p_friend_user_asked',
            effects: [ { type: 'setFlag', flag: 'askedForFriendContact', value: true } ]
          },
          { label: '(gak nanya apa-apa, biarin dia lanjut cerita)', next: 'p_friend_offered' }
        ]
      },
      p_friend_user_asked: {
        lines: [
          'eh, kebetulan banget.',
          '{{userFriend}} juga udah lama pengen ngobrol sama kamu, tapi nomor kamu kemarin-kemarin nonaktif jadi belom bisa.',
          'nih, aku kasih nomornya.'
        ],
        effects: [
          { type: 'spawnThread', threadId: 'friend', contactId: 'friend', name: '{{userFriend}}', avatar: '?', startNode: 'f_user_initiated' },
          { type: 'setFlag', flag: 'friendContactGiven', value: true }
        ],
        gotoScreen: {
          id: 'timeSkip',
          params: {
            minutes: 60,
            thenThreadId: 'partner', thenNode: 'p_hold',
            afterId: 'dashchat', afterParams: { chatId: 'partner' }, // land back on the
                                                                       // still-open partner
                                                                       // chat, not Home
            onComplete: [
              { type: 'notify', title: 'Kontak baru', body: 'Nomor {{userFriend}} udah masuk ke kontak kamu.', chatId: 'friend' }
            ]
          }
        }
      },
      p_friend_offered: {
        lines: [
          'btw, {{userFriend}} udah lama pengen ngobrol sama kamu.',
          'tapi nomor kamu kemarin-kemarin nonaktif, jadi belom bisa.',
          'nih aku kasih nomornya — {{userFriend}} juga aku kasih nomor kamu.'
        ],
        effects: [
          { type: 'spawnThread', threadId: 'friend', contactId: 'friend', name: '{{userFriend}}', avatar: '?', startNode: 'f_friend_initiated' },
          { type: 'setFlag', flag: 'friendContactGiven', value: true }
        ],
        gotoScreen: {
          id: 'timeSkip',
          params: {
            minutes: 60,
            thenThreadId: 'partner', thenNode: 'p_hold',
            afterId: 'dashchat', afterParams: { chatId: 'partner' }, // land back on the
                                                                       // still-open partner
                                                                       // chat, not Home
            onComplete: [
              { type: 'deliverFirstLine', threadId: 'friend' },
              { type: 'notify', title: '{{userFriend}}', body: 'Pesan baru masuk...', chatId: 'friend' }
            ]
          }
        }
      },

      p_hold: {
        // dead end on purpose — cliffhanger, next content continues here
        lines: ['koneksi di sini mulai jelek lagi.', 'aku hubungin lagi kalo udah bisa ya...']
      }
    },

    // ---------------------------------------------------------
    // FRIEND (profile.userFriend) — starts either with the friend
    // texting first (didn't ask) or with the player picking the
    // opening line themselves (asked partner for it proactively).
    // The friend-initiated opener is delivered instantly via
    // `deliverFirstLine` (see p_friend_offered above) since it
    // happens while the player is off in the time-skip/home screen,
    // not actually watching this chat — so it uses `holdUntilTap`
    // rather than auto-cascading, letting the player control the
    // pace once they do open it instead of it dumping everything at once.
    // ---------------------------------------------------------
    friend: {
      f_friend_initiated: {
        lines: ['eh, halo! ini beneran nomor {{user}} kan?'],
        holdUntilTap: 'f_friend_initiated_2'
      },
      f_friend_initiated_2: {
        lines: [
          'gimana kabarnya? udah lama banget kita gak ngobrol.',
          'aku dapet nomor kamu dari {{partner}}, katanya nomor kamu kemarin-kemarin nonaktif.'
        ],
        next: 'f_choice1'
      },
      f_choice1: {
        lines: ['jadi gimana, kabar kamu gimana?'],
        choices: [
          { label: 'Baik kok! maaf ya lama gak bisa dihubungi.', next: 'f_after_a' },
          { label: 'Lumayan sih, banyak yang kejadian belakangan ini.', next: 'f_after_b' }
        ]
      },
      f_after_a: { lines: ['santai aja, yang penting sekarang udah bisa lagi.'], next: 'f_hold' },
      f_after_b: { lines: ['wah, cerita dong kalo udah siap.'], next: 'f_hold' },
      f_hold: {
        lines: ['btw seneng deh akhirnya bisa chat kamu lagi.', 'nanti kita ngobrol lagi ya!']
      },

      f_user_initiated: {
        lines: [],
        choices: [
          { label: 'Halo! ini aku, {{user}}. katanya {{partner}} kasih nomor kamu ya?', next: 'f_u_reply_a' },
          { label: 'Eh langsung aja — kabar-kabar dong! lama gak ngobrol.', next: 'f_u_reply_b' }
        ]
      },
      f_u_reply_a: {
        lines: ['iya bener! akhirnya, udah lama nungguin ini.', 'nomor kamu kemarin-kemarin nonaktif soalnya.'],
        next: 'f_u_common'
      },
      f_u_reply_b: {
        lines: ['eh, {{user}}! kaget tapi seneng banget lo tiba-tiba chat.', 'kemarin-kemarin emang nomor kamu nonaktif ya?'],
        next: 'f_u_common'
      },
      f_u_common: {
        lines: ['gimana kabarnya belakangan ini?'],
        choices: [
          { label: 'Baik-baik aja kok.', next: 'f_u_after_a' },
          { label: 'Banyak cerita sih, nanti aku ceritain.', next: 'f_u_after_b' }
        ]
      },
      f_u_after_a: { lines: ['syukur deh kalo gitu.'], next: 'f_u_hold' },
      f_u_after_b: { lines: ['wah, penasaran jadinya. cerita kapan-kapan ya!'], next: 'f_u_hold' },
      f_u_hold: {
        lines: ['seneng deh akhirnya bisa ngobrol lagi.', 'chat-chat lagi ya kalo sempet!']
      }
    }
  };

  // ================= ENGINE =================

  function resolveText(str) { return AppState.resolveText(str); }

  function getNode(threadId, nodeId) {
    return STORY[threadId] && STORY[threadId][nodeId];
  }

  function threadState(threadId) {
    return AppState.get().story.threads[threadId];
  }

  // move a thread onto a new node, resetting its "how much of this
  // node has been typed out" counters
  function setNode(threadId, nodeId) {
    const ts = threadState(threadId);
    if (!ts) return;
    ts.nodeId = nodeId;
    ts.revealedCount = 0;
    ts.awaiting = null;
    ts.effectsRan = false;
  }

  function bumpRevealed(threadId) {
    const ts = threadState(threadId);
    if (ts) ts.revealedCount++;
  }

  function setAwaiting(threadId, kind) {
    const ts = threadState(threadId);
    if (ts) ts.awaiting = kind; // 'choice' | 'input' | null
  }

  function runEffects(threadId, effects) {
    if (!effects || !effects.length) return;
    const s = AppState.get();

    effects.forEach(fx => {
      switch (fx.type) {

        case 'setFlag':
          s.flags[fx.flag] = fx.value;
          break;

        case 'notify':
          if (window.Notify) {
            Notify.show({
              title: resolveText(fx.title),
              body: resolveText(fx.body),
              onClick: fx.chatId ? () => Router.navigate('dashchat', { chatId: fx.chatId }) : null
            });
          }
          break;

        case 'endThread': {
          delete s.chats[fx.threadId];
          s.contacts = s.contacts.filter(c => c.id !== fx.threadId);
          if (s.story.threads[fx.threadId]) s.story.threads[fx.threadId].ended = true;
          break;
        }

        case 'spawnThread': {
          const name = resolveText(fx.name);
          s.contacts.push({
            id: fx.contactId,
            name,
            avatar: fx.avatar || (name[0] || '?'),
            lastUpdate: '',
            isNew: true
          });
          s.chats[fx.contactId] = { name, messages: [] };
          s.story.threads[fx.contactId] = { nodeId: fx.startNode, ended: false, revealedCount: 0, awaiting: null, effectsRan: false };
          break;
        }

        case 'renameThread': {
          const name = resolveText(fx.name);
          const contact = s.contacts.find(c => c.id === fx.threadId);
          if (contact) contact.name = name;
          if (s.chats[fx.threadId]) s.chats[fx.threadId].name = name;
          break;
        }

        // deliver a node's first line straight into a thread's message
        // log immediately, skipping the usual typing-reveal animation —
        // used when something happens "off-screen" while the player is
        // busy elsewhere (e.g. a friend's opening text arriving during
        // a time-skip). The rest of that node's content, if any, still
        // waits for the player via `holdUntilTap`/next like normal.
        case 'deliverFirstLine': {
          const ts = s.story.threads[fx.threadId];
          const chat = s.chats[fx.threadId];
          if (!ts || !chat) break;
          const node = STORY[fx.threadId] && STORY[fx.threadId][ts.nodeId];
          if (!node || !node.lines || !node.lines.length) break;
          const t = s.phone.time; // in-game clock, not the real device clock
          const time = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
          chat.messages.push({ from: 'them', text: resolveText(node.lines[0]), time });
          ts.revealedCount = 1;
          ts.awaiting = node.holdUntilTap ? 'tap' : null;
          const contact = s.contacts.find(c => c.id === fx.threadId);
          if (contact) contact.isNew = true; // (re)flag as unread — this is new content arriving
          break;
        }

        // ---- multi-character effects (RANCANGAN_MULTI_KARAKTER.md §3, §6) ----

        // adjust one stat on one target — either a character
        // (fx.target = a characters.js id, stat: love|trust|jealousy|mood)
        // or the player themselves (fx.target = 'self', stat:
        // happiness|sadness|jealousy|money). Clamped to 0-100, except
        // 'money' which is uncapped (it's a nominal amount, not a gauge).
        case 'adjustStat': {
          const delta = fx.delta || 0;
          if (fx.target === 'self') {
            if (!(fx.stat in s.selfStats)) { console.warn('Story: unknown selfStats stat', fx.stat); break; }
            const raw = s.selfStats[fx.stat] + delta;
            s.selfStats[fx.stat] = fx.stat === 'money' ? raw : clamp01to100(raw);
          } else {
            const c = s.characters[fx.target];
            if (!c) { console.warn('Story: unknown character target', fx.target); break; }
            if (!(fx.stat in c.stats)) { console.warn('Story: unknown character stat', fx.stat); break; }
            c.stats[fx.stat] = clamp01to100(c.stats[fx.stat] + delta);
          }
          break;
        }

        // ambient/threshold ripple: if `fx.source` character's OWN stat
        // (fx.condition.stat) is at/above fx.condition.gte, nudge
        // fx.targetStat by fx.delta on EVERY OTHER character. Meant for
        // "everyone notices you and X are close" style ambient jealousy —
        // small delta, applies broadly. See RANCANGAN_MULTI_KARAKTER.md §3.
        case 'globalRipple': {
          const source = s.characters[fx.source];
          if (!source) { console.warn('Story: unknown ripple source', fx.source); break; }
          const cond = fx.condition || {};
          const meets = typeof cond.gte === 'number'
            ? (source.stats[cond.stat] || 0) >= cond.gte
            : true;
          if (!meets) break;
          allCharacterIds().forEach(id => {
            if (id === fx.source) return;
            const c = s.characters[id];
            if (!(fx.targetStat in c.stats)) return;
            c.stats[fx.targetStat] = clamp01to100(c.stats[fx.targetStat] + (fx.delta || 0));
          });
          break;
        }

        // focused rivalry ripple: nudges fx.targetStat by fx.delta only
        // on fx.source's rivals (getRivals(), default same-gender —
        // see core/characters.js), not everyone. Meant to be the
        // sharper, more specific counterpart to globalRipple above,
        // triggered when the player is visibly focusing attention on
        // one character (see Story.computeNeglect()/attention ratio
        // below for how "focus" gets measured).
        case 'rivalRipple': {
          if (!s.characters[fx.source]) { console.warn('Story: unknown rivalRipple source', fx.source); break; }
          getRivals(fx.source).forEach(id => {
            const c = s.characters[id];
            if (!c || !(fx.targetStat in c.stats)) return;
            c.stats[fx.targetStat] = clamp01to100(c.stats[fx.targetStat] + (fx.delta || 0));
          });
          break;
        }

        // reveal one biographical field — either the player's own
        // (fx.target = 'self', writes to selfIdentity) or a character's
        // (fx.target = a characters.js id, writes to
        // characters[id].identity and marks it unlocked so the "Diri"
        // app's character-browser can show it). See
        // RANCANGAN_MULTI_KARAKTER.md §6.
        case 'revealIdentity': {
          const value = resolveText(fx.value);
          if (fx.target === 'self') {
            if (!(fx.field in s.selfIdentity)) { console.warn('Story: unknown selfIdentity field', fx.field); break; }
            s.selfIdentity[fx.field] = value;
          } else {
            const c = s.characters[fx.target];
            if (!c) { console.warn('Story: unknown identity target', fx.target); break; }
            if (!(fx.field in c.identity)) { console.warn('Story: unknown identity field', fx.field); break; }
            c.identity[fx.field] = value;
            if (!c.identityUnlocked.includes(fx.field)) c.identityUnlocked.push(fx.field);
          }
          break;
        }

        default:
          console.warn('Story: unknown effect type', fx.type);
      }
    });
  }

  function clamp01to100(n) { return Math.max(0, Math.min(100, n)); }

  // ---- interaction tracking + neglect score (RANCANGAN_MULTI_KARAKTER.md §5) ----
  // Call whenever a message is sent to one of the 10 characters (see
  // apps/dashchat.js). No-ops for threads that aren't a registered
  // character (e.g. the old 'assistant' tutorial thread).
  function recordInteraction(charId) {
    const s = AppState.get();
    const c = s.characters[charId];
    if (!c) return;
    c.messageCount += 1;
    c.lastInteractedDay = s.meta.day;
    s.attention.totalMessages += 1;
  }

  // Combines two measures into one 0-100 "how neglected does this
  // character feel" score:
  //  1) days since last contact (0 if never met — you can't neglect
  //     someone you haven't started talking to yet)
  //  2) attention ratio — how much of the player's TOTAL messages
  //     (across all 10) went to everyone else instead of this one,
  //     so a short gap can still register as neglect if the player is
  //     clearly spending nearly all their attention elsewhere.
  // Weights below are a starting point, not tuned against real
  // playtesting yet — easy to adjust in one place as content is written.
  function computeNeglect(charId) {
    const s = AppState.get();
    const c = s.characters[charId];
    if (!c) return 0;
    if (c.lastInteractedDay === null) return 0; // haven't met yet
    const dayGap = Math.max(0, s.meta.day - c.lastInteractedDay);
    const total = s.attention.totalMessages;
    const attentionElsewhereRatio = total > 0 ? Math.max(0, (total - c.messageCount) / total) : 0;
    const score = dayGap * 5 + attentionElsewhereRatio * 40;
    return clamp01to100(score);
  }

  // like runEffects, but guarantees a given node's effects only ever fire
  // once per entry into that node — even if the player re-opens a dead-end
  // conversation that never advanced past it (no `next`/`choices`/`input`
  // to naturally move `nodeId` away and prevent a re-run).
  function runEffectsOnce(threadId, effects) {
    const ts = threadState(threadId);
    if (!ts || ts.effectsRan) return;
    ts.effectsRan = true;
    runEffects(threadId, effects);
  }

  return {
    resolveText,
    getNode,
    threadState,
    setNode,
    bumpRevealed,
    setAwaiting,
    runEffects,
    runEffectsOnce,
    recordInteraction,
    computeNeglect
  };
})();
