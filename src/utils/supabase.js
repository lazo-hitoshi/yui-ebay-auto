// src/utils/supabase.js
// Supabase データベース接続
// 商品マスタ・在庫状態・チェックログを管理する

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ SUPABASE_URL と SUPABASE_SERVICE_KEY を .env.local に設定してください");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// -------------------------------------------
// テーブル構造（Supabaseで作成するSQL）:
// -------------------------------------------
// CREATE TABLE products (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   ebay_item_id TEXT NOT NULL,           -- eBayの出品ID
//   title TEXT NOT NULL,                  -- 商品名
//   supplier TEXT NOT NULL,               -- 仕入先: 'amazon' | 'zara' | 'yahoo' | 'mercari'
//   supplier_url TEXT NOT NULL,           -- 仕入先の商品URL
//   supplier_product_id TEXT,             -- 仕入先の商品ID (ASINなど)
//   ebay_price DECIMAL(10,2),             -- eBay販売価格
//   supplier_price DECIMAL(10,2),         -- 仕入価格
//   currency TEXT DEFAULT 'JPY',          -- 仕入通貨
//   is_in_stock BOOLEAN DEFAULT true,     -- 仕入先に在庫あるか
//   ebay_active BOOLEAN DEFAULT true,     -- eBay出品が有効か
//   last_checked_at TIMESTAMPTZ,          -- 最終チェック日時
//   created_at TIMESTAMPTZ DEFAULT now(),
//   updated_at TIMESTAMPTZ DEFAULT now()
// );
//
// CREATE TABLE stock_logs (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   product_id UUID REFERENCES products(id),
//   event TEXT NOT NULL,                  -- 'stockout' | 'restock' | 'price_change' | 'error'
//   details JSONB,                        -- 詳細情報
//   created_at TIMESTAMPTZ DEFAULT now()
// );
