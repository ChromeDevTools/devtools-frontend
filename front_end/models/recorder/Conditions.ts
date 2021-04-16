// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export abstract class Condition {
  abstract toString(): string;
}

export class WaitForNavigationCondition extends Condition {
  expectedUrl: string;

  constructor(url: string) {
    super();

    this.expectedUrl = url;
  }

  toString(): string {
    return 'const promise = targetPage.waitForNavigation();';
  }
}
