import parse, { type DOMNode } from "html-react-parser";
import styles from "./RichPostBody.module.css";
import { renderMentionTextNodes } from "./MentionText";

export default function RichPostBody({
  html,
  mentions,
}: {
  html: string;
  mentions: string[];
}) {
  let textNodeIndex = 0;
  let parsedContent: ReturnType<typeof parse>;

  try {
    parsedContent = parse(html, {
      replace(domNode: DOMNode) {
        if (domNode.type !== "text" || !("data" in domNode)) {
          return undefined;
        }

        if (!domNode.data || !domNode.data.includes("@")) {
          return undefined;
        }

        const parentName =
          domNode.parent && "name" in domNode.parent
            ? domNode.parent.name
            : null;

        if (parentName === "a") {
          return undefined;
        }

        const content = renderMentionTextNodes(
          domNode.data,
          mentions,
          `rich-${textNodeIndex}`
        );

        textNodeIndex += 1;
        return <>{content}</>;
      },
    });
  } catch (error) {
    console.error("[RichPostBody] failed to parse rich body", error);

    return (
      <div
        className={styles.body}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={styles.body}>
      {parsedContent}
    </div>
  );
}
