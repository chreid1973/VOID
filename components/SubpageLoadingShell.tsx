import type { CSSProperties } from "react";

const shimmerStyle = `
  @keyframes detail-loading-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

function Block({
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
        animation: "detail-loading-shimmer 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export default function SubpageLoadingShell({
  variant,
}: {
  variant: "post" | "profile";
}) {
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
        <Block height={40} radius={11} />

        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Block key={index} width={62} height={30} radius={9} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Block width={42} height={34} radius={8} />
          <Block width={108} height={34} radius={8} />
        </div>
      </header>

      <main
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "26px 22px 40px",
        }}
      >
        <Block width={110} height={30} radius={8} style={{ marginBottom: 20 }} />

        {variant === "post" ? (
          <>
            <div
              style={{
                border: "1px solid #1d1c1c",
                borderRadius: 18,
                padding: "24px 28px",
                background: "#151414",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Block width={92} height={22} radius={999} />
                <Block width={120} height={12} radius={6} />
                <Block width={64} height={12} radius={6} />
              </div>

              <Block width="72%" height={34} radius={9} style={{ marginBottom: 14 }} />
              <Block width="94%" height={14} radius={7} style={{ marginBottom: 8 }} />
              <Block width="88%" height={14} radius={7} style={{ marginBottom: 8 }} />
              <Block width="80%" height={14} radius={7} style={{ marginBottom: 18 }} />
              <Block width="100%" height={300} radius={14} style={{ marginBottom: 16 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <Block width={54} height={14} radius={7} />
                <Block width={82} height={14} radius={7} />
                <Block width={62} height={14} radius={7} />
                <Block width={58} height={14} radius={7} />
              </div>
            </div>

            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #1d1c1c",
                  borderRadius: 16,
                  padding: "18px 20px",
                  background: "#151414",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <Block width={108} height={12} radius={6} />
                  <Block width={54} height={12} radius={6} />
                </div>
                <Block width="94%" height={14} radius={7} style={{ marginBottom: 8 }} />
                <Block width="72%" height={14} radius={7} style={{ marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <Block width={40} height={14} radius={7} />
                  <Block width={48} height={14} radius={7} />
                  <Block width={44} height={14} radius={7} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div
              style={{
                border: "1px solid #1d1c1c",
                borderRadius: 18,
                padding: "24px 28px",
                background: "#151414",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <Block width={96} height={96} radius={20} />
                <div style={{ flex: 1 }}>
                  <Block width={70} height={12} radius={6} style={{ marginBottom: 10 }} />
                  <Block width={240} height={44} radius={10} style={{ marginBottom: 12 }} />
                  <Block width={190} height={14} radius={7} style={{ marginBottom: 16 }} />
                  <Block width="58%" height={16} radius={8} style={{ marginBottom: 22 }} />

                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <Block width={110} height={72} radius={14} />
                    <Block width={110} height={72} radius={14} />
                    <Block width={110} height={72} radius={14} />
                  </div>

                  <Block width={100} height={38} radius={10} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, justifyContent: "flex-end" }}>
              <Block width={88} height={36} radius={12} />
              <Block width={110} height={36} radius={12} />
              <Block width={86} height={36} radius={12} />
            </div>

            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #1d1c1c",
                  borderRadius: 16,
                  padding: "18px 20px",
                  background: "#151414",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Block width={180} height={12} radius={6} />
                  <Block width={70} height={12} radius={6} />
                </div>
                <Block width="78%" height={18} radius={8} />
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
