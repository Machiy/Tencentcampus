# Global Rate Calculator (全球汇率计算器) 🌍

一个现代化的、轻量级的网页汇率计算器，专注于为海淘、境外游用户提供**各大卡组织（Visa, Mastercard, UnionPay, Amex, JCB）**的实时汇率对比。

![Screenshot](screenshot.png)

## ✨ 特性

- **多卡组织对比**：一键计算 Visa, Mastercard, 银联, 运通, JCB 的预估入账金额。
- **混合数据源**：
  - **基础汇率**：对接 `open.er-api.com` 获取实时中间市场汇率。
  - **真实数据 (高级)**：内置 Python 代理服务器，可直接抓取 **Visa** 和 **Mastercard** 官网的实时结算汇率（精确到小数点后多位，非模拟值）。
  - **智能模拟**：对于其他卡组织，使用业界典型的点差模型进行高精度估算。
- **现代化 UI**：
  - 采用 Glassmorphism (毛玻璃) 设计风格。
  - 完全响应式设计，适配手机与桌面。
  - 动态交互与流畅动画。
- **隐私安全**：所有计算在本地或通过从本地代理直连官网进行，不上传任何个人数据。

## 🚀 快速开始

### 方式一：基础使用 (纯网页版)
直接用浏览器打开 `index.html`。
> *注意：此模式下 Visa/Mastercard 汇率将使用模拟点差算法，与官网数据可能存在微小偏差。*

### 方式二：高级模式 (推荐，获取官网真实数据)
本功能需要 Python 环境。

1. **启动服务**：
   双击运行 `运行计算器.bat` 
   *(或者在命令行运行 `python server.py`)*

2. **开始使用**：
   浏览器会自动打开页面。此时 Visa 和 Mastercard 卡片上会出现绿色的 **【官网】** 标签，表示数据源为官方实时接口。

## 🛠 技术栈

- **Frontend**: 原生 HTML5, CSS3 (CSS Variables, Flexbox/Grid), JavaScript (ES6+). 无需编译，极速加载。
- **Backend**: Python (标准库 `http.server`)，零依赖，用于代理转发跨域请求。
- **Icons**: FontAwesome.
- **Fonts**: Google Fonts (Inter).

## 📂 项目结构

```
.
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── script.js       # 逻辑脚本
├── index.html          # 主页
├── server.py           # Python 代理服务器 (解决 CORS问题)
├── 运行计算器.bat       # Windows 一键启动脚本
└── README.md           # 项目说明
```

## 🤝 贡献代码

欢迎提交 Issue 或 Pull Request 来改进这个小工具！

## 📄 开源协议

MIT License
