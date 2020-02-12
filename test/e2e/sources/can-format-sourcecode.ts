// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, debuggerStatement, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';

const PRETTY_PRINT_BUTTON = `[aria-label="Pretty print minified-sourcecode.js"]`;

async function doubleClickSourceTreeItem(selector: string) {
  await waitFor(selector);
  await click(selector, {clickOptions: {clickCount: 2}});
}

function retrieveCodeMirrorEditorContent() {
  return document.querySelector('.CodeMirror-code')!.textContent;
}

async function prettyPrintMinifiedFile(target: puppeteer.Page, frontend: puppeteer.Page) {
  await target.goto(`${resourcesPath}/sources/minified-sourcecode.html`);

  // Locate the button for switching to the sources tab.
  await click('#tab-sources');

  // Wait for the navigation panel to show up
  await waitFor('.navigator-file-tree-item');

  // Open a particular file in the editor
  await doubleClickSourceTreeItem(`[aria-label="minified-sourcecode.js, file"]`);

  // Wait for the file to be formattable, this process is async after opening a file
  await waitFor(PRETTY_PRINT_BUTTON);

  const previousTextContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);

  await click(PRETTY_PRINT_BUTTON);

  // A separate editor is opened which shows the formatted file
  await frontend.waitForFunction((previousTextContent) => {
    return document.querySelector('.CodeMirror-code')!.textContent !== previousTextContent;
  }, {}, previousTextContent);
}

describe('The Sources Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can format a JavaScript file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await prettyPrintMinifiedFile(target, frontend);

    const expectedLines = [
      `// clang-format off`,
      `const notFormatted = {`,
      `    something: 'not-formatted'`,
      `};`,
      `console.log('Test for correct line number');`,
      `function notFormattedFunction() {`,
      `    console.log('second log');`,
      `    return {`,
      `        field: 2 + 4`,
      `    }`,
      `}`,
      `;notFormattedFunction();`,
      ​`\u200B`,
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

    await prettyPrintMinifiedFile(target, frontend);

    await click('#tab-console');

    await waitFor('.console-group-messages');

    const messageLinks = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-group-messages .source-code'))
          .map(message => ({
                 message: message.querySelector('.console-message-text')!.textContent,
                 lineNumber: message.querySelector('.console-message-anchor')!.textContent,
               }));
    });

    await debuggerStatement(frontend);

    assert.deepEqual(messageLinks, [
      {
        message: `Test for correct line number`,
        lineNumber: `minified-sourcecode.js:formatted:5 `,
      },
      {
        message: `second log`,
        lineNumber: `minified-sourcecode.js:formatted:7 `,
      }
    ]);
  });
});
