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

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export class PaintProfilerModel extends SDKModel<void> {
  readonly layerTreeAgent: ProtocolProxyApi.LayerTreeApi;

  constructor(target: Target) {
    super(target);
    this.layerTreeAgent = target.layerTreeAgent();
  }

  async loadSnapshotFromFragments(tiles: Protocol.LayerTree.PictureTile[]): Promise<PaintProfilerSnapshot|null> {
    const {snapshotId} = await this.layerTreeAgent.invoke_loadSnapshot({tiles});
    return snapshotId ? new PaintProfilerSnapshot(this, snapshotId) : null;
  }

  loadSnapshot(encodedPicture: Protocol.binary): Promise<PaintProfilerSnapshot|null> {
    const fragment = {x: 0, y: 0, picture: encodedPicture};
    return this.loadSnapshotFromFragments([fragment]);
  }

  async makeSnapshot(layerId: Protocol.LayerTree.LayerId): Promise<PaintProfilerSnapshot|null> {
    const {snapshotId} = await this.layerTreeAgent.invoke_makeSnapshot({layerId});
    return snapshotId ? new PaintProfilerSnapshot(this, snapshotId) : null;
  }
}

export class PaintProfilerSnapshot {
  readonly #paintProfilerModel: PaintProfilerModel;
  readonly #id: Protocol.LayerTree.SnapshotId;
  #refCount: number;

  constructor(paintProfilerModel: PaintProfilerModel, snapshotId: Protocol.LayerTree.SnapshotId) {
    this.#paintProfilerModel = paintProfilerModel;
    this.#id = snapshotId;
    this.#refCount = 1;
  }

  release(): void {
    console.assert(this.#refCount > 0, 'release is already called on the object');
    if (!--this.#refCount) {
      void this.#paintProfilerModel.layerTreeAgent.invoke_releaseSnapshot({snapshotId: this.#id});
    }
  }

  addReference(): void {
    ++this.#refCount;
    console.assert(this.#refCount > 0, 'Referencing a dead object');
  }

  async replay(scale?: number, fromStep?: number, toStep?: number): Promise<string|null> {
    const response = await this.#paintProfilerModel.layerTreeAgent.invoke_replaySnapshot(
        {snapshotId: this.#id, fromStep, toStep, scale: scale || 1.0});
    return response.dataURL;
  }

  async profile(clipRect: Protocol.DOM.Rect|null): Promise<Protocol.LayerTree.PaintProfile[]> {
    const response = await this.#paintProfilerModel.layerTreeAgent.invoke_profileSnapshot(
        {snapshotId: this.#id, minRepeatCount: 5, minDuration: 1, clipRect: clipRect || undefined});

    return response.timings;
  }

  async commandLog(): Promise<PaintProfilerLogItem[]|null> {
    const response = await this.#paintProfilerModel.layerTreeAgent.invoke_snapshotCommandLog({snapshotId: this.#id});

    return response.commandLog ? response.commandLog.map((entry, index) => new PaintProfilerLogItem(entry, index)) :
                                 null;
  }
}

export class PaintProfilerLogItem {
  method: string;
  params: RawPaintProfilerLogItemParams|null;
  commandIndex: number;

  constructor(rawEntry: RawPaintProfilerLogItem, commandIndex: number) {
    this.method = rawEntry.method;
    this.params = rawEntry.params;
    this.commandIndex = commandIndex;
  }
}

SDKModel.register(PaintProfilerModel, {capabilities: Capability.DOM, autostart: false});

export type RawPaintProfilerLogItemParamValue = string|{[key: string]: RawPaintProfilerLogItemParamValue};
export type RawPaintProfilerLogItemParams = {
  [key: string]: RawPaintProfilerLogItemParamValue,
};

export interface SnapshotWithRect {
  rect: Protocol.DOM.Rect;
  snapshot: PaintProfilerSnapshot;
}

export interface PictureFragment {
  x: number;
  y: number;
  picture: string;
}

export interface RawPaintProfilerLogItem {
  method: string;
  params: RawPaintProfilerLogItemParams|null;
}
