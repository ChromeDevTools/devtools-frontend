// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  navigateToNetworkTab,
  openNetworkTab,
  setCacheDisabled,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';

describe('The Network Tab', function() {
  // This test reload panels repeatedly, which can take a longer time.
  this.timeout(20_000);

  async function assertOption(select: ElementHandle<HTMLSelectElement>, expected: string) {
    assert.strictEqual(await select.evaluate(el => el.selectedOptions.length), 1);
    assert.strictEqual(await select.evaluate(el => el.selectedOptions[0].getAttribute('aria-label')), expected);
  }

  it('can throttle requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'hello.html');
    await waitForSomeRequestsToAppear(devToolsPage, 1);

    const select = await devToolsPage.waitForAria<HTMLSelectElement>('Throttling');
    await assertOption(select, 'Disabled: No throttling');
    await select.select('Offline');
    await assertOption(select, 'Presets: Offline');

    await inspectedPage.reload().catch(() => {});

    await inspectedPage.waitForElementWithTextContent('No internet');

    await waitForSomeRequestsToAppear(devToolsPage, 1);

    const name = await devToolsPage.waitFor<HTMLElement>('.network-log-grid .network-error-row .name-column');
    const status = await devToolsPage.waitFor<HTMLElement>('.network-log-grid .network-error-row .status-column');
    assert.strictEqual('hello.html', await name.evaluate(e => e.innerText));
    assert.strictEqual('(failed)net::ERR_INTERNET_DISCONNECTED', await status.evaluate(e => e.innerText));
  });

  it('can persist throttling conditions', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'empty.html');
    // Start with no throttling, select an option "A".
    {
      const select = await devToolsPage.waitForAria<HTMLSelectElement>('Throttling');
      await assertOption(select, 'Disabled: No throttling');
      await select.select('3G');
      await assertOption(select, 'Presets: 3G');
    }
    // Verify persistence for "A", select another option "B".
    await devToolsPage.reloadWithParams({panel: 'network'});
    {
      const select = await devToolsPage.waitForAria<HTMLSelectElement>('Throttling');
      await assertOption(select, 'Presets: 3G');
      await select.select('Slow 4G');
      await assertOption(select, 'Presets: Slow 4G');
    }
    // Verify persistence for "B", disable throttling.
    await devToolsPage.reloadWithParams({panel: 'network'});
    {
      const select = await devToolsPage.waitForAria<HTMLSelectElement>('Throttling');
      await assertOption(select, 'Presets: Slow 4G');
      await select.select('No throttling');
      await assertOption(select, 'Disabled: No throttling');
    }
    // Verify persistence of disabled throttling.
    await devToolsPage.reloadWithParams({panel: 'network'});
    {
      const select = await devToolsPage.waitForAria<HTMLSelectElement>('Throttling');
      await assertOption(select, 'Disabled: No throttling');
    }
  });

  it('shows network status for non-HTTP and missing script requests', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html', {waitUntil: 'networkidle0'});
    await openNetworkTab(devToolsPage);
    await setCacheDisabled(devToolsPage, true);
    await devToolsPage.click('[aria-label="Clear network log"]');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await inspectedPage.evaluate(async () => {
      function addScriptElement(src: string): Promise<void> {
        return new Promise(resolve => {
          const script = document.createElement('script');
          script.src = src;
          script.addEventListener('load', () => resolve(), {once: true});
          script.addEventListener('error', () => resolve(), {once: true});
          document.head.appendChild(script);
        });
      }
      await addScriptElement('sources/click-breakpoint.js');
      await addScriptElement('non-existent-file.js');
      await addScriptElement('data:application/javascript,var x = 0;');
    });

    const rows = await devToolsPage.waitForFunction(async () => {
      const result = await devToolsPage.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLElement>('.data-grid-data-grid-node'))
            .map(row => {
              const nameCell = row.querySelector<HTMLElement>('.name-column');
              const statusCell = row.querySelector<HTMLElement>('.status-column');
              if (!nameCell || !statusCell) {
                return null;
              }
              const nameNode = [...nameCell.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
              const name = nameNode?.textContent ?? '';
              const status = statusCell.innerText.replace(/\s+/g, ' ').trim();
              const statusTitle = statusCell.getAttribute('title') ?? '';
              const isError = row.classList.contains('network-error-row');
              return {name, status, statusTitle, isError};
            })
            .filter((row): row is {name: string, status: string, statusTitle: string, isError: boolean} =>
                        row !== null);
      });
      if (result.length !== 3 ||
          result.some(r => !r.name || !r.status || r.status === '(pending)' || r.status === '(data)' ||
                          !r.statusTitle)) {
        return undefined;
      }
      return result;
    });

    assert.deepEqual(rows, [
      {name: 'click-breakpoint.js', status: '200', statusTitle: '200 OK', isError: false},
      {name: 'non-existent-file.js', status: '404', statusTitle: '404 Not Found', isError: true},
      {name: 'data:application/ja…', status: '200', statusTitle: '200 OK', isError: false},
    ]);
  });
});
