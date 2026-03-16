import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

function Slide({ title, body, accent }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const y = spring({ frame, fps, config: { damping: 14 } }) * 22;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 90,
        background: "linear-gradient(130deg, #081120, #10294f)",
        color: "#f4f8ff",
        opacity
      }}
    >
      <div style={{ borderLeft: `8px solid ${accent}`, paddingLeft: 24, transform: `translateY(${24 - y}px)` }}>
        <h1 style={{ fontSize: 68, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 36, color: "#c8dbf9", maxWidth: 1200 }}>{body}</p>
      </div>
    </AbsoluteFill>
  );
}

export const DemoComposition = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}>
        <Slide
          title="Echo Compliance"
          body="Voice-to-daily-log app for modern site reporting."
          accent="#57a6ff"
        />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <Slide
          title="Capture Fast"
          body="Foreman updates are captured by text or voice with photo evidence."
          accent="#6df2c1"
        />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <Slide
          title="Generate Smart Reports"
          body="AI structuring, tags, risk extraction, searchable history and PDF export."
          accent="#ffb062"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
