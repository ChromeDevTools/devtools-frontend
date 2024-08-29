// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';

import {assertStatus, expandIssue, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('The Issues tab report-only issues', () => {
  it('should report the violation as blocked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();
    await expandIssue();
    await assertStatus('blocked');
  });
  it('should report the violation as report-only', async () => {
    await goToResource('network/csp-report-only.rawresponse');
    await navigateToIssuesTab();
    await expandIssue();
    await assertStatus('report-only');
  });
});
