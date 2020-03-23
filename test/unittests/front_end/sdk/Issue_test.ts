// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Issue} from '../../../../front_end/sdk/Issue.js';

describe('Issue', () => {
  it('should always require a code', () => {
    const issue = new Issue('code', undefined);
    assert.equal(issue.code(), 'code');
  });
});
