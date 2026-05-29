-- 商品削除時に関連ログも自動削除
ALTER TABLE stock_logs
  DROP CONSTRAINT IF EXISTS stock_logs_product_id_fkey;

ALTER TABLE stock_logs
  ADD CONSTRAINT stock_logs_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
