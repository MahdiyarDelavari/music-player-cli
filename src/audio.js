const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class AudioEngine {
  constructor() {
    this.process = null;
    this.playing = false;
    this.paused = false;
    this.currentFile = null;
    this.volume = 80;
    this.platform = os.platform();
    this.startTime = 0;
    this.pausedAt = 0;
    this.elapsed = 0;
  }

  getPlayerCommand(filePath) {
    switch (this.platform) {
      case 'win32':
        return {
          cmd: 'powershell',
          args: [
            '-NoProfile', '-Command',
            `Add-Type -AssemblyName presentationCore; ` +
            `$player = New-Object System.Windows.Media.MediaPlayer; ` +
            `$player.Open([Uri]"${filePath.replace(/\\/g, '\\\\')}"); ` +
            `$player.Volume = ${this.volume / 100}; ` +
            `$player.Play(); ` +
            `Start-Sleep -Seconds 1; ` +
            `while($player.NaturalDuration.HasTimeSpan -eq $false -or ` +
            `$player.Position -lt $player.NaturalDuration.TimeSpan) { ` +
            `Start-Sleep -Milliseconds 200 }; ` +
            `$player.Close()`
          ]
        };
      case 'darwin':
        return { cmd: 'afplay', args: ['-v', String(this.volume / 100), filePath] };
      default:
        return { cmd: 'aplay', args: [filePath] };
    }
  }

  play(filePath, onEnd) {
    this.stop();
    this.currentFile = filePath;
    const { cmd, args } = this.getPlayerCommand(path.resolve(filePath));

    try {
      this.process = spawn(cmd, args, { stdio: 'ignore', windowsHide: true });
      this.playing = true;
      this.paused = false;
      this.startTime = Date.now();
      this.elapsed = 0;

      this.process.on('close', (code) => {
        if (this.playing) {
          this.playing = false;
          this.paused = false;
          if (onEnd) onEnd();
        }
      });

      this.process.on('error', () => {
        this.playing = false;
      });
    } catch {
      this.playing = false;
    }
  }

  stop() {
    if (this.process) {
      try {
        if (this.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t'], {
            stdio: 'ignore', windowsHide: true
          });
        } else {
          this.process.kill('SIGKILL');
        }
      } catch {}
      this.process = null;
    }
    this.playing = false;
    this.paused = false;
    this.elapsed = 0;
    this.startTime = 0;
  }

  pause() {
    if (!this.playing || this.paused) return;
    if (this.process) {
      if (this.platform !== 'win32') {
        this.process.kill('SIGSTOP');
      }
    }
    this.paused = true;
    this.elapsed += Date.now() - this.startTime;
  }

  resume() {
    if (!this.paused) return;
    if (this.process) {
      if (this.platform !== 'win32') {
        this.process.kill('SIGCONT');
      }
    }
    this.paused = false;
    this.startTime = Date.now();
  }

  getElapsed() {
    if (!this.playing) return 0;
    if (this.paused) return this.elapsed;
    return this.elapsed + (Date.now() - this.startTime);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
  }
}

module.exports = AudioEngine;
