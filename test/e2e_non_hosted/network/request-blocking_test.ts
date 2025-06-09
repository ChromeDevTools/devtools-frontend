// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {navigateToNetworkTab, setTextFilter, waitForSomeRequestsToAppear} from '../../e2e/helpers/network-helpers.js';
import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function checkboxIsChecked(element: ElementHandle<HTMLInputElement>): Promise<boolean> {
  return await element.evaluate(node => node.checked);
}

async function setCheckBox(element: ElementHandle<HTMLInputElement>, wantChecked: boolean): Promise<void> {
  const checked = await checkboxIsChecked(element);
  if (checked !== wantChecked) {
    await element.click();
  }
  assert.strictEqual(await checkboxIsChecked(element), wantChecked);
}

async function isVisible(element: ElementHandle, container: ElementHandle): Promise<boolean> {
  const elementBox = JSON.parse(await element.evaluate(e => JSON.stringify(e.getBoundingClientRect())));
  const containerBox = JSON.parse(await container.evaluate(e => JSON.stringify(e.getBoundingClientRect())));

  return elementBox.top <= containerBox.top ? containerBox.top - elementBox.top <= elementBox.height :
                                              elementBox.bottom - containerBox.bottom <= elementBox.height;
}

async function setupRequestBlocking(devToolsPage: DevToolsPage, patterns: string[], enabled = true): Promise<void> {
  await openPanelViaMoreTools('Network request blocking', devToolsPage);
  for (const pattern of patterns) {
    await devToolsPage.click('aria/Add network request blocking pattern');
    await devToolsPage.click('.blocked-url-edit-value > input');
    await devToolsPage.typeText(pattern);
    await devToolsPage.click('aria/Add');
  }

  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria('Enable network request blocking')).toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, enabled);
}

async function disableRequestBlocking(devToolsPage: DevToolsPage): Promise<void> {
  await openPanelViaMoreTools('Network request blocking', devToolsPage);
  await devToolsPage.click('aria/Remove all network request blocking patterns');
  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria('Enable network request blocking')).toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, false);
}

describe('The Network request blocking panel', () => {
  it('prohibits unchecking patterns when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], false);

    await devToolsPage.waitForAriaNone('Edit');
    await devToolsPage.waitForAriaNone('Remove');

    const firstListItem = await devToolsPage.waitFor('.blocked-url');
    const firstCheckbox =
        await (await devToolsPage.waitFor('.widget > .list > .list-item > .blocked-url > .blocked-url-checkbox'))
            .toElement('input');
    assert.isTrue(await checkboxIsChecked(firstCheckbox));
    await firstListItem.click();
    assert.isTrue(await checkboxIsChecked(firstCheckbox));

    await disableRequestBlocking(devToolsPage);
  });

  it('allows scrolling the pattern list when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], false);

    const list = await devToolsPage.waitFor('.list');
    const lastListItem = await devToolsPage.waitForElementWithTextContent('9');
    // TODO: this is not completely fair way to scroll but mouseWheel does not
    // seem to work here in the new-headless on Windows and Linux.
    await lastListItem.scrollIntoView();
    await devToolsPage.waitForFunction(() => isVisible(lastListItem, list));

    await disableRequestBlocking(devToolsPage);
  });

  it('displays blocked reason for CSP blocked requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('csp.html', devToolsPage, inspectedPage);
    await setTextFilter('csp.js', devToolsPage);
    await inspectedPage.evaluate(() => {
      // @ts-expect-error
      sendCSPRequest();
    });
    await waitForSomeRequestsToAppear(1, devToolsPage);
    const status = await devToolsPage.waitFor('.network-log-grid tbody .status-column');
    assert.strictEqual(await status.evaluate(node => node.textContent), '(blocked:csp)');

    await disableRequestBlocking(devToolsPage);
  });

  async function testBlockedURL(
      patterns: string[], url: string, expectedStatus: string,
      wrappers: {devToolsPage: DevToolsPage, inspectedPage: InspectedPage}) {
    const {devToolsPage, inspectedPage} = wrappers;
    await setupRequestBlocking(devToolsPage, patterns, true);

    await navigateToNetworkTab('csp.html', devToolsPage, inspectedPage);
    await setTextFilter(url.substring(url.lastIndexOf('/') + 1), devToolsPage);
    inspectedPage.evaluate(url => {
      // @ts-expect-error
      addBlockedScript(url);
    }, url);
    await waitForSomeRequestsToAppear(1, devToolsPage);
    const status = await devToolsPage.waitFor('.network-log-grid tbody .status-column');
    assert.strictEqual(await status.evaluate(node => node.textContent), expectedStatus);

    await disableRequestBlocking(devToolsPage);
  }

  it('displays blocked reason for DevTools blocked requests matching with stars inside the pattern',
     testBlockedURL.bind(null, ['resources**/silent*.js'], 'silent_script.js', '(blocked:devtools)'));

  it('does not display blocked reason for requests non-matching due to the different component order',
     testBlockedURL.bind(null, ['x*y'], 'yx', '404Not Found'));

  it('displays blocked reason for DevTools blocked requests matching with stars around the pattern',
     testBlockedURL.bind(null, ['**pattern**'], 'there/is/a/pattern/inside.js', '(blocked:devtools)'));

  it('does not display blocked reason for requests non-matching due to an extra character',
     testBlockedURL.bind(null, ['pattern'], 'patt1ern', '404Not Found'));

  it('does not display blocked reason for requests non-matching due to a different component',
     testBlockedURL.bind(null, ['*this***is*a*pattern'], 'file/this/is/the/pattern', '404Not Found'));

  it('displays blocked reason for DevTools blocked requests matching with multiple components',
     testBlockedURL.bind(null, ['*this***is*a*pattern'], 'this/is/a/pattern', '(blocked:devtools)'));

  it('does not display blocked reason for requests non-matching due to a missing component',
     testBlockedURL.bind(null, ['*this***is*a*pattern'], 'this/is', '404Not Found'));

  it('displays blocked reason for DevTools blocked requests matching with a simple substring',
     testBlockedURL.bind(null, ['pattern'], 'long/pattern/inside', '(blocked:devtools)'));

  it('displays blocked reason for DevTools blocked requests matching the pattern exactly',
     testBlockedURL.bind(null, ['pattern'], 'pattern', '(blocked:devtools)'));

  it('displays blocked reason for DevTools blocked requests matching duplicate pattern',
     testBlockedURL.bind(null, ['pattern', 'pattern'], 'pattern', '(blocked:devtools)'));

  it('does not display blocked reason for requests non-matching due to a missing repeated acomponent',
     testBlockedURL.bind(null, ['v*w*x*y*z'], 'zyxwvzyxwvzyxwvzyxwv', '404Not Found'));

  it('displays blocked reason for DevTools blocked requests matching with multiple repeated components',
     testBlockedURL.bind(null, ['v*w*x*y*z'], 'zyxwvzyxwvzyxwvzyxwvz', '(blocked:devtools)'));

  it('displays blocked reason for DevTools blocked requests matching all patterns',
     testBlockedURL.bind(null, ['one1', 'two2'], 'one1two2', '(blocked:devtools)'));

  it('does not display blocked reason for requests non-matching any of the patterns',
     testBlockedURL.bind(null, ['one1', 'two2', 'three3'], 'four4', '404Not Found'));

  it('displays blocked reason for DevTools blocked requests matching some patterns',
     testBlockedURL.bind(null, ['one1', 'two2', 'three3'], 'only-two2-here', '(blocked:devtools)'));
});
