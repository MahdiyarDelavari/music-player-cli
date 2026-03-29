const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

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
    this.onEndCallback = null;
    this._lastFile = null;
  }

  _buildPsScript(filePath, volume) {
    return [
      '-NoProfile', '-Command',
      `Add-Type -AssemblyName presentationCore;` +
      `$m = New-Object System.Windows.Media.MediaPlayer;` +
      `$m.Open([Uri]"${filePath.replace(/'/g, "''")}");` +
      `$m.Volume = ${volume / 100};` +
      `Start-Sleep -Milliseconds 500;` +
      `$m.Play();` +
      `while($true){` +
        `if([Console]::KeyAvailable -eq $false){` +
          `if($m.NaturalDuration.HasTimeSpan -and $m.Position -ge $m.NaturalDuration.TimeSpan){break};` +
          `Start-Sleep -Milliseconds 100;` +
          `continue` +
        `};` +
        `$cmd=[Console]::ReadLine();` +
        `if($cmd -eq 'STOP'){$m.Stop();$m.Close();break}` +
        `elseif($cmd -eq 'PAUSE'){$m.Pause()}` +
        `elseif($cmd -eq 'RESUME'){$m.Play()}` +
        `elseif($cmd -match '^VOL:'){$m.Volume=[double]$cmd.Substring(4)/100}` +
      `};` +
      `$m.Close()`
    ];
  }

  _findPlayer() {
    if (this.platform === 'darwin') return 'afplay';
    if (this.platform === 'win32') return 'powershell';
    const players = ['ffplay', 'mpv', 'aplay', 'paplay', 'cvlc'];
    for (const player of players) {
      try {
        execSync(`which ${player}`, { stdio: 'ignore' });
        return player;
      } catch {}
    }
    return 'aplay';
  }

  _spawnPlayer(filePath) {
    const resolved = path.resolve(filePath);

    switch (this.platform) {
      case 'win32':
        return spawn('powershell', this._buildPsScript(resolved, this.volume), {
          stdio: ['pipe', 'ignore', 'ignore'],
          windowsHide: true
        });

      case 'darwin': {
        const vol = (this.volume / 100).toFixed(2);
        return spawn('afplay', ['-v', vol, resolved], {
          stdio: ['pipe', 'ignore', 'ignore']
        });
      }

      default: {
        const player = this._findPlayer();
        if (player === 'ffplay') {
          const vol = Math.round(this.volume * 2.56);
          return spawn('ffplay', ['-nodisp', '-autoexit', '-volume', String(vol), resolved], {
            stdio: ['pipe', 'ignore', 'ignore']
          });
        }
        if (player === 'mpv') {
          return spawn('mpv', ['--no-video', `--volume=${this.volume}`, resolved], {
            stdio: ['pipe', 'ignore', 'ignore']
          });
        }
        if (player === 'cvlc') {
          const gain = (this.volume / 100 * 2).toFixed(2);
          return spawn('cvlc', ['--play-and-exit', `--gain=${gain}`, resolved], {
            stdio: ['pipe', 'ignore', 'ignore']
          });
        }
        return spawn(player, [resolved], {
          stdio: ['pipe', 'ignore', 'ignore']
        });
      }
    }
  }

  play(filePath, onEnd) {
    this.stop();
    this.currentFile = filePath;
    this._lastFile = filePath;
    this.onEndCallback = onEnd || null;

    try {
      this.process = this._spawnPlayer(filePath);
      this.playing = true;
      this.paused = false;
      this.startTime = Date.now();
      this.elapsed = 0;

      this.process.on('close', () => {
        if (this.playing) {
          this.playing = false;
          this.paused = false;
          this.process = null;
          if (this.onEndCallback) this.onEndCallback();
        }
      });

      this.process.on('error', (err) => {
        this.playing = false;
        this.process = null;
      });
    } catch (err) {
      this.playing = false;
    }
  }

  stop() {
    this.playing = false;
    this.paused = false;
    this.onEndCallback = null;

    if (this.process) {
      if (this.platform === 'win32') {
        try { this.process.stdin.write('STOP\n'); } catch {}
      }

      try {
        this.process.kill('SIGTERM');
      } catch {}

      if (this.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t'],
            { stdio: 'ignore', windowsHide: true });
        }
        catch {}
      }

      this.process = null;
    }

    this.elapsed = 0;
    this.startTime = 0;
  }

  pause() {
    if (!this.playing || this.paused) return;

    if (this.platform === 'win32') {
      if (this.process && this.process.stdin.writable) {
        try { this.process.stdin.write('PAUSE\n'); } catch {}
      }
    } else {
      if (this.process) {
        this.process.kill('SIGSTOP');
      }
    }

    this.paused = true;
    this.elapsed += Date.now() - this.startTime;
  }

  resume() {
    if (!this.paused) return;

    if (this.platform === 'win32') {
      if (this.process && this.process.stdin.writable) {
        try { this.process.stdin.write('RESUME\n'); } catch {}
      }
    } else {
      if (this.process) {
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
    const newVol = Math.max(0, Math.min(100, vol));
    this.volume = newVol;

    if (this.platform === 'win32' && this.process && this.process.stdin.writable) {
      try { this.process.stdin.write(`VOL:${newVol}\n`); } catch {}
    }

    if (this.platform !== 'win32' && this.platform !== 'darwin' && this.playing && !this.paused) {
      const cb = this.onEndCallback;
      this.stop();
      if (this._lastFile) {
        this.play(this._lastFile, cb);
      }
    }
  }
}

module.exports = AudioEngine;
