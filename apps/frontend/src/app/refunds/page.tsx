import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "Refunds · Prosperax",
  description: "When Prosperax refunds gifts.",
};

export default function RefundsPage() {
  return (
    <PolicyShell title="Refunds" eyebrow="Money">
      <h2 className="font-display text-xl font-semibold text-ink">While gifts are held</h2>
      <p>
        Donors may request a refund for held donations within the configured window (default 7 days)
        from their account, as long as the gift has not been paid out.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Unmet goals</h2>
      <p>
        If a live request does not reach its goal by the deadline, Prosperax closes the request after
        a short business-day delay and refunds held gifts to donors.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">After payout</h2>
      <p>
        Once a gift is paid out to the recipient, automatic refunds are not available. Manual
        exceptions are rare and handled by admin only.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Failed or duplicate charges</h2>
      <p>
        Confirmed failed or duplicate charges are refunded when identified. Refunds are processed
        through Paystack and may take several business days to appear on your statement.
      </p>
    </PolicyShell>
  );
}
