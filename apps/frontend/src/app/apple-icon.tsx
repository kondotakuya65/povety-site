import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1A8F54 0%, #0A4D2C 100%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            display: "flex",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 18,
              width: 78,
              height: 78,
              borderRadius: "70% 30% 55% 45%",
              background: "#7EE2A8",
              transform: "rotate(-18deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 42,
              width: 62,
              height: 8,
              borderRadius: 8,
              background: "#0A4D2C",
              transform: "rotate(-38deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 16,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#C4A35A",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
