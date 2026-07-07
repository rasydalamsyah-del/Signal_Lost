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
