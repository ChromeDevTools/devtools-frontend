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

async function setupRequestBlocking(
    devToolsPage: DevToolsPage,
    {patterns, enabled, useURLPatterns}: {patterns: string[], enabled: boolean, useURLPatterns: boolean}):
    Promise<void> {
  await openPanelViaMoreTools(useURLPatterns ? 'Request conditions' : 'Network request blocking', devToolsPage);
  for (const pattern of patterns) {
    await devToolsPage.click(
        useURLPatterns ? 'aria/Add network request blocking or throttling pattern' :
                         'aria/Add network request blocking pattern');
    await devToolsPage.click('.blocked-url-edit-value > input');
    await devToolsPage.typeText(useURLPatterns ? `:*/*${pattern}` : pattern);
    await devToolsPage.click('aria/Add');
  }

  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria(
                 useURLPatterns ? 'Enable blocking and throttling' : 'Enable network request blocking'))
          .toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, enabled);
}

async function disableRequestBlocking(devToolsPage: DevToolsPage, useURLPatterns: boolean): Promise<void> {
  await openPanelViaMoreTools(useURLPatterns ? 'Request conditions' : 'Network request blocking', devToolsPage);
  await devToolsPage.click(
      useURLPatterns ? 'aria/Remove all network request blocking or throttling patterns' :
                       'aria/Remove all network request blocking patterns');
  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria(
                 useURLPatterns ? 'Enable blocking and throttling' : 'Enable network request blocking'))
          .toElement('input');
  await setCheckBox(networkRequestBlockingCheckbox, false);
}

for (const useURLPatterns of [true]) {
  describe(`The ${useURLPatterns ? 'Request conditions drawer' : 'Network request blocking panel'}`, function() {
    if (this.timeout() > 0) {
      this.timeout(20000);
    }

    async function setUpHostConfig(devToolsPage: DevToolsPage) {
      if (useURLPatterns) {
        const hostConfig = {
          devToolsIndividualRequestThrottling: {enabled: true},
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

        await devToolsPage.reload({
          waitUntil: 'networkidle0',
        });
      }
    }

    it('prohibits unchecking patterns when blocking is disabled', async ({devToolsPage}) => {
      await setUpHostConfig(devToolsPage);
      await setupRequestBlocking(
          devToolsPage, {patterns: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], enabled: false, useURLPatterns});

      await devToolsPage.waitForAriaNone('Edit');
      await devToolsPage.waitForAriaNone('Remove');

      const firstListItem = await devToolsPage.waitFor('.blocked-url');
      const firstCheckbox =
          await (await devToolsPage.waitFor('.widget > .list > .list-item > .blocked-url > .blocked-url-checkbox'))
              .toElement('input');
      assert.isTrue(await checkboxIsChecked(firstCheckbox));
      await firstListItem.click();
      assert.isTrue(await checkboxIsChecked(firstCheckbox));

      await disableRequestBlocking(devToolsPage, useURLPatterns);
    });

    it('allows scrolling the pattern list when blocking is disabled', async ({devToolsPage}) => {
      await setUpHostConfig(devToolsPage);
      await setupRequestBlocking(
          devToolsPage, {patterns: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], enabled: false, useURLPatterns});

      const list = await devToolsPage.waitFor('.list');
      const lastListItem = await devToolsPage.waitForElementWithTextContent(useURLPatterns ? '*://*:*/*9' : '9');
      // TODO: this is not completely fair way to scroll but mouseWheel does not
      // seem to work here in the new-headless on Windows and Linux.
      await lastListItem.scrollIntoView();
      await devToolsPage.waitForFunction(() => isVisible(lastListItem, list));

      await disableRequestBlocking(devToolsPage, useURLPatterns);
    });

    it('displays blocked reason for CSP blocked requests', async ({devToolsPage, inspectedPage}) => {
      await setUpHostConfig(devToolsPage);
      await navigateToNetworkTab('csp.html', devToolsPage, inspectedPage);
      await setTextFilter('csp.js', devToolsPage);
      await inspectedPage.evaluate(() => {
        // @ts-expect-error
        sendCSPRequest();
      });
      await waitForSomeRequestsToAppear(1, devToolsPage);
      const status = await devToolsPage.waitFor('.network-log-grid tbody .status-column');
      assert.strictEqual(await status.evaluate(node => node.textContent), '(blocked:csp)');

      await disableRequestBlocking(devToolsPage, useURLPatterns);
    });

    async function testBlockedURL(
        patterns: string[], url: string, expectedStatus: string,
        wrappers: {devToolsPage: DevToolsPage, inspectedPage: InspectedPage}) {
      const {devToolsPage, inspectedPage} = wrappers;
      await setUpHostConfig(devToolsPage);
      await setupRequestBlocking(devToolsPage, {patterns, enabled: true, useURLPatterns});

      await navigateToNetworkTab('csp.html', devToolsPage, inspectedPage);
      await setTextFilter(url.substring(url.lastIndexOf('/') + 1), devToolsPage);
      inspectedPage.evaluate(url => {
        // @ts-expect-error
        addBlockedScript(url);
      }, url);
      await waitForSomeRequestsToAppear(1, devToolsPage);
      const status = await devToolsPage.waitFor('.network-log-grid tbody .status-column');
      assert.strictEqual(await status.evaluate(node => node.textContent), expectedStatus);

      await disableRequestBlocking(devToolsPage, useURLPatterns);
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
}
