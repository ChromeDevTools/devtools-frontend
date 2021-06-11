// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, goToResource, step, waitFor, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickNthChildOfSelectedElementNode, focusElementsTree, waitForContentOfSelectedElementsNode, waitForCSSPropertyValue, waitForElementsStyleSection} from '../helpers/elements-helpers.js';
import {addBreakpointForLine, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1218732] sets multiple breakpoints in case of code-splitting', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-codesplit.ts', 'sourcemap-codesplit.html');
    await addBreakpointForLine(frontend, 3);

    const scriptLocation0 = await retrieveTopCallFrameScriptLocation('functions[0]();', target);
    assert.deepEqual(scriptLocation0, 'sourcemap-codesplit.ts:3');

    await target.evaluate(
        'var s = document.createElement("script"); s.src = "sourcemap-codesplit2.js"; document.body.appendChild(s);');

    // Wait for the sourcemap of sourcemap-codesplit2.js to load, which is
    // indicated by the status text in the toolbar of the Sources panel.
    const toolbarHandle = await waitFor('.sources-toolbar');
    await waitForElementWithTextContent('sourcemap-codesplit2.js', toolbarHandle);

    const scriptLocation1 = await retrieveTopCallFrameScriptLocation('functions[1]();', target);
    assert.deepEqual(scriptLocation1, 'sourcemap-codesplit.ts:3');
  });
});

describe('The Elements Tab', async () => {
  it('links to the right SASS source for inline CSS with relative sourcemap (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-inline-relative.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for inline CSS with absolute sourcemap (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic-link.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for dynamically added CSS style tags (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for dynamically added CSS link tags (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic-link.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
    await waitForElementWithTextContent('Line 12, Column 9');
  });
});
