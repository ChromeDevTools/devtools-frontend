// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {$textContent, click, getBrowserAndPages, waitForAria} from '../../shared/helper.js';
import {reloadDevTools} from '../helpers/cross-tool-helper.js';
import {getDataGridRows} from '../helpers/datagrid-helpers.js';
import {
  navigateToSecurityTab,
} from '../helpers/security-helpers.js';

describe('Privacy tools', function() {
  let preloadScriptId: string;

  afterEach(async () => {
    // The tests end but DevTools might be still doing things resulting
    // in an error caused by the test runner closing or navigating the
    // target page.
    expectError('Inspected target navigated or closed');
    if (!preloadScriptId) {
      return;
    }
    const {frontend} = getBrowserAndPages();
    await frontend.removeScriptToEvaluateOnNewDocument(preloadScriptId);
  });

  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    const {identifier} = await frontend.evaluateOnNewDocument(`globalThis.hostConfigForTesting = {
            ...globalThis.hostConfigForTesting,
            devToolsPrivacyUI: {enabled: ${true}},
        };`);
    preloadScriptId = identifier;

    await reloadDevTools();
  });

  describe('The controls tool without the Privacy and security panel open', function() {
    before(async () => {
      const {frontend} = getBrowserAndPages();
      await frontend.evaluate(`(async () => {
        const Common = await import('./core/common/common.js');
        const setting = Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', true);
        setting.set(true);
      })()`);

      await reloadDevTools();
    });

    after(async () => {
      const {frontend} = getBrowserAndPages();
      await frontend.evaluate(`(async () => {
        const Common = await import('./core/common/common.js');
        const setting = Common.Settings.Settings.instance().clearAll()
      })()`);

      await reloadDevTools();
    });

    it('will remove reload bar without privacy module loaded', async () => {
      // Infobar should be presenet since the setting was set in the before
      const infoBar = await waitForAria('To apply your updated controls, reload the page');
      assert.isNotNull(infoBar);

      const {target} = getBrowserAndPages();
      await target.reload();

      // Infobar should be gone after reloading the page
      assert.isNull(await $textContent('To apply your updated controls, reload the page'));
    });
  });

  describe('The Privacy and security panel', function() {
    it('shows reload bar when controls are changed', async () => {
      await navigateToSecurityTab(/* privcayEnabled=*/ true);
      await click('[aria-label="Temporarily limit third-party cookies, only when DevTools is open"]');

      // Infobar should appear after changing control
      const infoBar = await waitForAria('To apply your updated controls, reload the page');
      assert.isNotNull(infoBar);

      // Allow time for infobar to animate in before clicking the button
      await new Promise<void>(resolve => setTimeout(resolve, 550));
      await click('dt-close-button', {root: infoBar});

      // Infobar should be gone after clicking the close button
      assert.isNull(await $textContent('To apply your updated controls, reload the page'));
    });

    it('filters rows when the search filter is populated', async () => {
      await navigateToSecurityTab(/* privcayEnabled=*/ true);
      await click('[aria-label="Third-party cookies"]');

      // Populate with test issues to be filtered
      const {frontend} = getBrowserAndPages();
      frontend.evaluate(() => {
        const issue1 = {
          code: 'CookieIssue',
          details: {
            cookieIssueDetails: {
              cookie: {
                name: 'a',
                path: '/',
                domain: 'a.test',
              },
              cookieExclusionReasons: ['ExcludeThirdPartyPhaseout'],
              cookieWarningReasons: [],
              operation: 'ReadCookie',
              cookieUrl: 'a.test',
            },
          },
        };
        // @ts-expect-error
        window.addIssueForTest(issue1);

        const issue2 = {
          code: 'CookieIssue',
          details: {
            cookieIssueDetails: {
              cookie: {
                name: 'b',
                path: '/',
                domain: 'b.test',
              },
              cookieExclusionReasons: ['ExcludeThirdPartyPhaseout'],
              cookieWarningReasons: [],
              operation: 'ReadCookie',
              cookieUrl: 'b.test',
            },
          },
        };
        // @ts-expect-error
        window.addIssueForTest(issue2);
      });
      assert.lengthOf(await getDataGridRows(2, undefined, true), 2);

      const searchFilter = await waitForAria('Filter');
      searchFilter.evaluate(el => assert.isNotNull(el));
      searchFilter.type('a.test');

      // The second issue should be filtered out.
      assert.lengthOf(await getDataGridRows(1, undefined, true), 1);
    });
  });
});
