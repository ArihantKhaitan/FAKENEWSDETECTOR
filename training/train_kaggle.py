"""
TruthLens — Full Multi-Dataset Training Script
================================================
Run this on Kaggle (free T4 GPU, 30h/week) or Google Colab.

DATASETS USED (all loaded from HuggingFace Hub, ~130k total examples):
  1. davanstrien/WELFake        — 72k news articles  (0=real, 1=fake)
  2. ucsbnlp/liar               — 12k political claims (6-way → binarized)
  3. GonzaloA/fake_news         — 20k articles        (0=real, 1=fake)
  4. ErfanMoosaviMonazzah/fake-news-detection-dataset-English — 10k articles

MODELS TRAINED:
  A. BiLSTM + Bahdanau Attention (PyTorch)   → covers Labs 8, 9, Custom
  B. DistilBERT fine-tuned                   → covers Lab 6 (Transfer Learning)

EXTRA CONTENT TYPES TRAINED (beyond news):
  - Political claim fact-checking (LIAR dataset)
  - Can be extended to reviews, medical, climate claims

SETUP (run these in Kaggle/Colab before running this script):
  !pip install transformers datasets accelerate huggingface_hub torch -q

PUSH TO HUGGINGFACE (set your token):
  from huggingface_hub import login
  login("your_hf_token_here")

LAB MANUAL MAPPING:
  Lab 2  → autograd via loss.backward()
  Lab 3  → Linear classifier head on top of BiLSTM
  Lab 6  → DistilBERT Transfer Learning (freeze → unfreeze)
  Lab 7  → Dropout(0.3) + weight_decay=0.01 + EarlyStopping + gradient clipping
  Lab 8  → LSTM encoder (nn.LSTM)
  Lab 9  → BiLSTM (bidirectional=True)
  Custom → Bahdanau Attention mechanism
"""

# ============================================================
# 0. SETUP
# ============================================================
import os, re, math, json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from collections import Counter

# HuggingFace
from datasets import load_dataset, concatenate_datasets, Dataset as HFDataset
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback,
    DataCollatorWithPadding,
)
from huggingface_hub import HfApi, create_repo

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {DEVICE}")
HF_USERNAME = "Arihant2409"   # ← your HuggingFace username
HF_MODEL_NAME = f"{HF_USERNAME}/truthlens-fake-news-detector"
SEED = 42
torch.manual_seed(SEED)

# ============================================================
# 1. LOAD & MERGE DATASETS
# ============================================================
print("\n[1] Loading datasets from HuggingFace Hub...")

def load_and_standardize():
    """Load all datasets and return a unified DataFrame with columns: text, label (0=real, 1=fake)."""
    all_texts, all_labels = [], []

    # ── Dataset 1: WELFake (72k) ─────────────────────────────────────────
    print("  Loading WELFake...")
    try:
        wf = load_dataset("davanstrien/WELFake", split="train")
        for row in wf:
            text = f"{row.get('title', '')} {row.get('text', '')}".strip()
            label = int(row.get("label", -1))
            if text and label in (0, 1):
                all_texts.append(text[:1024])
                all_labels.append(label)
        print(f"    WELFake: {len(all_texts)} examples")
    except Exception as e:
        print(f"    WELFake failed: {e}")

    n_before = len(all_texts)

    # ── Dataset 2: GonzaloA/fake_news (20k) ──────────────────────────────
    print("  Loading GonzaloA/fake_news...")
    try:
        gfn = load_dataset("GonzaloA/fake_news", split="train")
        for row in gfn:
            text = f"{row.get('title', '')} {row.get('text', '')}".strip()
            label = int(row.get("label", -1))
            if text and label in (0, 1) and len(text) > 50:
                all_texts.append(text[:1024])
                all_labels.append(label)
        print(f"    GonzaloA: +{len(all_texts)-n_before} examples")
        n_before = len(all_texts)
    except Exception as e:
        print(f"    GonzaloA failed: {e}")

    # ── Dataset 3: LIAR (12k political claims) ────────────────────────────
    # Label mapping: true/mostly-true → 0 (real), false/pants-fire → 1 (fake)
    # half-true/barely-true → dropped (ambiguous)
    print("  Loading LIAR...")
    LIAR_REAL = {"true", "mostly-true"}
    LIAR_FAKE = {"false", "pants-fire", "pants on fire"}
    try:
        liar = load_dataset("ucsbnlp/liar", split="train", trust_remote_code=True)
        for row in liar:
            statement = row.get("statement", "")
            raw_label = str(row.get("label", "")).lower().strip()
            if not statement or len(statement) < 15:
                continue
            if raw_label in LIAR_REAL:
                all_texts.append(statement)
                all_labels.append(0)
            elif raw_label in LIAR_FAKE:
                all_texts.append(statement)
                all_labels.append(1)
            # skip ambiguous
        print(f"    LIAR: +{len(all_texts)-n_before} examples")
        n_before = len(all_texts)
    except Exception as e:
        print(f"    LIAR failed: {e}")

    # ── Dataset 4: ErfanMoosaviMonazzah ───────────────────────────────────
    print("  Loading ErfanMoosaviMonazzah dataset...")
    try:
        efm = load_dataset("ErfanMoosaviMonazzah/fake-news-detection-dataset-English", split="train")
        for row in efm:
            text = row.get("text", "") or row.get("content", "")
            raw_label = row.get("label", row.get("class", -1))
            try:
                label = int(raw_label)
            except (TypeError, ValueError):
                label_str = str(raw_label).lower()
                label = 1 if "fake" in label_str else (0 if "real" in label_str else -1)
            if text and label in (0, 1) and len(text) > 50:
                all_texts.append(text[:1024])
                all_labels.append(label)
        print(f"    ErfanMoosavi: +{len(all_texts)-n_before} examples")
    except Exception as e:
        print(f"    ErfanMoosavi failed: {e}")

    print(f"\n  Total examples: {len(all_texts)}")
    print(f"  Real (0): {sum(1 for l in all_labels if l==0)}")
    print(f"  Fake (1): {sum(1 for l in all_labels if l==1)}")

    return all_texts, all_labels


texts, labels = load_and_standardize()

# Shuffle
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.1, random_state=SEED, stratify=labels
)
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train, test_size=0.1, random_state=SEED, stratify=y_train
)
print(f"\nSplit — Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")


# ============================================================
# 2. MODEL A — BiLSTM + BAHDANAU ATTENTION (PyTorch, from scratch)
#    Covers: Lab 8 (LSTM), Lab 9 (BiLSTM), Custom (Attention),
#            Lab 3 (classifier head), Lab 7 (Dropout, weight_decay)
# ============================================================
print("\n[2] Training Model A: BiLSTM + Bahdanau Attention...")

# ── 2a. Tokenizer (character/word-level vocab) ───────────────────────────
class WordVocab:
    def __init__(self, max_vocab=30000, min_freq=2):
        self.max_vocab = max_vocab
        self.min_freq = min_freq
        self.word2idx = {"<PAD>": 0, "<UNK>": 1}
        self.idx2word = {0: "<PAD>", 1: "<UNK>"}

    def build(self, texts):
        counter = Counter()
        for t in texts:
            counter.update(re.findall(r"\b[a-z]+\b", t.lower()))
        for word, freq in counter.most_common(self.max_vocab - 2):
            if freq < self.min_freq:
                break
            idx = len(self.word2idx)
            self.word2idx[word] = idx
            self.idx2word[idx] = word
        print(f"  Vocab size: {len(self.word2idx)}")

    def encode(self, text, max_len=256):
        tokens = re.findall(r"\b[a-z]+\b", text.lower())[:max_len]
        ids = [self.word2idx.get(t, 1) for t in tokens]
        # Pad/truncate
        if len(ids) < max_len:
            ids += [0] * (max_len - len(ids))
        return ids[:max_len]

    def __len__(self):
        return len(self.word2idx)


vocab = WordVocab(max_vocab=30000, min_freq=2)
vocab.build(X_train)

# ── 2b. Dataset class ────────────────────────────────────────────────────
class NewsDataset(Dataset):
    def __init__(self, texts, labels, vocab, max_len=256):
        self.data = [(torch.tensor(vocab.encode(t, max_len), dtype=torch.long),
                      torch.tensor(l, dtype=torch.long))
                     for t, l in zip(texts, labels)]

    def __len__(self): return len(self.data)
    def __getitem__(self, i): return self.data[i]


train_ds = NewsDataset(X_train, y_train, vocab)
val_ds   = NewsDataset(X_val,   y_val,   vocab)
test_ds  = NewsDataset(X_test,  y_test,  vocab)

train_loader = DataLoader(train_ds, batch_size=64, shuffle=True,  num_workers=2)
val_loader   = DataLoader(val_ds,   batch_size=64, shuffle=False, num_workers=2)
test_loader  = DataLoader(test_ds,  batch_size=64, shuffle=False, num_workers=2)


# ── 2c. Bahdanau Attention (custom implementation — Lab manual Custom) ────
class BahdanauAttention(nn.Module):
    """
    Additive (Bahdanau) Attention mechanism.
    Learns which words in the sequence to focus on.

    Equation: score(h_t) = v^T * tanh(W_a * h_t)
    alpha_t = softmax(score) → context = sum(alpha_t * h_t)
    """
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_a = nn.Linear(hidden_dim * 2, hidden_dim)  # *2 for bidirectional
        self.v   = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, encoder_outputs):
        # encoder_outputs: (batch, seq_len, hidden*2)
        scores = self.v(torch.tanh(self.W_a(encoder_outputs)))  # (batch, seq_len, 1)
        alpha  = F.softmax(scores, dim=1)                        # (batch, seq_len, 1)
        context = (alpha * encoder_outputs).sum(dim=1)           # (batch, hidden*2)
        return context, alpha.squeeze(-1)


# ── 2d. BiLSTM + Attention model ─────────────────────────────────────────
class BiLSTMAttention(nn.Module):
    """
    Full model architecture:
      Embedding → BiLSTM → Bahdanau Attention → Dropout → Linear → Sigmoid

    Lab 8:  nn.LSTM
    Lab 9:  bidirectional=True
    Custom: BahdanauAttention
    Lab 3:  nn.Linear classifier head
    Lab 7:  nn.Dropout regularization
    """
    def __init__(self, vocab_size, embed_dim=128, hidden_dim=256,
                 num_layers=2, dropout=0.3, num_classes=2):
        super().__init__()
        # Embedding layer (converts word IDs to vectors)
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)

        # Lab 8/9: BiLSTM encoder
        self.lstm = nn.LSTM(
            embed_dim, hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,        # Lab 9: bidirectional
            dropout=dropout if num_layers > 1 else 0.0,
        )

        # Custom: Bahdanau Attention
        self.attention = BahdanauAttention(hidden_dim)

        # Lab 7: Dropout regularization
        self.dropout = nn.Dropout(dropout)

        # Lab 3: Linear classifier head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, x):
        # x: (batch, seq_len)
        embedded = self.dropout(self.embedding(x))        # (batch, seq, embed_dim)
        lstm_out, _ = self.lstm(embedded)                 # (batch, seq, hidden*2)
        context, attn_weights = self.attention(lstm_out)  # (batch, hidden*2)
        context = self.dropout(context)
        logits = self.classifier(context)                 # (batch, 2)
        return logits, attn_weights


# ── 2e. Training loop ─────────────────────────────────────────────────────
def train_bilstm():
    model = BiLSTMAttention(
        vocab_size=len(vocab),
        embed_dim=128, hidden_dim=256,
        num_layers=2, dropout=0.3
    ).to(DEVICE)

    # Lab 7: weight_decay = L2 regularization, gradient clipping
    optimizer = AdamW(model.parameters(), lr=3e-4, weight_decay=0.01)
    scheduler = CosineAnnealingLR(optimizer, T_max=5)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0
    patience, patience_count = 5, 0  # Lab 7: EarlyStopping

    for epoch in range(1, 11):
        # ── Train ──
        model.train()
        total_loss, correct, total = 0, 0, 0
        for x_batch, y_batch in train_loader:
            x_batch, y_batch = x_batch.to(DEVICE), y_batch.to(DEVICE)
            optimizer.zero_grad()
            logits, _ = model(x_batch)
            loss = criterion(logits, y_batch)
            loss.backward()  # Lab 2: autograd backpropagation
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)  # Lab 7: gradient clipping
            optimizer.step()
            total_loss += loss.item()
            preds = logits.argmax(dim=1)
            correct += (preds == y_batch).sum().item()
            total += len(y_batch)

        train_acc = correct / total

        # ── Validate ──
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for x_batch, y_batch in val_loader:
                x_batch, y_batch = x_batch.to(DEVICE), y_batch.to(DEVICE)
                logits, _ = model(x_batch)
                preds = logits.argmax(dim=1)
                val_correct += (preds == y_batch).sum().item()
                val_total += len(y_batch)

        val_acc = val_correct / val_total
        scheduler.step()

        print(f"  Epoch {epoch:2d} | Loss={total_loss/len(train_loader):.4f} | "
              f"Train={train_acc:.3f} | Val={val_acc:.3f}")

        # Lab 7: EarlyStopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), "bilstm_best.pt")
            patience_count = 0
        else:
            patience_count += 1
            if patience_count >= patience:
                print(f"  Early stopping at epoch {epoch}")
                break

    # Load best
    model.load_state_dict(torch.load("bilstm_best.pt"))
    print(f"\n  Best Val Accuracy: {best_val_acc:.3f}")

    # Test accuracy
    model.eval()
    test_correct, test_total = 0, 0
    with torch.no_grad():
        for x_batch, y_batch in test_loader:
            x_batch, y_batch = x_batch.to(DEVICE), y_batch.to(DEVICE)
            logits, _ = model(x_batch)
            preds = logits.argmax(dim=1)
            test_correct += (preds == y_batch).sum().item()
            test_total += len(y_batch)
    print(f"  Test Accuracy: {test_correct/test_total:.3f}")
    return model


bilstm_model = train_bilstm()

# Save vocab for inference
with open("vocab.json", "w") as f:
    json.dump(vocab.word2idx, f)
print("  Saved vocab.json")


# ============================================================
# 3. MODEL B — DistilBERT FINE-TUNING (Transfer Learning)
#    Covers: Lab 6 (Transfer Learning with freeze/unfreeze)
# ============================================================
print("\n[3] Training Model B: DistilBERT fine-tuned on combined dataset...")
print("    (This covers Lab 6 — Transfer Learning)")

MODEL_CHECKPOINT = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(MODEL_CHECKPOINT)

# ── 3a. Tokenize ─────────────────────────────────────────────────────────
def tokenize_batch(texts_batch, max_length=512):
    return tokenizer(
        texts_batch,
        truncation=True,
        padding="max_length",
        max_length=max_length,
    )

# Build HuggingFace Dataset objects
def make_hf_dataset(texts, labels):
    return HFDataset.from_dict({"text": texts, "label": labels})

hf_train = make_hf_dataset(X_train, y_train)
hf_val   = make_hf_dataset(X_val,   y_val)
hf_test  = make_hf_dataset(X_test,  y_test)

print("  Tokenizing...")
hf_train = hf_train.map(lambda b: tokenize_batch(b["text"]), batched=True, batch_size=256)
hf_val   = hf_val.map(  lambda b: tokenize_batch(b["text"]), batched=True, batch_size=256)
hf_test  = hf_test.map( lambda b: tokenize_batch(b["text"]), batched=True, batch_size=256)
hf_train.set_format("torch", columns=["input_ids", "attention_mask", "label"])
hf_val.set_format("torch",   columns=["input_ids", "attention_mask", "label"])
hf_test.set_format("torch",  columns=["input_ids", "attention_mask", "label"])

# ── 3b. Load model ────────────────────────────────────────────────────────
# Lab 6: Load pre-trained transformer, add classification head
bert_model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_CHECKPOINT,
    num_labels=2,
    id2label={0: "REAL", 1: "FAKE"},
    label2id={"REAL": 0, "FAKE": 1},
)

# ── Lab 6, Phase 1: Freeze all transformer layers ────────────────────────
print("  Phase 1: Freeze transformer backbone, train only classification head...")
for param in bert_model.distilbert.parameters():
    param.requires_grad = False
# Only the classifier head trains in phase 1

# ── 3c. Training arguments ───────────────────────────────────────────────
def compute_metrics(eval_pred):
    from sklearn.metrics import accuracy_score, f1_score
    logits, labels_arr = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels_arr, preds),
        "f1": f1_score(labels_arr, preds, average="weighted"),
    }

# Phase 1 training args
phase1_args = TrainingArguments(
    output_dir="./phase1",
    num_train_epochs=2,
    per_device_train_batch_size=32,
    per_device_eval_batch_size=64,
    warmup_ratio=0.1,
    weight_decay=0.01,       # Lab 7: L2 regularization
    learning_rate=5e-4,      # Higher LR since backbone is frozen
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    logging_steps=100,
    fp16=torch.cuda.is_available(),
    seed=SEED,
    report_to="none",
)

trainer_phase1 = Trainer(
    model=bert_model,
    args=phase1_args,
    train_dataset=hf_train,
    eval_dataset=hf_val,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],  # Lab 7
)
trainer_phase1.train()

# ── Lab 6, Phase 2: Unfreeze top 2 transformer layers ────────────────────
print("\n  Phase 2: Unfreeze top 2 transformer layers for fine-tuning...")
# Unfreeze only the top 2 layers of DistilBERT's transformer
for i, layer in enumerate(bert_model.distilbert.transformer.layer):
    if i >= 4:  # DistilBERT has 6 layers — unfreeze last 2
        for param in layer.parameters():
            param.requires_grad = True

phase2_args = TrainingArguments(
    output_dir="./phase2_best",
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=64,
    warmup_ratio=0.06,
    weight_decay=0.01,
    learning_rate=2e-5,      # Lower LR for fine-tuning unfrozen layers
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    logging_steps=200,
    fp16=torch.cuda.is_available(),
    seed=SEED,
    report_to="none",
)

trainer_phase2 = Trainer(
    model=bert_model,
    args=phase2_args,
    train_dataset=hf_train,
    eval_dataset=hf_val,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)
trainer_phase2.train()

# ── 3d. Final evaluation ─────────────────────────────────────────────────
print("\n  Final test evaluation:")
test_results = trainer_phase2.evaluate(hf_test)
print(f"  Test Accuracy: {test_results['eval_accuracy']:.3f}")
print(f"  Test F1:       {test_results['eval_f1']:.3f}")


# ============================================================
# 4. PUSH TO HUGGINGFACE HUB
# ============================================================
print(f"\n[4] Pushing to HuggingFace Hub: {HF_MODEL_NAME}")
print("    Make sure you've run: from huggingface_hub import login; login('YOUR_TOKEN')")

try:
    # Push DistilBERT model + tokenizer
    bert_model.push_to_hub(HF_MODEL_NAME)
    tokenizer.push_to_hub(HF_MODEL_NAME)

    # Save BiLSTM weights alongside
    import pickle
    with open("bilstm_vocab.pkl", "wb") as f:
        pickle.dump(vocab.word2idx, f)

    api = HfApi()
    api.upload_file(
        path_or_fileobj="bilstm_best.pt",
        path_in_repo="bilstm_best.pt",
        repo_id=HF_MODEL_NAME,
    )
    api.upload_file(
        path_or_fileobj="bilstm_vocab.pkl",
        path_in_repo="bilstm_vocab.pkl",
        repo_id=HF_MODEL_NAME,
    )

    print(f"\n  ✓ Model pushed to: https://huggingface.co/{HF_MODEL_NAME}")
    print(f"\n  Now update stage3_content.py:")
    print(f"  HF_MODELS = ['{HF_MODEL_NAME}', ...]")

except Exception as e:
    print(f"  Push failed: {e}")
    print("  Model saved locally at ./phase2_best/")


# ============================================================
# 5. INFERENCE TEST
# ============================================================
print("\n[5] Quick inference test:")

from transformers import pipeline as hf_pipeline

clf = hf_pipeline(
    "text-classification",
    model=bert_model,
    tokenizer=tokenizer,
    device=0 if torch.cuda.is_available() else -1,
)

test_articles = [
    ("REAL", "The Federal Reserve raised interest rates by 25 basis points on Wednesday, "
             "citing continued progress on inflation. Fed Chair Jerome Powell said officials "
             "remain data-dependent."),
    ("FAKE", "SHOCKING: Scientists CONFIRM that 5G towers are secretly uploading your memories "
             "to a globalist server farm! WAKE UP sheeple! They don't want you to know this!"),
    ("FAKE", "BREAKING: Obama secretly signed executive order to ban all firearms by 2025! "
             "Mainstream media is hiding this! Share before they delete it!"),
    ("REAL", "Apple reported quarterly earnings of $94.9 billion, beating analyst estimates. "
             "iPhone sales grew 6% year-over-year according to the company's financial report."),
]

for true_label, text in test_articles:
    result = clf(text[:512])[0]
    pred = result["label"]
    conf = result["score"]
    match = "✓" if pred == true_label else "✗"
    print(f"  {match} True={true_label} | Pred={pred} ({conf:.1%}) | {text[:60]}...")

print("\n[Done] Training complete!")
print(f"Model available at: https://huggingface.co/{HF_MODEL_NAME}")
