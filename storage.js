// Modul penyimpanan data (localStorage) -- pengganti SQLite di versi web

const STORAGE_KEYS = {
  PROFILE: "keuangan_profile",
  TRANSACTIONS: "keuangan_transaksi",
  SAVINGS: "keuangan_tabungan",
};

// Hash sederhana buat PIN (bukan enkripsi kelas militer, cukup buat skala aplikasi ini)
function hashPin(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

const db = {
  isRegistered() {
    return localStorage.getItem(STORAGE_KEYS.PROFILE) !== null;
  },

  saveProfile(nama, email, tanggalLahir, pin) {
    const profile = { nama, email, tanggalLahir, pinHash: hashPin(pin) };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getProfile() {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  },

  verifyPin(pin) {
    const profile = this.getProfile();
    if (!profile) return false;
    return profile.pinHash === hashPin(pin);
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SAVINGS);
    localStorage.removeItem("keuangan_last_notif_date");
    localStorage.removeItem("keuangan_seen_welcome");
  },

  getTransactions() {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  },

  addTransaction(deskripsi, kategori, tipe, nominal) {
    const list = this.getTransactions();
    const tanggal = new Date().toLocaleString("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    list.unshift({
      id: Date.now(),
      tanggal, deskripsi, kategori, tipe, nominal,
    });
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
  },

  getBalance() {
    const list = this.getTransactions();
    let income = 0, expense = 0;
    list.forEach((t) => {
      if (t.tipe === "Pemasukan") income += t.nominal;
      else expense += t.nominal;
    });
    return { income, expense, balance: income - expense };
  },

  getCategorySummary() {
    const list = this.getTransactions();
    const totals = {};
    list.forEach((t) => {
      if (t.tipe === "Pengeluaran") {
        totals[t.kategori] = (totals[t.kategori] || 0) + t.nominal;
      }
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  },

  // ----------------------------- TREN MINGGUAN -----------------------------
  // Kunci minggu format "YYYY-Www" (ISO week), buat pengelompokan
  _getISOWeekKey(dateObj) {
    const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  },

  _parseTanggal(tanggalStr) {
    // format tanggal disimpan: "DD/MM/YYYY, HH.MM" (locale id-ID) -- parse manual
    const datePart = tanggalStr.split(",")[0].trim();
    const [day, month, year] = datePart.split("/").map(Number);
    return new Date(year, month - 1, day);
  },

  // Return array 8 minggu terakhir: [{ weekKey, label, total }], urut dari lama ke baru
  getWeeklySummary(weeksCount = 8) {
    const list = this.getTransactions().filter((t) => t.tipe === "Pengeluaran");
    const weekTotals = {};

    list.forEach((t) => {
      let date;
      try { date = this._parseTanggal(t.tanggal); } catch (e) { date = new Date(); }
      const key = this._getISOWeekKey(date);
      weekTotals[key] = (weekTotals[key] || 0) + t.nominal;
    });

    // generate the last N week keys (termasuk minggu ini), biar minggu kosong tetap tampil 0
    const result = [];
    const now = new Date();
    for (let i = weeksCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = this._getISOWeekKey(d);
      result.push({ weekKey: key, label: key.split("-W")[1] ? `M${parseInt(key.split("-W")[1], 10)}` : key, total: weekTotals[key] || 0 });
    }
    return result;
  },

  // Bandingin total pengeluaran minggu ini vs minggu lalu -> { thisWeek, lastWeek, pct, direction }
  getWeekComparison() {
    const weekly = this.getWeeklySummary(2);
    const lastWeek = weekly[0] ? weekly[0].total : 0;
    const thisWeek = weekly[1] ? weekly[1].total : 0;
    let pct = 0;
    let direction = "sama";
    if (lastWeek === 0 && thisWeek > 0) {
      pct = 100;
      direction = "naik";
    } else if (lastWeek > 0) {
      pct = ((thisWeek - lastWeek) / lastWeek) * 100;
      direction = pct > 0.5 ? "naik" : pct < -0.5 ? "turun" : "sama";
    }
    return { thisWeek, lastWeek, pct: Math.abs(pct), direction };
  },

  // ----------------------------- TREN BULANAN -----------------------------
  MONTH_LABELS: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],

  getMonthlySummary(monthsCount = 6) {
    const list = this.getTransactions().filter((t) => t.tipe === "Pengeluaran");
    const monthTotals = {};

    list.forEach((t) => {
      let date;
      try { date = this._parseTanggal(t.tanggal); } catch (e) { date = new Date(); }
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthTotals[key] = (monthTotals[key] || 0) + t.nominal;
    });

    const result = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      result.push({ monthKey: key, label: this.MONTH_LABELS[d.getMonth()], total: monthTotals[key] || 0 });
    }
    return result;
  },

  getMonthComparison() {
    const monthly = this.getMonthlySummary(2);
    const lastMonth = monthly[0] ? monthly[0].total : 0;
    const thisMonth = monthly[1] ? monthly[1].total : 0;
    let pct = 0;
    let direction = "sama";
    if (lastMonth === 0 && thisMonth > 0) {
      pct = 100;
      direction = "naik";
    } else if (lastMonth > 0) {
      pct = ((thisMonth - lastMonth) / lastMonth) * 100;
      direction = pct > 0.5 ? "naik" : pct < -0.5 ? "turun" : "sama";
    }
    return { thisMonth, lastMonth, pct: Math.abs(pct), direction };
  },

  // ----------------------------- FILTER TANGGAL -----------------------------
  // startStr, endStr format "YYYY-MM-DD" (dari <input type="date">)
  getTransactionsInRange(startStr, endStr) {
    const list = this.getTransactions();
    if (!startStr && !endStr) return list;
    const start = startStr ? new Date(startStr + "T00:00:00") : null;
    const end = endStr ? new Date(endStr + "T23:59:59") : null;

    return list.filter((t) => {
      let date;
      try { date = this._parseTanggal(t.tanggal); } catch (e) { return true; }
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  },

  // ----------------------------- TABUNGAN (TARGET NABUNG) -----------------------------
  getSavingsGoals() {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVINGS);
    return raw ? JSON.parse(raw) : [];
  },

  addSavingsGoal(nama, target) {
    const goals = this.getSavingsGoals();
    goals.push({ id: Date.now(), nama, target, terkumpul: 0, createdAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(goals));
  },

  addToSavingsGoal(id, amount) {
    const goals = this.getSavingsGoals();
    const goal = goals.find((g) => g.id === id);
    if (goal) {
      goal.terkumpul += amount;
      localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(goals));
    }
  },

  deleteSavingsGoal(id) {
    const goals = this.getSavingsGoals().filter((g) => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(goals));
  },

  getTotalSavings() {
    return this.getSavingsGoals().reduce((sum, g) => sum + g.terkumpul, 0);
  },
};
