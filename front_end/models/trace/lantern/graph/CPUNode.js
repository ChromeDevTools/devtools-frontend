// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { BaseNode } from './BaseNode.js';
class CPUNode extends BaseNode {
    _event;
    _childEvents;
    correctedEndTs;
    constructor(parentEvent, childEvents = [], correctedEndTs) {
        const nodeId = `${parentEvent.tid}.${parentEvent.ts}`;
        super(nodeId);
        this._event = parentEvent;
        this._childEvents = childEvents;
        this.correctedEndTs = correctedEndTs;
    }
    get type() {
        return BaseNode.types.CPU;
    }
    get startTime() {
        return this._event.ts;
    }
    get endTime() {
        if (this.correctedEndTs) {
            return this.correctedEndTs;
        }
        return this._event.ts + this._event.dur;
    }
    get duration() {
        return this.endTime - this.startTime;
    }
    get event() {
        return this._event;
    }
    get childEvents() {
        return this._childEvents;
    }
    /**
     * Returns true if this node contains a Layout task.
     */
    didPerformLayout() {
        return this._childEvents.some(evt => evt.name === 'Layout');
    }
    /**
     * Returns the script URLs that had their EvaluateScript events occur in this task.
     */
    getEvaluateScriptURLs() {
        const urls = new Set();
        for (const event of this._childEvents) {
            if (event.name !== 'EvaluateScript') {
                continue;
            }
            if (!event.args.data?.url) {
                continue;
            }
            urls.add(event.args.data.url);
        }
        return urls;
    }
    cloneWithoutRelationships() {
        return new CPUNode(this._event, this._childEvents, this.correctedEndTs);
    }
}
export { CPUNode };
//# sourceMappingURL=CPUNode.js.map