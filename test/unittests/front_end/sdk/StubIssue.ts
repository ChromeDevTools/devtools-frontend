// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Issue} from '../../../../front_end/sdk/Issue.js';

export class StubIssue extends Issue {
  private requestIds: string[];
  private cookieNames: string[];

  constructor(code: string, requestIds: string[], cookieNames: string[]) {
    super(code);
    this.requestIds = requestIds;
    this.cookieNames = cookieNames;
  }

  getDescription() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({} as any);
  }

  primaryKey(): string {
    return `${this.code()}-(${this.cookieNames.join(';')})-(${this.requestIds.join(';')})`;
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

  static createFromRequestIds(requestIds: string[]) {
    return new StubIssue('StubIssue', requestIds, []);
  }

  static createFromCookieNames(cookieNames: string[]) {
    return new StubIssue('StubIssue', [], cookieNames);
  }
}

export class ThirdPartyStubIssue extends StubIssue {
  private isThirdParty: boolean;

  constructor(code: string, isThirdParty: boolean) {
    super(code, [], []);
    this.isThirdParty = isThirdParty;
  }

  isCausedByThirdParty() {
    return this.isThirdParty;
  }
}
