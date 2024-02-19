// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

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
        fontPaletteValuesRule: undefined,
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

      assert.strictEqual(sectionBlocks.length, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@position-fallback --compass');
      assert.strictEqual(sectionBlocks[1].sections.length, 1);
      assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.TryRuleSection);
    });
  });

  it('should add @font-palette-values section to the end', async () => {
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
      positionFallbackRules: [],
      propertyRules: [],
      cssPropertyRegistrations: [],
      fontPaletteValuesRule: {
        fontPaletteName: {text: '--palette'},
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        style: {
          cssProperties: [{name: 'font-family', value: 'Bixa'}, {'name': 'override-colors', value: '0 red'}],
          shorthandEntries: [],

        },
      },
    });

    const sectionBlocks =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

    assert.strictEqual(sectionBlocks.length, 2);
    assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@font-palette-values --palette');
    assert.strictEqual(sectionBlocks[1].sections.length, 1);
    assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.FontPaletteValuesRuleSection);
  });
});

interface RendererTracePoint {
  text: string;
  matchType: string;
}

class RendererTrace {
  #points: RendererTracePoint[] = [];

  push(point: RendererTracePoint): void {
    this.#points.push(point);
  }

  toString(): string|undefined {
    if (!this.#points.length) {
      return undefined;
    }
    const indent = this.#points.map(({text}) => text.length).reduce((a, b) => Math.max(a, b));
    return this.#points.map(({text, matchType}) => `${text.padEnd(indent, ' ')}: ${matchType}`).join('\n');
  }

  reset(): void {
    this.#points.splice(0);
  }
}

describeWithEnvironment('StylesSidebarPropertyRenderer', () => {
  let Elements: typeof ElementsModule;
  const trace = new RendererTrace();
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });
  beforeEach(() => {
    sinon.stub(Elements.PropertyParser.Renderer.prototype, 'renderedMatchForTest').callsFake((nodes, match) => {
      trace.push({text: match.text, matchType: match.type});
    });
  });

  afterEach(() => trace.reset());

  it('parses animation-name correctly', () => {
    const throwingHandler = () => {
      throw new Error('Invalid handler called');
    };
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'animation-name', 'foobar');
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
    assert.deepEqual(node.textContent, nodeContents, trace.toString());
  });

  it('parses color-mix correctly', () => {
    const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
        null, null, 'color', 'color-mix(in srgb, red, blue)');
    renderer.setColorMixHandler(() => document.createTextNode(nodeContents));

    const nodeContents = 'nodeContents';

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents, trace.toString());
  });

  it('does not call bezier handler when color() value contains srgb-linear color space in a variable definition',
     () => {
       const bezierHandler = sinon.fake.returns(document.createTextNode('bezierHandler'));
       const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
           null, null, '--color', 'color(srgb-linear 1 0.55 0.72)');
       renderer.setBezierHandler(bezierHandler);

       renderer.renderValue();

       assert.isFalse(bezierHandler.called, trace.toString());
     });

  it('runs animation handler for animation property', () => {
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'animation', 'example 5s');
    renderer.setAnimationHandler(() => document.createTextNode(nodeContents));

    const nodeContents = 'nodeContents';

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents, trace.toString());
  });

  it('runs positionFallbackHandler for position-fallback property', () => {
    const nodeContents = 'nodeContents';
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'position-fallback', '--compass');
    renderer.setPositionFallbackHandler(() => document.createTextNode(nodeContents));

    const node = renderer.renderValue();

    assert.deepEqual(node.textContent, nodeContents, trace.toString());
  });

  it('parses lengths correctly', () => {
    Root.Runtime.experiments.disableForTest('cssTypeComponentLengthDeprecate');
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'width', 'calc(6em + 7em)');
    renderer.setLengthHandler(() => document.createTextNode('MATCH'));

    const node = renderer.renderValue();

    assert.deepEqual(node.textContent, 'calc(MATCH + MATCH)', trace.toString());
  });

  it('parses font-family correctly', () => {
    const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
        null, null, 'font-family', '"Gill Sans", sans-serif');
    renderer.setFontHandler(() => document.createTextNode('MATCH'));
    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, 'MATCH, MATCH', trace.toString());
  });

  it('parses font-* correctly', () => {
    for (const fontSize of ['-.23', 'smaller', '17px']) {
      const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'font-size', fontSize);
      renderer.setFontHandler(() => document.createTextNode('MATCH'));
      const node = renderer.renderValue();
      assert.deepEqual(node.textContent, 'MATCH', trace.toString());
    }
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'font-size', 'calc(17px + 17px)');
    renderer.setFontHandler(() => document.createTextNode('MATCH'));
    const node = renderer.renderValue();

    // The bogus match on `calc` is expected.
    assert.deepEqual(node.textContent, 'MATCH(MATCH + MATCH)', trace.toString());
  });

  it('parses font-family correctly', () => {
    const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
        null, null, 'font-family', '"Gill Sans", sans-serif');
    renderer.setFontHandler(() => document.createTextNode('MATCH'));
    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, 'MATCH, MATCH', trace.toString());
  });

  it('parses angles correctly', () => {
    const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
        null, null, 'transform', 'rotate(calc(45deg + 3.141rad))');
    renderer.setAngleHandler(() => document.createTextNode('MATCH'));
    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, 'rotate(calc(MATCH + MATCH))', trace.toString());
  });

  it('parses cubic bezier correctly', () => {
    for (const bezier of ['linear', 'ease', 'cubic-bezier(.25 .25 0 0)']) {
      const renderer = new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(
          null, null, 'transition', `display 1s ${bezier} 1s`);
      renderer.setBezierHandler(() => document.createTextNode('MATCH'));
      const node = renderer.renderValue();
      assert.deepEqual(node.textContent, 'display 1s MATCH 1s', trace.toString());
    }
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
