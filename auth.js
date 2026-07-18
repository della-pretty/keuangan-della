// Modul autentikasi pakai Firebase Authentication
// - Registrasi email/password + kirim email verifikasi otomatis
// - Login email/password (cek status verifikasi)
// - Reset password lewat email
// - 1 email = 1 akun (otomatis ditegakkan oleh Firebase Auth)

const authModule = {
  currentUser: null,

  init(onChangeCallback) {
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      onChangeCallback(user);
    });
  },

  async register(nama, email, tanggalLahir, password) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;

    await user.updateProfile({ displayName: nama });

    // simpan data profil tambahan (nama, TTL) ke Realtime Database
    await rtdb.ref(`users/${user.uid}/profile`).set({
      nama,
      email,
      tanggalLahir,
      createdAt: new Date().toISOString(),
    });

    await user.sendEmailVerification();
    return user;
  },

  async login(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;
    await user.reload();

    if (!user.emailVerified) {
      const err = new Error("EMAIL_NOT_VERIFIED");
      err.code = "auth/email-not-verified";
      err.user = user;
      throw err;
    }
    return user;
  },

  async resendVerification() {
    if (auth.currentUser) {
      await auth.currentUser.sendEmailVerification();
    }
  },

  async logout() {
    await auth.signOut();
  },

  async resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
  },

  translateError(error) {
    const map = {
      "auth/email-already-in-use": "Email ini sudah terdaftar. Coba login, atau reset password kalau lupa.",
      "auth/invalid-email": "Format email tidak valid.",
      "auth/weak-password": "Password terlalu lemah, minimal 6 karakter.",
      "auth/user-not-found": "Email belum terdaftar.",
      "auth/wrong-password": "Password salah.",
      "auth/invalid-credential": "Email atau password salah.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
      "auth/email-not-verified": "Email kamu belum diverifikasi. Cek inbox/spam buat link verifikasinya.",
      "auth/network-request-failed": "Gagal terhubung ke server. Cek koneksi internet kamu.",
    };
    return map[error.code] || (error.message || "Terjadi kesalahan, coba lagi.");
  },
};
