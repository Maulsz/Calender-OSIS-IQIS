/**
 * ============================================================================
 * KALENDER KEGIATAN - FRONTEND LOGIC (Vanilla JavaScript)
 * ============================================================================
 * Aplikasi Kalender Kegiatan Sekolah dengan fitur CRUD lengkap.
 * Terhubung langsung ke Google Apps Script Web App (Database: Google Sheets).
 *
 * INSTRUKSI KONFIGURASI:
 * 1. Deploy Code.gs di Google Apps Script sebagai Web App.
 * 2. Salin URL Web App yang dihasilkan (format: https://script.google.com/macros/s/.../exec).
 * 3. Tempelkan URL tersebut ke variabel APPS_SCRIPT_URL di bawah ini:
 * ============================================================================
 */

// >>> TEMPELKAN WEB APP URL GOOGLE APPS SCRIPT ANDA DI SINI <<<
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyS_yRKW8heo_4D4frp5CSj8Tscvz8ugUw1ndgCcwGxFEVBE_6J2fHpK1IZFobUg4R28g/exec";
// Contoh: "https://script.google.com/macros/s/AKfycbxAbCdEfGhIjKlMnOpQrStUvWxYz/exec"

/**
 * Data awal (Seed / Mock Data)
 * Otomatis digunakan jika APPS_SCRIPT_URL masih kosong atau saat pertama kali testing,
 * agar penguji/guru/siswa dapat langsung melihat tampilan UI kalender yang interaktif.
 */
const SEED_EVENTS = [
  {
    id: "evt_demo_1",
    judul: "Rapat Koordinasi Uji Kompetensi RPL",
    deskripsi: "Pembahasan jadwal sinkronisasi server dan persiapan perangkat ujian siswa kelas XII.",
    lokasi: "Lab Komputer RPL 1",
    tanggal_mulai: "2026-09-17",
    tanggal_selesai: "2026-09-17",
    jam_mulai: "08:30",
    jam_selesai: "11:30",
    status: "confirmed"
  },
  {
    id: "evt_demo_2",
    judul: "Workshop Pengembangan Web Modern (SMK Hebat)",
    deskripsi: "Pelatihan pembuatan RESTful API dan integrasi cloud untuk siswa jurusan Rekayasa Perangkat Lunak.",
    lokasi: "Aula Graha Bhakti",
    tanggal_mulai: "2026-09-20",
    tanggal_selesai: "2026-09-21",
    jam_mulai: "09:00",
    jam_selesai: "15:00",
    status: "confirmed"
  },
  {
    id: "evt_demo_3",
    judul: "Apel Rutin & Penyerahan Piala Prestasi",
    deskripsi: "Seluruh guru dan siswa wajib mengenakan seragam pramuka lengkap.",
    lokasi: "Lapangan Upacara Utama",
    tanggal_mulai: "2026-09-25",
    tanggal_selesai: "2026-09-25",
    jam_mulai: "07:00",
    jam_selesai: "08:00",
    status: "tentative"
  }
];

// ==========================================================================
// STATE MANAGEMENT APLIKASI
// ==========================================================================
const AppState = {
  events: [],               // Daftar semua kegiatan
  selectedDate: null,       // Tanggal aktif terpilih (format: YYYY-MM-DD)
  viewYear: 2026,           // Tahun tampilan kalender
  viewMonth: 8,             // Bulan tampilan kalender (0 = Jan, 8 = Sep)
  isLoading: false,         // Status pemanggilan API
  isLiveMode: false,        // True jika menggunakan Google Apps Script aktif
  showAllUpcoming: false,   // Toggle melihat semua kegiatan mendatang
  eventToDelete: null       // Referensi kegiatan yang akan dihapus
};

// ==========================================================================
// HELPER FORMAT TANGGAL & WAKTU (BAHASA INDONESIA)
// ==========================================================================
const DateHelper = {
  BULAN_PANJANG: [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ],

  BULAN_PENDEK: [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
  ],

  HARI_PANJANG: [
    "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
  ],

  /**
   * Mengubah objek Date menjadi format string YYYY-MM-DD
   */
  toDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse string YYYY-MM-DD menjadi objek Date lokal (menghindari selisih timezone UTC)
   */
  parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  },

  /**
   * Format tanggal lengkap Bahasa Indonesia: "Kamis, 17 September 2026"
   */
  formatIndoFull(dateStr) {
    if (!dateStr) return "-";
    const date = this.parseLocalDate(dateStr);
    const dayName = this.HARI_PANJANG[date.getDay()];
    const dayNum = date.getDate();
    const monthName = this.BULAN_PANJANG[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  },

  /**
   * Format rentang tanggal: "17 Sep 2026" atau "17 - 18 Sep 2026"
   */
  formatDateRange(startStr, endStr) {
    if (!startStr) return "-";
    if (!endStr || startStr === endStr) {
      const d = this.parseLocalDate(startStr);
      return `${d.getDate()} ${this.BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
    }

    const d1 = this.parseLocalDate(startStr);
    const d2 = this.parseLocalDate(endStr);

    if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
      return `${d1.getDate()} - ${d2.getDate()} ${this.BULAN_PENDEK[d1.getMonth()]} ${d1.getFullYear()}`;
    }

    return `${d1.getDate()} ${this.BULAN_PENDEK[d1.getMonth()]} - ${d2.getDate()} ${this.BULAN_PENDEK[d2.getMonth()]} ${d2.getFullYear()}`;
  },

  /**
   * Cek apakah sebuah tanggal berada dalam rentang tanggal kegiatan
   */
  isDateInRange(dateStr, startStr, endStr) {
    return dateStr >= startStr && dateStr <= endStr;
  }
};

// ==========================================================================
// JAM REAL-TIME MAKASSAR (WITA)
// ==========================================================================
const MakassarClock = {
  intervalId: null,

  update() {
    const timeEl = document.getElementById("makassarTime");
    const dateEl = document.getElementById("makassarDate");
    if (!timeEl || !dateEl) return;

    const now = new Date();

    const timeStr = now.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const dateStr = now.toLocaleDateString("id-ID", {
      timeZone: "Asia/Makassar",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    timeEl.textContent = timeStr;
    dateEl.textContent = dateStr;
  },

  init() {
    this.update();
    this.intervalId = setInterval(() => this.update(), 1000);
  }
};

// ==========================================================================
// API CLIENT (KOMUNIKASI DENGAN GOOGLE APPS SCRIPT / LOCALSTORAGE)
// ==========================================================================
const ApiClient = {
  /**
   * Memeriksa apakah URL Apps Script telah dikonfigurasi oleh pengguna
   */
  hasConfiguredUrl() {
    return typeof APPS_SCRIPT_URL === "string" &&
      APPS_SCRIPT_URL.trim() !== "" &&
      APPS_SCRIPT_URL.includes("script.google.com");
  },

  /**
   * 1. GET: Ambil semua kegiatan
   */
  async getAllEvents() {
    if (!this.hasConfiguredUrl()) {
      // Ambil dari LocalStorage untuk mode Demo
      const cached = localStorage.getItem("kalender_kegiatan_data");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            // Normalisasi status default "confirmed" jika ada data lama yang belum memiliki field status
            return parsed.map(item => ({
              ...item,
              status: item.status || "confirmed"
            }));
          }
        } catch (e) {
          console.warn("Gagal parse cache lokal, memuat seed data:", e);
        }
      }
      localStorage.setItem("kalender_kegiatan_data", JSON.stringify(SEED_EVENTS));
      return SEED_EVENTS;
    }

    // Pemanggilan nyata ke Google Apps Script Web App
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "GET",
      mode: "cors"
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi server (${response.status} ${response.statusText})`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Gagal memuat data dari spreadsheet");
    }

    return result.data || [];
  },

  /**
   * 2. POST: Mengirim permintaan aksi CRUD (create, update, delete)
   * Catatan Penting: Menggunakan Content-Type 'text/plain;charset=utf-8'
   * agar peramban (browser) tidak memicu CORS Preflight OPTIONS request.
   */
  async postAction(action, data) {
    if (!this.hasConfiguredUrl()) {
      // Simulasi CRUD pada LocalStorage
      let events = await this.getAllEvents();

      if (action === "create") {
        const newEvent = {
          ...data,
          id: "evt_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000)
        };
        events.push(newEvent);
        localStorage.setItem("kalender_kegiatan_data", JSON.stringify(events));
        return { success: true, message: "Kegiatan berhasil ditambahkan (Mode Demo)", data: newEvent };
      }

      if (action === "update") {
        const index = events.findIndex(item => item.id === data.id);
        if (index === -1) {
          throw new Error("Kegiatan tidak ditemukan di database lokal.");
        }
        events[index] = { ...data };
        localStorage.setItem("kalender_kegiatan_data", JSON.stringify(events));
        return { success: true, message: "Kegiatan berhasil diperbarui (Mode Demo)", data: events[index] };
      }

      if (action === "delete") {
        events = events.filter(item => item.id !== data.id);
        localStorage.setItem("kalender_kegiatan_data", JSON.stringify(events));
        return { success: true, message: "Kegiatan berhasil dihapus (Mode Demo)", data: { id: data.id } };
      }
    }

    // Pemanggilan nyata ke Google Apps Script
    const payload = JSON.stringify({
      action: action,
      data: data
    });

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: payload
    });

    if (!response.ok) {
      throw new Error(`Respon server bermasalah (${response.status})`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Gagal menjalankan aksi ${action}`);
    }

    return result;
  }
};

// ==========================================================================
// TOAST NOTIFIKASI
// ==========================================================================
const Toast = {
  show(message, type = "success", duration = 3500) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, duration);
  }
};

// Helper sanitasi HTML sederhana untuk keamanan XSS
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ==========================================================================
// RENDERER KALENDER & KOMPONEN UI
// ==========================================================================
const UI = {
  /**
   * Update status badge koneksi (Live vs Demo)
   */
  updateConnectionBadge() {
    const badge = document.getElementById("connectionBadge");
    if (!badge) return;

    const isLive = ApiClient.hasConfiguredUrl();
    AppState.isLiveMode = isLive;

    if (AppState.isLoading) {
      badge.className = "badge-status status-loading";
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">Menyinkronkan...</span>`;
      return;
    }

    if (isLive) {
      badge.className = "badge-status status-live";
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">Aktif</span>`;
      badge.title = "Terhubung dengan Google Apps Script Web App";
    } else {
      badge.className = "badge-status status-demo";
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">Lokal</span>`;
      badge.title = "APPS_SCRIPT_URL belum disetel di script.js. Menggunakan penyimpanan browser.";
    }
  },

  /**
   * Render grid kalender bulanan
   */
  renderCalendar() {
    const monthYearTitle = document.getElementById("calendarMonthYear");
    const calendarDays = document.getElementById("calendarDays");
    if (!monthYearTitle || !calendarDays) return;

    const year = AppState.viewYear;
    const month = AppState.viewMonth;

    // Set judul bulan & tahun (misal: "September 2026")
    monthYearTitle.textContent = `${DateHelper.BULAN_PANJANG[month]} ${year}`;

    // Perhitungan hari dalam bulan
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu, 1 = Senin, dst
    const totalDaysCurrentMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = DateHelper.toDateString(new Date());

    let html = "";

    // 1. Hari-hari sisa dari bulan sebelumnya
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = DateHelper.toDateString(prevDate);
      html += this.buildDayCellHtml(dateStr, dayNum, true, todayStr);
    }

    // 2. Hari-hari di bulan yang sedang ditampilkan
    for (let dayNum = 1; dayNum <= totalDaysCurrentMonth; dayNum++) {
      const currDate = new Date(year, month, dayNum);
      const dateStr = DateHelper.toDateString(currDate);
      html += this.buildDayCellHtml(dateStr, dayNum, false, todayStr);
    }

    // 3. Hari-hari sisa untuk melengkapi grid 7 kolom
    const totalRendered = firstDayIndex + totalDaysCurrentMonth;
    const remainingDays = (7 - (totalRendered % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = DateHelper.toDateString(nextDate);
      html += this.buildDayCellHtml(dateStr, dayNum, true, todayStr);
    }

    calendarDays.innerHTML = html;

    // Pasang listener klik pada setiap kotak hari
    const dayCells = calendarDays.querySelectorAll(".day-cell");
    dayCells.forEach(cell => {
      cell.addEventListener("click", () => {
        const selectedDate = cell.getAttribute("data-date");
        if (selectedDate) {
          AppState.selectedDate = selectedDate;
          this.renderCalendar();
          this.renderSelectedDateAgenda();
        }
      });
    });
  },

  /**
   * Membangun string HTML untuk satu kotak hari pada kalender
   */
  buildDayCellHtml(dateStr, dayNum, isOtherMonth, todayStr) {
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === AppState.selectedDate;

    // Cari kegiatan yang berlangsung pada tanggal ini
    const dayEvents = AppState.events.filter(e =>
      DateHelper.isDateInRange(dateStr, e.tanggal_mulai, e.tanggal_selesai)
    );
    const hasEvents = dayEvents.length > 0;

    const classNames = ["day-cell"];
    if (isOtherMonth) classNames.push("other-month");
    if (isToday) classNames.push("today");
    if (isSelected) classNames.push("selected");
    if (hasEvents) classNames.push("has-events");

    // Indikator titik kegiatan (maksimal 3 titik)
    let indicatorsHtml = "";
    if (hasEvents) {
      const dotCount = Math.min(dayEvents.length, 3);
      let dots = "";
      for (let k = 0; k < dotCount; k++) {
        const ev = dayEvents[k];
        const isTentative = (ev.status || "confirmed").toLowerCase() === "tentative";
        dots += `<span class="event-dot${isTentative ? " dot-tentative" : ""}"></span>`;
      }
      indicatorsHtml = `<div class="day-indicators">${dots}</div>`;
    }

    return `
      <div class="${classNames.join(" ")}" data-date="${dateStr}" title="${hasEvents ? dayEvents.length + ' Kegiatan' : ''}">
        <span class="day-number">${dayNum}</span>
        ${indicatorsHtml}
      </div>
    `;
  },

  /**
   * Render agenda untuk tanggal yang sedang dipilih
   */
  renderSelectedDateAgenda() {
    const dateTitle = document.getElementById("selectedDateTitle");
    const countBadge = document.getElementById("selectedDateBadge");
    const container = document.getElementById("selectedDateList");
    const emptyState = document.getElementById("emptyAgendaState");

    if (!dateTitle || !container || !emptyState) return;

    const selectedDate = AppState.selectedDate;
    dateTitle.textContent = DateHelper.formatIndoFull(selectedDate);

    // Ambil kegiatan pada tanggal terpilih
    const matchingEvents = AppState.events.filter(e =>
      DateHelper.isDateInRange(selectedDate, e.tanggal_mulai, e.tanggal_selesai)
    );

    countBadge.textContent = `${matchingEvents.length} Kegiatan`;

    if (matchingEvents.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Urutkan kegiatan berdasarkan jam mulai
    matchingEvents.sort((a, b) => (a.jam_mulai || "").localeCompare(b.jam_mulai || ""));

    container.innerHTML = matchingEvents.map(event => {
      const isTentative = (event.status || "confirmed").toLowerCase() === "tentative";
      const statusBadge = isTentative
        ? `<span class="status-badge status-badge-tentative">Rencana</span>`
        : `<span class="status-badge status-badge-confirmed">Terkonfirmasi</span>`;

      return `
      <div class="event-card${isTentative ? " status-tentative" : ""}" data-id="${event.id}">
        <div class="event-card-header">
          <div style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h4 class="event-title">${escapeHtml(event.judul)}</h4>
              ${statusBadge}
            </div>
          </div>
          <div class="event-actions">
            <button class="action-btn edit-btn" data-id="${event.id}" title="Edit Kegiatan" aria-label="Edit kegiatan ${escapeHtml(event.judul)}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete-btn" data-id="${event.id}" title="Hapus Kegiatan" aria-label="Hapus kegiatan ${escapeHtml(event.judul)}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>

        ${event.deskripsi ? `<p class="event-description">${escapeHtml(event.deskripsi)}</p>` : ""}

        <div class="event-meta-grid">
          <div class="meta-item" title="Waktu Pelaksanaan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${escapeHtml(event.jam_mulai || "-")} - ${escapeHtml(event.jam_selesai || "-")} WIB</span>
          </div>

          <div class="meta-item" title="Rentang Tanggal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${DateHelper.formatDateRange(event.tanggal_mulai, event.tanggal_selesai)}</span>
          </div>

          <div class="meta-item" title="Lokasi Kegiatan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escapeHtml(event.lokasi || "Lokasi belum ditentukan")}</span>
          </div>
        </div>
      </div>
    `;
    }).join("");

    // Pasang listener pada tombol aksi Edit & Delete
    container.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        Modal.openEditModal(id);
      });
    });

    container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        Modal.openDeleteModal(id);
      });
    });
  },

  /**
   * Render daftar kegiatan mendatang (Upcoming Events)
   */
  renderUpcomingEvents() {
    const listContainer = document.getElementById("upcomingList");
    const countBadge = document.getElementById("upcomingBadge");
    const toggleBtn = document.getElementById("toggleUpcomingBtn");
    if (!listContainer || !countBadge) return;

    const todayStr = DateHelper.toDateString(new Date());

    // Ambil kegiatan yang tanggal selesainya hari ini atau setelah hari ini
    const upcomingEvents = AppState.events
      .filter(e => (e.tanggal_selesai || e.tanggal_mulai) >= todayStr)
      .sort((a, b) => {
        const dateCompare = (a.tanggal_mulai || "").localeCompare(b.tanggal_mulai || "");
        if (dateCompare !== 0) return dateCompare;
        return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
      });

    countBadge.textContent = `${upcomingEvents.length} Kegiatan`;

    if (upcomingEvents.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.875rem;">
          Tidak ada kegiatan mendatang yang dijadwalkan.
        </div>
      `;
      if (toggleBtn) toggleBtn.classList.add("hidden");
      return;
    }

    const maxDefault = 4;
    const isExpanded = AppState.showAllUpcoming;
    const displayedEvents = isExpanded ? upcomingEvents : upcomingEvents.slice(0, maxDefault);

    listContainer.innerHTML = displayedEvents.map(event => {
      const startDate = DateHelper.parseLocalDate(event.tanggal_mulai);
      const dayNum = startDate.getDate();
      const monthShort = DateHelper.BULAN_PENDEK[startDate.getMonth()];
      const isTentative = (event.status || "confirmed").toLowerCase() === "tentative";

      return `
        <div class="upcoming-item${isTentative ? " status-tentative" : ""}" data-date="${event.tanggal_mulai}" title="Klik untuk membuka tanggal kegiatan">
          <div class="upcoming-item-left">
            <div class="date-pill">
              <span class="date-pill-day">${dayNum}</span>
              <span class="date-pill-month">${monthShort}</span>
            </div>
            <div class="upcoming-item-info">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div class="upcoming-item-title">${escapeHtml(event.judul)}</div>
                ${isTentative ? `<span class="status-badge status-badge-tentative" style="padding: 0.05rem 0.4rem; font-size: 0.625rem;">Rencana</span>` : ""}
              </div>
              <div class="upcoming-item-meta">
                <span>🕒 ${escapeHtml(event.jam_mulai || "-")} WIB</span>
                <span>📍 ${escapeHtml(event.lokasi || "-")}</span>
              </div>
            </div>
          </div>
          <div style="color: var(--text-light); font-size: 1rem;">›</div>
        </div>
      `;
    }).join("");

    // Tombol toggle lihat selengkapnya
    if (toggleBtn) {
      if (upcomingEvents.length > maxDefault) {
        toggleBtn.classList.remove("hidden");
        toggleBtn.textContent = isExpanded ? "Tampilkan Lebih Sedikit" : `Lihat Lainnya (${upcomingEvents.length - maxDefault})`;
      } else {
        toggleBtn.classList.add("hidden");
      }
    }

    // Klik item kegiatan mendatang untuk langsung berpindah ke tanggal tersebut
    listContainer.querySelectorAll(".upcoming-item").forEach(item => {
      item.addEventListener("click", () => {
        const dateStr = item.getAttribute("data-date");
        if (dateStr) {
          const targetDate = DateHelper.parseLocalDate(dateStr);
          AppState.viewYear = targetDate.getFullYear();
          AppState.viewMonth = targetDate.getMonth();
          AppState.selectedDate = dateStr;
          this.renderCalendar();
          this.renderSelectedDateAgenda();
        }
      });
    });
  }
};

// ==========================================================================
// CUSTOM DROPDOWN CONTROLLER (STATUS KEGIATAN)
// ==========================================================================
const StatusDropdown = {
  wrap: null,
  trigger: null,
  optionsList: null,
  hiddenInput: null,
  isOpen: false,

  init() {
    this.wrap = document.getElementById("customStatusDropdown");
    this.trigger = document.getElementById("customStatusTrigger");
    this.optionsList = document.getElementById("customStatusOptions");
    this.hiddenInput = document.getElementById("eventStatus");

    if (!this.wrap || !this.trigger || !this.optionsList || !this.hiddenInput) return;

    // Toggle dropdown open/close on trigger click
    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Keyboard support on trigger
    this.trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        this.open();
        const firstOption = this.optionsList.querySelector(".custom-select-option");
        if (firstOption) firstOption.focus();
      }
    });

    // Option clicks & keyboard selection
    this.optionsList.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.getAttribute("data-value");
        this.setValue(val);
        this.close();
        this.trigger.focus();
      });

      opt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const val = opt.getAttribute("data-value");
          this.setValue(val);
          this.close();
          this.trigger.focus();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = opt.nextElementSibling;
          if (next) next.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = opt.previousElementSibling;
          if (prev) prev.focus();
        } else if (e.key === "Escape") {
          this.close();
          this.trigger.focus();
        }
      });
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (this.isOpen && !this.wrap.contains(e.target)) {
        this.close();
      }
    });
  },

  open() {
    this.isOpen = true;
    this.wrap.classList.add("open");
    this.optionsList.classList.remove("hidden");
    this.trigger.setAttribute("aria-expanded", "true");
    this.trigger.classList.add("active");
  },

  close() {
    this.isOpen = false;
    this.wrap.classList.remove("open");
    this.optionsList.classList.add("hidden");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.classList.remove("active");
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  setValue(val = "confirmed") {
    if (!this.hiddenInput) return;
    const cleanVal = (val === "tentative") ? "tentative" : "confirmed";
    this.hiddenInput.value = cleanVal;

    // Update selected item in options list
    if (this.optionsList) {
      this.optionsList.querySelectorAll(".custom-select-option").forEach(opt => {
        const isMatch = opt.getAttribute("data-value") === cleanVal;
        opt.classList.toggle("selected", isMatch);
        opt.setAttribute("aria-selected", isMatch ? "true" : "false");
      });
    }

    // Update trigger button UI
    if (this.trigger) {
      const valWrap = this.trigger.querySelector(".custom-select-value");
      if (valWrap) {
        if (cleanVal === "tentative") {
          valWrap.innerHTML = `<span class="status-option-badge status-badge-tentative">Rencana (Tentatif)</span>`;
        } else {
          valWrap.innerHTML = `<span class="status-option-badge status-badge-confirmed">Terkonfirmasi (Pasti)</span>`;
        }
      }
    }
  },

  getValue() {
    return this.hiddenInput ? this.hiddenInput.value : "confirmed";
  }
};

// ==========================================================================
// FLATPICKR CONTROLLER (PICKER TANGGAL & WAKTU ELEGAN)
// ==========================================================================
const FormPickers = {
  fpTanggalMulai: null,
  fpTanggalSelesai: null,
  fpJamMulai: null,
  fpJamSelesai: null,

  init() {
    if (typeof flatpickr === "undefined") {
      console.warn("Flatpickr belum termuat, menggunakan fallback input bawaan.");
      return;
    }

    // Inisialisasi locale 'id' jika tersedia
    const localeId = (flatpickr.l10ns && flatpickr.l10ns.id) ? flatpickr.l10ns.id : "default";

    // 1. Tanggal Mulai
    const inputTglMulai = document.getElementById("eventTanggalMulai");
    if (inputTglMulai) {
      this.fpTanggalMulai = flatpickr(inputTglMulai, {
        dateFormat: "Y-m-d",
        locale: localeId,
        disableMobile: "true",
        allowInput: false,
        onChange: (selectedDates, dateStr) => {
          if (!dateStr) return;
          // Sinkronisasi otomatis: Jika tanggal selesai kosong atau lebih awal dari tanggal mulai
          if (this.fpTanggalSelesai) {
            const endDateVal = document.getElementById("eventTanggalSelesai").value;
            if (!endDateVal || endDateVal < dateStr) {
              this.fpTanggalSelesai.setDate(dateStr, true);
            }
            // Update batasan minimal tanggal selesai
            this.fpTanggalSelesai.set("minDate", dateStr);
          }
        }
      });
    }

    // 2. Tanggal Selesai
    const inputTglSelesai = document.getElementById("eventTanggalSelesai");
    if (inputTglSelesai) {
      this.fpTanggalSelesai = flatpickr(inputTglSelesai, {
        dateFormat: "Y-m-d",
        locale: localeId,
        disableMobile: "true",
        allowInput: false
      });
    }

    // 3. Jam Mulai (Time-only 24 jam)
    const inputJamMulai = document.getElementById("eventJamMulai");
    if (inputJamMulai) {
      this.fpJamMulai = flatpickr(inputJamMulai, {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        disableMobile: "true",
        minuteIncrement: 5,
        allowInput: false
      });
    }

    // 4. Jam Selesai (Time-only 24 jam)
    const inputJamSelesai = document.getElementById("eventJamSelesai");
    if (inputJamSelesai) {
      this.fpJamSelesai = flatpickr(inputJamSelesai, {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        disableMobile: "true",
        minuteIncrement: 5,
        allowInput: false
      });
    }
  },

  setDateMulai(val) {
    if (this.fpTanggalMulai) {
      this.fpTanggalMulai.setDate(val, true);
    } else {
      const el = document.getElementById("eventTanggalMulai");
      if (el) el.value = val;
    }
  },

  setDateSelesai(val) {
    if (this.fpTanggalSelesai) {
      this.fpTanggalSelesai.setDate(val, true);
    } else {
      const el = document.getElementById("eventTanggalSelesai");
      if (el) el.value = val;
    }
  },

  setJamMulai(val) {
    if (this.fpJamMulai) {
      this.fpJamMulai.setDate(val, true);
    } else {
      const el = document.getElementById("eventJamMulai");
      if (el) el.value = val;
    }
  },

  setJamSelesai(val) {
    if (this.fpJamSelesai) {
      this.fpJamSelesai.setDate(val, true);
    } else {
      const el = document.getElementById("eventJamSelesai");
      if (el) el.value = val;
    }
  }
};

// ==========================================================================
// PENGATURAN MODAL FORM (TAMBAH, EDIT, HAPUS)
// ==========================================================================
const Modal = {
  /**
   * Membuka modal form dalam mode TAMBAH
   */
  openAddModal(defaultDate = null) {
    const modal = document.getElementById("eventModal");
    const form = document.getElementById("eventForm");
    const modalTitle = document.getElementById("modalTitle");
    const formAlert = document.getElementById("formAlert");
    if (!modal || !form) return;

    form.reset();
    document.getElementById("eventId").value = "";
    modalTitle.textContent = "Tambah Kegiatan Baru";
    formAlert.classList.add("hidden");

    // Reset status ke default 'confirmed' via custom dropdown
    StatusDropdown.setValue("confirmed");

    // Isi otomatis tanggal mulai & selesai dengan tanggal yang sedang dipilih
    const targetDate = defaultDate || AppState.selectedDate || DateHelper.toDateString(new Date());
    FormPickers.setDateMulai(targetDate);
    FormPickers.setDateSelesai(targetDate);

    // Set nilai default jam mulai & selesai
    FormPickers.setJamMulai("08:00");
    FormPickers.setJamSelesai("10:00");

    modal.classList.remove("hidden");
    document.getElementById("eventJudul").focus();
  },

  /**
   * Membuka modal form dalam mode EDIT
   */
  openEditModal(id) {
    const event = AppState.events.find(e => e.id === id);
    if (!event) {
      Toast.show("Data kegiatan tidak ditemukan", "error");
      return;
    }

    const modal = document.getElementById("eventModal");
    const modalTitle = document.getElementById("modalTitle");
    const formAlert = document.getElementById("formAlert");
    if (!modal) return;

    formAlert.classList.add("hidden");
    modalTitle.textContent = "Edit Kegiatan";

    document.getElementById("eventId").value = event.id;
    document.getElementById("eventJudul").value = event.judul || "";
    document.getElementById("eventDeskripsi").value = event.deskripsi || "";
    document.getElementById("eventLokasi").value = event.lokasi || "";

    // Set status custom dropdown
    StatusDropdown.setValue(event.status || "confirmed");

    // Set tanggal & jam via Flatpickr
    FormPickers.setDateMulai(event.tanggal_mulai || "");
    FormPickers.setDateSelesai(event.tanggal_selesai || "");
    FormPickers.setJamMulai(event.jam_mulai || "08:00");
    FormPickers.setJamSelesai(event.jam_selesai || "10:00");

    modal.classList.remove("hidden");
    document.getElementById("eventJudul").focus();
  },

  /**
   * Menutup modal form tambah/edit
   */
  closeModal() {
    const modal = document.getElementById("eventModal");
    if (modal) modal.classList.add("hidden");
    StatusDropdown.close();
  },

  /**
   * Membuka modal konfirmasi hapus
   */
  openDeleteModal(id) {
    const event = AppState.events.find(e => e.id === id);
    if (!event) return;

    AppState.eventToDelete = event;

    const modal = document.getElementById("deleteModal");
    const titleEl = document.getElementById("deleteTargetTitle");
    const dateEl = document.getElementById("deleteTargetDate");

    if (titleEl) titleEl.textContent = event.judul;
    if (dateEl) dateEl.textContent = `${DateHelper.formatIndoFull(event.tanggal_mulai)} (${event.jam_mulai} - ${event.jam_selesai} WIB)`;

    if (modal) modal.classList.remove("hidden");
  },

  /**
   * Menutup modal konfirmasi hapus
   */
  closeDeleteModal() {
    const modal = document.getElementById("deleteModal");
    if (modal) modal.classList.add("hidden");
    AppState.eventToDelete = null;
  }
};

// ==========================================================================
// LOGIKA BISNIS & HANDLER CRUD
// ==========================================================================
async function loadEventsData() {
  try {
    AppState.isLoading = true;
    UI.updateConnectionBadge();

    const data = await ApiClient.getAllEvents();
    AppState.events = Array.isArray(data) ? data : [];

    UI.renderCalendar();
    UI.renderSelectedDateAgenda();
    UI.renderUpcomingEvents();
  } catch (error) {
    console.error("Gagal memuat kegiatan:", error);
    Toast.show(error.message || "Gagal mengambil data kegiatan", "error");
  } finally {
    AppState.isLoading = false;
    UI.updateConnectionBadge();
  }
}

/**
 * Validasi form tambah / edit
 */
function validateEventForm(formData) {
  if (!formData.judul || formData.judul.trim() === "") {
    return "Judul kegiatan wajib diisi.";
  }

  if (!formData.lokasi || formData.lokasi.trim() === "") {
    return "Lokasi kegiatan wajib diisi.";
  }

  if (!formData.tanggal_mulai) {
    return "Tanggal mulai wajib diisi.";
  }

  if (!formData.tanggal_selesai) {
    return "Tanggal selesai wajib diisi.";
  }

  // Validasi: tanggal selesai tidak boleh sebelum tanggal mulai
  if (formData.tanggal_selesai < formData.tanggal_mulai) {
    return "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  if (!formData.jam_mulai || !formData.jam_selesai) {
    return "Jam mulai dan jam selesai wajib diisi.";
  }

  // Jika hari yang sama, jam selesai harus setelah jam mulai
  if (formData.tanggal_mulai === formData.tanggal_selesai) {
    if (formData.jam_selesai <= formData.jam_mulai) {
      return "Pada tanggal yang sama, jam selesai harus lebih besar dari jam mulai.";
    }
  }

  return null; // Validasi sukses
}

/**
 * Handle submit form tambah / edit
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("eventId").value;
  const statusEl = document.getElementById("eventStatus");
  const formData = {
    id: id || undefined,
    judul: document.getElementById("eventJudul").value.trim(),
    deskripsi: document.getElementById("eventDeskripsi").value.trim(),
    lokasi: document.getElementById("eventLokasi").value.trim(),
    status: statusEl ? statusEl.value : "confirmed",
    tanggal_mulai: document.getElementById("eventTanggalMulai").value,
    tanggal_selesai: document.getElementById("eventTanggalSelesai").value,
    jam_mulai: document.getElementById("eventJamMulai").value,
    jam_selesai: document.getElementById("eventJamSelesai").value
  };

  const formAlert = document.getElementById("formAlert");
  const formAlertText = document.getElementById("formAlertText");
  const saveBtn = document.getElementById("saveEventBtn");
  const btnSpinner = saveBtn.querySelector(".btn-spinner");
  const btnText = saveBtn.querySelector(".btn-text");

  // Jalankan validasi
  const validationError = validateEventForm(formData);
  if (validationError) {
    formAlertText.textContent = validationError;
    formAlert.classList.remove("hidden");
    return;
  }

  formAlert.classList.add("hidden");

  try {
    // Tampilkan status loading pada tombol
    saveBtn.disabled = true;
    btnSpinner.classList.remove("hidden");
    btnText.textContent = "Menyimpan...";

    const action = id ? "update" : "create";
    const result = await ApiClient.postAction(action, formData);

    Toast.show(result.message || (id ? "Kegiatan berhasil diperbarui!" : "Kegiatan berhasil ditambahkan!"), "success");
    Modal.closeModal();

    // Perbarui tanggal tampilan agar mencakup tanggal kegiatan baru
    AppState.selectedDate = formData.tanggal_mulai;
    const d = DateHelper.parseLocalDate(formData.tanggal_mulai);
    AppState.viewYear = d.getFullYear();
    AppState.viewMonth = d.getMonth();

    // Muat ulang data terbaru
    await loadEventsData();

  } catch (error) {
    console.error("Gagal menyimpan kegiatan:", error);
    formAlertText.textContent = error.message || "Terjadi kesalahan saat menyimpan kegiatan.";
    formAlert.classList.remove("hidden");
  } finally {
    saveBtn.disabled = false;
    btnSpinner.classList.add("hidden");
    btnText.textContent = "Simpan Kegiatan";
  }
}

/**
 * Handle konfirmasi hapus kegiatan
 */
async function handleConfirmDelete() {
  if (!AppState.eventToDelete) return;

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const btnSpinner = confirmBtn.querySelector(".btn-spinner");
  const btnText = confirmBtn.querySelector(".btn-text");

  try {
    confirmBtn.disabled = true;
    btnSpinner.classList.remove("hidden");
    btnText.textContent = "Menghapus...";

    const result = await ApiClient.postAction("delete", { id: AppState.eventToDelete.id });

    Toast.show(result.message || "Kegiatan berhasil dihapus", "success");
    Modal.closeDeleteModal();

    await loadEventsData();
  } catch (error) {
    console.error("Gagal menghapus kegiatan:", error);
    Toast.show(error.message || "Gagal menghapus kegiatan", "error");
  } finally {
    confirmBtn.disabled = false;
    btnSpinner.classList.add("hidden");
    btnText.textContent = "Ya, Hapus";
  }
}

// ==========================================================================
// INISIALISASI EVENT LISTENERS
// ==========================================================================
function initializeEvents() {
  // Navigasi Bulan Kalender
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    AppState.viewMonth--;
    if (AppState.viewMonth < 0) {
      AppState.viewMonth = 11;
      AppState.viewYear--;
    }
    UI.renderCalendar();
  });

  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    AppState.viewMonth++;
    if (AppState.viewMonth > 11) {
      AppState.viewMonth = 0;
      AppState.viewYear++;
    }
    UI.renderCalendar();
  });

  // Tombol pintas "Hari Ini"
  document.getElementById("todayBtn").addEventListener("click", () => {
    const now = new Date();
    AppState.viewYear = now.getFullYear();
    AppState.viewMonth = now.getMonth();
    AppState.selectedDate = DateHelper.toDateString(now);
    UI.renderCalendar();
    UI.renderSelectedDateAgenda();
  });

  // Tombol Segarkan Data
  document.getElementById("refreshBtn").addEventListener("click", async () => {
    const refreshBtn = document.getElementById("refreshBtn");
    refreshBtn.classList.add("btn-spinning");
    await loadEventsData();
    refreshBtn.classList.remove("btn-spinning");
    Toast.show("Data kegiatan berhasil disinkronkan", "info");
  });

  // Buka Modal Tambah Kegiatan (Dari Header, Agenda, Empty State, & FAB Mobile)
  document.getElementById("openAddModalBtn").addEventListener("click", () => Modal.openAddModal());
  document.getElementById("quickAddBtn").addEventListener("click", () => Modal.openAddModal());
  document.getElementById("emptyStateAddBtn").addEventListener("click", () => Modal.openAddModal());
  document.getElementById("mobileFabBtn").addEventListener("click", () => Modal.openAddModal());

  // Tutup Modal Form Tambah/Edit
  document.getElementById("closeModalBtn").addEventListener("click", () => Modal.closeModal());
  document.getElementById("cancelModalBtn").addEventListener("click", () => Modal.closeModal());

  // Tutup Modal Hapus
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => Modal.closeDeleteModal());
  document.getElementById("confirmDeleteBtn").addEventListener("click", handleConfirmDelete);

  // Klik backdrop di luar modal untuk menutup
  document.getElementById("eventModal").addEventListener("click", (e) => {
    if (e.target.id === "eventModal") Modal.closeModal();
  });
  document.getElementById("deleteModal").addEventListener("click", (e) => {
    if (e.target.id === "deleteModal") Modal.closeDeleteModal();
  });

  // Keyboard Escape untuk menutup modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      Modal.closeModal();
      Modal.closeDeleteModal();
    }
  });

  // Submit Form Tambah/Edit
  document.getElementById("eventForm").addEventListener("submit", handleFormSubmit);

  // Sinkronisasi otomatis tanggal selesai saat tanggal mulai diubah (jika tanggal selesai masih kosong/kurang)
  document.getElementById("eventTanggalMulai").addEventListener("change", (e) => {
    const startDateVal = e.target.value;
    const endDateInput = document.getElementById("eventTanggalSelesai");
    if (!endDateInput.value || endDateInput.value < startDateVal) {
      FormPickers.setDateSelesai(startDateVal);
    }
    if (FormPickers.fpTanggalSelesai) {
      FormPickers.fpTanggalSelesai.set("minDate", startDateVal);
    }
  });

  // Toggle Kegiatan Mendatang ("Lihat Lainnya")
  const toggleUpcomingBtn = document.getElementById("toggleUpcomingBtn");
  if (toggleUpcomingBtn) {
    toggleUpcomingBtn.addEventListener("click", () => {
      AppState.showAllUpcoming = !AppState.showAllUpcoming;
      UI.renderUpcomingEvents();
    });
  }
}

// ==========================================================================
// ENTRY POINT (SAAT HALAMAN SELESAI DIMUAT)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi controller custom controls
  StatusDropdown.init();
  FormPickers.init();

  // Inisialisasi tanggal terpilih ke hari ini (atau default September 2026 jika testing masa datang)
  const today = new Date();
  AppState.selectedDate = DateHelper.toDateString(today);
  AppState.viewYear = today.getFullYear();
  AppState.viewMonth = today.getMonth();

  initializeEvents();
  loadEventsData();
  MakassarClock.init();
});

