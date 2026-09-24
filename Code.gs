/**
 * ============================================================================
 * KALENDER KEGIATAN OSIS - BACKEND GOOGLE APPS SCRIPT DENGAN SISTEM PIN ADMIN
 * ============================================================================
 * Proyek: Kalender Kegiatan & Jadwal Program Kerja OSIS (CRUD Web App)
 * Database: Google Sheets (Tab 'Kegiatan' & Tab 'Subscribers')
 * Backend: Google Apps Script Web App
 * Keamanan: Otentikasi & Otorisasi Berbasis PIN Admin (Script Properties & Token)
 *
 * ============================================================================
 * PANDUAN PENTING: KONFIGURASI ADMIN PIN & CARA DEPLOYMENT
 * ============================================================================
 * 
 * 1. DI MANA PIN ADMIN DIKONFIGURASI?
 *    PIN Admin TIDAK DISIMPAN di Google Sheets dan TIDAK DISIMPAN di frontend.
 *    PIN disimpan secara aman pada fitur bawaan Google Apps Script yaitu:
 *    "Script Properties" (Properti Skrip).
 *
 * 2. CARA MEMBUAT SCRIPT PROPERTY 'ADMIN_PIN':
 *    a. Buka editor Google Apps Script ini di peramban Anda.
 *    b. Di bilah sisi kiri (sidebar), klik ikon roda gigi ⚙️ "Project Settings"
 *       (Setelan Proyek).
 *    c. Gulir ke bawah hingga bagian "Script Properties" (Properti Skrip).
 *    d. Klik tombol "Add script property" (Tambahkan properti skrip).
 *    e. Masukkan:
 *       - Property : ADMIN_PIN
 *       - Value    : [PIN Rahasia Anda, misal: 123456 atau 8 digit angka]
 *    f. Klik "Save script properties" (Simpan properti skrip).
 *
 * 3. CATATAN KEAMANAN MENGENAI PIN:
 *    - JANGAN PERNAH menuliskan PIN langsung di dalam baris kode ini.
 *    - JANGAN menaruh PIN di Google Sheets atau di file JavaScript frontend.
 *    - Frontend HANYA menerima token sesi sementara (kedaluwarsa dalam 1 jam).
 *    - Frontend TIDAK PERNAH menerima atau mengetahui nilai PIN asli yang tersimpan.
 *
 * 4. APA YANG HARUS DILAKUKAN SETELAH MENGUBAH CODE.GS?
 *    Setiap kali ada perubahan pada Code.gs, Web App HARUS DIPERBARUI agar versi
 *    kode terbaru yang dijalankan oleh Google server:
 *    a. Simpan file ini dengan menekan tombol disket (Save) atau Ctrl+S.
 *    b. Klik tombol biru "Deploy" di pojok kanan atas > pilih "Manage deployments"
 *       (Kelola penerapan).
 *    c. Pada daftar penerapan di sebelah kiri, pilih deployment Web App yang aktif.
 *    d. Klik ikon pensil ✏️ "Edit" di bagian kanan atas modal.
 *    e. Pada dropdown "Version" (Versi), pilih "New version" (Versi baru).
 *       (Anda bisa menuliskan catatan deskripsi versi, misal: "v3 - Program Kerja & Notifikasi").
 *    f. Pastikan:
 *       - Execute as: Me (email akun Google Anda)
 *       - Who has access: Anyone (Siapa saja)
 *    g. Klik tombol "Deploy".
 *
 * 5. APAKAH URL WEB APP BERUBAH?
 *    TIDAK. Jika Anda memperbarui deployment yang sudah ada melalui menu
 *    "Manage deployments" > "Edit" > "New version", maka URL Web App TETAP SAMA.
 *    Anda TIDAK PERLU mengubah konstanta APPS_SCRIPT_URL di script.js!
 *
 * 6. STRUKTUR 12 KOLOM TAB KEGIATAN:
 *    Tabel Kegiatan menggunakan 12 kolom terstruktur:
 *    [id, judul, deskripsi, lokasi, divisi, proker, petugas, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, status]
 *    Jangan menghapus sheet, mengubah nama tab, atau menukar urutan kolom secara manual.
 *
 * ============================================================================
 * LANGKAH WAJIB SETELAH UPDATE FITUR PROGRAM KERJA & NOTIFIKASI
 * ============================================================================
 * 1. BACKUP DULU: Buka Google Sheet kalender Anda -> Klik menu File -> Make a copy
 *    (Buat salinan) sebelum melakukan tindakan apa pun untuk mengamankan data yang ada.
 * 2. Ganti seluruh isi Code.gs di editor Apps Script dengan versi terbaru ini, lalu Save (Ctrl+S).
 * 3. Isi konstanta SITE_URL di bawah ini dengan URL website kalender asli tempat web di-hosting.
 * 4. Jalankan fungsi 'setupAll' sekali dari editor Apps Script:
 *    - Pada bilah toolbar atas editor, pilih fungsi 'setupAll' dari dropdown fungsi.
 *    - Klik tombol 'Run' (Jalankan).
 *    - Google akan menampilkan dialog 'Authorization Required' (Perizinan Diperlukan).
 *    - Klik 'Review permissions' -> Pilih akun Google Anda -> Klik 'Advanced' (Lanjutan)
 *      -> Klik 'Go to [Nama Proyek] (unsafe)' -> Klik 'Allow' (Izinkan).
 *    - Izin akses kini mencakup pengelolaan spreadsheet dan pengiriman email otomatis.
 * 5. Cek spreadsheet Google Sheet Anda:
 *    - Pada tab 'Kegiatan', pastikan kolom baru (divisi, proker, petugas) berada di kolom E, F, G
 *      dan data lama telah tergeser rapi ke kanan (tanggal_mulai di kolom H dst).
 *    - Pastikan tab baru 'Subscribers' telah otomatis terbuat dengan header 'email' & 'subscribed_at'.
 * 6. Deploy pembaruan: Klik Deploy -> Manage deployments -> Edit (ikon pensil) ->
 *    Pilih Version: New version -> Klik Deploy. (URL Web App TIDAK BERUBAH).
 * 7. Setel Zona Waktu Proyek: Klik ikon roda gigi ⚙️ 'Project Settings' di sidebar kiri ->
 *    Pastikan 'Time zone' disetel ke (GMT+08:00) Asia/Makassar (WITA).
 * 8. Atur Pemicu Email Harian (Trigger):
 *    - Di sidebar kiri, klik ikon jam pemicu (Triggers / Pemicu).
 *    - Klik '+ Add Trigger' di kanan bawah.
 *    - Choose which function to run : sendDailyReminderEmails
 *    - Choose which deployment     : Head
 *    - Select event source          : Time-driven (Berdasarkan waktu)
 *    - Select type of time based trigger : Day timer (Penentu waktu hari)
 *    - Select time of day           : Pilih jendela waktu, misal 06:00 to 07:00 (Pagi)
 *    - Klik 'Save'.
 * 9. Testing Fitur:
 *    - Buat 1 kegiatan uji coba dengan tanggal_mulai hari ini di web kalender.
 *    - Daftarkan email Anda melalui website (ikon email di navbar) atau tambahkan di tab Subscribers.
 *    - Di editor Apps Script, pilih fungsi 'sendDailyReminderEmails' lalu klik 'Run'.
 *    - Periksa inbox & folder Spam email Anda untuk memastikan email digest diterima dengan rapi.
 *    - Periksa menu 'Executions' di Apps Script jika terjadi kendala.
 * 10. Kuota Email: Akun Gmail pribadi (@gmail.com) memiliki kuota ~100 penerima/hari, sedangkan
 *     Google Workspace sekolah/organisasi hingga ~1.500 penerima/hari. Email dikirim atas nama akun Google Anda.
 * 11. Pendaftaran & Pembatalan Email: Bersifat publik mandiri tanpa PIN. Administrator disarankan
 *     memeriksa tab Subscribers secara berkala; baris email dapat dihapus manual jika diperlukan.
 * 12. Peringatan Struktur Data: Jangan mengubah nama tab 'Kegiatan' atau 'Subscribers', dan jangan
 *     mengubah urutan kolom header tabel.
 * ============================================================================
 */

// Konfigurasi ID Google Sheet
var SPREADSHEET_ID = "1A_zE0Of-6Y3Nilj03_Ja7luiThDGcRDMH8Zy5_b_hQU";

// URL website publik tempat frontend kalender dihosting (digunakan untuk tautan di footer email)
var SITE_URL = "https://GANTI-DENGAN-URL-WEBSITE-ANDA";

// Nama sheet/tab untuk menyimpan data kegiatan
var SHEET_NAME = "Kegiatan";

// Nama properti di Script Properties untuk menyimpan PIN Admin
var ADMIN_PIN_PROPERTY_NAME = "ADMIN_PIN";

// Durasi masa aktif sesi token admin (1 jam = 3600 detik)
var TOKEN_EXPIRATION_SECONDS = 3600;

// Struktur kolom tabel kegiatan (Jadwal Program Kerja OSIS - 12 Kolom)
var HEADERS = [
  "id",
  "judul",
  "deskripsi",
  "lokasi",
  "divisi",
  "proker",
  "petugas",
  "tanggal_mulai",
  "tanggal_selesai",
  "jam_mulai",
  "jam_selesai",
  "status"
];

// Konfigurasi sheet tab langganan email (Subscribers)
var SUBSCRIBERS_SHEET_NAME = "Subscribers";
var SUBSCRIBER_HEADERS = ["email", "subscribed_at"];

// ============================================================================
// HELPER OTENTIKASI & SISTEM TOKEN ADMIN
// ============================================================================

/**
 * Mengambil PIN Admin dari Script Properties secara aman.
 * Jika belum disetel di Script Properties, mengembalikan null.
 */
function getAdminPinFromProperties() {
  try {
    var scriptProperties = PropertiesService.getScriptProperties();
    var pin = scriptProperties.getProperty(ADMIN_PIN_PROPERTY_NAME);
    return pin ? String(pin).trim() : null;
  } catch (err) {
    console.error("Gagal membaca Script Properties:", err);
    return null;
  }
}

/**
 * Mengambil atau membuat kunci rahasia HMAC (SESSION_SECRET) di Script Properties.
 * Kunci ini digunakan untuk menandatangani token sesi admin agar tidak dapat dipalsukan.
 */
function getOrCreateSessionSecret() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var secret = scriptProperties.getProperty("SESSION_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + "_" + new Date().getTime();
    scriptProperties.setProperty("SESSION_SECRET", secret);
  }
  return secret;
}

/**
 * Membuat token sesi admin sementara yang ditandatangani HMAC-SHA256.
 * Token berlaku selama TOKEN_EXPIRATION_SECONDS (1 jam).
 * Status aktif token juga dicatat di CacheService agar bisa di-revoke saat logout.
 */
function createAdminSessionToken() {
  var secret = getOrCreateSessionSecret();
  var randomId = Utilities.getUuid();
  var expiresAt = new Date().getTime() + (TOKEN_EXPIRATION_SECONDS * 1000);

  // Payload: randomId|expiresAt
  var payload = randomId + "|" + expiresAt;
  var signatureBytes = Utilities.computeHmacSha256Signature(payload, secret);
  var signature = Utilities.base64Encode(signatureBytes);

  // Token format: base64(payload).signature
  var token = Utilities.base64Encode(payload) + "." + signature;

  // Catat token aktif ke dalam CacheService
  try {
    var cache = CacheService.getScriptCache();
    cache.put("admin_session_" + randomId, "active", TOKEN_EXPIRATION_SECONDS);
  } catch (cacheErr) {
    console.warn("Peringatan CacheService saat pembuatan token:", cacheErr);
  }

  return {
    token: token,
    expiresAt: expiresAt
  };
}

/**
 * Memvalidasi apakah token sesi admin valid, tanda tangan HMAC cocok,
 * belum kedaluwarsa, dan belum di-logout.
 */
function isValidAdminToken(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") === -1) {
    return false;
  }

  try {
    var parts = token.split(".");
    if (parts.length !== 2) return false;

    var encodedPayload = parts[0];
    var providedSignature = parts[1];

    var secret = getOrCreateSessionSecret();
    var payloadBlob = Utilities.newBlob(Utilities.base64Decode(encodedPayload));
    var payload = payloadBlob.getDataAsString();

    var payloadParts = payload.split("|");
    if (payloadParts.length !== 2) return false;

    var randomId = payloadParts[0];
    var expiresAt = parseInt(payloadParts[1], 10);

    // 1. Cek masa berlaku token (waktu sekarang vs waktu kedaluwarsa)
    if (isNaN(expiresAt) || new Date().getTime() > expiresAt) {
      return false;
    }

    // 2. Verifikasi tanda tangan HMAC-SHA256
    var expectedSignatureBytes = Utilities.computeHmacSha256Signature(payload, secret);
    var expectedSignature = Utilities.base64Encode(expectedSignatureBytes);
    if (expectedSignature !== providedSignature) {
      return false;
    }

    // 3. Cek apakah token telah di-logout di CacheService
    var cache = CacheService.getScriptCache();
    var cacheStatus = cache.get("admin_session_" + randomId);
    if (cacheStatus === "revoked") {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Kesalahan saat validasi token admin:", err);
    return false;
  }
}

/**
 * Mencabut (revoke) token admin saat pengguna menekan tombol Logout.
 */
function revokeAdminToken(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") === -1) {
    return;
  }
  try {
    var parts = token.split(".");
    var payloadBlob = Utilities.newBlob(Utilities.base64Decode(parts[0]));
    var payload = payloadBlob.getDataAsString();
    var randomId = payload.split("|")[0];

    var cache = CacheService.getScriptCache();
    cache.put("admin_session_" + randomId, "revoked", TOKEN_EXPIRATION_SECONDS);
  } catch (err) {
    console.warn("Gagal revoke token admin:", err);
  }
}

// ============================================================================
// HELPER DATABASE SPREADSHEET & MIGRASI
// ============================================================================

/**
 * Memeriksa dan memigrasi struktur tab Kegiatan jika masih menggunakan skema 9 kolom lama.
 * Idempoten dan aman dieksekusi berulang kali (dilindungi ScriptLock).
 */
function migrateEventsSheetIfNeeded(sheet) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    console.warn("Tidak dapat memperoleh lock untuk migrasi sheet:", e);
    return;
  }

  try {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      return; // Sheet baru kosong
    }

    var headerValues = sheet.getRange(1, 1, 1, Math.max(lastCol, HEADERS.length)).getValues()[0];
    var col5Header = String(headerValues[4] || "").trim().toLowerCase();
    var needsMigration = false;
    var needsRepair = false;

    if (col5Header !== "divisi") {
      needsMigration = true;
    } else if (lastRow > 1) {
      // Kasus Perbaikan (REPAIR): Header baris 1 sudah tertimpa 'divisi',
      // namun data baris 2 masih menggunakan susunan 9 kolom lama (kolom 5 adalah tanggal)
      var sampleRow = sheet.getRange(2, 1, 1, Math.max(lastCol, HEADERS.length)).getValues()[0];
      var col5Val = String(sampleRow[4] || "").trim();
      var col8Val = String(sampleRow[7] || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(col5Val) && !/^\d{4}-\d{2}-\d{2}$/.test(col8Val)) {
        needsRepair = true;
      }
    }

    if (needsMigration || needsRepair) {
      console.log("Menjalankan migrasi/perbaikan data pada sheet 'Kegiatan' (needsMigration=" + needsMigration + ", needsRepair=" + needsRepair + ")...");
      
      // Sisipkan 3 kolom baru setelah kolom 4 (lokasi) agar data tanggal_mulai dst bergeser ke kanan
      sheet.insertColumnsAfter(4, 3);

      // Tulis ulang baris header lengkap 12 kolom
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#10b981");
      headerRange.setFontColor("#ffffff");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);

      // Atur lebar kolom proporsional
      sheet.setColumnWidth(1, 140); // id
      sheet.setColumnWidth(2, 220); // judul
      sheet.setColumnWidth(3, 260); // deskripsi
      sheet.setColumnWidth(4, 180); // lokasi
      sheet.setColumnWidth(5, 180); // divisi (~180px)
      sheet.setColumnWidth(6, 200); // proker (~200px)
      sheet.setColumnWidth(7, 150); // petugas (~150px)
      sheet.setColumnWidth(8, 120); // tanggal_mulai
      sheet.setColumnWidth(9, 120); // tanggal_selesai
      sheet.setColumnWidth(10, 100); // jam_mulai
      sheet.setColumnWidth(11, 100); // jam_selesai
      sheet.setColumnWidth(12, 110); // status
      
      console.log("Migrasi sheet 'Kegiatan' selesai.");
    }
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/**
 * Fungsi pembantu untuk membuka atau membuat sheet 'Kegiatan' otomatis
 * beserta header dan migrasi jika diperlukan.
 */
function getOrCreateSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Gagal membuka Spreadsheet dengan ID: " + SPREADSHEET_ID + ". Pastikan ID benar dan izin akses telah diberikan.");
  }

  var sheet = ss.getSheetByName(SHEET_NAME);

  // Jika tab belum ada, buat tab baru
  if (!sheet) {
    var sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) {
      sheet = sheets[0];
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  // Cek apakah baris pertama sudah berisi header
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    // Tulis header baru
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    
    // Format header
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#10b981");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Atur lebar kolom
    sheet.setColumnWidth(1, 140); // id
    sheet.setColumnWidth(2, 220); // judul
    sheet.setColumnWidth(3, 260); // deskripsi
    sheet.setColumnWidth(4, 180); // lokasi
    sheet.setColumnWidth(5, 180); // divisi (~180px)
    sheet.setColumnWidth(6, 200); // proker (~200px)
    sheet.setColumnWidth(7, 150); // petugas (~150px)
    sheet.setColumnWidth(8, 120); // tanggal_mulai
    sheet.setColumnWidth(9, 120); // tanggal_selesai
    sheet.setColumnWidth(10, 100); // jam_mulai
    sheet.setColumnWidth(11, 100); // jam_selesai
    sheet.setColumnWidth(12, 110); // status
  } else {
    // Sheet ada data: jalankan migrasi aman jika diperlukan
    migrateEventsSheetIfNeeded(sheet);
  }

  return sheet;
}

/**
 * Fungsi pembantu untuk membuka atau membuat sheet tab 'Subscribers'
 * untuk menyimpan daftar email langganan notifikasi agenda.
 */
function getOrCreateSubscribersSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Gagal membuka Spreadsheet dengan ID: " + SPREADSHEET_ID);
  }

  var sheet = ss.getSheetByName(SUBSCRIBERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SUBSCRIBERS_SHEET_NAME);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, SUBSCRIBER_HEADERS.length).setValues([SUBSCRIBER_HEADERS]);
    var headerRange = sheet.getRange(1, 1, 1, SUBSCRIBER_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#10b981");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 280); // email
    sheet.setColumnWidth(2, 200); // subscribed_at
  }

  return sheet;
}

/**
 * Format respon standar JSON dengan ContentService
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper untuk mengonversi baris sheet menjadi objek kegiatan
 * Membaca posisi 12 kolom tetap
 */
function rowToObject(row) {
  return {
    id: String(row[0] || ""),
    judul: String(row[1] || ""),
    deskripsi: String(row[2] || ""),
    lokasi: String(row[3] || ""),
    divisi: String(row[4] || ""),
    proker: String(row[5] || ""),
    petugas: String(row[6] || ""),
    tanggal_mulai: String(row[7] || ""),
    tanggal_selesai: String(row[8] || ""),
    jam_mulai: String(row[9] || ""),
    jam_selesai: String(row[10] || ""),
    status: String(row[11] || "confirmed")
  };
}

/**
 * Helper untuk escape string HTML di sisi server
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Fungsi Setup Sekali Klik untuk Pemilik Spreadsheet
 * Buka Apps Script -> Pilih 'setupAll' -> Klik Run -> Izinkan hak akses (OAuth)
 */
function setupAll() {
  console.log("Memulai setup database Kalender Kegiatan OSIS...");
  var eventsSheet = getOrCreateSheet();
  console.log("Tab 'Kegiatan' siap (jumlah baris: " + eventsSheet.getLastRow() + ", kolom: " + eventsSheet.getLastColumn() + ").");
  var subSheet = getOrCreateSubscribersSheet();
  console.log("Tab 'Subscribers' siap (jumlah baris: " + subSheet.getLastRow() + ").");
  var remainingQuota = MailApp.getRemainingDailyQuota();
  console.log("Sisa kuota pengiriman email hari ini: " + remainingQuota + " email.");
  console.log("Setup selesai dengan sukses!");
}

// ============================================================================
// ENDPOINT GET (AKSES PUBLIK - TANPA PIN)
// ============================================================================
/**
 * Seluruh pengunjung (Guest) dapat membaca data kegiatan secara bebas:
 * - GET ?id=... (mengambil 1 kegiatan spesifik)
 * - GET tanpa parameter (mengambil seluruh daftar kegiatan)
 * Tab 'Subscribers' TIDAK PERNAH diekspos melalui doGet.
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();

    // Jika hanya ada baris header (belum ada data kegiatan)
    if (lastRow <= 1) {
      return createJsonResponse({
        success: true,
        data: []
      });
    }

    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();

    // Cek apakah ada parameter ?id=...
    var targetId = e && e.parameter && e.parameter.id ? String(e.parameter.id).trim() : null;

    if (targetId) {
      for (var i = 0; i < values.length; i++) {
        if (values[i][0] === targetId) {
          return createJsonResponse({
            success: true,
            data: rowToObject(values[i])
          });
        }
      }
      return createJsonResponse({
        success: false,
        error: "Kegiatan dengan ID '" + targetId + "' tidak ditemukan."
      });
    }

    // Jika tidak ada parameter ID, kembalikan seluruh list kegiatan
    var events = [];
    for (var j = 0; j < values.length; j++) {
      if (values[j][0] !== "") {
        events.push(rowToObject(values[j]));
      }
    }

    return createJsonResponse({
      success: true,
      data: events
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || "Terjadi kesalahan pada server saat membaca data."
    });
  }
}

// ============================================================================
// ENDPOINT POST (OTENTIKASI, LANGGANAN EMAIL & OPERASI CRUD TERLINDUNGI)
// ============================================================================
function doPost(e) {
  try {
    // Membaca payload dari e.postData.contents
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "Permintaan tidak valid: data payload kosong."
      });
    }

    var requestBody;
    try {
      requestBody = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        error: "Format JSON payload tidak valid."
      });
    }

    var action = requestBody.action;
    var data = requestBody.data || {};
    var clientToken = requestBody.token || data.token || "";

    // ------------------------------------------------------------------------
    // AKSI 1: LOGIN ADMIN (Verifikasi PIN)
    // ------------------------------------------------------------------------
    if (action === "login") {
      var submittedPin = String(requestBody.pin || data.pin || "").trim();

      if (!submittedPin) {
        return createJsonResponse({
          success: false,
          error: "PIN Admin tidak boleh kosong."
        });
      }

      var storedPin = getAdminPinFromProperties();

      // Peringatan jika pengembang belum membuat ADMIN_PIN di Script Properties
      if (!storedPin) {
        return createJsonResponse({
          success: false,
          error: "Konfigurasi server belum lengkap: ADMIN_PIN belum disetel di Script Properties Google Apps Script. Buka Project Settings > Script Properties."
        });
      }

      // Validasi kesamaan PIN
      if (submittedPin !== storedPin) {
        return createJsonResponse({
          success: false,
          error: "PIN Admin salah. Silakan periksa dan coba lagi."
        });
      }

      // PIN Benar: Buat token sesi sementara (1 jam)
      var session = createAdminSessionToken();

      return createJsonResponse({
        success: true,
        message: "Login admin berhasil.",
        token: session.token,
        expiresAt: session.expiresAt
      });
    }

    // ------------------------------------------------------------------------
    // AKSI 2: VERIFIKASI SESI TOKEN
    // ------------------------------------------------------------------------
    else if (action === "verifySession") {
      var isValid = isValidAdminToken(clientToken);
      return createJsonResponse({
        success: true,
        valid: isValid,
        message: isValid ? "Sesi admin aktif." : "Sesi admin telah kedaluwarsa atau tidak valid."
      });
    }

    // ------------------------------------------------------------------------
    // AKSI 3: LOGOUT ADMIN (Mencabut token)
    // ------------------------------------------------------------------------
    else if (action === "logout") {
      if (clientToken) {
        revokeAdminToken(clientToken);
      }
      return createJsonResponse({
        success: true,
        message: "Logout admin berhasil."
      });
    }

    // ------------------------------------------------------------------------
    // AKSI 4: SUBSCRIBE EMAIL (Pendaftaran Notifikasi Agenda - Akses Publik)
    // ------------------------------------------------------------------------
    else if (action === "subscribeEmail") {
      var email = String(requestBody.email || data.email || "").trim().toLowerCase();
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return createJsonResponse({
          success: false,
          error: "Format email tidak valid. Masukkan alamat email yang benar."
        });
      }

      var subLock = LockService.getScriptLock();
      try {
        subLock.waitLock(30000);
      } catch (lockErr) {
        return createJsonResponse({
          success: false,
          error: "Server sedang sibuk. Silakan coba beberapa saat lagi."
        });
      }

      try {
        var subSheet = getOrCreateSubscribersSheet();
        var lastSubRow = subSheet.getLastRow();
        if (lastSubRow > 1) {
          var existingEmails = subSheet.getRange(2, 1, lastSubRow - 1, 1).getDisplayValues();
          for (var s = 0; s < existingEmails.length; s++) {
            if (existingEmails[s][0].trim().toLowerCase() === email) {
              return createJsonResponse({
                success: true,
                message: "Email ini sudah terdaftar sebelumnya dalam daftar notifikasi agenda."
              });
            }
          }
        }

        var timestamp = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH:mm:ss") + " WITA";
        subSheet.appendRow([email, timestamp]);

        return createJsonResponse({
          success: true,
          message: "Terima kasih! Email Anda berhasil didaftarkan untuk menerima notifikasi agenda harian."
        });
      } finally {
        try {
          subLock.releaseLock();
        } catch (e) {}
      }
    }

    // ------------------------------------------------------------------------
    // AKSI 5: UNSUBSCRIBE EMAIL (Berhenti Berlangganan - Akses Publik)
    // ------------------------------------------------------------------------
    else if (action === "unsubscribeEmail") {
      var emailToUnsub = String(requestBody.email || data.email || "").trim().toLowerCase();
      if (!emailToUnsub) {
        return createJsonResponse({
          success: false,
          error: "Alamat email wajib disertakan."
        });
      }

      var unsubLock = LockService.getScriptLock();
      try {
        unsubLock.waitLock(30000);
      } catch (lockErr) {
        return createJsonResponse({
          success: false,
          error: "Server sedang sibuk. Silakan coba beberapa saat lagi."
        });
      }

      try {
        var unsubSheet = getOrCreateSubscribersSheet();
        var lastUnsubRow = unsubSheet.getLastRow();
        var targetUnsubIndex = -1;

        if (lastUnsubRow > 1) {
          var subEmails = unsubSheet.getRange(2, 1, lastUnsubRow - 1, 1).getDisplayValues();
          for (var u = 0; u < subEmails.length; u++) {
            if (subEmails[u][0].trim().toLowerCase() === emailToUnsub) {
              targetUnsubIndex = u + 2;
              break;
            }
          }
        }

        if (targetUnsubIndex === -1) {
          return createJsonResponse({
            success: false,
            error: "Alamat email tidak ditemukan dalam daftar langganan notifikasi."
          });
        }

        unsubSheet.deleteRow(targetUnsubIndex);

        return createJsonResponse({
          success: true,
          message: "Berhasil! Anda telah berhenti berlangganan notifikasi agenda harian."
        });
      } finally {
        try {
          unsubLock.releaseLock();
        } catch (e) {}
      }
    }

    // ========================================================================
    // PROTEKSI OTORISASI: OPERASI CRUD (CREATE, UPDATE, DELETE)
    // ========================================================================
    // Seluruh operasi di bawah ini WAJIB memiliki token sesi admin yang valid!
    if (action === "create" || action === "update" || action === "delete") {
      if (!isValidAdminToken(clientToken)) {
        return createJsonResponse({
          success: false,
          unauthorized: true,
          error: "Akses ditolak: Anda tidak memiliki izin atau sesi admin telah kedaluwarsa. Silakan login kembali dengan PIN Admin."
        });
      }
    }

    var sheet = getOrCreateSheet();

    // ------------------------------------------------------------------------
    // AKSI 6: CREATE (Tambah kegiatan baru - Hanya Admin)
    // ------------------------------------------------------------------------
    if (action === "create") {
      if (!data.judul || !data.tanggal_mulai || !data.tanggal_selesai) {
        return createJsonResponse({
          success: false,
          error: "Field 'judul', 'tanggal_mulai', dan 'tanggal_selesai' wajib diisi."
        });
      }

      if (!data.divisi || String(data.divisi).trim() === "") {
        return createJsonResponse({
          success: false,
          error: "Field 'divisi' (Divisi Penanggung Jawab) wajib diisi."
        });
      }

      var newId = "evt_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);

      var newRow = [
        newId,
        data.judul || "",
        data.deskripsi || "",
        data.lokasi || "",
        data.divisi || "",
        data.proker || "",
        data.petugas || "",
        data.tanggal_mulai || "",
        data.tanggal_selesai || "",
        data.jam_mulai || "",
        data.jam_selesai || "",
        data.status || "confirmed"
      ];

      sheet.appendRow(newRow);

      return createJsonResponse({
        success: true,
        message: "Kegiatan berhasil ditambahkan.",
        data: rowToObject(newRow)
      });
    }

    // ------------------------------------------------------------------------
    // AKSI 7: UPDATE (Perbarui kegiatan yang ada - Hanya Admin)
    // ------------------------------------------------------------------------
    else if (action === "update") {
      var updateId = data.id ? String(data.id).trim() : "";
      if (!updateId) {
        return createJsonResponse({
          success: false,
          error: "ID kegiatan wajib disertakan untuk melakukan update."
        });
      }

      if (!data.divisi || String(data.divisi).trim() === "") {
        return createJsonResponse({
          success: false,
          error: "Field 'divisi' (Divisi Penanggung Jawab) wajib diisi."
        });
      }

      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          success: false,
          error: "Tidak ada data kegiatan di spreadsheet."
        });
      }

      var idRangeValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      var foundRowIndex = -1;

      for (var k = 0; k < idRangeValues.length; k++) {
        if (idRangeValues[k][0] === updateId) {
          foundRowIndex = k + 2;
          break;
        }
      }

      if (foundRowIndex === -1) {
        return createJsonResponse({
          success: false,
          error: "Kegiatan dengan ID '" + updateId + "' tidak ditemukan."
        });
      }

      var updatedRow = [
        updateId,
        data.judul || "",
        data.deskripsi || "",
        data.lokasi || "",
        data.divisi || "",
        data.proker || "",
        data.petugas || "",
        data.tanggal_mulai || "",
        data.tanggal_selesai || "",
        data.jam_mulai || "",
        data.jam_selesai || "",
        data.status || "confirmed"
      ];

      sheet.getRange(foundRowIndex, 1, 1, HEADERS.length).setValues([updatedRow]);

      return createJsonResponse({
        success: true,
        message: "Kegiatan berhasil diperbarui.",
        data: rowToObject(updatedRow)
      });
    }

    // ------------------------------------------------------------------------
    // AKSI 8: DELETE (Hapus kegiatan - Hanya Admin)
    // ------------------------------------------------------------------------
    else if (action === "delete") {
      var deleteId = data.id ? String(data.id).trim() : "";
      if (!deleteId) {
        return createJsonResponse({
          success: false,
          error: "ID kegiatan wajib disertakan untuk melakukan penghapusan."
        });
      }

      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({
          success: false,
          error: "Tidak ada data kegiatan di spreadsheet."
        });
      }

      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      var targetRowIndex = -1;

      for (var m = 0; m < idValues.length; m++) {
        if (idValues[m][0] === deleteId) {
          targetRowIndex = m + 2;
          break;
        }
      }

      if (targetRowIndex === -1) {
        return createJsonResponse({
          success: false,
          error: "Kegiatan dengan ID '" + deleteId + "' tidak ditemukan."
        });
      }

      sheet.deleteRow(targetRowIndex);

      return createJsonResponse({
        success: true,
        message: "Kegiatan berhasil dihapus.",
        data: { id: deleteId }
      });
    }

    // ------------------------------------------------------------------------
    // AKSI TIDAK DIKENALI
    // ------------------------------------------------------------------------
    else {
      return createJsonResponse({
        success: false,
        error: "Aksi '" + action + "' tidak dikenali. Gunakan: 'login', 'verifySession', 'logout', 'subscribeEmail', 'unsubscribeEmail', 'create', 'update', atau 'delete'."
      });
    }

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || "Terjadi kesalahan pada server saat memproses aksi."
    });
  }
}

// ============================================================================
// PENGIRIMAN EMAIL REMINDER HARIAN (EMAIL DIGEST)
// ============================================================================
/**
 * PANDUAN PENGATURAN TRIGGER OTOMATIS:
 * 1. Buka editor Google Apps Script ini.
 * 2. Di bilah sisi kiri (left sidebar), klik ikon jam pemicu (Triggers / Pemicu).
 * 3. Klik tombol biru "+ Add Trigger" (+ Tambahkan Pemicu) di kanan bawah.
 * 4. Tentukan konfigurasi pemicu:
 *    - Choose which function to run : sendDailyReminderEmails
 *    - Choose which deployment     : Head
 *    - Select event source          : Time-driven (Berdasarkan waktu)
 *    - Select type of time based trigger : Day timer (Penentu waktu hari)
 *    - Select time of day           : Pilih jendela waktu, misal: 06:00 to 07:00 (Pagi hari)
 * 5. Klik "Save" (Simpan) dan setujui izin akses akun jika diminta.
 *
 * CATATAN KUOTA EMAIL (Google MailApp):
 * Akun Gmail standar (@gmail.com) memiliki kuota ~100 penerima/hari.
 * Akun Google Workspace institusi/sekolah memiliki kuota hingga ~1.500 penerima/hari.
 */
function sendDailyReminderEmails() {
  try {
    var todayStr = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd");
    var todayIndoFull = Utilities.formatDate(new Date(), "Asia/Makassar", "dd MMMM yyyy");

    // 1. Ambil data kegiatan dari sheet utama
    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log("Tidak ada kegiatan di database. Pengiriman email dilewati.");
      return;
    }

    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
    var todayEvents = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      if (!row[0]) continue;
      var evt = rowToObject(row);
      // Filter kegiatan: mulai hari ini ATAU kegiatan multi-hari yang sedang berlangsung hari ini
      var start = evt.tanggal_mulai;
      var end = evt.tanggal_selesai || evt.tanggal_mulai;
      if (start && end && start <= todayStr && end >= todayStr) {
        todayEvents.push(evt);
      }
    }

    // Jika tidak ada kegiatan hari ini, lewati (no empty digests)
    if (todayEvents.length === 0) {
      console.log("Tidak ada agenda kegiatan untuk hari ini (" + todayStr + "). Email reminder dilewati.");
      return;
    }

    // 2. Ambil daftar email dari sheet Subscribers
    var subSheet = getOrCreateSubscribersSheet();
    var lastSubRow = subSheet.getLastRow();
    if (lastSubRow <= 1) {
      console.log("Belum ada email di tab Subscribers. Pengiriman email dilewati.");
      return;
    }

    var subValues = subSheet.getRange(2, 1, lastSubRow - 1, 1).getDisplayValues();
    var recipientMap = {};
    var recipientEmails = [];
    for (var j = 0; j < subValues.length; j++) {
      var emailCandidate = subValues[j][0].trim().toLowerCase();
      if (emailCandidate && emailCandidate.indexOf("@") !== -1 && !recipientMap[emailCandidate]) {
        recipientMap[emailCandidate] = true;
        recipientEmails.push(emailCandidate);
      }
    }

    if (recipientEmails.length === 0) {
      console.log("Tidak ada alamat email valid di tab Subscribers.");
      return;
    }

    // Cek sisa kuota email harian
    var remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota <= 0) {
      console.warn("Kuota pengiriman email harian habis (0). Pengiriman email dibatalkan.");
      return;
    }

    if (remainingQuota < recipientEmails.length) {
      console.warn("Peringatan: Sisa kuota email (" + remainingQuota + ") lebih kecil dari jumlah subscriber (" + recipientEmails.length + "). Hanya mengirim ke " + remainingQuota + " penerima pertama.");
      recipientEmails = recipientEmails.slice(0, remainingQuota);
    }

    // Urutkan agenda berdasarkan jam mulai
    todayEvents.sort(function (a, b) {
      return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
    });

    // 3. Susun isi email (Plain Text & HTML)
    var subject = "Agenda Hari Ini - Kalender Kegiatan OSIS (" + todayIndoFull + ")";

    var textLines = [
      "AGENDA HARI INI - KALENDER KEGIATAN OSIS",
      "Tanggal: " + todayIndoFull + " (WITA)",
      "Jumlah Agenda: " + todayEvents.length + " Kegiatan",
      "==================================================",
      ""
    ];

    var htmlEventsList = "";

    for (var k = 0; k < todayEvents.length; k++) {
      var ev = todayEvents[k];
      var jamRange = (ev.jam_mulai || "-") + " - " + (ev.jam_selesai || "-") + " WITA";

      textLines.push((k + 1) + ". " + ev.judul);
      textLines.push("   - Divisi  : " + (ev.divisi || "-"));
      if (ev.proker) textLines.push("   - Proker  : " + ev.proker);
      if (ev.petugas) textLines.push("   - Petugas : " + ev.petugas);
      textLines.push("   - Waktu   : " + jamRange);
      textLines.push("   - Lokasi  : " + (ev.lokasi || "-"));
      if (ev.deskripsi) textLines.push("   - Catatan : " + ev.deskripsi);
      textLines.push("");

      htmlEventsList += `
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">${escapeHtml(ev.judul)}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; line-height: 1.6;">
            <tr>
              <td style="width: 80px; font-weight: bold; vertical-align: top;">Divisi</td>
              <td>: ${escapeHtml(ev.divisi || "-")}</td>
            </tr>
            ${ev.proker ? `<tr><td style="font-weight: bold; vertical-align: top;">Proker</td><td>: ${escapeHtml(ev.proker)}</td></tr>` : ""}
            ${ev.petugas ? `<tr><td style="font-weight: bold; vertical-align: top;">Petugas</td><td>: ${escapeHtml(ev.petugas)}</td></tr>` : ""}
            <tr>
              <td style="font-weight: bold; vertical-align: top;">Waktu</td>
              <td>: ${escapeHtml(jamRange)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top;">Lokasi</td>
              <td>: ${escapeHtml(ev.lokasi || "-")}</td>
            </tr>
            ${ev.deskripsi ? `<tr><td style="font-weight: bold; vertical-align: top;">Catatan</td><td>: <em>${escapeHtml(ev.deskripsi)}</em></td></tr>` : ""}
          </table>
        </div>
      `;
    }

    textLines.push("==================================================");
    textLines.push("Kunjungi Website: " + SITE_URL);
    textLines.push("Pesan ini dikirimkan otomatis oleh Sistem Kalender Kegiatan OSIS.");

    var plainBody = textLines.join("\n");

    var htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #10b981; padding-bottom: 14px; margin-bottom: 20px;">
          <h2 style="color: #059669; margin: 0 0 4px 0; font-size: 20px;">Kalender Kegiatan OSIS</h2>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Agenda Hari Ini &middot; ${escapeHtml(todayIndoFull)} (WITA)</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Halo, berikut adalah daftar program kerja dan kegiatan OSIS yang dijadwalkan berlangsung hari ini:
        </p>

        ${htmlEventsList}

        <div style="border-top: 1px solid #e2e8f0; margin-top: 28px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
          <p style="margin: 0 0 6px 0;"><a href="${escapeHtml(SITE_URL)}" style="color: #059669; text-decoration: underline;">Buka Website Kalender Kegiatan OSIS</a></p>
          <p style="margin: 0 0 4px 0;">Email ini dikirimkan otomatis oleh Sistem Kalender Kegiatan OSIS.</p>
          <p style="margin: 0;">Untuk berhenti berlangganan, buka website kalender di atas &rarr; klik ikon email di bilah atas &rarr; pilih <em>"Berhenti berlangganan?"</em>.</p>
        </div>
      </div>
    `;

    // 4. Kirim email ke seluruh subscribers
    var sentCount = 0;
    for (var n = 0; n < recipientEmails.length; n++) {
      try {
        MailApp.sendEmail({
          to: recipientEmails[n],
          subject: subject,
          body: plainBody,
          htmlBody: htmlBody
        });
        sentCount++;
      } catch (err) {
        console.warn("Gagal mengirim email ke " + recipientEmails[n] + ":", err);
      }
    }

    console.log("sendDailyReminderEmails selesai: " + sentCount + " dari " + recipientEmails.length + " email berhasil dikirim.");
  } catch (err) {
    console.error("Kesalahan saat menjalankan sendDailyReminderEmails:", err);
  }
}
