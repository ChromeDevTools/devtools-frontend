// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lantern from '../types/types.js';

import {BaseNode} from './BaseNode.js';

class CPUNode<T = Lantern.AnyNetworkObject> extends BaseNode<T> {
  _event: Lantern.TraceEvent;
  _childEvents: Lantern.TraceEvent[];
  correctedEndTs: number|undefined;
  // TODO(crbug.com/568836981): Remove once v8.evaluateModule includes `url` in
  // all supported Chrome versions.
  #scriptUrlById?: ReadonlyMap<number, string>;

  constructor(parentEvent: Lantern.TraceEvent, childEvents: Lantern.TraceEvent[] = [], correctedEndTs?: number,
              scriptUrlById?: ReadonlyMap<number, string>) {
    const nodeId = `${parentEvent.tid}.${parentEvent.ts}`;
    super(nodeId);

    this._event = parentEvent;
    this._childEvents = childEvents;
    this.correctedEndTs = correctedEndTs;
    this.#scriptUrlById = scriptUrlById;
  }

  override get type(): 'cpu' {
    return BaseNode.types.CPU;
  }

  override get startTime(): number {
    return this._event.ts;
  }

  override get endTime(): number {
    if (this.correctedEndTs) {
      return this.correctedEndTs;
    }
    return this._event.ts + this._event.dur;
  }

  get duration(): number {
    return this.endTime - this.startTime;
  }

  get event(): Lantern.TraceEvent {
    return this._event;
  }

  get childEvents(): Lantern.TraceEvent[] {
    return this._childEvents;
  }

  // TODO(crbug.com/568836981): Remove once v8.evaluateModule includes `url` in
  // all supported Chrome versions.
  getScriptUrlById(scriptId: number): string|undefined {
    return this.#scriptUrlById?.get(scriptId);
  }

  /**
   * Returns true if this node contains a Layout task.
   */
  didPerformLayout(): boolean {
    return this._childEvents.some(evt => evt.name === 'Layout');
  }

  /**
   * Returns the script URLs that had their EvaluateScript or v8.evaluateModule events occur in this task.
   */
  getEvaluateScriptURLs(): Set<string> {
    const urls = new Set<string>();
    for (const event of this._childEvents) {
      if (event.name === 'EvaluateScript' || event.name === 'v8.evaluateModule') {
        if (event.args.data?.url) {
          urls.add(event.args.data.url);
        }
        continue;
      }

      // TODO(crbug.com/568836981): Remove this workaround once v8.evaluateModule
      // includes `args.data.url` in all supported Chrome versions.
      if (event.name === 'ModuleEvaluated' && event.args.data?.scriptId !== undefined) {
        const url = this.#scriptUrlById?.get(event.args.data.scriptId);
        if (url) {
          urls.add(url);
        }
      }
    }

    return urls;
  }

  override cloneWithoutRelationships(): CPUNode {
    return new CPUNode(this._event, this._childEvents, this.correctedEndTs, this.#scriptUrlById);
  }
}

export {CPUNode};
