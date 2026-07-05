/* ============================================================
   core/state.js
   One global state object every app reads/writes to, so data
   (chat history, contacts, calendar, story progress, etc.)
   survives navigation between apps. Persisted to localStorage
   via the Storage app.

   `profile` holds every real-world name the story can reference
   (via {{token}} placeholders resolved by AppState.resolveText).
   `story.threads` holds, per DashChat conversation, which node
   of core/story.js it's currently on and how far a node has been
   "typed out" — so re-opening a chat resumes correctly instead of
   replaying lines that already happened.
   ============================================================ */

const AppState = (function () {

  // ---- default game data. Edit this to write your own story. ----
  function defaultData() {
    return {
      meta: {
        day: 1,
        createdAt: null
      },
      phone: {
        network: 4,      // 0-4 bars, drop this for "signal lost" moments
        battery: 78,      // 0-100
        time: 810         // in-game clock, minutes since midnight (810 = 13:30).
                          // Fictional — independent of the real device clock.
                          // Only story beats (like a time-skip cutscene) move it.
      },

      // ---- story profile: every name the story can reference ----
      // Edit these anytime in Pengaturan > Profil Cerita; every place
      // that shows a {{token}} (chat bubbles, contact names, notifs)
      // re-reads from here.
      profile: {
        user:          { name: '' }, // {{user}}
        partner:       { name: '' }, // {{partner}}
        userFriend:    { name: '' }, // {{userFriend}}
        partnerFriend: { name: '' }, // {{partnerFriend}}
        userMom:       { name: '' }, // {{userMom}}
        userDad:       { name: '' }, // {{userDad}}
        partnerMom:    { name: '' }, // {{partnerMom}}
        partnerDad:    { name: '' }  // {{partnerDad}}
      },

      // ---- story progress, one entry per DashChat thread that has
      // a script attached (see core/story.js). ----
      story: {
        threads: {
          assistant: { nodeId: 'a_start', ended: false, revealedCount: 0, awaiting: null, effectsRan: false }
        }
      },

      contacts: [
        { id: 'assistant', name: 'Asisten', avatar: 'A', lastUpdate: '', isNew: true }
      ],
      chats: {
        // chatId: { name, messages: [{from:'me'|'them', text, time}] }
        assistant: { name: 'Asisten', messages: [] }
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
        textSize: 'normal',
        autoAdvance: false // if true, single-choice story beats advance without a tap
      },
      flags: {} // story flags/branching state, e.g. { partnerRevealed: true }
    };
  }

  let data = defaultData();
  const listeners = new Set();

  function notify() { listeners.forEach(fn => fn(data)); }

  // ---- {{token}} resolver used by core/story.js and anywhere else
  // that needs to print a name the player supplied. Falls back to a
  // generic word so half-filled profiles never show a literal "undefined". ----
  const TOKENS = {
    user:          () => data.profile.user.name || 'Kamu',
    partner:       () => data.profile.partner.name || 'dia',
    userFriend:    () => data.profile.userFriend.name || 'sahabatmu',
    partnerFriend: () => data.profile.partnerFriend.name || 'sahabatnya',
    userMom:       () => data.profile.userMom.name || 'ibumu',
    userDad:       () => data.profile.userDad.name || 'ayahmu',
    partnerMom:    () => data.profile.partnerMom.name || 'ibunya',
    partnerDad:    () => data.profile.partnerDad.name || 'ayahnya'
  };

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
    // for code that mutates nested arrays/objects directly (contacts,
    // chats, story progress) and just needs to tell subscribers "something changed"
    touch() { notify(); },
    reset() { data = defaultData(); notify(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // replace every {{token}} in a string with the matching profile name
    resolveText(str) {
      if (!str) return str;
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const fn = TOKENS[key];
        return fn ? fn() : match;
      });
    },

    // generic dot-path getter, e.g. AppState.getPath('profile.user.name')
    getPath(path) {
      return path.split('.').reduce((o, k) => (o == null ? o : o[k]), data);
    },

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
