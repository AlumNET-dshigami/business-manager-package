"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { APP_CONFIG } from "@/lib/config";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/deals", label: "案件管理" },
    { href: "/contractors", label: "業務委託・経費管理" },
    { href: "/pl", label: "PL管理" },
    { href: "/clients", label: "クライアントリスト" },
    { href: "/invoices", label: "請求書" },
  ];

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b">
      <div className="px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-1 sm:gap-4">
          <Link href="/deals" className="font-bold text-lg text-blue-600 whitespace-nowrap mr-2">
            {APP_CONFIG.appName}
          </Link>
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  pathname.startsWith(l.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="hidden sm:block text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t px-4 py-2 space-y-1 bg-white">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium px-3 py-2 rounded-md ${
                pathname.startsWith(l.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="block w-full text-left text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            ログアウト
          </button>
        </div>
      )}
    </nav>
  );
}
