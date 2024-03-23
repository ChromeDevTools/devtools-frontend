// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

let instance: AnnotationsManager|null = null;
type HashToEntryMap = Map<string, TraceEngine.Types.TraceEvents.SyntheticTraceEntry>;

export class AnnotationsManager {
  /**
   * Maps a hash to an individual TraceEvent entry.
   * We save annotations into the trace file by saving the hidden entry's hash.
   * Build a hash to entry map to faster find an entry to apply an annotation to.
   **/
  #hashToEntry: HashToEntryMap = new Map();

  static maybeInstance(opts: {
    entries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[]|null,
  } = {entries: null}): AnnotationsManager|null {
    if (opts.entries) {
      instance = new AnnotationsManager(opts.entries);
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  private constructor(entries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[]) {
    entries.map(entry => this.#hashToEntry.set(this.generateTraceEntryHash(entry), entry));
  }

  /**
   * Builds all annotations and returns the object written into the 'annotations' trace file metada field.
   */
  getAnnotations(): TraceEngine.Types.File.Annotations {
    const hashesOfSynteticEntries: string[] = [];
    const hiddenEntries = TraceEngine.EntriesFilter.EntriesFilter.maybeInstance()?.invisibleEntries();
    if (hiddenEntries) {
      for (const entry of hiddenEntries) {
        if (!TraceEngine.Types.TraceEvents.isProfileCall(entry)) {
          hashesOfSynteticEntries.push(this.generateTraceEntryHash(entry));
        }
      }
    }

    return {
      hiddenRendererEventsHashes: hashesOfSynteticEntries,
      hiddenProfileCallsSampleIndexes: [],
      hiddenProfileCallsDepths: [],
    };
  }

  generateTraceEntryHash(entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry): string {
    if (!TraceEngine.Types.TraceEvents.isProfileCall(entry)) {
      return `${entry.cat},${entry.name},${entry.ph},${entry.pid},${entry.tid},${entry.ts},${entry.tts}`;
    }
    return '';
  }

  applyAnnotations(annotations: TraceEngine.Types.File.Annotations): void {
    // Currently, we are only saving the hidden Renderer Events.
    // Build the hidden events array by getting the entries from hashToEntry map by their hash.
    if (annotations.hiddenRendererEventsHashes) {
      const hiddenEntries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[] = [];
      annotations.hiddenRendererEventsHashes.map(hiddenEntryHash => {
        const hiddenEntry = this.#hashToEntry.get(hiddenEntryHash);
        if (hiddenEntry) {
          hiddenEntries.push(hiddenEntry);
        }
      });
      TraceEngine.EntriesFilter.EntriesFilter.maybeInstance()?.setInvisibleEntries(hiddenEntries);
    }
  }
}
