# 📋 Panduan Instalasi — Aplikasi Asesmen Online Sekolah

Aplikasi ini punya 2 bagian yang di-deploy terpisah:
- **Backend** (Google Apps Script) → database & API
- **Frontend** (folder ini) → tampilan, di-deploy ke GitHub Pages

Ikuti urutan di bawah — backend HARUS jalan dulu sebelum frontend bisa dipakai.

---

## BAGIAN A — Backend (Google Apps Script)

1. Buka https://script.google.com → **Proyek Baru**.
2. Hapus isi `Code.gs` bawaan. Buat file baru (ikon **+** di samping "Files") untuk tiap berkas
   `.gs` yang diserahkan terpisah di chat: `Config.gs`, `Setup.gs`, `Migrations.gs`, `Auth.gs`,
   `AdminCrud.gs`, `SoalJadwalToken.gs`, `AsesmenSiswa.gs`, `RekapGuru.gs`, `DocEngine.gs`,
   `Router.gs`. Salin-tempel isi masing-masing persis sesuai nama filenya.
3. Buka ikon ⚙️ **Project Settings** → centang **"Show appsscript.json manifest file"**.
   Buka file `appsscript.json` yang muncul, ganti isinya dengan berkas `appsscript.json`
   yang diserahkan di chat.
4. Di dropdown pemilih fungsi (atas, sebelah tombol ▶ Run), pilih **`setupAppEnvironment`** →
   klik **▶ Run**.
   - Google akan minta izin akses Drive & Sheets — klik **Review permissions**, pilih akun
     Anda, klik **Advanced** → **Go to (nama proyek) (unsafe)** → **Allow**. Ini normal untuk
     skrip buatan sendiri.
   - Buka **Execution log** (Ctrl+Enter / ikon di bawah) — pastikan muncul `✅ Setup selesai!`
     beserta URL Spreadsheet & Drive Folder, dan kredensial admin (`username=admin`).
   - ⚠️ **JANGAN jalankan `setupAppEnvironment` lebih dari sekali** — akan membuat
     database duplikat. Kalau tidak sengaja terlanjur, hapus manual folder/spreadsheet
     duplikat di Drive dan Script Properties-nya.
5. **Deploy** → **New deployment** → ikon ⚙️ pilih **Web app**.
   - Description: bebas (mis. "v1")
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy** → **Authorize access** jika diminta → **COPY URL yang berakhiran `/exec`**.

Simpan URL `/exec` ini — dipakai di langkah Frontend.

---

## BAGIAN B — Frontend (GitHub Pages)

1. Ekstrak ZIP frontend yang diserahkan di chat. **Folder hasil ekstrak itulah folder proyek
   Anda** — `index.html` ada tepat di root folder ini, bukan di dalam folder lain.
2. Buka `js/config.js` dengan text editor, ganti:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec';
   ```
   dengan URL `/exec` dari Bagian A langkah 5. Simpan.
3. Ikuti panduan deploy ke GitHub Pages langkah demi langkah (Git init → commit → push →
   aktifkan Pages) — saya akan memandu Anda lewat terminal satu langkah setiap saat begitu
   Anda siap lanjut, cukup bilang saja.
4. Setelah situs tayang, buka URL-nya → coba login dengan akun admin (`admin` / `admin123`)
   → segera tambahkan data guru/siswa/kelas sungguhan, lalu ganti password admin.

---

## TEST SETELAH DEPLOY
1. Buka URL frontend GitHub Pages di browser.
2. Login sebagai **Admin** (`admin` / `admin123`) → cek Dashboard tampil (artinya `doGet` jalan).
3. Tambah 1 data Kelas, 1 data Siswa, 1 data Guru → cek muncul di tabel (artinya `doPost` jalan
   & tersimpan ke Google Sheets).
4. Buat 1 Model Soal → login sebagai Guru (pakai kredensial yang digenerate) → tambah beberapa
   soal untuk mapel tersebut.
5. Buat 1 Jadwal Asesmen untuk kelas yang sudah berisi siswa tadi → catat token-nya.
6. Login sebagai Siswa → buka halaman Jadwal → masukkan token → coba kerjakan & submit ujian
   → cek nilai otomatis muncul di Rekap Nilai (login Guru lagi).
7. Buka Chrome DevTools (F12) → tab **Network** → pastikan tidak ada error CORS merah saat
   fetch ke GAS_URL.

## Troubleshooting Cepat
| Gejala | Kemungkinan Penyebab |
|---|---|
| Login gagal terus padahal yakin benar | `GAS_URL` di `js/config.js` belum diisi / salah |
| Halaman blank / CSS tidak muncul | Struktur folder `css/` `js/` tidak ikut ter-push ke GitHub (lihat skill deploy) |
| "Sesi tidak valid" terus-menerus | Re-deploy Web App di GAS setelah mengubah kode `.gs`, lalu update `GAS_URL` jika URL berubah |
| Nilai tidak muncul di rekap | Pastikan siswa benar-benar klik "SELESAIKAN UJIAN (SUBMIT)", bukan hanya menutup tab |
