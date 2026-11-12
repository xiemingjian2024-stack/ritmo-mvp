# RITMO · 项目介绍与体验

[**打开在线 Demo**](https://ritmo-portfolio-demo.xiemingjian2024.chatgpt.site/) · [电脑／手机体验与安装说明](docs/DEMO.md) · [下载源码与本地运行](docs/DEVELOPMENT.md)

电脑直接使用浏览器打开。iPhone 用 Safari 打开 → 分享 → 添加到主屏幕，即可作为独立网页 App 使用。

源码仓库保持私有；公开 Demo 使用独立演示数据，不读取或改写个人训练记录。

以下为作品集 `/project/ai-ritmo` 的完整介绍、原图和原录屏，按原页面顺序搬运。GitHub 不执行原页面的 React/CSS 交互，因此动态示意附原页面截图，录屏点击预览图播放或下载。

---

# RITMO

RITMO 是一款个人力量训练 App，可以按家里或健身房的器械安排训练，跟着动作示范完成热身、力量和拉伸，再回看自己的训练记录。

| 品牌 | 状态 | 角色 | 范围 |
| --- | --- | --- | --- |
| 个人项目 | 已上传 · [GitHub](https://github.com/xiemingjian2024-stack/ritmo-mvp) | 全流程 | 品牌、界面、开发 |

![原作品集项目封面](docs/portfolio/captures/00-cover.png)

刚好那段时间我在健身，练着练着，就发现有些地方用起来不太顺手。我想，不如借助 AI，给自己做一个训练 App，也试试能不能把自己的设计想法真正用起来。

<p>
<img src="docs/portfolio/assets/brand/phone-mockup-spaced.png" width="460" alt="使用真实主屏幕截图制作的 RITMO 手机样机展示" />
<img src="docs/portfolio/assets/brand/app-icon/user-icon-v2.png" width="220" alt="RITMO 应用图标" />
</p>

<img src="docs/portfolio/assets/brand/logo/logo-c-precise-dark.svg" width="360" alt="RITMO" />

---

训练时，我常常要确认动作怎么做、眼前的器械够不够用，还得停下来翻手机。设计目标不是提供更多训练功能，而是降低完成一次训练所需的判断与操作。

| 动作不熟悉 | 器械随场地变化 | 操作打断节奏 |
| --- | --- | --- |
| ![动作不熟悉的训练情境示意](docs/portfolio/assets/discover/scene-complex.png) | ![器械随场地变化的训练情境示意](docs/portfolio/assets/discover/scene-equipment.png) | ![操作打断节奏的训练情境示意](docs/portfolio/assets/discover/scene-phone-v2.png) |

### 同类产品比较

| 产品 | 训练计划配置 | 环境适配 | 动作教学 | 训练中操作 | 训练历史反馈 | 优缺点与需求适配 |
| --- | --- | --- | --- | --- | --- | --- |
| <img src="docs/portfolio/assets/competitors/hevy.ico" width="28" alt="" /> Hevy | 创建训练方案、文件夹，复用动作与组数 | 动作库按器械查找，支持自定义动作 | 动作库提供示范与指导 | 记录组数、重量，提供自动休息计时 | 动作表现、肌群分布与月度报告 | 记录与复用清晰；仍需自行编排，部分满足少做判断的需求。 |
| <img src="docs/portfolio/assets/competitors/fitbod.jpg" width="28" alt="" /> Fitbod | 根据目标、经验、时长与历史生成训练 | 以可用器械和个人设置约束推荐 | How To 提供步骤、视频与目标肌群 | 可调整组数、次数与重量 | 训练历史进入后续推荐，提供表现记录 | 器械适配与推荐较完整；需先配置条件，适合借助推荐训练。 |
| <img src="docs/portfolio/assets/brand/app-icon/user-icon-v2.png" width="28" alt="" /> RITMO | 保留推荐、自定义与自由训练，按轮次执行 | 家里／健身房分别保留器械与方案 | 常用动作匹配自制媒体，专业审校仍待完成 | 组间自动衔接，换动作手动开始，可暂停调整 | 历史成果与最近训练时间的肌群可视化 | 更贴合我的场地与训练节奏；动作覆盖和专业审校仍需完善。 |

## 让训练跟着我的生活走

我有时在家练，有时去健身房。在家手边只有几样器械，到了健身房又有别的选择，同一套动作不一定都做得了。我想打开 App 就知道今天在这里能练什么，少花点时间临时改计划。

### 切换场地，推荐跟着可用器械调整。

![原页面场地切换示意](docs/portfolio/captures/02-environment.png)

居家／健身房 · 哑铃 · 训练凳 · 训练垫

上斜哑铃卧推 · 平板哑铃飞鸟

### 漏练一天，后续顺延，下次接着练。

![原页面训练循环示意](docs/portfolio/captures/03-cycle.png)

### 选好力量动作，自动补齐热身和拉伸。

![原页面阶段匹配示意](docs/portfolio/captures/04-phases.png)

热身：徒手站姿胸前开合 → 力量训练：史密斯卧推 → 拉伸：站姿徒手胸部伸展

## 用户体验框架

[![用户体验框架录屏预览](docs/portfolio/captures/video-ux-framework.png)](docs/portfolio/assets/strategy/ux-framework.mp4)

[播放原作品集「用户体验框架」录屏](docs/portfolio/assets/strategy/ux-framework.mp4)

## 动作素材库从哪里来？

一开始我想找一套现成的动作示范，省下逐个制作的时间。后来我也试着用 3D 和 AI 序列帧来做，想看看哪种方式能把动作讲清楚，又方便以后继续加新动作。

### 开源动作数据与媒体

<p>
<img src="docs/portfolio/assets/experiment/source-example-1.gif" width="220" alt="用户提供的动作示范素材 1" />
<img src="docs/portfolio/assets/experiment/source-example-2.gif" width="220" alt="用户提供的动作示范素材 2" />
<img src="docs/portfolio/assets/experiment/source-example-3.gif" width="220" alt="用户提供的动作示范素材 3" />
<img src="docs/portfolio/assets/experiment/source-example-4.gif" width="220" alt="用户提供的动作示范素材 4" />
</p>

### 3D 表现探索

<p>
<img src="docs/portfolio/assets/experiment/squat-realistic-3d-concept.png" width="300" alt="历史写实3D视觉概念样本" />
<img src="docs/portfolio/assets/experiment/squat-simplified-3d-concept.png" width="300" alt="历史简化3D视觉概念样本" />
<img src="docs/portfolio/assets/experiment/handdrawn-study.png" width="300" alt="手绘动作方向" />
<img src="docs/portfolio/assets/experiment/anatomy-study.png" width="300" alt="解剖图动作方向" />
</p>

### AI 序列帧方案

<p>
<img src="docs/portfolio/assets/experiment/00-start.png" width="220" alt="早期弯举试产关键姿势1" />
<img src="docs/portfolio/assets/experiment/01-mid.png" width="220" alt="早期弯举试产关键姿势2" />
<img src="docs/portfolio/assets/experiment/02-top.png" width="220" alt="早期弯举试产关键姿势3" />
<img src="docs/portfolio/assets/experiment/keyframe-loop.gif" width="220" alt="三张关键帧合成的循环动画" />
</p>

## 数据管线

从核对来源到匹配动作示范，把训练会用到的信息整理到每一个动作里。

![原页面数据管线](docs/portfolio/captures/05-pipeline.png)

| Raw Data | Cross-check | Normalization | Exercise Schema | Media Mapping | Training |
| --- | --- | --- | --- | --- | --- |
| 汇集原始资料 | 核对动作与器械 | 统一命名与格式 | 定义动作字段 | 关联动作示范 | 接入训练流程 |

原页面的三个动作实例：

| 参数 | 站姿交替哑铃弯举 | 坐姿哑铃推举 | 高脚杯深蹲 |
| --- | --- | --- | --- |
| 目标肌群 | 肱二头肌 | 三角肌前束、三角肌中束 | 股四头肌、臀大肌 |
| 所需器械 | 哑铃 | 哑铃＋靠背凳 | 一只哑铃 |
| 训练配置 | 3 组 × 12 次 | 4 组 × 10 次 | 4 组 × 10 次 |
| 组间休息 | 90 秒 | 90 秒 | 90 秒 |
| 默认重量 | 2.5 kg × 2 | 2.5 kg × 2 | 2.5 kg |
| 动作时长 | 4 秒 / 次 | 4 秒 / 次 | 4 秒 / 次 |
| 示范时长 | 2.88 秒 / 循环 | 3.04 秒 / 循环 | 2.67 秒 / 循环 |
| 示范帧数 | 69 帧 · 24 fps | 73 帧 · 24 fps | 64 帧 · 24 fps |
| 循环演示 | [播放原视频](docs/portfolio/assets/experiment/alternating-curl.mp4) | [播放原视频](docs/portfolio/assets/experiment/press.mp4) | [播放原视频](docs/portfolio/assets/experiment/goblet-squat.mp4) |

[![站姿交替哑铃弯举循环演示](docs/portfolio/captures/video-alternating-curl.jpg)](docs/portfolio/assets/experiment/alternating-curl.mp4)

## 体验

我想让一次训练从开始到回看都更顺手。开练前有时间放好手机、拿稳器械，练的时候能看动作示范和进度，组间休息结束后就接着练。练完再看看肌群图，知道上次练了哪里、离现在有多久。

### 开练先准备

![原页面开练准备示意](docs/portfolio/captures/06-prepare.png)

### 组间自动接

![原页面动作示范与组间休息](docs/portfolio/captures/07-rest.png)

[播放原动作循环示范](docs/portfolio/assets/experiment/alternating-curl.mp4)

### 练后看记录

[![肌群训练总览原录屏预览](docs/portfolio/captures/video-muscle-recording.jpg)](docs/portfolio/assets/brand/muscle-recording.mp4)

[播放原肌群训练总览录屏，展示正背面和不同肌群的训练时间](docs/portfolio/assets/brand/muscle-recording.mp4)

## RITMO｜找到属于你的训练节奏

![原页面圆形视觉语言](docs/portfolio/captures/08-brand-rings.png)

开始训练 → 3、2、1 倒数 → 训练中计次 → 暂停后继续

RITMO 意为「节奏」。我想到的是每次动作里的发力、控制和呼吸，也是一组练完，歇一会儿，再接着练的节奏。我希望 App 能把这些环节接得顺一点，让我少看几次手机，把注意力留给动作。每个人练得快慢不同，训练和恢复的安排也不一样。对我来说，找到自己的节奏，就是找到一种愿意一练再练的方式。

[![从字标的 O 到训练里的圆](docs/portfolio/captures/video-brand-recording.jpg)](docs/portfolio/assets/brand/brand-recording.mp4)

[从字标的 O 到训练里的圆 · 播放原录屏](docs/portfolio/assets/brand/brand-recording.mp4)

## 设计目标

从打开 App 到练完一组，尽量少做临时判断，把注意力留给训练。

### 表现层 · 统一视觉

从字标的 O 到训练圆环，用同一套形状和荧光绿串起开始、倒数、计次和继续，让每个状态都容易认出来。

<img src="docs/portfolio/assets/brand/design-goals-decoration.png" width="380" alt="原作品集设计目标配图" />

### 业务逻辑层 · 简化训练安排

把场地、器械和训练方案的关系理顺。切换场地时，推荐跟着可用器械调整；选好力量动作后，自动补上对应的热身和拉伸。

### 交互层 · 减少操作

让休息和下一组自动衔接。换动作时留出准备时间，训练中点圆环就能暂停，按需要调整重量、次数或休息。

## 情绪板

用于灵感收集、制定设计基调、辅助决策

| 专注 FOCUS | 节奏 RHYTHM | 掌控 CONTROL |
| --- | --- | --- |
| ![专注 FOCUS](docs/portfolio/assets/brand/moodboard/focus.jpg) | ![节奏 RHYTHM](docs/portfolio/assets/brand/moodboard/rhythm.jpg) | ![掌控 CONTROL](docs/portfolio/assets/brand/moodboard/control.jpg) |

## 从 AI 协作到真实使用

在 RITMO 的开发过程中，我将 AI 作为跨越设计与实现之间距离的协作工具。通过持续提出需求、比较方案、制定实现约束和验收结果，我能够在没有完整开发团队的条件下，将产品想法逐步推进为可使用的应用。

### 提出问题、明确需求和约束

![问题、需求与约束三个相互关联的圆形](docs/portfolio/assets/process/problem-needs-constraints.png)

### 使用 Talk 和 Work 两个对话协作推进。

![我负责设计与决策，Talk 负责讨论分析，Work 负责执行构建，共同推进可使用的产品](docs/portfolio/assets/process/talk-work-collaboration.png)

### 分析讨论并生成对应的训练流程。

![训练流程探索图，包含新手和有基础的路径、训练环境、训练方案与训练记录](docs/portfolio/assets/process/training-flow-v2.png)

### 结合我的需求和界面参考，生成界面初稿。

[![AI 生成的 RITMO 初稿，包含训练首页、方案、记录、执行与休息等界面](docs/portfolio/assets/process/ai-interface.jpg)](docs/portfolio/assets/process/ai-interface.jpg)

### 用 Figma Bridge 在 AI 与 Figma 之间传递设计。

[![Figma Bridge 深色界面示意，支持导入原生图层和导出 Design JSON 或 PNG](docs/portfolio/assets/process/figma-bridge-dark.svg)](docs/portfolio/assets/process/figma-bridge.png)

### 用 AI 生成统一风格的人物和动作素材。

[![AI 生成的训练素材合集，包含人物局部特写和多种训练动作示范](docs/portfolio/assets/process/ai-media.png)](docs/portfolio/assets/process/ai-media.png)

### 借助 AI 完成实现，让应用在手机上用起来。

![手机主屏幕上的 RITMO 应用图标](docs/portfolio/assets/brand/phone-mockup-spaced.png)

## 设计展示

[![色彩与按钮规范](docs/portfolio/assets/visual/design/1.png)](docs/portfolio/assets/visual/design/1.png)

[![字体、图标与底部导航规范](docs/portfolio/assets/visual/design/2.png)](docs/portfolio/assets/visual/design/2.png)

[![训练、方案和记录界面](docs/portfolio/assets/visual/design/3.png)](docs/portfolio/assets/visual/design/3.png)

[![首页与推荐训练方案](docs/portfolio/assets/visual/design/4.png)](docs/portfolio/assets/visual/design/4.png)

[![力量训练与暂停界面](docs/portfolio/assets/visual/design/5.png)](docs/portfolio/assets/visual/design/5.png)

[![创建方案和添加动作](docs/portfolio/assets/visual/design/6.png)](docs/portfolio/assets/visual/design/6.png)

[![真实界面合集](docs/portfolio/assets/visual/design/7.png)](docs/portfolio/assets/visual/design/7.png)

[![RITMO 品牌与手机展示](docs/portfolio/assets/visual/design/8.png)](docs/portfolio/assets/visual/design/8.png)

[![RITMO 真机使用录屏](docs/portfolio/captures/video-final-screen.jpg)](docs/portfolio/assets/visual/design/final-screen.mp4)

[播放原作品集最后一张展示中的真机使用录屏](docs/portfolio/assets/visual/design/final-screen.mp4)

---

[素材与搬运记录](docs/portfolio/README.md) · [版本与数据说明](docs/RELEASE.md)
