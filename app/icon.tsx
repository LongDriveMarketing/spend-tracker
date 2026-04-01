import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 100,
        }}
      >
        <span style={{ fontSize: 300, fontWeight: 700, color: "#22c55e" }}>$</span>
      </div>
    ),
    { ...size }
  );
}
