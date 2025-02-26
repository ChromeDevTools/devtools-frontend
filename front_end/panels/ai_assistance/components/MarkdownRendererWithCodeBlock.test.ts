// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('MarkdownRendererWithCodeBlock', () => {
  it('should transform code token for multiline code blocks with `css` language written in the first line', () => {
    const renderer = new AiAssistance.MarkdownRendererWithCodeBlock();
    const templateForTokenStub =
        sinon.stub(MarkdownView.MarkdownView.MarkdownInsightRenderer.prototype, 'templateForToken');
    const codeBlock = `\`\`\`
css
* {
color: red;
}
\`\`\``;
    const codeToken = Marked.Marked.lexer(codeBlock)[0] as Marked.Marked.Tokens.Code;
    assert.isEmpty(codeToken.lang);
    renderer.renderToken(codeToken);

    sinon.assert.calledWith(templateForTokenStub, sinon.match({
      lang: 'css',
      text: `* {
color: red;
}`,
    }));
  });

  describe('link/image stripping', () => {
    const linkCases = [
      '[link text](https://z.com)',
      'A response with [link text](https://z.com).',
      '[*link text*](https://z.com)',
      '[**text** `with code`](https://z.com).',
      'plain link https://z.com .',
      'link in quotes \'https://z.com\' .',
    ];

    const renderToElem = (string: string, renderer: MarkdownView.MarkdownView.MarkdownLitRenderer): Element => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component, {allowMultipleChildren: true});
      component.data = {tokens: Marked.Marked.lexer(string), renderer};
      assert.exists(component.shadowRoot?.firstElementChild);
      return component.shadowRoot.firstElementChild;
    };

    it('strips links', () => {
      const linklessRenderer = new AiAssistance.MarkdownRendererWithCodeBlock();
      for (const linkCase of linkCases) {
        const elem = renderToElem(linkCase, linklessRenderer);
        assert.lengthOf(elem.querySelectorAll('a, x-link, devtools-link'), 0);
        assert.isFalse(['<a', '<x-link', '<devtools-link'].some(tagName => elem.outerHTML.includes(tagName)));
      }
    });

    const imageCases = [
      '![image alt](https://z.com/i.png)',
      'A response with ![image alt](https://z.com/i.png).',
      '![*image alt*](https://z.com/i.png)',
      '![**text** `with code`](https://z.com/i.png).',
      'plain image href https://z.com/i.png .',
      'link in quotes \'https://z.com/i.png\' .',
    ];

    it('strips images', () => {
      const linklessRenderer = new AiAssistance.MarkdownRendererWithCodeBlock();
      for (const imageCase of imageCases) {
        const elem = renderToElem(imageCase, linklessRenderer);
        assert.lengthOf(elem.querySelectorAll('a, x-link, devtools-link, img, devtools-markdown-image'), 0);
        assert.isFalse(['<a', '<x-link', '<devtools-link', '<img', '<devtools-markdown-image'].some(
            tagName => elem.outerHTML.includes(tagName)));
      }
    });
  });
});
