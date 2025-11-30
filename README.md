# ETF Overlap

A Next.js web application for analyzing ETF overlaps using static data files.

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Fetch ETF holdings data:

```bash
# Fetch specific ETFs
npm run fetch QQQ SPY VTI

# Or fetch all popular ETFs
npm run fetch --all
```

This will generate JSON files in the `data/etfs/` directory containing holdings for each ETF.

### Data Source

This app fetches ETF holdings data from [ETFdb.com](https://etfdb.com) using headless browser fetching with Puppeteer. **No API key required!** The fetchr saves data as static JSON files that are bundled with the application.

**Storage:** Holdings are stored as static JSON files in the `data/` directory. To update ETF data, run the fetchr script and redeploy the application.

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### How to Use

1. **Type ETF tickers or names** in the autocomplete input:
   - Start typing and select from suggestions (e.g., "QQQ", "Invesco")
   - Press **Space** or **Enter** to add as a tag
   - Use **Backspace** to remove the last tag
   - Click **×** on tags to remove them
2. **Add 2 or more ETFs** (shown as blue tags)
3. Click **"Calculate Overlap"**
4. View the **heatmap** showing weighted overlap percentages
5. **Click any cell** in the heatmap to see detailed overlapping holdings
6. View the **Core Overlap** section to see holdings shared by ALL selected ETFs

**Note**: Only ETFs that have been fetchd will be available. If an ETF is not found, run `npm run fetch [TICKER]` to fetch its data, then restart the app.

### Build

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Updating ETF Data

ETF holdings data is stored as static files and needs to be updated periodically:

```bash
# Update specific ETFs
npm run fetch QQQ SPY

# Update all ETFs
npm run fetch --all
```

After updating data files:

1. Commit the changes: `git add data/ && git commit -m "Update ETF holdings"`
2. Rebuild the Docker image or redeploy the application

## Project Structure

```
etf-overlap/
├── app/                       # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── etf-holdings/      # Fetch ETF holdings from static files
│   │   ├── overlap/           # Calculate overlap matrix
│   │   └── search-etfs/       # Search ETFs for autocomplete
│   ├── page.tsx               # Main overlap analysis page
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/                # React components
│   └── ETFAutocomplete.tsx    # Autocomplete input with tags
├── lib/                       # Utilities
│   ├── data.ts                # Static data file functions
│   └── etf-list.ts            # Popular ETFs list
├── data/                      # Static ETF data (JSON files)
│   ├── index.json             # ETF metadata index
│   └── etfs/                  # Individual ETF holdings files
│       ├── QQQ.json
│       ├── SPY.json
│       └── ...
├── scripts/                   # Utility scripts
│   └── fetch-etfs.ts         # ETF fetchr script
├── k8s/                       # Kubernetes manifests
├── Dockerfile                 # Docker build configuration
├── next.config.js             # Next.js configuration
└── tsconfig.json              # TypeScript configuration
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **React 18** - UI library
- **Puppeteer** - Headless Chrome for web fetching (fetchr script only)
- **Cheerio** - HTML parsing
- **Static JSON Files** - Data storage
- **ETFdb.com** - Free ETF holdings data source (web fetching)

## Features

- **Smart Autocomplete**: Type-ahead search for ETF tickers and names with tag-based input
- **Overlap Analysis**: Compare multiple ETFs with weighted overlap heatmap
- **Core Overlap View**: See holdings shared by ALL selected ETFs (N-way intersection)
- **Pairwise Details**: Click any heatmap cell to see detailed overlap between two ETFs
- **Weighted Calculation**: Uses portfolio weight percentages for accurate overlap
- **Visual Heatmap**: Color-coded matrix showing overlap intensity
- **Static Data**: Fast, no database required
- **Profile Data**: Stores ETF metadata (issuer, expense ratio, AUM, etc.)
- **Web Fetching**: Fetches data from ETFdb.com using Puppeteer

## Deployment

See `DOCKER.md` for Docker deployment instructions and `k8s/README.md` for Kubernetes deployment.

## Alternative Data Sources

The current implementation fetchs ETFdb.com (free, no API key). Other options:

- **API Ninjas** - Free tier (first 3 holdings only)
- **AInvest API** - Free tier (top 10 holdings only)
- **Alpha Vantage** - Free tier (limited)
- **Intrinio** - Paid, comprehensive
- **Yahoo Finance** - Unofficial, may require fetching

To switch data sources, modify `scripts/fetch-etfs.ts` with your preferred provider's endpoint and response format.
