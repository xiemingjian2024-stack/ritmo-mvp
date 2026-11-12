/** Launch eligibility only. Never reads or changes training records. */
export function canPlayBrandIntro({ navigationType, standalone, trainingHome, storageReadable, preview, sessionLink }: {
  navigationType?: string; standalone: boolean; trainingHome: boolean; storageReadable: boolean; preview: boolean; sessionLink: boolean;
}) {
  // Every newly mounted Home Screen document is a launch; WebKit's timing
  // classification is not a launch signal. Same-document background returns do
  // not re-run this initializer. A parked workout still owns its PLAY choice.
  const freshDocument = standalone || navigationType === 'navigate';
  return freshDocument && trainingHome && storageReadable && !preview && !sessionLink;
}
