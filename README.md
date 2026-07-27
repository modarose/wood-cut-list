# CUT // LIST 8000 — Woodworking 2D Cut Estimator

> A minimalist, high-performance 2D Guillotine cutting stock optimizer and sheet visualizer for woodworkers, cabinet makers, and DIYers. Designed with a clean, functional aesthetic inspired by Dieter Rams & Braun ("Less, but better").

![CUT LIST 8000 Preview](public/preview-banner.png) <!-- Optional preview image -->

---

## ✨ Features

- **🪚 2D Guillotine Cut Stock Optimization**: Instant offline-first bin packing calculation running directly in the browser (Best Short Side First & Best Area First heuristics).
- **📐 Dual Unit Support**: Seamless toggle between **Metric (`mm`)** and **Imperial (`inches`)** with automatic fractional rendering (`48 1/2"`).
- **⚡ Saw Blade Kerf & Edge Trim Compensation**: Specify exact saw blade width (`3.0 mm` / `1/8"`) and panel edge cleanup margins to ensure real-world cut accuracy.
- **🪵 Grain Alignment Locks**: Toggle rotation rules per piece (`Allow Rotation` vs `Fixed Grain Direction`).
- **📊 Clean Dieter Rams Instrument Displays**: Gauge panels for Total Sheets Needed, Material Yield %, Scrap %, Kerf Loss %, and Placed Parts count.
- **🎨 Interactive SVG Visualizer**: Full-screen layout diagram with zoom, pan, fit-to-screen, piece hover tooltips, and offcut scrap hatching.
- **📋 Workshop Cut Sequence Guide**: Step-by-step table saw rip-cut and cross-cut instructions with interactive check-off toggles for shop floor use.
- **📂 Presets & Export**: Built-in project templates (Bookshelf, Kitchen Base Cabinet, Workshop Bench), preset sheet sizes, and CSV export.

---

## 🛠️ Technology Stack

- **Core**: React 19 + Vite
- **Styling**: Vanilla CSS with custom Dieter Rams design tokens (`index.css`)
- **Icons**: Lucide React
- **Graphics**: Interactive SVG Rendering Engine

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### Installation & Running

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wood-cut-list.git
   cd wood-cut-list
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

---

## 📦 Build & Deployment

To create an optimized production build:

```bash
npm run build
```

The output will be generated in the `dist/` directory.

### Deploy to Vercel (Recommended)

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Vercel will automatically detect **Vite** and deploy your site in seconds!

---

## 📄 License

MIT License — Feel free to use, modify, and build upon this project!
