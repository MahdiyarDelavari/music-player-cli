# 🎵 P8 Music Player CLI

A **rich, beautiful terminal music player** built with pure Node.js — **zero npm dependencies**.
Works on macOS, Windows, and Linux.

## ✨ Features

- 🎨 Rich TUI with ANSI colors, gradients, and Unicode icons
- 📊 Real-time audio visualizer with animated wave bars
- 📁 Interactive file browser with directory navigation
- ▶️ Play, pause, stop, next, previous track controls
- 🔊 Volume control with color-coded meter
- 🔁 Repeat modes (Off / All / One)
- 🔀 Shuffle mode
- 📦 Zero dependencies — pure Node.js
- 💻 Cross-platform: macOS, Windows, Linux

## 🚀 Usage

```bash
# Run from the project directory
node src/index.js

# Or specify a directory with music files
node src/index.js /path/to/music
```

## ⌨️ Controls

| Key         | Action              |
|-------------|---------------------|
| `↑` / `↓`  | Navigate file list  |
| `Enter`     | Play / Open folder  |
| `Space`     | Pause / Resume      |
| `S`         | Stop                |
| `N`         | Next track          |
| `P`         | Previous track      |
| `→` / `←`  | Volume up / down    |
| `R`         | Toggle repeat mode  |
| `X`         | Toggle shuffle      |
| `Q`         | Quit                |

## 🎧 Supported Formats

`.mp3` `.wav` `.ogg` `.flac` `.aac` `.m4a` `.wma` `.opus` `.aiff` `.webm`

## 🖥️ Platform Audio Backends

| Platform | Backend                          |
|----------|----------------------------------|
| macOS    | `afplay` (built-in)              |
| Windows  | PowerShell `MediaPlayer` (built-in) |
| Linux    | `aplay` (ALSA, usually pre-installed) |

## 📋 Requirements

- Node.js 14+
- A terminal with Unicode and ANSI color support
- Audio files in supported formats

## 📝 License

MIT
