import type { Notebook, FileNode, AIMessage, Variable } from './types';

export const NAVRANG_COLORS = [
  '#ef4444', // Lal (Red)
  '#f97316', // Narangi (Orange)
  '#eab308', // Peela (Yellow)
  '#22c55e', // Hara (Green)
  '#06b6d4', // Ferozi (Cyan)
  '#3b82f6', // Neela (Blue)
  '#8b5cf6', // Baingani (Purple)
  '#ec4899', // Gulabi (Pink)
  '#14b8a6', // Firoza (Teal)
];

export const INITIAL_NOTEBOOKS: Notebook[] = [];

export const INITIAL_FILES: FileNode[] = [];

export const INITIAL_AI_MESSAGES: AIMessage[] = [
  {
    id: 'ai1',
    role: 'assistant',
    content: `**Namaste! I'm Navrang AI** 🌿

I'm your offline AI assistant running on a local model. I can help you with:

- **Explain code** — select any cell and ask me to explain it
- **Fix errors** — paste your error and I'll suggest fixes
- **Generate code** — describe what you need and I'll write it
- **Summarize notebooks** — get a summary of your work
- **Data analysis tips** — ask about Pandas, NumPy, Matplotlib

**Current model:** Gemma 2B (Local) • Fully offline • Private

What would you like to work on?`,
  },
];

export const INITIAL_VARIABLES: Variable[] = [];

function generateSimulatedPrints(code: string): string {
  const printMatches = code.matchAll(/print\(f?['"](.*?)['"].*?\)/g);
  const outputs: string[] = [];
  for (const match of printMatches) {
    outputs.push(match[1].replace(/\{.*?\}/g, '[value]'));
  }
  return outputs.join('\n') || 'Done.';
}

export function simulateExecution(code: string, execCount: number): { output: string | null; isError: boolean } {
  const c = code.trim();

  if (!c) return { output: null, isError: false };

  if (/^(import|from)\s/.test(c) && !c.includes('print(')) {
    const libs = (c.match(/^(?:import|from)\s+(\w+)/gm) || []).map(l => l.replace(/^(?:import|from)\s+/, '').split(/\s/)[0]);
    return {
      output: libs.map(l => `✓ Loaded: ${l}`).join('\n'),
      isError: false,
    };
  }

  if (c.includes('print(')) {
    if (c.includes('pd.__version__') || c.includes('np.__version__')) {
      return { output: '✓ Libraries loaded successfully!\n  Pandas  : 2.1.4\n  NumPy   : 1.26.2', isError: false };
    }
    if (c.includes('.describe()') || c.includes('describe')) {
      return { output: 'count    3.000000\nmean    126733.333333\nstd     20941.573387\nmin    106400.000000\n25%    115950.000000\n50%    125500.000000\n75%    136900.000000\nmax    148300.000000', isError: false };
    }
    if (c.includes('to_string') || c.includes('DataFrame')) {
      return { output: ' Month  Product_A  Product_B  Product_C  Target   Total  Achievement_%\n   Oct      45200      38900      22300   95000  106400          111.9\n   Nov      52800      44100      28600  115000  125500          109.1\n   Dec      61400      51700      35200  140000  148300          105.9', isError: false };
    }
    if (c.includes('feature_importance') || c.includes('importance')) {
      return { output: 'Feature Importance:\n  petal length (cm)              0.4432 ████████████████████████\n  petal width (cm)               0.4171 ████████████████████\n  sepal length (cm)              0.0943 ████\n  sepal width (cm)               0.0454 ██', isError: false };
    }
    if (c.includes('accuracy') || c.includes('classification_report')) {
      return { output: '✓ Model trained on 120 samples\n✓ Test accuracy  : 1.0000 (100.0%)\n\nClassification Report:\n              precision    recall  f1-score   support\n\n      setosa       1.00      1.00      1.00        10\n  versicolor       1.00      1.00      1.00         9\n   virginica       1.00      1.00      1.00        11\n\n    accuracy                           1.00        30', isError: false };
    }
    if (c.includes('primes') || c.includes('range(')) {
      return { output: 'Primes under 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]\nWord lengths: {\'navrang\': 7, \'pustika\': 7, \'python\': 6, \'offline\': 7}', isError: false };
    }
    return { output: generateSimulatedPrints(code), isError: false };
  }

  if (c.includes('.fit(')) {
    return { output: `Epoch 1/10 — loss: 0.6842 — acc: 0.6124\nEpoch 5/10 — loss: 0.2341 — acc: 0.9133\nEpoch 10/10 — loss: 0.0812 — acc: 0.9800\n✓ Training complete in 3.24s`, isError: false };
  }

  if (c.includes('.plot(') || c.includes('plt.show') || c.includes('plt.bar') || c.includes('plt.pie')) {
    return { output: '<chart>', isError: false };
  }

  if (c.includes('load_iris') || c.includes('.shape') || c.includes('target_names')) {
    return { output: "Dataset shape  : (150, 4)\nFeature names  : ['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)']\nTarget classes : ['setosa', 'versicolor', 'virginica']\nClass balance  : [50 50 50]", isError: false };
  }

  if (c.includes('raise') || c.includes('SyntaxError') || c.includes('ZeroDivision')) {
    return { output: 'ZeroDivisionError: division by zero\n  File "<cell>", line 1, in <module>', isError: true };
  }

  if (c.includes('=') && !c.includes('==') && !c.includes('print')) {
    return { output: null, isError: false };
  }

  return { output: `[${execCount}]: Done`, isError: false };
}

const AI_KNOWLEDGE_BASE: { pattern: RegExp; response: string }[] = [
  {
    pattern: /explain|what does|how does|what is/i,
    response: `**Code Explanation** 🔍

This code uses **Pandas DataFrame** operations to:

1. **Load data** — Creates a structured table from a Python dictionary
2. **Compute aggregates** — Sums across product columns with \`.sum(axis=1)\`
3. **Calculate metrics** — Achievement percentage vs target

\`\`\`python
# The key calculation:
df["Achievement_%"] = (df["Total"] / df["Target"] * 100).round(1)
\`\`\`

The \`axis=1\` parameter means "sum across columns" (horizontal sum), as opposed to \`axis=0\` which sums down rows.

**Tip:** You can also use \`df.eval()\` for complex computed columns!`,
  },
  {
    pattern: /fix|error|bug|wrong|broken|fail/i,
    response: `**Error Analysis** 🛠️

Looking at common issues:

**Most likely causes:**
1. **KeyError** — Column name typo or missing column
2. **TypeError** — Wrong data type (e.g., string + number)
3. **ImportError** — Library not installed

**Quick fixes:**
\`\`\`python
# Check your column names:
print(df.columns.tolist())

# Check data types:
print(df.dtypes)

# Safe column access:
df.get("column_name", default=None)
\`\`\`

Paste the full error traceback and I'll give you a specific fix!`,
  },
  {
    pattern: /generate|create|write|make|build/i,
    response: `**Generated Code** ✨

Here's a complete data analysis template:

\`\`\`python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Load your data
df = pd.read_csv("your_data.csv")

# Quick overview
print(f"Shape: {df.shape}")
print(df.head())
print(df.describe())

# Check missing values
missing = df.isnull().sum()
print(f"\\nMissing values:\\n{missing[missing > 0]}")

# Visualize distributions
df.hist(figsize=(12, 8))
plt.tight_layout()
plt.savefig("distributions.png", dpi=150)
plt.show()
\`\`\`

Customize the file path and column names as needed!`,
  },
  {
    pattern: /summarize|summary|overview|what's in/i,
    response: `**Notebook Summary** 📋

Based on your current notebook:

**Sales Data Analysis Q4 2024**
- **Purpose:** Quarterly sales performance review
- **Data:** 3 months × 4 product columns + target
- **Key finding:** All months exceeded targets (105–112%)

**Computed Metrics:**
| Month | Total | vs Target |
|-------|-------|-----------|
| Oct | ₹1,06,400 | +11.9% |
| Nov | ₹1,25,500 | +9.1% |
| Dec | ₹1,48,300 | +5.9% |

**Recommendations:**
1. Run \`df.describe()\` for detailed statistics
2. Create visualizations with matplotlib
3. Export results with \`df.to_excel("report.xlsx")\``,
  },
  {
    pattern: /optimize|improve|faster|performance|speed/i,
    response: `**Optimization Tips** ⚡

For better pandas performance:

\`\`\`python
# 1. Use vectorized operations (avoid loops)
# ❌ Slow:
for i, row in df.iterrows():
    df.at[i, 'result'] = row['a'] + row['b']

# ✅ Fast:
df['result'] = df['a'] + df['b']

# 2. Use categorical for low-cardinality strings
df['Month'] = df['Month'].astype('category')

# 3. Specify dtypes when reading CSV
df = pd.read_csv('data.csv', dtype={'id': 'int32', 'sales': 'float32'})

# 4. Use query() for filtering
result = df.query("Sales > 50000 and Month == 'Dec'")
\`\`\`

These changes can give **10–100x speedups** on large datasets!`,
  },
  {
    pattern: /model|train|machine learning|ml|sklearn|classification/i,
    response: `**ML Guidance** 🤖

For your classification model, here are next steps:

\`\`\`python
# Cross-validation for reliable accuracy
from sklearn.model_selection import cross_val_score
scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
print(f"CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

# Hyperparameter tuning
from sklearn.model_selection import GridSearchCV
params = {
    'n_estimators': [50, 100, 200],
    'max_depth': [None, 5, 10],
    'min_samples_split': [2, 5]
}
grid = GridSearchCV(RandomForestClassifier(), params, cv=5)
grid.fit(X_train, y_train)
print(f"Best params: {grid.best_params_}")

# Save model
import joblib
joblib.dump(model, 'model.pkl')
\`\`\``,
  },
];

export function getAIResponse(message: string): string {
  for (const entry of AI_KNOWLEDGE_BASE) {
    if (entry.pattern.test(message)) {
      return entry.response;
    }
  }
  return `**Navrang AI** 🌿

I understand you're asking about: *"${message}"*

Here are some ways I can help:
- **Explain code** — Ask "explain this code" or "what does X do?"
- **Fix errors** — Paste your error message
- **Generate code** — Say "generate code for [task]"
- **Optimize** — Ask "how to make this faster?"
- **Summarize** — Ask "summarize my notebook"

I'm running **fully offline** on your local machine using the **Gemma 2B** model. Your data never leaves your computer! 🔒`;
}
