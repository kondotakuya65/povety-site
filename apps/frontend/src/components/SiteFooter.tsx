import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const links = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/acceptable-use", label: "Acceptable use" },
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
        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/75 transition hover:text-white"
            >
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
