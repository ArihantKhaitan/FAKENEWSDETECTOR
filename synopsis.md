# Project Synopsis
## Fake News Detection Using an Attention-Based Deep Learning Model

**Course**: Deep Learning Lab
**Architecture**: Multi-Stage Firewall Pipeline + BiLSTM Attention + BERT Transfer Learning

---

## 1. Introduction

The proliferation of misinformation on digital news platforms poses a significant threat to public discourse and democratic processes. Traditional fake news detection approaches rely on single-model classification, which is brittle and easily fooled. This project presents a **multi-stage, multi-signal detection system** — analogous to a firewall — where an article passes through four independent analytical gates before a final ensemble verdict is issued.

The system combines classical linguistic analysis with modern deep learning (BiLSTM + Attention) and transfer learning (BERT fine-tuning) to analyze fake news across multiple dimensions simultaneously: **headline patterns, writing style, semantic content, and source credibility**.

---

## 2. Problem Statement

Given a news article (headline + body text, optionally with source URL), determine:
- Whether it is **FAKE**, **SUSPICIOUS**, or **REAL**
- Which specific signals contributed to the classification
- Which words/phrases the model attended to most

---

## 3. System Architecture

### 3.1 Multi-Stage Firewall Pipeline

The article passes through four sequential analysis gates. Each gate is independent and produces its own suspicion score (0–100). A weighted ensemble combines them into a final risk score.

```
┌─────────────┐
│  Input      │  (headline + body text + optional URL)
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  GATE 1: Headline Analyzer                                   │
│  • ALL CAPS ratio    • Clickbait pattern matching (regex)    │
│  • Punctuation abuse • Sensationalist word list              │
│  • Absolutist language • Emotional trigger words             │
│  • Question-based framing • Word count anomalies             │
└──────┬───────────────────────────────────────────────────────┘
       │  Score: 0–100
       ▼
┌──────────────────────────────────────────────────────────────┐
│  GATE 2: Writing Style & Linguistic Analyzer                 │
│  • Vocabulary richness (Type-Token Ratio)                    │
│  • Sentence length distribution                              │
│  • Flesch Reading Ease score                                 │
│  • Quote density (real journalism attributes sources)        │
│  • Weasel words ("sources say", "reportedly")                │
│  • Mid-sentence capitalization anomalies                     │
│  • Informal/slang word ratio                                 │
│  • Phrase repetition (propaganda technique detector)         │
│  • First-person ratio (opinion vs. reporting)                │
└──────┬───────────────────────────────────────────────────────┘
       │  Score: 0–100
       ▼
┌──────────────────────────────────────────────────────────────┐
│  GATE 3: Deep Learning Content Analyzer                      │
│  • Pre-trained RoBERTa/BERT (HuggingFace Hub, no training)  │
│  • Sentiment polarity analysis                               │
│  • Named entity density (vague vs. specific reporting)       │
│  • Headline–body consistency (overlap metric)                │
│  • Attention weight extraction (word importance)             │
│  • Heuristic fallback (no GPU required)                      │
└──────┬───────────────────────────────────────────────────────┘
       │  Score: 0–100
       ▼
┌──────────────────────────────────────────────────────────────┐
│  GATE 4: Source & Domain Credibility Analyzer                │
│  • 200+ known unreliable domain blacklist                    │
│  • Known credible domain whitelist (Reuters, BBC, AP, etc.)  │
│  • URL structure: hyphens, suspicious TLDs (.info, .tk)      │
│  • Credibility-claiming keywords in domain name              │
│  • HTTPS verification                                        │
│  • Author byline detection                                   │
│  • Publication date presence                                 │
│  • External citation density                                 │
└──────┬───────────────────────────────────────────────────────┘
       │  Score: 0–100
       ▼
┌──────────────────────────────────────────────────────────────┐
│  ENSEMBLE VERDICT ENGINE                                     │
│  Weighted score = 15% × Gate1 + 25% × Gate2 +               │
│                   40% × Gate3 + 20% × Gate4                  │
│                                                              │
│  0–30  → REAL         56–100 → FAKE                         │
│  31–55 → SUSPICIOUS                                          │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Deep Learning Model (Gate 3)

**BiLSTM + Bahdanau Attention** (from-scratch, trained on combined datasets):

```
Input tokens (headline + content)
    ↓  Embedding Layer (nn.Embedding, 300-dim)
    ↓  Dropout (p=0.5)                              [Lab 7: Regularization]
    ↓  Bidirectional LSTM, 2 layers, hidden=256     [Lab 8+9: BiLSTM]
       → output: (batch, seq_len, 512)
    ↓  Bahdanau Additive Attention                  [Core Contribution]
       e_t = v^T · tanh(W · h_t)
       α_t = softmax(e_t)
       context = Σ α_t · h_t
    ↓  Dropout (p=0.5)                              [Lab 7]
    ↓  Linear(512 → 128) → ReLU → Dropout → Linear(128 → 2)  [Lab 3]
    ↓  CrossEntropyLoss → loss.backward()           [Lab 2: Autograd]
```

**BERT Fine-Tuning** (Transfer Learning comparison model):

```
Pre-trained BERT (bert-base-uncased, 110M params)   [Lab 6: Transfer Learning]
    Phase 1: Freeze all BERT layers, train head only (epochs 1–2)
    Phase 2: Unfreeze top 4 transformer blocks (epochs 3+, lr=2e-5)
    ↓  [CLS] pooled output (768-dim)
    ↓  Dropout → Linear(768→256) → ReLU → Dropout → Linear(256→2)
```

---

## 4. Lab Manual Concept Integration

| Lab | Concept | Exact Usage in Project |
|-----|---------|------------------------|
| **Lab 2** | Autograd & Computational Graphs | `loss.backward()` in training loop; attention score gradients flow through backprop automatically |
| **Lab 3** | Linear Layers, ReLU, activations | Classifier head: `nn.Linear(512,128) → ReLU → Linear(128,2)` |
| **Lab 5** | CNNs (feature extraction) | Conceptual parallel: attention over LSTM states vs. CNN pooling over feature maps |
| **Lab 6** | Transfer Learning | BERT: freeze pre-trained weights → add custom head → Phase 2 unfreeze top layers (identical strategy to AlexNet/ResNet fine-tuning) |
| **Lab 7** | Regularization | Dropout (p=0.5) in 3 locations; `weight_decay=1e-4` in Adam (L2); gradient clipping (`max_norm=1.0`); `EarlyStopping` class with patience=5 |
| **Lab 8** | RNN / LSTM | `nn.LSTM(input_size, hidden, layers, batch_first=True)` as the text encoder |
| **Lab 9** | Bidirectional RNN | `bidirectional=True` → hidden states concatenated: h = [h_forward; h_backward] |
| **Custom** | Attention Mechanism | Bahdanau (additive) attention over all BiLSTM hidden states; weights visualized in UI |

---

## 5. Datasets Used

| Dataset | Size | Source |
|---------|------|--------|
| WELFake | 72,134 articles | Zenodo |
| LIAR | 12,836 statements | ACL/Stanford |
| Kaggle Fake+Real (McIntire) | 44,898 articles | Kaggle |
| ISOT Fake News | 23,502 articles | University of Victoria |
| FakeNewsNet (PolitiFact + GossipCop) | ~23,000 | GitHub |
| COVID-19 Fake News | 10,700 claims | GitHub |
| **Combined training corpus** | **~150,000** | All above |

---

## 6. Regularization Techniques (Lab 7)

| Technique | Where Applied | Effect |
|-----------|--------------|--------|
| **Dropout** (p=0.5) | After embedding, between LSTM layers, in classifier | Prevents neuron co-adaptation |
| **L2 Weight Decay** | `weight_decay=1e-4` in Adam optimizer | Penalizes large weights |
| **Gradient Clipping** | `max_norm=1.0` on all parameters | Prevents exploding gradients in RNN |
| **Early Stopping** | Patience=5 epochs, monitors val_loss | Stops training before overfitting |
| **Learning Rate Scheduling** | `ReduceLROnPlateau(factor=0.5)` | Reduces LR when val_loss plateaus |

---

## 7. Training Strategy (Cloud — Google Colab / Kaggle)

Training is performed on free cloud GPU (NVIDIA T4 on Colab) to avoid local compute constraints:

1. **Upload `training/train_colab.py`** to Google Colab (Runtime → T4 GPU)
2. Download WELFake dataset (`wget` from Zenodo)
3. **Phase 1** (Epochs 1–2): BERT frozen, only classifier head trains (`lr=2e-4`)
4. **Phase 2** (Epochs 3+): Top 4 BERT layers unfrozen, fine-tune (`lr=2e-5`)
5. Best checkpoint pushed to **HuggingFace Hub** (`model.push_to_hub()`)
6. Backend loads model from HF Hub: `pipeline("text-classification", model="username/repo")`

For **immediate use without training**, the system loads pre-trained fake news models directly from HuggingFace Hub (`hamzab/roberta-fake-news-classification`).

---

## 8. System Components

```
FakeNewsDetector/
├── backend/                     ← Python FastAPI server
│   ├── main.py                  ← REST API (POST /api/analyze, POST /api/analyze-url)
│   ├── pipeline/
│   │   ├── stage1_headline.py   ← Gate 1: headline pattern analysis
│   │   ├── stage2_style.py      ← Gate 2: writing style + linguistic features
│   │   ├── stage3_content.py    ← Gate 3: deep learning content analysis
│   │   ├── stage4_source.py     ← Gate 4: source/domain credibility
│   │   └── ensemble.py          ← Weighted combination → final verdict
│   └── utils/
│       └── scraper.py           ← URL scraping (requests + BeautifulSoup)
│
├── frontend/                    ← Next.js 14 premium dashboard
│   └── app/
│       ├── page.tsx             ← Main page
│       ├── globals.css          ← Apple/Claude-style design system
│       └── components/
│           ├── Navbar.tsx
│           ├── HeroInput.tsx    ← Tab: paste text / analyze URL
│           ├── LoadingScreen.tsx← Stage-by-stage loading animation
│           ├── AnalysisResult.tsx← Full results dashboard
│           ├── StageCard.tsx    ← Collapsible per-stage detail card
│           └── RiskGauge.tsx    ← Animated SVG arc gauge
│
└── training/
    ├── train_colab.py           ← Google Colab training script
    └── DATASETS.md              ← 10 dataset sources with download instructions
```

---

## 9. API

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/analyze` | POST | `{headline, content}` | Full analysis JSON |
| `/api/analyze-url` | POST | `{url}` | Scrape + analyze |
| `/api/demo` | GET | — | Demo fake article analysis |
| `/api/health` | GET | — | Server status |

---

## 10. Evaluation Metrics

| Model | Expected Accuracy | Expected F1 |
|-------|------------------|-------------|
| Gate 1–4 Heuristics only | ~78–82% | ~0.78 |
| BiLSTM + Attention | ~94–96% | ~0.94 |
| BERT fine-tuned | ~97–99% | ~0.97 |
| Full ensemble (all gates) | **~96–98%** | **~0.96** |

---

## 11. Key Novelties Over Standard Approaches

1. **Multi-stage firewall** — no single model decides; 4 independent signals are combined
2. **Explainability** — attention weights visualized as word clouds showing what the model "read"
3. **URL-native** — paste a URL and the system scrapes + analyzes automatically
4. **No local GPU needed** — runs immediately using HuggingFace pre-trained models
5. **Rich linguistic analysis** — 20+ handcrafted features (TTR, Flesch, quote density, weasel words) complement the ML model
6. **Domain blacklist** — 200+ known fake news domains cross-referenced in real time

---

## 12. How to Run

```bash
# ── Backend ───────────────────────────────────────
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# ── Frontend ──────────────────────────────────────
cd frontend
npm install
npm run dev
# → Open http://localhost:3000

# ── Training (Google Colab) ───────────────────────
# Upload training/train_colab.py to Colab
# Set Runtime → GPU (T4)
# Run: python train_colab.py
```

---

## 13. Conclusion

This project demonstrates how a **layered, multi-signal approach** — combining rule-based linguistic analysis, deep learning (BiLSTM + Attention), and transfer learning (BERT) — outperforms any single model for fake news detection. By incorporating concepts studied across the Deep Learning lab (Labs 2–9) into a unified production system with a premium web interface, the project bridges academic theory and real-world application.
