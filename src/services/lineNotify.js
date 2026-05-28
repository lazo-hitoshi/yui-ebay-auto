// src/services/lineNotify.js
// LINE Messaging API（Push）で通知を送る

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

function logPushFallback(message) {
  console.log("[LINE push 失敗・フォールバック]", message);
}

/**
 * LINEに通知を送信する
 * @param {string} message - 送信するメッセージ
 */
export async function sendLineNotify(message) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_USER_ID;

  if (!channelAccessToken || !userId) {
    console.error(
      "⚠️ LINE_CHANNEL_ACCESS_TOKEN または LINE_USER_ID が設定されていません"
    );
    return;
  }

  const text = typeof message === "string" ? message.trim() : String(message);
  const payload = {
    to: userId,
    messages: [{ type: "text", text }],
  };

  try {
    const response = await fetch(PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ LINE通知送信成功");
      return;
    }

    const errBody = await response.text().catch(() => "");
    console.error(
      "❌ LINE通知送信失敗:",
      response.status,
      errBody || "(レスポンスボディなし)"
    );
    logPushFallback(text);
  } catch (error) {
    console.error("❌ LINE通知エラー:", error.message);
    logPushFallback(text);
  }
}

/**
 * 在庫切れアラートを送信
 * @param {object} product - 商品情報
 */
export async function sendStockoutAlert(product) {
  const message = `
🚨 在庫切れ検知！

商品: ${product.title}
仕入先: ${product.supplier}
eBay ID: ${product.ebay_item_id}

→ eBay出品を自動停止しました。
仕入先URL: ${product.supplier_url}`;

  await sendLineNotify(message);
}

/**
 * 在庫復活通知を送信
 * @param {object} product - 商品情報
 */
/**
 * リサーチ「要確認」通知（出品者リスクスコア60以上）
 */
/**
 * eBay問い合わせ・要確認（高リスク）
 */
export async function sendInquiryReviewAlert(msg) {
  const intent = msg.intent_category || "—";
  const text = `
【eBay 問い合わせ：要確認】

購入者国: ${msg.buyer_country || "—"}
言語: ${msg.language || "—"}
商品: ${msg.product_title || msg.ebay_item_id || "—"}
分類: ${intent}
リスク: ${msg.risk_level || "—"}

日本語要約:
${msg.message_japanese_summary || "—"}

購入者原文（抜粋）:
${(msg.message_original || "").slice(0, 200)}${(msg.message_original || "").length > 200 ? "…" : ""}

AI返信案（参考・送信前に必ず確認）:
${(msg.draft_reply_original || "").slice(0, 300)}

対応: 手動確認してください。`;

  await sendLineNotify(text);
}

export async function sendResearchReviewAlert(product, { score, reasons }) {
  const reasonLines = reasons?.length
    ? reasons.map((r) => `・${r}`).join("\n")
    : "・リスクスコアが基準を超えました";

  const message = `
【仕入れ候補：要確認】

商品: ${product.title}
仕入先: ${product.supplier}
価格/仕入れ: ${product.supplier_price != null ? `${product.supplier_price}円` : "—"}
出品者評価: ${product.seller_rating_count != null ? `${product.seller_rating_count} 件` : "—"}
リスクスコア: ${score} 点

リスク理由:
${reasonLines}

判定: 要確認
推奨: 自動出品しない（人間が最終判断）

仕入先URL: ${product.supplier_url}`;

  await sendLineNotify(message);
}

export async function sendRestockAlert(product) {
  const message = `
✅ 在庫復活！

商品: ${product.title}
仕入先: ${product.supplier}

→ eBay出品を再開しました。`;

  await sendLineNotify(message);
}
