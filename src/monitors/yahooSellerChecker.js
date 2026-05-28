// ヤフオク出品者ページ / 商品ページから評価件数などを取得（簡易）

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

const RATING_COUNT_PATTERNS = [
  /show\/rating\?auc_user_id=[^"]+"[^>]*>(\d[\d,]*)</i,
  /_cl_link:rtg_ttl[^>]*>(\d[\d,]*)</i,
  /評価\s*(\d[\d,]*)\s*件/,
  /"ratingCount"\s*:\s*(\d+)/,
  /"totalRating"\s*:\s*(\d+)/,
];

const GOOD_RATE_PATTERNS = [
  /"goodRatingPercentage"\s*:\s*([\d.]+)/,
  /良い評価\s*([\d.]+)\s*%/,
  /評価率\s*([\d.]+)\s*%/,
];

export function isYahooAuctionUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes("yahoo.co.jp")) return false;
    return pathname.includes("/auction/");
  } catch {
    return false;
  }
}

function isYahooSellerUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes("yahoo.co.jp")) return false;
    return (
      pathname.includes("/seller/") ||
      pathname.includes("/user/") ||
      pathname.includes("/show/rating") ||
      hostname.includes("seller.auctions.yahoo.co.jp")
    );
  } catch {
    return false;
  }
}

function parseCount(html, patterns) {
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  }
  return null;
}

async function fetchHtml(url) {
  const response = await fetch(url.trim(), { headers: FETCH_HEADERS });
  return response;
}

/**
 * 商品ページHTMLから出品者リンクを探す
 */
export function extractSellerUrlFromAuctionHtml(html) {
  const patterns = [
    /href="(https:\/\/auctions\.yahoo\.co\.jp\/seller\/[^"]+)"/i,
    /href="(\/seller\/[^"]+)"/i,
    /"sellerId"\s*:\s*"([^"]+)"/i,
    /auc_user_id=([A-Za-z0-9_-]+)/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (!m) continue;
    const id = m[1];
    if (id.startsWith("http")) return id.split("?")[0];
    if (id.startsWith("/seller/")) {
      return `https://auctions.yahoo.co.jp${id.split("?")[0]}`;
    }
    return `https://auctions.yahoo.co.jp/seller/${id}`;
  }
  return null;
}

export function extractRatingFromAuctionHtml(html) {
  return parseCount(html, RATING_COUNT_PATTERNS);
}

/**
 * 出品者URL または 商品ページURL から評価情報を取得
 * @param {string} sellerUrlInput - 出品者欄（商品URLを入れても可）
 * @param {string} auctionUrlInput - 仕入先URL（商品ページ）
 */
export async function resolveYahooSellerInfo(sellerUrlInput, auctionUrlInput) {
  let auctionUrl = "";
  let sellerUrl = "";

  for (const raw of [sellerUrlInput?.trim(), auctionUrlInput?.trim()]) {
    if (!raw || !raw.includes("yahoo")) continue;
    if (isYahooAuctionUrl(raw)) {
      auctionUrl = auctionUrl || raw;
    } else if (isYahooSellerUrl(raw)) {
      sellerUrl = sellerUrl || raw;
    } else if (raw.includes("auctions.yahoo.co.jp")) {
      auctionUrl = auctionUrl || raw;
    }
  }

  let ratingFromAuction = null;

  if (!sellerUrl && auctionUrl) {
    try {
      const res = await fetchHtml(auctionUrl);
      if (!res.ok) {
        return {
          ok: false,
          error: `商品ページを開けませんでした（HTTP ${res.status}）`,
        };
      }
      const html = await res.text();
      sellerUrl = extractSellerUrlFromAuctionHtml(html);
      ratingFromAuction = extractRatingFromAuctionHtml(html);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  if (!sellerUrl && ratingFromAuction == null) {
    return {
      ok: false,
      error:
        "出品者情報を取得できませんでした。仕入先URL（商品ページ）を入れてから再度お試しください。",
    };
  }

  if (sellerUrl) {
    const stats = await fetchYahooSellerStats(sellerUrl);
    if (stats.ok) {
      if (stats.ratingCount == null && ratingFromAuction != null) {
        stats.ratingCount = ratingFromAuction;
      }
      stats.sellerUrl = sellerUrl;
      stats.sellerNameHint = stats.sellerNameHint || null;
      return stats;
    }
    if (ratingFromAuction != null) {
      return {
        ok: true,
        sellerUrl,
        ratingCount: ratingFromAuction,
        goodRatingPercent: null,
        suggestsLowRatingCount: ratingFromAuction < 10,
        note: "商品ページから評価件数のみ取得しました",
      };
    }
    return stats;
  }

  return {
    ok: true,
    sellerUrl: null,
    ratingCount: ratingFromAuction,
    goodRatingPercent: null,
    suggestsLowRatingCount: ratingFromAuction < 10,
    note: "商品ページから評価件数を取得しました",
  };
}

/**
 * @param {string} url - 出品者ページURL
 */
export async function fetchYahooSellerStats(url) {
  if (!url?.trim()) {
    return { ok: false, error: "URLを入力してください" };
  }

  if (isYahooAuctionUrl(url)) {
    return resolveYahooSellerInfo(url, url);
  }

  if (!isYahooSellerUrl(url)) {
    return {
      ok: false,
      error:
        "ヤフオクのURLを入力してください（商品ページまたは出品者ページ）",
    };
  }

  try {
    const response = await fetchHtml(url);

    if (response.status === 404) {
      return { ok: false, error: "ページが見つかりません" };
    }
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const ratingCount = parseCount(html, RATING_COUNT_PATTERNS);
    let goodRatingPercent = null;
    for (const pattern of GOOD_RATE_PATTERNS) {
      const m = html.match(pattern);
      if (m) {
        goodRatingPercent = parseFloat(m[1]);
        break;
      }
    }

    if (ratingCount == null && goodRatingPercent == null) {
      return {
        ok: false,
        error:
          "評価件数をページから読み取れませんでした。件数は手入力してください。",
        partial: true,
        sellerUrl: url,
      };
    }

    return {
      ok: true,
      sellerUrl: url,
      ratingCount,
      goodRatingPercent,
      suggestsLowRatingCount: ratingCount != null && ratingCount < 10,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** @deprecated resolveYahooSellerInfo を使用 */
export function guessSellerUrlFromAuction(auctionUrl) {
  return null;
}
