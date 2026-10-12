// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('AdoptedStyleSheetContentsWidget', () => {
  const sheetId = 'sheet-id' as Protocol.DOM.StyleSheetId;
  let cssModel: SDK.CSSModel.CSSModel;

  beforeEach(() => {
    const target = createTarget();
    cssModel = target.model(SDK.CSSModel.CSSModel)!;
  });

  function addStyleSheet(text: string): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader {
    cssModel.styleSheetAdded({
      styleSheetId: sheetId,
      frameId: '' as Protocol.Page.FrameId,
      sourceURL: '',
      title: '',
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      disabled: false,
      isInline: false,
      isMutable: true,
      isConstructed: true,
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: text.length,
      length: text.length,
      loadingFailed: false,
    });
    const header = cssModel.styleSheetHeaderForId(sheetId);
    assert.exists(header);
    return header;
  }

  it('renders the style sheet text', async () => {
    const initialCSS = '.foo { color: blue; }';
    sinon.stub(cssModel, 'getStyleSheetText').resolves(initialCSS);
    const header = addStyleSheet(initialCSS);

    const widget = new Elements.AdoptedStyleSheetTreeElement.AdoptedStyleSheetContentsWidget();
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    widget.styleSheetHeader = header;
    await widget.fetchContent();
    await widget.updateComplete;

    const textElement = widget.contentElement.querySelector('.webkit-html-text-node');
    assert.exists(textElement);
    assert.strictEqual(textElement.textContent, initialCSS);
    widget.detach();
  });

  it('edits an adopted style sheet', async () => {
    const initialCSS = '/* comment */';
    const getStyleSheetTextStub = sinon.stub(cssModel, 'getStyleSheetText').resolves(initialCSS);
    const setTextStub = sinon.stub(cssModel, 'setStyleSheetText').resolves(null);
    const header = addStyleSheet(initialCSS);

    const widget = new Elements.AdoptedStyleSheetTreeElement.AdoptedStyleSheetContentsWidget();
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    widget.styleSheetHeader = header;
    await widget.fetchContent();
    await widget.updateComplete;

    const textElementDOM = widget.contentElement.querySelector<HTMLElement>('.webkit-html-text-node');
    assert.exists(textElementDOM);
    assert.strictEqual(textElementDOM.textContent, initialCSS);

    // Start editing by double clicking the text node.
    textElementDOM.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));
    assert.isTrue(widget.isEditing());
    // startEditing re-requests the content before the inplace editor is attached.
    for (let i = 0; i < 10 && !UI.UIUtils.isBeingEdited(textElementDOM); i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    assert.isTrue(UI.UIUtils.isBeingEdited(textElementDOM));
    sinon.assert.calledTwice(getStyleSheetTextStub);
    assert.strictEqual(textElementDOM.textContent, initialCSS);

    // The inplace editor is now active on textElementDOM.
    const newCSS = '.foo { color: red; }';
    textElementDOM.textContent = newCSS;

    // The commit is triggered by blur or enter.
    textElementDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    assert.isFalse(widget.isEditing());
    sinon.assert.calledOnce(setTextStub);
    sinon.assert.calledWith(setTextStub, sheetId, newCSS, false);
    widget.detach();
  });
});
