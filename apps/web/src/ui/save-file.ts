/**
 * Hands a text file to the user: through the system share sheet where files can be shared
 * (phones), otherwise as a download. Resolves to false if the user cancelled sharing.
 */
export async function saveFile(name: string, text: string, type: string): Promise<boolean> {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      // Sharing failed for another reason: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
