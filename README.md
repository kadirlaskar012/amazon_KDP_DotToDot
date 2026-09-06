# Dot2Dot Pro - Amazon KDP & D2D Dot-to-Dot Generator & Editor

A local-first, professional Hybrid Dot-to-Dot Puzzle Generator and Multi-Page Book Editor tailored specifically for Amazon KDP (Kindle Direct Publishing) and Draft2Digital (D2D) print-on-demand publishing.

## ✨ Features

- **Cursor-Anchored Zooming & Smooth Pan**: Zoom in and out precisely anchored to your mouse cursor position.
- **Smart Mid-Sequence Renumbering**:
  - Insert dots between existing dots (e.g. between 18 and 19) to create a new dot 19, automatically shifting subsequent dots (20, 21, 22...).
  - Deleting a dot automatically renumbers all subsequent dots sequentially (19 deleted $\rightarrow$ 20 becomes 19, 21 becomes 20...) with zero missing numbers.
- **Media Library with Batch Auto-Plot**:
  - Upload dozens of line-art illustrations to the Media Library.
  - One-click **Auto-Plot to Canvas** with confirmation: automatically expands pages if needed, detects contours, and generates numbered dots and captions across all pages.
- **Amazon KDP Print-Safe Margins**:
  - Built-in dashed safe margin guides with a quick toggle (ON/OFF) in the left toolbar.
- **Bottom-Middle Object Titles & Captions**:
  - Add custom animal, fruit, or object names per page.
  - Automatically centered at the bottom middle and strictly clamped within Amazon KDP safe print margins.
- **KDP-Compliant Front Matter & Book Export**:
  - Multi-page vector PDF book generator.
  - Checkboxes to include:
    - *"This Book Belongs To"* page
    - *Table of Contents* page (listing puzzle captions and page numbers)
    - *Copyright & Disclaimer* page
    - *How to Solve Instructions* page
  - Vector PDF and 300 / 600 DPI PNG exports.
- **Hybrid Dot-to-Dot Mode**:
  - Erase line-art with the interactive eraser tool; remaining un-erased drawing lines sit cleanly underneath vector dots and numbers in the final PDF.

## 🚀 Quick Start

### Backend (Python / FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
