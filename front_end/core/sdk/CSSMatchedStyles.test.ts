// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

function ruleMatch(
    selector: string, cssProperties: Protocol.CSS.CSSProperty[], range?: Protocol.CSS.SourceRange,
    styleSheetId = '0' as Protocol.CSS.StyleSheetId): Protocol.CSS.RuleMatch {
  return {
    rule: {
      selectorList: {selectors: [{text: selector}], text: selector},
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      style: {
        cssProperties,
        styleSheetId,
        range,
        shorthandEntries: [],
      },
    },
    matchingSelectors: [0],
  };
}

function createMatchedStyles(payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>) {
  const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
  node.id = 1 as Protocol.DOM.NodeId;
  return SDK.CSSMatchedStyles.CSSMatchedStyles.create({
    cssModel: sinon.createStubInstance(SDK.CSSModel.CSSModel),
    node,
    inlinePayload: null,
    attributesPayload: null,
    matchedPayload: [],
    pseudoPayload: [],
    inheritedPayload: [],
    inheritedPseudoPayload: [],
    animationsPayload: [],
    parentLayoutNodeId: undefined,
    positionTryRules: [],
    propertyRules: [],
    cssPropertyRegistrations: [],
    fontPaletteValuesRule: undefined,
    ...payload,
  });
}

describe('CSSMatchedStyles', () => {
  describe('computeCSSVariable', () => {
    const testCssValueEquals = async (text: string, expectedValue: unknown) => {
      const matchedStyles = await createMatchedStyles({
        matchedPayload: [
          ruleMatch(
              'div',
              [
                {name: '--foo', value: 'active-foo'},
                {name: '--baz', value: 'active-baz !important', important: true},
                {name: '--baz', value: 'passive-baz'},
                {name: '--dark', value: 'darkgrey'},
                {name: '--light', value: 'lightgrey'},
                {name: '--theme', value: 'var(--dark)'},
                {name: '--shadow', value: '1px var(--theme)'},
                {name: '--width', value: '1px'},
                {name: '--a', value: 'a'},
                {name: '--b', value: 'var(--a)'},
                {name: '--valid-fallback', value: 'var(--non-existent, fallback-value)'},
                {name: '--var-reference-in-fallback', value: 'var(--non-existent, var(--foo))'},
                {name: '--itself', value: 'var(--itself)'},
                {name: '--itself-complex', value: '10px var(--itself-complex)'},
                {name: '--cycle-1', value: 'var(--cycle-2)'},
                {name: '--cycle-2', value: 'var(--cycle-1)'},
                {name: '--cycle-a', value: 'var(--cycle-b, 50px)'},
                {name: '--cycle-b', value: 'var(--cycle-a)'},
                {name: '--cycle-in-fallback', value: 'var(--non-existent, var(--cycle-a))'},
                {name: '--non-existent-fallback', value: 'var(--non-existent, var(--another-non-existent))'},
                {name: '--out-of-cycle', value: 'var(--cycle-2, 20px)'},
                {name: '--non-inherited', value: 'var(--inherited)'},
                {name: '--also-inherited-overloaded', value: 'this is overloaded here'},
              ]),
          ruleMatch(
              'html',
              [
                {name: '--inherited', value: 'var(--also-inherited-overloaded)'},
                {name: '--also-inherited-overloaded', value: 'inherited and overloaded'},
              ]),
        ],
      });

      const actualValue = matchedStyles.computeCSSVariable(matchedStyles.nodeStyles()[0], text)?.value ?? null;
      assert.strictEqual(actualValue, expectedValue);
    };

    it('should correctly compute the value of an expression that uses a variable', async () => {
      await testCssValueEquals('--foo', 'active-foo');
      await testCssValueEquals('--baz', 'active-baz !important');
      await testCssValueEquals('--does-not-exist', null);
      await testCssValueEquals('--dark', 'darkgrey');
      await testCssValueEquals('--light', 'lightgrey');
      await testCssValueEquals('--theme', 'darkgrey');
      await testCssValueEquals('--shadow', '1px darkgrey');
      await testCssValueEquals('--width', '1px');
    });

    it('correctly resolves the declaration', async () => {
      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.id = 1 as Protocol.DOM.NodeId;
      node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.parentNode.id = 2 as Protocol.DOM.NodeId;
      node.parentNode.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.parentNode.parentNode.id = 3 as Protocol.DOM.NodeId;
      node.parentNode.parentNode.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.parentNode.parentNode.parentNode.id = 4 as Protocol.DOM.NodeId;

      const matchedStyles = await createMatchedStyles({
        node,
        matchedPayload: [ruleMatch('div', [{name: '--foo', value: 'foo1'}])],  // styleFoo1
        inheritedPayload: [
          {
            matchedCSSRules: [ruleMatch('div', [{name: '--bar', value: 'bar'}, {name: '--foo', value: 'foo2'}])],
          },                                                                        // styleFoo2
          {matchedCSSRules: [ruleMatch('div', [{name: '--baz', value: 'baz'}])]},   // styleBaz
          {matchedCSSRules: [ruleMatch('div', [{name: '--foo', value: 'foo3'}])]},  // styleFoo3
        ],
        propertyRules: [{
          origin: Protocol.CSS.StyleSheetOrigin.Regular,
          style: {
            cssProperties: [
              {name: 'syntax', value: '*'},
              {name: 'inherits', value: 'true'},
              {name: 'initial-value', value: 'bar0'},
            ],
            shorthandEntries: [],
          },
          propertyName: {text: '--bar'},
        }],
      });

      // Compute the variable value as it is visible to `startingCascade` and compare with the expectation
      const testComputedVariableValueEquals =
          (name: string, startingCascade: SDK.CSSStyleDeclaration.CSSStyleDeclaration, expectedValue: string,
           expectedDeclaration: SDK.CSSProperty.CSSProperty|SDK.CSSMatchedStyles.CSSRegisteredProperty) => {
            const {value, declaration} = matchedStyles.computeCSSVariable(startingCascade, name)!;
            assert.strictEqual(value, expectedValue);
            assert.strictEqual(declaration, expectedDeclaration);
          };

      const styles = matchedStyles.nodeStyles();
      const styleFoo1 = styles.find(style => style.allProperties().find(p => p.value === 'foo1'));
      const styleFoo2 = styles.find(style => style.allProperties().find(p => p.value === 'foo2'));
      const styleFoo3 = styles.find(style => style.allProperties().find(p => p.value === 'foo3'));
      const styleBaz = styles.find(style => style.allProperties().find(p => p.value === 'baz'));
      assert.exists(styleFoo1);
      assert.exists(styleFoo2);
      assert.exists(styleFoo3);
      assert.exists(styleBaz);

      testComputedVariableValueEquals('--foo', styleFoo1, 'foo1', styleFoo1.leadingProperties()[0]);
      testComputedVariableValueEquals('--bar', styleFoo1, 'bar', styleFoo2.leadingProperties()[0]);
      testComputedVariableValueEquals('--foo', styleFoo2, 'foo2', styleFoo2.leadingProperties()[1]);
      testComputedVariableValueEquals('--bar', styleFoo3, 'bar0', matchedStyles.registeredProperties()[0]);
      testComputedVariableValueEquals('--foo', styleBaz, 'foo3', styleFoo3.leadingProperties()[0]);
    });

    describe('cyclic references', () => {
      it('should return `null` when the variable references itself', async () => {
        await testCssValueEquals('--itself', null);
        await testCssValueEquals('--itself-complex', null);
      });

      it('should return `null` when there is a simple cycle (1->2->1)', async () => {
        await testCssValueEquals('--cycle-1', null);
      });

      it('should return `null` if the var reference is inside the cycle', async () => {
        await testCssValueEquals('--cycle-a', null);
      });

      it('should return fallback value if the expression is not inside the cycle', async () => {
        await testCssValueEquals('--out-of-cycle', '20px');
      });
    });

    describe('var references inside fallback', () => {
      it('should resolve a `var()` reference inside fallback value too', async () => {
        await testCssValueEquals('--var-reference-in-fallback', 'active-foo');
      });

      it('should return null when the fallback value contains a cyclic reference', async () => {
        await testCssValueEquals('--cycle-in-fallback', null);
      });

      it('should return null when the fallback value is non existent too', async () => {
        await testCssValueEquals('--non-existent-fallback', null);
      });
    });

    it('should resolve a `var()` reference with nothing else', async () => {
      await testCssValueEquals('--a', 'a');
    });

    it('should resolve a `var()` reference until no `var()` references left', async () => {
      await testCssValueEquals('--b', 'a');
    });

    it('should resolve to fallback if the referenced variable does not exist', async () => {
      await testCssValueEquals('--valid-fallback', 'fallback-value');
    });

    it('should correctly resolve the `var()` reference for complex inheritance case', async () => {
      await testCssValueEquals('--non-inherited', 'inherited and overloaded');
    });

    it('correcty handles cycles', async () => {
      async function compute(name: string, styleRules: string[], inheritedRules: string[][]) {
        const ruleToRuleMatch = (rule: string, index: number) => ruleMatch(
            `.${index}`,
            rule.split(';')
                .filter(decl => decl.trim())
                .map(decl => decl.split(':'))
                .map(decl => ({name: decl[0].trim(), value: decl.slice(1).join(':').trim()})));
        const matchedPayload = styleRules.map(ruleToRuleMatch);
        const inheritedPayload = inheritedRules.map(
            ruleTexts => ({matchedCSSRules: ruleTexts.map((rule, i) => ruleToRuleMatch(rule, i + styleRules.length))}));

        const matchedStyles = await createMatchedStyles({matchedPayload, inheritedPayload});
        return matchedStyles.computeCSSVariable(matchedStyles.nodeStyles()[0], name)?.value ?? null;
      }

      const simpleCycle = `
        --a: var(--b);
        --b: var(--a);
        `;
      assert.strictEqual(await compute('--a', [simpleCycle], []), null);
      assert.strictEqual(await compute('--b', [simpleCycle], []), null);

      const cycleOnUnusedFallback = `
        --a: 2;
        --b: var(--a, var(--c));
        --c: var(--b);
        `;
      assert.strictEqual(await compute('--a', [cycleOnUnusedFallback], []), '2');
      assert.strictEqual(await compute('--b', [cycleOnUnusedFallback], []), '2');
      assert.strictEqual(await compute('--c', [cycleOnUnusedFallback], []), '2');

      const simpleCycleWithFallbacks = `
        --a: var(--b, 1);
        --b: var(--a, 2);
        `;
      assert.strictEqual(await compute('--a', [simpleCycleWithFallbacks], []), null);
      assert.strictEqual(await compute('--b', [simpleCycleWithFallbacks], []), null);

      const longerCycle = `
        --a: var(--b);
        --b: var(--c);
        --c: var(--a);
        `;
      assert.strictEqual(await compute('--a', [longerCycle], []), null);
      assert.strictEqual(await compute('--b', [longerCycle], []), null);
      assert.strictEqual(await compute('--c', [longerCycle], []), null);

      const longerCycleWithFallbacks = `
        --a: var(--b, 2);
        --b: var(--c, 3);
        --c: var(--a, 4);
        `;
      assert.strictEqual(await compute('--a', [longerCycleWithFallbacks], []), null);
      assert.strictEqual(await compute('--b', [longerCycleWithFallbacks], []), null);
      assert.strictEqual(await compute('--c', [longerCycleWithFallbacks], []), null);

      const pointingIntoCycle = `
        ${longerCycle}
        --d: var(--a);
        --e: var(--b);
        `;
      assert.strictEqual(await compute('--a', [pointingIntoCycle], []), null);
      assert.strictEqual(await compute('--b', [pointingIntoCycle], []), null);
      assert.strictEqual(await compute('--c', [pointingIntoCycle], []), null);
      assert.strictEqual(await compute('--d', [pointingIntoCycle], []), null);
      assert.strictEqual(await compute('--e', [pointingIntoCycle], []), null);

      const pointingIntoCycleWithFallback = `
        ${longerCycle}
        --d: var(--a, 4);
        --e: var(--b, 5);
        `;
      assert.strictEqual(await compute('--a', [pointingIntoCycleWithFallback], []), null);
      assert.strictEqual(await compute('--b', [pointingIntoCycleWithFallback], []), null);
      assert.strictEqual(await compute('--c', [pointingIntoCycleWithFallback], []), null);
      assert.strictEqual(await compute('--d', [pointingIntoCycleWithFallback], []), '4');
      assert.strictEqual(await compute('--e', [pointingIntoCycleWithFallback], []), '5');

      const multipleEdges = `
        --a: var(--b);
        --b: var(--c) var(--d);
        --c: var(--a) var(--b);
        --d: var(--c);
        `;
      assert.strictEqual(await compute('--a', [multipleEdges], []), null);
      assert.strictEqual(await compute('--b', [multipleEdges], []), null);
      assert.strictEqual(await compute('--c', [multipleEdges], []), null);
      assert.strictEqual(await compute('--d', [multipleEdges], []), null);

      const pointingIntoMultipleEdgeCycle = `
        ${multipleEdges}
        --e: var(--c) var(--d);
        `;
      assert.strictEqual(await compute('--a', [pointingIntoMultipleEdgeCycle], []), null);
      assert.strictEqual(await compute('--b', [pointingIntoMultipleEdgeCycle], []), null);
      assert.strictEqual(await compute('--c', [pointingIntoMultipleEdgeCycle], []), null);
      assert.strictEqual(await compute('--d', [pointingIntoMultipleEdgeCycle], []), null);
      assert.strictEqual(await compute('--e', [pointingIntoMultipleEdgeCycle], []), null);

      const pointingIntoMultipleEdgeCycleWithFallback = `
        ${multipleEdges}
        --e: var(--c, 4) var(--d, 5);
        `;
      assert.strictEqual(await compute('--a', [pointingIntoMultipleEdgeCycleWithFallback], []), null);
      assert.strictEqual(await compute('--b', [pointingIntoMultipleEdgeCycleWithFallback], []), null);
      assert.strictEqual(await compute('--c', [pointingIntoMultipleEdgeCycleWithFallback], []), null);
      assert.strictEqual(await compute('--d', [pointingIntoMultipleEdgeCycleWithFallback], []), null);
      assert.strictEqual(await compute('--e', [pointingIntoMultipleEdgeCycleWithFallback], []), '4 5');

      const multipleCyclesWithFallback = `
        ${longerCycle}
        --d: var(--e);
        --e: var(--f);
        --f: var(--d);
        --g: var(--a, var(--d, 5));
        `;
      assert.strictEqual(await compute('--a', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--b', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--c', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--d', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--e', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--f', [multipleCyclesWithFallback], []), null);
      assert.strictEqual(await compute('--g', [multipleCyclesWithFallback], []), '5');

      const notACycle = `
        --a: var(--b, 1);
        `;
      const inherited = `
        --a: var(--b);
        --b: var(--a);
        `;
      assert.strictEqual(await compute('--a', [notACycle], [[inherited]]), '1');
      assert.strictEqual(await compute('--b', [notACycle], [[inherited]]), null);
    });
  });

  it('does not hide inherited rules that also apply directly to the node if it contains custom properties',
     async () => {
       const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
       parentNode.id = 0 as Protocol.DOM.NodeId;
       const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
       node.parentNode = parentNode;
       node.id = 1 as Protocol.DOM.NodeId;
       const startColumn = 0, endColumn = 1;
       const matchedPayload = [
         ruleMatch('body', [{name: '--var', value: 'blue'}], {startLine: 0, startColumn, endLine: 0, endColumn}),
         ruleMatch('*', [{name: 'color', value: 'var(--var)'}], {startLine: 1, startColumn, endLine: 1, endColumn}),
         ruleMatch('*', [{name: '--var', value: 'red'}], {startLine: 2, startColumn, endLine: 2, endColumn}),
       ];
       const inheritedPayload = [{matchedCSSRules: matchedPayload.slice(1)}];
       const matchedStyles = await createMatchedStyles({
         node,
         matchedPayload,
         inheritedPayload,
       });

       assert.deepStrictEqual(
           matchedStyles.nodeStyles().map(style => style.allProperties().map(prop => prop.propertyText)), [
             ['--var: red;'],
             ['color: var(--var);'],
             ['--var: blue;'],
             ['--var: red;'],
           ]);
     });
});

describeWithMockConnection('NodeCascade', () => {
  it('correctly marks custom properties as Overloaded if they are registered as inherits: false', async () => {
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    parentNode.id = 0 as Protocol.DOM.NodeId;
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.parentNode = parentNode;
    node.id = 1 as Protocol.DOM.NodeId;
    const inheritablePropertyPayload: Protocol.CSS.CSSProperty = {name: '--inheritable', value: 'green'};
    const nonInheritablePropertyPayload: Protocol.CSS.CSSProperty = {name: '--non-inheritable', value: 'green'};
    const matchedCSSRules: Protocol.CSS.RuleMatch[] = [{
      matchingSelectors: [0],
      rule: {
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        style: {
          cssProperties: [inheritablePropertyPayload, nonInheritablePropertyPayload],
          shorthandEntries: [],
        },
      },
    }];
    const cssPropertyRegistrations = [
      {
        propertyName: inheritablePropertyPayload.name,
        initialValue: {text: 'blue'},
        inherits: true,
        syntax: '<color>',
      },
      {
        propertyName: nonInheritablePropertyPayload.name,
        initialValue: {text: 'red'},
        inherits: false,
        syntax: '<color>',
      },
    ];
    const matchedStyles = await createMatchedStyles({
      cssModel,
      node,
      matchedPayload: [
        ruleMatch('div', []),
      ],
      inheritedPayload: [{matchedCSSRules}],
      cssPropertyRegistrations,
    });

    const style = matchedStyles.nodeStyles()[1];
    const [inheritableProperty, nonInheritableProperty] = style.allProperties();

    assert.strictEqual(
        matchedStyles.propertyState(nonInheritableProperty), SDK.CSSMatchedStyles.PropertyState.Overloaded);
    assert.strictEqual(matchedStyles.propertyState(inheritableProperty), SDK.CSSMatchedStyles.PropertyState.Active);
  });

  it('correctly computes active properties for nested at-rules', async () => {
    const outerRule = ruleMatch('a', [{name: 'color', value: 'var(--inner)'}]);
    const nestedRule = ruleMatch('&', [{name: '--inner', value: 'red'}]);
    nestedRule.rule.nestingSelectors = ['a'];
    nestedRule.rule.selectorList = {selectors: [], text: '&'};
    nestedRule.rule.supports = [{
      'text': '(--var:s)',
      'active': true,
      styleSheetId: nestedRule.rule.styleSheetId,
    }];
    const matchedStyles = await createMatchedStyles({
      matchedPayload: [outerRule, nestedRule],
    });

    assert.deepEqual(matchedStyles.availableCSSVariables(matchedStyles.nodeStyles()[0]), ['--inner']);
  });
});
