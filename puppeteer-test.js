const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/me')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { name: 'Test User', sangh: 'Test Sangh' }, registration: null })
      });
    } else {
      request.continue();
    }
  });

  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 Not Found:', response.url());
    }
  });

  console.log('Navigating to http://localhost:5000/home.html');
  await page.goto('http://localhost:5000/home.html', { waitUntil: 'networkidle0' });

  console.log('Clicking the Panchang button...');
  await page.click('#open-panchang-btn');

  // Wait a moment
  await new Promise(r => setTimeout(r, 1000));
  
  // Check if modal is visible
  const isVisible = await page.evaluate(() => {
    const modal = document.getElementById('panchang-modal');
    const rect = modal.getBoundingClientRect();
    const style = window.getComputedStyle(modal);
    return {
      display: style.display,
      position: style.position,
      width: style.width,
      height: style.height,
      outerHTML: modal.outerHTML,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  });
  
  console.log('Modal properties after click:', isVisible);

  await page.screenshot({ path: 'd:\\Design Ville\\Jain_Talks\\puppeteer-screenshot.png' });
  console.log('Saved screenshot to puppeteer-screenshot.png');

  await browser.close();
})();
