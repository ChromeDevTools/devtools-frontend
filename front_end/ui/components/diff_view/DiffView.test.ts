// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Diff from '../../../third_party/diff/diff.js';

import * as DiffView from './diff_view.js';

function buildDiff(original: string, updated: string): Promise<DocumentFragment> {
  const diff = Diff.Diff.DiffWrapper.lineDiff(original.split('\n'), updated.split('\n'));
  const view = new DiffView.DiffView.DiffView({diff, mimeType: 'text/javascript'});
  return view.loaded.then(() => view.shadowRoot as DocumentFragment);
}

let cachedSimpleDiff: Promise<DocumentFragment>|null = null;

const original = 'let x = `one\ntwo` /* with a\ncomment */\nreturn okay()';
const updated = 'let x = `one\nthree` // with a\n"comment"\nreturn okay()';

function simpleDiff(): Promise<DocumentFragment> {
  if (!cachedSimpleDiff) {
    cachedSimpleDiff = buildDiff(original, updated);
  }
  return cachedSimpleDiff;
}

function text(elt: Node): string {
  if (elt instanceof Text) {
    return elt.nodeValue as string;
  }
  if (elt instanceof HTMLElement && !elt.classList.contains('diff-hidden-text')) {
    return Array.from(elt.childNodes).map(text).join('');
  }
  return '';
}

describeWithLocale('DiffView', () => {
  it('renders the proper content', async () => {
    const output = await simpleDiff();
    const lines = Array.from(output.querySelectorAll('.diff-line-content'));
    assert.strictEqual(lines.length, 6);
    assert.strictEqual(lines.filter(l => !l.classList.contains('diff-line-addition')).map(text).join('\n'), original);
    assert.strictEqual(lines.filter(l => !l.classList.contains('diff-line-deletion')).map(text).join('\n'), updated);
  });

  it('renders line numbers', async () => {
    const output = await simpleDiff();
    const numbers = Array.from(output.querySelectorAll('.diff-line-number'));
    // Line numbers are rendered pairwise per line, with one number
    // omitted from inserted/deleted lines
    assert.strictEqual(numbers.map(text).join('-'), '1-1-2--3---2--3-4-4');
  });

  it('highlights code properly', async () => {
    const output = await simpleDiff();
    const lines = output.querySelectorAll('.diff-line-content');
    // Basic highlighting
    assert.isNotNull(lines[0].querySelector('.token-keyword'));
    // Accurate per-file highlighting
    // - lines[2] holds 'comment */', lines[4] holds '"comment"'.
    assert.isNotNull(lines[2].querySelector('.token-comment'));
    assert.isNotNull(lines[4].querySelector('.token-string'));
  });

  it('collapses long stretches of equal text', async () => {
    const original = 'boring\n'.repeat(100);
    const changed = 'interesting\n' + original.slice(0, 500) + '...' + original.slice(500);
    const view = await buildDiff(original, changed);
    assert.isTrue(view.querySelectorAll('.diff-line-content').length < 100);
    assert.isNotNull(view.querySelector('.diff-line-spacer'));
  });
});
