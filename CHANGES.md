# Changelog — Signal Lost

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
