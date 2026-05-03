/**
 * UI COMPONENT: Roman Numerals App
 * Real-time dual-deck display + suggestion engine.
 * Colors: roman-crm (#09080a black, #c8a45a gold, #f0ebe3 cream)
 */

import React, { useEffect, useState } from "react";
import { RomanNumeralsEngine, EngineState } from "./core/engine";

const BRAND_BLACK = "#09080a";
const BRAND_GOLD = "#c8a45a";
const BRAND_CREAM = "#f0ebe3";

const App: React.FC = () => {
  const [state, setState] = useState<EngineState | null>(null);
  const [engine, setEngine] = useState<RomanNumeralsEngine | null>(null);

  useEffect(() => {
    // Init engine
    const eng = new RomanNumeralsEngine({
      serato_log_path: "/Users/randy/.serato/Serato DJ/History/session.log",
      drives: [
        { name: "Audio", path: "/Volumes/Audio/" },
        { name: "VIDEO", path: "/Volumes/VIDEO/" },
      ],
      poll_interval_ms: 100,
      recent_played_buffer: 20,
    });

    eng.onUpdate(setState);
    eng.start();
    setEngine(eng);

    return () => eng.stop();
  }, []);

  if (!state) {
    return (
      <div
        style={{
          background: BRAND_BLACK,
          color: BRAND_CREAM,
          padding: "2rem",
          fontFamily: "Jost, sans-serif",
        }}
      >
        <h1>Roman Numerals</h1>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: BRAND_BLACK,
        color: BRAND_CREAM,
        minHeight: "100vh",
        padding: "1rem",
        fontFamily: "Jost, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: `2px solid ${BRAND_GOLD}`,
        }}
      >
        <h1 style={{ color: BRAND_GOLD, margin: 0 }}>Roman Numerals</h1>
        <div style={{ fontSize: "0.9rem", color: BRAND_GOLD }}>
          Status: <strong>{state.status.toUpperCase()}</strong>
        </div>
      </header>

      {/* Dual Deck Display */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <DeckPanel
          deck="left"
          deck_state={state.left_deck}
          suggestions={state.left_suggestions}
          mix_analysis={state.right_deck ? engine?.analyzeMix() : null}
        />
        <DeckPanel
          deck="right"
          deck_state={state.right_deck}
          suggestions={state.right_suggestions}
          mix_analysis={state.left_deck ? engine?.analyzeMix() : null}
        />
      </div>

      {/* Status Bar */}
      <footer
        style={{
          borderTop: `1px solid ${BRAND_GOLD}`,
          paddingTop: "1rem",
          fontSize: "0.85rem",
          color: BRAND_CREAM,
          opacity: 0.7,
        }}
      >
        Last update: {state.last_update.toLocaleTimeString()}
        {state.status === "error" && (
          <div style={{ color: "#ff4444", marginTop: "0.5rem" }}>
            ⚠ Engine error. Check logs.
          </div>
        )}
      </footer>
    </div>
  );
};

interface DeckPanelProps {
  deck: "left" | "right";
  deck_state: DeckState | null;
  suggestions: HarmonicSuggestion[];
  mix_analysis: { harmony: number; clash: boolean; energy_flow: string } | null;
}

const DeckPanel: React.FC<DeckPanelProps> = ({
  deck,
  deck_state,
  suggestions,
  mix_analysis,
}) => {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${BRAND_BLACK} 0%, #1a1a1a 100%)`,
        border: `2px solid ${BRAND_GOLD}`,
        borderRadius: "0.5rem",
        padding: "1.5rem",
      }}
    >
      {/* Deck Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: `1px solid ${BRAND_GOLD}`,
        }}
      >
        <h2 style={{ color: BRAND_GOLD, margin: "0 0 0.5rem 0" }}>
          {deck === "left" ? "Left Deck" : "Right Deck"}
        </h2>
        {deck_state ? (
          <div style={{ fontSize: "0.9rem" }}>
            <div>
              <strong>{deck_state.title}</strong> by {deck_state.artist}
            </div>
            <div style={{ color: BRAND_GOLD }}>
              {deck_state.bpm.toFixed(1)} BPM • {deck_state.key}
              {deck_state.is_playing ? " ▶" : " ⏸"}
            </div>
          </div>
        ) : (
          <div style={{ color: "#666" }}>No track loaded</div>
        )}
      </div>

      {/* Mix Analysis (if both decks playing) */}
      {mix_analysis && (
        <div
          style={{
            background: BRAND_BLACK,
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "0.25rem",
            borderLeft: `3px solid ${
              mix_analysis.clash ? "#ff4444" : BRAND_GOLD
            }`,
          }}
        >
          <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <strong>Harmony:</strong> {mix_analysis.harmony}/12{" "}
            {mix_analysis.clash && (
              <span style={{ color: "#ff4444" }}>⚠ CLASH</span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            <strong>Energy:</strong> {mix_analysis.energy_flow}
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div>
        <h3 style={{ color: BRAND_GOLD, fontSize: "0.9rem", marginBottom: "1rem" }}>
          Next Tracks ({suggestions.length})
        </h3>
        <div
          style={{
            maxHeight: "500px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {suggestions.slice(0, 20).map((track, i) => (
            <SuggestionRow key={i} track={track} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
};

interface SuggestionRowProps {
  track: HarmonicSuggestion;
  rank: number;
}

const SuggestionRow: React.FC<SuggestionRowProps> = ({ track, rank }) => {
  const clash_color =
    track.clash_risk === "safe"
      ? BRAND_GOLD
      : track.clash_risk === "yellow"
        ? "#ffaa00"
        : "#ff4444";

  return (
    <div
      style={{
        background: BRAND_BLACK,
        border: `1px solid ${clash_color}`,
        borderRadius: "0.25rem",
        padding: "0.75rem",
        fontSize: "0.85rem",
        display: "grid",
        gridTemplateColumns: "2rem 1fr 6rem 6rem",
        gap: "0.75rem",
        alignItems: "center",
      }}
    >
      <div style={{ color: BRAND_GOLD, fontWeight: "bold" }}>{rank}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ color: "#aaa", fontSize: "0.8rem" }}>{track.artist}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div>{track.bpm.toFixed(0)} BPM</div>
        <div style={{ color: clash_color }}>{track.key}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: BRAND_GOLD }}>
          {track.confidence_score.toFixed(0)}%
        </div>
        <div style={{ fontSize: "0.75rem", color: "#aaa" }}>
          {track.clash_risk === "safe" ? "✓ Safe" : "⚠ " + track.clash_risk}
        </div>
      </div>
    </div>
  );
};

export default App;

// Types (re-exported for UI)
interface DeckState {
  deck: "left" | "right";
  track_id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  is_playing: boolean;
  current_position: number;
  timestamp: Date;
}

interface HarmonicSuggestion {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  harmonic_distance: number;
  bpm_delta: number;
  clash_risk: "safe" | "yellow" | "red";
  confidence_score: number;
}
