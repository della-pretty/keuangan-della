# Catatan Keuangan Mahasiswa (Versi Web App / PWA + Firebase)

Versi ini pakai **Firebase Authentication** buat login/registrasi beneran
(email verifikasi, password, reset password lewat email), dan **Firebase
Realtime Database** buat nyimpen data supaya bisa diakses dari perangkat
manapun selama login pakai akun yang sama.

## Fitur Login/Akun
- Registrasi pakai email + password (1 email = 1 akun, otomatis ditegakkan
  Firebase)
- Verifikasi email wajib sebelum bisa masuk ke aplikasi
- Login dari perangkat manapun pakai email + password yang sama
- Lupa password? Bisa reset lewat link yang dikirim ke email
- Data (transaksi, tabungan) tersimpan di cloud, bukan cuma di 1 HP

## Isi Folder
```
keuangan_pwa/
├── index.html            # halaman utama + semua styling
├── app.js                 # logika UI, navigasi, & alur autentikasi
├── auth.js                  # modul Firebase Authentication
├── firebase-config.js         # konfigurasi project Firebase kamu
├── classifier.js                # model Naive Bayes (JavaScript)
├── storage.js                     # baca/tulis data ke Firebase Realtime DB
├── training-data.js                 # data latih kategori
├── manifest.json                      # konfigurasi PWA
├── sw.js                                # service worker (cache offline)
├── database-rules.json                    # rules keamanan (BUKAN buat diupload
│                                             ke repo, tapi dipaste manual di
│                                             Firebase Console)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Setup Firebase (WAJIB dilakukan dulu sebelum hosting)

### 1. Pasang security rules di Realtime Database
- Buka Firebase Console -> project kamu -> Realtime Database -> tab Rules
- Hapus isi yang ada, ganti dengan isi file `database-rules.json`:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth !== null && auth.uid === $uid",
        ".write": "auth !== null && auth.uid === $uid"
      }
    }
  }
}
```
- Klik **Publish**

Rules ini penting banget -- tanpa ini, database kamu bakal ketutup total
(gak ada yang bisa baca/tulis). Rules di atas mastiin tiap user CUMA bisa
akses data mereka sendiri.

### 2. Upload semua file ke GitHub (termasuk 2 file BARU)
File yang perlu diupload ke repo `keuangan-della` (timpa yang lama +
tambahin yang baru):
- `index.html`, `app.js`, `storage.js` -- **update** (isinya berubah)
- `auth.js`, `firebase-config.js` -- **file baru**, upload pertama kali
- `classifier.js`, `training-data.js`, `manifest.json`, `sw.js`,
  folder `icons` -- gak berubah, boleh upload ulang juga gapapa

**Jangan upload** `database-rules.json` ke GitHub Pages -- itu cuma buat
dipaste manual di Firebase Console (langkah 1 di atas).

## Cara Kerja Alur Login

1. **Daftar** -> isi nama, email, tanggal lahir, password -> otomatis
   dikirim email verifikasi
2. **Cek email** -> klik link verifikasi di email tersebut
3. **Balik ke aplikasi** -> klik "Saya Sudah Verifikasi" -> masuk ke
   halaman Welcome -> mulai pakai aplikasi
4. **Login berikutnya** (di HP manapun) -> masukin email + password yang
   sama -> langsung masuk, data otomatis muncul (karena tersimpan di cloud)
5. **Lupa password?** -> klik "Lupa Password?" di halaman login ->
   masukin email -> cek email buat link reset

## Testing

Karena ini butuh koneksi internet beneran ke server Firebase, coba
langsung di browser HP/laptop kamu (gak bisa dites offline). Kalau ada
error pas registrasi/login, screenshot pesan errornya.

## Catatan Teknis buat Skripsi

- **Firebase Authentication**: layanan identity/auth-as-a-service dari
  Google, dipakai buat autentikasi user (bisa dijelasin di BAB Metode
  sebagai bagian dari arsitektur sistem)
- **Firebase Realtime Database**: NoSQL cloud database, data disimpan per
  user berdasarkan UID unik dari Firebase Auth
- Password user tidak pernah disimpan di database kamu -- itu semua
  ditangani terenkripsi oleh Firebase, kamu cuma dapet UID sebagai
  referensi
- Aplikasi ini menerapkan model client-server sederhana: frontend
  (GitHub Pages) berkomunikasi dengan backend-as-a-service (Firebase)
  lewat SDK, tanpa perlu bikin server sendiri

## Fitur AI/Informatika Lainnya
- Kategorisasi otomatis pakai Naive Bayes
- Deteksi anomali pengeluaran pakai Z-Score
- Clustering pola pengeluaran pakai K-Means
- Prediksi pengeluaran bulan depan pakai regresi linear
- Skor kesehatan keuangan (composite index)
- Export laporan ke Excel
- Achievement/gamifikasi nabung
