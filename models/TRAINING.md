# Training — Data & Pipeline

Everything about where the data comes from, what each file contains, how it gets cleaned, and how the model is trained from it.

---

## The three data files

### `data/raw/training_data.csv` — the model learns from this

**4,920 rows × 133 columns** (132 symptoms + 1 label)

This is the main dataset. Every row is one labelled example: a combination of symptoms and the disease they correspond to. The model reads every single one of these rows during training.

```
itching | skin_rash | fatigue | ... | yellow_crust_ooze | prognosis
   1    |     1     |    0    | ... |         0         | Fungal infection
   0    |     0     |    1    | ... |         0         | Malaria
   1    |     1     |    1    | ... |         0         | Fungal infection
```

- Each symptom column is **binary**: `1` = present, `0` = absent
- The `prognosis` column is the **label** — the correct answer the model tries to predict
- There are **41 unique diseases** in this file
- Each disease appears **120 times** (4,920 ÷ 41), with slight variations in which symptoms are flagged — this is why the dataset is balanced

One quirk: the CSV has a **trailing comma** at the end of the header line. When pandas reads this it creates an extra empty column called `Unnamed: 133` with no data. The preprocessing code detects and drops any column starting with `Unnamed` before training.

Another quirk: **`fluid_overload` appears twice** as a column name. Pandas resolves duplicate column names by appending `.1` to the second occurrence, so you end up with both `fluid_overload` and `fluid_overload.1` as separate features. Both are kept and both appear in `metadata.json`.

---

### `data/raw/test_data.csv` — NOT used by the model

**42 rows × 133 columns** — same structure as training data

This file came with the original dataset as a separate "test set". It contains **one example per disease** (41 diseases, 1 row each) plus one duplicate at the bottom.

```
itching | skin_rash | ... | prognosis
   1    |     1     | ... | Fungal infection
   0    |     0     | ... | Allergy
   ...
```

**This file is not used anywhere in this project.** The model does its own internal train/test split from `training_data.csv` instead (explained below). This file is kept in `data/raw/` for reference only — you could use it for a final sanity check if you wanted.

---

### `data/processed/training_processed.csv` — a cleaned snapshot

**4,920 rows × 133 columns** — same data as `training_data.csv` but after cleaning

This was written during a previous training run as an audit copy — the raw CSV after stripping the `Unnamed` column and trimming whitespace from column names, before splitting into features and labels.

**It is not used by the API at runtime.** The preprocessing happens live in memory every time you run `python app/ml/train.py`. This file is just a record of what the training data looked like after cleaning. You can delete it without affecting anything.

---

## What preprocessing actually does

The preprocessing is minimal because the data is already clean and binary. Here is every step, in order:

### Step 1 — Load the CSV

```python
df = pd.read_csv("data/raw/training_data.csv")
```

Pandas reads the file into a DataFrame. At this point the columns include the trailing `Unnamed: 133` column.

### Step 2 — Strip whitespace from column names

```python
df.columns = [str(c).strip() for c in df.columns]
```

Some column names in the original file have a leading or trailing space (e.g. `"spotting_ urination"` has an embedded space mid-name — that one is kept as-is because it matches the notebook). This step just removes any accidental whitespace around the name itself.

### Step 3 — Drop the Unnamed column

```python
df = df.drop(columns=[c for c in df.columns if c.startswith("Unnamed")], errors="ignore")
```

The trailing comma in the CSV header creates `Unnamed: 133` — a column of all `NaN`. Dropped here. After this, you have exactly 132 symptom columns + `prognosis`.

### Step 4 — Split into features (X) and labels (y)

```python
X = df[feature_columns].apply(pd.to_numeric, errors="coerce").fillna(0.0)
y = df["prognosis"].astype(str).values
```

- **X** is the 4,920 × 132 matrix of symptom values, cast to float64. Any cell that can't be parsed as a number becomes `0.0` (the `errors="coerce"` + `fillna` handles any stray non-numeric values).
- **y** is a 1D array of 4,920 disease name strings, e.g. `["Fungal infection", "Allergy", ...]`

No scaling. No encoding. No imputation beyond the `fillna(0)`. Tree models don't need any of that.

---

## The train / test split

```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=101, stratify=y
)
```

The 4,920 rows are split **80/20**:

| Split | Rows | Purpose |
|---|---|---|
| **Training set** | 3,936 | The model learns from these — it sees the symptoms and the correct label and adjusts its internal rules |
| **Test set** | 984 | Held back completely during training — used only at the end to evaluate how well the model generalises to examples it has never seen |

`stratify=y` means the split is done **disease by disease** — if Malaria has 120 examples, exactly 96 go to training and 24 go to the test set. Every disease is represented in both splits proportionally. Without stratification you might accidentally put all examples of a rare disease in one split.

`random_state=101` makes the split deterministic — run training twice and you get the same split both times.

**This is the split that matters for evaluation.** The `data/raw/test_data.csv` file is completely separate and unused.

---

## What the model actually learns

During `model.fit(X_train, y_train)`:

The Random Forest builds 300 decision trees. Each tree:

1. Draws a **random sample** of 3,936 training rows (with replacement — some rows appear twice, some not at all). This is called **bootstrap sampling**.
2. At every branch point, considers only a **random subset of the 132 symptom columns** to find the best split — not all 132.
3. Grows until the leaves are pure (all rows in a leaf belong to the same disease) or until a stopping criterion is hit.

Because each tree sees different data and different features, each tree is different. The 300 trees collectively cover the training data from many angles.

After fitting, `model.classes_` holds the 41 disease names in alphabetical order. `model.predict_proba(x)` returns a 41-element array where each value is the fraction of the 300 trees that voted for that disease.

---

## What gets saved after training

`python app/ml/train.py` writes two files:

### `models_saved/model.joblib`

The entire fitted `RandomForestClassifier` object, serialised to disk with `joblib`. Contains all 300 trees — every split rule, every leaf, every class vote. Loading this back is instant (`joblib.load`) and gives you the exact same model that was trained.

### `models_saved/metadata.json`

A human-readable record of everything needed to use the model correctly:

```json
{
  "model": "RandomForestClassifier",
  "feature_names": ["itching", "skin_rash", ...],
  "classes": ["AIDS", "Acne", ...],
  "test_metrics": {
    "accuracy": 1.0,
    "f1_macro": 1.0,
    ...
  },
  "n_estimators": 300,
  "n_samples": 4920,
  "n_features": 132
}
```

The `feature_names` list is the most critical piece — it defines the **exact column order** the model was trained on. When a prediction request comes in, `symptoms_to_feature_vector()` uses this list to build the input array in the same order. If the order were wrong, every prediction would be nonsense.

The `classes` list maps each output index back to a disease name string. `model.predict_proba()` returns probabilities indexed 0–40; `classes[i]` tells you which disease index `i` corresponds to.

---

## How to retrain

```bash
# From the project root, with .venv activated
python app/ml/train.py
```

This re-runs the entire pipeline — loads the CSV, cleans it, splits it, trains 300 trees, evaluates on the held-out 20%, and overwrites `models_saved/model.joblib` and `models_saved/metadata.json`.

To use a different CSV, set `TRAIN_DATA_PATH` in your `.env`:

```
TRAIN_DATA_PATH=data/raw/my_new_dataset.csv
```

The CSV must have the same structure: binary symptom columns + a `prognosis` column at the end.

After retraining, restart the server so it loads the new model:

```bash
uvicorn app.main:app --reload
```
