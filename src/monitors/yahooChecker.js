// src/monitors/yahooChecker.js
// ヤフオクの在庫・出品状況をチェックする
// 公式APIがないため、商品ページのHTMLを解析する

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

/** 終了・落札・取消など（在庫なし扱い） */
const ENDED_TEXT_PATTERNS = [
  "オークションは終了しました",
  "このオークションは終了しました",
  "落札されました",
  "出品が取り消され",
  "オークションは取り消され",
  "この商品は削除され",
  "商品が見つかりません",
  "在庫切れ",
  "売り切れ",
  "SOLD OUT",
];

/** 購入・入札可能の目印 */
const ACTIVE_TEXT_PATTERNS = [
  "入札する",
  "即決価格で落札",
  "購入手続きへ",
  "残り時間",
  "現在の価格",
  "税込み",
];

/** 埋め込みJSONから終了フラグを探す */
function parseClosedFromJson(html) {
  const closedPatterns = [
    /"isClosed"\s*:\s*true/i,
    /"IsClosed"\s*:\s*true/i,
    /"isEnded"\s*:\s*true/i,
    /"IsEnd"\s*:\s*"?1"?/i,
    /"auctionStatus"\s*:\s*"closed"/i,
    /"status"\s*:\s*"closed"/i,
  ];

  for (const pattern of closedPatterns) {
    if (pattern.test(html)) return true;
  }

  const openPatterns = [
    /"isClosed"\s*:\s*false/i,
    /"IsClosed"\s*:\s*false/i,
    /"isEnded"\s*:\s*false/i,
  ];

  for (const pattern of openPatterns) {
    if (pattern.test(html)) return false;
  }

  return null;
}

/** 価格をHTMLから抽出（円） */
function extractPrice(html) {
  const jsonPrice = html.match(/"price"\s*:\s*(\d+)/i);
  if (jsonPrice) return parseInt(jsonPrice[1], 10);

  const taxIncluded = html.match(/(?:現在の価格|即決)[^¥]*¥\s*([\d,]+)/);
  if (taxIncluded) return parseInt(taxIncluded[1].replace(/,/g, ""), 10);

  const yenMatch = html.match(/¥\s*([\d,]+)/);
  if (yenMatch) return parseInt(yenMatch[1].replace(/,/g, ""), 10);

  return null;
}

function isYahooAuctionUrl(url) {
  try {
    const { hostname } = new URL(url);
    return (
      hostname.includes("auctions.yahoo.co.jp") ||
      hostname.includes("page.auctions.yahoo.co.jp")
    );
  } catch {
    return false;
  }
}

/**
 * ヤフオク商品の在庫（出品継続）をチェック
 * @param {string} url - ヤフオク商品ページのURL
 * @returns {object} { inStock: boolean|null, price: number|null, error?: string }
 */
export async function checkYahooStock(url) {
  if (!url || !isYahooAuctionUrl(url)) {
    return {
      inStock: null,
      price: null,
      error: "ヤフオクのURLではありません",
    };
  }

  try {
    const response = await fetch(url, { headers: FETCH_HEADERS });

    if (response.status === 404) {
      return { inStock: false, price: null, error: "ページが見つかりません" };
    }

    if (!response.ok) {
      return { inStock: null, price: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const price = extractPrice(html);

    const endedByText = ENDED_TEXT_PATTERNS.some((p) => html.includes(p));
    const activeByText = ACTIVE_TEXT_PATTERNS.some((p) => html.includes(p));
    const closedFromJson = parseClosedFromJson(html);

    if (endedByText || closedFromJson === true) {
      return { inStock: false, price };
    }

    if (activeByText || closedFromJson === false) {
      return { inStock: true, price };
    }

    return {
      inStock: null,
      price,
      error: "在庫状態を判定できませんでした（ページ構造の変更の可能性）",
    };
  } catch (error) {
    console.error("❌ ヤフオク チェックエラー:", error.message);
    return { inStock: null, price: null, error: error.message };
  }
}
