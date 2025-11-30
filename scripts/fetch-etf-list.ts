#!/usr/bin/env tsx
/**
 * ETF List Fetcher
 *
 * Fetches a list of all ETFs from ETFdb.com and saves to a text file
 *
 * Usage:
 *   npm run fetch-etf-list
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface ETFListItem {
  symbol: string;
  name: string;
}

async function fetchETFList(): Promise<ETFListItem[]> {
  console.log('Fetching ETF list from ETFdb.com...\n');

  // Try to find Chrome on macOS
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  let executablePath: string | undefined = undefined;
  for (const path of chromePaths) {
    try {
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log(`Using browser: ${path}\n`);
        break;
      }
    } catch (e) {
      // Continue checking
    }
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const allETFs: ETFListItem[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // ETFdb.com has a screener that shows all ETFs
    const url = 'https://etfdb.com/screener/';
    console.log(`Loading ${url}...`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for the table to load
    await page.waitForTimeout(5000);

    console.log('Extracting ETF data...\n');

    // Get the HTML content
    const html = await page.content();

    // Parse with Cheerio
    const cheerioModule = await import('cheerio');
    const cheerio = 'default' in cheerioModule ? cheerioModule.default : cheerioModule;
    const $ = cheerio.load(html);

    // ETFdb screener table - look for links to ETF pages
    $('table tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length > 0) {
        // First cell usually contains the ETF symbol as a link
        const symbolLink = $(cells[0]).find('a');
        const symbol = symbolLink.text().trim();
        const name = $(cells[1]).text().trim(); // Second cell is usually the name

        if (symbol && symbol.length > 0 && symbol.match(/^[A-Z]{2,6}$/)) {
          allETFs.push({ symbol, name: name || symbol });
        }
      }
    });

    // If the screener doesn't work, try the ETF list page
    if (allETFs.length === 0) {
      console.log('Trying alternative method...\n');

      await page.goto('https://etfdb.com/etfs/', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      await page.waitForTimeout(5000);

      const html2 = await page.content();
      const $2 = cheerio.load(html2);

      $2('a[href*="/etf/"]').each((_, link) => {
        const href = $(link).attr('href') || '';
        const match = href.match(/\/etf\/([A-Z]{2,6})\//);
        if (match) {
          const symbol = match[1];
          const name = $(link).text().trim();
          if (!allETFs.find(e => e.symbol === symbol)) {
            allETFs.push({ symbol, name: name || symbol });
          }
        }
      });
    }

    await browser.close();

    console.log(`Found ${allETFs.length} ETFs\n`);
    return allETFs;

  } catch (error) {
    await browser.close();
    console.error('Error fetching ETF list:', error);
    throw error;
  }
}

async function main() {
  try {
    const etfs = await fetchETFList();

    if (etfs.length === 0) {
      console.error('No ETFs found. ETFdb.com may have changed their page structure.');
      process.exit(1);
    }

    // Sort alphabetically
    etfs.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // Save to text file (just symbols)
    const symbolsFile = path.join(process.cwd(), 'data', 'all-etfs.txt');
    const symbolsList = etfs.map(e => e.symbol).join('\n');
    fs.writeFileSync(symbolsFile, symbolsList);
    console.log(`✓ Saved ${etfs.length} ETF symbols to: ${symbolsFile}\n`);

    // Save detailed list with names
    const detailedFile = path.join(process.cwd(), 'data', 'all-etfs-detailed.txt');
    const detailedList = etfs.map(e => `${e.symbol}\t${e.name}`).join('\n');
    fs.writeFileSync(detailedFile, detailedList);
    console.log(`✓ Saved detailed ETF list to: ${detailedFile}\n`);

    // Save as JSON
    const jsonFile = path.join(process.cwd(), 'data', 'all-etfs.json');
    fs.writeFileSync(jsonFile, JSON.stringify(etfs, null, 2));
    console.log(`✓ Saved ETF list as JSON to: ${jsonFile}\n`);

    console.log('Done!');

  } catch (error) {
    console.error('Failed to fetch ETF list:', error);
    process.exit(1);
  }
}

main().catch(console.error);
