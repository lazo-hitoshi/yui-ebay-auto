# 🛒 Yui eBay Auto — eBay無在庫販売 自動管理システム

## このシステムでできること

1. **在庫監視**: 仕入先（Amazon・ZARA・ヤフオク・メルカリ）の在庫を15分おきに自動チェック
2. **自動停止**: 在庫切れを検知したら eBay の出品を自動で停止（quantity=0）
3. **自動復活**: 在庫が戻ったら eBay の出品を自動で再開
4. **LINE通知**: 在庫変動があったらすぐにLINEでお知らせ
5. **ログ管理**: 全ての在庫変動を記録して、あとから確認できる

---

## 🚀 セットアップ手順（ステップバイステップ）

### ステップ1: 必要なソフトをインストール

#### Node.js をインストール
1. https://nodejs.org にアクセス
2. 「LTS」と書いてある緑のボタンをクリック
3. ダウンロードしたファイルを開いてインストール（全部「次へ」でOK）
4. 確認：ターミナル（Mac）またはコマンドプロンプト（Windows）で以下を入力
   ```
   node --version
   ```
   → v20.x.x のような数字が出ればOK

#### Cursor をインストール
1. https://cursor.com にアクセス
2. 「Download」ボタンをクリック
3. ダウンロードしたファイルを開いてインストール

### ステップ2: プロジェクトをPCに準備

1. Cursor を開く
2. メニュー「File」→「Open Folder」
3. デスクトップなど好きな場所に「yui-ebay-auto」フォルダを作って選択
4. このプロジェクトの全ファイルをそのフォルダにコピー
5. Cursor の画面下部にある「Terminal」をクリック（なければ View → Terminal）
6. ターミナルに以下を入力してEnter:
   ```
   npm install
   ```
   → パッケージのインストールが始まります（2-3分かかる場合あり）

### ステップ3: 各サービスのAPIキーを取得

#### 3-1. Supabase（データベース）
1. https://supabase.com にアクセス → 「Start your project」
2. GitHubアカウントでログイン
3. 「New Project」をクリック
4. Project name: 「yui-ebay-auto」/ Password: 適当に設定 / Region: 「Northeast Asia (Tokyo)」
5. プロジェクトが作成されたら「Settings」→「API」
6. 「Project URL」と「anon public key」と「service_role key」をメモ
7. 左メニュー「SQL Editor」をクリック
8. 以下のSQLをコピーして貼り付け、「Run」を押す：

```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ebay_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  supplier TEXT NOT NULL,
  supplier_url TEXT NOT NULL,
  supplier_product_id TEXT,
  ebay_price DECIMAL(10,2),
  supplier_price DECIMAL(10,2),
  currency TEXT DEFAULT 'JPY',
  is_in_stock BOOLEAN DEFAULT true,
  ebay_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3-2. eBay Developer Program
1. https://developer.ebay.com にアクセス → 「Join」
2. アカウント作成 → Application を作成
3. 「Application Keys」から App ID、Cert ID、Dev ID をメモ
4. 最初は「Sandbox」環境でテスト → 問題なければ「Production」に切り替え

#### 3-3. Amazon PA-API
1. https://affiliate.amazon.co.jp に登録（Amazonアソシエイト）
2. 登録完了後「ツール」→「Product Advertising API」
3. アクセスキーとシークレットキーをメモ

#### 3-4. LINE Notify
1. https://notify-bot.line.me/my/ にアクセス
2. LINEアカウントでログイン
3. 「トークンを発行する」をクリック
4. トークン名: 「eBay在庫アラート」
5. 通知を受け取るトークルーム: 自分用に「1:1でLINE Notifyから通知を受け取る」を選択
6. 「発行する」→ 表示されたトークンをメモ（この画面を閉じると二度と見れません！）

### ステップ4: 環境変数を設定

1. Cursor でプロジェクトフォルダを開いた状態で
2. `.env.example` ファイルを右クリック →「Copy」
3. 貼り付けて名前を `.env.local` に変更
4. `.env.local` を開いて、ステップ3でメモした各キーを入力
5. 保存（Ctrl+S / Cmd+S）

### ステップ5: 商品データを登録

Supabase の管理画面（ダッシュボード）から直接登録できます：

1. https://supabase.com でプロジェクトを開く
2. 左メニュー「Table Editor」→「products」テーブル
3. 「Insert row」で商品を1つずつ登録

登録する情報：
- `ebay_item_id`: eBayの出品番号（例: 123456789012）
- `title`: 商品名（例: ZARA ブラックジャケット M）
- `supplier`: 仕入先（amazon / zara / yahoo / mercari）
- `supplier_url`: 仕入先の商品ページURL
- `supplier_product_id`: AmazonのASINなど（Amazonの場合のみ必要）

最初は2-3品だけ登録してテストしましょう。

### ステップ6: ローカルでテスト実行

Cursor のターミナルで：

```bash
# 在庫チェックを手動実行
npm run check-stock

# LINE通知のテスト
npm run test-line
```

### ステップ7: Vercel にデプロイ

1. GitHubにリポジトリを作成（ai-demo1と同じ要領）
2. Cursor のターミナルで：
   ```
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/あなたのユーザー名/yui-ebay-auto.git
   git push -u origin main
   ```
3. https://vercel.com にログイン
4. 「Add New」→「Project」
5. GitHubリポジトリ「yui-ebay-auto」を選択
6. 「Environment Variables」に `.env.local` の内容をすべて追加
7. 「Deploy」をクリック

デプロイ完了後、Vercel の Cron Jobs が15分ごとに自動で在庫チェックを実行します。

---

## 📁 ファイル構成

```
yui-ebay-auto/
├── app/
│   └── api/
│       └── cron/
│           └── route.js          ← Vercelが15分ごとに呼ぶ
├── src/
│   ├── monitors/
│   │   ├── stockEngine.js        ← メインの在庫チェックエンジン
│   │   ├── amazonChecker.js      ← Amazon在庫チェック
│   │   └── zaraChecker.js        ← ZARA在庫チェック
│   ├── services/
│   │   ├── ebayApi.js            ← eBay出品の停止/再開
│   │   └── lineNotify.js         ← LINE通知
│   └── utils/
│       └── supabase.js           ← データベース接続
├── .env.example                  ← 環境変数テンプレート
├── vercel.json                   ← Cronジョブ設定
├── package.json                  ← プロジェクト設定
└── README.md                     ← このファイル
```

---

## ❓ 困ったときは

- **Cursor で何をすればいいかわからない**: Cmd+I（またはCtrl+I）を押して、
  やりたいことを日本語で入力すれば、AIがコードを書いてくれます
- **エラーが出た**: エラーメッセージをそのままClaude（このチャット）に貼り付けてください
- **商品の登録が面倒**: 将来的にCSVファイルで一括登録できるツールも追加予定です
