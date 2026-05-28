import Link from "next/link";

export default function AppNav({ active }) {
  return (
    <nav className="app-nav">
      <Link href="/" className={active === "products" ? "active" : ""}>
        商品・在庫
      </Link>
      <Link href="/messages" className={active === "messages" ? "active" : ""}>
        問い合わせ
      </Link>
    </nav>
  );
}
