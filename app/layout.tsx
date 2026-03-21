import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Fraunces, Outfit } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SocialVOID - a better internet",
  description: "The modern discussion platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#ff4826",
          colorBackground: "#0f0e0e",
          colorInputBackground: "#181717",
          colorText: "#e2ddd6",
          borderRadius: "8px",
        },
      }}
    >
      <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
        <body
          style={{
            margin: 0,
            background: "#0f0e0e",
            color: "#e2ddd6",
            fontFamily: "var(--font-outfit), sans-serif",
          }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
