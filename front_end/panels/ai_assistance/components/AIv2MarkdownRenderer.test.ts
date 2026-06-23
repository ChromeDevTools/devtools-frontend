// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import {html} from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('AIv2MarkdownRenderer', () => {
  it('should transform code token for multiline code blocks with `css` language written in the first line', () => {
    const renderer = new AiAssistance.AIv2MarkdownRenderer();
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

  describe('links', () => {
    const renderToElem = (string: string, options?: AiAssistance.AIv2MarkdownRendererOptions): Element => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component, {allowMultipleChildren: true});
      component.data = {
        tokens: Marked.Marked.lexer(string),
        renderer: new AiAssistance.AIv2MarkdownRenderer(options),
      };
      for (const el of component.shadowRoot?.children ?? []) {
        if (el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'STYLE') {
          return el;
        }
      }

      assert.fail('No Element node found');
    };

    describe('DevTools resources', () => {
      it('works for requests', () => {
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
        assert.isNull(link.getAttribute('href'));
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
        const file = new Workspace.UISourceCode.UISourceCode(project, urlString`https://example.com/script.js`,
                                                             Common.ResourceType.resourceTypes.Script);
        sinon.stub(workspace, 'projects').returns([project]);
        AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.set(file, 1);

        const el = renderToElem('[text](#file-1)');

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        assert.isNull(link.getAttribute('href'));
      });

      it('works for links inside codespan', () => {
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

        const el = renderToElem('`[text](#req-requestId)`');

        const link = el.querySelector('devtools-link');
        assert.exists(link);
        assert.isNull(link.getAttribute('href'));
      });
    });

    describe('DOM node linkification', () => {
      let mockDomModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;

      beforeEach(() => {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        mockDomModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
        const mockTarget = {
          model: (modelClass: unknown) => {
            if (modelClass === SDK.DOMModel.DOMModel) {
              return mockDomModel;
            }
            return null;
          },
        } as unknown as SDK.Target.Target;
        sinon.stub(targetManager, 'primaryPageTarget').returns(mockTarget);
      });

      it('linkifies nodes using #node-ID', async () => {
        const mockDocument = {
          documentURL: 'https://example.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
        } as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map([
          [23 as Protocol.DOM.BackendNodeId, mockNode],
        ]));

        const linkifyStub =
            sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<span>LINKIFIED</span>`);

        const el = renderToElem('[text](#node-23)', {mainDocumentURL: urlString`https://example.com`});

        // Wait for async rendering
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodesByBackendIdsToFrontend);
        sinon.assert.calledOnce(linkifyStub);
        assert.include(el.textContent, 'LINKIFIED');
      });

      it('does not linkify nodes if the node belongs to a different origin', async () => {
        const mockDocument = {
          documentURL: 'https://cross-origin.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
        } as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map([
          [23 as Protocol.DOM.BackendNodeId, mockNode],
        ]));

        const linkifyStub =
            sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<span>LINKIFIED</span>`);

        const el = renderToElem('[text](#node-23)', {mainDocumentURL: urlString`https://example.com`});

        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodesByBackendIdsToFrontend);
        sinon.assert.notCalled(linkifyStub);
        assert.include(el.textContent, 'text');
        assert.notInclude(el.textContent, 'LINKIFIED');
      });

      it('restricts linkification by frameId if mainFrameId is provided', async () => {
        const mockDocument = {
          documentURL: 'https://example.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
          frameId: () => 'frame-123',
        } as unknown as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map([
          [23 as Protocol.DOM.BackendNodeId, mockNode],
        ]));

        const linkifyStub =
            sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<span>LINKIFIED</span>`);

        const el = renderToElem('[text](#node-23)', {mainFrameId: 'frame-different'});

        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodesByBackendIdsToFrontend);
        sinon.assert.notCalled(linkifyStub);
        assert.include(el.textContent, 'text');
      });

      it('linkifies paths using #path-PATH', async () => {
        const mockDocument = {
          documentURL: 'https://example.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
        } as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodeByPathToFrontend.resolves(42 as Protocol.DOM.NodeId);
        mockDomModel.nodeForId.returns(mockNode);

        const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify')
                                .returns(html`<span>LINKIFIED_PATH</span>`);

        const el = renderToElem('[text](#path-1,HTML,1,BODY)', {mainDocumentURL: urlString`https://example.com`});

        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodeByPathToFrontend);
        sinon.assert.calledOnce(linkifyStub);
        assert.include(el.textContent, 'LINKIFIED_PATH');
      });

      it('linkifies paths using #1,HTML (without #path- prefix)', async () => {
        const mockDocument = {
          documentURL: 'https://example.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
        } as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodeByPathToFrontend.resolves(42 as Protocol.DOM.NodeId);
        mockDomModel.nodeForId.returns(mockNode);

        const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify')
                                .returns(html`<span>LINKIFIED_PATH</span>`);

        const el = renderToElem('[text](#1,HTML,1,BODY)', {mainDocumentURL: urlString`https://example.com`});

        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodeByPathToFrontend);
        sinon.assert.calledWith(mockDomModel.pushNodeByPathToFrontend, '1,HTML,1,BODY');
        sinon.assert.calledOnce(linkifyStub);
        assert.include(el.textContent, 'LINKIFIED_PATH');
      });

      it('works for nodes inside codespan', async () => {
        const mockDocument = {
          documentURL: 'https://example.com',
        } as SDK.DOMModel.DOMDocument;
        const mockNode = {
          ownerDocument: mockDocument,
        } as SDK.DOMModel.DOMNode;

        mockDomModel.pushNodesByBackendIdsToFrontend.resolves(new Map([
          [23 as Protocol.DOM.BackendNodeId, mockNode],
        ]));

        const linkifyStub =
            sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<span>LINKIFIED</span>`);

        const el = renderToElem('`[text](#node-23)`', {mainDocumentURL: urlString`https://example.com`});

        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(mockDomModel.pushNodesByBackendIdsToFrontend);
        sinon.assert.calledOnce(linkifyStub);
        assert.include(el.textContent, 'LINKIFIED');
      });
    });

    describe('trace events', () => {
      it('linkifies trace events', () => {
        const mockEvent = {name: 'MyEvent', args: {data: {}}} as unknown as Trace.Types.Events.Event;
        const lookupTraceEvent = sinon.stub().returns(mockEvent);

        const el = renderToElem('[text](#event-key)', {lookupTraceEvent});

        const link = el.querySelector('a');
        assert.exists(link);
        assert.include(link.textContent, 'text (MyEvent)');
      });

      it('linkifies trace events inside codespan', () => {
        const mockEvent = {name: 'MyEvent', args: {data: {}}} as unknown as Trace.Types.Events.Event;
        const lookupTraceEvent = sinon.stub().returns(mockEvent);

        const el = renderToElem('`[text](#event-key)`', {lookupTraceEvent});

        const link = el.querySelector('a');
        assert.exists(link);
        assert.include(link.textContent, 'text (MyEvent)');
      });
    });
  });
});
