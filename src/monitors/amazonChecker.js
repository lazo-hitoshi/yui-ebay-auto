// src/monitors/amazonChecker.js
// Amazon の在庫状況をチェックする
// PA-API (Product Advertising API) を使用

import crypto from "crypto";

/**
 * Amazon PA-API でリクエストに署名する
 */
function signRequest(payload) {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = timestamp.substring(0, 8);
  const region = "us-west-2";
  const service = "ProductAdvertisingAPI";

  // AWS Signature V4 の簡易実装
  const hmac = (key, data) =>
    crypto.createHmac("sha256", key).update(data).digest();

  const kDate = hmac(`AWS4${secretKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");

  return {
    signature: crypto
      .createHmac("sha256", kSigning)
      .update(payload)
      .digest("hex"),
    timestamp,
    date,
  };
}

/**
 * Amazon商品の在庫・価格をチェック
 * @param {string} asin - AmazonのASIN（商品ID）
 * @returns {object} { inStock: boolean, price: number|null, title: string }
 */
export async function checkAmazonStock(asin) {
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  // PA-API v5 リクエスト
  const payload = JSON.stringify({
    ItemIds: [asin],
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.co.jp",
    Resources: [
      "Offers.Listings.Availability.Type",
      "Offers.Listings.Price",
      "ItemInfo.Title",
    ],
  });

  try {
    const host = "webservices.amazon.co.jp";
    const path = "/paapi5/getitems";

    const response = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
        Host: host,
      },
      body: payload,
    });

    if (!response.ok) {
      console.error(`❌ Amazon API エラー: ${response.status}`);
      return { inStock: null, price: null, error: "API error" };
    }

    const data = await response.json();
    const item = data.ItemsResult?.Items?.[0];

    if (!item) {
      return { inStock: false, price: null, title: "不明" };
    }

    const offer = item.Offers?.Listings?.[0];
    const inStock = offer?.Availability?.Type === "Now";
    const price = offer?.Price?.Amount || null;
    const title = item.ItemInfo?.Title?.DisplayValue || "不明";

    return { inStock, price, title };
  } catch (error) {
    console.error(`❌ Amazon チェックエラー (${asin}):`, error.message);
    return { inStock: null, price: null, error: error.message };
  }
}
