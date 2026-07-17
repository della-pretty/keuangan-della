// Modul klasifikasi otomatis kategori transaksi (Naive Bayes, murni JavaScript)

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z]+/g)) || [];
}

class NaiveBayes {
  constructor() {
    this.classPriors = {};
    this.wordCounts = {};   // {class: {word: count}}
    this.classTotals = {};  // {class: total word count}
    this.vocab = new Set();
  }

  fit(data) {
    const classDocCounts = {};
    data.forEach(({ c }) => {
      classDocCounts[c] = (classDocCounts[c] || 0) + 1;
    });
    const totalDocs = data.length;
    Object.keys(classDocCounts).forEach((c) => {
      this.classPriors[c] = classDocCounts[c] / totalDocs;
    });

    data.forEach(({ t, c }) => {
      if (!this.wordCounts[c]) this.wordCounts[c] = {};
      if (!this.classTotals[c]) this.classTotals[c] = 0;
      tokenize(t).forEach((word) => {
        this.wordCounts[c][word] = (this.wordCounts[c][word] || 0) + 1;
        this.classTotals[c] += 1;
        this.vocab.add(word);
      });
    });
  }

  predictProba(text) {
    const words = tokenize(text);
    const vocabSize = this.vocab.size || 1;
    const scores = {};

    Object.keys(this.classPriors).forEach((c) => {
      let logProb = Math.log(this.classPriors[c]);
      const denom = (this.classTotals[c] || 0) + vocabSize;
      words.forEach((word) => {
        const count = (this.wordCounts[c] && this.wordCounts[c][word]) || 0;
        logProb += Math.log((count + 1) / denom);
      });
      scores[c] = logProb;
    });

    const maxLog = Math.max(...Object.values(scores));
    const expScores = {};
    let total = 0;
    Object.keys(scores).forEach((c) => {
      expScores[c] = Math.exp(scores[c] - maxLog);
      total += expScores[c];
    });
    const probs = {};
    Object.keys(expScores).forEach((c) => {
      probs[c] = expScores[c] / (total || 1);
    });
    return Object.entries(probs).sort((a, b) => b[1] - a[1]);
  }

  predict(text) {
    if (!text || !text.trim()) return "Lainnya";
    const sorted = this.predictProba(text);
    return sorted.length ? sorted[0][0] : "Lainnya";
  }
}

const classifier = new NaiveBayes();
classifier.fit(TRAINING_DATA);
