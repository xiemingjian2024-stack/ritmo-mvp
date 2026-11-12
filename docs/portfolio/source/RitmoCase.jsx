import OptimizedImage from '../../components/OptimizedImage.jsx';
import { useEffect, useState } from 'react';
import { assetPath } from '../../assetPath.js';
import './ritmo.css';
const base = '/assets/ritmo/';
const src = (path) => assetPath(base + path);
function Shot({ name, caption }) {
  return <figure className="ritmo-shot"><OptimizedImage loading="lazy" src={src(`screens/${name}-393.png`)} alt={caption} /><figcaption>{caption}</figcaption></figure>;
}
function Heading({ title, children, sub = false }) {
  const Title = sub ? "h3" : "h2";
  return <header className="case-section-heading ritmo-heading"><Title className="case-section-heading__title">{title}</Title><p className="ritmo-heading-description">{children}</p></header>;
}
function Film({ name, label }) {
  return <figure className="ritmo-film"><video controls playsInline preload="none" aria-label={label} poster={src(name === '01-logo-to-play' ? 'screens/01-brand-opening-393.png' : 'screens/02-home-today-393.png')}><source src={src(`motion/${name}.mp4`)} type="video/mp4" /></video><figcaption>{label} · 网页演示采集，非真机流畅度展示</figcaption></figure>;
}
export function RitmoCover() {
  return <div className="ritmo-cover"><OptimizedImage className="ritmo-cover__photo" src={src('brand/six-home-backgrounds/chest.webp')} alt="" /><OptimizedImage className="ritmo-cover__logo ritmo-cover__logo--centered" src={src('brand/logo/logo-c-precise-dark.svg')} alt="RITMO" /></div>;
}
function RitmoBrandShowcase() {
  return <div className="ritmo-brand-cover" aria-label="RITMO 应用图标与品牌标识"><div className="ritmo-brand-cover__main"><OptimizedImage className="ritmo-phone-photo" src={src('brand/phone-mockup-spaced.png')} alt="使用真实主屏幕截图制作的 RITMO 手机样机展示" /></div><div className="ritmo-brand-cover__icon"><div className="ritmo-app-icon-frame"><OptimizedImage src={src('brand/app-icon/user-icon-v2.png')} alt="RITMO 应用图标" /></div></div><div className="ritmo-brand-cover__wordmark"><OptimizedImage src={src('brand/logo/logo-c-precise-dark.svg')} alt="RITMO" /></div></div>;
}
function CompetitorMatrix() {
  const rows = [
    ['训练计划配置','创建训练方案、文件夹，复用动作与组数','根据目标、经验、时长与历史生成训练','保留推荐、自定义与自由训练，按轮次执行'],
    ['环境适配','动作库按器械查找，支持自定义动作','以可用器械和个人设置约束推荐','家里／健身房分别保留器械与方案'],
    ['动作教学','动作库提供示范与指导','How To 提供步骤、视频与目标肌群','常用动作匹配自制媒体，专业审校仍待完成'],
    ['训练中操作','记录组数、重量，提供自动休息计时','可调整组数、次数与重量','组间自动衔接，换动作手动开始，可暂停调整'],
    ['训练历史反馈','动作表现、肌群分布与月度报告','训练历史进入后续推荐，提供表现记录','历史成果与最近训练时间的肌群可视化']
  ];
  const summaries = [
    '记录与复用清晰；仍需自行编排，部分满足少做判断的需求。',
    '器械适配与推荐较完整；需先配置条件，适合借助推荐训练。',
    '更贴合我的场地与训练节奏；动作覆盖和专业审校仍需完善。'
  ];
  return <div className="ritmo-comparison"><header className="case-section-heading ritmo-comparison__heading"><h3 className="case-section-heading__title">同类产品比较</h3></header><div className="ritmo-comparison__body"><p className="ritmo-swipe-hint">左右滑动查看完整矩阵 →</p><div className="ritmo-comparison__scroll" role="region" aria-label="同类产品比较矩阵" tabIndex={0}><table><thead><tr><th scope="col">产品</th>{rows.map(row=><th scope="col" key={row[0]}>{row[0]}</th>)}<th scope="col" className="ritmo-comparison__summary">优缺点与需求适配</th></tr></thead><tbody>{[['Hevy','competitors/hevy.ico'],['Fitbod','competitors/fitbod.jpg'],['RITMO','brand/app-icon/user-icon-v2.png']].map(([name,logo],index)=><tr key={name}><th scope="row"><div className="ritmo-comparison__product"><OptimizedImage src={src(logo)} alt="" /><span>{name}</span></div></th>{rows.map(row=><td key={row[0]}>{row[index+1]}</td>)}<td className="ritmo-comparison__summary">{summaries[index]}</td></tr>)}</tbody></table></div></div></div>;
}
function EnvironmentSequence() {
  return <div className="ritmo-live-stage ritmo-env-stage">
    <div className="ritmo-env-story">
      <div className="ritmo-env-options">
        <p className="ritmo-env-home">居家</p>
        <p className="ritmo-env-gym">健身房</p>
        <span
          aria-hidden="true"
          className="ritmo-env-cursor"
          style={{ backgroundImage: `url(${src('strategy/environment-icons.png')})` }}
        />
      </div>
      <p className="ritmo-env-kit">哑铃 · 训练凳 · 训练垫</p>
      <ul className="ritmo-env-moves" aria-label="推荐动作">
        <li>上斜哑铃卧推</li>
        <li>平板哑铃飞鸟</li>
      </ul>
    </div>
  </div>;
}

function StrategyExperience() {
  const plans = ['胸部训练', '手臂训练', '肩部训练', '背部训练', '腿部训练'];
  return <div className="case-sticky-showcase ritmo-strategy-experience">
    <div className="case-sticky-copy"><h2 className="case-section-heading__title">让训练跟着我的生活走</h2><div className="ritmo-strategy-copy"><p>我有时在家练，有时去健身房。在家手边只有几样器械，到了健身房又有别的选择，同一套动作不一定都做得了。我想打开 App 就知道今天在这里能练什么，少花点时间临时改计划。</p></div></div>
    <div className="ritmo-strategy-live-stack">
      <figure><EnvironmentSequence /><figcaption>切换场地，推荐跟着可用器械调整。</figcaption></figure>
      <figure>
        <div className="ritmo-live-stage ritmo-env-stage">
          <div className="ritmo-week" aria-label="训练循环示意：周三休息，后续训练顺延一天">
            <div className="ritmo-week-days" aria-hidden="true">
              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => <span key={day}>{day}</span>)}
            </div>
            <ol className="ritmo-week-plans">
              {plans.map((plan, index) => (
                <li key={plan} className={index >= 2 ? 'ritmo-week-shift' : undefined} style={{ '--day': index }}>
                  {plan}
                </li>
              ))}
            </ol>
            <span className="ritmo-week-rest">休息</span>
            <span className="ritmo-week-rest ritmo-week-weekend">休息</span>
            <span className="ritmo-week-repeat">胸部训练</span>
          </div>
        </div>
        <figcaption>漏练一天，后续顺延，下次接着练。</figcaption>
      </figure>
      <figure>
        <div className="ritmo-live-stage ritmo-env-stage">
          <div className="ritmo-flow-sequence">
            <div className="ritmo-flow-match"><small>热身</small><p>徒手站姿胸前开合</p></div>
            <div className="ritmo-flow-main">
              <small>力量训练</small>
              <div className="ritmo-flow-slot">
                <span className="ritmo-flow-add" aria-hidden="true">+</span>
                <p className="ritmo-flow-exercise">史密斯卧推</p>
              </div>
            </div>
            <div className="ritmo-flow-match"><small>拉伸</small><p>站姿徒手胸部伸展</p></div>
          </div>
        </div>
        <figcaption>选好力量动作，自动补齐热身和拉伸。</figcaption>
      </figure>
    </div>
  </div>;
}
function ExerciseLibraryExample() {
  const items = [{"id": "ritmo:video:alternating-db-curl", "name": "站姿交替哑铃弯举", "equipment": "哑铃", "muscles": "BICEPS", "sets": 3, "reps": 12, "rest": 90, "file": "alternating-curl.mp4", "frames": 69, "weight": "2.5 kg × 2"}, {"id": "press", "name": "坐姿哑铃推举", "equipment": "哑铃＋靠背凳", "muscles": "SHOULDERS_FRONT / SHOULDERS_SIDE", "sets": 4, "reps": 10, "rest": 90, "file": "press.mp4", "frames": 73, "weight": "2.5 kg × 2"}, {"id": "hasan:1760", "name": "高脚杯深蹲", "equipment": "一只哑铃", "muscles": "QUADS / GLUTES", "sets": 4, "reps": 10, "rest": 90, "file": "goblet-squat.mp4", "frames": 64, "weight": "2.5 kg"}];
  const [active, setActive] = useState(0);
  const item = items[active];
  return <div className="ritmo-pipeline-cards"><div className="ritmo-library-example ritmo-pipeline-card"><ol className="ritmo-data-pipeline" aria-label="数据管线">
    {[
      ['Raw Data', '汇集原始资料', '12,3 22,20 2,20'],
      ['Cross-check', '核对动作与器械', '12,2 22,12 12,22 2,12'],
      ['Normalization', '统一命名与格式', '12,2 22,9 18,21 6,21 2,9'],
      ['Exercise Schema', '定义动作字段', '12,2 21,7 21,17 12,22 3,17 3,7'],
      ['Media Mapping', '关联动作示范', '12,2 22,8 22,16 12,22 2,16 2,8'],
      ['Training', '接入训练流程', '12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8'],
    ].map(([name, description, shape], index) => (
      <li key={name} style={{ '--pipeline-step': index }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points={shape} /></svg>
        <strong>{name}</strong>
        <span>{description}</span>
      </li>
    ))}
  </ol></div><div className="ritmo-library-example ritmo-exercise-layout"><div className="ritmo-exercise-copy"><div className="ritmo-exercise-tabs" role="tablist" aria-label="动作实例">{items.map((x,index)=><button type="button" role="tab" aria-selected={active===index} aria-controls="ritmo-exercise-panel" id={`ritmo-exercise-tab-${index}`} key={x.id} onClick={()=>setActive(index)}>{x.name}</button>)}</div><div className="ritmo-exercise-example" id="ritmo-exercise-panel" role="tabpanel" aria-labelledby={`ritmo-exercise-tab-${active}`}><div><dl>{[['目标肌群',item.muscles.split(' / ').map(x=>({BICEPS:'肱二头肌',SHOULDERS_FRONT:'三角肌前束',SHOULDERS_SIDE:'三角肌中束',QUADS:'股四头肌',GLUTES:'臀大肌'}[x]||x)).join('、')],['所需器械',item.equipment],['训练配置',`${item.sets} 组 × ${item.reps} 次`],['组间休息',`${item.rest} 秒`],['默认重量',item.weight],['动作时长','4 秒 / 次'],['示范时长',`${(item.frames / 24).toFixed(2)} 秒 / 循环`],['示范帧数',`${item.frames} 帧 · 24 fps`]].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></div></div></div><video key={item.file} autoPlay muted loop playsInline preload="auto" aria-label={`${item.name}循环演示`}><source src={src(`experiment/${item.file}`)} type="video/mp4" /></video></div></div>;
}
function DeviceScreenshotRail() {
  const [paused, setPaused] = useState(false);
  const shots = [1684,1685,1686,1693,1691,1688,1689,1690,1694,1695,1696,1697,1698,1692,1687,1683];
  const row = (items, label, className = '') => <div className={`ritmo-device-row ${className}`} aria-label={label}><div className="ritmo-device-rail__track" style={{animationPlayState:paused?'paused':undefined}}>{[0,1].map(copy=><div className="ritmo-device-rail__group" key={copy} aria-hidden={copy===1?true:undefined}>{items.map(number=><OptimizedImage key={number} src={src(`device/IMG_${number}.PNG`)} alt={copy===0?'RITMO iPhone 真机界面':''} width="1179" height="2556" loading="lazy" draggable="false" />)}</div>)}</div></div>;
  return <div className="ritmo-device-rail" aria-label="RITMO 真机界面展示"><button className="ritmo-device-rail__toggle" type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? '继续滚动截图' : '暂停滚动截图'}>{paused ? '▷' : 'Ⅱ'}</button><div className="ritmo-device-desktop">{row(shots.slice(0,8),'上排真机截图')}{row(shots.slice(8),'下排真机截图','ritmo-device-row--offset')}</div><div className="ritmo-device-mobile">{row(shots,'真机截图')}</div></div>;
}
function OperationArc({ running = true }) {
  return <svg className="ritmo-operation-arc" viewBox="0 0 240 240" aria-hidden="true">
    <circle cx="120" cy="120" r="113.5" />
    <circle cx="120" cy="120" r="113.5" pathLength="100" style={{ animationPlayState: running ? 'running' : 'paused' }} />
  </svg>;
}

function PreparationDemo() {
  return <div className="ritmo-operation">
    <span>准备开始</span>
    <div className="ritmo-operation-ring ritmo-preparation" aria-label="播放按钮过渡到 3、2、1 倒数">
      <OperationArc />
      <b className="ritmo-preparation-play" aria-hidden="true">▶</b>
      {['3','2','1'].map((digit,index) => <b key={digit} className="ritmo-preparation-digit" style={{'--count':index}}>{digit}</b>)}
    </div>
    <strong>下一动作</strong>
  </div>;
}

function RestTimer() {
  const [seconds, setSeconds] = useState(15);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(value => value <= 1 ? 15 : value - 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="ritmo-operation-ring ritmo-operation-ring--rest"><OperationArc /><b>{seconds}</b></div>;
}

export default function RitmoCase({ project, Hero }) {
  return <article className="case-study ritmo-case">
    <div className="ritmo-hero-chapter"><Hero project={project} /><div className="case-section-heading case-section-heading--statement ritmo-project-statement"><p className="case-section-heading__title">刚好那段时间我在健身，练着练着，就发现有些地方用起来不太顺手。我想，不如借助 AI，给自己做一个训练 App，也试试能不能把自己的设计想法真正用起来。</p></div><div className="ritmo-opening-brand"><RitmoBrandShowcase /></div></div>
    <section className="case-visual-section ritmo-opening ritmo-discover ritmo-discover--scenes"><p className="ritmo-discover-story">训练时，我常常要确认动作怎么做、眼前的器械够不够用，还得停下来翻手机。设计目标不是提供更多训练功能，而是降低完成一次训练所需的判断与操作。</p><div className="ritmo-scene-grid">{[['complex','动作不熟悉'],['equipment','器械随场地变化'],['phone','操作打断节奏']].map(([name,title])=><figure key={name}><OptimizedImage loading="lazy" src={src(name === 'phone' ? 'discover/scene-phone-v2.png' : `discover/scene-${name}.png`)} alt={`${title}的训练情境示意`} /><figcaption>{title}</figcaption></figure>)}</div><CompetitorMatrix /></section>
    <section className="case-visual-section ritmo-strategy" aria-label="产品策略"><StrategyExperience /></section>
    <section className="case-visual-section" aria-label="用户体验框架">
      <figure className="ritmo-ux-framework">
        <div className="ritmo-ux-framework__stage">
          <div className="ritmo-ux-framework__screen">
            <video autoPlay loop muted playsInline preload="metadata" aria-label="RITMO 用户体验框架录屏">
              <source src={src('strategy/ux-framework.mp4')} type="video/mp4" />
            </video>
          </div>
        </div>
        <figcaption>用户体验框架</figcaption>
      </figure>
    </section>
    <section className="case-visual-section ritmo-experiment"><Heading title="动作素材库从哪里来？">一开始我想找一套现成的动作示范，省下逐个制作的时间。后来我也试着用 3D 和 AI 序列帧来做，想看看哪种方式能把动作讲清楚，又方便以后继续加新动作。</Heading>
      <div className="ritmo-experiment-wall"><article><h3>开源动作数据与媒体</h3><div className="ritmo-experiment-grid">{[1,2,3,4].map(n=><OptimizedImage key={n} src={src(`experiment/source-example-${n}.gif`)} alt="用户提供的动作示范素材" loading="lazy" />)}</div></article>
      <article><h3>3D 表现探索</h3><div className="ritmo-experiment-grid"><OptimizedImage loading="lazy" src={src('experiment/squat-realistic-3d-concept.png')} alt="历史写实3D视觉概念样本" /><OptimizedImage loading="lazy" src={src('experiment/squat-simplified-3d-concept.png')} alt="历史简化3D视觉概念样本" /><OptimizedImage loading="lazy" src={src('experiment/handdrawn-study.png')} alt="本轮独立生成的手绘动作方向" /><OptimizedImage loading="lazy" src={src('experiment/anatomy-study.png')} alt="本轮独立生成的解剖图动作方向" /></div></article>
      <article><h3>AI 序列帧方案</h3><div className="ritmo-experiment-grid">{['00-start','01-mid','02-top'].map((name,index)=><OptimizedImage key={name} loading="lazy" src={src(`experiment/${name}.png`)} alt={`早期弯举试产关键姿势${index+1}`} />)}<OptimizedImage src={src('experiment/keyframe-loop.gif')} alt="三张关键帧合成的循环动画" /></div></article></div>
    </section>
    <section className="case-visual-section ritmo-pipeline-section">
      <Heading title="数据管线">从核对来源到匹配动作示范，把训练会用到的信息整理到每一个动作里。</Heading>
      <ExerciseLibraryExample />
    </section>
    <section className="case-visual-section" aria-label="体验">
      <div className="case-sticky-showcase ritmo-strategy-experience">
        <div className="case-sticky-copy">
          <h2 className="case-section-heading__title">体验</h2>
          <div className="ritmo-strategy-copy"><p>我想让一次训练从开始到回看都更顺手。开练前有时间放好手机、拿稳器械，练的时候能看动作示范和进度，组间休息结束后就接着练。练完再看看肌群图，知道上次练了哪里、离现在有多久。</p></div>
        </div>
        <div className="ritmo-strategy-live-stack">
          <figure>
            <div className="ritmo-live-stage ritmo-operation-stage">
              <PreparationDemo />
            </div>
            <figcaption>开练先准备</figcaption>
          </figure>
          <figure>
            <div className="ritmo-live-stage ritmo-operation-stage">
              <div className="ritmo-operation">
                <video className="ritmo-operation-media" autoPlay muted loop playsInline aria-label="哑铃弯举循环示范">
                  <source src={src('experiment/alternating-curl.mp4')} type="video/mp4" />
                </video>
                <RestTimer />
                <strong>组间休息 · 秒</strong>
              </div>
            </div>
            <figcaption>组间自动接</figcaption>
          </figure>
          <figure>
            <div className="ritmo-experience-recording">
              <div className="ritmo-muscle-recording">
      <video autoPlay muted loop playsInline preload="metadata" aria-label="肌群训练总览录屏，展示正背面和不同肌群的训练时间">
        <source src={src('brand/muscle-recording.mp4')} type="video/mp4" />
      </video>
    </div>
            </div>
            <figcaption>练后看记录</figcaption>
          </figure>
        </div>
      </div>
    </section>
    <section className="case-visual-section ritmo-brand-story" aria-label="RITMO 品牌">
      <header className="case-section-heading"><h2 className="case-section-heading__title">RITMO｜找到属于你的训练节奏</h2></header>
      <figure className="ritmo-brand-rings">
        <div><span className="ritmo-brand-ring ritmo-brand-ring--solid" aria-hidden="true">▶</span><span>开始训练</span></div>
        <div><span className="ritmo-brand-ring ritmo-brand-ring--count" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="45" pathLength="100" /></svg>2</span><span>3、2、1 倒数</span></div>
        <div><span className="ritmo-brand-ring ritmo-brand-ring--count ritmo-brand-ring--active" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="45" pathLength="100" /></svg><b>6</b><small>暂停</small></span><span>训练中计次</span></div>
        <div><span className="ritmo-brand-ring ritmo-brand-ring--solid ritmo-brand-ring--resume" aria-hidden="true"><b>2</b><small>继续</small></span><span>暂停后继续</span></div>
      </figure>
      <p className="ritmo-discover-story">RITMO 意为「节奏」。我想到的是每次动作里的发力、控制和呼吸，也是一组练完，歇一会儿，再接着练的节奏。我希望 App 能把这些环节接得顺一点，让我少看几次手机，把注意力留给动作。每个人练得快慢不同，训练和恢复的安排也不一样。对我来说，找到自己的节奏，就是找到一种愿意一练再练的方式。</p>
      <figure className="ritmo-ux-framework ritmo-brand-recording">
        <div className="ritmo-ux-framework__stage">
          <div className="ritmo-ux-framework__screen">
            <video autoPlay muted loop playsInline preload="metadata" aria-label="RITMO 字标到训练圆环的录屏">
              <source src={src('brand/brand-recording.mp4')} type="video/mp4" />
            </video>
          </div>
        </div>
        <figcaption>从字标的 O 到训练里的圆</figcaption>
      </figure>
    </section>
    <section className="case-visual-section ritmo-goals">
      <Heading title="设计目标">从打开 App 到练完一组，尽量少做临时判断，把注意力留给训练。</Heading>
      <div className="ritmo-goals-grid">
        <article>
          <h3>表现层 · 统一视觉</h3>
          <p>从字标的 O 到训练圆环，用同一套形状和荧光绿串起开始、倒数、计次和继续，让每个状态都容易认出来。</p>
        </article>
        <div className="ritmo-goals-decoration" aria-hidden="true">
          <OptimizedImage src={src('brand/design-goals-decoration.png')} alt="" loading="lazy" />
        </div>
        <article>
          <h3>业务逻辑层 · 简化训练安排</h3>
          <p>把场地、器械和训练方案的关系理顺。切换场地时，推荐跟着可用器械调整；选好力量动作后，自动补上对应的热身和拉伸。</p>
        </article>
        <article>
          <h3>交互层 · 减少操作</h3>
          <p>让休息和下一组自动衔接。换动作时留出准备时间，训练中点圆环就能暂停，按需要调整重量、次数或休息。</p>
        </article>
      </div>
    </section>
    <section className="case-visual-section ritmo-moodboard">
      <Heading title="情绪板">用于灵感收集、制定设计基调、辅助决策</Heading>
      <div className="ritmo-moodboard-grid">
        {[
          ['focus', '专注', 'FOCUS'],
          ['rhythm', '节奏', 'RHYTHM'],
          ['control', '掌控', 'CONTROL'],
        ].map(([image, title, english]) => (
          <figure key={image} className={`ritmo-moodboard-card ritmo-moodboard-card--${image}`}>
            <OptimizedImage src={src(`brand/moodboard/${image}.jpg`)} alt="" loading="lazy" />
            <figcaption><strong>{title}</strong><span lang="en">{english}</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
    <section className="case-visual-section" aria-label="我的设计过程">
      <div className="case-sticky-showcase ritmo-strategy-experience">
        <div className="case-sticky-copy">
          <h2 className="case-section-heading__title">从 AI 协作到真实使用</h2>
          <div className="ritmo-strategy-copy"><p>在 RITMO 的开发过程中，我将 AI 作为跨越设计与实现之间距离的协作工具。通过持续提出需求、比较方案、制定实现约束和验收结果，我能够在没有完整开发团队的条件下，将产品想法逐步推进为可使用的应用。</p></div>
        </div>
        <div className="ritmo-strategy-live-stack">
          <figure>
            <OptimizedImage className="ritmo-process-art" src={src('process/problem-needs-constraints.png')} alt="问题、需求与约束三个相互关联的圆形" loading="lazy" />
            <figcaption>提出问题、明确需求和约束</figcaption>
          </figure>
          <figure>
            <OptimizedImage className="ritmo-process-art" src={src('process/talk-work-collaboration.png')} loading="lazy" alt="我负责设计与决策，Talk 负责讨论分析，Work 负责执行构建，共同推进可使用的产品" />
            <figcaption>使用 Talk 和 Work 两个对话协作推进。</figcaption>
          </figure>
          <figure>
            <OptimizedImage className="ritmo-process-art" src={src('process/training-flow-v2.png')} loading="lazy" alt="训练流程探索图，包含新手和有基础的路径、训练环境、训练方案与训练记录" />
            <figcaption>分析讨论并生成对应的训练流程。</figcaption>
          </figure>
          <figure>
            <a href={src('process/ai-interface.jpg')} target="_blank" rel="noopener noreferrer" aria-label="查看 AI 生成的界面初稿原图">
              <OptimizedImage className="ritmo-process-art" src={src('process/ai-interface.jpg')} loading="lazy" width="2992" height="2874" alt="AI 生成的 RITMO 初稿，包含训练首页、方案、记录、执行与休息等界面" />
            </a>
            <figcaption>结合我的需求和界面参考，生成界面初稿。</figcaption>
          </figure>
          <figure>
            <a href={src('process/figma-bridge.png')} target="_blank" rel="noopener noreferrer" aria-label="查看 Figma Bridge 原图">
              <OptimizedImage className="ritmo-process-art" src={src('process/figma-bridge-dark.svg')} loading="lazy" width="720" height="720" alt="Figma Bridge 深色界面示意，支持导入原生图层和导出 Design JSON 或 PNG" />
            </a>
            <figcaption>用 Figma Bridge 在 AI 与 Figma 之间传递设计。</figcaption>
          </figure>
          <figure>
            <a href={src('process/ai-media.png')} target="_blank" rel="noopener noreferrer" aria-label="查看 AI 素材合集原图">
              <OptimizedImage className="ritmo-process-art" src={src('process/ai-media.png')} loading="lazy" width="3840" height="3840" alt="AI 生成的训练素材合集，包含人物局部特写和多种训练动作示范" />
            </a>
            <figcaption>用 AI 生成统一风格的人物和动作素材。</figcaption>
          </figure>
          <figure>
            <OptimizedImage className="ritmo-process-art" src={src('brand/phone-mockup-spaced.png')} loading="lazy" width="1254" height="1254" alt="手机主屏幕上的 RITMO 应用图标" />
            <figcaption>借助 AI 完成实现，让应用在手机上用起来。</figcaption>
          </figure>
        </div>
      </div>
    </section>
    <section className="case-visual-section ritmo-design-showcase" aria-label="设计展示">
      <header className="case-section-heading">
        <h2 className="case-section-heading__title">设计展示</h2>
      </header>
      <div className="ritmo-design-showcase__images">
        {[1,2,3,4,5,6,7,8].map((number,index) => (
          <div key={number} className={number === 8 ? 'ritmo-design-final' : undefined}><a href={src(`visual/design/${number}.png`)} target="_blank" rel="noopener noreferrer" aria-label={`查看设计展示第 ${number} 张原图`}>
            <OptimizedImage src={src(`visual/design/${number}.png`)} alt={['色彩与按钮规范','字体、图标与底部导航规范','训练、方案和记录界面','首页与推荐训练方案','力量训练与暂停界面','创建方案和添加动作','真实界面合集','RITMO 品牌与手机展示'][index]} loading="lazy" />
          </a>
            {number === 8 && <div className="ritmo-design-final__screen">
              <video autoPlay muted loop playsInline preload="metadata" aria-label="RITMO 真机使用录屏">
                <source src={src('visual/design/final-screen.mp4')} type="video/mp4" />
              </video>
            </div>}
          </div>
        ))}
      </div>
    </section>
  </article>;
}
