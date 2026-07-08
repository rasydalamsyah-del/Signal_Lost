# Rancangan: Sistem Multi-Karakter (Signal Lost)

Status: **CATATAN RANCANGAN — belum dikerjakan.** File ini dokumentasi
keputusan desain dari diskusi 2026-07, sebelum implementasi dimulai.
Tujuannya biar sesi kerja berikutnya (atau Claude di sesi lain) bisa
langsung baca ini tanpa mengulang semua pertanyaan dari awal.

---

## 1. Konsep inti

Rombak total dari rancangan lama (1 pasangan generik + job harian
berjadwal) menjadi:

- **10 karakter**: 5 perempuan, 5 laki-laki, seumuran user.
- User **bebas** mulai chat dengan siapa pun, kapan pun — tidak ada
  gating/urutan wajib.
- Tiap karakter punya **profil, stat, job, dan alur dialog sendiri**.
- Tindakan user ke satu karakter **mempengaruhi indikator karakter
  lain juga** (lihat §3).
- Waktu game **ambient**, terus berjalan tapi tidak kaku/real-time
  (lihat §2).
- Job **dipicu dari dialog**, bukan jadwal harian (lihat §4).
- Identitas user **terbentuk berangsur-angsur** dari hasil main, bukan
  diisi manual di awal (lihat §6).

Pendekatan pengerjaan yang disepakati: **bangun kerangka teknis untuk
10 karakter penuh dari awal** (data model, engine, UI semua siap untuk
10), tapi **isi cerita/dialog digarap bertahap** — mulai dari 2-3
karakter dengan kedalaman penuh, sisanya dikasih dialog dasar dulu
biar sistem jalan, konten ditambah belakangan.

---

## 2. Waktu game — ambient, bukan real-time, bukan kaku

- `phone.time` (menit sejak tengah malam, sudah ada di `core/state.js`)
  **tidak lagi cuma diam** menunggu cutscene tertentu (seperti
  time-skip lama). Sekarang dia **jalan otomatis sebagai "tick"**
  setiap kali ada aksi pemain yang berarti (buka app, pindah layar,
  kirim pesan) — bukan disinkron ke jam device asli, jadi tidak
  memaksa pemain menunggu waktu nyata.
- `meta.day` **naik otomatis** begitu akumulasi tick melewati 1440
  menit (1 hari), berjalan terus selama pemain aktif — bukan trigger
  manual seperti rancangan lama.
- Fungsi `day`/`time` sekarang murni jadi **basis hitung**: sudah
  berapa lama sejak terakhir chat karakter X (§5), dan penentu
  fase/plot cerita (§3) — **bukan** lagi buat gating jam
  buka-tutup job (itu dibuang total dari rancangan lama).

---

## 3. Efek indikator antar karakter — dua mekanisme, aktif bersamaan

Dua sistem efek jalan berbarengan, engine cek kondisi mana yang aktif
setelah tiap interaksi:

1. **Efek global (threshold-based)** — kalau hubungan ke karakter A
   lewat ambang tertentu (misal `love_A >= 70`), efeknya menyebar ke
   **semua karakter lain sekaligus** (contoh: "mereka semua notice
   kamu deket sama A" → cemburu ambient naik dikit ke semua, meski
   kecil).
2. **Efek lokal/rivalitas (focus-based)** — kalau pemain kelihatan
   fokus ke 1-2 karakter aja (dihitung dari rasio perhatian, lihat
   §5), karakter yang jadi **"saingan langsung"** — didefinisikan
   lewat peta rivalitas per pasangan karakter (atau default: sesama
   gender yang saling kenal di cerita) — kena efek lebih besar/lebih
   spesifik daripada efek global di atas.

Keduanya didefinisikan di data (bukan saling menggantikan). Sketsa:

```js
// per karakter, di characters.js
rivals: ['char_b', 'char_c'], // siapa yang paling kena efek lokal

// contoh efek di story node
effects: [
  { type: 'adjustStat', target: 'char_a', stat: 'love', delta: +10 },
  { type: 'globalRipple', condition: 'love >= 70', stat: 'jealousy', delta: +2 },
  { type: 'rivalRipple', stat: 'jealousy', delta: +8 } // hanya ke rivals[]
]
```

---

## 4. Job — dipicu dialog, dua jenis efek

Tidak ada lagi jadwal harian/jam buka-tutup (dibuang dari rancangan
lama). Job murni muncul dari situasi cerita:

1. **Mini-job untuk user** — karakter tertentu memicu tawaran kerja
   lewat dialog (cerita butuh bantuan / ngajak kerja bareng) → user
   kerjakan → reward masuk ke stat Keuangan (lihat §7, app "Diri").
2. **Overlap profesi** — begitu profesi/job user "menetap" (hasil dari
   mini-job sebelumnya, tersimpan sebagai bagian dari Identitas, lihat
   §6), kalau profesi itu **sama** dengan profesi salah satu dari 10
   karakter → dialog karakter itu dapat cabang tambahan ("kita kerja
   bareng ternyata!").

---

## 5. "Diabaikan kelamaan" — gabungan dua ukuran

Dihitung bareng untuk tiap karakter, jadi satu skor "neglect":

1. **Hari in-game sejak terakhir chat** karakter itu — makin lama gap,
   makin turun pelan-pelan (trust/mood).
2. **Rasio perhatian** — walau gap harinya pendek, kalau proporsi
   pesan user sebagian besar (misal >90%) ke karakter lain, karakter
   ini tetap bisa "berasa diabaikan".

Skor gabungan ini yang dipakai untuk trigger dialog "kamu kemana aja"
atau efek stat turun otomatis di background.

---

## 6. Profil & Identitas — disederhanakan + berkembang otomatis

### Settings "Profil Cerita" — dipangkas jadi 3 field saja
**Sebelum:** 8 field (user, partner, userFriend, partnerFriend,
userMom, userDad, partnerMom, partnerDad).
**Sesudah**, yang *user isi manual*:
- Nama user
- Nama ibu user
- Nama ayah user

Sisanya (nama 10 karakter + orang tua/teman mereka) jadi **nama
tertanam** — ditulis langsung di data cerita (`characters.js`, file
baru), tidak bisa diubah lewat Settings lagi. Alasannya: mereka
karakter dengan identitas & kepribadian tetap, bukan slot generik
seperti rancangan lama.

### App baru: "Diri" — 1 app, 2 tab
Menggabungkan dua ide sebelumnya jadi satu app dengan dua bagian:

**Tab 1 — Status** (bar/gauge, angka berubah dari efek story):
| Stat | Representasi |
|---|---|
| Kesenangan | bar 0–100 |
| Kebahagiaan | bar 0–100 |
| Kesedihan | bar 0–100 |
| Cemburu | bar 0–100 |
| Love (per karakter, bukan 1 angka global) | bar 0–100 per karakter |
| Tingkat kepercayaan (per karakter) | bar 0–100 per karakter |
| Keuangan | angka nominal (Rp) |

**Tab 2 — Identitas**: fakta biografis user, mulai dari `???`, terisi
otomatis dari efek story seiring progres:
| Field | Terisi kapan? |
|---|---|
| Pekerjaan | setelah user ambil/selesai job tertentu |
| Cita-cita | lewat dialog/pilihan tertentu |
| Hobi | dari pilihan/interaksi berulang |
| Pasangan | otomatis dari karakter dengan love/trust tertinggi + lewat ambang tertentu (flag "committed") |
| (bisa nambah field lain nanti) | |

Field terisi lewat efek story, bukan diisi manual:
```js
{ type: 'revealIdentity', field: 'pekerjaan', value: 'Barista' }
```

### Melihat identitas karakter lain (di app yang sama)
- Ada list 10 karakter yang bisa diklik → nampilin identitas versi
  mereka (pekerjaan, hobi, dll versi karakter itu).
- **Terkunci/blur sebagian di awal** — field identitas karakter lain
  cuma terbuka **berangsur-angsur sesuai kedekatan** dengan karakter
  itu (mirip identitas user sendiri) — bukan langsung full terbuka
  semua dari awal.

---

## 7. Ringkasan sketsa struktur data (belum final, buat pegangan awal)

```js
characters: {
  char_a: {
    name: 'Nadia', gender: 'f', avatar: 'N',      // nama tertanam
    rivals: ['char_c'],
    stats: { love: 0, trust: 0, jealousy: 0, mood: 50 },
    job: { id: 'barista', title: 'Barista' },
    identity: { pekerjaan: null, hobi: null, citaCita: null }, // unlock bertahap
    identityUnlocked: [],           // field mana yang sudah terbuka buat user lihat
    story: { nodeId: 'a_start', lastInteractedDay: 0 }
  },
  // ... 9 lainnya
},

selfStats: { happiness: 60, sadness: 20, jealousy: 10, money: 150000 },
selfIdentity: { pekerjaan: null, citaCita: null, hobi: null, pasangan: null },

profile: {
  user: { name: '' }, userMom: { name: '' }, userDad: { name: '' } // cuma ini yg di-Settings
},

meta: { day: 1, ambientTick: 0 } // day naik otomatis dari ambientTick
```

---

## 8. Yang belum diputuskan / perlu didiskusikan pas mulai coding
- Format persis peta rivalitas (manual per pasangan vs default
  sesama-gender)
- Berapa banyak field identitas per karakter yang realistis ditulis
  untuk 10 karakter (biar konten gak meledak — lihat §1)
- UI list 10 karakter — grid atau list, dan bagaimana progress
  unlock ditampilkan visual (blur, ikon gembok, dll)

---

## 10. UPDATE (setelah Langkah 8 selesai) — 3 perubahan besar berikutnya

Status: **CATATAN RANCANGAN, belum dikerjakan.** Ditulis dulu sebelum
mulai coding, biar terstruktur — ini rangkuman keputusan dari diskusi
lanjutan setelah semua 10 karakter kelar ditulis.

### 10.1 Gender user + pembatasan kandidat pasangan
**Masalah:** `profile` belum punya field gender user. Kalau nanti
mekanisme "jadi pasangan" diimplementasi tanpa ini, ke-10 karakter
(termasuk yang sama gender) bisa jadi kandidat pasangan — janggal.

**Keputusan:**
- Tambah field baru: `profile.userGender` (`'f'` atau `'m'`), diisi
  user di awal (bagian dari tutorial Asisten, nambah 1 pertanyaan).
- Kandidat "pasangan" **dibatasi ke lawan gender doang** (5 karakter),
  bukan opsi ketertarikan custom — biar tetap simpel.
- Efeknya juga ke §10.2 di bawah: pilihan starter karakter pun jadi
  cuma nunjukin 5 karakter lawan gender, bukan 10.

**✅ SELESAI (implementasi):**
- `core/state.js`: `profile.userGender` ditambah (`''`/`'m'`/`'f'`).
- `core/story.js`: effect baru `setProfilePath` (buat nyimpen jawaban
  fixed-choice, beda dari `input.savesTo` yang dipakai buat teks
  bebas). Fungsi baru `Story.eligiblePartnerIds()` — filter 10
  karakter ke lawan gender aja, return `[]` kalau gender belum
  di-set (bukan "semua 0 kandidat", tapi "belum diputuskan").
- Tutorial Asisten (`a_ack_user_name`) sekarang nyabang ke
  `a_ask_gender` (node choice, 2 tombol: Laki-laki/Perempuan) sebelum
  lanjut ke pertanyaan nama ibu. `a_profile_gate`'s `allFilled` check
  diupdate ikut termasuk `profile.userGender`.
- `apps/settings.js`: kontrol baru `genderRow()` (segmented 2-tombol,
  gaya sama kayak toggle) di bagian Profil Cerita — bisa diubah
  kapan aja, gak cuma pas tutorial.
- `style.css`: styling `.settings-segmented`/`.settings-segment`.
- Divalidasi: `node --check` semua file + simulasi headless
  (`eligiblePartnerIds` 5/5 benar utk kedua gender, `setProfilePath`
  jalan, gate `allFilled` include userGender) + **integrasi DOM**:
  lompat ke node `a_ask_gender`, klik pilihan beneran, verifikasi
  `profile.userGender` keisi & baris "oke, dicatat" muncul, buka app
  Settings — nilai yang sama kebaca & bisa diganti dari sana,
  `eligiblePartnerIds()` ikut berubah live.

### 10.2 Kontak muncul bertahap, bukan 10 sekaligus
**Masalah:** Implementasi sekarang (`introduceAllCharacters`, efek dari
Langkah 6) nambahin ke-10 karakter ke kontak sekaligus & diam-diam
begitu tutorial Asisten kelar. Ini gak sesuai konsep "mulai dari 1,
nambah seiring waktu".

**Keputusan:**
- Setelah tutorial Asisten kelar, muncul **pilihan starter**: cuma
  **5 karakter lawan gender** user yang ditampilkan (lihat §10.1),
  user pilih **1** buat mulai duluan.
- Cuma karakter itu yang muncul di kontak DashChat di awal.
- **Rantai perkenalan tetap** (bukan beda-beda tergantung starter):
  tiap karakter, di titik tertentu deket akhir obrolannya (sekitar
  milestone), memperkenalkan **1 karakter lain** — karakter itu baru
  muncul di kontak setelah itu. Rantainya sama untuk semua orang,
  cuma titik masuknya beda (tergantung siapa yang dipilih jadi starter
  di awal) — pada akhirnya walau mulai dari mana pun, working
  through the chain bakal nyampe ke semua 10 karakter.
- Perlu: effect baru `introduceCharacter(charId)` (versi singular dari
  `introduceAllCharacters`), dipasang di satu node baru per karakter
  (dekat/di milestone) yang manggil effect ini buat karakter
  "berikutnya" di rantai.
- `introduceAllCharacters` (Langkah 6) kemungkinan besar **tidak
  dipakai lagi** buat alur normal — cuma effect `introduceCharacter`
  tunggal yang dipakai berantai. Perlu diputuskan detail urutan
  rantainya pas mulai coding (siapa kenalin siapa).

**✅ SELESAI (implementasi):**
- `apps/dashchat.js`: `evalCondition` nambah tipe kondisi generik
  `{ when:'profileEquals', path, equals, next }` — dipakai buat
  nge-gate starter picker berdasar gender.
- `core/story.js`: effect baru `introduceCharacter(charId)` (singular,
  idempoten — no-op kalau karakter itu udah jadi kontak).
  `introduceAllCharacters` dibiarkan ada di kode (gak dihapus, masih
  dites & valid) tapi udah gak dipanggil di alur normal manapun —
  murni buat referensi/testing.
- **Alur baru `a_farewell`**: gak langsung `introduceAllCharacters`
  lagi. Sekarang: `a_farewell` → `a_gender_route` (gerbang `skipTo`
  `profileEquals` cek `profile.userGender`) → `a_pick_starter_for_m`
  (nunjukin 5 nama perempuan: Nadia/Kirana/Salsa/Bella/Intan) ATAU
  `a_pick_starter_for_f` (5 nama laki-laki: Bagas/Raka/Fahri/Dimas/
  Aldo) → pilih 1 → `introduceCharacter` buat yang dipilih →
  `a_starter_done` (baru di sini `endThread` jalan, assistant beneran
  hilang — bukan pas farewell, biar picker-nya sempat kepake dulu).
- **Rantai tetap (`CHAIN_NEXT`)**: Nadia→Kirana→Salsa→Bella→Intan→
  Bagas→Raka→Fahri→Dimas→Aldo→(balik ke Nadia). Disuntikkan
  programatik (bukan diketik manual 10x) — loop yang nambahin effect
  `introduceCharacter` ke `effects` node `{id}_milestone` tiap
  karakter, dijalankan sekali setelah semua 10 naskah karakter
  selesai didefinisikan (sebelum bagian ENGINE).
- Sudah divalidasi: `node --check` semua file + simulasi headless
  (semua 10 milestone dicek satu-satu match `CHAIN_NEXT`, walk 3
  langkah rantai via effect langsung, idempotency re-run gak dobel)
  + **integrasi DOM penuh**: lompat ke `a_farewell` beneran (gender
  laki-laki), verifikasi starter picker cuma nunjukin nama perempuan,
  klik "Nadia" beneran → kontak cuma `char_nadia` (assistant langsung
  hilang), lalu **jalanin obrolan Nadia sampai milestone lewat klik
  tombol sungguhan** (bukan shortcut) → **Kirana beneran muncul
  sendiri di kontak** setelahnya.

### 10.3 App "Pekerjaan" — job posting dengan jadwal hari & jam
**Masalah:** Mini-job sekarang (Langkah 7, `completeMiniJob`) cuma
efek sekali-jalan langsung dari dialog — gak ada halaman/app
tersendiri, gak ada jadwal, gak ada konsep "kerjaan tetap yang bisa
diulang". User minta versi yang lebih konkret & persisten.

**Konsep baru (menggantikan/menambah di atas mekanisme lama):**
- Begitu trust/kedekatan ke karakter tertentu cukup tinggi, karakter
  itu **membuka lowongan kerja** — muncul sebagai entry persisten di
  app baru **"Pekerjaan"**, bukan cuma efek sekali dari dialog.
- Tiap entry pekerjaan berisi: nama pekerjaan, gaji, **jadwal** (hari
  apa aja aktif + jam mulai-jam selesai).
- **Kotak pekerjaan cuma muncul di halaman kalau waktu in-game
  (hari + jam) pas cocok sama jadwalnya.** Contoh: barista aktif
  Senin/Jumat/Minggu jam 13.00-15.00 → di luar hari & jam itu, kotak
  pekerjaan ini hilang dari halaman, gak bisa dikerjakan.
- **Perlu konsep hari-dalam-minggu** — `meta.day` sekarang cuma angka
  naik terus, belum ada pemetaan ke nama hari (Senin/Selasa/.../
  Minggu). Perlu fungsi baru: `dayOfWeek(day)` → nama hari (misal
  hari 1 = Senin, lalu `(day-1) % 7`).

**Dua jenis pekerjaan:**
1. **Rutin (recurring)** — bisa dikerjakan berkali-kali, tiap kali
   jadwalnya aktif.
2. **Sekali seumur hidup (one-time)** — begitu dikerjakan sekali,
   hilang dari app selamanya.

**Aturan buat pekerjaan rutin:**
- **Batas 1x per hari aktif** — kalau jadwal lagi aktif dan user
  sudah mengerjakannya hari itu, dianggap selesai buat hari itu; gak
  bisa dikerjakan lagi di hari yang sama walau masih dalam jam aktif
  yang sama. Harus nunggu hari lain di mana jadwalnya aktif lagi.
- **Mekanisme "dipecat"** — kalau user melewatkan jadwal aktif
  (gak ngerjain padahal lagi aktif, sampai jendela waktunya lewat)
  sebanyak **N kali** dalam batas waktu tertentu (**per minggu** ATAU
  **per bulan**, keduanya valid tergantung pekerjaannya — dikonfigurasi
  per-job, bukan aturan global tunggal), maka pekerjaan itu **hilang
  selamanya** dari app (gak akan muncul lagi). Contoh yang dikasih:
  5x kelewatan dalam 1 bulan → dipecat.
- Butuh tracking: hitungan "kelewatan" per job, direset/dievaluasi
  dalam jendela waktu bergulir sesuai `missBoundary` job itu (minggu
  atau bulan).

**Sketsa struktur data (belum final):**
```js
jobPostings: {
  job_barista_nadia: {
    id: 'job_barista_nadia',
    title: 'Barista',
    charId: 'char_nadia',           // siapa yang buka lowongan ini
    salary: 40000,
    type: 'recurring',               // 'recurring' | 'onceForever'
    schedule: {
      days: ['Senin', 'Jumat', 'Minggu'],
      startMinute: 780,              // 13:00
      endMinute: 900                 // 15:00
    },
    missThreshold: 5,                // cuma relevan kalau recurring
    missBoundaryDays: 30,            // 30 = "per bulan", 7 = "per minggu"
    missLog: [],                     // array of {day: N} tiap kali kelewatan
    lastWorkedDay: null,             // meta.day terakhir kali dikerjakan
    firedForever: false,
    active: true                     // false kalau firedForever atau (utk onceForever) udah pernah dikerjakan
  }
}
```

**Yang masih perlu diputuskan detail teknisnya pas mulai coding:**
- Apakah pengecekan "kelewatan" dihitung otomatis tiap kali jendela
  aktif berakhir (butuh semacam scheduler/cek berkala berbasis
  `meta.day`/`phone.time` saat ini dibandingkan ke jadwal), atau
  dihitung lazy (baru dicek pas app Pekerjaan dibuka/pas ada aksi lain)
- Mini-job yang udah ditulis di 10 naskah karakter (Langkah 7-8, pakai
  `completeMiniJob`) — apakah dibiarkan seperti itu (bantuan kecil
  sekali-jalan, terpisah dari sistem baru ini), atau dimigrasi jadi
  job posting juga? (kemungkinan besar: dibiarkan, karena beda konsep
  — bantuan sekali vs lowongan kerja beneran)

**✅ SELESAI (implementasi):**
- **`core/state.js`**: tambah `dayOfWeek(day)` (day 1 = Senin, wrap tiap
  7 hari) + `jobPostings: {}` di `defaultData()`. **Bug sempat
  ketemu & diperbaiki**: pas nambahin `jobPostings`, field
  `attention: { totalMessages: 0 }` (dari Langkah 3, dipakai
  `computeNeglect`) sempat gak sengaja ke-replace/ilang — ketauan pas
  `grep` ulang, langsung diperbaiki sebelum lanjut.
- **`core/jobs.js`** (baru) — modul `Jobs`: `isScheduledToday`,
  `isActiveNow` (cek hari + jendela jam + belum dipecat/selesai),
  `alreadyWorkedToday`, `reconcile`/`reconcileAll` (hitung "kelewatan"
  **lazy** — dievaluasi tiap app Pekerjaan dibuka, bukan scheduler
  background, sesuai keputusan di atas), `work` (bayar gaji, tandai
  hari ini udah dikerjain, tandai selesai kalau `onceForever`), `list`,
  `scheduleText`.
- **`core/story.js`**: effect baru `unlockJobPosting` (bikin posting
  baru di `AppState.jobPostings`, idempoten — gak reset progress kalau
  dipicu ulang).
- **`apps/dashchat.js`**: `evalCondition` nambah `{ when:'charStatGte',
  charId, stat, gte, next }` — cek stat karakter sendiri (dipakai buat
  nge-gate tawaran kerja tetap berdasar trust).
- **Demo konkret di Nadia**: alur mini-job lama (`completeMiniJob`,
  bantuan sekali) tetap ada, tapi sekarang lanjut ke gerbang baru
  `char_nadia_job_gate2` — kalau trust Nadia udah ≥3 (tercapai dari
  pilihan gaya-ngobrol paling awal), dia nawarin **shift tetap**
  (`unlockJobPosting`, jadwal Senin/Jumat/Minggu 13.00-15.00, gaji
  Rp40.000, `missThreshold:5`/`missBoundaryDays:30`) — beda dari
  bantuan sekali-jalan sebelumnya.
- **`apps/pekerjaan.js`** (baru) — app baru: render semua job posting
  yang udah di-unlock, tiap kartu nunjukkin judul/karakter/gaji/jadwal/
  status (Aktif sekarang / Udah dikerjain hari ini / Nunggu jadwal /
  Dipecat / Selesai), tombol "Kerjakan" nyala cuma pas beneran aktif.
- **`assets/icons.js`** + **`screens/homeScreen.js`**: ikon & entry app
  "Pekerjaan" (tas kerja, gradient hijau) di home grid.
- **`style.css`**: styling lengkap `.job-card`/`.job-status`/dll.
- Sudah divalidasi: `node --check` semua file + simulasi headless
  lengkap (`dayOfWeek` termasuk wrap, unlock+idempotency, aktif/tidak
  berdasar hari DAN jam, tolak kerja dobel di hari sama, tracking
  kelewatan + mekanisme dipecat pas nyampe threshold) + **integrasi
  DOM penuh**: jalanin dialog Nadia via klik tombol sungguhan sampai
  bener-bener nawarin shift tetap, buka app Pekerjaan asli, klik
  tombol "Kerjakan" beneran (uang nambah, status berubah, tombol jadi
  disabled), percobaan kerja kedua di hari sama ditolak, dan hari yang
  gak sesuai jadwal correctly nunjukkin "Nunggu jadwal". **Sempat
  ketemu 2 bug murni di skrip tes saya sendiri** (bukan di kode game):
  (1) nyoba nge-set `meta.day` langsung lewat `AppState.set` — ternyata
  gak valid karena `meta.day` itu turunan dari `ambientTick`, ke-reset
  otomatis begitu `AppState.tick()` jalan lagi (mis. dari
  `Router.navigate`); (2) salah hitung offset waktu yang bikin malah
  lompat ke hari berikutnya. Dua-duanya diperbaiki di skrip tes,
  dikonfirmasi ulang kode game-nya sendiri sudah benar dari awal.

**Bug ditemukan & diperbaiki (setelah user lapor pakai screenshot):**
`screens/homeScreen.js` — clock besar & tanggal di layar utama
(`h-clock`/`h-date`) masih pakai `new Date()` (jam/tanggal **device
asli**), bukan jam in-game. Ini gak ketauan pas Langkah 2 (waktu
ambient) karena dianggap kosmetik, tapi ternyata jadi sumber
kebingungan nyata: user coba di HP-nya pas hari **Kamis** (tanggal
asli), tapi kotak pekerjaan "Barista (shift tetap)" — yang jadwalnya
Senin/Jumat/Minggu — tetap kelihatan "Aktif sekarang" dan bisa
dikerjain. Awalnya kelihatan kayak bug di logic jadwal, tapi setelah
dicek, itu logic jadwalnya udah benar (ngikutin `meta.day` in-game,
yang saat itu emang lagi jatuh di hari Senin/Jumat/Minggu versi
game) — cuma layar utama nunjukkin hari **device asli** ("Kamis")
yang gak ada hubungannya sama sistem hari in-game sama sekali,
sehingga terlihat seperti kontradiksi padahal bukan.

**Perbaikan:** `h-clock`/`h-date` sekarang pakai `phone.time` +
`dayOfWeek(meta.day)` (format "Hari ke-N"), sama kayak yang udah
dipakai `statusBar.js`/`dashchat.js`/`timeSkip.js` sejak Langkah 2 —
jadi apa pun yang ditampilkan ke pemain soal hari/jam sekarang
konsisten satu sumber kebenaran (`meta.day`/`phone.time`), gak ada
lagi campuran device-clock vs in-game-clock di layar mana pun.
Konstanta `DAY_NAMES`/`MONTH_NAMES` lama (device-date formatting)
dihapus karena udah gak kepake.

Divalidasi: `node --check` + simulasi DOM — render awal cocok
(`meta.day=1` → "Senin, Hari ke-1"), lalu di-fast-forward 10 hari
(`AppState.tick(1440*10)`) → `meta.day=11` → "Kamis, Hari ke-11", dan
dikonfirmasi job yang dijadwalkan buat hari itu juga beneran aktif
di app Pekerjaan — home screen dan jadwal kerjaan sekarang selalu
ngomongin hari yang sama.

---

## 11. UPDATE — Simulasi harian penuh (tidur/bangun, rutinitas, stat kebutuhan, kalender grid, ulang tahun)

Status: **CATATAN RANCANGAN, belum dikerjakan.** Ditulis sebelum mulai
coding, setelah diskusi lanjutan pasca-bug home screen (§10.3).

### 11.1 Kenapa ini muncul
User nanya soal detail tanggal/hari/jam game, notice Kalender masih
list sederhana (bukan grid bulan), dan minta rentetan fitur simulasi
harian: tidur/bangun, rutinitas pagi, ulang tahun karakter, dan stat
baru. Dikonfirmasi: user MAU semuanya, minta Claude yang susun
prioritas & urutan (bukan pilih salah satu).

### 11.2 Stat baru — 2 kategori (KEPUTUSAN FINAL)
**Kebutuhan** (menurun seiring waktu/aktivitas, dijaga lewat MyShop/istirahat):
- `energi` — turun tiap aktivitas, cuma pulih total kalau tidur
- `lapar` — turun seiring waktu, naik kalau makan (integrasi ke MyShop)
- `kesehatan` — turun kalau energi/lapar dibiarin rendah kelamaan;
  naik dari istirahat atau obat (integrasi natural ke Intan/apoteker)
- `kebersihan` — turun tiap hari, pulih dari rutinitas pagi (mandi)

**Pengembangan diri** (naik dari rutinitas):
- `kepintaran` — naik dari rutinitas kuliah/ke perpus
- `kekuatan` — naik dari rutinitas olahraga/aktivitas fisik

Ditaruh di `selfStats` (samain sama happiness/sadness/jealousy/money
yang udah ada), bukan bikin slice baru — biar app "Diri" (Langkah 5)
tinggal ditambah baris, gak perlu app baru.

### 11.3 Sistem tanggal/bulan (fondasi baru)
`meta.day` sekarang cuma angka naik + `dayOfWeek()` (7 hari berulang) —
belum ada bulan/tahun. Perlu ditambah:
- Konsep bulan: pilih 1 bulan = 30 hari (simpel, gak perlu kalender
  ala dunia nyata yang rumit — Januari 31 hari dst terlalu detail buat
  kebutuhan game ini).
- `monthOfDay(day)` / `dateInMonth(day)` — turunan dari `meta.day`,
  sama kayak `dayOfWeek()` (Langkah 10.3), bukan field state terpisah
  yang bisa desync.
- Awal game: hari ke-1 = tanggal 1, bulan 1 ("Bulan 1" — gak perlu
  nama-nama bulan asli kayak Januari/Februari, cukup angka, biar gak
  ambigu di dunia fiksi tanpa tahun kalender nyata).

### 11.4 Kalender grid (UI baru, ganti list sederhana)
`apps/calendar.js` dirombak dari list jadi **grid bulan** kayak
kalender HP asli beneran (baris hari Minggu-Sabtu, kotak per
tanggal) — pakai `monthOfDay()`/`dateInMonth()` buat nentuin posisi
kotak. Event (`AppState.calendar`) & ulang tahun (§11.6) muncul
sebagai ikon kecil di kotak tanggalnya.

### 11.5 Tidur/bangun — mekanisme baru
- Ikon "Istirahat" (bisa di home screen atau notifikasi pas malam) →
  buka **screen baru** `screens/sleepScreen.js`, mirip pola
  `timeSkip.js` tapi visual beda: **layar gelap, ikon bulan/bintang,
  teks "..zzz.."** (bukan jam besar terang) — biar berasa beda momen
  dari time-skip biasa.
- Waktu di-skip otomatis sampai **jam 7 pagi** hari berikutnya (pakai
  `AppState.tick()` yang udah ada, sama presisinya kayak `timeSkip.js`).
- Efek: `energi` pulih penuh (atau signifikan), `kebersihan` turun
  dikit (perlu mandi pagi lagi).
- Kalau `energi` udah abis duluan sebelum sempat tidur (target masa
  depan, opsional): bisa maksa transisi ke malam/tidur otomatis —
  belum diputuskan detailnya, bisa disederhanakan dulu (tidur cuma
  lewat pilihan manual, bukan dipaksa).

### 11.6 Rutinitas harian (konten baru, pakai stat §11.2)
Setelah bangun jam 7: rutinitas pagi (mandi/gosok gigi — pulihin
`kebersihan`, effect instan gak perlu pilihan panjang), lalu pilihan
aktivitas hari itu (mirip menu, bukan wajib satu-satu):
- Ke kampus/kuliah → `kepintaran` naik, `energi`/`lapar` turun dikit
- Ke perpus → `kepintaran` naik lebih pelan, tapi gak capek-capek amat
- Olahraga → `kekuatan` naik, `energi`/`lapar` turun lumayan
- (kosong/`skip`) → gak naik apa-apa, tapi juga gak makan energi ekstra

Alur harian penuh yang diminta: **dialog karakter → time-skip →
dialog karakter lain → time-skip → tidur → bangun → rutinitas pagi →
pilih aktivitas → lanjut dialog lagi**, berulang. Ini pada dasarnya
merangkai potongan yang UDAH ADA (`timeSkip.js`, dialog per karakter)
dengan potongan BARU (`sleepScreen.js`, menu rutinitas) jadi satu
loop harian yang jelas.

### 11.7 Ulang tahun karakter (butuh 11.3 dulu)
- Tambah `birthDate: { month, day }` ke tiap entry di
  `core/characters.js` (statis, sama kayak nama/gender/job).
- Efek baru di dialog: kalau kedekatan (trust/love) ke karakter cukup
  tinggi, karakter itu **cerita kapan ulang tahunnya** (mirip pola
  `revealIdentity`) — begitu keceritain, muncul ikon 🎂 otomatis di
  kotak kalender pas tanggal itu (butuh grid kalender §11.4 dulu, dan
  butuh cek tiap render kalender: karakter mana yang udah reveal
  ulang tahun + tanggalnya cocok bulan yang lagi dilihat).

### 11.8 Urutan pengerjaan (disepakati — Claude yang susun)
1. **Stat baru** (§11.2) — fondasi, ditambah ke `selfStats` +
   ditampilkan di app Diri
2. **Sistem tanggal/bulan** (§11.3) — fondasi kedua, `monthOfDay()`/
   `dateInMonth()`, dibutuhkan langkah 3 & 5
3. **Tidur/bangun** (§11.5) — mekanisme baru, pakai stat `energi`
4. **Rutinitas harian** (§11.6) — konten baru, pakai SEMUA stat
   §11.2, nyambung ke tidur/bangun dari langkah 3
5. **Kalender grid** (§11.4) — UI baru, pakai sistem tanggal §11.3
6. **Ulang tahun karakter** (§11.7) — butuh grid kalender (langkah 5)
   kelar dulu baru bisa nampilin ikon-nya dengan benar

Belanja (MyShop) buat beli makanan/kebutuhan — disebut user sebagai
bagian dari alasan kenapa stat ini perlu ada — **belum masuk urutan
di atas**, kemungkinan jadi langkah ke-7 setelah 6 langkah ini kelar
(integrasi MyShop supaya jual item yang mengembalikan `lapar`/
`kebersihan`/`kesehatan`), karena scope-nya udah cukup besar buat satu
sesi kerja.

---

## 9. Log progres implementasi

### ✅ Langkah 1 — Fondasi data (selesai)
- **`core/characters.js`** (baru): registry statis 10 karakter (5
  perempuan: Nadia, Kirana, Salsa, Bella, Intan — 5 laki-laki: Bagas,
  Raka, Fahri, Dimas, Aldo), masing-masing nama/gender/avatar/job
  tertanam. `getRivals(id)` default ke semua karakter sesama gender
  kecuali di-override manual lewat `rivals: [...]` di registry.
- **`core/state.js`**: `profile` dipangkas jadi 3 field
  (`user`/`userMom`/`userDad`). Tambah `characters` (runtime state 10
  karakter, dibangun dari registry — stats, identity, identityUnlocked,
  story progress sendiri-sendiri, lastInteractedDay buat neglect
  score). Tambah `selfStats` (happiness/sadness/jealousy/money) dan
  `selfIdentity` (pekerjaan/citaCita/hobi/pasangan, mulai `null`).
  Tambah `meta.ambientTick` (basis buat waktu ambient, belum
  benar-benar jalan — itu Langkah 2). `TOKENS` disederhanakan;
  `{{char_xxx}}` sekarang resolve otomatis ke nama karakter dari
  registry; token lama yang datanya sudah dihapus (`{{partner}}` dkk)
  sengaja dibiarkan tampil literal, bukan crash.
- **`apps/settings.js`**: form Profil Cerita dipangkas jadi 3 field
  sesuai di atas.
- **`core/story.js`**: tutorial Asisten dipangkas dari 8 pertanyaan
  nama jadi 3 (user/ibu/ayah). Handoff `a_farewell` **tidak lagi**
  memunculkan kontak "partner" generik tunggal (itu digantikan sistem
  10 karakter). Seluruh thread `partner`/`friend` lama ditandai
  **DEPRECATED/inert** di komentar kode — masih ada di file (siapa
  tau ada baris yang mau dipakai ulang), tapi tidak lagi terhubung ke
  mana pun, jadi tidak jalan dan tidak crash.
- **`index.html`**: tambah `<script src="core/characters.js">` sebelum
  `core/state.js`.
- Sudah divalidasi: semua file `node --check` lolos, dan disimulasikan
  headless (`AppState.get()` menghasilkan struktur yang benar, rivals
  benar, token resolver benar termasuk fallback token lama).

### ✅ Langkah 2 — Waktu ambient (selesai)
- **`core/state.js`**: tambah `AppState.tick(minutes)` — cara kanonik
  menambah waktu in-game. `meta.ambientTick` jadi running-total menit
  sejak awal hari 1 (mulai di 810, sama kayak `phone.time` default
  lama); `phone.time` dan `meta.day` selalu jadi cermin langsungnya
  (`phone.time = ambientTick % 1440`, `day = floor(ambientTick/1440)+1`).
  Guard divalidasi ketat (`Number.isFinite`) — sempat ada bug di mana
  `NaN` lolos validasi awal (`NaN <= 0` selalu `false`) dan bikin
  `ambientTick` rusak permanen; sudah diperbaiki & dites ulang.
- **`screens/timeSkip.js`**: animasi cutscene sekarang manggil
  `AppState.tick(delta)` per step (bukan `AppState.set('phone.time', ...)`
  langsung), dengan penjagaan `tickedSoFar` supaya total yang di-tick
  presisi sama dengan target menit — jadi `meta.day` ikut naik dengan
  benar kalau cutscene melewati tengah malam, gak cuma `phone.time`
  yang wrap doang kayak sebelumnya.
- **`core/router.js`**: `navigate()` sekarang tick +2 menit tiap pindah
  ke app/screen baru (skip system screens biar intro gak makan waktu).
- **`apps/dashchat.js`**: pesan (baik pilihan, input bebas, maupun
  balasan otomatis) sekarang tick +1 menit dan pakai stempel waktu
  **jam in-game** (`gameTimeStamp()`), bukan lagi `new Date()` device
  asli seperti sebelumnya — jadi timestamp bubble chat konsisten sama
  jam fiksi di status bar.
- Sudah divalidasi: `node --check` semua file lolos, simulasi headless
  `tick()` dites untuk tick biasa, rollover hari (termasuk lewat
  tengah malam di tengah cutscene 48-step), dan guard input tidak
  valid (0/negatif/NaN/Infinity/string).

### ✅ Langkah 3 — Engine efek (selesai)
- **`core/story.js`** — 4 effect type baru di `runEffects()`:
  - `adjustStat` — ubah 1 stat di 1 target (`target:'self'` → `selfStats`,
    atau id karakter → `characters[id].stats`); di-clamp 0-100 kecuali
    `money` (nominal, gak dibatasi).
  - `globalRipple` — kalau stat karakter sumber (`fx.source`) lewat
    ambang (`fx.condition.gte`), semua karakter LAIN (lintas gender)
    kena `fx.targetStat += fx.delta`. Sumbernya sendiri gak ikut kena.
  - `rivalRipple` — versi lebih tajam, cuma kena ke `getRivals(source)`
    (default sesama-gender dari `core/characters.js`), bukan semua.
  - `revealIdentity` — isi 1 field biografis (`target:'self'` →
    `selfIdentity`, atau id karakter → `characters[id].identity` +
    dicatat di `identityUnlocked` biar gak dobel).
  - `deliverFirstLine` sekalian dibetulkan — sebelumnya masih pakai
    `new Date()` device asli buat timestamp, sekarang pakai jam
    in-game (konsisten sama perbaikan Langkah 2).
- Tambah `Story.recordInteraction(charId)` — no-op kalau `charId`
  bukan salah satu dari 10 karakter (misal `assistant`), kalau valid:
  naikkan `messageCount` karakter itu, `lastInteractedDay = meta.day`,
  dan `attention.totalMessages` global naik satu.
- Tambah `Story.computeNeglect(charId)` — skor 0-100 gabungan dari (1)
  jarak hari sejak kontak terakhir × 5, dan (2) rasio perhatian yang
  "lari" ke karakter lain × 40 — dibulatkan/clamp, dan otomatis 0
  kalau belum pernah dikontak sama sekali (belum ketemu = belum bisa
  "diabaikan"). Rumus di satu tempat, gampang di-tuning nanti pas
  playtest sungguhan.
- **`apps/dashchat.js`**: `evalCondition` nambah tipe kondisi baru
  `{ when:'neglect', charId, gte, next }` (dipakai bareng `skipTo`
  kayak `allFilled`/`flag` yang udah ada), plus `Story.recordInteraction`
  dipanggil di titik kirim pesan (pilihan & input bebas) — no-op buat
  thread `assistant` yang belum jadi karakter terdaftar.
- **`core/state.js`**: tambah `messageCount` per karakter dan
  `attention.totalMessages` global sebagai basis data buat neglect score.
- Sudah divalidasi: `node --check` semua file + simulasi headless
  penuh (clamp stat, threshold ripple, rival-only ripple, reveal +
  anti-dupe, neglect 0 sebelum kontak, neglect naik seiring hari &
  rasio perhatian, no-op buat thread non-karakter).

### ✅ Langkah 4 — Settings lanjutan (selesai — sudah tercakup di Langkah 1)
Dicek ulang `apps/settings.js`: form "Profil Cerita" sudah 3 field
sesuai rancangan §6, toggle "Lanjut Otomatis" dari fitur lama masih
relevan/jalan. Rancangan tidak meminta setting baru lain di luar itu,
jadi tidak ada kerjaan tambahan — lanjut ke Langkah 5.

### ✅ Langkah 5 — App "Diri" (selesai)
- **`apps/diri.js`** (baru) — 2 tab:
  - **Status**: bar kesenangan/kesedihan/cemburu milik user (dari
    `selfStats`), keuangan sebagai nominal, dan grid 10 kartu karakter
    (bar Love + Trust per karakter dari `characters[id].stats`). Nama
    karakter yang belum pernah dikontak (`lastInteractedDay === null`)
    tampil `???`, bukan nama aslinya.
  - **Identitas**: bio user (`selfIdentity` — pekerjaan/hobi/cita-cita/
    pasangan), tampil `???` kalau masih `null`; plus list 10 karakter
    yang bisa diklik buat lihat detail identitas versi mereka —
    tombolnya disabled kalau belum pernah dikontak, dan field yang
    belum ada di `identityUnlocked` tampil terkunci (ikon gembok),
    field yang sudah di-reveal tampil isinya. Ada tombol "Kembali".
- **`assets/icons.js`**: tambah ikon `diri` (circle-user, buat home
  grid) dan `lock` (buat field identitas yang masih terkunci), plus
  warna gradient `diri` sendiri.
- **`screens/homeScreen.js`**: tambah entry app `diri` di grid.
- **`style.css`**: tambah semua class baru (`.diri-tabs`, `.diri-bar`,
  `.diri-char-card`, `.diri-id-row`, dll), pakai token warna yang udah
  ada (`--signal`, `--interference`, `--static`, dll) biar konsisten
  sama gaya app lain.
- App ini murni **read-only viewer** — belum ada cara isi data manual;
  semua angka/field berubah lewat efek cerita yang udah dibangun di
  Langkah 3 (`adjustStat`/`revealIdentity`). Wajar kalau semuanya masih
  `???`/0 sekarang karena belum ada dialog yang benar-benar
  memanggil efek itu (nunggu Langkah 6-8: wiring kontak + konten).
- Sudah divalidasi: `node --check` semua file lolos + simulasi **DOM
  penuh pakai jsdom** (bukan cuma logic doang) — render awal, ganti
  tab, klik karakter yang locked (disabled) vs yang udah "ketemu",
  detail field locked vs unlocked, tombol kembali, dan tab Status ikut
  update live pas stat berubah. jsdom di-install sementara buat tes,
  lalu dihapus lagi (`node_modules`/`package.json` gak ikut commit).

### ✅ Langkah 6 — Contacts & DashChat wiring ke 10 karakter (selesai)
- **`core/story.js`**: tambah `threadSlot(s, threadId)` — penentu satu
  tempat, dipakai di `threadState`/`setNode`/`bumpRevealed`/
  `setAwaiting`/efek `endThread`/`deliverFirstLine`: kalau `threadId`
  salah satu dari 10 karakter, progres cerita dibaca/ditulis di
  `characters[id].story` (dari Langkah 1); kalau bukan (cuma
  `assistant` yang tersisa), tetap ke `story.threads` lama. Jadi engine
  yang sama otomatis jalan buat kontak lama maupun 10 karakter baru
  tanpa app lain (dashchat.js, contacts.js) perlu tau bedanya —
  keduanya sudah generik dari awal (baca `s.contacts`/`s.chats` polos),
  jadi TIDAK PERLU diubah sama sekali.
- Effect baru **`introduceAllCharacters`** — nambah 10 karakter
  sekaligus ke `contacts`+`chats` pakai nama/avatar dari
  `core/characters.js`, idempoten (skip yang udah ada), senyap
  (`isNew:false`, gak ada notifikasi) — sesuai prinsip "pemain bebas
  mulai chat siapa aja kapan aja", bukan "mereka baru chat kamu".
  Disambungkan ke `a_farewell` — begitu tutorial Asisten kelar, 10
  kontak langsung muncul, menuntaskan janji di baris farewell.
- **Starter stub dialog buat 10 karakter** (`{id}_start` →
  `{id}_intro_choice` → cabang nyata → `{id}_stub_end` jalan buntu) —
  PLACEHOLDER, bukan konten final (itu Langkah 8). Tujuannya: biar
  seluruh pipeline (kontak → buka chat → pilihan → efek `adjustStat`/
  `revealIdentity` → tampil di app Diri) punya sesuatu nyata buat
  dijalankan sekarang, bukan nunggu semua 10 karakter selesai ditulis
  dulu. Node id sama dipakai lagi nanti pas ditulis ulang beneran, jadi
  gampang diganti tanpa ubah apa pun di luar `core/story.js`.
- Sudah divalidasi: `node --check` + **integrasi penuh pakai jsdom**
  (bukan cuma unit test) — dari akhir tutorial Asisten → 10 kontak
  muncul senyap & idempoten → buka chat Nadia via `Router.navigate`
  beneran → opener & pilihan ke-render di DOM sungguhan → klik pilihan
  → `trust +5` & `revealIdentity('pekerjaan','Barista')` beneran
  kejadian & keliatan di teks layar → app Kontak ikut nunjukkin 10
  kontak yang sama. jsdom di-install sementara, dihapus lagi setelahnya.

### ✅ Langkah 7 — Job system (selesai)
- **`core/story.js`**: effect baru **`completeMiniJob`** — reward
  selalu masuk ke `selfStats.money`; kalau `fx.jobTitle` diisi DAN
  `selfIdentity.pekerjaan` masih kosong, pekerjaan "menetap" jadi itu.
  Sengaja **cuma menetap sekali** — mini-job berikutnya tetap bayar,
  tapi gak diam-diam ganti profesi yang udah dipilih pemain.
- Fungsi baru **`Story.hasJobOverlap(charId)`** — true kalau
  `selfIdentity.pekerjaan` pemain sama persis dengan `job.title` bawaan
  karakter itu di `core/characters.js`.
- **`apps/dashchat.js`**: `evalCondition` nambah tipe kondisi
  `{ when:'jobOverlap', charId, next }` (dipakai bareng `skipTo`, sama
  pola kayak `allFilled`/`flag`/`neglect` yang udah ada).
- **Demo konkret** (bukan cuma simulasi headless) — `char_nadia` dan
  `char_dimas` sengaja sama-sama Barista dari Langkah 1, dipakai buat
  bukti nyata: naskah stub Nadia ditambah cabang tawaran mini-job
  (`char_nadia_minijob_offer` → terima → `completeMiniJob`); naskah
  stub Dimas ditambah gerbang `char_dimas_job_gate` yang manggil
  `skipTo: { when:'jobOverlap', ... }` — kalau pemain udah kerja jadi
  Barista (dari nge-*minijob* di Nadia), pas buka chat Dimas langsung
  dapet sapaan spesial ("eh tunggu, kamu barista juga?") sebelum lanjut
  ke obrolan normal.
- Sudah divalidasi: `node --check` + simulasi headless (reward selalu
  jalan, job cuma menetap sekali, `hasJobOverlap` bener/salah sesuai
  kondisi, aman buat id gak dikenal) + **integrasi DOM penuh pakai
  jsdom**: selesein mini-job Nadia beneran lewat klik tombol di
  DOM (`money` & `pekerjaan` berubah sesuai, teks reward tampil), lalu
  buka chat Dimas dan sapaan overlap-nya beneran muncul di layar,
  tetap lanjut normal ke `intro_choice` setelahnya. Sempat ketemu
  bug di skrip tes sendiri (salah cari frasa), sudah dikoreksi dan
  diverifikasi ulang — bukan bug di kode game.

### ✅ Langkah 8 — Konten penuh per karakter (SELESAI: 10/10)
Sesuai kesepakatan build-order ("kerangka teknis 10 penuh dari awal,
konten bertahap"), sekarang **semua 10 karakter** sudah ditulis dalam
& lengkap, gantiin stub generik dari Langkah 6 sepenuhnya.

- **Nadia** (barista, ceria/banyak becanda) — 11 node: pilihan gaya
  ngobrol → reveal pekerjaan → pilihan hobi flirty (naikin `love` +
  `rivalRipple`) → reveal hobi (Fotografi Analog) → mini-job barista
  (trigger nyata buat overlap-profesi Dimas, Langkah 7).
- **Kirana** (desainer grafis, tertutup/dry, perfeksionis) — 13 node:
  gak langsung cair, pilihan ngasih-ruang vs maksa beda efek
  trust/mood, vent kerjaan, mini-job desainer + `globalRipple`.
- **Salsa** (mahasiswa, cemas/overthinking, butuh validasi) — 13 node:
  kebuka dari awal tapi nervous, pilihan validasi-emosional vs
  saran-praktis, mini-job asisten riset (job baru: "Asisten Riset").
- **Bagas** (montir, santai/simpel, dikit ngomong) — 11 node:
  kebalikan Salsa, pilihan chill vs curious, mini-job bengkel.
- **Raka** (fotografer, reflektif/pengamat, perayu halus) — 11 node:
  notice detail kecil bukan gombalan langsung, mini-job asisten
  fotografer (job baru: "Asisten Fotografer").
- **Fahri** (guru, hangat/mentor, dad-joke energy) — 12 node: suka
  kasih nasihat, mini-job bantu bazar sekolah (job baru: "Asisten
  Pengajar").
- **Bella** (penyiar radio, ceria di publik beda saat pribadi) —
  13 node: kontras on-air vs off-air, vent soal capek "on" terus,
  mini-job baca naskah promo (job baru: "Asisten Siaran").
- **Intan** (apoteker, tenang/perhatian lewat hal kecil) — 13 node:
  perhatian lewat tindakan praktis (nanya udah makan belum), vent
  soal pasien, mini-job cek stok obat (job baru: "Asisten Apotek").
- **Aldo** (musisi indie, santai/filosofis, skeptis validasi) — 13
  node: gak nyari pujian, vent soal tekanan angka streaming, mini-job
  jadi additional player manggung (job baru: "Musisi Pendukung").
- **Dimas** (barista, playful/pede, gerbang overlap tetap dipakai) —
  13 node: `char_dimas_job_gate`/`char_dimas_overlap_greet` dari
  Langkah 7 TIDAK diubah, cuma jalur normalnya (`intro_choice` dst)
  yang ditulis ulang jadi konten asli — tebak-tebakan hobi (Basket),
  mini-job bikin konten promo kedai (job title "Barista", sama kayak
  jobnya sendiri).
- Sudah divalidasi tiap tambahan: `node --check` + **audit graf node**
  (BFS dari node awal tiap thread — 0 referensi rusak buat SEMUA 10
  karakter + verifikasi eksplisit gerbang overlap Dimas masih nyambung
  benar ke konten barunya) + **integrasi DOM penuh pakai jsdom** untuk
  tiap batch karakter baru — jalanin jalur lengkap via klik tombol
  sungguhan, verifikasi semua angka stat/identity/uang sesuai
  perhitungan manual. **Aturan "job cuma menetap sekali" (Langkah 7)
  dites ulang tiap nambah karakter baru** — terbukti konsisten lintas
  SEMUA 10 karakter berturut-turut (job pertama yang diambil — dari
  Nadia — tidak pernah ketiban job lain dari 9 karakter lainnya,
  termasuk Dimas yang job-nya sama persis "Barista"). `rivalRipple`
  (cuma sesama-gender) vs `globalRipple` (semua karakter) juga
  dikonfirmasi ulang berperilaku beda sesuai desain di tiap batch.
  Regresi ke seluruh konten yang udah ada dicek tiap kali nambah
  karakter baru, aman tidak kesenggol sama sekali sepanjang proses.

**Dengan ini, seluruh 8 langkah di rancangan sudah selesai
diimplementasikan dan divalidasi.** Sistem multi-karakter (10 kontak
bebas dipilih, waktu ambient, efek indikator 2-lapis, neglect score,
job system, app Diri, dan naskah penuh semua karakter) sudah jalan
end-to-end dari fondasi data sampai konten.
