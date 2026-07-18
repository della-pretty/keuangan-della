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
      if (!goal.deposits) goal.deposits = [];
      goal.deposits.push({ amount, date: new Date().toISOString() });
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

  // ----------------------------- AI: PREDIKSI TARGET TABUNGAN -----------------------------
  // Pakai rata-rata laju nabung (linear) buat estimasi kapan target tercapai
  getGoalPrediction(id) {
    const goal = this.getSavingsGoals().find((g) => g.id === id);
    if (!goal || !goal.deposits || goal.deposits.length === 0) return null;

    const remaining = goal.target - goal.terkumpul;
    if (remaining <= 0) return { done: true };

    const firstDepositDate = new Date(goal.deposits[0].date);
    const now = new Date();
    const daysElapsed = Math.max(1, (now - firstDepositDate) / 86400000);
    const dailyRate = goal.terkumpul / daysElapsed;
    if (dailyRate <= 0) return null;

    const daysNeeded = remaining / dailyRate;
    const estDate = new Date(now.getTime() + daysNeeded * 86400000);
    return {
      done: false,
      daysNeeded: Math.ceil(daysNeeded),
      weeksNeeded: Math.ceil(daysNeeded / 7),
      estDate,
      dailyRate,
    };
  },

  // ----------------------------- AI: REGRESI LINEAR SEDERHANA -----------------------------
  _linearRegression(values) {
    const n = values.length;
    if (n < 2) return null;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    values.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    return { slope, intercept, predict: (x) => intercept + slope * x };
  },

  // ----------------------------- AI: PREDIKSI PENGELUARAN BULAN DEPAN -----------------------------
  predictNextMonthExpense() {
    const monthly = this.getMonthlySummary(6);
    const nonZeroCount = monthly.filter((m) => m.total > 0).length;

    if (nonZeroCount === 0) {
      return { prediction: 0, confidence: "belum-ada-data", method: null, trend: "sama" };
    }
    if (nonZeroCount === 1) {
      const val = monthly.find((m) => m.total > 0).total;
      return { prediction: val, confidence: "rendah", method: "data-terbatas", trend: "sama" };
    }

    const values = monthly.map((m) => m.total);
    const reg = this._linearRegression(values);
    const predicted = Math.max(0, reg.predict(values.length));
    const trend = reg.slope > values.reduce((a, b) => a + b, 0) / values.length * 0.02
      ? "naik" : reg.slope < 0 ? "turun" : "sama";

    return {
      prediction: predicted,
      confidence: nonZeroCount >= 4 ? "tinggi" : nonZeroCount >= 2 ? "sedang" : "rendah",
      method: "regresi-linear",
      trend,
      slope: reg.slope,
    };
  },

  // ----------------------------- AI: ANALISIS POLA PENGELUARAN -----------------------------
  getExpenseInsights() {
    const summary = this.getCategorySummary();
    const total = summary.reduce((s, [, v]) => s + v, 0);
    const txList = this.getTransactions().filter((t) => t.tipe === "Pengeluaran");

    if (summary.length === 0 || txList.length === 0) return null;

    const [topCategory, topValue] = summary[0];
    const topPct = total ? (topValue / total) * 100 : 0;

    const freq = {};
    txList.forEach((t) => { freq[t.kategori] = (freq[t.kategori] || 0) + 1; });
    const freqSorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const [mostFrequentCategory, mostFrequentCount] = freqSorted[0] || [null, 0];

    const avgTransaction = txList.reduce((s, t) => s + t.nominal, 0) / txList.length;
    const weekComparison = this.getWeekComparison();

    return {
      topCategory, topPct, totalExpense: total,
      mostFrequentCategory, mostFrequentCount,
      avgTransaction, totalTransactions: txList.length,
      weekComparison,
    };
  },

  // ----------------------------- ACHIEVEMENT NABUNG -----------------------------
  ACHIEVEMENT_DEFS: [
    { id: "first_deposit", icon: "🌱", title: "Langkah Pertama", desc: "Nabung pertama kali", check: (ctx) => ctx.totalDeposits >= 1 },
    { id: "halfway", icon: "🚀", title: "Setengah Jalan", desc: "Capai 50% dari salah satu target", check: (ctx) => ctx.goals.some((g) => g.target > 0 && g.terkumpul / g.target >= 0.5) },
    { id: "goal_complete", icon: "🏆", title: "Target Tercapai", desc: "Selesaikan 1 target tabungan", check: (ctx) => ctx.goals.some((g) => g.target > 0 && g.terkumpul >= g.target) },
    { id: "consistent", icon: "📅", title: "Nabung Konsisten", desc: "Nabung di 3 minggu berbeda", check: (ctx) => ctx.distinctWeeks >= 3 },
    { id: "big_saver", icon: "💎", title: "Big Saver", desc: "Total tabungan tembus Rp1.000.000", check: (ctx) => ctx.totalSavings >= 1000000 },
    { id: "rajin_catat", icon: "📝", title: "Rajin Mencatat", desc: "Sudah mencatat 10 transaksi", check: (ctx) => ctx.totalTransactions >= 10 },
  ],

  getAchievements() {
    const goals = this.getSavingsGoals();
    const totalSavings = this.getTotalSavings();
    const totalDeposits = goals.reduce((s, g) => s + (g.deposits ? g.deposits.length : 0), 0);
    const weekSet = new Set();
    goals.forEach((g) => (g.deposits || []).forEach((d) => weekSet.add(this._getISOWeekKey(new Date(d.date)))));
    const totalTransactions = this.getTransactions().length;

    const ctx = { goals, totalSavings, totalDeposits, distinctWeeks: weekSet.size, totalTransactions };
    return this.ACHIEVEMENT_DEFS.map((def) => ({ ...def, unlocked: def.check(ctx) }));
  },

  // ----------------------------- DETEKSI ANOMALI (Z-SCORE) -----------------------------
  // Menandai transaksi yang nominalnya jauh menyimpang dari rata-rata (|Z| >= 2)
  getTransactionsWithZScore() {
    const txList = this.getTransactions().filter((t) => t.tipe === "Pengeluaran");
    if (txList.length < 4) return txList.map((t) => ({ ...t, zScore: 0, isAnomaly: false }));

    const amounts = txList.map((t) => t.nominal);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance) || 1;

    return txList.map((t) => {
      const z = (t.nominal - mean) / std;
      return { ...t, zScore: z, isAnomaly: Math.abs(z) >= 2 };
    });
  },

  detectAnomalies() {
    return this.getTransactionsWithZScore().filter((t) => t.isAnomaly)
      .sort((a, b) => b.id - a.id);
  },

  // ----------------------------- CLUSTERING (K-MEANS 1D, k=3) -----------------------------
  _kMeans1D(values, k = 3, maxIter = 50) {
    if (values.length < k) return null;
    const sorted = [...values].sort((a, b) => a - b);
    let centroids = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / k)]);
    let assignments = new Array(values.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      values.forEach((v, i) => {
        let bestC = 0, bestD = Infinity;
        centroids.forEach((c, ci) => {
          const d = Math.abs(v - c);
          if (d < bestD) { bestD = d; bestC = ci; }
        });
        if (assignments[i] !== bestC) { changed = true; assignments[i] = bestC; }
      });

      const sums = new Array(k).fill(0);
      const counts = new Array(k).fill(0);
      values.forEach((v, i) => { sums[assignments[i]] += v; counts[assignments[i]]++; });
      centroids = centroids.map((c, ci) => (counts[ci] > 0 ? sums[ci] / counts[ci] : c));
      if (!changed) break;
    }
    return { centroids, assignments };
  },

  // Kelompokin transaksi pengeluaran ke 3 cluster (Hemat/Sedang/Boros) berdasarkan nominal
  getSpendingClusters() {
    const txList = this.getTransactions().filter((t) => t.tipe === "Pengeluaran");
    if (txList.length < 3) return null;

    const amounts = txList.map((t) => t.nominal);
    const result = this._kMeans1D(amounts, 3);
    if (!result) return null;

    const order = result.centroids.map((c, i) => ({ c, i })).sort((a, b) => a.c - b.c).map((o) => o.i);
    const labels = ["Hemat", "Sedang", "Boros"];
    const clusterLabelMap = {};
    order.forEach((origIdx, rank) => { clusterLabelMap[origIdx] = labels[rank]; });

    const labeledTx = txList.map((t, i) => ({
      ...t,
      cluster: clusterLabelMap[result.assignments[i]],
    }));

    const counts = { Hemat: 0, Sedang: 0, Boros: 0 };
    labeledTx.forEach((t) => { counts[t.cluster]++; });
    const dominantProfile = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    return { labeledTx, centroids: result.centroids, counts, dominantProfile };
  },

  // ----------------------------- SKOR KESEHATAN KEUANGAN -----------------------------
  getFinancialHealthScore() {
    const { income, expense } = this.getBalance();

    let savingsScore = 20;
    if (income > 0) {
      const ratio = Math.max(0, Math.min(1, (income - expense) / income));
      savingsScore = ratio * 40;
    } else if (expense > 0) {
      savingsScore = 5;
    }

    const anomalies = this.detectAnomalies();
    const txExpenseCount = this.getTransactions().filter((t) => t.tipe === "Pengeluaran").length;
    let anomalyScore = 20;
    if (txExpenseCount > 0) {
      const anomalyRatio = anomalies.length / txExpenseCount;
      anomalyScore = Math.max(0, 1 - anomalyRatio * 3) * 20;
    }

    const goals = this.getSavingsGoals();
    let goalScore = 10;
    if (goals.length > 0) {
      const avgProgress = goals.reduce((s, g) => s + (g.target > 0 ? Math.min(1, g.terkumpul / g.target) : 0), 0) / goals.length;
      goalScore = avgProgress * 20;
    }

    const weekComp = this.getWeekComparison();
    let consistencyScore = 18;
    if (weekComp.direction === "naik" && weekComp.pct > 30) consistencyScore = 5;
    else if (weekComp.direction === "naik") consistencyScore = 12;
    else if (weekComp.direction === "turun") consistencyScore = 20;

    const total = Math.round(savingsScore + anomalyScore + goalScore + consistencyScore);
    const score = Math.max(0, Math.min(100, total));

    let label = "Perlu Perhatian";
    if (score >= 80) label = "Sangat Sehat";
    else if (score >= 60) label = "Sehat";
    else if (score >= 40) label = "Cukup";

    return {
      score, label,
      breakdown: {
        savingsScore: Math.round(savingsScore),
        anomalyScore: Math.round(anomalyScore),
        goalScore: Math.round(goalScore),
        consistencyScore: Math.round(consistencyScore),
      },
    };
  },
};
