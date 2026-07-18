// Konfigurasi & inisialisasi Firebase
// Pakai Firebase SDK versi "compat" biar bisa langsung dipakai lewat <script> tag
// tanpa perlu bundler (Webpack/Vite dll).

const firebaseConfig = {
  apiKey: "AIzaSyCbmKzSDxsOYCp2HXa-Z3KFWbi3-v7Bkig",
  authDomain: "keuangan-della.firebaseapp.com",
  databaseURL: "https://keuangan-della-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "keuangan-della",
  storageBucket: "keuangan-della.firebasestorage.app",
  messagingSenderId: "694748059513",
  appId: "1:694748059513:web:af96a436e927fb9023c1a8",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const rtdb = firebase.database();
