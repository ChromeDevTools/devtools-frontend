// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as IssueManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {StubIssue} from './StubIssue.js';

describe('Issue', () => {
  it('should store the code', () => {
    const code = 'anExampleIssueCodeString';
    const issue = new StubIssue(code, [], []);
    assert.strictEqual(issue.code(), code);
  });
});

describe('CookieIssue', () => {
  describe('isCausedByThirdParty', () => {
    const isCausedByThirdParty = IssueManager.CookieIssue.isCausedByThirdParty;
    const mockResourceTreeFrame = (domainAndRegistry: string) => {
      return {domainAndRegistry: () => domainAndRegistry} as SDK.ResourceTreeModel.ResourceTreeFrame;
    };

    it('returns true when the top frame is not yet available', () => {
      assert.isTrue(isCausedByThirdParty(null, 'https://example.com/index.html'));
    });

    it('returns false when no cookieUrl is available or cookieUrl is invalid', () => {
      const resourceTreeFrame = mockResourceTreeFrame('example.com');
      assert.isFalse(isCausedByThirdParty(resourceTreeFrame, undefined));
      assert.isFalse(isCausedByThirdParty(resourceTreeFrame, '~~really an invalid URL'));
    });

    it('returns true for third-party cookieUrls', () => {
      const resourceTreeFrame = mockResourceTreeFrame('example.com');
      assert.isTrue(isCausedByThirdParty(resourceTreeFrame, 'http://foo.com/index.html'));
      assert.isTrue(isCausedByThirdParty(resourceTreeFrame, 'http://example.com.bar/foo.php'));

      assert.isTrue(isCausedByThirdParty(resourceTreeFrame, 'http://eexample.com/index.html'));
      assert.isTrue(isCausedByThirdParty(resourceTreeFrame, 'http://sub.domain.eexample.com/index.html'));
    });

    it('returns false for first-party cookieUrls', () => {
      const resourceTreeFrame = mockResourceTreeFrame('example.com');
      assert.isFalse(isCausedByThirdParty(resourceTreeFrame, 'http://www.example.com/index.html'));
      assert.isFalse(isCausedByThirdParty(resourceTreeFrame, 'http://sub.domain.example.com/should-work.php'));
    });
  });
});
