"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;
  const tabs = [
    { href: base, label: "Home", icon: "◇", exact: true },
    { href: `${base}/expenses`, label: "Expenses", icon: "☰" },
    { href: `${base}/members`, label: "Members", icon: "☺" },
    { href: `${base}/settings`, label: "Settings", icon: "⚙" },
  ];
  return (
    <nav className="nav">
      {tabs.map((t) => {
        const on = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : ""}>
            <span className="i">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
