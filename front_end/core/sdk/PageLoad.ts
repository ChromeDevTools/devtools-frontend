// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';

import type {NetworkRequest} from './NetworkRequest.js';

export class PageLoad {
  id: number;
  url: Platform.DevToolsPath.UrlString;
  startTime: number;
  loadTime!: number;
  contentLoadTime!: number;
  mainRequest: NetworkRequest;

  constructor(mainRequest: NetworkRequest) {
    this.id = ++PageLoad.lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
    this.mainRequest = mainRequest;
  }

  static forRequest(request: NetworkRequest): PageLoad|null {
    return pageLoadForRequest.get(request) || null;
  }

  bindRequest(request: NetworkRequest): void {
    pageLoadForRequest.set(request, this);
  }

  private static lastIdentifier = 0;
}

const pageLoadForRequest = new WeakMap<NetworkRequest, PageLoad>();
