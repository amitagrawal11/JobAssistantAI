export async function openDashboard(section: 'profile' | 'documents' | 'applications' | 'settings' = 'profile') {
  const url = browser.runtime.getURL(`/dashboard.html#${section}`);
  await browser.tabs.create({ url });
}
