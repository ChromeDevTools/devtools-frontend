// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
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
  });

  function getProp(options: Partial<Freestyler.Props>): Freestyler.Props {
    const noop = () => {};
    const messages: Freestyler.ChatMessage[] = options.messages ?? [];
    return {
      onTextSubmit: noop,
      onInspectElementClick: noop,
      onFeedbackSubmit: noop,
      onCancelClick: noop,
      onSelectedNetworkRequestClick: noop,
      onSelectedFileRequestClick: noop,
      inspectElementToggled: false,
      state: Freestyler.State.CHAT_VIEW,
      agentType: Freestyler.AgentType.FREESTYLER,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      messages,
      selectedElement: new Freestyler.NodeContext({} as unknown as SDK.DOMModel.DOMNode),
      selectedFile: null,
      selectedNetworkRequest: new Freestyler.RequestContext({} as unknown as SDK.NetworkRequest.NetworkRequest),
      selectedAiCallTree: new Freestyler.CallTreeContext({} as unknown as TimelineUtils.AICallTree.AICallTree),
      isLoading: false,
      canShowFeedbackForm: false,
      userInfo: {},
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

    it('shows usage instructions', async () => {
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
      const instructions = chat.shadowRoot?.querySelectorAll('.instructions strong');
      assert.isDefined(instructions);
      assert.strictEqual(instructions?.length, 4);
      assert.strictEqual(instructions[0].textContent, 'CSS help:');
      assert.strictEqual(instructions[1].textContent, 'File insights:');
      assert.strictEqual(instructions[2].textContent, 'Network request insights:');
      assert.strictEqual(instructions[3].textContent, 'Performance analysis:');

      stub.restore();
    });
  });
});
