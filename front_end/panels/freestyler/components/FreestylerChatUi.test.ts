// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, getGetHostConfigStub} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Freestyler from '../freestyler.js';

const {MarkdownRendererWithCodeBlock} = Freestyler.FOR_TEST;

describeWithEnvironment('FreestylerChatUi', () => {
  describe('MarkdownRendererWithCodeBlock', () => {
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

      it('strips links if stripLinks true', () => {
        const linklessRenderer = new MarkdownRendererWithCodeBlock({stripLinks: true});
        for (const linkCase of linkCases) {
          const elem = renderToElem(linkCase, linklessRenderer);
          assert.strictEqual(elem.querySelectorAll('a, x-link, devtools-link').length, 0);
          assert.strictEqual(
              ['<a', '<x-link', '<devtools-link'].some(tagName => elem.outerHTML.includes(tagName)), false);
          assert.ok(elem.textContent?.includes('( https://z.com )'), linkCase);
        }
      });

      it('leaves links intact by default', () => {
        const linkfulRenderer = new MarkdownRendererWithCodeBlock();
        for (const linkCase of linkCases) {
          const elem = renderToElem(linkCase, linkfulRenderer);
          assert.strictEqual(elem.querySelectorAll('a, x-link, devtools-link').length, 1);
          assert.strictEqual(
              ['<a', '<x-link', '<devtools-link'].some(tagName => elem.outerHTML.includes(tagName)), true);
          assert.strictEqual(elem.textContent?.includes('( https://z.com )'), false);
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

      it('strips images if stripLinks true', () => {
        const linklessRenderer = new MarkdownRendererWithCodeBlock({stripLinks: true});
        for (const imageCase of imageCases) {
          const elem = renderToElem(imageCase, linklessRenderer);
          assert.strictEqual(elem.querySelectorAll('a, x-link, devtools-link, img, devtools-markdown-image').length, 0);
          assert.strictEqual(
              ['<a', '<x-link', '<devtools-link', '<img', '<devtools-markdown-image'].some(
                  tagName => elem.outerHTML.includes(tagName)),
              false);

          assert.ok(elem.textContent?.includes('( https://z.com/i.png )'), imageCase);
        }
      });
    });
  });

  function getProp(options: Partial<Freestyler.Props>): Freestyler.Props {
    const noop = () => {};
    const messages: Freestyler.ChatMessage[] = options.messages ?? [];
    return {
      onTextSubmit: noop,
      onInspectElementClick: noop,
      onFeedbackSubmit: noop,
      onCancelClick: noop,
      onContextClick: noop,
      onNewConversation: noop,
      inspectElementToggled: false,
      state: Freestyler.State.CHAT_VIEW,
      agentType: Freestyler.AgentType.FREESTYLER,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      messages,
      selectedContext: new Freestyler.NodeContext({} as unknown as SDK.DOMModel.DOMNode),
      isLoading: false,
      canShowFeedbackForm: false,
      userInfo: {},
      blockedByCrossOrigin: false,
      stripLinks: false,
      isReadOnly: false,
      ...options,
    };
  }

  describe('SideEffects', () => {
    it('should show SideEffects when the step contains "sideEffect" object', async () => {
      const props = getProp({
        messages: [
          {
            entity: Freestyler.ChatMessageEntity.MODEL,
            steps: [
              {
                isLoading: false,
                title: 'Updating element styles',
                thought: 'Updating element styles',
                code: '$0.style.background = "blue";',
                sideEffect: {
                  onAnswer: () => {},
                },
              },
            ],
          },
        ],
      });
      const chat = new Freestyler.FreestylerChatUi(props);
      renderElementIntoDOM(chat);

      const sideEffect = chat.shadowRoot!.querySelector('.side-effect-confirmation');
      assert.exists(sideEffect);
    });

    it('shows the disabled view when the state is CONSENT_VIEW', async () => {
      const props = getProp({
        state: Freestyler.State.CONSENT_VIEW,
      });
      const chat = new Freestyler.FreestylerChatUi(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(
          optIn?.textContent?.trim(), 'Turn on AI assistance in Settings to get help with understanding CSS styles');
      const chatInput = chat.shadowRoot?.querySelector('.chat-input') as HTMLTextAreaElement;
      assert.isTrue(chatInput.disabled);
      assert.strictEqual(chatInput.placeholder, 'Follow the steps above to ask a question');
    });

    it('shows the disabled view when the AIDA is not available', async () => {
      const props = getProp({
        state: Freestyler.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
      });
      const chat = new Freestyler.FreestylerChatUi(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(optIn?.textContent?.trim(), 'Check your internet connection and try again');
      const chatInput = chat.shadowRoot?.querySelector('.chat-input') as HTMLTextAreaElement;
      assert.isTrue(chatInput.disabled);
      assert.strictEqual(chatInput.placeholder, 'Ask a question about the selected element');
    });

    describe('no agent empty state', () => {
      it('should show feature cards for enabled features', () => {
        const stub = getGetHostConfigStub({
          devToolsFreestyler: {
            enabled: true,
          },
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
          devToolsAiAssistancePerformanceAgent: {
            enabled: true,
          },
        });
        const props = getProp({
          agentType: undefined,
        });
        const chat = new Freestyler.FreestylerChatUi(props);
        renderElementIntoDOM(chat);
        const featureCards = chat.shadowRoot?.querySelectorAll('.feature-card');
        assert.isDefined(featureCards);
        assert.strictEqual(featureCards?.length, 4);
        assert.strictEqual(featureCards[0].querySelector('.feature-card-content h3')?.textContent, 'CSS styles');
        assert.strictEqual(featureCards[1].querySelector('.feature-card-content h3')?.textContent, 'Network');
        assert.strictEqual(featureCards[2].querySelector('.feature-card-content h3')?.textContent, 'Files');
        assert.strictEqual(featureCards[3].querySelector('.feature-card-content h3')?.textContent, 'Performance');

        stub.restore();
      });

      it('should not show any feature cards if none of the entrypoints are available', () => {
        const stub = getGetHostConfigStub({
          devToolsFreestyler: {
            enabled: false,
          },
          devToolsAiAssistanceNetworkAgent: {
            enabled: false,
          },
          devToolsAiAssistanceFileAgent: {
            enabled: false,
          },
          devToolsAiAssistancePerformanceAgent: {
            enabled: false,
          },
        });
        const props = getProp({
          agentType: undefined,
        });
        const chat = new Freestyler.FreestylerChatUi(props);
        renderElementIntoDOM(chat);
        const featureCards = chat.shadowRoot?.querySelectorAll('.feature-card');
        assert.isDefined(featureCards);
        assert.strictEqual(featureCards?.length, 0);

        stub.restore();
      });
    });
  });
});
