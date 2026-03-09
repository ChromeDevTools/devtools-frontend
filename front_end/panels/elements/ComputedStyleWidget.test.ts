// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createStubbedDomNodeWithModels} from '../../testing/StyleHelpers.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

async function waitForTraceElement(treeOutline: TreeOutline.TreeOutline.TreeOutline<unknown>): Promise<HTMLElement> {
  const element = treeOutline.shadowRoot?.querySelector('devtools-computed-style-trace');
  if (element) {
    return element;
  }

  return await new Promise<HTMLElement>(resolve => {
    requestAnimationFrame(async () => {
      const result = await waitForTraceElement(treeOutline);
      resolve(result);
    });
  });
}

function createWidgetWithMultipleProperties(
    properties: Map<string, string>,
    ): Elements.ComputedStyleWidget.ComputedStyleWidget {
  Common.Settings.Settings.instance().createSetting('group-computed-styles', false).set(false);

  const {node} = createStubbedDomNodeWithModels({nodeId: 1});

  const cssMatchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles, {
    node,
    propertyState: SDK.CSSMatchedStyles.PropertyState.ACTIVE,
    nodeStyles: [],
  });

  const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node);
  sinon.stub(computedStyleModel, 'fetchComputedStyle').callsFake(() => {
    return Promise.resolve({node, computedStyle: properties});
  });
  sinon.stub(computedStyleModel, 'cssModel').callsFake(() => {
    return sinon.createStubInstance(
        SDK.CSSModel.CSSModel, {cachedMatchedCascadeForNode: Promise.resolve(cssMatchedStyles)});
  });
  const widget = new Elements.ComputedStyleWidget.ComputedStyleWidget();
  widget.nodeStyle = {node, computedStyle: properties};
  widget.matchedStyles = cssMatchedStyles;
  renderElementIntoDOM(widget);
  return widget;
}

async function getDisplayedProperties(computedStyleWidget: Elements.ComputedStyleWidget.ComputedStyleWidget):
    Promise<string[]> {
  const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
      TreeOutline.TreeOutline.TreeOutline<unknown>;
  type TreeNodeData = {tag: 'property', propertyName: string}|{tag: 'category'};
  const matchedPropertyNames: string[] = [];
  for (const node of treeOutline.data.tree) {
    const data = node.treeNodeData as TreeNodeData;
    if (data.tag === 'property') {
      matchedPropertyNames.push(data.propertyName);
      continue;
    }
    if (data.tag === 'category' && node.children) {
      const children = await node.children();
      for (const child of children) {
        const childData = child.treeNodeData as TreeNodeData;
        if (childData.tag === 'property') {
          matchedPropertyNames.push(childData.propertyName);
        }
      }
    }
  }
  return matchedPropertyNames;
}

describeWithMockConnection('ComputedStyleWidget', () => {
  let computedStyleWidget: Elements.ComputedStyleWidget.ComputedStyleWidget;

  beforeEach(() => {
    stubNoopSettings();
  });

  afterEach(() => {
    computedStyleWidget.detach();
  });

  describe('trace element', () => {
    function createComputedStyleWidgetForTest(
        cssStyleDeclarationType: SDK.CSSStyleDeclaration.Type, cssStyleDeclarationName?: string,
        parentRule?: SDK.CSSRule.CSSRule): Elements.ComputedStyleWidget.ComputedStyleWidget {
      const {node} = createStubbedDomNodeWithModels({nodeId: 1});

      const stubCSSStyle = {
        styleSheetId: 'STYLE_SHEET_ID' as Protocol.DOM.StyleSheetId,
        cssProperties: [{
          name: 'color',
          value: 'red',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 1, startColumn: 4, endLine: 1, endColumn: 20},
          text: 'color: red;',
        }],
        shorthandEntries: [],
      } as Protocol.CSS.CSSStyle;

      const cssMatchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles, {
        node,
        propertyState: SDK.CSSMatchedStyles.PropertyState.ACTIVE,
        nodeStyles: [
          new SDK.CSSStyleDeclaration.CSSStyleDeclaration(
              {} as SDK.CSSModel.CSSModel, parentRule ?? null, stubCSSStyle, cssStyleDeclarationType,
              cssStyleDeclarationName),
        ]
      });

      const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node);
      sinon.stub(computedStyleModel, 'fetchComputedStyle').callsFake(() => {
        return Promise.resolve({node, computedStyle: new Map([['color', 'red']])});
      });
      sinon.stub(computedStyleModel, 'cssModel').callsFake(() => {
        return sinon.createStubInstance(
            SDK.CSSModel.CSSModel, {cachedMatchedCascadeForNode: Promise.resolve(cssMatchedStyles)});
      });
      const computedStyleWidget = new Elements.ComputedStyleWidget.ComputedStyleWidget();
      renderElementIntoDOM(computedStyleWidget);

      computedStyleWidget.nodeStyle = {node, computedStyle: new Map([['color', 'red']])};
      computedStyleWidget.matchedStyles = cssMatchedStyles;
      computedStyleWidget.propertyTraces = computedStyleModel.computePropertyTraces(cssMatchedStyles);

      return computedStyleWidget;
    }

    it('renders colors correctly', async () => {
      computedStyleWidget =
          createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Animation, '--animation-name');

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(2);

      const traceElement = await waitForTraceElement(treeOutline);
      assert.strictEqual(traceElement?.innerText, 'red');
    });

    it('renders trace element with correct selector for declarations coming from animations', async () => {
      computedStyleWidget =
          createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Animation, '--animation-name');

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(2);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, '--animation-name animation');
    });

    it('renders trace element with correct selector for declarations coming from WAAPI animations', async () => {
      computedStyleWidget = createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Animation);

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(2);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, 'animation style');
    });

    it('renders trace element with correct selector for declarations transitions', async () => {
      computedStyleWidget = createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Transition);

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(2);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, 'transitions style');
    });

    it('renders trace element with correct selector for declarations coming from CSS rules', async () => {
      computedStyleWidget = createComputedStyleWidgetForTest(
          SDK.CSSStyleDeclaration.Type.Regular, undefined,
          SDK.CSSRule.CSSStyleRule.createDummyRule({} as SDK.CSSModel.CSSModel, '.container'));

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(5);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, '.container');
    });

    it('renders trace element with correct selector for declarations coming from inline styles', async () => {
      computedStyleWidget = createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Inline);

      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(5);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, 'element.style');
    });
  });

  describe('filtering', () => {
    it('can take a filter that is passed as a string', async () => {
      const properties = new Map([
        ['display', 'block'],
        ['height', '100px'],
        ['width', '200px'],
      ]);
      computedStyleWidget = createWidgetWithMultipleProperties(properties);
      computedStyleWidget.requestUpdate();
      computedStyleWidget.filterText = 'display|height';
      await computedStyleWidget.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;
      const matchedPropertyNames = await getDisplayedProperties(computedStyleWidget);
      // We filtered for the exact string `display|height`, not the regex
      assert.lengthOf(matchedPropertyNames, 0);
      assert.isFalse(computedStyleWidget.filterIsRegex);
    });

    it('can take a filter that is passed as a regexp', async () => {
      const properties = new Map([
        ['display', 'block'],
        ['height', '100px'],
        ['width', '200px'],
      ]);
      computedStyleWidget = createWidgetWithMultipleProperties(properties);
      computedStyleWidget.requestUpdate();
      computedStyleWidget.filterText = new RegExp('display|height');
      await computedStyleWidget.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;
      const matchedPropertyNames = await getDisplayedProperties(computedStyleWidget);
      assert.sameMembers(matchedPropertyNames, ['display', 'height']);
      assert.isTrue(computedStyleWidget.filterIsRegex);
    });

    it('renders a regex toggle button that is off by default', async () => {
      const properties = new Map([
        ['display', 'block'],
        ['height', '100px'],
      ]);
      computedStyleWidget = createWidgetWithMultipleProperties(properties);
      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;

      const regexButton = computedStyleWidget.contentElement.querySelector('devtools-button');
      assert.exists(regexButton);
    });

    it('filters with plain text by default (pipe is literal, not OR)', async () => {
      const properties = new Map([
        ['display', 'block'],
        ['height', '100px'],
        ['width', '200px'],
      ]);
      computedStyleWidget = createWidgetWithMultipleProperties(properties);
      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      // In plain text mode, "display|height" is escaped and treated as a literal string.
      // No property name contains the literal character "|", so nothing matches.
      await computedStyleWidget.filterComputedStyles(new RegExp('display\\|height', 'i'));
      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      assert.lengthOf(treeOutline.data.tree, 0);
    });

    it('filters with regex OR when given a real regex', async () => {
      const properties = new Map([
        ['display', 'block'],
        ['height', '100px'],
        ['width', '200px'],
      ]);
      computedStyleWidget = createWidgetWithMultipleProperties(properties);
      computedStyleWidget.requestUpdate();
      await computedStyleWidget.updateComplete;

      // When regex mode is on, "display|width" is a real regex OR.
      await computedStyleWidget.filterComputedStyles(new RegExp('display|width', 'i'));
      const matchedPropertyNames = await getDisplayedProperties(computedStyleWidget);
      assert.sameMembers(matchedPropertyNames, ['display', 'width']);
    });
  });
});
