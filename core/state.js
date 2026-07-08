/* ============================================================
   core/state.js
   One global state object every app reads/writes to, so data
   (chat history, contacts, calendar, story progress, etc.)
   survives navigation between apps. Persisted to localStorage
   via the Storage app.

   MULTI-CHARACTER REDESIGN (2026-07, see RANCANGAN_MULTI_KARAKTER.md):
   `profile` is now just the 3 things the player types in manually
   (their own name + their parents' names). The 10 other characters
   have fixed/baked-in names — see core/characters.js — so their
   runtime state (stats, revealed identity fields, story progress)
   lives under `characters`, built fresh from that registry below.

   `selfStats`/`selfIdentity` hold the player's OWN mood stats and
   biographical facts (job, dream, hobby, partner) — the latter start
   `null` and fill in gradually via story effects, not manual entry.

   NOTE ON OLD CONTENT: core/story.js still has the old linear
   assistant → partner → friend tutorial script, which references
   profile keys removed here ({{partner}}, {{userFriend}}, etc). Those
   tokens will simply render literally (unresolved) until that content
   is migrated into the 10-character system (planned for later steps —
   see RANCANGAN_MULTI_KARAKTER.md §1 build order). This does not
   crash anything; resolveText() falls back to leaving `{{x}}` as-is
   when a token has no resolver.

   `story.threads` holds, per DashChat conversation, which node
   of core/story.js it's currently on and how far a node has been
   "typed out" — so re-opening a chat resumes correctly instead of
   replaying lines that already happened. (The old `assistant` thread
   keeps using this shape; each of the 10 characters carries its own
   equivalent `story` sub-object of its own instead, see below.)
   ============================================================ */

const AppState = (function () {

  // ---- build the runtime slice for all 10 baked-in characters from
  // the static registry in core/characters.js. Called fresh by
  // defaultData() so every new game starts everyone at 0/unrevealed. ----
  function buildCharacterState() {
    const out = {};
    allCharacterIds().forEach(id => {
      out[id] = {
        stats: { love: 0, trust: 0, jealousy: 0, mood: 50 },
        identity: { pekerjaan: null, hobi: null, citaCita: null },
        identityUnlocked: [], // which of the fields above the player has "seen" so far
        story: { nodeId: id + '_start', ended: false, revealedCount: 0, awaiting: null, effectsRan: false },
        lastInteractedDay: null, // in-game `meta.day` of the last message exchanged, for neglect scoring
        messageCount: 0 // running total of messages sent to THIS character, for the
                        // "attention ratio" half of the neglect score — see
                        // Story.computeNeglect() in core/story.js
      };
    });
    return out;
  }

  // ---- default game data. Edit this to write your own story. ----
  function defaultData() {
    return {
      meta: {
        day: 1,
        ambientTick: 810, // matches phone.time's starting value below (810 = 13:30);
                          // every 1440 minutes rolls `day` forward — see AppState.tick()
        createdAt: null
      },
      phone: {
        network: 4,      // 0-4 bars, drop this for "signal lost" moments
        battery: 78,      // 0-100
        time: 810         // in-game clock, minutes since midnight (810 = 13:30).
                          // Fictional — independent of the real device clock.
                          // Now advances via ambientTick (see meta above),
                          // not only via one-off cutscenes.
      },

      // ---- story profile: the only things the player fills in
      // manually (Pengaturan > Profil Cerita). Everyone else's name
      // is fixed story data — see core/characters.js. ----
      profile: {
        user:       { name: '' }, // {{user}}
        userMom:    { name: '' }, // {{userMom}}
        userDad:    { name: '' }, // {{userDad}}
        userGender: ''            // 'f' | 'm' | '' (unset) — restricts which of
                                  // the 10 characters are eligible "pasangan"
                                  // candidates (opposite gender only). See
                                  // Story.eligiblePartnerIds() in core/story.js
                                  // and RANCANGAN_MULTI_KARAKTER.md §10.1.
      },

      // ---- the player's own mood stats (not tied to any one
      // character) and biographical identity (starts unknown, fills
      // in from story effects as the game progresses). ----
      selfStats: {
        happiness: 60, // kesenangan
        sadness: 20,   // kesedihan
        jealousy: 10,  // cemburu (milik user sendiri, beda dari jealousy per-karakter)
        money: 150000  // keuangan, dari mini-job & efek cerita
      },
      selfIdentity: {
        pekerjaan: null,
        citaCita: null,
        hobi: null,
        pasangan: null // diisi otomatis dengan id karakter (mis. 'char_nadia') saat "committed"
      },

      // ---- runtime state for the 10 baked-in characters, see
      // buildCharacterState() above and core/characters.js ----
      characters: buildCharacterState(),

      // total messages sent to ANY of the 10 characters, ever — the
      // denominator for each character's "attention ratio" half of the
      // neglect score (see Story.computeNeglect() in core/story.js).
      attention: { totalMessages: 0 },

      // ---- story progress for scripted threads that aren't one of
      // the 10 characters (currently just the old assistant tutorial).
      // Each of the 10 characters carries its own equivalent shape
      // inside characters[id].story instead of here. ----
      story: {
        threads: {
          assistant: { nodeId: 'a_start', ended: false, revealedCount: 0, awaiting: null, effectsRan: false }
        }
      },

      contacts: [
        { id: 'assistant', name: 'Asisten', avatar: 'A', lastUpdate: '', isNew: true }
        // the 10 characters get added here once Contacts/DashChat are
        // wired up to characters.js (see RANCANGAN_MULTI_KARAKTER.md §1,
        // build-order step "Contacts & DashChat")
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
    user:    () => data.profile.user.name || 'Kamu',
    userMom: () => data.profile.userMom.name || 'ibumu',
    userDad: () => data.profile.userDad.name || 'ayahmu',
    // resolves to whichever of the 10 characters has become the
    // player's partner (selfIdentity.pasangan), or a vague fallback
    // before that's decided — see RANCANGAN_MULTI_KARAKTER.md §6
    partnerName: () => {
      const pid = data.selfIdentity.pasangan;
      return (pid && CHARACTERS[pid]) ? CHARACTERS[pid].name : 'seseorang';
    }
  };

  // Any {{char_xxx}} token resolves directly to that character's
  // fixed name from the registry (rarely needed since dialogue can
  // just write the name directly, but handy for shared/templated lines
  // reused across characters).
  function resolveCharToken(key) {
    return CHARACTERS[key] ? CHARACTERS[key].name : null;
  }

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

    // ---- ambient game time (see RANCANGAN_MULTI_KARAKTER.md §2) ----
    // The canonical way to advance in-game time. `meta.ambientTick` is
    // a running total of in-game minutes since the start of day 1;
    // `phone.time` and `meta.day` are always kept as a live mirror of
    // it, so anything reading either one directly (statusBar, dashchat
    // neglect-scoring, etc.) stays consistent no matter what caused the
    // advance — a screen change, a sent message, or a cutscene like
    // screens/timeSkip.js fast-forwarding many minutes at once.
    tick(minutes) {
      if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return;
      data.meta.ambientTick += minutes;
      data.phone.time = data.meta.ambientTick % 1440;
      data.meta.day = Math.floor(data.meta.ambientTick / 1440) + 1;
      notify();
    },

    // replace every {{token}} in a string with the matching profile
    // name, a resolved character name (e.g. {{char_nadia}}), or leave
    // it as literal text if neither resolver recognizes the key (this
    // is the deliberate fallback for old content referencing removed
    // tokens like {{partner}}/{{userFriend}} — see header note above).
    resolveText(str) {
      if (!str) return str;
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const fn = TOKENS[key];
        if (fn) return fn();
        const charName = resolveCharToken(key);
        if (charName) return charName;
        return match;
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
