# Installation Guide – Roman Numerals v2

## Option A: Web Dev (npm + local server)

### Requirements
- Node 18+ (download from [nodejs.org](https://nodejs.org))
- Serato DJ Pro (running, with logging enabled)
- Git (optional, for cloning)

### Steps

1. **Clone repo** (or extract ZIP)
   ```bash
   git clone https://github.com/randyromanmusic/roman-numerals.git
   cd roman-numerals
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Serato log path** (if needed)
   - Edit `src/core/engine.ts` line ~15
   - Change `serato_log_path` to your Serato install
   - Default macOS: `/Users/[YOU]/.serato/Serato DJ/History/session.log`
   - Windows: `C:\Users\[YOU]\AppData\Roaming\.serato\Serato DJ\History\session.log`

4. **Start dev server**
   ```bash
   npm run dev
   ```
   - Opens automatically at `http://localhost:5173`
   - Hot reload on file changes
   - Press `q` to stop

5. **Keep Serato running** in another window
   - Roman Numerals polls live logs
   - No connection needed; pure file polling

---

## Option B: Electron App (macOS / Windows)

### Requirements
- Serato DJ Pro (running)
- macOS 10.13+ or Windows 10+

### Download & Install

1. **Download latest release**
   - Go to [GitHub Releases](https://github.com/randyromanmusic/roman-numerals/releases)
   - macOS: `Roman-Numerals-2.0.0.dmg`
   - Windows: `Roman-Numerals-Setup-2.0.0.exe`

2. **Install**
   - **macOS:** Double-click `.dmg` → drag app to Applications folder
   - **Windows:** Run `.exe` → follow installer → click finish

3. **Launch**
   - **macOS:** Open Applications → double-click "Roman Numerals"
   - **Windows:** Click Start → search "Roman Numerals" → open

4. **First run**
   - App auto-detects Serato logs
   - If no tracks show, check Serato is running
   - See Troubleshooting below

---

## Troubleshooting

### "Engine Error" in UI

**Check Serato is running:**
- macOS: `ps aux | grep Serato`
- Windows: Task Manager → search "Serato"

**Check log path exists:**
- macOS: Open Finder → press Cmd+Shift+G → paste:
  ```
  ~/.serato/Serato DJ/History/
  ```
- Windows: Open File Explorer → address bar:
  ```
  %APPDATA%\.serato\Serato DJ\History\
  ```

**Verify drives mounted:**
- macOS: `ls /Volumes/`
- Windows: Check File Explorer for drives named "Audio", "VIDEO", etc

### No tracks loading

1. Check all 4 drives are mounted:
   - `/Volumes/Audio`
   - `/Volumes/VIDEO`
   - (add more as needed in `src/core/engine.ts`)

2. Verify Serato .crate files exist:
   - macOS: `~/.serato/Serato DJ/Crates/`
   - Windows: `%APPDATA%\.serato\Serato DJ\Crates\`

3. If custom drive names: edit `engine.ts` drives config

### App crashes on startup

**macOS:** Check console logs:
```bash
open ~/Library/Logs/Roman\ Numerals/
```

**Windows:** Check `%APPDATA%/Roman Numerals/logs/`

Report errors to [Issues](https://github.com/randyromanmusic/roman-numerals/issues)

---

## Development

### Build Electron app locally
```bash
npm run build:electron
```
- Creates `.dmg` (macOS) or `.exe` (Windows)
- Outputs to `release/` folder

### Dev Electron (hot reload)
```bash
# Terminal 1: Vite dev server
npm run dev

# Terminal 2: Electron
npm run dev:electron
```

### Lint
```bash
npm run lint
```

---

## Uninstall

**macOS:**
- Drag "Roman Numerals" from Applications to Trash
- Optional: Remove config `~/.config/roman-numerals/`

**Windows:**
- Start → Settings → Apps → "Roman Numerals" → Uninstall
- Follow prompts

---

## Support

- **Issues:** [GitHub Issues](https://github.com/randyromanmusic/roman-numerals/issues)
- **Docs:** [README.md](./README.md)
- **Contact:** randy@romansounds.com
