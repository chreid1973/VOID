"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MentionAutocompleteMenu from "@/components/MentionAutocompleteMenu";
import MentionText from "@/components/MentionText";
import { useMentionAutocomplete } from "@/components/useMentionAutocomplete";
import { useResolvedMentions } from "@/components/useResolvedMentions";

type Community = {
  id: string;
  name: string;
  displayName: string;
};

type LinkPreview = {
  url: string;
  host: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  resolvedTitle: string;
  resolvedDescription: string | null;
  hasMetadata: boolean;
};

type CrosspostSource = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  imageUrl: string | null;
  communityId: string;
  community: {
    name: string;
    displayName: string;
    color: string;
    icon: string;
  };
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const RichPostEditor = dynamic(() => import("@/components/RichPostEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        border: "1px solid #252424",
        borderRadius: 14,
        background: "#111010",
        minHeight: 260,
        padding: "18px 16px",
        color: "#6f6963",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      Loading editor...
    </div>
  ),
});

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getUploadCorsErrorMessage() {
  if (typeof window === "undefined") {
    return "Direct image upload was blocked by Cloudflare R2 CORS.";
  }

  return `Direct image upload was blocked by Cloudflare R2 CORS. Allow ${window.location.origin} to PUT with Content-Type on the bucket, then try again.`;
}

export default function SubmitForm({
  communities,
  crosspostSource,
}: {
  communities: Community[];
  crosspostSource: CrosspostSource | null;
}) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const isCrosspost = Boolean(crosspostSource);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [url, setUrl] = useState("");
  const [communityId, setCommunityId] = useState(
    crosspostSource
      ? communities.find((community) => community.id !== crosspostSource.communityId)?.id ||
          communities[0]?.id ||
          ""
      : communities[0]?.id || ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewSourceUrl, setPreviewSourceUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [titleSelection, setTitleSelection] = useState({ start: 0, end: 0 });
  const [bodyActiveMentionQuery, setBodyActiveMentionQuery] = useState("");
  const [includeLinkPreviewDescription, setIncludeLinkPreviewDescription] =
    useState(false);
  const [includeLinkPreviewImage, setIncludeLinkPreviewImage] = useState(false);
  const [phase, setPhase] = useState<"idle" | "submitting" | "redirecting">(
    "idle"
  );
  const loading = phase !== "idle";
  const {
    mentionedUsernames,
    resolvedMentions,
    unresolvedMentions,
    loading: mentionLoading,
  } = useResolvedMentions(`${title}\n${body}`);
  const titleMentionAutocomplete = useMentionAutocomplete({
    text: title,
    selection: titleSelection,
    inputRef: titleInputRef,
    onInsert: (nextText, nextCursor) => {
      setTitle(nextText);
      setTitleSelection({ start: nextCursor, end: nextCursor });
      if (previewMessage) setPreviewMessage(null);
      if (submitError) setSubmitError(null);
    },
  });
  const filteredUnresolvedMentions = bodyActiveMentionQuery
    ? unresolvedMentions.filter(
        (username) => username !== bodyActiveMentionQuery.toLowerCase()
      )
    : unresolvedMentions;

  async function uploadImage(file: File) {
    const setupRes = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        context: "post",
      }),
    });

    const setupData = await setupRes.json().catch(() => null);

    if (!setupRes.ok || !setupData?.uploadUrl || !setupData?.key) {
      throw new Error(
        setupRes.status === 401
          ? "Sign in to upload an image."
          : setupData?.error?.formErrors?.[0] ||
              setupData?.error?.fieldErrors?.contentType?.[0] ||
              setupData?.error?.fieldErrors?.size?.[0] ||
              setupData?.error ||
              "Failed to prepare image upload."
      );
    }

    let uploadRes: Response;

    try {
      uploadRes = await fetch(setupData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(getUploadCorsErrorMessage());
      }

      throw error;
    }

    if (!uploadRes.ok) {
      throw new Error("Image upload failed. Please try again.");
    }

    return setupData.key as string;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSubmitError(null);

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);
      e.target.value = "";
      setSubmitError("Only JPEG, PNG, WebP, and GIF images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageFile(null);
      e.target.value = "";
      setSubmitError("Image must be under 5MB.");
      return;
    }

    setImageFile(file);
  }

  function clearImage() {
    setImageFile(null);
    setSubmitError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function fetchLinkPreview(urlValue: string) {
    const trimmedUrl = urlValue.trim();

    if (!trimmedUrl) {
      setLinkPreview(null);
      setPreviewSourceUrl("");
      setPreviewError(null);
      setPreviewMessage(null);
      setIncludeLinkPreviewDescription(false);
      setIncludeLinkPreviewImage(false);
      return null;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewMessage(null);

    try {
      const res = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          res.status === 401
            ? "Sign in to preview a link."
            : data?.error || "Failed to preview link.";

        setLinkPreview(null);
        setPreviewSourceUrl("");
        setPreviewError(message);
        return null;
      }

      setLinkPreview(data);
      setPreviewSourceUrl(trimmedUrl);
      setIncludeLinkPreviewDescription(Boolean(data.description && !body.trim()));
      setIncludeLinkPreviewImage(Boolean(data.imageUrl));
      return data as LinkPreview;
    } catch {
      setLinkPreview(null);
      setPreviewSourceUrl("");
      setPreviewError("Something went wrong while previewing the link.");
      setIncludeLinkPreviewDescription(false);
      setIncludeLinkPreviewImage(false);
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (url.trim() && imageFile) {
      setSubmitError("Choose either one image or one link for now.");
      return;
    }

    if (!isCrosspost && !title.trim() && !url.trim()) {
      setSubmitError("Add a title or a link.");
      return;
    }

    if (isCrosspost && crosspostSource && communityId === crosspostSource.communityId) {
      setSubmitError("Pick a different community for the crosspost.");
      return;
    }

    const needsLinkPreview =
      !isCrosspost &&
      url.trim() &&
      !title.trim() &&
      previewSourceUrl !== url.trim();

    if (needsLinkPreview) {
      const preview = await fetchLinkPreview(url);

      if (preview) {
        setPreviewMessage(
          "Link preview loaded below. Review the resolved title, then submit again."
        );
      }

      return;
    }

    setPhase("submitting");
    setSubmitError(null);

    try {
      const uploadedImageKey = imageFile ? await uploadImage(imageFile) : null;
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          bodyHtml,
          url,
          communityId,
          imageKey: uploadedImageKey,
          includeLinkPreviewDescription,
          includeLinkPreviewImage,
          crosspostOfPostId: crosspostSource?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPhase("idle");
        setSubmitError(data?.error || "Failed to create post.");
        return;
      }

      setPhase("redirecting");
      router.push("/feed");
      router.refresh();
    } catch (error) {
      setPhase("idle");
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the post."
      );
    }
  }

  function handleCancel() {
    if (loading) return;

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/feed");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111010",
    border: "1px solid #252424",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#e6e1da",
    fontFamily: "var(--font-outfit), sans-serif",
    fontSize: 14,
    outline: "none",
    transition: "border-color .2s, box-shadow .2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "#8b847c",
    marginBottom: 8,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div>
        <label style={labelStyle}>Community</label>
        <select
          value={communityId}
          disabled={loading}
          onChange={(e) => {
            setCommunityId(e.target.value);
            if (submitError) setSubmitError(null);
          }}
          style={inputStyle}
          required
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      {isCrosspost && crosspostSource ? (
        <div
          style={{
            border: "1px solid #252424",
            borderRadius: 12,
            background: "#141313",
            padding: "14px 16px",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#8b847c",
                fontWeight: 700,
              }}
            >
              Crossposting
            </span>
            <span style={{ fontSize: 12, color: "#6f6963" }}>
              {crosspostSource.community.icon} {crosspostSource.community.displayName}
            </span>
          </div>

          <div>
            <p
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 24,
                fontWeight: 600,
                color: "#ede8e0",
                lineHeight: 1.15,
                letterSpacing: "-.02em",
              }}
            >
              {crosspostSource.title}
            </p>
            {crosspostSource.body ? (
              <p
                style={{
                  fontSize: 13,
                  color: "#9c948a",
                  lineHeight: 1.65,
                  marginTop: 8,
                }}
              >
                {crosspostSource.body.length > 180
                  ? `${crosspostSource.body.slice(0, 180)}…`
                  : crosspostSource.body}
              </p>
            ) : null}
          </div>

          {crosspostSource.url ? (
            <p style={{ fontSize: 12, color: "#8b847c" }}>
              ↗ {crosspostSource.url}
            </p>
          ) : null}

          {crosspostSource.imageUrl ? (
            <img
              src={crosspostSource.imageUrl}
              alt={crosspostSource.title}
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                display: "block",
                borderRadius: 10,
                border: "1px solid #252424",
                background: "#111010",
              }}
            />
          ) : null}
        </div>
      ) : (
        <>
        <div>
          <label style={labelStyle}>Title</label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Give your post a title or leave it blank for a link post"
            value={title}
            disabled={loading}
            onChange={(e) => {
              setTitle(e.target.value);
                setTitleSelection({
                  start: e.currentTarget.selectionStart ?? 0,
                  end: e.currentTarget.selectionEnd ?? 0,
                });
                if (previewMessage) setPreviewMessage(null);
                if (submitError) setSubmitError(null);
              }}
              onSelect={(e) => {
                setTitleSelection({
                  start: e.currentTarget.selectionStart ?? 0,
                  end: e.currentTarget.selectionEnd ?? 0,
                });
              }}
              onClick={(e) => {
                setTitleSelection({
                  start: e.currentTarget.selectionStart ?? 0,
                  end: e.currentTarget.selectionEnd ?? 0,
                });
              }}
              onKeyDown={titleMentionAutocomplete.handleKeyDown}
              onBlur={() => {
                titleMentionAutocomplete.closeMenu();
              }}
              style={{ ...inputStyle, opacity: loading ? 0.7 : 1 }}
              maxLength={300}
            />

            <MentionAutocompleteMenu
              loading={titleMentionAutocomplete.loading}
              query={titleMentionAutocomplete.activeQuery}
              suggestions={titleMentionAutocomplete.suggestions}
              highlightedIndex={titleMentionAutocomplete.highlightedIndex}
              onSelect={titleMentionAutocomplete.selectSuggestion}
            />
          </div>

          <div>
            <label style={labelStyle}>Link</label>
            <input
              type="url"
              placeholder="https://example.com/article"
              value={url}
              disabled={loading}
              onChange={(e) => {
                setUrl(e.target.value);
                setLinkPreview(null);
                setPreviewSourceUrl("");
                setPreviewError(null);
                setPreviewMessage(null);
                setIncludeLinkPreviewDescription(false);
                setIncludeLinkPreviewImage(false);
                if (submitError) setSubmitError(null);
              }}
              onBlur={() => {
                if (url.trim() && previewSourceUrl !== url.trim()) {
                  void fetchLinkPreview(url);
                }
              }}
              style={{ ...inputStyle, opacity: loading ? 0.7 : 1 }}
            />

            <p
              style={{
                fontSize: 12,
                color: "#6f6963",
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              Optional. If you add a link, the server will try to pull a title, description, and preview image from the page.
            </p>

            {previewLoading ? (
              <p
                aria-live="polite"
                style={{
                  fontSize: 12,
                  color: "#8b847c",
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                Checking link preview...
              </p>
            ) : null}

            {previewMessage ? (
              <p
                aria-live="polite"
                style={{
                  fontSize: 12,
                  color: "#8aa37f",
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                {previewMessage}
              </p>
            ) : null}

            {previewError ? (
              <p
                aria-live="polite"
                style={{
                  fontSize: 12,
                  color: "#ff8b72",
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                {previewError}
              </p>
            ) : null}

            {linkPreview ? (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #252424",
                  borderRadius: 10,
                  background: "#141313",
                  padding: "12px 14px",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "#8b847c",
                      fontWeight: 700,
                    }}
                  >
                    Link Preview
                  </span>
                  <span style={{ fontSize: 12, color: "#6f6963" }}>
                    ↗ {linkPreview.host}
                  </span>
                </div>

                {linkPreview.imageUrl ? (
                  <div
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid #252424",
                      background: "#111010",
                    }}
                  >
                    <img
                      src={linkPreview.imageUrl}
                      alt={title.trim() || linkPreview.resolvedTitle}
                      style={{
                        width: "100%",
                        maxHeight: 220,
                        objectFit: "cover",
                        display: "block",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}

                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6f6963",
                      marginBottom: 4,
                    }}
                  >
                    Resolved title
                  </p>
                  <p style={{ fontSize: 13.5, color: "#e6e1da", lineHeight: 1.5 }}>
                    {title.trim() || linkPreview.resolvedTitle}
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6f6963",
                      marginBottom: 4,
                    }}
                  >
                    {body.trim() ? "Post body" : "Detected page description"}
                  </p>
                  <p style={{ fontSize: 12.5, color: "#b8b4ac", lineHeight: 1.6 }}>
                    {body.trim() ||
                      linkPreview.description ||
                      "No page description detected. Your post will publish without a body unless you write one above."}
                  </p>
                </div>

                {linkPreview.description ? (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 12.5,
                      color: "#d7d1c9",
                      lineHeight: 1.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeLinkPreviewDescription}
                      onChange={(e) =>
                        setIncludeLinkPreviewDescription(e.target.checked)
                      }
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      Include the detected description in the published post body
                      {body.trim() ? " after your text." : "."}
                    </span>
                  </label>
                ) : null}

                {linkPreview.imageUrl ? (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 12.5,
                      color: "#d7d1c9",
                      lineHeight: 1.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeLinkPreviewImage}
                      onChange={(e) => setIncludeLinkPreviewImage(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>Include the detected preview image on the published post.</span>
                  </label>
                ) : null}

                <p style={{ fontSize: 12, color: "#8b847c", lineHeight: 1.5 }}>
                  {linkPreview.description && includeLinkPreviewDescription
                    ? body.trim()
                      ? "Your typed body will publish first, followed by the detected description."
                      : "The detected description will be saved as the post body."
                    : linkPreview.imageUrl && includeLinkPreviewImage
                      ? "The detected preview image will be shown on the published post."
                      : "Previewed metadata is optional. Leave the boxes unchecked if you only want the external link plus your own title/body."}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}

      {isCrosspost ? null : (
        <div>
          <label style={labelStyle}>Body</label>
          <RichPostEditor
            value={bodyHtml}
            disabled={loading}
            placeholder="Add optional context, formatting, or a rant for the ages..."
            onActiveMentionQueryChange={setBodyActiveMentionQuery}
            onChange={({ html, text }) => {
              setBodyHtml(html);
              setBody(text);
              if (previewMessage) setPreviewMessage(null);
              if (submitError) setSubmitError(null);
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: "#6f6963",
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            Limited formatting for now: bold, italic, quotes, bullet lists, inline
            code, and links.
          </p>

          {mentionedUsernames.length > 0 ? (
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 8,
                border: "1px solid #252424",
                borderRadius: 10,
                background: "#141313",
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#8b847c",
                  lineHeight: 1.5,
                }}
              >
                {mentionLoading
                  ? "Checking mentions..."
                  : [
                      resolvedMentions.length > 0
                        ? `Will link and notify ${resolvedMentions
                            .map((username) => `@${username}`)
                            .join(", ")}`
                        : null,
                      filteredUnresolvedMentions.length > 0
                        ? `No user found for ${filteredUnresolvedMentions
                            .map((username) => `@${username}`)
                            .join(", ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(". ")}
              </p>

              <div
                style={{
                  border: "1px solid #252424",
                  borderRadius: 8,
                  background: "#111010",
                  padding: "12px 14px",
                  display: "grid",
                  gap: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 11.5,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "#8b847c",
                    fontWeight: 700,
                  }}
                >
                  Mention Preview
                </p>

                {title.trim() ? (
                  <p
                    style={{
                      fontSize: 18,
                      lineHeight: 1.3,
                      color: "#ece7df",
                      fontWeight: 700,
                    }}
                  >
                    <MentionText text={title} mentions={resolvedMentions} />
                  </p>
                ) : null}

                {body.trim() ? (
                  <p
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      color: "#b8b4ac",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <MentionText text={body} mentions={resolvedMentions} />
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {isCrosspost ? null : (
        <div>
          <label style={labelStyle}>Image</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={loading}
            onChange={handleImageChange}
            style={{ ...inputStyle, opacity: loading ? 0.7 : 1 }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <p style={{ fontSize: 12, color: "#6f6963", lineHeight: 1.5 }}>
              {imageFile
                ? `${imageFile.name} · ${formatFileSize(imageFile.size)}`
                : "Optional: one JPEG, PNG, WebP, or GIF up to 5MB. Link posts cannot also attach an image."}
            </p>

            {imageFile ? (
              <button
                className="act"
                type="button"
                onClick={clearImage}
                style={{ border: "1px solid #242323", borderRadius: 7 }}
              >
                Remove
              </button>
            ) : null}
          </div>

          {submitError ? (
            <p
              aria-live="polite"
              style={{
                fontSize: 12,
                color: "#ff8b72",
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              {submitError}
            </p>
          ) : null}
        </div>
      )}

      {isCrosspost && submitError ? (
        <p
          aria-live="polite"
          style={{
            fontSize: 12,
            color: "#ff8b72",
            lineHeight: 1.5,
          }}
        >
          {submitError}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          paddingTop: 6,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "#6f6963",
            lineHeight: 1.5,
          }}
        >
          {phase === "redirecting"
            ? isCrosspost
              ? "Crosspost published. Opening feed..."
              : "Post published. Opening feed..."
            : loading
              ? isCrosspost
                ? "Creating your crosspost..."
                : imageFile
                  ? "Uploading image and publishing post..."
                  : "Publishing post..."
              : isCrosspost
                ? "Crossposts create a new discussion thread while linking back to the original post."
                : "Posts publish immediately to the selected community."}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="act"
            onClick={handleCancel}
            disabled={loading}
            style={{
              border: "1px solid #2a2828",
              borderRadius: 10,
              padding: "11px 16px",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#a63d28" : "#ff4826",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 14,
              fontWeight: 700,
              padding: "11px 20px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .15s, transform .1s",
              letterSpacing: ".03em",
              boxShadow: "0 4px 18px rgba(255,72,38,.24)",
              minWidth: 140,
            }}
          >
            {phase === "redirecting"
              ? "Opening feed..."
              : loading
                ? "Posting..."
                : isCrosspost
                  ? "Crosspost to SocialVOID"
                  : "Post to SocialVOID"}
          </button>
        </div>
      </div>
    </form>
  );
}
