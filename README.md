# NOVA OS MVP

一个本地可运行、可发布的个人超级中控 Dashboard。系统参考 `NOVA_OS_MVP操作方案_V1.0.docx` 构建，先用本地 JSON 验证统一入口、状态概览和模拟 AI 辅助行动。

## 功能范围

- 单页面 Dashboard：首页即人生控制台。
- Life Score、今日重点、风险提醒、AI 下一步建议。
- 五大系统入口：Life OS、Work OS、Media OS、Knowledge OS、AGI OS。
- 核心数据卡片：健康、财富、工作、内容、学习。
- AI Command Center：快捷指令、模拟输出、可转任务按钮。
- 数据结构集中在 `src/data/dashboard.json`，后续可替换为 API。

## 开发命令

```bash
npm install
npm run dev
npm run build
```

## 数据演进

当前版本使用 Local JSON。建议后续按以下顺序迭代：

1. REST API
2. Database
3. AI Agent
4. Automation Engine

## API 预留说明

前端组件只读取 `src/data/dashboard.json` 的结构化数据。接入真实服务时，可新增 `src/services/dashboard.js`，暴露 `getDashboard()`，再把静态导入替换为异步请求。
