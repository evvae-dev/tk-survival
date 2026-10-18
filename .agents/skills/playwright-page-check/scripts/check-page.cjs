const fs = require('node:fs');
const path = require('node:path');
function loadPlaywright() {
  for (const name of ['playwright', '/opt/codex/cua_node/lib/node_modules/playwright', '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright']) {
    try { return require(name); } catch {}
  }
  throw new Error('Playwright is unavailable; install it only if permitted by the task.');
}
async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const options = { headless: true };
  if (fs.existsSync('/usr/bin/chromium')) options.executablePath = '/usr/bin/chromium';
  return chromium.launch(options);
}
module.exports = { launchBrowser };
if (require.main === module) (async () => {
  const [url, output] = process.argv.slice(2);
  if (!url || !output) throw new Error('Usage: check-page.cjs URL OUTPUT_DIRECTORY');
  fs.mkdirSync(output, { recursive: true });
  const browser = await launchBrowser();
  const results = [];
  try {
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src')),
      }));
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
      results.push({ name, status: response?.status(), errors, ...layout });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.status >= 400 || result.errors.length || result.overflow || result.brokenImages.length)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
