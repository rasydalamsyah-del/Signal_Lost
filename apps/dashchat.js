/* ============================================================
   apps/dashchat.js
   The main gameplay app. Two views sharing one route:
   - list view  (no params)            -> conversation list
   - thread view (params.chatId)       -> open chat, can send messages
   Wire your branching story into `handleReply()`.
   ============================================================ */
(function () {

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
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">◐</div><p>Belum ada percakapan.</p></div>`;
      return;
    }

    chatIds.forEach(id => {
      const chat = s.chats[id];
      const last = chat.messages[chat.messages.length - 1];
      const row = document.createElement('div');
      row.className = 'list-item';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="avatar">${chat.name[0] || '?'}</div>
        <div class="list-item-main">
          <div class="list-item-title">${chat.name}</div>
          <div class="list-item-sub">${last ? last.text : ''}</div>
        </div>
        <div class="list-item-meta">${last ? last.time : ''}</div>
      `;
      row.addEventListener('click', () => Router.navigate('dashchat', { chatId: id }));
      list.appendChild(row);
    });
  }

  function renderThread(root, chatId) {
    const s = AppState.get();
    const chat = s.chats[chatId];
    if (!chat) return renderList(root);

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>${chat.name}</h1>
          <span class="app-header-sub">online</span>
        </div>
        <div class="app-body">
          <div class="chat-messages" id="chat-messages"></div>
        </div>
        <div class="chat-input-row">
          <input class="chat-input" id="chat-input" type="text" placeholder="Tulis pesan...">
          <button class="chat-send" id="chat-send">➤</button>
        </div>
      </div>
    `;

    const msgsEl = root.querySelector('#chat-messages');
    function paint() {
      msgsEl.innerHTML = chat.messages.map(m => `
        <div class="bubble ${m.from === 'me' ? 'bubble-me' : 'bubble-them'}">${m.text}</div>
      `).join('');
      root.querySelector('.app-body').scrollTop = msgsEl.scrollHeight;
    }
    paint();

    function send() {
      const input = root.querySelector('#chat-input');
      const text = input.value.trim();
      if (!text) return;
      const time = new Date().toTimeString().slice(0, 5);
      chat.messages.push({ from: 'me', text, time });
      input.value = '';
      paint();
      AppState.set('flags.lastPlayerMessage', text); // in case story logic reads it
      handleReply(chatId);
    }

    root.querySelector('#chat-send').addEventListener('click', send);
    root.querySelector('#chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') send();
    });
  }

  // ---- placeholder reply logic: replace with your branching story ----
  function handleReply(chatId) {
    const chat = AppState.get().chats[chatId];
    setTimeout(() => {
      const time = new Date().toTimeString().slice(0, 5);
      chat.messages.push({ from: 'them', text: '...', time });
      if (Router.currentId() === 'dashchat') renderThread(document.getElementById('screen-root'), chatId);
    }, 700);
  }

  Router.register('dashchat', (root, params) => {
    if (params && params.chatId) renderThread(root, params.chatId);
    else renderList(root);
  });
})();
