import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Price<span className="text-blue-600">My</span>Task
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/cost-guide"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cost Guides
          </Link>
        </nav>
      </div>
    </header>
  );
}
