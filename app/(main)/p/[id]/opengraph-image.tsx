import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import {
  SITE_NAME,
  buildPostShareDescription,
  cleanShareText,
  loadCachedPostShareMetadataBase,
} from "../../../../lib/postShare";

export const runtime = "nodejs";
export const alt = "SocialVOID post share preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const backgroundImageDataUrlPromise = readFile(
  path.join(process.cwd(), "public", "images", "opengraph_logo_image.png")
).then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`);

export default async function OpenGraphImage({
  params,
}: {
  params: { id: string };
}) {
  const [post, backgroundImageDataUrl] = await Promise.all([
    loadCachedPostShareMetadataBase(params.id),
    backgroundImageDataUrlPromise,
  ]);

  const title = cleanShareText(post?.title ?? SITE_NAME, 110) ?? SITE_NAME;
  const description =
    cleanShareText(
      post
        ? buildPostShareDescription(post)
        : "The modern discussion platform",
      180
    ) ?? "The modern discussion platform";
  const authorName = post?.author.displayName || post?.author.username || "SocialVOID";
  const communityName = post?.community.displayName ?? "SocialVOID";
  const titleFontSize = title.length > 88 ? 48 : title.length > 56 ? 58 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#0f0e0e",
          color: "#f3eee8",
          fontFamily: "Georgia, serif",
        }}
      >
        <img
          src={backgroundImageDataUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(15,14,14,0.04) 0%, rgba(15,14,14,0.24) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "82px 78px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              marginBottom: 24,
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,72,38,0.34)",
              background: "rgba(255,72,38,0.14)",
              color: "#ff9a74",
              fontSize: 26,
              fontWeight: 700,
              fontFamily: "Arial, sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            {communityName}
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 930,
              fontSize: titleFontSize,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              textWrap: "balance",
              textShadow: "0 2px 18px rgba(0,0,0,0.38)",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 920,
              marginTop: 24,
              fontSize: 27,
              lineHeight: 1.42,
              color: "#d3ccc3",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {description}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 22,
              lineHeight: 1.2,
              color: "#9f968d",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {`u/${authorName}`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
