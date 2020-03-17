/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!NetworkProjectManager}
 */
let networkProjectManagerInstance;

export class NetworkProjectManager extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @private
   */
  constructor() {
    super();
  }

  /**
   * @param {{forceNew: boolean}} opts
   */
  static instance({forceNew} = {forceNew: false}) {
    if (!networkProjectManagerInstance || forceNew) {
      networkProjectManagerInstance = new NetworkProjectManager();
    }

    return networkProjectManagerInstance;
  }
}

export const Events = {
  FrameAttributionAdded: Symbol('FrameAttributionAdded'),
  FrameAttributionRemoved: Symbol('FrameAttributionRemoved')
};

/**
 * @unrestricted
 */
export class NetworkProject {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static _resolveFrame(uiSourceCode, frameId) {
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    const resourceTreeModel = target && target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel ? resourceTreeModel.frameForId(frameId) : null;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static setInitialFrameAttribution(uiSourceCode, frameId) {
    const frame = NetworkProject._resolveFrame(uiSourceCode, frameId);
    if (!frame) {
      return;
    }
    /** @type {!Map<string, !{frame: !SDK.ResourceTreeModel.ResourceTreeFrame, count: number}>} */
    const attribution = new Map();
    attribution.set(frameId, {frame: frame, count: 1});
    uiSourceCode[_frameAttributionSymbol] = attribution;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} fromUISourceCode
   * @param {!Workspace.UISourceCode.UISourceCode} toUISourceCode
   */
  static cloneInitialFrameAttribution(fromUISourceCode, toUISourceCode) {
    const fromAttribution = fromUISourceCode[_frameAttributionSymbol];
    if (!fromAttribution) {
      return;
    }
    /** @type {!Map<string, !{frame: !SDK.ResourceTreeModel.ResourceTreeFrame, count: number}>} */
    const toAttribution = new Map();
    toUISourceCode[_frameAttributionSymbol] = toAttribution;
    for (const frameId of fromAttribution.keys()) {
      const value = fromAttribution.get(frameId);
      toAttribution.set(frameId, {frame: value.frame, count: value.count});
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static addFrameAttribution(uiSourceCode, frameId) {
    const frame = NetworkProject._resolveFrame(uiSourceCode, frameId);
    if (!frame) {
      return;
    }
    const frameAttribution = uiSourceCode[_frameAttributionSymbol];
    const attributionInfo = frameAttribution.get(frameId) || {frame: frame, count: 0};
    attributionInfo.count += 1;
    frameAttribution.set(frameId, attributionInfo);
    if (attributionInfo.count !== 1) {
      return;
    }

    const data = {uiSourceCode: uiSourceCode, frame: frame};
    NetworkProjectManager.instance().dispatchEventToListeners(Events.FrameAttributionAdded, data);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static removeFrameAttribution(uiSourceCode, frameId) {
    const frameAttribution = uiSourceCode[_frameAttributionSymbol];
    if (!frameAttribution) {
      return;
    }
    const attributionInfo = frameAttribution.get(frameId);
    console.assert(attributionInfo, 'Failed to remove frame attribution for url: ' + uiSourceCode.url());
    attributionInfo.count -= 1;
    if (attributionInfo.count > 0) {
      return;
    }
    frameAttribution.delete(frameId);
    const data = {uiSourceCode: uiSourceCode, frame: attributionInfo.frame};
    NetworkProjectManager.instance().dispatchEventToListeners(Events.FrameAttributionRemoved, data);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?SDK.SDKModel.Target} target
   */
  static targetForUISourceCode(uiSourceCode) {
    return uiSourceCode.project()[_targetSymbol] || null;
  }

  /**
   * @param {!Workspace.Workspace.Project} project
   * @param {!SDK.SDKModel.Target} target
   */
  static setTargetForProject(project, target) {
    project[_targetSymbol] = target;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.ResourceTreeModel.ResourceTreeFrame>}
   */
  static framesForUISourceCode(uiSourceCode) {
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    const resourceTreeModel = target && target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const attribution = uiSourceCode[_frameAttributionSymbol];
    if (!resourceTreeModel || !attribution) {
      return [];
    }
    const frames = Array.from(attribution.keys()).map(frameId => resourceTreeModel.frameForId(frameId));
    return frames.filter(frame => !!frame);
  }
}

const _targetSymbol = Symbol('target');
const _frameAttributionSymbol = Symbol('_frameAttributionSymbol');
