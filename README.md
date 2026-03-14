# TruthLens — Fake News Detector

Multi-stage AI fake news detection system. 4 firewall gates analyze every article
across headline patterns, writing style, deep learning semantics, and source credibility.

## Quick Start

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
- `POST /api/analyze` — text input
- `POST /api/analyze-url` — URL scraping
- `GET  /api/demo` — demo analysis

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Dashboard at **http://localhost:3000**

---

## Training (Cloud — no local GPU needed)

### Option A: Use pre-trained models immediately (recommended)
The backend auto-loads `hamzab/roberta-fake-news-classification` from HuggingFace. No setup needed.

### Option B: Fine-tune on full dataset (Google Colab)

1. Go to [colab.research.google.com](https://colab.research.google.com)
2. Upload `training/train_colab.py`
3. **Runtime → Change runtime type → T4 GPU**
4. Download a dataset (see `training/DATASETS.md`):
   ```python
   # In Colab
   !wget https://zenodo.org/record/4561253/files/WELFake_Dataset.csv -O WELFake.csv
   ```
5. Run the script. Best model auto-saves and can be pushed to HuggingFace Hub.

### Option C: Kaggle Notebooks (also free GPU)

1. Create a new Kaggle Notebook
2. Add the WELFake dataset from Kaggle
3. Upload and run `train_colab.py`
4. Enable GPU accelerator in Settings

---

## Project Structure

```
FakeNewsDetector/
├── backend/
│   ├── main.py                  FastAPI app + API endpoints
│   ├── requirements.txt
│   ├── pipeline/
│   │   ├── stage1_headline.py   Gate 1: headline patterns
│   │   ├── stage2_style.py      Gate 2: writing style + linguistics
│   │   ├── stage3_content.py    Gate 3: transformer ML model
│   │   ├── stage4_source.py     Gate 4: domain credibility
│   │   └── ensemble.py          Weighted final verdict
│   └── utils/
│       └── scraper.py           URL article scraper
│
├── frontend/
│   ├── package.json
│   ├── next.config.js           Proxies /api/* to backend:8000
│   ├── tailwind.config.js
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx             Main page
│       ├── globals.css          Apple/Claude design system
│       └── components/
│           ├── Navbar.tsx
│           ├── HeroInput.tsx    Text / URL tab input
│           ├── LoadingScreen.tsx Stage-by-stage loading
│           ├── AnalysisResult.tsx Full results dashboard
│           ├── StageCard.tsx    Collapsible stage detail
│           └── RiskGauge.tsx    Animated SVG arc gauge
│
├── training/
│   ├── train_colab.py           Google Colab training script
│   └── DATASETS.md              10 dataset sources + download links
│
├── data/                        Place dataset CSVs here (for old models)
├── synopsis.md                  Full project synopsis
└── README.md
```

---

## Detection Stages

| Gate | Analyzes | Key Signals |
|------|----------|-------------|
| **1 — Headline** | Title text | Caps ratio, clickbait patterns, punctuation abuse, sensationalism |
| **2 — Style** | Body text | TTR, readability, quote density, weasel words, repetition |
| **3 — Content AI** | Semantics | RoBERTa/BERT classification, sentiment, NE density, headline-body match |
| **4 — Source** | URL/domain | 200+ blacklisted domains, TLD check, HTTPS, author byline |

**Ensemble weights**: Gate1 15% + Gate2 25% + Gate3 40% + Gate4 20%

---

## Datasets

See `training/DATASETS.md` for 10 datasets with download links.

Top recommended:
- **WELFake** (72k) — [Zenodo](https://zenodo.org/record/4561253) — best single dataset
- **LIAR** (12k) — Stanford — includes speaker metadata
- **Kaggle Fake+Real** (44k) — easiest to download

---

## Technologies

| Layer | Stack |
|-------|-------|
| Backend | Python, FastAPI, uvicorn |
| ML | PyTorch, HuggingFace Transformers |
| Scraping | requests, BeautifulSoup4 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Training | Google Colab / Kaggle (free GPU) |
| Model hosting | HuggingFace Hub |
