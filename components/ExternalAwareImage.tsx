type ExternalAwareImageProps = {
  src: string;
  alt: string;
  sizes: string;
  fit: "cover" | "contain" | "scale-down";
  priority?: boolean;
};
import Image from "next/image";

function isDirectMediaProxy(src: string) {
  return src.startsWith("/api/media/");
}

export default function ExternalAwareImage({
  src,
  alt,
  sizes,
  fit,
  priority = false,
}: ExternalAwareImageProps) {
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isDirectMediaProxy(src)}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : undefined}
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
      fetchPriority={priority ? "high" : "auto"}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: fit,
      }}
    />
  );
}
