// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  addBreakpointForLine,
  getCallFrameLocations,
  getCallFrameNames,
  openFileInEditor,
  openFileInSourcesPanel,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  retrieveCodeMirrorEditorContent,
  waitForLines,
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

  it('pauses on inline scripts after setting a fragment ID and reloading', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel(devToolsPage, inspectedPage, 'inline-scripts.html');

    const locationHash = await inspectedPage.evaluate(() => {
      window.location.hash = '#hash';
      return window.location.hash;
    });
    assert.strictEqual(locationHash, '#hash');

    await openFileInEditor(devToolsPage, 'inline-scripts.html');
    await addBreakpointForLine(devToolsPage, 11);

    const reloadPromise = inspectedPage.reload();
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForMany('.call-frame-item:not([hidden]):not(.hidden)', 2);

    const [callFrameNames, callFrameLocations] = await Promise.all([
      getCallFrameNames(devToolsPage),
      getCallFrameLocations(devToolsPage),
    ]);
    assert.deepEqual(callFrameNames, ['f4', '(anonymous)']);
    assert.deepEqual(callFrameLocations, ['inline-scripts.html:11', 'inline-scripts.html:13']);

    await waitForLines(devToolsPage, 17);
    const sourceContent = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.deepEqual(sourceContent, [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <script>  function f1() { return 0; }; f1();  </script>     ' +
          '<script>function f2() { return 0; }</script><script>',
      'function f3() { return 0; }',
      '</script>',
      '',
      '<script>',
      'function f4()',
      '{',
      '    return 0;',
      '}',
      'f4();',
      '</script>',
      '</head>',
      '</html>',
      '',
    ]);

    await devToolsPage.click(RESUME_BUTTON);
    await reloadPromise;
    await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);
    assert.strictEqual(await inspectedPage.evaluate(() => window.location.hash), '#hash');
  });
});
