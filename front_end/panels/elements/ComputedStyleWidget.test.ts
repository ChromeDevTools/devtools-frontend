// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';

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

describeWithMockConnection('ComputedStyleWidget', () => {
  let computedStyleWidget: Elements.ComputedStyleWidget.ComputedStyleWidget;
  afterEach(() => {
    computedStyleWidget.detach();
  });

  describe('trace element', () => {
    function createComputedStyleWidgetForTest(
        cssStyleDeclarationType: SDK.CSSStyleDeclaration.Type, cssStyleDeclarationName?: string,
        parentRule?: SDK.CSSRule.CSSRule): Elements.ComputedStyleWidget.ComputedStyleWidget {
      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.id = 1 as Protocol.DOM.NodeId;

      const stubCSSStyle = {
        styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
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

      const computedStyleModel = sinon.createStubInstance(Elements.ComputedStyleModel.ComputedStyleModel, {
        fetchComputedStyle: Promise.resolve({node, computedStyle: new Map([['color', 'red']])}),
        cssModel: sinon.createStubInstance(
            SDK.CSSModel.CSSModel, {cachedMatchedCascadeForNode: Promise.resolve(cssMatchedStyles)}),
        node,
      });
      const computedStyleWidget = new Elements.ComputedStyleWidget.ComputedStyleWidget(computedStyleModel);
      renderElementIntoDOM(computedStyleWidget);

      return computedStyleWidget;
    }

    it('renders trace element with correct selector for declarations coming from animations', async () => {
      computedStyleWidget =
          createComputedStyleWidgetForTest(SDK.CSSStyleDeclaration.Type.Animation, '--animation-name');

      computedStyleWidget.update();
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

      computedStyleWidget.update();
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

      computedStyleWidget.update();
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

      computedStyleWidget.update();
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

      computedStyleWidget.update();
      await computedStyleWidget.updateComplete;

      const treeOutline = computedStyleWidget.contentElement.querySelector('devtools-tree-outline') as
          TreeOutline.TreeOutline.TreeOutline<unknown>;
      await treeOutline.expandRecursively(5);

      const traceElement = await waitForTraceElement(treeOutline);
      const traceSelector = traceElement.shadowRoot?.querySelector('.trace-selector');
      assert.strictEqual(traceSelector?.textContent, 'element.style');
    });
  });
});
