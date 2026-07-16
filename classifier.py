"""
Modul klasifikasi otomatis kategori transaksi menggunakan Naive Bayes.
Versi PURE PYTHON (tanpa scikit-learn/scipy/numpy) supaya kompatibel
di-build jadi APK Android lewat Buildozer -- library-library itu susah
di-compile buat Android dan sering bikin build gagal.

Dipakai buat prediksi kategori pengeluaran/pemasukan berdasarkan deskripsi
teks yang diketik user (contoh: "makan siang di warteg" -> Makanan).
"""

import os
import csv
import json
import math
import re
from collections import defaultdict, Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAINING_DATA_PATH = os.path.join(BASE_DIR, "training_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "category_model.json")

CATEGORIES = [
    "Makanan", "Transportasi", "Pendidikan", "Hiburan",
    "Belanja", "Kesehatan", "Pemasukan", "Lainnya",
]

WORD_RE = re.compile(r"[a-zA-Z]+")


def tokenize(text: str):
    return WORD_RE.findall(text.lower())


def load_training_data(path=TRAINING_DATA_PATH):
    texts, labels = [], []
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            texts.append(row["teks"])
            labels.append(row["kategori"])
    return texts, labels


class NaiveBayesModel:
    """Multinomial Naive Bayes sederhana pakai Laplace smoothing, murni Python."""

    def __init__(self):
        self.class_priors = {}
        self.word_counts = {}       # {class: {word: count}}
        self.class_totals = {}      # {class: total word count}
        self.vocab = set()

    def fit(self, texts, labels):
        class_doc_counts = Counter(labels)
        total_docs = len(labels)
        self.class_priors = {c: count / total_docs for c, count in class_doc_counts.items()}

        self.word_counts = defaultdict(lambda: defaultdict(int))
        self.class_totals = defaultdict(int)

        for text, label in zip(texts, labels):
            for word in tokenize(text):
                self.word_counts[label][word] += 1
                self.class_totals[label] += 1
                self.vocab.add(word)

    def predict_proba(self, text):
        words = tokenize(text)
        vocab_size = len(self.vocab) or 1
        scores = {}

        for c in self.class_priors:
            log_prob = math.log(self.class_priors[c])
            denom = self.class_totals[c] + vocab_size
            for word in words:
                count = self.word_counts[c].get(word, 0)
                log_prob += math.log((count + 1) / denom)
            scores[c] = log_prob

        # convert log-scores to normalized probabilities
        max_log = max(scores.values())
        exp_scores = {c: math.exp(s - max_log) for c, s in scores.items()}
        total = sum(exp_scores.values()) or 1
        probs = {c: v / total for c, v in exp_scores.items()}
        return dict(sorted(probs.items(), key=lambda x: -x[1]))

    def predict(self, text):
        probs = self.predict_proba(text)
        if not probs:
            return "Lainnya"
        return max(probs.items(), key=lambda x: x[1])[0]

    def to_dict(self):
        return {
            "class_priors": self.class_priors,
            "word_counts": {c: dict(w) for c, w in self.word_counts.items()},
            "class_totals": dict(self.class_totals),
            "vocab": list(self.vocab),
        }

    @classmethod
    def from_dict(cls, data):
        model = cls()
        model.class_priors = data["class_priors"]
        model.word_counts = defaultdict(lambda: defaultdict(int))
        for c, words in data["word_counts"].items():
            for w, count in words.items():
                model.word_counts[c][w] = count
        model.class_totals = defaultdict(int, data["class_totals"])
        model.vocab = set(data["vocab"])
        return model


def train_model():
    """Latih model Naive Bayes dari training_data.csv dan simpan ke disk (JSON)."""
    texts, labels = load_training_data()
    model = NaiveBayesModel()
    model.fit(texts, labels)

    with open(MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump(model.to_dict(), f)

    return model


def load_or_train_model():
    """Load model yang sudah ada, atau latih baru kalau belum ada / rusak."""
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, encoding="utf-8") as f:
                data = json.load(f)
            return NaiveBayesModel.from_dict(data)
        except Exception:
            pass
    return train_model()


class ExpenseCategorizer:
    def __init__(self):
        self.model = load_or_train_model()

    def predict(self, description: str) -> str:
        """Prediksi kategori dari deskripsi teks. Return nama kategori."""
        if not description or not description.strip():
            return "Lainnya"
        try:
            return self.model.predict(description)
        except Exception:
            return "Lainnya"

    def predict_proba(self, description: str):
        """Return dict {kategori: probabilitas} buat lihat keyakinan model."""
        try:
            return self.model.predict_proba(description)
        except Exception:
            return {}

    def retrain(self):
        self.model = train_model()


if __name__ == "__main__":
    # quick manual test
    clf = ExpenseCategorizer()
    tests = [
        "makan bakso di warung",
        "isi bensin motor pertamax",
        "bayar spp semester 5",
        "nonton di bioskop XXI",
        "gaji bulanan dari kerja part time",
        "beli obat flu di apotek",
    ]
    for t in tests:
        print(f"{t:45s} -> {clf.predict(t)}")
