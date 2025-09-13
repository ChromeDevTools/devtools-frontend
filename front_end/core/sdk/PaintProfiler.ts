// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

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
export type RawPaintProfilerLogItemParams = Record<string, RawPaintProfilerLogItemParamValue>;

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
