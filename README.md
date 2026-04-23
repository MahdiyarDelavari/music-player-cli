# P8 Music Player CLI 🎵

A feature-rich, beautiful Command Line Interface (CLI) music player built with **pure Node.js**. It has **zero npm dependencies**, making it lightweight and easy to run on any system with Node.js installed.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D12.x-green.svg)
![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)

## ✨ Features

- 🚀 **Zero Dependencies:** No `node_modules` clutter. Just pure Node.js.
- 🎨 **Beautiful TUI:** Rich terminal interface with colors, icons, and a pseudo-visualizer.
- 📊 **Real-time Visualizer:** Animated wave bars for an immersive experience.
- 📁 **File Explorer:** Navigate your local directories and pick music files easily.
- ⏯️ **Playback Controls:** Play, pause, stop, next, and previous track.
- 🔊 **Volume Control:** Adjust volume directly from your keyboard.
- 🔁 **Playback Modes:** Supports Repeat (Off/All/One) and Shuffle modes.
- 💻 **Cross-Platform:** Works on macOS (afplay), Windows (PowerShell/MediaPlayer), and Linux (ffplay, mpv, etc.).
- 🛠️ **Broad Format Support:** Supports `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`, and more.

## 🚀 Installation & Usage

### 1. Clone the repository

```bash
git clone https://github.com/your-username/p8-music-player-cli.git
cd p8-music-player-cli
```

### 2. Run the player

Run in the current directory:

```bash
node src/index.js
```

Or open a specific directory:

```bash
node src/index.js /path/to/your/music
```

### 3. (Optional) Global Command

Link the command to use it anywhere:

```bash
npm link
```

Now you can simply run:

```bash
p8-music [directory]
```

## ⌨️ Keyboard Shortcuts

| Key            | Action                               |
| -------------- | ------------------------------------ |
| `↑` / `↓`      | Navigate file list                   |
| `Enter`        | Select directory or play file        |
| `Space`        | Toggle Play/Pause                    |
| `S`            | Stop playback                        |
| `N`            | Next track                           |
| `P`            | Previous track                       |
| `→` / `←`      | Increase / Decrease Volume           |
| `R`            | Toggle Repeat Mode (Off ➔ All ➔ One) |
| `X`            | Toggle Shuffle Mode                  |
| `Q` / `Ctrl+C` | Quit                                 |

## 🎧 Prerequisites & Backends

| Platform    | Engine                        | Requirement                    |
| ----------- | ----------------------------- | ------------------------------ |
| **macOS**   | `afplay`                      | Built-in                       |
| **Windows** | PowerShell `MediaPlayer`      | Built-in                       |
| **Linux**   | `ffplay`, `mpv`, `cvlc`, etc. | One of these must be installed |

## 🏗️ Architecture

- **`src/index.js`**: Main entry point and application state management.
- **`src/audio.js`**: Cross-platform audio engine wrapper using `child_process`.
- **`src/renderer.js`**: Custom TUI engine for rendering the interface using ANSI escape codes.
- **`src/scanner.js`**: File system utility for scanning and filtering audio files.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
