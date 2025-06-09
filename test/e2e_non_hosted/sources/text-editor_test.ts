// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import type * as TextEditor from '../../../front_end/ui/components/text_editor/text_editor.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('text editor', () => {
  // Undocked mode helps against flakes when opening tabs (here Sources)
  // update to openPanel once it is able to also look for tabs in 'More tabs' menu
  setup({dockingMode: 'undocked'});

  async function getEditorContent(textEditor: ElementHandle<TextEditor.TextEditor.TextEditor>): Promise<string> {
    return await textEditor.evaluate(node => node.state.doc.toString());
  }

  async function getEditorSelection(textEditor: ElementHandle<TextEditor.TextEditor.TextEditor>):
      Promise<{anchor: number, head: number}> {
    return JSON.parse(await textEditor.evaluate(node => {
      const {anchor, head} = node.state.selection.main;
      return JSON.stringify({anchor, head});
    }));
  }

  async function openSnippet(devToolsPage: DevToolsPage) {
    await devToolsPage.click('aria/Sources');
    const sources = await devToolsPage.waitForAria('Sources panel');
    await devToolsPage.click('aria/More tabs', {root: sources});
    await devToolsPage.click('aria/Snippets');
    await devToolsPage.click('aria/New snippet');
  }

  it('can insert and delete some text', async ({devToolsPage}) => {
    await openSnippet(devToolsPage);

    const textEditor = await devToolsPage.waitFor('devtools-text-editor');

    await devToolsPage.click('.cm-content', {root: textEditor});
    await devToolsPage.typeText('Some text here');

    assert.strictEqual(await getEditorContent(textEditor), 'Some text here');

    await devToolsPage.pressKey('Backspace');
    await devToolsPage.pressKey('Backspace');

    assert.strictEqual(await getEditorContent(textEditor), 'Some text he');

    await devToolsPage.pressKey('S', {
      control: true,
    });
  });

  it('binds the expected keys', async ({devToolsPage}) => {
    await openSnippet(devToolsPage);

    const textEditor = await devToolsPage.waitFor('devtools-text-editor');

    await devToolsPage.click('.cm-content', {root: textEditor});
    await devToolsPage.typeText('one two');
    const ctrlOrAlt = process.platform === 'darwin' ? {alt: true} : {control: true};

    await devToolsPage.pressKey('ArrowLeft');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 6);
    await devToolsPage.pressKey('ArrowLeft', ctrlOrAlt);
    assert.strictEqual((await getEditorSelection(textEditor)).head, 4);
    await devToolsPage.pressKey('Home');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 0);

    await devToolsPage.pressKey('ArrowRight');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 1);
    await devToolsPage.pressKey('ArrowRight', ctrlOrAlt);
    assert.strictEqual((await getEditorSelection(textEditor)).head, 3);
    await devToolsPage.pressKey('End', {control: true});
    assert.strictEqual((await getEditorSelection(textEditor)).head, 7);

    await devToolsPage.typeText(' three');
    assert.strictEqual(await getEditorContent(textEditor), 'one two three');
    await devToolsPage.pressKey('Z', {control: true});
    assert.strictEqual(await getEditorContent(textEditor), 'one two');
    await devToolsPage.pressKey('Z', {control: true});
    assert.strictEqual(await getEditorContent(textEditor), '');

    await devToolsPage.pressKey('S', {
      control: true,
    });
  });
});
