# Roman Numerals – Serato DJ Companion

Real-time harmonic mixing engine for Serato DJ Pro. Polls live logs → suggests 100 harmonic-matched tracks per deck → shows clash alerts + energy flow analysis.

![Roman Numerals UI](docs/screenshot.png)

---

## Quick Start

### Web (Dev + Hot Reload)
```bash
git clone https://github.com/randyromanmusic/roman-numerals.git
cd roman-numerals
npm install
npm run dev
# Opens localhost:5173
```

### Electron App (Download & Click)
Go to [Releases](https://github.com/randyromanmusic/roman-numerals/releases) → download `.dmg` (macOS) or `.exe` (Windows) → install & launch.

**See [INSTALL.md](./INSTALL.md) for full setup guide.**

---

## What It Does

1. **Polls Serato logs** (q100ms)
   - Extracts current deck BPM, key, track name

2. **Searches library** (542K tracks indexed by Camelot wheel)
   - Harmonic distance (0-12 semitones)
   - BPM delta (how close in tempo)
   - Energy trajectory (building/steady/dropping)

3. **Ranks suggestions** by clash risk
   - Green (✓ safe): 0 harmonic distance, ±5 BPM
   - Orange (⚠ caution): 1-2 steps, ±10 BPM
   - Red (⚠ clash): ±3 steps, ±15 BPM

4. **Shows live analysis** (if both decks playing)
   - Harmony score (0-12, higher = better)
   - Clash alert
   - Energy flow direction

---

## System Requirements

- **Node 18+** (for dev)
- **Serato DJ Pro** (running + logging enabled)
- **4 drives mounted:** Audio, VIDEO, etc (configurable)
- **macOS 10.13+** or **Windows 10+** (Electron)

---

## Architecture

```
Serato logs (hex)
        ↓
    Parser (100ms poll) → Extract BPM, key, position
        ↓
   Library Loader → 542K tracks indexed by Camelot + BPM
        ↓
 Harmonic Graph → Suggest 100 matches per deck
        ↓
    Engine (state mgmt, callbacks)
        ↓
    React UI (dual deck, suggestions, mix analysis)
```

**See [README.md](./README.md) for full architecture docs.**

---

## Features

- ✅ Real-time harmonic suggestions (100 per deck)
- ✅ Dual-deck live display (both decks simultaneously)
- ✅ Clash detection (harmonic distance + BPM delta)
- ✅ Energy flow analysis (building/steady/dropping)
- ✅ Multi-drive library support (Audio, VIDEO, custom)
- ✅ Hot reload library (rescan drives without restart)
- ✅ Brand-colored UI (Roman Sounds gold + black)
- ✅ Electron app (standalone, no Node required)

---

## Roadmap (v2.1+)

- [ ] Waveform display (visual sync match)
- [ ] Cue point sync (auto-detect beat grid)
- [ ] History panel (last 30 mins, stats)
- [ ] Favorites/block lists (train engine on your taste)
- [ ] Serato hotcues integration
- [ ] Playlist export
- [ ] A/B deck view (quad setup)

---

## Troubleshooting

**No tracks loading?**
- Check Serato is running
- Verify log path: `~/.serato/Serato DJ/History/session.log` (macOS)
- Check drives mounted: `ls /Volumes/`
- See [INSTALL.md](./INSTALL.md#troubleshooting)

**Engine error?**
- Console: F12 (dev) or View → Developer Tools (Electron)
- Logs: `~/.config/roman-numerals/` (Linux), `%APPDATA%/Roman Numerals/` (Windows)

**More help?** [GitHub Issues](https://github.com/randyromanmusic/roman-numerals/issues)

---

## Development

### Setup
```bash
npm install
npm run lint          # Check types
npm run dev           # Vite dev server (localhost:5173)
npm run build         # Web build
npm run build:electron # Electron app (release/ folder)
```

### Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for code style, PR workflow, and guidelines.

---

## License

MIT License – See [LICENSE](./LICENSE)

---

## Contact

- **Roman Sounds:** https://romansounds.com
- **Email:** randy@romansounds.com
- **Phone:** 214.801.3698
- **Instagram:** [@romansoundsdfw](https://instagram.com/romansoundsdfw)

Built by Randy Delgado (DJ Randy Roman) – Serato + engineering = harmonic math.
