// app/api/cron/route.js
// Vercel Cron Jobs が15分ごとに呼び出すエンドポイント
// 在庫チェック → eBay自動停止 → LINE通知 を自動実行

import { runStockCheck } from "../../../src/monitors/stockEngine.js";

export const maxDuration = 300; // 最大5分（500品チェック用）

function isAuthorizedCron(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) return true;

  // cron-job.org 等: Bearer の打ち間違いを避ける代替ヘッダー
  const cronHeader = request.headers.get("x-cron-secret")?.trim();
  if (cronHeader === secret) return true;

  return false;
}

export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runStockCheck();
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("❌ Cron実行エラー:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
