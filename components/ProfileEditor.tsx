"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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

function parseApiError(data: any, fallback: string) {
  return (
    data?.error?.formErrors?.[0] ||
    data?.error?.fieldErrors?.displayName?.[0] ||
    data?.error?.fieldErrors?.bio?.[0] ||
    data?.error?.fieldErrors?.avatarKey?.[0] ||
    data?.error?.fieldErrors?.contentType?.[0] ||
    data?.error?.fieldErrors?.size?.[0] ||
    data?.error ||
    fallback
  );
}

export default function ProfileEditor({
  initialDisplayName,
  initialBio,
  initialAvatarValue,
  initialAvatarUrl,
}: {
  initialDisplayName: string | null;
  initialBio: string | null;
  initialAvatarValue: string | null;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [avatarValue, setAvatarValue] = useState(initialAvatarValue);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<ActionNoticeState | null>(null);

  useEffect(() => {
    if (isEditing) return;

    setDisplayName(initialDisplayName ?? "");
    setBio(initialBio ?? "");
    setAvatarValue(initialAvatarValue);
    setAvatarPreviewUrl(initialAvatarUrl);
    setAvatarFile(null);
  }, [
    initialAvatarUrl,
    initialAvatarValue,
    initialBio,
    initialDisplayName,
    isEditing,
  ]);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  function clearPreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  function resetForm() {
    clearPreviewObjectUrl();
    setDisplayName(initialDisplayName ?? "");
    setBio(initialBio ?? "");
    setAvatarValue(initialAvatarValue);
    setAvatarPreviewUrl(initialAvatarUrl);
    setAvatarFile(null);
    setNotice(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadAvatar(file: File) {
    const setupRes = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        context: "avatar",
      }),
    });

    const setupData = await setupRes.json().catch(() => null);

    if (!setupRes.ok || !setupData?.uploadUrl || !setupData?.key) {
      throw new Error(
        setupRes.status === 401
          ? "Sign in to upload an avatar."
          : parseApiError(setupData, "Failed to prepare avatar upload.")
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
      throw new Error("Avatar upload failed. Please try again.");
    }

    return setupData.key as string;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setNotice(null);

    if (!file) {
      setAvatarFile(null);
      setAvatarPreviewUrl(avatarValue ? initialAvatarUrl : null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      e.target.value = "";
      setNotice({
        tone: "error",
        message: "Only JPEG, PNG, WebP, and GIF images are allowed.",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      e.target.value = "";
      setNotice({
        tone: "error",
        message: "Avatar image must be under 5MB.",
      });
      return;
    }

    clearPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreviewUrl(objectUrl);
  }

  function handleClearAvatar() {
    clearPreviewObjectUrl();
    setAvatarFile(null);
    setAvatarValue(null);
    setAvatarPreviewUrl(null);
    setNotice(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setNotice(null);

    try {
      let nextAvatarValue = avatarValue;

      if (avatarFile) {
        nextAvatarValue = await uploadAvatar(avatarFile);
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          bio,
          avatarKey: nextAvatarValue,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({
          tone: "error",
          message: parseApiError(data, "Failed to update profile."),
        });
        return;
      }

      clearPreviewObjectUrl();
      setAvatarFile(null);
      setAvatarValue(data?.user?.avatarUrl ?? null);
      setAvatarPreviewUrl(data?.user?.resolvedAvatarUrl ?? null);
      setDisplayName(data?.user?.displayName ?? "");
      setBio(data?.user?.bio ?? "");
      setIsEditing(false);
      setNotice({
        tone: "success",
        message: "Profile updated.",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update profile.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? <ActionNotice {...notice} /> : null}

      {isEditing ? (
        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          <div
            style={{
              display: "grid",
              gap: 14,
              padding: "16px 18px",
              background: "#111010",
              border: "1px solid #242323",
              borderRadius: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 8,
                }}
              >
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                placeholder="How your name should appear"
                style={{
                  width: "100%",
                  background: "#151414",
                  border: "1px solid #2a2828",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#e6e1da",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11.5, color: "#6f6963", marginTop: 6 }}>
                Username is permanent. Display name can be changed once every 30 days and falls back to your username if cleared.
              </p>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 8,
                }}
              >
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="Tell people a little about yourself."
                style={{
                  width: "100%",
                  minHeight: 92,
                  background: "#151414",
                  border: "1px solid #2a2828",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#e6e1da",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11.5, color: "#6f6963", marginTop: 6 }}>
                {bio.length}/280 characters
              </p>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 8,
                }}
              >
                Avatar
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    overflow: "hidden",
                    background: "#1a1919",
                    border: "1px solid #2a2828",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6f6963",
                    fontSize: 28,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="Profile avatar preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <span>{(displayName.trim() || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={handleFileChange}
                    style={{ color: "#c0bbb4", fontSize: 12.5 }}
                  />
                  <p style={{ fontSize: 11.5, color: "#6f6963" }}>
                    Optional: one JPEG, PNG, WebP, or GIF up to{" "}
                    {formatFileSize(MAX_IMAGE_SIZE_BYTES)}.
                  </p>
                  {avatarFile ? (
                    <p style={{ fontSize: 11.5, color: "#8b847c" }}>
                      {avatarFile.name} · {formatFileSize(avatarFile.size)}
                    </p>
                  ) : null}
                  {(avatarPreviewUrl || avatarValue) ? (
                    <button
                      className="act"
                      type="button"
                      onClick={handleClearAvatar}
                      style={{ justifySelf: "flex-start" }}
                    >
                      Remove avatar
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="act"
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button className="act" type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 18 }}>
          <button
            className="act"
            type="button"
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            style={{
              border: "1px solid #242323",
              borderRadius: 9,
              padding: "7px 14px",
            }}
          >
            Edit profile
          </button>
        </div>
      )}
    </>
  );
}
