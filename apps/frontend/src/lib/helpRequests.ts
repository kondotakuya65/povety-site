export type HelpRequest = {
  id: string;
  full_name: string;
  story: string;
  story_plain?: string;
  goal_ngn: number;
  raised_ngn: number;
  deadline_days: number;
  deadline_at: string | null;
  status: string;
  visibility: string;
  verification_type: string;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  reviewed_at: string | null;
  user_id?: string;
  verification_nin?: string | null;
  verification_phone?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  account_name?: string | null;
};

/** Soft brand cover used when a help request has no uploaded photo. */
export const DEFAULT_REQUEST_PHOTO = "/brand/default-request.jpg";

export function requestPhoto(photoUrl: string | null | undefined): string {
  return photoUrl?.trim() || DEFAULT_REQUEST_PHOTO;
}

export function storyExcerpt(story: string, plain?: string): string {
  if (plain) return plain;
  return story
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatNgn(amount: number): string {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
