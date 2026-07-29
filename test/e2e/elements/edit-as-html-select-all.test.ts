// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {findSubMenuEntryItem, waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';
import {expandSelectedNodeRecursively} from '../helpers/elements-helpers.js';

interface TextEditorElement extends Element {
  editor: {
    state: {
      doc: {length: number},
      selection: {main: {from: number, to: number}},
    },
    viewport: {from: number, to: number},
    dispatch(spec: {
      changes?: {from: number, insert: string},
      selection?: {anchor: number},
      scrollIntoView?: boolean,
    }): void,
  };
}

describe('The Elements tab', function() {
  // Opening two context menus and the editor in sequence can exceed the
  // default budget on a busy bot.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }

  it('selects the whole document from the Edit as HTML context menu', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/switch-panels-while-editing-as-html.html');
    await expandSelectedNodeRecursively(devToolsPage);

    const elementsContentPanel = await devToolsPage.waitFor('#elements-content');
    const selectedNode = await devToolsPage.waitForElementWithTextContent('Inspected Node', elementsContentPanel);

    await selectedNode.click({button: 'right'});
    const editAsHTMLOption = await findSubMenuEntryItem(devToolsPage, 'Edit as HTML');
    await editAsHTMLOption.click();

    const editor = await devToolsPage.waitFor('.elements-disclosure devtools-text-editor');
    await devToolsPage.waitForNone('.soft-context-menu');

    // Grow the document past the editor's height cap and scroll back to the
    // top, so the lines at the bottom fall outside the render viewport.
    await editor.evaluate(element => {
      const view = (element as TextEditorElement).editor;
      const lines = Array.from({length: 500}, (_, i) => `<div>line ${i}</div>`).join('\n');
      view.dispatch({
        changes: {from: view.state.doc.length, insert: '\n' + lines},
        selection: {anchor: 0},
        scrollIntoView: true,
      });
    });
    await devToolsPage.waitForFunction(() => editor.evaluate(element => {
      const view = (element as TextEditorElement).editor;
      return view.viewport.to < view.state.doc.length;
    }),
                                       undefined, 'Waiting for the editor content to be virtualized');

    // Right-click the first rendered line rather than .cm-content, whose
    // center sits below the editor's clipped scroller by now.
    await devToolsPage.click('.cm-line', {root: editor, clickOptions: {button: 'right'}});
    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="Select all"]', {root: menu});
    await devToolsPage.waitForNone('.soft-context-menu');

    const selection = await editor.evaluate(element => {
      const {state} = (element as TextEditorElement).editor;
      return {from: state.selection.main.from, to: state.selection.main.to, length: state.doc.length};
    });
    assert.isAbove(selection.length, 0, 'editor should contain the node markup');
    assert.strictEqual(selection.from, 0, 'selection should start at the beginning of the document');
    assert.strictEqual(selection.to, selection.length, 'selection should reach the end of the document');

    const editorContent = await devToolsPage.$('.cm-content', editor);
    assert.isNotNull(editorContent, 'editor should remain open');
  });
});
