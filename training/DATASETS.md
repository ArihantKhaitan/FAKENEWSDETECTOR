# Datasets for Fake News Detection

A comprehensive list of publicly available datasets, ordered by size and research utility.

---

## Tier 1 — Primary Training Datasets

### 1. WELFake Dataset
- **Size**: 72,134 articles (35,028 real + 37,106 fake)
- **Source**: [Zenodo](https://zenodo.org/record/4561253)
- **Columns**: `title`, `text`, `label` (0=FAKE, 1=REAL)
- **Why use it**: Large, balanced, combines 4 other datasets (Kaggle, McIntire, Reuters, BuzzFeed)
- **Download**: `wget https://zenodo.org/record/4561253/files/WELFake_Dataset.csv`

### 2. LIAR Dataset
- **Size**: 12,836 statements with 6-way labels (true/mostly-true/half-true/barely-true/false/pants-fire)
- **Source**: [Papers With Code](https://paperswithcode.com/dataset/liar) | William Wang, 2017
- **Columns**: ID, label, statement, subject, speaker, job, state, party, counts, context
- **Why use it**: Includes speaker metadata, great for multi-class classification
- **Binarize**: [true, mostly-true] → REAL; [false, pants-fire] → FAKE
- **Download**: `git clone https://github.com/thiagorainmaker77/liar_dataset`

### 3. Kaggle Fake and Real News Dataset (McIntire)
- **Size**: 44,898 articles (21,417 fake + 23,481 real)
- **Source**: [Kaggle](https://www.kaggle.com/clmentbisaillon/fake-and-real-news-dataset)
- **Columns**: `title`, `text`, `subject`, `date`, `label`
- **Files**: `Fake.csv` + `True.csv`
- **Note**: Real news from Reuters; fake from various websites

### 4. ISOT Fake News Dataset
- **Size**: 23,502 articles
- **Source**: [University of Victoria](https://www.uvic.ca/ecs/ece/isot/datasets/fake-news/index.php)
- **Columns**: `title`, `text`, `subject`, `date`, `class`
- **Why use it**: Curated by academic researchers, clean labels

---

## Tier 2 — Supplementary Datasets

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

## Recommended Training Split

| Dataset | Train | Val | Test |
|---------|-------|-----|------|
| WELFake | 57,707 | 7,213 | 7,214 |
| Combined | ~100k | ~12k | ~12k |

Use stratified split to maintain class balance:
```python
from sklearn.model_selection import train_test_split
train, test = train_test_split(df, test_size=0.2, stratify=df["label"], random_state=42)
train, val  = train_test_split(train, test_size=0.1, stratify=train["label"], random_state=42)
```
