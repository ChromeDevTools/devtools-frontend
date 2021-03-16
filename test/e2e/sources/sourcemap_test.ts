// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitFor, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('sets multiple breakpoints in case of code-splitting (crbug.com/1142705)', async () => {
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
