// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type ElementHandle} from 'puppeteer-core';

import type * as TextEditor from '../../../front_end/ui/components/text_editor/text_editor.js';
import {click, pressKey, typeText, waitFor} from '../../shared/helper.js';
import {loadComponentDocExample} from '../helpers/shared.js';

async function getEditorContent(textEditor: ElementHandle): Promise<string> {
  return textEditor.evaluate(node => (node as TextEditor.TextEditor.TextEditor).state.doc.toString());
}

async function getEditorSelection(textEditor: ElementHandle): Promise<{anchor: number, head: number}> {
  return JSON.parse(await textEditor.evaluate(node => {
    const {anchor, head} = (node as TextEditor.TextEditor.TextEditor).state.selection.main;
    return JSON.stringify({anchor, head});
  }));
}

describe('text editor', () => {
  it('can insert and delete some text', async () => {
    await loadComponentDocExample('text_editor/basic.html');
    const textEditor = await waitFor('devtools-text-editor');

    await click('.cm-content', {root: textEditor});
    await typeText('Some text here');

    assert.strictEqual(await getEditorContent(textEditor), 'Some text here');

    await pressKey('Backspace');
    await pressKey('Backspace');

    assert.strictEqual(await getEditorContent(textEditor), 'Some text he');
  });

  it('binds the expected keys', async () => {
    await loadComponentDocExample('text_editor/basic.html');
    const textEditor = await waitFor('devtools-text-editor');

    await click('.cm-content', {root: textEditor});
    await typeText('one two');
    const ctrlOrAlt = process.platform === 'darwin' ? {alt: true} : {control: true};

    await pressKey('ArrowLeft');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 6);
    await pressKey('ArrowLeft', ctrlOrAlt);
    assert.strictEqual((await getEditorSelection(textEditor)).head, 4);
    await pressKey('Home');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 0);

    await pressKey('ArrowRight');
    assert.strictEqual((await getEditorSelection(textEditor)).head, 1);
    await pressKey('ArrowRight', ctrlOrAlt);
    assert.strictEqual((await getEditorSelection(textEditor)).head, 3);
    await pressKey('End', {control: true});
    assert.strictEqual((await getEditorSelection(textEditor)).head, 7);

    await typeText(' three');
    assert.strictEqual(await getEditorContent(textEditor), 'one two three');
    await pressKey('Z', {control: true});
    assert.strictEqual(await getEditorContent(textEditor), 'one two');
    await pressKey('Z', {control: true});
    assert.strictEqual(await getEditorContent(textEditor), '');
  });
});
