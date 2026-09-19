# 📅 Kalender Kegiatan (Activity Calendar)

Aplikasi web modern **Kalender Kegiatan** dengan fungsionalitas CRUD lengkap (Create, Read, Update, Delete). Dibangun menggunakan **HTML5, CSS3 murni, dan Vanilla JavaScript** di sisi frontend (tanpa framework, tanpa build tools) dan **Google Apps Script Web App** dengan database **Google Sheets** di sisi backend.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Struktur File Proyek](#-struktur-file-proyek)
3. [Panduan Backend: Deploy Google Apps Script](#-panduan-backend-deploy-google-apps-script)
4. [Menghubungkan Backend ke Frontend](#-menghubungkan-backend-ke-frontend)
5. [Menjalankan di Komputer Lokal](#-menjalankan-di-komputer-lokal)
6. [Panduan Deploy ke Vercel](#-panduan-deploy-ke-vercel)
7. [Struktur Model Data](#-struktur-model-data)
8. [Tips & Troubleshooting](#-tips--troubleshooting)

---

## ✨ Fitur Utama
- **Kalender Bulanan Interaktif**: Navigasi bulan (Maju/Mundur/Hari Ini), indikator kegiatan (*dot badge*), dan *highlight* tanggal aktif.
- **Agenda Tanggal Terpilih**: Menampilkan seluruh agenda pada tanggal yang diklik secara mendetail (judul, deskripsi, rentang tanggal, waktu kegiatan, dan lokasi dengan ikon).
- **Kegiatan Mendatang (*Upcoming*)**: Daftar agenda terdekat yang diurutkan secara kronologis dengan opsi ekspansi (*Lihat Lainnya*).
- **CRUD Penuh**:
  - **Tambah Kegiatan Baru**: Formulir modal dengan validasi input (bidang wajib diisi, tanggal selesai tidak boleh sebelum tanggal mulai, jam selesai harus valid).
  - **Edit Kegiatan**: Formulir otomatis terisi (*pre-filled*) dengan data yang sudah ada.
  - **Hapus Kegiatan**: Dialog konfirmasi sebelum data dihapus dari spreadsheet.
- **Auto-Setup Google Sheets**: Script otomatis mendeteksi tab dan membuat baris header pada Google Sheet kosong saat pertama kali dijalankan.
- **Bebas Masalah CORS**: Menggunakan metode pengiriman payload yang dirancang khusus untuk Google Apps Script agar terhindar dari *CORS preflight (OPTIONS)*.
- **Mode Demo / Lokal**: Jika URL Apps Script belum diisi, aplikasi otomatis berjalan dengan data simulasi pada *browser storage*, sehingga bisa langsung dicoba dan dipresentasikan.

---

## 📂 Struktur File Proyek
```text
calender-api/
├── Code.gs          # Backend: Google Apps Script (CRUD & Google Sheets API)
├── index.html       # Frontend: Struktur antarmuka web semantik
├── style.css        # Styling: Desain modern, tema Emerald Green, responsif
├── script.js        # Logic: Kalender, validasi form, komunikasi API & CRUD
└── README.md        # Dokumentasi dan panduan deployment
```

---

## 🚀 Panduan Backend: Deploy Google Apps Script

### Langkah 1: Buka Google Sheets
1. Buka Google Sheet proyek Anda (ID: `1A_zE0Of-6Y3Nilj03_Ja7luiThDGcRDMH8Zy5_b_hQU`).
2. Pastikan Google Sheet tersebut berada di akun Google Anda atau akun yang memiliki izin edit.

### Langkah 2: Buka Apps Script Editor
1. Pada menu navigasi Google Sheet di bagian atas, klik **Extensions** (Ekstensi) > **Apps Script**.
2. Editor kode Google Apps Script akan terbuka di tab baru.

### Langkah 3: Salin Kode Backend
1. Hapus fungsi bawaan `myFunction()` di editor `Code.gs`.
2. Buka file [`Code.gs`](./Code.gs) di proyek ini, salin seluruh kodenya, lalu tempelkan (*paste*) ke dalam editor Apps Script.
3. Klik tombol **Save** (ikon disket) atau tekan `Ctrl + S` (`Cmd + S` di Mac).

### Langkah 4: Publikasikan sebagai Web App
1. Klik tombol biru **Deploy** di pojok kanan atas > pilih **New deployment** (Penerapan baru).
2. Di sebelah kiri tulisan *"Select type"*, klik ikon gerigi ⚙️ > pilih **Web app**.
3. Isi konfigurasi berikut:
   - **Description**: `Kalender Kegiatan v1.0`
   - **Execute as**: `Me (email-anda@gmail.com)` *(Sangat penting: pilih Me)*
   - **Who has access**: `Anyone` *(Sangat penting: pilih Anyone agar dapat diakses publik dari Vercel tanpa login Google)*
4. Klik **Deploy**.
5. Google akan meminta izin akses (*Authorization Required*):
   - Klik **Authorize access**.
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik tautan kecil **Advanced** (Lanjutan) di kiri bawah > klik **Go to Untitled project (unsafe)**.
   - Klik **Allow** (Izinkan).
6. Setelah selesai, Google akan menampilkan **Web app URL**. Salin URL tersebut!
   > Format URL: `https://script.google.com/macros/s/AKfycb.../exec`

---

## 🔗 Menghubungkan Backend ke Frontend

Buka file [`script.js`](./script.js) di editor Anda. Pada baris ke-18, cari variabel `APPS_SCRIPT_URL`:

```javascript
// SEBELUM:
const APPS_SCRIPT_URL = "";

// SESUDAH (Ganti dengan URL yang Anda salin dari Google Apps Script):
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxAbCdEfGhIjKlMnOpQrStUvWxYz/exec";
```

Simpan file `script.js`. Sekarang frontend Anda sudah resmi terhubung langsung ke Google Sheet!

---

## 💻 Menjalankan di Komputer Lokal

Karena proyek ini murni HTML, CSS, dan JavaScript tanpa *compiler* atau *bundler*, Anda dapat menjalankannya langsung di browser:

### Opsi A: Menggunakan VS Code Live Server (Direkomendasikan)
1. Buka folder `calender-api` di VS Code.
2. Pasang ekstensi **Live Server** (oleh Ritwick Dey) jika belum ada.
3. Klik kanan pada file `index.html` > pilih **Open with Live Server**.
4. Aplikasi akan terbuka otomatis di browser pada alamat `http://127.0.0.1:5500/index.html`.

### Opsi B: Menggunakan Python HTTP Server
Buka terminal/PowerShell di folder ini dan jalankan:
```bash
# Python 3:
python -m http.server 3000
```
Buka browser dan akses `http://localhost:3000`.

---

## 🌐 Panduan Deploy ke Vercel

Aplikasi ini dapat di-deploy ke Vercel secara gratis dalam hitungan detik:

### Cara 1: Menggunakan Vercel CLI (Paling Cepat)
1. Buka terminal di folder `calender-api`.
2. Jalankan perintah:
   ```bash
   npx vercel
   ```
3. Ikuti panduan di terminal:
   - *Set up and deploy?* Ketik **Y** lalu tekan Enter.
   - *Which scope?* Pilih akun Vercel Anda.
   - *Link to existing project?* Ketik **N**.
   - *What's your project's name?* Beri nama `kalender-kegiatan` (atau tekan Enter).
   - *In which directory is your code located?* Tekan Enter (`./`).
   - Vercel akan otomatis mendeteksi bahwa ini adalah situs statis (*Other*).
4. Untuk deploy ke production domain:
   ```bash
   npx vercel --prod
   ```

### Cara 2: Menggunakan GitHub + Vercel Dashboard
1. Buat repositori baru di GitHub (misal: `kalender-kegiatan`).
2. Unggah file-file proyek (`index.html`, `style.css`, `script.js`, `README.md`) ke repositori GitHub tersebut.
3. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New...** > **Project**.
4. Hubungkan dengan repositori GitHub Anda.
5. Pada bagian **Build and Output Settings**, biarkan default (kosongkan build command karena ini adalah situs web statis).
6. Klik **Deploy**.
7. Website Anda langsung tayang dan dapat diakses dari mana saja!

---

## 📊 Struktur Model Data

Satu baris data di Google Sheet merepresentasikan satu kegiatan dengan kolom berikut:

| Kolom | Tipe Data | Keterangan | Contoh |
| :--- | :--- | :--- | :--- |
| `id` | String | ID unik (dibuat otomatis oleh server) | `evt_1726588800123` |
| `judul` | String | Nama / judul agenda kegiatan | `Rapat Koordinasi OSIS` |
| `deskripsi` | String | Catatan atau rincian kegiatan | `Membahas anggaran Porseni` |
| `lokasi` | String | Tempat pelaksanaan kegiatan | `Ruang Multimedia` |
| `tanggal_mulai` | String | Format `YYYY-MM-DD` | `2026-09-20` |
| `tanggal_selesai` | String | Format `YYYY-MM-DD` | `2026-09-21` |
| `jam_mulai` | String | Format `HH:MM` | `08:00` |
| `jam_selesai` | String | Format `HH:MM` | `11:30` |

---

## 💡 Tips & Troubleshooting

### 1. Mengapa data belum muncul setelah update kode di Apps Script?
Google Apps Script memiliki sistem versi penerapan. Jika Anda mengedit kode di `Code.gs`:
- Klik tombol **Deploy** > **Manage deployments** (Kelola penerapan).
- Klik ikon pensil ✏️ (Edit).
- Pada bagian **Version**, pilih **New version** (Versi baru).
- Klik **Deploy**. URL Web App akan tetap sama dan perubahannya langsung aktif.

### 2. Bagaimana cara menguji jika Google Sheet belum disiapkan?
Aplikasi dilengkapi fitur **Mode Demo Lokal**. Saat `APPS_SCRIPT_URL` masih berupa string kosong (`""`), seluruh operasi penambahan, edit, dan hapus kegiatan disimpan di penyimpanan lokal browser (*localStorage*) sehingga Anda tetap dapat menguji fungsionalitas UI secara penuh.

### 3. Mengapa tidak ada error CORS saat POST dari Vercel ke Apps Script?
Google Apps Script tidak mendukung metode `OPTIONS` yang biasanya dikirimkan browser jika header `Content-Type` disetel ke `application/json`. Proyek ini menggunakan `Content-Type: text/plain;charset=utf-8` di frontend dan mem-parse isi `e.postData.contents` di backend sehingga transmisi data berjalan mulus tanpa hambatan CORS.
