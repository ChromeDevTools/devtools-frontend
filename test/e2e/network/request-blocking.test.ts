// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {navigateToNetworkTab, setTextFilter, waitForSomeRequestsToAppear} from '../helpers/network-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';
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

async function setupRequestBlocking(devToolsPage: DevToolsPage,
                                    {patterns, enabled}: {patterns: string[], enabled: boolean}): Promise<void> {
  await openPanelViaMoreTools(devToolsPage, 'Request conditions');
  for (const pattern of patterns) {
    await devToolsPage.click('aria/Add network request blocking or throttling pattern');
    await devToolsPage.waitFor('devtools-prompt[editing]');
    const formattedPattern = `*://*:*/*${pattern}`;
    await devToolsPage.typeText(formattedPattern);
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForElementWithTextContent(formattedPattern);
  }

  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria('Enable blocking and throttling')).toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, enabled);
}

async function disableRequestBlocking(devToolsPage: DevToolsPage): Promise<void> {
  await openPanelViaMoreTools(devToolsPage, 'Request conditions');
  await devToolsPage.click('aria/Remove all network request blocking or throttling patterns');
  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria('Enable blocking and throttling')).toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, false);
}

describe('The Request conditions drawer', function() {
  if (this.timeout() > 0) {
    this.timeout(20000);
  }

  it('prohibits unchecking patterns when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage,
                               {patterns: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], enabled: false});

    await devToolsPage.waitForAriaNone('Edit');
    await devToolsPage.waitForAriaNone('Remove');

    const firstListItem = await devToolsPage.waitFor('.blocked-url');
    const firstCheckbox = await (await devToolsPage.waitFor('devtools-list .blocked-url-checkbox')).toElement('input');
    assert.isTrue(await checkboxIsChecked(firstCheckbox));
    await firstListItem.click();
    assert.isTrue(await checkboxIsChecked(firstCheckbox));

    await disableRequestBlocking(devToolsPage);
  });

  it('allows scrolling the pattern list when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage,
                               {patterns: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], enabled: false});

    const list = await devToolsPage.waitFor('.list');
    const lastListItem = await devToolsPage.waitForElementWithTextContent('*://*:*/*9');
    // TODO: this is not completely fair way to scroll but mouseWheel does not
    // seem to work here in the new-headless on Windows and Linux.
    await lastListItem.scrollIntoView();
    await devToolsPage.waitForFunction(() => isVisible(lastListItem, list));

    await disableRequestBlocking(devToolsPage);
  });

  it('displays blocked reason for CSP blocked requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'csp.html');
    await setTextFilter(devToolsPage, 'csp.js');
    await inspectedPage.evaluate(() => {
      // @ts-expect-error
      sendCSPRequest();
    });
    await waitForSomeRequestsToAppear(devToolsPage, 1);
    const status = await devToolsPage.waitFor('.network-log-grid tbody .status-column');
    assert.strictEqual(await status.evaluate(node => node.textContent), '(blocked:csp)');

    await disableRequestBlocking(devToolsPage);
  });

  async function testBlockedURL(patterns: string[], url: string, expectedStatus: string,
                                wrappers: {devToolsPage: DevToolsPage, inspectedPage: InspectedPage}) {
    const {devToolsPage, inspectedPage} = wrappers;
    await setupRequestBlocking(devToolsPage, {patterns, enabled: true});

    await navigateToNetworkTab(devToolsPage, inspectedPage, 'csp.html');
    await setTextFilter(devToolsPage, url.substring(url.lastIndexOf('/') + 1));
    void inspectedPage.evaluate(url => {
      // @ts-expect-error
      addBlockedScript(url);
    }, url);
    await waitForSomeRequestsToAppear(devToolsPage, 1);
    await devToolsPage.waitForFunction(async () => {
      const status = await devToolsPage.$('.network-log-grid tbody .status-column');
      if (!status) {
        return false;
      }
      return (await status.evaluate(node => node.textContent)) === expectedStatus;
    });

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
     testBlockedURL.bind(null, ['pattern*'], 'long/pattern/inside', '(blocked:devtools)'));

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
     testBlockedURL.bind(null, ['one1*', 'two2*', 'three3*'], 'only-two2-here', '(blocked:devtools)'));
});
