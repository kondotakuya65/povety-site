import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "About · Prosperax",
  description: "What Prosperax is and how mutual aid works here.",
};

export default function AboutPage() {
  return (
    <PolicyShell title="About Prosperax" eyebrow="About">
      <p>
        Prosperax is a Nigeria-first mutual aid platform. People publish real needs. Neighbours and
        friends send help through Paystack. Funds are held until weekly payout — not spent as a pool
        or investment product.
      </p>
      <p>
        We are peer-to-peer help, not crowdfunding campaigns with stretch goals, not charity
        fundraising for third parties without proof, and not a yield or investment scheme.
      </p>
      <p>
        English is the language of the product. Identity is verified with NIN or phone. Live requests
        show full name and photo; funded or closed requests become private.
      </p>
      <p>
        The platform fee is controlled by admin settings and currently starts at 0%. Payment
        processing fees from Paystack may still apply.
      </p>
    </PolicyShell>
  );
}
