// app/api/cron/route.js
// Vercel Cron Jobs が15分ごとに呼び出すエンドポイント
// 在庫チェック → eBay自動停止 → LINE通知 を自動実行

import { runStockCheck } from "../../../src/monitors/stockEngine.js";

export const maxDuration = 300; // 最大5分（500品チェック用）

export async function GET(request) {
  // Cron Secretで認証（外部から勝手に叩かれないように）
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
