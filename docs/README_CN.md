# LensLink

<div align="center">

![alt text](assets/image.png)

![LensLink Logo](https://img.shields.io/badge/LensLink-摄影工作流-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik05IDJMNy4xNyA0SDRjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoMTZjMS4xIDAgMi0uOSAyLTJWNmMwLTEuMS0uOS0yLTItMmgtMy4xN0wxNSAySDl6bTMgMTVjLTIuNzYgMC01LTIuMjQtNS01czIuMjQtNSA1LTUgNSAyLjI0IDUgNS0yLjI0IDUtNSA1eiIvPjwvc3ZnPg==)

**现代化照片筛选与 RAW 工作流管理工具**

[中文文档](#-功能特性) | [English](../README.md)

[![构建状态](https://img.shields.io/badge/构建-通过-brightgreen?style=flat-square)](.)
[![版本](https://img.shields.io/badge/版本-0.1.0-blue?style=flat-square)](.)
[![许可证](https://img.shields.io/badge/许可证-MIT-orange?style=flat-square)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?style=flat-square&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-CE412B?style=flat-square&logo=rust)](https://www.rust-lang.org/)

</div>

---

## 📸 项目简介

**LensLink** 是一款为摄影师量身打造的强大桌面应用程序，专为 RAW+JPG 同时拍摄模式设计。它通过直观的界面简化照片筛选流程，让您能够快速查看、评级和整理照片，支持 EXIF 元数据提取、RAW 文件预览和高效的批量操作。

### 为什么选择 LensLink？

- 🎯 **智能照片分组** - 自动配对相同基础文件名的 RAW 和 JPG 文件
- ⚡ **闪电般快速筛选** - 键盘快捷键实现快速选择（P/X/U）
- 🔍 **RAW 预览支持** - 通过 WebAssembly 驱动的解码直接查看 RAW 文件
- 📊 **EXIF 数据显示** - 完整的元数据查看，包括相机设置和镜头信息
- 🎨 **现代化 UI/UX** - 精美的深色/浅色主题，流畅动画效果
- 🌐 **多语言支持** - 支持中英文界面
- 💾 **无损操作** - 所有操作都保留原始文件，直到您准备导出

---
![alt text](assets/interface.png)

## ✨ 功能特性

### 🖼️ 智能照片管理

- **自动分组**：按文件名配对 RAW 和 JPG 文件
- **状态指示器**：为完整配对、仅 JPG 或仅 RAW 文件提供可视化标记
- **灵活导入**：支持单个文件和文件夹导入
- **孤儿文件检测**：识别未配对的文件以便清理

### 🎬 专业查看器

- **缩放与平移**：鼠标滚轮缩放（10%-1000%），支持拖拽
- **RAW 解码**：原生支持 CR2、NEF、ARW、DNG 等多种格式
- **EXIF 显示**：快门速度、光圈、ISO、焦距、相机型号、镜头、时间戳
- **快速评级**：键盘快捷键 - 精选（P）、拒绝（X）、取消标记（U）
- **流畅导航**：方向键和缩略图条浏览

### 🚀 批量操作

- **智能导出**：导出精选/拒绝的照片，支持多种模式
  - RAW + JPG 都导出
  - 仅导出 RAW
  - 仅导出 JPG
- **安全删除**：将拒绝的照片移至系统回收站，需确认
- **孤儿文件清理**：批量删除未配对的 RAW 或 JPG 文件
- **复制或移动**：导出时可选择复制或移动文件

### 🎨 用户体验

- **主题**：深色和浅色模式，支持系统偏好检测
- **响应式布局**：针对不同屏幕尺寸优化
- **窗口管理**：自定义标题栏，支持最小化、最大化和关闭
- **设置面板**：自定义语言和主题偏好
- **键盘导航**：完整的键盘支持，提高工作效率

---

## 🛠️ 技术栈

### 前端
- **框架**：React 18.3 + TypeScript 5.6
- **构建工具**：Vite 6.0
- **样式**：Tailwind CSS 3.4
- **图标**：Font Awesome 7.1
- **RAW 处理**：libraw-wasm 1.1

### 后端
- **运行时**：Tauri 2.0
- **语言**：Rust 2021 Edition
- **EXIF 解析**：kamadak-exif 0.5
- **文件操作**：tauri-plugin-fs、tauri-plugin-dialog
- **状态管理**：tauri-plugin-window-state

---

## 📦 安装

### 下载预构建版本

下载适合您平台的最新版本：

- **Windows**：`LensLink_x64_setup.exe`
- **macOS**：`LensLink_aarch64.dmg`（Apple Silicon）/ `LensLink_x64.dmg`（Intel）
- **Linux**：`LensLink_amd64.AppImage` 或 `.deb`

👉 [从 Releases 下载](https://github.com/AGPEIM/lenslink/releases)

### 从源码构建

#### 前置条件

- **Node.js** 18+ 和 pnpm
- **Rust** 1.70+
- **Tauri CLI**

#### 步骤

```bash
# 克隆仓库
git clone https://github.com/AGPEIM/lenslink.git
cd lenslink

# 安装依赖
pnpm install

# 开发模式运行
pnpm run tauri dev

# 生产构建
pnpm run tauri build
```

---

## 🚀 快速开始

### 1. 导入照片

点击**导入文件夹**按钮或使用文件选择器加载您的 RAW+JPG 照片。

### 2. 查看与评级

- 使用**方向键**（← →）在照片间导航
- 按 **P** 标记为精选（保留）
- 按 **X** 标记为拒绝（稍后删除）
- 按 **U** 取消标记
- 使用鼠标滚轮**缩放**

### 3. 筛选与排序

使用筛选按钮查看：
- **全部照片**：完整概览
- **精选**：标记为保留的照片
- **拒绝**：标记为删除的照片
- **未标记**：尚未评级的照片
- **孤儿文件**：未配对的 RAW 或 JPG 文件

### 4. 导出或删除

- **导出精选**：将选中的照片保存到目标文件夹
- **删除拒绝**：将拒绝的照片移至回收站
- **清理孤儿**：删除未配对的文件

---

## ⌨️ 键盘快捷键

| 按键 | 操作 |
|-----|------|
| `P` | 标记当前照片为**精选** |
| `X` | 标记当前照片为**拒绝** |
| `U` | **取消标记**当前照片 |
| `←` | 导航到**上一张**照片 |
| `→` | 导航到**下一张**照片 |
| `鼠标滚轮` | **缩放** |
| `双击` | **重置**缩放 |
| `拖拽` | 缩放时平移 |

---

## 📊 支持的 RAW 格式

LensLink 通过 `libraw` 支持广泛的 RAW 格式：

- Canon（佳能）：`.CR2`、`.CR3`
- Nikon（尼康）：`.NEF`、`.NRW`
- Sony（索尼）：`.ARW`、`.SRF`、`.SR2`
- Fujifilm（富士）：`.RAF`
- Olympus（奥林巴斯）：`.ORF`
- Panasonic（松下）：`.RW2`
- Adobe：`.DNG`
- 以及更多格式...

---

## 🌍 国际化

LensLink 支持多种语言：

- 🇬🇧 **English（英语）**
- 🇨🇳 **简体中文**

您可以在设置面板（⚙️）中切换语言。

---

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 开发指南

1. Fork 仓库
2. 创建您的特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交您的更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 打开 Pull Request

---

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Tauri](https://tauri.app/) - 提供出色的跨平台框架
- [libraw](https://www.libraw.org/) - 提供 RAW 文件处理能力
- [Font Awesome](https://fontawesome.com/) - 提供精美图标
- [Tailwind CSS](https://tailwindcss.com/) - 提供实用优先的 CSS 框架

---

## 📧 联系与支持

- **问题反馈**：[GitHub Issues](https://github.com/AGPEIM/lenslink/issues)
- **讨论**：[GitHub Discussions](https://github.com/AGPEIM/lenslink/discussions)

---

<div align="center">

**由摄影师为摄影师用心打造 ❤️**

[⬆ 返回顶部](#lenslink)

</div>
