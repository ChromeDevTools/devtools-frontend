// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Issue} from '../../../../front_end/sdk/Issue.js';

export class StubIssue extends Issue {
  private requestIds: string[];
  private cookieNames: string[];

  constructor(requestIds: string[], cookieNames: string[]) {
    super('StubIssue');
    this.requestIds = requestIds;
    this.cookieNames = cookieNames;
  }

  requests() {
    return this.requestIds.map(id => {
      return {requestId: id, url: ''};
    });
  }

  cookies() {
    return this.cookieNames.map(name => {
      return {name, domain: '', path: ''};
    });
  }
}
