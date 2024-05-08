// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

import {
  clearMockConnectionResponseHandler,
  setMockConnectionResponseHandler,
} from './MockConnection.js';

const LOADER_ID = 'LOADER_ID' as Protocol.Network.LoaderId;
export const MAIN_FRAME_ID = 'main' as Protocol.Page.FrameId;
const DOMAIN = 'example.com';
export const SECURITY_ORIGIN = `https://${DOMAIN}`;
export const FRAME_URL = `${SECURITY_ORIGIN}/` as Platform.DevToolsPath.UrlString;

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
