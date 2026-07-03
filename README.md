# Signal Lost — starter project

Visual novel + phone-simulator, dibungkus dalam satu "layar HP" yang full-screen di
perangkat mobile. Dibuat pakai HTML/CSS/JS biasa — tanpa build tool, tanpa framework.

## Cara menjalankan

Karena ini murni file statis, cukup buka `index.html` langsung di browser
(double-click juga bisa) — **tidak perlu server**, tidak perlu install apa pun.

Kalau mau preview persis seperti versi mobile (full layar), buka lewat Chrome DevTools
→ toggle device toolbar (Ctrl/Cmd+Shift+M) → pilih ukuran HP (mis. iPhone 13).
Atau langsung buka file-nya lewat browser di HP asli kamu.

## Struktur folder

```
signal-lost/
├── index.html          ← satu-satunya file HTML (cangkang HP)
├── style.css            ← semua styling + design tokens (warna, font) di bagian atas
├── main.js               ← entry point, cuma memanggil Router.navigate('start')
│
├── core/
│   ├── state.js          ← data game global (chat, kontak, save/load, dll)
│   └── router.js         ← "pindah halaman" tanpa reload + riwayat utk Back/Recent
│
├── screens/
│   ├── startScreen.js     ← halaman Start (judul, Mulai/Lanjutkan/Pengaturan)
│   ├── bootAnimation.js   ← animasi loading setelah tekan Mulai
│   ├── homeScreen.js      ← beranda: jam + grid ikon aplikasi
│   ├── statusBar.js        ← jam, jaringan, baterai di status bar atas
│   ├── navBar.js           ← wiring tombol Back / Home / Recent
│   └── recentApps.js       ← halaman "aplikasi terbaru"
│
└── apps/                    ← satu file = satu aplikasi di HP
    ├── dashchat.js           ← chat (gameplay utama)
    ├── contacts.js
    ├── snaply.js             ← feed sosial media
    ├── stremly.js            ← daftar live stream
    ├── gallery.js
    ├── storage.js            ← save / load (pakai localStorage)
    ├── myshop.js
    ├── location.js
    ├── calendar.js
    └── settings.js
```

## Cara nulis cerita

Semua data cerita ada di satu tempat: **`core/state.js`**, fungsi `defaultData()`.
Ubah isi `chats`, `contacts`, `snaplyPosts`, `calendar`, dst di situ untuk mulai
menulis dialog dan karakter kamu sendiri.

Contoh: nambah kontak baru yang "tiba-tiba muncul" di tengah cerita —
di file app manapun cukup panggil:

```js
AppState.get().contacts.push({ id: 'c2', name: 'Nomor Tak Dikenal', avatar: '?', isNew: true });
AppState.get().chats.c2 = { name: 'Nomor Tak Dikenal', messages: [
  { from: 'them', text: 'jangan cari aku.', time: '02:41' }
]};
```

Balasan otomatis chat (`handleReply` di `apps/dashchat.js`) masih placeholder
(cuma balas "..."), gantilah dengan logic percabangan cerita kamu sendiri —
misalnya cek kata kunci di pesan pemain (`AppState.get().flags.lastPlayerMessage`)
lalu tentukan balasan/percabangan berikutnya.

## Nambah aplikasi baru di home screen

1. Buat file baru di `apps/nama-app.js`, isi minimal:
   ```js
   (function () {
     function render(root) {
       root.innerHTML = `<div class="app-screen">...</div>`;
     }
     Router.register('nama-app', render);
   })();
   ```
2. Tambahkan `<script src="apps/nama-app.js"></script>` di `index.html`
   (sebelum `main.js`).
3. Tambahkan entry baru di array `APPS` pada `screens/homeScreen.js`.

## Ukuran layar

Di desktop, tampilan dibungkus jadi "device mockup" seukuran HP (390×844px,
`--phone-w` / `--phone-h` di `style.css`). Di layar ≤768px (HP asli), otomatis
jadi 100% lebar & tinggi viewport — full layar, tanpa border.

## Simpan / muat permainan

Aplikasi **Storage** memakai `localStorage` browser — data tersimpan otomatis
di perangkat/browser yang sama, tidak perlu server atau akun.
