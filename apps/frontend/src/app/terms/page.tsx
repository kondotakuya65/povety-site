import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "Terms · Prosperax",
  description: "Terms of use for Prosperax mutual aid.",
};

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of use" eyebrow="Legal">
      <p>
        By using Prosperax you agree to these terms. Prosperax provides software that connects people
        who need help with people who choose to give. We do not guarantee that any request will be
        funded.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Your responsibilities</h2>
      <p>
        You must provide accurate information. You may have only one open help request at a time.
        Requests must be for your own genuine need and must follow our Acceptable use policy.
        Impersonation, stolen photos, or fundraising for others without proof are not allowed.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Payments</h2>
      <p>
        Donations are processed by Paystack. Funds are held until weekly payout for funded requests,
        or refunded when a goal is unmet or a donor requests a refund while held. Platform fees (if
        any) are shown at donation time and snapshotted on each gift.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Moderation</h2>
      <p>
        Prosperax may approve, reject, or remove requests that violate these terms or Acceptable use.
        We may suspend accounts involved in fraud or abuse.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Limitation</h2>
      <p>
        Prosperax is provided as-is. To the extent permitted by law, we are not liable for disputes
        between users, bank delays, or Paystack outages. Use{" "}
        <a href="/contact" className="text-brand hover:underline">
          Contact us
        </a>{" "}
        for operational issues.
      </p>
    </PolicyShell>
  );
}
