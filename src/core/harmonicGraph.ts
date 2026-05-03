/**
 * HARMONIC GRAPH ENGINE
 * 542K tracks → key + BPM buckets.
 * Suggest next mix: minimize clash, maximize energy flow.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string; // Camelot 1A-12B
  energy: number; // 1-10 (inferred from BPM, spectrum)
  duration_ms: number;
  genre: string;
  source_drive: string; // Audio, VIDEO, etc
  last_played?: Date;
}

export interface HarmonicSuggestion extends Track {
  harmonic_distance: number; // 0-12 (semitones)
  bpm_delta: number;
  clash_risk: "safe" | "yellow" | "red";
  energy_trajectory: "drop" | "hold" | "lift";
  confidence_score: number; // 0-100
}

const CAMELOT_WHEEL = [
  "8B",
  "3B",
  "10B",
  "5B",
  "12B",
  "7B",
  "2B",
  "9B",
  "4B",
  "11B",
  "6B",
  "1B",
  "8A",
  "3A",
  "10A",
  "5A",
  "12A",
  "7A",
  "2A",
  "9A",
  "4A",
  "11A",
  "6A",
  "1A",
];

export class HarmonicGraph {
  private tracks: Track[] = [];
  private index_by_key: Map<string, Track[]> = new Map();
  private index_by_bpm_bucket: Map<number, Track[]> = new Map(); // Buckets of 5 BPM

  constructor(tracks: Track[]) {
    this.tracks = tracks;
    this.buildIndex();
  }

  /**
   * Index tracks for fast lookup.
   * Key index: O(1) to get all tracks in key.
   * BPM index: O(1) to get ±10 BPM candidates.
   */
  private buildIndex() {
    for (const track of this.tracks) {
      // Key index
      if (!this.index_by_key.has(track.key)) {
        this.index_by_key.set(track.key, []);
      }
      this.index_by_key.get(track.key)!.push(track);

      // BPM bucket (round to nearest 5)
      const bucket = Math.round(track.bpm / 5) * 5;
      if (!this.index_by_bpm_bucket.has(bucket)) {
        this.index_by_bpm_bucket.set(bucket, []);
      }
      this.index_by_bpm_bucket.get(bucket)!.push(track);
    }
  }

  /**
   * Harmonic distance: steps on Camelot wheel.
   * 1B → 8B = 1 step (safe). 1B → 12B = 2 steps (caution). 1B → 3B = 7 steps (red).
   */
  private harmonicDistance(key1: string, key2: string): number {
    const idx1 = CAMELOT_WHEEL.indexOf(key1);
    const idx2 = CAMELOT_WHEEL.indexOf(key2);

    if (idx1 === -1 || idx2 === -1) return 999; // Unknown key

    const delta = Math.abs(idx1 - idx2);
    return Math.min(delta, CAMELOT_WHEEL.length - delta);
  }

  /**
   * Clash risk: distance + tempo delta.
   */
  private clashRisk(
    dist: number,
    bpm_delta: number
  ): "safe" | "yellow" | "red" {
    if (dist === 0 && Math.abs(bpm_delta) < 5) return "safe";
    if (dist <= 1 && Math.abs(bpm_delta) < 8) return "safe";
    if (dist <= 2 && Math.abs(bpm_delta) < 10) return "yellow";
    return "red";
  }

  /**
   * Suggest next tracks for current deck.
   * Return top 100 by harmonic + energy fit.
   */
  suggestNext(
    current: Track,
    count: number = 100,
    recently_played_ids: Set<string> = new Set()
  ): HarmonicSuggestion[] {
    const candidates: HarmonicSuggestion[] = [];

    // Expand search: exact key + adjacent keys
    const search_keys = [
      current.key,
      CAMELOT_WHEEL[(CAMELOT_WHEEL.indexOf(current.key) + 1) % 24],
      CAMELOT_WHEEL[(CAMELOT_WHEEL.indexOf(current.key) - 1 + 24) % 24],
      CAMELOT_WHEEL[(CAMELOT_WHEEL.indexOf(current.key) + 11) % 24], // Relative minor/major
    ];

    for (const key of search_keys) {
      const tracks_in_key = this.index_by_key.get(key) || [];

      for (const track of tracks_in_key) {
        if (
          track.id === current.id ||
          recently_played_ids.has(track.id)
        ) {
          continue;
        }

        const harm_dist = this.harmonicDistance(current.key, track.key);
        const bpm_delta = track.bpm - current.bpm;
        const clash = this.clashRisk(harm_dist, bpm_delta);
        const energy_traj =
          track.energy > current.energy + 1
            ? "lift"
            : track.energy < current.energy - 1
              ? "drop"
              : "hold";

        // Confidence = inverse of clash risk
        const base_confidence =
          clash === "safe" ? 90 : clash === "yellow" ? 60 : 30;

        // Boost for energy trajectory match
        const trajectory_boost =
          energy_traj === "hold" ? 10 : energy_traj === "lift" ? 5 : 0;

        const confidence_score = Math.min(
          100,
          base_confidence + trajectory_boost - harm_dist * 2
        );

        candidates.push({
          ...track,
          harmonic_distance: harm_dist,
          bpm_delta,
          clash_risk: clash,
          energy_trajectory: energy_traj,
          confidence_score,
        });
      }
    }

    // Sort by confidence, then by harmonic distance (safer first)
    candidates.sort((a, b) => {
      if (b.confidence_score !== a.confidence_score) {
        return b.confidence_score - a.confidence_score;
      }
      return a.harmonic_distance - b.harmonic_distance;
    });

    return candidates.slice(0, count);
  }

  /**
   * Mix analysis: current + deck B.
   * Detect harmonic clash, energy flow prediction.
   */
  analyzeMix(
    deck_a: Track,
    deck_b: Track
  ): { harmony: number; clash: boolean; energy_flow: string } {
    const harm_dist = this.harmonicDistance(deck_a.key, deck_b.key);
    const bpm_delta = Math.abs(deck_a.bpm - deck_b.bpm);

    return {
      harmony: 12 - harm_dist, // 12 = perfect, 0 = clashing
      clash: harm_dist > 2 || bpm_delta > 15,
      energy_flow:
        deck_b.energy > deck_a.energy
          ? "↑ building"
          : deck_b.energy < deck_a.energy
            ? "↓ dropping"
            : "→ steady",
    };
  }

  /**
   * Get all tracks in graph.
   */
  getAllTracks(): Track[] {
    return [...this.tracks];
  }

  /**
   * Hot reload: add new tracks (scan new drive / updated library).
   */
  addTracks(new_tracks: Track[]) {
    this.tracks.push(...new_tracks);
    this.buildIndex(); // Rebuild indexes
  }
}
