// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, resetPages, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, openFileInSourcesPanel, retrieveTopCallFrameScriptLocation} from './sources-helpers.js';

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


describe('The Sources Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can format a JavaScript file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);

    const expectedLines = [
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
      ​'\u200B',
    ];
    let expectedTextContent = '';

    for (let i = 0; i < expectedLines.length; i++) {
      expectedTextContent += `${i + 1}${expectedLines[i]}`;
    }

    const updatedTextContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);
    assert.equal(updatedTextContent, expectedTextContent);
  });

  it('causes the correct line number to show up in the console panel', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);

    await click('#tab-console');

    await waitFor('.console-group-messages');

    const messageLinks = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-group-messages .source-code'))
          .map(message => ({
                 message: message.querySelector('.console-message-text')!.textContent,
                 lineNumber: message.querySelector('.console-message-anchor')!.textContent,
               }));
    });

    assert.deepEqual(messageLinks, [
      {
        message: 'Test for correct line number',
        lineNumber: 'minified-sourcecode.js:formatted:5 ',
      },
      {
        message: 'second log',
        lineNumber: 'minified-sourcecode.js:formatted:7 ',
      },
    ]);
  });

  it('can add breakpoint for formatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile(frontend);
    await addBreakpointForLine(frontend, 7);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-source…js:formatted:7');
  });

  it('can add breakpoint for unformatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'minified-sourcecode.js', 'minified-sourcecode.html');
    await addBreakpointForLine(frontend, 2);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-sourcecode.js:3');
  });

  it('can add breakpoint on minified source and then break correctly on formatted source', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'minified-sourcecode.js', 'minified-sourcecode.html');
    await addBreakpointForLine(frontend, 2);
    await prettyPrintMinifiedFile(frontend);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-source…js:formatted:7');
  });
});
