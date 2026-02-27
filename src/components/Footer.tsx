import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <Link href="/" className="text-lg font-bold text-gray-900">
              Price<span className="text-blue-600">My</span>Task
            </Link>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
              AI-powered price estimates for home services. Know what it should
              cost before you hire.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/cost-guide"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    Cost Guides
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Disclaimer: All price estimates are approximate and based on
            national averages adjusted for your region. Actual costs may vary
            based on specific project requirements, contractor availability, and
            local market conditions. PriceMyTask is not a contractor and does not
            perform any services. Always get multiple quotes before hiring.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            &copy; {new Date().getFullYear()} PriceMyTask. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
