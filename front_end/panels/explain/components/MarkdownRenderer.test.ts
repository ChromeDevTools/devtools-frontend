// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Marked from '../../../third_party/marked/marked.js';
import * as Explain from '../explain.js';

const {assert} = chai;

describe('Markdown renderer', () => {
  it('renders link as an x-link', () => {
    const renderer = new Explain.MarkdownRenderer();
    const result = renderer.renderToken({type: 'link', text: 'learn more', href: 'exampleLink'} as Marked.Marked.Token);
    assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
  });
  it('renders images as an x-link', () => {
    const renderer = new Explain.MarkdownRenderer();
    const result =
        renderer.renderToken({type: 'image', text: 'learn more', href: 'exampleLink'} as Marked.Marked.Token);
    assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
  });
  it('renders headers as a strong element', () => {
    const renderer = new Explain.MarkdownRenderer();
    const result = renderer.renderToken({type: 'heading', text: 'learn more'} as Marked.Marked.Token);
    assert(result.strings.join('').includes('<strong>'));
  });
  it('renders unsupported tokens', () => {
    const renderer = new Explain.MarkdownRenderer();
    const result = renderer.renderToken({type: 'html', raw: '<!DOCTYPE html>'} as Marked.Marked.Token);
    assert(result.values.join('').includes('<!DOCTYPE html>'));
  });
});
