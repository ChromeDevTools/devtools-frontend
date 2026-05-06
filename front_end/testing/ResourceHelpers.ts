// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

const {urlString} = Platform.DevToolsPath;

export const LOADER_ID = 'LOADER_ID' as Protocol.Network.LoaderId;
export const MAIN_FRAME_ID = 'main' as Protocol.Page.FrameId;
export const DOMAIN = 'example.com';
export const SECURITY_ORIGIN = `https://${DOMAIN}`;
export const FRAME_URL = urlString`${`${SECURITY_ORIGIN}/`}`;

export const FRAME = {
  url: FRAME_URL,
  loaderId: LOADER_ID,
  domainAndRegistry: DOMAIN,
  securityOrigin: SECURITY_ORIGIN,
  mimeType: 'text/html',
  secureContextType: Protocol.Page.SecureContextType.Secure,
  crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
  gatedAPIFeatures: [],
};

export function getEffectivePayload(
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

export function createResource(
    frame: SDK.ResourceTreeModel.ResourceTreeFrame, networkScriptUrl: Platform.DevToolsPath.UrlString, mimeType: string,
    content: string) {
  const resource = new SDK.Resource.Resource(
      frame.resourceTreeModel(), null, networkScriptUrl, networkScriptUrl, MAIN_FRAME_ID, null,
      Common.ResourceType.ResourceType.fromMimeType(mimeType), mimeType, null, content.length);

  frame.addResource(resource);
  return resource;
}
