/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class PaintProfilerModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._layerTreeAgent = target.layerTreeAgent();
  }

  /**
   * @param {!Array.<!PictureFragment>} fragments
   * @return {!Promise<?PaintProfilerSnapshot>}
   */
  async loadSnapshotFromFragments(fragments) {
    const snapshotId = await this._layerTreeAgent.loadSnapshot(fragments);
    return snapshotId && new PaintProfilerSnapshot(this, snapshotId);
  }

  /**
   * @param {string} encodedPicture
   * @return {!Promise<?PaintProfilerSnapshot>}
   */
  loadSnapshot(encodedPicture) {
    const fragment = {x: 0, y: 0, picture: encodedPicture};
    return this.loadSnapshotFromFragments([fragment]);
  }

  /**
   * @param {string} layerId
   * @return {!Promise<?PaintProfilerSnapshot>}
   */
  async makeSnapshot(layerId) {
    const snapshotId = await this._layerTreeAgent.makeSnapshot(layerId);
    return snapshotId && new PaintProfilerSnapshot(this, snapshotId);
  }
}

export class PaintProfilerSnapshot {
  /**
   * @param {!PaintProfilerModel} paintProfilerModel
   * @param {string} snapshotId
   */
  constructor(paintProfilerModel, snapshotId) {
    this._paintProfilerModel = paintProfilerModel;
    this._id = snapshotId;
    this._refCount = 1;
  }

  release() {
    console.assert(this._refCount > 0, 'release is already called on the object');
    if (!--this._refCount) {
      this._paintProfilerModel._layerTreeAgent.releaseSnapshot(this._id);
    }
  }

  addReference() {
    ++this._refCount;
    console.assert(this._refCount > 0, 'Referencing a dead object');
  }

  /**
   * @param {number=} scale
   * @param {number=} firstStep
   * @param {number=} lastStep
   * @return {!Promise<?string>}
   */
  replay(scale, firstStep, lastStep) {
    return this._paintProfilerModel._layerTreeAgent.replaySnapshot(this._id, firstStep, lastStep, scale || 1.0);
  }

  /**
   * @param {?Protocol.DOM.Rect} clipRect
   * @return {!Promise<?Array<!Protocol.LayerTree.PaintProfile>>}
   */
  profile(clipRect) {
    return this._paintProfilerModel._layerTreeAgent.profileSnapshot(this._id, 5, 1, clipRect || undefined);
  }

  /**
   * @return {!Promise<?Array<!PaintProfilerLogItem>>}
   */
  async commandLog() {
    const log = await this._paintProfilerModel._layerTreeAgent.snapshotCommandLog(this._id);
    return log &&
        log.map((entry, index) => new PaintProfilerLogItem(/** @type {!RawPaintProfilerLogItem} */ (entry), index));
  }
}

/**
 * @unrestricted
 */
export class PaintProfilerLogItem {
  /**
   * @param {!RawPaintProfilerLogItem} rawEntry
   * @param {number} commandIndex
   */
  constructor(rawEntry, commandIndex) {
    this.method = rawEntry.method;
    this.params = rawEntry.params;
    this.commandIndex = commandIndex;
  }
}

SDKModel.register(PaintProfilerModel, Capability.DOM, false);

/** @typedef {!{
        rect: !Protocol.DOM.Rect,
        snapshot: !PaintProfilerSnapshot
    }}
*/
export let SnapshotWithRect;

/**
 * @typedef {!{x: number, y: number, picture: string}}
 */
export let PictureFragment;

/**
 * @typedef {!{method: string, params: ?Object<string, *>}}
 */
export let RawPaintProfilerLogItem;
