import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ExerciseMediaView } from "../src/ExerciseMediaView";
import type { ExerciseMedia } from "../src/exerciseMedia";
import "../src/styles.css";
import "../src/prototype.css";

// Existing isolated, visually reviewed images. These are deliberately passed
// to the component only by this fixture and never registered in exerciseMedia.
const left = "/reports/ritmo-v16-phase-media-batch2/cross-body-rear-delt/left.png";
const right = "/reports/ritmo-v16-phase-media-batch2/cross-body-rear-delt/right.png";
const preview: ExerciseMedia = {
  mediaId: "ritmo:stretch:cross-body-rear-delt",
  segments: { left: { staticImage: left }, right: { staticImage: right } },
  placeholder: false, reviewOnly: true, source: "isolated visual QA fixture",
  rightsHolder: "RITMO in-project production", localUse: "self_produced_personal_test",
  professionalApproval: "not_verified",
};

function Fixture() {
  const [side, setSide] = useState<"left" | "right">("left");
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(0);
  const [missing, setMissing] = useState(false);
  const [oneSideOnly, setOneSideOnly] = useState(false);
  const [format, setFormat] = useState<"png" | "webp">("png");
  useEffect(() => {
    if (!ready || paused) return;
    const timer = window.setTimeout(() => setReady((remaining) => remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [ready, paused]);
  const media = missing ? { ...preview, segments: { left: { staticImage: "/reports/missing-left.png" }, right: { staticImage: "/reports/missing-right.png" } } } :
    oneSideOnly ? { ...preview, segments: { left: { staticImage: left } } } :
    format === "webp" ? { ...preview, segments: { left: { staticImage: "/tests/one-pixel.webp" }, right: { staticImage: "/tests/one-pixel.webp" } } } : preview;
  return <div className="training-screen">
    <main className="active-content">
      <header className="immersive-header"><div className="immersive-title"><h1>横臂后束拉伸</h1><p>第 1 / 1 组</p></div><div className="training-controls"><button className="pause-button" onClick={() => setPaused((value) => !value)}>{paused ? "继续训练" : "暂停 / 调整"}</button></div></header>
      <ExerciseMediaView exerciseId="ritmo:stretch:cross-body-rear-delt" exerciseName="横臂后束拉伸" variant="active" segment={side} paused={paused} mediaOverride={media} />
      <section className="rep-panel"><div className="rep-count"><strong>00:{String(ready || 30).padStart(2, "0")}</strong></div><div className="target-summary"><span>30 秒 · {side === "left" ? "左侧" : "右侧"}</span><span>·</span><span>徒手</span></div><p className="motion-cue">隔离组件检查 · 不进入正式媒体库</p></section>
      <div className="qa-controls"><button onClick={() => { setSide("right"); setReady(5); }}>自动换侧 · 5 秒</button><button onClick={() => { setSide("left"); setReady(0); }}>返回左侧</button><button onClick={() => setOneSideOnly((value) => !value)}>仅左侧素材</button><button onClick={() => setMissing((value) => !value)}>切换缺失媒体</button><button onClick={() => setFormat((value) => value === "png" ? "webp" : "png")}>PNG / WebP</button></div>
    </main>
    <style>{`.qa-controls{display:flex;gap:6px;flex-wrap:wrap;margin-top:22px}.qa-controls button{font-size:11px;padding:5px;border-radius:8px;border:0}`}</style>
  </div>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
