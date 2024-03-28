// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import * as TimelineComponents from '../../panels/timeline/components/components.js';

let instance: AnnotationsManager|null = null;
type EntryToNodeMap =
    Map<TraceEngine.Types.TraceEvents.SyntheticTraceEntry, TraceEngine.Helpers.TreeHelpers.TraceEntryNode>;

export class AnnotationsManager {
  /**
   * An Array with all trace entries.
   * We save annotations into the trace file by saving their id in the allEntries Array.
   **/
  #allEntries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[];
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
    this.#entriesFilter = new TraceEngine.EntriesFilter.EntriesFilter(entryToNodeMap);
    this.#timelineBreadcrumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(wholeTraceBounds);
    this.#allEntries = Array.from(entryToNodeMap.keys());
  }

  getEntriesFilter(): TraceEngine.EntriesFilter.EntriesFilter {
    return this.#entriesFilter;
  }

  getTimelineBreadcrumbs(): TimelineComponents.Breadcrumbs.Breadcrumbs {
    return this.#timelineBreadcrumbs;
  }

  getEntryIndex(entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry): number {
    return this.#allEntries.indexOf(entry);
  }

  /**
   * Builds all annotations and returns the object written into the 'annotations' trace file metada field.
   */
  getAnnotations(): TraceEngine.Types.File.Annotations {
    const indexesOfSynteticEntries: number[] = [];
    const hiddenEntries = this.#entriesFilter.invisibleEntries();
    if (hiddenEntries) {
      for (const entry of hiddenEntries) {
        indexesOfSynteticEntries.push(this.getEntryIndex(entry));
      }
    }

    return {
      hiddenEntriesIndexes: indexesOfSynteticEntries,
      initialBreadcrumb: this.#timelineBreadcrumbs.initialBreadcrumb,
    };
  }

  applyAnnotations(annotations: TraceEngine.Types.File.Annotations): void {
    // Build the hidden events array by getting the entries by their index in the allEntries array.
    const hiddenEntries: TraceEngine.Types.TraceEvents.SyntheticTraceEntry[] = [];
    annotations.hiddenEntriesIndexes.map(hiddenEntryHash => {
      const hiddenEntry = this.#allEntries[hiddenEntryHash];
      if (hiddenEntry) {
        hiddenEntries.push(hiddenEntry);
      }
    });
    this.#entriesFilter.setInvisibleEntries(hiddenEntries);
    this.#timelineBreadcrumbs.setInitialBreadcrumbFromLoadedAnnotations(annotations.initialBreadcrumb);
  }
}
