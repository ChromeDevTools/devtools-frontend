// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import type * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

import {
  clearMockConnectionResponseHandler,
  setMockConnectionResponseHandler,
} from './MockConnection.js';

export const LOADER_ID = 'LOADER_ID' as Protocol.Network.LoaderId;
export const MAIN_FRAME_ID = 'main' as Protocol.Page.FrameId;
export const DOMAIN = 'example.com';
export const SECURITY_ORIGIN = `https://${DOMAIN}`;
export const FRAME_URL = `${SECURITY_ORIGIN}/` as Platform.DevToolsPath.UrlString;
let childFrameId = 0;

const FRAME = {
  url: FRAME_URL,
  loaderId: LOADER_ID,
  domainAndRegistry: DOMAIN,
  securityOrigin: SECURITY_ORIGIN,
  mimeType: 'text/html',
  secureContextType: Protocol.Page.SecureContextType.Secure,
  crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
  gatedAPIFeatures: [],
};

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

export async function getInitializedResourceTreeModel(target: SDK.Target.Target):
    Promise<SDK.ResourceTreeModel.ResourceTreeModel> {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
  return resourceTreeModel.cachedResourcesLoaded() ?
      resourceTreeModel :
      resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
}

function getEffectivePayload(
    id: Protocol.Page.FrameId, base: Omit<Protocol.Page.Frame, 'id'>,
    framePayload?: Partial<Protocol.Page.Frame>): Protocol.Page.Frame {
  const effectivePayload: Protocol.Page.Frame = {...base, id};
  if (framePayload) {
    if (framePayload.url) {
      const url = new URL(framePayload.url);
      framePayload.domainAndRegistry ??= url.hostname;
      framePayload.securityOrigin ??= url.origin;
    }
    Object.assign(effectivePayload, framePayload);
  }
  return effectivePayload;
}

export function getMainFrame(
    target: SDK.Target.Target, framePayload?: Partial<Protocol.Page.Frame>): SDK.ResourceTreeModel.ResourceTreeFrame {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
  if (resourceTreeModel.mainFrame) {
    return resourceTreeModel.mainFrame;
  }
  resourceTreeModel.frameAttached(MAIN_FRAME_ID, null);
  const mainFrame = resourceTreeModel.mainFrame as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
  mainFrame.navigate(getEffectivePayload(MAIN_FRAME_ID, FRAME, framePayload));
  return mainFrame;
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

export function createResource(
    frame: SDK.ResourceTreeModel.ResourceTreeFrame, networkScriptUrl: Platform.DevToolsPath.UrlString, mimeType: string,
    content: string) {
  const resource = new SDK.Resource.Resource(
      frame.resourceTreeModel(), null, networkScriptUrl, networkScriptUrl, MAIN_FRAME_ID, null,
      Common.ResourceType.ResourceType.fromMimeType(mimeType), mimeType, null, content.length);

  frame.addResource(resource);
  return resource;
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
