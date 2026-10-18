async function dismissInitialChoice(page) {
  const pending = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tk-survival-game-v1'))?.state?.game?.introChoicePending === true; } catch { return false; } });
  if (!pending) return;
  const popup = page.locator('dialog[open]').filter({ has: page.getByRole('heading', { name: /갑자기 분위기 황건적/ }) });
  if (!(await popup.isVisible())) return;
  await popup.getByRole('button', { name: '팝업 닫기' }).click();
}
async function playbackButton(page, name, action = 'click') {
  await dismissInitialChoice(page);
  const header = page.locator('header [aria-label="기록 재생"]');
  if (await header.isVisible()) return header.getByRole('button', { name, exact: true })[action]();
  await page.getByRole('button', { name: '설정', exact: true }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name, exact: true })[action]();
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: '팝업 닫기' }).click();
}
module.exports = { playbackButton, dismissInitialChoice };
