# Contributing to Roman Numerals

## Code Style

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No `any` types
- Interface naming: `PascalCase` (e.g., `DeckState`, `HarmonicSuggestion`)
- Function naming: `camelCase` (e.g., `pollDeckState`, `suggestNext`)

### React Components
- Functional components + hooks only
- File naming: `PascalCase.tsx` (e.g., `DeckPanel.tsx`)
- Inline styles or Tailwind (avoid CSS files)
- Props interface: `Props` suffix (e.g., `DeckPanelProps`)

### Comments
- Why before what
- Function docstrings: JSDoc format
- Inline: explain non-obvious logic only

Good:
```typescript
/**
 * Harmonic distance on Camelot wheel.
 * 1B → 8B = 1 step (safe). Wraps at 24 keys.
 */
private harmonicDistance(key1: string, key2: string): number { ... }
```

Bad:
```typescript
// Calculate distance
function dist(a, b) { ... }
```

## File Structure

```
roman-numerals-v2/
├── src/
│   ├── core/            ← Engine logic (no React)
│   ├── ui/              ← React components
│   ├── index.tsx        ← Entry point
│   └── index.css        ← Global styles
├── electron/            ← Electron main + preload
├── vite.config.ts
├── tsconfig.json
└── README.md
```

Keep core logic separate from UI. Engine should work headless (testable without React).

## Development Workflow

1. **Fork repo** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/[your-username]/roman-numerals.git
   cd roman-numerals
   ```
3. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```
4. **Install dependencies**
   ```bash
   npm install
   ```
5. **Run dev server**
   ```bash
   npm run dev
   ```
6. **Make changes**
   - Keep commits atomic
   - Lint before commit: `npm run lint`
7. **Test locally**
   - Web: `npm run dev` → test at localhost:5173
   - Electron: `npm run dev:electron` (two terminals)
8. **Push & open PR**
   ```bash
   git push origin feature/my-feature
   ```

## PR Guidelines

- **Title:** `[type] Short description` (e.g., `[feat] Add waveform display`)
- **Description:** Why + what + testing notes
- **Linked issue:** Reference issue number (`Fixes #123`)
- **Tests:** Describe manual testing performed
- **No merge conflicts:** Rebase if needed

### Commit Messages
```
[type] Description (50 chars max)

Explanation of why this change. Reference issues (#123).
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`

## Adding Features

### New Core Feature (Engine)
1. Add logic to `src/core/` (new file or extend existing)
2. Write docstrings
3. Test standalone (no React dependency)
4. Wire to engine callbacks
5. Expose in UI if needed

### New UI Component
1. Create `src/ui/ComponentName.tsx`
2. Define `Props` interface
3. Use brand colors: `BRAND_BLACK`, `BRAND_GOLD`, `BRAND_CREAM`
4. Import into `App.tsx`
5. Test at `localhost:5173`

### New Dependency
1. Run `npm install package-name`
2. Update `package.json` (automatic)
3. Document in README.md if significant
4. Test build: `npm run build`

## Testing

### Lint
```bash
npm run lint
```

### Manual Testing
- **Web:** `npm run dev` + keep Serato running
- **Electron:** Start Vite → `npm run dev:electron`
- **Build:** `npm run build:electron` → test release artifact

### Common Issues
- If tracks don't load: Check drive paths in `engine.ts`
- If log parsing fails: Check Serato log format (may change with updates)
- If React errors: Check browser console (F12)

## Releases

Maintainers only:

1. **Update version**
   ```bash
   # Bump package.json version (semver)
   # e.g., 2.0.0 → 2.1.0
   ```

2. **Build release**
   ```bash
   npm run build:electron
   ```

3. **GitHub release**
   - Go to [Releases](https://github.com/randyromanmusic/roman-numerals/releases)
   - Tag: `v2.1.0` (match package.json)
   - Upload `.dmg` (macOS) + `.exe` (Windows)
   - Write release notes (what's new, fixes, known issues)

---

## Questions?

- Discussions: [GitHub Discussions](https://github.com/randyromanmusic/roman-numerals/discussions)
- Issues: [GitHub Issues](https://github.com/randyromanmusic/roman-numerals/issues)
- Email: randy@romansounds.com

Thanks for contributing! 🎵
