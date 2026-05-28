-- 商品リサーチ用（チェックリスト・出品者リスク）
-- Supabase SQL Editor で実行

ALTER TABLE products ADD COLUMN IF NOT EXISTS research_notes text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_risk_score integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_rating_count integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_seller_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS research_checklist jsonb;

NOTIFY pgrst, 'reload schema';
