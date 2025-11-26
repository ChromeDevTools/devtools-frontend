// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../../models/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as Highlighting from './highlighting.js';

describe('MarkupHighlight', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  function range(offset: number, length: number): TextUtils.TextRange.SourceRange {
    return new TextUtils.TextRange.SourceRange(offset, length);
  }

  function performTest(innerHTML: string[], ranges: TextUtils.TextRange.SourceRange[], expectedHighlighted: string[]) {
    const element = document.createElement('div');
    element.innerHTML = innerHTML.join('');
    container.appendChild(element);

    const initialHTML = element.innerHTML;
    const initialText = element.textContent || '';
    const changes: Highlighting.HighlightChange[] = [];
    Highlighting.highlightRangesWithStyleClass(element, ranges, 'highlighted', changes);
    assert.strictEqual(element.innerHTML, expectedHighlighted.join(''), 'After highlight');
    Highlighting.revertDomChanges(changes);
    assert.strictEqual(element.innerHTML, initialHTML, 'After revert');
    assert.strictEqual(element.textContent, initialText, 'After revert');
  }

  it('highlights whole text node', () => {
    performTest(['function'], [range(0, 8)], ['<span class="highlighted">function</span>']);
  });

  it('highlights only text node beginning', () => {
    performTest(['function'], [range(0, 7)], ['<span class="highlighted">functio</span>n']);
  });

  it('highlights only text node ending', () => {
    performTest(['function'], [range(1, 7)], ['f<span class="highlighted">unction</span>']);
  });

  it('highlights in the middle of text node', () => {
    performTest(['function'], [range(1, 6)], ['f<span class="highlighted">unctio</span>n']);
  });

  it('highlights all text in 3 text nodes', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'], [range(0, 21)],
        ['<span><span class="highlighted">function functionName</span></span>', '<span></span>', '<span></span>']);
  });

  it('highlights all text in 3 text nodes except for the last character', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'], [range(0, 20)],
        ['<span><span class="highlighted">function functionNam</span></span>', '<span></span>', '<span>e</span>']);
  });

  it('highlights all text in 3 text nodes except for the first character', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'], [range(1, 20)],
        ['<span>f<span class="highlighted">unction functionName</span></span>', '<span></span>', '<span></span>']);
  });

  it('highlights all text in 3 text nodes except for the first and the last characters', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'], [range(1, 19)],
        ['<span>f<span class="highlighted">unction functionNam</span></span>', '<span></span>', '<span>e</span>']);
  });

  it('highlights across nodes', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'], [range(7, 3)],
        ['<span>functio<span class="highlighted">n f</span></span>', '<span></span>', '<span>unctionName</span>']);
  });

  it('highlights first characters in text nodes', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'],
        [range(0, 1), range(8, 1), range(9, 1)], [
          '<span><span class="highlighted">f</span>unction</span>',  //
          '<span><span class="highlighted"> </span></span>',
          '<span><span class="highlighted">f</span>unctionName</span>'
        ]);
  });

  it('highlights last characters in text node', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'],
        [range(7, 1), range(8, 1), range(20, 1)], [
          '<span>functio<span class="highlighted">n</span></span>',  //
          '<span><span class="highlighted"> </span></span>',
          '<span>functionNam<span class="highlighted">e</span></span>'
        ]);
  });

  it('highlights across nodes with first and last characters', () => {
    performTest(
        ['<span>function</span>', '<span> </span>', '<span>functionName</span>'],
        [range(0, 1), range(7, 3), range(20, 1)], [
          '<span><span class="highlighted">f</span>unctio<span class="highlighted">n f</span></span>',  //
          '<span></span>',                                                                              //
          '<span>unctionNam<span class="highlighted">e</span></span>'
        ]);
  });
});
