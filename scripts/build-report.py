from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image
import os

ROOT = "/Users/xiemingjian/.codex/.chatgpt-projects/g-p-6a9e2a863a8c8191b0b3397eb607de72"
DEMO = os.path.join(ROOT, "interaction-demo-v1")
EVIDENCE = os.path.join(DEMO, "evidence")
OUT = os.path.join(ROOT, "output/pdf/Strength_Training_App_Interaction_Demo_V1.0.pdf")
W, H = 1440, 900
pdfmetrics.registerFont(TTFont("CN", "/System/Library/Fonts/STHeiti Light.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("CNB", "/System/Library/Fonts/STHeiti Medium.ttc", subfontIndex=0))
BG, INK, MUTED, LIME, WHITE, LINE = [HexColor(x) for x in ("#F4F3EF", "#090A09", "#777B75", "#B7FF19", "#FFFFFF", "#D9DBD5")]

def txt(c, s, x, y, size=16, color=INK, bold=False, align="left"):
    c.setFillColor(color); c.setFont("CNB" if bold else "CN", size)
    {"left": c.drawString, "right": c.drawRightString, "center": c.drawCentredString}[align](x, y, s)

def rr(c, x, y, w, h, r=28, fill=WHITE, stroke=None):
    c.setFillColor(fill); c.setStrokeColor(stroke or fill); c.roundRect(x, y, w, h, r, fill=1, stroke=1 if stroke else 0)

def wrap(c, s, x, y, width, size=15, leading=22, color=MUTED, bold=False, max_lines=6):
    font = "CNB" if bold else "CN"; lines=[]; cur=""
    for ch in s:
        if pdfmetrics.stringWidth(cur+ch, font, size) > width and cur: lines.append(cur); cur=ch
        else: cur += ch
    if cur: lines.append(cur)
    for i,line in enumerate(lines[:max_lines]): txt(c,line,x,y-i*leading,size,color,bold)
    return y-min(len(lines),max_lines)*leading

def img(c, path, x, y, w, h):
    im=Image.open(path); iw,ih=im.size; scale=min(w/iw,h/ih); dw,dh=iw*scale,ih*scale
    c.drawImage(ImageReader(im),x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask='auto')

def base(c,n,title,sub):
    c.setFillColor(BG); c.rect(0,0,W,H,fill=1,stroke=0)
    txt(c,f"P{n:02d}",72,840,13,MUTED,True); txt(c,"Strength Training App · Interaction Demo V1.0",W-72,840,12,MUTED,False,"right")
    txt(c,title,72,786,34,INK,True); txt(c,sub,72,750,16,MUTED); c.setStrokeColor(LINE); c.line(72,720,W-72,720)

def chip(c,s,x,y,fill=LIME,color=INK,w=96):
    rr(c,x,y,w,30,15,fill); txt(c,s,x+w/2,y+9,13,color,True,"center")

def bullet(c,heading,body,x,y,width=500):
    c.setFillColor(LIME); c.circle(x+5,y+7,5,fill=1,stroke=0); txt(c,heading,x+24,y,18,INK,True); wrap(c,body,x+24,y-27,width-24,14,20,MUTED,False,4)

c=canvas.Canvas(OUT,pagesize=(W,H)); c.setTitle("Strength Training App · Interaction Demo V1.0"); c.setAuthor("OpenAI Codex")

base(c,1,"核心交互验证已落地","轻量本地 Demo · 三条链路使用模拟数据，无后端与传感器")
shots=[("训练执行","training-active.png"),("创建方案","plans-empty.png"),("训练记录","records-front.png")]
for i,(label,file) in enumerate(shots):
    x=86+i*444; rr(c,x,94,390,590,34,WHITE); chip(c,label,x+18,635,LIME if i==0 else HexColor("#E3E4DF"),INK,100)
    img(c,os.path.join(EVIDENCE,file),x+52,122,286,500)
txt(c,"实现状态",72,52,13,MUTED,True); txt(c,"训练执行：完整  ·  训练记录：完整  ·  创建方案：代表性动作数据完成",170,52,14,INK,True)
c.showPage()

base(c,2,"链路 01｜训练执行","Active → Rest → 下一组 → 动作间过渡 → 3-2-1 → 下一动作")
for i,file in enumerate(("training-active.png","training-rest.png","training-rest-edit.png")):
    x=66+i*330; rr(c,x,94,300,600,30,WHITE); img(c,os.path.join(EVIDENCE,file),x+24,120,252,548)
labels=["Active Set","Rest","参数编辑"]
for i,l in enumerate(labels): chip(c,l,84+i*330,645, LIME if i==0 else HexColor("#E3E4DF"),INK,100)
txt(c,"已验证",1055,654,18,MUTED,True)
bullet(c,"动作内自动", "次数按节奏模拟推进；无需“完成本组”，休息结束后自动进入下一组。",1055,598,310)
bullet(c,"休息可控", "+15 秒、提前开始、暂停均可用；进入参数编辑后计时暂停。",1055,482,310)
bullet(c,"动作间手动", "第三组结束后停在“下一项”；用户点击开始后才进入 3-2-1。",1055,366,310)
rr(c,1048,116,318,118,26,INK); txt(c,"说明",1075,192,13,LIME,True); wrap(c,"计数与倒计时采用评审加速，不代表真实动作识别。",1075,160,260,15,22,HexColor("#C8CBC5"),False,3)
c.showPage()

base(c,3,"链路 02｜创建方案","空列表 → 推荐 / 手动添加 → 参数编辑 → 首次保存 → 后续自动保存")
rr(c,80,86,530,610,34,WHITE); rr(c,650,86,530,610,34,WHITE)
chip(c,"空列表",102,646,LIME,INK,92); chip(c,"添加动作 Sheet",672,646,HexColor("#E3E4DF"),INK,132)
img(c,os.path.join(EVIDENCE,"plans-empty.png"),154,116,382,510); img(c,os.path.join(EVIDENCE,"plans-sheet.png"),724,116,382,510)
txt(c,"交互覆盖",1220,640,17,MUTED,True)
for i, item in enumerate([
    "主页面无肌群 Tab",
    "推荐仅空列表出现",
    "横向浏览，一键应用",
    "Sheet 搜索 / 肌群切换",
    "跨肌群连续多选",
    "空方案不可保存",
    "首次保存明确确认",
    "后续修改自动保存",
]):
    txt(c, "• " + item, 1210, 594 - i * 29, 13, INK)
rr(c,1210,112,180,110,24,INK); txt(c,"数据范围",1232,184,12,LIME,True); wrap(c,"使用 10 个代表性动作，未接入完整动作数据库。",1232,154,140,13,19,HexColor("#C8CBC5"),False,4)
c.showPage()

base(c,4,"链路 03｜训练记录","日期基准、正背面与肌群点击共同驱动时间热力图")
rr(c,88,84,500,612,34,WHITE); rr(c,628,84,500,612,34,WHITE)
chip(c,"正面 · 10 月 12 日",110,646,LIME,INK,150); chip(c,"背面 · 10 月 14 日",650,646,HexColor("#E3E4DF"),INK,150)
img(c,os.path.join(EVIDENCE,"records-front.png"),145,114,386,510); img(c,os.path.join(EVIDENCE,"records-back.png"),685,114,386,510)
txt(c,"已验证",1170,650,18,MUTED,True)
bullet(c,"同一时间基准","切换历史日期后，肌群颜色与最近训练时间都按该日期重新计算。",1170,592,230)
bullet(c,"真实分区交互","沿用现有带 data-group 的 2.5D SVG；点击肌肉返回对应训练肌群。",1170,458,230)
bullet(c,"语义克制","色阶仅表示新近程度；不出现恢复、疲劳、建议或完成率。",1170,324,230)
c.showPage()

base(c,5,"差异、限制与评审问题","实现结论基于本地浏览器走查，不等同于真实用户测试")
sections=[
 ("与高保真稿的差异","顶部“训练 / 创建方案 / 记录”切换器仅用于评审；记录页为提高肌群点击面积，让最近训练列表位于首屏下方；非关键动效保持克制。"),
 ("尚未实现","后端、账号、跨设备同步、持久化、真实传感器、完整动作数据库、完整月历、循环管理功能与正式动效。"),
 ("运行信息",f"目录：{DEMO}\n启动：pnpm dev --host 0.0.0.0 --port 4173 --strictPort\n地址：http://localhost:4173/  ·  可用 ?flow=training / plans / records 直接进入。"),
]
y=640
for title,body in sections:
    rr(c,72,y-142,W-144,128,28,WHITE); txt(c,title,100,y-54,21,INK,True); wrap(c,body,380,y-48,W-480,15,23,MUTED,False,5); y-=156
rr(c,72,86,620,110,28,INK); txt(c,"QA",100,160,13,LIME,True); txt(c,"393 × 852 真机比例截图通过视觉对比",100,122,23,WHITE,True)
txt(c,"需要主控评审",760,174,17,INK,True); wrap(c,"1  Demo 顶部路径切换器是否保留到作品集录屏？\n2  记录页模型触控面积与首屏历史列表权重是否接受？\n3  下一轮是否只补交互转场，不扩展功能？",760,140,600,16,28,MUTED,False,7)
c.save(); print(OUT)
