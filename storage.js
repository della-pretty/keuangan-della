// Modul penyimpanan data (localStorage) -- pengganti SQLite di versi web

const STORAGE_KEYS = {
  PROFILE: "keuangan_profile",
  TRANSACTIONS: "keuangan_transaksi",
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
};
