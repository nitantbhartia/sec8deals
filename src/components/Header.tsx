import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-tight text-slate-900">
          Sec8<span className="text-blue-700">Deals</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/section8" className="hover:text-slate-900">
            Dashboard
          </Link>
          <a href="/api/section8/deals" className="hover:text-slate-900">
            API
          </a>
        </nav>
      </div>
    </header>
  );
}
