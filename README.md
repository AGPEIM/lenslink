# LensLink

<div align="center">

![Logo](docs/assets/image.png)

![LensLink Logo](https://img.shields.io/badge/LensLink-Photography%20Workflow-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik05IDJMNy4xNyA0SDRjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoMTZjMS4xIDAgMi0uOSAyLTJWNmMwLTEuMS0uOS0yLTItMmgtMy4xN0wxNSAySDl6bTMgMTVjLTIuNzYgMC01LTIuMjQtNS01czIuMjQtNSA1LTUgNSAyLjI0IDUgNS0yLjI0IDUtNSA1eiIvPjwvc3ZnPg==)

**A Modern Photo Culling and RAW Workflow Management Tool**

[English](#-features) | [中文文档](./docs/README_CN.md)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](.)
[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](.)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?style=flat-square&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-CE412B?style=flat-square&logo=rust)](https://www.rust-lang.org/)

</div>

---

## 📸 Overview

**LensLink** is a powerful desktop application designed for photographers who shoot in RAW+JPG mode. It streamlines the photo culling process with an intuitive interface, allowing you to quickly review, rate, and organize your photos with EXIF metadata extraction, RAW file preview, and efficient batch operations.



### Why LensLink?

- 🎯 **Smart Photo Grouping** - Automatically pairs RAW and JPG files with the same base name
- ⚡ **Lightning Fast Culling** - Keyboard shortcuts for rapid photo selection (P/X/U)
- 🔍 **RAW Preview Support** - View RAW files directly with WebAssembly-powered decoding
- 📊 **EXIF Data Display** - Complete metadata viewing including camera settings and lens information
- 🎨 **Modern UI/UX** - Beautiful dark/light themes with smooth animations
- 🌐 **Multilingual** - Supports English and Chinese interfaces
- 💾 **Non-Destructive** - All operations preserve original files until you're ready to export

---

![alt text](docs/assets/interface.png)

## ✨ Features

### 🖼️ Intelligent Photo Management

- **Automatic Grouping**: Pairs RAW and JPG files by filename
- **Status Indicators**: Visual badges for complete pairs, JPG-only, or RAW-only files
- **Flexible Import**: Support for both individual files and folder imports
- **Orphan Detection**: Identifies unpaired files for cleanup

### 🎬 Professional Viewer

- **Zoom & Pan**: Mouse wheel zoom (10%-1000%) with drag support
- **RAW Decoding**: Native support for CR2, NEF, ARW, DNG, and more formats
- **EXIF Display**: Shutter speed, aperture, ISO, focal length, camera model, lens, timestamp
- **Quick Rating**: Keyboard shortcuts for Pick (P), Reject (X), Unmark (U)
- **Smooth Navigation**: Arrow keys and filmstrip for browsing

### 🚀 Batch Operations

- **Smart Export**: Export picked/rejected photos with multiple modes
  - Both RAW + JPG
  - RAW only
  - JPG only
- **Safe Delete**: Move rejected photos to system trash with confirmation
- **Orphan Cleanup**: Bulk delete unpaired RAW or JPG files
- **Copy or Move**: Choose between copying or moving files during export

### 🎨 User Experience

- **Themes**: Dark and light mode with system preference detection
- **Responsive Layout**: Optimized for different screen sizes
- **Window Management**: Custom titlebar with minimize, maximize, and close controls
- **Settings Panel**: Customize language and theme preferences
- **Keyboard Navigation**: Full keyboard support for efficient workflow

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript 5.6
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 3.4
- **Icons**: Font Awesome 7.1
- **RAW Processing**: libraw-wasm 1.1

### Backend
- **Runtime**: Tauri 2.0
- **Language**: Rust 2021 Edition
- **EXIF Parsing**: kamadak-exif 0.5
- **File Operations**: tauri-plugin-fs, tauri-plugin-dialog
- **State Management**: tauri-plugin-window-state

---

## 📦 Installation

### Download Pre-built Binaries

Download the latest release for your platform:

- **Windows**: `LensLink_x64_setup.exe`
- **macOS**: `LensLink_aarch64.dmg` (Apple Silicon) / `LensLink_x64.dmg` (Intel)
- **Linux**: `LensLink_amd64.AppImage` or `.deb`

👉 [Download from Releases](https://github.com/AGPEIM/lenslink/releases)

### Build from Source

#### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+
- **Tauri CLI**

#### Steps

```bash
# Clone the repository
git clone https://github.com/AGPEIM/lenslink.git
cd lenslink

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

---

## 🚀 Quick Start

### 1. Import Photos

Click the **Import Folder** button or use the file picker to load your RAW+JPG photos.

### 2. Review & Rate

- Use **Arrow Keys** (← →) to navigate between photos
- Press **P** to mark as Pick (keep)
- Press **X** to mark as Reject (delete later)
- Press **U** to Unmark
- Use mouse wheel to **zoom** in/out

### 3. Filter & Sort

Use the filter buttons to view:
- **All Photos**: Complete overview
- **Picked**: Photos marked for keeping
- **Rejected**: Photos marked for deletion
- **Unmarked**: Photos not yet rated
- **Orphans**: Unpaired RAW or JPG files

### 4. Export or Delete

- **Export Picked**: Save selected photos to a destination folder
- **Delete Rejected**: Move rejected photos to trash
- **Cleanup Orphans**: Remove unpaired files

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `P` | Mark current photo as **Picked** |
| `X` | Mark current photo as **Rejected** |
| `U` | **Unmark** current photo |
| `←` | Navigate to **previous** photo |
| `→` | Navigate to **next** photo |
| `Mouse Wheel` | **Zoom** in/out |
| `Double Click` | **Reset** zoom |
| `Drag` | Pan when zoomed in |

---

## 📊 Supported RAW Formats

LensLink supports a wide range of RAW formats through `libraw`:

- Canon: `.CR2`, `.CR3`
- Nikon: `.NEF`, `.NRW`
- Sony: `.ARW`, `.SRF`, `.SR2`
- Fujifilm: `.RAF`
- Olympus: `.ORF`
- Panasonic: `.RW2`
- Adobe: `.DNG`
- And many more...

---

## 🌍 Internationalization

LensLink supports multiple languages:

- 🇬🇧 **English**
- 🇨🇳 **简体中文**

You can switch languages in the Settings panel (⚙️).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - For the amazing cross-platform framework
- [libraw](https://www.libraw.org/) - For RAW file processing capabilities
- [Font Awesome](https://fontawesome.com/) - For beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/AGPEIM/lenslink/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AGPEIM/lenslink/discussions)

---

<div align="center">

**Made with ❤️ by photographers, for photographers**

[⬆ Back to Top](#lenslink)

</div>
