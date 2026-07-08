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
          { type: 'endThread', threadId: 'assistant' },
          { type: 'introduceAllCharacters' }
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

  // ---- STARTER STUBS for the 10 baked-in characters (RANCANGAN_MULTI_KARAKTER.md) ----
  // Placeholder content, NOT the real per-character writing planned for
  // Langkah 8 — this exists so the framework (contacts, DashChat,
  // effect engine, neglect scoring, Diri app) has something real to
  // run end-to-end for every one of the 10 right now, instead of
  // crashing/being empty. Deliberately generic and short; each
  // character's actual voice/arc gets written properly later, at
  // which point these stub nodes get replaced (same node ids can be
  // reused so nothing else needs to change).
  //
  // Each stub: a short opener, one real branching choice (proves
  // effects fire correctly — nudges `trust` and reveals `pekerjaan`
  // via the identity system built in Langkah 3), then a dead end
  // (`next` omitted) marking "content continues here later".
  allCharacterIds().forEach(id => {
    const def = CHARACTERS[id];
    STORY[id] = {
      [id + '_start']: {
        lines: [
          'eh, hai. ' + def.name + ' — nomor kamu baru masuk di kontakku.',
          'agak random emang, tapi ya udah say hi aja dulu deh wkwk.'
        ],
        next: id + '_intro_choice'
      },
      [id + '_intro_choice']: {
        lines: ['gimana, mau kenalan dulu?'],
        choices: [
          {
            label: 'Boleh, cerita dong.',
            next: id + '_stub_reveal',
            effects: [{ type: 'adjustStat', target: id, stat: 'trust', delta: 5 }]
          },
          { label: '(masih agak canggung, liat-liat dulu)', next: id + '_stub_end' }
        ]
      },
      [id + '_stub_reveal']: {
        lines: ['sehari-hari aku kerja jadi ' + def.job.title.toLowerCase() + '.', 'lumayan kok, walau kadang capek juga.'],
        effects: [{ type: 'revealIdentity', target: id, field: 'pekerjaan', value: def.job.title }],
        next: id + '_stub_end'
      },
      [id + '_stub_end']: {
        // sengaja tidak ada `next` — jalan buntu, nunggu konten asli (Langkah 8)
        lines: ['oke, segini dulu obrolan kita ya — lanjutannya nyusul kapan-kapan.']
      }
    };
  });

  // ---- job system demo (RANCANGAN_MULTI_KARAKTER.md §4) ----
  // char_nadia and char_dimas are BOTH baristas on purpose (see the
  // comment in core/characters.js) so there's a real pair to
  // demonstrate mini-jobs + profession overlap right now. Nadia's
  // mini-job offer below is the real trigger for this; Dimas's gate
  // (further down) checks for it.

  STORY.char_dimas.char_dimas_start.next = 'char_dimas_job_gate';
  STORY.char_dimas.char_dimas_job_gate = {
    lines: [],
    skipTo: { when: 'jobOverlap', charId: 'char_dimas', next: 'char_dimas_overlap_greet' },
    next: 'char_dimas_intro_choice'
  };
  STORY.char_dimas.char_dimas_overlap_greet = {
    lines: [
      'eh tunggu — kamu kerja jadi barista juga ya sekarang?',
      'anjir kita satu profesi dong, lucu banget wkwk.'
    ],
    next: 'char_dimas_intro_choice'
  };

  // ===========================================================
  // REAL CONTENT (Langkah 8) — replaces the generic stub for the
  // characters written so far. The other 8 still use the generic
  // stub from the forEach loop above until their turn. See
  // RANCANGAN_MULTI_KARAKTER.md §1 (build order) / §9 (progress log).
  // ===========================================================

  // ---------------------------------------------------------
  // NADIA — barista, ceria, banyak becanda, upfront/expressive.
  // Warms up fast; the "cost" of that ease is she's an open book,
  // so leaning into it (flirty choice below) visibly nudges rivals.
  // ---------------------------------------------------------
  STORY.char_nadia = {
    char_nadia_start: {
      lines: [
        'woy halo! kontak baru ya kayaknya wkwk',
        'gapapa kan aku sok akrab? aku emang gini orangnya'
      ],
      next: 'char_nadia_vibe_choice'
    },
    char_nadia_vibe_choice: {
      lines: ['btw kamu tipe yang suka basa-basi dulu, apa langsung to the point aja?'],
      choices: [
        {
          label: 'Basa-basi dulu, biar akrab.',
          next: 'char_nadia_after_basabasi',
          effects: [{ type: 'adjustStat', target: 'char_nadia', stat: 'trust', delta: 3 }]
        },
        {
          label: 'To the point aja.',
          next: 'char_nadia_after_direct',
          effects: [{ type: 'adjustStat', target: 'char_nadia', stat: 'trust', delta: 3 }]
        }
      ]
    },
    char_nadia_after_basabasi: {
      lines: ['nah gitu dong, aku demen banget basa-basi wkwk', 'eh tapi tetep, aku gak akan tanya yang aneh-aneh kok santai aja'],
      next: 'char_nadia_reveal_job'
    },
    char_nadia_after_direct: {
      lines: ['oke sip, aku juga males muter-muter sih sebenernya', 'to the point emang paling enak, gak buang waktu'],
      next: 'char_nadia_reveal_job'
    },
    char_nadia_reveal_job: {
      lines: ['btw kerjaanku barista, di kedai kopi deket sini.', 'kalo kamu lewat mampir aja, aku kasih diskon temen wkwk'],
      effects: [{ type: 'revealIdentity', target: 'char_nadia', field: 'pekerjaan', value: 'Barista' }],
      next: 'char_nadia_ask_hobby'
    },
    char_nadia_ask_hobby: {
      lines: ['kalo kamu, hobinya apa sih?'],
      choices: [
        {
          label: 'Aku lebih suka denger cerita kamu dulu deh.',
          next: 'char_nadia_hobby_reveal',
          effects: [
            { type: 'adjustStat', target: 'char_nadia', stat: 'love', delta: 4 },
            { type: 'rivalRipple', source: 'char_nadia', targetStat: 'jealousy', delta: 3 }
          ]
        },
        { label: '(masih agak males cerita soal diri sendiri)', next: 'char_nadia_hobby_reveal' }
      ]
    },
    char_nadia_hobby_reveal: {
      lines: ['ya udah aku duluan deh cerita.', 'hobiku foto-foto pake kamera film, analog gitu. rada mahal tapi hasilnya seru banget'],
      effects: [{ type: 'revealIdentity', target: 'char_nadia', field: 'hobi', value: 'Fotografi Analog' }],
      next: 'char_nadia_minijob_offer'
    },
    char_nadia_minijob_offer: {
      lines: ['eh btw, kedai kopi tempatku kerja lagi butuh orang bantuin shift sore, kebetulan!', 'mau coba gak? lumayan buat uang jajan'],
      choices: [
        {
          label: 'Boleh, coba deh.',
          next: 'char_nadia_minijob_done',
          effects: [{ type: 'completeMiniJob', reward: 75000, jobTitle: 'Barista' }]
        },
        { label: 'Kayaknya nggak dulu deh.', next: 'char_nadia_minijob_decline' }
      ]
    },
    char_nadia_minijob_done: {
      lines: ['asik, makasih banyak ya! ini buat kamu.', 'kerja bareng ternyata seru juga, kamu emang asik diajak kerja sama'],
      effects: [
        { type: 'adjustStat', target: 'char_nadia', stat: 'love', delta: 5 },
        { type: 'globalRipple', source: 'char_nadia', condition: { stat: 'love', gte: 10 }, targetStat: 'jealousy', delta: 2 }
      ],
      next: 'char_nadia_milestone'
    },
    char_nadia_minijob_decline: {
      lines: ['oke deh, nggak apa-apa kok. kapan-kapan aja kalo mood.'],
      next: 'char_nadia_milestone'
    },
    char_nadia_milestone: {
      // sengaja tidak ada `next` — jalan buntu, nunggu lanjutan (Langkah 8 berikutnya)
      lines: ['btw seneng deh akhirnya ada temen ngobrol baru wkwk', 'chat-chat lagi ya, aku available kok kalo kamu butuh temen cerita']
    }
  };

  // ---------------------------------------------------------
  // KIRANA — desainer grafis freelance, tertutup/dry humor,
  // perfeksionis. Beda total sama Nadia: gak langsung cair, harus
  // sabar dulu. Pilihan yang mendesak dia malah bikin trust turun;
  // pilihan yang ngasih ruang justru bikin dia lebih kebuka.
  // ---------------------------------------------------------
  STORY.char_kirana = {
    char_kirana_start: {
      lines: ['...siapa ya? oh, kontak baru.', 'lagi rada sibuk sih, tapi ya udah, hai.'],
      next: 'char_kirana_busy_choice'
    },
    char_kirana_busy_choice: {
      lines: ['kamu nyariin siapa emangnya, atau emang random doang nih.'],
      choices: [
        {
          label: 'Random doang. Kalo lagi sibuk, aku chat nanti aja.',
          next: 'char_kirana_after_patient',
          effects: [{ type: 'adjustStat', target: 'char_kirana', stat: 'trust', delta: 5 }]
        },
        {
          label: 'Gapapa kok, cerita aja santai, aku dengerin.',
          next: 'char_kirana_after_pushy',
          effects: [
            { type: 'adjustStat', target: 'char_kirana', stat: 'trust', delta: -2 },
            { type: 'adjustStat', target: 'char_kirana', stat: 'mood', delta: -2 }
          ]
        }
      ]
    },
    char_kirana_after_patient: {
      lines: ['oh... oke, makasih ya udah ngerti.', 'jarang-jarang ada yang gak maksa ngobrol pas aku bilang sibuk.'],
      next: 'char_kirana_reveal_job'
    },
    char_kirana_after_pushy: {
      lines: ['...oke deh.', '(dia keliatan agak males, tapi tetep bales)'],
      next: 'char_kirana_reveal_job'
    },
    char_kirana_reveal_job: {
      lines: ['kerjaanku desainer grafis, freelance.', 'lagi ngerjain revisi klien yang... yah, gitu deh.'],
      effects: [{ type: 'revealIdentity', target: 'char_kirana', field: 'pekerjaan', value: 'Desainer Grafis' }],
      next: 'char_kirana_deadline_vent'
    },
    char_kirana_deadline_vent: {
      lines: ['kliennya minta revisi ke-7 hari ini. tujuh.', 'kadang capek juga ngerjain sesuatu yang gak pernah dirasa cukup bagus.'],
      choices: [
        {
          label: 'Wajar kok kesel. Istirahat dulu gih.',
          next: 'char_kirana_after_support',
          effects: [
            { type: 'adjustStat', target: 'char_kirana', stat: 'trust', delta: 4 },
            { type: 'adjustStat', target: 'char_kirana', stat: 'love', delta: 2 }
          ]
        },
        {
          label: 'Coba dibikin moodboard, biar klien jelas maunya apa.',
          next: 'char_kirana_after_advice',
          effects: [{ type: 'adjustStat', target: 'char_kirana', stat: 'trust', delta: 6 }]
        }
      ]
    },
    char_kirana_after_support: {
      lines: ['...makasih.', 'kadang emang cuma butuh didenger doang sih, bukan disolusiin mulu.'],
      next: 'char_kirana_reveal_hobby'
    },
    char_kirana_after_advice: {
      lines: ['...itu ide bagus sih, jujur.', 'kamu ngerti kerjaan gini juga ya?'],
      next: 'char_kirana_reveal_hobby'
    },
    char_kirana_reveal_hobby: {
      lines: ['di luar kerjaan, aku suka gambar digital buat diri sendiri. gak buat klien, buat aku doang.', 'itu satu-satunya waktu gambar gak berasa kayak kerjaan.'],
      effects: [{ type: 'revealIdentity', target: 'char_kirana', field: 'hobi', value: 'Menggambar Digital' }],
      next: 'char_kirana_minijob_offer'
    },
    char_kirana_minijob_offer: {
      lines: ['eh, kamu mau bantuin riset referensi visual gak buat project aku?', 'gampang kok, tinggal kumpulin gambar-gambar yang vibenya cocok.'],
      choices: [
        {
          label: 'Boleh, aku bantuin.',
          next: 'char_kirana_minijob_done',
          effects: [
            { type: 'completeMiniJob', reward: 60000, jobTitle: 'Desainer Grafis' },
            { type: 'adjustStat', target: 'char_kirana', stat: 'trust', delta: 5 }
          ]
        },
        { label: 'Kayaknya lagi nggak sempet deh.', next: 'char_kirana_minijob_decline' }
      ]
    },
    char_kirana_minijob_done: {
      lines: ['lumayan banget bantuannya, makasih ya.', 'ini buat kamu, walau gak seberapa.'],
      effects: [
        { type: 'adjustStat', target: 'char_kirana', stat: 'love', delta: 4 },
        { type: 'rivalRipple', source: 'char_kirana', targetStat: 'jealousy', delta: 3 }
      ],
      next: 'char_kirana_milestone'
    },
    char_kirana_minijob_decline: {
      lines: ['oke, gapapa kok. lain kali aja kalo sempet.'],
      next: 'char_kirana_milestone'
    },
    char_kirana_milestone: {
      // sengaja tidak ada `next` — jalan buntu, nunggu lanjutan (Langkah 8 berikutnya)
      lines: ['...kamu lumayan enak diajak ngobrol, ternyata.', 'jarang aku bilang gini ke orang baru sih. chat-chat lagi ya kalo sempet.'],
      effects: [{ type: 'globalRipple', source: 'char_kirana', condition: { stat: 'trust', gte: 15 }, targetStat: 'jealousy', delta: 2 }]
    }
  };

  // ---------------------------------------------------------
  // SALSA — mahasiswa, cemas/overthinking, sering butuh validasi.
  // Beda dari Nadia (percaya diri) dan Kirana (tertutup): dia
  // kebuka dari awal, tapi ngomongnya nervous & suka minta maaf
  // duluan. Responsnya lebih ke seberapa dia dibikin ngerasa aman,
  // bukan seberapa cepat/lambat dia kebuka.
  // ---------------------------------------------------------
  STORY.char_salsa = {
    char_salsa_start: {
      lines: [
        'HALO. eh kepencet caps, maaf ya.',
        'kamu siapa ya— eh maksudnya bukan nanya songong gitu, cuma belum kenal aja hehe maaf kalo aneh'
      ],
      next: 'char_salsa_ramble_choice'
    },
    char_salsa_ramble_choice: {
      lines: ['oke tarik napas dulu. jadi... kamu nemu kontakku dari mana emangnya?'],
      choices: [
        {
          label: 'Random aja muncul, santai kok.',
          next: 'char_salsa_after_chill',
          effects: [
            { type: 'adjustStat', target: 'char_salsa', stat: 'trust', delta: 4 },
            { type: 'adjustStat', target: 'char_salsa', stat: 'mood', delta: 3 }
          ]
        },
        {
          label: '(gak jawab, nunggu dia lanjut ngomong)',
          next: 'char_salsa_after_silence',
          effects: [{ type: 'adjustStat', target: 'char_salsa', stat: 'trust', delta: 1 }]
        }
      ]
    },
    char_salsa_after_chill: {
      lines: ['oh oke syukurlah, bukan yang aneh-aneh wkwk', 'aku emang suka overthinking orangnya, maaf ya kalo kelamaan mikir'],
      next: 'char_salsa_reveal_job'
    },
    char_salsa_after_silence: {
      lines: ['...eh kok diem, oke gapapa.', 'aku emang suka kebanyakan mikir sendiri sih, lanjut aja deh'],
      next: 'char_salsa_reveal_job'
    },
    char_salsa_reveal_job: {
      lines: ['aku masih kuliah btw, semesternya udah lumayan tanggung.', 'kadang mikir "abis ini ngapain ya" — anxiety tugas akhir tuh beda level'],
      effects: [{ type: 'revealIdentity', target: 'char_salsa', field: 'pekerjaan', value: 'Mahasiswa' }],
      next: 'char_salsa_worry_vent'
    },
    char_salsa_worry_vent: {
      lines: ['td abis presentasi, rasanya jelek banget, tp temen-temen bilang bagus doang.', 'aku tuh susah percaya kalo emang beneran bagus wkwk'],
      choices: [
        {
          label: 'Kalo kamu udah usaha maksimal, itu udah cukup kok.',
          next: 'char_salsa_after_validate',
          effects: [
            { type: 'adjustStat', target: 'char_salsa', stat: 'trust', delta: 5 },
            { type: 'adjustStat', target: 'char_salsa', stat: 'love', delta: 3 }
          ]
        },
        {
          label: 'Coba minta feedback yang spesifik, biar gak nebak-nebak sendiri.',
          next: 'char_salsa_after_practical',
          effects: [{ type: 'adjustStat', target: 'char_salsa', stat: 'trust', delta: 6 }]
        }
      ]
    },
    char_salsa_after_validate: {
      lines: ['...makasih ya. jarang ada yang bilang gitu ke aku.', 'kadang emang cuma butuh didenger doang sih ternyata'],
      next: 'char_salsa_reveal_hobby'
    },
    char_salsa_after_practical: {
      lines: ['eh iya bener juga, aku emang suka nebak-nebak sendiri.', 'nanti coba deh aku tanya yang spesifik ke dosennya'],
      next: 'char_salsa_reveal_hobby'
    },
    char_salsa_reveal_hobby: {
      lines: ['di luar kuliah aku suka nulis jurnal harian, buat ngeluarin isi kepala.', 'kadang berantakan tulisannya, tp lumayan ngebantu sih'],
      effects: [{ type: 'revealIdentity', target: 'char_salsa', field: 'hobi', value: 'Menulis Jurnal' }],
      next: 'char_salsa_minijob_offer'
    },
    char_salsa_minijob_offer: {
      lines: ['eh btw, dosenku lagi nyari asisten buat riset kecil-kecilan, honornya lumayan.', 'mau bantuin gak? gampang kok, cuma entry data doang'],
      choices: [
        {
          label: 'Boleh, aku bantuin.',
          next: 'char_salsa_minijob_done',
          effects: [{ type: 'completeMiniJob', reward: 40000, jobTitle: 'Asisten Riset' }]
        },
        { label: 'Kayaknya lagi banyak kerjaan lain deh.', next: 'char_salsa_minijob_decline' }
      ]
    },
    char_salsa_minijob_done: {
      lines: ['yeay, makasih banyak! ini honornya.', 'kamu nyelametin aku dari deadline serius wkwk'],
      effects: [
        { type: 'adjustStat', target: 'char_salsa', stat: 'love', delta: 5 },
        { type: 'rivalRipple', source: 'char_salsa', targetStat: 'jealousy', delta: 3 }
      ],
      next: 'char_salsa_milestone'
    },
    char_salsa_minijob_decline: {
      lines: ['oke gapapa kok, makasih ya udah mau didengerin aja udah cukup.'],
      next: 'char_salsa_milestone'
    },
    char_salsa_milestone: {
      // sengaja tidak ada `next` — jalan buntu, nunggu lanjutan (Langkah 8 berikutnya)
      lines: ['makasih ya udah mau dengerin overthinking-ku wkwk', 'jarang ada yang sabar denger curhat sepanjang ini'],
      effects: [{ type: 'globalRipple', source: 'char_salsa', condition: { stat: 'trust', gte: 15 }, targetStat: 'jealousy', delta: 2 }]
    }
  };

  // ---------------------------------------------------------
  // BAGAS — montir, santai/simpel, dikit ngomong tapi perhatian.
  // Kebalikan dari Salsa: gak nervous, gak muter-muter, dan
  // gak butuh divalidasi — responsnya lebih ke seberapa "dilihat"
  // dia ngerasa, bukan seberapa hangat kata-katanya.
  // ---------------------------------------------------------
  STORY.char_bagas = {
    char_bagas_start: {
      lines: ['eh, halo.', 'kontak baru? oke.'],
      next: 'char_bagas_smalltalk_choice'
    },
    char_bagas_smalltalk_choice: {
      lines: ['mau ngobrol apa nih, apa cuma say hi doang.'],
      choices: [
        {
          label: 'Cuma mau say hi, kenalan santai.',
          next: 'char_bagas_after_chill',
          effects: [{ type: 'adjustStat', target: 'char_bagas', stat: 'trust', delta: 4 }]
        },
        {
          label: 'Pengen tau kamu orangnya kayak gimana.',
          next: 'char_bagas_after_curious',
          effects: [
            { type: 'adjustStat', target: 'char_bagas', stat: 'trust', delta: 3 },
            { type: 'adjustStat', target: 'char_bagas', stat: 'love', delta: 2 }
          ]
        }
      ]
    },
    char_bagas_after_chill: {
      lines: ['oke, simpel. aku suka gitu.', 'gak semua obrolan harus dalem-dalem kan'],
      next: 'char_bagas_reveal_job'
    },
    char_bagas_after_curious: {
      lines: ['heh, to the point juga ternyata.', 'ya aku orangnya biasa aja sih, gak neko-neko'],
      next: 'char_bagas_reveal_job'
    },
    char_bagas_reveal_job: {
      lines: ['kerjaanku montir, di bengkel deket sini.', 'kerjaan kotor tapi enak — ngerasa kepake tiap kali benerin sesuatu yang rusak'],
      effects: [{ type: 'revealIdentity', target: 'char_bagas', field: 'pekerjaan', value: 'Montir' }],
      next: 'char_bagas_ask_hobby'
    },
    char_bagas_ask_hobby: {
      lines: ['kalo kamu, demen ngapain emangnya.'],
      choices: [
        {
          label: 'Cerita dulu dong hobi kamu, aku penasaran.',
          next: 'char_bagas_hobby_reveal',
          effects: [
            { type: 'adjustStat', target: 'char_bagas', stat: 'trust', delta: 3 },
            { type: 'adjustStat', target: 'char_bagas', stat: 'love', delta: 2 }
          ]
        },
        { label: '(gak jawab, nunggu dia cerita duluan)', next: 'char_bagas_hobby_reveal' }
      ]
    },
    char_bagas_hobby_reveal: {
      lines: ['aku demen ngoprek motor tua di rumah, buat having sendiri.', 'gak buat dijual, cuma seneng liat mesin idup lagi aja'],
      effects: [{ type: 'revealIdentity', target: 'char_bagas', field: 'hobi', value: 'Modifikasi Motor Klasik' }],
      next: 'char_bagas_minijob_offer'
    },
    char_bagas_minijob_offer: {
      lines: ['eh, bengkel lagi butuh bantuin angkat-angkat barang doang, gak ribet.', 'mau bantuin gak? lumayan buat jajan'],
      choices: [
        {
          label: 'Boleh, gas bantuin.',
          next: 'char_bagas_minijob_done',
          effects: [{ type: 'completeMiniJob', reward: 55000, jobTitle: 'Montir' }]
        },
        { label: 'Kayaknya lagi capek deh.', next: 'char_bagas_minijob_decline' }
      ]
    },
    char_bagas_minijob_done: {
      lines: ['nice, makasih ya. serius nolong banget.', 'ini duitnya, gak usah sungkan'],
      effects: [
        { type: 'adjustStat', target: 'char_bagas', stat: 'love', delta: 4 },
        { type: 'rivalRipple', source: 'char_bagas', targetStat: 'jealousy', delta: 3 }
      ],
      next: 'char_bagas_milestone'
    },
    char_bagas_minijob_decline: {
      lines: ['oke, santai aja. lain kali kalo sempet.'],
      next: 'char_bagas_milestone'
    },
    char_bagas_milestone: {
      // sengaja tidak ada `next` — jalan buntu, nunggu lanjutan (Langkah 8 berikutnya)
      lines: ['lumayan enak diajak ngobrol kamu ternyata.', 'gak perlu banyak kata buat ngerti orang — kayaknya kamu salah satunya'],
      effects: [{ type: 'globalRipple', source: 'char_bagas', condition: { stat: 'love', gte: 6 }, targetStat: 'jealousy', delta: 2 }]
    }
  };

  // ================= ENGINE =================

  function resolveText(str) { return AppState.resolveText(str); }

  function getNode(threadId, nodeId) {
    return STORY[threadId] && STORY[threadId][nodeId];
  }

  // Where does this thread's progress ({nodeId, ended, revealedCount,
  // awaiting, effectsRan}) actually live? For any of the 10 baked-in
  // characters it's characters[id].story (built in core/state.js,
  // Langkah 1); for anything else (currently just the legacy
  // `assistant` tutorial thread) it's the older story.threads[id].
  // Centralizing the redirect here means setNode/bumpRevealed/
  // setAwaiting/effects all automatically work for both without
  // needing their own if/else. See RANCANGAN_MULTI_KARAKTER.md §1.
  function threadSlot(s, threadId) {
    if (CHARACTERS[threadId]) return s.characters[threadId].story;
    return s.story.threads[threadId];
  }

  function threadState(threadId) {
    return threadSlot(AppState.get(), threadId);
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
          const ts = threadSlot(s, fx.threadId);
          if (ts) ts.ended = true;
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
          const ts = threadSlot(s, fx.threadId);
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

        // add ALL 10 baked-in characters to Contacts/DashChat at once —
        // idempotent (skips anyone already introduced, so re-running
        // this effect is harmless). Deliberately silent (isNew: false,
        // no notification): this represents "these people are now in
        // your phone", not "they just messaged you" — the player has
        // full freedom to start any of these 10 conversations whenever
        // they want, see RANCANGAN_MULTI_KARAKTER.md §1.
        case 'introduceAllCharacters': {
          allCharacterIds().forEach(id => {
            if (s.chats[id]) return; // already introduced
            const def = CHARACTERS[id];
            s.contacts.push({ id, name: def.name, avatar: def.avatar, lastUpdate: '', isNew: false });
            s.chats[id] = { name: def.name, messages: [] };
          });
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

        // ---- job system (RANCANGAN_MULTI_KARAKTER.md §4) ----
        // a character offers work through dialogue, player accepts →
        // reward always lands in selfStats.money; if `fx.jobTitle` is
        // given AND the player doesn't have a job yet, it "settles"
        // as their profession (selfIdentity.pekerjaan) — but only the
        // FIRST time. Doing more mini-jobs afterwards still pays out,
        // it just doesn't silently change what job you already have.
        case 'completeMiniJob': {
          s.selfStats.money += (fx.reward || 0);
          if (fx.jobTitle && !s.selfIdentity.pekerjaan) {
            s.selfIdentity.pekerjaan = resolveText(fx.jobTitle);
          }
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

  // ---- job overlap check (RANCANGAN_MULTI_KARAKTER.md §4) ----
  // True once the player's own settled profession (selfIdentity.pekerjaan,
  // set via the completeMiniJob effect above) matches this character's
  // baked-in job title. Dialogue can branch on this via evalCondition's
  // { when:'jobOverlap', charId, next } in apps/dashchat.js.
  function hasJobOverlap(charId) {
    const s = AppState.get();
    const def = CHARACTERS[charId];
    return !!(def && s.selfIdentity.pekerjaan && s.selfIdentity.pekerjaan === def.job.title);
  }

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
    computeNeglect,
    hasJobOverlap
  };
})();
