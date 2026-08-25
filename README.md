# SATQUERY AI

> **Ask Earth. Get Answers.**

SATQUERY AI is an interactive vision-language intelligence workspace designed for satellite and aerial remote-sensing imagery. Users can upload high-resolution earth-observation images and ask natural-language questions to analyze visual features, extract qualitative insights, and visualize bounding-box targets directly on the scene.

---

## ✦ Overview

SATQUERY AI bridges the gap between raw remote-sensing imagery and actionable geospatial intelligence. Instead of relying exclusively on complex GIS desktop software or manual visual inspection, users can query their imagery in plain English. The platform processes the imagery and question, returning a structured intelligence report alongside precise spatial target overlays.

### Key Capabilities

- 🛰️ **Multimodal Imagery Input**: Support for satellite, aerial, and drone remote-sensing imagery.
- 🧠 **Vision-Language Analysis (VQA)**: Natural-language reasoning powered by Google Gemini Vision AI.
- 🎯 **Target Detection & Localization**: Accurate, non-overlapping bounding-box detection over identified features.
- 🌊 **Hydrological & Water Inspection**: Instant detection of lakes, rivers, reservoirs, and coastal features.
- 🌾 **Agricultural & Vegetation Mapping**: Identification of crop fields, land-use patterns, and vegetation cover.
- 🏙️ **Urban & Infrastructure Analysis**: Detection of settlements, buildings, transport networks, and industrial assets.
- 🚢 **Maritime & Vessel Querying**: Identification of maritime assets, vessels, and harbor infrastructure.
- 📊 **Structured Intelligence Summaries**: High-density findings accompanied by three factual qualitative observation cards.
- ⚡ **Asynchronous Express Backend**: Decoupled Node.js + Express API server with file streaming via Multer.
- 🔌 **Modular Service Architecture**: Isolated `vqa_service` layer designed to seamlessly integrate future capabilities (e.g., captioning, grounding, SAR analysis).
- 🖥️ **Geospatial Command-Center UI**: Dark space-tech interface featuring glassmorphic controls and interactive 3D Earth visualizations.

---

## 🖼️ Product Overview

```text
┌─────────────────────┐       multipart/form-data       ┌─────────────────────┐
│   Satellite Image   │ ──────────────────────────────> │   Express API       │
│   + Text Query      │                                 │     /api/vqa        │
└─────────────────────┘                                 └──────────┬──────────┘
           ▲                                                       │
           │                                                       ▼
┌──────────┴──────────┐                                 ┌─────────────────────┐
│   SATQUERY Client   │ <────────────────────────────── │    VQA Service      │
│  Interactive UI &   │    Structured JSON Analysis     │  Gemini Vision AI   │
│ Target Visualization│   (Text, Metrics, Targets)      └─────────────────────┘
└─────────────────────┘
```

The application workflow is streamlined into five steps:

$$\text{Upload Image} \longrightarrow \text{Submit Query} \longrightarrow \text{AI Reasoning} \longrightarrow \text{Visual Target Overlay} \longrightarrow \text{Export Report}$$

---

## 🧠 How It Works

1. **User Interaction**: The user uploads a satellite image and inputs a natural-language question (e.g., *"Is there a water body in this image?"*).
2. **Form Payload Handling**: The React frontend sends the image buffer and text query to the Express backend via `POST /api/vqa`.
3. **Modular VQA Service**: `vqa_service.js` formats the prompt, converts the image buffer, and invokes the Google Gemini Vision API (`gemini-3.6-flash`).
4. **Spatial & Qualitative Processing**: The AI model performs visual reasoning, generating:
   - A concise, evidence-based analytical answer.
   - 3 factual visual observation summary cards.
   - Normalized bounding box coordinates `[ymin, xmin, ymax, xmax]` for detected targets.
5. **Deduplication & Rendering**: The frontend applies an **Intersection over Union (IoU)** filter to eliminate duplicate bounding boxes, clamping coordinates within image boundaries, and renders interactive cyan target overlays over the image.

---

## 🔍 Example Queries & Responses

### Query 1: Water Resource Detection
> **User Question:** *"Is there a water body in this image?"*
> 
> **AI Finding:** *"Geospatial analysis confirms the presence of a primary reservoir in the central sector, bounded by agricultural land to the east."*
> 
> **Analysis Summary Cards:**
> - **Water Status:** Confirmed
> - **Feature Type:** Lake / Reservoir
> - **Boundary:** Well-Defined

### Query 2: Land-Use & Agricultural Survey
> **User Question:** *"Identify active agricultural fields and crop boundaries."*
> 
> **AI Finding:** *"Visible rectangular field parcels displaying varied spectral signatures consistent with active crop cultivation."*
> 
> **Analysis Summary Cards:**
> - **Land Cover:** Agricultural
> - **Parcels:** Cultivated Fields
> - **Vegetation:** High Density

---

## 🧩 Architecture

The project is structured with a clear separation of concerns between client, API router, and AI service providers:

```text
Frontend (React + Vite)
   │
   │ HTTP POST /api/vqa (Multipart Form)
   ▼
Express API Router (server/routes/vqa.js)
   │
   │ Image Buffer + Query String
   ▼
VQA Service (server/services/vqa_service.js)
   │
   │ Google Generative AI SDK
   ▼
Gemini 3.6 Flash Multimodal Model
```

By keeping the VQA model isolated inside `server/services/vqa_service.js`, additional analysis modules can be added in the future without modifying the frontend workspace:

```text
server/services/
├── vqa_service.js           <-- Currently Active
├── captioning_service.js    <-- Extensible
├── grounding_service.js     <-- Extensible
└── change_detection.js      <-- Extensible
```

---

## 🛠️ Technology Stack

| Layer | Technology / Library |
|---|---|
| **Frontend Framework** | React 19 + Vite |
| **Styling** | Vanilla CSS (Glassmorphic Dark Space-Tech Theme) |
| **3D Visualization** | Three.js + React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`) |
| **Animations** | Framer Motion |
| **Backend Runtime** | Node.js + Express 5 |
| **File Handling** | Multer (Memory Storage) |
| **AI Model Provider** | Google Gemini Vision API (`@google/generative-ai`) |
| **API Proxy** | Vite Proxy (`/api` -> `http://localhost:3001`) |

---

## 📁 Project Structure

```text
SATQUERY-AI/
├── public/                     # Static assets & satellite previews
├── server/                     # Express backend
│   ├── routes/                 # Express API routes
│   │   └── vqa.js              # POST /api/vqa handler
│   ├── services/               # Isolated AI service abstractions
│   │   └── vqa_service.js      # Gemini Vision integration & prompt logic
│   └── index.js                # Express server entry point (Port 3001)
├── src/                        # React frontend
│   ├── components/             # UI components
│   │   ├── workspace/          # Workspace components (ImageCanvas, QueryPanel, ResultsPanel, ImageUploader)
│   │   ├── EarthScene.jsx      # Interactive 3D revolving Earth canvas
│   │   └── ...
│   ├── pages/                  # Page routes (LandingPage, Workspace)
│   ├── App.jsx                 # Client router configuration
│   └── main.jsx                # Application mounting
├── .env                        # Environment variables (API Keys)
├── package.json                # Project dependencies and scripts
├── vite.config.js              # Vite configuration with API proxy
└── README.md                   # Project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/banupragathi/SatQuery--AI.git
cd SatQuery--AI
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory of the project:

```env
# Server Port Configuration
PORT=3001

# Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> [!CAUTION]
> **Security Notice:** Never commit your `.env` file or expose your `GEMINI_API_KEY` in frontend code. The Express backend securely consumes the key server-side.

### Step 4: Run the Application

Start both the Vite frontend client and Express backend server concurrently:

```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Express Backend API**: `http://localhost:3001`

---

## 🔌 API Overview

### `POST /api/vqa`

Processes an uploaded image and text query, returning structured visual intelligence.

#### Request Headers
`Content-Type: multipart/form-data`

#### Request Body
- `image`: Image file buffer (`PNG`, `JPEG`, `WEBP`)
- `query`: String containing the natural-language question

#### Response Schema (`200 OK`)

```json
{
  "success": true,
  "data": {
    "query": "Is there a water body in this image?",
    "timestamp": "01:15:30 PM",
    "text": "Geospatial analysis confirms the presence of a primary reservoir in the central sector...",
    "metrics": [
      { "label": "Water Status", "value": "Confirmed" },
      { "label": "Feature Type", "value": "Reservoir" },
      { "label": "Boundary", "value": "Defined" }
    ],
    "boundingBoxes": [
      {
        "label": "Water Body",
        "ymin": 250,
        "xmin": 300,
        "ymax": 650,
        "xmax": 750
      }
    ],
    "model": "gemini-3.6-flash"
  }
}
```

---

## 🎯 Target Visualization & IoU Deduplication

SatQuery AI spatial target boxes utilize normalized `[0, 1000]` coordinates mapped to percentage-based CSS positioning. 

To maintain clean visuals, the client executes an **Intersection over Union (IoU)** filter:

$$\text{IoU} = \frac{\text{Area of Overlap}}{\text{Area of Union}}$$

If multiple bounding boxes overlap with an $\text{IoU} > 0.3$, duplicates are automatically suppressed, ensuring a single, accurate target box per feature.

---

## 🌐 Use Cases

- 🌾 **Agricultural Monitoring**: Inspect crop health, field boundaries, and irrigation patterns.
- 💧 **Hydrological Surveying**: Identify water body expansion, reservoirs, and drainage networks.
- 🏙️ **Urban Planning**: Assess settlement growth, industrial zones, and land development.
- 🚢 **Maritime Security**: Analyze harbor activity, shipping lanes, and vessel presence.
- 🛰️ **Geospatial Education & Research**: Make remote-sensing data interactive for researchers and students.

---

## 🎨 Design Philosophy

SatQuery AI is designed to evoke a modern **space-tech mission control center**:

- **Command Center Aesthetic**: Deep space-black background (`#050810`) with vibrant cyan (`#38bdf8`) accents.
- **Glassmorphism**: Translucent panels with subtle border highlights and backdrop blurs.
- **High Information Density**: Dual-pane workspace putting the satellite imagery at the focal center.
- **Micro-Animations**: Smooth scanning laser overlays and interactive 3D WebGL Earth rotation.

---

## 🔐 Security

- **Server-Side API Key Storage**: Provider API keys are never bundled into the client build.
- **Input Validation**: Sanitized multipart uploads handled safely via Multer memory buffers.
- **Proxy Masking**: Vite proxy routes requests internally, hiding backend topology.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

```text
MIT License

Copyright (c) 2026 SatQuery AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## ⚡ SATQUERY AI

**Ask Earth. Get Answers.**  
*Making satellite imagery conversational through vision-language intelligence.*
