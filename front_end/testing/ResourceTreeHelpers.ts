// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

import type {MockCDPConnection} from './MockCDPConnection.js';
import {
  clearMockConnectionResponseHandler,
  setMockConnectionResponseHandler,
} from './MockConnection.js';
import {
  FRAME,
  getEffectivePayload,
  getMainFrame,
  MAIN_FRAME_ID,
} from './ResourceHelpers.js';

export {
  createResource,
  DOMAIN,
  FRAME,
  FRAME_URL,
  getEffectivePayload,
  getMainFrame,
  LOADER_ID,
  MAIN_FRAME_ID,
  SECURITY_ORIGIN,
} from './ResourceHelpers.js';

let childFrameId = 0;

const MAIN_FRAME = {
  ...FRAME,
  id: MAIN_FRAME_ID,
};

export function setMockResourceTree(shouldMock: boolean) {
  if (shouldMock) {
    setMockConnectionResponseHandler('Page.getResourceTree', () => ({
                                                               frameTree: {
                                                                 frame: MAIN_FRAME,
                                                                 resources: [],
                                                               },
                                                             }));
  } else {
    clearMockConnectionResponseHandler('Page.getResourceTree');
  }
}

export function mockResourceTree(connection: MockCDPConnection) {
  connection.setSuccessHandler('Page.getResourceTree', () => ({
                                                         frameTree: {
                                                           frame: MAIN_FRAME,
                                                           resources: [],
                                                         }
                                                       }));
}

export async function getInitializedResourceTreeModel(target: SDK.Target.Target):
    Promise<SDK.ResourceTreeModel.ResourceTreeModel> {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
  return resourceTreeModel.cachedResourcesLoaded() ?
      resourceTreeModel :
      await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
}

export async function addChildFrame(target: SDK.Target.Target, framePayload?: Partial<Protocol.Page.Frame>):
    Promise<SDK.ResourceTreeModel.ResourceTreeFrame> {
  const resourceTreeModel = await getInitializedResourceTreeModel(target);
  getMainFrame(target);
  const childFrame =
      resourceTreeModel.frameAttached(`CHILD_FRAME_${++childFrameId}` as Protocol.Page.FrameId, MAIN_FRAME_ID);
  assert.exists(childFrame);
  if (framePayload) {
    navigate(childFrame, {...FRAME, ...framePayload});
  }
  return childFrame;
}

export function navigate(
    frame: SDK.ResourceTreeModel.ResourceTreeFrame, framePayload?: Partial<Protocol.Page.Frame>,
    type: Protocol.Page.NavigationType = Protocol.Page.NavigationType.Navigation) {
  const effectivePayload = getEffectivePayload(frame.id, FRAME, framePayload);
  frame.resourceTreeModel().frameNavigated(effectivePayload, type);
}

export function activate(target: SDK.Target.Target): void {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
  const frame = getMainFrame(target);
  sinon.stub(frame, 'isPrimaryFrame').returns(true);
  resourceTreeModel.dispatchEventToListeners(
      SDK.ResourceTreeModel.Events.PrimaryPageChanged,
      {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION});
}
