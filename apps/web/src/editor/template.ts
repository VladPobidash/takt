/** The text a new song starts with. The note naming is written down so the file is never ambiguous. */
export function newSongText(title: string, notation: "H" | "B"): string {
  return `# ${title}
key: C
notation: ${notation}
tempo: 100
time: 4/4

## Verse 1
| C | G | Am | F |

## Chorus
| F | C | G | G |
`;
}

/** Inserts `symbol` at the selection of a text field and returns the new text and caret position. */
export function insertAt(
  text: string,
  start: number,
  end: number,
  symbol: string,
): { text: string; caret: number } {
  // A section header belongs on a line of its own.
  const needsBreak = symbol === "##" && start > 0 && text[start - 1] !== "\n";
  const inserted = `${needsBreak ? "\n" : ""}${symbol}${symbol === "##" || symbol === "@" || symbol === ">" ? " " : ""}`;
  const withSpace = symbol === "@" ? inserted.trimEnd() : inserted;
  return {
    text: text.slice(0, start) + withSpace + text.slice(end),
    caret: start + withSpace.length,
  };
}
