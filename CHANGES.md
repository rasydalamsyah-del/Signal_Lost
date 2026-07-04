# Changelog — Signal Lost

## 2026-07-04 (lanjutan 3) — Story engine, profil nama dinamis, notifikasi global

Fitur besar: DashChat sekarang jadi mesin cerita bercabang sungguhan, bukan
placeholder balasan "...". Ini scope-nya:

- **`core/state.js`** — tambah `profile` (8 field nama: kamu, pasangan,
  sahabat kamu, sahabat pasangan, ibu/ayah kamu, ibu/ayah pasangan) dan
  `story.threads` (progres per percakapan: node saat ini, sudah tampil
  berapa baris, sedang nunggu pilihan/input atau tidak, apakah sudah
  "selesai"). Tambah `AppState.resolveText()` yang mengganti token
  `{{user}}`, `{{partner}}`, dst dengan nilai di `profile` (ada fallback
  kata umum kalau field belum diisi, jadi tidak pernah muncul "undefined").
  Tambah `AppState.touch()` untuk memberi tahu listener setelah mutasi
  langsung ke contacts/chats (bukan lewat `set()`).
- **`core/story.js`** (baru) — engine dialog bercabang + naskah lengkap.
  Setiap node bisa berupa: beberapa baris teks berurutan (`lines`), input
  bebas yang mengaktifkan kotak tulis dan menyimpan ke `profile` (`input`),
  pilihan bertumpuk (`choices`), rantai otomatis ke node berikut tanpa
  perlu tap (`next`), dan efek sekali-jalan (`effects`: ganti flag, kirim
  notifikasi, akhiri thread, buat thread/kontak baru, ganti nama kontak).
  Efek dijamin cuma jalan sekali per node (`runEffectsOnce`), termasuk
  kalau nanti ada node jalan-buntu yang belum sempat lanjut dan
  dibuka-tutup berkali-kali oleh pemain.
  - Naskah **Asisten**: 20 node — sapaan, penjelasan mekanisme main
    (kapan kotak tulis aktif vs kapan pilihan muncul), lalu menanyakan
    ke-8 nama profil satu per satu, demo pilihan bercabang sungguhan
    (3 respons beda tergantung pilihan), penjelasan setting "Lanjut
    Otomatis", lalu berpamitan sambil mengakhiri percakapan.
  - Naskah **Pasangan (`???`)**: 12 node — kontak misterius muncul
    menggantikan Asisten, beberapa cabang pilihan asli (nada beda-beda
    tergantung respons pemain), lalu pengungkapan nama (kontak otomatis
    berganti dari `???` ke nama asli dari `profile.partner.name`),
    berhenti di cliffhanger (memang sengaja — lanjutannya nanti).
- **`apps/dashchat.js`** — dirombak total. Thread sekarang murni mengikuti
  `core/story.js`: kotak tulis nonaktif secara default, aktif hanya saat
  node minta input; pilihan muncul sebagai tombol bertumpuk di atas kotak
  tulis (auto-wrap kalau teks panjang); pilihan tunggal tetap muncul
  sebagai tombol kecuali setting "Lanjut Otomatis" menyala; percakapan
  yang berakhir (`endThread`) otomatis hilang dari daftar & kembali ke
  inbox. Dibuat robust terhadap "pemain pindah layar di tengah animasi
  ketik" — progres per node (`revealedCount`) disimpan supaya reopen
  chat melanjutkan, bukan mengulang dari awal.
- **`core/router.js`** — tambah `Router.generation()`, counter yang naik
  setiap render. Dipakai dashchat.js buat tahu persis kalau pemain sudah
  pindah ke layar/percakapan lain (lebih akurat daripada cuma cek
  `currentId()`, yang tidak bisa membedakan pindah antar chat berbeda
  yang sama-sama beralamat "dashchat").
- **`core/notify.js`** (baru) — banner notifikasi global
  (`Notify.show({title, body})`) yang slide-in dari atas layar, bertahan
  ±3.8 detik, lalu hilang sendiri. Independen dari router jadi bisa
  muncul dari mana saja.
- **`index.html`** — tambah elemen `#toast-banner`, urutan script baru
  (`core/notify.js`, `core/story.js` dimuat sebelum `core/router.js`).
- **`style.css`** — style untuk toast banner, tombol pilihan chat,
  kotak input nonaktif, dan form profil di Settings.
- **`apps/settings.js`** — bagian baru "Profil Cerita" (8 field nama,
  semua bisa diedit kapan saja) + toggle "Lanjut Otomatis".
- **`screens/homeScreen.js`** — badge DashChat sekarang lebih akurat
  (menghitung juga kontak baru yang belum pernah dibalas), dan memicu
  notifikasi "Asisten: pesan baru" sekali di awal game (ditandai lewat
  `flags.assistantNotifShown` supaya tidak berulang).
- **`screens/lockScreen.js`** — preview notifikasi di lock screen sekarang
  ada fallback teks generik kalau chat belum ada pesan tapi kontaknya baru.
- Semua file lolos `node --check`. Alur cerita penuh (isi 8 nama profil →
  demo pilihan → serah terima ke kontak pasangan → pengungkapan nama)
  sudah disimulasikan headless di Node dan hasilnya sesuai rancangan —
  lihat histori commit untuk detail skrip tes.
- **Belum selesai / lanjutan berikutnya:** naskah pasangan berhenti di
  `p_hold` (cliffhanger, sengaja). Menambah node lanjutan tinggal nambah
  entri baru di `STORY.partner` pada `core/story.js`, tidak perlu ubah
  apa pun di `dashchat.js`.


## 2026-07-04 (lanjutan 2) — Perbaikan icon: bug warna hitam + upgrade ke ikon Lucide

**Akar masalah "icon aplikasinya hitam doang":** ditemukan bug di `style.css`.
`.app-icon-glyph` diset `color:var(--void)` (hampir hitam, `#0B0D10`) padahal
seharusnya putih — sehingga SVG `fill="currentColor"` ikut jadi hitam pekat di
atas tile gradient berwarna, jadi kelihatan seperti blob hitam polos, bukan
ikon. Sudah diperbaiki jadi `color:#fff`.

Sekalian upgrade seluruh set ikon:

- **`assets/icons.js`** — 10 app-icon + ikon nav/status di-redraw ulang pakai
  base shape dari **Lucide Icons** (lucide.dev, lisensi ISC — bebas dipakai
  komersial, bukan logo brand bertrademark seperti Instagram/YouTube/dsb, jadi
  aman dari sisi hak cipta). Gaya line-icon 1.8px stroke, konsisten di semua
  app: DashChat → bubble chat, Kontak → dua figur orang, Snaply → kamera,
  Stremly → clapperboard, Gallery → foto bertumpuk, Storage → save/disk,
  MyShop → tas belanja, Location → pin peta, Kalender → kalender, Pengaturan →
  gear.
- **`style.css`** — kontainer ikon (`.app-icon-glyph`) sekarang render ikon
  putih bersih + drop-shadow tipis di atas gradient tile, kontras jauh lebih
  baik daripada sebelumnya.
- **`apps/calendar.js`, `contacts.js`, `gallery.js`, `snaply.js`, `storage.js`,
  `stremly.js`** — empty-state yang tadinya masih pakai karakter unicode
  mentah (▦ ▶ ☰ ◎ ⇊ ▧, ukuran/warna tidak konsisten) diganti pakai ikon SVG
  yang sama dengan ikon app-nya di home screen, biar seragam di semua tempat.
- Semua file sudah lolos `node --check` (syntax valid).


Dokumen ini mencatat progres pengembangan, agar setiap perubahan (manual maupun
lewat sesi Claude) jelas terlacak dan tidak ada yang tercecer.

## 2026-07-04 (lanjutan) — Typing indicator DashChat selesai dikerjakan

Menutup gap yang ditemukan saat audit hari yang sama (lihat entri di bawah):

- ✅ **`apps/dashchat.js`** — `handleReply()` sekarang menampilkan bubble
  `.typing-dots` (titik-titik berdenyut) begitu pemain mengirim pesan, lalu
  menggantinya dengan balasan asli setelah jeda acak ~0.9–1.6 detik (biar
  terasa alami, tidak selalu sama). CSS `.typing-dots` / `@keyframes
  typingBounce` ternyata **sudah ada duluan** di `style.css` sejak commit
  redesign besar — hanya belum pernah disambungkan ke logic-nya. Sekarang
  sudah disambung.
- Perubahan lain di file yang sama: `handleReply()` tidak lagi butuh parameter
  `chatId` atau memanggil ulang `renderThread()` penuh — sekarang pakai
  closure `paint()` yang sudah ada, jadi tidak ada flicker/reset fokus input
  saat balasan datang.
- Sudah dicek dengan `node --check` — sintaks valid.

## [Unreleased] — Ditemukan saat audit 2026-07-04

Catatan yang sebelumnya **tidak tercatat di mana pun**, ditemukan saat cross-check
antara riwayat percakapan desain dan isi repo:

- ~~⚠️ **Typing indicator DashChat belum ada.**~~ **Sudah diperbaiki**, lihat entri
  di atas. Sesi desain sempat merencanakan animasi "sedang mengetik" (bubble
  titik-titik berdenyut) sebelum balasan `them` muncul di `apps/dashchat.js`.
  Fitur ini disebut sudah "Selesai" di catatan lama, tapi setelah dicek langsung
  ke file, balasan masih muncul instan lewat `setTimeout` 700ms tanpa indikator
  visual apa pun.
- Riwayat commit di GitHub semuanya berjenis "Add files via upload" (upload manual
  dari browser GitHub, bukan `git commit` biasa), jadi tidak ada pesan commit granular
  per fitur. Mulai sekarang perubahan akan dicatat manual di file ini supaya history
  tetap jelas walau commit-nya digabung.

## Riwayat commit (terverifikasi dari `git log`)

| Commit | Tanggal | Isi |
|---|---|---|
| `73dafe4` | 2026-07-03 | Initial commit — starter project: struktur SPA (router, state, 10 app, 3 screen dasar), README |
| `303c377` | 2026-07-04 | `apps/dashchat.js` — ganti glyph teks jadi ikon SVG, tombol kirim pakai `ICONS.send` |
| `3cfc51e` | 2026-07-04 | `core/router.js` — tambah `forgetRecent()`, animasi transisi `screen-anim`/`screen-anim-pop` |
| `a4d92ac` | 2026-07-04 | Rombak `screens/`: lock screen baru (swipe-to-unlock), boot animation arahkan ke lock (pakai `Router.replace` biar tidak numpuk history), home screen & status bar pakai SVG, recent apps jadi kartu |
| `2bf6caa` | 2026-07-04 | `assets/icons.js` — library ikon SVG terpusat untuk status bar, nav bar, semua app icon |
| `2a8d952` | 2026-07-04 | `index.html` & `style.css` — bingkai HP realistis, dynamic island, tombol samping, redesign penuh stylesheet |

## Status fitur saat ini

- ✅ Alur navigasi: Start → Boot → Lock (swipe unlock) → Home
- ✅ Nav bar Back / Home / Recent Apps berfungsi
- ✅ Dynamic island + status bar SVG (jam, sinyal, wifi, baterai)
- ✅ 10 app punya kerangka fungsional (DashChat, Kontak, Snaply, Stremly, Gallery,
  Storage, MyShop, Location, Kalender, Pengaturan)
- ✅ Ikon SVG custom di semua app (bukan emoji/teks lagi)
- ✅ Animasi transisi antar layar (system screen vs app-pop)
- ✅ Typing indicator DashChat — selesai dikerjakan 2026-07-04

## Cara pakai file ini ke depan

Setiap kali ada perubahan (baik lewat sesi ini atau upload manual), tambahkan entri
baru di atas dengan format: tanggal, file yang diubah, dan ringkasan singkat kenapa.
Ini memisahkan "apa yang benar-benar sudah jalan di kode" dari "apa yang cuma
disebut selesai di obrolan" — supaya tidak ada gap seperti kasus typing indicator
di atas.
