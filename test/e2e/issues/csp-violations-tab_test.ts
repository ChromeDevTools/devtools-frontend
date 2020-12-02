// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {ElementHandle} from 'puppeteer';

import {click, enableExperiment, goToResource, typeText, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getDataGridRows} from '../helpers/datagrid-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

async function getDataGridText(datagrid: ElementHandle<Element>[][]): Promise<string[][]> {
  const table: Array<Array<string>> = [];
  for (const row of datagrid) {
    const textRow = [];
    for (const [i, cell] of row.entries()) {
      let node = cell;
      // First column is a Linkifier
      if (i === 0) {
        const link = await waitFor('devtools-linkifier', cell);
        const linkText = await waitFor('a.link', link);
        node = linkText;
      }
      const text = await node.evaluate(x => {
        if (x instanceof HTMLElement) {
          return x.innerText;
        }
        return '';
      });
      textRow.push(text);
    }
    table.push(textRow);
  }
  return table;
}


describe('CSP Violations Tab', async () => {
  beforeEach(async () => {
    await enableExperiment('cspViolationsView');
    await openPanelViaMoreTools('CSP Violations');
    await goToResource('network/trusted-type-violations-report-only.rawresponse');
  });

  it('should display all csp violations', async () => {
    const cspViolationsPane = await waitFor('.csp-violations-pane');
    const rows = await getDataGridText(await getDataGridRows(2, cspViolationsPane));
    const expectedRows = [
      ['trusted-type-violations-report-only.rawresponse:1', 'trusted-types', 'Policy Violation', 'report-only'],
      [
        'trusted-type-violations-report-only.rawresponse:1',
        'require-trusted-types-for',
        'Sink Violation',
        'report-only',
      ],
    ];
    assert.deepEqual(rows, expectedRows);
  });

  it('should update violations when changing page', async () => {
    const cspViolationsPane = await waitFor('.csp-violations-pane');
    const rows = await getDataGridText(await getDataGridRows(2, cspViolationsPane));
    const expectedRows = [
      ['trusted-type-violations-report-only.rawresponse:1', 'trusted-types', 'Policy Violation', 'report-only'],
      [
        'trusted-type-violations-report-only.rawresponse:1',
        'require-trusted-types-for',
        'Sink Violation',
        'report-only',
      ],
    ];
    assert.deepEqual(rows, expectedRows);

    await goToResource('network/trusted-type-violations-enforced.rawresponse');
    const rows2 = await getDataGridText(await getDataGridRows(1, cspViolationsPane));
    const expectedRows2 = [
      ['trusted-type-violations-enforced.rawresponse:1', 'trusted-types', 'Policy Violation', 'blocked'],
    ];
    assert.deepEqual(rows2, expectedRows2);
  });

  it('should not display sink violations', async () => {
    await click('[aria-label="Categories"]');
    await click('[aria-label="Trusted Type Sink, checked"]');

    const cspViolationsPane = await waitFor('.csp-violations-pane');
    const rows = await getDataGridText(await getDataGridRows(1, cspViolationsPane));
    const expectedRows = [
      ['trusted-type-violations-report-only.rawresponse:1', 'trusted-types', 'Policy Violation', 'report-only'],
    ];

    assert.deepEqual(rows, expectedRows);
  });

  it('should not display matching violations', async () => {
    await click('.toolbar-input-prompt');
    await typeText('Sink');
    const cspViolationsPane = await waitFor('.csp-violations-pane');
    const rows = await getDataGridText(await getDataGridRows(1, cspViolationsPane));
    const expectedRows = [
      [
        'trusted-type-violations-report-only.rawresponse:1',
        'require-trusted-types-for',
        'Sink Violation',
        'report-only',
      ],
    ];
    assert.deepEqual(rows, expectedRows);
  });
});
