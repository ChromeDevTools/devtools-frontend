// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as SourceFrame from './source_frame.js';

describe('XMLView', () => {
  setupLocaleHooks();

  it('expands nodes recursively', async () => {
    const parsedXML = SourceFrame.XMLView.XMLView.parseXML(
        '<root><level1><level2><level3><level4>text</level4></level3></level2></level1></root>', 'text/xml');
    assert.exists(parsedXML);

    const xmlView = new SourceFrame.XMLView.XMLView();
    xmlView.parsedXML = parsedXML;
    renderElementIntoDOM(xmlView);
    await xmlView.updateComplete;

    const treeView = xmlView.contentElement.querySelector('devtools-tree');
    assert.exists(treeView);
    const treeOutline = treeView.getInternalTreeOutlineForTest();
    const rootElement = treeOutline.rootElement().firstChild();
    assert.exists(rootElement);
    assert.isFalse(rootElement.expanded);

    await rootElement.expandRecursively();
    await xmlView.updateComplete;

    assert.isTrue(rootElement.expanded);
    const level1Element = rootElement.firstChild();
    assert.exists(level1Element);
    assert.isTrue(level1Element.expanded);

    const level2Element = level1Element.firstChild();
    assert.exists(level2Element);
    assert.isTrue(level2Element.expanded);

    const level3Element = level2Element.firstChild();
    assert.exists(level3Element);
    assert.isFalse(level3Element.expanded);
  });
});
