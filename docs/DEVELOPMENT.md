# RITMO · 运行与技术说明

[返回项目完整介绍](../README.md) · [在线体验与安装](DEMO.md)

## 下载源码并在电脑运行

仅对已获本私有仓库访问权限的用户开放。可以通过 GitHub **Code → Download ZIP** 下载，解压后进入包含 `package.json` 的目录；或克隆：

```bash
git clone https://github.com/xiemingjian2024-stack/ritmo-mvp.git
cd ritmo-mvp
npm ci
npm run dev -- --host 0.0.0.0 --port 4173
```

需要 **Node.js 22.12+ 的兼容版本**，建议 Node.js 22 LTS；首次安装需要联网下载依赖。打开 `http://localhost:4173/`。无需 API Key、数据库或付费云服务。

同一 Wi-Fi 下，手机可打开 `http://电脑的局域网IP:4173/` 临时预览，电脑须开机并允许该端口。这是 HTTP 调试，不等同于 HTTPS 主屏幕体验；日常手机体验优先用公开 Demo。

| 入口 | 地址参数 |
| --- | --- |
| 训练 | `/?flow=training` |
| 方案 | `/?flow=plans` |
| 记录 | `/?flow=records` |

## 构建与验证

```bash
npm run check:runtime
node --test tests/*.test.mjs
npm run build
```

静态网页输出到 `dist/client/`，`dist/server/index.js` 提供 Sites Worker 页面回退。`dist/`、`node_modules/` 与本机数据不纳入源码提交。

浏览器交互测试：`npx playwright install chromium` 后运行 `npm run test:runtime`。部分早期研究用例依赖历史隔离报告或本地审核媒体，不能把整个测试目录等同于当前版本全部通过；本次验证范围见 [版本记录](RELEASE.md)。

## 技术实现

React 19、TypeScript、Vite、CSS／SVG／轻量 Web 动画、Radix UI、Playwright。方案、Session、循环位置与中断进度通过浏览器 `localStorage` 保存，无业务数据库或云端同步。

| 代码 | 职责 |
| --- | --- |
| `src/Prototype.tsx` | 页面与训练执行 |
| `src/prototype.css` | 视觉与响应式 |
| `src/personalTrainingLibrary.ts` | 个人视频库与模板 |
| `src/exerciseMedia.ts` | 稳定 ID 与媒体匹配 |
| `src/workoutLifecycle.ts` | 保存与生命周期 |
| `src/mobile/` | 移动容器、弹层与手势 |

## 数据与验证边界

- 正常完成力量训练按原规则保存 Session，NEXT 只推进一次；提前结束记录 partial，不推进 NEXT；拉伸退出保留已保存力量记录。
- 计次来自预设节奏，不是摄像头、Apple Watch 或传感器识别。默认单次 4 秒、力量组间休息 90 秒，可设置；静态计时与左右换侧沿各自动作规则。
- Demo 预置历史用于展示肌群颜色与日历，不是真实训练结果。当前没有已验收的导出导入、Watch 连接或可靠离线冷启动。
- Safari 与主屏幕 Web App 可能使用不同存储；换设备、换域名、清除网站数据不会自动迁移记录。
- 媒体经过设计师视觉确认与基本技术检查，专业教练审校仍独立待审。缺失媒体统一占位。

本仓库供个人项目交接与受邀审阅，未授予代码或媒体的开放再分发许可。素材来源与使用范围保留在对应数据与记录中。
