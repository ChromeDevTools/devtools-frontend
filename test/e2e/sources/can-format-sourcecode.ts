// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';

const PRETTY_PRINT_BUTTON = `[aria-label="Pretty print minified-sourcecode.js"]`;

async function doubleClickSourceTreeItem(selector: string) {
  await waitFor(selector);
  await click(selector, {clickOptions: {clickCount: 2}});
}

function retrieveCodeMirrorEditorContent() {
  return document.querySelector('.CodeMirror-code')!.textContent;
}

async function openFileInSourcesPanel(target: puppeteer.Page) {
  await target.goto(`${resourcesPath}/sources/minified-sourcecode.html`);

  // Locate the button for switching to the sources tab.
  await click('#tab-sources');

  // Wait for the navigation panel to show up
  await waitFor('.navigator-file-tree-item');

  // Open a particular file in the editor
  await doubleClickSourceTreeItem(`[aria-label="minified-sourcecode.js, file"]`);

  // Wait for the file to be formattable, this process is async after opening a file
  await waitFor(PRETTY_PRINT_BUTTON);
}

async function prettyPrintMinifiedFile(frontend: puppeteer.Page) {
  const previousTextContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);

  await click(PRETTY_PRINT_BUTTON);

  // A separate editor is opened which shows the formatted file
  await frontend.waitForFunction(previousTextContent => {
    return document.querySelector('.CodeMirror-code')!.textContent !== previousTextContent;
  }, {}, previousTextContent);
}

// We can't use the click helper, as it is not possible to select a particular
// line number element in CodeMirror.
async function addBreakpointForLine(frontend: puppeteer.Page, index: number) {
  const breakpointLineNumber = await frontend.evaluate(index => {
    const element = document.querySelectorAll('.CodeMirror-linenumber')[index];

    const {left, top, width, height} = element.getBoundingClientRect();
    return {
      x: left + width * 0.5,
      y: top + height * 0.5,
    };
  }, index);

  await frontend.mouse.click(breakpointLineNumber.x, breakpointLineNumber.y);

  await frontend.waitForFunction(() => {
    return document.querySelectorAll('.cm-breakpoint').length !== 0;
  });
}

async function retrieveTopCallFrameScriptLocation(target: puppeteer.Page) {
  // The script will run into a breakpoint, which means that it will not actually
  // finish the evaluation, until we continue executing.
  // Thus, we have to await it at a later point, while stepping through the code.
  const scriptEvaluation = target.evaluate('notFormattedFunction();');

  // Wait for the evaluation to be paused and shown in the UI
  await waitFor('.paused-status');

  // Retrieve the top level call frame script location name
  const scriptLocation =
      await (await $('.call-frame-location')).evaluate((location: HTMLElement) => location.textContent);

  // Resume the evaluation
  await click(`[aria-label="Pause script execution"]`);

  // Make sure to await the context evaluate before asserting
  // Otherwise the Puppeteer process might crash on a failure assertion,
  // as its execution context is destroyed
  await scriptEvaluation;

  return scriptLocation;
}

describe('The Sources Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can format a JavaScript file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target);
    await prettyPrintMinifiedFile(frontend);

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

    await openFileInSourcesPanel(target);
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
        message: `Test for correct line number`,
        lineNumber: `minified-sourcecode.js:formatted:5 `,
      },
      {
        message: `second log`,
        lineNumber: `minified-sourcecode.js:formatted:7 `,
      },
    ]);
  });

  it('can add breakpoint for formatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target);
    await prettyPrintMinifiedFile(frontend);
    await addBreakpointForLine(frontend, 7);

    const scriptLocation = await retrieveTopCallFrameScriptLocation(target);
    assert.deepEqual(scriptLocation, `minified-source…js:formatted:7`);
  });

  it('can add breakpoint for unformatted file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target);
    await addBreakpointForLine(frontend, 2);

    const scriptLocation = await retrieveTopCallFrameScriptLocation(target);
    assert.deepEqual(scriptLocation, `minified-sourcecode.js:3`);
  });
});
