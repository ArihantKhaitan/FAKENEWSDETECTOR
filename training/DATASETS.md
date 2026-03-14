# Datasets for Fake News Detection

A comprehensive list of publicly available datasets, ordered by size and research utility.

---

## Datasets Used in TruthLens Training (Actual — Kaggle T4, 14 March 2026)

| Dataset | HuggingFace ID | Loaded | Examples |
|---------|---------------|--------|----------|
| WELFake | `davanstrien/WELFake` | ✓ | 72,134 |
| GonzaloA Fake News | `GonzaloA/fake_news` | ✓ | 24,350 |
| ErfanMoosavi English | `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` | ✓ | 29,861 |
| LIAR | `ucsbnlp/liar` | ✗ failed (dataset scripts deprecated) | 0 |
| **Total** | | | **126,345** |

- Real (label 0): **61,525** · Fake (label 1): **64,820** (balanced)
- Split → Train: **102,339** / Val: **11,371** / Test: **12,635**

---

## Tier 1 — Primary Training Datasets

### 1. WELFake Dataset
- **Size**: 72,134 articles (35,028 real + 37,106 fake)
- **HuggingFace**: `davanstrien/WELFake` — used in TruthLens training ✓
- **Source**: [Zenodo](https://zenodo.org/record/4561253)
- **Columns**: `title`, `text`, `label` (0=FAKE, 1=REAL)
- **Why use it**: Large, balanced, combines 4 other datasets (Kaggle, McIntire, Reuters, BuzzFeed)
- **Download**: `wget https://zenodo.org/record/4561253/files/WELFake_Dataset.csv`

### 2. GonzaloA Fake News
- **Size**: 24,350 articles (train split)
- **HuggingFace**: `GonzaloA/fake_news` — used in TruthLens training ✓
- **Columns**: `title`, `text`, `label`
- **Why use it**: Mixed real/fake articles, easy HuggingFace loading

### 3. ErfanMoosaviMonazzah English Fake News
- **Size**: 29,861 articles (all splits combined)
- **HuggingFace**: `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` — used in TruthLens training ✓
- **Columns**: `title`, `text`, `label`
- **Why use it**: English-only, diverse sources

### 4. LIAR Dataset
- **Size**: 12,836 statements with 6-way labels (true/mostly-true/half-true/barely-true/false/pants-fire)
- **HuggingFace**: `ucsbnlp/liar` — **failed to load** (dataset scripts deprecated as of 2025) ✗
- **Source**: [Papers With Code](https://paperswithcode.com/dataset/liar) | William Wang, 2017
- **Columns**: ID, label, statement, subject, speaker, job, state, party, counts, context
- **Why use it**: Includes speaker metadata, great for multi-class classification
- **Binarize**: [true, mostly-true] → REAL; [false, pants-fire] → FAKE
- **Note**: Use `git clone https://github.com/thiagorainmaker77/liar_dataset` for local download instead

### 5. Kaggle Fake and Real News Dataset (McIntire)
- **Size**: 44,898 articles (21,417 fake + 23,481 real)
- **Source**: [Kaggle](https://www.kaggle.com/clmentbisaillon/fake-and-real-news-dataset)
- **Columns**: `title`, `text`, `subject`, `date`, `label`
- **Files**: `Fake.csv` + `True.csv`
- **Note**: Real news from Reuters; fake from various websites

### 6. ISOT Fake News Dataset
- **Size**: 23,502 articles
- **Source**: [University of Victoria](https://www.uvic.ca/ecs/ece/isot/datasets/fake-news/index.php)
- **Columns**: `title`, `text`, `subject`, `date`, `class`
- **Why use it**: Curated by academic researchers, clean labels

---

## Tier 2 — Supplementary Datasets (not used in TruthLens training)

### 5. FakeNewsNet (PolitiFact + GossipCop)
- **Size**: ~23,000 articles with social context
- **Source**: [GitHub](https://github.com/KaiDMML/FakeNewsNet)
- **Extra**: Includes user engagement data, tweets, user profiles
- **Why use it**: Social context features for advanced models

### 6. FEVER (Fact Extraction and VERification)
- **Size**: 185,445 claims verified against Wikipedia
- **Source**: [fever.ai](https://fever.ai/dataset/fever.html)
- **Labels**: SUPPORTED / REFUTED / NOT ENOUGH INFO
- **Why use it**: Fact-checking against knowledge base

### 7. MIND Dataset (Microsoft News)
- **Size**: 1 million+ news articles
- **Source**: [Microsoft Research](https://msnews.github.io/)
- **Why use it**: Largest news corpus, good for pre-training embeddings

### 8. COVID-19 Fake News Dataset
- **Size**: 10,700 COVID-related claims
- **Source**: [GitHub](https://github.com/diptamath/covid_fake_news)
- **Why use it**: Domain-specific, current relevance

### 9. FA-KES (Fake News Dataset about Syrian War)
- **Size**: 804 articles (war-domain specific)
- **Source**: [ACL Anthology](https://aclanthology.org/2019.naacl-long.51/)

### 10. MultiFC (Multi-domain Fact Checking)
- **Size**: 36,534 real-world claims from 26 fact-checking sites
- **Source**: [GitHub](https://competitions.codalab.org/competitions/20351)

---

## Combining Datasets

```python
import pandas as pd

def load_and_combine():
    dfs = []

    # WELFake
    df1 = pd.read_csv("WELFake_Dataset.csv")[["title", "text", "label"]]
    dfs.append(df1)

    # McIntire
    fake = pd.read_csv("Fake.csv")[["title", "text"]]
    fake["label"] = 0
    real = pd.read_csv("True.csv")[["title", "text"]]
    real["label"] = 1
    dfs.append(pd.concat([fake, real]))

    # ISOT
    df3 = pd.read_csv("ISOT_Fake.csv")[["title", "text"]]
    df3["label"] = 0
    df4 = pd.read_csv("ISOT_True.csv")[["title", "text"]]
    df4["label"] = 1
    dfs.append(pd.concat([df3, df4]))

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.dropna(subset=["text"])
    combined = combined.drop_duplicates(subset=["text"])
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"Combined: {len(combined)} articles")
    print(combined["label"].value_counts())
    return combined
```

---

## Actual Training Split (TruthLens — 126,345 examples)

| Split | Examples | % |
|-------|----------|---|
| Train | 102,339 | 81% |
| Val   | 11,371  | 9% |
| Test  | 12,635  | 10% |

Stratified 80/10/10 split, random_state=42, balanced classes (Real: 61,525 · Fake: 64,820).

```python
from sklearn.model_selection import train_test_split
train, test = train_test_split(df, test_size=0.2, stratify=df["label"], random_state=42)
train, val  = train_test_split(train, test_size=0.1, stratify=train["label"], random_state=42)
```

---

## Training Results Summary (Kaggle T4 GPU — 14 March 2026, ~1h 40min)

### Model A — BiLSTM + Bahdanau Attention

Vocab: 30,000 · Seq len: 256 · hidden: 256 · 2 layers · Dropout: 0.3

| Epoch | Loss | Train Acc | Val Acc |
|-------|------|-----------|---------|
| 1 | 0.6100 | 0.641 | 0.709 |
| 5 | 0.4667 | 0.755 | 0.746 |
| 10 | 0.4625 | 0.758 | **0.752** |

**Best Val: 0.752 · Test: 0.755**

### Model B — DistilBERT Transfer Learning

Base: `distilbert-base-uncased` · 102k training examples

**Phase 1** (freeze backbone, train head, lr=5e-4, 2 epochs):

| Epoch | Train Loss | Val Loss | Accuracy |
|-------|-----------|----------|----------|
| 1 | 1.2446 | 1.2263 | 0.642 |
| 2 | 1.2131 | 1.1959 | **0.655** |

**Phase 2** (unfreeze top 2 layers, lr=2e-5, 5 epochs, ~2h 29min):

| Epoch | Train Loss | Val Loss | Accuracy | F1 |
|-------|-----------|----------|----------|----|
| 1 | 0.8368 | 0.8266 | 0.7903 | 0.7904 |
| 2 | 0.7753 | 0.7972 | 0.7966 | 0.7966 |
| 3 | 0.7672 | **0.8039** | **0.7987** | **0.7987** |
| 4 | 0.7402 | 0.7967 | 0.7974 | 0.7975 |
| 5 | 0.7252 | 0.8087 | 0.7977 | 0.7977 |

**Final Test Accuracy: 0.804 · Test F1: 0.804**

Model saved locally at `./phase2_best/` · HuggingFace push requires a **Write-access token** (see fix below)
