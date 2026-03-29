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
  star: '★',
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
};

class Renderer {
  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
    this.visualizerBars = [];
    this.frame = 0;

    process.stdout.on('resize', () => {
      this.width = process.stdout.columns || 80;
      this.height = process.stdout.rows || 24;
    });
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

  box(row, col, width, height, title, color) {
    const clr = color || C.cyan;
    this.moveTo(row, col);
    this.write(`${clr}${ICONS.corner.tl}${ICONS.line.repeat(width - 2)}${ICONS.corner.tr}${C.reset}`);

    if (title) {
      const titleStr = ` ${title} `;
      const titlePos = Math.floor((width - titleStr.length) / 2);
      this.moveTo(row, col + titlePos);
      this.write(`${C.bold}${clr}${titleStr}${C.reset}`);
    }

    for (let i = 1; i < height - 1; i++) {
      this.moveTo(row + i, col);
      this.write(`${clr}${ICONS.vertLine}${C.reset}`);
      this.moveTo(row + i, col + width - 1);
      this.write(`${clr}${ICONS.vertLine}${C.reset}`);
    }

    this.moveTo(row + height - 1, col);
    this.write(`${clr}${ICONS.corner.bl}${ICONS.line.repeat(width - 2)}${ICONS.corner.br}${C.reset}`);
  }

  progressBar(row, col, width, percent, elapsedStr, totalStr) {
    const barWidth = width - 2;
    const filled = Math.round(barWidth * Math.min(1, Math.max(0, percent)));
    const empty = barWidth - filled;

    const gradient = [C.brightCyan, C.cyan, C.brightBlue, C.blue, C.brightMagenta];

    let bar = '';
    for (let i = 0; i < filled; i++) {
      const colorIdx = Math.floor((i / barWidth) * gradient.length);
      bar += gradient[Math.min(colorIdx, gradient.length - 1)] + ICONS.block.full;
    }
    bar += C.brightBlack + '░'.repeat(empty) + C.reset;

    this.moveTo(row, col);
    this.write(bar);

    this.moveTo(row + 1, col);
    this.write(`${C.brightWhite}${elapsedStr || '0:00'}${C.reset}`);

    if (totalStr) {
      const rightPad = col + width - totalStr.length - 1;
      this.moveTo(row + 1, rightPad);
      this.write(`${C.brightWhite}${totalStr}${C.reset}`);
    }
  }

  visualizer(row, col, width, height, isPlaying) {
    this.frame++;

    if (this.visualizerBars.length !== width) {
      this.visualizerBars = Array(width).fill(0);
    }

    const barColors = [C.brightCyan, C.cyan, C.brightBlue, C.blue, C.brightMagenta, C.magenta];

    for (let x = 0; x < width; x++) {
      if (isPlaying) {
        const wave = Math.sin((this.frame * 0.15) + (x * 0.3)) * 0.4;
        const wave2 = Math.sin((this.frame * 0.08) + (x * 0.5)) * 0.3;
        const wave3 = Math.cos((this.frame * 0.12) + (x * 0.2)) * 0.2;
        const target = Math.abs(wave + wave2 + wave3) * height;
        this.visualizerBars[x] += (target - this.visualizerBars[x]) * 0.3;
      } else {
        this.visualizerBars[x] *= 0.9;
      }

      const barHeight = Math.round(this.visualizerBars[x]);
      const colorIdx = Math.floor((x / width) * barColors.length);
      const barColor = barColors[Math.min(colorIdx, barColors.length - 1)];

      for (let y = 0; y < height; y++) {
        this.moveTo(row + height - 1 - y, col + x);
        if (y < barHeight) {
          this.write(`${barColor}${ICONS.block.full}${C.reset}`);
        } else {
          this.write(' ');
        }
      }
    }
  }

  volumeMeter(row, col, volume) {
    const icon = volume === 0 ? ICONS.volumeMute : ICONS.volume;
    const barLen = 15;
    const filled = Math.round((volume / 100) * barLen);

    this.moveTo(row, col);
    this.write(`${C.brightYellow}${icon} ${C.reset}`);

    let bar = '';
    for (let i = 0; i < barLen; i++) {
      if (i < filled) {
        if (i < barLen * 0.6) bar += `${C.brightGreen}${ICONS.block.full}`;
        else if (i < barLen * 0.85) bar += `${C.brightYellow}${ICONS.block.full}`;
        else bar += `${C.brightRed}${ICONS.block.full}`;
      } else {
        bar += `${C.brightBlack}░`;
      }
    }
    this.write(`${bar}${C.reset} ${C.brightWhite}${volume}%${C.reset}`);
  }

  fileList(row, col, width, height, files, selectedIndex, scrollOffset) {
    for (let i = 0; i < height; i++) {
      const fileIdx = scrollOffset + i;
      this.moveTo(row + i, col);

      if (fileIdx >= files.length) {
        this.write(' '.repeat(width));
        continue;
      }

      const file = files[fileIdx];
      const isSelected = fileIdx === selectedIndex;
      const maxNameLen = width - 6;
      let name = file.name.length > maxNameLen
        ? file.name.substring(0, maxNameLen - 3) + '...'
        : file.name;

      const icon = file.isDirectory ? ICONS.folder : ICONS.file;

      if (isSelected) {
        this.write(`${C.bgBlue}${C.brightWhite}${C.bold} ${ICONS.arrow} ${icon} ${name}${' '.repeat(Math.max(0, width - name.length - 6))}${C.reset}`);
      } else {
        const clr = file.isDirectory ? C.brightYellow : C.brightWhite;
        this.write(`${clr}   ${icon} ${name}${' '.repeat(Math.max(0, width - name.length - 6))}${C.reset}`);
      }
    }
  }

  nowPlaying(row, col, width, trackName, state) {
    const stateIcon = state === 'playing' ? ICONS.play
      : state === 'paused' ? ICONS.pause
      : ICONS.stop;

    const maxLen = width - 8;
    let display = trackName || 'No track loaded';
    if (display.length > maxLen) {
      display = display.substring(0, maxLen - 3) + '...';
    }

    this.moveTo(row, col);
    this.write(`${C.brightMagenta}${ICONS.music} ${C.bold}${C.brightWhite}Now Playing${C.reset}`);

    this.moveTo(row + 1, col);
    this.write(`${C.brightCyan}${stateIcon} ${C.brightWhite}${display}${C.reset}${' '.repeat(Math.max(0, width - display.length - 4))}`);
  }

  header(row, col, width) {
    const title = `${ICONS.music} P8 Music Player ${ICONS.music}`;
    const centered = this.centerText(`${C.bold}${C.brightCyan}${title}${C.reset}`, width);
    this.moveTo(row, col);
    this.write(centered);

    this.moveTo(row + 1, col);
    const subTitle = 'Pure Node.js • Zero Dependencies • Cross-Platform';
    const subCentered = this.centerText(`${C.dim}${C.brightWhite}${subTitle}${C.reset}`, width);
    this.write(subCentered);
  }

  helpBar(row, col, width) {
    const keys = [
      [`${C.bgBlue}${C.brightWhite} ↑↓ ${C.reset}`, 'Navigate'],
      [`${C.bgBlue}${C.brightWhite} Enter ${C.reset}`, 'Play'],
      [`${C.bgBlue}${C.brightWhite} Space ${C.reset}`, 'Pause'],
      [`${C.bgBlue}${C.brightWhite} S ${C.reset}`, 'Stop'],
      [`${C.bgBlue}${C.brightWhite} ←→ ${C.reset}`, 'Volume'],
      [`${C.bgBlue}${C.brightWhite} Q ${C.reset}`, 'Quit'],
    ];

    let line = '';
    for (const [key, label] of keys) {
      line += `${key} ${C.brightWhite}${label}${C.reset}  `;
    }

    this.moveTo(row, col);
    this.write(this.centerText(line, width));
  }

  statusMessage(row, col, width, message, type) {
    const colors = {
      info: C.brightCyan,
      success: C.brightGreen,
      warning: C.brightYellow,
      error: C.brightRed,
    };
    const clr = colors[type] || colors.info;
    this.moveTo(row, col);
    this.write(`${clr}${message}${C.reset}${' '.repeat(Math.max(0, width - message.length))}`);
  }
}

module.exports = { Renderer, COLORS, ICONS };
