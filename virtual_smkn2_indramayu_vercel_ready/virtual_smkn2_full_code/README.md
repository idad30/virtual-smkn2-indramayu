# Virtual SMKN 2 Indramayu — Starter Code

## Yang sudah tersedia
- Registrasi tanpa password game menggunakan Firebase Anonymous Authentication.
- Username Instagram sebagai identitas yang diklaim pemain.
- Checkbox pernyataan sudah follow @smkn2indramayu_official.
- Tidak ada upload screenshot/bukti follow.
- Tingkat X/XI/XII dan 8 jurusan.
- Pembagian kelas otomatis ke kelas dengan jumlah pendaftar paling sedikit.
- Status awal `pending`; admin memeriksa username secara manual lalu mengubah status menjadi `approved` atau `rejected` di Firestore.
- Demo lingkungan kampus 3D dasar.

## PENTING: batas verifikasi Instagram
Tombol "Saya sudah follow" hanya pernyataan pemain, BUKAN pemeriksaan otomatis Instagram. Instagram tidak menyediakan API publik umum untuk memeriksa status follow sembarang akun. Karena tidak ada bukti follow dan tidak ada integrasi resmi, pemeriksaan harus dilakukan manual oleh admin dengan mencari username di Instagram. Jangan meminta password Instagram.


## Deploy website ke Vercel
1. Upload seluruh isi folder proyek ini ke repository GitHub. Pastikan `vercel.json`, folder `public`, `functions`, dan `firestore.rules` berada di root repository.
2. Buka https://vercel.com/ lalu pilih **Add New → Project** dan import repository GitHub tersebut.
3. Pada konfigurasi project, pilih Framework Preset **Other**. Biarkan Build Command kosong dan pastikan Output Directory adalah `public`. Root Directory tetap `./`.
4. Klik **Deploy**. Halaman utama tersedia di domain Vercel; halaman kampus dapat dibuka melalui `/campus.html`.
5. Sebelum digunakan, isi konfigurasi Firebase di `public/firebase-config.js`. Jangan memasukkan private key/service-account ke file frontend.

### Backend Firebase tetap harus di-deploy terpisah
Vercel pada konfigurasi ini hanya meng-host file website statis. Cloud Function pendaftaran, Firestore Rules, dan database tetap berada di Firebase. Dari root proyek jalankan:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```
Pastikan proyek Firebase yang aktif benar (`firebase use --add`) dan Authentication Anonymous sudah diaktifkan. `firebase.json` tetap disertakan untuk deployment backend/rules Firebase; jangan mengubah Output Directory Vercel menjadi folder `functions`.

## 1. Siapkan Firebase
1. Buat/pilih proyek Firebase.
2. Aktifkan Authentication > Sign-in method > Anonymous.
3. Buat Firestore Database.
4. Tambahkan Web App, lalu isi `public/firebase-config.js`.
5. Pastikan Cloud Functions tersedia pada paket Firebase yang mendukung Functions dan billing yang diperlukan.

## 2. Instal dan deploy
Pasang Node.js 20 dan Firebase CLI, lalu dari folder proyek:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules,hosting
```

## 3. Persetujuan admin
Buka Firebase Console > Firestore Database > `players`.
Cari dokumen dengan UID pemain. Setelah admin memeriksa username Instagram:
- set `status` menjadi `approved` untuk mengizinkan akses demo;
- atau set `status` menjadi `rejected`.

Lakukan perubahan hanya oleh admin sekolah yang berwenang. Jangan berikan akses Firebase Console kepada pemain.

## 4. Keterbatasan login tanpa password
Starter ini memakai Firebase Anonymous Auth: tidak ada password, tetapi sesi terikat pada browser/perangkat. Jika data browser dihapus atau pemain pindah perangkat, identitas anonim dapat hilang. Username Instagram yang diketik tidak membuktikan kepemilikan akun. Untuk login lintas perangkat tanpa password, perlu metode identitas lain yang benar-benar dapat memverifikasi pengguna.

## 5. Kelas
Jumlah kelas per tingkat:
- NKPI 2; APHPI 2; TKJ 3; RPL 2
- TAB 3; KULINER 3; APAPL 1; TP 2

Alokasi otomatis memilih kelas dengan jumlah pendaftar paling sedikit. Ini pembagian demo; untuk data siswa resmi, admin perlu memastikan kapasitas dan daftar kelas aktual.

## 6. Catatan demo 3D
`campus.html` dan `campus.js` adalah lingkungan 3D ilustratif. Posisi bangunan belum merupakan denah resmi. Model karakter dan seragam harian/jurusan belum dimasukkan ke demo ini.
