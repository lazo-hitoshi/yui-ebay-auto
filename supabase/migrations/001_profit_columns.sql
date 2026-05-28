-- Supabase SQL Editor で実行してください（利益率・簡易表示用）
-- 既にある列はスキップされます

ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_price numeric(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS domestic_shipping numeric(12, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS international_shipping numeric(12, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_cost numeric(12, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ebay_price_usd numeric(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS fx_rate numeric(10, 4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS expected_profit_jpy integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS profit_rate_percent numeric(6, 2);

-- API（PostgREST）のスキーマキャッシュを更新
NOTIFY pgrst, 'reload schema';
