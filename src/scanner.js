const fs = require('fs');
const path = require('path');

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  '.wma', '.opus', '.aiff', '.aif', '.pcm', '.webm',
]);

function isAudioFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const results = [];

    results.push({
      name: '..',
      path: path.resolve(dirPath, '..'),
      isDirectory: true,
      ext: '',
    });

    const dirs = [];
    const files = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        dirs.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          ext: '',
        });
      } else if (isAudioFile(entry.name)) {
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
          ext: path.extname(entry.name).toLowerCase(),
        });
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return results.concat(dirs, files);
  } catch {
    return [{
      name: '..',
      path: path.resolve(dirPath, '..'),
      isDirectory: true,
      ext: '',
    }];
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

module.exports = { scanDirectory, isAudioFile, formatTime, AUDIO_EXTENSIONS };
