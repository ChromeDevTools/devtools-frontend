// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';

import type {NetworkRequest} from './NetworkRequest.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';

// A thin wrapper class, mostly to enable instanceof-based revealing of traces to open in Timeline.
export class TraceObject {
  readonly traceEvents: Protocol.Tracing.DataCollectedEvent['value'];
  readonly metadata: Object;
  constructor(traceEvents: Protocol.Tracing.DataCollectedEvent['value'], metadata: Object = {}) {
    this.traceEvents = traceEvents;
    this.metadata = metadata;
  }
}

// Another thin wrapper class to enable revealing individual trace events (aka entries) in Timeline panel.
export class RevealableEvent {
  // Only Trace.Types.Events.Event are passed in, but we can't depend on that type from SDK
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  constructor(public event: any) {
  }
}

/**
 * Another wrapper class for revealing network requests in Network panel. The reason is the `Open in Network panel`
 * option is handled by the context menu provider, which will add this option for all supporting types. And there are a
 * lot of context menu providers that support `SDK.NetworkRequest.NetworkRequest`, for example `Override content` by
 * PersistenceActions, but we so far just want the one to reveal in network panel, so add a new class which will only be
 * supported by Network panel.
 *
 * Also we want to have a different behavior(select the network request) from the `SDK.NetworkRequest.NetworkRequest`
 * (highlight the network request once).
 */
export class RevealableNetworkRequest {
  constructor(public networkRequest: NetworkRequest) {
  }

  // Only Trace.Types.Events.SyntheticNetworkRequest are passed in, but we can't depend on that type from SDK
  static create(event: unknown): RevealableNetworkRequest|null {
    const syntheticNetworkRequest = event;
    // @ts-expect-error We don't have type checking here to confirm these events have .args.data.url.
    const url = syntheticNetworkRequest.args.data.url as Platform.DevToolsPath.UrlString;
    const urlWithoutHash = Common.ParsedURL.ParsedURL.urlWithoutHash(url) as Platform.DevToolsPath.UrlString;

    const resource = ResourceTreeModel.resourceForURL(url) ?? ResourceTreeModel.resourceForURL(urlWithoutHash);
    const sdkNetworkRequest = resource?.request;
    return sdkNetworkRequest ? new RevealableNetworkRequest(sdkNetworkRequest) : null;
  }
}
