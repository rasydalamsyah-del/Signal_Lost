# Changelog — Signal Lost

## 2026-07-04 (lanjutan 9) — Perbaiki jitter angka jam di cutscene time-skip

Jam digital di scene lompat waktu kelihatan geser kanan-kiri tiap ganti
angka. Penyebabnya: browser gak otomatis kasih lebar yang sama persis ke
tiap digit meski fontnya monospace (`Space Mono`), dan blok teksnya gak
punya lebar tetap jadi ikut geser pas lebar teks berubah dikit.

- `style.css` (`.timeskip-clock`): tambah `font-variant-numeric:
  tabular-nums` (+ fallback `font-feature-settings`) buat maksa tiap
  digit punya lebar sama persis, dan kasih `width` tetap + `text-align:
  center` biar posisi blok jamnya diam di tempat gak peduli apa pun.
  Sekalian tambah animasi "tick" halus (opacity berkedip tipis tiap
  ~0.45 detik) biar kerasa hidup, bukan cuma teks yang tiba-tiba ganti.
- `screens/timeSkip.js`: jumlah step animasi dinaikin dari 24 ke 48
  (interval lebih rapat, 55ms), jadi progresnya kerasa lebih mulus,
  bukan loncat-loncat.


## 2026-07-04 (lanjutan 8) — Reveal kontak teman, cutscene lompat waktu, mode "ketuk buat lanjut"

Fitur besar baru sesuai request: di tengah obrolan pasangan, pasangan
kasih tau kalau teman user ({{userFriend}}) udah lama pengen ngobrol
tapi nomor user kemarin nonaktif, terus ngasih kontaknya.

- **`core/state.js`** — tambah `phone.time` (jam in-game FIKSI, menit
  sejak tengah malam, default 810 = 13:30). Ini terpisah total dari jam
  device asli.
- **`screens/statusBar.js`** — jam di status bar sekarang baca
  `phone.time`, bukan `new Date()` device asli. Cuma berubah kalau
  cerita yang secara eksplisit menggerakkannya (lewat cutscene di bawah).
- **`screens/timeSkip.js`** (baru) — screen baru: layar hitam, jam
  digital besar di tengah, jalan cepat maju sejumlah menit yang
  ditentukan (dipakai 60 menit / 1 jam), sambil `phone.time` di-update
  tiap tick — jadi jam di status bar (atas) ikut berubah live selama
  animasi berjalan, bukan cuma jam di tengah doang. Setelah animasi
  selesai, otomatis lempar balik ke Home (atau screen lain sesuai
  parameter) dan bisa jalanin efek lanjutan (`onComplete`).
- **`core/router.js`** — tambah `NAV_HIDDEN` (beda dari `CHROMELESS`):
  status bar tetap kelihatan tapi nav bar disembunyikan, khusus buat
  cutscene kayak `timeSkip` biar gak bisa di-back/di-home di tengah animasi.
- **`core/story.js` / `apps/dashchat.js`** — 3 kemampuan baru di engine:
  1. `skipTo` sekarang bisa cek flag cerita juga (`when:'flag'`), bukan
     cuma "semua profil udah keisi" — dipakai buat percabangan siapa
     yang minta kontak duluan.
  2. `gotoScreen` di sebuah node — mindahin dari obrolan ke screen lain
     (misal cutscene time-skip), dan screen itu yang tanggung jawab
     ngembaliin pemain lagi.
  3. `holdUntilTap` — buat obrolan yang jalan paralel sama obrolan lain
     yang belum kelar (di sini: chat teman muncul sementara chat
     pasangan masih ada): cuma tampil 1 baris duluan, sisanya nunggu
     pemain betul-betul buka chat itu DAN ketuk di mana aja di layar
     obrolannya (bukan tombol) buat lanjut. Progresnya kesimpen — keluar
     masuk chat gak bikin ke-replay dari awal.
  4. Effect baru `deliverFirstLine` — buat ngirim 1 baris pesan langsung
     ke chat log TANPA animasi ketik, karena itu "kejadian" pas pemain
     lagi nggak di layar situ (pas time-skip/di Home). Dikombinasikan
     sama `holdUntilTap` di baris berikutnya.
  5. **Bug ikutan ketemu & diperbaiki**: `renderThread` gak pernah
     bersihin `contact.isNew` kalau chat dibuka LANGSUNG dari notifikasi
     (cuma dibersihin kalau klik baris di list) — badge bisa nyangkut
     lagi kalau notifikasi diklik. Sekarang dibersihkan di `renderThread`
     langsung, jadi berlaku dari jalur mana pun chat itu dibuka.
- **Naskah baru** (`core/story.js`):
  - Titik cabang baru di obrolan pasangan (`p_ask_friend_gate`): pemain
    bisa PROAKTIF minta nomor {{userFriend}}, atau diemin aja biar
    pasangan yang nawarin sendiri — nge-set flag `askedForFriendContact`.
  - Kedua jalur berujung ke kontak `friend` baru (otomatis muncul di
    Kontak & DashChat) + cutscene lompat 1 jam.
  - **Kalo gak minta duluan**: teman yang chat pertama (1 baris lewat
    notifikasi + `deliverFirstLine`, sisanya nunggu diketuk), obrolan
    ngalir natural nanya kabar & dari mana dapet nomor.
  - **Kalo minta duluan**: pemain sendiri yang milih kalimat pembuka
    buat ngirim ke teman (pilihan tombol, bukan nunggu notifikasi) —
    gak nunggu teman chat duluan, sesuai request.
- Semua dites lewat simulasi Node: kedua skenario cabang, dan effect
  `deliverFirstLine` dites langsung (pesan kesimpen bener, state
  `awaiting:'tap'` keset otomatis, badge kontak ke-flag baru lagi).


## 2026-07-04 (lanjutan 7) — Investigasi notifikasi "tidak bisa diklik"

Ditest 3 lapis pakai jsdom (headless browser) buat mastiin ini bukan bug
kode: computed CSS `pointer-events` beneran berubah `none` → `auto` pas
class `.toast-clickable` ditambah, dan event listener klik beneran
terpasang & terpanggil. Mekanismenya sendiri **sudah benar dari awal**.

Penyebab paling mungkin: banner cuma tampil ±3.8 detik dan belum ada
tanda visual yang bilang itu bisa diketuk — jadi kemungkinan besar hilang
duluan sebelum sempat ditekan, atau pemain gak sadar itu interaktif.
Diperbaiki di `core/notify.js`:

- Notifikasi yang punya `onClick` sekarang bertahan 6 detik (bukan 3.8),
  dan timer auto-hide-nya **berhenti begitu disentuh/ditekan**
  (`pointerdown`) — jadi gak bakal hilang persis pas mau diklik.
- Ditambah chevron kecil (`›`) di kanan banner, cuma muncul kalau
  notifikasinya bisa diklik (`assets/icons.js`: ikon baru `chevronRight`,
  `style.css`: `.toast-chevron`) — jadi jelas keliatan itu bisa ditekan.
- Ditest ulang lewat jsdom simulasi pointerdown+click, mekanismenya jalan
  benar sekarang.


## 2026-07-04 (lanjutan 6) — Bersihkan sisa referensi "sistem/fitur" di dialog Asisten

Setelah lanjutan-5 (fokus ke dialog pasangan), audit ulang nemuin sisa
kalimat Asisten yang MASIH kedengeran kayak sistem ngomong ke user,
bukan orang beneran:

- `"...jawab pake kata-kata sendiri di kotak bawah"` → hapus "kotak bawah"
  (rujukan UI literal), sekarang cuma "jawab aja pake kata-kata sendiri".
- `"...udah isi semua data itu duluan di Pengaturan"` → hapus nama app,
  sekarang "kayaknya semua itu udah keisi dari awal ya".
- `"...cuma buat mastiin fiturnya jalan beneran"` → dihapus total, kalimat
  ini murni framing QA-testing, gak ada gunanya buat karakter.
- `"...nyalain 'Lanjut Otomatis' di Pengaturan aja"` → dihapus penyebutan
  nama toggle secara literal. Info soal opsi tunggal tetap disampaikan
  ("kadang cuma ada satu balasan yang bisa dipilih"), tapi cara
  mempercepatnya dibiarkan ditemukan sendiri lewat Pengaturan (yang
  memang sudah ada hint text di situ) — bukan diumumkan di dalam chat.
- `"...emang gitu sistemnya, jangan kaget"` → hapus kata "sistem", ini
  masalah yang sama persis dengan yang ditemukan di dialog pasangan
  (karakter kedengeran kayak entitas sistem, bukan orang).
- Semua file lolos `node --check`, naskah dites ulang lewat simulasi Node.


## 2026-07-04 (lanjutan 5) — Pasangan gak lagi "jadi sinyal", notifikasi bisa diklik

- **Framing dialog pasangan diperbaiki** — beberapa baris lama bikin dia
  kedengeran kayak menyatu/jadi bagian dari sinyal itu sendiri ("kalo
  sinyalnya ngizinin", "hp ini gamau ngizinin aku cerita", "sinyalnya
  mulai gak stabil di sisi aku") — seolah dia ENTITAS sinyal, bukan orang
  yang lagi chat pakai hp yang lagi bermasalah. Diganti jadi keraguan
  manusiawi asli ("entah kenapa susah banget buat mulai", "aku belum
  siap jawab itu sekarang", "koneksi di sini mulai jelek lagi" — koneksi
  jelek itu alasan teknis biasa di baris terakhir aja, bukan penjelasan
  kenapa dia gabisa ngomong dari awal).
- **Notifikasi sekarang bisa diklik** — `core/notify.js` nerima `onClick`,
  banner dapat class `.toast-clickable` biar keliatan interaktif. Klik
  notifikasi "Asisten: pesan baru" di awal game atau "??? : ada pesan
  baru" pas pasangan muncul, sekarang langsung buka chat itu
  (`Router.navigate('dashchat', {chatId})`), gak cuma visual doang.
- Semua file lolos `node --check`; skrip dialog dites ulang lewat
  simulasi Node, hasil teks sudah sesuai.


## 2026-07-04 (lanjutan 4) — Nada dialog, skip pertanyaan yang sudah terjawab, fix bug badge

Masukan dari testing manual, tiga perbaikan nyata:

- **Nada dialog kaku/kayak AI** — seluruh naskah Asisten & Pasangan ditulis
  ulang total di `core/story.js`, dari kalimat formal/menjelaskan-sistem
  ("Cara kerjanya sederhana...") jadi gaya chat casual sehari-hari ("eh,
  halo. ini hp baru kamu kan?"). Penjelasan mekanisme game dipangkas jadi
  1 baris singkat yang dibungkus natural, bukan kuliah UI.
- **Bug: Asisten tetap nanya nama yang udah diisi di Pengaturan** —
  ditambah dua lapis pengecekan di `apps/dashchat.js` (`enterNode`):
  1. Node gerbang `a_profile_gate` (baru, di `core/story.js`) — kalau
     kedelapan field profil sudah terisi semua sebelum chat dibuka, seluruh
     sesi tanya-nama di-skip sekaligus, langsung ke satu baris pengakuan
     ("kelihatannya kamu udah isi semua data itu") lalu lanjut ke demo pilihan.
  2. Tiap node tanya-nama individual juga skip sendiri-sendiri kalau
     field itu spesifik sudah terisi (jadi kalau cuma sebagian yang diisi
     duluan, cuma yang kosong yang ditanya). Dites di Node dengan 2 skenario
     (semua terisi / sebagian terisi) — keduanya jalan sesuai rancangan.
- **Bug: titik notifikasi (badge) gak sinkron, gak pernah hilang** — akar
  masalahnya di `screens/homeScreen.js` dan `screens/lockScreen.js`: logic
  lama menghitung "belum dibaca" kalau `last.from === 'them'`, padahal
  hampir semua percakapan otomatis berakhir dengan pesan dari lawan chat
  (termasuk cliffhanger yang emang sengaja gitu) — jadi badge stuck nyala
  selamanya walau sudah dibaca semua. Diperbaiki: status "baru/belum
  dibuka" sekarang murni dari `contact.isNew`, yang beneran jadi `false`
  pas pertama kali chat itu dibuka pemain — konsisten dengan cara badge
  Kontak sudah bekerja dari awal.
- Semua file lolos `node --check`; skip-logic dites headless di Node
  dengan 3 skenario (normal, semua profil pre-filled, sebagian pre-filled).


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
