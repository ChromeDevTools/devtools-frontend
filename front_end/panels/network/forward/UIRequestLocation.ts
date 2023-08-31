// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import type * as TextUtils from '../../../models/text_utils/text_utils.js';

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum UIHeaderSection {
  General = 'General',
  Request = 'Request',
  Response = 'Response',
}

interface UIHeaderLocation {
  section: UIHeaderSection;
  header: SDK.NetworkRequest.NameValue|null;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum UIRequestTabs {
  Cookies = 'cookies',
  EventSource = 'eventSource',
  Headers = 'headers',
  HeadersComponent = 'headersComponent',
  Payload = 'payload',
  Initiator = 'initiator',
  Preview = 'preview',
  Response = 'response',
  Timing = 'timing',
  TrustTokens = 'trustTokens',
  WsFrames = 'webSocketFrames',
}

export interface FilterOptions {
  clearFilter: boolean;
}

export class UIRequestLocation {
  readonly request: SDK.NetworkRequest.NetworkRequest;
  readonly header: UIHeaderLocation|null;
  readonly searchMatch: TextUtils.ContentProvider.SearchMatch|null;
  readonly isUrlMatch: boolean;
  readonly tab: UIRequestTabs|undefined;
  readonly filterOptions: FilterOptions|undefined;

  private constructor(
      request: SDK.NetworkRequest.NetworkRequest, header: UIHeaderLocation|null,
      searchMatch: TextUtils.ContentProvider.SearchMatch|null, urlMatch: boolean, tab: UIRequestTabs|undefined,
      filterOptions: FilterOptions|undefined) {
    this.request = request;
    this.header = header;
    this.searchMatch = searchMatch;
    this.isUrlMatch = urlMatch;
    this.tab = tab;
    this.filterOptions = filterOptions;
  }

  static requestHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(
        request, {section: UIHeaderSection.Request, header}, null, false, undefined, undefined);
  }

  static responseHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(
        request, {section: UIHeaderSection.Response, header}, null, false, undefined, undefined);
  }

  static bodyMatch(request: SDK.NetworkRequest.NetworkRequest, searchMatch: TextUtils.ContentProvider.SearchMatch|null):
      UIRequestLocation {
    return new UIRequestLocation(request, null, searchMatch, false, undefined, undefined);
  }

  static urlMatch(request: SDK.NetworkRequest.NetworkRequest): UIRequestLocation {
    return new UIRequestLocation(request, null, null, true, undefined, undefined);
  }

  static header(request: SDK.NetworkRequest.NetworkRequest, section: UIHeaderSection, name: string): UIRequestLocation {
    return new UIRequestLocation(request, {section, header: {name, value: ''}}, null, false, undefined, undefined);
  }

  static tab(request: SDK.NetworkRequest.NetworkRequest, tab: UIRequestTabs, filterOptions?: FilterOptions):
      UIRequestLocation {
    return new UIRequestLocation(request, null, null, false, tab, filterOptions);
  }
}
