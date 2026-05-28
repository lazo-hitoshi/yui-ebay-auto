import "./globals.css";

export const metadata = {
  title: "Yui eBay Auto 管理画面",
  description: "eBay 無在庫販売 在庫管理ダッシュボード",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
