// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import type * as TextUtils from '../../../models/text_utils/text_utils.js';

export const enum UIHeaderSection {
  GENERAL = 'General',
  REQUEST = 'Request',
  RESPONSE = 'Response',
  EARLY_HINTS = 'EarlyHints',
}

interface UIHeaderLocation {
  section: UIHeaderSection;
  header: SDK.NetworkRequest.NameValue|null;
}

export const enum UIRequestTabs {
  COOKIES = 'cookies',
  EVENT_SOURCE = 'eventSource',
  HEADERS_COMPONENT = 'headers-component',
  PAYLOAD = 'payload',
  INITIATOR = 'initiator',
  PREVIEW = 'preview',
  RESPONSE = 'response',
  TIMING = 'timing',
  TRUST_TOKENS = 'trust-tokens',
  WS_FRAMES = 'web-socket-frames',
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

  constructor(
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
        request, {section: UIHeaderSection.REQUEST, header}, null, false, undefined, undefined);
  }

  static responseHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(
        request, {section: UIHeaderSection.RESPONSE, header}, null, false, undefined, undefined);
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
