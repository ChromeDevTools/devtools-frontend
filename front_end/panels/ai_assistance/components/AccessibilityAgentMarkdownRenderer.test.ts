// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import {html} from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('AccessibilityAgentMarkdownRenderer', () => {
  describe('link', () => {
    const renderToElem = (string: string): Element => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component, {allowMultipleChildren: true});
      component.data = {
        tokens: Marked.Marked.lexer(string),
        renderer: new AiAssistance.AccessibilityAgentMarkdownRenderer(),
      };
      for (const el of component.shadowRoot?.children ?? []) {
        if (el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'STYLE') {
          return el;
        }
      }

      assert.fail('No Element node found');
    };

    it('linkifies nodes using #node-ID', async () => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const mockDomModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);

      const mockTarget = {
        model: (modelClass: unknown) => {
          if (modelClass === SDK.DOMModel.DOMModel) {
            return mockDomModel;
          }
          return null;
        },
      } as unknown as SDK.Target.Target;

      sinon.stub(targetManager, 'primaryPageTarget').returns(mockTarget);

      const mockNode = {
        frameId: () => '',
      } as SDK.DOMModel.DOMNode;

      mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map([
        [23 as Protocol.DOM.BackendNodeId, mockNode],
      ]));

      const linkifyStub =
          sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<span>LINKIFIED</span>`);

      const el = renderToElem('[text](#node-23)');

      // Wait for async rendering (until directive)
      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnce(mockDomModel.pushNodesByBackendIdsToFrontend);
      sinon.assert.calledOnce(linkifyStub);
      assert.include(el.textContent, 'LINKIFIED');
    });

    it('falls back to text if node is not found', async () => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const mockDomModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);

      const mockTarget = {
        model: (modelClass: unknown) => {
          if (modelClass === SDK.DOMModel.DOMModel) {
            return mockDomModel;
          }
          return null;
        },
      } as unknown as SDK.Target.Target;
      sinon.stub(targetManager, 'primaryPageTarget').returns(mockTarget);
      mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map());
      const el = renderToElem('[text](#node-23)');
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.include(el.textContent, 'text');
    });

    it('linkifies paths using #path-PATH', async () => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const mockDomModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);

      const mockTarget = {
        model: (modelClass: unknown) => {
          if (modelClass === SDK.DOMModel.DOMModel) {
            return mockDomModel;
          }
          return null;
        },
      } as unknown as SDK.Target.Target;

      sinon.stub(targetManager, 'primaryPageTarget').returns(mockTarget);

      const mockNode = {
        frameId: () => '',
      } as SDK.DOMModel.DOMNode;

      mockDomModel.pushNodeByPathToFrontend.resolves(42 as Protocol.DOM.NodeId);
      mockDomModel.nodeForId.returns(mockNode);

      const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify')
                              .returns(html`<span>LINKIFIED_PATH</span>`);

      const el = renderToElem('[text](#path-1,HTML,1,BODY)');

      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnce(mockDomModel.pushNodeByPathToFrontend);
      sinon.assert.calledOnce(linkifyStub);
      assert.include(el.textContent, 'LINKIFIED_PATH');
    });
  });
});
