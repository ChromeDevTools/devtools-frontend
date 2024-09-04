// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export enum FilterType {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Domain = 'domain',
  HasResponseHeader = 'has-response-header',
  HasOverrides = 'has-overrides',
  ResponseHeaderValueSetCookie = 'response-header-set-cookie',
  Is = 'is',
  LargerThan = 'larger-than',
  Method = 'method',
  MimeType = 'mime-type',
  MixedContent = 'mixed-content',
  Priority = 'priority',
  Scheme = 'scheme',
  SetCookieDomain = 'set-cookie-domain',
  SetCookieName = 'set-cookie-name',
  SetCookieValue = 'set-cookie-value',
  ResourceType = 'resource-type',
  CookieDomain = 'cookie-domain',
  CookieName = 'cookie-name',
  CookiePath = 'cookie-path',
  CookieValue = 'cookie-value',
  StatusCode = 'status-code',
  Url = 'url',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export const enum IsFilterType {
  RUNNING = 'running',
  FROM_CACHE = 'from-cache',
  SERVICE_WORKER_INTERCEPTED = 'service-worker-intercepted',
  SERVICE_WORKER_INITIATED = 'service-worker-initiated',
}

export const enum MixedContentFilterValues {
  ALL = 'all',
  DISPLAYED = 'displayed',
  BLOCKED = 'blocked',
  BLOCK_OVERRIDDEN = 'block-overridden',
}

interface UIFilter {
  filterType: FilterType|null;
  filterValue: string;
}

export class UIRequestFilter {
  readonly filters: UIFilter[];

  constructor(filters: UIFilter[]) {
    this.filters = filters;
  }

  static filters(filters: UIFilter[]): UIRequestFilter {
    return new UIRequestFilter(filters);
  }
}
