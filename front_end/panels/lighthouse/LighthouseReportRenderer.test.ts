// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import {renderElementIntoDOM, stripLitHtmlCommentNodes} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';

import type * as LighthouseModule from './lighthouse.js';

const {urlString} = Platform.DevToolsPath;

type View = LighthouseModule.LighthouseReportRenderer.View;

describeWithEnvironment('LighthouseReportRenderer', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let target: SDK.Target.Target;
  let sourceElement: HTMLElement;
  let linkElement: HTMLElement;
  const PATH = 'TEST_PATH';
  const NODE_ID = 42 as Protocol.DOM.NodeId;
  const NODE = sinon.createStubInstance(SDK.DOMModel.DOMNode);
  NODE.id = NODE_ID;
  const SNIPPET = 'SNIPPET';
  const SOURCE_URL = urlString`https://example.com/script.js`;
  const LH_NODE_HTML = (path: string, snippet: string) =>
      `<div class="lh-node" data-path="${path}" data-snippet="${snippet}"></div>`;
  const LH_SOURCE_LOCATION_HTML = (url: string, line: string, column: string) => {
    const data = `data-source-url="${url}" data-source-line="${line}" data-source-column="${column}"`;
    return `<div class="lh-source-location" ${data}>placeholder</div>`;
  };
  beforeEach(async () => {
    Lighthouse = await import('./lighthouse.js');
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    linkElement = document.createElement('div');
    linkElement.textContent = 'link';
    sourceElement = document.createElement('div');
  });

  it('resolves node and passes it to the view', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').withArgs(PATH).returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').withArgs(NODE_ID).returns(NODE);
    const view = sinon.stub<Parameters<View>, void>();

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement, view);

    const nodeElement = sourceElement.firstElementChild as HTMLElement;
    assert.lengthOf(nodeElement.children, 1);
    sinon.assert.calledOnceWithExactly(view, {type: 'node', node: NODE, snippet: SNIPPET}, undefined,
                                       nodeElement.firstElementChild as HTMLElement);
  });

  it('handles multiple nodes', async () => {
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const pushNodeByPathToFrontend = sinon.stub(domModel, 'pushNodeByPathToFrontend');
    const nodeForId = sinon.stub(domModel, 'nodeForId');
    const view = sinon.stub<Parameters<View>, void>();
    const NUM_NODES = 3;
    const nodes: SDK.DOMModel.DOMNode[] = [];
    for (let i = 1; i <= NUM_NODES; ++i) {
      sourceElement.innerHTML += LH_NODE_HTML(PATH + i, SNIPPET + i);

      const nodeId = i as Protocol.DOM.NodeId;
      const node = {id: nodeId} as SDK.DOMModel.DOMNode;
      nodes.push(node);
      pushNodeByPathToFrontend.withArgs(PATH + i).returns(Promise.resolve(nodeId));
      nodeForId.withArgs(nodeId).returns(node);
    }

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement, view);

    sinon.assert.callCount(view, NUM_NODES);
    assert.deepEqual(view.args.map(([input]) => input), [
      {type: 'node', node: nodes[0], snippet: 'SNIPPET1'},
      {type: 'node', node: nodes[1], snippet: 'SNIPPET2'},
      {type: 'node', node: nodes[2], snippet: 'SNIPPET3'},
    ]);
    assert.deepEqual(view.args.map(([, , viewTarget]) => viewTarget),
                     [...sourceElement.children].map(child => child.firstElementChild));
  });

  it('resets tooltip', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').returns(NODE);
    const installTooltip = sinon.spy(UI.Tooltip.Tooltip, 'install');

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(
        sourceElement, sinon.stub<Parameters<View>, void>());

    assert.isTrue(installTooltip.calledOnceWith(sourceElement.firstChild as HTMLElement, ''));
  });

  it('only keeps link and screenshot', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);
    assert.exists(sourceElement.firstElementChild);
    sourceElement.firstElementChild.innerHTML = 'foo<div class="lh-element-screenshot"></div>bar';

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').returns(NODE);

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.strictEqual(stripLitHtmlCommentNodes(sourceElement.firstElementChild.innerHTML),
                       '<div class="lh-element-screenshot"></div><span><devtools-widget></devtools-widget></span>');
  });

  it('skips malformed nodes', async () => {
    const originalHtml = [
      LH_NODE_HTML('', SNIPPET),
      LH_NODE_HTML('UNKNOWN_PATH', SNIPPET),
      LH_NODE_HTML('PATH_WIHTOUT_NODE', SNIPPET),
    ].join('');
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').withArgs('PATH_WIHTOUT_NODE').returns(Promise.resolve(NODE_ID));
    sourceElement.innerHTML = originalHtml;
    const view = sinon.stub<Parameters<View>, void>();

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement, view);

    sinon.assert.notCalled(view);
    assert.strictEqual(sourceElement.innerHTML, originalHtml);
  });

  describe('linkifySourceLocationDetails', () => {
    it('passes the source location to the view and clears the placeholder', async () => {
      sourceElement.innerHTML = LH_SOURCE_LOCATION_HTML(SOURCE_URL, '10', '5');
      const view = sinon.stub<Parameters<View>, void>();

      await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifySourceLocationDetails(sourceElement,
                                                                                                      view);

      const placeholder = sourceElement.firstElementChild as HTMLElement;
      sinon.assert.calledOnceWithExactly(
          view, {type: 'source-location', url: SOURCE_URL, lineNumber: 10, columnNumber: 5}, undefined, placeholder);
      assert.lengthOf(placeholder.childNodes, 0);
    });

    it('skips source locations with missing data', async () => {
      const originalHtml = [
        LH_SOURCE_LOCATION_HTML('', '10', '5'),
        LH_SOURCE_LOCATION_HTML(SOURCE_URL, '', '5'),
        LH_SOURCE_LOCATION_HTML(SOURCE_URL, '10', ''),
      ].join('');
      sourceElement.innerHTML = originalHtml;
      const view = sinon.stub<Parameters<View>, void>();

      await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifySourceLocationDetails(sourceElement,
                                                                                                      view);

      sinon.assert.notCalled(view);
      assert.strictEqual(sourceElement.innerHTML, originalHtml);
    });
  });

  describe('view', () => {
    it('renders a DOM node link', () => {
      const viewTarget = document.createElement('div');

      Lighthouse.LighthouseReportRenderer.DEFAULT_VIEW({type: 'node', node: NODE, snippet: SNIPPET}, undefined,
                                                       viewTarget);

      const widgetElement = viewTarget.querySelector<HTMLElement>('devtools-widget');
      assert.exists(widgetElement);
      const config = UI.Widget.widgetConfigs.get(widgetElement);
      assert.strictEqual(config?.widgetClass, PanelsCommon.DOMLinkifier.DOMNodeLink);
      assert.deepEqual(config?.widgetParams, {node: NODE, options: {tooltip: SNIPPET}});
    });

    it('renders a source location link', () => {
      const viewTarget = document.createElement('div');

      Lighthouse.LighthouseReportRenderer.DEFAULT_VIEW(
          {type: 'source-location', url: SOURCE_URL, lineNumber: 10, columnNumber: 5}, undefined, viewTarget);

      const link = viewTarget.querySelector<HTMLElement>('.devtools-link');
      assert.exists(link);
      assert.strictEqual(link.title, SOURCE_URL);
      assert.match(link.textContent ?? '', /script\.js:11$/);
    });
  });

  describe('widget presenter', () => {
    it('passes the report to the view when report is set', async () => {
      const emptyCategory: LighthouseModel.ReporterTypes.CategoryJSON = {
        title: '',
        id: '',
        score: null,
        manualDescription: '',
        auditRefs: [],
      };
      const lhr: LighthouseModel.ReporterTypes.ReportJSON = {
        lighthouseVersion: '',
        userAgent: '',
        fetchTime: '2026-01-01T00:00:00.000Z',
        timing: {total: 0},
        finalDisplayedUrl: 'http://example.com',
        artifacts: {Trace: {traceEvents: []}},
        audits: {},
        categories: {
          performance: emptyCategory,
          accessibility: emptyCategory,
          'best-practices': emptyCategory,
          seo: emptyCategory,
          'agentic-browsing': emptyCategory,
        },
        categoryGroups: {},
      };

      const view = createViewFunctionStub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer);
      const widget = new Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      const initialInput = await view.nextInput;
      assert.strictEqual(initialInput.type, 'report');
      assert.isNull((initialInput as LighthouseModule.LighthouseReportRenderer.ReportViewInput).report);

      widget.report = lhr;
      const updatedInput = await view.nextInput;
      assert.strictEqual(updatedInput.type, 'report');
      assert.strictEqual((updatedInput as LighthouseModule.LighthouseReportRenderer.ReportViewInput).report, lhr);

      widget.detach();
    });
  });

  describe('renderLighthouseScores', () => {
    const baseReport = {
      finalDisplayedUrl: 'http://example.com',
      configSettings: {},
      audits: {},
      lighthouseVersion: '',
      userAgent: '',
      fetchTime: 0,
      environment: {benchmarkIndex: 0},
      i18n: {rendererFormattedStrings: {}},
    };

    it('renders lighthouse scores and strips out topbar', async () => {
      const lhr = {
        ...baseReport,
        categories: {
          performance: {auditRefs: [], id: 'performance', score: 0.8},
          accessibility: {auditRefs: [], id: 'accessibility', score: 0.9},
        },
      } as unknown as LighthouseModel.ReporterTypes.ReportJSON;

      const el = Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.renderLighthouseScores(lhr);
      assert.isNotNull(el);
      assert.isNotNull(el?.querySelector('.lh-scores-header'));
      assert.isNull(el?.querySelector('.lh-topbar'));
    });

    it('renders the category gauge for a single-category report', async () => {
      const lhr = {
        ...baseReport,
        categories: {
          accessibility: {auditRefs: [], id: 'accessibility', score: 0.9},
        },
      } as unknown as LighthouseModel.ReporterTypes.ReportJSON;

      const el = Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.renderLighthouseScores(lhr);
      assert.isNotNull(el);
      assert.lengthOf(el.querySelectorAll('.lh-gauge__wrapper'), 1);
      assert.isNull(el.querySelector('.lh-scores-header'));
      assert.isNull(el.querySelector('.lh-category'));
      assert.isNull(el.querySelector('.lh-topbar'));
    });

    it('renders the category fraction for a single-category snapshot report', async () => {
      const lhr = {
        ...baseReport,
        gatherMode: 'snapshot',
        categories: {
          accessibility: {auditRefs: [], id: 'accessibility', score: 0.9},
        },
      } as unknown as LighthouseModel.ReporterTypes.ReportJSON;

      const el = Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.renderLighthouseScores(lhr);
      assert.isNotNull(el);
      assert.lengthOf(el.querySelectorAll('.lh-fraction__wrapper'), 1);
      assert.isNull(el.querySelector('.lh-gauge__wrapper'));
    });

    it('returns null for a single-category performance report in navigation mode', async () => {
      const lhr = {
        ...baseReport,
        gatherMode: 'navigation',
        categories: {
          performance: {auditRefs: [], id: 'performance', score: 0.8},
        },
      } as unknown as LighthouseModel.ReporterTypes.ReportJSON;

      const el = Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.renderLighthouseScores(lhr);
      assert.isNull(el);
    });
  });
});
