import puppeteer, { Page } from "puppeteer";

let page: Page;

export const getPage = async () => {
  if (page) return page;

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    args: [
      "--mute-audio",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  })

  page = await browser.newPage();
  const html = `
  <!doctype html>
  <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>   
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link onload="javascript:document.body.setAttribute('interloaded',true)" id="inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
      </head>
      <body>
        <p style="font-family: 'Inter', sans-serif;">Hello, world!</p>
      </body>
  </html>`;
    await page.setContent(html,{
        waitUntil: "networkidle0"
    });
    await page.waitForSelector("body[interloaded]");
    await page.waitForSelector("p");
    await page.addStyleTag({ content: '@page { size: A4; line-height: inherit; }' });
    await (new Promise((resolve) => setTimeout(resolve, 500)));
    
  return page;
};