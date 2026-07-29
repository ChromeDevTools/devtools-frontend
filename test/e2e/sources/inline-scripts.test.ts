// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  getCallFrameNames,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', function() {
  it('sets the breakpoint in the first script for multiple inline scripts', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'inline-scripts.html', 'inline-scripts.html');
    await addBreakpointForLine(devToolsPage, 4);
    await addBreakpointForLine(devToolsPage, 11);

    void inspectedPage.reload();
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    let names = await getCallFrameNames(devToolsPage);
    assert.strictEqual(names[0], 'f1');

    await devToolsPage.click(RESUME_BUTTON);
    await devToolsPage.waitForElementWithTextContent('f4inline-scripts.html:11');

    names = await getCallFrameNames(devToolsPage);
    assert.strictEqual(names[0], 'f4');
  });
});
