# TruthLens — AI Fake News Detector

> Multi-stage firewall pipeline that runs every article through 5 independent AI gates — including real-world corroboration via Google News — and compares results across 4 different transformer models simultaneously.

**Live demo:** `http://localhost:3000` · **API:** `http://localhost:8000/docs` · **GitHub:** [ArihantKhaitan/FAKENEWSDETECTOR](https://github.com/ArihantKhaitan/FAKENEWSDETECTOR)

---

## What it does

Paste a headline, full article text, or any news URL. TruthLens runs it through five independent analysis gates in parallel:

| Gate | What it analyzes | Key checks |
|------|-----------------|------------|
| **1 — Headline** | Title text only | ALL-CAPS ratio, 40+ clickbait patterns, punctuation abuse, absolutist language, emotional triggers, word count anomaly |
| **2 — Writing Style** | Body linguistics | Vocabulary richness (TTR), Flesch readability, sentence variance, quote density, weasel words, phrase repetition, first-person ratio |
| **3 — Content AI** | Deep semantics | 4 transformer models run simultaneously, sentiment polarity, named entity density, headline-body consistency, attention word extraction |
| **4 — Source** | Domain/URL | 200+ blacklisted domains, 50+ whitelisted outlets, TLD trust scoring, HTTPS, subdomain abuse, author byline, publication date |
| **5 — Corroboration** | Real-world coverage | Google News RSS search — counts trusted outlets (Reuters, BBC, AP, The Hindu, etc.) independently covering the story |

**Ensemble:** `12% × Gate1 + 20% × Gate2 + 28% × Gate3* + 20% × Gate4 + 20% × Gate5` → **REAL / SUSPICIOUS / FAKE**
*Gate 3 weight dynamically scaled by ML model consensus (0.65–1.0×). All weights normalised to sum to 1.0.

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **First startup:** models load automatically in the background (~30s). The frontend shows a "models loading" banner and disables the Analyze button until ready.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze headline + article text |
| `/api/analyze-url` | POST | Scrape a URL and analyze |
| `/api/demo` | GET | Run a demo fake article |
| `/api/health` | GET | Health check |
| `/api/status` | GET | Model loading status |
| `/docs` | GET | Interactive Swagger UI |

### 2. Frontend

```bash
cd frontend
npm install
npx next dev -p 3000
```

Open **http://localhost:3000**

---

## Training Results (Actual — Kaggle T4 GPU)

Trained on **14 March 2026**, Kaggle T4 GPU · Total wall time: **~3h 10min** (BiLSTM ~40min + DistilBERT Phase 1 ~39min + Phase 2 ~2h 29min)

### Dataset loading

| Dataset | Loaded | Examples |
|---------|--------|----------|
| `davanstrien/WELFake` | ✓ | 72,134 |
| `GonzaloA/fake_news` | ✓ | +24,350 |
| `ucsbnlp/liar` | ✗ failed (dataset scripts deprecated) | 0 |
| `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` | ✓ | +29,861 |
| **Total** | | **126,345** |

- Real (label 0): **61,525** · Fake (label 1): **64,820** (balanced)
- Split → Train: **102,339** / Val: **11,371** / Test: **12,635**

### Model A — BiLSTM + Bahdanau Attention

Vocab size: **30,000** words · Sequence length: 256 · hidden_dim: 256 · 2 layers · Dropout: 0.3

| Epoch | Loss | Train Acc | Val Acc |
|-------|------|-----------|---------|
| 1 | 0.6100 | 0.641 | 0.709 |
| 2 | 0.5347 | 0.712 | 0.730 |
| 3 | 0.5034 | 0.735 | 0.741 |
| 4 | 0.4809 | 0.746 | 0.744 |
| 5 | 0.4667 | 0.755 | 0.746 |
| 6 | 0.4628 | 0.757 | 0.746 |
| 7 | 0.4623 | 0.758 | 0.746 |
| 8 | 0.4652 | 0.756 | 0.745 |
| 9 | 0.4647 | 0.756 | 0.749 |
| 10 | 0.4625 | 0.758 | **0.752** |

**Best Val Accuracy: 0.752 · Test Accuracy: 0.755**

### Model B — DistilBERT Transfer Learning (Lab 6)

Base model: `distilbert-base-uncased` · 102k training examples

**Phase 1** — Freeze backbone, train classification head only (lr=5e-4, 2 epochs, 3200 steps):

| Epoch | Train Loss | Val Loss | Accuracy | F1 |
|-------|-----------|----------|----------|----|
| 1 | 1.2446 | 1.2263 | 0.642 | 0.642 |
| 2 | 1.2131 | 1.1959 | **0.655** | **0.655** |

**Phase 2** — Unfreeze top 2 transformer layers, fine-tune (lr=2e-5, 5 epochs, 15,995 steps, ~2h 29min):

| Epoch | Train Loss | Val Loss | Accuracy | F1 |
|-------|-----------|----------|----------|----|
| 1 | 0.8368 | 0.8266 | 0.7903 | 0.7904 |
| 2 | 0.7753 | 0.7972 | 0.7966 | 0.7966 |
| 3 | 0.7672 | 0.8039 | **0.7987** | **0.7987** |
| 4 | 0.7402 | 0.7967 | 0.7974 | 0.7975 |
| 5 | 0.7252 | 0.8087 | 0.7977 | 0.7977 |

**Final Test Accuracy: 0.804 · Test F1: 0.804**

---

## Training — Step by Step

### Step 1: Open Kaggle

Go to [kaggle.com/code](https://www.kaggle.com/code) → **New Notebook**

In **Settings → Accelerator** → select **GPU T4 x2** (free, 30 hours/week)

### Step 2: Install dependencies

```python
!pip install transformers datasets accelerate scikit-learn huggingface_hub torch -q
```

### Step 3: Log into HuggingFace

Get your token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (Write access)

```python
from huggingface_hub import login
login("hf_YOUR_TOKEN_HERE")
```

### Step 4: Upload and run training script

Upload `training/train_kaggle.py` and run it. The script automatically:

1. **Loads 3 datasets from HuggingFace Hub** (126,345 total examples — LIAR skipped, deprecated):
   - `davanstrien/WELFake` — 72,134 news articles (Wikipedia + Reuters + BuzzFeed + PolitiFact)
   - `GonzaloA/fake_news` — 24,350 mixed fake/real articles
   - `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` — 29,861 articles

2. **Trains BiLSTM + Bahdanau Attention from scratch** (covers Labs 8, 9, Custom, 3, 7, 2):
   - Word vocabulary: 30,000 words built from training corpus
   - 2-layer BiLSTM encoder, hidden_dim=256, bidirectional → 512-dim context
   - Bahdanau additive attention mechanism
   - Dropout(0.3) + weight_decay=0.01 + gradient clipping + EarlyStopping
   - **Achieved: Val 0.752 / Test 0.755** in 10 epochs

3. **Fine-tunes DistilBERT** with 2-phase Transfer Learning (covers Lab 6):
   - Phase 1 (2 epochs): Freeze all 6 transformer layers, train only classification head — **65.5% accuracy**
   - Phase 2 (5 epochs): Unfreeze top 2 transformer layers, fine-tune at lr=2e-5

4. **Pushes trained model to HuggingFace Hub** as `Arihant2409/truthlens-fake-news-detector`

5. **Runs inference test** on 4 sample articles to verify

### Step 5: Backend auto-loads your model

After training completes, restart the backend. Stage 3 tries models in this order:

```
1. Arihant2409/truthlens-fake-news-detector  ← your custom trained model
2. vikram71198/distilroberta-base-finetuned-fake-news-detection
3. hamzab/roberta-fake-news-classification
4. jy46604790/Fake-News-Bert-Detect
5. mrm8488/bert-tiny-finetuned-fake-news-detection  ← fallback
```

First successfully loaded model is used as primary. All 4 that load are shown in the **Model Comparison** panel.

---

## Models Used

### Pre-trained models (load instantly, no training needed)

| Model | Architecture | Trained on | Downloads |
|-------|-------------|-----------|-----------|
| `hamzab/roberta-fake-news-classification` | RoBERTa | WELFake 72k | ~500/month |
| `vikram71198/distilroberta-base-finetuned-fake-news-detection` | DistilRoBERTa | Fake news dataset | Active |
| `jy46604790/Fake-News-Bert-Detect` | BERT-base | Large training set | Active |
| `mrm8488/bert-tiny-finetuned-fake-news-detection` | BERT-tiny | Fake news dataset | 3,248/month |

### Custom trained model (after running train_kaggle.py)

| Model | Architecture | Trained on | Phase 1 Acc | Expected Final |
|-------|-------------|-----------|-------------|----------------|
| `Arihant2409/truthlens-fake-news-detector` | DistilBERT fine-tuned | WELFake + GonzaloA + ErfanMoosavi (126k) | Phase 1: 65.5% → Phase 2: **80.4%** | 80.4% |

---

## Datasets

| Dataset | Actual Size | Content | Source |
|---------|-------------|---------|--------|
| WELFake | **72,134** | News articles from Wikipedia, Reuters, BuzzFeed, PolitiFact | `davanstrien/WELFake` |
| GonzaloA/fake_news | **24,350** | Mixed news articles (train split) | `GonzaloA/fake_news` |
| ErfanMoosaviMonazzah | **29,861** | English news (all splits combined) | `ErfanMoosaviMonazzah/...` |
| LIAR | 0 (failed) | Dataset scripts deprecated on HuggingFace | `ucsbnlp/liar` |
| **Total training corpus** | **126,345** | Real: 61,525 · Fake: 64,820 | |

See `training/DATASETS.md` for additional datasets (ISOT, FakeNewsNet, COVID-19, etc.)

---

## Deep Learning Concepts (Lab Manual)

| Lab | Concept | Exact use in this project |
|-----|---------|--------------------------|
| Lab 2 | Autograd & backpropagation | `loss.backward()` in BiLSTM training loop; gradients flow through attention weights automatically |
| Lab 3 | Linear layers, ReLU | Classifier head: `Linear(512→256) → ReLU → Dropout → Linear(256→2)` |
| Lab 6 | Transfer Learning | DistilBERT: Phase 1 freeze all → train head (65.5%); Phase 2 unfreeze top 2 layers → fine-tune |
| Lab 7 | Regularization | Dropout(0.3) in 3 locations, weight_decay=0.01, gradient clipping (max_norm=1.0), EarlyStopping patience=5, CosineAnnealingLR |
| Lab 8 | LSTM | `nn.LSTM(embed_dim, hidden=256, num_layers=2, batch_first=True)` as sequence encoder |
| Lab 9 | Bidirectional RNN | `bidirectional=True` → forward + backward hidden states concatenated: dim = 512 |
| Custom | Bahdanau Attention | `e_t = v^T·tanh(W·h_t)`, `α = softmax(e)`, `context = Σ αt·ht` — weights visualized as word cloud in UI |

---

## Project Structure

```
FakeNewsDetector/
├── backend/
│   ├── main.py                    FastAPI app, CORS, startup preload, 5 endpoints
│   ├── requirements.txt
│   ├── pipeline/
│   │   ├── stage1_headline.py     Gate 1: 8 headline checks (regex + wordlists)
│   │   ├── stage2_style.py        Gate 2: 10+ linguistic features (TTR, Flesch, etc.)
│   │   ├── stage3_content.py      Gate 3: 4 transformer models + comparison panel data
│   │   ├── stage4_source.py       Gate 4: 200+ domains, TLD, HTTPS, URL structure
│   │   ├── stage5_corroboration.py Gate 5: Google News RSS — trusted outlet coverage check
│   │   └── ensemble.py            Weighted 12/20/28*/20/20 with dynamic consensus adjustment
│   └── utils/
│       └── scraper.py             URL scraper (requests + BeautifulSoup, JSON-LD, OpenGraph)
│
├── frontend/
│   ├── package.json               Next.js 16, React 19, TypeScript
│   ├── next.config.js             Proxies /api/* → localhost:8000
│   ├── tailwind.config.js
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx               Home page (animated mesh, floating cards, interactive pipeline)
│       ├── globals.css            Liquid glass design system (orbs, shimmer, gradient border)
│       ├── how-it-works/
│       │   └── page.tsx           Dedicated "How it works" page
│       └── components/
│           ├── Navbar.tsx         Frosted glass navbar with working links
│           ├── HeroInput.tsx      Text / URL tab input card + model loading banner
│           ├── LoadingScreen.tsx  Stage-by-stage animated loading
│           ├── AnalysisResult.tsx Full dashboard with model comparison panel
│           ├── StageCard.tsx      Collapsible per-gate detail card
│           ├── RiskGauge.tsx      Animated SVG arc gauge (eased counter)
│           └── FloatingCards.tsx  6 glass cards that drift + bounce around viewport
│
└── training/
    ├── train_kaggle.py            Full Kaggle training (BiLSTM + DistilBERT, 3 datasets, HF push)
    ├── train_colab.py             Google Colab alternative training script
    └── DATASETS.md                10 dataset sources with download links
```

---

## UI Features

- **Liquid glass design** — `backdrop-filter: blur(40px) saturate(200%)`, inset highlights, gradient border specular ring
- **Animated mesh background** — 4 CSS orbs (blue/purple/green/orange) with keyframe float animations
- **Floating bouncing cards** — 6 glass info cards drift around the viewport and reflect off edges
- **Interactive pipeline pills** — hover over Headline/Style/Content AI/Source to see tooltip with gate details
- **Model loading banner** — amber banner + disabled button while models warm up; auto-enables when ready
- **Animated SVG risk gauge** — arc with eased counter animation, glow filter, end-cap dot
- **Model comparison panel** — all loaded models shown with confidence bars and consensus badge
- **Attention word cloud** — words sized/colored by attention weight
- **How It Works page** — full architecture explanation with gate breakdowns, ensemble weights, tech stack

---

## Technologies

| Layer | Stack |
|-------|-------|
| Backend | Python 3.10+, FastAPI, uvicorn, Pydantic v2 |
| Deep Learning | PyTorch, HuggingFace Transformers, Datasets |
| Scraping | requests, BeautifulSoup4 |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS + custom liquid glass CSS |
| Training | Kaggle (T4 GPU, free, ~1h 40min) |
| Model hosting | HuggingFace Hub |

---

*Deep Learning Lab Project · BiLSTM + Bahdanau Attention + DistilBERT Transfer Learning*
