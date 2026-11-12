import { useEffect, useRef, useState } from "react";
import { mediaForExercise, type ExerciseMedia } from "./exerciseMedia";
import type { PhaseSegment } from "./phaseExerciseCatalog";

type Props = { exerciseId: string; exerciseName: string; variant: "active" | "transition"; paused?: boolean; segment?: PhaseSegment; mediaOverride?: ExerciseMedia };

// Presentation only: video events never update repetitions, stage or timers.
export function ExerciseMediaView({ exerciseId, exerciseName, variant, paused = false, segment = "whole", mediaOverride }: Props) {
  const media = mediaOverride ?? mediaForExercise(exerciseId);
  // A side or direction must be explicitly mapped. Never reuse a generic or
  // opposite-side illustration as a substitute for a missing segment.
  const asset = media.segments ? media.segments[segment] : segment === "whole" ? media : undefined;
  const source = asset?.animation ?? asset?.staticImage;
  const format = asset?.animationFormat;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = Boolean(source && failedSource === source);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => setFailedSource(source ?? null));
  }, [paused, source, failed]);
  const hasMedia = Boolean(source && !failed);
  return <div className={`${variant === "active" ? "exercise-media" : "transition-art"} ${hasMedia ? "exercise-media-playing" : variant === "active" ? "exercise-media-placeholder" : "transition-placeholder"}`} data-media-exercise={exerciseId} data-media-segment={segment}>
    {hasMedia && asset?.animation && format !== "gif" ? <video ref={videoRef} src={asset.animation} autoPlay muted loop playsInline preload="auto" onError={() => setFailedSource(source ?? null)} aria-label={`${exerciseName}姿势参考`} /> : null}
    {hasMedia && (format === "gif" || (!asset?.animation && asset?.staticImage)) ? <img src={source} alt={`${exerciseName}${segment === "whole" ? "" : `·${segment}`}动作示意`} onError={() => setFailedSource(source ?? null)} /> : null}
    {!hasMedia ? <><span>动作示意</span><b>{exerciseName}</b><small>{failed ? "演示加载失败，请检查本地素材" : "正确素材准备中"}</small></> : null}
  </div>;
}
