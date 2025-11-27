// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../../models/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as Highlighting from './highlighting.js';

describe('HighlightElement', () => {
  let setStub: sinon.SinonStub;

  beforeEach(() => {
    setStub = sinon.stub(Highlighting.HighlightManager.HighlightManager.instance({forceNew: true}), 'set');
  });

  function createHighlightElement(): HTMLElement {
    const element = document.createElement('devtools-highlight');
    renderElementIntoDOM(element);
    return element;
  }

  it('sets ranges on the highlight manager when the attribute is set', async () => {
    const element = createHighlightElement();
    element.setAttribute('ranges', '1,2 3,4');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const expectedRanges = [
      new TextUtils.TextRange.SourceRange(1, 6),
    ];
    sinon.assert.calledOnce(setStub);
    const actualCall = setStub.getCall(0);
    assert.strictEqual(actualCall.args[0], element);
    assert.deepEqual(actualCall.args[1], expectedRanges);
    assert.isUndefined(actualCall.args[2]);
  });

  it('sets current range on the highlight manager when the attribute is set', async () => {
    const element = createHighlightElement();
    element.setAttribute('current-range', '5,6');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const currentRange = new TextUtils.TextRange.SourceRange(5, 6);
    assert.isTrue(setStub.calledOnceWith(element, [], currentRange));
  });

  it('updates both ranges and current range on the highlight manager', async () => {
    const element = createHighlightElement();

    element.setAttribute('ranges', '1,2 3,4');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    const expectedRanges = [
      new TextUtils.TextRange.SourceRange(1, 6),
    ];
    sinon.assert.calledOnce(setStub);
    assert.deepEqual(setStub.getCall(0).args[1], expectedRanges);

    setStub.resetHistory();

    element.setAttribute('current-range', '5,6');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    const expectedCurrentRange = new TextUtils.TextRange.SourceRange(5, 6);
    sinon.assert.calledOnce(setStub);
    const actualCall = setStub.getCall(0);
    assert.strictEqual(actualCall.args[0], element);
    assert.deepEqual(actualCall.args[1], expectedRanges);
    assert.deepEqual(actualCall.args[2], expectedCurrentRange);
  });

  it('updates both current range and ranges on the highlight manager', async () => {
    const element = createHighlightElement();

    element.setAttribute('current-range', '5,6');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    const expectedCurrentRange = new TextUtils.TextRange.SourceRange(5, 6);
    sinon.assert.calledOnce(setStub);
    assert.deepEqual(setStub.getCall(0).args[2], expectedCurrentRange);

    setStub.resetHistory();

    element.setAttribute('ranges', '1,2 3,4');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    const expectedRanges = [
      new TextUtils.TextRange.SourceRange(1, 6),
    ];
    sinon.assert.calledOnce(setStub);
    const actualCall = setStub.getCall(0);
    assert.strictEqual(actualCall.args[0], element);
    assert.deepEqual(actualCall.args[1], expectedRanges);
    assert.deepEqual(actualCall.args[2], expectedCurrentRange);
  });

  it('handles empty range attributes', async () => {
    const element = createHighlightElement();

    element.setAttribute('ranges', '');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    assert.isTrue(setStub.calledOnceWith(element, [], undefined));
  });

  it('handles invalid range attributes', async () => {
    const element = createHighlightElement();

    element.setAttribute('ranges', 'foo bar 1,2,3 4');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    assert.isTrue(setStub.calledOnceWith(element, [], undefined));
  });

  it('sorts and merges ranges', async () => {
    const element = createHighlightElement();
    element.setAttribute('ranges', '10,2 1,3 2,3');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const ranges = [
      new TextUtils.TextRange.SourceRange(1, 4),
      new TextUtils.TextRange.SourceRange(10, 2),
    ];
    assert.isTrue(setStub.calledOnceWith(element, ranges, undefined));
  });

  it('does not call set if attribute value does not change', async () => {
    const element = createHighlightElement();

    element.setAttribute('ranges', '1,2');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    sinon.assert.calledOnce(setStub);

    setStub.resetHistory();

    element.setAttribute('ranges', '1,2');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    sinon.assert.notCalled(setStub);
  });
});
