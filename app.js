// Logika utama aplikasi & rendering UI

const APP_NAME = "Della's Finance";

const CATEGORY_COLORS = {
  Makanan: "#f28fab",
  Transportasi: "#d966a3",
  Pendidikan: "#c05aa6",
  Hiburan: "#f24d8c",
  Belanja: "#e680b3",
  Kesehatan: "#cc73bf",
  Pemasukan: "#3ba55d",
  Lainnya: "#b38a94",
};
const CATEGORY_ICONS = {
  Makanan: "🍔",
  Transportasi: "🛵",
  Pendidikan: "📚",
  Hiburan: "🎬",
  Belanja: "🛍️",
  Kesehatan: "💊",
  Pemasukan: "💰",
  Lainnya: "📦",
};
const CATEGORIES = ["Makanan", "Transportasi", "Pendidikan", "Hiburan", "Belanja", "Kesehatan", "Lainnya"];

const app = document.getElementById("app");

function formatRupiah(value) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function navigate(screen) {
  window.location.hash = screen;
  render();
}

function render() {
  const screen = window.location.hash.replace("#", "") ||
    (db.isRegistered() ? "pinlock" : "onboarding");

  if (screen === "onboarding") return renderOnboarding();
  if (screen === "welcome") return renderWelcome();
  if (screen === "pinlock") return renderPinlock();
  if (screen === "home") return renderHome();
  if (screen === "add") return renderAdd();
  if (screen === "report") return renderReport();
  if (screen === "savings") return renderSavings();
  return renderHome();
}

// ----------------------------- BRAND HEADER (logo dalam app) -----------------------------
function brandHeaderHtml() {
  return `
    <div class="brand-header">
      <div class="brand-logo">D</div>
      <div class="brand-name">${APP_NAME}</div>
    </div>
  `;
}

// ----------------------------- BOTTOM NAV -----------------------------
function bottomNavHtml(active) {
  const items = [
    { key: "home", icon: "🏠", label: "Home" },
    { key: "savings", icon: "🐷", label: "Tabungan" },
    { key: "report", icon: "📊", label: "Laporan" },
  ];
  return `
    <div class="bottom-nav">
      ${items.map((it) => `
        <button class="nav-item ${active === it.key ? "active" : ""}" data-nav="${it.key}">
          <span class="nav-icon">${it.icon}</span>
          <span class="nav-label">${it.label}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function attachBottomNav() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.getAttribute("data-nav")));
  });
}

// ----------------------------- ONBOARDING -----------------------------
function renderOnboarding() {
  app.innerHTML = `
    <div class="screen onboarding">
      <div class="onboarding-logo">D</div>
      <h1>Selamat Datang! 👋</h1>
      <p class="subtitle">Isi data diri kamu dulu ya sebelum mulai.</p>
      <form id="onboarding-form">
        <label>Nama Lengkap</label>
        <input type="text" id="ob-nama" placeholder="contoh: Aptrilia Nadiella" required />

        <label>Email</label>
        <input type="email" id="ob-email" placeholder="contoh: nama@email.com" required />

        <label>Tanggal Lahir</label>
        <input type="date" id="ob-ttl" required />

        <label>Buat PIN (4-6 digit angka)</label>
        <input type="password" id="ob-pin" inputmode="numeric" pattern="[0-9]*" placeholder="contoh: 1234" required />

        <label>Konfirmasi PIN</label>
        <input type="password" id="ob-pin-confirm" inputmode="numeric" pattern="[0-9]*" placeholder="ulangi PIN" required />

        <p class="error" id="ob-error"></p>
        <button type="submit" class="btn-primary">Simpan & Mulai</button>
      </form>
    </div>
  `;

  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = document.getElementById("ob-nama").value.trim();
    const email = document.getElementById("ob-email").value.trim();
    const ttl = document.getElementById("ob-ttl").value;
    const pin = document.getElementById("ob-pin").value.trim();
    const pinConfirm = document.getElementById("ob-pin-confirm").value.trim();
    const errorEl = document.getElementById("ob-error");

    if (!nama || !email || !ttl) {
      errorEl.textContent = "Semua data diri wajib diisi.";
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      errorEl.textContent = "PIN harus 4-6 digit angka.";
      return;
    }
    if (pin !== pinConfirm) {
      errorEl.textContent = "Konfirmasi PIN tidak cocok.";
      return;
    }

    db.saveProfile(nama, email, ttl, pin);
    navigate("welcome");
  });
}

// ----------------------------- WELCOME (ditampilkan sekali setelah registrasi) -----------------------------
const WELCOME_MESSAGES = [
  "Yuk mulai catat setiap rupiah, biar dompet kamu makin terkontrol! 💸",
  "Satu langkah kecil hari ini, dompet lebih sehat besok. Semangat! 🌸",
  "Financial goals kamu dimulai dari sini. Let's go! ✨",
];

function renderWelcome() {
  const profile = db.getProfile();
  const firstName = profile ? profile.nama.split(" ")[0] : "";
  const message = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

  app.innerHTML = `
    <div class="screen welcome">
      <div class="welcome-blob blob-1"></div>
      <div class="welcome-blob blob-2"></div>
      <div class="welcome-content">
        <div class="welcome-logo">D</div>
        <h1>Welcome to ${APP_NAME}!</h1>
        <p class="welcome-hi">Hai, ${escapeHtml(firstName)} 👋</p>
        <p class="welcome-msg">${message}</p>
        <div class="welcome-features">
          <div class="wf-item">🔮 <span>Kategorisasi otomatis pakai AI</span></div>
          <div class="wf-item">🐷 <span>Target nabung yang bisa kamu pantau</span></div>
          <div class="wf-item">📈 <span>Tren pengeluaran mingguan & bulanan</span></div>
        </div>
        <button id="btn-start" class="btn-white">Mulai Sekarang</button>
      </div>
    </div>
  `;

  document.getElementById("btn-start").addEventListener("click", () => {
    localStorage.setItem("keuangan_seen_welcome", "1");
    navigate("home");
  });
}

// ----------------------------- PIN LOCK -----------------------------
function renderPinlock() {
  const profile = db.getProfile();
  const firstName = profile ? profile.nama.split(" ")[0] : "";

  app.innerHTML = `
    <div class="screen pinlock">
      <div class="pinlock-spacer"></div>
      <div class="pinlock-logo">D</div>
      <h1>Halo, ${escapeHtml(firstName)}! 👋</h1>
      <p class="subtitle-light">Masukkan PIN buat masuk</p>
      <input type="password" id="pin-input" inputmode="numeric" pattern="[0-9]*"
             maxlength="6" class="pin-box" placeholder="••••" autofocus />
      <p class="error-light" id="pin-error"></p>
      <button id="btn-unlock" class="btn-white">Masuk</button>
      <div class="pinlock-spacer"></div>
      <button id="btn-reset" class="btn-link">Lupa PIN? (Reset Aplikasi)</button>
    </div>
  `;

  const pinInput = document.getElementById("pin-input");
  const checkPin = () => {
    if (db.verifyPin(pinInput.value.trim())) {
      navigate("home");
    } else {
      document.getElementById("pin-error").textContent = "PIN salah, coba lagi.";
      pinInput.value = "";
    }
  };
  document.getElementById("btn-unlock").addEventListener("click", checkPin);
  pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") checkPin(); });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("Semua data (profil & transaksi) akan dihapus. Yakin mau reset?")) {
      db.resetAll();
      navigate("onboarding");
    }
  });
}

// ----------------------------- NOTIFIKASI MINGGUAN -----------------------------
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function maybeShowWeeklyNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date().toDateString();
  const lastShown = localStorage.getItem("keuangan_last_notif_date");
  if (lastShown === today) return;

  const { thisWeek, lastWeek, pct, direction } = db.getWeekComparison();
  if (thisWeek === 0 && lastWeek === 0) return;

  let body;
  if (direction === "naik") {
    body = `Pengeluaran minggu ini ${formatRupiah(thisWeek)}, naik ${pct.toFixed(0)}% dari minggu lalu.`;
  } else if (direction === "turun") {
    body = `Pengeluaran minggu ini ${formatRupiah(thisWeek)}, turun ${pct.toFixed(0)}% dari minggu lalu. Mantap!`;
  } else {
    body = `Pengeluaran minggu ini ${formatRupiah(thisWeek)}, mirip kayak minggu lalu.`;
  }

  try {
    new Notification("Ringkasan Pengeluaran Mingguan", {
      body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
    });
    localStorage.setItem("keuangan_last_notif_date", today);
  } catch (e) { /* ignore */ }
}

// ----------------------------- HOME -----------------------------
let homeFilter = { start: "", end: "" };

function renderHome() {
  const { income, expense, balance } = db.getBalance();
  const weekComp = db.getWeekComparison();
  const totalSavings = db.getTotalSavings();

  requestNotificationPermission();
  maybeShowWeeklyNotification();

  const transactions = db.getTransactionsInRange(homeFilter.start, homeFilter.end);

  const listHtml = transactions.length
    ? transactions.slice(0, 50).map((t) => `
        <div class="tx-row">
          <div class="tx-icon" style="background:${(CATEGORY_COLORS[t.kategori] || "#b38a94")}22">
            ${CATEGORY_ICONS[t.kategori] || "📦"}
          </div>
          <div class="tx-info">
            <div class="tx-desc">${escapeHtml(t.deskripsi)}</div>
            <div class="tx-meta">${escapeHtml(t.kategori)} • ${t.tanggal}</div>
          </div>
          <div class="tx-amount ${t.tipe === "Pemasukan" ? "income" : "expense"}">
            ${t.tipe === "Pemasukan" ? "+" : "-"}${formatRupiah(t.nominal)}
          </div>
        </div>
      `).join("")
    : `<p class="empty-state">Gak ada transaksi di rentang ini. ${homeFilter.start || homeFilter.end ? "Coba reset filter." : "Yuk tambah dulu!"}</p>`;

  const weekBadge = (weekComp.thisWeek > 0 || weekComp.lastWeek > 0)
    ? `<div class="week-banner ${weekComp.direction}">
         ${weekComp.direction === "naik" ? "📈" : weekComp.direction === "turun" ? "📉" : "➡️"}
         Minggu ini ${weekComp.direction === "sama" ? "sama seperti" : (weekComp.direction + " " + weekComp.pct.toFixed(0) + "% dari")} minggu lalu
       </div>`
    : "";

  app.innerHTML = `
    <div class="screen home">
      ${brandHeaderHtml()}

      <div class="balance-card">
        <div class="card-blob"></div>
        <div class="balance-label">Total Saldo</div>
        <div class="balance-value">${formatRupiah(balance)}</div>
        <div class="balance-detail">Masuk ${formatRupiah(income)} &nbsp;•&nbsp; Keluar ${formatRupiah(expense)}</div>
      </div>

      <div class="mini-stats">
        <div class="mini-stat-card savings-mini" data-nav="savings">
          <span class="mini-icon">🐷</span>
          <div>
            <div class="mini-label">Total Tabungan</div>
            <div class="mini-value">${formatRupiah(totalSavings)}</div>
          </div>
        </div>
      </div>

      ${weekBadge}

      <div class="filter-row">
        <input type="date" id="filter-start" value="${homeFilter.start}" />
        <span class="filter-sep">—</span>
        <input type="date" id="filter-end" value="${homeFilter.end}" />
        <button id="btn-filter-reset" class="btn-filter-reset" title="Reset filter">✕</button>
      </div>

      <div class="tx-list">${listHtml}</div>
      ${bottomNavHtml("home")}
      <button id="fab-add" class="fab">+</button>
    </div>
  `;

  document.getElementById("fab-add").addEventListener("click", () => navigate("add"));
  document.getElementById("filter-start").addEventListener("change", (e) => {
    homeFilter.start = e.target.value;
    renderHome();
  });
  document.getElementById("filter-end").addEventListener("change", (e) => {
    homeFilter.end = e.target.value;
    renderHome();
  });
  document.getElementById("btn-filter-reset").addEventListener("click", () => {
    homeFilter = { start: "", end: "" };
    renderHome();
  });
  document.querySelector(".savings-mini").addEventListener("click", () => navigate("savings"));
  attachBottomNav();
}

// ----------------------------- ADD TRANSACTION -----------------------------
function renderAdd() {
  app.innerHTML = `
    <div class="screen add">
      <div class="add-header">
        <button id="btn-close-add" class="btn-close">✕</button>
        <h2>Tambah Transaksi</h2>
      </div>

      <label>Deskripsi</label>
      <input type="text" id="add-desc" placeholder="contoh: makan siang di warteg" />

      <label>Nominal (Rp)</label>
      <input type="number" id="add-nominal" placeholder="contoh: 25000" min="0" />

      <label>Tipe</label>
      <select id="add-tipe">
        <option value="Pengeluaran">Pengeluaran</option>
        <option value="Pemasukan">Pemasukan</option>
      </select>

      <button id="btn-predict" class="btn-predict">🔮 Prediksi Kategori (AI)</button>

      <label>Kategori</label>
      <select id="add-kategori">
        ${CATEGORIES.map((c) => `<option value="${c}">${CATEGORY_ICONS[c]} ${c}</option>`).join("")}
      </select>
      <p class="confidence" id="add-confidence"></p>

      <p class="error" id="add-error"></p>

      <div class="bottom-bar">
        <button id="btn-cancel" class="btn-secondary">Batal</button>
        <button id="btn-save" class="btn-primary">Simpan</button>
      </div>
    </div>
  `;

  document.getElementById("btn-close-add").addEventListener("click", () => navigate("home"));

  document.getElementById("btn-predict").addEventListener("click", () => {
    const desc = document.getElementById("add-desc").value.trim();
    const errorEl = document.getElementById("add-error");
    if (!desc) {
      errorEl.textContent = "Isi deskripsi dulu ya, biar bisa diprediksi kategorinya.";
      return;
    }
    errorEl.textContent = "";
    const predicted = classifier.predict(desc);
    document.getElementById("add-kategori").value = predicted;

    const proba = classifier.predictProba(desc);
    const top = proba[0];
    document.getElementById("add-confidence").textContent =
      `Prediksi AI: ${top[0]} (keyakinan ${Math.round(top[1] * 100)}%)`;
  });

  document.getElementById("btn-cancel").addEventListener("click", () => navigate("home"));

  document.getElementById("btn-save").addEventListener("click", () => {
    const desc = document.getElementById("add-desc").value.trim();
    const nominalStr = document.getElementById("add-nominal").value.trim();
    const tipe = document.getElementById("add-tipe").value;
    let kategori = document.getElementById("add-kategori").value;
    const errorEl = document.getElementById("add-error");

    if (!desc) { errorEl.textContent = "Deskripsi tidak boleh kosong."; return; }
    if (!nominalStr || Number(nominalStr) <= 0) { errorEl.textContent = "Nominal harus lebih dari 0."; return; }

    if (tipe === "Pemasukan") kategori = "Pemasukan";

    db.addTransaction(desc, kategori, tipe, Number(nominalStr));
    navigate("home");
  });
}

// ----------------------------- TABUNGAN (SAVINGS GOALS) -----------------------------
function renderSavings() {
  const goals = db.getSavingsGoals();
  const totalSavings = db.getTotalSavings();

  const goalsHtml = goals.length
    ? goals.map((g) => {
        const pct = g.target > 0 ? Math.min(100, (g.terkumpul / g.target) * 100) : 0;
        const done = pct >= 100;
        return `
          <div class="goal-card">
            <div class="goal-top">
              <div class="goal-name">${done ? "🎉" : "🐷"} ${escapeHtml(g.nama)}</div>
              <button class="goal-delete" data-goal-delete="${g.id}">🗑️</button>
            </div>
            <div class="goal-progress-track">
              <div class="goal-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="goal-numbers">
              <span>${formatRupiah(g.terkumpul)} / ${formatRupiah(g.target)}</span>
              <span class="goal-pct">${pct.toFixed(0)}%</span>
            </div>
            ${!done ? `<button class="btn-add-savings" data-goal-add="${g.id}">+ Nabung</button>` : `<div class="goal-complete-badge">Target Tercapai! 🎉</div>`}
          </div>
        `;
      }).join("")
    : `<p class="empty-state">Belum ada target tabungan. Yuk bikin dulu!</p>`;

  app.innerHTML = `
    <div class="screen savings">
      ${brandHeaderHtml()}
      <div class="savings-hero">
        <div class="card-blob"></div>
        <div class="balance-label">Total Tabungan Kamu</div>
        <div class="balance-value">${formatRupiah(totalSavings)}</div>
      </div>

      <div class="savings-list screen-flex-fill">
        <div class="savings-list-header">
          <h2>Target Tabungan</h2>
          <button id="btn-new-goal" class="btn-new-goal">+ Target Baru</button>
        </div>
        ${goalsHtml}
      </div>

      ${bottomNavHtml("savings")}
    </div>

    <div class="modal-overlay" id="goal-modal" style="display:none;">
      <div class="modal-card">
        <h3 id="modal-title">Target Tabungan Baru</h3>
        <div id="modal-new-goal-fields">
          <label>Nama Target</label>
          <input type="text" id="goal-nama" placeholder="contoh: Laptop Baru" />
          <label>Target Nominal (Rp)</label>
          <input type="number" id="goal-target" placeholder="contoh: 5000000" min="0" />
        </div>
        <div id="modal-add-money-fields" style="display:none;">
          <label>Nominal Nabung (Rp)</label>
          <input type="number" id="goal-add-amount" placeholder="contoh: 50000" min="0" />
        </div>
        <p class="error" id="modal-error"></p>
        <div class="bottom-bar">
          <button id="modal-cancel" class="btn-secondary">Batal</button>
          <button id="modal-confirm" class="btn-primary">Simpan</button>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById("goal-modal");
  let modalMode = "new";
  let activeGoalId = null;

  document.getElementById("btn-new-goal").addEventListener("click", () => {
    modalMode = "new";
    document.getElementById("modal-title").textContent = "Target Tabungan Baru";
    document.getElementById("modal-new-goal-fields").style.display = "block";
    document.getElementById("modal-add-money-fields").style.display = "none";
    document.getElementById("modal-error").textContent = "";
    modal.style.display = "flex";
  });

  document.querySelectorAll("[data-goal-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      modalMode = "add";
      activeGoalId = Number(btn.getAttribute("data-goal-add"));
      document.getElementById("modal-title").textContent = "Tambah Tabungan";
      document.getElementById("modal-new-goal-fields").style.display = "none";
      document.getElementById("modal-add-money-fields").style.display = "block";
      document.getElementById("modal-error").textContent = "";
      modal.style.display = "flex";
    });
  });

  document.querySelectorAll("[data-goal-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-goal-delete"));
      if (confirm("Hapus target tabungan ini?")) {
        db.deleteSavingsGoal(id);
        renderSavings();
      }
    });
  });

  document.getElementById("modal-cancel").addEventListener("click", () => {
    modal.style.display = "none";
  });

  document.getElementById("modal-confirm").addEventListener("click", () => {
    const errorEl = document.getElementById("modal-error");
    if (modalMode === "new") {
      const nama = document.getElementById("goal-nama").value.trim();
      const target = Number(document.getElementById("goal-target").value);
      if (!nama) { errorEl.textContent = "Nama target wajib diisi."; return; }
      if (!target || target <= 0) { errorEl.textContent = "Target nominal harus lebih dari 0."; return; }
      db.addSavingsGoal(nama, target);
    } else {
      const amount = Number(document.getElementById("goal-add-amount").value);
      if (!amount || amount <= 0) { errorEl.textContent = "Nominal harus lebih dari 0."; return; }
      db.addToSavingsGoal(activeGoalId, amount);
    }
    modal.style.display = "none";
    renderSavings();
  });

  attachBottomNav();
}

// ----------------------------- REPORT -----------------------------
function renderTrendSVG(data, valueKey, colorMain) {
  const width = 400, height = 150, padding = 28;
  const values = data.map((w) => w[valueKey]);
  const maxVal = Math.max(...values, 1);

  const points = data.map((w, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (w[valueKey] / maxVal) * (height - padding * 2);
    return { x, y, ...w };
  });

  const pathD = points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaD = pathD + ` L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`;

  const gradId = "grad" + valueKey;
  const dots = points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${colorMain}" stroke="white" stroke-width="1.5" />`).join("");
  const labels = points.map((p) => `<text x="${p.x.toFixed(1)}" y="${height - 8}" font-size="10" fill="#8c7680" text-anchor="middle">${p.label}</text>`).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="trend-svg">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colorMain}" stop-opacity="0.25" />
          <stop offset="100%" stop-color="${colorMain}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#${gradId})" />
      <path d="${pathD}" fill="none" stroke="${colorMain}" stroke-width="2.5" />
      ${dots}
      ${labels}
    </svg>
  `;
}

function exportToExcel() {
  if (typeof XLSX === "undefined") {
    alert("Fitur export butuh koneksi internet (buat load library Excel).");
    return;
  }
  const transactions = db.getTransactions();
  const rows = transactions.map((t) => ({
    Tanggal: t.tanggal,
    Deskripsi: t.deskripsi,
    Kategori: t.kategori,
    Tipe: t.tipe,
    Nominal: t.nominal,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");

  const summary = db.getCategorySummary();
  const summaryRows = summary.map(([kategori, total]) => ({ Kategori: kategori, "Total Pengeluaran": total }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Kategori");

  const filename = `Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function renderReport() {
  const summary = db.getCategorySummary();
  const total = summary.reduce((sum, [, v]) => sum + v, 0);
  const weeklyData = db.getWeeklySummary(8);
  const weekComp = db.getWeekComparison();
  const monthlyData = db.getMonthlySummary(6);
  const monthComp = db.getMonthComparison();

  const barsHtml = summary.length
    ? summary.map(([label, value]) => {
        const pct = total ? (value / total) * 100 : 0;
        const color = CATEGORY_COLORS[label] || "#b38a94";
        return `
          <div class="bar-row">
            <div class="bar-label">
              <span class="bar-swatch" style="background:${color}"></span>
              ${CATEGORY_ICONS[label] || ""} ${escapeHtml(label)}
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
            <div class="bar-value">${formatRupiah(value)} (${pct.toFixed(0)}%)</div>
          </div>
        `;
      }).join("")
    : `<p class="empty-state">Belum ada data pengeluaran.</p>`;

  const hasWeeklyData = weeklyData.some((w) => w.total > 0);
  const hasMonthlyData = monthlyData.some((m) => m.total > 0);

  app.innerHTML = `
    <div class="screen report">
      ${brandHeaderHtml()}

      <div class="screen-flex-fill">
        <div class="report-section">
          <h2>Tren Mingguan</h2>
          <div class="trend-summary ${weekComp.direction}">
            ${weekComp.direction === "naik" ? "📈" : weekComp.direction === "turun" ? "📉" : "➡️"}
            Minggu ini ${formatRupiah(weekComp.thisWeek)}
            ${weekComp.direction !== "sama" ? `(${weekComp.direction} ${weekComp.pct.toFixed(0)}%)` : "(sama)"}
          </div>
          ${hasWeeklyData ? renderTrendSVG(weeklyData, "total", "#e9598c") : `<p class="empty-state">Belum cukup data.</p>`}
        </div>

        <div class="report-section">
          <h2>Tren Bulanan</h2>
          <div class="trend-summary ${monthComp.direction}">
            ${monthComp.direction === "naik" ? "📈" : monthComp.direction === "turun" ? "📉" : "➡️"}
            Bulan ini ${formatRupiah(monthComp.thisMonth)}
            ${monthComp.direction !== "sama" ? `(${monthComp.direction} ${monthComp.pct.toFixed(0)}% dari bulan lalu)` : "(sama dengan bulan lalu)"}
          </div>
          ${hasMonthlyData ? renderTrendSVG(monthlyData, "total", "#c05aa6") : `<p class="empty-state">Belum cukup data.</p>`}
        </div>

        <div class="report-section">
          <h2>Pengeluaran per Kategori</h2>
          <div class="bar-chart">${barsHtml}</div>
        </div>

        <button id="btn-export" class="btn-export">📥 Export ke Excel</button>
      </div>

      ${bottomNavHtml("report")}
    </div>
  `;

  document.getElementById("btn-export").addEventListener("click", exportToExcel);
  attachBottomNav();
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
