// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitFor, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, checkBreakpointIsActive, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation, waitForSourceCodeLines} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('[crbug.com/1142705] sets multiple breakpoints in case of code-splitting', async () => {
    const {target, frontend} = getBrowserAndPages();
    const numberOfLines = 4;
    await openSourceCodeEditorForFile('sourcemap-codesplit.ts', 'sourcemap-codesplit.html');
    await waitForSourceCodeLines(numberOfLines);
    await addBreakpointForLine(frontend, 3);
    await checkBreakpointIsActive(3);

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
