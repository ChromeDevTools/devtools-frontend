// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$$, click, getBrowserAndPages, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print minified-sourcecode.js"]';

function retrieveCodeMirrorEditorContent() {
  return document.querySelector('.CodeMirror-code')!.textContent;
}

async function prettyPrintMinifiedFile(frontend: puppeteer.Page) {
  const previousTextContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);

  await click(PRETTY_PRINT_BUTTON);

  // A separate editor is opened which shows the formatted file
  await frontend.waitForFunction(previousTextContent => {
    return document.querySelector('.CodeMirror-code')!.textContent !== previousTextContent;
  }, {}, previousTextContent);
}


describe('The Sources Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  it('can format a JavaScript file', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);

    const expectedLines = [
      '// Copyright 2020 The Chromium Authors. All rights reserved.',
      '// Use of this source code is governed by a BSD-style license that can be',
      '// found in the LICENSE file.',
      '// clang-format off',
      'const notFormatted = {',
      '    something: \'not-formatted\'',
      '};',
      'console.log(\'Test for correct line number\');',
      'function notFormattedFunction() {',
      '    console.log(\'second log\');',
      '    return {',
      '        field: 2 + 4',
      '    }',
      '}',
      ';notFormattedFunction();',
      ​ '\u200B',
    ];
    let expectedTextContent = '';

    for (let i = 0; i < expectedLines.length; i++) {
      expectedTextContent += `${i + 1}${expectedLines[i]}`;
    }

    const updatedTextContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);
    assert.strictEqual(updatedTextContent, expectedTextContent);
  });

  it('causes the correct line number to show up in the console panel', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);

    await click('#tab-console');

    await waitFor('.console-group-messages');
    const messages = await waitForFunction(async () => {
      const messages = await $$('.console-group-messages .source-code');
      return messages.length === 2 ? messages : undefined;
    });

    const messageLinks = await Promise.all(messages.map(
        messageHandle =>
            (messageHandle.evaluate(message => ({
                                      message: message.querySelector('.console-message-text')!.textContent,
                                      lineNumber: message.querySelector('.console-message-anchor')!.textContent,
                                    })))));

    assert.deepEqual(messageLinks, [
      {
        message: 'Test for correct line number',
        lineNumber: 'minified-sourcecode.js:formatted:8 ',
      },
      {
        message: 'second log',
        lineNumber: 'minified-sourcecode.js:formatted:10 ',
      },
    ]);
  });

  it('can add breakpoint for formatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);
    await addBreakpointForLine(frontend, 10);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-source…s:formatted:10');
  });

  it('can add breakpoint for unformatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await addBreakpointForLine(frontend, 6);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-sourcecode.js:6');
  });

  it('can add breakpoint on minified source and then break correctly on formatted source', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await addBreakpointForLine(frontend, 6);
    await prettyPrintMinifiedFile(frontend);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-source…s:formatted:10');
  });

  // This requires additional fixes
  it.skip('[crbug.com/1003497] can add breakpoint for inline scripts in HTML file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('inline-script.html', 'inline-script.html');
    await addBreakpointForLine(frontend, 16);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('functionInInlineScriptWithSourceURL();', target);
    assert.deepEqual(scriptLocation, 'named-inline-script.js:2');
  });
});
