import styles from "./RichPostBody.module.css";

export default function RichPostBody({ html }: { html: string }) {
  return (
    <div
      className={styles.body}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
