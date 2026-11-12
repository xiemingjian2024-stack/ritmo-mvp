import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

// Shared only by the main tabs. No navigation, training or persistence state lives here.
export function createNavigationSpring() {
  let selection: HTMLElement | null = null, nav: HTMLElement | null = null;
  let x = 0, velocity = 0, target = 0, unit = 1, initialized = false;
  let frame = 0, last = 0, started = 0, reduced = false;
  let contentFrame = 0, contentAnimation: Animation | null = null;
  const draw = () => {
    if (selection) selection.style.transform = `translate3d(${x * unit}px,0,0)`;
  };
  const settle = () => {
    cancelAnimationFrame(frame); frame = 0; x = target; velocity = 0; draw();
  };
  const stopContent = () => {
    cancelAnimationFrame(contentFrame); contentFrame = 0;
    contentAnimation?.cancel(); contentAnimation = null;
  };
  const tick = (now: number) => {
    if (!selection?.isConnected || document.hidden || reduced) { settle(); return; }
    const dt = Math.min((now - last) / 1000, .032); last = now;
    velocity += (22 * 22 * (target - x) - 2 * .82 * 22 * velocity) * dt;
    x += velocity * dt;
    if (x < 0) { x = 0; velocity = Math.max(velocity, 0); }
    if (x > 2) { x = 2; velocity = Math.min(velocity, 0); }
    if ((Math.abs(x - target) * unit < .035 && Math.abs(velocity) * unit < .3) || now - started > 850) {
      settle(); return;
    }
    draw(); frame = requestAnimationFrame(tick);
  };
  return {
    attach(element: HTMLElement, root: HTMLElement, index: number) {
      selection = element; nav = root; unit = root.offsetWidth / 3;
      if (!initialized || !frame) { target = x = index; velocity = 0; initialized = true; }
      else target = index;
      draw();
      const resize = new ResizeObserver(() => { unit = root.offsetWidth / 3; draw(); });
      resize.observe(root);
      return () => {
        resize.disconnect();
        if (selection === element) { selection = null; nav = null; }
        // A tab swap attaches its real replacement in the same React commit.
        // Training/subpage entry without a nav settles and stops the idle frame.
        queueMicrotask(() => { if (!selection) { settle(); stopContent(); } });
      };
    },
    move(index: number) {
      if (index === target || !nav) return;
      const direction = Math.sign(index - target);
      target = index; started = last = performance.now();
      cancelAnimationFrame(frame);
      if (reduced || document.hidden) settle(); else frame = requestAnimationFrame(tick);
      stopContent();
      if (!reduced && !document.hidden) {
        const shell = nav.closest(".prototype-shell");
        contentFrame = requestAnimationFrame(() => {
          contentFrame = 0;
          const content = shell?.querySelector<HTMLElement>(":scope > .training-home,:scope > .scheme-home,:scope > .records-screen");
          if (!content?.animate || document.hidden) return;
          try {
            contentAnimation = content.animate(
              [{ opacity: .88, transform: `translateX(${direction * 4}px)` }, { opacity: 1, transform: "none" }],
              { duration: 160, easing: "ease-out" },
            );
          } catch { /* A visual failure must never prevent onNavigate. */ }
        });
      }
    },
    reduced(value: boolean) { reduced = value; if (value) { settle(); stopContent(); } },
    suspend() { settle(); stopContent(); },
  };
}

type Controller = ReturnType<typeof createNavigationSpring>;
const NavigationMotion = createContext<Controller | null>(null);

export function NavigationMotionProvider({ children }: { children: ReactNode }) {
  const controller = useRef<Controller | null>(null);
  if (!controller.current) controller.current = createNavigationSpring();
  useEffect(() => {
    const motion = controller.current!, media = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => motion.reduced(media.matches);
    const hidden = () => { if (document.hidden) motion.suspend(); };
    preference();
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", motion.suspend);
    return () => {
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", motion.suspend);
      motion.suspend();
    };
  }, []);
  return <NavigationMotion.Provider value={controller.current}>{children}</NavigationMotion.Provider>;
}

export function useNavigationSpring(activeIndex: number) {
  const motion = useContext(NavigationMotion);
  const nav = useRef<HTMLElement>(null), selection = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (motion && nav.current && selection.current) return motion.attach(selection.current, nav.current, activeIndex);
  }, [motion, activeIndex]);
  return { nav, selection, move: (index: number) => motion?.move(index) };
}
