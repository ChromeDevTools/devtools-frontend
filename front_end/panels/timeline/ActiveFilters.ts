// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Trace from '../../models/trace/trace.js';

let instance: ActiveFilters|null = null;
/** Singleton class that contains the set of active filters for the given trace
 * file.
 */
export class ActiveFilters {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActiveFilters {
    const forceNew = Boolean(opts.forceNew);
    if (!instance || forceNew) {
      instance = new ActiveFilters();
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  #activeFilters: Trace.Extras.TraceFilter.TraceFilter[] = [];

  activeFilters(): readonly Trace.Extras.TraceFilter.TraceFilter[] {
    return this.#activeFilters;
  }

  setFilters(newFilters: Trace.Extras.TraceFilter.TraceFilter[]): void {
    this.#activeFilters = newFilters;
  }

  isVisible(event: Trace.Types.Events.Event): boolean {
    return this.#activeFilters.every(f => f.accept(event));
  }
}
