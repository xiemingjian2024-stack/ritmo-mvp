import type { MuscleId } from "./exerciseCatalog";

// RITMO-owned localization and first-pass content QA. The imported upstream
// catalog stays untouched. Neither a translated name nor an instruction check
// is a professional coaching or anatomical review.
export type PriorityExercise = {
  id: string;
  nameZh: string;
  aliasesZh: string[];
  variantZh: string;
  demoAngle: string;
  fieldStatus: "catalog_checked" | "source_fields_checked";
  variantStatus: "source_description_checked" | "pending_variant_review";
  professionalStatus: "pending_professional_review";
  beginnerStatus: "suitable_candidate" | "use_with_guidance" | "not_for_beginners";
  primaryRegionIds?: MuscleId[];
  mappingNote?: string;
  animationCandidate: "none" | "gymvisual_source_reference";
  animationAuthorization: "not_verified" | "not_licensed";
  selfProductionFallback: true;
};

type Draft = Pick<PriorityExercise, "id" | "nameZh" | "aliasesZh" | "variantZh" | "demoAngle"> &
  Partial<Pick<PriorityExercise, "variantStatus" | "beginnerStatus" | "primaryRegionIds" | "mappingNote">>;
const core = (entry: Draft): PriorityExercise => ({
  fieldStatus: "catalog_checked", variantStatus: "pending_variant_review",
  professionalStatus: "pending_professional_review", beginnerStatus: "suitable_candidate",
  animationCandidate: "none", animationAuthorization: "not_verified", selfProductionFallback: true, ...entry,
});
const extended = (entry: Draft): PriorityExercise => ({
  fieldStatus: "source_fields_checked", variantStatus: "pending_variant_review",
  professionalStatus: "pending_professional_review", beginnerStatus: "suitable_candidate",
  animationCandidate: "gymvisual_source_reference", animationAuthorization: "not_licensed", selfProductionFallback: true, ...entry,
});

export const priorityExercises: PriorityExercise[] = [
  core({ id: "smith", nameZh: "史密斯机平板卧推", aliasesZh: ["史密斯卧推", "Smith 卧推"], variantZh: "平板；握距、凳位待核", demoAngle: "侧前 45°" }),
  core({ id: "incline", nameZh: "上斜哑铃卧推", aliasesZh: ["上斜卧推"], variantZh: "上斜角度待核", demoAngle: "侧前 45°" }),
  core({ id: "fly", nameZh: "蝴蝶机夹胸", aliasesZh: ["坐姿器械夹胸"], variantZh: "机器把手待核", demoAngle: "正前方" }),
  core({ id: "pushup", nameZh: "标准俯卧撑", aliasesZh: ["俯卧撑", "标准推地"], variantZh: "标准支撑", demoAngle: "侧面" }),
  core({ id: "pulldown", nameZh: "高位下拉", aliasesZh: ["坐姿下拉"], variantZh: "握法、握距、把手及终点待核", demoAngle: "背侧 45°" }),
  core({ id: "row", nameZh: "坐姿器械划船", aliasesZh: ["坐姿划船"], variantZh: "把手和握法待核", demoAngle: "侧后 45°" }),
  core({ id: "one-arm-row", nameZh: "单臂哑铃划船", aliasesZh: ["哑铃单臂划船"], variantZh: "支撑姿势待核", demoAngle: "侧后 45°" }),
  core({ id: "straight-pull", nameZh: "绳索直臂下压", aliasesZh: ["直臂下压"], variantZh: "把手待核", demoAngle: "侧面" }),
  core({ id: "raise", nameZh: "站姿哑铃侧平举", aliasesZh: ["哑铃侧平举", "侧平举"], variantZh: "站姿；抬举幅度待核", demoAngle: "正前方" }),
  core({ id: "press", nameZh: "坐姿哑铃肩推", aliasesZh: ["坐姿哑铃推举", "哑铃肩推"], variantZh: "靠背角度待核", demoAngle: "侧前 45°" }),
  core({ id: "curl", nameZh: "哑铃弯举", aliasesZh: ["二头弯举"], variantZh: "握法与站坐姿待核", demoAngle: "正前方" }),
  core({ id: "triceps", nameZh: "绳索肱三头肌下压", aliasesZh: ["绳索下压", "三头下压"], variantZh: "绳把或直杆待核", demoAngle: "侧面" }),
  core({ id: "plank", nameZh: "前臂平板支撑", aliasesZh: ["平板支撑", "前臂支撑"], variantZh: "前臂静态保持", demoAngle: "侧面" }),
  core({ id: "crunch", nameZh: "仰卧卷腹", aliasesZh: ["卷腹"], variantZh: "动作幅度待核", demoAngle: "侧面" }),
  core({ id: "squat", nameZh: "史密斯机深蹲", aliasesZh: ["史密斯深蹲"], variantZh: "脚位与深度待核", demoAngle: "侧面" }),
  core({ id: "leg-press", nameZh: "腿举机腿举", aliasesZh: ["腿举"], variantZh: "机型、脚位与轨迹待核", demoAngle: "侧面" }),
  core({ id: "pike-pushup", nameZh: "派克俯卧撑", aliasesZh: ["倒 V 俯卧撑"], variantZh: "倒 V 支撑", demoAngle: "侧面", beginnerStatus: "use_with_guidance" }),
  core({ id: "superman", nameZh: "俯卧挺身", aliasesZh: ["超人式"], variantZh: "幅度待核", demoAngle: "侧面" }),
  core({ id: "body-squat", nameZh: "徒手深蹲", aliasesZh: ["自重深蹲"], variantZh: "站姿；深度待核", demoAngle: "侧面" }),
  core({ id: "glute-bridge", nameZh: "徒手臀桥", aliasesZh: ["臀桥"], variantZh: "仰卧；幅度待核", demoAngle: "侧面" }),

  // Chest: home variants are wall / wide / rotational / isometric, not four
  // copies of the same standard push-up. The rotational version is advanced.
  extended({ id: "hasan:0659", nameZh: "靠墙俯卧撑", aliasesZh: ["墙壁俯卧撑"], variantZh: "双手支撑墙面", demoAngle: "侧面", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:1311", nameZh: "宽距俯卧撑", aliasesZh: ["宽手距俯卧撑"], variantZh: "双手宽于肩", demoAngle: "正前方", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0258", nameZh: "交替转体俯卧撑", aliasesZh: ["钟摆俯卧撑", "时钟俯卧撑"], variantZh: "左右交替转体伸臂", demoAngle: "侧前 45°", beginnerStatus: "not_for_beginners", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:1297", nameZh: "站姿等长夹胸", aliasesZh: ["徒手夹胸", "等长胸部收缩"], variantZh: "站姿短暂收缩后放松；按次计", demoAngle: "正前方", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0025", nameZh: "杠铃平板卧推", aliasesZh: ["杠铃卧推"], variantZh: "平板训练凳；正手略宽握", demoAngle: "侧前 45°", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0227", nameZh: "站姿绳索夹胸", aliasesZh: ["绳索飞鸟", "站姿绳索飞鸟"], variantZh: "双侧拉索胸高把手", demoAngle: "侧前 45°" }),
  extended({ id: "hasan:0576", nameZh: "坐姿器械推胸", aliasesZh: ["器械推胸"], variantZh: "坐姿推胸机；把手细节待核", demoAngle: "侧前 45°", variantStatus: "pending_variant_review" }),

  extended({ id: "hasan:0293", nameZh: "双臂哑铃俯身划船", aliasesZh: ["哑铃俯身划船"], variantZh: "站姿髋铰链；双手哑铃", demoAngle: "侧后 45°" }),
  extended({ id: "hasan:1329", nameZh: "旋转握法哑铃俯身划船", aliasesZh: ["旋腕哑铃划船"], variantZh: "俯身划船中调整掌向", demoAngle: "侧后 45°", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0406", nameZh: "哑铃耸肩", aliasesZh: ["站姿哑铃耸肩"], variantZh: "站姿；双手哑铃", demoAngle: "正后方" }),
  extended({ id: "hasan:0861", nameZh: "坐姿绳索划船", aliasesZh: ["坐姿拉索划船"], variantZh: "坐姿划船机；正手把手", demoAngle: "侧后 45°" }),
  extended({ id: "hasan:0027", nameZh: "杠铃俯身划船", aliasesZh: ["杠铃划船"], variantZh: "站姿髋铰链；杠铃", demoAngle: "侧后 45°", beginnerStatus: "use_with_guidance" }),
  extended({ id: "hasan:0573", nameZh: "器械背伸", aliasesZh: ["背伸机挺身"], variantZh: "背伸器械；轴位待核", demoAngle: "侧面", variantStatus: "pending_variant_review", beginnerStatus: "not_for_beginners" }),

  extended({ id: "hasan:0380", nameZh: "俯身哑铃后束平举", aliasesZh: ["哑铃反向飞鸟", "后束平举"], variantZh: "站姿俯身；双手哑铃", demoAngle: "正后方", primaryRegionIds: ["SHOULDERS_REAR"] }),
  extended({ id: "hasan:0310", nameZh: "哑铃前平举", aliasesZh: ["前平举"], variantZh: "站姿；双手哑铃", demoAngle: "正前方", primaryRegionIds: ["SHOULDERS_FRONT"] }),
  extended({ id: "hasan:0426", nameZh: "站姿哑铃肩推", aliasesZh: ["站姿哑铃推举"], variantZh: "站姿；正手握哑铃", demoAngle: "侧前 45°", primaryRegionIds: ["SHOULDERS_FRONT", "SHOULDERS_SIDE"] }),
  extended({ id: "hasan:0203", nameZh: "绳索后束划船", aliasesZh: ["绳把后束划船"], variantZh: "低位绳把；站姿俯身", demoAngle: "侧后 45°", primaryRegionIds: ["SHOULDERS_REAR"], beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0584", nameZh: "坐姿器械侧平举", aliasesZh: ["器械侧平举"], variantZh: "侧平举机；把手细节待核", demoAngle: "正前方", primaryRegionIds: ["SHOULDERS_SIDE"], variantStatus: "pending_variant_review" }),
  extended({ id: "hasan:0091", nameZh: "坐姿杠铃肩推", aliasesZh: ["坐姿杠铃推举"], variantZh: "训练凳；正手略宽握", demoAngle: "侧前 45°", primaryRegionIds: ["SHOULDERS_FRONT", "SHOULDERS_SIDE"], beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),

  extended({ id: "hasan:0259", nameZh: "窄距俯卧撑", aliasesZh: ["窄手距俯卧撑"], variantZh: "双手靠近；肘贴近身体", demoAngle: "侧前 45°", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0298", nameZh: "交叉锤式哑铃弯举", aliasesZh: ["跨体锤式弯举"], variantZh: "站姿；中立握跨体", demoAngle: "正前方", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0430", nameZh: "站姿单臂哑铃过顶臂屈伸", aliasesZh: ["单臂过顶三头伸展"], variantZh: "站姿；单手哑铃过顶", demoAngle: "侧前 45°", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0241", nameZh: "V 把绳索三头下压", aliasesZh: ["V 杆下压"], variantZh: "高位滑轮；V 把", demoAngle: "侧面" }),
  extended({ id: "hasan:0194", nameZh: "绳把绳索过顶臂屈伸", aliasesZh: ["绳索过顶三头伸展"], variantZh: "高位滑轮；绳把；背向器械", demoAngle: "侧面" }),
  extended({ id: "hasan:0031", nameZh: "杠铃站姿弯举", aliasesZh: ["杠铃弯举"], variantZh: "站姿；掌心向上握杠铃", demoAngle: "正前方" }),

  extended({ id: "hasan:1760", nameZh: "哑铃杯式深蹲", aliasesZh: ["杯式深蹲"], variantZh: "双手持单只哑铃于胸前", demoAngle: "侧面", primaryRegionIds: ["QUADS"], beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0381", nameZh: "哑铃后撤弓步", aliasesZh: ["哑铃反向弓步"], variantZh: "双手哑铃；向后迈步", demoAngle: "侧面" }),
  extended({ id: "hasan:1459", nameZh: "哑铃罗马尼亚硬拉", aliasesZh: ["哑铃 RDL"], variantZh: "髋铰链；双手哑铃", demoAngle: "侧面", beginnerStatus: "use_with_guidance", variantStatus: "source_description_checked" }),
  extended({ id: "hasan:0585", nameZh: "坐姿腿屈伸", aliasesZh: ["器械腿屈伸"], variantZh: "腿屈伸机；坐姿", demoAngle: "侧面" }),
  extended({ id: "hasan:0599", nameZh: "坐姿腿弯举", aliasesZh: ["器械腿弯举"], variantZh: "坐姿腿弯举机", demoAngle: "侧面" }),
  extended({ id: "hasan:0042", nameZh: "杠铃前蹲", aliasesZh: ["前蹲"], variantZh: "杠铃前架于肩前；脚位待核", demoAngle: "侧面", beginnerStatus: "not_for_beginners", variantStatus: "pending_variant_review" }),
];

export const priorityById = new Map(priorityExercises.map((entry) => [entry.id, entry]));
export const priorityRank = new Map(priorityExercises.map((entry, index) => [entry.id, index]));
// Core originally had Chinese labels only. These are search aliases, not new
// upstream IDs or professionally reviewed English specifications.
export const coreEnglishSearchNames: Record<string, string> = {
  smith: "smith machine flat bench press", incline: "incline dumbbell bench press",
  fly: "machine chest fly", pushup: "standard push-up",
  pulldown: "lat pulldown", row: "seated machine row",
  "one-arm-row": "one-arm dumbbell row", "straight-pull": "cable straight-arm pulldown",
  raise: "standing dumbbell lateral raise", press: "seated dumbbell shoulder press",
  curl: "dumbbell biceps curl", triceps: "cable triceps pushdown",
  plank: "forearm plank", crunch: "supine crunch",
  squat: "smith machine squat", "leg-press": "machine leg press",
  "pike-pushup": "pike push-up", superman: "prone superman",
  "body-squat": "bodyweight squat", "glute-bridge": "bodyweight glute bridge",
};
export function prioritySearchText(id: string): string {
  const entry = priorityById.get(id);
  return entry ? [entry.nameZh, ...entry.aliasesZh, entry.variantZh, coreEnglishSearchNames[id] ?? ""].join(" ").toLocaleLowerCase() : "";
}
