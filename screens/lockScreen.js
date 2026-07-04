/* ============================================================
   screens/lockScreen.js
   Realistic lock screen: big clock, one notification preview,
   swipe-up (or tap) to unlock into Home. Chromeless — no status
   bar / nav bar, matching Start and Boot.
   ============================================================ */
(function () {
  const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis',"Jum'at",'Sabtu'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function firstUnread() {
    const s = AppState.get();
    for (const id in s.chats) {
      const chat = s.chats[id];
      const contact = s.contacts.find(c => c.id === id);
      const last = chat.messages[chat.messages.length - 1];
      if (last && last.from === 'them') return { name: chat.name, text: last.text };
      if (contact && contact.isNew) return { name: chat.name, text: 'Pesan baru masuk' };
    }
    return null;
  }

  function render(root) {
    const now = new Date();
    const notif = firstUnread();

    root.innerHTML = `
      <div class="lock-screen" id="lock-screen">
        <div class="lock-time">
          <div class="l-clock">${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}</div>
          <div class="l-date">${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}</div>
          ${notif ? `
            <div class="lock-notif">
              <div class="lock-notif-icon">${ICONS.dashchat}</div>
              <div>
                <div class="lock-notif-title">${notif.name}</div>
                <div class="lock-notif-sub">${notif.text}</div>
              </div>
            </div>` : ''}
        </div>
        <div class="lock-swipe" id="lock-swipe">
          <span class="lock-swipe-icon">${ICONS.chevronUp}</span>
          <span class="lock-swipe-label">Geser ke atas untuk membuka</span>
        </div>
      </div>
    `;

    const screen = root.querySelector('#lock-screen');
    const trigger = root.querySelector('#lock-swipe');

    function unlock() {
      if (screen.classList.contains('unlocking')) return;
      screen.classList.add('unlocking');
      setTimeout(() => { if (Router.currentId() === 'lock') Router.replace('home'); }, 420);
    }

    trigger.addEventListener('click', unlock);

    // swipe-up gesture anywhere on the lock screen
    let startY = null;
    screen.addEventListener('pointerdown', e => { startY = e.clientY; });
    screen.addEventListener('pointerup', e => {
      if (startY === null) return;
      if (startY - e.clientY > 60) unlock();
      startY = null;
    });
  }

  Router.register('lock', render);
})();