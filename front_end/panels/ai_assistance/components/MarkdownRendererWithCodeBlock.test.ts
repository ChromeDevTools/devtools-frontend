// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../../testing/NetworkRequestHelpers.js';
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
    const renderToElem = (string: string, options?: AiAssistance.MarkdownRendererWithCodeBlockOptions): Element => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component, {allowMultipleChildren: true});
      component.data = {
        tokens: Marked.Marked.lexer(string),
        renderer: new AiAssistance.MarkdownRendererWithCodeBlock(options),
      };
      for (const el of component.shadowRoot?.children ?? []) {
        if (el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'STYLE') {
          return el;
        }
      }

      assert.fail('No Element node found');
    };

    function setupMockUiSourceCode(url: Platform.DevToolsPath.UrlString,
                                   id: number): Workspace.UISourceCode.UISourceCode {
      Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const project = {
        id: () => 'test-project',
        type: () => Workspace.Workspace.projectTypes.Network,
        uiSourceCodes: () => [file],
        fullDisplayName: () => 'script.js',
      } as unknown as Workspace.Workspace.Project;
      const file = new Workspace.UISourceCode.UISourceCode(project, url, Common.ResourceType.resourceTypes.Script);
      sinon.stub(workspace, 'projects').returns([project]);
      AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.set(file, id);
      return file;
    }

    describe('linkifies DevTools resources', () => {
      it('work for requests', () => {
        const request = createNetworkRequest({
          url: 'https://example.com/',
          requestId: 'requestId',
          statusCode: 200,
        });

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
        assert(el.textContent.includes('text'));
        assert.isFalse(el.textContent.includes('#req-unknown'));
      });

      it('works for sources', () => {
        setupMockUiSourceCode(urlString`https://example.com/script.js`, 1);

        const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
        const el = renderToElem('[text](#file-1)', {getEstablishedOrigin: () => origin});

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        // We should be attaching a handler and not
        // a href.
        assert.isNull(link.getAttribute('href'));
      });

      it('works for sources inside codespan', () => {
        setupMockUiSourceCode(urlString`https://example.com/script.js`, 1);

        const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
        const el = renderToElem('`[text](#file-1)`', {getEstablishedOrigin: () => origin});

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        assert.isNull(link.getAttribute('href'));
      });

      it('falls back to text when origin is missing or does not match', () => {
        setupMockUiSourceCode(urlString`https://example.com/script.js`, 1);

        const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
        const crossOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
        const opaqueOrigin = SDK.SecurityOrigin.SecurityOrigin.create('about:blank');

        const elCrossOrigin = renderToElem('[text](#file-1)', {getEstablishedOrigin: () => crossOrigin});
        assert.isNull(elCrossOrigin.querySelector('devtools-link'));
        assert.strictEqual(elCrossOrigin.textContent?.trim(), 'text');

        const elOpaqueOrigin = renderToElem('[text](#file-1)', {getEstablishedOrigin: () => opaqueOrigin});
        assert.isNull(elOpaqueOrigin.querySelector('devtools-link'));
        assert.strictEqual(elOpaqueOrigin.textContent?.trim(), 'text');

        const elUndefinedGetter = renderToElem('[text](#file-1)', {getEstablishedOrigin: () => undefined});
        assert.isNull(elUndefinedGetter.querySelector('devtools-link'));
        assert.strictEqual(elUndefinedGetter.textContent?.trim(), 'text');

        const elNoOrigin = renderToElem('[text](#file-1)');
        assert.isNull(elNoOrigin.querySelector('devtools-link'));
        assert.strictEqual(elNoOrigin.textContent?.trim(), 'text');

        const elInvalidId = renderToElem('[text](#file-notanumber)', {getEstablishedOrigin: () => origin});
        assert.isNull(elInvalidId.querySelector('devtools-link'));
        assert.strictEqual(elInvalidId.textContent?.trim(), 'text');
      });

      it('blocks cross-origin files bypassing origin lock inside codespan', () => {
        setupMockUiSourceCode(urlString`https://malicious.com/script.js`, 123);

        const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
        const el = renderToElem('`[click me](#file-123)`', {getEstablishedOrigin: () => origin});

        const link = el.querySelector('devtools-link');
        assert.notExists(link);
        assert.include(el.textContent, 'click me');
      });

      it('does not link unknown files', () => {
        const el = renderToElem('[text](#file-unknown)');

        const link = el.querySelector('devtools-link');
        assert.notExists(link);
        assert.strictEqual(el.textContent?.trim(), 'text');
      });

      it('work for links inside codespan', () => {
        const request = createNetworkRequest({
          url: 'https://example.com/',
          requestId: 'requestId',
          statusCode: 200,
        });

        const networkLog = Logs.NetworkLog.NetworkLog.instance();
        sinon.stub(networkLog, 'requests').returns([request]);

        const el = renderToElem('`[text](#req-requestId)`');

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        // We should be attaching a handler and not
        // a href.
        assert.isNull(link.getAttribute('href'));
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
