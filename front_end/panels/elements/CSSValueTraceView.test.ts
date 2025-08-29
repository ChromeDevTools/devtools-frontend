// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {getMatchedStylesWithBlankRule} from '../../testing/StyleHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

async function setUpStyles() {
  stubNoopSettings();
  setMockConnectionResponseHandler('CSS.enable', () => ({}));
  setMockConnectionResponseHandler('CSS.getEnvironmentVariables', () => ({}));
  const computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
  const cssModel = new SDK.CSSModel.CSSModel(createTarget());
  await cssModel.resumeModel();
  const domModel = cssModel.domModel();
  const node = new SDK.DOMModel.DOMNode(domModel);
  node.id = 0 as Protocol.DOM.NodeId;
  UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  const matchedStyles = await getMatchedStylesWithBlankRule({cssModel});
  const stylesPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);

  return {matchedStyles, stylesPane};
}

async function getTreeElement(
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, stylesPane: Elements.StylesSidebarPane.StylesSidebarPane,
    name: string, value: string, variables?: Record<string, {value: string, computedValue?: string}>) {
  const property = new SDK.CSSProperty.CSSProperty(
      matchedStyles.nodeStyles()[0], matchedStyles.nodeStyles()[0].pastLastSourcePropertyIndex(), name, value, true,
      false, true, false, '', undefined, []);
  const treeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
    stylesPane,
    section: sinon.createStubInstance(Elements.StylePropertiesSection.StylePropertiesSection),
    matchedStyles,
    property,
    isShorthand: false,
    inherited: false,
    overloaded: false,
    newProperty: true,
  });

  if (variables) {
    const varMap =
        new Map(Object.getOwnPropertyNames(variables)
                    .map(
                        name => new SDK.CSSProperty.CSSProperty(
                            matchedStyles.nodeStyles()[0], matchedStyles.nodeStyles()[0].pastLastSourcePropertyIndex(),
                            name, variables[name].value, true, false, true, false, '', undefined, []))
                    .map(property => [property.name, {
                           value: variables[property.name].computedValue ?? variables[property.name].value,
                           declaration: new SDK.CSSMatchedStyles.CSSValueSource(property),
                         }]));
    sinon.stub(matchedStyles, 'computeCSSVariable').callsFake((_, name) => varMap.get(name) ?? null);
  }

  return {matchedStyles, property, treeElement};
}

async function showTrace(
    property: SDK.CSSProperty.CSSProperty, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
    treeElement: Elements.StylePropertyTreeElement.StylePropertyTreeElement):
    Promise<Elements.CSSValueTraceView.ViewInput> {
  const viewFunction = createViewFunctionStub(Elements.CSSValueTraceView.CSSValueTraceView);
  const view = new Elements.CSSValueTraceView.CSSValueTraceView(undefined, viewFunction);
  await viewFunction.nextInput;
  void view.showTrace(
      property, null, matchedStyles, new Map(),
      Elements.StylePropertyTreeElement.getPropertyRenderers(
          property.name, property.ownerStyle, treeElement.parentPane(), matchedStyles, treeElement,
          treeElement.getComputedStyles() ?? new Map()),
      false, 0, false);
  return await viewFunction.nextInput;
}

function getLineText(line: Node[][]) {
  for (const node of line.flat()) {
    if (node instanceof HTMLElement) {
      renderElementIntoDOM(node, {allowMultipleChildren: true});
    }
  }
  const text = line.map(
      nodes => nodes
                   .map(
                       node =>
                           (node instanceof HTMLElement ? node.innerText :
                                                          (node.nodeType === Node.TEXT_NODE ? node.textContent : '')))
                   .join());
  for (const node of line.flat()) {
    if (node instanceof HTMLElement) {
      node.remove();
    }
  }
  return text;
}

describeWithMockConnection('CSSValueTraceView', () => {
  beforeEach(() => {
    setMockConnectionResponseHandler('CSS.resolveValues', ({values}) => {
      const results = values.map((v: string) => {
        if (v.endsWith('em')) {
          return `${Number(v.substring(0, v.length - 2)) * 16}px`;
        }
        if (v.endsWith('vw')) {
          return `${Number(v.substring(0, v.length - 2)) * 980 / 100}px`;
        }
        switch (v) {
          case 'calc(clamp(16px, calc(1vw + 1em), 24px) + 3.2px)':
            return '27.7px';
          case 'clamp(16px, calc(1vw + 1em), 24px)':
            return '24px';
          case 'calc(1vw + 1em)':
            return '24.53px';
          case 'calc(1px + 1px)':
            return '2px';
        }
        return v;
      });
      return {results};
    });
  });

  it('shows simple values', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    for (const value of ['40', '40px', 'red']) {
      const {property, treeElement} = await getTreeElement(matchedStyles, stylesPane, 'property', value);

      const input = await showTrace(property, matchedStyles, treeElement);

      const substitutions = getLineText(input.substitutions);
      const evaluations = getLineText(input.evaluations);
      assert.deepEqual(substitutions, []);
      assert.deepEqual(evaluations, [value]);
    }
  });

  it('applies substitutions', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} =
        await getTreeElement(matchedStyles, stylesPane, 'width', 'var(--w)', {'--w': {value: '40px'}});
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    assert.deepEqual(substitutions, ['40px']);
    assert.deepEqual(evaluations, []);
  });

  it('substitutes the variable declaration if the variable is found (with fallback)', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} =
        await getTreeElement(matchedStyles, stylesPane, 'width', 'var(--w, 10px)', {'--w': {value: '40px'}});
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    assert.deepEqual(substitutions, ['40px']);
    assert.deepEqual(evaluations, []);
  });

  it('substitutes the fallback if the variable is found', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} = await getTreeElement(matchedStyles, stylesPane, 'width', 'var(--w, 10px)');
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    assert.deepEqual(substitutions, ['10px']);
    assert.deepEqual(evaluations, []);
  });

  it('shows chains of substitutions', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} = await getTreeElement(
        matchedStyles, stylesPane, 'width', 'var(--v)', {'--w': {value: '40px'}, '--v': {value: 'var(--w)'}});
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    assert.deepEqual(substitutions, ['var(--w)', '40px']);
    assert.deepEqual(evaluations, []);
  });

  it('shows intermediate evaluation steps', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} = await getTreeElement(
        matchedStyles, stylesPane, 'font-size', 'calc(clamp(16px, calc(1vw + 1em), 24px) + 3.2px)');
    const resolveValuesSpy = sinon.spy(treeElement.parentPane().cssModel()!.resolveValues);
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    await Promise.all(resolveValuesSpy.returnValues);
    assert.deepEqual(substitutions, []);
    assert.deepEqual(evaluations, [
      'calc(clamp(16px, calc(9.8px + 16px), 24px) + 3.2px)',
      'calc(clamp(16px, 24.53px, 24px) + 3.2px)',
      'calc(24px + 3.2px)',
      '27.7px',
    ]);
  });

  it('hides trace lines that contained no successful evaluations', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} =
        await getTreeElement(matchedStyles, stylesPane, '--a', 'calc(100% - calc(50% + calc(1px + 1px)))');
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = getLineText(input.substitutions);
    const evaluations = getLineText(input.evaluations);
    assert.deepEqual(substitutions, []);
    assert.deepEqual(evaluations, ['calc(100% - calc(50% + 2px))']);
  });
});
