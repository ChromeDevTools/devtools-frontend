// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

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

  describe('link', () => {
    const renderToElem = (string: string): Element => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component, {allowMultipleChildren: true});
      component.data = {
        tokens: Marked.Marked.lexer(string),
        renderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
      };
      for (const el of component.shadowRoot?.children ?? []) {
        if (el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'STYLE') {
          return el;
        }
      }

      assert.fail('No Element node found');
    };

    describe('linkifies DevTools resources', () => {
      it('work for requests', () => {
        const request = SDK.NetworkRequest.NetworkRequest.create(
            'requestId' as Protocol.Network.RequestId,
            urlString`https://example.com/`,
            urlString`https://example.com/`,
            null,
            null,
            null,
        );
        request.statusCode = 200;

        const networkLog = Logs.NetworkLog.NetworkLog.instance();
        sinon.stub(networkLog, 'requests').returns([request]);

        const el = renderToElem('[text](#req-requestId)');

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        // We should be attaching a handler and not
        // a href.
        assert.isNull(link.getAttribute('href'));
      });

      it('does not link unknown requests', () => {
        const el = renderToElem('[text](#req-unknown)');

        const link = el.querySelector('devtools-link');
        assert.notExists(link);
      });

      it('works for sources', () => {
        Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        const project = {
          id: () => 'test-project',
          type: () => Workspace.Workspace.projectTypes.Network,
          uiSourceCodes: () => [file],
          fullDisplayName: () => 'script.js',
        } as unknown as Workspace.Workspace.Project;
        const file = new Workspace.UISourceCode.UISourceCode(
            project, urlString`https://example.com/script.js`, Common.ResourceType.resourceTypes.Script);
        sinon.stub(workspace, 'projects').returns([project]);
        // Populate the IDs.
        AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.set(file, 1);

        const el = renderToElem('[text](#file-1)');

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        // We should be attaching a handler and not
        // a href.
        assert.isNull(link.getAttribute('href'));
      });

      it('does not link unknown files', () => {
        const el = renderToElem('[text](#file-unknown)');

        const link = el.querySelector('devtools-link');
        assert.notExists(link);
      });
    });

    describe('stripping', () => {
      const linkCases = [
        '[link text](https://z.com)',
        'A response with [link text](https://z.com).',
        '[*link text*](https://z.com)',
        '[**text** `with code`](https://z.com).',
        'plain link https://z.com .',
        'link in quotes \'https://z.com\' .',
      ];

      it('strips links', () => {
        for (const linkCase of linkCases) {
          const elem = renderToElem(linkCase);
          assert.lengthOf(elem.querySelectorAll('a, devtools-link'), 0);
          assert.isFalse(['<a', '<devtools-link'].some(tagName => elem.outerHTML.includes(tagName)));
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
        for (const imageCase of imageCases) {
          const elem = renderToElem(imageCase);
          assert.lengthOf(elem.querySelectorAll('a, devtools-link, img, devtools-markdown-image'), 0);
          assert.isFalse(['<a', '<devtools-link', '<img', '<devtools-markdown-image'].some(
              tagName => elem.outerHTML.includes(tagName)));
        }
      });
    });
  });
});
