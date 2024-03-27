// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

let instance: AnnotationsManager|null = null;
type HashToEntryMap = Map<string, TraceEngine.Types.TraceEvents.SyntheticTraceEntry>;
type EntryToNodeMap =
    Map<TraceEngine.Types.TraceEvents.SyntheticTraceEntry, TraceEngine.Helpers.TreeHelpers.TraceEntryNode>;

export class AnnotationsManager {
  /**
   * Maps a hash to an individual TraceEvent entry.
   * We save annotations into the trace file pby saving the hidden entry's hash.
   * Build a hash to entry map to faster find an entry to apply an annotation to.
   **/
  #hashToEntry: HashToEntryMap = new Map();
  #entriesFilter: TraceEngine.EntriesFilter.EntriesFilter;

  static maybeInstance(opts: {
    entryToNodeMap: EntryToNodeMap|null,
  } = {entryToNodeMap: null}): AnnotationsManager|null {
    if (opts.entryToNodeMap) {
      instance = new AnnotationsManager(opts.entryToNodeMap);
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  private constructor(entryToNodeMap: EntryToNodeMap) {
    // Fill HashToEntryMap with hashes for each entry
    Array.from(entryToNodeMap.keys()).map(entry => this.#hashToEntry.set(this.generateTraceEntryHash(entry), entry));
    this.#entriesFilter = new TraceEngine.EntriesFilter.EntriesFilter(entryToNodeMap);
  }

  getEntriesFilter(): TraceEngine.EntriesFilter.EntriesFilter {
    return this.#entriesFilter;
  }

  /**
   * Builds all annotations and returns the object written into the 'annotations' trace file metada field.
   */
  getAnnotations(): TraceEngine.Types.File.Annotations {
    const hashesOfSynteticEntries: string[] = [];
    const hiddenEntries = this.#entriesFilter.invisibleEntries();
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
      this.#entriesFilter.setInvisibleEntries(hiddenEntries);
    }
  }
}
