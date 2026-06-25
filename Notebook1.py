# %% [cell-1782295166709-3x3en]
import matplotlib.pyplot as plt
import numpy as np

# Generate dummy data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create the plot
plt.figure(figsize=(8, 5))
plt.plot(x, y, label="Sine Wave", color="blue", linewidth=2)

# Customize the chart
plt.title("Dummy Matplotlib Plot")
plt.xlabel("X Axis Label")
plt.ylabel("Y Axis Label")
plt.grid(True, linestyle="--", alpha=0.6)
plt.legend()

# Display the plot
plt.show()


# %% [cell-1782295177093-0pzj4]
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

# 1. Generate dummy data
np.random.seed(42)
data = {
    'Hours_Studied': np.random.randint(1, 10, 50),
    'Test_Score': np.random.randint(50, 100, 50),
    'Study_Group': np.random.choice(['Group A', 'Group B'], 50)
}
df = pd.DataFrame(data)

# Add some simulated correlation to make the plot look realistic
df['Test_Score'] = (df['Hours_Studied'] * 5) + np.random.randint(40, 60, 50)

# 2. Set Seaborn theme
sns.set_theme(style="whitegrid")

# 3. Create the plot
plt.figure(figsize=(8, 5))
sns.regplot(
    data=df, 
    x='Hours_Studied', 
    y='Test_Score', 
    scatter_kws={'color': 'teal'}, 
    line_kws={'color': 'orange'}
)

# 4. Customize plot labels
plt.title('Impact of Study Hours on Test Scores', fontsize=14, pad=15)
plt.xlabel('Hours Studied')
plt.ylabel('Test Score')

# 5. Display the plot
plt.show()


