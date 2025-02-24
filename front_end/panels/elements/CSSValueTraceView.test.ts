// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {getMatchedStylesWithBlankRule} from '../../testing/StyleHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

async function setUpStyles() {
  stubNoopSettings();
  setMockConnectionResponseHandler('CSS.enable', () => ({}));
  const computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
  const cssModel = new SDK.CSSModel.CSSModel(createTarget());
  await cssModel.resumeModel();
  const domModel = cssModel.domModel();
  const node = new SDK.DOMModel.DOMNode(domModel);
  node.id = 0 as Protocol.DOM.NodeId;
  UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  const matchedStyles = await getMatchedStylesWithBlankRule(cssModel);
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
  let renderPromise = Promise.withResolvers<Elements.CSSValueTraceView.ViewInput>();
  const view = new Elements.CSSValueTraceView.CSSValueTraceView(
      sinon.stub<Parameters<Elements.CSSValueTraceView.View>>().callsFake(input => {
        renderPromise.resolve(input);
      }));
  await renderPromise.promise;
  renderPromise = Promise.withResolvers<Elements.CSSValueTraceView.ViewInput>();
  view.showTrace(property, matchedStyles, new Map(), treeElement.getPropertyRenderers());
  return await renderPromise.promise;
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

      const substitutions = input.substitutions.map(nodes => nodes.map(node => node.textContent ?? '').join());
      const evaluations = input.evaluations.map(nodes => nodes.map(node => node.textContent ?? '').join());
      const result = input.finalResult?.map(node => node.textContent ?? '').join();
      assert.deepEqual(substitutions, []);
      assert.deepEqual(evaluations, []);
      assert.deepEqual(result, value);
    }
  });

  it('does not have substitutions yet', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} =
        await getTreeElement(matchedStyles, stylesPane, 'width', 'var(--w)', {'--w': {value: '40em'}});
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = input.substitutions.map(nodes => nodes.map(node => node.textContent ?? '').join());
    const evaluations = input.evaluations.map(nodes => nodes.map(node => node.textContent ?? '').join());
    const result = input.finalResult?.map(node => node.textContent ?? '').join();
    // TODO(pfaffe) once vars actually substitute this needs to show the first line
    assert.deepEqual(substitutions, ['var(--w)']);
    assert.deepEqual(evaluations, []);
    assert.deepEqual(result, 'var(--w)');
  });

  it('shows intermediate evaluation steps', async () => {
    const {matchedStyles, stylesPane} = await setUpStyles();
    const {property, treeElement} = await getTreeElement(
        matchedStyles, stylesPane, 'fond-size', 'calc(clamp(16px, calc(1vw + 1em), 24px) + 3.2px)');
    const resolveValuesSpy = sinon.spy(treeElement.parentPane().cssModel()!.resolveValues);
    const input = await showTrace(property, matchedStyles, treeElement);
    const substitutions = input.substitutions.map(nodes => nodes.map(node => node.textContent ?? '').join(''));
    const evaluations = input.evaluations.map(nodes => nodes.map(node => node.textContent ?? '').join(''));
    const result = input.finalResult?.map(node => node.textContent ?? '').join('');
    await Promise.all(resolveValuesSpy.returnValues);
    assert.deepEqual(substitutions, []);
    assert.deepEqual(evaluations, [
      'calc(clamp(16px, calc(9.8px + 16px), 24px) + 3.2px)',
      'calc(clamp(16px, 24.53px, 24px) + 3.2px)',
      'calc(24px + 3.2px)',
    ]);
    assert.deepEqual(result, '27.7px');
  });
});
