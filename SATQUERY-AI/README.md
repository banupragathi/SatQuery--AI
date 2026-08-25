# SatQuery AI

**Turn satellite imagery into intelligence.**

SatQuery AI is an interactive vision-language assistant for multimodal
remote-sensing image analysis. You upload a satellite image, ask a question in
plain English, and the system routes your question to the right kind of
analysis.

- **Problem Statement:** SIH26167 (Smart India Hackathon)
- **This build:** Phase 1 — the full product skeleton (landing page, workspace,
  backend, routing architecture) with an honest "no model connected yet" state.

---

## ⚠️ Important: no AI model is connected yet (by design)

This build intentionally does **not** include a trained AI model. The entire
pipeline works end to end — upload → validate → route → pick specialist →
return a structured result — but where a real answer would appear, the app
clearly says **"AI model integration pending."** Nothing is faked.

Connecting a real remote-sensing vision-language model is the next phase. When
that happens, only the specialist files change; the rest of the system stays
exactly as it is.

---

## Project structure

```
SATQUERY-AI/
├── frontend/                 # React + Vite website (landing page + /app workspace)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx          # app entry
│       ├── App.jsx           # routes:  /  and  /app
│       ├── index.css         # design tokens + global styles
│       ├── services/api.js   # the ONLY place that talks to the backend
│       ├── pages/            # LandingPage.jsx, Workspace.jsx
│       └── components/
│           ├── landing/      # Hero, Earth (3D), Capabilities, ...
│           ├── workspace/    # ImageUpload, QueryInput, ResultPanel, ...
│           └── shared/       # Reveal, ErrorBoundary
│
├── backend/                  # FastAPI backend
│   ├── main.py               # /health, /upload, /analyze
│   ├── manager.py            # decides WHICH task a query is (routing)
│   ├── registry.py           # maps a task -> its specialist function
│   ├── vqa.py                # Visual Question Answering specialist (stub)
│   ├── caption.py            # Captioning specialist (stub)
│   ├── image_validator.py    # checks uploaded images
│   ├── requirements.txt
│   └── uploads/              # uploaded images are stored here at runtime
│
├── data/samples/             # (empty) put sample images here
├── models/                   # (empty) future model files
├── outputs/                  # (empty) future saved outputs
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (for the frontend)
- **Python 3.10+** (for the backend)

---

## Running the app

You need **two terminals**: one for the backend, one for the frontend.

### 1. Backend (FastAPI)

```bash
cd backend

# create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# start the server (http://localhost:8000)
uvicorn main:app --reload
```

Leave this running. You can open <http://localhost:8000/health> in a browser to
check it — it should return a small JSON status.

### 2. Frontend (React + Vite)

```bash
cd frontend

# install dependencies (first time only)
npm install

# start the dev server (http://localhost:5173)
npm run dev
```

Open <http://localhost:5173>. Click **Launch SatQuery** to reach the workspace,
upload an image, type a question, and run an analysis.

> The workspace shows a live status dot in the top bar. If it says
> "Backend offline", make sure the backend terminal (step 1) is running.

### Building for production

```bash
cd frontend
npm run build      # outputs to frontend/dist/
npm run preview    # serves the built site at http://localhost:4173
```

---

## How it works (the architecture)

The design principle is **one Manager + swappable Specialists**, with a
**registry** in the middle. There are no autonomous agents and no heavy agent
frameworks — just clear, readable functions.

```
   Your question
        │
        ▼
   manager.route(query)      →  returns a TASK label, e.g. "VQA" or "CAPTION"
        │
        ▼
   registry.get_specialist(task)  →  looks up the function for that task
        │
        ▼
   specialist.analyze(image, query)  →  returns a structured result (JSON)
        │
        ▼
   shown in the workspace (with an honest model-status line)
```

**Why this shape?** Because adding a new capability later is tiny and safe:

1. Write a new file, e.g. `backend/change.py`, with a function
   `analyze(image_path, query)`.
2. Import it in `registry.py`.
3. Add one line to the `SPECIALISTS` table and a keyword to `manager.py`.

No rewrites. The Manager never needs to know how specialists work, and the
specialists never need to know about each other.

---

## Current capabilities

| Capability | Task label | Status |
|-----------|------------|--------|
| Ask a question (VQA) | `VQA` | Active (pipeline only, model pending) |
| Describe a scene (Captioning) | `CAPTION` | Active (pipeline only, model pending) |
| Compare over time (Change) | `CHANGE` | Planned |
| Locate a region (Grounding) | `GROUNDING` | Planned |
| Optical + SAR fusion | `OPTICAL_SAR` | Planned |

---

## A note on the 3D Earth

The hero uses a **scientific-visualization globe** (a navy sphere with a cyan
latitude/longitude graticule, an atmospheric rim glow, and an orbiting
satellite) rather than a photo-textured Earth. This needs no external image
file, so it always builds and runs offline with no broken links, and it matches
the "scientific / orbital" visual direction. If a visitor prefers reduced
motion or their device can't run WebGL, it automatically falls back to a clean
static version.

---

## Roadmap (next phases)

1. **Model selection & hardware check** — decide which remote-sensing VLM fits
   the available hardware, then connect it inside `vqa.py` / `caption.py`.
2. **Change specialist** — compare two images across time.
3. **Grounding specialist** — locate and outline regions in the image.
4. **Optical + SAR fusion** — reason over two sensor types together.

Each of these slots into the existing architecture without changing the parts
that already work.
