"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/tokenize", label: "Tokenize" },
    { href: "/trade", label: "Trade" },
  ];

  return (
    <div className="h-screen w-60 bg-[#1a1a1a] text-gray-300 flex flex-col p-4">
      <h1 className="text-2xl font-bold text-white mb-8">🏢 Real Estate</h1>
      <nav className="flex flex-col gap-3">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`p-2 rounded-md transition ${
              pathname === href ? "bg-[#2a2a2a] text-white" : "hover:bg-[#2a2a2a]"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
