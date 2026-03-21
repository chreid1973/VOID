"use client";

export type MentionSuggestion = {
  username: string;
  displayName: string | null;
};

export default function MentionAutocompleteMenu({
  loading,
  query,
  suggestions,
  highlightedIndex,
  onSelect,
}: {
  loading: boolean;
  query: string;
  suggestions: MentionSuggestion[];
  highlightedIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
}) {
  if (!query) return null;

  return (
    <div
      style={{
        marginTop: 8,
        border: "1px solid #252424",
        borderRadius: 10,
        background: "#141313",
        overflow: "hidden",
      }}
    >
      {loading ? (
        <p
          style={{
            padding: "10px 12px",
            fontSize: 12,
            color: "#8b847c",
            lineHeight: 1.5,
          }}
        >
          Looking for matching users...
        </p>
      ) : suggestions.length === 0 ? (
        <p
          style={{
            padding: "10px 12px",
            fontSize: 12,
            color: "#8b847c",
            lineHeight: 1.5,
          }}
        >
          No matching users found for @{query}.
        </p>
      ) : (
        suggestions.map((suggestion, index) => {
          const selected = index === highlightedIndex;

          return (
            <button
              key={suggestion.username}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(suggestion);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                borderTop: index === 0 ? "none" : "1px solid #252424",
                background: selected ? "#1a1817" : "#141313",
                cursor: "pointer",
                display: "grid",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#e6e1da",
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {suggestion.displayName || suggestion.username}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#a49d94",
                  lineHeight: 1.4,
                }}
              >
                u/{suggestion.username}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
