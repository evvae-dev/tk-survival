async function playbackButton(page, name, action = 'click') {
  const header = page.locator('header [aria-label="기록 재생"]');
  if (await header.isVisible()) return header.getByRole('button', { name, exact: true })[action]();
  await page.getByRole('button', { name: '설정', exact: true }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name, exact: true })[action]();
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: '팝업 닫기' }).click();
}
module.exports = { playbackButton };
