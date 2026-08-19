import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "Privacy · Prosperax",
  description: "How Prosperax handles personal data.",
};

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy" eyebrow="Legal">
      <p>
        Prosperax collects the data needed to run mutual aid: phone number for login, optional email
        for receipts, help-request story and photo, verification details (NIN or phone), and bank
        details for payouts.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">What is public</h2>
      <p>
        While a request is live, full name and photo are shown publicly with the story and progress.
        When a request is funded or closed, it becomes private and is no longer listed publicly.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Payments</h2>
      <p>
        Card and bank payment details are handled by Paystack. Prosperax stores donation amounts,
        status, and references needed for hold, payout, and refund — not full card numbers.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">Retention & access</h2>
      <p>
        We keep records required for payouts, refunds, and audit. Admins can review requests and
        money operations. You can update email and bank details from your account while a request is
        open.
      </p>
      <p>
        For privacy questions related to prosperax.org, use{" "}
        <a href="/contact" className="text-brand hover:underline">
          Contact us
        </a>
        .
      </p>
    </PolicyShell>
  );
}
