/** Display-only anatomy material. Session dates and statistics stay in RecordsDemo. */
export const TRAINING_RECENCY = [
  { label: "0–2天", color: "#FF7160", stops: [.94, .72, .18] },
  { label: "3–4天", color: "#FFA152", stops: [.88, .66, .17] },
  { label: "5–7天", color: "#F8C451", stops: [.82, .60, .15] },
  { label: "8–14天", color: "#E8CE80", stops: [.72, .50, .12] },
  { label: "15天以上", color: "#C4B678", stops: [.60, .40, .10] },
  { label: "从未训练", color: "#515652", stops: [.38, .25, .08] },
] as const;
export function recencyIndex(days?: number): number {
  return days === undefined ? 5 : days <= 2 ? 0 : days <= 4 ? 1 : days <= 7 ? 2 : days <= 14 ? 3 : 4;
}
export function ensureRecencyGradients(doc: Document) {
  const svg = doc.documentElement;
  if (doc.getElementById("ritmo-recency-colors")) return;
  const ns = "http://www.w3.org/2000/svg";
  const defs = doc.createElementNS(ns, "defs"); defs.id = "ritmo-recency-colors";
  TRAINING_RECENCY.forEach((tone, index) => {
    const gradient = doc.createElementNS(ns, "radialGradient");
    gradient.id = `ritmo-recency-${index}`;
    for (const [key, value] of Object.entries({ cx: "44%", cy: "35%", r: "76%" })) gradient.setAttribute(key, value);
    ["0%", "50%", "100%"].forEach((offset, i) => {
      const stop = doc.createElementNS(ns, "stop");
      stop.setAttribute("offset", offset); stop.setAttribute("stop-color", tone.color); stop.setAttribute("stop-opacity", String(tone.stops[i]));
      gradient.append(stop);
    });
    defs.append(gradient);
  });
  svg.prepend(defs);
}
