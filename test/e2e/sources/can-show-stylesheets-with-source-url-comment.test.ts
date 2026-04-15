// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  openFileWithQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {
  openFileInSourcesPanel,
  retrieveCodeMirrorEditorContent,
  SourceFileEvents,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', () => {
  // Tests that a dynamically added stylesheet with a standard sourceURL comment (/*# sourceURL=... */) is correctly handled.
  it('can show dynamically added stylesheet with sourceURL', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('stylesheet-source-url-comment.html', devToolsPage, inspectedPage);

    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('addedInlineStylesheet.css')),
        async () => inspectedPage.evaluate('addInlineStyleSheet()'), devToolsPage);

    await openFileWithQuickOpen('addedInlineStylesheet.css', 0, devToolsPage);

    const content = await retrieveCodeMirrorEditorContent(devToolsPage);
    const text = content.join('\n');
    assert.include(text, 'body { color: black');
  });

  // Tests that a deprecated sourceURL comment (/*@ sourceURL=... */) is supported.
  it('can show deprecated sourceURL comment', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('stylesheet-source-url-comment.html', devToolsPage, inspectedPage);

    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE,
        files => files.some(f => f.endsWith('addedInlineStylesheetDeprecated.css')),
        async () => inspectedPage.evaluate('addInlineStyleSheetDeprecated()'), devToolsPage);

    await openFileWithQuickOpen('addedInlineStylesheetDeprecated.css', 0, devToolsPage);

    const content = await retrieveCodeMirrorEditorContent(devToolsPage);
    const text = content.join('\n');
    assert.include(text, 'body { color: black');
  });

  // Tests that a sourceURL comment with a relative path (e.g., css/...) is correctly handled.
  it('can show non-relative sourceURL', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('stylesheet-source-url-comment.html', devToolsPage, inspectedPage);

    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('nonRelativeInlineStylesheet.css')),
        async () => inspectedPage.evaluate('addInlineStyleSheetNonRelative()'), devToolsPage);

    await openFileWithQuickOpen('nonRelativeInlineStylesheet.css', 0, devToolsPage);

    const content = await retrieveCodeMirrorEditorContent(devToolsPage);
    const text = content.join('\n');
    assert.include(text, 'body { color: red');
  });

  // Tests that if multiple sourceURL comments are present, the last one is used.
  it('can show multiple sourceURLs (last one wins)', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('stylesheet-source-url-comment.html', devToolsPage, inspectedPage);

    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE,
        files => files.some(f => f.endsWith('addedInlineStylesheetMultiple.css')),
        async () => inspectedPage.evaluate('addInlineStyleSheetMultiple()'), devToolsPage);

    await openFileWithQuickOpen('addedInlineStylesheetMultiple.css', 0, devToolsPage);

    const content = await retrieveCodeMirrorEditorContent(devToolsPage);
    const text = content.join('\n');
    assert.include(text, 'body { color: red');
  });
});
