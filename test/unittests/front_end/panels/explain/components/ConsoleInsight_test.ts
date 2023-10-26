// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Explain from '../../../../../../front_end/panels/explain/explain.js';
import type * as Marked from '../../../../../../front_end/third_party/marked/marked.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithLocale('ConsoleInsight', () => {
  describe('Markdown renderer', () => {
    it('renders link as an x-link', () => {
      const renderer = new Explain.MarkdownRenderer();
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'exampleLink'} as Marked.Marked.Token);
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
  });
});
