# Roman Numerals v2
**Serato DJ Companion – Real-Time Harmonic Suggestion Engine**

## What This Is

Real-time harmonic mixing partner for Serato DJ Pro. Polls Serato logs → parses deck state (BPM, key) → ranks 100 track suggestions per deck based on harmonic distance + energy flow + clash detection.

**Input:** Serato session.log (binary hex, q100ms updates)  
**Processing:** 542K tracks indexed by Camelot wheel + BPM buckets  
**Output:** Dual-deck React UI showing live suggestions + harmonic analysis

---

## Architecture

```
Parser (seratoParser.ts)
  └─ Polls ~/.serato/Serato DJ/History/session.log
  └─ Extracts hex: deck state, BPM, key, position
  └─ Returns DeckState deltas

Library Loader (libraryLoader.ts)
  └─ Scans 4 drives (/Volumes/Audio, /Volumes/VIDEO, etc)
  └─ Loads Serato .crate files (XML)
  └─ Parses ID3 / FLAC metadata
  └─ Infers BPM, key, energy → 542K tracks

Harmonic Graph (harmonicGraph.ts)
  └─ Indexes tracks by Camelot key + BPM bucket
  └─ suggestNext(current_track) → 100 ranked suggestions
  └─ Clash detection: harmonic distance + tempo delta
  └─ Energy flow: lift / hold / drop

Engine (engine.ts)
  └─ Orchestrates parser + graph + callbacks
  └─ Polling loop q100ms
  └─ State management (both decks live)
  └─ Notifies UI on updates

UI (App.tsx)
  └─ React dual-deck display
  └─ 20 top suggestions visible (scrollable to 100)
  └─ Harmonic analysis: harmony score, clash alert
  └─ Real-time color coding (gold = safe, orange = caution, red = clash)
```

---

## Setup

### Prerequisites
- Node 18+
- Serato DJ Pro (running, with logs enabled)
- 4 drives mounted (Audio, VIDEO, etc)

### Install
```bash
cd roman-numerals-v2
npm install
```

### Config (Engine)
Edit `src/core/engine.ts`:
```typescript
const eng = new RomanNumeralsEngine({
  serato_log_path: "/Users/randy/.serato/Serato DJ/History/session.log",
  drives: [
    { name: "Audio", path: "/Volumes/Audio/" },
    { name: "VIDEO", path: "/Volumes/VIDEO/" },
  ],
  poll_interval_ms: 100,
  recent_played_buffer: 20,
});
```

### Run
```bash
npm run dev
# Browser opens localhost:5173
```

---

## How It Works

### 1. Boot
1. Engine loads library (all drives, all .crates) → 542K tracks
2. Builds harmonic graph (Camelot wheel + BPM buckets for fast lookup)
3. Starts polling Serato logs q100ms

### 2. Real-Time Loop
1. Poll: Extract deck state (BPM, key, track name) from Serato hex log
2. Resolve: Match to library track (ID3 metadata)
3. Suggest: Graph returns top 100 harmonic matches
   - Prioritize: 0 harmonic distance (same key)
   - Include: ±1 step (safe mix)
   - Warn: ±2 steps (yellow) / ±3+ steps (red)
4. Analyze mix (if both decks playing): harmony score + clash alert + energy flow
5. Update UI (React state) → components re-render

### 3. Suggestion Ranking
Each track scored by:
- **Harmonic distance** (0-12 semitones on Camelot wheel)
- **BPM delta** (difference from current track)
- **Clash risk** (function of harmonic + tempo mismatch)
- **Energy trajectory** (lift/hold/drop relative to current energy)
- **Confidence** (0-100: safe=90, yellow=60, red=30, adjusted by distance)

Sort by confidence (highest first), then harmonic distance (safest first).

---

## UI Guide

### Left/Right Panels
- **Track Info:** Current playing track (title, artist, BPM, key, play status)
- **Mix Analysis** (if both decks active):
  - Harmony score (0-12, higher = better match)
  - Clash alert (⚠ if harmony < 10)
  - Energy flow (↑ building, ↓ dropping, → steady)

### Suggestion Rows (Ranked 1-20 visible, scroll for more)
- **Rank:** Position (1-100)
- **Track:** Title + artist (truncated)
- **BPM/Key:** Tempo + Camelot key
- **Confidence:** % match score
- **Clash:** Visual indicator (green ✓ safe, orange ⚠ yellow, red ⚠ red)

### Status Bar
- **Status:** idle / playing / mixing / error
- **Last update:** Timestamp of last poll

---

## Development Roadmap

### v2.1 (Next)
- [ ] Waveform display (sync visual match to suggestionrank)
- [ ] Cue point sync (auto-detect beat grid from Serato)
- [ ] History panel (what you played last 30 mins, stats)
- [ ] Favorite/block lists (tag tracks to always/never suggest)

### v2.2
- [ ] Serato integration (send cues/hotcues from app)
- [ ] Export playlists (generate setlist from suggestions)
- [ ] A/B testing (AB/CD deck view for quad setup)

### v2.3+
- [ ] ML confidence scoring (learn from your accepts/rejects)
- [ ] Genre clustering (vibe-match, not just key)
- [ ] Network sync (multi-device, iPad companion)

---

## Troubleshooting

### Engine error / No suggestions showing
1. Check Serato is running + logs enabled
2. Verify log path exists: `~/.serato/Serato DJ/History/session.log`
3. Run `npm run lint` → fix TypeScript errors
4. Check console (F12) for parse errors

### Slow library load (542K tracks)
- Normal: 30-60s first boot (parsing metadata)
- Subsequent boots: cached if libraries unchanged
- Rescan single drive: `engine.reloadDrive("Audio")`

### Key not detected
- Parser falls back to genre guess (house=12A, trap=1A, etc)
- If ID3 "key" frame missing, manual tags in Serato crate required
- Check Serato metadata editor for track key tags

---

## Colors (Roman Sounds Brand)
- **Black:** `#09080a`
- **Gold:** `#c8a45a`
- **Cream:** `#f0ebe3`

Font stack: Jost (sans), Cormorant Garamond (serif)

---

## License
Roman Sounds LLC / Randy Delgado. Internal use.
