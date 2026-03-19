import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0f0e0e",
        padding: "24px",
      }}
    >
      <SignIn
        appearance={{
          elements: {
            card: {
              background: "#161515",
              border: "1px solid #2a2828",
              boxShadow: "0 8px 40px rgba(0,0,0,.45)",
            },
            headerTitle: {
              color: "#ede8e0",
            },
            headerSubtitle: {
              color: "#8b847c",
            },
            socialButtonsBlockButton: {
              background: "#1b1a1a",
              border: "1px solid #2a2828",
              color: "#e6e1da",
            },
            socialButtonsBlockButtonText: {
              color: "#e6e1da",
            },
            formButtonPrimary: {
              background: "#ff4826",
            },
            footerActionLink: {
              color: "#ff8a6b",
            },
            formFieldInput: {
              background: "#111010",
              border: "1px solid #252424",
              color: "#e6e1da",
            },
            formFieldLabel: {
              color: "#b8b2aa",
            },
          },
        }}
      />
    </div>
  );
}