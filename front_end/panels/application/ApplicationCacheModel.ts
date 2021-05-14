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

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export class ApplicationCacheModel extends SDK.SDKModel.SDKModel {
  _agent: ProtocolProxyApi.ApplicationCacheApi;
  _statuses: Map<string, number>;
  _manifestURLsByFrame: Map<string, string>;
  _onLine: boolean;
  constructor(target: SDK.SDKModel.Target) {
    super(target);

    target.registerApplicationCacheDispatcher(new ApplicationCacheDispatcher(this));
    this._agent = target.applicationCacheAgent();
    this._agent.invoke_enable();

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('Target must provide an ResourceTreeModel');
    }
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigatedCallback, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);

    this._statuses = new Map();
    this._manifestURLsByFrame = new Map();

    this._mainFrameNavigated();
    this._onLine = true;
  }

  _frameNavigatedCallback(event: Common.EventTarget.EventTargetEvent): void {
    this._frameNavigated(event);
  }

  async _frameNavigated(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const frame = (event.data as SDK.ResourceTreeModel.ResourceTreeFrame);
    if (frame.isMainFrame()) {
      this._mainFrameNavigated();
      return;
    }

    const frameId = frame.id;
    const manifestURL = await this._agent.invoke_getManifestForFrame({frameId});
    if (manifestURL !== null && !manifestURL) {
      this._frameManifestRemoved(frameId);
    }
  }

  _frameDetached(event: Common.EventTarget.EventTargetEvent): void {
    const frame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame);
    this._frameManifestRemoved(frame.id);
  }

  reset(): void {
    this._statuses.clear();
    this._manifestURLsByFrame.clear();
    this.dispatchEventToListeners(Events.FrameManifestsReset);
  }

  async _mainFrameNavigated(): Promise<void> {
    const framesWithManifests = await this._agent.invoke_getFramesWithManifests();
    if (framesWithManifests.getError()) {
      return;
    }
    for (const frame of framesWithManifests.frameIds) {
      this._frameManifestUpdated(frame.frameId, frame.manifestURL, frame.status);
    }
  }

  _frameManifestUpdated(frameId: string, manifestURL: string, status: number): void {
    if (status === UNCACHED) {
      this._frameManifestRemoved(frameId);
      return;
    }

    if (!manifestURL) {
      return;
    }

    const recordedManifestURL = this._manifestURLsByFrame.get(frameId);
    if (recordedManifestURL && manifestURL !== recordedManifestURL) {
      this._frameManifestRemoved(frameId);
    }

    const statusChanged = this._statuses.get(frameId) !== status;
    this._statuses.set(frameId, status);

    if (!this._manifestURLsByFrame.has(frameId)) {
      this._manifestURLsByFrame.set(frameId, manifestURL);
      this.dispatchEventToListeners(Events.FrameManifestAdded, frameId);
    }

    if (statusChanged) {
      this.dispatchEventToListeners(Events.FrameManifestStatusUpdated, frameId);
    }
  }

  _frameManifestRemoved(frameId: string): void {
    const removed = this._manifestURLsByFrame.delete(frameId);
    this._statuses.delete(frameId);
    if (removed) {
      this.dispatchEventToListeners(Events.FrameManifestRemoved, frameId);
    }
  }

  frameManifestURL(frameId: string): string {
    return this._manifestURLsByFrame.get(frameId) || '';
  }

  frameManifestStatus(frameId: string): number {
    return this._statuses.get(frameId) || UNCACHED;
  }

  get onLine(): boolean {
    return this._onLine;
  }

  _statusUpdated(frameId: string, manifestURL: string, status: number): void {
    this._frameManifestUpdated(frameId, manifestURL, status);
  }

  async requestApplicationCache(frameId: string): Promise<Protocol.ApplicationCache.ApplicationCache|null> {
    const response = await this._agent.invoke_getApplicationCacheForFrame({frameId});
    if (response.getError()) {
      return null;
    }
    return response.applicationCache;
  }

  _networkStateUpdated(isNowOnline: boolean): void {
    this._onLine = isNowOnline;
    this.dispatchEventToListeners(Events.NetworkStateChanged, isNowOnline);
  }
}

SDK.SDKModel.SDKModel.register(ApplicationCacheModel, {capabilities: SDK.SDKModel.Capability.DOM, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FrameManifestStatusUpdated = 'FrameManifestStatusUpdated',
  FrameManifestAdded = 'FrameManifestAdded',
  FrameManifestRemoved = 'FrameManifestRemoved',
  FrameManifestsReset = 'FrameManifestsReset',
  NetworkStateChanged = 'NetworkStateChanged',
}

export class ApplicationCacheDispatcher implements ProtocolProxyApi.ApplicationCacheDispatcher {
  _applicationCacheModel: ApplicationCacheModel;
  constructor(applicationCacheModel: ApplicationCacheModel) {
    this._applicationCacheModel = applicationCacheModel;
  }

  applicationCacheStatusUpdated({frameId, manifestURL, status}:
                                    Protocol.ApplicationCache.ApplicationCacheStatusUpdatedEvent): void {
    this._applicationCacheModel._statusUpdated(frameId, manifestURL, status);
  }

  networkStateUpdated({isNowOnline}: Protocol.ApplicationCache.NetworkStateUpdatedEvent): void {
    this._applicationCacheModel._networkStateUpdated(isNowOnline);
  }
}

export const UNCACHED = 0;
export const IDLE = 1;
export const CHECKING = 2;
export const DOWNLOADING = 3;
export const UPDATEREADY = 4;
export const OBSOLETE = 5;
