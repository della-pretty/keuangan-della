// Logika utama aplikasi & rendering UI

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
const CATEGORIES = ["Makanan", "Transportasi", "Pendidikan", "Hiburan", "Belanja", "Kesehatan", "Lainnya"];

const app = document.getElementById("app");

function formatRupiah(value) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

function navigate(screen) {
  window.location.hash = screen;
  render();
}

function render() {
  const screen = window.location.hash.replace("#", "") || (db.isRegistered() ? "pinlock" : "onboarding");

  if (screen === "onboarding") return renderOnboarding();
  if (screen === "pinlock") return renderPinlock();
  if (screen === "home") return renderHome();
  if (screen === "add") return renderAdd();
  if (screen === "report") return renderReport();
  return renderHome();
}

// ----------------------------- ONBOARDING -----------------------------
function renderOnboarding() {
  app.innerHTML = `
    <div class="screen onboarding">
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
      <h1>Halo, ${firstName}! 👋</h1>
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

// ----------------------------- HOME -----------------------------
function renderHome() {
  const { income, expense, balance } = db.getBalance();
  const transactions = db.getTransactions();

  const listHtml = transactions.length
    ? transactions.slice(0, 50).map((t) => `
        <div class="tx-row">
          <div class="tx-info">
            <div class="tx-desc">${escapeHtml(t.deskripsi)}</div>
            <div class="tx-meta">${escapeHtml(t.kategori)} | ${t.tanggal}</div>
          </div>
          <div class="tx-amount ${t.tipe === "Pemasukan" ? "income" : "expense"}">
            ${t.tipe === "Pemasukan" ? "+" : "-"}${formatRupiah(t.nominal)}
          </div>
        </div>
      `).join("")
    : `<p class="empty-state">Belum ada transaksi. Yuk tambah dulu!</p>`;

  app.innerHTML = `
    <div class="screen home">
      <div class="balance-card">
        <div class="balance-label">Total Saldo</div>
        <div class="balance-value">${formatRupiah(balance)}</div>
        <div class="balance-detail">Pemasukan: ${formatRupiah(income)} &nbsp;|&nbsp; Pengeluaran: ${formatRupiah(expense)}</div>
      </div>
      <div class="tx-list">${listHtml}</div>
      <div class="bottom-bar">
        <button id="btn-add" class="btn-primary">+ Tambah Transaksi</button>
        <button id="btn-report" class="btn-secondary">Laporan</button>
      </div>
    </div>
  `;

  document.getElementById("btn-add").addEventListener("click", () => navigate("add"));
  document.getElementById("btn-report").addEventListener("click", () => navigate("report"));
}

// ----------------------------- ADD TRANSACTION -----------------------------
function renderAdd() {
  app.innerHTML = `
    <div class="screen add">
      <h2>Tambah Transaksi</h2>

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
        ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
      </select>
      <p class="confidence" id="add-confidence"></p>

      <p class="error" id="add-error"></p>

      <div class="bottom-bar">
        <button id="btn-cancel" class="btn-secondary">Batal</button>
        <button id="btn-save" class="btn-primary">Simpan</button>
      </div>
    </div>
  `;

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

// ----------------------------- REPORT -----------------------------
function renderReport() {
  const summary = db.getCategorySummary();
  const total = summary.reduce((sum, [, v]) => sum + v, 0);

  const barsHtml = summary.length
    ? summary.map(([label, value]) => {
        const pct = total ? (value / total) * 100 : 0;
        const color = CATEGORY_COLORS[label] || "#b38a94";
        return `
          <div class="bar-row">
            <div class="bar-label">
              <span class="bar-swatch" style="background:${color}"></span>
              ${escapeHtml(label)}
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
            <div class="bar-value">${formatRupiah(value)} (${pct.toFixed(0)}%)</div>
          </div>
        `;
      }).join("")
    : `<p class="empty-state">Belum ada data pengeluaran.</p>`;

  app.innerHTML = `
    <div class="screen report">
      <h2>Laporan Pengeluaran per Kategori</h2>
      <div class="bar-chart">${barsHtml}</div>
      <div class="bottom-bar">
        <button id="btn-back" class="btn-secondary">Kembali</button>
      </div>
    </div>
  `;

  document.getElementById("btn-back").addEventListener("click", () => navigate("home"));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

// Register service worker (buat fitur PWA/offline)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
