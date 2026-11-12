export function BaselineCountdownView({ count, name }: { count: number; name?: string }) {
  return <div className="countdown-screen" aria-live="assertive"><span>准备开始</span><div className="countdown-ring"><svg className="countdown-ring-progress" viewBox="0 0 240 240" aria-hidden="true"><circle className="countdown-ring-track" cx="120" cy="120" r="108" /><circle className="countdown-ring-fill" cx="120" cy="120" r="108" pathLength="100" /></svg><strong key={count}>{count}</strong></div><small>{name}</small></div>;
}
