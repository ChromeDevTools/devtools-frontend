// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../../models/text_utils/text_utils.js';

import * as Highlighting from './highlighting.js';

describe('HighlightManager', () => {
  let container: HTMLDivElement;
  before(() => {
    container = document.createElement('div');
  });

  after(() => {
    container.remove();
  });

  function fromHtml(html: string): HTMLElement {
    const div = container.createChild('div');
    div.innerHTML = html;
    return div;
  }

  function walk(html: string): Highlighting.HighlightManager.RangeWalker {
    return new Highlighting.HighlightManager.RangeWalker(fromHtml(html));
  }

  function toText(range: Range|null): string {
    assert.exists(range);
    const text = range.cloneContents()?.textContent;
    assert.exists(text);
    return text;
  }

  it('correctly translates ranges', () => {
    // "text"
    //    ^^
    assert.deepStrictEqual(toText(walk('text').nextRange(2, 2)), 'xt');

    // "abcdef"
    //    ^ ^
    assert.deepStrictEqual(toText(walk('abc<p>def</p>').nextRange(2, 3)), 'cde');

    // "abcdefghi"
    //    ^    ^
    assert.deepStrictEqual(toText(walk('abc<p>def</p>ghi').nextRange(2, 6)), 'cdefgh');

    // ""
    //  ^
    assert.isNull(walk('').nextRange(0, 1));

    // "abc"
    //     ^
    assert.isNull(walk('abc').nextRange(3, 1));

    // "abc"
    //  ^^^^
    assert.isNull(walk('abc').nextRange(0, 4));

    // "abc"
    //
    assert.isNull(walk('abc').nextRange(0, 0));
    assert.isNull(walk('abc').nextRange(-1, 0));
    assert.isNull(walk('abc').nextRange(0, -1));

    // "abcdefghi"
    //  ^^^^^^^^^
    const walker = walk('abc<p>def</p>ghi');
    assert.deepStrictEqual(toText(walker.nextRange(0, 3)), 'abc');
    assert.deepStrictEqual(toText(walker.nextRange(3, 3)), 'def');
    assert.deepStrictEqual(toText(walker.nextRange(6, 3)), 'ghi');
  });

  it('correctly highlights ranges', () => {
    const highlightManager = new Highlighting.HighlightManager.HighlightManager();

    // @ts-expect-error
    assert.strictEqual(CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY).size, 0);
    const ranges = highlightManager.highlightOrderedTextRanges(fromHtml('abc<p>def</p>ghi'), [
      new TextUtils.TextRange.SourceRange(0, 3),
      new TextUtils.TextRange.SourceRange(3, 3),
      new TextUtils.TextRange.SourceRange(6, 3),
    ]);
    const highlight = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
    assert.strictEqual(highlight?.size, 3);
    assert.deepStrictEqual(Array.from(highlight!.keys()), ranges);
  });
});
