const os = require('os');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

const C = COLORS;

const ICONS = {
  play: '▶',
  pause: '⏸',
  stop: '⏹',
  next: '⏭',
  prev: '⏮',
  volume: '🔊',
  volumeMute: '🔇',
  music: '♫',
  note: '♪',
  folder: '📁',
  file: '🎵',
  heart: '❤',
  heartEmpty: '♡',
  star: '★',
  starEmpty: '☆',
  dot: '●',
  diamond: '◆',
  arrow: '➤',
  line: '─',
  doubleLine: '═',
  vertLine: '│',
  corner: {
    tl: '╭', tr: '╮', bl: '╰', br: '╯',
    dtl: '╔', dtr: '╗', dbl: '╚', dbr: '╝'
  },
  block: { full: '█', seven: '▉', six: '▊', five: '▋', four: '▌', three: '▍', two: '▎', one: '▏' },
  bar: { h: '━', v: '┃' },
  wave: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
  circle: '◉',
  circleEmpty: '○',
  repeat: '🔁',
  repeatOne: '🔂',
  shuffle: '🔀',
  eq: '🎚',
};

class Renderer {
  constructor() {
    this.updateDimensions();
    this.visualizerBars = [];
    this.frame = 0;
    this.pulsePhase = 0;
    this.statusMessages = [];

    process.stdout.on('resize', () => {
      this.updateDimensions();
    });
  }

  updateDimensions() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
    this.layout = this.calculateLayout();
  }

  calculateLayout() {
    const w = this.width;
    const h = this.height;
    const minWidth = 60;
    const minHeight = 20;

    if (w < minWidth || h < minHeight) {
      return { compact: true, width: w, height: h };
    }

    const margin = Math.max(2, Math.floor(w * 0.05));
    const contentWidth = w - (margin * 2);
    const fileListWidth = Math.floor(contentWidth * 0.4);
    const playerWidth = contentWidth - fileListWidth - 2;

    return {
      compact: false,
      margin,
      contentWidth,
      fileListWidth,
      playerWidth,
      fileListCol: margin,
      playerCol: margin + fileListWidth + 2,
      headerRow: 2,
      fileListRow: 5,
      fileListHeight: Math.max(8, h - 15),
      visualizerRow: 5,
      visualizerHeight: Math.max(6, Math.floor((h - 15) * 0.4)),
      nowPlayingRow: Math.max(12, 5 + Math.floor((h - 15) * 0.4) + 2),
      progressRow: Math.max(16, h - 8),
      volumeRow: Math.max(19, h - 5),
      helpRow: Math.max(21, h - 3),
    };
  }

  clear() {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  moveTo(row, col) {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  write(text) {
    process.stdout.write(text);
  }

  centerText(text, width) {
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
    return ' '.repeat(pad) + text;
  }

  box(row, col, width, height, title, color, style = 'single') {
    const clr = color || C.cyan;
    const corners = style === 'double' ? ICONS.corner : ICONS.corner;
    const line = style === 'double' ? ICONS.doubleLine : ICONS.line;

    // Top border with gradient effect
    this.moveTo(row, col);
    this.write(`${clr}${corners.tl}`);
    for (let i = 0; i < width - 2; i++) {
      const gradientPos = i / (width - 2);
      const gradColor = gradientPos < 0.5 ? clr : C.brightCyan;
      this.write(`${gradColor}${line}`);
    }
    this.write(`${clr}${corners.tr}${C.reset}`);

    if (title) {
      const titleStr = ` ${title} `;
      const titlePos = Math.floor((width - titleStr.length) / 2);
      this.moveTo(row, col + titlePos);
      this.write(`${C.bold}${C.brightWhite}${C.bgBlue}${titleStr}${C.reset}`);
    }

    // Side borders
    for (let i = 1; i < height - 1; i++) {
      this.moveTo(row + i, col);
      this.write(`${clr}${ICONS.vertLine}${C.reset}`);
      this.moveTo(row + i, col + width - 1);
      this.write(`${clr}${ICONS.vertLine}${C.reset}`);
    }

    // Bottom border
    this.moveTo(row + height - 1, col);
    this.write(`${clr}${corners.bl}${line.repeat(width - 2)}${corners.br}${C.reset}`);
  }

  progressBar(row, col, width, percent, elapsedStr, totalStr) {
    const barWidth = width - 2;
    const filled = Math.round(barWidth * Math.min(1, Math.max(0, percent)));
    const empty = barWidth - filled;

    // Animated gradient progress bar
    const gradient = [
      C.brightMagenta,
      C.magenta,
      C.brightBlue,
      C.blue,
      C.brightCyan,
      C.cyan
    ];

    let bar = '';
    for (let i = 0; i < filled; i++) {
      const colorIdx = Math.floor(((i + this.frame * 0.5) / barWidth) * gradient.length) % gradient.length;
      bar += gradient[colorIdx] + ICONS.block.full;
    }

    // Fancy empty part with subtle pattern
    for (let i = 0; i < empty; i++) {
      bar += C.brightBlack + (i % 3 === 0 ? '░' : '▒');
    }
    bar += C.reset;

    this.moveTo(row, col);
    this.write(bar);

    // Time display with icons
    this.moveTo(row + 1, col);
    this.write(`${C.brightCyan}${ICONS.circle}${C.reset} ${C.brightWhite}${elapsedStr || '0:00'}${C.reset}`);

    if (totalStr) {
      const rightPad = col + width - totalStr.length - 3;
      this.moveTo(row + 1, rightPad);
      this.write(`${C.brightWhite}${totalStr}${C.reset} ${C.brightCyan}${ICONS.circleEmpty}${C.reset}`);
    }

    // Progress percentage
    const percentStr = `${Math.round(percent * 100)}%`;
    const centerPos = col + Math.floor(width / 2) - 2;
    this.moveTo(row + 1, centerPos);
    this.write(`${C.dim}${C.brightBlack}${percentStr}${C.reset}`);
  }

  visualizer(row, col, width, height, isPlaying) {
    this.frame++;

    if (this.visualizerBars.length !== width) {
      this.visualizerBars = Array(width).fill(0);
    }

    const barColors = [
      C.brightMagenta,
      C.magenta,
      C.brightBlue,
      C.blue,
      C.brightCyan,
      C.cyan,
      C.brightGreen
    ];

    for (let x = 0; x < width; x++) {
      if (isPlaying) {
        // More complex wave patterns
        const wave1 = Math.sin((this.frame * 0.15) + (x * 0.3)) * 0.35;
        const wave2 = Math.sin((this.frame * 0.08) + (x * 0.5)) * 0.25;
        const wave3 = Math.cos((this.frame * 0.12) + (x * 0.2)) * 0.2;
        const wave4 = Math.sin((this.frame * 0.05) + (x * 0.15)) * 0.15;
        const target = Math.abs(wave1 + wave2 + wave3 + wave4) * height;
        this.visualizerBars[x] += (target - this.visualizerBars[x]) * 0.3;
      } else {
        this.visualizerBars[x] *= 0.9;
      }

      const barHeight = Math.round(this.visualizerBars[x]);
      const colorIdx = Math.floor(((x + this.frame * 0.3) / width) * barColors.length) % barColors.length;
      const barColor = barColors[colorIdx];

      for (let y = 0; y < height; y++) {
        this.moveTo(row + height - 1 - y, col + x);
        if (y < barHeight) {
          // Use wave characters for more detail
          const intensity = Math.min(7, Math.floor((y / barHeight) * 8));
          this.write(`${barColor}${ICONS.wave[intensity]}${C.reset}`);
        } else {
          this.write(' ');
        }
      }
    }

    // Add peak indicators
    if (isPlaying) {
      for (let x = 0; x < width; x += Math.floor(width / 8)) {
        const barHeight = Math.round(this.visualizerBars[x]);
        if (barHeight > 0) {
          this.moveTo(row + height - barHeight - 1, col + x);
          this.write(`${C.brightWhite}${ICONS.dot}${C.reset}`);
        }
      }
    }
  }

  volumeMeter(row, col, volume) {
    const icon = volume === 0 ? ICONS.volumeMute : ICONS.volume;
    const maxBarLen = Math.min(20, Math.floor(this.width * 0.15));
    const barLen = Math.max(5, maxBarLen);
    const filled = Math.round((volume / 100) * barLen);

    this.moveTo(row, col);
    this.write(`${C.brightYellow}${icon} ${C.bold}${C.brightWhite}Volume${C.reset}`);

    this.moveTo(row + 1, col);

    // Fancy volume bar with segments
    let bar = '';
    for (let i = 0; i < barLen; i++) {
      if (i < filled) {
        if (i < barLen * 0.5) {
          bar += `${C.brightGreen}${ICONS.block.full}`;
        } else if (i < barLen * 0.75) {
          bar += `${C.brightYellow}${ICONS.block.full}`;
        } else if (i < barLen * 0.9) {
          bar += `${C.yellow}${ICONS.block.full}`;
        } else {
          bar += `${C.brightRed}${ICONS.block.full}`;
        }
      } else {
        bar += `${C.brightBlack}░`;
      }
    }
    // Add pulsing effect at current volume level
    if (filled > 0 && filled < barLen) {
      const pulse = Math.sin(this.frame * 0.2) > 0 ? ICONS.diamond : ICONS.dot;
      this.moveTo(row + 1, col + filled);
      this.write(`${C.brightWhite}${pulse}${C.reset}`);
    }

    this.moveTo(row + 1, col);
    this.write(bar);

    this.moveTo(row + 1, col + barLen + 2);
    this.write(`${C.bold}${C.brightWhite}${volume}%${C.reset}`);
  }

  fileList(row, col, width, height, files, selectedIndex, scrollOffset) {
    const totalFiles = files.length;
    const hasScroll = totalFiles > height;
    const contentWidth = hasScroll ? width - 2 : width;

    let scrollThumbStart = 0;
    let scrollThumbEnd = 0;
    if (hasScroll) {
      const thumbSize = Math.max(1, Math.round((height / totalFiles) * height));
      scrollThumbStart = Math.round((scrollOffset / totalFiles) * height);
      scrollThumbEnd = Math.min(height - 1, scrollThumbStart + thumbSize - 1);
    }

    for (let i = 0; i < height; i++) {
      const fileIdx = scrollOffset + i;
      this.moveTo(row + i, col);

      if (fileIdx >= totalFiles) {
        this.write(' '.repeat(contentWidth));
        if (hasScroll) {
          this.write(`${C.brightBlack}│${C.reset}`);
        }
        continue;
      }

      const file = files[fileIdx];
      const isSelected = fileIdx === selectedIndex;
      const maxNameLen = contentWidth - 8;
      let name = file.name.length > maxNameLen
        ? file.name.substring(0, maxNameLen - 3) + '...'
        : file.name;

      const icon = file.isDirectory ? ICONS.folder
        : file.isAudio ? ICONS.file
          : '📄';

      const pad = Math.max(0, contentWidth - name.length - 8);

      if (isSelected) {
        // Animated selection with gradient
        const pulse = Math.sin(this.frame * 0.1) * 0.3 + 0.7;
        const arrow = ICONS.arrow;
        this.write(`${C.bgBlue}${C.brightWhite}${C.bold} ${arrow} ${icon} ${name}${' '.repeat(pad)}${C.reset}`);
      } else {
        const clr = file.isDirectory ? C.brightYellow
          : file.isAudio ? C.brightCyan
            : C.brightBlack;
        const prefix = file.isAudio ? `${C.dim}${ICONS.note}${C.reset}` : ' ';
        this.write(`${clr} ${prefix} ${icon} ${name}${' '.repeat(pad)}${C.reset}`);
      }

      if (hasScroll) {
        if (i >= scrollThumbStart && i <= scrollThumbEnd) {
          this.write(`${C.brightCyan}${ICONS.block.full}${C.reset}`);
        } else {
          this.write(`${C.brightBlack}│${C.reset}`);
        }
      }
    }

    // Enhanced pagination info
    if (hasScroll) {
      const currentPage = Math.floor(scrollOffset / height) + 1;
      const totalPages = Math.ceil(totalFiles / height);
      const pageStr = `${C.brightBlack}${ICONS.dot} ${currentPage}/${totalPages} ${C.reset}`;
      this.moveTo(row + height, col + contentWidth - 10);
      this.write(pageStr);
    }
  }

  nowPlaying(row, col, width, trackName, state) {
    const stateIcon = state === 'playing' ? ICONS.play
      : state === 'paused' ? ICONS.pause
        : ICONS.stop;

    const maxLen = width - 10;
    let display = trackName || 'No track loaded';
    if (display.length > maxLen) {
      display = display.substring(0, maxLen - 3) + '...';
    }

    // Animated header
    this.moveTo(row, col);
    const pulse = Math.sin(this.frame * 0.1);
    const headerColor = state === 'playing' ? C.brightMagenta : C.magenta;
    this.write(`${headerColor}${ICONS.music} ${C.bold}${C.brightWhite}Now Playing${C.reset}`);

    // Track display with state indicator
    this.moveTo(row + 1, col);
    const stateColor = state === 'playing' ? C.brightGreen
      : state === 'paused' ? C.brightYellow
        : C.brightBlack;

    this.write(`${stateColor}${stateIcon}${C.reset} ${C.brightWhite}${display}${C.reset}${' '.repeat(Math.max(0, width - display.length - 4))}`);

    // Add subtle animation for playing state
    if (state === 'playing') {
      const notePos = col + width - 4;
      const animNote = this.frame % 20 < 10 ? ICONS.note : ICONS.music;
      this.moveTo(row + 1, notePos);
      this.write(`${C.dim}${C.brightCyan}${animNote}${C.reset}`);
    }
  }

  playbackControls(row, col, width, repeat, shuffle) {
    this.moveTo(row, col);
    const repeatIcon = repeat === 'one' ? ICONS.repeatOne : ICONS.repeat;
    const repeatColor = repeat !== 'off' ? C.brightGreen : C.brightBlack;
    const shuffleColor = shuffle ? C.brightMagenta : C.brightBlack;

    this.write(`${repeatColor}${repeatIcon}${C.reset}  ${shuffleColor}${ICONS.shuffle}${C.reset}  ${C.brightCyan}${ICONS.eq}${C.reset}`);
  }

  header(row, col, width) {
    // Animated title with gradient
    const title = `${ICONS.music} P8 Music Player ${ICONS.music}`;
    const colors = [C.brightMagenta, C.magenta, C.brightBlue, C.brightCyan];
    const colorIdx = Math.floor((this.frame * 0.05) % colors.length);

    const centered = this.centerText(`${C.bold}${colors[colorIdx]}${title}${C.reset}`, width);
    this.moveTo(row, col);
    this.write(centered);

    if (this.height > 22) {
      this.moveTo(row + 1, col);
      const subTitle = '♪ Cross-Platform ♪';
      const subCentered = this.centerText(`${C.dim}${C.brightCyan}${subTitle}${C.reset}`, width);
      this.write(subCentered);
    }
  }

  helpBar(row, col, width) {
    const allKeys = [
      [`${C.bgMagenta}${C.brightWhite} ↑↓ ${C.reset}`, 'Navigate'],
      [`${C.bgBlue}${C.brightWhite} Enter ${C.reset}`, 'Play'],
      [`${C.bgCyan}${C.black} Space ${C.reset}`, 'Pause'],
      [`${C.bgRed}${C.brightWhite} S ${C.reset}`, 'Stop'],
      [`${C.bgGreen}${C.black} N ${C.reset}`, 'Next'],
      [`${C.bgYellow}${C.black} P ${C.reset}`, 'Prev'],
      [`${C.bgBlue}${C.brightWhite} PgUp/Dn ${C.reset}`, 'Page'],
      [`${C.bgBlue}${C.brightWhite} ←→ ${C.reset}`, 'Volume'],
      [`${C.bgRed}${C.brightWhite} Q ${C.reset}`, 'Quit'],
    ];

    const compact = this.width < 80;
    const keysToShow = compact ? allKeys.slice(0, 6) : allKeys;

    let line = '';
    for (const [key, label] of keysToShow) {
      line += `${key} ${C.brightWhite}${label}${C.reset}  `;
    }

    this.moveTo(row, col);
    this.write(this.centerText(line, width));
  }

  statusMessage(row, col, width, message, type) {
    const icons = {
      info: ICONS.circle,
      success: '✓',
      warning: '⚠',
      error: '✗',
    };
    const colors = {
      info: C.brightCyan,
      success: C.brightGreen,
      warning: C.brightYellow,
      error: C.brightRed,
    };
    const clr = colors[type] || colors.info;
    const icon = icons[type] || icons.info;
    const maxLen = width - 4;
    const truncated = message.length > maxLen ? message.substring(0, maxLen - 3) + '...' : message;

    this.moveTo(row, col);
    this.write(`${clr}${icon} ${truncated}${C.reset}${' '.repeat(Math.max(0, width - truncated.length - 2))}`);
  }

  decorativeLine(row, col, width, style = 'wave') {
    this.moveTo(row, col);
    if (style === 'wave') {
      const wave = '~'.repeat(width);
      this.write(`${C.dim}${C.brightBlack}${wave}${C.reset}`);
    } else if (style === 'dots') {
      const dots = '·'.repeat(width);
      this.write(`${C.dim}${C.brightBlack}${dots}${C.reset}`);
    }
  }
}

module.exports = { Renderer, COLORS, ICONS };
