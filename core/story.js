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
          'Halo.',
          'Sebelum kamu tanya-tanya duluan: ponsel ini baru, tapi sinyalnya bukan sinyal ponsel baru pada umumnya.',
          'Aku di sini buat bantu kamu paham cara pakainya dulu, sebelum semuanya jalan sendiri.'
        ],
        next: 'a_mech_intro'
      },

      a_mech_intro: {
        lines: [
          'Cara kerjanya sederhana. Kalau aku nanya sesuatu yang butuh jawaban bebas, kotak tulis di bawah bakal aktif — kamu ketik sendiri jawabannya.',
          'Kalau aku kasih beberapa opsi jawaban, opsi itu muncul sebagai tombol di atas kotak tulis. Tinggal ketuk salah satu.',
          'Selain itu, kotak tulisnya nonaktif. Ini bukan obrolan bebas — lebih ke... percakapan yang nunggu gilirannya.'
        ],
        next: 'a_ask_user_name'
      },

      a_ask_user_name: {
        lines: ['Kita mulai dari yang paling dasar dulu.'],
        input: { placeholder: 'Ketik nama kamu...', savesTo: 'profile.user.name', next: 'a_ack_user_name' }
      },
      a_ack_user_name: {
        lines: ['{{user}}. Oke, dicatat.'],
        next: 'a_ask_partner_name'
      },

      a_ask_partner_name: {
        lines: [
          'Sekarang yang agak personal.',
          'Siapa nama orang yang paling penting buat kamu sekarang ini?'
        ],
        input: { placeholder: 'Nama dia...', savesTo: 'profile.partner.name', next: 'a_ack_partner_name' }
      },
      a_ack_partner_name: {
        lines: ['{{partner}}. Baik. Ingat-ingat nama itu — nanti kepakai.'],
        next: 'a_ask_user_friend'
      },

      a_ask_user_friend: {
        lines: ['Satu lagi soal kamu sendiri.', 'Siapa sahabat paling dekat kamu?'],
        input: { placeholder: 'Nama sahabatmu...', savesTo: 'profile.userFriend.name', next: 'a_ack_user_friend' }
      },
      a_ack_user_friend: {
        lines: ['{{userFriend}}. Oke.'],
        next: 'a_ask_partner_friend'
      },

      a_ask_partner_friend: {
        lines: ['Kalau sahabat dekat {{partner}}, siapa namanya?'],
        input: { placeholder: 'Nama sahabat pasanganmu...', savesTo: 'profile.partnerFriend.name', next: 'a_ack_partner_friend' }
      },
      a_ack_partner_friend: {
        lines: ['{{partnerFriend}}. Dicatat juga.'],
        next: 'a_ask_user_mom'
      },

      a_ask_user_mom: {
        lines: ['Sekarang soal keluarga.', 'Nama ibu kamu?'],
        input: { placeholder: 'Nama ibu kamu...', savesTo: 'profile.userMom.name', next: 'a_ack_user_mom' }
      },
      a_ack_user_mom: {
        lines: ['Baik, {{userMom}}.'],
        next: 'a_ask_user_dad'
      },

      a_ask_user_dad: {
        lines: ['Nama ayah kamu?'],
        input: { placeholder: 'Nama ayah kamu...', savesTo: 'profile.userDad.name', next: 'a_ack_user_dad' }
      },
      a_ack_user_dad: {
        lines: ['{{userDad}}. Sip.'],
        next: 'a_ask_partner_mom'
      },

      a_ask_partner_mom: {
        lines: ['Sekarang keluarga {{partner}}.', 'Nama ibunya?'],
        input: { placeholder: 'Nama ibu pasanganmu...', savesTo: 'profile.partnerMom.name', next: 'a_ack_partner_mom' }
      },
      a_ack_partner_mom: {
        lines: ['{{partnerMom}}. Oke.'],
        next: 'a_ask_partner_dad'
      },

      a_ask_partner_dad: {
        lines: ['Terakhir. Nama ayah {{partner}}?'],
        input: { placeholder: 'Nama ayah pasanganmu...', savesTo: 'profile.partnerDad.name', next: 'a_ack_partner_dad' }
      },
      a_ack_partner_dad: {
        lines: ['{{partnerDad}}. Semua nama penting udah aku catat.'],
        next: 'a_demo_choice'
      },

      // ---- real branching demo: three genuinely different replies ----
      a_demo_choice: {
        lines: [
          'Sekarang coba cara milih opsi — ini cuma latihan, jawab apa aja yang paling kerasa benar.',
          'Gimana perasaan kamu soal ponsel baru ini?'
        ],
        choices: [
          { label: 'Biasa aja, cuma ponsel.', next: 'a_after_casual' },
          { label: 'Agak was-was, jujur.', next: 'a_after_wary' },
          { label: 'Penasaran — kenapa sinyalnya aneh?', next: 'a_after_curious' }
        ]
      },
      a_after_casual: { lines: ['Santai. Semoga tetap begitu terus.'], next: 'a_single_note' },
      a_after_wary:   { lines: ['Wajar kok. Aku juga, sebenarnya.'], next: 'a_single_note' },
      a_after_curious:{ lines: ['Jujur, aku juga belum punya jawaban pasti soal itu.'], next: 'a_single_note' },

      a_single_note: {
        lines: [
          'Satu hal lagi sebelum aku pergi.',
          'Kadang nanti cuma ada satu pilihan yang muncul di obrolan — itu normal, bukan bug.',
          'Kalau kamu males mengetuk setiap kali itu terjadi, nyalain "Lanjut Otomatis" di Pengaturan. Nanti otomatis lanjut sendiri.'
        ],
        next: 'a_single_demo'
      },
      a_single_demo: {
        lines: ['Contohnya kayak gini.'],
        choices: [ { label: 'Oke, aku ngerti.', next: 'a_farewell' } ]
      },

      // ---- handoff: assistant disappears, partner contact appears ----
      a_farewell: {
        lines: [
          'Kurasa itu semua yang perlu kamu tahu buat sekarang, {{user}}.',
          'Setelah ini aku bakal diam. Percakapan kita akan hilang dari daftar kontak — memang begitu cara ponsel ini kerja.',
          'Tapi jangan kaget kalau nanti ada kontak baru muncul.',
          'Hati-hati sama sinyalnya.'
        ],
        effects: [
          { type: 'endThread', threadId: 'assistant' },
          { type: 'spawnThread', threadId: 'partner', contactId: 'partner', name: '???', avatar: '?', startNode: 'p_start' },
          { type: 'notify', title: '??? ', body: 'Ada pesan baru masuk...' }
        ]
      }
    },

    // ---------------------------------------------------------
    // PARTNER — the mystery contact "???" that replaces Asisten.
    // Starter arc: establishes dread/intrigue, gives the player
    // a couple of genuinely different branches, then reveals the
    // contact's real name (pulled from profile.partner.name) and
    // stops on a cliffhanger — this is where future content picks
    // up, see CHANGES.md.
    // ---------------------------------------------------------
    partner: {
      p_start: {
        lines: ['...', 'Kamu masih bisa baca ini?', 'Aku nggak tau harus mulai dari mana.'],
        next: 'p_choice1'
      },
      p_choice1: {
        lines: ['Ini aku sebenarnya. Aku tau kedengarannya aneh kalau nomor ini keliatan asing buatmu.'],
        choices: [
          { label: 'Siapa ini?', next: 'p_branch_who' },
          { label: 'Kamu kenal aku?', next: 'p_branch_know' },
          { label: '(Diam, tunggu dia lanjut bicara)', next: 'p_branch_silent' }
        ]
      },
      p_branch_who:   { lines: ['Pertanyaan yang wajar.', 'Tapi aku belum bisa jawab itu sekarang. Belum waktunya.'], next: 'p_common1' },
      p_branch_know:  { lines: ['Kenal? Lebih dari itu, kurasa.', 'Tapi ponsel ini nggak ngizinin aku bilang lebih jauh dulu.'], next: 'p_common1' },
      p_branch_silent:{ lines: ['...', 'Kamu diam. Oke.', 'Aku ngerti kalau ini kedengarannya aneh.'], next: 'p_common1' },

      p_common1: {
        lines: ['Yang penting, aku masih di sini.', 'Aku akan cerita pelan-pelan, kalau sinyalnya izinin.'],
        next: 'p_choice2'
      },
      p_choice2: {
        lines: ['Kamu percaya aku?'],
        choices: [
          { label: 'Belum tahu.', next: 'p_branch_unsure' },
          { label: 'Coba aja dulu.', next: 'p_branch_trust' }
        ]
      },
      p_branch_unsure:{ lines: ['Jujur, aku juga nggak yakin harus percaya diriku sendiri sekarang.'], next: 'p_reveal_setup' },
      p_branch_trust: { lines: ['Itu... lebih dari yang aku harap.'], next: 'p_reveal_setup' },

      p_reveal_setup: {
        lines: ['Ada satu hal yang pasti nggak berubah, walau sinyal ini kacau.', 'Nama panggilan yang cuma kamu yang tau.'],
        choices: [ { label: 'Ucapin.', next: 'p_reveal' } ]
      },
      p_reveal: {
        lines: ['Ini aku, {{partner}}.'],
        effects: [
          { type: 'renameThread', threadId: 'partner', name: '{{partner}}' },
          { type: 'setFlag', flag: 'partnerRevealed', value: true }
        ],
        next: 'p_after_reveal'
      },
      p_after_reveal: {
        lines: ['Maaf soal semua misteri barusan.', 'Aku... nggak tau harus mulai dari mana buat cerita apa yang sebenarnya terjadi.'],
        next: 'p_hold'
      },
      p_hold: {
        // dead end on purpose — cliffhanger, next content continues here
        lines: ['Sinyalnya mulai nggak stabil lagi di sisiku.', 'Aku hubungin lagi kalau udah bisa...']
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
            Notify.show({ title: resolveText(fx.title), body: resolveText(fx.body) });
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

        default:
          console.warn('Story: unknown effect type', fx.type);
      }
    });
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
    runEffectsOnce
  };
})();
