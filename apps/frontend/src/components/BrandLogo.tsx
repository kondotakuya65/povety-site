import Image from "next/image";

type BrandLogoProps = {
  /** Show the Prosperax wordmark beside the mark */
  withWordmark?: boolean;
  /** Visual variant for light or dark backgrounds */
  tone?: "light" | "dark";
  /** Mark size in pixels */
  size?: number;
  className?: string;
};

export default function BrandLogo({
  withWordmark = true,
  tone = "light",
  size = 36,
  className = "",
}: BrandLogoProps) {
  const wordClass =
    tone === "dark"
      ? "font-display font-semibold tracking-tight text-white"
      : "font-display font-semibold tracking-tight text-ink";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/logo-mark.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[0.65rem] shadow-md shadow-brand/15"
        priority
      />
      {withWordmark ? (
        <span className={wordClass} style={{ fontSize: Math.max(18, Math.round(size * 0.62)) }}>
          Prosperax
        </span>
      ) : (
        <span className="sr-only">Prosperax</span>
      )}
    </span>
  );
}
