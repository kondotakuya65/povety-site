import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "How it works · Prosperax",
  description: "Hold, weekly payout, and refunds on Prosperax.",
};

export default function HowItWorksPage() {
  return (
    <PolicyShell title="How it works" eyebrow="Guide">
      <h2 className="font-display text-xl font-semibold text-ink">1. Request help</h2>
      <p>
        Log in with phone OTP. Create one open request with your story, photo, verification (NIN or
        phone), and Nigerian bank details. Admin reviews before the request goes live.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">2. Send help</h2>
      <p>
        Browse live needs and donate with Paystack. Your gift is marked held after payment confirms.
        Progress on the request shows the net amount reserved for the recipient after any platform
        fee.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">3. Hold → weekly payout</h2>
      <p>
        When raised meets the goal, the request is marked funded and becomes private. Prosperax runs
        weekly payouts for funded requests via Paystack Transfer to the recipient’s bank account.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">4. If the goal is not met</h2>
      <p>
        After the deadline (plus a short business-day delay), unmet requests are closed and held gifts
        are refunded to donors.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">5. Donor refunds while held</h2>
      <p>
        While a gift is still held (not yet paid out), you can request a refund from{" "}
        <strong>Account → Gifts sent</strong> within the configured window. Once paid out, automatic
        refunds are not available.
      </p>
      <h2 className="font-display text-xl font-semibold text-ink">6. Cancelling a request</h2>
      <p>
        From <strong>Account → Help history</strong> you can cancel a request that is still pending
        review or live. Held gifts are refunded to donors. After the goal is fully funded, cancel is
        no longer available because weekly payout is already queued.
      </p>
    </PolicyShell>
  );
}
