// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describe('CSSMatchedStyles', () => {
  describe('parseCSSVariableNameAndFallback', () => {
    const {parseCSSVariableNameAndFallback} = SDK.CSSMatchedStyles;

    it('correctly parses simple CSS variables without fallback', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo)'), {variableName: '--foo', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo-bar)'), {variableName: '--foo-bar', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(\n--foo-bar\n)'), {variableName: '--foo-bar', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(  --space  )'), {variableName: '--space', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--123)'), {variableName: '--123', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--123Abc)'), {variableName: '--123Abc', fallback: ''});
    });

    it('need to correctly parse escaped characters', () => {
      // `var(--\)` is an invalid CSS value and must have at least 1 character.
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\ )'), {variableName: '--\\', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,)'), {variableName: '--\\,', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,)'), {variableName: '--\\,', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,,)'), {variableName: '--\\,', fallback: ','});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,blue)'), {variableName: '--\\,blue', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,green)'), {variableName: '--\\,', fallback: 'green'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,  ,red)'), {variableName: '--\\,', fallback: 'red'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--fo\\ o)'), {variableName: '--fo\\ o', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--fo\\ o,)'), {variableName: '--fo\\ o', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--\\ bar\\ , blue)'), {variableName: '--\\ bar\\', fallback: 'blue'});

      // test \)
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\) )'), {variableName: '--ba\\ z\\)', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\), )'), {variableName: '--ba\\ z\\)', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\),  90%  )'),
          {variableName: '--ba\\ z\\)', fallback: '90%  '});
    });

    it('correctly parses simple CSS variables with fallback', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo,1px)'), {variableName: '--foo', fallback: '1px'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--x-y,2%)'), {variableName: '--x-y', fallback: '2%'});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--x-y , 100%  )'), {variableName: '--x-y', fallback: '100%  '});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--A123, 666 )'), {variableName: '--A123', fallback: '666 '});
    });

    it('property rejects non-custom variables', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo,1px)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-foo,1px)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-\ bar)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-\\- bar)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-90bar)'), {variableName: null, fallback: null});
    });

    it('correctly parses variables with special characters', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--🤖)'), {variableName: '--🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo-🤖)'), {variableName: '--foo-🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--🤖, 1px)'), {variableName: '--🤖', fallback: '1px'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--永,   国)'), {variableName: '--永', fallback: '国'});
    });

    it('correctly parses variables with escaped characters in name', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--_\x30-pink)'), {variableName: '--_0-pink', fallback: ''});

      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--_-color-blue)'), {variableName: '--_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(-\-_-color-blue)'), {variableName: '-\-_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(\--_-color-blue)'), {variableName: '\--_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(---three_hyphens)'), {variableName: '---three_hyphens', fallback: ''});
    });
  });

  describe('computeCSSVariable', () => {
    const testCssValueEquals = async (text: string, value: unknown) => {
      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.id = 1 as Protocol.DOM.NodeId;

      const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
        cssModel: sinon.createStubInstance(SDK.CSSModel.CSSModel),
        node,
        inlinePayload: null,
        attributesPayload: null,
        matchedPayload: [{
          rule: {
            selectorList: {selectors: [{text: 'div'}], text: 'div'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [
                {name: '--foo', value: 'active-foo'},
                {name: '--baz', value: 'active-baz !important', important: true},
                {name: '--baz', value: 'passive-baz'},
                {name: '--dark', value: 'darkgrey'},
                {name: '--light', value: 'lightgrey'},
                {name: '--theme', value: 'var(--dark)'},
                {name: '--shadow', value: '1px var(--theme)'},
                {name: '--width', value: '1px'},
              ],
              shorthandEntries: [],
            },
          },
          matchingSelectors: [0],
        }],
        pseudoPayload: [],
        inheritedPayload: [],
        inheritedPseudoPayload: [],
        animationsPayload: [],
        parentLayoutNodeId: undefined,
        positionFallbackRules: [],
        propertyRules: [],
        cssPropertyRegistrations: [],
        fontPaletteValuesRule: undefined,
      });

      const val = matchedStyles.computeCSSVariable(matchedStyles.nodeStyles()[0], text);
      assert.strictEqual(val, value);
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
      await testCssValueEquals('--cycle-a', null);
      await testCssValueEquals('--cycle-b', null);
      await testCssValueEquals('--cycle-c', null);
    });
  });

  describe('computeValue', () => {
    const testComputedValueEquals = async (text: string, value: unknown) => {
      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.id = 1 as Protocol.DOM.NodeId;

      const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
        cssModel: sinon.createStubInstance(SDK.CSSModel.CSSModel),
        node,
        inlinePayload: null,
        attributesPayload: null,
        matchedPayload: [{
          rule: {
            selectorList: {selectors: [{text: 'div'}], text: 'div'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [
                {name: '--width', value: '1px'},
                {name: '--dark', value: 'darkgrey'},
                {name: '--theme', value: 'var(--dark)'},
              ],
              shorthandEntries: [],
            },
          },
          matchingSelectors: [0],
        }],
        pseudoPayload: [],
        inheritedPayload: [],
        inheritedPseudoPayload: [],
        animationsPayload: [],
        parentLayoutNodeId: undefined,
        positionFallbackRules: [],
        propertyRules: [],
        cssPropertyRegistrations: [],
        fontPaletteValuesRule: undefined,
      });

      const val = matchedStyles.computeValue(matchedStyles.nodeStyles()[0], text);
      assert.strictEqual(val, value);
    };

    it('should correctly compute the value of an expression that uses a variable', async () => {
      await testComputedValueEquals('1px var(--dark) 2px var(--theme)', '1px darkgrey 2px darkgrey');
      await testComputedValueEquals('1px var(--theme)', '1px darkgrey');
      await testComputedValueEquals(
          'rgb(100, 200, 300) var(--some-color, blue    ) 1px', 'rgb(100, 200, 300) blue 1px');
      await testComputedValueEquals('var(--not-existing)', null);
      await testComputedValueEquals('var(--not-existing-with-default, red)', 'red');
      await testComputedValueEquals('var(--width)solid black', '1px solid black');
    });
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
    const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
      cssModel,
      node,
      inlinePayload: null,
      attributesPayload: null,
      matchedPayload: [{
        matchingSelectors: [0],
        rule: {
          selectorList: {selectors: [{text: 'div'}], text: 'div'},
          origin: Protocol.CSS.StyleSheetOrigin.Regular,
          style: {
            cssProperties: [],
            shorthandEntries: [],
          },
        },
      }],
      pseudoPayload: [],
      inheritedPayload: [{matchedCSSRules}],
      inheritedPseudoPayload: [],
      animationsPayload: [],
      parentLayoutNodeId: undefined,
      positionFallbackRules: [],
      propertyRules: [],
      cssPropertyRegistrations,
      fontPaletteValuesRule: undefined,
    });

    const style = matchedStyles.nodeStyles()[1];
    const [inheritableProperty, nonInheritableProperty] = style.allProperties();

    assert.strictEqual(
        matchedStyles.propertyState(nonInheritableProperty), SDK.CSSMatchedStyles.PropertyState.Overloaded);
    assert.strictEqual(matchedStyles.propertyState(inheritableProperty), SDK.CSSMatchedStyles.PropertyState.Active);
  });
});
