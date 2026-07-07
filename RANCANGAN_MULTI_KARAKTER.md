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

### ⏭️ Langkah 6 — Contacts & DashChat wiring ke 10 karakter (belum dikerjakan — termasuk migrasi konten lama)
### ⏭️ Langkah 7 — Job system (belum dikerjakan)
### ⏭️ Langkah 8 — Konten penuh per karakter (belum dikerjakan)
