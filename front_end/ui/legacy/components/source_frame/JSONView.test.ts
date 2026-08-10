// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertScreenshot, doubleRaf, raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy.js';
import * as ObjectUI from '../object_ui/object_ui.js';

import * as SourceFrame from './source_frame.js';

describeWithEnvironment('JSONView', () => {
  const cleanHighlights = () => {
    CSS.highlights.get('highlighted-search-result')?.clear();
    CSS.highlights.get('current-search-result')?.clear();
  };
  beforeEach(cleanHighlights);
  afterEach(cleanHighlights);

  it('instantiates a read-only ObjectPropertiesSection', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({foo: 'bar'}, '', '');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON);
    renderElementIntoDOM(jsonView);
    await raf();

    const treeView = jsonView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(treeView);
    const treeOutline = treeView.getInternalTreeOutlineForTest();
    assert.exists(treeOutline);

    const rootElement = treeOutline.rootElement().childAt(0);
    assert.exists(rootElement);
    await raf();
    const child = rootElement.childAt(0);
    assert.instanceOf(child, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(child.editable);
    jsonView.detach();
  });

  it('handles search correctly', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({foo: 'bar', baz: 'qux'}, '', '');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON, true);
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
    jsonView.setSearchableView(searchableView);
    renderElementIntoDOM(jsonView);
    await raf();

    const treeView = jsonView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(treeView);
    const treeOutline = treeView.getInternalTreeOutlineForTest();
    assert.exists(treeOutline);

    const rootElement = treeOutline.rootElement().childAt(0);
    assert.exists(rootElement);
    await raf();

    const searchConfig = new UI.SearchableView.SearchConfig('ba', false, false, false);
    await jsonView.performSearch(searchConfig, true);
    await doubleRaf();

    const shadowRoot = treeView.shadowRoot;
    assert.exists(shadowRoot);

    let highlightedMatches = CSS.highlights.get('highlighted-search-result');
    let currentMatches = CSS.highlights.get('current-search-result');
    assert.strictEqual((highlightedMatches?.size ?? 0) + (currentMatches?.size ?? 0), 2);
    assert.strictEqual(currentMatches?.size, 1);
    assert.exists(currentMatches);
    const currentRange = Array.from(currentMatches.values())[0];
    assert.strictEqual(currentRange?.toString(), 'ba');

    // Jump to next match
    jsonView.jumpToNextSearchResult();
    await doubleRaf();
    highlightedMatches = CSS.highlights.get('highlighted-search-result');
    currentMatches = CSS.highlights.get('current-search-result');
    assert.strictEqual((highlightedMatches?.size ?? 0) + (currentMatches?.size ?? 0), 2);
    assert.strictEqual(currentMatches?.size, 1);

    // Cancel search
    jsonView.onSearchCanceled();
    await doubleRaf();
    highlightedMatches = CSS.highlights.get('highlighted-search-result');
    assert.strictEqual(highlightedMatches?.size ?? 0, 0);
    currentMatches = CSS.highlights.get('current-search-result');
    assert.strictEqual(currentMatches?.size ?? 0, 0);
  });

  it('cancels search when new parsedJSON is set', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({foo: 'bar', baz: 'qux'}, '', '');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON, true);
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
    jsonView.setSearchableView(searchableView);
    renderElementIntoDOM(jsonView);
    await raf();

    const searchConfig = new UI.SearchableView.SearchConfig('ba', false, false, false);
    await jsonView.performSearch(searchConfig, true);
    await doubleRaf();

    let currentMatches = CSS.highlights.get('current-search-result');
    assert.strictEqual(currentMatches?.size, 1);

    jsonView.parsedJSON = new SourceFrame.JSONView.ParsedJSON({other: 'data'}, '', '');
    await raf();

    currentMatches = CSS.highlights.get('current-search-result');
    assert.strictEqual(currentMatches?.size ?? 0, 0);
  });

  it('renders visual baseline of JSONView', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({
      stringField: 'hello world',
      numberField: 42,
      booleanField: true,
      nestedObject: {
        arrayField: [1, 2, 3],
      },
    },
                                                           'prefix_pre_', '_suffix_post');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON, true);
    renderElementIntoDOM(jsonView);
    await raf();

    const treeView = jsonView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(treeView);
    const treeOutline = treeView.getInternalTreeOutlineForTest();
    assert.exists(treeOutline);
    const rootElement = treeOutline.rootElement().childAt(0);
    assert.exists(rootElement);
    await raf();
    rootElement.expand();
    await raf();

    await assertScreenshot('source_frame/json_view_baseline.png');
  });

  it('renders search highlights on JSONView', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({
      baz: 'bar',
      foo: 'barbaz',
      bar: 'qux',
    },
                                                           '', '');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON, true);
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
    jsonView.setSearchableView(searchableView);
    renderElementIntoDOM(jsonView);
    await raf();

    const treeView = jsonView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(treeView);
    const treeOutline = treeView.getInternalTreeOutlineForTest();
    assert.exists(treeOutline);

    const rootElement = treeOutline.rootElement().childAt(0);
    assert.exists(rootElement);
    await raf();
    rootElement.expand();

    await raf();

    const searchConfig = new UI.SearchableView.SearchConfig('ba', false, false, false);
    await jsonView.performSearch(searchConfig, true);
    await doubleRaf();

    await assertScreenshot('source_frame/json_view_search_highlights.png');
  });
});
