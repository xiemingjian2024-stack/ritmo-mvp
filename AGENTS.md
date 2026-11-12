# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## RITMO Training Home V3 Decisions

- The training environment selector sits directly below the Training page title. Its primary choices are `健身房` and `家里`; additional custom environments live behind the low-emphasis `管理环境` action.
- Plans and cycle position are scoped by environment. Legacy `健身房 A` plans migrate safely to `健身房`; switching environments never mutates another environment's plans or cycle position.
- When the current environment has a plan, the home hero shows the next plan, its real exercise names, an estimated duration, a dark training photograph, and one lime `开始训练` action. Do not show the 20/30/45/free selector inside a planned-workout hero.
- When the current environment has no plan, Quick Start becomes the primary content and may offer an optional duration reference. Quick Start never advances a plan cycle.
- Use the existing licensed/local Smith press asset for the V3 photographic direction until a dedicated asset set is approved.
- The environment picker uses one grouped dark rounded card, with inset dividers between single-line environment options and a real SVG check at the selected row's right edge. The designer clarified that this check must use the RITMO lime brand color, not yellow. Keep environment selection, custom environments and per-environment plan/cycle isolation unchanged; share this presentation between Training and Plans.
- All binary switches (including My Plans cycle membership and menu availability filters) share `.ritmo-switch` and `--ritmo-switch-*` tokens: flat 48×28px capsule, white 24px circular thumb inset 2px, lime active track, light neutral-gray inactive track. This matches the supplied purple-switch reference's proportions while preserving RITMO color. Never turn the active thumb dark or lime, or give individual pages their own switch dimensions. Preserve each switch's existing function and explicit accessible state; keep a 44px-tall hit area and reduced-motion support. Segmented controls, checkboxes and radio choices remain distinct control types.
- The white switch thumb uses one shared, very light shadow (`--ritmo-switch-thumb-shadow`) in both states to separate it from the light inactive track and lime active track. Keep the thumb pure white and preserve dimensions, track colors and interaction; do not add heavy outlines or page-specific elevation.
- Shadow refinement: use only a diffuse `0 1px 4px rgba(0,0,0,.08)` shadow, with no crisp outline layer. The previous 2px blur/18% shadow and half-pixel contour felt too raised; preserve a flat, softly separated thumb in both states.

## RITMO V1.8 Settings roadmap UI

- Reuse the existing shared Settings bottom sheet with three grouped dark cards: 训练偏好 (训练环境, 训练提示音, 训练显示大小), 显示与体验 (动态效果), 设备与数据 (Apple Watch, 数据备份与恢复). Use consistent 56px rows, 20px Radix icons, 16px row labels, inset separators, 24px card corners and the existing sheet typography/surfaces.
- Only 训练环境 is actionable and must preserve the existing environment-management navigation/handler. All other entries are static, nonfocusable rows labelled 规划中, without switches, chevrons, connections, selectable values or feedback. 完成 only closes Settings.
- Future-only definitions: display sizing would offer 标准 / 较大 / 超大 for the training executor only; motion would follow system reduced-motion preferences; backup would import/export training data; Watch would support recognition/linking. This UI task implements none of those behaviors, data fields or persistence.

## RITMO dark main-tab trial

- The dark treatment applies to the Training home and, after separate designer approval, the Plans page and its plan-specific creation and editing surfaces. Records, Active Set, Session, and NEXT behavior stay as they are until separately reviewed. Color changes must not alter plan or cycle data.
- Keep the approved C wordmark at the upper left and the existing environment/settings controls at the upper right, with dark translucent control surfaces.
- All three main-page Settings buttons share the approved Training header material: dark translucent green-neutral surface, a continuous gradient rim that fades smoothly from the brighter top through the sides to the darker bottom, white 24px gear inside a 48px circle. Training and Plans environment pills use that same material and continuous gradient rim, preserving their existing 93×48px dimensions. Keep material values in shared `--ritmo-header-control-*` tokens rather than page-specific surface rules; changing them must update every header control together.
- Header-rim refinement: never use a separate brighter `border-top-color` or inset top highlight, which produces a hard cutoff at the top/side junction. Shared `--ritmo-header-control-edge-gradient` supplies a smoothly varying 1px masked rim on Settings circles and environment pills. Preserve the translucent fill, blur, dimensions, icons and hit areas; unsupported masking falls back to a uniform subtle border.
- Replace the large first-card presentation with an immersive original athlete photograph, while retaining the actual next plan, its exercise list, Quick Start, and the existing START action. The moving outer-ring segment is an invitation to tap, never a training-progress indicator.
- The preview uses `public/assets/home/immersive-athlete.jpg`; do not deploy this trial or expand it to Records without a separate designer decision.
- In the dark-home trial, keep the next plan's actual exercise list directly below its title and place START after the list; do not move the list into a separate card. The START surface highlight and outer-ring segment share one position and timing cycle. Reduced-motion and hidden-page pause behavior remain required. Online release still requires a separate designer decision.
- Follow-up feedback on that trial: the outer segment and button highlight complete each turn in about 2.6 seconds. They rotate through the first 90° at the existing slower pace, then accelerate further through the remaining 270° and return to the slower pace on the next turn. Keep both layers on the same keyframes and preserve their pause synchronization. The plan eyebrow reads only `NEXT`, without a redundant "今日训练" label.
- The planned Training home should fit a normal four-exercise plan on one phone screen: move NEXT, its exercise list and PLAY upward, keep their existing order and PLAY size, and show the complete Quick Start card at least 16 px above the fixed navigation. Size the content from its actual scroll viewport rather than a fixed 920 px minimum, and reserve navigation height plus the bottom safe area. Long custom plans or enlarged text must remain scrollable and never be clipped to fake a one-screen layout. This spacing change does not change Plans/Records or training behavior.

## RITMO V1.4 Exercise Data Decisions

- Keep the 20 existing RITMO exercise IDs as stable Core IDs; existing plans and Session snapshots must never be rewritten to third-party IDs.
- Store hasaneyldrm/exercises-dataset MIT non-media data in a separately versioned Extended directory with `hasan:` IDs. OpenGym is reference-only; do not copy its AGPL additions or Gym visual media into RITMO without a separate decision and permission.
- Core is shown first. Extended is available through explicit browsing/search; Niche is hidden by default. No external match or training prescription is professionally verified without review.
- Default home equipment is body weight and dumbbells, subject to actual accessory requirements. One exercise may be available in multiple environments with the same stable ID. Custom environments retain their existing behavior.
- Extended exercise acceptance must use source instructions as well as equipment labels: benches, bars, suspension gear, bands, and other extra apparatus are not default-home candidates. A missing load on a weighted exercise means "重量未设置", not "徒手" or a measured 0 kg; preserve that distinction in Session provenance. Only explicitly verified held-position variants may be classified as timed.
- Keep Chinese names, aliases, candidate priority, review states, and media requirements in a RITMO-owned overlay keyed by stable IDs. Preserve imported English source records and historical snapshots. Searching may use Chinese, aliases, and English; untranslated Extended entries remain available by English search. Do not show explicitly non-beginner priority entries in an unqueried beginner browse. Generic source muscle labels without a specific SVG region remain recorded as gaps, not guessed mappings; Gym visual references remain unlicensed media candidates, never playback assets.

## RITMO V1.5 Sequence Media Production Rules

These rules apply to **future** action-media batches. They supersede older reports' suggested production techniques where those differ. Do not regenerate already accepted media merely to apply this policy. Keep experiments isolated from the formal training code, Figma, exercise data, and approved media library unless a separate task explicitly authorizes integration. Visual acceptance does not imply professional movement review.

### Before generating an action

- Read the action's stable ID, current variant/specification, and review status. Record unresolved grip, stance, range-of-motion, equipment, or safety details as pending review; do not silently choose or label them professionally verified.
- Write a per-action constraint sheet **before** generating A: canvas dimensions and crop; fixed camera angle, framing, and subject scale; the ground line or fixed machine/bench reference line; body support/contact points that must not move; joints permitted to move; and equipment geometry/attachments that must remain fixed. Include these invariants in the prompt for **every** frame and in the production log.
- Default to a complete-scene mother frame **A**. Generate/edit B and C separately from A, not from each other as the sole source. Preserve the same person, clothes, lighting, background, floor, camera, equipment and absolute support points. Do not default to cutouts, transparent foregrounds, background extraction, optical flow, or cross-fades. Use direct A→B→C→B→A frame switches unless an action-specific approved sequence differs.

### Per-frame quality gate

- **Immediately after each B or C**, compare it with A side by side and with an aligned overlay at original resolution **and** the intended phone-card crop. Check the ground/horizon or machine baseline, background structures and lighting, subject position/scale, hands/feet/bench contacts, equipment shape and position, and the intended movement posture/variant. Record pass/fail and a concrete failure description for each frame.
- Do not make or approve a Sequence while any key frame has an obvious baseline jump, background change, person/equipment drift, broken contact, extra/missing limb, wrong variant, or unsafe/implausible motion. Keep the original generated frames and failed candidates for comparison. Check the assembled loop's first/last-frame continuity, crop, and visible transitions separately; playback must not drive training counts or timers.
- A frame or loop may be marked visually acceptable only after these checks. It remains **pending professional movement review** until a qualified reviewer signs off; failed samples must not enter the formal teaching-media library.

### Bounded correction and exception path

1. First correct only the failing key frame with a targeted edit from A and the specific defect recorded above.
2. If it still fails, use at most one further targeted correction round with stronger camera, baseline, scale, support-point, and equipment constraints. **Maximum: two correction rounds per action in total**, not two per frame. Recheck B/C immediately after each round; do not spend the batch's time budget on unlimited retries.
3. Only if both rounds fail, decide whether **one** localized foreground/background-lock and layered-compositing rescue is worth its cost. Do not use this exception for slight differences. Record the trigger, preserved original frames, extraction completeness, person/equipment edge quality, floor contact shadow, background consistency, and extra AI/manual time. If the rescue is too costly or fails quality checks, mark the action **needs repair / not usable**, then continue the batch. Never trade away movement accuracy to make the background look stable.

For every action, retain the constraint sheet, prompts, A/B/C versions, per-frame gate results, correction-round count, exception decision/cost if any, loop-format/playback result, and visual vs professional review statuses. Batch handoff must separate accepted samples from pending/failed ones and list remaining actions without automatically starting another batch.

### `hasan:0381` stop-loss decision

The final from-scratch side-profile reverse-lunge attempt is recorded in `reports/ritmo-v15-sequence-batch4/reverse-lunge-final-v4/`. Its C frame still moved the planted right/front foot after the permitted correction. Mark this action's media **暂缓制作 / not usable**. Do not resume repairing old frames, try a new technical route, or integrate its failed MP4 into formal exercise media. Continue other queued actions only when a new batch is requested. This is a media-production status, not a change to the exercise ID, catalog, plans, or Session history.

The designer subsequently authorized a **single explicit exception** to test background/foreground alignment of those v4 frames around the planted right shoe. Its isolated result is documented in `reports/ritmo-v15-sequence-batch4/reverse-lunge-final-v4/layer-align-v1/README.md`. The final 357px playback check is recorded in `reports/ritmo-v15-sequence-batch4/reverse-lunge-final-v4/layer-align-v1/final-acceptance.md`: **visual pass, pending professional movement review**. This does not authorize formal-media integration or further reverse-lunge repair. Do not infer standing permission to use layered compositing as the default for other actions.

## RITMO V1.6 Active Set interaction decision

- Warmup, strength, and cooldown must render through the **same `ActiveSetView` component**, with the same header, pause entry, media crop, number/target hierarchy, cue, and spacing. Do not add phase-only headings, progress sections, instructions, footer buttons, or hidden duplicate controls. The current V1.5 strength Active Set has **no execution-page bottom button**; do not invent one for any phase just to match an older description.
- Use the same `TrainingControlSheet` and `NextActionView` components across phases. Strength keeps its existing adjustment/end actions. Warmup and cooldown retain current-action skip and applicable early completion, and add only a whole-phase skip with one confirmation. Cancelling the whole-phase confirmation keeps the run paused.
- Repetition warmups follow the existing strength demonstration cadence; duration actions use the same numeric presentation but count seconds. A completed phase action advances to the shared next-action screen for manual START; changing phase must not create a different Active Set layout. Pause freezes duration and five-second side-switch timers. These presentation rules must not alter strength Session, partial, NEXT, or media-ID behavior.
- Starting any **new action** from the shared next-action START (warmup, strength, or cooldown) uses the existing 3→2→1 countdown before Active Set. The initial workout START may enter that countdown directly when the first item is a warmup. Countdown time does not count toward repetitions or duration; refresh during countdown returns to the same item's ready screen. Automatic same-action set transitions, rest completion, pause/resume, and the five-second left/right stretch switch never use 3→2→1.
- The top-right Active Set (and Rest) control is a two-state action: running shows “暂停 / 调整” and opens the existing control sheet while freezing progress; once paused and the sheet is dismissed, the same control shows “继续训练” and resumes the same action/timer directly. The sheet's “继续” action remains available. Do not show a non-actionable “已暂停” button or restart the new-action countdown on resume.

## RITMO V1.6 glute stretch media decision

- The isolated supine figure-four glute-stretch images failed side and grip readability checks and must not be mapped to training playback. Do not retry that pose automatically to fill media coverage.
- For the personal test leg cooldown, use the independent bodyweight `ritmo:stretch:double-knee-hug` static posture after the existing left/right quadriceps stretch. Its 30-second hold is a RITMO default, not a dose transcribed from the six source videos. Keep the back-group `ritmo:stretch:child-pose` selection unchanged.
- The revised knee-hug `double-knee-hug-v2.webp` image passed designer visual review on 2026-10-24; professional movement review remains pending. The earlier image failed leg-anatomy review and must not be mapped. Preserve prior catalog IDs, source images, plans, and Session snapshots; do not present this as a specialist piriformis stretch.

## RITMO V1.8 bottom navigation study

- The designer wants a more compact, visually unified three-Tab navigation with a single continuously moving lime selected surface, coordinated icon/label transitions, stable equal-width touch targets, safe-area clearance, and reduced-motion support. Preserve the light RITMO palette; do not copy Apple Fitness's dark appearance or add a complex glass effect.
- The designer selected compact A's 296×58 px shell and 96×50 px touch targets for the formal web app. Preserve its three equal Tab positions, safe-area clearance, and single continuous selected pill. The earlier balanced and icon explorations remain in `reports/ritmo-v18-nav-prototype/` for reference only.
- The designer rejected line-icon parameter tweaks and supplied the final three-pair icon set as `1.svg`–`6.svg`: training 1/2, plans 3/4, records 5/6, with filled selected and outline idle versions. The approved isolated preview is `reports/ritmo-v18-nav-prototype/designer-icons.html`; formal copies live in `public/icons/nav/` with only the white export artboard removed.
- The designer explicitly authorized applying that compact navigation and icon set to the web app. Keep this a navigation-only change: do not alter the three page bodies, training data, Session/NEXT rules, media, or Figma. Any further motion changes require separate feedback.
- The designer confirmed the V1.8 navigation on iPhone and then identified blue system-default button/link foregrounds elsewhere in the app as off-brand. App-owned buttons and links without a more specific semantic color should inherit RITMO ink on light surfaces; keep intentional lime emphasis and high-contrast white text on dark surfaces. Do not rely on Safari's default blue control color.
- In the separate dark-home trial, the designer requested an Apple Fitness-inspired treatment for the existing three-tab navigation: a wider dark translucent shell, charcoal moving selection surface, lime selected icon/label, and light neutral unselected icon/label. Keep the approved RITMO icon shapes, equal tab targets, safe-area handling, and continuous selection motion. The designer subsequently approved a dark Plans page. Leave the online test app unchanged until separately accepted.
- The designer subsequently requested the Records main page in the same dark trial. Keep its muscle map, heat colors, frequency rules, calendar selection, and Session data unchanged; retheme only the page, history surfaces, date controls, and calendar sheet. The online test app remains unchanged until separately accepted.
- The front/back muscle SVGs have transparent backgrounds: do not reintroduce an opaque backdrop rectangle behind the figure. The surrounding Records card supplies the shared dark surface, so the figure blends into that card even when its background token changes. Keep all anatomy paths, viewBox, heat colors and selection interactions unchanged.
- Increase the Records diagram/callout spacing by moving the figure 10px farther left and the label 8px farther right. Compute the leader length from both offsets (58px base + figure offset + label offset), and position its anchor dot from that same length so it tracks the figure. Preserve card/figure dimensions, vertical callout positions and muscle-color logic.
- The designer requested a physical week swipe in Records history: neighboring seven-day pages must move with the finger and settle smoothly after release, while vertical page scrolling and date selection still work. Future weeks remain unavailable and reduced-motion users get an immediate state change. This interaction is local to the history week strip; do not alter Session dates or calendar selection rules.
- The designer clarified that the approved dark Training, Plans, and Records pages, their dark navigation and modal styling, and the physical Records week swipe must all be published together to the existing iPhone web App. Preserve the current training, Session, partial, NEXT, and media behavior; future online releases should start from this unified dark baseline.
- The latest navigation size reference is the supplied Apple Watch screenshot `IMG_1588.PNG`, superseding the wide 356 px dark shell: use approximately 276×62 CSS px, three equal ~89×52 px targets, ~26 px visible icon artwork and 11 px labels. Normalize the blank margins in the supplied 48px icon exports within a 30px layout box (130% mask size, 120% for the wider training symbol). These are screenshot-based design measurements, not Apple official specs. Keep the supplied RITMO icon contours, lime selected foreground, charcoal moving pill and current safe-area offset; idle icons and labels are pure white. Use a translucent dark shell with standard and WebKit backdrop blur, plus an opaque fallback. Navigation size and homepage clearance share the same height token.

## RITMO brand motion prototype

- The selected wordmark direction is C: angled, cut-corner RITM lettering and a geometrically circular lime O. Its high-fidelity path SVG, traced from the designer's supplied original, is the stage-locked brand asset in `reports/ritmo-v18-brand-motion-prototype/high-fidelity/`; `brand-asset-lock.json` records its hashes. Do not alter the letter contours, spacing, or concentric O while iterating motion. Final designer visual acceptance and formal app integration remain separate steps.
- The START surface sheen belongs inside the existing button and must follow its own dimensions. A later Logo O → START transition must measure the real button at play time, never use a fixed screen coordinate, and safely reveal the homepage if the button is unavailable or the layout changes.
- The isolated brand opening holds the complete C Logo for about 2.5 seconds before motion. During the same movement toward START, the O's circular inner opening shrinks and its center morphs from a circle comparable to the final triangle's size into that triangle. The morph must finish by the time O reaches the measured target; do not defer shape changes until arrival, pause on the homepage, or simulate closure with a background-color fade. Preserve the independently measured target and replay reset behavior.
- In the isolated brand-motion prototype, replace the large visible START word with a centered, dark, right-facing equilateral triangle with clearly visible but restrained corner rounding. The moving O still becomes the lime button and arrives with the full triangle already formed. Keep the button's accessible START name and existing training action. Do not alter the locked C wordmark or formal app until separately approved.
- The final START triangle contour must use smooth curves at all three equal corners. Avoid dense straight-line polygon sampling for the settled icon; it produced visibly uneven rounded edges on the designer's iPhone screenshot. Preserve the current size, orientation, and in-flight circle-to-triangle timing when repairing the contour.
- After the smooth contour fix, the designer asked to restore the earlier, more noticeable corner roundness. Keep the larger rounded corners and compensate for any apparent shrinkage of the triangle's overall silhouette; do not revert to the jagged sampled polygon.
- Do not force the brand opening during training recovery, refresh, or return from background. Preserve the current START action and support reduced motion and page visibility. Formal homepage/PWA integration requires a separate designer decision.
- The designer has now approved formal web App integration of this locked C Logo, the in-flight O-to-triangle transition, and the restrained START sheen. The production button retains its original training action and measured placement. The designer subsequently changed the opening rule: play once per fresh App navigation, including a new cold launch after closing the App; do not play on page refresh, in-document Tab changes, training recovery, or background return. Do not persist a permanent "seen" flag. Do not change the locked letterforms or triangle contour without new designer feedback.

## RITMO V1.8 PLAY → countdown motion study

- The approved exploration direction is a single, approximately 610 ms visual transition from the existing dark-home PLAY button into the 3→2→1 countdown: a true rounded-triangle-to-circle path morph, centered expansion of the dark inner circle into a lime ring, a softly darkening and 1–2% receding home, and a measured move to the actual countdown-ring position. The rounded countdown digits appear only after the transition and must retain the full three-second countdown.
- The isolated study is in `reports/ritmo-v18-play-countdown-motion/`. It measures PLAY and countdown DOM positions rather than hardcoding endpoints, stops the idle orbit on click, prevents double starts, honors reduced motion and background interruption, and unloads its moving layer at handoff. Do not change the formal training executor, Session, partial, or NEXT for this study.
- Formal PLAY is currently 146 px and formal countdown ring 230 px at supported iPhone widths. The isolated study uses one common diameter so the ring does not scale in flight. Do not apply it to the formal app until the intended common diameter and real-iPhone visual result are confirmed.

- Follow-up countdown feedback: use a simplified fully rounded **text font**, with a plain vertical rounded-stem 1 and no hook or foot; never replace the numeral with a UI rectangle or SVG drawing. The isolated local font preserves text semantics and supplies the same glyphs across devices. Remove the completion checkmark: after the full 3→2→1, hand directly to the corresponding Active Set (the isolated study shows a data-free visual preview).

- Latest typography decision supersedes the custom plain-stem numeral study: use Apple **SF Pro Rounded** for App numbers, including live repetitions, target repetitions, sets, timers, weights, dates and record summaries. Share `--ritmo-font-numbers` in `src/numberTypography.css` with the isolated countdown; call the Apple font through `ui-rounded`, never redistribute Apple's system fonts. Keep numeric values and training logic unchanged. Browser fallback is not proof of iPhone font rendering.
- The formal 3→2→1 countdown progress arc has a simple rounded stroke end (`stroke-linecap: round`) at the same thickness as the ring. Remove the separately orbiting larger endpoint dot; do not substitute another knob or change countdown duration, ring diameter, numeral font, or training handoff.
- The isolated PLAY triangle must use the formal `BrandStartIcon` contour and its actual visual size, including the approved rounded corners. The earlier 0–100 SVG left excessive padding and made it too small. Match the existing formal viewport proportions; do not shrink the approved formal icon while iterating the countdown.

## Formal PLAY countdown handoff (2026-10-27)

- The designer reported that the approved PLAY-to-countdown motion was still isolated. It is now authorized at the formal home cycle PLAY entry: one measured 610ms triangle-to-circle/expanding-hole handoff, synchronized home darkening and slight recession, followed by the existing complete 3→2→1 and executor. Other action START and rest/resume entry behavior stays unchanged.
- Keep the current 146px PLAY and 230px countdown layout sizes. Since these differ, the moving visual smoothly adapts to the measured visible countdown stroke (229/240 of its SVG bounds), avoiding an arrival size jump without changing either page. This supersedes the earlier isolated-only/common-diameter gate for this integration.
- Reuse the actual CountdownView for the invisible target measurement and the live countdown. Use the approved BrandStartIcon contour for the morph; no duplicate visible ring or custom countdown timer. Keep Session/NEXT and phase rules unchanged.
- Lock repeat clicks synchronously. Only invoke existing beginWorkout after visual completion, so animation spends none of the three countdown seconds and creates no transient run on refresh. Reduced-motion goes directly to countdown. If backgrounded during the visual, finish safely on foreground; do not start the countdown hidden. Remove the visual layer and restore home styles on completion/unmount.

## Shared Add Exercise picker (2026-10-27)

- Quick Start and Plans must use the same picker-owned dark palette, title, search, rows, spacing and footer, independent of the underlying page. Already-added rows remain disabled only in plan editing; preserve selection/filter/add semantics.
- The environment-availability filter is a plain text-and-switch row, with no background panel, border or extra card padding. Keep the shared switch and explicit pressed state.
- The native search input is at least 16px with min-width:0 and constrained flex sizing; focus with preventScroll instead of autoFocus. Search blur/Done must dismiss the keyboard context while retaining the query and selected items. Do not restore the old delayed keyboard-hide timeout.
- Picker content uses a bounded flex layout with only results scrolling vertically. Six muscle filters fit the available width without negative horizontal margins. Keep the footer above the native safe area. On actual-phone layouts, use visualViewport bounds for this sheet only rather than the hidden simulated keyboard height; restore app-shell scroll offsets after blur without resetting the result list. Other sheets/runtime remain unchanged.

## Grouped plan editor and sheet title rhythm (2026-10-27)

- PlanDetailSheet shows three settings-style sections (热身 / 力量训练 / 拉伸), each using one shared dark rounded group with inset row dividers. Each action starts with its phase icon (sun/activation, dumbbell, stretching figure), replacing sequence numbers and 热/伸 character badges.
- Remove the visible system/default annotations and editable-action count; retain actual dose, side/direction and missing-equipment warnings. Source metadata and phase records remain unchanged. Warmup/cooldown remain fixed, not draggable or deletable.
- Strength rows retain parameter editing. The three-line handle directly reorders draft exercises, supports keyboard ArrowUp/Down and edge auto-scroll. A left swipe reveals a delete action; only tapping that action removes the row from the draft. Right swipe/tap elsewhere closes it. Preserve vertical scrolling, click suppression after gestures and pointer cancellation. Reorder/delete are committed only by Save; retain existing discard-unsaved behavior. Never restore the dots/up/down/delete popover.
- All app-owned sheet headers share --ritmo-sheet-* metrics: 30px handle zone, 12px gap before the 26px title line, 24px space after it, 20px side inset and 20px type. Editable plan name uses the same 42px title-top offset from the sheet top. Keep the pencil aligned to the 26px line with an expanded hit area so it cannot increase header height. Change shared tokens rather than per-sheet title paddings.
- The Add Exercise native-viewport hook is shared with PlanDetailSheet. Real-phone layout uses visualViewport bounds for these sheets, avoiding the hidden demo keyboard moving the editable name offscreen. Desktop simulated-keyboard behavior and protected runtime are untouched.

- Follow-up editor feedback: open PlanDetailSheet at 92% height (bounded by the native visible viewport), with no expand/collapse arrow. Preserve the shared handle/title metrics. Dragging and swiping are mutually exclusive: close any swipe first and mount delete UI only during an actual left swipe, never under a lifted row. Keep the group corners rounded even while overflow allows a floating row, keep drag placeholders transparent and suppress Safari's rectangular tap highlight on row controls. Do not add colored drop strips or handle backgrounds.

## Training dark-theme completion

- Extend the approved main-tab dark palette to the shared NextActionView, rest controls, TrainingControlSheet, next-set adjustment and end/phase confirmations. Use shared page/card/text tokens on the device screen as well as the prototype shell so portalled sheets inherit them. Keep near-black pages, distinct charcoal sheets, raised dark controls, light primary/muted text, lime primary actions and red destructive labels.
- Preserve every training component, action, timer, phase, media ID, Session/partial/NEXT rule and control position. Theme changes must not introduce a separate warmup/cooldown UI. Training sheets size to actual action content with safe-area padding and bounded vertical overflow rather than cropping controls at old fixed percentages. Keep shared title-to-handle metrics.

## Background return to training home

- The designer explicitly changed recovery behavior: backgrounding, leaving/reopening, or reloading a run lands on the Training home, with the run paused. The latest START-choice decision below supersedes the earlier manual resume card. Do not automatically reopen or resume Active Set, rest, a modal or countdown. Preserve the active run, completed sets, exact remaining clock/side, and next-set edits. The central START remains actionable and presents the explicit continue/restart decision before replacing a parked run. Other launch paths must not silently overwrite it.
- Suspend on visibilitychange(hidden) and pagehide; BFCache pageshow remains parked. Freeze deadlines once, clear them, and persist the frozen snapshot synchronously before iOS suspension. A restored legacy snapshot uses saved remaining values rather than consuming time against an old deadline. Reload also lands home. No permanent launch flag, no automatic partial Session, and no NEXT advancement on lifecycle events.
- An interrupted 3→2→1 returns to that same action’s ready state; manual START still runs the full existing countdown. Ordinary in-executor pause/resume still has no 3→2→1; the explicit home START recovery entry uses the latest decision below. Completed strength Sessions remain independent and unchanged during cooldown interruption. Native iPhone background/termination verification remains a separate device check.

## Interrupted workout choice at home START (2026-10-27)

- Do not show a separate resume card on the home page. When a parked run exists, tapping central PLAY opens the shared dark bottom sheet with “继续上次训练” and “重新开始训练”. Dismissal keeps the same frozen run; without a parked run, PLAY starts normally without the sheet.
- After selecting, close the sheet, measure the actual home PLAY, reuse its existing morph transition, then run the full existing 3→2→1. Continuing preserves the run ID, stage, current set/repetition, exact remaining time, side and next-set edits. The countdown gates this frozen snapshot and never advances/resets its current action. Background or refresh during it returns home with that original snapshot. Existing in-training pause/resume and automatic 5-second side changes remain unchanged.
- Restart means start the plan selected on the home page from its beginning (with no helper paragraph in the choice sheet). Preserve already confirmed strength sets as the old run's partial Session, without advancing NEXT; no completed groups means no empty Session. If the old strength Session already exists (e.g. during cooldown), keep it unchanged and do not duplicate or downgrade it. New training receives a fresh run ID. Until the visual handoff succeeds, retain the old frozen run.

- The designer approved the START recovery sheet and requested removing its bottom helper paragraph. Keep only the shared title and two action buttons; preserve their existing behavior, transition, timers and record safeguards.

## Shared repetition pacing (2026-10-27)

- The designer selected a 4-second automatic count interval for ordinary repetition-based strength exercises (a practical UI pacing default, approximately 2 seconds lifting plus 2 seconds lowering; not a scientifically universal optimum or sensor recognition). The subsequent designer decision extends this to every repetition-based phase: use the single REP_INTERVAL_MS constant for warmup, strength and any repetition-based cooldown, including the final repetition's dwell. Showing repetition 1 starts its full interval; a 10-repetition set therefore takes about 40 seconds of uninterrupted execution.
- Pause stops the automatic count; continuing starts the current repetition's interval again without adding a repetition or a completed set. Keep timed strength, phase durations, rest, 3→2→1 and five-second side switches unchanged. The designer explicitly requested the same 4-second repetition cadence for warmup and cooldown too; this supersedes the earlier strength-only scope. Current cooldown catalog entries are duration-based, so keep their real-second holds (e.g. 30 seconds remains 30 seconds) and do not change their measurement type or target to simulate slow counting. Do not change media playback speeds, saved targets, Session, partial or NEXT rules for this change.

## Shared navigation gradient rim (2026-10-27)

- The bottom navigation shell uses the same continuous masked 1px gradient rim and fallback border token as the approved environment/settings header controls. Remove the previous uniform white outline and separate inset top highlight. Keep its 276×62px size, safe-area position, dark translucent fill, backdrop blur, selection pill, icons, targets and switching motion unchanged. Adjust the existing shared --ritmo-header-control-edge-gradient token to update these rims together; do not add a disconnected top stripe or animate the border.

## RITMO V1.8 home and training-control hierarchy

- The home hero eyebrow is 今日训练 (presentation only; NEXT remains an environment-scoped cycle, never calendar-bound). The former Quick Start entry is 自由训练 and keeps the existing independent exercise picker / custom-run behavior.
- The home previews at most four strength exercises from the plan in its existing order. A subtle 还有 N 个动作 chevron opens a read-only full-strength list. Never truncate plan data, count phase items as strength, or add edit/reorder/delete controls to this browsing sheet. Small-screen spacing may tighten only for the overflow-list state; keep the PLAY diameter and navigation clearance.
- Continue is the sole lime primary in the existing TrainingControlSheet. Existing action callbacks and availability remain unchanged; put current-item/parameter actions before low-emphasis phase skip or workout exit. Phase skip retains confirmation and a 48px target; workout exit retains the existing partial/no-empty-session rules.
- Shared-element pause motion and the media-plus-progress layout in reports/ritmo-v18-home-control-study are isolated, unapproved interaction studies. Do not integrate them into the formal executor without designer approval. Measure the entire green pause container (not merely its transparent inner button), and hide that complete container during the shared transition to avoid a second green pill. Preserve actual media and cadence semantics; a repetition progress ring represents preset pacing, never sensor recognition.

## RITMO V1.8 ring-contained pause study (2026-10-28)

- Latest designer direction supersedes the top-right shared-green-button study: preserve action media as first visual center; put current rep/time inside a lime progress ring with a plain two-bar white pause icon directly below. Only the transparent 44×44 icon target is actionable; ring/number are not buttons. Preserve target/load/set/cues/review labels and media size/crop. Remove the Active Set top-right pause entry only in the isolated study.
- reports/ritmo-v18-ring-pause-study is an isolated prototype, not approval to edit or deploy formal Active Set/control/executor. It reuses an exact generated executor mirror with only two presentation substitutions; formal files and persistence rules remain unchanged. Repetition arc is preset pacing, never sensor recognition; preserve the current 4-second restart-on-resume behavior and all real-second clocks.
- Shared motion begins at the ring icon, measures actual SVG/media/continue bounds, freezes immediately, and restores without321 or reset. Compact reused control sheet is experimentally docked over frozen media to keep the real ring/number/target/cues visible. Keep one live ring and one visible shared symbol; place its proxy above the actual sheet, cancel safely on lifecycle/layout invalidation, and guard rapid input even with reduced motion. This docking placement and motion await designer acceptance.
- Preserve the actual per-phase abilities: no new strength skip-current or invented whole-workout exit on phases that lack it. Continue remains the sole lime primary; existing current-item/parameter actions and low-emphasis confirmed phase/workout exits retain original handlers.

## RITMO ring pause V2 designer revision (2026-10-28)

- Latest feedback supersedes the icon-only hit area and upper-biased number: in isolated reports/ritmo-v18-ring-pause-study-v2, the whole larger circle (200/220px) is the pause target. Center the number exactly in the circle; place two plain pause bars below without shifting the number. Keep only original target/load and cue under the circle; no extra pacing explanation on the active page. Keep media size and no top-right Active Set control.
- The full ring, not a separate little icon, shares its measured bounds with the pause sheet's Continue circle. Keep position and diameter identical; fill inward and morph into Continue, reversing to frozen progress on return. The sheet extends upward from that same circle so the two original feedback lines remain unobstructed. Ordinary immediate Continue is allowed as soon as motion finishes; the extra450ms reversal guard applies only in reduced-motion mode.
- This is still an isolated unapproved view/motion revision, not authorization to alter formal execution, Session/partial/NEXT, clocks, media, homepage or deployment. Preserve V1 evidence and old prototype directories.

## RITMO ring pause V3 bottom-sheet correction (2026-10-28)

- The designer explicitly confirmed shrinking V2 circle diameter by one fifth:220→176px, small-screen200→160px. Preserve whole-circle interaction, centered number, pause bars below, actual media size and two original feedback lines.
- Supersede V2 centered/upward dock: the training control is a real bottom-anchored full-width half-modal that slides up from the bottom. Continue circle comes first; parameter/current-item actions and workout/phase exit follow below. Do not float the sheet mid-screen to keep underlying ring/cues visible.
- Shared circle keeps the source diameter but moves to the real Continue position inside that bottom sheet. Measure the final destination independently of temporary sheet translation. Preserve freeze-first behavior, no321 on resume, reduced-motion/repeat guards and unchanged original callbacks. V3 remains isolated in reports/ritmo-v18-ring-pause-study-v3; no formal integration or deployment authorized.

## RITMO ring pause V4 numeric continuity (2026-10-28)

- Latest isolated revision retains the same frozen number/time in the pause sheet's primary circle, at the same center and typography as outside. Place a pure filled rounded play triangle below it using the exact24px icon box and relative offset of the outside pause bars. Reuse the approved brand triangle contour; normalize uniformly, not with a rough outline/polygon or stretch. Main visible content is number plus icon; preserve the Continue accessible name and callback.
- Designer prefers white but explicitly allows black if white is unclear. White trial on#b7ff19 was weak (~1.21:1); V4 chooses#11180c for modal number/play (~14.94:1), while outside number/pause remain white. Keep number visible throughout the shared transition. Explicitly override inherited old modal label/icon sizes so they cannot shrink the number or enlarge the play glyph.
- Preserve V3 circle sizes176/160, bottom-anchored slide-up sheet, operation order and all training/media/record rules. reports/ritmo-v18-ring-pause-study-v4 remains isolated; no formal deployment authorized. Retain prior versions.


### 2026-10-28 圆环暂停 V5 隔离反馈
- 最新候选原型：reports/ritmo-v18-ring-pause-study-v5/。圆环内暂停/继续使用文字，替代两竖线/三角图标；数字正中，操作文字上移，媒体至圆环间距28px。
- 保持V3缩小五分之一后的160/176px圈径、底部贴底半模态，普通操作位于主继续按钮下。
- 新增完整3·2·1到训练圆环的真实布局测量交接，仅视觉原型；420ms视觉与原Active计时并行，不改倒计时/业务时机。
- 本轮仍未批准正式接入或部署；保留V1–V4，不把原型视为正式App。

### 2026-10-28 V5 圆环正式接入与发布授权
- 设计师确认将V5圆环、文字暂停/继续和倒计时到训练圆环的转场发布到现有iPhone测试站点；此前隔离限制仅对本轮获准内容解除。V1–V5原型和原始证据继续保留。
- 正式实现位于src/trainingMotion/，只接入三个展示适配器及其视觉Provider；不得复制隔离Executor/fixture进入正式应用。保留原计时、Session/partial/NEXT和媒体映射。
- React.StrictMode下须在同一绘制前任务内等待挂载校验稳定后再消费倒计时来源，避免attach/detach/attach清掉转场。安全回退与减少动态效果持续有效。
- 部署保留原地址和所有者访问范围；旧线上第29版及其源码提交作为回退点，见reports/ritmo-v18-ring-release/rollback.json。不得删除旧版本、清空网站数据或重置个人训练记录。

### 2026-10-28 全流程圆形转场与验收后清理
- 第30版已获设计师手机验收，作为正式基线。按明确授权清理上轮专门保存的before/文件副本、独立rollback清单和专用Git标签；标准提交及平台版本历史保持正常，不清空用户数据，也不扩大删除到旧设计证据或媒体。
- 所有阶段TrainingControlSheet中的调整/跳过与结束入口之间不显示横线。保留操作和确认逻辑。
- NextActionView的圆形START也复用首页PlayCountdownTransition，测量实际按钮与倒计时环：610ms圆心扩张成环、背景退场与移动同步，完成后才调用既有onStart，完整3·2·1不提前计时。
- 下一项START以原文字为起点（不是再加三角形）；首页PLAY仍使用原三角变圆路径。查看记录入口不播启动转场；自动组间过渡、暂停恢复与5秒换侧不新增321或启动动画。
- 动效中同步锁定重复点击；刷新/后台保留原暂停/首页恢复能力，减少动态效果直接调用原START。不得修改训练、Session/partial/NEXT算法。

### 2026-10-28 首页与全流程统一：A / B 边界
- 当前环境有非空且动作均可用的持久化“我的方案”时，首页展示今日训练及底部自由训练卡片；当前轮次方案适用则优先展示它，否则展示本环境首个适用方案，作为 custom 启动，不改循环指针。无适用方案时展示推荐 Carousel、说明附近的低强调自由搭配入口，不再另放大型自由训练卡片。历史数据没有用户创建/初始预置来源字段，不新增数据迁移来猜测来源。
- 计划首页与推荐卡片共用 HomePlayButton 及已有品牌/PLAY→321机制；推荐只预览前三个力量动作，完整列表只读；原计划首页仍为前四项。长名称不得撑宽 Carousel 卡片。
- 正式删除下一项参数旁无功能箭头、调整下一组中的上一组次数修正 disclosure；保持所有执行器计时、保存及历史结构不变。
- reports/ritmo-v18-unified-flow/ 是本轮隔离验收目录。B 的准备页退出重组、Rest 圆环、弹性 Active Set 间距、双竖线/播放图标、确认文字不得在设计师验收前接入正式应用。正式继续保留此前验收的暂停/继续文字。
- 新需求明确手动提前开始下一组也要完整321；基线 startNextSet 仍直接 active。本轮将修正放入 B 验证，复用冻结快照倒计时分支，不冒称正式已修复。自动 Rest 结束、普通暂停恢复、5秒换侧不新增321。
- 本轮没有在线发布授权；仅本地阶段 A 实施和阶段 B 隔离交付，线上保持上一版本。

### 2026-10-28 推荐首页行内入口定稿
- 将推荐说明与自由入口合为“选择一套推荐训练，直接开始，或自由搭配”一句。“或自由搭配”使用黄色#FFD60A，无箭头、无额外横向gap，透明触控高度44px；继续调用现有自由训练动作选择流程。此黄色是设计师对本处的明确要求，不扩散修改其他品牌色。
- 有适用我的方案和无适用方案两种首页，冷启动Logo O到各自实际PLAY目标的转场均必须保留；不改变已有训练恢复、后台及减少动态效果保护。预览提供开屏回放选项，第一张推荐卡为默认目标。

### 2026-10-28 行内入口与阶段A发布
- 设计师明确授权将已确认的首页及阶段A修改提交现有Web App做最终手机验证。保持原站点、原所有者范围，阶段B仍隔离不得随包接入。
- 已成功部署home-inline-final版本，托管源码5f02c7309506b2ebb91f35836ddaf7e3ad1d9383；细节见reports/ritmo-v18-unified-flow/deployment.json。保留有/无方案Logo O→PLAY原转场与现有恢复保护，无需用户清空网站数据。

### 2026-10-28 行内入口品牌色修正
- 设计师将“或自由搭配”从黄色改为RITMO品牌荧光绿，直接引用共享var(--lime)，覆盖此前本处#FFD60A决定。保留无箭头、同句紧接、44px透明触控区域和已有动作选择逻辑。沿用既有线上测试站点同步发布，不改任何开屏或训练逻辑。

### 2026-10-28 开屏漏播与未结束训练规则纠正
- 设计师再次明确：未结束的训练不影响开屏。重新打开先Logo O→PLAY并到首页；点击PLAY才出现原继续/重新开始选择。不得因activeWorkout存在而跳过开屏，也不得在开屏中恢复、放弃或改写训练。
- 独立Web App每次新文档挂载的训练首页可开屏，不依赖NavigationTiming仅为navigate；同文档普通后台返回不重复播放。浏览器刷新、记录深链和系统减少动态效果沿用保护。
- 允许隐藏预加载等待首次可见、目标PLAY延迟布局后有限重试；仅目标稳定后启动既有动画，最长等待2.5秒后正常显示首页，避免遮罩卡住。Logo字形、2500ms停留、1150ms转场与圆环路径不改。
- 本轮修复直接更新现有线上测试版，仍不接入阶段B，不改Session/partial/NEXT。

### 2026-10-28 首页外环速度与缓冲
- 慢段90°保持1352ms；快段270°由1248ms减为624ms（整体两倍速度）。总周期1976ms。快段起止各120ms匹配邻段角速度的贝塞尔缓冲，不突然加速或减速；循环衔接回原慢速。
- 外环和按钮内部高光继续共享ritmo-start-synchronized-orbit，不分离两层节奏；保留后台暂停、减少动态效果、点击/开屏与训练动效规则。

### 2026-10-28 无适用自定义方案时的推荐按钮静态化
- 推荐侧滑卡片的多个PLAY按钮不显示外环、旋转与按钮高光；采用静态品牌荧光绿。仅作用于recommendation-home-unified，无论健身房无方案或家里无适用方案均一致。
- 保留原按钮尺寸、点击、Logo O→首张PLAY与PLAY→321目标及转场；有适用自定义方案的主按钮外环与同步高光保持已验收效果。

### 2026-10-28 推荐卡片玻璃材质与可调训练节奏
- 无适用方案的推荐侧滑卡片使用轻微半透明深色背景及12px背景模糊，支持标准/WebKit，能力缺失时退回原不透明卡片；按钮保持上一轮确认的静态荧光绿、不加外环与高光。不得扩散修改有方案首页卡片。
- 设置新增真实可用「训练节奏与休息」，覆盖此前仅环境可用的占位限制。仅调计次型单次动作间隔（默认4秒，2–8秒，0.5秒步进）和同一力量动作组间休息（默认90秒，15–300秒，15秒步进）。其他规划项保持不可用。
- 设计师补充取消动作间时长设置；动作之间继续手动START。计时型力量/热身/拉伸、3·2·1、5秒换侧、媒体播放速度均保持真实秒制和原规则。
- 设置与方案/Session/NEXT共用既有持久化容器但独立字段trainingTiming；只在新训练开始时捕获timing快照，恢复中断训练不套用新偏好。旧未完成训练无该字段时保留4秒和原动作组间休息，旧Session不改写。圆环只读取该次训练的计次间隔，不建立独立计次逻辑。

### 2026-10-28 节奏提示与推荐卡片材质精修
- 删除训练节奏设置中“用于下次新训练……”整句辅助提示，仅移除展示，不改变下次新训练生效、旧训练快照或真实秒制规则。
- 推荐卡片深色遮色由64%降为46%，背景模糊由12px改为14px，让人物轮廓更明显；仅推荐侧滑卡片，保留文字可读、实色降级、静态PLAY与开屏转场。
- 透明材质必须覆盖旧版全局实色卡片的!important规则，并以浏览器实际rgba计算值核对；仅设backdrop-filter但背景仍为实色不算完成。

### 2026-10-28 六肌群独立首页背景资产
- 六肌群首页背景必须分别生成独立竖图，不得从六宫格反向裁切、放大或超分辨率冒充原生高清。按真实CSS auto805px/right-top与三视口裁切做构图，不直接假定cover。
- reports/ritmo-home-hd-six/仅隔离资产与真实首页副本；本轮不授权替换正式首页/媒体、PWA、Logo、PLAY或发布。原生约940×1672是当前工具实际输出，未达到建议1536×2732，不得标作高清尺寸验收通过。待设计师统一验收。

### 2026-10-28 六肌群背景 V2 胸部基准
- 胸部背景已获设计师视觉认可，锁定原图不重做；其余以胸部近景尺度、斜上方且朝标题侧的荧光轮廓光为基准。背/肩不显示头部，手臂轻微侧身，臀腿采用后视角，核心局部放大。
- reports/ritmo-home-hd-six/revision-v2/独立保留四张新原图与核心CSS构图预览，V1不覆盖。核心生成受拦截，复用原图等比放大28%并上移95px；光向未完成，不能冒称五张均已统一。原生941×1672低于建议高清门槛。
- 本轮仍不授权正式接入或发布；胸部SHA校验保持一致，所有正式UI/训练/媒体映射不变。

### 2026-10-28 六肌群背景正式个人测试版接入
- 设计师确认V2预览并授权应用首页：有适用训练方案时，以当前homePlan的真实力量动作调用既有resolvePrimaryGroup，按胸/背/肩/手臂/腿/核心选对应已验收背景；混合方案复用原贡献与稳定并列规则，不按名称或重量组数猜测。
- 无方案或主要肌群不明时保留原默认背景；不跟随推荐侧滑卡片更换。六张WebP复制到public/assets/home/muscle-v2，旧图片/原图不覆盖。核心沿用设计师确认的原图放大28%、上移95px构图，其光向和原生分辨率限制记录继续保留。
- 仅首页背景映射与CSS变量改变，Logo/PLAY/倒计时/执行器/媒体/Session/NEXT/用户数据不变。允许沿用Sites原owner-only站点更新个人在线测试版，不扩大访问范围。

### 2026-10-29 记录页立体肌群图与固定信息栏
- 设计师要求以参考图方向升级人体精细度；本地新增石墨灰立体正/背面底图，原front/back SVG和全部28/30个肌肉区域d路径、稳定分组及最近训练颜色/日期算法保留，不覆盖旧资产。
- 右侧名称/训练日期固定在肩部右侧同一位置，不再随肌群上下移动；引线同时测量选中SVG区域与真实文字位置。纵向时间图例放右下方，移除底部横向图例和原说明段。
- 选择用荧光描边，与训练时间色分开；训练色以整体色彩混合叠加保留立体明暗，不能退回平面色块。
- 本轮仅本地预览，未授权线上发布。reports/ritmo-v18-records-anatomy保留原图、生成记录、12项视口和10项交互证据；真实iPhone仍待验收。不得修改Session/partial/NEXT、训练媒体、首页或导航。

### 2026-10-29 记录肌群图 V2 光感反馈
- 设计师拒绝V1过强正光、塑料分块和不自然轮廓；参考原图的弱侧光/背缘光，前表面暗、肌肉连续自然，不给每块肌肉描白边。
- 选中肌群需要贴合底图明暗的中心渐变填色，不只是描边，也不应像一块发光圆球。另保留未选中六档时间色、单色和混合对照；配色夹具不得冒充训练历史。
- 本轮仅reports/ritmo-v18-records-anatomy/revision-v2隔离预览；原28/30区域及分组保留，背阔肌遮罩仅在隔离SVG局部延展。正式资源、代码、统计和线上不变，等待视觉验收。

### 2026-10-29 记录肌群图 V3 暖色时间分档
- 设计师确认V2肌理；正背底图/光感锁定，不重新生成。按新六色参考将时间分档对应为红(0–2天)、橙(3–4天)、金黄(5–7天)、浅金(8–14天)、米金(15天以上)、灰(从未训练)，替代之前后两档蓝灰。原时间区间和统计逻辑不变。
- 隔离timePalette.ts统一绑定图例和模块颜色；选中荧光绿仍独立。肌群名称22px、状态16px、日期12px，图例13px/色点12px，长名称可换行。不得以换色修改历史时间。
- 本轮仅reports/ritmo-v18-records-anatomy/revision-v3预览；V2与正式/线上保留不改，等待设计师验收。

- V3追加：设计师认为着色偏暗，仅小幅抬高时间着色的明暗偏移0.15→0.22；色相、灰色未训练底图、选中荧光绿、原图与字号不变。brightness-tuning保存前后对照，仍仅隔离预览。

### 2026-10-29 记录肌群图 V4 明亮轻荧光
- 设计师认为V3仍暗，允许明显提亮并加轻荧光感。V4保留暖色时间顺序，使用更明亮主色/局部高光、抬高中暗部和14%静态表面色；不加外部光晕、动态发光或整图亮度滤镜。
- V2人体原图/肌理、灰色未训练、荧光绿选中、字号/布局不变。reports/ritmo-v18-records-anatomy/revision-v4独立保留；正式与线上仍不变。

### 2026-10-29 简化石墨人体：最新分阶段方向
- 最新完整稿覆盖前几版“更荧光”的探索：Dark Graphite、faceless、平滑简化肌肉、无皮肤/血管/肌纤维、无机械装甲。颜色回到柔和红/橙/金/浅暖金/暖灰/深灰，不用蓝色，不做高荧光黄。
- 选中必须保留本来训练时间色相，只加强局部内光；未选中降低强调。不再将所有选中肌群统一变成品牌绿。信息灰色状态仍需可读，不必用过暗的实体材质色作文字。
- 按用户阶段顺序，仅制作一个新正面做同图A低/B中发光，确认材质后才生成新版背面。reports/ritmo-v18-records-anatomy/minimal-v1保留2次生成(首图+一次体积修正)、原28块区域、真实记录页隔离模拟。
- 新原型从原Records组件算出的时间分档换材质，不改统计；其旧绘制色读回仅为隔离适配，正式应直接消费period/lastTrainedDays。旧背面可切换只证明原功能保留，不能冒充新版正背统一。
- 本轮仍不修改正式/线上/Session/NEXT/Figma。完整新版背面、分区配准、真机和正式接入等待材质确认。

### 2026-10-29 简化石墨人体局部定向灯光
- 设计师反馈仍缺少参考中的灯光感；本轮保留已生成正面人体，仅在隔离minimal-lighting-v2调整选中区域的上侧柔光、方向衰减和极弱邻近反光。不要以全局亮度或均匀填色代替局部照明。
- 局部镜面试验会放大颗粒，已换为平滑漫反射；保留时间色相与石墨暗部，不改成塑料/金属或全身霓虹。二维明暗近似不等同真实3D布光。
- 正式/线上、历史与源资产不变；先确认正面灯光，新背面仍等待后续材质确认。

### 2026-10-29 通透内光替代实体照明
- 设计师否定V2立体灯照感，要求参考图的通透科技感光效。V3在同一正面模型上移除伪高度漫反射与局部外照明，使用半透明同色内发光、柔和局部高光与轻扩散；不重新生成或改变人体。
- 时间色及原统计不变，不以统一绿色取代；不增加扫描线、粒子、闪动或全身霓虹。minimal-translucent-v3仅隔离预览，V2与正式/线上均保留，新背面继续等待确认。

### 2026-10-29 透明中心与科技边缘光
- 设计师仍拒绝V3的实心/塑料感，最新明确允许边缘发光与中间透明；覆盖早先不做选中描边的探索限制。V4选中中心完全不填色，只沿原肌群路径叠加轻薄渐变边缘光与小范围扩散，不改人体。
- 保留时间色、统计和真实交互，不增加扫描/粒子/持续闪烁。minimal-edge-light-v4仅隔离；正式、线上与旧版均保留，新背面仍待材质确认。

### 2026-10-29 返回指定V2原稿并轻微提亮
- 设计师最新截图与revision-v2/six-color-sheet.jpg解码RGB完全一致，明确回到该有面部人体和原红/橙/金/浅蓝灰/蓝灰/深灰配色；覆盖后续简化模型/暖色/内光/边缘探索方向。
- revision-v2-soft-bright只将原时间色渐变alpha .72/.52/.10提高至.84/.62/.14，不改原图片、RGB、选中、布局或业务。保留本版；追加“白色高光保留、暗部透明、颜色在后方”的试验必须独立保存。正式与线上不变。

### 2026-10-29 白色高光透明化与后方填色实验
- 设计师在保留V2小幅提亮版后，追加独立试验：人体浅色高光在前、深灰暗部透明、原肌群颜色置后。revision-v2-transparency-study通过静态亮度→alpha滤镜实现，源图不改，不重新生成；单独提供三图层和透明网格对照。
- 原V2 SVG有两个同名anatomy-regions组，隔离适配必须处理两个，避免实际颜色组留在纹理前或“仅高光”残留颜色。不要据第一个同名组判断层顺序。
- 本试验不覆盖小幅提亮版，不修改正式/线上/历史/统计，最终材质等待选择。

### 2026-10-29 透明模型后方颜色提亮与混色默认展示
- 设计师继续采用白色高光在前、颜色在后的透明试验，要求后方肌群颜色更亮并看多色并存。独立revision-v2-transparency-brighter-mixed把后方alpha .65/.45/.10提高到.82/.60/.14，白色高光、原RGB和原模型不变。
- 默认展示同一模型不同肌群的六档模拟时间色；不把同一肌肉混入多个日期色，不冒充真实历史。保留旧版与分层/网格对照，正式和线上不变。

### 2026-10-29 透明人体后方肌群填色正式发布
- 设计师确认后方叠加方案，授权直接发布现有Web App；五档训练色统一红/橙/黄并逐档降低强调，红色更亮；从未训练中性灰。src/recordsAnatomy.ts统一图例与填色，不改变天数区间、原统计或历史。
- public/assets/muscle/translucent-v2复用已确认V2正背WebP，白色高光alpha前层、原28/30肌肉路径后层；新副本规范两个容器ID。保留原选中/焦点细轮廓、实际引线、加载失败矢量回退和旧素材。
- 正式直接读取lastTrainedDays，不能带入隔离fixture或颜色读回适配器。维持原owner-only站点与域名；不部署报告/模拟Session，不修改训练执行、partial/NEXT、动作媒体或用户数据。真机颜色与性能等待设计师验收。

### 2026-10-29 六原视频与常用动作媒体批量候选
- 本轮范围按设计师回答限定为六段原视频全部阶段动作＋现有常用/推荐，不批量补齐1,324个扩展动作。优先生成图片与Sequence供逐项审核；参数未知允许先用RITMO默认，但必须显式标记并保留原视频参数和待确认状态。
- 训练图上不再显示“姿势参考 · 待审校”覆盖字样；reviewOnly、technical/professional等台账状态仍独立保留。不得把移除提示当作专业审校通过。
- 六视频完整配方必须保持热身/力量/拉伸原顺序与变式；单侧力量、双组热身及中心＋左右拉伸与现有规则有差异时先记入隔离配方，不能冒用相似ID或静默更改执行器。新增/复用媒体待逐项确认后再正式接入，不自动替换现有推荐。
- reports/ritmo-video-library-completion保留本批候选、失败帧、默认参数标记及有界台账。宽距单哑铃深蹲、前臂转髋、交替转体卷腹两轮后止损，不将失败Sequence充数；肩绕环、肘贴身外旋、腹部伸展转体的既有风险继续保留。

### 2026-10-30 六视频媒体逐项视觉反馈修订
- 设计师已通过16项展示素材，清单及65个文件哈希锁定于reports/ritmo-video-library-completion/revision-2026-10-30/accepted-lock.json。不得为了统一风格再次生成已通过素材；缺失对侧与专业动作审校不随视觉通过自动放行。
- 本次明确授权重试其余10项，修正卧推近镜右手拇指及跪姿俯卧撑B位置。旧修正/止损记录保留，本轮上限仍为每动作两轮。四段Sequence、三组成对静态为待验收候选；低位斜上举、相扑深蹲、前臂转髋仍只保留姿势，不能以错误轨迹/浅蹲/同向转髋拼动画充数。
- 新旧全景/原生与357px对位、失败帧和提示词独立留存；本轮不接入正式媒体、不更改视频配方默认值、Session或NEXT。

### 2026-10-30 六视频媒体第二轮反馈与替代分支
- 最新反馈新增视觉通过：平板哑铃卧推、跪姿俯卧撑、仰卧交替转体卷腹、俯身轻哑铃肩胛激活、直臂腕部牵拉原视频变式、屈膝扶架前三角拉伸。累计22项、90个展示文件锁定于revision-2026-10-30-r2/accepted-lock.json；不得重新生成。专业审校和未展示对侧仍独立待核。
- 用户明确授权剩余四项按“重试→换视角→合理替代”推进。交叉腿改正面偏斜视角分别生成前交叉左/右腿；低位斜上举导出一段待验收关键帧Sequence，但哑铃阻力与胸部目标疑问继续保留。相扑深蹲和前臂转髋换视角后仍脚位漂移/反向不清，本轮两阶段止损，不输出失败动画。
- 替代建议独立展示：已有hasan:1760杯式深蹲复用，站距与原宽距相扑不同；新ritmo:alternative:forearm-side-plank-hold左右静态候选，静态侧向稳定不等于动态转髋。20秒/侧仅隔离默认待确认。没有自动修改原配方/动作ID/正式映射。
- 所有新图、原生与357px对位、失败、提示词、参考依据及台账副本在reports/ritmo-video-library-completion/revision-2026-10-30-r2；不改正式src/public、Session/NEXT或线上。等待本轮视觉选择，不自动再开生成。

### 2026-10-30 本批最终视觉验收与替代选择
- 设计师确认第二轮两项修订（低位斜向上举、交叉腿俯身后链拉伸）及两项替代（hasan:1760杯式深蹲、ritmo:alternative:forearm-side-plank-hold左右静态）全部通过。现为24项原动作素材视觉通过＋2项替代方案已选择；不要再生成这些已通过素材。
- 最终验收记录及14个新增/复用展示文件哈希位于revision-2026-10-30-r2/designer-acceptance.json；此前22项90文件锁定记录保留。该文件为本页“待验收”生产快照之后的最新验收结论。
- 原相扑深蹲/前臂转髋失败记录不改为通过，不将替代素材冒用其ID；替代目标差异、低位斜上举阻力疑问、默认参数待确认、专业审校独立保留。此次仅归档验收与替代选择，尚未正式接入或部署。

### 2026-10-30 六视频剩余缺口补齐候选
- closure-2026-10-30集中处理上轮50条原视频中的7项旧暂缓与3项缺失对侧。新增左划船、左扶架后踢、右前腿分腿蹲、前伸臂卷腹4段Sequence，单侧背阔拉伸与靠墙外旋等长左右静态；12张新选用原生1254px姿势帧。22次生成，逐帧对位/失败/循环和参考记录保留。
- 侧卧哑铃外旋两轮后仍有上臂/旋转轴问题，停止，不导出失败动画。靠墙肩外旋等长是独立ritmo:alternative:wall-external-rotation-isometric候选，10秒/侧默认待确认，不冒充原站姿哑铃动态外旋或临床处方。
- 肩绕环→已验收胸前开合、站姿4字→已验收双膝抱胸、腹部转体→已验收无转体俯卧伸展均为新替代选择待确认；双臂划船旧最佳版只做有限复核、待视觉确认，不自动正式放行。原始风险与professional待审状态保持独立。
- 50条原始关联完整；原相扑的已选杯式替代与腿部第1项重复，隔离候选合并为49项，不叠加8组。动作ID与明确mediaReuseId区分，不能把力量交替弯举改成热身ID；每侧力量与多组热身仍需独立执行器接入方案。
- 已验收104文件哈希未变，正式src/public与线上不变。六视频媒体候选齐备不等于全部技术通过或正式推荐已更新；另外28项常用/推荐旧缺口单列，不宣称103项总库/1324扩展库全部完成。等待本轮集中视觉验收，不自动接入。

### 2026-10-30 补齐候选第一次反馈
- 设计师明确通过closure的01、03、04、05、07、08、09；10经当前目录/历史接入记录/ACE Cobra核对，为无转体静态保持拉伸20秒（RITMO默认），满足用户条件后归档通过，不生成反复撑起动画。8项通过与31个相关媒体/帧文件锁定在closure/designer-acceptance.json，专业动作审校仍独立待审。
- 02旧补左侧被反馈为两边同一侧，撤回其侧别通过结论。revision-feedback-1保留原右侧，独立生成朝画面左方、正面偏左机位的左手持铃/右手扶架A/B；不做像素镜像，2次生成，直接Sequence。场景接触点稳定，肘位轻微变化仍列风险，等待该新左侧视觉复核。
- 06靠墙外旋本次未提及，保持待验收，不因其他动作通过而自动放行。50条最佳媒体副本/六配方/103台账同步最新02映射与验收状态；旧失败图片视频保留，正式src/public、动作目录、Session/NEXT与线上不变。原生产build-delivery脚本在存在新验收记录时禁止重跑覆盖。

### 2026-10-30 修正页两项明确通过及剩余数量
- 设计师确认revision-feedback-1页面的02新左侧后踢与10无转体静态腹部伸展通过；本批现9/10项视觉通过，只剩06靠墙肩外旋等长激活未确认，不把“两个动作”扩展解释为06也通过。新增验收锁定见revision-feedback-1/designer-acceptance.json，旧拒收版本仍保留；禁止重跑该生产脚本覆盖已确认结果。
- remaining-work.json按实际文件复核：六视频50条原始关联/49项合并后候选，媒体已有候选或替代，剩1项视觉确认；常用/推荐另28项旧缺口，25项有旧MP4待复核/修复，3项尚无合格完整MP4（杠铃平板卧推、站姿哑铃肩推、站姿单臂哑铃过顶臂屈伸）。不将28项全算作重新生成，也不将技术审校/正式接入/1324扩展库混入该数量。专业审校、训练参数与正式接入独立保留，未自动开始下一批或部署。

### 2026-10-30 靠墙外旋撤出与28项逐项审阅
- 设计师认为靠墙肩外旋等长激活目标不直观，明确要求另找替代；该项从待验收改为不采用/待替代，非人体姿势错误结论。原目标是肩袖激活，不是拉伸。AAOS弹力带贴肘外旋作为首选建议（须轻阻力带与可靠固定点）；已有坐姿反向飞鸟仅是上背/后肩热身备选，不冒充等价外旋。尚未选择、生成或接入。
- 纠正上一条“25项旧MP4”：实际21MP4、1个5帧APNG（hasan:1459）、3项仅关键帧（hasan:0258/1329/0091）；另原3项缺合格完整视频（hasan:0025/0426/0430），28项中至少6项缺合格完整动态版本。remaining-review-2026-10-30保留实际文件、25＋3清单及历史备注。
- 历史问题是复核线索，不自动认定当前修正版仍有同一错误；hasan:0381视觉已通过，不重做，仅技术待核。hasan:0599坐姿腿弯举旧备注的配重方向需按真实机型核对，不盲目照搬“伸腿抬升”说法。已验收媒体哈希不变，专业审校/参数/正式接入独立保留。本轮仅盘点与建议，不生产、不改src/public或线上。

### 2026-10-30 常用/推荐25项最新反馈修订
- 设计师明确通过原编号02–11、17、21、25共13项，文件哈希锁定于remaining-revision-2026-10-30/designer-acceptance.json；不得重新生成。另明确选择原缺视频3项的替代：hasan:0025→hasan:0289、hasan:0426→press、hasan:0430→hasan:2188。仅归档选择，不改原ID、历史或正式映射。靠墙外旋替代仍未选择。
- 本轮12项定向修订，37次原生1254px图片调用，9段720px静音关键帧Sequence待视觉验收；13/14补动态，01/15/18/20/22/24正面、23纯侧面等独立保存。22保持胸托杠杆式肩宽正握，不能用窄握绳索替换同ID；正面仍有轻微铰链透视/足踏外缘差异，需重点审阅。15伸肘终点、18背垫机构、23躯干略回直等风险不因换视角而抹除。
- 12交替转体俯卧撑支撑点与原动作时序、16坐姿腿弯举踝辊接触、19器械侧平举固定立柱与连杆均在两轮定向修正后止损，不导出合格Sequence。保留全部失败、原生及357px叠图，不以普通俯卧撑/T式或哑铃侧平举冒充原动作媒体。
- 已通过13项47个相关文件与正式src/public哈希保持不变；本批只隔离审阅，未部署、未改动作目录或Session/NEXT。9段候选不等于专业签核或最终通过，待设计师集中验收；不得自动继续下一批。

### 2026-10-30 侧视器械反馈与既有替代选择
- 最新明确通过原01高位下拉、14坐姿杠铃肩推、20杠铃前蹲、23直臂下压、24史密斯深蹲；30个展示相关文件锁定于remaining-side-revision-2026-10-30/designer-acceptance.json，不再生成。
- 用户要求13全程掌心向上，选择既有hasan:2327反握俯身哑铃划船，不能将固定反握冒用hasan:1329旋转握法ID。原目录确实包含旋转说明，历史规格与失败记录均保留。
- 本轮10次1254px图像调用，15恢复原侧面姿势并遮住配重，18纯侧面简化机构，导出2段720px关键帧Sequence待视觉验收。18经过两轮固定轴修正；隐藏机构仍不可视为真实机型或专业签核。
- 22纯侧面两轮后仍机壳向左扩宽，止损，不导出合格视频。封闭机构只减少暴露，不证明力学；分层贴回原壳会截断把手、需重造连接件，本轮不使用此救援。失败帧/对位保留。
- 用户授权剩余3项优先已有替代，本轮候选改选：hasan:0258→hasan:3211跪姿俯卧撑（取消转体、难度不同）；hasan:0599→hasan:1459哑铃RDL（只覆盖后侧链目标，不等价屈膝专项）；hasan:0584→raise站姿哑铃侧平举（保持力量参数，不转为热身）。RDL原5帧APNG按原时长转换MP4，未重新生成或覆盖源文件。
- 本轮103项候选台账副本记录改选，原ID和历史不物理删除；同方案已有目标动作时不得自动重复叠组。正式src/public、Session/NEXT和线上不改；专业动作审校独立待审。本地4209恢复，等待本批集中验收，不继续生成或自动接入。

### 2026-10-30 两批动作库最终验收与统计
- 最新确认side-revision的13/15/18修订及12/16/19替代均通过；row按指令从当前候选/审阅列表去除，失败资产及原数据库ID保留。验收锁定与原快照在final-statistics-2026-10-30，不重新生成或自动接入。
- 首次库原51项：42项原动作视频视觉/个人版已通过，7个原位置使用已确认替代，合计覆盖49个原位置；去重为46个选用动作ID、47个视频路径（含单臂划船两侧）。row移除后候选50位置，smith仍有技术疑问1项。正式个人版仍20个力量视频映射，不能把视觉通过数量写成已上线。
- 六视频50条原始关联，杯式替代与本计划第1项合并后49位置；48位置媒体已通过=36动态位置+12静态位置。背部热身肘贴身外旋的替代仍缺1项，靠墙等长已拒收，弹力带仅建议未选择/制作。其余五个替代原位置均已确认，差异/默认参数/专业待审保留。两批有交集，不相加；不包括1324扩展条目。
- 91个所选媒体路径实际解码/显示检查通过。正式src/public、Session/NEXT和线上不变。完整六视频配方接入与参数确认仍未完成，不将媒体齐备等同原视频逐项完全复刻或完整执行器已接入。

### 2026-10-30 Smith候选暂时移除与背面哑铃外旋观察
- 用户暂时移除首次库Smith卧推，连同row现保留49个原位置，已选原/替代媒体覆盖49，去重46种动作47文件；原ID/历史和正式映射保留。统计更新在back-view-external-rotation-2026-10-30，旧final-statistics快照仅增加跳转告知。
- 用户指定背对镜头站姿肘贴身双哑铃外旋，制作完整场景A及分别由A生成B/C，3次1254px调用、0轮修正、4秒直接关键帧Sequence。原生/357px对位与循环解码检查保留。仅为姿势视觉候选，待设计师验收。
- 外旋轴是肩关节绕上臂纵轴，肘只保持位置与约90度弯曲；哑铃竖直重力并不有效抵抗水平外旋。背面换视角不消除既有技术疑问，六视频仍48/49通过，不自动放行、接入或标记专业通过。AAOS站姿弹力带外旋作为技术对照。

### 2026-10-31 两批已验收媒体与居家六视频模板发布
- 用户确认背面外旋视觉通过并授权所有已选素材接入个人Web App；健身房保留原两张推荐卡，Smith→hasan:0289平板哑铃卧推、row→hasan:0861坐姿绳索划船，仅推荐副本替换，不改用户方案/稳定ID/历史。
- 家里采用六视频原顺序与已选替代，49原位置（37动态/12静态），重复杯式合并。四个单侧力量动作采用独立父ID:left/right变式各自手动START，30力量入口＋23阶段位置；不将静态侧支撑强行计次。
- src/data/personalTrainingLibrary.json与personalTrainingLibrary.ts集中92个已选媒体映射（71MP4/21静态文件）；新复制58文件约7.65MB，其余直接复用，不覆盖旧媒体。不是1324扩展库全补齐。
- Plan.phaseItems与ActiveWorkout.phaseItems为可选快照，旧数据缺失沿用原肌群匹配；新模板默认值与原剂量独立。多组热身使用segmentsPerSet/sets和连续whole段，仍单一执行器，无额外321。居家所需哑铃/凳/牢固支撑明示，模板显式允许该器械组合，不扩大普通Extended的无器械居家判断。
- 外旋按轻负荷肩关节活动保留，重力与水平外旋阻力疑问不消除，不作为专业或有效肩袖抗阻签核；全部专业审校、原默认参数确认和低位斜举风险保留。
- 回归证据在reports/ritmo-video-library-integration-2026-10-30：17项检查、28受保护运行时、类型/构建通过；实际partial不推进NEXT，完成只推进一次且刷新不重复；4216隔离数据，不覆盖真实存储。iPhone真机待验收。
- 已经Sites owner-only同域发布，源码de7d68d466dd0c7ba43ea1091aaafd98f806271b；上一40版保留。发布包不含reports/tests/隔离数据，完整部署ID见deployment.json。

### 2026-10-31 个人使用收尾微调
- 推荐首页说明改为“选择一套推荐训练直接开始”，紧接品牌绿“或自由搭配”；不改推荐/开屏/PLAY业务。新建方案采用参考的训练动作计数、空态SVG插画、添加动作、可展开热身与拉伸及固定底部保存布局；编辑已有方案仍保留三阶段分组、拖拽与左滑。
- 所有可编辑方案/新推荐/新训练的负重动作缺省重量为2.5kg，标记RITMO默认；已有非零重量保留，徒手不补重量。用户明确确认执行参数行只显示次数/时间，省略“徒手”；动作名称与目录器械说明不删除。旧Session与进行中快照不追溯改重。
- 热身/拉伸同动作多组之间固定休息30秒；组内左右换侧仍5秒。phase-rest沿原单一执行器/快照计时，暂停/刷新冻结剩余时间，不新增自动321。阶段暂停只保留继续、跳过当前、跳过整个阶段、结束训练；删除提前完成入口，旧early_completed历史仍兼容。
- 力量暂停包含调整参数、跳过当前、结束训练。跳过不确认当前未完成组；保存已完成组为partial，不推进NEXT，可选skipped字段保留原因。末组无下一组时允许修改尚未完成的当前组；之前已确认组/历史不回写。
- Toast共享左右36px边距。训练节奏两行去重复副说明，只留标题、数值和步进操作。记录引线点从拉伸SVG圆改为独立8×8px正圆，轻微扩散光，减少动态效果时静止。
- 管理环境改为贴底、内边距20px的共享暗色弹层：现有健身房/家里可进入器械编辑，自定义环境再编辑名称与器械。可选environmentEquipment字段不改旧数据；配置只影响后续可用性判断/筛选，保留旧扩展动作的居家器械限制、现有Session/NEXT和中断快照。自定义改名不改历史训练环境名称。
- 本轮4217为独立合成数据回归，4216用户预览数据及线上未重置。22项检查与三视口证据在reports/ritmo-final-polish-2026-10-31；本轮仅本地预览，尚未发布线上，iPhone真机待验收。

### 2026-10-31 收尾视觉确认与线上发布
- 最新首页说明保留“选择一套推荐训练直接开始，或自由搭配”中“或”前的逗号，不恢复“推荐训练”与“直接开始”中间的逗号。
- 方案页两处推荐Carousel按真实力量动作主要肌群复用首页muscle-v2图片，叠加暗遮色保证文字可读，不重新生成资产或修改推荐数据。
- 空方案去除训练动作/0个动作、热身拉伸展开区与分割线。用户提供“健身房.svg”仅提取原3条路径、改白色作占位图；主添加按钮放卡片内，标“＋添加训练动作”，保留自动安排说明。添加一个及以上动作后恢复标准热身/力量/拉伸分组及原手势；不创建第二个编辑器。
- 训练控制的跳过当前、跳过阶段、结束训练统一16px/22px、500字重与浅色文字。前两者使用相同灰色圆角按钮，结束保持透明文字入口。继续文字及结束确认沿同一字号；不改变回调、确认、Session/partial/NEXT。节奏设置两标题居中。
- 用户授权本轮完成后将所有已确认微调发布到原owner-only Web App，包含上一轮ea97215。保留原域名/访问范围/版本历史，不部署reports或合成fixture，不清空个人数据。真实iPhone待用户验收。

### 2026-10-31 空方案卡片与外侧入口统一
- 设计师最新要求覆盖先前白色哑铃SVG与卡内荧光按钮：空方案用上方荧光绿圆圈加号、下方“添加训练动作”、原自动安排说明，移除哑铃图标及横向绿色按钮。
- 内外两处共用PlanCreationCard及统一154px高度、20px内边距、24px圆角、32px加号、18px标题/12px说明的规则；只有文案和入口回调不同。已有动作后的三阶段编辑、保存、手势和全部训练数据不变。旧SVG文件作为历史资产保留，不再引用。

### 2026-10-31 方案卡片层次与NEXT首位队列
- 设计师要求方案页推荐图片叠在共享深灰卡片底色上，避免近黑原图与页面融为一体。两处推荐轨道共用主卡片底色、42%照片透明度与同底色渐变遮罩；图片映射/动作数据不变。空方案添加卡片改用共享页面近黑色，与炭灰弹层区分；加号、标题、说明和原间距保留。
- 训练循环显示顺序从已有NEXT游标起循环排列，NEXT始终标于首项；正常完成继续沿原规则只推进一次，显示随游标滚动，不迁移旧Session或清零旧游标。手动拖拽/键盘排序采用当前可见顺序，排序后的首项明确成为NEXT；覆盖旧“调序后NEXT保持不变”的决定。只更新当前环境，不改变其他环境、方案动作、partial或训练历史。
- 循环卡片height:auto/min-height:0，内容决定高度；最后一项关闭后不显示空卡片。保留原开关加入/移出、指针取消与手势，禁止重新加回326px最小高度。

### 2026-10-31 首页完整方案浏览统一三阶段
- 首页“还有N个动作”展开层不再使用无左右内边距的纯力量列表。改用方案详情相同的92%共享弹层、20px侧边距、标题节奏、圆角分组卡片、阶段图标与参数行，标题为真实方案名称，内容按热身→力量训练→拉伸展示。
- 热身与拉伸复用SystemPhaseRows和phasesForPlan：有明确六视频快照则使用快照，否则沿原肌群匹配；不以标题猜动作，不更改顺序、目标或侧别。首页外部仍只预览原有力量动作及其数量，阶段动作不混入四项截断或“还有N个”计数。
- 该层只读，不提供参数编辑、加删、拖拽、保存或新的START；不复用可编辑draft来实现浏览。Session/NEXT、训练启动和原方案详情编辑行为保持不变。此次替代早期“完整列表只显示力量”的展示限定。

### 2026-10-31 导航参考图材质与单套图标
- 设计师最新指定参考图中的柔光外边缘、深绿渐变选中胶囊和图标语言；维持现有276×62px导航、约88.7×52px点击区、30px图标盒/11px文字、安全区与既有切换时序，不随参考图放大导航。
- 用户明确允许依参考制作SVG：训练为圆角跑步人，方案采用参考图下排清单勾选，记录为开放圆弧＋三条圆头柱。public/icons/nav/ritmo-*.svg每Tab只有一个轮廓，选中与未选中共享同一文件，仅字体/图标颜色与选中背景变化；替代原填充/描边两套切换规则，旧文件保留不覆盖。
- 选中沿品牌荧光绿，未选中纯白；胶囊深绿渐变与连续细描边/内柔光，外壳沿连续低强调渐变描边及轻外光。静态材质不新增持续光效动画，保持原后台/减少动态效果处理与三页业务不变。

### 2026-10-31 导航上排原图轮廓与贴边修订
- 用户明确改选上排靶心箭头，不再用清单图标。三枚图标从最新2048×426原图分别裁切、阈值轮廓提取并做SVG曲线拟合，禁止重新找近似图标替代。public/icons/nav/reference-v2保留独立路径资源及原图/遮罩/叠加证据；每Tab仍只使用单一SVG，状态仅变色与背景。记录外弧和3条竖柱为4个独立轮廓，保留参考图中的空隙。
- 276×62px外壳、30px图标盒、11px标签及底部位置不变。选中块改为全高62px并覆盖至外壳边缘，首项左边/末项右边贴边；去除原4px水平内缩使图标中心对应等宽选中块，透明点击高度仍52px且宽度略增。不可重新加回选中块上下4px内缩。
- 选中块不再叠加纯色实线border；单独用masked渐变描边，从明亮荧光绿经低透明暗段连续过渡。原三页功能、训练、Session/partial/NEXT与动效时序不变。
- 修正贴边后的描边裁切：导航壳不得使用overflow:hidden裁到padding边界，否则全高选中块上下1px描边会被裁掉。壳改overflow:visible，圆角仍由壳/选中块自身绘制；不缩小选中块或增加上下内缩来掩盖问题，保留276×62px与贴边位置。

### 2026-10-31 导航切换动效三案待选
- 用户要求先比较几个切换动效。reports/ritmo-nav-motion-options-2026-10-31 独立提供A平滑滑动300ms、B轻微弹簧惯性、C柔性延展380ms；全部沿用已确认图标/材质/276×62尺寸，静止时贴边不变。
- 真实App复用只在该隔离入口加载，localStorage先替换为内存模拟数据，不读取或覆盖个人方案/Session。比较器提供自动/快速切换、半速、减少动态效果及三种视口。暂未选择任何方案，不得将研究用克隆导航、存储影子或控制栏接入正式应用或自动发布。

### 2026-10-31 方案B导航动效正式采用
- 设计师选择B轻微回弹，授权正式采用并沿用现有个人在线测试版。NavigationMotionProvider只保存视觉位置/速度，在原三页AppNav切换挂载时延续运动；不提升或重写训练状态，不复制隔离导航/存储影子/控制栏。
- spring沿B原型ω22、阻尼比.82、端点约束，按真实导航宽度计算等分位移；快速换向保留当前速度。单选中块、原276×62尺寸、图标/材质/贴边和52px点击高度不变。内容160ms、4px轻微入场；减少动态效果立即落位，后台/隐藏与无导航的训练页面停止帧，普通训练/暂停/开屏逻辑不改。

### 2026-10-31 MVP正式定稿基线
- 设计师确认当前最新线上结果为RITMO V1.8 MVP。以reports/ritmo-mvp-2026-10-31/release.json和Git标签ritmo-mvp-v1.8-20261031为后续迭代、比较与回退基线；线上源码c81780afc656a15cdda22e5b6c2c39f60210a1f3，本地功能提交391b0b0。
- 保留当前已确认功能、视觉、B导航动效和访问范围。后续修改作为MVP之后的独立变更，未经新需求不自动继续探索或重做。此次定稿只归档，不重发包或修改个人数据；专业动作审校与原风险台账继续独立保留。

### 2026-10-31 网页 App 图标参考定稿
- 设计师指定最新1254×1254荧光开环、独立圆点与白色RITMO字样参考作为网页App图标。直接使用原图等比导出，保持原字形、配色、外形和高光，不重新生成或用相似字体替代。原图及1024px母版在reports/ritmo-app-icon-2026-10-31。
- public/icons/ritmo-reference-20261031-*为版本化180/192/512/32px PNG，分别供Apple主屏幕、Manifest与favicon；旧图标保留。Manifest的id、start_url、scope及现有站点访问范围不变。此图标资产独立于已锁定C方案页面Logo/开屏，不修改它们。
- iPhone已安装图标缓存须真机确认；不要为换图标清空网站数据、修改存储键或要求重新导入训练记录。

### 2026-10-31 App 图标外框纠正
- 设计师明确指出原图的圆角展示外框不属于图标，须移除外框、其外沿高光与地面倒影；只保留荧光渐变开环、圆点和白色RITMO字样，铺满近黑底。此项覆盖上一条“直接整张原图导出”的做法。
- rimless-v2保留一次内置图像编辑结果、前后预览及记录。正式引用public/icons/ritmo-rimless-20261031-*；旧含框图片仅作历史保留。系统负责主屏幕圆角，不在素材中再画圆角卡片。页面C Logo及训练/存储不变。

### 2026-11-03 App 图标间距与字标优化
- 设计师要求图形离底部字标更远、字标稍大。基于rimless-v2单次图像编辑：开环及圆点稍上移，RITMO文字约放大18%，增大竖向留白。保持原荧光渐变、开环/圆点和字形方向，不恢复展示外框，不改页面C Logo或开屏。
- 新母版与前后/小尺寸预览在reports/ritmo-app-icon-2026-11-03，public/icons/ritmo-spacing-20261103-*供本地图标引用；旧资产不覆盖，Manifest id/start_url/scope及数据存储不改。本轮尚未获新线上发布指令，不部署，真机图标缓存待确认。
