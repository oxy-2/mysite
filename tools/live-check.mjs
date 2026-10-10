import { chromium } from 'playwright';

const url = process.argv[2] || 'https://oxygenated.uk/#deltavr';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// stats module boots async
await page.waitForTimeout(4000);

const snap = async (label, hash) => {
  if (hash) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(1500);
  }
  const data = await page.evaluate(() => ({
    stars: document.getElementById('ov-stars')?.textContent,
    forks: document.getElementById('ov-forks')?.textContent,
    commit: document.getElementById('ov-commit')?.textContent,
    hours: document.getElementById('ov-hours')?.textContent,
    total: document.getElementById('st-total')?.textContent,
    updated: document.getElementById('stats-updated')?.textContent,
    commits: [...document.querySelectorAll('#commit-rows .commit-row')].map(r => r.textContent.trim()).slice(0, 4),
    commitEmpty: document.querySelector('#commit-rows .empty-note')?.textContent,
    projs: [...document.querySelectorAll('#proj-rows .proj-row')].map(r => r.textContent.trim()),
    term: !!document.querySelector('.terminal-card, .term-body'),
  }));
  console.log('===', label, '===');
  console.log(JSON.stringify(data, null, 2));
};

await snap('overview', '#deltavr');
await snap('stats', '#stats');
await snap('gallery', '#gallery');

console.log('=== console ===');
console.log(logs.join('\n') || '(none)');

await page.screenshot({ path: 'live-stats.png', fullPage: false });
await browser.close();
