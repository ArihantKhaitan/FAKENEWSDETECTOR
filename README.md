# TruthLens — AI Fake News Detector

> Multi-stage firewall pipeline that runs every article through 4 independent AI gates and compares results across 4 different transformer models simultaneously.

**Live demo:** `http://localhost:3000` · **API:** `http://localhost:8000/docs` · **GitHub:** [ArihantKhaitan/FAKENEWSDETECTOR](https://github.com/ArihantKhaitan/FAKENEWSDETECTOR)

---

## What it does

Paste a headline, full article text, or any news URL. TruthLens runs it through four independent analysis gates in parallel:

| Gate | What it analyzes | Key checks |
|------|-----------------|------------|
| **1 — Headline** | Title text only | ALL-CAPS ratio, 40+ clickbait patterns, punctuation abuse, absolutist language, emotional triggers, word count anomaly |
| **2 — Writing Style** | Body linguistics | Vocabulary richness (TTR), Flesch readability, sentence variance, quote density, weasel words, phrase repetition, first-person ratio |
| **3 — Content AI** | Deep semantics | 4 transformer models run simultaneously, sentiment polarity, named entity density, headline-body consistency, attention word extraction |
| **4 — Source** | Domain/URL | 200+ blacklisted domains, 50+ whitelisted outlets, TLD trust scoring, HTTPS, subdomain abuse, author byline, publication date |

**Ensemble:** `15% × Gate1 + 25% × Gate2 + 40% × Gate3 + 20% × Gate4` → **REAL / SUSPICIOUS / FAKE**

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze headline + article text |
| `/api/analyze-url` | POST | Scrape a URL and analyze |
| `/api/demo` | GET | Run a demo fake article |
| `/api/health` | GET | Health check |
| `/docs` | GET | Interactive Swagger UI |

### 2. Frontend

```bash
cd frontend
npm install
npx next dev -p 3000
```

Open **http://localhost:3000**

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

1. **Loads 4 datasets from HuggingFace Hub** (~130k total examples):
   - `davanstrien/WELFake` — 72,134 news articles (Wikipedia + Reuters + BuzzFeed + PolitiFact)
   - `ucsbnlp/liar` — 12,836 political claims, rated by journalists (binarized to real/fake)
   - `GonzaloA/fake_news` — 20,000+ mixed fake/real articles
   - `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` — 10,000 articles

2. **Trains BiLSTM + Bahdanau Attention from scratch** (covers Labs 8, 9, Custom, 3, 7, 2):
   - Word vocabulary built from training corpus (30k words)
   - 2-layer BiLSTM encoder, hidden_dim=256
   - Bahdanau additive attention mechanism
   - Dropout + weight_decay + gradient clipping + EarlyStopping (Lab 7)
   - Expected accuracy: ~88–92%

3. **Fine-tunes DistilBERT** with 2-phase Transfer Learning (covers Lab 6):
   - Phase 1 (2 epochs): Freeze all 6 transformer layers, train only classification head
   - Phase 2 (5 epochs): Unfreeze top 2 transformer layers, fine-tune at lr=2e-5
   - Expected accuracy: **~93–96%**

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

| Model | Architecture | Trained on | Expected Accuracy |
|-------|-------------|-----------|-------------------|
| `Arihant2409/truthlens-fake-news-detector` | DistilBERT fine-tuned | WELFake + LIAR + GonzaloA + ErfanMoosavi (~130k) | ~93–96% |

---

## Datasets

| Dataset | Size | Content | Source |
|---------|------|---------|--------|
| WELFake | 72,134 | News articles from Wikipedia, Reuters, BuzzFeed, PolitiFact | HuggingFace: `davanstrien/WELFake` |
| LIAR | 12,836 | Political statements rated by PolitiFact journalists | HuggingFace: `ucsbnlp/liar` |
| GonzaloA/fake_news | ~20,000 | Mixed news articles | HuggingFace: `GonzaloA/fake_news` |
| ErfanMoosaviMonazzah | ~10,000 | English news | HuggingFace: `ErfanMoosaviMonazzah/...` |
| **Total training corpus** | **~130,000** | | |

See `training/DATASETS.md` for additional datasets (ISOT, FakeNewsNet, COVID-19, etc.)

---

## Deep Learning Concepts (Lab Manual)

| Lab | Concept | Exact use in this project |
|-----|---------|--------------------------|
| Lab 2 | Autograd & backpropagation | `loss.backward()` in BiLSTM training loop; gradients flow through attention weights automatically |
| Lab 3 | Linear layers, ReLU | Classifier head: `Linear(512→256) → ReLU → Dropout → Linear(256→2)` |
| Lab 6 | Transfer Learning | DistilBERT: Phase 1 freeze all → train head; Phase 2 unfreeze top 2 layers → fine-tune |
| Lab 7 | Regularization | Dropout(0.3) in 3 locations, weight_decay=0.01, gradient clipping (max_norm=1.0), EarlyStopping patience=5, CosineAnnealingLR |
| Lab 8 | LSTM | `nn.LSTM(embed_dim, hidden=256, num_layers=2, batch_first=True)` as sequence encoder |
| Lab 9 | Bidirectional RNN | `bidirectional=True` → forward + backward hidden states concatenated: dim = 512 |
| Custom | Bahdanau Attention | `e_t = v^T·tanh(W·h_t)`, `α = softmax(e)`, `context = Σ αt·ht` — weights visualized as word cloud in UI |

---

## Project Structure

```
FakeNewsDetector/
├── backend/
│   ├── main.py                    FastAPI app, CORS, 4 endpoints
│   ├── requirements.txt
│   ├── pipeline/
│   │   ├── stage1_headline.py     Gate 1: 8 headline checks (regex + wordlists)
│   │   ├── stage2_style.py        Gate 2: 10+ linguistic features (TTR, Flesch, etc.)
│   │   ├── stage3_content.py      Gate 3: 4 transformer models + comparison panel data
│   │   ├── stage4_source.py       Gate 4: 200+ domains, TLD, HTTPS, URL structure
│   │   └── ensemble.py            Weighted 15/25/40/20 → REAL/SUSPICIOUS/FAKE
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
│           ├── HeroInput.tsx      Text / URL tab input card
│           ├── LoadingScreen.tsx  Stage-by-stage animated loading
│           ├── AnalysisResult.tsx Full dashboard with model comparison panel
│           ├── StageCard.tsx      Collapsible per-gate detail card
│           ├── RiskGauge.tsx      Animated SVG arc gauge (eased counter)
│           └── FloatingCards.tsx  6 glass cards that drift + bounce around viewport
│
└── training/
    ├── train_kaggle.py            Full Kaggle training (BiLSTM + DistilBERT, 4 datasets, HF push)
    ├── train_colab.py             Google Colab alternative training script
    └── DATASETS.md                10 dataset sources with download links
```

---

## UI Features

- **Liquid glass design** — `backdrop-filter: blur(40px) saturate(200%)`, inset highlights, gradient border specular ring
- **Animated mesh background** — 4 CSS orbs (blue/purple/green/orange) with keyframe float animations
- **Floating bouncing cards** — 6 glass info cards drift around the viewport and reflect off edges
- **Interactive pipeline pills** — hover over Headline/Style/Content AI/Source to see tooltip with gate details
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
| Training | Kaggle (T4 GPU, free) / Google Colab |
| Model hosting | HuggingFace Hub |

---

## Screenshots

| Home page | Analysis result | How it works |
|-----------|----------------|--------------|
| Liquid glass UI with floating cards | Verdict banner + 4 gate cards + model comparison | Gate breakdowns + ensemble weights |

---

*Deep Learning Lab Project · BiLSTM + Bahdanau Attention + DistilBERT Transfer Learning*
