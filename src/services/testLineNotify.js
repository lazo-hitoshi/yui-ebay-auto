// src/services/testLineNotify.js
// LINE通知のテスト用スクリプト
// 実行: npm run test-line

import "dotenv/config";
import { sendLineNotify } from "./lineNotify.js";

async function test() {
  console.log("📱 LINE通知テスト送信中...");
  await sendLineNotify(
    "\n🧪 テスト通知です！\neBay自動管理システムからの通知が正常に届いています。"
  );
  console.log("完了！LINEを確認してください。");
}

test();
