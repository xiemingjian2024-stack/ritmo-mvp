import { useEffect, useRef } from "react";

const LOGO_URL = "/brand/logo-c-precise-dark.svg";
const SVG_NS = "http://www.w3.org/2000/svg";

type Point = { x: number; y: number };
const between = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const radius = 33.7;
const vertices = Array.from({ length: 3 }, (_, index) => ({ x: 50 + radius * Math.cos(index * 2 * Math.PI / 3), y: 50 + radius * Math.sin(index * 2 * Math.PI / 3) }));
const fraction = 13 / (radius * Math.sqrt(3));
const cornerIn = vertices.map((point, index) => between(point, vertices[(index + 2) % 3], fraction));
const cornerOut = vertices.map((point, index) => between(point, vertices[(index + 1) % 3], fraction));
const triangleSegments: Point[][] = [];
const endpoints: Point[] = [cornerOut[0]];
for (let index = 0; index < 3; index++) {
  const next = (index + 1) % 3;
  const from = cornerOut[index], to = cornerIn[next], vertex = vertices[next], exit = cornerOut[next];
  triangleSegments.push([from, between(from, to, 1 / 3), between(from, to, 2 / 3), to]);
  triangleSegments.push([to, between(to, vertex, 2 / 3), between(exit, vertex, 2 / 3), exit]);
  endpoints.push(to, exit);
}
const angles: number[] = [];
for (const point of endpoints) {
  let angle = Math.atan2(point.y - 50, point.x - 50);
  if (angles.length) while (angle <= angles[angles.length - 1]) angle += 2 * Math.PI;
  angles.push(angle);
}
const circleSegments = angles.slice(0, -1).map((start, index) => {
  const end = angles[index + 1], control = 4 / 3 * Math.tan((end - start) / 4), r = 22;
  const from = { x: 50 + r * Math.cos(start), y: 50 + r * Math.sin(start) };
  const to = { x: 50 + r * Math.cos(end), y: 50 + r * Math.sin(end) };
  return [from,
    { x: from.x - control * r * Math.sin(start), y: from.y + control * r * Math.cos(start) },
    { x: to.x + control * r * Math.sin(end), y: to.y - control * r * Math.cos(end) }, to];
});
const markPath = (progress: number) => {
  const format = (point: Point) => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
  return `M ${format(between(circleSegments[0][0], triangleSegments[0][0], progress))} ${triangleSegments.map((segment, index) => `C ${segment.slice(1).map((point, control) => format(between(circleSegments[index][control + 1], point, progress))).join(" ")}`).join(" ")} Z`;
};

export function BrandStartIcon() {
  return <svg className="ritmo-brand-start-icon" viewBox="18 20 64 60" aria-hidden="true"><path d={markPath(1)} /></svg>;
}

// Use the same approved contour as BrandStartIcon, mapped from its actual
// 48%-wide viewport into a 100×100 button. No substitute triangle artwork.
export function playCountdownHolePath(progress: number, circleRadius: number) {
  const map = (point: Point) => ({ x: 12.5 + point.x * .75, y: 10 + point.y * .8 });
  const circle = circleSegments.map((segment) => segment.map((point) => ({ x: 50 + (point.x - 50) * circleRadius / 22, y: 50 + (point.y - 50) * circleRadius / 22 })));
  const format = (point: Point) => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
  return `M ${format(between(map(triangleSegments[0][0]), circle[0][0], progress))} ${triangleSegments.map((segment, index) => `C ${segment.slice(1).map((point, control) => format(between(map(point), circle[index][control + 1], progress))).join(" ")}`).join(" ")} Z`;
}

function validTarget(button: HTMLElement, screen: HTMLElement) {
  if (!button.isConnected || document.hidden) return null;
  const rect = button.getBoundingClientRect();
  const bounds = screen.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40 || rect.right <= bounds.left || rect.left >= bounds.right || rect.bottom <= bounds.top || rect.top >= bounds.bottom) return null;
  return rect;
}

function addIntro(button: HTMLElement, screen: HTMLElement) {
  const overlay = document.createElement("div");
  overlay.className = "ritmo-brand-intro";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `<div class="ritmo-brand-wordmark"><img src="${LOGO_URL}" alt="" draggable="false"><span class="ritmo-brand-moving-o"></span></div>`;
  screen.append(overlay);
  const wordmark = overlay.querySelector<HTMLElement>(".ritmo-brand-wordmark")!;
  const logo = overlay.querySelector<HTMLImageElement>("img")!;
  const movingO = overlay.querySelector<HTMLElement>(".ritmo-brand-moving-o")!;
  const animations: Animation[] = [];
  let holdTimer = 0;
  let frame = 0;
  let cancelled = false;
  let observedRect = button.getBoundingClientRect();
  const finish = () => {
    if (cancelled) return;
    cancelled = true;
    window.clearTimeout(holdTimer);
    window.cancelAnimationFrame(frame);
    animations.forEach((animation) => animation.cancel());
    overlay.remove();
    button.classList.remove("ritmo-brand-icon-hidden");
    button.classList.toggle("ritmo-brand-glow-paused", document.hidden);
    observer.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("resize", checkTarget);
    screen.removeEventListener("scroll", checkTarget, true);
    document.removeEventListener("visibilitychange", onVisibility);
    button.removeEventListener("click", finish, true);
  };
  const checkTarget = () => {
    const rect = validTarget(button, screen);
    if (!rect || Math.abs(rect.left - observedRect.left) > 2 || Math.abs(rect.top - observedRect.top) > 2 || Math.abs(rect.width - observedRect.width) > 2 || Math.abs(rect.height - observedRect.height) > 2) finish();
  };
  const onVisibility = () => { if (document.hidden) finish(); };
  const observer = new MutationObserver(() => { if (!button.isConnected) finish(); });
  const resizeObserver = new ResizeObserver(checkTarget);
  observer.observe(screen, { childList: true, subtree: true });
  resizeObserver.observe(button);
  resizeObserver.observe(screen);
  window.addEventListener("resize", checkTarget);
  screen.addEventListener("scroll", checkTarget, true);
  document.addEventListener("visibilitychange", onVisibility);
  button.addEventListener("click", finish, true);
  button.classList.add("ritmo-brand-icon-hidden", "ritmo-brand-glow-paused");
  overlay.classList.add("ritmo-brand-intro-visible");

  holdTimer = window.setTimeout(async () => {
    if (cancelled) return;
    const destination = validTarget(button, screen);
    if (!destination) { finish(); return; }
    wordmark.classList.add("ritmo-brand-o-free");
    animations.push(logo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 330, easing: "ease-out", fill: "forwards" }));
    const source = movingO.getBoundingClientRect();
    const root = overlay.getBoundingClientRect();
    const factorX = root.width / overlay.offsetWidth;
    const factorY = root.height / overlay.offsetHeight;
    const dx = (destination.left + destination.width / 2 - source.left - source.width / 2) / factorX;
    const dy = (destination.top + destination.height / 2 - source.top - source.height / 2) / factorY;
    const scale = (destination.width / factorX) / movingO.offsetWidth;
    const travel = 1150;
    const local = (rect: DOMRect) => ({ x: (rect.left + rect.width / 2 - root.left) / factorX, y: (rect.top + rect.height / 2 - root.top) / factorY });
    const from = local(source), to = local(destination);
    const icon = document.createElementNS(SVG_NS, "svg");
    icon.setAttribute("viewBox", "18 20 64 60");
    icon.setAttribute("class", "ritmo-brand-morph-mark");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", markPath(0));
    icon.append(path);
    overlay.append(icon);
    const border = parseFloat(getComputedStyle(movingO).borderTopWidth);
    animations.push(movingO.animate([
      { transform: "translate3d(0,0,0) scale(1)" },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${scale})` },
    ], { duration: travel, easing: "cubic-bezier(.28,.75,.2,1)", fill: "forwards" }));
    animations.push(movingO.animate([{ borderWidth: `${border}px` }, { borderWidth: `${movingO.offsetWidth / 2}px` }], { duration: travel, easing: "linear", fill: "forwards" }));
    animations.push(icon.animate([
      { left: `${from.x}px`, top: `${from.y}px`, width: `${movingO.offsetWidth * .48}px`, height: `${movingO.offsetHeight * .48}px`, opacity: 0, offset: 0 },
      { opacity: 0, offset: .3 }, { opacity: 1, offset: .5 },
      { left: `${to.x}px`, top: `${to.y}px`, width: `${destination.width / factorX * .48}px`, height: `${destination.height / factorY * .48}px`, opacity: 1, offset: 1 },
    ], { duration: travel, easing: "cubic-bezier(.28,.75,.2,1)", fill: "forwards" }));
    animations.push(overlay.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .72 }, { opacity: 0, offset: 1 }], { duration: travel, easing: "linear", fill: "forwards" }));
    const started = performance.now();
    const updateMorph = (now: number) => {
      if (cancelled) return;
      const fraction = Math.min(1, (now - started) / travel);
      const progress = Math.max(0, Math.min(1, (fraction - .48) / .42));
      path.setAttribute("d", markPath(progress * progress * (3 - 2 * progress)));
      checkTarget();
      if (!cancelled && fraction < 1) frame = requestAnimationFrame(updateMorph);
    };
    frame = requestAnimationFrame(updateMorph);
    try { await Promise.all(animations.map((animation) => animation.finished)); } catch { return; }
    finish();
  }, 2500);
  return finish;
}

export function useBrandIntro(enabled: boolean) {
  const handledInThisDocument = useRef(false);
  useEffect(() => {
    if (!enabled || handledInThisDocument.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let disposed = false;
    let visibleSince: number | null = null;
    let stableSince = 0;
    let previous: { button: HTMLElement; rect: DOMRect } | undefined;
    let stop: (() => void) | undefined;
    const attempt = () => {
      timer = 0;
      if (disposed || handledInThisDocument.current || document.hidden) return;
      const now = performance.now();
      visibleSince ??= now;
      try {
        const screen = document.querySelector<HTMLElement>(".device-screen");
        const button = screen?.querySelector<HTMLElement>(".training-next-start");
        const rect = screen && button ? validTarget(button, screen) : null;
        if (screen && button && rect) {
          const prior = previous?.rect;
          const same = previous?.button === button && prior && Math.abs(rect.left - prior.left) < 1 && Math.abs(rect.top - prior.top) < 1 && Math.abs(rect.width - prior.width) < 1 && Math.abs(rect.height - prior.height) < 1;
          if (!same) { previous = { button, rect }; stableSince = now; }
          if (same && now - stableSince >= 120) {
            handledInThisDocument.current = true;
            stop = addIntro(button, screen);
            return;
          }
        } else { previous = undefined; stableSince = now; }
      } catch { /* Keep the ordinary home usable while waiting for its layout. */ }
      if (now - visibleSince < 2500) timer = window.setTimeout(attempt, 40);
      else handledInThisDocument.current = true; // Safe fallback, never surprise the user later.
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden) {
        // Hidden prewarming may precede the first visible frame. Once the user
        // has seen this document, returning from the background must not replay.
        if (visibleSince !== null) handledInThisDocument.current = true;
        return;
      }
      attempt();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onVisibility);
    attempt();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onVisibility);
      stop?.();
    };
  }, [enabled]);
}

export function useBrandGlowVisibility() {
  useEffect(() => {
    const update = () => document.querySelectorAll<HTMLElement>(".training-next-start").forEach((button) => button.classList.toggle("ritmo-brand-glow-paused", document.hidden));
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
}
