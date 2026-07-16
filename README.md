# Catatan Keuangan Mahasiswa

Aplikasi pencatatan keuangan pribadi dengan **kategorisasi otomatis** memakai
Naive Bayes (scikit-learn). Dibuat pakai **Kivy** supaya nanti bisa di-build
jadi aplikasi Android (.apk).

## Fitur
- **Registrasi profil di awal** (nama, email, tanggal lahir) + bikin PIN 4-6 digit
- **Kunci PIN** setiap kali aplikasi dibuka (setelah registrasi pertama)
- Fitur "Lupa PIN? (Reset Aplikasi)" buat hapus semua data & mulai ulang
- Catat pemasukan & pengeluaran
- Deskripsi transaksi otomatis diklasifikasikan ke kategori (Makanan,
  Transportasi, Pendidikan, Hiburan, Belanja, Kesehatan, Lainnya) pakai model
  Naive Bayes murni Python (tanpa dependency berat) yang dilatih dari
  `training_data.csv`
- Riwayat transaksi & saldo real-time
- Laporan ringkasan pengeluaran per kategori (bar chart + persentase)
- Data disimpan lokal pakai SQLite (`keuangan.db`), otomatis dibuat saat
  aplikasi pertama kali jalan

## Struktur File
```
keuangan_app/
├── main.py              # UI aplikasi (Kivy)
├── classifier.py         # Model Naive Bayes buat prediksi kategori
├── database.py            # Modul database SQLite
├── training_data.csv       # Data latih buat model kategorisasi
└── requirements.txt
```

## Instalasi

1. Install Python (kalau belum ada) dari python.org — pas install centang
   "Add Python to PATH"

2. Buka terminal/CMD di folder `keuangan_app`, lalu install library:
   ```
   pip install -r requirements.txt
   ```

3. Jalankan aplikasi:
   ```
   python main.py
   ```

Aplikasi bakal kebuka dalam jendela desktop (mode ini dipakai buat
development/testing dulu, tampilannya udah didesain menyerupai ukuran layar
HP).

## Build jadi APK Android

File `buildozer.spec` udah disiapin di folder ini. Buildozer **cuma jalan di
Linux**, jadi kalau laptop kamu Windows, wajib pakai **WSL (Windows Subsystem
for Linux)** dulu.

### 1. Install WSL (kalau laptop Windows)

Buka PowerShell **as Administrator**, lalu ketik:
```
wsl --install
```
Restart laptop kalau diminta. Setelah itu buka aplikasi **Ubuntu** dari Start
Menu, dan buat username/password buat Linux-nya.

### 2. Siapin environment di WSL/Ubuntu

Di terminal Ubuntu (WSL), jalanin satu-satu:
```bash
sudo apt update
sudo apt install -y python3-pip build-essential git python3-venv \
    libffi-dev libssl-dev zlib1g-dev openjdk-17-jdk unzip

pip install --user buildozer cython==0.29.36
```

### 3. Pindahin project ke WSL

File project kamu ada di Windows (misal `D:\game della`). Dari terminal
Ubuntu, copy ke folder Linux (lebih cepat & stabil daripada build langsung
dari drive Windows):
```bash
cp -r /mnt/d/game\ della ~/keuangan_app
cd ~/keuangan_app
```
(Sesuaikan `/mnt/d/game\ della` dengan lokasi folder project kamu di Windows —
drive D jadi `/mnt/d/`, drive C jadi `/mnt/c/`, dst.)

### 4. Build APK

```bash
buildozer -v android debug
```

Build pertama bakal lama (30-60 menit atau lebih) karena Buildozer otomatis
download Android SDK & NDK. Pastikan koneksi internet stabil dan laptop gak
mati/sleep selama proses ini.

Kalau berhasil, file `.apk` bakal muncul di folder `bin/`, contoh:
`bin/catatankeuangan-1.0-arm64-v8a-debug.apk`

### 5. Install ke HP

- Kirim file `.apk` itu ke HP kamu (lewat kabel data, Google Drive, WhatsApp, dll)
- Di HP, buka file `.apk`-nya lalu install (mungkin perlu izinin "Install from
  unknown sources" di pengaturan HP)

### Catatan penting
- Icon aplikasi (`icon.filename` di `buildozer.spec`) optional — kalau gak
  ada file `icon.png`, hapus baris itu, nanti pakai icon default
- Kalau ada error pas build, biasanya karena ada requirement Python yang
  belum kompatibel di Android (jarang terjadi untuk kombinasi library yang
  dipakai di app ini, tapi kalau kejadian, share pesan errornya)
- Proses build APK ini paling gampang dan stabil kalau dikerjain di Linux
  asli atau WSL, **bukan** langsung di Windows

## Menambah / Mengubah Data Latih Kategori

Kalau prediksi kategori kurang akurat buat kasus tertentu, tambahin contoh
baru di `training_data.csv` (format: `teks,kategori`), lalu hapus file
`category_model.joblib` (kalau sudah ada) supaya model dilatih ulang otomatis
saat aplikasi dijalankan lagi.

## Catatan buat Skripsi

- Bagian yang bisa dibahas di BAB Metode Penelitian: preprocessing teks
  (TF-IDF) dan algoritma klasifikasi Naive Bayes buat kategorisasi otomatis
- Bagian yang bisa dibahas di BAB Hasil & Pembahasan: uji akurasi model
  (bisa split training_data.csv jadi data latih/uji), confusion matrix per
  kategori, dan evaluasi usability aplikasi
- Bisa ditambah pengembangan lanjutan: notifikasi budget bulanan, ekspor
  laporan ke Excel/PDF, grafik tren pengeluaran per bulan
