// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const rule = require('../lib/single_screenshot_assertion_per_test.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('single_screenshot_assertion_per_test', rule, {
  valid: [
    {
      code: `it('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code:
          `it('will autoscroll if the user has a cell selected, but then clicks elsewhere in the UI, causing a new row to be added',
      async () => {
        const dataGrid = await getDataGrid();
        await assertDataGridNotScrolled(dataGrid);

        const firstBodyCell = await $('tr[aria-rowindex="1"] > td[aria-colindex="1"]', dataGrid);
        if (!firstBodyCell) {
          throw new Error('Could not find first body cell to click.');
        }
        await click(firstBodyCell);
        await waitFor('tr.selected', dataGrid);
        await clickAddButton();
        await getDataGridRows(11, dataGrid);
        await waitForScrollTopOfDataGrid(dataGrid, 89);
      });`,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `it('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
        changeSomeThing();
        assertElementScreenshotUnchanged(element, 'bar.png');
      })
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'moreThanOneScreenshotAssertionFound'}],
    },
    {
      code: `it('does a thing', function() {
        assertElementScreenshotUnchanged(element, 'foo.png');
        changeSomeThing();
        assertElementScreenshotUnchanged(element, 'bar.png');
      })
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'moreThanOneScreenshotAssertionFound'}],
    },
    {
      code: `function testViaSomeHelper() {
        assertElementScreenshotUnchanged(element, 'foo.png');
        changeSomeThing();
        assertElementScreenshotUnchanged(element, 'bar.png');
      }

      it('does a thing', function() {
        testViaSomeHelper();
      })
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'moreThanOneScreenshotAssertionFound'}],
    },
    {
      code: `const testViaSomeHelper = () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
        changeSomeThing();
        assertElementScreenshotUnchanged(element, 'bar.png');
      }

      it('does a thing', function() {
        testViaSomeHelper();
      })
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'moreThanOneScreenshotAssertionFound'}],
    },
    {
      code: `it('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
        changeSomeThing();
        assertPageScreenshotUnchanged(element, 'bar.png');
      })
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'moreThanOneScreenshotAssertionFound'}],
    },
  ]
});
