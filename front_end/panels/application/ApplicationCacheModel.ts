// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export class ApplicationCacheModel extends SDK.SDKModel.SDKModel<EventTypes> {
  private readonly agent: ProtocolProxyApi.ApplicationCacheApi;
  private readonly statuses: Map<Protocol.Page.FrameId, number>;
  private manifestURLsByFrame: Map<Protocol.Page.FrameId, string>;
  private onLineInternal: boolean;
  constructor(target: SDK.Target.Target) {
    super(target);

    target.registerApplicationCacheDispatcher(new ApplicationCacheDispatcher(this));
    this.agent = target.applicationCacheAgent();
    this.agent.invoke_enable();

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('Target must provide an ResourceTreeModel');
    }
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this.frameNavigatedCallback, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this.frameDetached, this);

    this.statuses = new Map();
    this.manifestURLsByFrame = new Map();

    this.mainFrameNavigated();
    this.onLineInternal = true;
  }

  private frameNavigatedCallback(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
      void {
    this.frameNavigated(event);
  }

  private async frameNavigated(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
      Promise<void> {
    const frame = event.data;
    if (frame.isMainFrame()) {
      this.mainFrameNavigated();
      return;
    }

    const frameId = frame.id;
    const manifestURL = await this.agent.invoke_getManifestForFrame({frameId});
    if (manifestURL !== null && !manifestURL) {
      this.frameManifestRemoved(frameId);
    }
  }

  private frameDetached(
      event: Common.EventTarget.EventTargetEvent<{frame: SDK.ResourceTreeModel.ResourceTreeFrame, isSwap: boolean}>):
      void {
    this.frameManifestRemoved(event.data.frame.id);
  }

  reset(): void {
    this.statuses.clear();
    this.manifestURLsByFrame.clear();
    this.dispatchEventToListeners(Events.FrameManifestsReset);
  }

  private async mainFrameNavigated(): Promise<void> {
    const framesWithManifests = await this.agent.invoke_getFramesWithManifests();
    if (framesWithManifests.getError()) {
      return;
    }
    for (const frame of framesWithManifests.frameIds) {
      this.frameManifestUpdated(frame.frameId, frame.manifestURL, frame.status);
    }
  }

  private frameManifestUpdated(frameId: Protocol.Page.FrameId, manifestURL: string, status: number): void {
    if (status === UNCACHED) {
      this.frameManifestRemoved(frameId);
      return;
    }

    if (!manifestURL) {
      return;
    }

    const recordedManifestURL = this.manifestURLsByFrame.get(frameId);
    if (recordedManifestURL && manifestURL !== recordedManifestURL) {
      this.frameManifestRemoved(frameId);
    }

    const statusChanged = this.statuses.get(frameId) !== status;
    this.statuses.set(frameId, status);

    if (!this.manifestURLsByFrame.has(frameId)) {
      this.manifestURLsByFrame.set(frameId, manifestURL);
      this.dispatchEventToListeners(Events.FrameManifestAdded, frameId);
    }

    if (statusChanged) {
      this.dispatchEventToListeners(Events.FrameManifestStatusUpdated, frameId);
    }
  }

  private frameManifestRemoved(frameId: Protocol.Page.FrameId): void {
    const removed = this.manifestURLsByFrame.delete(frameId);
    this.statuses.delete(frameId);
    if (removed) {
      this.dispatchEventToListeners(Events.FrameManifestRemoved, frameId);
    }
  }

  frameManifestURL(frameId: Protocol.Page.FrameId): string {
    return this.manifestURLsByFrame.get(frameId) || '';
  }

  frameManifestStatus(frameId: Protocol.Page.FrameId): number {
    return this.statuses.get(frameId) || UNCACHED;
  }

  get onLine(): boolean {
    return this.onLineInternal;
  }

  statusUpdated(frameId: Protocol.Page.FrameId, manifestURL: string, status: number): void {
    this.frameManifestUpdated(frameId, manifestURL, status);
  }

  async requestApplicationCache(frameId: Protocol.Page.FrameId):
      Promise<Protocol.ApplicationCache.ApplicationCache|null> {
    const response = await this.agent.invoke_getApplicationCacheForFrame({frameId});
    if (response.getError()) {
      return null;
    }
    return response.applicationCache;
  }

  networkStateUpdated(isNowOnline: boolean): void {
    this.onLineInternal = isNowOnline;
    this.dispatchEventToListeners(Events.NetworkStateChanged, isNowOnline);
  }
}

SDK.SDKModel.SDKModel.register(ApplicationCacheModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FrameManifestStatusUpdated = 'FrameManifestStatusUpdated',
  FrameManifestAdded = 'FrameManifestAdded',
  FrameManifestRemoved = 'FrameManifestRemoved',
  FrameManifestsReset = 'FrameManifestsReset',
  NetworkStateChanged = 'NetworkStateChanged',
}

export type EventTypes = {
  [Events.FrameManifestStatusUpdated]: Protocol.Page.FrameId,
  [Events.FrameManifestAdded]: Protocol.Page.FrameId,
  [Events.FrameManifestRemoved]: Protocol.Page.FrameId,
  [Events.FrameManifestsReset]: void,
  [Events.NetworkStateChanged]: boolean,
};

export class ApplicationCacheDispatcher implements ProtocolProxyApi.ApplicationCacheDispatcher {
  private readonly applicationCacheModel: ApplicationCacheModel;
  constructor(applicationCacheModel: ApplicationCacheModel) {
    this.applicationCacheModel = applicationCacheModel;
  }

  applicationCacheStatusUpdated({frameId, manifestURL, status}:
                                    Protocol.ApplicationCache.ApplicationCacheStatusUpdatedEvent): void {
    this.applicationCacheModel.statusUpdated(frameId, manifestURL, status);
  }

  networkStateUpdated({isNowOnline}: Protocol.ApplicationCache.NetworkStateUpdatedEvent): void {
    this.applicationCacheModel.networkStateUpdated(isNowOnline);
  }
}

export const UNCACHED = 0;
export const IDLE = 1;
export const CHECKING = 2;
export const DOWNLOADING = 3;
export const UPDATEREADY = 4;
export const OBSOLETE = 5;
