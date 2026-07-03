/* ============================================================
   core/state.js
   One global state object every app reads/writes to, so data
   (chat history, contacts, calendar, etc.) survives navigation
   between apps. Persisted to localStorage via Storage app.
   ============================================================ */

const AppState = (function () {

  // ---- default game data. Edit this to write your own story. ----
  function defaultData() {
    return {
      meta: {
        playerName: 'Kamu',
        day: 1,
        createdAt: null
      },
      phone: {
        network: 4,      // 0-4 bars, drop this for "signal lost" moments
        battery: 78       // 0-100
      },
      contacts: [
        { id: 'c1', name: '???', avatar: '?', lastUpdate: 'Kontak baru ditambahkan', isNew: true }
      ],
      chats: {
        // chatId: { name, messages: [{from:'me'|'them', text, time}] }
        c1: {
          name: '???',
          messages: [
            { from: 'them', text: 'kamu bisa lihat pesan ini?', time: '03:14' }
          ]
        }
      },
      snaplyPosts: [
        { id: 'p1', author: 'seseorang', caption: 'sinyal makin aneh belakangan ini.', time: '2j' }
      ],
      stremlyStreams: [
        { id: 's1', title: 'siaran_kosong', viewers: 0, live: false }
      ],
      gallery: [], // { id, caption, time }
      calendar: [
        // { date:'2026-07-04', title:'...' }
      ],
      shopItems: [
        { id: 'i1', icon: '💾', name: 'Extra Save Slot', price: 0, owned: false },
        { id: 'i2', icon: '🎨', name: 'Chat Skin: Dingin', price: 0, owned: false }
      ],
      settings: {
        sound: true,
        vibration: true,
        textSize: 'normal'
      },
      flags: {} // story flags/branching state, e.g. { metStranger: true }
    };
  }

  let data = defaultData();
  const listeners = new Set();

  function notify() { listeners.forEach(fn => fn(data)); }

  return {
    get() { return data; },
    set(path, value) {
      // tiny dot-path setter: AppState.set('phone.battery', 50)
      const keys = path.split('.');
      let obj = data;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      notify();
    },
    reset() { data = defaultData(); notify(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // ---- persistence ----
    save(slot = 'autosave') {
      const record = { data, savedAt: new Date().toISOString() };
      localStorage.setItem('signal-lost:' + slot, JSON.stringify(record));
      return record;
    },
    load(slot = 'autosave') {
      const raw = localStorage.getItem('signal-lost:' + slot);
      if (!raw) return false;
      const record = JSON.parse(raw);
      data = record.data;
      notify();
      return record;
    },
    listSlots() {
      const slots = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('signal-lost:')) {
          try {
            const record = JSON.parse(localStorage.getItem(key));
            slots.push({ slot: key.replace('signal-lost:', ''), savedAt: record.savedAt });
          } catch (e) { /* skip corrupt slot */ }
        }
      }
      return slots;
    },
    deleteSlot(slot) {
      localStorage.removeItem('signal-lost:' + slot);
    }
  };
})();
