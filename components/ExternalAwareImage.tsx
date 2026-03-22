import Image from "next/image";

type ExternalAwareImageProps = {
  src: string;
  alt: string;
  sizes: string;
  fit: "cover" | "contain" | "scale-down";
  priority?: boolean;
};

const EXACT_HOSTS = new Set(["img.clerk.com", "i.ytimg.com"]);
const SUFFIX_HOSTS = [".r2.dev", ".supabase.co"];

function canUseNextImage(src: string) {
  if (src.startsWith("/")) {
    return true;
  }

  try {
    const hostname = new URL(src).hostname.toLowerCase();

    if (EXACT_HOSTS.has(hostname)) {
      return true;
    }

    return SUFFIX_HOSTS.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

export default function ExternalAwareImage({
  src,
  alt,
  sizes,
  fit,
  priority = false,
}: ExternalAwareImageProps) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: fit }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: fit,
      }}
    />
  );
}
