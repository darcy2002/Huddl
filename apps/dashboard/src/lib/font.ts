export const FONTS = [
  { id: "editorial", label: "Editorial", note: "Fraunces · Inter" },
  { id: "modern", label: "Modern", note: "Space Grotesk · Inter" },
  { id: "expressive", label: "Expressive", note: "Bricolage · Geist" },
  { id: "slab", label: "Slab", note: "Roboto Slab · Geist" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export function getFont(): FontId {
  const v = document.documentElement.getAttribute("data-font");
  return (FONTS.some((f) => f.id === v) ? v : "editorial") as FontId;
}

export function setFont(id: FontId) {
  document.documentElement.setAttribute("data-font", id);
  try {
    localStorage.setItem("font", id);
  } catch {
    /* ignore */
  }
}
