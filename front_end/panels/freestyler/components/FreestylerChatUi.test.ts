// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as FreestylerChatUi from '../freestyler.js';

const {MarkdownRendererWithCodeBlock} = FreestylerChatUi.FOR_TEST;

describe('FreestylerChatUi', () => {
  describeWithEnvironment('MarkdownRendererWithCodeBlock', () => {
    it('should transform code token for multiline code blocks with `css` language written in the first line', () => {
      const renderer = new MarkdownRendererWithCodeBlock();
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
  });
});
