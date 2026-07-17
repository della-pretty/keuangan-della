# Catatan Keuangan Mahasiswa (Versi Web App / PWA)

Versi ini **gak perlu di-compile/build sama sekali**. Tinggal upload file-file
ini ke hosting gratis, terus buka linknya di HP, dan bisa di-"Add to Home
Screen" biar kayak aplikasi beneran.

## Isi Folder
```
keuangan_pwa/
├── index.html          # halaman utama + semua styling
├── app.js               # logika UI & navigasi antar layar
├── classifier.js          # model Naive Bayes (JavaScript)
├── storage.js               # penyimpanan data (localStorage)
├── training-data.js           # data latih kategori
├── manifest.json                # konfigurasi PWA
├── sw.js                         # service worker (fitur offline)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Cara Hosting via GitHub Pages (gratis, paling gampang)

1. Buka repo GitHub kamu (`keuangan-della`)
2. Hapus/abaikan file-file lama (main.py, buildozer.spec, dll) — **gak
   kepake lagi** buat versi web ini. Boleh dibiarin juga gak masalah, gak
   akan ganggu.
3. Upload semua file di folder `keuangan_pwa` ini ke repo:
   - Klik **Add file → Upload files**
   - Upload `index.html`, `app.js`, `classifier.js`, `storage.js`,
     `training-data.js`, `manifest.json`, `sw.js`
   - Buat folder `icons` dengan cara ketik `icons/icon-192.png` di kolom
     nama file saat upload (GitHub otomatis bikin foldernya), upload kedua
     file icon di situ
   - Klik **Commit changes**
4. Aktifkan GitHub Pages:
   - Klik tab **Settings** di repo
   - Di sidebar kiri, klik **Pages**
   - Di bagian **Source**, pilih branch **main**, folder **/ (root)**
   - Klik **Save**
5. Tunggu 1-2 menit, nanti muncul link kayak:
   `https://della-pretty.github.io/keuangan-della/`
6. Buka link itu di HP kamu (lewat Chrome)

## Cara "Install" ke HP (Add to Home Screen)

**Di Android (Chrome):**
1. Buka link aplikasinya di Chrome
2. Ketuk titik tiga (⋮) di pojok kanan atas
3. Pilih **"Add to Home screen"** / "Tambahkan ke layar utama"
4. Konfirmasi nama aplikasinya
5. Icon aplikasi bakal muncul di homescreen HP kamu, bisa dibuka
   full-screen kayak aplikasi asli (gak ada address bar browser)

## Testing di Laptop (opsional, sebelum di-hosting)

Buka file `index.html` langsung di browser (double click), atau kalau mau
fitur PWA-nya jalan penuh, jalankan local server dulu:
```
python -m http.server 8000
```
lalu buka `http://localhost:8000` di browser.

## Catatan Teknis buat Skripsi

- Aplikasi ini disebut **PWA (Progressive Web App)** — teknologi yang
  memungkinkan web app terasa dan berfungsi seperti aplikasi native
- Model klasifikasi tetap **Naive Bayes**, cuma diimplementasi ulang di
  JavaScript (logikanya identik dengan versi Python)
- Data disimpan di **localStorage** browser (pengganti SQLite di versi
  sebelumnya) — semua data tetap tersimpan di HP, tidak dikirim ke server
  manapun
- Bagian ini bisa dijelaskan di BAB Metode: alasan pemilihan pendekatan PWA
  dibanding native Android (kemudahan distribusi, tidak perlu proses
  compile/build yang kompleks, cross-platform)
