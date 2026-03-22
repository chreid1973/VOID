type ExternalAwareImageProps = {
  src: string;
  alt: string;
  sizes: string;
  fit: "cover" | "contain" | "scale-down";
  priority?: boolean;
};
import Image from "next/image";

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
