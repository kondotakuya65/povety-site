import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcon";

const links: { href: string; label: string; icon: NavIconName }[] = [
  { href: "/about", label: "About", icon: "info" },
  { href: "/how-it-works", label: "How it works", icon: "steps" },
  { href: "/terms", label: "Terms", icon: "document" },
  { href: "/privacy", label: "Privacy", icon: "lock" },
  { href: "/refunds", label: "Refunds", icon: "refund" },
  { href: "/acceptable-use", label: "Acceptable use", icon: "check" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-brand-deep text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <BrandLogo tone="dark" size={40} />
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Mutual aid for Nigeria — peer help, held trust, weekly payout.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-2 text-white/75 transition hover:text-white"
            >
              <NavIcon name={link.icon} className="h-4 w-4 opacity-90" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-white/50 sm:px-6">
          © {new Date().getFullYear()} Prosperax. prosperax.org
        </p>
      </div>
    </footer>
  );
}
