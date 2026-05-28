-- 問い合わせ（手動貼り付け → AI下書き → 人間確認）用
-- Supabase SQL Editor で実行

CREATE TABLE IF NOT EXISTS ebay_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_country TEXT,
  language TEXT DEFAULT 'en',
  order_id TEXT,
  ebay_item_id TEXT,
  product_title TEXT,
  message_original TEXT NOT NULL,
  message_japanese_summary TEXT,
  intent_category TEXT,
  risk_level TEXT DEFAULT 'medium',
  draft_reply_original TEXT,
  draft_reply_japanese TEXT,
  auto_reply_allowed BOOLEAN DEFAULT false,
  human_review_required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  human_edited_reply TEXT,
  edit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ebay_messages_created_at ON ebay_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebay_messages_status ON ebay_messages (status);

NOTIFY pgrst, 'reload schema';
