#!/usr/bin/env node

const path = require('path');
const os = require('os');
const AudioEngine = require('./audio');
const { Renderer, COLORS: C, ICONS } = require('./renderer');
const { scanDirectory, formatTime } = require('./scanner');

class MusicPlayer {
  constructor() {
    this.audio = new AudioEngine();
    this.renderer = new Renderer();
    this.currentDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
    this.files = [];
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.statusMsg = { text: 'Welcome to P8 Music Player!', type: 'info' };
    this.running = true;
    this.renderInterval = null;
    this.playlist = [];
    this.playlistIndex = -1;
    this.repeatMode = 'none';
    this.shuffleMode = false;
  }

  start() {
    this.loadDirectory(this.currentDir);
    this.setupInput();
    this.renderer.hideCursor();
    this.renderer.clear();
    this.render();

    this.renderInterval = setInterval(() => {
      if (this.running) this.render();
    }, 100);

    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => { this.cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { this.cleanup(); process.exit(0); });
  }

  cleanup() {
    this.running = false;
    if (this.renderInterval) clearInterval(this.renderInterval);
    this.audio.stop();
    this.renderer.showCursor();
    this.renderer.clear();
    this.renderer.moveTo(1, 1);
    this.renderer.write(`${C.brightCyan}${ICONS.music} Thanks for using P8 Music Player! ${ICONS.music}${C.reset}\n`);
  }

  loadDirectory(dirPath) {
    try {
      this.currentDir = path.resolve(dirPath);
      this.files = scanDirectory(this.currentDir);
      this.selectedIndex = 0;
      this.scrollOffset = 0;
      this.buildPlaylist();
    } catch {
      this.statusMsg = { text: 'Cannot access directory', type: 'error' };
    }
  }

  buildPlaylist() {
    this.playlist = this.files.filter(f => f.isAudio);
  }

  setupInput() {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', (key) => {
      if (!this.running) return;

      switch (key) {
        case 'q':
        case 'Q':
        case '\x03':
          this.running = false;
          this.cleanup();
          process.exit(0);
          break;

        case '\x1b[A':
          this.navigateUp();
          break;

        case '\x1b[B':
          this.navigateDown();
          break;

        case '\x1b[5~':
          this.pageUp();
          break;

        case '\x1b[6~':
          this.pageDown();
          break;

        case '\x1b[H':
        case '\x1b[1~':
          this.goHome();
          break;

        case '\x1b[F':
        case '\x1b[4~':
          this.goEnd();
          break;

        case '\x1b[C':
          this.volumeUp();
          break;

        case '\x1b[D':
          this.volumeDown();
          break;

        case '\r':
        case '\n':
          this.selectItem();
          break;

        case ' ':
          this.togglePause();
          break;

        case 's':
        case 'S':
          this.stopPlayback();
          break;

        case 'n':
        case 'N':
          this.nextTrack();
          break;

        case 'p':
        case 'P':
          this.prevTrack();
          break;

        case 'r':
        case 'R':
          this.toggleRepeat();
          break;

        case 'x':
        case 'X':
          this.toggleShuffle();
          break;

        default:
          break;
      }
    });
  }

  navigateUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      if (this.selectedIndex < this.scrollOffset) {
        this.scrollOffset = this.selectedIndex;
      }
    }
  }

  navigateDown() {
    if (this.selectedIndex < this.files.length - 1) {
      this.selectedIndex++;
      const listHeight = this.getListHeight();
      if (this.selectedIndex >= this.scrollOffset + listHeight) {
        this.scrollOffset = this.selectedIndex - listHeight + 1;
      }
    }
  }

  pageUp() {
    const listHeight = this.getListHeight();
    this.selectedIndex = Math.max(0, this.selectedIndex - listHeight);
    this.scrollOffset = Math.max(0, this.scrollOffset - listHeight);
  }

  pageDown() {
    const listHeight = this.getListHeight();
    const maxIdx = this.files.length - 1;
    this.selectedIndex = Math.min(maxIdx, this.selectedIndex + listHeight);
    const maxScroll = Math.max(0, this.files.length - listHeight);
    this.scrollOffset = Math.min(maxScroll, this.scrollOffset + listHeight);
  }

  goHome() {
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  goEnd() {
    const listHeight = this.getListHeight();
    this.selectedIndex = this.files.length - 1;
    this.scrollOffset = Math.max(0, this.files.length - listHeight);
  }

  getListHeight() {
    return Math.max(5, this.renderer.height - 22);
  }

  selectItem() {
    const item = this.files[this.selectedIndex];
    if (!item) return;

    if (item.isDirectory) {
      this.loadDirectory(item.path);
      this.statusMsg = { text: `Opened: ${path.basename(item.path)}`, type: 'info' };
    } else if (!item.isAudio) {
      this.statusMsg = { text: `Not an audio file: ${item.name}`, type: 'warning' };
    } else {
      this.playFile(item);
    }
  }

  playFile(fileItem) {
    const idx = this.playlist.findIndex(f => f.path === fileItem.path);
    if (idx !== -1) this.playlistIndex = idx;

    this.audio.play(fileItem.path, () => {
      if (this.running) this.onTrackEnd();
    });

    this.statusMsg = {
      text: `${ICONS.play} Playing: ${fileItem.name}`,
      type: 'success'
    };
  }

  togglePause() {
    if (this.audio.playing && !this.audio.paused) {
      this.audio.pause();
      this.statusMsg = { text: `${ICONS.pause} Paused`, type: 'warning' };
    } else if (this.audio.paused) {
      this.audio.resume();
      this.statusMsg = { text: `${ICONS.play} Resumed`, type: 'success' };
    }
  }

  stopPlayback() {
    this.audio.stop();
    this.statusMsg = { text: `${ICONS.stop} Stopped`, type: 'info' };
  }

  nextTrack() {
    if (this.playlist.length === 0) return;
    if (this.shuffleMode) {
      this.playlistIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;
    }
    this.playFile(this.playlist[this.playlistIndex]);
  }

  prevTrack() {
    if (this.playlist.length === 0) return;
    if (this.shuffleMode) {
      this.playlistIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.playlistIndex = (this.playlistIndex - 1 + this.playlist.length) % this.playlist.length;
    }
    this.playFile(this.playlist[this.playlistIndex]);
  }

  onTrackEnd() {
    if (this.repeatMode === 'one' && this.playlistIndex >= 0) {
      this.playFile(this.playlist[this.playlistIndex]);
    } else if (this.repeatMode === 'all' || this.playlistIndex < this.playlist.length - 1) {
      this.nextTrack();
    } else {
      this.statusMsg = { text: 'Playlist finished', type: 'info' };
    }
  }

  volumeUp() {
    this.audio.setVolume(this.audio.volume + 5);
    this.statusMsg = { text: `${ICONS.volume} Volume: ${this.audio.volume}%`, type: 'info' };
  }

  volumeDown() {
    this.audio.setVolume(this.audio.volume - 5);
    const icon = this.audio.volume === 0 ? ICONS.volumeMute : ICONS.volume;
    this.statusMsg = { text: `${icon} Volume: ${this.audio.volume}%`, type: 'info' };
  }

  toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const idx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(idx + 1) % modes.length];
    const labels = { none: 'Off', all: 'All', one: 'One' };
    this.statusMsg = { text: `Repeat: ${labels[this.repeatMode]}`, type: 'info' };
  }

  toggleShuffle() {
    this.shuffleMode = !this.shuffleMode;
    this.statusMsg = {
      text: `Shuffle: ${this.shuffleMode ? 'On' : 'Off'}`,
      type: 'info'
    };
  }

  render() {
    const width = this.renderer.width;
    const height = this.renderer.height;

    if (width < 40 || height < 15) {
      this.renderer.clear();
      this.renderer.moveTo(1, 1);
      this.renderer.write(`${C.brightRed}Terminal too small! Need 40x15+${C.reset}`);
      return;
    }

    let row = 1;

    this.renderer.header(row, 1, width);
    row += 3;

    this.renderer.moveTo(row, 1);
    this.renderer.write(`${C.brightBlack}${'─'.repeat(width)}${C.reset}`);
    row += 1;

    const trackName = this.audio.currentFile
      ? path.basename(this.audio.currentFile)
      : null;
    const state = this.audio.playing
      ? (this.audio.paused ? 'paused' : 'playing')
      : 'stopped';

    this.renderer.nowPlaying(row, 3, width - 4, trackName, state);
    row += 3;

    const elapsed = this.audio.getElapsed();
    const elapsedStr = formatTime(elapsed);
    const estimatedDuration = Math.max(elapsed, 180000);
    const percent = this.audio.playing ? (elapsed / estimatedDuration) : 0;
    this.renderer.progressBar(row, 3, width - 4, percent, elapsedStr, '~');
    row += 3;

    const vizHeight = Math.min(6, Math.max(3, Math.floor(height * 0.15)));
    const vizWidth = Math.min(width - 6, 60);
    const vizCol = Math.floor((width - vizWidth) / 2) + 1;
    this.renderer.visualizer(row, vizCol, vizWidth, vizHeight, this.audio.playing && !this.audio.paused);
    row += vizHeight + 1;

    this.renderer.volumeMeter(row, 3, this.audio.volume);

    const repeatLabel = this.repeatMode === 'none' ? 'Off'
      : this.repeatMode === 'all' ? 'All' : 'One';
    const modeStr = `${C.brightBlack}Repeat: ${C.brightWhite}${repeatLabel}${C.reset}  ${C.brightBlack}Shuffle: ${C.brightWhite}${this.shuffleMode ? 'On' : 'Off'}${C.reset}`;
    const modeCol = Math.max(30, width - 35);
    this.renderer.moveTo(row, modeCol);
    this.renderer.write(modeStr);
    row += 2;

    this.renderer.moveTo(row, 1);
    this.renderer.write(`${C.brightBlack}${'─'.repeat(width)}${C.reset}`);
    row += 1;

    const dirDisplay = this.currentDir.length > width - 10
      ? '...' + this.currentDir.slice(-(width - 13))
      : this.currentDir;
    this.renderer.moveTo(row, 3);
    this.renderer.write(`${C.brightYellow}${ICONS.folder} ${C.brightWhite}${dirDisplay}${C.reset}${' '.repeat(Math.max(0, width - dirDisplay.length - 6))}`);
    row += 1;

    const listHeight = Math.max(3, height - row - 5);
    this.renderer.fileList(row, 2, width - 3, listHeight, this.files, this.selectedIndex, this.scrollOffset);
    row += listHeight + 1;

    this.renderer.moveTo(row, 1);
    this.renderer.write(`${C.brightBlack}${'─'.repeat(width)}${C.reset}`);
    row += 1;

    const audioCount = this.playlist.length;
    const totalCount = this.files.length - 1;
    const countStr = `${totalCount} items, ${audioCount} audio`;
    this.renderer.statusMessage(row, 3, width - 4, `${this.statusMsg.text}  ${C.brightBlack}(${countStr})`, this.statusMsg.type);
    row += 1;

    if (row + 1 < height) {
      this.renderer.helpBar(row, 1, width);
      row += 2;
    }
  }
}

const player = new MusicPlayer();
player.start();
