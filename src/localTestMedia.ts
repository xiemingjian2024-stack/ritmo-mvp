// Development-only preview mapping. The MP4 files live under .local-media/
// (git-ignored) and are served only by a separate loopback media server.
// These entries do not change source IDs, media rights, or production playback.
export const localTestMediaById: Record<string, { externalId: string; originalGif: string; mp4: string }> = {
  "hasan:0025": { externalId: "hasan:0025", originalGif: "0025-EIeI8Vf.gif", mp4: "0025-EIeI8Vf.mp4" },
  "hasan:0861": { externalId: "hasan:0861", originalGif: "0861-fUBheHs.gif", mp4: "0861-fUBheHs.mp4" },
  "hasan:0310": { externalId: "hasan:0310", originalGif: "0310-3eGE2JC.gif", mp4: "0310-3eGE2JC.mp4" },
  "hasan:0298": { externalId: "hasan:0298", originalGif: "0298-Qyk5J3p.gif", mp4: "0298-Qyk5J3p.mp4" },
  "hasan:1760": { externalId: "hasan:1760", originalGif: "1760-yn8yg1r.gif", mp4: "1760-yn8yg1r.mp4" },
};

export function localTestMediaEnabled(): boolean {
  return Boolean(import.meta.env?.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("localMedia") === "1");
}
