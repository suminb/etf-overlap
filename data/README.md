# ETF Data Directory

This directory contains static ETF holdings data stored as JSON files.

## Structure

```
data/
├── etfs/           # Individual ETF holdings files
│   ├── QQQ.json
│   ├── SPY.json
│   └── ...
└── index.json      # List of all available ETFs with metadata
```

## File Format

### index.json

Contains metadata for all ETFs:

```json
{
  "etfs": [
    {
      "symbol": "QQQ",
      "name": "Invesco QQQ Trust",
      "issuer": "Invesco",
      "expense_ratio": 0.0020,
      "aum": 200000000000,
      "last_updated": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### etfs/[SYMBOL].json

Contains holdings for a specific ETF:

```json
{
  "symbol": "QQQ",
  "name": "Invesco QQQ Trust",
  "last_updated": "2025-01-15T00:00:00Z",
  "holdings": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "weight": 8.5,
      "shares": 50000000
    }
  ]
}
```

## Updating Data

To update ETF holdings data:

1. Run the scraper script:
   ```bash
   npm run scrape -- QQQ SPY VTI
   ```

2. Review the generated/updated JSON files in `data/etfs/`

3. Commit the changes:
   ```bash
   git add data/
   git commit -m "Update ETF holdings data"
   ```

4. Rebuild and redeploy the application

## Data Source

All data is scraped from [ETFdb.com](https://etfdb.com) using the scraper script.
Data is typically updated monthly or quarterly as ETF holdings change.
