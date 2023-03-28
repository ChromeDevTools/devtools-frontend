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

/* eslint-disable @typescript-eslint/naming-convention */

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {RecordType, TimelineData} from './TimelineModel.js';
import type {TracingLayerPayload, TracingLayerTile} from './TracingLayerTree.js';
import {TracingLayerTree} from './TracingLayerTree.js';

export class TimelineFrameModel {
  // COHERENT BEGIN
  private readonly initCohEventStyles?: (event: SDK.TracingModel.Event) => void;
  // COHERENT END
  private readonly categoryMapper: (arg0: SDK.TracingModel.Event) => string;
  private frames!: TimelineFrame[];
  private frameById!: {
    [x: number]: TimelineFrame,
  };
  private minimumRecordTime!: number;
  private lastFrame!: TimelineFrame|null;
  private mainFrameCommitted!: boolean;
  private mainFrameRequested!: boolean;
  private lastLayerTree!: TracingFrameLayerTree|null;
  private framePendingActivation!: PendingFrame|null;
  private currentTaskTimeByCategory!: {
    [x: string]: number,
  };
  private target!: SDK.Target.Target|null;
  private framePendingCommit?: PendingFrame|null;
  private lastBeginFrame?: number|null;
  private lastDroppedFrame?: number|null;
  private lastNeedsBeginFrame?: number|null;
  private lastTaskBeginTime?: number|null;
  private layerTreeId?: number|null;
  private currentProcessMainThread?: SDK.TracingModel.Thread|null;

  constructor(
    categoryMapper: (arg0: SDK.TracingModel.Event) => string,
    // COHERENT BEGIN
    initCohEventStyles?: (event: SDK.TracingModel.Event) => void,
    // COHERENT END
  ) {
    this.categoryMapper = categoryMapper;
    this.initCohEventStyles = initCohEventStyles;
    this.reset();
  }

  getFrames(): TimelineFrame[] {
    return this.frames;
  }

  getFramesWithinWindow(startTime: number, endTime: number): TimelineFrame[] {
    const firstFrame =
        Platform.ArrayUtilities.lowerBound(this.frames, startTime || 0, (time, frame) => time - frame.endTime);
    const lastFrame =
        Platform.ArrayUtilities.lowerBound(this.frames, endTime || Infinity, (time, frame) => time - frame.startTime);
    return this.frames.slice(firstFrame, lastFrame);
  }

  hasRasterTile(rasterTask: SDK.TracingModel.Event): boolean {
    const data = rasterTask.args['tileData'];
    if (!data) {
      return false;
    }
    const frameId = data['sourceFrameNumber'];
    const frame = frameId && this.frameById[frameId];
    if (!frame || !frame.layerTree) {
      return false;
    }
    return true;
  }

  rasterTilePromise(rasterTask: SDK.TracingModel.Event): Promise<{
    rect: Protocol.DOM.Rect,
    snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
  }|null> {
    if (!this.target) {
      return Promise.resolve(null);
    }
    const data = rasterTask.args['tileData'];
    const frameId = (data['sourceFrameNumber'] as number);
    const tileId = data['tileId'] && data['tileId']['id_ref'];
    const frame = frameId && this.frameById[frameId];
    if (!frame || !frame.layerTree || !tileId) {
      return Promise.resolve(null);
    }

    return frame.layerTree.layerTreePromise().then(layerTree => layerTree && layerTree.pictureForRasterTile(tileId));
  }

  reset(): void {
    this.minimumRecordTime = Infinity;
    this.frames = [];
    this.frameById = {};
    this.lastFrame = null;
    this.lastLayerTree = null;
    this.mainFrameCommitted = false;
    this.mainFrameRequested = false;
    this.framePendingCommit = null;
    this.lastBeginFrame = null;
    this.lastDroppedFrame = null;
    this.lastNeedsBeginFrame = null;
    this.framePendingActivation = null;
    this.lastTaskBeginTime = null;
    this.target = null;
    this.layerTreeId = null;
    this.currentTaskTimeByCategory = {};
  }

  handleBeginFrame(startTime: number): void {
    if (!this.lastFrame) {
      this.startFrame(startTime);
    }
    this.lastBeginFrame = startTime;
  }

  handleDroppedFrame(startTime: number): void {
    if (!this.lastFrame) {
      this.startFrame(startTime);
    }
    this.lastDroppedFrame = startTime;
  }

  handleDrawFrame(startTime: number): void {
    if (!this.lastFrame) {
      this.startFrame(startTime);
      return;
    }

    // - if it wasn't drawn, it didn't happen!
    // - only show frames that either did not wait for the main thread frame or had one committed.
    if (this.mainFrameCommitted || !this.mainFrameRequested) {
      if (this.lastNeedsBeginFrame) {
        const idleTimeEnd = this.framePendingActivation ? this.framePendingActivation.triggerTime :
                                                          (this.lastBeginFrame || this.lastNeedsBeginFrame);
        if (idleTimeEnd > this.lastFrame.startTime) {
          this.lastFrame.idle = true;
          this.startFrame(idleTimeEnd);
          if (this.framePendingActivation) {
            this.commitPendingFrame();
          }
          this.lastBeginFrame = null;
        }
        this.lastNeedsBeginFrame = null;
      }
      if (this.lastDroppedFrame) {
        this.lastFrame.dropped = true;
        this.startFrame(this.lastDroppedFrame);
        this.lastDroppedFrame = null;
      }
      this.startFrame(startTime);
    }
    this.mainFrameCommitted = false;
  }

  handleActivateLayerTree(): void {
    if (!this.lastFrame) {
      return;
    }
    if (this.framePendingActivation && !this.lastNeedsBeginFrame) {
      this.commitPendingFrame();
    }
  }

  handleRequestMainThreadFrame(): void {
    if (!this.lastFrame) {
      return;
    }
    this.mainFrameRequested = true;
  }

  handleCompositeLayers(): void {
    if (!this.framePendingCommit) {
      return;
    }
    this.framePendingActivation = this.framePendingCommit;
    this.framePendingCommit = null;
    this.mainFrameRequested = false;
    this.mainFrameCommitted = true;
  }

  handleLayerTreeSnapshot(layerTree: TracingFrameLayerTree): void {
    this.lastLayerTree = layerTree;
  }

  handleNeedFrameChanged(startTime: number, needsBeginFrame: boolean): void {
    if (needsBeginFrame) {
      this.lastNeedsBeginFrame = startTime;
    }
  }

  private startFrame(startTime: number): void {
    if (this.lastFrame) {
      this.flushFrame(this.lastFrame, startTime);
    }
    this.lastFrame = new TimelineFrame(startTime, startTime - this.minimumRecordTime);
  }

  private flushFrame(frame: TimelineFrame, endTime: number): void {
    frame.setLayerTree(this.lastLayerTree);
    frame.setEndTime(endTime);
    if (this.lastLayerTree) {
      this.lastLayerTree.setPaints(frame.paints);
    }
    const lastFrame = this.frames[this.frames.length - 1];
    if (this.frames.length && lastFrame && (frame.startTime !== lastFrame.endTime || frame.startTime > frame.endTime)) {
      console.assert(
          false, `Inconsistent frame time for frame ${this.frames.length} (${frame.startTime} - ${frame.endTime})`);
    }
    this.frames.push(frame);
    if (typeof frame.mainFrameId === 'number') {
      this.frameById[frame.mainFrameId] = frame;
    }
  }

  private commitPendingFrame(): void {
    if (!this.framePendingActivation || !this.lastFrame) {
      return;
    }

    this.lastFrame.addTimeForCategories(this.framePendingActivation.timeByCategory);
    this.lastFrame.paints = this.framePendingActivation.paints;
    this.lastFrame.mainFrameId = this.framePendingActivation.mainFrameId;
    this.framePendingActivation = null;
  }

  addTraceEvents(target: SDK.Target.Target|null, events: SDK.TracingModel.Event[], threadData: {
    thread: SDK.TracingModel.Thread,
    time: number,
  }[]): void {
    this.target = target;
    let j = 0;
    this.currentProcessMainThread = threadData.length && threadData[0].thread || null;
    for (let i = 0; i < events.length; ++i) {
      while (j + 1 < threadData.length && threadData[j + 1].time <= events[i].startTime) {
        this.currentProcessMainThread = threadData[++j].thread;
      }
      this.addTraceEvent(events[i]);
    }
    this.currentProcessMainThread = null;
  }

  private addTraceEvent(event: SDK.TracingModel.Event): void {
    // COHERENT BEGIN
    if (this.initCohEventStyles) {
      this.initCohEventStyles(event);
    }
    // COHERENT END

    if (event.startTime && event.startTime < this.minimumRecordTime) {
      this.minimumRecordTime = event.startTime;
    }

    if (event.name === RecordType.SetLayerTreeId) {
      this.layerTreeId = event.args['layerTreeId'] || event.args['data']['layerTreeId'];
    } else if (
        event.id && event.phase === SDK.TracingModel.Phase.SnapshotObject &&
        event.name === RecordType.LayerTreeHostImplSnapshot && Number(event.id) === this.layerTreeId && this.target) {
      const snapshot = (event as SDK.TracingModel.ObjectSnapshot);
      this.handleLayerTreeSnapshot(new TracingFrameLayerTree(this.target, snapshot));
    } else {
      this.processCompositorEvents(event);
      if (event.thread === this.currentProcessMainThread) {
        this.addMainThreadTraceEvent(event);
      } else if (this.lastFrame && event.selfTime && !SDK.TracingModel.TracingModel.isTopLevelEvent(event)) {
        this.lastFrame.addTimeForCategory(this.categoryMapper(event), event.selfTime);
      }
    }
  }

  private processCompositorEvents(event: SDK.TracingModel.Event): void {
    if (event.args['layerTreeId'] !== this.layerTreeId) {
      return;
    }

    const timestamp = event.startTime;
    if (event.name === RecordType.BeginFrame) {
      this.handleBeginFrame(timestamp);
    } else if (event.name === RecordType.DrawFrame) {
      if (event.phase === 'I') {
        // Legacy behavior: If DrawFrame is an instant event, then it is not
        // supposed to contain frame presentation info; use the event time of
        // DrawFrame in this case.
        // TODO(mjzhang): Remove this legacy support when the migration to
        // using presentation time as frame boundary is stablized.
        this.handleDrawFrame(timestamp);
      } else if (event.args['presentationTimestamp']) {
        // Current behavior: Use the presentation timestamp. If the non-instant
        // DrawFrame event contains no such timestamp, then the presentation did
        // not happen and therefore the event will not be processed.
        this.handleDrawFrame(event.args['presentationTimestamp'] / 1000);
      }
    } else if (event.name === RecordType.ActivateLayerTree) {
      this.handleActivateLayerTree();
    } else if (event.name === RecordType.RequestMainThreadFrame) {
      this.handleRequestMainThreadFrame();
    } else if (event.name === RecordType.NeedsBeginFrameChanged) {
      this.handleNeedFrameChanged(timestamp, event.args['data'] && event.args['data']['needsBeginFrame']);
    } else if (event.name === RecordType.DroppedFrame) {
      this.handleDroppedFrame(timestamp);
    }
  }

  private addMainThreadTraceEvent(event: SDK.TracingModel.Event): void {
    if (SDK.TracingModel.TracingModel.isTopLevelEvent(event)) {
      this.currentTaskTimeByCategory = {};
      this.lastTaskBeginTime = event.startTime;
    }
    if (!this.framePendingCommit && TimelineFrameModel.mainFrameMarkers.indexOf(event.name as RecordType) >= 0) {
      this.framePendingCommit =
          new PendingFrame(this.lastTaskBeginTime || event.startTime, this.currentTaskTimeByCategory);
    }
    if (!this.framePendingCommit) {
      this.addTimeForCategory(this.currentTaskTimeByCategory, event);
      return;
    }
    this.addTimeForCategory(this.framePendingCommit.timeByCategory, event);

    if (event.name === RecordType.BeginMainThreadFrame && event.args['data'] && event.args['data']['frameId']) {
      this.framePendingCommit.mainFrameId = event.args['data']['frameId'];
    }
    if (event.name === RecordType.Paint && event.args['data']['layerId'] && TimelineData.forEvent(event).picture &&
        this.target) {
      this.framePendingCommit.paints.push(new LayerPaintEvent(event, this.target));
    }
    if (event.name === RecordType.CompositeLayers && event.args['layerTreeId'] === this.layerTreeId) {
      this.handleCompositeLayers();
    }
  }

  private addTimeForCategory(
      timeByCategory: {
        [x: string]: number,
      },
      event: SDK.TracingModel.Event): void {
    if (!event.selfTime) {
      return;
    }
    const categoryName = this.categoryMapper(event);
    timeByCategory[categoryName] = (timeByCategory[categoryName] || 0) + event.selfTime;
  }

  private static readonly mainFrameMarkers: RecordType[] = [
    RecordType.ScheduleStyleRecalculation,
    RecordType.InvalidateLayout,
    RecordType.BeginMainThreadFrame,
    RecordType.ScrollLayer,
  ];
}

export class TracingFrameLayerTree {
  private readonly target: SDK.Target.Target;
  private readonly snapshot: SDK.TracingModel.ObjectSnapshot;
  private paintsInternal!: LayerPaintEvent[]|undefined;

  constructor(target: SDK.Target.Target, snapshot: SDK.TracingModel.ObjectSnapshot) {
    this.target = target;
    this.snapshot = snapshot;
  }

  async layerTreePromise(): Promise<TracingLayerTree|null> {
    const result = (await this.snapshot.objectPromise() as unknown as {
      active_tiles: TracingLayerTile[],
      device_viewport_size: {
        width: number,
        height: number,
      },
      active_tree: {
        root_layer: TracingLayerPayload,
        layers: TracingLayerPayload[],
      },
    });
    if (!result) {
      return null;
    }
    const viewport = result['device_viewport_size'];
    const tiles = result['active_tiles'];
    const rootLayer = result['active_tree']['root_layer'];
    const layers = result['active_tree']['layers'];
    const layerTree = new TracingLayerTree(this.target);
    layerTree.setViewportSize(viewport);
    layerTree.setTiles(tiles);

    await layerTree.setLayers(rootLayer, layers, this.paintsInternal || []);
    return layerTree;
  }

  paints(): LayerPaintEvent[] {
    return this.paintsInternal || [];
  }

  setPaints(paints: LayerPaintEvent[]): void {
    this.paintsInternal = paints;
  }
}

export class TimelineFrame {
  startTime: number;
  startTimeOffset: number;
  endTime: number;
  duration: number;
  timeByCategory: {
    [x: string]: number,
  };
  cpuTime: number;
  idle: boolean;
  dropped: boolean;
  layerTree: TracingFrameLayerTree|null;
  paints: LayerPaintEvent[];
  mainFrameId: number|undefined;

  constructor(startTime: number, startTimeOffset: number) {
    this.startTime = startTime;
    this.startTimeOffset = startTimeOffset;
    this.endTime = this.startTime;
    this.duration = 0;
    this.timeByCategory = {};
    this.cpuTime = 0;
    this.idle = false;
    this.dropped = false;
    this.layerTree = null;
    this.paints = [];
    this.mainFrameId = undefined;
  }

  hasWarnings(): boolean {
    return false;
  }

  setEndTime(endTime: number): void {
    this.endTime = endTime;
    this.duration = this.endTime - this.startTime;
  }

  setLayerTree(layerTree: TracingFrameLayerTree|null): void {
    this.layerTree = layerTree;
  }

  addTimeForCategories(timeByCategory: {
    [x: string]: number,
  }): void {
    for (const category in timeByCategory) {
      this.addTimeForCategory(category, timeByCategory[category]);
    }
  }

  addTimeForCategory(category: string, time: number): void {
    this.timeByCategory[category] = (this.timeByCategory[category] || 0) + time;
    this.cpuTime += time;
  }
}

export class LayerPaintEvent {
  private readonly eventInternal: SDK.TracingModel.Event;
  private readonly target: SDK.Target.Target|null;

  constructor(event: SDK.TracingModel.Event, target: SDK.Target.Target|null) {
    this.eventInternal = event;
    this.target = target;
  }

  layerId(): string {
    return this.eventInternal.args['data']['layerId'];
  }

  event(): SDK.TracingModel.Event {
    return this.eventInternal;
  }

  picturePromise(): Promise<{
    rect: Array<number>,
    serializedPicture: string,
  }|null> {
    const picture = TimelineData.forEvent(this.eventInternal).picture;
    if (!picture) {
      return Promise.resolve(null);
    }

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return picture.objectPromise().then((result: any) => {
      if (!result) {
        return null;
      }
      const rect = result['params'] && result['params']['layer_rect'];
      const picture = result['skp64'];
      return rect && picture ? {rect: rect, serializedPicture: picture} : null;
    });
  }

  async snapshotPromise(): Promise<{
    rect: Array<number>,
    snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
  }|null> {
    const paintProfilerModel = this.target && this.target.model(SDK.PaintProfiler.PaintProfilerModel);
    const picture = await this.picturePromise();
    if (!picture || !paintProfilerModel) {
      return null;
    }
    const snapshot = await paintProfilerModel.loadSnapshot(picture.serializedPicture);
    return snapshot ? {rect: picture.rect, snapshot: snapshot} : null;
  }
}

export class PendingFrame {
  timeByCategory: {
    [x: string]: number,
  };
  paints: LayerPaintEvent[];
  mainFrameId: number|undefined;
  triggerTime: number;
  constructor(triggerTime: number, timeByCategory: {
    [x: string]: number,
  }) {
    this.timeByCategory = timeByCategory;
    this.paints = [];
    this.mainFrameId = undefined;
    this.triggerTime = triggerTime;
  }
}
