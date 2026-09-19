/**
 * ============================================================================
 * KALENDER KEGIATAN - BACKEND GOOGLE APPS SCRIPT
 * ============================================================================
 * Proyek: Kalender Kegiatan Sekolah (CRUD Web App)
 * Database: Google Sheets
 * Backend: Google Apps Script Web App
 *
 * PANDUAN DEPLOYMENT (CARA MENJALANKAN):
 * 1. Buka Google Sheets Anda (atau buat sheet baru).
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 3. Hapus semua kode default pada file Code.gs, lalu salin (paste) seluruh kode ini.
 * 4. Pastikan variabel SPREADSHEET_ID di bawah sesuai dengan ID Spreadsheet Anda.
 * 5. Klik tombol "Save" (ikon disket) atau tekan Ctrl+S.
 * 6. Klik tombol biru "Deploy" di kanan atas > "New deployment" (Penerapan baru).
 * 7. Pada ikon gerigi (Select type), pilih "Web app".
 * 8. Isi konfigurasi:
 *    - Description: Kalender Kegiatan API v1
 *    - Execute as: Me (email akun Anda)
 *    - Who has access: Anyone (Siapa saja, TANPA login Google)
 * 9. Klik "Deploy". Google akan meminta izin akses (Authorize access):
 *    - Pilih akun Google Anda.
 *    - Klik "Advanced" (Lanjutan) > Klik "Go to ... (unsafe)".
 *    - Klik "Allow" (Izinkan).
 * 10. Salin "Web app URL" (formatnya: https://script.google.com/macros/s/.../exec).
 * 11. Tempelkan (paste) URL tersebut ke dalam file frontend 'script.js' pada konstanta APPS_SCRIPT_URL.
 * ============================================================================
 */

// Konfigurasi ID Google Sheet
var SPREADSHEET_ID = "1A_zE0Of-6Y3Nilj03_Ja7luiThDGcRDMH8Zy5_b_hQU";

// Nama sheet/tab untuk menyimpan data kegiatan
var SHEET_NAME = "Kegiatan";

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
    // Periksa apakah tab pertama masih kosong dan belum bernama "Kegiatan"
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
      // Jika sheet lama memiliki 8 kolom, tambahkan header 'status' di kolom ke-9
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

/**
 * ENDPOINT GET (Membaca data)
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

    // Mengambil data menggunakan getDisplayValues() agar format tanggal YYYY-MM-DD
    // dan jam HH:MM tetap terjaga dalam bentuk string yang tepat
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
      // Pastikan baris tidak kosong
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

/**
 * ENDPOINT POST (Operasi CRUD: create, update, delete)
 * Payload dikirim berupa JSON string melalui body permintaan (e.postData.contents).
 * Format JSON: { "action": "create" | "update" | "delete", "data": { ... } }
 */
function doPost(e) {
  try {
    var sheet = getOrCreateSheet();

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

    // 1. ACTION: CREATE (Tambah kegiatan baru)
    if (action === "create") {
      if (!data.judul || !data.tanggal_mulai || !data.tanggal_selesai) {
        return createJsonResponse({
          success: false,
          error: "Field 'judul', 'tanggal_mulai', dan 'tanggal_selesai' wajib diisi."
        });
      }

      // Generate ID unik berbasis timestamp dan acak
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

    // 2. ACTION: UPDATE (Perbarui kegiatan yang ada)
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
          // Baris fisik di sheet adalah k + 2 (karena data dimulai dari baris ke-2)
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

    // 3. ACTION: DELETE (Hapus kegiatan)
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

    // Aksi tidak dikenali
    else {
      return createJsonResponse({
        success: false,
        error: "Aksi '" + action + "' tidak dikenali. Gunakan: 'create', 'update', atau 'delete'."
      });
    }

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || "Terjadi kesalahan pada server saat memproses aksi."
    });
  }
}
