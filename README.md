# AI 私人健康助手 (MY GYM Teacher Agent)

> 本地优先的 AI 健康教练桌面应用 — 由 Vibe Coding 构建

## 功能

- **AI 健康教练** — 基于大语言模型的智能对话，支持多轮工具调用（健康计算、碳循环方案、恢复分析等）
- **碳循环系统** — 2-2-2 模式（2天低碳 → 2天中碳 → 2天高碳 → 1天灵活），自动生成饮食模板
- **饮食记录** — USDA FoodData Central API 食物搜索，支持中文→英文翻译，自动分类肉蛋/油脂/碳水
- **训练动作库** — ExerciseDB API 搜索训练动作，中文名称检索，GIF 动画示范，指令自动翻译
- **健康数据追踪** — 手动记录体重、步数、睡眠，体重趋势图，宏量营养素进度条
- **恢复状态自评** — 5 级能量等级选择（精力充沛 → 非常疲劳），个性化恢复建议
- **语音对话** — MIMO-v2.5 TTS 语音合成，faster-whisper 语音识别
- **iPhone 快捷指令同步** — 通过 Shortcut 将 Apple Health 数据同步到应用
- **多 AI 提供商** — 支持 Claude、OpenAI、DeepSeek、Gemini、OpenAI 兼容接口

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri (计划中) |
| 前端 | React 19 + Vite + TailwindCSS + Zustand + Recharts + Framer Motion |
| 后端 | Fastify + Prisma + SQLite + TypeScript |
| AI | 多提供商抽象层 (Claude / OpenAI / DeepSeek / Gemini) |
| 语音 | MIMO-v2.5 TTS + faster-whisper STT |

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org) v18+
- Windows / macOS / Linux

### 一键启动（Windows）

双击项目根目录的 `start.bat`，自动完成依赖安装、前端构建、服务启动，浏览器自动打开。

### 命令行启动

```bash
# 1. 安装依赖
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. 设置数据库
cd backend && npx prisma generate && npx prisma migrate dev && cd ..

# 3. 配置 API Key
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少填入一个 AI 提供商的 API Key

# 4. 启动（生产模式，单进程）
npm start

# 或开发模式（热更新，双进程）
npm run dev
```

启动后访问 `http://localhost:3001`

## 项目结构

```
├── start.bat              # Windows 一键启动脚本
├── package.json           # 根工作区
├── backend/
│   ├── src/
│   │   ├── index.ts       # Fastify 入口
│   │   ├── agent/         # AI Agent 编排
│   │   ├── providers/     # AI 提供商抽象层
│   │   ├── services/      # 业务服务
│   │   ├── engines/       # 纯计算引擎
│   │   ├── tools/         # AI Agent 工具 (10个)
│   │   ├── routes/        # API 路由
│   │   └── db/            # Prisma 客户端
│   └── prisma/
│       └── schema.prisma  # 数据库模型
├── frontend/
│   └── src/
│       ├── pages/         # 页面组件 (Dashboard/Chat/Carbon/Exercise/Analytics/Settings)
│       ├── components/    # UI 组件
│       ├── stores/        # Zustand 状态管理
│       └── api/           # HTTP 客户端
└── packages/
    └── shared-types/      # 共享 TypeScript 类型
```

## 环境变量

复制 `backend/.env.example` 为 `backend/.env`，配置以下 API Key：

| 变量 | 用途 | 获取地址 |
|---|---|---|
| `DEEPSEEK_API_KEY` | AI 对话（推荐） | https://platform.deepseek.com |
| `ANTHROPIC_API_KEY` | Claude AI | https://console.anthropic.com |
| `OPENAI_API_KEY` | OpenAI | https://platform.openai.com |
| `USDA_API_KEY` | 食物营养搜索 | https://fdc.nal.usda.gov/api-key-signup.html |
| `EXERCISEDB_API_KEY` | 训练动作搜索 | https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb |
| `MIMO_TTS_API_KEY` | 语音合成 | — |

## iPhone 快捷指令同步

通过 iOS 快捷指令将 Apple Health 数据一键同步到应用。

### 前提条件

- iPhone 和电脑在**同一 WiFi** 网络下
- 获取电脑局域网 IP 地址（Windows: `ipconfig`，Mac: `ifconfig`）

### 创建快捷指令

1. 打开 iPhone **「快捷指令」** App，点击右上角 **+** 新建
2. 添加 **「获取健康样本」** 操作，依次获取以下数据：

| 数据类型 | 日期范围 | 变量名 |
|---------|---------|--------|
| 步数 | 今天 | steps |
| 步行+跑步距离 | 今天 | distance |
| 活动能量 | 今天 | calories |
| 锻炼分钟数 | 今天 | exerciseMin |
| 睡眠 | 今天 | sleepMin |
| 心率变异性 | 最近 7 天 | hrv |
| 心率 | 今天 | heartRate |
| 体重 | 最近 7 天 | weightKg |

3. 添加 **「词典」** 操作，构造 JSON 数据包
4. 添加 **「获取 URL 内容」** 操作：

```
URL:      http://<你的电脑IP>:3001/health/sync
方法:      POST
请求头:    Content-Type: application/json
           x-user-id: default-user
请求体:    选择上一步的「词典」变量
```

5. 保存并命名为 **「健康数据同步」**

### 使用

- 点击运行即可将 Apple Health 数据同步到应用
- 可**添加到主屏幕**，像普通 App 一键同步
- 可设置**自动化**：每天固定时间自动运行

### 故障排除

- 连接失败 → 检查 WiFi 是否一致、IP 是否正确、防火墙是否拦截 3001 端口
- 无数据 → 确保 Apple Health 中有对应数据，首次运行需授权

## License

MIT
