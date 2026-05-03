/**
 * ENGINE CORE
 * Real-time loop: poll Serato → update HarmonicGraph → serve suggestions.
 * Manages state, reloads, error recovery.
 */

import { SeratoParser, DeckState } from "./seratoParser";
import { HarmonicGraph, Track, HarmonicSuggestion } from "./harmonicGraph";
import { LibraryLoader } from "./libraryLoader";

export interface EngineState {
  left_deck: DeckState | null;
  right_deck: DeckState | null;
  left_suggestions: HarmonicSuggestion[];
  right_suggestions: HarmonicSuggestion[];
  last_update: Date;
  status: "idle" | "playing" | "mixing" | "error";
}

export interface EngineConfig {
  serato_log_path: string;
  drives: { name: string; path: string }[];
  poll_interval_ms: number; // Default 100
  recent_played_buffer: number; // Default 20
}

export class RomanNumeralsEngine {
  private parser: SeratoParser;
  private graph: HarmonicGraph | null = null;
  private loader: LibraryLoader;
  private state: EngineState;
  private recent_played: Set<string> = new Set();
  private poll_interval: NodeJS.Timer | null = null;
  private config: EngineConfig;
  private on_update_callbacks: ((state: EngineState) => void)[] = [];

  constructor(config: EngineConfig) {
    this.config = config;
    this.parser = new SeratoParser(config.serato_log_path);
    this.loader = new LibraryLoader({ drives: config.drives });
    this.state = {
      left_deck: null,
      right_deck: null,
      left_suggestions: [],
      right_suggestions: [],
      last_update: new Date(),
      status: "idle",
    };
  }

  /**
   * Bootstrap: load library, start polling.
   */
  async start() {
    try {
      console.log("Roman Numerals: Initializing...");

      // Load tracks
      const tracks = await this.loader.loadLibrary();
      this.graph = new HarmonicGraph(tracks);

      console.log(`✓ Loaded ${tracks.length} tracks`);
      console.log("✓ Harmonic graph built");

      // Start polling
      this.poll_interval = setInterval(
        () => this.pollOnce(),
        this.config.poll_interval_ms
      );

      this.setState({ status: "idle" });
      console.log("✓ Engine running");
    } catch (err) {
      console.error("Engine init failed:", err);
      this.setState({ status: "error" });
    }
  }

  /**
   * Single poll cycle.
   */
  private async pollOnce() {
    if (!this.graph) return;

    try {
      // 1. Poll Serato
      const deltas = await this.parser.pollDeckState();
      if (deltas.length === 0) return; // No state change

      // 2. Update cached state
      for (const delta of deltas) {
        if (delta.deck === "left") {
          this.state.left_deck = delta;
        } else {
          this.state.right_deck = delta;
        }

        // Track played history
        this.recent_played.add(delta.track_id);
        if (this.recent_played.size > this.config.recent_played_buffer) {
          const arr = Array.from(this.recent_played);
          this.recent_played.delete(arr[0]);
        }
      }

      // 3. Generate suggestions for active deck
      if (this.state.left_deck && this.state.left_deck.is_playing) {
        const left_track = this.resolveTrack(this.state.left_deck);
        if (left_track) {
          this.state.left_suggestions = this.graph.suggestNext(
            left_track,
            100,
            this.recent_played
          );
        }
      }

      if (this.state.right_deck && this.state.right_deck.is_playing) {
        const right_track = this.resolveTrack(this.state.right_deck);
        if (right_track) {
          this.state.right_suggestions = this.graph.suggestNext(
            right_track,
            100,
            this.recent_played
          );
        }
      }

      // 4. Update status (idle / playing / mixing)
      const playing_count = [
        this.state.left_deck?.is_playing,
        this.state.right_deck?.is_playing,
      ].filter(Boolean).length;

      this.state.status =
        playing_count === 2
          ? "mixing"
          : playing_count === 1
            ? "playing"
            : "idle";

      this.state.last_update = new Date();

      // 5. Fire callbacks
      this.notifyUpdate();
    } catch (err) {
      console.error("Poll error:", err);
      this.setState({ status: "error" });
    }
  }

  /**
   * Resolve DeckState → Track object (lookup in library).
   */
  private resolveTrack(deck: DeckState): Track | null {
    // Construct minimal Track from DeckState
    // In real scenario, cross-ref track_id with library
    return {
      id: deck.track_id,
      title: deck.title,
      artist: deck.artist,
      bpm: deck.bpm,
      key: deck.key,
      energy: this.bpmToEnergy(deck.bpm),
      duration_ms: 0,
      genre: "Mixed",
      source_drive: "?",
    };
  }

  private bpmToEnergy(bpm: number): number {
    return Math.min(10, Math.max(1, Math.round(bpm / 18)));
  }

  /**
   * Subscribe to state changes.
   */
  onUpdate(callback: (state: EngineState) => void) {
    this.on_update_callbacks.push(callback);
  }

  private notifyUpdate() {
    for (const cb of this.on_update_callbacks) {
      cb(this.state);
    }
  }

  /**
   * Get current state.
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Manual state update (testing, UI triggers).
   */
  private setState(partial: Partial<EngineState>) {
    this.state = { ...this.state, ...partial };
    this.notifyUpdate();
  }

  /**
   * Hot reload: rescan drive + rebuild graph.
   */
  async reloadDrive(drive_name: string) {
    if (!this.graph) return;

    console.log(`Reloading ${drive_name}...`);
    const new_tracks = await this.loader.rescanDrive(drive_name);
    this.graph.addTracks(new_tracks);
    console.log(`✓ Added ${new_tracks.length} tracks`);
  }

  /**
   * Analyze current mix (both decks).
   */
  analyzeMix() {
    if (!this.graph || !this.state.left_deck || !this.state.right_deck) {
      return null;
    }

    const left = this.resolveTrack(this.state.left_deck);
    const right = this.resolveTrack(this.state.right_deck);

    if (!left || !right) return null;

    return this.graph.analyzeMix(left, right);
  }

  /**
   * Stop engine.
   */
  stop() {
    if (this.poll_interval) {
      clearInterval(this.poll_interval);
      this.poll_interval = null;
    }
    this.parser.resetState();
    this.state.status = "idle";
  }
}
