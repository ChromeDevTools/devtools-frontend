// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import * as TimelineComponents from '../../panels/timeline/components/components.js';

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
  #timelineBreadcrumbs: TimelineComponents.Breadcrumbs.Breadcrumbs;

  /**
   * A new instance is create each time a trace is recorded or loaded from a file.
   * Both entryToNodeMap and wholeTraceBounds are mandatory to support all annotations and if one of them
   * is not present, something has gone wrong so let's load the trace without the annotations support.
   **/
  static maybeInstance(opts: {
    entryToNodeMap: EntryToNodeMap|null,
    wholeTraceBounds: TraceEngine.Types.Timing.TraceWindowMicroSeconds|null|undefined,
  } = {entryToNodeMap: null, wholeTraceBounds: null}): AnnotationsManager|null {
    if (opts.entryToNodeMap && opts.wholeTraceBounds) {
      instance = new AnnotationsManager(opts.entryToNodeMap, opts.wholeTraceBounds);
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  private constructor(
      entryToNodeMap: EntryToNodeMap, wholeTraceBounds: TraceEngine.Types.Timing.TraceWindowMicroSeconds) {
    // Fill HashToEntryMap with hashes for each entry
    Array.from(entryToNodeMap.keys()).map(entry => this.#hashToEntry.set(this.generateTraceEntryHash(entry), entry));
    this.#entriesFilter = new TraceEngine.EntriesFilter.EntriesFilter(entryToNodeMap);
    this.#timelineBreadcrumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(wholeTraceBounds);
  }

  getEntriesFilter(): TraceEngine.EntriesFilter.EntriesFilter {
    return this.#entriesFilter;
  }

  getTimelineBreadcrumbs(): TimelineComponents.Breadcrumbs.Breadcrumbs {
    return this.#timelineBreadcrumbs;
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
      initialBreadcrumb: this.#timelineBreadcrumbs.initialBreadcrumb,
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
      const hiddenEntries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[] = [];
      annotations.hiddenRendererEventsHashes.map(hiddenEntryHash => {
        const hiddenEntry = this.#hashToEntry.get(hiddenEntryHash);
        if (hiddenEntry) {
          hiddenEntries.push(hiddenEntry);
        }
      });
      this.#entriesFilter.setInvisibleEntries(hiddenEntries);

      this.#timelineBreadcrumbs.setInitialBreadcrumbFromLoadedAnnotations(annotations.initialBreadcrumb);
  }
}
