// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithRealConnection('StylesSidebarPane', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('unescapes CSS strings', () => {
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(
            String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
        '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
        '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`),
        '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"', 'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"',
        'surrogates should not be combined');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
        'certain trailing whitespace characters should be consumed as part of the escape sequence');
  });

  it('escapes URL as CSS comments', () => {
    assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/'), 'https://abc.com/');
    assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/'), 'https://abc.com/*/');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*'), 'https://abc.com/*/?q=*');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/'), 'https://abc.com/*/?q=*%2F');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/#hash'),
        'https://abc.com/*/?q=*%2F#hash');
  });

  describe('rebuildSectionsForMatchedStyleRulesForTest', () => {
    it('should add @position-fallback section to the end', async () => {
      const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
      const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
        cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
        node: stylesSidebarPane.node() as SDK.DOMModel.DOMNode,
        inlinePayload: null,
        attributesPayload: null,
        matchedPayload: [],
        pseudoPayload: [],
        inheritedPayload: [],
        inheritedPseudoPayload: [],
        animationsPayload: [],
        parentLayoutNodeId: undefined,
        positionFallbackRules: [{
          name: {text: '--compass'},
          tryRules: [{
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [{name: 'bottom', value: 'anchor(--anchor-name bottom)'}],
              shorthandEntries: [],
            },
          }],
        }],
        propertyRules: [],
        cssPropertyRegistrations: [],
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

      assert.strictEqual(sectionBlocks.length, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@position-fallback --compass');
      assert.strictEqual(sectionBlocks[1].sections.length, 1);
      assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.TryRuleSection);
    });
  });
});

describeWithEnvironment('StylesSidebarPropertyRenderer', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('parses animation-name correctly', () => {
    const throwingHandler = () => {
      throw new Error('Invalid handler called');
    };
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'animation-name', 'foobar');
    renderer.setColorHandler(throwingHandler);
    renderer.setBezierHandler(throwingHandler);
    renderer.setFontHandler(throwingHandler);
    renderer.setShadowHandler(throwingHandler);
    renderer.setGridHandler(throwingHandler);
    renderer.setVarHandler(throwingHandler);
    renderer.setAngleHandler(throwingHandler);
    renderer.setLengthHandler(throwingHandler);

    const nodeContents = `NAME: ${name}`;
    renderer.setAnimationNameHandler(() => document.createTextNode(nodeContents));

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents);
  });

  it('parses color-mix correctly', () => {
    const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
        null, null, 'color', 'color-mix(in srgb, red, blue)');
    renderer.setColorMixHandler(() => document.createTextNode(nodeContents));

    const nodeContents = 'nodeContents';

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents);
  });

  it('does not call bezier handler when color() value contains srgb-linear color space in a variable definition',
     () => {
       const colorHandler = sinon.fake.returns(document.createTextNode('colorHandler'));
       const bezierHandler = sinon.fake.returns(document.createTextNode('bezierHandler'));
       const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
           null, null, '--color', 'color(srgb-linear 1 0.55 0.72)');
       renderer.setColorHandler(colorHandler);
       renderer.setBezierHandler(bezierHandler);

       renderer.renderValue();

       assert.isTrue(colorHandler.called);
       assert.isFalse(bezierHandler.called);
     });

  it('runs animation handler for animation property', () => {
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'animation', 'example 5s');
    renderer.setAnimationHandler(() => document.createTextNode(nodeContents));

    const nodeContents = 'nodeContents';

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents);
  });

  it('runs positionFallbackHandler for position-fallback property', () => {
    const nodeContents = 'nodeContents';
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'position-fallback', '--compass');
    renderer.setPositionFallbackHandler(() => document.createTextNode(nodeContents));

    const node = renderer.renderValue();

    assert.deepEqual(node.textContent, nodeContents);
  });
});

describe('IdleCallbackManager', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  // IdleCallbackManager delegates work using requestIdleCallback, which does not generally execute requested callbacks
  // in order. This test verifies that callbacks do happen in order even if timeouts are run out.
  it('schedules callbacks in order', async () => {
    // Override the default timeout with a very short one
    class QuickIdleCallbackManager extends Elements.StylesSidebarPane.IdleCallbackManager {
      protected override scheduleIdleCallback(_: number): void {
        super.scheduleIdleCallback(1);
      }
    }

    const timeout = (time: number) => new Promise<void>(resolve => setTimeout(resolve, time));

    const elements: number[] = [];

    const callbacks = new QuickIdleCallbackManager();
    callbacks.schedule(() => elements.push(0));
    callbacks.schedule(() => elements.push(1));
    callbacks.schedule(() => elements.push(2));
    callbacks.schedule(() => elements.push(3));
    await timeout(10);
    callbacks.schedule(() => elements.push(4));
    callbacks.schedule(() => elements.push(5));
    callbacks.schedule(() => elements.push(6));
    callbacks.schedule(() => elements.push(7));
    await timeout(10);

    await callbacks.awaitDone();

    assert.deepEqual(elements, [0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
