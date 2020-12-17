// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertIssueTitle, expandIssue, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('SAB issues test', async () => {
  beforeEach(async () => {
    await goToResource('issues/sab-issue.html');
  });

  it('should display all csp violations', async () => {
    await navigateToIssuesTab();
    await expandIssue();
    await assertIssueTitle('SharedArrayBuffer usage is restricted to cross-origin isolated sites');
  });
});
