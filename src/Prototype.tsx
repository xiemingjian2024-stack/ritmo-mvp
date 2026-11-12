import { withDefaultWeight, isBodyweightEquipment, PHASE_SET_REST_SECONDS, isPhaseSetBoundary, EQUIPMENT_OPTIONS, defaultEquipment, hasEquipment, type EnvironmentEquipment, type EquipmentId } from "./trainingPreferences";
import { videoLibrarySpecs, removedRecommendationIds, homeVideoPlans, planPhaseItems, type PhasePlan } from "./personalTrainingLibrary";
import {ActiveSetView,TrainingControlSheet,RingMotionProvider} from "./trainingMotion/RingViews";
import {CountdownView,CountdownHandoffProvider} from "./trainingMotion/CountdownHandoff";
import {DEFAULT_TRAINING_TIMING, normalizeTrainingTiming, type TrainingTiming} from "./trainingTiming";
import { homeBackgroundForGroup } from "./homeBackgrounds";
import { TRAINING_RECENCY, recencyIndex, ensureRecencyGradients } from "./recordsAnatomy";
import "./trainingMotion/trainingMotion.css";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction } from "react";
import {
  CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
  ChevronUpIcon, Cross2Icon, DotsHorizontalIcon, GearIcon, MagnifyingGlassIcon,
  MinusIcon, Pencil1Icon, PlayIcon, PlusCircledIcon, PlusIcon, TrashIcon,
  HomeIcon, SpeakerLoudIcon, FontSizeIcon, MagicWandIcon, TimerIcon, ArchiveIcon,
} from "@radix-ui/react-icons";
import { BottomSheet, Carousel, KeyboardInput, MobileScroll, useKeyboard, useScreenPortal } from "./mobile";
import { firstBatchDetailDraft, firstBatchRecommendedPlans, firstBatchVisualQaData, trainingHomeVisualQaData } from "./visualQaFixtures";
import { EXERCISE_DATA_VERSION, MUSCLE_REGIONS, exerciseCatalog, exerciseSummary, getDurationSeconds, getExerciseSpec, muscleRegionId, type ExerciseSpec } from "./exerciseCatalog";
import { mediaForExercise } from "./exerciseMedia";
import { ExerciseMediaView } from "./ExerciseMediaView";
import { cycleOrder, reorderCycle } from "./cycleOrder";
import { NavigationMotionProvider, useNavigationSpring } from "./navigationMotion";
import { retainInterruptedSession, suspendWorkoutForHome } from "./workoutLifecycle";
import { canPlayBrandIntro } from "./brandLaunch";
import { BrandStartIcon, playCountdownHolePath, useBrandGlowVisibility, useBrandIntro } from "./brandMotion";
import { crosswalkByExternalId, extendedById, extendedSearch, extendedSpec, isExtendedHomeEligible } from "./extendedExerciseCatalog";
import { priorityById, prioritySearchText } from "./priorityExerciseCatalog";
import { PHASE_CATALOG_VERSION, phaseById, phaseItemAvailable, phaseItemsFor, resolvePrimaryGroup, type PhaseGroup, type PhaseItem, type PhaseSegment, type WorkoutPhase } from "./phaseExerciseCatalog";

type DemoFlow = "training" | "plans" | "records";
type TrainingStage = "home" | "active" | "rest" | "transition" | "countdown" | "phase-intro" | "phase-target-ready" | "phase-ready" | "phase-switch" | "phase-rest" | "summary";
type WorkoutSource = "cycle" | "recommended" | "custom";
type Exercise = Pick<ExerciseSpec, "id" | "name" | "muscle" | "equipment" | "sets" | "reps" | "weight"> & Partial<Omit<ExerciseSpec, "id" | "name" | "muscle" | "equipment" | "sets" | "reps" | "weight">> & { weightSource?: "ritmo_default" | "user" };
type Plan = { id: string; name: string; environment: string; exercises: Exercise[] } & PhasePlan;
type CompletedSet = { setNumber: number; targetReps: number; recordedReps: number; actualReps: number; repsSource: "default" | "manual" | "sensor"; weight: number; weightStatus?: "specified" | "unspecified" | "bodyweight"; completed: boolean; measurementType?: "reps" | "duration"; targetDurationSeconds?: number; recordedDurationSeconds?: number; durationSource?: "default" | "manual" };
type CompletedExercise = Exercise & { completedSets: CompletedSet[]; skipped?: boolean };
type NextSetAdjustment = { targetReps: number; targetDurationSeconds: number; weight: number };
type WorkoutSession = {
  dataVersion?: number;
  id: string;
  source: WorkoutSource;
  environmentId: string;
  startedAt: string;
  endedAt: string;
  finishedAt?: string;
  planId?: string;
  planName: string;
  skippedExerciseIds?: string[];
  status: "completed" | "partial";
  completed: boolean;
  exercises: CompletedExercise[];
};
type PhaseEntryRecord = { itemId: string; phase: "warmup" | "cooldown"; status: "completed" | "early_completed" | "skipped"; target: number; actual: number; measurementType: "reps" | "duration"; completedSegments: string[]; recordedAt: string };
type PhaseWorkoutRecord = { runId: string; sessionId?: string; primaryGroup: PhaseGroup | null; catalogVersion: number; items: PhaseEntryRecord[]; updatedAt: string };
type ActiveWorkout = {
  id: string;
  source: WorkoutSource;
  environmentId: string;
  startedAt: string;
  planId?: string;
  planName: string;
  exercises: Exercise[];
  exerciseIndex: number;
  setNumber: number;
  rep?: number;
  targetReps: number;
  targetDurationSeconds?: number;
  activeRemainingSeconds?: number;
  activeDeadlineAt?: number | null;
  weight: number;
  nextSetAdjustment?: NextSetAdjustment | null;
  stage: Exclude<TrainingStage, "home">;
  phase?: WorkoutPhase | "summary";
  primaryGroup?: PhaseGroup | null;
  phaseItems?: PhasePlan["phaseItems"];
  warmupIds?: string[];
  cooldownIds?: string[];
  phaseItemIndex?: number;
  phaseSegmentIndex?: number;
  phaseRemaining?: number;
  phaseDeadlineAt?: number | null;
  phaseAccumulated?: number;
  phaseHadEarly?: boolean;
  timing?: TrainingTiming;
  restRemaining: number;
  restDeadlineAt?: number | null;
  paused: boolean;
  parkedOnHome?: boolean;
  skippedExerciseIndexes?: number[];
  completedSets: Record<string, CompletedSet[]>;
};
type RitmoData = {
  environmentEquipment?: EnvironmentEquipment;
  trainingTiming?: TrainingTiming;
  dataVersion?: number;
  currentEnvironment: string;
  environments: string[];
  plans: Plan[];
  cycleIdsByEnvironment: Record<string, string[]>;
  cycleIndexByEnvironment: Record<string, number>;
  cycleEnabledByEnvironment: Record<string, boolean>;
  sessions: WorkoutSession[];
  phaseRecords?: PhaseWorkoutRecord[];
  activeWorkout: ActiveWorkout | null;
};

const library: Exercise[] = [...exerciseCatalog, ...videoLibrarySpecs.filter(item => !exerciseCatalog.some(existing => existing.id === item.id))];
const chestPreset = library.slice(0, 4);
const backPreset = library.slice(4, 8);
const muscleTabs = ["胸", "背", "肩", "手臂", "核心", "腿"];
const cloneExercises = (items: Exercise[]) => items.map((item) => ({ ...item }));
const editableExercises = (items: Exercise[]) => items.map(withDefaultWeight);
const builtInEnvironments = ["健身房", "家里"];
const openGlobalSettings = () => window.dispatchEvent(new Event("ritmo-open-settings"));
const announceAfterPersist = (message: string) => window.dispatchEvent(new CustomEvent("ritmo-save-notice", { detail: message }));
const initialPlans: Plan[] = [
  { id: "chest", name: "胸部基础", environment: "健身房", exercises: cloneExercises(library.slice(0, 4)) },
  { id: "back", name: "背部力量", environment: "健身房", exercises: cloneExercises(library.slice(4, 8)) },
  { id: "legs", name: "腿部训练", environment: "健身房", exercises: cloneExercises(library.slice(14, 16)) },
  { id: "shoulders", name: "肩部训练", environment: "健身房", exercises: cloneExercises(library.slice(8, 10)) },
  { id: "arms", name: "手臂强化", environment: "健身房", exercises: cloneExercises(library.slice(10, 12)) },
  { id: "core", name: "核心激活", environment: "健身房", exercises: cloneExercises(library.slice(12, 14)) },
];
// A UI pacing default, not sensor recognition or an exercise-specific prescription.

const RITMO_DATA_VERSION = 2;
const defaultRitmoData: RitmoData = {
  dataVersion: RITMO_DATA_VERSION,
  currentEnvironment: "健身房",
  environments: builtInEnvironments,
  plans: initialPlans,
  cycleIdsByEnvironment: { 健身房: ["chest", "back", "legs", "shoulders"], 家里: [] },
  cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
  cycleEnabledByEnvironment: { 健身房: true, 家里: false },
  sessions: [],
  phaseRecords: [],
  activeWorkout: null,
};

function normalizeEnvironment(value?: string) {
  if (!value || value === "健身房 A") return "健身房";
  if (value === "家中 · 徒手") return "家里";
  return value;
}

function loadRitmoData(): RitmoData {
    const raw = window.localStorage.getItem("ritmo-demo-v3");
    if (!raw) return defaultRitmoData;
    const saved = JSON.parse(raw) as Partial<RitmoData>;
    if (!saved || typeof saved !== "object" || !Array.isArray(saved.plans) || !Array.isArray(saved.sessions) || !Array.isArray(saved.environments)) throw new Error("本地数据格式不兼容");
    if (saved.plans.some((plan) => !plan || !Array.isArray(plan.exercises)) || saved.sessions.some((session) => !session || !Array.isArray(session.exercises) || session.exercises.some((exercise) => !exercise || !Array.isArray(exercise.completedSets))) || (saved.activeWorkout && (!Array.isArray(saved.activeWorkout.exercises) || !saved.activeWorkout.completedSets || typeof saved.activeWorkout.completedSets !== "object")) || (saved.phaseRecords !== undefined && !Array.isArray(saved.phaseRecords))) throw new Error("本地训练数据结构不兼容");
    if (saved.phaseRecords?.some((record) => !record || typeof record.runId !== "string" || !Array.isArray(record.items) || record.items.some((entry) => !entry || typeof entry.itemId !== "string" || !["completed", "early_completed", "skipped"].includes(entry.status)))) throw new Error("本地阶段记录结构不兼容");
    const plans = saved.plans.map((plan) => ({ ...plan, environment: normalizeEnvironment(plan.environment), exercises: plan.exercises.map((exercise) => withDefaultWeight({ ...getExerciseSpec(exercise.id), ...exercise, targetDurationSeconds: exercise.targetDurationSeconds ?? getDurationSeconds(exercise), dataVersion: EXERCISE_DATA_VERSION })) }));
    const environments = [...new Set([...builtInEnvironments, ...(saved.environments || []).map(normalizeEnvironment), ...plans.map((plan) => plan.environment)])];
    return {
      dataVersion: Math.max(RITMO_DATA_VERSION, Number(saved.dataVersion) || 1),
      currentEnvironment: environments.includes(normalizeEnvironment(saved.currentEnvironment)) ? normalizeEnvironment(saved.currentEnvironment) : "健身房",
      environments,
      environmentEquipment: Object.fromEntries(Object.entries(saved.environmentEquipment ?? {}).filter(([,ids]) => Array.isArray(ids)).map(([name,ids]) => [name,ids.filter(id => EQUIPMENT_OPTIONS.some(([key]) => key === id))])),
      plans,
      trainingTiming: normalizeTrainingTiming(saved.trainingTiming),
      cycleIdsByEnvironment: { 健身房: ["chest", "back", "legs", "shoulders"], 家里: [], ...(saved.cycleIdsByEnvironment || {}) },
      cycleIndexByEnvironment: { 健身房: 0, 家里: 0, ...(saved.cycleIndexByEnvironment || {}) },
      cycleEnabledByEnvironment: { 健身房: true, 家里: false, ...(saved.cycleEnabledByEnvironment || {}) },
      sessions: saved.sessions.map((session) => ({ ...session, status: session.status === "partial" ? "partial" as const : "completed" as const, completed: session.status === "partial" ? false : true, exercises: (session.exercises || []).map((exercise) => ({ ...exercise, completedSets: (exercise.completedSets || []).map((set) => ({ ...set, recordedReps: set.recordedReps ?? set.actualReps, repsSource: set.repsSource || "default" })) })) })),
      phaseRecords: saved.phaseRecords ?? [],
      activeWorkout: saved.activeWorkout && Array.isArray(saved.activeWorkout.exercises) ? { ...saved.activeWorkout, completedSets: Object.fromEntries(Object.entries(saved.activeWorkout.completedSets || {}).map(([key, sets]) => [key, sets.map((set) => ({ ...set, recordedReps: set.recordedReps ?? set.actualReps, repsSource: set.repsSource || "default" }))])) } : null,
    };
}

const exerciseKey = (exerciseIndex: number) => String(exerciseIndex);
const appendPhaseEntry = (current: RitmoData, runId: string, group: PhaseGroup | null, entry: PhaseEntryRecord): RitmoData => {
  const records = current.phaseRecords ?? [];
  const existing = records.find((record) => record.runId === runId);
  if (existing?.items.some((item) => item.itemId === entry.itemId)) return current;
  const updated: PhaseWorkoutRecord = existing
    ? { ...existing, items: [...existing.items, entry], updatedAt: entry.recordedAt }
    : { runId, sessionId: current.sessions.some((session) => session.id === runId) ? runId : undefined, primaryGroup: group, catalogVersion: PHASE_CATALOG_VERSION, items: [entry], updatedAt: entry.recordedAt };
  return { ...current, phaseRecords: existing ? records.map((record) => record.runId === runId ? updated : record) : [...records, updated] };
};
const summaryParts = (...parts:(string | undefined)[]) => parts.filter(Boolean).join(" · ");
const weightSummary = (exercise?: Pick<Exercise, "equipment">, value?: number) => value && value > 0 ? `${value} kg` : isBodyweightEquipment(exercise?.equipment) ? "" : "重量未设置";
const exerciseCue = (exercise?: Exercise) => {
  if (!exercise) return "保持稳定，按节奏完成";
  if (exercise.id === "smith" || exercise.id === "incline") return "肩胛后收，稳定下放";
  if (exercise.muscle === "背") return "躯干稳定，肩胛主动发力";
  if (exercise.muscle === "腿") return "膝盖对齐脚尖，控制下放";
  return "保持稳定，控制动作节奏";
};
const coreHomeIds = new Set(["pushup", "raise", "curl", "plank", "crunch", "pike-pushup", "superman", "body-squat", "glute-bridge"]);
const isExerciseAvailable = (exercise: Exercise, environment: string, inventory?: EnvironmentEquipment) => {
  const owned = inventory?.[environment];
  if (owned) {
    const entry = extendedById.get(exercise.id);
    if (environment === "家里" && entry && !("homeTemplateEquipment" in exercise && exercise.homeTemplateEquipment) && !isExtendedHomeEligible(entry)) return false;
    const extra = entry ? `${entry.name} ${entry.instructionsEn.join(" ")}` : "";
    if (/\bbench\b/i.test(extra) && !owned.includes("bench")) return false;
    if (/\b(?:pull.up|chin.up|parallel bars)\b/i.test(extra) && !owned.includes("pullup")) return false;
    return hasEquipment(exercise.equipment, exercise.id, owned);
  }
  if (environment !== "家里") return true;
  if ("homeTemplateEquipment" in exercise && exercise.homeTemplateEquipment) return true;
  const external = extendedById.get(exercise.id);
  return external ? isExtendedHomeEligible(external) : coreHomeIds.has(exercise.id);
};
export const templatePlansForEnvironment = (environment: string): Plan[] => environment === "家里" ? homeVideoPlans.map(plan => ({ ...plan, exercises: editableExercises(plan.exercises) })) : [
  { id: "template-gym-chest", name: "胸部训练", environment, exercises: cloneExercises(chestPreset.map(item => item.id === "smith" ? { ...getExerciseSpec("hasan:0289")!, sets:item.sets } : item)) },
  { id: "template-gym-back", name: "背部训练", environment, exercises: cloneExercises(backPreset.map(item => item.id === "row" ? getExerciseSpec("hasan:0861")! : item)) },
].map(plan=>({...plan,exercises:editableExercises(plan.exercises)}));
const phasesForPlan = (plan: Plan, phase: "warmup" | "cooldown") => planPhaseItems(plan, phase, () => phaseItemsFor(resolvePrimaryGroup(plan.exercises), phase));

function estimatePlanMinutes(plan: Plan, timing = DEFAULT_TRAINING_TIMING) {
  const work = plan.exercises.reduce((seconds, exercise) => seconds + exercise.sets * (getExerciseSpec(exercise.id)?.measurementType === "duration" ? getDurationSeconds(exercise) : exercise.reps * timing.repSeconds) + Math.max(0, exercise.sets - 1) * timing.setRestSeconds + 60, 0);
  const transitions = Math.max(0, plan.exercises.length - 1) * 60;
  const phaseSeconds = [...(plan.phaseItems?.warmup ?? []), ...(plan.phaseItems?.cooldown ?? [])].reduce((sum,item) => sum + item.target * item.segments.length * (item.measurementType === "duration" ? 1 : timing.repSeconds) + (Math.max(0,(item.sets ?? 1)-1)*PHASE_SET_REST_SECONDS) + (item.phase === "cooldown" ? Math.max(0,item.segments.length-(item.sets ?? 1))*5 : 0), 0);
  return Math.max(1, Math.ceil((work + transitions + phaseSeconds) / 60));
}

function fmtTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

const sessionDisplayEnd = (session: WorkoutSession) => session.finishedAt || session.endedAt;
const validSessionDate = (value: string) => Number.isFinite(new Date(value).getTime());
function sessionDurationLabel(session: WorkoutSession) {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(sessionDisplayEnd(session)).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "时长未知";
  const seconds = Math.floor((end - start) / 1000);
  return seconds < 60 ? `${seconds} 秒` : `${Math.round(seconds / 60)} 分钟`;
}
function completedExerciseSummary(exercise: CompletedExercise) {
  const sets = exercise.completedSets.filter((set) => set.completed);
  const count = sets.length;
  const timed = sets.some((set) => set.measurementType === "duration") || getExerciseSpec(exercise.id)?.measurementType === "duration";
  const amounts = timed
    ? sets.every((set) => Number.isFinite(set.recordedDurationSeconds ?? set.targetDurationSeconds)) ? `${sets.reduce((sum, set) => sum + (set.recordedDurationSeconds ?? set.targetDurationSeconds ?? 0), 0)} 秒` : ""
    : `${sets.reduce((sum, set) => sum + (set.recordedReps ?? set.actualReps ?? 0), 0)} 次`;
  const weights = sets.map((set) => set.weightStatus === "unspecified" || set.weightStatus === "bodyweight" || !Number.isFinite(set.weight) || set.weight <= 0 ? null : set.weight);
  const weight = weights.every((value): value is number => value !== null) ? (() => { const low = Math.min(...weights); const high = Math.max(...weights); return low === high ? `${low} kg` : `${low}–${high} kg`; })() : "";
  return [count + " 组", amounts, weight].filter(Boolean).join(" · ");
}

function SettingsContent({ environment, onManageEnvironment, onTiming, onClose }: { environment: string; onManageEnvironment: () => void; onTiming: () => void; onClose: () => void }) {
  const groups = [
    { title: "训练偏好", rows: [
      { label: "训练环境", icon: <HomeIcon />, available: true },
      { label: "训练节奏与休息", icon: <TimerIcon />, available: true },
      { label: "训练提示音", icon: <SpeakerLoudIcon /> },
      { label: "训练显示大小", icon: <FontSizeIcon /> },
    ] },
    { title: "显示与体验", rows: [{ label: "动态效果", icon: <MagicWandIcon /> }] },
    { title: "设备与数据", rows: [
      { label: "Apple Watch", icon: <TimerIcon /> },
      { label: "数据备份与恢复", icon: <ArchiveIcon /> },
    ] },
  ];
  return <div className="global-settings">
    {groups.map((group, index) => <section className="settings-section" key={group.title} aria-labelledby={`settings-group-${index}`}>
      <h3 id={`settings-group-${index}`}>{group.title}</h3>
      <div className="settings-group">{group.rows.map((row) => row.available
        ? <button key={row.label} className="settings-row settings-row-action" onClick={row.label === "训练环境" ? onManageEnvironment : onTiming}>
          <span className="settings-row-icon" aria-hidden="true">{row.icon}</span><span className="settings-row-label">{row.label}</span>{row.label === "训练环境" ? <span className="settings-row-value">{environment}</span> : null}<ChevronRightIcon className="settings-row-chevron" aria-hidden="true" />
        </button>
        : <div key={row.label} className="settings-row settings-row-planned" aria-disabled="true">
          <span className="settings-row-icon" aria-hidden="true">{row.icon}</span><span className="settings-row-label">{row.label}</span><span className="settings-row-status">规划中</span>
        </div>)}</div>
    </section>)}
    <button className="primary-button settings-done" onClick={onClose}>完成</button>
  </div>;
}

function TrainingTimingSettings({ value, onSave }: { value: TrainingTiming; onSave: (timing: TrainingTiming) => void }) {
  const [draft, setDraft] = useState(value);
  const rows = [
    { key: "repSeconds" as const, label: "单次动作时长", min: 2, max: 8, step: .5 },
    { key: "setRestSeconds" as const, label: "组间休息", min: 15, max: 300, step: 15 },
  ];
  return <div className="training-timing-settings">
    <div className="settings-group">{rows.map(row => <section className="timing-setting" key={row.key} aria-labelledby={`timing-${row.key}`}>
      <div><h3 id={`timing-${row.key}`}>{row.label}</h3></div>
      <div className="timing-stepper" role="group" aria-label={row.label}>
        <button aria-label={`减少${row.label}`} disabled={draft[row.key] <= row.min} onClick={() => setDraft(current => ({ ...current, [row.key]: Math.max(row.min, current[row.key] - row.step) }))}><MinusIcon /></button>
        <output aria-live="polite">{draft[row.key]}<small>秒</small></output>
        <button aria-label={`增加${row.label}`} disabled={draft[row.key] >= row.max} onClick={() => setDraft(current => ({ ...current, [row.key]: Math.min(row.max, current[row.key] + row.step) }))}><PlusIcon /></button>
      </div>
    </section>)}</div>
    <button className="primary-button" onClick={() => onSave(draft)}>保存</button>
    <button className="text-button timing-reset" onClick={() => setDraft({ ...DEFAULT_TRAINING_TIMING })}>恢复默认值</button>
  </div>;
}

function EnvironmentManager({ open, onClose, data, setData, onDelete }: { open:boolean; onClose:()=>void; data:RitmoData; setData:Dispatch<SetStateAction<RitmoData>>; onDelete:(name:string)=>void }) {
  const keyboard = useKeyboard();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [error, setError] = useState("");
  useNativeSheetBounds(open, "environment", .86);
  useEffect(() => { if (!open) { setEditing(undefined); setError(""); } }, [open]);
  const edit = (value:string | null) => { keyboard.hide(); setEditing(value); setName(value ?? ""); setEquipment(value ? data.environmentEquipment?.[value] ?? defaultEquipment(value) : []); setError(""); };
  const save = () => {
    const nextName = builtInEnvironments.includes(editing ?? "") ? editing! : name.trim();
    if (!nextName || (nextName !== editing && data.environments.includes(nextName))) { setError(nextName ? "环境名称已存在" : "请输入环境名称"); return; }
    keyboard.hide();
    setData(current => {
      const previous = editing;
      const renaming = previous != null && previous !== nextName;
      const move = <T,>(map:Record<string,T>, fallback:T) => { const copy={...map,[nextName]:previous != null ? map[previous] ?? fallback : fallback}; if (renaming) delete copy[previous!]; return copy; };
      const inventory={...current.environmentEquipment,[nextName]:equipment}; if(renaming) delete inventory[previous!];
      return {...current, environmentEquipment:inventory,
        environments:previous == null ? [...current.environments,nextName] : current.environments.map(value=>value===previous?nextName:value),
        currentEnvironment:current.currentEnvironment===previous?nextName:current.currentEnvironment,
        plans:renaming?current.plans.map(plan=>plan.environment===previous?{...plan,environment:nextName}:plan):current.plans,
        cycleIdsByEnvironment:move(current.cycleIdsByEnvironment,[]), cycleIndexByEnvironment:move(current.cycleIndexByEnvironment,0), cycleEnabledByEnvironment:move(current.cycleEnabledByEnvironment,false),
      };
    });
    setEditing(undefined); announceAfterPersist("训练环境已保存");
  };
  return <BottomSheet open={open} onOpenChange={value=>{if(!value){keyboard.hide();onClose();}}} title={editing === undefined ? "管理环境" : editing === null ? "自定义环境" : editing} snap={.86}>
    <div className="environment-manager">
      {editing === undefined ? <>
        <div className="settings-group">{data.environments.map(value=><button key={value} className="environment-manage-row" onClick={()=>edit(value)}><span><b>{value}</b><small>{(data.environmentEquipment?.[value] ?? defaultEquipment(value)).map(id=>EQUIPMENT_OPTIONS.find(([key])=>key===id)?.[1]).join("、") || "徒手"}</small></span><ChevronRightIcon /></button>)}</div>
        <button className="secondary-button environment-create" onClick={()=>edit(null)}><PlusIcon />自定义环境</button>
        <button className="primary-button" onClick={onClose}>完成</button>
      </> : <>
        <button className="text-button environment-back" onClick={()=>{keyboard.hide();setEditing(undefined);}}><ChevronLeftIcon />返回环境列表</button>
        {!builtInEnvironments.includes(editing ?? "") ? <label className="environment-name">环境名称<KeyboardInput aria-label="环境名称" placeholder="输入环境名称" value={name} onChange={event=>setName(event.target.value)} /></label> : null}
        <h3>可用器械</h3><div className="settings-group equipment-options"><div className="equipment-bodyweight">徒手<CheckIcon /></div>{EQUIPMENT_OPTIONS.map(([id,label])=><button key={id} className="equipment-option" role="checkbox" aria-checked={equipment.includes(id)} onClick={()=>setEquipment(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}><span>{label}</span>{equipment.includes(id)?<CheckIcon />:null}</button>)}</div>
        {error ? <p className="environment-error" role="alert">{error}</p> : null}
        <button className="primary-button" onClick={save}>保存</button>
        {editing && !builtInEnvironments.includes(editing) ? <button className="text-button environment-delete" onClick={()=>onDelete(editing)}>删除环境</button> : null}
      </>}
    </div>
  </BottomSheet>;
}

function EnvironmentOptions({ environments, value, onSelect }: { environments: string[]; value: string; onSelect: (name: string) => void }) {
  const options = [...builtInEnvironments, ...environments.filter((name) => !builtInEnvironments.includes(name))];
  return <div className="environment-options" role="radiogroup" aria-label="训练环境">
    {options.map((name) => <button key={name} type="button" role="radio" className={value === name ? "selected" : ""} aria-checked={value === name} onClick={() => onSelect(name)}>
      <span>{name}</span>{value === name ? <CheckIcon className="environment-check" aria-hidden="true" /> : null}
    </button>)}
  </div>;
}

function AppNav({ active, onNavigate }: { active: DemoFlow; onNavigate: (flow: DemoFlow) => void }) {
  const items = [
    { id: "training" as const, label: "训练" },
    { id: "plans" as const, label: "方案" },
    { id: "records" as const, label: "记录" },
  ];
  const spring = useNavigationSpring(items.findIndex(item => item.id === active));
  return <nav ref={spring.nav} className="bottom-nav floating-nav ritmo-compact-nav ritmo-spring-nav" data-active={active} aria-label="主导航">
    <div ref={spring.selection} className="ritmo-nav-selection" aria-hidden="true" />
    {items.map(({ id, label }, index) => <button key={id} className={active === id ? "on" : ""} onClick={() => { spring.move(index); onNavigate(id); }} aria-current={active === id ? "page" : undefined}>
      <i className={`ritmo-nav-icon ritmo-nav-icon-${id}`} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}


function NextActionView({ name, mediaId, mediaSegment = "whole", summary, onStart, onExit, startLabel = "START" }: { name: string; mediaId: string; mediaSegment?: PhaseSegment; summary: string; onStart: () => void; onExit?: () => void; startLabel?: string }) {
  const root = useRef<HTMLElement>(null), locked = useRef(false), complete = useRef(onStart);
  const { screenRef } = useScreenPortal();
  const [source, setSource] = useState<DOMRect | null>(null);
  complete.current = onStart;
  const start = (button: HTMLButtonElement) => {
    if (locked.current || document.hidden) return;
    locked.current = true;
    if (startLabel !== "START" || matchMedia("(prefers-reduced-motion: reduce)").matches) { complete.current(); return; }
    const rect = button.getBoundingClientRect();
    if (!screenRef.current || rect.width < 1 || rect.height < 1) { complete.current(); return; }
    setSource(rect);
  };
  const finish = () => { setSource(null); complete.current(); };
  return <><main ref={root} className="transition-screen" inert={source ? true : undefined} aria-busy={Boolean(source)}>{onExit ? <button className="transition-exit" onClick={onExit}>退出训练</button> : null}<div className="transition-kicker"><span>下一项：</span><strong>{summary}</strong></div><h1>{name}</h1><ExerciseMediaView key={`${mediaId}:${mediaSegment}`} exerciseId={mediaId} exerciseName={name} variant="transition" segment={mediaSegment} /><div className="transition-note">准备好了，就开始下一项</div><button className="primary-button transition-start" disabled={Boolean(source)} onClick={event => start(event.currentTarget)}>{startLabel}</button></main>{source && screenRef.current ? createPortal(<PlayCountdownTransition source={source} name={name} kind="next" contentRoot={root.current ?? undefined} onComplete={finish} />, screenRef.current) : null}</>;
}



// Visual handoff only. The existing beginWorkout runs once, after this layer
// unmounts, so none of the three countdown seconds are spent on the transition.
function PlayCountdownTransition({ source, name, onComplete, kind = "home", contentRoot }: { source: DOMRect; name: string; onComplete: () => void; kind?: "home" | "next"; contentRoot?: HTMLElement }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) { completeRef.current(); return; }
    const shell = layer.parentElement!;
    const home = kind === "next" ? contentRoot : shell.querySelector<HTMLElement>(".training-home-dark");
    const nav = kind === "next" ? null : shell.querySelector<HTMLElement>(".bottom-nav");
    const target = layer.querySelector<HTMLElement>(".countdown-ring")!;
    const moving = layer.querySelector<SVGSVGElement>(".play-countdown-moving")!;
    const disc = moving.querySelector("circle")!;
    const hole = moving.querySelector("path")!;
    const dim = layer.querySelector<HTMLElement>(".play-countdown-dim")!;
    const startText = moving.querySelector("text");
    let frame = 0, completed = false, hiddenAt = 0;
    let started = performance.now();
    const restore = () => { home?.style.removeProperty("opacity"); home?.style.removeProperty("transform"); nav?.style.removeProperty("opacity"); shell.classList.remove("play-countdown-running", "next-countdown-running"); };
    const finish = () => { if (completed) return; completed = true; cancelAnimationFrame(frame); restore(); completeRef.current(); };
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const local = (rect: DOMRect) => {
      const bounds = layer.getBoundingClientRect();
      const scale = bounds.width / layer.offsetWidth;
      return { x: (rect.left + rect.width / 2 - bounds.left) / scale, y: (rect.top + rect.height / 2 - bounds.top) / scale, size: rect.width / scale };
    };
    const from = local(source);
    shell.classList.add("play-countdown-running");
    if (kind === "next") shell.classList.add("next-countdown-running");
    const tick = (now: number) => {
      if (completed || document.hidden) return;
      try {
        const rect = target.getBoundingClientRect();
        if (!target.isConnected || rect.width < 40 || !Number.isFinite(rect.left)) { finish(); return; }
        const to = local(rect);
        // Existing button is 146px, countdown SVG 230px. Fit to the actual
        // visible stroke (229/240), smoothly, rather than resizing either UI.
        to.size *= 229 / 240;
        const p = clamp((now - started) / 610);
        const travel = ease(clamp((p - .08) / .92));
        const size = lerp(from.size, to.size, travel);
        moving.style.width = `${size}px`; moving.style.height = `${size}px`;
        moving.style.left = `${lerp(from.x, to.x, travel) - size / 2}px`;
        moving.style.top = `${lerp(from.y, to.y, travel) - size / 2}px`;
        const morph = clamp((p - .10) / .34);
        const expansion = ease(clamp((p - .34) / .66));
        if (kind === "next") {
          const radius = Math.max(.001, 101.5 / 229 * 100 * ease(clamp((p - .12) / .88)));
          hole.setAttribute("d", `M ${50-radius} 50 a ${radius} ${radius} 0 1 0 ${2*radius} 0 a ${radius} ${radius} 0 1 0 ${-2*radius} 0`);
          if (startText) startText.style.opacity = String(1 - clamp(p / .25));
        } else hole.setAttribute("d", playCountdownHolePath(morph, lerp(22, 101.5 / 229 * 100, expansion)));
        const settle = ease(clamp((p - .65) / .35));
        disc.setAttribute("fill", `rgb(${[182,255,22].map((value, i) => Math.round(lerp(value, [22,59,11][i], settle))).join(",")})`);
        const dark = clamp((p - .1) / .73);
        dim.style.opacity = String(dark);
        if (home) { home.style.opacity = String(1 - clamp((p - .2) / .65)); home.style.transform = `scale(${1 - .015 * dark})`; }
        if (nav) nav.style.opacity = String(1 - clamp((p - .2) / .65));
        if (p >= 1) { finish(); return; }
        frame = requestAnimationFrame(tick);
      } catch { finish(); }
    };
    const visibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(frame); }
      else if (hiddenAt) { hiddenAt = 0; finish(); }
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (reduced.matches) finish(); };
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", reduce);
    if (reduced.matches) finish(); else if (document.hidden) hiddenAt = performance.now(); else tick(started);
    return () => { completed = true; cancelAnimationFrame(frame); restore(); document.removeEventListener("visibilitychange", visibility); reduced.removeEventListener("change", reduce); };
  }, [source]);
  return <div ref={layerRef} className="play-countdown-layer" data-origin={kind} aria-hidden="true"><div className="play-countdown-dim" /><div className="play-countdown-target"><CountdownView count={3} name={name} /></div><svg className="play-countdown-moving" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#b6ff16" /><path d={kind === "next" ? "M50 50h.001v.001z" : playCountdownHolePath(0, 22)} fill="#080a09" />{kind === "next" ? <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#080a09" fontSize="17.8" fontWeight="750">START</text> : null}</svg></div>;
}

function HomePlayButton({ name, onStart, buttonRef }: { name: string; onStart: (button: HTMLButtonElement) => void; buttonRef?: React.Ref<HTMLButtonElement> }) {
  return <div className="training-start-orbit"><button ref={buttonRef} className="training-next-start ritmo-brand-start-glow" aria-label={`START ${name}`} onClick={event => onStart(event.currentTarget)}><BrandStartIcon /></button></div>;
}

export function RecommendationPlanCard({plan, timing = DEFAULT_TRAINING_TIMING, disabled, onDetails, onFullList, onPlay}: {plan: Plan;timing?: TrainingTiming;disabled?: boolean;onDetails:()=>void;onFullList:()=>void;onPlay:(button:HTMLButtonElement)=>void}) {
  return <article className="home-recommendation-card"><button disabled={disabled} className="recommendation-title" onClick={onDetails}><span><small>推荐训练</small><b>{plan.name.replace("训练", "新手训练")}</b></span><ChevronRightIcon /></button><div className="recommendation-meta">{plan.exercises.length} 个动作 · 约 {estimatePlanMinutes(plan, timing)} 分钟</div>{plan.requirements ? <p className="recommendation-meta">{plan.requirements}</p> : null}<ul aria-label={`${plan.name}动作列表`}>{plan.exercises.slice(0,3).map(exercise=><li key={exercise.id}><span>{exercise.name}</span><small>{exercise.sets} × {exerciseSummary(exercise)}</small></li>)}</ul>{plan.exercises.length>3?<button className="home-more-exercises" onClick={onFullList} aria-haspopup="dialog">还有 {plan.exercises.length-3} 个动作<ChevronDownIcon/></button>:null}<HomePlayButton name={plan.name} onStart={onPlay}/></article>;
}

function TrainingDemo({ data, setData, onNavigate, onOpenRecord, onPark, firstBatchQa, manageRequest }: { data: RitmoData; setData: Dispatch<SetStateAction<RitmoData>>; onNavigate: (flow: DemoFlow) => void; onOpenRecord: (sessionId: string) => void; onPark: (snapshot: ActiveWorkout) => void; firstBatchQa?: boolean; manageRequest?: number }) {
  const keyboard = useKeyboard();
  // Every restored run lands at home. Stale deadlines never count time spent away.
  const [restored] = useState(() => data.activeWorkout ? suspendWorkoutForHome({ ...data.activeWorkout, paused: true }) : null);
  const [parkedOnHome, setParkedOnHome] = useState(Boolean(restored));
  const forceEmptyState = new URLSearchParams(window.location.search).get("empty") === "1";
  const [stage, setStage] = useState<TrainingStage>(restored?.stage || "home");
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [manageEnvironmentOpen, setManageEnvironmentOpen] = useState(false);
  useEffect(() => { if (manageRequest) setManageEnvironmentOpen(true); }, [manageRequest]);
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [listPlan, setListPlan] = useState<Plan | null>(null);
  const [recommendationDetail, setRecommendationDetail] = useState<Plan | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [phaseExitKind, setPhaseExitKind] = useState<"phase" | "workout">("phase");
  const [activePlan, setActivePlan] = useState<Plan | null>(restored ? { id: restored.planId || restored.id, name: restored.planName, environment: restored.environmentId, exercises: cloneExercises(restored.exercises), phaseItems: restored.phaseItems } : null);
  const [runTiming, setRunTiming] = useState<TrainingTiming | undefined>(() => restored?.timing ? normalizeTrainingTiming(restored.timing) : undefined);
  const repIntervalMs = (runTiming?.repSeconds ?? DEFAULT_TRAINING_TIMING.repSeconds) * 1000;
  const [legacyRun, setLegacyRun] = useState(Boolean(restored && !restored.phase));
  const [phase, setPhase] = useState<WorkoutPhase | "summary">(restored?.phase ?? "strength");
  const [primaryGroup, setPrimaryGroup] = useState<PhaseGroup | null>(restored?.primaryGroup ?? (restored?.phase ? resolvePrimaryGroup(restored.exercises) : null));
  const [warmupIds, setWarmupIds] = useState<string[]>(restored?.warmupIds ?? []);
  const [cooldownIds, setCooldownIds] = useState<string[]>(restored?.cooldownIds ?? []);
  const [phaseItemIndex, setPhaseItemIndex] = useState(restored?.phaseItemIndex ?? 0);
  const [phaseSegmentIndex, setPhaseSegmentIndex] = useState(restored?.phaseSegmentIndex ?? 0);
  const [phaseRemaining, setPhaseRemaining] = useState(restored?.phaseRemaining ?? 0);
  const [phaseDeadlineAt, setPhaseDeadlineAt] = useState<number | null>(restored?.phase === "warmup" || restored?.phase === "cooldown" ? null : restored?.phaseDeadlineAt ?? null);
  const [phaseAccumulated, setPhaseAccumulated] = useState(restored?.phaseAccumulated ?? 0);
  const [phaseHadEarly, setPhaseHadEarly] = useState(restored?.phaseHadEarly ?? false);
  const [workoutSource, setWorkoutSource] = useState<WorkoutSource>(restored?.source || "custom");
  const [sessionId, setSessionId] = useState(restored?.id || "");
  const [startedAt, setStartedAt] = useState(restored?.startedAt || "");
  const [setNumber, setSetNumber] = useState(restored?.setNumber || 1);
  const [exerciseIndex, setExerciseIndex] = useState(restored?.exerciseIndex || 0);
  const [rep, setRep] = useState(restored?.rep ?? 1);
  const [targetReps, setTargetReps] = useState(restored?.targetReps ?? 10);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(restored?.targetDurationSeconds ?? (restored ? getDurationSeconds(restored.exercises[restored.exerciseIndex] ?? restored.exercises[0]) : 0));
  const [activeRemainingSeconds, setActiveRemainingSeconds] = useState(restored?.activeRemainingSeconds ?? restored?.targetDurationSeconds ?? (restored ? getDurationSeconds(restored.exercises[restored.exerciseIndex] ?? restored.exercises[0]) : 0));
  const [activeDeadlineAt, setActiveDeadlineAt] = useState<number | null>(restored?.stage === "active" ? null : restored?.activeDeadlineAt ?? null);
  const [weight, setWeight] = useState(restored?.weight ?? 20);
  const [nextSetAdjustment, setNextSetAdjustment] = useState<NextSetAdjustment | null>(restored?.nextSetAdjustment ?? null);
  const [editReps, setEditReps] = useState(restored?.targetReps ?? 10);
  const [editWeight, setEditWeight] = useState(restored?.weight ?? 20);
  const [rest, setRest] = useState(restored?.restRemaining ?? 90);
  const [restDeadlineAt, setRestDeadlineAt] = useState<number | null>(restored?.restDeadlineAt ?? (restored?.stage === "rest" && !restored.paused ? Date.now() + (restored.restRemaining ?? 90) * 1000 : null));
  const [previousReps, setPreviousReps] = useState<number | null>(null);
  const [paused, setPaused] = useState(restored?.phase === "warmup" || restored?.phase === "cooldown" ? true : restored?.stage === "active" && getExerciseSpec(restored.exercises[restored.exerciseIndex]?.id)?.measurementType === "duration" ? true : restored?.paused || false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCurrentSet, setEditingCurrentSet] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [playLaunch, setPlayLaunch] = useState<{ plan: Plan; source: DOMRect; intent: "start" | "continue" | "restart"; workoutSource: WorkoutSource } | null>(null);
  const [resumeChoice, setResumeChoice] = useState<{ plan: Plan; source: WorkoutSource } | null>(null);
  const homeStartRef = useRef<HTMLButtonElement | null>(null);
  // A resume countdown gates the frozen run; it must not reset or advance it.
  const resumeCountdown = useRef<ActiveWorkout | null>(null);
  const playLaunchPending = useRef(false);
  const [skippedExerciseIndexes, setSkippedExerciseIndexes] = useState<number[]>(restored?.skippedExerciseIndexes ?? []);
  const [completedSets, setCompletedSets] = useState<Record<string, CompletedSet[]>>(restored?.completedSets || {});
  const sessionSubmitted = useRef(false);
  const countdownPending = useRef(false);
  const [toast, setToast] = useState("");
  const environmentPlans = forceEmptyState ? [] : data.plans.filter((plan) => plan.environment === data.currentEnvironment);
  const cycleIds = data.cycleIdsByEnvironment[data.currentEnvironment] || [];
  const cyclePlans = cycleIds.map((id) => environmentPlans.find((plan) => plan.id === id)).filter(Boolean) as Plan[];
  const cycleEnabled = data.cycleEnabledByEnvironment[data.currentEnvironment] || false;
  const cycleIndex = Math.min(data.cycleIndexByEnvironment[data.currentEnvironment] || 0, Math.max(0, cyclePlans.length - 1));
  const nextPlan = cycleEnabled ? cyclePlans[cycleIndex] || null : null;
  // Persisted My Plans are distinct from temporary recommendation templates.
  // Eligibility is local to this environment; never infer it from another one.
  const applicablePlans = environmentPlans.filter(plan => plan.exercises.length > 0 && plan.exercises.every(exercise => isExerciseAvailable(exercise, data.currentEnvironment, data.environmentEquipment)));
  const homePlan = applicablePlans.find(plan => plan.id === nextPlan?.id) ?? applicablePlans[0] ?? null;
  const homeBackground = homeBackgroundForGroup(homePlan ? resolvePrimaryGroup(homePlan.exercises) : null);
  const homeSource: WorkoutSource = homePlan && cycleEnabled && homePlan.id === nextPlan?.id ? "cycle" : "custom";
  const recommendations = firstBatchQa && data.currentEnvironment === "健身房" ? firstBatchRecommendedPlans : templatePlansForEnvironment(data.currentEnvironment);
  const workoutPlan = activePlan;
  const activeExercise = workoutPlan?.exercises[exerciseIndex];
  const currentPhaseIds = phase === "warmup" ? warmupIds : cooldownIds;
  const runPhaseItem = (id: string) => [...(activePlan?.phaseItems?.warmup ?? []), ...(activePlan?.phaseItems?.cooldown ?? [])].find(item => item.id === id) ?? phaseById.get(id);
  const phaseItem = phase === "warmup" || phase === "cooldown" ? runPhaseItem(currentPhaseIds[phaseItemIndex] ?? "") : undefined;
  const phaseSegment = phaseItem?.segments[phaseSegmentIndex] ?? "whole";
  const runPhaseAvailable = (item:PhaseItem, environment:string) => {
    const owned = data.environmentEquipment?.[environment];
    return owned ? item.equipment === "bodyweight" || owned.includes(item.equipment === "dumbbell" ? "dumbbell" : "support") : phaseItemAvailable(item,environment);
  };
  const timedExercise = activeExercise ? getExerciseSpec(activeExercise.id)?.measurementType === "duration" : false;
  const nextSetValue = timedExercise ? nextSetAdjustment?.targetDurationSeconds ?? targetDurationSeconds : nextSetAdjustment?.targetReps ?? targetReps;
  const nextSetWeight = nextSetAdjustment?.weight ?? weight;
  const exerciseName = activeExercise?.name || "训练动作";
  const estimatedMinutes = homePlan ? estimatePlanMinutes(homePlan, normalizeTrainingTiming(data.trainingTiming)) : 0;

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timer); }, [toast]);
  const snapshot: ActiveWorkout | null = stage === "countdown" && resumeCountdown.current ? resumeCountdown.current : activePlan && stage !== "home" ? { id: sessionId, source: workoutSource, environmentId: activePlan.environment, startedAt, planId: workoutSource === "cycle" ? activePlan.id : undefined, planName: activePlan.name, exercises: cloneExercises(activePlan.exercises), exerciseIndex, setNumber, rep, targetReps, targetDurationSeconds, activeRemainingSeconds, activeDeadlineAt, weight, nextSetAdjustment, stage: stage === "countdown" ? phase === "strength" ? "transition" : "phase-intro" : stage, phase, primaryGroup, phaseItems: activePlan.phaseItems, warmupIds, cooldownIds, phaseItemIndex, phaseSegmentIndex, phaseRemaining, phaseDeadlineAt, phaseAccumulated, phaseHadEarly, timing: runTiming, restRemaining: rest, restDeadlineAt, paused: paused || parkedOnHome, parkedOnHome, skippedExerciseIndexes, completedSets } : null;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  useEffect(() => {
    const currentSnapshot = snapshotRef.current;
    if (currentSnapshot) setData((current) => ({ ...current, activeWorkout: currentSnapshot }));
  }, [skippedExerciseIndexes, activePlan, activeDeadlineAt, activeRemainingSeconds, completedSets, cooldownIds, exerciseIndex, nextSetAdjustment, runTiming, paused, parkedOnHome, phase, phaseAccumulated, phaseDeadlineAt, phaseHadEarly, phaseItemIndex, phaseRemaining, phaseSegmentIndex, primaryGroup, rep, rest, restDeadlineAt, sessionId, setData, setNumber, stage, startedAt, targetDurationSeconds, targetReps, warmupIds, weight, workoutSource]);
  const parkRef = useRef(() => {});
  parkRef.current = () => {
    // A visual launch interrupted before beginWorkout owns no training record.
    setPlayLaunch(null); setResumeChoice(null); playLaunchPending.current = false;
    resumeCountdown.current = null;
    if (!snapshotRef.current || parkedOnHome || stage === "summary") return;
    const frozen = suspendWorkoutForHome(snapshotRef.current);
    snapshotRef.current = frozen;
    keyboard.hide(); setPaused(true); setParkedOnHome(true);
    setRest(frozen.restRemaining); setRestDeadlineAt(null);
    setActiveRemainingSeconds(frozen.activeRemainingSeconds ?? activeRemainingSeconds); setActiveDeadlineAt(null);
    setPhaseRemaining(frozen.phaseRemaining ?? phaseRemaining); setPhaseDeadlineAt(null);
    setStage(frozen.stage); countdownPending.current = false;
    setControlOpen(false); setEditOpen(false); setExitOpen(false);
    setEnvironmentOpen(false); setManageEnvironmentOpen(false); setCustomPickerOpen(false); setRecommendationDetail(null);
    onPark(frozen);
  };
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") parkRef.current(); };
    const pagehide = () => parkRef.current();
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) parkRef.current(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", pagehide); window.removeEventListener("pageshow", pageshow); };
  }, []);
  useEffect(() => {
    if (phase !== "warmup" && phase !== "cooldown") return;
    // The device shell can retain the scroll introduced by tapping a low action on a scaled phone.
    const frame = window.requestAnimationFrame(() => document.querySelector(".device-screen")?.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [phase, phaseItemIndex, stage]);

  const selectEnvironment = (name: string) => { setData((current) => ({ ...current, currentEnvironment: name })); setEnvironmentOpen(false); };

  const deleteEnvironment = (name: string) => {
    if (builtInEnvironments.includes(name)) return;
    if (data.plans.some((plan) => plan.environment === name) || (data.cycleIdsByEnvironment[name] || []).length) { setToast("该环境仍有关联方案，请先处理方案"); return; }
    if (data.sessions.some((session) => session.environmentId === name) || data.activeWorkout?.environmentId === name) { setToast("该环境关联训练记录或未完成训练，不能删除"); return; }
    if (!window.confirm(`删除空训练环境“${name}”？`)) return;
    setData((current) => { const ids = { ...current.cycleIdsByEnvironment }; const indexes = { ...current.cycleIndexByEnvironment }; const enabled = { ...current.cycleEnabledByEnvironment }; delete ids[name]; delete indexes[name]; delete enabled[name]; const equipment = { ...current.environmentEquipment }; delete equipment[name]; return { ...current, environmentEquipment: equipment, currentEnvironment: current.currentEnvironment === name ? "健身房" : current.currentEnvironment, environments: current.environments.filter((value) => value !== name), cycleIdsByEnvironment: ids, cycleIndexByEnvironment: indexes, cycleEnabledByEnvironment: enabled }; });
    announceAfterPersist("训练环境已删除");
  };

  const beginWorkout = (plan: Plan, source: WorkoutSource, replaceParked = false) => {
    if ((parkedOnHome && !replaceParked) || !plan.exercises.length || countdownPending.current) return;
    setParkedOnHome(false); resumeCountdown.current = null;
    setLegacyRun(false);
    setRunTiming(normalizeTrainingTiming(data.trainingTiming));
    sessionSubmitted.current = false;
    if (plan.exercises.some(item => !isExerciseAvailable(item,plan.environment,data.environmentEquipment))) { setToast("当前环境缺少所需器械，请先管理环境或调整方案"); return; }
    plan = { ...plan, exercises: editableExercises(plan.exercises) };
    const first = plan.exercises[0];
    const group = resolvePrimaryGroup(plan.exercises);
    const warmups = phasesForPlan(plan, "warmup");
    const cooldowns = phasesForPlan(plan, "cooldown");
    const startsWithCountdown = warmups.length > 0 || source === "cycle";
    countdownPending.current = startsWithCountdown;
    setPrimaryGroup(group); setWarmupIds(warmups.map((item) => item.id)); setCooldownIds(cooldowns.map((item) => item.id));
    setPhase(warmups.length ? "warmup" : "strength"); setPhaseItemIndex(0); setPhaseSegmentIndex(0);
    setPhaseRemaining(warmups[0]?.target ?? 0); setPhaseDeadlineAt(null); setPhaseAccumulated(0); setPhaseHadEarly(false);
    setActivePlan({ ...plan, exercises: cloneExercises(plan.exercises) });
    setWorkoutSource(source); setSessionId(`session-${Date.now()}`); setStartedAt(new Date().toISOString()); setCompletedSets({}); setSkippedExerciseIndexes([]);
    setExerciseIndex(-1); setSetNumber(1); setRep(1); setTargetReps(first.reps); setTargetDurationSeconds(getDurationSeconds(first)); setActiveRemainingSeconds(getDurationSeconds(first)); setActiveDeadlineAt(null); setWeight(first.weight); setNextSetAdjustment(null); setRest(90); setRestDeadlineAt(null); setPaused(false); setStage(startsWithCountdown ? "countdown" : "transition");
  };
  const appendCompletedSet = (source: Record<string, CompletedSet[]>, actualReps = targetReps) => {
    const key = exerciseKey(exerciseIndex);
    const current = source[key] || [];
    const weightStatus = isBodyweightEquipment(activeExercise?.equipment) ? "bodyweight" as const : weight > 0 ? "specified" as const : "unspecified" as const;
    const snapshot: CompletedSet = timedExercise
      ? { setNumber, targetReps: 0, recordedReps: 0, actualReps: 0, repsSource: "default", targetDurationSeconds, recordedDurationSeconds: targetDurationSeconds, durationSource: "default", measurementType: "duration", weight, weightStatus, completed: true }
      : { setNumber, targetReps, recordedReps: actualReps, actualReps, repsSource: "default", measurementType: "reps", weight, weightStatus, completed: true };
    return { ...source, [key]: [...current.filter((item) => item.setNumber !== setNumber), snapshot].sort((a, b) => a.setNumber - b.setNumber) };
  };
  const openCompletedRecord = () => {
    const id = sessionId;
    const finishedAt = new Date().toISOString();
    setData((current) => ({ ...current, activeWorkout: null, sessions: current.sessions.map((session) => session.id === id && !session.finishedAt ? { ...session, finishedAt } : session) }));
    setActivePlan(null); setStage("home"); setPhase("strength"); setPaused(false); setControlOpen(false);
    if (id && (sessionSubmitted.current || data.sessions.some((session) => session.id === id))) onOpenRecord(id);
    else onNavigate("training");
  };
  const finishWorkout = (sets: Record<string, CompletedSet[]>, hasSkipped = skippedExerciseIndexes.length > 0, skippedIndexes = skippedExerciseIndexes) => {
    if (!activePlan || sessionSubmitted.current) return;
    if (!Object.values(sets).some(items => items.some(item => item.completed))) { cancelWorkout(); return; }
    sessionSubmitted.current = true;
    const session: WorkoutSession = { dataVersion: EXERCISE_DATA_VERSION, id: sessionId || `session-${Date.now()}`, source: workoutSource, environmentId: activePlan.environment, startedAt: startedAt || new Date().toISOString(), endedAt: new Date().toISOString(), planId: workoutSource === "cycle" ? activePlan.id : undefined, planName: activePlan.name, skippedExerciseIds: skippedIndexes.map(index=>activePlan.exercises[index]?.id).filter((id):id is string=>Boolean(id)), status: hasSkipped ? "partial" : "completed", completed: !hasSkipped, exercises: activePlan.exercises.map((exercise, index) => ({ ...exercise, skipped: skippedIndexes.includes(index), completedSets: (sets[exerciseKey(index)] || []).map((item) => ({ ...item })) })) };
    setData((current) => {
      if (current.sessions.some((existing) => existing.id === session.id)) return legacyRun ? { ...current, activeWorkout: null } : current;
      const next = { ...current, sessions: [...current.sessions, session], activeWorkout: legacyRun ? null : current.activeWorkout, phaseRecords: (current.phaseRecords ?? []).map((record) => record.runId === session.id ? { ...record, sessionId: session.id } : record) };
      if (workoutSource !== "cycle" || hasSkipped) return next;
      const ids = current.cycleIdsByEnvironment[activePlan.environment] || [];
      const currentIndex = current.cycleIndexByEnvironment[activePlan.environment] || 0;
      if (!current.cycleEnabledByEnvironment[activePlan.environment] || ids[currentIndex] !== activePlan.id || ids.length === 0) return next;
      return { ...next, cycleIndexByEnvironment: { ...current.cycleIndexByEnvironment, [activePlan.environment]: (currentIndex + 1) % ids.length } };
    });
    if (legacyRun || !cooldownIds.length) openCompletedRecord();
    else { setPhase("cooldown"); setPhaseItemIndex(0); setPhaseSegmentIndex(0); setPhaseAccumulated(0); setPhaseHadEarly(false); setPhaseRemaining(runPhaseItem(cooldownIds[0] ?? "")?.target ?? 0); setPhaseDeadlineAt(null); setStage("phase-intro"); }
    setPaused(false); announceAfterPersist(hasSkipped ? "已保存完成的训练组" : "力量训练已完成并保存");
  };
  const cancelWorkout = () => { setData((current) => ({ ...current, activeWorkout: null })); setActivePlan(null); setExitOpen(false); setControlOpen(false); setPaused(false); setStage("home"); announceAfterPersist("没有已完成组，未生成训练记录"); };
  const finishPartial = () => {
    if (!activePlan || sessionSubmitted.current) return;
    sessionSubmitted.current = true;
    const exercises = activePlan.exercises.map((exercise, index) => ({ ...exercise, completedSets: (completedSets[exerciseKey(index)] || []).filter((set) => set.completed).map((set) => ({ ...set })) })).filter((exercise) => exercise.completedSets.length);
    if (!exercises.length) { cancelWorkout(); return; }
    const session: WorkoutSession = { dataVersion: EXERCISE_DATA_VERSION, id: sessionId || `session-${Date.now()}`, source: workoutSource, environmentId: activePlan.environment, startedAt: startedAt || new Date().toISOString(), endedAt: new Date().toISOString(), planId: workoutSource === "cycle" ? activePlan.id : undefined, planName: activePlan.name, skippedExerciseIds: skippedExerciseIndexes.map(index=>activePlan.exercises[index]?.id).filter((id):id is string=>Boolean(id)), status: "partial", completed: false, exercises };
    setData((current) => current.sessions.some((existing) => existing.id === session.id) ? legacyRun ? { ...current, activeWorkout: null } : current : { ...current, sessions: [...current.sessions, session], activeWorkout: legacyRun ? null : current.activeWorkout, phaseRecords: (current.phaseRecords ?? []).map((record) => record.runId === session.id ? { ...record, sessionId: session.id } : record) });
    if (legacyRun || !cooldownIds.length) openCompletedRecord();
    else { setPhase("cooldown"); setPhaseItemIndex(0); setPhaseSegmentIndex(0); setPhaseAccumulated(0); setPhaseHadEarly(false); setPhaseRemaining(runPhaseItem(cooldownIds[0] ?? "")?.target ?? 0); setPhaseDeadlineAt(null); setStage("phase-intro"); }
    setExitOpen(false); setControlOpen(false); setPaused(false); announceAfterPersist("已保存提前结束的训练");
  };
  const pauseWorkout = () => { if (stage === "rest" && restDeadlineAt !== null) { setRest(Math.max(0, Math.ceil((restDeadlineAt - Date.now()) / 1000))); setRestDeadlineAt(null); } if (stage === "active" && timedExercise && activeDeadlineAt !== null) { setActiveRemainingSeconds(Math.max(0, Math.ceil((activeDeadlineAt - Date.now()) / 1000))); setActiveDeadlineAt(null); } setPaused(true); setControlOpen(true); };
  const resumeWorkout = () => { if (stage === "rest") setRestDeadlineAt(Date.now() + rest * 1000); if (stage === "active" && timedExercise) setActiveDeadlineAt(Date.now() + activeRemainingSeconds * 1000); setPaused(false); setControlOpen(false); };

  const savePhaseEntry = (item: PhaseItem, status: PhaseEntryRecord["status"], actual: number, completedSegments: string[]) => {
    const entry: PhaseEntryRecord = { itemId: item.id, phase: item.phase, status, target: item.target * item.segments.length, actual, measurementType: item.measurementType, completedSegments, recordedAt: new Date().toISOString() };
    setData((current) => appendPhaseEntry(current, sessionId, primaryGroup, entry));
  };
  const finishPhaseSegment = (early: boolean, actualSegment?: number) => {
    if (!phaseItem || !activePlan || !runPhaseAvailable(phaseItem, activePlan.environment)) return;
    const actual = Math.max(0, Math.min(phaseItem.target, actualSegment ?? phaseItem.target - phaseRemaining));
    const accumulated = phaseAccumulated + actual;
    const nextSegment = phaseItem.segments[phaseSegmentIndex + 1];
    setPhaseDeadlineAt(null);
    if (nextSegment) {
      setPhaseAccumulated(accumulated); setPhaseHadEarly(phaseHadEarly || early); setPhaseSegmentIndex((value) => value + 1);
      if (isPhaseSetBoundary(phaseSegmentIndex, phaseItem.segmentsPerSet ?? phaseItem.segments.length, phaseItem.segments.length)) { setPhaseRemaining(PHASE_SET_REST_SECONDS); setPhaseDeadlineAt(Date.now() + PHASE_SET_REST_SECONDS * 1000); setStage("phase-rest"); }
      else if (phaseItem.phase === "cooldown") { setPhaseRemaining(5); setPhaseDeadlineAt(Date.now() + 5000); setStage("phase-switch"); }
      else { setPhaseRemaining(phaseItem.target); setStage("active"); }
      return;
    }
    savePhaseEntry(phaseItem, early || phaseHadEarly ? "early_completed" : "completed", accumulated, phaseItem.segments);
    if (phase === "cooldown" && phaseItemIndex === cooldownIds.length - 1) openCompletedRecord();
    else setStage("phase-ready");
  };
  const skipPhaseItem = () => {
    if (!phaseItem) return;
    savePhaseEntry(phaseItem, "skipped", phaseAccumulated, phaseItem.segments.slice(0, phaseSegmentIndex));
    setPhaseDeadlineAt(null); setPaused(false); setControlOpen(false);
    if (phase === "cooldown" && phaseItemIndex === cooldownIds.length - 1) openCompletedRecord();
    else setStage("phase-ready");
  };
  const advancePhase = () => {
    if (countdownPending.current) return;
    const next = runPhaseItem(currentPhaseIds[phaseItemIndex + 1] ?? "");
    setPhaseDeadlineAt(null); setPhaseAccumulated(0); setPhaseHadEarly(false); setPhaseSegmentIndex(0); setPaused(false); setControlOpen(false);
    if (next) { countdownPending.current = true; setPhaseItemIndex((value) => value + 1); setPhaseRemaining(next.target); setStage("countdown"); return; }
    if (phase === "warmup") { countdownPending.current = true; setPhase("strength"); setExerciseIndex(-1); setStage("countdown"); return; }
    openCompletedRecord();
  };
  const skipPhase = () => {
    if (phase !== "warmup" && phase !== "cooldown") return;
    setData((current) => currentPhaseIds.slice(phaseItemIndex).reduce((result, id) => {
      const item = runPhaseItem(id);
      return item ? appendPhaseEntry(result, sessionId, primaryGroup, { itemId: item.id, phase: item.phase, status: "skipped", target: item.target * item.segments.length, actual: 0, measurementType: item.measurementType, completedSegments: [], recordedAt: new Date().toISOString() }) : result;
    }, current));
    setPhaseDeadlineAt(null); setPaused(false); setControlOpen(false);
    if (phase === "warmup") { countdownPending.current = true; setPhase("strength"); setExerciseIndex(-1); setStage("countdown"); }
    else openCompletedRecord();
  };
  const pausePhase = () => { if (phaseDeadlineAt !== null) { setPhaseRemaining(Math.max(0, Math.ceil((phaseDeadlineAt - Date.now()) / 1000))); setPhaseDeadlineAt(null); } setPaused(true); setControlOpen(true); };
  const resumePhase = () => { if (stage === "phase-switch" || stage === "phase-rest" || (stage === "active" && phaseItem?.measurementType === "duration")) setPhaseDeadlineAt(Date.now() + phaseRemaining * 1000); setPaused(false); setControlOpen(false); };
  useEffect(() => {
    if (stage === "phase-target-ready" && phaseItem) finishPhaseSegment(false, phaseItem.target);
  }, [stage, phaseItem]);
  useEffect(() => {
    if (!phaseItem || !activePlan || !runPhaseAvailable(phaseItem, activePlan.environment) || paused || (stage !== "active" && stage !== "phase-switch" && stage !== "phase-rest")) return;
    if (stage === "active" && phaseItem.measurementType !== "duration") return;
    if (phaseDeadlineAt === null) { setPhaseDeadlineAt(Date.now() + phaseRemaining * 1000); return; }
    let expired = false;
    const tick = () => {
      if (expired) return;
      const remaining = Math.max(0, Math.ceil((phaseDeadlineAt - Date.now()) / 1000));
      setPhaseRemaining(remaining);
      if (remaining > 0) return;
      expired = true;
      if (stage === "phase-switch" || stage === "phase-rest") { setPhaseDeadlineAt(null); setPhaseRemaining(phaseItem.target); setStage("active"); }
      else finishPhaseSegment(false, phaseItem.target);
    };
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer);
  }, [phaseDeadlineAt, phaseItem, phaseRemaining, paused, stage]);

  useEffect(() => {
    if ((phase !== "warmup" && phase !== "cooldown") || stage !== "active" || paused || !phaseItem || phaseItem.measurementType !== "reps" || !activePlan || !runPhaseAvailable(phaseItem, activePlan.environment)) return;
    if (phaseRemaining <= 1) {
      const timer = window.setTimeout(() => finishPhaseSegment(false, phaseItem.target), repIntervalMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setPhaseRemaining((value) => Math.max(1, value - 1)), repIntervalMs);
    return () => window.clearTimeout(timer);
  }, [activePlan, paused, phase, phaseItem, phaseRemaining, stage, repIntervalMs]);

  useEffect(() => {
    if (phase !== "strength" || stage !== "active" || paused || !activeExercise || timedExercise) return;
    if (rep >= targetReps) {
      const timer = window.setTimeout(() => {
        const nextSets = appendCompletedSet(completedSets);
        setCompletedSets(nextSets);
        if (setNumber < activeExercise.sets) { const duration = runTiming?.setRestSeconds ?? activeExercise.restSeconds ?? getExerciseSpec(activeExercise.id)?.restSeconds ?? 90; setRest(duration); setRestDeadlineAt(Date.now() + duration * 1000); setStage("rest"); }
        else if (workoutPlan && exerciseIndex < workoutPlan.exercises.length - 1) setStage("transition");
        else finishWorkout(nextSets);
      }, repIntervalMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setRep((current) => current + 1), repIntervalMs);
    return () => window.clearTimeout(timer);
  }, [activeExercise, completedSets, exerciseIndex, paused, rep, setNumber, stage, targetReps, timedExercise, workoutPlan, repIntervalMs, runTiming]);
  useEffect(() => {
    if (phase !== "strength" || stage !== "active" || !timedExercise || paused || !activeExercise) return;
    if (activeDeadlineAt === null) { setActiveDeadlineAt(Date.now() + activeRemainingSeconds * 1000); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((activeDeadlineAt - Date.now()) / 1000));
      setActiveRemainingSeconds(remaining);
      if (remaining !== 0) return;
      setActiveDeadlineAt(null);
      const nextSets = appendCompletedSet(completedSets);
      setCompletedSets(nextSets);
      if (setNumber < activeExercise.sets) { const duration = runTiming?.setRestSeconds ?? activeExercise.restSeconds ?? getExerciseSpec(activeExercise.id)?.restSeconds ?? 90; setRest(duration); setRestDeadlineAt(Date.now() + duration * 1000); setStage("rest"); }
      else if (workoutPlan && exerciseIndex < workoutPlan.exercises.length - 1) setStage("transition");
      else finishWorkout(nextSets);
    };
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [activeDeadlineAt, activeExercise, activeRemainingSeconds, completedSets, exerciseIndex, paused, setNumber, stage, timedExercise, workoutPlan, runTiming]);
  useEffect(() => {
    if (phase !== "strength" || stage !== "rest" || paused || editOpen || controlOpen) return;
    if (restDeadlineAt === null) { setRestDeadlineAt(Date.now() + rest * 1000); return; }
    let expired = false;
    const tick = () => { if (expired) return; const remaining = Math.max(0, Math.ceil((restDeadlineAt - Date.now()) / 1000)); setRest(remaining); if (remaining === 0) { expired = true; setRestDeadlineAt(null); setSetNumber((value) => value + 1); setRep(1); setTargetReps(nextSetAdjustment?.targetReps ?? targetReps); setTargetDurationSeconds(nextSetAdjustment?.targetDurationSeconds ?? targetDurationSeconds); setActiveRemainingSeconds(nextSetAdjustment?.targetDurationSeconds ?? targetDurationSeconds); setWeight(nextSetAdjustment?.weight ?? weight); setNextSetAdjustment(null); setActiveDeadlineAt(null); setRest(90); setStage("active"); } };
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer);
  }, [editOpen, paused, controlOpen, nextSetAdjustment, restDeadlineAt, stage, targetDurationSeconds, targetReps, weight]);
  useEffect(() => {
    if (stage !== "countdown") return;
    let remaining = 3;
    setCountdown(3);
    let finishTimer: number | undefined;
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        countdownPending.current = false;
        const resumed = resumeCountdown.current;
        resumeCountdown.current = null;
        if (resumed && resumed.stage !== "transition" && resumed.stage !== "phase-intro") {
          // Effects recreate only the applicable clock from its saved remainder.
          setStage(resumed.stage); setPaused(false);
          return;
        }
        if (phase === "warmup" || phase === "cooldown") {
          if (!phaseItem) { setStage("phase-intro"); return; }
          setPhaseRemaining(phaseItem.target); setPhaseDeadlineAt(null); setPaused(false); setStage("active");
          return;
        }
        const next = workoutPlan?.exercises[exerciseIndex + 1];
        if (!next) { setStage("transition"); return; }
        finishTimer = window.setTimeout(() => { setExerciseIndex((value) => value + 1); setSetNumber(1); setRep(1); setTargetReps(next.reps); setTargetDurationSeconds(getDurationSeconds(next)); setActiveRemainingSeconds(getDurationSeconds(next)); setActiveDeadlineAt(null); setWeight(next.weight); setNextSetAdjustment(null); setRest(90); setStage("active"); }, 220);
        return;
      }
      setCountdown(remaining);
    }, 1000);
    return () => { window.clearInterval(timer); if (finishTimer !== undefined) window.clearTimeout(finishTimer); };
  }, [exerciseIndex, phase, phaseItem, stage, workoutPlan]);
  // Older saved runs can still restore the retired summary stage.
  useEffect(() => { if (stage === "summary" && !parkedOnHome) openCompletedRecord(); }, [stage, parkedOnHome]);

  const startNextSet = () => { setSetNumber((value) => value + 1); setRep(1); setTargetReps(nextSetAdjustment?.targetReps ?? targetReps); setTargetDurationSeconds(nextSetAdjustment?.targetDurationSeconds ?? targetDurationSeconds); setActiveRemainingSeconds(nextSetAdjustment?.targetDurationSeconds ?? targetDurationSeconds); setWeight(nextSetAdjustment?.weight ?? weight); setNextSetAdjustment(null); setActiveDeadlineAt(null); setRest(90); setRestDeadlineAt(null); setPaused(false); setStage("active"); };
  const openEdit = () => {
    const currentSet = setNumber >= (activeExercise?.sets ?? 1);
    setEditingCurrentSet(currentSet); setEditReps(currentSet ? timedExercise ? targetDurationSeconds : targetReps : nextSetValue); setEditWeight(currentSet ? weight : nextSetWeight); setPreviousReps(null);
    if (stage === "rest" && restDeadlineAt !== null) { setRest(Math.max(0, Math.ceil((restDeadlineAt - Date.now()) / 1000))); setRestDeadlineAt(null); }
    if (stage === "active" && timedExercise && activeDeadlineAt !== null) { setActiveRemainingSeconds(Math.max(0, Math.ceil((activeDeadlineAt - Date.now()) / 1000))); setActiveDeadlineAt(null); }
    setPaused(true); setControlOpen(false); setEditOpen(true);
  };
  const dismissEdit = () => { setEditOpen(false); setPaused(true); };
  const saveEdit = () => {
    if (editingCurrentSet) {
      // Only the unfinished final set changes. Confirmed sets keep their snapshots.
      if (timedExercise) { setActiveRemainingSeconds(Math.max(0,editReps - (targetDurationSeconds - activeRemainingSeconds))); setTargetDurationSeconds(editReps); }
      else { setTargetReps(editReps); setRep(value=>Math.min(value,editReps)); }
      setWeight(editWeight);
    } else setNextSetAdjustment({ targetReps: timedExercise ? targetReps : editReps, targetDurationSeconds: timedExercise ? editReps : targetDurationSeconds, weight: editWeight });
    if (previousReps !== null) setCompletedSets((current) => ({ ...current, [exerciseKey(exerciseIndex)]: (current[exerciseKey(exerciseIndex)] || []).map((item) => item.setNumber === setNumber && previousReps !== (item.recordedReps ?? item.actualReps) ? { ...item, actualReps: previousReps, recordedReps: previousReps, repsSource: "manual" } : item) }));
    setEditOpen(false);
    setPaused(false);
    if (stage === "rest") setRestDeadlineAt(Date.now() + rest * 1000);
    if (stage === "active" && timedExercise) setActiveDeadlineAt(null);
  };

  const skipStrengthExercise = () => {
    if (!activeExercise) return;
    setSkippedExerciseIndexes(current=>[...new Set([...current,exerciseIndex])]);
    setPaused(false); setControlOpen(false); setActiveDeadlineAt(null); setRestDeadlineAt(null); setNextSetAdjustment(null);
    if (workoutPlan && exerciseIndex < workoutPlan.exercises.length - 1) setStage("transition");
    else finishWorkout(completedSets,true,[...skippedExerciseIndexes,exerciseIndex]);
  };

  const completeHomeLaunch = (plan: Plan, source: WorkoutSource, intent: "start" | "continue" | "restart") => {
    if (intent === "continue") {
      const frozen = snapshotRef.current;
      if (!frozen) { playLaunchPending.current = false; return; }
      resumeCountdown.current = { ...frozen, paused: true, parkedOnHome: true };
      countdownPending.current = true;
      setParkedOnHome(false); setPaused(true); setCountdown(3); setStage("countdown");
    } else {
      if (intent === "restart" && activePlan) {
        // Keep confirmed sets as an independent partial record. A strength
        // Session already saved before cooldown is never rewritten or duplicated.
        const exercises = activePlan.exercises.map((exercise, index) => ({ ...exercise, completedSets: (completedSets[exerciseKey(index)] || []).filter((set) => set.completed).map((set) => ({ ...set })) })).filter((exercise) => exercise.completedSets.length);
        if (exercises.length) {
          const session: WorkoutSession = { dataVersion: EXERCISE_DATA_VERSION, id: sessionId, source: workoutSource, environmentId: activePlan.environment, startedAt, endedAt: new Date().toISOString(), planId: workoutSource === "cycle" ? activePlan.id : undefined, planName: activePlan.name, skippedExerciseIds: skippedExerciseIndexes.map(index=>activePlan.exercises[index]?.id).filter((id):id is string=>Boolean(id)), status: "partial", completed: false, exercises };
          setData((current) => ({ ...current, ...retainInterruptedSession(current.sessions, current.phaseRecords, session) }));
        }
      }
      beginWorkout(plan, source, intent === "restart");
    }
    setPlayLaunch(null); playLaunchPending.current = false;
  };
  const launchHomePlay = (plan: Plan, source: WorkoutSource, intent: "start" | "continue" | "restart") => {
    if (playLaunchPending.current || countdownPending.current) return;
    playLaunchPending.current = true;
    keyboard.hide(); setResumeChoice(null);
    // Measure after the decision; never reuse the sheet button's coordinates.
    const rect = homeStartRef.current?.getBoundingClientRect();
    if (!rect || rect.width < 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeHomeLaunch(plan, source, intent); return;
    }
    setPlayLaunch({ plan, source: rect, intent, workoutSource: source });
  };
  const requestHomePlay = (plan: Plan, source: WorkoutSource, button: HTMLButtonElement) => {
    if (playLaunchPending.current || countdownPending.current || resumeChoice) return;
    homeStartRef.current = button;
    if (parkedOnHome) { keyboard.hide(); setResumeChoice({ plan, source }); }
    else launchHomePlay(plan, source, "start");
  };

  if (stage === "home" || parkedOnHome) return <><MobileScroll className={`app-screen training-home training-home-v3 training-home-dark home-background-${homeBackground.key}`}><main className="training-home-content">
    <header className="root-header"><h1 className="training-home-logo" aria-label="训练"><img src="/brand/logo-c-precise-dark.svg" alt="" /></h1><div className="root-header-actions"><button className="header-environment" onClick={() => setEnvironmentOpen(true)}><span>{data.currentEnvironment}</span><ChevronDownIcon /></button><button className="icon-button" aria-label="设置" onClick={openGlobalSettings}><GearIcon /></button></div></header>
    {homePlan ? <>
      <section className="training-next-hero training-immersive-hero" data-qa="next-card">
        <div className="training-immersive-title"><span>今日训练</span><h2>{homePlan.name}</h2><p>{homePlan.exercises.length} 个动作&nbsp; · &nbsp;约 {estimatedMinutes} 分钟</p></div>
        <div className="home-strength-preview"><ol className="training-immersive-list" aria-label={`${homePlan.name}动作列表`}>{homePlan.exercises.slice(0, 4).map((exercise, index) => <li key={exercise.id}><i>{String(index + 1).padStart(2, "0")}</i><span>{exercise.name}</span></li>)}</ol>{homePlan.exercises.length > 4 ? <button className="home-more-exercises" onClick={() => setListPlan(homePlan)} aria-haspopup="dialog">还有 {homePlan.exercises.length - 4} 个动作<ChevronDownIcon /></button> : null}</div>
        <HomePlayButton name={homePlan.name} buttonRef={homeStartRef} onStart={button => requestHomePlay(homePlan, homeSource, button)} />
      </section>
      <button disabled={parkedOnHome} className="training-next-quick glass-card" data-qa="quick-start" onClick={() => setCustomPickerOpen(true)}><span><small>没有合适的计划？</small><b>自由训练</b></span><span className="training-next-quick-icon"><PlusIcon /></span></button>
    </> : <section className="recommendation-home recommendation-home-unified" data-qa="recommendation-home"><h2>今天想练什么？</h2><p className="recommendation-introduction"><span>选择一套推荐训练直接开始，</span><button disabled={parkedOnHome} className="free-training-inline" onClick={() => setCustomPickerOpen(true)}>或自由搭配</button></p><Carousel ariaLabel="推荐训练" className="home-recommendations" contentClassName="home-recommendation-track">{recommendations.map(plan=><RecommendationPlanCard key={plan.id} plan={plan} timing={normalizeTrainingTiming(data.trainingTiming)} disabled={parkedOnHome} onDetails={()=>setRecommendationDetail(plan)} onFullList={()=>setListPlan(plan)} onPlay={button=>requestHomePlay(plan,"recommended",button)}/>)}</Carousel></section>}
  </main></MobileScroll><AppNav active="training" onNavigate={onNavigate} />{playLaunch ? <PlayCountdownTransition source={playLaunch.source} name={playLaunch.plan.name} onComplete={() => completeHomeLaunch(playLaunch.plan, playLaunch.workoutSource, playLaunch.intent)} /> : null}{toast ? <div className="toast"><CheckIcon />{toast}</div> : null}
  {resumeChoice ? <BottomSheet open onOpenChange={(open) => !open && setResumeChoice(null)} title="开始训练" snap={0.4}><div className="training-resume-choice"><button className="primary-button" onClick={() => { if (activePlan) launchHomePlay(activePlan, workoutSource, "continue"); }}>继续上次训练</button><button className="secondary-button" onClick={() => launchHomePlay(resumeChoice.plan, resumeChoice.source, "restart")}>重新开始训练</button></div></BottomSheet> : null}
  <BottomSheet open={environmentOpen} onOpenChange={setEnvironmentOpen} title="训练环境" snap={0.35}><EnvironmentOptions environments={data.environments} value={data.currentEnvironment} onSelect={selectEnvironment} /></BottomSheet>
  <EnvironmentManager open={manageEnvironmentOpen} onClose={() => setManageEnvironmentOpen(false)} data={data} setData={setData} onDelete={deleteEnvironment} />
  <BottomSheet open={Boolean(recommendationDetail)} onOpenChange={(open) => !open && setRecommendationDetail(null)} title={recommendationDetail?.name || "推荐训练"} description="仅用于本次临时训练" snap={0.78}><div className="recommendation-detail-list">{recommendationDetail ? <><div className="recommendation-phase-heading">训练前热身</div>{phasesForPlan(recommendationDetail, "warmup").map((item) => <div key={item.id}><i>热</i><span><b>{item.name}</b><small>{item.defaultDose} · 系统匹配</small></span></div>)}<div className="recommendation-phase-heading">力量训练</div></> : null}{recommendationDetail?.exercises.map((exercise, index) => <div key={exercise.id}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{exercise.name}</b><small>{summaryParts(`${exercise.sets} 组 × ${exerciseSummary(exercise)}`,weightSummary(exercise,exercise.weight))}</small></span></div>)}{recommendationDetail ? <><div className="recommendation-phase-heading">训练后拉伸</div>{phasesForPlan(recommendationDetail, "cooldown").map((item) => <div key={item.id}><i>伸</i><span><b>{item.name}</b><small>{item.defaultDose} · 系统匹配</small></span></div>)}</> : null}</div><button className="primary-button sheet-save" onClick={() => { if (recommendationDetail) beginWorkout(recommendationDetail, "recommended"); setRecommendationDetail(null); }}>START</button></BottomSheet>
  <PlanOverviewSheet plan={listPlan} onClose={() => setListPlan(null)} />
  <AddExerciseSheet inventory={data.environmentEquipment} open={customPickerOpen} environment={data.currentEnvironment} onOpenChange={setCustomPickerOpen} onAdd={(items) => beginWorkout({ id: `custom-${Date.now()}`, name: "自定义临时训练", environment: data.currentEnvironment, exercises: items }, "custom")} /></>;

  const endWorkoutActions = <div className="end-workout-actions"><button className="danger-button" onClick={finishPartial}>提前结束训练</button><button className="end-workout-continue" onClick={() => { setExitOpen(false); if (stage === "active" || stage === "rest") resumeWorkout(); }}>继续训练</button></div>;
  if (stage === "summary") return null;
  if ((phase === "warmup" || phase === "cooldown") && phaseItem && stage !== "countdown") {
    const available = Boolean(activePlan && runPhaseAvailable(phaseItem, activePlan.environment));
    const segmentLabel: Record<string, string> = { whole: "", forward: "向前", back: "向后", center: "中间", left: "左侧", right: "右侧" };
    const currentSegment = segmentLabel[phaseSegment];
    // Phase media is allowlisted by the phase item's own stable ID. A data
    // exerciseRef must never silently substitute a strength demonstration.
    const mediaExerciseId = phaseItem.id;
    if (stage === "phase-intro" || stage === "phase-ready") {
      const nextPhaseItem = stage === "phase-intro" ? phaseItem : runPhaseItem(currentPhaseIds[phaseItemIndex + 1] ?? "");
      const nextStrength = phase === "warmup" && !nextPhaseItem ? workoutPlan?.exercises[0] : undefined;
      const nextName = nextPhaseItem?.name ?? nextStrength?.name ?? "训练记录";
      const nextId = nextPhaseItem?.id ?? nextStrength?.id ?? "";
      const nextSummary = nextPhaseItem ? summaryParts(`${nextPhaseItem.sets ?? 1} 组 × ${nextPhaseItem.target} ${nextPhaseItem.measurementType === "duration" ? "秒" : "次"}`, nextPhaseItem.equipment === "dumbbell" ? "2.5 kg" : nextPhaseItem.equipment === "fixed-support" ? "固定支撑" : "") : nextStrength ? summaryParts(`${nextStrength.sets} 组 × ${exerciseSummary(nextStrength)}`,weightSummary(nextStrength, nextStrength.weight)) : "训练已完成";
      return <MobileScroll className="app-screen light-screen"><NextActionView name={nextName} mediaId={nextId} mediaSegment={nextPhaseItem?.segments[0] ?? "whole"} summary={nextSummary} onStart={stage === "phase-intro" ? () => { if (countdownPending.current) return; countdownPending.current = true; setPaused(false); setStage("countdown"); } : advancePhase} startLabel={nextPhaseItem || nextStrength ? "START" : "查看记录"} /></MobileScroll>;
    }
    if (stage === "phase-rest") return <>
      <MobileScroll className="app-screen training-screen rest-mode"><main className="rest-content"><header className="immersive-header rest-header"><div className="immersive-title"><h1>{phaseItem.name}</h1><p>下一组 · 第 {Math.floor(phaseSegmentIndex / (phaseItem.segmentsPerSet ?? phaseItem.segments.length)) + 1} / {phaseItem.sets ?? 1} 组</p></div><div className="training-controls"><button className="pause-button" onClick={paused ? resumePhase : pausePhase}>{paused ? "继续训练" : "暂停 / 调整"}</button></div></header><div className="rest-label">组间休息</div><div className="rest-timer">{fmtTime(phaseRemaining)}</div><button className="primary-button" onClick={()=>{setPhaseDeadlineAt(null);setPhaseRemaining(phaseItem.target);setPaused(false);setStage("active");}}>提前开始下一组</button></main></MobileScroll>
      <TrainingControlSheet open={controlOpen} onOpenChange={setControlOpen} onResume={resumePhase} endLabel="结束训练" onEnd={()=>{setPhaseExitKind("workout");setControlOpen(false);setExitOpen(true);}} actions={<><button className="secondary-button" onClick={skipPhaseItem}>跳过当前动作</button><button className="control-phase-skip" onClick={()=>{setPhaseExitKind("phase");setControlOpen(false);setExitOpen(true);}}>跳过整个{phase === "warmup" ? "热身" : "拉伸"}阶段</button></>} />
      <BottomSheet open={exitOpen} onOpenChange={setExitOpen} title={phaseExitKind === "phase" ? `跳过整个${phase === "warmup" ? "热身" : "拉伸"}阶段？` : "结束训练？"} snap={.3}><div className="end-workout-actions"><button className="danger-button" onClick={()=>{setExitOpen(false);phaseExitKind === "phase" ? skipPhase() : phase === "cooldown" ? openCompletedRecord() : finishPartial();}}>确认{phaseExitKind === "phase" ? "跳过阶段" : "结束训练"}</button><button className="end-workout-continue" onClick={()=>{setExitOpen(false);setPaused(true);setControlOpen(true);}}>返回暂停界面</button></div></BottomSheet>
    </>;
    return <>
      <MobileScroll key={`phase-${phase}-${phaseItemIndex}`} className="app-screen training-screen"><ActiveSetView repIntervalMs={repIntervalMs} name={phaseItem.name} setNumber={Math.floor(phaseSegmentIndex / (phaseItem.segmentsPerSet ?? phaseItem.segments.length)) + 1} totalSets={phaseItem.sets ?? 1} mediaId={mediaExerciseId} mediaSegment={phaseSegment} display={stage === "phase-switch" || phaseItem.measurementType === "duration" ? fmtTime(phaseRemaining) : Math.min(phaseItem.target, phaseItem.target - phaseRemaining + 1)} target={stage === "phase-switch" ? "准备换侧 · 5 秒" : `${phaseItem.target} ${phaseItem.measurementType === "duration" ? "秒" : "次"}${currentSegment ? ` · ${currentSegment}` : ""}`} load={phaseItem.equipment === "dumbbell" ? "2.5 kg" : phaseItem.equipment === "fixed-support" ? "固定支撑" : ""} cue={available ? "" : `当前环境缺少${phaseItem.equipment === "dumbbell" ? "哑铃" : "固定支撑"}，请在暂停菜单跳过本项`} paused={paused} mediaPaused={paused || stage === "phase-switch"} onPause={paused ? resumePhase : pausePhase} /></MobileScroll>
      <TrainingControlSheet open={controlOpen} onOpenChange={(open) => { setControlOpen(open); if (!open) setPaused(true); }} onResume={resumePhase} endLabel="结束训练" onEnd={() => { setPhaseExitKind("workout"); setControlOpen(false); setExitOpen(true); }} actions={<><button className="secondary-button" onClick={skipPhaseItem}>跳过当前动作</button><button className="control-phase-skip" onClick={()=>{setPhaseExitKind("phase");setControlOpen(false);setExitOpen(true);}}>跳过整个{phase === "warmup" ? "热身" : "拉伸"}阶段</button></>} />
      <BottomSheet open={exitOpen} onOpenChange={setExitOpen} title={phaseExitKind === "phase" ? `跳过整个${phase === "warmup" ? "热身" : "拉伸"}阶段？` : "结束训练？"} snap={0.3}><div className="end-workout-actions"><button className="danger-button" onClick={() => { setExitOpen(false); phaseExitKind === "phase" ? skipPhase() : phase === "cooldown" ? openCompletedRecord() : finishPartial(); }}>确认{phaseExitKind === "phase" ? "跳过阶段" : "结束训练"}</button><button className="end-workout-continue" onClick={() => { setExitOpen(false); setPaused(true); setControlOpen(true); }}>返回暂停界面</button></div></BottomSheet>
    </>;
  }
  if (stage === "transition") { const next = workoutPlan?.exercises[exerciseIndex + 1]; return <><MobileScroll className="app-screen light-screen"><NextActionView name={next?.name || "下一动作"} mediaId={next?.id ?? ""} summary={summaryParts(`${next?.sets || 0} 组 × ${next ? exerciseSummary(next) : "0 次"}`,weightSummary(next, next?.weight))} onStart={() => { if (countdownPending.current) return; countdownPending.current = true; setPaused(false); setStage("countdown"); }} onExit={() => setExitOpen(true)} /></MobileScroll><BottomSheet open={exitOpen} onOpenChange={setExitOpen} title="结束训练？" snap={0.28}>{endWorkoutActions}</BottomSheet></>; }
  if (stage === "countdown") return <CountdownView count={countdown} name={workoutSource === "cycle" ? workoutPlan?.name : "下一动作"} />;

  const controls = <div className="training-controls"><button className="pause-button" onClick={paused ? resumeWorkout : pauseWorkout}>{paused ? "继续训练" : "暂停 / 调整"}</button></div>;
  return <>
    <MobileScroll className={`app-screen training-screen ${stage === "rest" ? "rest-mode" : ""}`}>
      {stage === "active" ? <ActiveSetView repIntervalMs={repIntervalMs} name={exerciseName} setNumber={setNumber} totalSets={activeExercise?.sets || 1} mediaId={activeExercise?.id ?? ""} display={timedExercise ? fmtTime(activeRemainingSeconds) : rep} target={timedExercise ? `${targetDurationSeconds} 秒` : `${targetReps} 次`} load={weightSummary(activeExercise, weight)} cue={exerciseCue(activeExercise)} paused={paused} onPause={paused ? resumeWorkout : pauseWorkout} /> : <main className="rest-content"><header className="immersive-header rest-header"><div className="immersive-title"><h1>{exerciseName}</h1><p>下一组 · 第 {setNumber + 1} / {activeExercise?.sets || 1} 组</p></div>{controls}</header><div className="rest-label">组间休息倒计时</div><div className="rest-timer">{fmtTime(rest)}</div><button className="next-set-row" aria-label={`下一组 ${nextSetValue} ${timedExercise ? "秒" : "次"} ${weightSummary(activeExercise, nextSetWeight)} 修改`} onClick={openEdit}><span><b>{summaryParts(`${nextSetValue} ${timedExercise ? "秒" : "次"}`, weightSummary(activeExercise, nextSetWeight))}</b></span><span>修改 <ChevronRightIcon /></span></button><div className="rest-actions"><button onClick={() => { setRest((value) => value + 15); setRestDeadlineAt((value) => value === null ? null : value + 15_000); }}>+15 秒</button><button className="lime" onClick={startNextSet}>提前开始下一组</button></div></main>}
    </MobileScroll>
    <TrainingControlSheet open={controlOpen} onOpenChange={setControlOpen} onResume={resumeWorkout} endLabel="结束训练" onEnd={() => { setControlOpen(false); setExitOpen(true); }} actions={<><button className="secondary-button" onClick={openEdit}>调整参数</button><button className="secondary-button" onClick={skipStrengthExercise}>跳过当前动作</button></>} />
    <BottomSheet open={editOpen} onOpenChange={(open) => open ? openEdit() : dismissEdit()} title={editingCurrentSet ? "调整当前组" : "调整下一组"} snap={0.6}>
      <div className="rest-parameter-editor">
        <div className="rest-parameter-target">第 {editingCurrentSet ? setNumber : setNumber + 1} / {activeExercise?.sets ?? 1} 组</div>
        <div className="rest-parameter-row">
          <button aria-label={`减少${editingCurrentSet ? "当前组" : "下一组"}${timedExercise ? "秒数" : "次数"}`} onClick={() => setEditReps((value) => Math.max(1, value - 1))}><MinusIcon /></button>
          <span><b>{editReps}{timedExercise ? " 秒" : ""}</b><small>{timedExercise ? "调整目标时长" : "调整次数"}</small></span>
          <button aria-label={`增加${editingCurrentSet ? "当前组" : "下一组"}${timedExercise ? "秒数" : "次数"}`} onClick={() => setEditReps((value) => value + 1)}><PlusIcon /></button>
        </div>
        {!isBodyweightEquipment(activeExercise?.equipment) ? <div className="rest-parameter-row">
          <button aria-label={`减少${editingCurrentSet ? "当前组" : "下一组"}重量`} onClick={() => setEditWeight((value) => Math.max(0, value - 0.5))}><MinusIcon /></button>
          <span><b>{editWeight ? `${editWeight} kg` : "重量未设置"}</b><small>调整重量</small></span>
          <button aria-label={`增加${editingCurrentSet ? "当前组" : "下一组"}重量`} onClick={() => setEditWeight((value) => value + 0.5)}><PlusIcon /></button>
        </div> : null}

      </div>
      <button className="primary-button sheet-save" onClick={saveEdit}>保存并继续</button>
    </BottomSheet>
    <BottomSheet open={exitOpen} onOpenChange={(open) => { setExitOpen(open); if (!open) setPaused(true); }} title="结束训练？" snap={0.28}>{endWorkoutActions}</BottomSheet>
  </>;
}

function useNativeSheetBounds(open: boolean, kind: "picker" | "plan" | "environment", ratio = 1) {
  useEffect(() => {
    if (!open || !matchMedia("(max-width: 600px), (display-mode: standalone)").matches) return;
    const screen = document.querySelector<HTMLElement>(".device-screen");
    const viewport = window.visualViewport;
    if (!screen) return;
    let frame = 0;
    const update = () => {
      const bounds = screen.getBoundingClientRect();
      const visibleTop = viewport?.offsetTop ?? 0;
      const visibleBottom = visibleTop + (viewport?.height ?? innerHeight);
      const bottom = Math.min(bounds.bottom, visibleBottom);
      const height = Math.min(bounds.height * ratio, Math.max(0, bottom - Math.max(bounds.top + 65, visibleTop + 12)));
      screen.style.setProperty(`--ritmo-${kind}-native-bottom`, `${Math.max(0, bounds.bottom - bottom)}px`);
      screen.style.setProperty(`--ritmo-${kind}-native-height`, `${height}px`);
      if (!(document.activeElement instanceof HTMLElement && document.activeElement.matches("input,textarea,[contenteditable=true]"))) {
        // Reset only app-shell offsets, never the user's scrolled result list.
        if (scrollX || scrollY) window.scrollTo(0, 0);
        if (screen.scrollLeft || screen.scrollTop) screen.scrollTo(0, 0);
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    // The input mounts later than the sheet; focusout bubbles from it reliably.
    screen.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      screen.removeEventListener("focusout", schedule);
      screen.style.removeProperty(`--ritmo-${kind}-native-bottom`);
      screen.style.removeProperty(`--ritmo-${kind}-native-height`);
    };
  }, [open, kind, ratio]);
}

function AddExerciseSheet({ open, environment, inventory, existingIds = [], onOpenChange, onAdd }: { open: boolean; environment: string; inventory?: EnvironmentEquipment; existingIds?: string[]; onOpenChange: (open: boolean) => void; onAdd: (items: Exercise[]) => void }) {
  const keyboard = useKeyboard();
  const [tab, setTab] = useState("胸");
  const [query, setQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(true);
  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const core = library.filter((item) => !removedRecommendationIds.has(item.id) && item.muscle === tab && (!term || `${item.name} ${item.standardName ?? ""} ${prioritySearchText(item.id)}`.toLocaleLowerCase().includes(term)) && (!availableOnly || isExerciseAvailable(item, environment, inventory)));
    // The default list contains only localized priority candidates. The rest
    // of the imported catalog remains available through an explicit search.
    if (term && term.length < 2 && !/[\u3400-\u9fff]/.test(term)) return core;
    const extra = extendedSearch(term, tab, environment, availableOnly && !inventory?.[environment], term.length >= 3)
      .filter((entry) => term || (priorityById.has(entry.id) && !crosswalkByExternalId.has(entry.id))).map(extendedSpec).filter(item => !availableOnly || isExerciseAvailable(item, environment, inventory));
    return [...core, ...extra.filter(item => !core.some(existing => existing.id === item.id))];
  }, [availableOnly, environment, inventory, tab, query]);
  useEffect(() => { if (!open) { setSearchActive(false); setSelected([]); setQuery(""); } }, [open]);
  useLayoutEffect(() => {
    if (!open || !searchActive) return;
    // Native iPhone focus must not pan the sheet to the input's intrinsic width.
    searchInputRef.current?.focus({ preventScroll: true });
  }, [open, searchActive]);
  useNativeSheetBounds(open, "picker");
  const complete = () => { keyboard.hide(); onAdd(editableExercises(selected.map((id) => getExerciseSpec(id)).filter((item): item is ExerciseSpec => !!item))); setSelected([]); onOpenChange(false); };
  return <BottomSheet open={open} onOpenChange={(value) => { if (!value) { keyboard.hide(); setSelected([]); setQuery(""); } onOpenChange(value); }} title="添加动作" snap={0.92}>
    <div className="exercise-picker-layout"><div className="exercise-picker-tools">{searchActive ? <div className="search-field"><MagnifyingGlassIcon /><KeyboardInput ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => keyboard.hide()} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); keyboard.hide(); } }} enterKeyHint="done" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="搜索动作" placeholder="搜索中文、英文或别名" /></div> : <button className="search-field search-trigger" onClick={() => setSearchActive(true)}><MagnifyingGlassIcon /><span>搜索动作</span></button>}<div className="muscle-tabs">{muscleTabs.map((name) => <button key={name} className={tab === name ? "on" : ""} onClick={() => setTab(name)}>{name}</button>)}</div><div className="availability-switch"><span><b>仅当前环境可用</b></span><button aria-label="仅当前环境可用" aria-pressed={availableOnly} className={`ritmo-switch ${availableOnly ? "on" : ""}`} onClick={() => setAvailableOnly((value) => !value)}><i /></button></div></div><div className="exercise-picker-scroll"><div className="available-title"><span>{shown.length} 个结果{shown.length >= 60 ? " · 最多显示前 60 项" : ""}</span></div><div className="library-list">{shown.map((item) => { const checked = selected.includes(item.id); const available = isExerciseAvailable(item, environment, inventory); const exists = existingIds.includes(item.id); const external = extendedById.get(item.id); const priority = priorityById.get(item.id); return <button key={item.id} disabled={exists} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])}><span><b>{item.name}</b><small>{external ? `${priority?.variantZh ?? "暂无中文变式说明"} · ${item.muscle} · 扩展·待审校` : `${item.equipment} · ${item.muscle}`}{exists ? " · 已在方案中" : available ? "" : " · 其他环境"}</small></span><i className={checked ? "checked" : ""}>{checked ? <CheckIcon /> : null}</i></button>; })}{shown.length === 0 ? <div className="picker-empty">当前筛选下暂无动作</div> : null}</div></div><button className="primary-button picker-action" disabled={selected.length === 0} onClick={complete}>添加已选动作 · {selected.length}</button></div>
  </BottomSheet>;
}

function ParameterSheet({ exercise, open, onOpenChange, onUpdate }: { exercise?: Exercise; open: boolean; onOpenChange: (open: boolean) => void; onUpdate: (patch: Partial<Exercise>) => void }) {
  const [draft, setDraft] = useState<Exercise | undefined>(exercise);
  useEffect(() => { if (open) setDraft(exercise); }, [open, exercise]);
  if (!exercise) return null;
  const timed = getExerciseSpec(exercise.id)?.measurementType === "duration";
  const current = draft ?? exercise;
  const adjust = (field: "sets" | "reps" | "targetDurationSeconds" | "weight", delta: number) => setDraft((previous) => {
    const value = previous ?? exercise;
    const minimum = field === "weight" ? 0 : 1;
    const startingValue = field === "targetDurationSeconds" ? getDurationSeconds(value) : value[field] ?? 0;
    return { ...value, [field]: Math.max(minimum, Math.round((startingValue + delta) * 2) / 2) };
  });
  const rows = [
    { key: "sets" as const, value: `${current.sets}`, caption: "组数", step: 1 },
    timed ? { key: "targetDurationSeconds" as const, value: `${getDurationSeconds(current)} 秒`, caption: "目标时长", step: 1 }
      : { key: "reps" as const, value: `${current.reps} 次`, caption: "目标次数", step: 1 },
    { key: "weight" as const, value: weightSummary(current, current.weight), caption: "训练重量", step: 0.5 },
  ];
  return <BottomSheet open={open} onOpenChange={onOpenChange} title={exercise.name} snap={0.66}>
    <div className="plan-parameter-editor">{rows.filter(row => row.key !== "weight" || !isBodyweightEquipment(current.equipment)).map((row) => <div className="rest-parameter-row" key={row.key}>
      <button type="button" aria-label={`减少${row.caption}`} onClick={() => adjust(row.key, -row.step)}><MinusIcon /></button>
      <span><b>{row.value}</b><small>{row.caption}</small></span>
      <button type="button" aria-label={`增加${row.caption}`} onClick={() => adjust(row.key, row.step)}><PlusIcon /></button>
    </div>)}</div>
    <button className="primary-button sheet-save" onClick={() => { if (draft) onUpdate({ sets: draft.sets, reps: draft.reps, targetDurationSeconds: draft.targetDurationSeconds, weight: draft.weight, weightSource: "user" }); onOpenChange(false); }}>完成</button>
  </BottomSheet>;
}

type PlanDetailMode = "create" | "preset" | "edit";
function PlanPhaseIcon({ phase }: { phase: WorkoutPhase }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{phase === "warmup" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : phase === "strength" ? <><path d="M8 12h8M3 9v6m18-6v6" /><rect x="5" y="6" width="3" height="12" rx="1" /><rect x="16" y="6" width="3" height="12" rx="1" /></> : <><circle cx="12" cy="4" r="2" /><path d="m4 8 8 3 8-3m-8 3v5m0 0-5 6m5-6 5 6" /></>}</svg>;
}
function PlanCreationCard({ title, description, onAdd, className = "" }: { title:string; description:string; onAdd:()=>void; className?:string }) {
  return <div className={`plan-creation-card ${className}`}><button className="plan-creation-action" aria-label={title} onClick={onAdd}><PlusCircledIcon aria-hidden="true" /><span>{title}</span></button><p>{description}</p></div>;
}

function SystemPhaseRows({ plan, phase }: { plan: Plan; phase: "warmup" | "cooldown" }) {
  const items = phasesForPlan(plan, phase);
  return <section className="plan-phase-section" aria-label={phase === "warmup" ? "热身" : "拉伸"}>
    <h3>{phase === "warmup" ? "热身" : "拉伸"}</h3>
    <div className="plan-phase-card">{items.length ? items.map((item) => {
      const prefix = item.segments.includes("left") && item.segments.includes("right") ? "每侧 " : item.segments.includes("forward") && item.segments.includes("back") ? "每方向 " : "";
      return <div className="plan-phase-fixed-row" key={item.id} data-phase-item={item.id}>
        <span className="plan-phase-icon"><PlanPhaseIcon phase={phase} /></span>
        <span className="exercise-main"><b>{item.name}</b><small>{prefix}{item.target} {item.measurementType === "duration" ? "秒" : "次"} · {phase === "warmup" ? `${item.sets ?? 1} 组` : `${item.sets ?? 1} 轮`}{phaseItemAvailable(item, plan.environment) ? "" : " · 当前环境缺少器械，可跳过"}</small></span>
      </div>;
    }) : <div className="plan-phase-empty">暂无匹配动作</div>}</div>
  </section>;
}
// Browsing from Home uses the same grouped rows and sheet rhythm as plan editing.
// No draft or editing callbacks: viewing the complete plan cannot change it.
function PlanOverviewSheet({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  useNativeSheetBounds(Boolean(plan), "plan", .92);
  return <BottomSheet open={Boolean(plan)} onOpenChange={(open) => !open && onClose()} title={plan?.name || "训练方案"} snap={0.92}>
    {plan ? <div className="plan-detail plan-overview">
      <div className="plan-detail-heading"><h2>{plan.name}</h2></div>
      <div className="plan-detail-body">
        <SystemPhaseRows plan={plan} phase="warmup" />
        <section className="plan-phase-section" aria-label="力量训练">
          <h3>力量训练</h3>
          <div className="plan-phase-card">{plan.exercises.map((item) => <div className="plan-phase-fixed-row" key={item.id} data-strength-item={item.id}>
            <span className="plan-phase-icon"><PlanPhaseIcon phase="strength" /></span>
            <span className="exercise-main"><b>{item.name}</b><small>{summaryParts(`${item.sets} × ${exerciseSummary(item)}`, weightSummary(item, item.weight))}</small></span>
          </div>)}</div>
        </section>
        <SystemPhaseRows plan={plan} phase="cooldown" />
      </div>
    </div> : null}
  </BottomSheet>;
}
function PlanDetailSheet({ open, initial, mode, onClose, onSave, onRequestAdd, onDelete }: { open: boolean; initial: Plan; mode: PlanDetailMode; onClose: () => void; onSave: (plan: Plan) => void; onRequestAdd: (draft: Plan) => void; onDelete?: (plan: Plan) => void }) {
  const keyboard = useKeyboard();
  const [draft, setDraft] = useState(initial);
  const [nameEditing, setNameEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useNativeSheetBounds(open, "plan", .92);
  useLayoutEffect(() => { if (open && nameEditing) nameInputRef.current?.focus({ preventScroll: true }); }, [open, nameEditing]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parameterOpen, setParameterOpen] = useState(false);
  const [swipe, setSwipe] = useState<{ id: string; offset: number } | null>(null);
  const swipeGesture = useRef<{ id: string; pointerId: number; x: number; y: number; initial: number; horizontal: boolean } | null>(null);
  const suppressRowClickUntil = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowDrag, setRowDrag] = useState<{ id: string; target: number; offset: number } | null>(null);
  const rowDragRef = useRef<{ id: string; pointerId: number; startY: number; y: number; scrollTop: number; target: number } | null>(null);
  useEffect(() => { if (!open) { setSwipe(null); swipeGesture.current = null; rowDragRef.current = null; setRowDrag(null); } }, [open]);
  useEffect(() => { setDraft(initial); setNameEditing(false); }, [initial, open]);
  const editing = draft.exercises.find((item) => item.id === editingId);
  const empty = draft.exercises.length === 0;
  const updateDraft = (next: Plan) => setDraft(next);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const requestClose = () => { if (!dirty || window.confirm("放弃未保存的修改？")) onClose(); };
  const moveTo = (id: string, target: number) => {
    setDraft((current) => {
      const from = current.exercises.findIndex((item) => item.id === id);
      if (from < 0 || target < 0 || target >= current.exercises.length || from === target) return current;
      const exercises = [...current.exercises];
      const [item] = exercises.splice(from, 1); exercises.splice(target, 0, item);
      return { ...current, exercises };
    });
  };
  const remove = (id: string) => {
    // Deletion changes only the editable draft; Save commits it, Cancel can discard it.
    setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== id) }));
    setSwipe(null);
  };
  const updateDrag = () => {
    const drag = rowDragRef.current, body = bodyRef.current;
    if (!drag || !body) return;
    const rows = Array.from(body.querySelectorAll<HTMLElement>(".detail-exercise-row"));
    let distance = Infinity, target = drag.target;
    rows.forEach((row, index) => { const rect = row.getBoundingClientRect(); const delta = Math.abs(drag.y - rect.top - rect.height / 2); if (delta < distance) { distance = delta; target = index; } });
    drag.target = target;
    setRowDrag({ id: drag.id, target, offset: drag.y - drag.startY + body.scrollTop - drag.scrollTop });
  };
  useEffect(() => {
    if (!rowDrag) return;
    let frame = 0;
    const tick = () => {
      const drag = rowDragRef.current, body = bodyRef.current;
      if (!drag || !body) return;
      const rect = body.getBoundingClientRect();
      if (drag.y < rect.top + 36) body.scrollTop -= 6;
      else if (drag.y > rect.bottom - 36) body.scrollTop += 6;
      updateDrag(); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rowDrag?.id]);
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = rowDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!cancelled && Math.abs(event.clientY - drag.startY) >= 8) moveTo(drag.id, drag.target);
    rowDragRef.current = null; setRowDrag(null); suppressRowClickUntil.current = performance.now() + 250;
  };
  const endSwipe = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = swipeGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.horizontal) {
      const offset = Math.max(-76, Math.min(0, gesture.initial + event.clientX - gesture.x));
      setSwipe(cancelled ? gesture.initial < 0 ? { id: gesture.id, offset: -76 } : null : offset < -32 ? { id: gesture.id, offset: -76 } : null);
      suppressRowClickUntil.current = performance.now() + 250;
    }
    swipeGesture.current = null;
  };
  const updateExercise = (patch: Partial<Exercise>) => updateDraft({ ...draft, exercises: draft.exercises.map((item) => item.id === editingId ? { ...item, ...patch } : item) });
  const action = mode === "create" ? "保存方案" : mode === "preset" ? "应用方案" : "保存修改";
  return <>
    <BottomSheet open={open} onOpenChange={(value) => !value && requestClose()} title={mode === "preset" ? "推荐方案详情" : mode === "create" ? "新建方案" : "编辑方案"} snap={0.92}>
      <div className={`plan-detail${empty ? " plan-create-detail plan-empty-detail" : ""}`}>
        <div className="plan-detail-heading">{mode !== "preset" && nameEditing ? <KeyboardInput ref={nameInputRef} className="plan-title-input" aria-label="方案名称" enterKeyHint="done" onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); keyboard.hide(); } }} value={draft.name} onBlur={() => { keyboard.hide(); setNameEditing(false); }} onChange={(event) => updateDraft({ ...draft, name: event.target.value })} /> : <h2>{draft.name}</h2>}{mode !== "preset" && !nameEditing ? <button aria-label="编辑方案名称" onClick={() => setNameEditing(true)}><Pencil1Icon /></button> : null}</div>
        <div className="plan-detail-body" ref={bodyRef} onPointerDownCapture={(event) => { if (swipe && (event.target as HTMLElement).closest("[data-exercise-id]")?.getAttribute("data-exercise-id") !== swipe.id) setSwipe(null); }}>
          {!empty ? <SystemPhaseRows plan={draft} phase="warmup" /> : null}
          <section className="plan-phase-section" aria-label="力量训练">{!empty ? <div className="plan-strength-heading"><h3>力量训练</h3></div> : null}<div className="plan-phase-card strength-phase-card">
            {draft.exercises.length === 0 ? <PlanCreationCard title="添加训练动作" description="热身和拉伸将根据训练部位自动安排" onAdd={()=>onRequestAdd(draft)} /> : draft.exercises.map((item, index) => {
              const offset = !rowDrag && swipe?.id === item.id ? swipe.offset : 0;
              const dragging = rowDrag?.id === item.id;
              return <div className={`detail-exercise-row${swipeGesture.current?.id === item.id && swipeGesture.current.horizontal ? " swiping" : ""}${dragging ? " dragging" : ""}${rowDrag && !dragging && rowDrag.target === index ? " drop-target" : ""}`} key={item.id} data-exercise-id={item.id}
                onPointerDown={(event) => { if (rowDragRef.current || (event.pointerType === "mouse" && event.button !== 0) || (event.target as HTMLElement).closest(".exercise-drag,.exercise-swipe-delete")) return; swipeGesture.current = { id: item.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, initial: offset, horizontal: false }; }}
                onPointerMove={(event) => {
                  const gesture = swipeGesture.current;
                  if (!gesture || gesture.pointerId !== event.pointerId) return;
                  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
                  if (!gesture.horizontal) {
                    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { swipeGesture.current = null; return; }
                    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                    gesture.horizontal = true; event.currentTarget.setPointerCapture(event.pointerId);
                  }
                  event.preventDefault(); setSwipe({ id: item.id, offset: Math.max(-76, Math.min(0, gesture.initial + dx)) });
                }} onPointerUp={(event) => endSwipe(event)} onPointerCancel={(event) => endSwipe(event, true)}
                onClickCapture={(event) => { if (performance.now() < suppressRowClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
                {offset < 0 ? <button className="exercise-swipe-delete" tabIndex={offset === -76 ? 0 : -1} aria-hidden={offset !== -76} aria-label={`删除${item.name}`} onClick={() => remove(item.id)}><TrashIcon /><span>删除</span></button> : null}
                <div className="exercise-row-front" style={{ transform: dragging ? `translateY(${rowDrag.offset}px)` : `translateX(${offset}px)` }}>
                  <span className="plan-phase-icon"><PlanPhaseIcon phase="strength" /></span>
                  <button className="exercise-main" onClick={() => { if (swipe) { setSwipe(null); return; } keyboard.hide(); setEditingId(item.id); setParameterOpen(true); }} onKeyDown={(event) => { if (event.key === "Delete") { event.preventDefault(); setSwipe({ id: item.id, offset: -76 }); } }}><b>{item.name}</b><small>{summaryParts(`${item.sets} × ${exerciseSummary(item)}`,weightSummary(item,item.weight))}</small></button>
                  <button type="button" className="exercise-drag" data-scroll-drag="ignore" aria-label={`拖动${item.name}调整顺序，或按上下方向键排序`} onPointerDown={(event) => {
                    if (event.pointerType === "mouse" && event.button !== 0) return;
                    event.preventDefault(); event.stopPropagation(); keyboard.hide(); setSwipe(null); swipeGesture.current = null;
                    rowDragRef.current = { id: item.id, pointerId: event.pointerId, startY: event.clientY, y: event.clientY, scrollTop: bodyRef.current?.scrollTop ?? 0, target: index };
                    setRowDrag({ id: item.id, target: index, offset: 0 }); event.currentTarget.setPointerCapture(event.pointerId);
                  }} onPointerMove={(event) => { const drag = rowDragRef.current; if (drag?.pointerId === event.pointerId) { drag.y = event.clientY; updateDrag(); } }} onPointerUp={(event) => endDrag(event)} onPointerCancel={(event) => endDrag(event, true)} onLostPointerCapture={(event) => endDrag(event, true)} onKeyDown={(event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setSwipe(null); moveTo(item.id, index + (event.key === "ArrowUp" ? -1 : 1)); }
                    if (event.key === "Delete") { event.preventDefault(); setSwipe({ id: item.id, offset: -76 }); }
                  }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" /></svg></button>
                </div>
              </div>;
            })}
          </div></section>
          {!empty ? <SystemPhaseRows plan={draft} phase="cooldown" /> : null}
        </div>
        {!empty ? <button className="manual-add compact" onClick={() => onRequestAdd(draft)}><PlusIcon /> 添加动作</button> : null}
        <button className="primary-button save-plan" disabled={draft.exercises.length === 0 || !draft.name.trim()} onClick={() => onSave(draft)}>{action}</button>
        {mode === "edit" && onDelete ? <button className="delete-plan-button" onClick={() => onDelete(initial)}>删除方案</button> : null}
      </div>
    </BottomSheet>
    <ParameterSheet exercise={editing} open={parameterOpen} onOpenChange={setParameterOpen} onUpdate={updateExercise} />
  </>;
}

function PlansDemo({ data, setData, onNavigate, qaScreen, firstBatchQa }: { data: RitmoData; setData: Dispatch<SetStateAction<RitmoData>>; onNavigate: (flow: DemoFlow) => void; qaScreen?: string | null; firstBatchQa?: boolean }) {
  const keyboard = useKeyboard();
  const [screen, setScreen] = useState<"home" | "create">(qaScreen === "create" || qaScreen === "detail" || qaScreen === "add" ? "create" : "home");
  const [detailOpen, setDetailOpen] = useState(false);
  const [cycleDrag, setCycleDrag] = useState<{ id: string; targetIndex: number } | null>(null);
  const cycleDragRef = useRef<{ id: string; pointerId: number; startY: number; targetIndex: number } | null>(null);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState<Plan>(qaScreen === "detail" || qaScreen === "add" ? structuredClone(firstBatchDetailDraft) : { id: "", name: "", environment: data.currentEnvironment, exercises: [] });
  const [detailMode, setDetailMode] = useState<PlanDetailMode>("create");
  const [toast, setToast] = useState("");
  const [returnToDetail, setReturnToDetail] = useState(qaScreen === "add");
  const plans = data.plans.filter((plan) => plan.environment === data.currentEnvironment);
  const cycleIds = cycleOrder(data.cycleIdsByEnvironment[data.currentEnvironment] || [], data.cycleIndexByEnvironment[data.currentEnvironment] || 0);
  const cyclePlans = cycleIds.map((id) => plans.find((plan) => plan.id === id)).filter(Boolean) as Plan[];
  const cycleEnabled = data.cycleEnabledByEnvironment[data.currentEnvironment] || false;
  const presets = firstBatchQa && data.currentEnvironment === "健身房" ? firstBatchRecommendedPlans : templatePlansForEnvironment(data.currentEnvironment);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 1800); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (screen !== "create") return;
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>(".plan-screen")?.scrollTo({ top: 0 }));
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);
  useEffect(() => {
    if (qaScreen !== "detail" && qaScreen !== "add") return;
    const timer = window.setTimeout(() => qaScreen === "detail" ? setDetailOpen(true) : setAddOpen(true), 80);
    return () => window.clearTimeout(timer);
  }, [qaScreen]);
  const openNew = () => { keyboard.hide(); setDetailMode("create"); setDetailPlan({ id: `plan-${Date.now()}`, name: "未命名方案", environment: data.currentEnvironment, exercises: [] }); setDetailOpen(true); };
  const openPreset = (preset: Plan) => { keyboard.hide(); setDetailMode("preset"); setDetailPlan({ ...preset, id: `plan-${Date.now()}`, name: preset.name, environment: data.currentEnvironment, exercises: editableExercises(preset.exercises) }); setDetailOpen(true); };
  const openExisting = (plan: Plan) => { keyboard.hide(); setDetailMode("edit"); setDetailPlan({ ...plan, exercises: cloneExercises(plan.exercises) }); setDetailOpen(true); };
  const savePlan = (plan: Plan) => { const safePlan = { ...plan, id: detailMode === "preset" ? `plan-${Date.now()}` : plan.id, environment: plan.environment || data.currentEnvironment, exercises: editableExercises(plan.exercises) }; setData((current) => ({ ...current, plans: current.plans.some((item) => item.id === safePlan.id) ? current.plans.map((item) => item.id === safePlan.id ? safePlan : item) : [...current.plans, safePlan] })); setDetailPlan(safePlan); setDetailOpen(false); setScreen("home"); announceAfterPersist(detailMode === "edit" ? "修改已保存" : "方案已创建"); };
  const applyPreset = (preset: Plan) => { const copy = { ...preset, id: `plan-${Date.now()}`, environment: data.currentEnvironment, exercises: editableExercises(preset.exercises) }; setData((current) => ({ ...current, plans: [...current.plans, copy] })); setScreen("home"); announceAfterPersist("方案已创建"); };
  const deletePlan = (plan: Plan) => {
    if (!data.plans.some((item) => item.id === plan.id)) return;
    if (!window.confirm(`删除“${plan.name}”？此方案会从当前环境和训练循环移除；历史训练记录不会改变。`)) return;
    setData((current) => { const ids = current.cycleIdsByEnvironment[plan.environment] || []; const nextId = ids[current.cycleIndexByEnvironment[plan.environment] || 0]; const remaining = ids.filter((id) => id !== plan.id); return { ...current, plans: current.plans.filter((item) => item.id !== plan.id), cycleIdsByEnvironment: { ...current.cycleIdsByEnvironment, [plan.environment]: remaining }, cycleIndexByEnvironment: { ...current.cycleIndexByEnvironment, [plan.environment]: nextId && remaining.includes(nextId) ? remaining.indexOf(nextId) : 0 } }; });
    setDetailOpen(false); announceAfterPersist("方案已删除，历史记录保留");
  };
  const requestAdd = (draft: Plan) => { setDetailPlan(draft); setDetailOpen(false); setReturnToDetail(true); setAddOpen(true); };
  const addExercises = (items: Exercise[]) => { setDetailPlan((current) => ({ ...current, exercises: [...current.exercises, ...items.filter((item) => !current.exercises.some((old) => old.id === item.id))] })); window.setTimeout(() => { if (returnToDetail) setDetailOpen(true); setReturnToDetail(false); }, 80); };
  const toggleCycle = (id: string) => setData((current) => { const environment = current.currentEnvironment; const existing = current.cycleIdsByEnvironment[environment] || []; const currentIndex = current.cycleIndexByEnvironment[environment] || 0; const currentNextId = existing[currentIndex]; const next = existing.includes(id) ? existing.filter((value) => value !== id) : [...existing, id]; const nextId = currentNextId && next.includes(currentNextId) ? currentNextId : existing.slice(currentIndex + 1).concat(existing.slice(0, currentIndex)).find((value) => next.includes(value)); const nextIndex = nextId ? next.indexOf(nextId) : 0; return { ...current, cycleIdsByEnvironment: { ...current.cycleIdsByEnvironment, [environment]: next }, cycleIndexByEnvironment: { ...current.cycleIndexByEnvironment, [environment]: nextIndex }, cycleEnabledByEnvironment: { ...current.cycleEnabledByEnvironment, [environment]: next.length > 0 } }; });
  const moveCycleTo = (id: string, targetIndex: number) => {
    const environment = data.currentEnvironment;
    setData((current) => {
      const existing = current.cycleIdsByEnvironment[environment] || [];
      const reordered = reorderCycle(existing, current.cycleIndexByEnvironment[environment] || 0, id, targetIndex);
      if (!reordered) return current;
      return { ...current, cycleIdsByEnvironment: { ...current.cycleIdsByEnvironment, [environment]: reordered.ids }, cycleIndexByEnvironment: { ...current.cycleIndexByEnvironment, [environment]: reordered.nextIndex } };
    });
    setToast("循环顺序已更新，首个方案为 NEXT");
  };
  const endCycleDrag = (pointerId: number, clientY: number, cancelled = false) => {
    const drag = cycleDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    cycleDragRef.current = null;
    setCycleDrag(null);
    if (!cancelled && Math.abs(clientY - drag.startY) >= 8 && drag.targetIndex !== cycleIds.indexOf(drag.id)) moveCycleTo(drag.id, drag.targetIndex);
  };

  if (screen === "create") return <><MobileScroll className="app-screen light-screen plan-screen"><main className="create-choice-content"><header className="subpage-header"><button className="icon-button" aria-label="返回方案首页" onClick={() => setScreen("home")}><ChevronLeftIcon /></button><h1>创建方案</h1></header><PlanCreationCard className="creation-page-entry" title="创建自定义方案" description="从添加第一个动作开始" onAdd={openNew} /><section className="create-section"><h2>推荐方案</h2><Carousel ariaLabel="推荐方案" className="preset-carousel" contentClassName="preset-track">{presets.map((preset) => <article className="preset-card preset-muscle-card" key={preset.id} data-muscle-background={homeBackgroundForGroup(resolvePrimaryGroup(preset.exercises)).key}><img className="preset-muscle-photo" src={homeBackgroundForGroup(resolvePrimaryGroup(preset.exercises)).imagePath} alt="" loading="lazy" decoding="async" /><button className="preset-title" onClick={() => openPreset(preset)}><h3>{preset.name.replace("训练", "新手训练")}</h3><ChevronRightIcon /></button><p>{preset.exercises.length} 个动作 · 约 {estimatePlanMinutes(preset, normalizeTrainingTiming(data.trainingTiming))} 分钟</p><ul>{preset.exercises.slice(0, 5).map((item) => <li key={item.id}><span>{item.name}</span><small>{item.sets} × {exerciseSummary(item)}</small></li>)}</ul><button className="primary-button" onClick={() => applyPreset(preset)}>应用方案</button></article>)}</Carousel></section></main></MobileScroll><PlanDetailSheet open={detailOpen} initial={detailPlan} mode={detailMode} onClose={() => setDetailOpen(false)} onSave={savePlan} onRequestAdd={requestAdd} /><AddExerciseSheet inventory={data.environmentEquipment} open={addOpen} environment={detailPlan.environment || data.currentEnvironment} existingIds={detailPlan.exercises.map((item) => item.id)} onOpenChange={(open) => { setAddOpen(open); if (!open && returnToDetail) { setDetailOpen(true); setReturnToDetail(false); } }} onAdd={addExercises} /></>;

  return <>
    <MobileScroll key="plans-home" className="app-screen light-screen scheme-home">
      <main className="scheme-content">
        <header className="root-header">
          <h1>方案</h1>
          <div className="root-header-actions"><button className="header-environment" onClick={() => setEnvironmentOpen(true)} aria-label={`切换训练环境，当前${data.currentEnvironment}`}><span>{data.currentEnvironment}</span><ChevronDownIcon /></button><button className="icon-button" aria-label="设置" onClick={openGlobalSettings}><GearIcon /></button></div>
        </header>
        {cycleEnabled && cyclePlans.length > 0 ? <section className="cycle-card">
          <div className="cycle-head"><div><span>训练循环</span><b>已开启 · {cyclePlans.length} 个方案</b></div></div>
          <div className="cycle-list">{cyclePlans.map((plan, index) => <div className={`cycle-row${cycleDrag?.id === plan.id ? " dragging" : ""}${cycleDrag?.id !== plan.id && cycleDrag?.targetIndex === index ? " drop-target" : ""}`} key={plan.id} data-cycle-id={plan.id}><button className="cycle-plan-main" onClick={() => openExisting(plan)}><span><span className="cycle-title-line"><b>{plan.name}</b>{index === 0 ? <i>NEXT</i> : null}</span><small>{plan.exercises.length} 个动作 · 约 {estimatePlanMinutes(plan, normalizeTrainingTiming(data.trainingTiming))} 分钟</small></span></button><button type="button" className="cycle-drag" data-scroll-drag="ignore" aria-label={`拖动${plan.name}调整循环顺序，或按上下方向键排序`} onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            event.preventDefault();
            cycleDragRef.current = { id: plan.id, pointerId: event.pointerId, startY: event.clientY, targetIndex: index };
            setCycleDrag({ id: plan.id, targetIndex: index });
            event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerMove={(event) => {
            const drag = cycleDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const rows = Array.from(event.currentTarget.closest(".cycle-list")?.querySelectorAll<HTMLElement>(".cycle-row") || []);
            const targetIndex = rows.findIndex((row) => event.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
            const nextIndex = targetIndex < 0 ? rows.length - 1 : targetIndex;
            if (nextIndex !== drag.targetIndex) {
              drag.targetIndex = nextIndex;
              setCycleDrag({ id: drag.id, targetIndex: nextIndex });
            }
          }} onPointerUp={(event) => endCycleDrag(event.pointerId, event.clientY)} onPointerCancel={(event) => endCycleDrag(event.pointerId, event.clientY, true)} onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const target = index + (event.key === "ArrowUp" ? -1 : 1);
            if (target >= 0 && target < cyclePlans.length) moveCycleTo(plan.id, target);
          }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" /></svg></button></div>)}</div>
        </section> : null}
        <div className="scheme-heading"><div><h2>{plans.length ? "我的方案" : "推荐方案"}</h2><p>{plans.length ? "开启开关，将方案加入训练循环" : `适合${data.currentEnvironment}的训练，应用后保存为我的方案`}</p></div><button onClick={() => setScreen("create")}>创建 <ChevronRightIcon /></button></div>
        {plans.length ? <div className="independent-list glass-card">{plans.map((plan) => { const inCycle = cycleIds.includes(plan.id); const activeInCycle = cycleEnabled && inCycle; return <div className="plan-list-row" key={plan.id}><button className="plan-list-main" onClick={() => openExisting(plan)}><span><b>{plan.name}</b><small>{plan.exercises.length} 个动作 · 约 {estimatePlanMinutes(plan, normalizeTrainingTiming(data.trainingTiming))} 分钟 <ChevronRightIcon /></small></span></button><button className={`plan-cycle-switch ritmo-switch ${activeInCycle ? "on" : ""}`} aria-label={activeInCycle ? `从循环移出${plan.name}` : inCycle ? `重新开启${plan.name}的训练循环` : `将${plan.name}加入循环`} aria-pressed={activeInCycle} onClick={() => inCycle && !cycleEnabled ? setData((current) => ({ ...current, cycleEnabledByEnvironment: { ...current.cycleEnabledByEnvironment, [current.currentEnvironment]: true } })) : toggleCycle(plan.id)}><i /></button></div>; })}</div> : <Carousel ariaLabel="推荐方案" className="preset-carousel plans-recommendations" contentClassName="preset-track">{presets.map((preset) => <article className="preset-card preset-muscle-card" key={preset.id} data-muscle-background={homeBackgroundForGroup(resolvePrimaryGroup(preset.exercises)).key}><img className="preset-muscle-photo" src={homeBackgroundForGroup(resolvePrimaryGroup(preset.exercises)).imagePath} alt="" loading="lazy" decoding="async" /><button className="preset-title" onClick={() => openPreset(preset)}><h3>{preset.name.replace("训练", "新手训练")}</h3><ChevronRightIcon /></button><p>{preset.exercises.length} 个动作 · 约 {estimatePlanMinutes(preset, normalizeTrainingTiming(data.trainingTiming))} 分钟</p><ul>{preset.exercises.slice(0, 5).map((item) => <li key={item.id}><span>{item.name}</span><small>{item.sets} × {exerciseSummary(item)}</small></li>)}</ul><button className="primary-button" onClick={() => applyPreset(preset)}>应用方案</button></article>)}</Carousel>}
      </main>
    </MobileScroll>
    {!detailOpen && !addOpen ? <AppNav active="plans" onNavigate={onNavigate} /> : null}
    {toast ? <div className="toast"><CheckIcon />{toast}</div> : null}
    <BottomSheet open={environmentOpen} onOpenChange={setEnvironmentOpen} title="训练环境" snap={0.35}><EnvironmentOptions environments={data.environments} value={data.currentEnvironment} onSelect={(name) => { setData((current) => ({ ...current, currentEnvironment: name })); setEnvironmentOpen(false); }} /></BottomSheet>
    <PlanDetailSheet open={detailOpen} initial={detailPlan} mode={detailMode} onClose={() => setDetailOpen(false)} onSave={savePlan} onRequestAdd={requestAdd} onDelete={deletePlan} />
    <AddExerciseSheet inventory={data.environmentEquipment} open={addOpen} environment={detailPlan.environment || data.currentEnvironment} existingIds={detailPlan.exercises.map((item) => item.id)} onOpenChange={(open) => { setAddOpen(open); if (!open && returnToDetail) { setDetailOpen(true); setReturnToDetail(false); } }} onAdd={addExercises} />
  </>;
}

const groupNames: Record<string, string> = MUSCLE_REGIONS;
const heatColors = TRAINING_RECENCY.map(tone => tone.color);
const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const startOfDay = (date: Date) => { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; };
const daysBetween = (later: Date, earlier: Date) => Math.max(0, Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / 86400000));
const PORTFOLIO_SESSION_PREFIX = "portfolio-record-2026-11-";

function portfolioSessions(): WorkoutSession[] {
  const workouts = [
    { name: "胸部训练", exercises: ["incline", "pushup"] },
    { name: "手臂训练", exercises: ["curl", "triceps"] },
    { name: "背部训练", exercises: ["pulldown", "row", "superman"] },
    { name: "肩部与核心训练", exercises: ["press", "raise", "crunch"] },
    { name: "下肢训练", exercises: ["squat", "leg-press"] },
  ];
  return workouts.map((workout, index) => {
    const end = addDays(new Date("2026-11-03T19:30:00+08:00"), -index);
    const start = new Date(end);
    start.setMinutes(start.getMinutes() - (workout.exercises.length === 3 ? 32 : 24));
    return {
      id: `${PORTFOLIO_SESSION_PREFIX}${index + 1}`,
      source: "custom",
      environmentId: "健身房",
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      planName: workout.name,
      status: "completed",
      completed: true,
      exercises: workout.exercises.flatMap((id) => {
        const exercise = getExerciseSpec(id);
        if (!exercise) return [];
        const { reps, weight, sets } = exercise;
        const completedSets: CompletedSet[] = Array.from({ length: sets }, (_, set) => ({
          setNumber: set + 1, targetReps: reps, recordedReps: reps, actualReps: reps,
          repsSource: "default", weight, completed: true,
        }));
        return [{ ...exercise, completedSets }];
      }),
    };
  });
}

function addPortfolioHistory(data: RitmoData): RitmoData {
  const existingIds = new Set(data.sessions.map(({ id }) => id));
  const missing = portfolioSessions().filter(({ id }) => !existingIds.has(id));
  return missing.length ? { ...data, sessions: [...missing, ...data.sessions] } : data;
}

const lastTrainedDaysForSessions = (sessions: WorkoutSession[], today: Date) => {
  const latest: Record<string, Date> = {};
  sessions.forEach((session) => session.exercises.forEach((exercise) => {
    if (!exercise.completedSets.some((set) => set.completed)) return;
    (exercise.primaryMuscleIds ?? getExerciseSpec(exercise.id)?.primaryMuscleIds ?? []).map(muscleRegionId).forEach((group) => {
      const date = new Date(session.endedAt);
      if (!latest[group] || date > latest[group]) latest[group] = date;
    });
  }));
  return Object.fromEntries(Object.entries(latest).map(([group, date]) => [group, daysBetween(today, date)]));
};

function MuscleModel({ side, selectedGroup, lastTrainedDays, onSelect, onAnchorChange }: { side: "front" | "back"; selectedGroup: string; lastTrainedDays: Record<string, number>; onSelect: (group: string) => void; onAnchorChange: (anchor: { x: number; y: number; labelX: number; labelY: number }) => void }) {
  const ref = useRef<HTMLObjectElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => setFallback(false), [side]);
  const apply = () => {
    const object = ref.current, doc = object?.contentDocument;
    if (!object || !doc) return;
    ensureRecencyGradients(doc);
    const seen = new Set<string>();
    const nodes = [...doc.querySelectorAll<SVGGraphicsElement>("[data-group]")];
    nodes.forEach(node => {
      const region = node.dataset.group || "";
      const toneIndex = recencyIndex(lastTrainedDays[region]);
      node.style.fill = fallback ? TRAINING_RECENCY[toneIndex].color : `url(#ritmo-recency-${toneIndex})`;
      node.style.fillOpacity = fallback ? lastTrainedDays[region] === undefined ? "0.5" : "0.98" : "1";
      node.style.mixBlendMode = "normal";
      node.style.stroke = "transparent";
      node.style.strokeWidth = "0";
      node.style.vectorEffect = "non-scaling-stroke";
      node.style.cursor = "pointer";
      node.style.pointerEvents = "all";
      // The selected lime contour is also the keyboard focus indication.
      node.style.outline = "none";
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", groupNames[region] || region);
      node.setAttribute("aria-pressed", String(region === selectedGroup));
      node.setAttribute("tabindex", seen.has(region) ? "-1" : "0");
      seen.add(region);
      node.onclick = () => onSelect(region);
      node.onfocus = () => onSelect(region);
      node.onkeydown = event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(region); } };
    });
    const texture = doc.querySelector<SVGImageElement>("#anatomy-texture");
    if (texture) texture.onerror = () => setFallback(true);
    // The versioned asset places colors behind the transparent white-highlight image.
    // Keep the existing selection/focus contour separate from the time-color layer.
    object.dataset.anatomyMaterial = fallback ? "vector-fallback" : "white-highlights-underlay";
    object.dataset.periods = JSON.stringify(Object.fromEntries(nodes.map(node => [node.dataset.group, recencyIndex(lastTrainedDays[node.dataset.group || ""])])));
    object.dataset.anatomyReady = "true";
    const svg = doc.documentElement;
    let outline = doc.querySelector<SVGGElement>("#selection-outline");
    if (!outline) { outline = doc.createElementNS("http://www.w3.org/2000/svg", "g"); outline.id = "selection-outline"; outline.style.pointerEvents = "none"; svg.append(outline); }
    outline.replaceChildren(...nodes.filter(node => node.dataset.group === selectedGroup).map(node => {
      const copy = node.cloneNode(false) as SVGGraphicsElement;
      copy.removeAttribute("data-group"); copy.removeAttribute("role"); copy.removeAttribute("tabindex"); copy.removeAttribute("aria-label"); copy.removeAttribute("aria-pressed");
      copy.style.fill = "none"; copy.style.stroke = "#b6ff16"; copy.style.strokeWidth = "1.3px"; copy.style.mixBlendMode = "normal"; copy.style.pointerEvents = "none";
      return copy;
    }));
    // Read the actual selected region in the embedded SVG viewport; use the
    // right-hand member of bilateral muscles so the leader faces the label.
    const candidates = nodes.filter(node => node.dataset.group === selectedGroup).map(node => node.getBoundingClientRect());
    if (candidates.length) {
      const rightmost = candidates.sort((a, b) => b.x + b.width / 2 - a.x - a.width / 2)[0];
      const frame = object.getBoundingClientRect(), stageElement = object.closest(".model-stage"), stage = stageElement?.getBoundingClientRect();
      const label = stageElement?.querySelector(".inline-muscle-detail b")?.getBoundingClientRect();
      if (stage?.width && stage.height && label) onAnchorChange({ x: (frame.left + rightmost.x + rightmost.width * .55 - stage.left) / stage.width * 100, y: (frame.top + rightmost.y + rightmost.height * .45 - stage.top) / stage.height * 100, labelX: (label.left - stage.left) / stage.width * 100 - 1, labelY: (label.top + label.height / 2 - stage.top) / stage.height * 100 });
    }
  };
  useEffect(() => { apply(); const observer = new ResizeObserver(apply); if (ref.current) observer.observe(ref.current); return () => observer.disconnect(); }, [side, selectedGroup, lastTrainedDays, fallback]);
  return <object key={`${side}-${fallback}`} ref={ref} onLoad={() => { const loaded = ref.current?.contentDocument; if (!fallback && (!loaded || loaded.documentElement.localName !== "svg" || !loaded.querySelector("[data-group]"))) { setFallback(true); return; } apply(); }} onError={() => setFallback(true)} className="muscle-object" data={`/assets/muscle/${fallback ? "" : "translucent-v2/"}${side}.svg`} type="image/svg+xml" aria-label={`${side === "front" ? "正面" : "背面"}肌群模型`} />;
}

function RecordsDemo({ data, onNavigate, focusedSessionId }: { data: RitmoData; onNavigate: (flow: DemoFlow) => void; focusedSessionId: string | null }) {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const sessions = data.sessions;
  const [initialSession] = useState(() => {
    const focused = sessions.find((session) => session.id === focusedSessionId);
    if (focused) return focused;
    const latestToday = sessions.filter((session) => validSessionDate(sessionDisplayEnd(session)) && isoDay(new Date(sessionDisplayEnd(session))) === isoDay(today) && session.exercises.some((exercise) => exercise.completedSets.some((set) => set.completed))).sort((a, b) => new Date(sessionDisplayEnd(b)).getTime() - new Date(sessionDisplayEnd(a)).getTime())[0];
    return latestToday ?? sessions.find((session) => session.id === `${PORTFOLIO_SESSION_PREFIX}1`);
  });
  useEffect(() => { const update = () => setToday((current) => isoDay(current) === isoDay(new Date()) ? current : startOfDay(new Date())); const timer = window.setInterval(update, 30_000); window.addEventListener("focus", update); return () => { window.clearInterval(timer); window.removeEventListener("focus", update); }; }, []);
  const [selectedDate, setSelectedDate] = useState(() => initialSession && validSessionDate(sessionDisplayEnd(initialSession)) ? startOfDay(new Date(sessionDisplayEnd(initialSession))) : today);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(() => initialSession?.id ?? null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const weekSwipeStart = useRef<{ pointerId: number; x: number; y: number; time: number; width: number; dragging: boolean } | null>(null);
  const weekTransitionDirection = useRef<-1 | 0 | 1>(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekAnimating, setWeekAnimating] = useState(false);
  const calendarSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressWeekClick = useRef(false);
  const suppressCalendarClick = useRef(false);
  const monday = useMemo(() => addDays(selectedDate, -((selectedDate.getDay() + 6) % 7)), [selectedDate]);
  const [side, setSide] = useState<"front" | "back">("front");
  const [group, setGroup] = useState("CHEST");
  const [muscleAnchor, setMuscleAnchor] = useState({ x: 40, y: 28, labelX: 67, labelY: 23 });
  const weekdayNames = ["一", "二", "三", "四", "五", "六", "日"];
  const recordsByDate = useMemo(() => sessions.reduce<Record<string, WorkoutSession[]>>((result, session) => { if (!validSessionDate(sessionDisplayEnd(session)) || !session.exercises.some((exercise) => exercise.completedSets.some((set) => set.completed))) return result; const key = isoDay(new Date(sessionDisplayEnd(session))); result[key] = [...(result[key] || []), session].sort((a, b) => new Date(sessionDisplayEnd(b)).getTime() - new Date(sessionDisplayEnd(a)).getTime()); return result; }, {}), [sessions]);
  const selectDate = (date: Date) => { setSelectedDate(date); setExpandedSessionId(recordsByDate[isoDay(date)]?.[0]?.id ?? null); };
  const shiftWeek = (direction: -1 | 1) => { const next = addDays(selectedDate, direction * 7); const nextMonday = addDays(next, -((next.getDay() + 6) % 7)); if (direction < 0 || nextMonday <= today) selectDate(next > today ? today : next); };
  const canShiftWeekForward = addDays(monday, 7) <= today;
  const endWeekGesture = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = weekSwipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    weekSwipeStart.current = null;
    if (!start.dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - start.x;
    const velocity = dx / Math.max(1, performance.now() - start.time);
    const direction: -1 | 0 | 1 = !cancelled && (Math.abs(dx) >= start.width * 0.22 || (Math.abs(dx) >= 28 && Math.abs(velocity) > 0.45))
      ? dx > 0 ? -1 : 1 : 0;
    weekTransitionDirection.current = direction === 1 && !canShiftWeekForward ? 0 : direction;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWeekOffset(0);
      if (weekTransitionDirection.current !== 0) shiftWeek(weekTransitionDirection.current);
      weekTransitionDirection.current = 0;
      return;
    }
    if (weekTransitionDirection.current === 0 && Math.abs(weekOffset) < 1) {
      setWeekOffset(0);
      return;
    }
    setWeekAnimating(true);
    setWeekOffset(weekTransitionDirection.current === 0 ? 0 : -weekTransitionDirection.current * start.width);
    suppressWeekClick.current = true;
    window.setTimeout(() => { suppressWeekClick.current = false; }, 350);
  };
  const renderWeek = (offset: -1 | 0 | 1) => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, offset * 7 + index);
    const future = date > today;
    const selected = isoDay(date) === isoDay(selectedDate);
    const isToday = isoDay(date) === isoDay(today);
    const trained = Boolean(recordsByDate[isoDay(date)]?.length);
    return <button key={isoDay(date)} disabled={future} tabIndex={offset === 0 ? undefined : -1} className={`${selected ? "selected" : ""} ${isToday ? "today" : ""} ${trained ? "trained" : ""}`} onClick={offset === 0 ? () => selectDate(date) : undefined}><span className="weekday-label">{weekdayNames[index]}</span><b className="date-number">{date.getDate()}</b></button>;
  });
  const shiftCalendarMonth = (direction: -1 | 1) => setCalendarMonth((current) => { const next = new Date(current.getFullYear(), current.getMonth() + direction, 1); return next > today ? current : next; });
  const selectedRecords = recordsByDate[isoDay(selectedDate)] || [];
  const lastTrainedDays = useMemo(() => lastTrainedDaysForSessions(sessions, today), [sessions, today]);
  const daysAgo = lastTrainedDays[group];
  const lastDate = daysAgo === undefined ? null : addDays(today, -daysAgo);

  return <>
    <MobileScroll className="app-screen light-screen records-screen">
      <main className="records-content">
        <header className="root-header">
          <h1>记录</h1>
          <button className="icon-button" aria-label="设置" onClick={openGlobalSettings}><GearIcon /></button>
        </header>
        <section className="heatmap-card anatomy-atlas-card">
          <div className="heatmap-head">
            <div><span>截至今天</span><h2>肌群训练总览</h2></div>
            <div className="view-toggle">
              <button className={side === "front" ? "on" : ""} onClick={() => { setSide("front"); setGroup("CHEST"); }}>正面</button>
              <button className={side === "back" ? "on" : ""} onClick={() => { setSide("back"); setGroup("LATS"); }}>背面</button>
            </div>
          </div>
          <div className="model-stage">
            <MuscleModel side={side} selectedGroup={group} lastTrainedDays={lastTrainedDays} onSelect={setGroup} onAnchorChange={setMuscleAnchor} />
            <svg className="muscle-selection-leader" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={`${muscleAnchor.x},${muscleAnchor.y} ${muscleAnchor.labelX - 8},${muscleAnchor.y} ${muscleAnchor.labelX - 3},${muscleAnchor.labelY} ${muscleAnchor.labelX},${muscleAnchor.labelY}`} /></svg><span className="muscle-leader-dot" style={{left:`${muscleAnchor.x}%`,top:`${muscleAnchor.y}%`}} aria-hidden="true" />
            <div className="inline-muscle-detail" aria-live="polite">
              <b>{groupNames[group] || "肌群"}</b>
              <strong>{daysAgo === undefined ? "从未训练" : daysAgo === 0 ? "今天" : `${daysAgo} 天前`}</strong>
              <small>{lastDate ? `${lastDate.getMonth() + 1} 月 ${lastDate.getDate()} 日` : "暂无训练日期"}</small>
            </div>
            <div className="heat-legend" aria-label="最近训练时间图例">
              {heatColors.map((color, index) => <span key={`${color}-${index}`}><i title={TRAINING_RECENCY[index].label} style={{ background: color }} /><small>{TRAINING_RECENCY[index].label}</small></span>)}
            </div>
          </div>
        </section>
        <div className="section-row records-history-heading"><h2>历史训练</h2><button aria-label="打开日历" onClick={() => { setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); setCalendarOpen(true); }}><CalendarIcon /></button></div>
        <section className="history-card glass-card">
          <div className="date-section-inner"><div className="week-viewport" onPointerDown={(event) => {
            if (weekAnimating || (event.pointerType === "mouse" && event.button !== 0)) return;
            weekSwipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), width: event.currentTarget.clientWidth, dragging: false };
          }} onPointerMove={(event) => {
            const start = weekSwipeStart.current;
            if (!start || start.pointerId !== event.pointerId) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (!start.dragging) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
              if (Math.abs(dy) > Math.abs(dx)) { weekSwipeStart.current = null; return; }
              start.dragging = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }
            event.preventDefault();
            event.stopPropagation();
            const displacement = dx < 0 && !canShiftWeekForward ? dx * 0.22 : dx;
            setWeekOffset(Math.max(-start.width, Math.min(start.width, displacement)));
          }} onPointerUp={(event) => endWeekGesture(event)} onPointerCancel={(event) => endWeekGesture(event, true)} onClickCapture={(event) => { if (suppressWeekClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
            <div className="week-track" style={{ transform: `translate3d(calc(-33.333333% + ${weekOffset}px), 0, 0)`, transition: weekAnimating ? "transform 280ms cubic-bezier(.22,.72,.2,1)" : "none" }} onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
              const direction = weekTransitionDirection.current;
              weekTransitionDirection.current = 0;
              setWeekAnimating(false);
              setWeekOffset(0);
              if (direction !== 0) shiftWeek(direction);
            }}>
              {([-1, 0, 1] as const).map((offset) => <div key={offset} className="week-grid" aria-hidden={offset !== 0}>{renderWeek(offset)}</div>)}
            </div>
          </div></div>
          <div className="recent-content">
          <div className="recent-heading"><h2>当日训练记录</h2><span>{selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日</span></div>
          {selectedRecords.length ? <div className="session-list">{selectedRecords.map((session) => {
            const expanded = expandedSessionId === session.id;
            const end = sessionDisplayEnd(session);
            const exercises = session.exercises.filter((exercise) => exercise.completedSets.some((set) => set.completed));
            return <article className="session-card" key={session.id}>
              <button className="session-head" aria-expanded={expanded} aria-label={`${session.planName}，${sessionDurationLabel(session)}，${expanded ? "收起" : "展开"}训练记录`} onClick={() => setExpandedSessionId(expanded ? null : session.id)}>
                <span className="session-meta"><span>{session.planName}</span><time dateTime={end}>{new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(end))}</time></span>
                <strong className="session-duration">{sessionDurationLabel(session)}</strong>
              </button>
              {expanded ? <div className="session-exercises">{exercises.map((exercise, index) => <div className="record-exercise-card" key={`${session.id}-${exercise.id}-${index}`}><span>{exercise.name}</span><strong>{completedExerciseSummary(exercise)}</strong></div>)}</div> : null}
            </article>;
          })}</div> : <div className="empty-day">这一天没有训练记录</div>}
          </div>
        </section>
      </main>
    </MobileScroll>
    <AppNav active="records" onNavigate={onNavigate} />
    <BottomSheet open={calendarOpen} onOpenChange={setCalendarOpen} title="选择历史日期" snap={0.78}><div className="calendar-picker" onPointerDown={(event) => { calendarSwipeStart.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { calendarSwipeStart.current = null; }} onPointerUp={(event) => { const start = calendarSwipeStart.current; calendarSwipeStart.current = null; if (!start) return; const dx = event.clientX - start.x; const dy = event.clientY - start.y; if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return; suppressCalendarClick.current = true; window.setTimeout(() => { suppressCalendarClick.current = false; }, 150); shiftCalendarMonth(dx > 0 ? -1 : 1); }} onClickCapture={(event) => { if (suppressCalendarClick.current) { event.preventDefault(); event.stopPropagation(); suppressCalendarClick.current = false; } }}><div className="calendar-month"><b>{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月</b></div><div className="calendar-weekdays">{weekdayNames.map((name) => <span key={name}>{name}</span>)}</div><div className="calendar-days">{Array.from({ length: (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7 }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, index) => { const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1); const trained = Boolean(recordsByDate[isoDay(date)]?.length); return <button key={isoDay(date)} disabled={date > today} className={`${isoDay(date) === isoDay(selectedDate) ? "selected" : ""} ${trained ? "trained" : ""}`} aria-label={`${date.getMonth() + 1}月${date.getDate()}日${trained ? "，有训练记录" : "，无训练记录"}`} onClick={() => { selectDate(date); setCalendarOpen(false); }}><span>{index + 1}</span><i className="calendar-training-ring" aria-hidden="true" /></button>; })}</div></div></BottomSheet>
  </>;
}

function PrototypeContent() {
  const params = new URLSearchParams(window.location.search);
  const initial = params.get("flow");
  const trainingHomeVisualQa = params.get("visualQa") === "training-home";
  const firstBatchVisualQa = params.get("visualQa") === "first-batch";
  const [flow, setFlow] = useState<DemoFlow>(initial === "plans" || initial === "records" ? initial : "training");
  const [loaded] = useState(() => {
    if (trainingHomeVisualQa) return structuredClone(trainingHomeVisualQaData) as RitmoData;
    if (firstBatchVisualQa) return structuredClone(firstBatchVisualQaData) as RitmoData;
    try {
      const saved = loadRitmoData();
      return import.meta.env.PROD ? addPortfolioHistory(saved) : saved;
    } catch { return null; }
  });
  const [data, setData] = useState<RitmoData>(() => {
    const safe = loaded || structuredClone(defaultRitmoData);
    const requestedEnvironment = params.get("environment");
    if (requestedEnvironment === "home") return { ...safe, currentEnvironment: "家里" };
    if (requestedEnvironment === "gym") return { ...safe, currentEnvironment: "健身房" };
    return safe;
  });
  const latestData = useRef(data);
  latestData.current = data;
  const [brandLaunchEligible] = useState(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return canPlayBrandIntro({ navigationType: navigation?.type, standalone, trainingHome: flow === "training", storageReadable: Boolean(loaded), preview: trainingHomeVisualQa || firstBatchVisualQa, sessionLink: params.has("session") });
  });
  useBrandIntro(brandLaunchEligible && flow === "training");
  useBrandGlowVisibility();
  const [storageError, setStorageError] = useState(loaded ? "" : "本地数据无法读取：原始数据已保留，已禁用保存。请勿继续编辑，并备份浏览器数据。 ");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timingSettingsOpen, setTimingSettingsOpen] = useState(false);
  const [manageRequest, setManageRequest] = useState(0);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(params.get("session"));
  const pendingSaveNotice = useRef("");
  const [persistedToast, setPersistedToast] = useState("");
  useEffect(() => { const open = () => { setTimingSettingsOpen(false); setSettingsOpen(true); }; window.addEventListener("ritmo-open-settings", open); return () => window.removeEventListener("ritmo-open-settings", open); }, []);
  useEffect(() => { const notice = (event: Event) => { pendingSaveNotice.current = (event as CustomEvent<string>).detail; }; window.addEventListener("ritmo-save-notice", notice); return () => window.removeEventListener("ritmo-save-notice", notice); }, []);
  useEffect(() => { if (!persistedToast) return; const timer = window.setTimeout(() => setPersistedToast(""), 2300); return () => window.clearTimeout(timer); }, [persistedToast]);
  useEffect(() => {
    if (!loaded) return;
    // A lifecycle flush may have persisted a newer snapshot before this effect runs.
    if (latestData.current !== data) return;
    if (trainingHomeVisualQa || firstBatchVisualQa) { pendingSaveNotice.current = ""; return; }
    try { window.localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)); setStorageError(""); if (pendingSaveNotice.current) { setPersistedToast(pendingSaveNotice.current); pendingSaveNotice.current = ""; } }
    catch { pendingSaveNotice.current = ""; setStorageError("本地保存失败，请保留当前页面并稍后重试；当前修改尚未保存"); }
  }, [data, trainingHomeVisualQa, firstBatchVisualQa]);
  const keyboard = useKeyboard();
  const navigate = (next: DemoFlow) => { keyboard.hide(); setFocusedSessionId(null); setFlow(next); window.history.replaceState(null, "", `?flow=${next}${trainingHomeVisualQa ? "&visualQa=training-home" : firstBatchVisualQa ? "&visualQa=first-batch" : ""}`); };
  const openRecord = (sessionId: string) => { keyboard.hide(); setFocusedSessionId(sessionId); setFlow("records"); window.history.replaceState(null, "", `?flow=records&session=${encodeURIComponent(sessionId)}`); };
  const parkWorkout = (snapshot: ActiveWorkout) => {
    const next = { ...latestData.current, activeWorkout: snapshot };
    latestData.current = next;
    setData((current) => ({ ...current, activeWorkout: snapshot }));
    setSettingsOpen(false); setFocusedSessionId(null);
    // Flush before iOS can suspend/terminate the page; the regular effect is not guaranteed to run.
    if (!loaded || trainingHomeVisualQa || firstBatchVisualQa) return;
    try { window.localStorage.setItem("ritmo-demo-v3", JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("本地保存失败，请保留当前页面并稍后重试；暂停进度尚未保存"); }
  };
  return <NavigationMotionProvider><div className="prototype-shell">{flow === "training" ? <TrainingDemo data={data} setData={setData} onNavigate={navigate} onOpenRecord={openRecord} onPark={parkWorkout} firstBatchQa={firstBatchVisualQa} manageRequest={manageRequest} /> : flow === "plans" ? <PlansDemo data={data} setData={setData} onNavigate={navigate} qaScreen={firstBatchVisualQa ? params.get("qaScreen") : null} firstBatchQa={firstBatchVisualQa} /> : <RecordsDemo data={data} onNavigate={navigate} focusedSessionId={focusedSessionId} />}{storageError ? <div className="storage-error" role="alert">{storageError}</div> : null}{persistedToast ? <div className="toast" role="status"><CheckIcon />{persistedToast}</div> : null}<BottomSheet open={settingsOpen} onOpenChange={open => { setSettingsOpen(open); if (!open) setTimingSettingsOpen(false); }} title={timingSettingsOpen ? "训练节奏与休息" : "设置"} snap={timingSettingsOpen ? 0.78 : 0.86}>{timingSettingsOpen ? <TrainingTimingSettings value={normalizeTrainingTiming(data.trainingTiming)} onSave={timing => { if (!loaded) return; setData(current => ({ ...current, trainingTiming: normalizeTrainingTiming(timing) })); announceAfterPersist("训练节奏与休息已保存"); setTimingSettingsOpen(false); }} /> : <SettingsContent environment={data.currentEnvironment} onTiming={() => setTimingSettingsOpen(true)} onManageEnvironment={() => { setSettingsOpen(false); navigate("training"); setManageRequest((value) => value + 1); }} onClose={() => setSettingsOpen(false)} />}</BottomSheet></div></NavigationMotionProvider>;
}

// Visual providers only; the existing executor owns every training transition.
export default function Prototype(){return <CountdownHandoffProvider><RingMotionProvider><PrototypeContent/></RingMotionProvider></CountdownHandoffProvider>;}
