"""
╔══════════════════════════════════════════════════════════════════════════╗
║  Fake News Detector — Cloud Training Script                              ║
║  Run this on Google Colab (free T4 GPU) or Kaggle Notebooks             ║
║                                                                          ║
║  To run on Colab:                                                        ║
║    1. Upload this file or paste into a notebook                          ║
║    2. Runtime → Change runtime type → GPU (T4)                          ║
║    3. Run cells sequentially                                             ║
║                                                                          ║
║  Models are saved to HuggingFace Hub so backend can load them           ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

# ─────────────────────────────────────────────────────────────────────────
# CELL 1: Install dependencies
# ─────────────────────────────────────────────────────────────────────────
# !pip install -q transformers datasets torch accelerate huggingface_hub \
#              scikit-learn pandas numpy tqdm

# ─────────────────────────────────────────────────────────────────────────
# CELL 2: Imports and config
# ─────────────────────────────────────────────────────────────────────────

import os
import torch
import numpy as np
import pandas as pd
from torch import nn
from torch.utils.data import Dataset, DataLoader, random_split
from transformers import (
    BertTokenizer,
    BertForSequenceClassification,
    RobertaTokenizer,
    RobertaForSequenceClassification,
    get_linear_schedule_with_warmup,
    TrainingArguments,
    Trainer,
)
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support
from tqdm import tqdm

# ── Config ──────────────────────────────────────────────────────────────

MODEL_NAME = "bert-base-uncased"        # or "roberta-base" for better results
HF_REPO_ID = "your-username/fake-news-detector"  # change to your HF username
MAX_LEN    = 256
BATCH_SIZE = 16                         # reduce to 8 if OOM
EPOCHS     = 5
LR         = 2e-5
FREEZE_EPOCHS = 2                       # Freeze BERT for first N epochs (Transfer Learning)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {DEVICE}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

# ─────────────────────────────────────────────────────────────────────────
# CELL 3: Download datasets
# ─────────────────────────────────────────────────────────────────────────

# Option A: Load directly from HuggingFace datasets hub
# from datasets import load_dataset
# dataset = load_dataset("GonzaloA/fake_news")   # ~44k samples, pre-split

# Option B: Download WELFake (recommended — 72k samples)
# !wget -q https://zenodo.org/record/4561253/files/WELFake_Dataset.csv -O WELFake.csv

# Option C: Kaggle API (run in Colab after setting up kaggle.json)
# !kaggle datasets download -d clmentbisaillon/fake-and-real-news-dataset
# !unzip fake-and-real-news-dataset.zip

def load_dataset_local(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    if "label" not in df.columns:
        # Combine Fake.csv + True.csv format
        raise ValueError("Expected 'label' column. See DATASETS.md for format.")
    df = df.dropna(subset=["text"])
    df["label"] = df["label"].astype(int)
    df["text"] = df.get("title", pd.Series([""] * len(df))).fillna("") + " " + df["text"].fillna("")
    print(f"Loaded {len(df)} samples | Label dist: {df['label'].value_counts().to_dict()}")
    return df

# ─────────────────────────────────────────────────────────────────────────
# CELL 4: Dataset class
# ─────────────────────────────────────────────────────────────────────────

class FakeNewsDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids":      encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels":         torch.tensor(self.labels[idx], dtype=torch.long),
        }

# ─────────────────────────────────────────────────────────────────────────
# CELL 5: Model setup (Transfer Learning)
# ─────────────────────────────────────────────────────────────────────────

def build_model(model_name: str, num_labels: int = 2, freeze_bert: bool = True):
    """
    Load pre-trained BERT and add classification head.
    Transfer Learning (Lab 6): freeze base → train head → fine-tune.
    """
    model = BertForSequenceClassification.from_pretrained(
        model_name,
        num_labels=num_labels,
        output_attentions=True,   # return attention weights for visualization
    )

    if freeze_bert:
        # Phase 1: freeze all BERT parameters except classifier head
        for name, param in model.named_parameters():
            if "classifier" not in name:
                param.requires_grad = False
        print(f"[Transfer Learning] BERT frozen. Training classifier head only.")
    else:
        print(f"[Transfer Learning] All layers trainable (fine-tuning mode).")

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"Parameters — Trainable: {trainable:,} / Total: {total:,}")

    return model

# ─────────────────────────────────────────────────────────────────────────
# CELL 6: Training loop
# ─────────────────────────────────────────────────────────────────────────

def compute_metrics(preds, labels):
    p, r, f1, _ = precision_recall_fscore_support(labels, preds, average="macro")
    acc = accuracy_score(labels, preds)
    return {"accuracy": acc, "f1": f1, "precision": p, "recall": r}


def train_epoch(model, loader, optimizer, scheduler, device):
    model.train()
    total_loss, correct, total = 0, 0, 0

    for batch in tqdm(loader, desc="Training"):
        optimizer.zero_grad()
        input_ids      = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels         = batch["labels"].to(device)

        outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
        loss    = outputs.loss

        # L2 regularization via weight_decay in AdamW (Lab 7)
        loss.backward()                                      # Lab 2: Autograd
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)   # gradient clipping
        optimizer.step()
        scheduler.step()

        total_loss += loss.item() * labels.size(0)
        preds      = outputs.logits.argmax(dim=-1)
        correct    += (preds == labels).sum().item()
        total      += labels.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def eval_epoch(model, loader, device):
    model.eval()
    all_preds, all_labels = [], []

    for batch in tqdm(loader, desc="Evaluating"):
        input_ids      = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels         = batch["labels"].to(device)

        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        preds   = outputs.logits.argmax(dim=-1)

        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    metrics = compute_metrics(np.array(all_preds), np.array(all_labels))
    return metrics

# ─────────────────────────────────────────────────────────────────────────
# CELL 7: Main training run
# ─────────────────────────────────────────────────────────────────────────

def main_train(csv_path: str = "WELFake.csv"):
    # Load data
    df = load_dataset_local(csv_path)
    texts  = df["text"].tolist()
    labels = df["label"].tolist()

    # Split: 80/10/10
    tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
    full_ds   = FakeNewsDataset(texts, labels, tokenizer, max_len=MAX_LEN)
    n         = len(full_ds)
    n_train, n_val = int(n * 0.8), int(n * 0.1)
    n_test    = n - n_train - n_val

    g = torch.Generator().manual_seed(42)
    train_ds, val_ds, test_ds = random_split(full_ds, [n_train, n_val, n_test], generator=g)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2)
    test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    print(f"Train: {n_train} | Val: {n_val} | Test: {n_test}")

    # Build model (Phase 1: frozen BERT)
    model = build_model(MODEL_NAME, freeze_bert=True).to(DEVICE)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR,
        weight_decay=1e-4,   # L2 regularization (Lab 7)
    )
    total_steps = len(train_loader) * EPOCHS
    scheduler   = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(total_steps * 0.1),
        num_training_steps=total_steps,
    )

    best_f1 = 0.0
    best_path = "best_model"

    for epoch in range(1, EPOCHS + 1):
        print(f"\n{'='*60}\nEpoch {epoch}/{EPOCHS}")

        # Transfer Learning Phase 2: unfreeze after FREEZE_EPOCHS
        if epoch == FREEZE_EPOCHS + 1:
            print("[Transfer Learning] Unfreezing top 4 BERT layers for fine-tuning...")
            # Unfreeze top 4 encoder layers
            for i in range(8, 12):
                for param in model.bert.encoder.layer[i].parameters():
                    param.requires_grad = True
            for param in model.bert.pooler.parameters():
                param.requires_grad = True
            # Rebuild optimizer with smaller LR for fine-tuning
            optimizer = torch.optim.AdamW(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=2e-5,
                weight_decay=1e-4,
            )

        train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, DEVICE)
        val_metrics = eval_epoch(model, val_loader, DEVICE)

        print(f"Train Loss: {train_loss:.4f}  |  Train Acc: {train_acc:.4f}")
        print(f"Val   Acc: {val_metrics['accuracy']:.4f}  |  Val F1: {val_metrics['f1']:.4f}")

        # Save best model
        if val_metrics["f1"] > best_f1:
            best_f1 = val_metrics["f1"]
            model.save_pretrained(best_path)
            tokenizer.save_pretrained(best_path)
            print(f"  ✓ Best model saved (F1={best_f1:.4f})")

    # Final test evaluation
    print("\n" + "="*60)
    print("Final Test Evaluation")
    model.from_pretrained(best_path)
    test_metrics = eval_epoch(model, test_loader, DEVICE)
    print(f"Test Accuracy:  {test_metrics['accuracy']:.4f}")
    print(f"Test F1:        {test_metrics['f1']:.4f}")
    print(f"Test Precision: {test_metrics['precision']:.4f}")
    print(f"Test Recall:    {test_metrics['recall']:.4f}")

    return model, tokenizer


# ─────────────────────────────────────────────────────────────────────────
# CELL 8: Push to HuggingFace Hub
# ─────────────────────────────────────────────────────────────────────────

def push_to_hub(model_path: str = "best_model", repo_id: str = HF_REPO_ID):
    """
    Upload trained model to HuggingFace Hub so the backend can load it.

    Prerequisites:
        from huggingface_hub import login
        login(token="hf_YOUR_TOKEN_HERE")
    """
    from transformers import BertForSequenceClassification, BertTokenizer

    model     = BertForSequenceClassification.from_pretrained(model_path)
    tokenizer = BertTokenizer.from_pretrained(model_path)

    model.push_to_hub(repo_id)
    tokenizer.push_to_hub(repo_id)
    print(f"Model pushed to: https://huggingface.co/{repo_id}")
    print(f"\nTo use in backend, set model name to: '{repo_id}'")


# ─────────────────────────────────────────────────────────────────────────
# CELL 9: Quick demo — use pre-existing HF model (no training needed)
# ─────────────────────────────────────────────────────────────────────────

def quick_inference_demo():
    """
    Use an already-trained HuggingFace model for instant inference.
    No training required — useful for testing the pipeline immediately.
    """
    from transformers import pipeline

    # Pre-trained fake news detection models on HF Hub:
    models_to_try = [
        "hamzab/roberta-fake-news-classification",
        "mrm8488/bert-tiny-finetuned-fake_news_detection",
        "jy46604790/Fake-News-Bert-Detect",
    ]

    classifier = pipeline("text-classification", model=models_to_try[0])

    test_articles = [
        "Scientists confirm new COVID variant more transmissible, officials urge caution",
        "SHOCKING: Government SECRETLY Putting Microchips in Vaccines!!! SHARE BEFORE DELETED!!!",
        "Federal Reserve raises interest rates by 0.25 percentage points to combat inflation",
        "BREAKING: Obama admits he is a secret lizard person sent to destroy America!!!",
    ]

    print("\n" + "="*60)
    print("Quick Inference Demo (pre-trained model)")
    print("="*60)
    for article in test_articles:
        result = classifier(article[:512])[0]
        label  = result["label"]
        score  = result["score"]
        print(f"\n{'FAKE' if 'FAKE' in label.upper() or 'LABEL_0' in label else 'REAL':>8} ({score:.1%}) | {article[:70]}...")


if __name__ == "__main__":
    # Run quick demo first (no training needed)
    quick_inference_demo()

    # Uncomment to train:
    # model, tokenizer = main_train("WELFake.csv")
    # push_to_hub("best_model", "your-username/fake-news-detector")
