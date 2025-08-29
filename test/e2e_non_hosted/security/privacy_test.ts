// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  getDataGridRows,
} from '../../e2e/helpers/datagrid-helpers.js';
import {
  navigateToSecurityTab,
} from '../../e2e/helpers/security-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

async function addPrivacyUIToHostConfig(devToolsPage: DevToolsPage) {
  const hostConfig = {
    devToolsPrivacyUI: {enabled: true},
  };
  await devToolsPage.evaluateOnNewDocument(`
    Object.defineProperty(window, 'InspectorFrontendHost', {
      configurable: true,
      enumerable: true,
      get() {
          return this._InspectorFrontendHost;
      },
      set(value) {
          value.getHostConfig = (cb) => {
            cb({
              ...globalThis.hostConfigForTesting ?? {},
              ...JSON.parse('${JSON.stringify(hostConfig)}'),
            });
          }
          this._InspectorFrontendHost = value;
      }
    });
  `);
}

describe('The controls tool without the Privacy and security panel open', function() {
  it('will remove reload bar without privacy module loaded', async ({devToolsPage, inspectedPage}) => {
    await addPrivacyUIToHostConfig(devToolsPage);
    await devToolsPage.evaluate(`(async () => {
      const Common = await import('./core/common/common.js');
      const setting = Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', true);
      setting.set(true);
    })()`);
    // Reload to give toolbar chance to spawn
    await devToolsPage.reload();

    // Infobar should be presenet since the setting was set in the before
    const infoBar = await devToolsPage.waitForAria('To apply your updated controls, reload the page');
    assert.isNotNull(infoBar);

    await inspectedPage.reload();

    // Infobar should be gone after reloading the page
    assert.isNull(await devToolsPage.$textContent('To apply your updated controls, reload the page'));
  });
});

describe('The Privacy and security panel', function() {
  setup({dockingMode: 'bottom'});

  it('shows reload bar when controls are changed', async ({devToolsPage}) => {
    await addPrivacyUIToHostConfig(devToolsPage);
    await navigateToSecurityTab(/* privacyEnabled=*/ true, devToolsPage);
    await devToolsPage.click('[aria-label="Temporarily limit third-party cookies, only when DevTools is open"]');

    // Infobar should appear after changing control
    const infoBar = await devToolsPage.waitForAria('To apply your updated controls, reload the page');
    assert.isNotNull(infoBar);

    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('dt-close-button', {root: infoBar});

    // Infobar should be gone after clicking the close button
    assert.isNull(await devToolsPage.$textContent('To apply your updated controls, reload the page'));
  });

  it('filters rows when the search filter is populated', async ({devToolsPage}) => {
    await addPrivacyUIToHostConfig(devToolsPage);
    await navigateToSecurityTab(/* privacyEnabled=*/ true, devToolsPage);
    await devToolsPage.click('[aria-label="Third-party cookies"]');

    // Populate with test issues to be filtered
    await devToolsPage.evaluate(() => {
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
    assert.lengthOf(await getDataGridRows(2, undefined, true, devToolsPage), 2);

    const searchFilter = await devToolsPage.waitForAria('Filter');
    assert(await searchFilter.evaluate(el => el !== null));
    await searchFilter.type('a.test');

    // The second issue should be filtered out.
    assert.lengthOf(await getDataGridRows(1, undefined, true, devToolsPage), 1);
  });
});
