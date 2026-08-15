import PolicyShell from "@/components/PolicyShell";

export const metadata = {
  title: "Acceptable use · Prosperax",
  description: "What Prosperax does not allow on help requests.",
};

export default function AcceptableUsePage() {
  return (
    <PolicyShell title="Acceptable use" eyebrow="Rules">
      <p>
        Prosperax is for genuine personal mutual aid. Admin may reject or remove requests that
        include or promote any of the following:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Illegal activity</li>
        <li>Weapons</li>
        <li>Drugs</li>
        <li>Gambling</li>
        <li>Hate</li>
        <li>Adult content or exploitation</li>
        <li>Political campaign financing</li>
        <li>Investment or yield schemes</li>
        <li>Impersonation or stolen media</li>
        <li>Fundraising for others without proof</li>
        <li>Fraud or spam</li>
        <li>Anything that risks Paystack or bank blocks</li>
      </ul>
      <p>
        Creating a request means you confirm the need is yours, the story and photo are accurate, and
        bank details belong to you. Violations may result in rejection, removal, or account
        suspension.
      </p>
    </PolicyShell>
  );
}
