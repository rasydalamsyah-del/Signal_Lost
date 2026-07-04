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
                           — checked by apps/dashchat.js BEFORE this node's
                           lines are shown. If every dot-path in `paths`
                           already has a value, jump straight to `next`
                           instead (used so the assistant doesn't re-ask
                           for names the player already filled in
                           Pengaturan). Individual `input` nodes also
                           silently skip themselves the same way, per field.

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
          'oh iya — kalo aku nanya sesuatu, biasanya kamu tinggal jawab pake kata-kata sendiri di kotak bawah.',
          'tapi kalo aku kasih beberapa pilihan jawaban, tinggal pencet salah satu aja, gak usah diketik.'
        ],
        next: 'a_profile_gate'
      },

      // gate: kalau player udah isi semua nama di Pengaturan sebelum buka chat
      // ini, skip seluruh sesi tanya-nama dan langsung ke demo pilihan.
      a_profile_gate: {
        lines: [],
        skipTo: {
          when: 'allFilled',
          paths: [
            'profile.user.name', 'profile.partner.name',
            'profile.userFriend.name', 'profile.partnerFriend.name',
            'profile.userMom.name', 'profile.userDad.name',
            'profile.partnerMom.name', 'profile.partnerDad.name'
          ],
          next: 'a_profile_prefilled'
        },
        next: 'a_ask_user_name'
      },
      a_profile_prefilled: {
        lines: [
          'eh btw, kelihatannya kamu udah isi semua data itu duluan di Pengaturan.',
          'oke, aku pake yang udah ada aja kalau gitu.'
        ],
        next: 'a_demo_choice'
      },

      // setiap node di bawah ini otomatis di-skip sendiri-sendiri kalau
      // field-nya udah keisi (lihat pengecekan di apps/dashchat.js)
      a_ask_user_name: {
        lines: ['btw aku lupa nanya, nama kamu siapa?'],
        input: { placeholder: 'Ketik nama kamu...', savesTo: 'profile.user.name', next: 'a_ack_user_name' }
      },
      a_ack_user_name: { lines: ['oh, {{user}}. oke.'], next: 'a_ask_partner_name' },

      a_ask_partner_name: {
        lines: ['terus... orang yang paling penting buat kamu sekarang ini, siapa namanya?'],
        input: { placeholder: 'Nama dia...', savesTo: 'profile.partner.name', next: 'a_ack_partner_name' }
      },
      a_ack_partner_name: { lines: ['{{partner}}, ya udah. aku inget itu.'], next: 'a_ask_user_friend' },

      a_ask_user_friend: {
        lines: ['sahabat paling deket kamu siapa?'],
        input: { placeholder: 'Nama sahabatmu...', savesTo: 'profile.userFriend.name', next: 'a_ack_user_friend' }
      },
      a_ack_user_friend: { lines: ['{{userFriend}}, noted.'], next: 'a_ask_partner_friend' },

      a_ask_partner_friend: {
        lines: ['kalo sahabat deketnya {{partner}}, siapa?'],
        input: { placeholder: 'Nama sahabat pasanganmu...', savesTo: 'profile.partnerFriend.name', next: 'a_ack_partner_friend' }
      },
      a_ack_partner_friend: { lines: ['{{partnerFriend}}. oke, dicatat.'], next: 'a_ask_user_mom' },

      a_ask_user_mom: {
        lines: ['nama ibu kamu?'],
        input: { placeholder: 'Nama ibu kamu...', savesTo: 'profile.userMom.name', next: 'a_ack_user_mom' }
      },
      a_ack_user_mom: { lines: ['{{userMom}}, oke.'], next: 'a_ask_user_dad' },

      a_ask_user_dad: {
        lines: ['nama ayah kamu?'],
        input: { placeholder: 'Nama ayah kamu...', savesTo: 'profile.userDad.name', next: 'a_ack_user_dad' }
      },
      a_ack_user_dad: { lines: ['{{userDad}}. sip.'], next: 'a_ask_partner_mom' },

      a_ask_partner_mom: {
        lines: ['nama ibunya {{partner}}?'],
        input: { placeholder: 'Nama ibu pasanganmu...', savesTo: 'profile.partnerMom.name', next: 'a_ack_partner_mom' }
      },
      a_ack_partner_mom: { lines: ['{{partnerMom}}, oke.'], next: 'a_ask_partner_dad' },

      a_ask_partner_dad: {
        lines: ['terakhir — ayahnya {{partner}}, siapa?'],
        input: { placeholder: 'Nama ayah pasanganmu...', savesTo: 'profile.partnerDad.name', next: 'a_ack_partner_dad' }
      },
      a_ack_partner_dad: { lines: ['{{partnerDad}}. oke, semuanya udah aku catet.'], next: 'a_demo_choice' },

      // ---- real branching demo: three genuinely different replies ----
      a_demo_choice: {
        lines: [
          'btw coba jawab ini — cuma buat mastiin fiturnya jalan beneran.',
          'gimana perasaan kamu soal hp baru ini?'
        ],
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
          'oh iya, satu lagi — kadang nanti cuma ada satu pilihan doang yang muncul di obrolan.',
          'itu normal, bukan error. kalo males mencet terus, nyalain "Lanjut Otomatis" di Pengaturan aja.'
        ],
        next: 'a_single_demo'
      },
      a_single_demo: {
        lines: ['contohnya kayak gini nih.'],
        choices: [ { label: 'Oke, ngerti.', next: 'a_farewell' } ]
      },

      // ---- handoff: assistant disappears, partner contact appears ----
      a_farewell: {
        lines: [
          'oke {{user}}, kayaknya itu doang yang perlu kamu tau buat sekarang.',
          'aku bakal ilang dari kontak setelah ini — emang gitu sistemnya, jangan kaget.',
          'tapi bentar lagi bakal ada nomor baru yang masuk.',
          'hati-hati aja sama sinyal di hp ini.'
        ],
        effects: [
          { type: 'endThread', threadId: 'assistant' },
          { type: 'spawnThread', threadId: 'partner', contactId: 'partner', name: '???', avatar: '?', startNode: 'p_start' },
          { type: 'notify', title: '??? ', body: 'Ada pesan baru masuk...', chatId: 'partner' }
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
        next: 'p_hold'
      },
      p_hold: {
        // dead end on purpose — cliffhanger, next content continues here
        lines: ['koneksi di sini mulai jelek lagi.', 'aku hubungin lagi kalo udah bisa ya...']
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
