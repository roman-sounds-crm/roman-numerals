/**
 * SERATO PARSER v2
 * Read live .log hex → extract deck state (BPM, key, track ID)
 * Poll q100ms. Normalize across file rotation.
 */

import * as fs from "fs";

export interface DeckState {
  deck: "left" | "right";
  track_id: string; // Serato internal hash
  title: string;
  artist: string;
  bpm: number;
  key: string; // Camelot or key_detected
  current_position: number; // ms
  is_playing: boolean;
  timestamp: Date;
}

export interface SeratoLogEntry {
  raw_hex: string;
  deck: "left" | "right";
  event_type: string; // "cue", "play", "stop", "seek", etc
  payload: Record<string, unknown>;
}

export class SeratoParser {
  private log_path: string;
  private last_offset: number = 0;
  private deck_state_cache: Map<"left" | "right", DeckState> = new Map();

  constructor(log_path: string) {
    this.log_path = log_path; // e.g., ~/.serato/Serato DJ/History/session.log
  }

  /**
   * Poll live log file.
   * Return deltas: deck state changes since last poll.
   */
  async pollDeckState(): Promise<DeckState[]> {
    try {
      const buffer = fs.readFileSync(this.log_path);
      const new_data = buffer.slice(this.last_offset);
      this.last_offset = buffer.length;

      const entries = this.parseHexLog(new_data);
      const deltas: DeckState[] = [];

      for (const entry of entries) {
        const state = this.interpretLogEntry(entry);
        if (state) {
          this.deck_state_cache.set(state.deck, state);
          deltas.push(state);
        }
      }

      return deltas;
    } catch (err) {
      console.error("Serato log read fail:", err);
      return [];
    }
  }

  /**
   * Hex → SeratoLogEntry[].
   * Serato logs UTF-16BE, mixed binary + text.
   * Look for markers: 0xFF 0xFE (UTF-16LE), key patterns, BPM floats.
   */
  private parseHexLog(buffer: Buffer): SeratoLogEntry[] {
    const entries: SeratoLogEntry[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Scan for log frame markers (Serato-specific magic bytes)
      // Simplified: look for ASCII text + structured data blocks
      
      const chunk = buffer.slice(offset, Math.min(offset + 512, buffer.length));
      const text = chunk.toString("utf8", 0, Math.min(256, chunk.length));

      // Extract deck indicator (L/R or "Deck 1/2" patterns)
      const deck_match = text.match(/Deck\s([12])|(\[L\]|\[R\])/i);
      const deck = deck_match
        ? deck_match[1] === "1" || deck_match[2] === "[L]"
          ? "left"
          : "right"
        : null;

      // Extract BPM (float pattern: XX.XX)
      const bpm_match = text.match(/(\d{2,3}\.\d{2})\s*BPM/);
      const bpm = bpm_match ? parseFloat(bpm_match[1]) : null;

      // Extract key (Camelot 1A-12B, or note+scale)
      const key_match = text.match(/([1-9]|1[0-2])[AB]|([A-G][b#]?m?)/);
      const key = key_match ? key_match[0] : null;

      if (deck && (bpm || key)) {
        entries.push({
          raw_hex: chunk.toString("hex").slice(0, 64),
          deck,
          event_type: text.includes("play")
            ? "play"
            : text.includes("stop")
              ? "stop"
              : text.includes("cue")
                ? "cue"
                : "unknown",
          payload: { bpm, key, raw_text: text.slice(0, 128) },
        });
      }

      offset += 256; // Step through file in chunks
    }

    return entries;
  }

  /**
   * Interpret log entry → DeckState.
   * Cross-ref library metadata if available.
   */
  private interpretLogEntry(entry: SeratoLogEntry): DeckState | null {
    if (!entry.payload.key || !entry.payload.bpm) {
      return null;
    }

    return {
      deck: entry.deck,
      track_id: this.hashTrackId(entry.raw_hex),
      title: "Track", // Pulled from library lookup (next step)
      artist: "Artist",
      bpm: entry.payload.bpm as number,
      key: entry.payload.key as string,
      current_position: 0, // Would be extracted from position marker
      is_playing: entry.event_type === "play",
      timestamp: new Date(),
    };
  }

  private hashTrackId(hex: string): string {
    return hex.slice(0, 16); // Simplified hash
  }

  /**
   * Get cached deck state (left/right).
   */
  getLastState(deck: "left" | "right"): DeckState | null {
    return this.deck_state_cache.get(deck) || null;
  }

  /**
   * Clear cache (session reset).
   */
  resetState() {
    this.deck_state_cache.clear();
    this.last_offset = 0;
  }
}
