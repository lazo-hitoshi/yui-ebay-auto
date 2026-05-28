// src/services/testSupabase.js
// Supabase 接続テスト
// 実行: npm run test-supabase

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function formatFetchCause(err) {
  const cause = err?.cause;
  if (!cause) return null;
  return `${cause.code || "UNKNOWN"}: ${cause.message || cause}`;
}

async function main() {
  console.log("=== Supabase 接続テスト ===\n");

  if (!url || !serviceKey) {
    console.error("❌ .env に SUPABASE_URL と SUPABASE_SERVICE_KEY がありません");
    process.exit(1);
  }

  console.log("SUPABASE_URL:", url);
  console.log("SERVICE_KEY 長さ:", serviceKey.length, "文字");
  console.log("SERVICE_KEY 先頭:", serviceKey.slice(0, 12) + "...\n");

  // 1. 素の fetch テスト
  console.log("1) fetch テスト...");
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    console.log("   HTTP ステータス:", res.status);
    const body = await res.text();
    console.log("   レスポンス:", body.slice(0, 200));
    if (res.status === 401) {
      console.log("\n💡 401 → 秘密の鍵が間違い/不完全。API Keys で Reveal して全文コピー");
    }
  } catch (err) {
    console.error("   ❌ fetch 失敗:", err.message);
    const cause = formatFetchCause(err);
    if (cause) console.error("   詳細:", cause);

    if (cause?.includes("ENOTFOUND")) {
      console.log("\n💡 ENOTFOUND → SUPABASE_URL の Project ID が間違い");
      console.log("   Supabase ダッシュボードの Copy ボタンで URL を再コピー");
    }
    if (cause?.includes("UNABLE_TO_VERIFY") || cause?.includes("certificate")) {
      console.log("\n💡 SSL 証明書エラー → ウイルス対策/プロキシの HTTPS 検査を確認");
      console.log("   別ネットワーク（テザリング）で再試行");
    }
  }

  // 2. supabase-js テスト
  console.log("\n2) supabase-js テスト...");
  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.from("products").select("id,title").limit(3);

  if (error) {
    console.error("   ❌ エラー:", error.message);
    if (error.details) console.error("   詳細:", error.details);
  } else {
    console.log("   ✅ 接続成功。商品数:", data.length);
    if (data.length > 0) {
      data.forEach((p) => console.log(`   - ${p.title} (${p.id})`));
    } else {
      console.log("   （products テーブルは空です → Table Editor で商品を追加）");
    }
  }

  console.log("\n=== テスト完了 ===");
}

main().catch(console.error);
