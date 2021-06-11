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

export class UIRequestLocation {
  readonly request: SDK.NetworkRequest.NetworkRequest;
  readonly header: UIHeaderLocation|null;
  readonly searchMatch: TextUtils.ContentProvider.SearchMatch|null;
  readonly isUrlMatch: boolean;

  private constructor(
      request: SDK.NetworkRequest.NetworkRequest, header: UIHeaderLocation|null,
      searchMatch: TextUtils.ContentProvider.SearchMatch|null, urlMatch: boolean) {
    this.request = request;
    this.header = header;
    this.searchMatch = searchMatch;
    this.isUrlMatch = urlMatch;
  }

  static requestHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(request, {section: UIHeaderSection.Request, header}, null, false);
  }

  static responseHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(request, {section: UIHeaderSection.Response, header}, null, false);
  }

  static bodyMatch(request: SDK.NetworkRequest.NetworkRequest, searchMatch: TextUtils.ContentProvider.SearchMatch|null):
      UIRequestLocation {
    return new UIRequestLocation(request, null, searchMatch, false);
  }

  static urlMatch(request: SDK.NetworkRequest.NetworkRequest): UIRequestLocation {
    return new UIRequestLocation(request, null, null, true);
  }

  static header(request: SDK.NetworkRequest.NetworkRequest, section: UIHeaderSection, name: string): UIRequestLocation {
    return new UIRequestLocation(request, {section, header: {name, value: ''}}, null, true);
  }
}
