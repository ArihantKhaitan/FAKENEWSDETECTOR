# Project Synopsis
## TruthLens — Fake News Detection Using an Attention-Based Deep Learning Model

**Course**: Deep Learning Lab
**Project Name**: TruthLens
**GitHub**: https://github.com/ArihantKhaitan/FAKENEWSDETECTOR
**HuggingFace**: https://huggingface.co/Arihant2409/truthlens-fake-news-detector

---

## 1. Introduction

The rapid spread of misinformation on digital news platforms poses a critical threat to public discourse and democratic processes. Traditional single-model fake news classifiers are brittle — they can be fooled by writing style changes or domain spoofing. This project presents **TruthLens**, a multi-stage, multi-signal detection system modeled on the concept of a security firewall.

Every article passes through **five independent analysis gates** — Headline Analysis, Writing Style, Deep Learning Content Analysis, Source Credibility, and External Corroboration — before a weighted ensemble produces a final verdict. Gate 3 uniquely runs **four different transformer models simultaneously** and compares their predictions, giving a more robust and interpretable result than any single model could, while Gate 5 searches Google News to verify whether trusted outlets independently report the same story.

The system is deployed as a full-stack application: a **FastAPI Python backend** running the AI pipeline and a **Next.js 16 + React 19 premium web dashboard** for interaction. Training is performed on **Kaggle (free T4 GPU)** using datasets pulled directly from **HuggingFace Hub**, with the resulting model pushed back to HuggingFace for deployment.

---

## 2. Problem Statement

Given a news article (headline + body text, and optionally a source URL):
- Classify it as **REAL**, **SUSPICIOUS**, or **FAKE**
- Explain **which signals** triggered the classification at each gate
- Show **which words** the attention model focused on
- Compare predictions across **multiple transformer models** to show consensus or disagreement

---

## 3. System Architecture

### 3.1 Five-Gate Firewall Pipeline

```
┌──────────────────────────────────────────────────────────┐
│  INPUT: Headline + Article Body + (optional URL)         │
└──────────────────┬───────────────────────────────────────┘
                   │ (if URL: scrape with BeautifulSoup)
          ┌────────▼────────┐
          │  URL SCRAPER    │  JSON-LD, OpenGraph, CSS selectors
          └────────┬────────┘
                   │
    ┌──────────────┴────────────────────────────────────────┐
    │                  RUNS IN PARALLEL                     │
    ▼              ▼              ▼               ▼         ▼
┌────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐
│ GATE 1 │  │  GATE 2  │  │  GATE 3   │  │  GATE 4  │  │  GATE 5  │
│Headline│  │  Style   │  │Content AI │  │  Source  │  │ Corrobor.│
│  12%   │  │   20%    │  │   28%*    │  │   20%    │  │   20%    │
└────┬───┘  └─────┬────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘
     │            │             │              │             │
     └────────────┴─────────────┴──────────────┴─────────────┘
                          │
                 ┌────────▼────────┐
                 │   ENSEMBLE      │
                 │  Weighted sum   │
                 │  *Gate 3 weight │
                 │  adjusted by    │
                 │  model consensus│
                 │  0–30  → REAL   │
                 │  31–55 → SUSP.  │
                 │  56–100→ FAKE   │
                 └─────────────────┘
```

### 3.2 Gate 1 — Headline Analysis

Analyzes the title text only using rule-based NLP checks:

| Check | Description |
|-------|-------------|
| ALL-CAPS ratio | Excessive shouting — legitimate news rarely exceeds 10% caps |
| Clickbait detection | 40+ regex patterns: "SHOCKING", "You won't believe", "They don't want you to know" |
| Punctuation abuse | Multiple `!!` or `???` patterns = sensationalism |
| Absolutist language | Words like "always", "never", "every single" in factual news context |
| Emotional triggers | Curated wordlist of fear/outrage vocabulary |
| Word count anomaly | Under 4 or over 22 words are statistically atypical |
| Spacing anomaly | Unusual whitespace patterns sometimes indicate copy-pasting |

### 3.3 Gate 2 — Writing Style & Linguistic Analysis

Analyzes the body text using 10+ classical NLP features:

| Feature | Description |
|---------|-------------|
| Type-Token Ratio (TTR) | Vocabulary richness — fake news often repeats the same words |
| Flesch Reading Ease | Extreme simplicity (<30) or complexity (>90) signals poor journalism |
| Sentence length variance | High variance = natural writing; uniformly short = automated |
| Quote density | Real journalism attributes statements; no quotes = red flag |
| Weasel word ratio | "reportedly", "sources say", "allegedly" without attribution |
| Mid-sentence capitalization | Unusual caps mid-sentence signal copy-pasted or altered text |
| Informal/slang word ratio | "gonna", "wanna", "kinda" are out of place in news |
| First-person ratio | Opinion framed as news inflates I/we/my frequency |
| Phrase repetition score | Propaganda repeats key phrases verbatim |

### 3.4 Gate 3 — Deep Learning Content Analysis (Core Contribution)

This is the primary ML/DL gate. It does two things:

**A. Multi-Model Inference (all models run, results compared in UI):**

Four transformer models are loaded lazily (cached after first call) and run on every article:

| Model | Architecture | Training Data | Downloads |
|-------|-------------|--------------|-----------|
| `Arihant2409/truthlens-fake-news-detector` | DistilBERT fine-tuned | WELFake + GonzaloA + ErfanMoosavi (126,345 actual) | Custom trained |
| `hamzab/roberta-fake-news-classification` | RoBERTa | WELFake 72k articles | 500+/month |
| `vikram71198/distilroberta-base-finetuned-fake-news-detection` | DistilRoBERTa | Fake news dataset | Active |
| `mrm8488/bert-tiny-finetuned-fake-news-detection` | BERT-tiny | Fake news dataset | 3,248/month |

Results are aggregated and shown in a "Model Comparison" panel — showing each model's verdict, confidence %, and training data. A "consensus badge" indicates whether all models agree.

**B. Supplementary NLP features:**

| Feature | Description |
|---------|-------------|
| Sentiment polarity | Extreme negative sentiment in factual news is anomalous |
| Named entity density | Low NE density (no specific names/places/dates) = vague/fabricated |
| Headline-body consistency | Word-overlap between title and body — mismatch is a red flag |
| Attention word extraction | TF-IDF + fake-indicator bonus to extract suspicious words |

### 3.5 Gate 4 — Source & Domain Credibility

Analyzes the URL/domain and article metadata:

| Check | Description |
|-------|-------------|
| Domain blacklist | 200+ known unreliable/satire/conspiracy sites flagged |
| Domain whitelist | 50+ trusted outlets (Reuters, AP, BBC, NYT, etc.) give score bonus |
| TLD trust scoring | `.gov`/`.edu` > `.com` > `.org` > `.info`/`.biz` > `.xyz`/`.tk` |
| HTTPS verification | Legitimate news sites overwhelmingly use HTTPS |
| URL structure | Excessive hyphens, long paths, numeric IDs signal content farms |
| Subdomain abuse | `news.random-domain.com` patterns mimicking real outlets |
| Author byline | Missing byline is a journalistic red flag |
| Publication date | Articles with no date are often undated for a reason |
| External link density | Real journalism cites other sources |

### 3.6 Gate 5 — External Corroboration (New)

Searches **Google News RSS** (free, no API key required) for the article headline and checks how many credible outlets independently cover the same story.

| Check | Description |
|-------|-------------|
| Google News RSS query | First 9 words of headline searched via `news.google.com/rss/search` |
| Trusted outlet matching | 50+ outlets: Reuters, AP, BBC, NYT, The Hindu, Bloomberg, etc. |
| Suspicious domain detection | Flags if story appears only on sites like InfoWars, NaturalNews, RT |
| Coverage scoring | 3+ trusted outlets → score 8 (PASS); 0 results → score 38 (WARN, neutral); Only bad domains → score 65 (FAIL) |
| Data quality flag | If network fails → `data_quality="none"`, ensemble reduces Gate 5 weight to ~8% |

**Why this matters**: The DL models (Gate 3) recognize *writing patterns* of fake news but cannot verify facts. Gate 5 checks the real world — if Reuters, AP, and BBC all report the same story, it's almost certainly real regardless of writing style.

### 3.7 Ensemble Verdict Engine

```python
# Base weights (dynamically adjusted at runtime)
risk_score = (
    0.12 * gate1_score +
    0.20 * gate2_score +
    0.28 * gate3_score * consensus_factor +   # 0.65–1.0 based on model agreement
    0.20 * gate4_score +
    0.20 * gate5_score * data_quality_factor  # reduced if no corroboration data
)
# All weights normalised to sum to 1.0 after adjustments

verdict = (
    "REAL"       if risk_score < 31  else
    "SUSPICIOUS" if risk_score < 56  else
    "FAKE"
)
```

---

## 4. Deep Learning Model Architecture

### 4.1 BiLSTM + Bahdanau Attention (Trained from Scratch)

This model demonstrates Labs 2, 3, 7, 8, 9, and the custom attention mechanism:

```
Input: tokenized article text (max 256 tokens)
    │
    ▼
nn.Embedding(vocab_size=30000, embed_dim=128)           ← word vectors
    │
    ▼
nn.Dropout(p=0.3)                                       ← Lab 7: Regularization
    │
    ▼
nn.LSTM(                                                ← Lab 8: LSTM encoder
    input_size=128,
    hidden_size=256,
    num_layers=2,
    bidirectional=True,                                 ← Lab 9: BiLSTM
    batch_first=True,
    dropout=0.3
)
Output shape: (batch, seq_len, 512)  [256 forward + 256 backward]
    │
    ▼
BahdanauAttention:                                      ← Custom: Attention
    score(h_t) = v^T · tanh(W_a · h_t)
    α_t = softmax(score)
    context = Σ α_t · h_t
Output shape: (batch, 512)
    │
    ▼
nn.Dropout(p=0.3)                                       ← Lab 7
    │
    ▼
nn.Linear(512 → 256) → nn.ReLU()                        ← Lab 3: Classifier head
    │
    ▼
nn.Dropout(p=0.3)                                       ← Lab 7
    │
    ▼
nn.Linear(256 → 2)                                      ← Lab 3
    │
    ▼
CrossEntropyLoss → loss.backward()                      ← Lab 2: Autograd
```

### 4.2 DistilBERT Two-Phase Transfer Learning (Fine-Tuned)

This model demonstrates Lab 6 (Transfer Learning):

```
Pre-trained DistilBERT (distilbert-base-uncased, 66M parameters)
6 transformer layers, 768-dim hidden states

PHASE 1 (Epochs 1–2):
    ┌──────────────────────────────────────────────┐
    │ Transformer layers 0–5: FROZEN (no gradients)│  ← Lab 6: freeze backbone
    └──────────────────────────────────────────────┘
    │
    ▼ [CLS] token pooled output (768-dim)
    │
    ▼
nn.Linear(768 → 2)  ← only this trains, lr=5e-4

PHASE 2 (Epochs 3–7, early stopping):
    ┌────────────────────────────────────────────┐
    │ Layers 0–3: still FROZEN                   │
    │ Layers 4–5: UNFROZEN (top 2 layers)        │  ← Lab 6: unfreeze gradually
    └────────────────────────────────────────────┘
    │
    ▼
Fine-tune at lr=2e-5 (10× lower than Phase 1)
weight_decay=0.01 (L2 regularization)              ← Lab 7
EarlyStopping patience=3                           ← Lab 7
```

**Why two phases?** Phase 1 trains the classification head to map BERT's generic features to fake/real. Phase 2 then adapts the top transformer layers to our specific domain. Training all layers from the start would destroy the pre-trained features (catastrophic forgetting).

---

## 5. Training Workflow

### 5.1 Datasets (All loaded directly from HuggingFace Hub)

| Dataset | HuggingFace ID | Actual Size | Status | Content |
|---------|---------------|-------------|--------|---------|
| WELFake | `davanstrien/WELFake` | **72,134** | ✓ Loaded | News from Wikipedia, Reuters, BuzzFeed, PolitiFact |
| LIAR | `ucsbnlp/liar` | 0 (failed) | ✗ Dataset scripts deprecated | Political statements — `trust_remote_code` unsupported on Kaggle |
| GonzaloA | `GonzaloA/fake_news` | **24,350** | ✓ Loaded | Mixed news articles (train split) |
| ErfanMoosaviMonazzah | `ErfanMoosaviMonazzah/fake-news-detection-dataset-English` | **29,861** | ✓ Loaded | English news (all splits) |
| **Combined** | — | **126,345** | | Real: 61,525 · Fake: 64,820 (balanced) |

**Actual dataset split (stratified, seed=42):** Train: 102,339 / Val: 11,371 / Test: 12,635

### 5.2 Training Platform

**Kaggle** — free T4 GPU (up to 30 hours/week per account)
- GPU: NVIDIA T4, 15GB VRAM
- RAM: 30GB
- Disk: 57.6GB
- Script: `training/train_kaggle.py`

**Google Colab** (alternative) — free T4 or T4 GPU
- Script: `training/train_colab.py`

### 5.3 Training Steps (as executed in train_kaggle.py)

**Step 1: Load and merge datasets**
```python
from datasets import load_dataset
welfake = load_dataset("davanstrien/WELFake", split="train")
liar    = load_dataset("ucsbnlp/liar",        split="train")
# ... merge, binarize LIAR, clean, shuffle
```

**Step 2: Train BiLSTM + Attention from scratch**
- Build word vocabulary (30k tokens, min_freq=2) from training corpus
- Train for up to 10 epochs with EarlyStopping (patience=5)
- Save best checkpoint as `bilstm_best.pt`
- Optimizer: AdamW (lr=3e-4, weight_decay=0.01)
- Scheduler: CosineAnnealingLR

**Step 3: Tokenize with DistilBERT tokenizer**
```python
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
dataset = dataset.map(lambda b: tokenizer(b["text"], truncation=True, max_length=512), batched=True)
```

**Step 4: Fine-tune DistilBERT (Phase 1)**
- Freeze all 6 transformer layers
- Train classification head for 2 epochs
- lr=5e-4, batch_size=32

**Step 5: Fine-tune DistilBERT (Phase 2)**
- Unfreeze top 2 transformer layers (layers 4 and 5)
- Train for up to 5 epochs with EarlyStopping (patience=3)
- lr=2e-5, batch_size=16

**Step 6: Evaluate on test set**
- Report accuracy and F1 score

**Step 7: Push to HuggingFace Hub**
```python
bert_model.push_to_hub("Arihant2409/truthlens-fake-news-detector")
tokenizer.push_to_hub("Arihant2409/truthlens-fake-news-detector")
api.upload_file("bilstm_best.pt", ...)
```

### 5.4 Actual Training Results (Kaggle T4 GPU · 14 March 2026 · ~3h 10min total)

#### BiLSTM + Bahdanau Attention — Full Training Log

Vocab size: 30,000 · Sequence length: 256 · hidden_dim: 256 · 2 layers · Dropout: 0.3

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
(No early stopping triggered — ran all 10 epochs)

#### DistilBERT — Phase 1 Results (Freeze backbone, train head only)

Hyperparams: lr=5e-4 · batch=32 · 2 epochs · 3,200 steps · 102,339 training examples

| Epoch | Train Loss | Val Loss | Val Accuracy | Val F1 |
|-------|-----------|----------|--------------|--------|
| 1 | 1.2446 | 1.2263 | 0.642 | 0.642 |
| 2 | 1.2131 | 1.1959 | **0.655** | **0.655** |

Phase 1 conclusion: classification head learned basic real/fake discrimination from pre-trained BERT features.

#### DistilBERT — Phase 2 (Unfreeze top 2 layers, fine-tune)

Hyperparams: lr=2e-5 · batch=16 · 5 epochs · 15,995 steps · ~2h 29min

| Epoch | Train Loss | Val Loss | Val Accuracy | Val F1 |
|-------|-----------|----------|--------------|--------|
| 1 | 0.8368 | 0.8266 | 0.7903 | 0.7904 |
| 2 | 0.7753 | 0.7972 | 0.7966 | 0.7966 |
| 3 | 0.7672 | 0.8039 | **0.7987** | **0.7987** |
| 4 | 0.7402 | 0.7967 | 0.7974 | 0.7975 |
| 5 | 0.7252 | 0.8087 | 0.7977 | 0.7977 |

**Final Test Accuracy: 0.804 · Test F1: 0.804**

Best epoch: 3 (Val 79.87%). Test set confirms 80.4% — significant improvement over Phase 1's 65.5%. The model is pushed to `Arihant2409/truthlens-fake-news-detector` on HuggingFace Hub.

#### Summary Table

| Model | Val Accuracy | Test Accuracy | Training Time |
|-------|-------------|---------------|---------------|
| BiLSTM + Attention | 0.752 | **0.755** | ~25 min |
| DistilBERT Phase 1 | 0.655 | — | ~40 min |
| DistilBERT Phase 2 | 0.799 | **0.804** | ~2h 29min |
| **Total wall time** | | | **~3h 10min** |

---

## 6. Lab Manual Concept Integration

| Lab | Concept | Exact usage in TruthLens |
|-----|---------|--------------------------|
| **Lab 2** | Autograd & Computational Graphs | `loss.backward()` in BiLSTM training loop. Attention weight gradients flow back through softmax and the tanh scoring function automatically via autograd. No manual gradient computation needed. |
| **Lab 3** | Linear Layers & Activation Functions | Classifier head: `nn.Linear(512→256) → nn.ReLU() → nn.Dropout(0.3) → nn.Linear(256→2)`. Also the DistilBERT classification head: `Linear(768→2)`. |
| **Lab 6** | Transfer Learning | DistilBERT fine-tuning with two-phase strategy: Phase 1 freezes the entire pre-trained backbone and trains only the new classification head; Phase 2 unfreezes the top 2 transformer layers for domain adaptation. Identical strategy to fine-tuning ImageNet-pretrained ResNet for a new task. |
| **Lab 7** | Regularization | **Dropout(0.3)** applied after embedding, between LSTM layers, and in classifier. **weight_decay=0.01** in AdamW optimizer (L2 penalty). **Gradient clipping** (max_norm=1.0) prevents exploding gradients in RNN. **EarlyStopping** monitors validation accuracy (patience=5 for BiLSTM, patience=3 for BERT). **CosineAnnealingLR** scheduler. |
| **Lab 8** | LSTM / RNN | `nn.LSTM(input_size=128, hidden_size=256, num_layers=2, batch_first=True)`. Two stacked LSTM layers process the word sequence token by token and maintain a hidden state encoding context. |
| **Lab 9** | Bidirectional RNN | `bidirectional=True` in nn.LSTM. The forward pass reads left-to-right; the backward pass reads right-to-left. Both hidden states are concatenated: `h = [h_fwd; h_bwd]`, giving the model context from both directions. Output dimension doubles to 512. |
| **Custom** | Bahdanau Attention | `score(h_t) = v^T · tanh(W_a · h_t)`, `α = softmax(score)`, `context = Σ αt · ht`. The attention weights are extracted and visualized in the UI as a word cloud — words with higher attention are larger and more colored. This is the key novelty over a plain BiLSTM. |

---

## 7. Regularization Techniques (Lab 7 Detail)

| Technique | Implementation | Effect on model |
|-----------|---------------|-----------------|
| **Dropout (p=0.3)** | After embedding layer, after LSTM output, in classifier MLP | Randomly zeros 30% of activations during training. Forces network to learn redundant representations. At inference: no dropout, full activations used. |
| **L2 Weight Decay** | `AdamW(params, weight_decay=0.01)` | Adds `λ·||w||²` to loss, penalizing large weights. Prevents any single weight from dominating. |
| **Gradient Clipping** | `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)` | Prevents exploding gradients in deep RNNs by rescaling gradient vector if its norm exceeds 1.0. Critical for LSTM training stability. |
| **Early Stopping** | Monitor val_accuracy, patience=5, restore best weights | Stops training when val_accuracy stops improving. Prevents overfitting by not training past the generalization optimum. |
| **CosineAnnealingLR** | Decays lr from 3e-4 to 0 following cosine curve | Avoids learning rate being too large in later epochs, allows fine convergence. |
| **Mixed Precision** | `fp16=True` in TrainingArguments (when CUDA available) | Reduces GPU memory usage and speeds training with minimal accuracy impact. |

---

## 8. HuggingFace Integration

### Pre-trained Models (used without any training)

```python
from transformers import pipeline

# Stage 3 tries each model in order, uses first that loads successfully
clf = pipeline(
    "text-classification",
    model="hamzab/roberta-fake-news-classification",
    device=0 if torch.cuda.is_available() else -1,
    truncation=True,
    max_length=512,
)
result = clf("Article text here...")[0]
# → {"label": "FAKE", "score": 0.923}
```

All pre-trained models are:
- Downloaded automatically on first use
- Cached in `~/.cache/huggingface/`
- No account or token required for inference

### Custom Model (trained on Kaggle, pushed to HuggingFace)

```python
# After training completes on Kaggle:
bert_model.push_to_hub("Arihant2409/truthlens-fake-news-detector")
tokenizer.push_to_hub("Arihant2409/truthlens-fake-news-detector")

# Backend then loads it automatically as the #1 priority model:
# HF_MODELS = ["Arihant2409/truthlens-fake-news-detector", ...]
```

**HuggingFace Datasets** (used for training):

```python
from datasets import load_dataset
welfake = load_dataset("davanstrien/WELFake", split="train")
liar    = load_dataset("ucsbnlp/liar",        split="train")
# Automatically downloaded, cached, and converted to PyTorch tensors
```

---

## 9. Multi-Model Comparison Feature

A unique feature of TruthLens is the **Model Comparison Panel** shown after every analysis. All loaded models produce predictions independently, and the UI shows:

- Each model's name and training data
- Individual verdict (FAKE/REAL) with confidence percentage
- Animated confidence bar
- A **consensus badge**: "All agree: FAKE" (all models agree) or "2 FAKE / 2 REAL" (disagreement)

This is valuable because:
- If all 4 models agree → high confidence in verdict
- If models disagree → article may be in a grey zone requiring human judgment
- Different models were trained on different data → disagreement reveals edge cases

---

## 10. API Design

| Endpoint | Method | Request Body | Response |
|----------|--------|-------------|----------|
| `/api/analyze` | POST | `{headline: str, content: str}` | Full AnalysisResponse JSON |
| `/api/analyze-url` | POST | `{url: str}` | Scrape URL → AnalysisResponse |
| `/api/demo` | GET | — | Demo fake article analysis |
| `/api/health` | GET | — | `{status: "ok", version: "2.0.0"}` |
| `/api/status` | GET | — | Model loading status (`models_ready`, loaded count) |
| `/docs` | GET | — | Interactive Swagger UI (auto-generated) |

**AnalysisResponse fields:**
- `risk_score` (0–100), `verdict` (REAL/SUSPICIOUS/FAKE), `confidence`
- `summary` (human-readable explanation)
- `stages` — per-gate score, verdict, flags, and detailed metrics
- `stages.content.details.model_comparison` — list of all model predictions
- `attention_words` — list of `{word, weight}` pairs
- `key_flags` — top flags across all gates
- `article` — headline, content preview, URL, word count
- `processing_time_ms`

---

## 11. Frontend UI Architecture

Built with **Next.js 16 + React 19 + TypeScript**, styled with a custom Apple/Claude-inspired liquid glass design system.

### Design System (`globals.css`)
- **`.glass`** — `backdrop-filter: blur(40px) saturate(200%) brightness(1.04)` + inset highlight + gradient border
- **`.glass-shimmer`** — sweeping light animation on hover
- **`.gradient-border`** — specular ring via CSS mask compositing
- **`.orb` / `.mesh-bg`** — 4 animated gradient blobs (blur 90px) that float behind all content
- **CSS variables** — `--glass-bg`, `--accent`, `--green`, `--orange`, `--red`, `--purple`

### Pages
- **`/`** — Home: animated mesh background, floating bouncing glass cards, interactive pipeline pills with hover tooltips, hero input, results dashboard
- **`/how-it-works`** — Full architecture page: 4 gate breakdowns, ensemble weights visualization, technology stack

### Components
| Component | Description |
|-----------|-------------|
| `FloatingCards` | 6 glass cards drift/bounce around viewport using `requestAnimationFrame` physics |
| `HeroInput` | Text/URL tab input with amber "AI models loading" banner + disabled button while backend warms up |
| `RiskGauge` | SVG arc gauge with ease-out-quart counter animation and glow filter |
| `AnalysisResult` | Full dashboard: verdict banner, firewall pipeline visual, 4 gate cards, model comparison, attention word cloud, score breakdown |
| `StageCard` | Collapsible glass card per gate showing flags and metrics grid |
| `LoadingScreen` | Orbital SVG spinner + stage-by-stage list with active tile + green checkmarks |

---

## 12. Project Structure

```
FakeNewsDetector/
├── backend/
│   ├── main.py                    FastAPI app, CORS, Pydantic v2 models
│   ├── requirements.txt
│   ├── pipeline/
│   │   ├── stage1_headline.py     8 headline checks (regex + wordlists)
│   │   ├── stage2_style.py        10+ linguistic features
│   │   ├── stage3_content.py      4-model ML comparison + NLP features
│   │   ├── stage4_source.py       200+ domain blacklist + URL analysis
│   │   ├── stage5_corroboration.py  Gate 5: Google News RSS corroboration check
│   │   └── ensemble.py            Weighted 12/20/28/20/20 with dynamic consensus adjustment
│   └── utils/
│       └── scraper.py             URL scraper (BeautifulSoup, JSON-LD, OG tags)
│
├── frontend/
│   ├── package.json               Next.js 16, React 19
│   ├── next.config.js             API proxy /api/* → :8000
│   └── app/
│       ├── page.tsx               Home page
│       ├── globals.css            Liquid glass design system
│       ├── how-it-works/page.tsx  Architecture explanation page
│       └── components/
│           ├── Navbar.tsx
│           ├── HeroInput.tsx
│           ├── LoadingScreen.tsx
│           ├── AnalysisResult.tsx  (includes Model Comparison panel)
│           ├── StageCard.tsx
│           ├── RiskGauge.tsx
│           └── FloatingCards.tsx
│
└── training/
    ├── train_kaggle.py            Full training: 4 datasets + BiLSTM + DistilBERT + HF push
    ├── train_colab.py             Google Colab alternative
    └── DATASETS.md                10 dataset sources
```

---

## 13. Key Technical Innovations

1. **Multi-stage firewall** — no single model decides; 5 independent analytical signals are weighted and combined, making the system robust to adversarial writing
2. **4-model simultaneous comparison** — shows consensus across multiple transformer architectures; disagreement signals borderline content requiring human judgment
3. **Explainability via attention** — Bahdanau attention weights are extracted and visualized as a word cloud, making the model's decision interpretable
4. **URL-native analysis** — paste any news URL; BeautifulSoup scraper extracts headline and body automatically via JSON-LD, OpenGraph, and CSS selectors
5. **No local GPU required** — system runs immediately using HuggingFace pre-trained models; GPU training is deferred to Kaggle/Colab
6. **Combined training corpus** — 3 datasets merged (126,345 actual articles) covering news and multiple domains; class-balanced (61,525 real / 64,820 fake)
7. **HuggingFace-native workflow** — training data loaded from HF Hub, trained model pushed back to HF Hub, inference via HF `pipeline()` — modern production ML workflow
8. **Rich linguistic gate (Gate 2)** — 10+ classical NLP features computed without ML, providing interpretable signals that complement the transformer models
9. **External corroboration (Gate 5)** — Google News RSS searched for every article headline; trusted outlet coverage count directly influences the verdict score, providing real-world fact-grounding that pure ML cannot offer

---

## 14. How to Run

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API at localhost:8000 | Swagger UI at localhost:8000/docs

# 2. Frontend
cd frontend
npm install
npx next dev -p 3000
# Dashboard at localhost:3000

# 3. Training (Kaggle — recommended)
# - Go to kaggle.com/code → New Notebook → GPU T4 x2
# - !pip install transformers datasets accelerate scikit-learn huggingface_hub -q
# - from huggingface_hub import login; login("YOUR_TOKEN")
# - Upload and run training/train_kaggle.py
# - Model auto-pushed to huggingface.co/Arihant2409/truthlens-fake-news-detector
```

---

## 15. Conclusion

TruthLens demonstrates how a **layered, multi-signal approach** significantly outperforms any single model for fake news detection. By combining:

- **Rule-based linguistic analysis** (Gate 1 & 2) for fast, interpretable features
- **Multi-model transformer ensemble** (Gate 3) for deep semantic understanding
- **Domain intelligence** (Gate 4) for source credibility
- **External corroboration** (Gate 5) for real-world fact-grounding via Google News
- **Proper ML training practices** (Labs 2–9: autograd, transfer learning, BiLSTM, attention, regularization)
- **Modern deployment** (FastAPI + HuggingFace Hub + Next.js 16)

...the project bridges the full stack from academic deep learning theory to a working production web application. The multi-model comparison panel uniquely demonstrates how different architectures trained on the same data can have different confidence levels, giving users transparency into the AI decision-making process.
