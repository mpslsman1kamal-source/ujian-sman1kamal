# Aplikasi Asesmen Online Sekolah — Frontend

Frontend statis (HTML/CSS/JS vanilla) untuk Aplikasi Asesmen Online, dibangun dengan
arsitektur **GAS-PRO-API**: frontend ini murni UI, seluruh data & logika bisnis ada di
backend Google Apps Script (lihat berkas `.gs` yang diserahkan terpisah).

## Struktur
```
index.html         ← Shell SPA, satu-satunya HTML. Navigasi antar halaman via JS (hash router).
css/style.css       ← Design system "Technical Blueprint" (lihat DESIGN.md hasil sinkron Stitch)
js/config.js        ← ⚠️ ISI GAS_URL DI SINI sebelum deploy
js/api.js           ← Lapisan fetch() ke backend GAS
js/state.js          ← State & cache client-side
js/ui.js              ← Helper toast/modal/loading/shell navigasi
js/views.admin.js      ← Halaman Admin (W-02 s.d. W-11)
js/views.guru.js        ← Halaman Guru (W-12 s.d. W-16)
js/views.siswa.js        ← Halaman & mesin ujian Siswa (W-17 s.d. W-20)
js/app.js                 ← Router + halaman Login (W-01)
```

## Sebelum Deploy
1. Deploy backend GAS dulu (lihat `PANDUAN-INSTALASI.md`), salin URL `/exec`.
2. Buka `js/config.js`, ganti `GAS_URL` dengan URL tersebut.
3. Deploy folder INI (bukan folder induknya) ke GitHub Pages — lihat panduan instalasi.

## Akun Awal
Setelah `setupAppEnvironment()` dijalankan di backend, akun admin pertama:
- Username: `admin`
- Password: `admin123`

**Segera ganti password admin setelah login pertama kali** (menu akan tersedia di profil).
