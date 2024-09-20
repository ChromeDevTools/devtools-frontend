// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Trace from '../../models/trace/trace.js';

import {TimelinePanel} from './TimelinePanel.js';

type ExtensionData = Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;

let extensionDataGathererInstance: ExtensionDataGatherer|undefined;

/**
 * This class abstracts the source of extension data out by providing a
 * single access point to the performance panel for extension data.
 */
export class ExtensionDataGatherer {
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #extensionDataByModel: Map<Trace.Handlers.Types.ParsedTrace, ExtensionData> = new Map();
  static instance(): ExtensionDataGatherer {
    if (extensionDataGathererInstance) {
      return extensionDataGathererInstance;
    }
    extensionDataGathererInstance = new ExtensionDataGatherer();
    return extensionDataGathererInstance;
  }

  static removeInstance(): void {
    extensionDataGathererInstance = undefined;
  }

  /**
   * Gets the data provided by extensions.
   */
  getExtensionData(): ExtensionData {
    const extensionDataEnabled = TimelinePanel.extensionDataVisibilitySetting().get();
    if (!extensionDataEnabled || !this.#parsedTrace || !this.#parsedTrace.ExtensionTraceData) {
      return {extensionMarkers: [], extensionTrackData: [], entryToNode: new Map()};
    }
    const maybeCachedData = this.#extensionDataByModel.get(this.#parsedTrace);
    if (maybeCachedData) {
      return maybeCachedData;
    }
    return this.#parsedTrace.ExtensionTraceData;
  }

  saveCurrentModelData(): void {
    if (this.#parsedTrace && !this.#extensionDataByModel.has(this.#parsedTrace)) {
      this.#extensionDataByModel.set(this.#parsedTrace, this.getExtensionData());
    }
  }

  modelChanged(parsedTrace: Trace.Handlers.Types.ParsedTrace|null): void {
    if (parsedTrace === this.#parsedTrace) {
      return;
    }
    if (this.#parsedTrace !== null) {
      // DevTools extension data is assumed to be useful only for the current
      // trace data (model). As such, if the model changes, we cache the devtools
      // extension data we have collected for the previous model and listen
      // for new data that applies to the new model.
      this.saveCurrentModelData();
    }
    this.#parsedTrace = parsedTrace;
  }
}
