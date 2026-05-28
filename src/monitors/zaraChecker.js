// src/monitors/zaraChecker.js
// ZARA の在庫状況をチェックする
// 公式APIがないため、Playwright（ヘッドレスブラウザ）でスクレイピング

// ※ Vercelでは Playwright が動かないため、
//   本番では外部サービス（Browserless.io等）を使うか、
//   AWS Lambda + Playwright Layer を使う
//   開発時はローカルPCで動作確認できます

/**
 * ZARA商品の在庫をチェック
 * @param {string} url - ZARA商品ページのURL
 * @returns {object} { inStock: boolean, price: number|null }
 */
export async function checkZaraStock(url) {
  try {
    // 軽量なアプローチ: fetchでHTMLを取得して解析
    // ZARAはJSレンダリングが必要な場合があるので、
    // うまくいかない場合は Playwright に切り替え
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });

    if (!response.ok) {
      return { inStock: null, price: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // 在庫状況を解析
    // ZARAのHTML構造は変わることがあるため、
    // 定期的にセレクタの確認が必要
    const outOfStock =
      html.includes("out-of-stock") ||
      html.includes("sold-out") ||
      html.includes("品切れ");

    // 価格を抽出（例: "¥5,990" or "€29.95"）
    const priceMatch = html.match(
      /\"price\":\s*(\d+\.?\d*)|[¥€$]\s*([\d,]+\.?\d*)/
    );
    const price = priceMatch
      ? parseFloat((priceMatch[1] || priceMatch[2]).replace(",", ""))
      : null;

    return {
      inStock: !outOfStock,
      price,
    };
  } catch (error) {
    console.error(`❌ ZARA チェックエラー:`, error.message);
    return { inStock: null, price: null, error: error.message };
  }
}

/**
 * Playwright版（より確実だがリソース消費が大きい）
 * ローカル開発時に使用
 */
export async function checkZaraStockWithBrowser(url) {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // 「カートに追加」ボタンがあるかチェック
    const addToCartButton = await page.$('button[data-qa-action="add-to-cart"]');
    const inStock = addToCartButton !== null;

    // 価格を取得
    const priceElement = await page.$('[data-qa-qualifier="price-amount-current"]');
    const priceText = priceElement ? await priceElement.textContent() : null;
    const price = priceText
      ? parseFloat(priceText.replace(/[^0-9.]/g, ""))
      : null;

    return { inStock, price };
  } catch (error) {
    console.error(`❌ ZARA Browser チェックエラー:`, error.message);
    return { inStock: null, price: null, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}
