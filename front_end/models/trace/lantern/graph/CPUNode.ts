// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {BaseNode} from './BaseNode.js';
import type * as Lantern from '../types/types.js';

class CPUNode<T = Lantern.AnyNetworkObject> extends BaseNode<T> {
  _event: Lantern.TraceEvent;
  _childEvents: Lantern.TraceEvent[];
  correctedEndTs: number|undefined;

  constructor(parentEvent: Lantern.TraceEvent, childEvents: Lantern.TraceEvent[] = [], correctedEndTs?: number) {
    const nodeId = `${parentEvent.tid}.${parentEvent.ts}`;
    super(nodeId);

    this._event = parentEvent;
    this._childEvents = childEvents;
    this.correctedEndTs = correctedEndTs;
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

  /**
   * Returns true if this node contains a Layout task.
   */
  didPerformLayout(): boolean {
    return this._childEvents.some(evt => evt.name === 'Layout');
  }

  /**
   * Returns the script URLs that had their EvaluateScript events occur in this task.
   */
  getEvaluateScriptURLs(): Set<string> {
    const urls = new Set<string>();
    for (const event of this._childEvents) {
      if (event.name !== 'EvaluateScript') {
        continue;
      }
      if (!event.args.data || !event.args.data.url) {
        continue;
      }
      urls.add(event.args.data.url);
    }

    return urls;
  }

  override cloneWithoutRelationships(): CPUNode {
    return new CPUNode(this._event, this._childEvents, this.correctedEndTs);
  }
}

export {CPUNode};
