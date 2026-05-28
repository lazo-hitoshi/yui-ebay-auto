// src/services/ebayApi.js
// eBay API連携 - 出品の停止・再開を自動で行う

/**
 * eBay OAuth トークンを取得（Client Credentials）
 */
async function getEbayToken() {
  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString("base64");

  const baseUrl =
    process.env.EBAY_ENVIRONMENT === "production"
      ? "https://api.ebay.com"
      : "https://api.sandbox.ebay.com";

  const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * eBayの出品を停止する（数量を0にする）
 * @param {string} itemId - eBayの出品ID
 */
export async function stopEbayListing(itemId) {
  try {
    const token = await getEbayToken();
    const baseUrl =
      process.env.EBAY_ENVIRONMENT === "production"
        ? "https://api.ebay.com"
        : "https://api.sandbox.ebay.com";

    // Inventory API で数量を0に設定
    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/offer/${itemId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify({
          availableQuantity: 0,
        }),
      }
    );

    if (response.ok) {
      console.log(`✅ eBay出品停止: ${itemId}`);
      return { success: true };
    } else {
      const error = await response.json();
      console.error(`❌ eBay出品停止失敗: ${itemId}`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`❌ eBay API エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * eBayの出品を再開する（数量を1に戻す）
 * @param {string} itemId - eBayの出品ID
 */
export async function restartEbayListing(itemId) {
  try {
    const token = await getEbayToken();
    const baseUrl =
      process.env.EBAY_ENVIRONMENT === "production"
        ? "https://api.ebay.com"
        : "https://api.sandbox.ebay.com";

    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/offer/${itemId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify({
          availableQuantity: 1,
        }),
      }
    );

    if (response.ok) {
      console.log(`✅ eBay出品再開: ${itemId}`);
      return { success: true };
    } else {
      const error = await response.json();
      console.error(`❌ eBay出品再開失敗: ${itemId}`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`❌ eBay API エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}
