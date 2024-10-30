// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import type * as Trace from '../../../models/trace/trace.js';

export function getNetworkRequest(syntheticNetworkRequest: Trace.Types.Events.SyntheticNetworkRequest):
    SDK.NetworkRequest.NetworkRequest|undefined|null {
  const url = syntheticNetworkRequest.args.data.url as Platform.DevToolsPath.UrlString;
  const urlWithoutHash = Common.ParsedURL.ParsedURL.urlWithoutHash(url) as Platform.DevToolsPath.UrlString;
  const resource = Bindings.ResourceUtils.resourceForURL(url) || Bindings.ResourceUtils.resourceForURL(urlWithoutHash);
  return resource?.request;
}

export function createTimelineNetworkRequest(syntheticNetworkRequest: Trace.Types.Events.SyntheticNetworkRequest):
    TimelineNetworkRequest|null {
  const request = getNetworkRequest(syntheticNetworkRequest);
  return request ? new TimelineNetworkRequest(request) : null;
}

// Add a wrapper class here.
// The reason is the `Open in Network panel` option is handled by the context menu provider, which will add this
// option for all supporting types. And there are a lot of context menu providers that support
// `SDK.NetworkRequest.NetworkRequest`, for example `Override content` by PersistenceActions, but we so far just want
// the one to reveal in network panel, so add a new class which will only be supported by Network panel. Also we want to
// have a different behavior(select the network request) from the `SDK.NetworkRequest.NetworkRequest` (highlight the
// network request once).
export class TimelineNetworkRequest {
  #request: SDK.NetworkRequest.NetworkRequest;
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    this.#request = request;
  }

  get request(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }
}
