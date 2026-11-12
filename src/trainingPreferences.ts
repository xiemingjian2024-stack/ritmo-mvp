// UI defaults apply to editable plans/new runs, never historical Sessions.
export const DEFAULT_UNSET_WEIGHT_KG = 2.5;
export const PHASE_SET_REST_SECONDS = 30;
export function isBodyweightEquipment(equipment?: string) {
  return /^(徒手|自重|body weight|bodyweight)$/i.test(equipment?.trim() ?? '');
}
export function withDefaultWeight<T extends {equipment:string;weight:number}>(exercise:T):T {
  return !isBodyweightEquipment(exercise.equipment) && !(exercise.weight > 0)
    ? {...exercise,weight:DEFAULT_UNSET_WEIGHT_KG,weightSource:'ritmo_default'} : {...exercise};
}
export function isPhaseSetBoundary(index:number, segmentsPerSet:number, segmentCount:number) {
  return index + 1 < segmentCount && (index + 1) % Math.max(1,segmentsPerSet) === 0;
}
export const EQUIPMENT_OPTIONS = [
  ['dumbbell','哑铃'],['bench','训练凳'],['support','牢固固定支撑'],['mat','训练垫'],['chair','稳定座椅'],
  ['barbell','杠铃'],['cable','绳索训练器'],['smith','史密斯架'],['pulldown','高位下拉器'],['row','划船器'],
  ['pec-deck','蝴蝶机'],['leg-press','腿举机'],['band','弹力带'],['pullup','单杠／双杠'],['kettlebell','壶铃'],['other','其他训练器械'],
] as const;
export type EquipmentId = typeof EQUIPMENT_OPTIONS[number][0];
export type EnvironmentEquipment = Record<string, EquipmentId[]>;
export const defaultEquipment = (name:string):EquipmentId[] => name === '健身房'
  ? EQUIPMENT_OPTIONS.map(([id])=>id) : name === '家里' ? ['dumbbell','bench','support','mat','chair'] : [];
export function equipmentRequirements(equipment:string, id=''):EquipmentId[] {
  if (isBodyweightEquipment(equipment)) return id === 'ritmo:video:seated-knee-tuck' ? ['chair'] : [];
  const result:EquipmentId[]=[];
  const rules:[RegExp,EquipmentId][]=[[/哑铃|dumbbell/i,'dumbbell'],[/凳|bench/i,'bench'],[/固定支撑|fixed.support/i,'support'],[/垫|mat/i,'mat'],[/椅|chair/i,'chair'],[/杠铃|barbell|ez bar/i,'barbell'],[/绳索|cable/i,'cable'],[/smith|史密斯/i,'smith'],[/下拉器|pulldown/i,'pulldown'],[/划船器|rowing/i,'row'],[/蝴蝶|pec.deck/i,'pec-deck'],[/腿举|leg.press/i,'leg-press'],[/弹力|band/i,'band'],[/单杠|双杠|pull.up/i,'pullup'],[/壶铃|kettlebell/i,'kettlebell']];
  rules.forEach(([pattern,key])=>{if(pattern.test(equipment))result.push(key);});
  // Known Core accessories are not fully described in its short equipment label.
  if (['incline','press','one-arm-row'].includes(id)) result.push(id==='one-arm-row'?'support':'bench');
  return [...new Set(result.length?result:['other' as const])];
}
export function hasEquipment(equipment:string,id:string,available:readonly EquipmentId[]) {
  return equipmentRequirements(equipment,id).every(key=>available.includes(key));
}
