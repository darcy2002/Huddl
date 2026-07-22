/**
 * Document Picture-in-Picture helpers. Opens an always-on-top window and copies
 * the page's stylesheets + theme class into it so Tailwind/shadcn styling applies.
 * Chrome-only — guard every call with `pipSupported()`.
 */
export function pipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

interface DocumentPiP {
  requestWindow(opts: { width: number; height: number }): Promise<Window>;
}

export async function openPipWindow(width: number, height: number): Promise<Window> {
  const dpip = (window as unknown as { documentPictureInPicture: DocumentPiP })
    .documentPictureInPicture;
  const pip = await dpip.requestWindow({ width, height });

  // Mirror the theme class (e.g. "dark") so CSS variables resolve the same way.
  pip.document.documentElement.className = document.documentElement.className;

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const cssText = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      const style = pip.document.createElement("style");
      style.textContent = cssText;
      pip.document.head.appendChild(style);
    } catch {
      // Cross-origin sheet: cssRules throws — recreate the <link> instead.
      if (sheet.href) {
        const link = pip.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        pip.document.head.appendChild(link);
      }
    }
  }

  return pip;
}
