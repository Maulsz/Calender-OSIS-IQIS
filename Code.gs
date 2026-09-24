/**
 * ============================================================================
 * KALENDER KEGIATAN OSIS - BACKEND GOOGLE APPS SCRIPT DENGAN SISTEM PIN ADMIN
 * ============================================================================
 * Proyek: Kalender Kegiatan Sekolah (CRUD Web App)
 * Database: Google Sheets
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
 *       (Anda bisa menuliskan catatan deskripsi versi, misal: "v2 - Admin PIN System").
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
 * 6. BAGIAN MANA YANG TIDAK BOLEH DIUBAH?
 *    - Variabel SPREADSHEET_ID (pastikan tetap ID spreadsheet kalender Anda).
 *    - Nama SHEET_NAME ("Kegiatan").
 *    - Struktur HEADERS tabel kegiatan.
 *    - Jangan menghapus sheet atau membuat database baru.
 *
 * 7. CARA MELAKUKAN TESTING SETELAH DEPLOYMENT:
 *    - Buka website kalender di browser (Mode Tamu / Guest).
 *    - Pastikan data kegiatan dapat dibaca secara publik tanpa PIN.
 *    - Coba tombol login admin: masukkan PIN salah -> pastikan ditolak.
 *    - Masukkan PIN yang benar -> pastikan masuk ke Mode Admin.
 *    - Tambah, edit, atau hapus kegiatan -> pastikan data di spreadsheet terupdate.
 *    - Klik Logout -> pastikan kembali ke Mode Tamu dan kontrol admin terkunci.
 * ============================================================================
 */

// Konfigurasi ID Google Sheet
var SPREADSHEET_ID = "1A_zE0Of-6Y3Nilj03_Ja7luiThDGcRDMH8Zy5_b_hQU";

// Nama sheet/tab untuk menyimpan data kegiatan
var SHEET_NAME = "Kegiatan";

// Nama properti di Script Properties untuk menyimpan PIN Admin
var ADMIN_PIN_PROPERTY_NAME = "ADMIN_PIN";

// Durasi masa aktif sesi token admin (1 jam = 3600 detik)
var TOKEN_EXPIRATION_SECONDS = 3600;

// Struktur kolom tabel kegiatan
var HEADERS = [
  "id",
  "judul",
  "deskripsi",
  "lokasi",
  "tanggal_mulai",
  "tanggal_selesai",
  "jam_mulai",
  "jam_selesai",
  "status"
];

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
// HELPER DATABASE SPREADSHEET
// ============================================================================

/**
 * Fungsi pembantu untuk membuka atau membuat sheet otomatis beserta header-nya
 * jika sheet masih kosong atau baru pertama kali dijalankan.
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
    
    // Format header agar rapi dan mudah dibaca
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#10b981"); // Warna hijau emerald
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Atur lebar kolom agar proporsional
    sheet.setColumnWidth(1, 140); // id
    sheet.setColumnWidth(2, 220); // judul
    sheet.setColumnWidth(3, 260); // deskripsi
    sheet.setColumnWidth(4, 180); // lokasi
    sheet.setColumnWidth(5, 120); // tanggal_mulai
    sheet.setColumnWidth(6, 120); // tanggal_selesai
    sheet.setColumnWidth(7, 100); // jam_mulai
    sheet.setColumnWidth(8, 100); // jam_selesai
    sheet.setColumnWidth(9, 110); // status
  } else {
    // Validasi apakah baris pertama sesuai dengan HEADERS
    var existingHeaders = sheet.getRange(1, 1, 1, Math.min(lastCol, HEADERS.length)).getValues()[0];
    if (existingHeaders.length < HEADERS.length && lastCol === 8) {
      sheet.getRange(1, 9).setValue("status")
        .setFontWeight("bold")
        .setBackground("#10b981")
        .setFontColor("#ffffff")
        .setHorizontalAlignment("center");
      sheet.setColumnWidth(9, 110);
    }
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
 */
function rowToObject(row) {
  return {
    id: String(row[0] || ""),
    judul: String(row[1] || ""),
    deskripsi: String(row[2] || ""),
    lokasi: String(row[3] || ""),
    tanggal_mulai: String(row[4] || ""),
    tanggal_selesai: String(row[5] || ""),
    jam_mulai: String(row[6] || ""),
    jam_selesai: String(row[7] || ""),
    status: String(row[8] || "confirmed")
  };
}

// ============================================================================
// ENDPOINT GET (AKSES PUBLIK - TANPA PIN)
// ============================================================================
/**
 * Seluruh pengunjung (Guest) dapat membaca data kegiatan secara bebas:
 * - GET ?id=... (mengambil 1 kegiatan spesifik)
 * - GET tanpa parameter (mengambil seluruh daftar kegiatan)
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
// ENDPOINT POST (OTENTIKASI & OPERASI CRUD TERLINDUNGI)
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
    // AKSI 4: CREATE (Tambah kegiatan baru - Hanya Admin)
    // ------------------------------------------------------------------------
    if (action === "create") {
      if (!data.judul || !data.tanggal_mulai || !data.tanggal_selesai) {
        return createJsonResponse({
          success: false,
          error: "Field 'judul', 'tanggal_mulai', dan 'tanggal_selesai' wajib diisi."
        });
      }

      var newId = "evt_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);

      var newRow = [
        newId,
        data.judul || "",
        data.deskripsi || "",
        data.lokasi || "",
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
    // AKSI 5: UPDATE (Perbarui kegiatan yang ada - Hanya Admin)
    // ------------------------------------------------------------------------
    else if (action === "update") {
      var updateId = data.id ? String(data.id).trim() : "";
      if (!updateId) {
        return createJsonResponse({
          success: false,
          error: "ID kegiatan wajib disertakan untuk melakukan update."
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
    // AKSI 6: DELETE (Hapus kegiatan - Hanya Admin)
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
        error: "Aksi '" + action + "' tidak dikenali. Gunakan: 'login', 'verifySession', 'logout', 'create', 'update', atau 'delete'."
      });
    }

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || "Terjadi kesalahan pada server saat memproses aksi."
    });
  }
}
