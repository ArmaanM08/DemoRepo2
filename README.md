# 🌿 Navrang Pustika (Offline AI Notebook Platform)

Navrang Pustika is a 100% offline, private Jupyter Notebook-like execution platform. It features a modern, clean React frontend and a FastAPI backend that communicates directly with `ipykernel` using the Jupyter wire protocol over pyzmq.

---

## 🏗️ Project Structure

The project is structured into two main components:
- **`backend/`**: A FastAPI application that handles kernel spawning, lifecycle management, execution requests over WebSockets, file management, and notebook exports.
- **`frontend/`**: A React application built with Vite, styled with Tailwind CSS v4, utilizing IndexedDB for local history and configurations.

---

## ⚡ Getting Started

Follow these steps to set up and start the application locally.

### 🔌 Prerequisites
Make sure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)

---

### 🐍 1. Backend Setup & Startup

1. Open your terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```cmd
     venv\Scripts\activate
     ```

4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   *The backend server will run at `http://127.0.0.1:8000`.*

---

### 🎨 2. Frontend Setup & Startup

1. Open a new terminal window/tab and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The development server will run at `http://localhost:5173` (or the port output in your terminal).*

4. Open your browser and navigate to `http://localhost:5173` to start writing offline notebooks!

---

## 🧪 Running Tests

To run the automated Python backend execution tests (spawning kernels, executing code, and interruption handling):

```bash
cd backend
source venv/bin/activate
python -m unittest tests/test_kernel.py
```

---

## ⌨️ Useful Keyboard Shortcuts

- **`Shift + Enter`**: Run selected cell and advance selection.
- **`Ctrl + Enter`**: Run selected cell and stay.
- **`Alt + Enter`**: Run selected cell and insert a new code cell below.
- **`D, D`** *(press D twice)*: Delete the selected cell.
- **`A, A`** *(press A twice)*: Insert a new cell above the selection.
- **`B, B`** *(press B twice)*: Insert a new cell below the selection.
- **`M, M`** *(press M twice)*: Convert selected cell to Markdown.
- **`Y, Y`** *(press Y twice)*: Convert selected cell to Python Code.