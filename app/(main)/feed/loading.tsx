import type { CSSProperties } from "react";

const shimmerStyle = `
  @keyframes loading-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

function SkeletonBlock({
  width = "100%",
  height,
  radius = 10,
  style,
}: {
  width?: number | string;
  height: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(35,34,34,0.95) 0%, rgba(55,53,53,0.95) 50%, rgba(35,34,34,0.95) 100%)",
        backgroundSize: "200% 100%",
        animation: "loading-shimmer 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export default function FeedLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0e0e",
        color: "#e8e3db",
      }}
    >
      <style>{shimmerStyle}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "grid",
          gridTemplateColumns: "minmax(280px, 460px) 1fr auto",
          gap: 18,
          alignItems: "center",
          padding: "10px 22px",
          borderBottom: "1px solid #1b1a1a",
          background: "rgba(15,14,14,0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <SkeletonBlock height={40} radius={11} />

        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              width={index === 1 ? 78 : 62}
              height={30}
              radius={9}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <SkeletonBlock width={42} height={34} radius={8} />
          <SkeletonBlock width={108} height={34} radius={8} />
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "214px minmax(0, 1fr) 256px",
          gap: 18,
          maxWidth: 1480,
          margin: "0 auto",
          padding: "20px 18px 28px",
        }}
      >
        <aside style={{ paddingTop: 8 }}>
          <SkeletonBlock width={52} height={12} radius={6} style={{ marginBottom: 14 }} />
          {Array.from({ length: 12 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              height={36}
              radius={10}
              style={{ marginBottom: 8 }}
            />
          ))}
        </aside>

        <main>
          <SkeletonBlock width={180} height={30} radius={8} style={{ marginBottom: 10 }} />
          <SkeletonBlock width={320} height={14} radius={7} style={{ marginBottom: 22 }} />

          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #1d1c1c",
                borderRadius: 18,
                padding: "22px 24px",
                background: "#151414",
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 30, display: "flex", flexDirection: "column", gap: 8 }}>
                  <SkeletonBlock width={18} height={14} radius={7} />
                  <SkeletonBlock width={18} height={14} radius={7} />
                  <SkeletonBlock width={18} height={14} radius={7} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <SkeletonBlock width={90} height={22} radius={999} />
                    <SkeletonBlock width={110} height={12} radius={6} />
                    <SkeletonBlock width={54} height={12} radius={6} />
                  </div>

                  <SkeletonBlock width="72%" height={28} radius={8} style={{ marginBottom: 12 }} />
                  <SkeletonBlock width="94%" height={14} radius={7} style={{ marginBottom: 8 }} />
                  <SkeletonBlock width="80%" height={14} radius={7} style={{ marginBottom: 16 }} />

                  <SkeletonBlock width="100%" height={230} radius={14} style={{ marginBottom: 16 }} />

                  <div style={{ display: "flex", gap: 10 }}>
                    <SkeletonBlock width={96} height={14} radius={7} />
                    <SkeletonBlock width={68} height={14} radius={7} />
                    <SkeletonBlock width={54} height={14} radius={7} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </main>

        <aside>
          <div
            style={{
              border: "1px solid #1d1c1c",
              borderRadius: 18,
              padding: "18px",
              background: "#151414",
              marginBottom: 14,
            }}
          >
            <SkeletonBlock width="80%" height={12} radius={6} style={{ marginBottom: 12 }} />
            <SkeletonBlock width="100%" height={42} radius={10} />
          </div>

          <div
            style={{
              border: "1px solid #1d1c1c",
              borderRadius: 18,
              padding: "18px",
              background: "#151414",
            }}
          >
            <SkeletonBlock width={132} height={18} radius={8} style={{ marginBottom: 16 }} />
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderTop: index === 0 ? "none" : "1px solid #1a1a1a",
                }}
              >
                <SkeletonBlock width={18} height={16} radius={6} />
                <div style={{ flex: 1 }}>
                  <SkeletonBlock
                    width="100%"
                    height={14}
                    radius={7}
                    style={{ marginBottom: 8 }}
                  />
                  <SkeletonBlock width="55%" height={12} radius={6} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
