// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, getBrowserAndPages, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  getSelectedSource,
  openSourceCodeEditorForFile,
  retrieveTopCallFrameScriptLocation,
  SourceFileEvents,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print minified-sourcecode.js"]';

async function retrieveCodeMirrorEditorContent(): Promise<Array<string>> {
  const editor = await waitFor('[aria-label="Code editor"]');
  return editor.evaluate(node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

async function prettyPrintMinifiedFile() {
  const source = await getSelectedSource();
  await waitForSourceFiles(
      SourceFileEvents.SourceFileLoaded, files => files.some(f => f.endsWith(`${source}:formatted`)), async () => {
        const previousTextContent = await retrieveCodeMirrorEditorContent();

        await waitFor(PRETTY_PRINT_BUTTON);
        await click(PRETTY_PRINT_BUTTON);

        // A separate editor is opened which shows the formatted file
        await waitForFunction(async () => {
          const currentTextContent = await retrieveCodeMirrorEditorContent();
          return currentTextContent.join('\n') !== previousTextContent.join('\n');
        });
      });
}

describe('The Sources Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  if (this.timeout() > 0) {
    this.timeout(10000);
  }

  it('can format a JavaScript file', async () => {
    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile();

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
      '',
    ];

    const updatedTextContent = await retrieveCodeMirrorEditorContent();
    assert.strictEqual(updatedTextContent.join('\n'), expectedLines.join('\n'));
  });

  it('causes the correct line number to show up in the console panel', async () => {
    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await prettyPrintMinifiedFile();

    await click('#tab-console');

    await waitFor('.console-group-messages');
    const messages = await waitForFunction(async () => {
      const messages = await $$('.console-group-messages .source-code');
      return messages.length === 2 ? messages : undefined;
    });

    const messageLinks =
        await Promise.all(messages.map(messageHandle => (messageHandle.evaluate(message => {
                                         const messageText = message.querySelector('.console-message-text');
                                         const lineNumber = message.querySelector('.console-message-anchor');
                                         if (!messageText) {
                                           assert.fail('Could not find console message text element');
                                         }
                                         if (!lineNumber) {
                                           assert.fail('Could not find console line number element');
                                         }
                                         return ({
                                           message: messageText.textContent,
                                           lineNumber: lineNumber.textContent,
                                         });
                                       }))));

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
    await prettyPrintMinifiedFile();
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
    await prettyPrintMinifiedFile();

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-source…s:formatted:10');
  });
});
