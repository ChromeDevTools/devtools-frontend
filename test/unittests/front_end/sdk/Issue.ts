// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Issue} from '/front_end/sdk/Issue.js';

describe('Issue', () => {
  after(() => {
    // FIXME(https://crbug.com/1006759): Remove after ESM work is complete
    delete (self as any).SDK;
  });

  it('should always require a code', () => {
    const issue = Issue.create('code');
    assert.equal(issue.code, 'code');
  });
});
