/**
 * LIBRARY LOADER
 * Scan drives (Audio, VIDEO, etc).
 * Read Serato .crate XML, MP3/FLAC ID3 tags, infer BPM + key.
 * Populate HarmonicGraph with 542K tracks.
 */

import * as fs from "fs";
import * as path from "path";
import { parseStringPromise } from "xml2js";
import * as mm from "music-metadata";

export interface LibraryConfig {
  drives: {
    name: string;
    path: string;
  }[];
}

export class LibraryLoader {
  private drives: { name: string; path: string }[];
  private track_cache: Map<string, Record<string, unknown>> = new Map();

  constructor(config: LibraryConfig) {
    this.drives = config.drives;
  }

  /**
   * Scan all drives. Load .crate files + audio metadata.
   * Return ~542K tracks with BPM, key, metadata.
   */
  async loadLibrary(): Promise<Track[]> {
    const all_tracks: Track[] = [];

    for (const drive of this.drives) {
      console.log(`Scanning ${drive.name}...`);

      // 1. Load .crate files (Serato format: XML)
      const crates = await this.loadCrates(drive.path);

      // 2. For each crate, load track metadata
      for (const crate of crates) {
        const tracks = await this.loadTracksFromCrate(
          crate,
          drive.name
        );
        all_tracks.push(...tracks);
      }
    }

    console.log(`Loaded ${all_tracks.length} tracks`);
    return all_tracks;
  }

  /**
   * Serato .crate = XML file list.
   * Usually in ~/.serato/Serato DJ/Crates/
   */
  private async loadCrates(): Promise<Crate[]> {
    const crates: Crate[] = [];
    const serato_crate_path = path.join(
      process.env.HOME || "~",
      ".serato/Serato DJ/Crates"
    );

    if (!fs.existsSync(serato_crate_path)) {
      console.warn(`No Serato crates found at ${serato_crate_path}`);
      return crates;
    }

    const files = fs.readdirSync(serato_crate_path);

    for (const file of files) {
      if (!file.endsWith(".crate")) continue;

      const xml_path = path.join(serato_crate_path, file);
      const xml = fs.readFileSync(xml_path, "utf8");

      try {
        const parsed = await parseStringPromise(xml);
        const crate_name = file.replace(".crate", "");
        const track_paths = parsed.CRATE?.TRACKS?.[0]?.TRACK || [];

        crates.push({
          name: crate_name,
          tracks: Array.isArray(track_paths) ? track_paths : [track_paths],
        });
      } catch (err) {
        console.error(`Failed to parse ${file}:`, err);
      }
    }

    return crates;
  }

  /**
   * For each track path in crate, load ID3 + infer BPM/key.
   * Use music-metadata lib (fast, accurate).
   */
  private async loadTracksFromCrate(
    crate: Crate,
    drive_name: string
  ): Promise<Track[]> {
    const tracks: Track[] = [];

    for (const track_path of crate.tracks) {
      try {
        // Path might be relative to drive or absolute
        let full_path = track_path;
        if (!fs.existsSync(full_path)) {
          full_path = path.join("/Volumes", drive_name, track_path);
        }

        if (!fs.existsSync(full_path)) {
          console.warn(`Track not found: ${full_path}`);
          continue;
        }

        // Parse metadata
        const metadata = await (mm as any).parseFile(full_path);
        const { common, format } = metadata;

        // Infer BPM (from ID3 or guess from format)
        let bpm = 120;
        if (common.bpm) {
          bpm = common.bpm;
        } else if (common.tcon) {
          // Genre cues (Techno = 120-130, Trap = 140, etc)
          bpm = this.guessBPMFromGenre(common.tcon);
        }

        // Infer key (Serato stores in custom frame, fallback to analysis)
        const key = this.inferKey(common, format);

        // Energy inference: BPM + spectral analysis
        const energy = this.inferEnergy(bpm, common.comment);

        const track: Track = {
          id: this.hashTrackId(full_path),
          title: common.title || path.basename(full_path),
          artist: common.artist || "Unknown",
          bpm,
          key,
          energy,
          duration_ms: (format.duration || 0) * 1000,
          genre: common.genre?.[0] || "Mixed",
          source_drive: drive_name,
        };

        tracks.push(track);
        this.track_cache.set(track.id, track as unknown as Record<string, unknown>);
      } catch (err) {
        console.error(`Failed to load track metadata:`, err);
      }
    }

    return tracks;
  }

  /**
   * Camelot wheel key from ID3.
   * Serato stores in TXX ("SERATO_KEYS" frame).
   * Fallback: guess from genre.
   */
  private inferKey(
    common: Record<string, unknown>,
    _format: Record<string, unknown>
  ): string {
    // Check custom frames (music-metadata stores these)
    const keys_frame = (common as Record<string, unknown>)[
      "SERATO_KEYS"
    ] || (common as Record<string, unknown>)["serato_keys"];

    if (keys_frame) {
      return String(keys_frame);
    }

    // Fallback: genre hints
    const genre = (common.genre?.[0] || "").toLowerCase();
    if (
      genre.includes("house") ||
      genre.includes("techno")
    ) {
      return "12A"; // Common house key
    }
    if (genre.includes("drum") || genre.includes("bass")) {
      return "1A";
    }
    if (genre.includes("pop")) {
      return "5A";
    }

    return "0A"; // Unknown
  }

  /**
   * Energy: 1-10 scale.
   * High BPM (140+) = higher energy. Genre hints too.
   */
  private inferEnergy(bpm: number, comments?: string[]): number {
    let energy = Math.min(10, Math.max(1, Math.round(bpm / 18)));

    if (comments) {
      const text = comments.join(" ").toLowerCase();
      if (text.includes("intense") || text.includes("hard")) energy += 2;
      if (text.includes("chill") || text.includes("ambient")) energy -= 2;
    }

    return Math.max(1, Math.min(10, energy));
  }

  /**
   * Guess BPM from genre (fallback if ID3 missing).
   */
  private guessBPMFromGenre(genre: string): number {
    const g = (genre || "").toLowerCase();
    if (g.includes("techno") || g.includes("house")) return 125;
    if (g.includes("drum") || g.includes("bass")) return 170;
    if (g.includes("trap")) return 140;
    if (g.includes("hip hop") || g.includes("rap")) return 95;
    if (g.includes("pop")) return 120;
    return 120; // Default
  }

  /**
   * Hash track path → ID.
   */
  private hashTrackId(path: string): string {
    // Use filename + mtime hash
    const stat = fs.statSync(path);
    return `${path.slice(-60)}_${stat.mtimeMs}`.slice(0, 64);
  }

  /**
   * Get cached track by ID.
   */
  getTrack(id: string): Track | null {
    const cached = this.track_cache.get(id);
    return cached ? (cached as unknown as Track) : null;
  }

  /**
   * Hot reload: rescan drive for new/updated tracks.
   */
  async rescanDrive(drive_name: string): Promise<Track[]> {
    const drive = this.drives.find((d) => d.name === drive_name);
    if (!drive) return [];

    console.log(`Rescanning ${drive_name}...`);
    const crates = await this.loadCrates(drive.path);
    const new_tracks: Track[] = [];

    for (const crate of crates) {
      const tracks = await this.loadTracksFromCrate(crate, drive_name);
      new_tracks.push(...tracks);
    }

    return new_tracks;
  }
}

interface Crate {
  name: string;
  const crates = await this.loadCrates();
}

interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  energy: number;
  duration_ms: number;
  genre: string;
  source_drive: string;
  last_played?: Date;
}
