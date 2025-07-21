// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {SinonStub, SinonStubbedInstance} from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {
  getMatchedStyles,
  getMatchedStylesWithBlankRule,
} from '../../testing/StyleHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Tooltips from '../../ui/components/tooltips/tooltips.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as LegacyUI from '../../ui/legacy/legacy.js';

import * as ElementsComponents from './components/components.js';
import * as Elements from './elements.js';

describeWithMockConnection('StylePropertyTreeElement', () => {
  let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;
  let mockVariableMap: Record<string, string|SDK.CSSProperty.CSSProperty>;
  let matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
  let fakeComputeCSSVariable: SinonStub<
      [style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, variableName: string],
      SDK.CSSMatchedStyles.CSSVariableValue|null>;
  let cssModel: SDK.CSSModel.CSSModel;

  const environmentVariables = {a: 'A'};

  beforeEach(async () => {
    const computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
    stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    mockVariableMap = {
      '--a': 'red',
      '--b': 'blue',
      '--blue': 'blue',
      '--space': 'shorter hue',
      '--garbage-space': 'this-is-garbage-text',
      '--prop': 'customproperty',
      '--zero': '0',
      '--empty': '',
    };

    matchedStyles = await getMatchedStylesWithBlankRule({
      cssModel: new SDK.CSSModel.CSSModel(createTarget()),
      range: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 1,
      },
      getEnvironmentVariablesCallback: () => ({environmentVariables})
    });
    sinon.stub(matchedStyles, 'availableCSSVariables').returns(Object.keys(mockVariableMap));
    fakeComputeCSSVariable = sinon.stub(matchedStyles, 'computeCSSVariable').callsFake((_style, name) => {
      const value = mockVariableMap[name];
      if (!value) {
        return null;
      }
      if (typeof value === 'string') {
        return {
          value,
          declaration: new SDK.CSSMatchedStyles.CSSValueSource(sinon.createStubInstance(SDK.CSSProperty.CSSProperty)),
        };
      }
      return {value: value.value, declaration: new SDK.CSSMatchedStyles.CSSValueSource(value)};
    });

    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace);
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager: SDK.TargetManager.TargetManager.instance()});

    setMockConnectionResponseHandler('CSS.enable', () => ({}));
    cssModel = new SDK.CSSModel.CSSModel(createTarget());
    await cssModel.resumeModel();
    const domModel = cssModel.domModel();
    const node = new SDK.DOMModel.DOMNode(domModel);
    node.id = 0 as Protocol.DOM.NodeId;
    LegacyUI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  });

  function addProperty(name: string, value: string, longhandProperties: Protocol.CSS.CSSProperty[] = []) {
    const property = new SDK.CSSProperty.CSSProperty(
        matchedStyles.nodeStyles()[0], matchedStyles.nodeStyles()[0].pastLastSourcePropertyIndex(), name, value, true,
        false, true, false, '', undefined, longhandProperties);
    matchedStyles.nodeStyles()[0].allProperties().push(property);
    return property;
  }

  async function getTreeElementForFunctionRule(functionName: string, result: string, propertyName = 'result') {
    const matchedStyles = await getMatchedStyles({
      functionRules:
          [{name: {text: functionName}, origin: Protocol.CSS.StyleSheetOrigin.Regular, parameters: [], children: []}]
    });

    const property = new SDK.CSSProperty.CSSProperty(
        matchedStyles.functionRules()[0].style, matchedStyles.functionRules()[0].style.pastLastSourcePropertyIndex(),
        propertyName, result, true, false, true, false, '', undefined, []);
    matchedStyles.functionRules()[0].style.allProperties().push(property);
    return new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
      stylesPane: stylesSidebarPane,
      section: sinon.createStubInstance(Elements.StylePropertiesSection.StylePropertiesSection),
      matchedStyles,
      property,
      isShorthand: false,
      inherited: false,
      overloaded: false,
      newProperty: true,
    });
  }

  function getTreeElement(name: string, value: string, longhandProperties: Protocol.CSS.CSSProperty[] = []) {
    const property = addProperty(name, value, longhandProperties);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, property.ownerStyle, 0, null, null);
    return new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
      stylesPane: stylesSidebarPane,
      section,
      matchedStyles,
      property,
      isShorthand: longhandProperties.length > 0,
      inherited: false,
      overloaded: false,
      newProperty: true,
    });
  }

  describe('updateTitle', () => {
    it('timing swatch, shadow swatch and length swatch are not shown for longhands expanded inside shorthands',
       async () => {
         const stylePropertyTreeElement = getTreeElement('', '', [
           {name: 'animation-timing-function', value: 'linear'},
           {name: 'text-shadow', value: '2px 2px #ff0000'},
           {name: 'box-shadow', value: '2px 2px #ff0000'},
           {name: 'margin-top', value: '10px'},
         ]);
         await stylePropertyTreeElement.onpopulate();

         stylePropertyTreeElement.updateTitle();
         stylePropertyTreeElement.expand();

         const assertNullSwatchOnChildAt = (n: number, swatchSelector: string) => {
           const childValueElement =
               (stylePropertyTreeElement.childAt(n) as Elements.StylePropertyTreeElement.StylePropertyTreeElement)
                   .valueElement;
           assert.exists(childValueElement);
           assert.notExists(childValueElement.querySelector(swatchSelector));
         };
         assertNullSwatchOnChildAt(0, 'devtools-bezier-swatch');
         assertNullSwatchOnChildAt(1, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(2, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(3, 'devtools-css-length');
       });

    it('is able to expand longhands with vars', async () => {
      setMockConnectionResponseHandler(
          'CSS.getLonghandProperties', (request: Protocol.CSS.GetLonghandPropertiesRequest) => {
            if (request.shorthandName !== 'shorthand') {
              return {getError: () => 'Invalid shorthand'};
            }
            const longhands = request.value.split(' ');
            if (longhands.length !== 3) {
              return {getError: () => 'Invalid value'};
            }
            return {
              longhandProperties: [
                {name: 'first', value: longhands[0]},
                {name: 'second', value: longhands[1]},
                {name: 'third', value: longhands[2]},
              ]
            };
          });
      const stylePropertyTreeElement = getTreeElement(
          'shorthand', 'var(--a) var(--space)',
          [{name: 'first', value: ''}, {name: 'second', value: ''}, {name: 'third', value: ''}]);
      await stylePropertyTreeElement.onpopulate();
      stylePropertyTreeElement.updateTitle();
      stylePropertyTreeElement.expand();
      const children = stylePropertyTreeElement.children().map(
          child => (child as Elements.StylePropertyTreeElement.StylePropertyTreeElement).valueElement?.innerText);
      assert.deepEqual(children, ['red', 'shorter', 'hue']);
    });

    describe('color-mix swatch', () => {
      it('should show color mix swatch when color-mix is used with a color', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, red, blue)');
        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const colorSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch') || []);
        assert.exists(colorMixSwatch);
        assert.exists(colorSwatches.find(colorSwatch => colorSwatch.nextElementSibling?.textContent === 'red'));
        assert.exists(colorSwatches.find(colorSwatch => colorSwatch.nextElementSibling?.textContent === 'blue'));
      });

      it('should show color mix swatch when color-mix is used with a known variable as color', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, var(--a), var(--b))');
        stylePropertyTreeElement.updateTitle();
        renderElementIntoDOM(stylePropertyTreeElement.valueElement!);

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const cssVarSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch') || []);
        assert.exists(colorMixSwatch);
        assert.exists(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.innerText === '--a'));
        assert.exists(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.innerText === '--b'));
      });

      it('should not show color mix swatch when color-mix is used with an unknown variable as color', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, var(--unknown-a), var(--b))');
        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.isNull(colorMixSwatch);
      });

      it('should show color mix swatch when color-mix is used with a known variable in interpolation method', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in lch var(--space), var(--a), var(--b))');
        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(colorMixSwatch);
      });

      it('should show color mix swatch when color-mix is used with an known variable in interpolation method even if it is not a valid method',
         () => {
           const stylePropertyTreeElement =
               getTreeElement('color', 'color-mix(in lch var(--garbage-space), var(--a), var(--b))');
           stylePropertyTreeElement.updateTitle();

           const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
           assert.exists(colorMixSwatch);
         });

      it('should not show color mix swatch when color-mix is used with an unknown variable in interpolation method',
         () => {
           const stylePropertyTreeElement =
               getTreeElement('color', 'color-mix(in lch var(--not-existing-space), var(--a), var(--b))');

           stylePropertyTreeElement.updateTitle();

           const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
           assert.isNull(colorMixSwatch);
         });

      it('shows a popover with it\'s computed color as RGB if possible', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, red 50%, yellow)');
        stylePropertyTreeElement.treeOutline = new LegacyUI.TreeOutline.TreeOutline();

        stylePropertyTreeElement.updateTitle();
        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(colorMixSwatch);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement as HTMLElement);

        const tooltip: Tooltips.Tooltip.Tooltip|null|undefined = stylePropertyTreeElement.valueElement?.querySelector(
            'devtools-tooltip:not([jslogcontext="elements.css-value-trace"])');
        assert.exists(tooltip);
        tooltip.showPopover();
        assert.strictEqual(tooltip.textContent, '#ff8000');
      });

      it('shows a popover with it\'s computed color as wide gamut if necessary', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, oklch(.5 .5 .5) 50%, yellow)');

        stylePropertyTreeElement.updateTitle();
        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(colorMixSwatch);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement as HTMLElement);

        const tooltip = stylePropertyTreeElement.valueElement?.querySelector(
                            'devtools-tooltip:not([jslogcontext="elements.css-value-trace"])') as HTMLElement |
            null | undefined;
        tooltip?.showPopover();
        assert.strictEqual(tooltip?.textContent, 'color(srgb 1 0.24 0.17)');
      });

      it('propagates updates to outer color-mixes', () => {
        const stylePropertyTreeElement =
            getTreeElement('color', 'color-mix(in srgb, color-mix(in oklch, red, green), blue)');
        stylePropertyTreeElement.updateTitle();

        assert.exists(stylePropertyTreeElement.valueElement);

        const [outerColorMix, innerColorMix] =
            Array.from(stylePropertyTreeElement.valueElement.querySelectorAll('devtools-color-mix-swatch'));
        assert.exists(outerColorMix);
        assert.exists(innerColorMix);
        const handler = sinon.fake();
        outerColorMix.addEventListener(InlineEditor.ColorMixSwatch.ColorMixChangedEvent.eventName, handler);
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, red, green), blue)');
        assert.strictEqual(innerColorMix.getText(), 'color-mix(in oklch, red, green)');
        innerColorMix.setFirstColor('blue');
        assert.deepEqual(handler.args[0][0].data, {text: 'color-mix(in srgb, color-mix(in oklch, blue, green), blue)'});
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, blue, green), blue)');

        // setFirstColor does not actually update the rendered color swatches or the textContent, which is why the first
        // color is still red here.
        const colorSwatch = stylePropertyTreeElement.valueElement.querySelector('devtools-color-swatch');
        assert.isOk(colorSwatch);
        const newColor = colorSwatch.getColor()?.as(Common.Color.Format.HEX);
        assert.isOk(newColor);
        colorSwatch.setColor(newColor);
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, #ff0000, green), blue)');
        assert.deepEqual(
            handler.args[1][0].data, {text: 'color-mix(in srgb, color-mix(in oklch, #ff0000, green), blue)'});
      });

      it('supports evaluation during tracing', async () => {
        const property = addProperty('color', 'color-mix(in srgb, black, white)');
        setMockConnectionResponseHandler(
            'CSS.resolveValues',
            (request: Protocol.CSS.ResolveValuesRequest) =>
                ({results: request.values.map(v => v === property.value ? 'grey' : v)}));
        const matchedResult = property.parseValue(matchedStyles, new Map());

        const context =
            new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false);
        assert.isTrue(context.nextEvaluation());
        const {valueElement} = Elements.PropertyRenderer.Renderer.renderValueElement(
            property, matchedResult,
            Elements.StylePropertyTreeElement.getPropertyRenderers(
                property.name, matchedStyles.nodeStyles()[0], stylesSidebarPane, matchedStyles, null, new Map()),
            context);

        const colorSwatch = valueElement.querySelector('devtools-color-swatch');
        assert.exists(colorSwatch);
        const setColorTextCall = spyCall(colorSwatch, 'setColor');

        assert.isTrue(await context.runAsyncEvaluations());
        assert.strictEqual((await setColorTextCall).args[0].asString(), '#808080');
        assert.strictEqual(valueElement.innerText, '#808080');
      });

      it('shows a value tracing tooltip on the var function', async () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, yellow, green)');
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement);
        const tooltip = stylePropertyTreeElement.valueElement.querySelector('devtools-tooltip');
        assert.exists(tooltip);
        const widget = tooltip.firstElementChild && LegacyUI.Widget.Widget.get(tooltip.firstElementChild);
        assert.instanceOf(widget, Elements.CSSValueTraceView.CSSValueTraceView);
      });
    });

    describe('animation-name', () => {
      it('should link-swatch be rendered for animation-name declaration', () => {
        const stylePropertyTreeElement = getTreeElement('animation-name', 'first-keyframe');
        stylePropertyTreeElement.updateTitle();

        const animationNameSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
        assert.isNotNull(animationNameSwatch);
      });

      it('should two link-swatches be rendered for animation-name declaration that contains two keyframe references',
         () => {
           const stylePropertyTreeElement = getTreeElement('animation-name', 'first-keyframe, second-keyframe');
           stylePropertyTreeElement.updateTitle();

           const animationNameSwatches =
               stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch');
           assert.strictEqual(animationNameSwatches?.length, 2);
         });

      describe('jumping to animations panel', () => {
        let domModel: SDK.DOMModel.DOMModel;
        beforeEach(async () => {
          const target = createTarget();
          const domModelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
          assert.exists(domModelBeforeAssertion);
          domModel = domModelBeforeAssertion;
        });

        it('should render a jump-to icon when the animation with the given name exists for the node', async () => {
          const stubAnimationGroup = sinon.createStubInstance(SDK.AnimationModel.AnimationGroup);
          const getAnimationGroupForAnimationStub =
              sinon.stub(SDK.AnimationModel.AnimationModel.prototype, 'getAnimationGroupForAnimation')
                  .resolves(stubAnimationGroup);
          const domNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
            nodeId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
          });
          const stylePropertyTreeElement = getTreeElement('animation-name', 'first-keyframe, second-keyframe');
          sinon.stub(stylePropertyTreeElement, 'node').returns(domNode);

          stylePropertyTreeElement.updateTitle();
          await Promise.all(getAnimationGroupForAnimationStub.returnValues);

          const jumpToIcon =
              stylePropertyTreeElement.valueElement?.querySelector('devtools-icon.open-in-animations-panel');
          assert.exists(jumpToIcon);
        });

        it('should clicking on the jump-to icon reveal the resolved animation group', async () => {
          const stubAnimationGroup = sinon.createStubInstance(SDK.AnimationModel.AnimationGroup);
          const revealerSpy = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');
          const getAnimationGroupForAnimationStub =
              sinon.stub(SDK.AnimationModel.AnimationModel.prototype, 'getAnimationGroupForAnimation')
                  .resolves(stubAnimationGroup);
          const domNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
            nodeId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
          });
          const stylePropertyTreeElement = getTreeElement('animation-name', 'first-keyframe, second-keyframe');
          sinon.stub(stylePropertyTreeElement, 'node').returns(domNode);

          stylePropertyTreeElement.updateTitle();
          await Promise.all(getAnimationGroupForAnimationStub.returnValues);

          const jumpToIcon =
              stylePropertyTreeElement.valueElement?.querySelector('devtools-icon.open-in-animations-panel');
          jumpToIcon?.dispatchEvent(new Event('mouseup'));
          assert.isTrue(
              revealerSpy.calledWith(stubAnimationGroup),
              'Common.Revealer.reveal is not called for the animation group');
        });

        it('should not render a jump-to icon when the animation with the given name does not exist for the node',
           async () => {
             const getAnimationGroupForAnimationStub =
                 sinon.stub(SDK.AnimationModel.AnimationModel.prototype, 'getAnimationGroupForAnimation')
                     .resolves(null);
             const domNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
               nodeId: 1 as Protocol.DOM.NodeId,
               backendNodeId: 2 as Protocol.DOM.BackendNodeId,
               nodeType: Node.ELEMENT_NODE,
               nodeName: 'div',
               localName: 'div',
               nodeValue: '',
             });
             const stylePropertyTreeElement = getTreeElement('animation-name', 'first-keyframe, second-keyframe');
             sinon.stub(stylePropertyTreeElement, 'node').returns(domNode);

             stylePropertyTreeElement.updateTitle();
             await Promise.all(getAnimationGroupForAnimationStub.returnValues);

             const jumpToIcon =
                 stylePropertyTreeElement.valueElement?.querySelector('devtools-icon.open-in-animations-panel');
             assert.notExists(jumpToIcon);
           });
      });
    });
  });

  it('applies the new style when the color format is changed', async () => {
    const stylePropertyTreeElement = getTreeElement('color', 'color(srgb .5 .5 1)');
    const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
    // Make sure we don't leave a dangling promise behind:
    const returnValue = (async () => {})();
    await returnValue;
    applyStyleTextStub.returns(returnValue);

    stylePropertyTreeElement.updateTitle();

    const {valueElement} = stylePropertyTreeElement;
    assert.exists(valueElement);

    const swatch = valueElement.querySelector<InlineEditor.ColorSwatch.ColorSwatch>('devtools-color-swatch');

    assert.exists(swatch);

    const expectedColorString = swatch.getColor()?.asString(Common.Color.Format.LAB);
    assert.exists(expectedColorString);
    assert.match(expectedColorString, /lab\([-.0-9]* [-.0-9]* [-.0-9]*\)/);

    const newColor = swatch.getColor()?.as(Common.Color.Format.LAB);
    assert.isOk(newColor);
    swatch.dispatchEvent(new InlineEditor.ColorSwatch.ColorFormatChangedEvent(newColor));
    assert.deepEqual(stylePropertyTreeElement.renderedPropertyText(), `color: ${expectedColorString}`);

    sinon.assert.alwaysCalledWith(applyStyleTextStub, `color: ${expectedColorString}`, false);
  });

  describe('Context menu', () => {
    const expectedHeaderSectionItemsLabels =
        ['Copy declaration', 'Copy property', 'Copy value', 'Copy rule', 'Copy declaration as JS'];
    const expectedClipboardSectionItemsLabels = ['Copy all declarations', 'Copy all declarations as JS'];
    const expectedFooterSectionItemsLabels = ['View computed value'];

    it('should create a context menu', () => {
      const verifySection = (expectedSectionItemLabels: string[], sectionItems: LegacyUI.ContextMenu.Item[]) => {
        const sectionItemLabels = sectionItems.map(item => item.buildDescriptor().label);
        assert.deepEqual(sectionItemLabels, expectedSectionItemLabels);
      };
      const stylePropertyTreeElement = getTreeElement('', '');
      const event = new CustomEvent('contextmenu');
      const contextMenu = stylePropertyTreeElement.createCopyContextMenu(event);

      const headerSection = contextMenu.headerSection();
      const clipboardSection = contextMenu.clipboardSection();
      const footerSection = contextMenu.footerSection();
      verifySection(expectedHeaderSectionItemsLabels, headerSection.items);
      verifySection(expectedClipboardSectionItemsLabels, clipboardSection.items);
      verifySection(expectedFooterSectionItemsLabels, footerSection.items);
    });
  });

  describe('CSS hints', () => {
    it('should create a hint for inline elements', () => {
      sinon.stub(stylesSidebarPane, 'node').returns({
        localName() {
          return 'span';
        },
        isSVGNode() {
          return false;
        },
      } as SDK.DOMModel.DOMNode);
      const stylePropertyTreeElement = getTreeElement('width', '100px');
      stylePropertyTreeElement.setComputedStyles(new Map([
        ['width', '100px'],
        ['display', 'inline'],
      ]));
      stylePropertyTreeElement.updateAuthoringHint();
      assert(
          stylePropertyTreeElement.listItemElement.classList.contains('inactive-property'),
          'CSS hint was not rendered.');
    });

    it('should not create a hint for SVG elements', () => {
      sinon.stub(stylesSidebarPane, 'node').returns({
        localName() {
          return 'rect';
        },
        isSVGNode() {
          return true;
        },
      } as SDK.DOMModel.DOMNode);
      const stylePropertyTreeElement = getTreeElement('width', '100px');
      stylePropertyTreeElement.setComputedStyles(new Map([
        ['width', '100px'],
        ['display', 'inline'],
      ]));
      stylePropertyTreeElement.updateAuthoringHint();
      assert.isNotOk(
          stylePropertyTreeElement.listItemElement.classList.contains('inactive-property'),
          'CSS hint was rendered unexpectedly.');
    });
  });

  describe('custom-properties', () => {
    it('linkifies var functions to declarations', async () => {
      const cssCustomPropertyDef = addProperty('--prop', 'value');
      fakeComputeCSSVariable.callsFake(
          (_, name) => name === '--prop' ? {
            value: 'computedvalue',
            declaration: new SDK.CSSMatchedStyles.CSSValueSource(cssCustomPropertyDef),
            fromFallback: false,
          } :
                                           null);
      const renderValueSpy = sinon.spy(Elements.PropertyRenderer.Renderer, 'renderValueElement');

      const stylePropertyTreeElement = getTreeElement('prop', 'var(--prop)');
      stylePropertyTreeElement.updateTitle();

      const varSwatch = renderValueSpy.returnValues
                            .map(fragment => Array.from(fragment.valueElement.querySelectorAll('devtools-link-swatch')))
                            .flat()[0];
      assert.exists(varSwatch);
      const revealPropertySpy = sinon.spy(stylesSidebarPane, 'revealProperty');
      varSwatch.linkElement?.click();
      sinon.assert.calledWith(revealPropertySpy, cssCustomPropertyDef);
    });

    it('linkifies property definition to registrations', async () => {
      const registration = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSRegisteredProperty);
      sinon.stub(matchedStyles, 'getRegisteredProperty')
          .callsFake(name => name === '--prop' ? registration : undefined);
      fakeComputeCSSVariable.returns({
        value: 'computedvalue',
        declaration: new SDK.CSSMatchedStyles.CSSValueSource(sinon.createStubInstance(SDK.CSSProperty.CSSProperty)),
      });

      const stylePropertyTreeElement = getTreeElement('--prop', 'value');
      stylePropertyTreeElement.treeOutline = new LegacyUI.TreeOutline.TreeOutline();
      stylePropertyTreeElement.updateTitle();

      const popoverContents =
          stylePropertyTreeElement.listItemElement.querySelector('devtools-tooltip > devtools-css-variable-value-view');
      assert.instanceOf(popoverContents, ElementsComponents.CSSVariableValueView.CSSVariableValueView);
      const {details} = popoverContents;
      assert.exists(details);

      const jumpToSectionSpy = sinon.spy(stylesSidebarPane, 'jumpToSection');
      details.goToDefinition();
      sinon.assert.calledOnceWithExactly(
          jumpToSectionSpy, '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME);
    });

    it('linkifies var functions to initial-value registrations', async () => {
      fakeComputeCSSVariable.returns({
        value: 'computedvalue',
        declaration: new SDK.CSSMatchedStyles.CSSValueSource(
            sinon.createStubInstance(SDK.CSSMatchedStyles.CSSRegisteredProperty, {propertyName: '--prop'})),
      });
      const renderValueSpy = sinon.spy(Elements.PropertyRenderer.Renderer, 'renderValueElement');

      const stylePropertyTreeElement = getTreeElement('prop', 'var(--prop)');
      stylePropertyTreeElement.updateTitle();

      const varSwatch = renderValueSpy.returnValues
                            .map(fragment => Array.from(fragment.valueElement.querySelectorAll('devtools-link-swatch')))
                            .flat()[0];
      assert.exists(varSwatch);
      const jumpToPropertySpy = sinon.spy(stylesSidebarPane, 'jumpToProperty');
      varSwatch.linkElement?.click();
      sinon.assert.calledWith(
          jumpToPropertySpy, 'initial-value', '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME);
    });
  });

  describe('CSSVarSwatch', () => {
    it('should render a CSSVarSwatch for variable usage without fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--a)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.exists(linkSwatch);

      const cssVarSwatch = linkSwatch.parentElement;
      assert.exists(cssVarSwatch);

      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      assert.strictEqual(cssVarSwatch.innerText, 'var(--a)');
      assert.strictEqual(linkSwatch.innerText, '--a');
      assert.strictEqual(stylePropertyTreeElement.valueElement.innerText, 'var(--a)');
    });

    it('should render a CSSVarSwatch for variable usage with fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, red)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.exists(linkSwatch);

      const cssVarSwatch = linkSwatch.parentElement;
      assert.exists(cssVarSwatch);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      assert.strictEqual(linkSwatch.innerText, '--not-existing');
      assert.strictEqual(cssVarSwatch.innerText, 'var(--not-existing, red)');
      assert.strictEqual(stylePropertyTreeElement.valueElement.innerText, 'var(--not-existing, red)');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with another variable fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, var(--a))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const [firstLinkSwatch, secondLinkSwatch] =
          stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch');
      assert.exists(firstLinkSwatch);
      assert.exists(secondLinkSwatch);
      const cssVarSwatch = firstLinkSwatch.parentElement;
      assert.exists(cssVarSwatch);
      const insideCssVarSwatch = secondLinkSwatch.parentElement;
      assert.exists(insideCssVarSwatch);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      assert.strictEqual(stylePropertyTreeElement.valueElement.innerText, 'var(--not-existing, var(--a))');
      assert.strictEqual(firstLinkSwatch?.innerText, '--not-existing');
      assert.strictEqual(cssVarSwatch.innerText, 'var(--not-existing, var(--a))');
      assert.strictEqual(secondLinkSwatch?.innerText, '--a');
      assert.strictEqual(insideCssVarSwatch?.innerText, 'var(--a)');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with calc expression as fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, calc(15px + 20px))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.exists(linkSwatch);
      const cssVarSwatch = linkSwatch.parentElement;
      assert.exists(cssVarSwatch);
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      assert.strictEqual(stylePropertyTreeElement.valueElement.innerText, 'var(--not-existing, calc(15px + 20px))');
      assert.strictEqual(linkSwatch?.innerText, '--not-existing');
      assert.strictEqual(cssVarSwatch.innerText, 'var(--not-existing, calc(15px + 20px))');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with color and also a color swatch', () => {
      for (const varName of ['--a', '--not-existing']) {
        const stylePropertyTreeElement = getTreeElement('color', `var(${varName}, var(--blue))`);
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);

        const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
        assert.exists(colorSwatch);
        assert.isTrue(InlineEditor.ColorSwatch.ColorSwatch.isColorSwatch(colorSwatch));

        const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
        assert.exists(linkSwatch);
        const cssVarSwatch = linkSwatch.parentElement;
        assert.exists(cssVarSwatch);
        assert.exists(stylePropertyTreeElement.valueElement);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement);

        assert.strictEqual(stylePropertyTreeElement.valueElement.innerText, `var(${varName}, var(--blue))`);
        assert.strictEqual(linkSwatch?.innerText, varName);
        assert.strictEqual(cssVarSwatch.innerText, `var(${varName}, var(--blue))`);
        stylePropertyTreeElement.valueElement.remove();
      }
    });

    it('should render CSSVarSwatches for multiple var() usages in the same property declaration', () => {
      const stylePropertyTreeElement = getTreeElement('--shadow', 'var(--a) var(--b)');
      stylePropertyTreeElement.updateTitle();

      const cssVarSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch');
      assert.strictEqual(cssVarSwatches?.length, 2);
    });

    it('connects nested color swatches', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--void, red)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.exists(linkSwatch);
      const cssVarSwatch = linkSwatch.parentElement;
      assert.exists(cssVarSwatch);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      const outerColorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(outerColorSwatch);
      const innerColorSwatch = cssVarSwatch.querySelector('devtools-color-swatch');
      assert.exists(innerColorSwatch);
      assert.notStrictEqual(outerColorSwatch, innerColorSwatch);
      const color = new Common.Color.Lab(1, 0, 0, null, undefined);
      innerColorSwatch.setColor(color);
      assert.strictEqual(outerColorSwatch.getColor(), color);
    });

    it('only connects nested color swatches if the fallback is actually taken', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--blue, red)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.exists(linkSwatch);
      const cssVarSwatch = linkSwatch.parentElement;
      assert.exists(cssVarSwatch);

      const outerColorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(outerColorSwatch);
      const innerColorSwatch = cssVarSwatch.querySelector('devtools-color-swatch');
      assert.exists(innerColorSwatch);
      assert.notStrictEqual(outerColorSwatch, innerColorSwatch);
      const color = new Common.Color.Lab(1, 0, 0, null, undefined);
      innerColorSwatch.setColor(color);
      assert.strictEqual(outerColorSwatch.getColor()?.asString(), 'blue');
    });
  });

  describe('VariableRenderer', () => {
    it('computes the text for var()s correctly', async () => {
      async function matchProperty(value: string, name = 'color') {
        addProperty('--blue', 'blue');
        const stylePropertyTreeElement = getTreeElement(name, value);

        const ast =
            SDK.CSSPropertyParser.tokenizeDeclaration(stylePropertyTreeElement.name, stylePropertyTreeElement.value);
        assert.exists(ast);
        const matching = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(
            ast, [new SDK.CSSPropertyParserMatchers.VariableMatcher(
                     stylePropertyTreeElement.matchedStyles(), stylePropertyTreeElement.property.ownerStyle)]);

        const res = {
          hasUnresolvedVars: matching.hasUnresolvedVars(ast.tree),
          computedText: matching.getComputedText(ast.tree),
        };
        return res;
      }

      assert.deepEqual(
          await matchProperty('var( --blue    )'), {hasUnresolvedVars: false, computedText: 'color: blue'});
      assert.deepEqual(
          await matchProperty('var(--no, var(--blue))'), {hasUnresolvedVars: false, computedText: 'color: blue'});
      assert.deepEqual(
          await matchProperty('pre var(--no) post'),
          {hasUnresolvedVars: true, computedText: 'color: pre var(--no) post'});
      assert.deepEqual(
          await matchProperty('var(--no, var(--no2))'),
          {hasUnresolvedVars: true, computedText: 'color: var(--no, var(--no2))'});
      assert.deepEqual(await matchProperty(''), {hasUnresolvedVars: false, computedText: 'color:'});
    });

    it('layers correctly with the font renderer', () => {
      const stylePropertyTreeElement = getTreeElement('font-size', 'calc(1 + var(--no))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch'));
    });

    it('shows a value tracing tooltip on the var function', async () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--blue)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const tooltip = stylePropertyTreeElement.valueElement.querySelector('devtools-tooltip');
      assert.exists(tooltip);
      const widget = tooltip.firstElementChild && LegacyUI.Widget.Widget.get(tooltip.firstElementChild);
      assert.instanceOf(widget, Elements.CSSValueTraceView.CSSValueTraceView);
    });

    it('does not render inside function rules', async () => {
      const stylePropertyTreeElement = await getTreeElementForFunctionRule('--func', 'var(--b)');
      stylePropertyTreeElement.updateTitle();
      assert.notExists(stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch'));
    });

    it('retains empty fallbacks', async () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--blue,)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      assert.strictEqual(stylePropertyTreeElement.renderedPropertyText(), 'color: var(--blue, )');
    });
  });

  describe('ColorRenderer', () => {
    it('correctly renders children of the color swatch', () => {
      const value = 'rgb(255, var(--zero), var(--zero))';
      const stylePropertyTreeElement = getTreeElement('color', value);
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      assert.strictEqual(stylePropertyTreeElement.valueElement?.innerText, value);
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HEX), '#ff0000');

      const varSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch');
      assert.exists(varSwatches);
      assert.lengthOf(varSwatches, 2);
    });

    it('connects correctly with an inner angle swatch', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'hsl(120deg, 50%, 25%)');
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HSL), 'hsl(120deg 50% 25%)');
      const eventHandler = sinon.stub<[InlineEditor.ColorSwatch.ColorChangedEvent]>();
      colorSwatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, eventHandler);

      const angleSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-angle');
      assert.exists(angleSwatch);
      angleSwatch.updateAngle({value: 130, unit: InlineEditor.CSSAngleUtils.AngleUnit.DEG});
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HSL), 'hsl(130deg 50% 25%)');
      sinon.assert.calledOnce(eventHandler);
      assert.strictEqual(eventHandler.args[0][0].data.color, colorSwatch.getColor());
    });

    it('renders relative colors', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'hsl(    from var(--blue) h calc(s/2) l / alpha)');
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.isOk(colorSwatch);
      assert.isOk(colorSwatch.getColor());
      assert.strictEqual(colorSwatch?.getColor()?.asString(Common.Color.Format.HSL), 'hsl(240deg 50% 50%)');
    });

    it('does not render relative colors if property text is invalid', () => {
      const invalidColor = 'hsl(    from var(--zero) h calc(s/2) l / alpha)';
      const stylePropertyTreeElement = getTreeElement('color', invalidColor);
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.isNull(colorSwatch);
    });

    it('correctly renders currentcolor', () => {
      const stylePropertyTreeElement = getTreeElement('background-color', 'currentcolor');
      stylePropertyTreeElement.setComputedStyles(new Map([['color', 'red']]));
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.isOk(colorSwatch);
      assert.isOk(colorSwatch.getColor());
      assert.strictEqual(colorSwatch?.getColor()?.asString(), 'red');
    });

    it('renders relative colors using currentcolor', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'hsl(from currentcolor h calc(s/2) l / alpha)');
      stylePropertyTreeElement.setComputedStyles(new Map([['color', 'blue']]));
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.isOk(colorSwatch);
      assert.isOk(colorSwatch.getColor());
      assert.strictEqual(colorSwatch?.getColor()?.asString(Common.Color.Format.HSL), 'hsl(240deg 50% 50%)');
    });

    it('renders fallbacks correctly when the color fails to parse', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'lch(50 min(1, 8) 8deg)');
      stylePropertyTreeElement.updateTitle();
      const angle = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-angle');
      assert.exists(angle);
    });

    it('shows a value tracing tooltip on color functions', async () => {
      for (const property of ['rgb(255 0 0)', 'color(srgb 0.5 0.5 0.5)', 'oklch(from purple calc(l * 2) c h)']) {
        const stylePropertyTreeElement = getTreeElement('color', property);
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement);
        const tooltip = stylePropertyTreeElement.valueElement.querySelector('devtools-tooltip');
        assert.exists(tooltip);
        const widget = tooltip.firstElementChild && LegacyUI.Widget.Widget.get(tooltip.firstElementChild);
        assert.instanceOf(widget, Elements.CSSValueTraceView.CSSValueTraceView);
        stylePropertyTreeElement.valueElement.remove();
      }
    });
  });

  describe('RelativeColorChannelRenderer', () => {
    it('provides a tooltip for relative color channels', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'rgb(from #ff0c0c calc(r / 2) g b)');
      stylePropertyTreeElement.updateTitle();

      const tooltips = stylePropertyTreeElement.valueElement?.querySelectorAll(
          'devtools-tooltip:not([jslogcontext="elements.css-value-trace"])');
      assert.exists(tooltips);
      assert.lengthOf(tooltips, 3);
      assert.deepEqual(Array.from(tooltips).map(tooltip => tooltip.textContent), ['1.000', '0.047', '0.047']);
    });

    it('evaluates relative color channels during tracing', async () => {
      setMockConnectionResponseHandler(
          'CSS.resolveValues',
          (request: Protocol.CSS.ResolveValuesRequest) =>
              ({results: request.values.map(v => v === 'calc(1.000 / 2)' ? '0.5' : '')}));
      const property = addProperty('color', 'rgb(from #ff0c0c calc(r / 2) g b)');

      const {promise, resolve} = Promise.withResolvers<void>();
      const view = sinon.stub<Parameters<Elements.CSSValueTraceView.View>>().callsFake(() => resolve());
      void new Elements.CSSValueTraceView.CSSValueTraceView(undefined, view)
          .showTrace(
              property, null, matchedStyles, new Map(),
              Elements.StylePropertyTreeElement.getPropertyRenderers(
                  property.name, property.ownerStyle, stylesSidebarPane, matchedStyles, null, new Map()),
              false, 0, false);

      await promise;

      const {evaluations} = view.args[0][0];

      assert.deepEqual(evaluations.flat().map(args => args?.textContent).flat(), [
        '', 'rgb(from #ff0c0c calc(1.000 / 2) 0.047 0.047)', '', 'rgb(from #ff0c0c 0.5 0.047 0.047)', '', '#800c0c'
      ]);
    });
  });

  describe('BezierRenderer', () => {
    it('renders the easing function swatch', () => {
      const stylePropertyTreeElement = getTreeElement('animation-timing-function', 'ease-out');
      stylePropertyTreeElement.updateTitle();
      assert.instanceOf(stylePropertyTreeElement.valueElement?.firstChild, IconButton.Icon.Icon);
    });
  });

  describe('UrlRenderer', () => {
    it('linkifies and unescapes urls', () => {
      const stylePropertyTreeElement = getTreeElement('--url', 'url(devtools:\\/\\/abc)');
      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement?.innerText, 'url(devtools://abc)');
    });
  });

  describe('StringRenderer', () => {
    it('unescapes strings', () => {
      const stylePropertyTreeElement = getTreeElement('content', '"\\2716"');
      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(
          (stylePropertyTreeElement.valueElement?.firstElementChild as HTMLElement | null | undefined)?.title,
          '"\u2716"');
    });
  });

  describe('ShadowRenderer', () => {
    it('parses shadows correctly', () => {
      const parseShadow = (property: string, value: string, success: boolean) => {
        const stylePropertyTreeElement = getTreeElement(property, value);
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement, {allowMultipleChildren: true});

        assert.strictEqual(
            stylePropertyTreeElement.valueElement?.firstElementChild instanceof InlineEditor.Swatches.CSSShadowSwatch,
            success);
        assert.strictEqual(stylePropertyTreeElement.valueElement?.innerText, value);
      };

      const parseTextShadowSuccess = (value: string) => parseShadow('text-shadow', value, true);
      const parseTextShadowFailure = (value: string) => parseShadow('text-shadow', value, false);
      const parseBoxShadowSuccess = (value: string) => parseShadow('box-shadow', value, true);
      const parseBoxShadowFailure = (value: string) => parseShadow('box-shadow', value, false);

      parseTextShadowSuccess('0 0');
      parseTextShadowSuccess('1px 2px');
      parseTextShadowSuccess('1px 2px black');
      parseTextShadowSuccess('1px 2px 2px');
      parseTextShadowSuccess('rgb(0, 0, 0) 1px 2px 2px');
      parseTextShadowSuccess('1px 2px 2px rgb(0, 0, 0)');
      parseTextShadowSuccess('1px 2px black, 0 0 #ffffff');
      parseTextShadowSuccess('1px -2px black, 0 0 rgb(0, 0, 0), 3px 3.5px 3px');
      parseTextShadowSuccess('1px -2px black, 0 0 rgb(0, 0, 0), 3px 3.5px 3px !important');
      parseTextShadowSuccess('1px 2px black, , 0 0 #ffffff');

      parseTextShadowFailure('');
      parseTextShadowFailure('0');
      parseTextShadowFailure('1 2 black !important');
      parseTextShadowFailure('1px black 2px');
      parseTextShadowFailure('1px 2px 2px 3px');
      parseTextShadowFailure('inset 1px 2px 2px');
      parseTextShadowFailure('red 1px 2px 2px red');
      parseTextShadowFailure('1px 2px rgb(0, 0, 0) 2px');
      parseTextShadowFailure('hello 1px 2px');
      parseTextShadowFailure('1px 2px black 0 0 #ffffff');
      // TODO(crbug.com/40945390) Add coverage after rolling codemirror: parseTextShadowFailure('1px2px');
      parseTextShadowFailure('1px 2pxrgb(0, 0, 0)');

      parseBoxShadowSuccess('0 0');
      parseBoxShadowSuccess('1px 2px');
      parseBoxShadowSuccess('1px 2px black');
      parseBoxShadowSuccess('1px 2px 2px');
      parseBoxShadowSuccess('1px 2px 2px 3px');
      parseBoxShadowSuccess('inset 1px 2px');
      parseBoxShadowSuccess('1px 2px inset');
      parseBoxShadowSuccess('INSET 1px 2px 2px 3px');
      parseBoxShadowSuccess('rgb(0, 0, 0) 1px 2px 2px');
      parseBoxShadowSuccess('inset rgb(0, 0, 0) 1px 2px 2px');
      parseBoxShadowSuccess('inset 1px 2px 2px 3px rgb(0, 0, 0)');
      parseBoxShadowSuccess('1px 2px 2px 3px rgb(0, 0, 0) inset');
      parseBoxShadowSuccess('1px 2px black, inset 0 0 #ffffff');
      parseBoxShadowSuccess('1px -2px black, inset 0 0 rgb(0, 0, 0), 3px 3.5px 3px 4px');
      parseBoxShadowSuccess('1px 2px black, , 0 0 #ffffff');

      parseBoxShadowFailure('');
      parseBoxShadowFailure('0');
      parseBoxShadowFailure('1 2 black');
      parseBoxShadowFailure('1px black 2px');
      parseBoxShadowFailure('1px 2px 2px 3px 4px');
      parseBoxShadowFailure('1px 2px 2px inset 3px');
      parseBoxShadowFailure('inset 1px 2px 2px inset');
      parseBoxShadowFailure('1px 2px rgb(0, 0, 0) 2px');
      parseBoxShadowFailure('hello 1px 2px');
      parseBoxShadowFailure('1px 2px black 0 0 #ffffff');
      // TODO(crbug.com/40945390) Add coverage after rolling codemirror: parseBoxShadowFailure('1px2px');
      parseBoxShadowFailure('1px 2pxrgb(0, 0, 0)');
    });

    it('renders the shadow swatch and color swatch', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', 'inset 10px 10px blue');
      stylePropertyTreeElement.updateTitle();

      assert.instanceOf(
          stylePropertyTreeElement.valueElement?.firstElementChild, InlineEditor.Swatches.CSSShadowSwatch);
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(), 'blue');
    });

    it('renders multiple icons for multiple shadows', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', 'inset 10px 11px blue, notashadow, 6px 5px red');
      stylePropertyTreeElement.updateTitle();

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 2);
      assert.strictEqual((swatches[0].nextElementSibling as HTMLElement).innerText, 'inset 10px 11px blue');
      assert.strictEqual((swatches[1].nextElementSibling as HTMLElement).innerText, '6px 5px red');
    });

    it('correctly parses text-shadow', () => {
      const stylePropertyTreeElement =
          getTreeElement('text-shadow', 'inset 10px 11px blue, 6px 5px red, 5px 5px 0 0 yellow');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 1);
      assert.strictEqual((swatches[0].nextElementSibling as HTMLElement).innerText, '6px 5px red');
    });

    it('renders a color-mix child', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px 11px color-mix(in srgb, red, blue)');
      stylePropertyTreeElement.updateTitle();
      assert.instanceOf(
          stylePropertyTreeElement.valueElement?.firstElementChild, InlineEditor.Swatches.CSSShadowSwatch);
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-mix-swatch');
      assert.exists(swatches);
    });

    it('renders shadow icon in the presence of a var()', () => {
      mockVariableMap['--offset'] = '10px 10px';
      mockVariableMap['--shadow'] = '10px 10px blue';

      const stylePropertyTreeElement = getTreeElement('box-shadow', 'var(--offset) red, var(--shadow)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 2);
      assert.strictEqual((swatches[0].nextElementSibling as HTMLElement).innerText, 'var(--offset) red');
      assert.strictEqual((swatches[1].nextElementSibling as HTMLElement).innerText, 'var(--shadow)');
    });

    it('opens a shadow editor with the correct values', () => {
      mockVariableMap['--offset'] = '10px 10px';

      const stylePropertyTreeElement =
          getTreeElement('box-shadow', 'var(--offset) red, inset 8px 9px 10px 11px yellow');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 2);

      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');

      const editorProperties = (editor: InlineEditor.CSSShadowEditor.CSSShadowEditor): string[] =>
          Array.from(editor.contentElement.querySelectorAll('.shadow-editor-field'))
              .map(
                  field => field.querySelector('input')?.value ??
                      Array.from(field.querySelectorAll('button'))
                          .map(button => button.classList.contains('enabled') ? button.innerText : undefined)
                          .filter((b): b is string => Boolean(b)))
              .flat();

      {
        swatches[0].iconElement().click();
        sinon.assert.calledOnce(showPopoverStub);
        assert.instanceOf(showPopoverStub.args[0][0], InlineEditor.CSSShadowEditor.CSSShadowEditor);
        const editor = showPopoverStub.args[0][0];
        const text = editorProperties(editor);
        assert.deepEqual(text, ['Outset', '10px', '10px', '0', '0']);
      }

      {
        swatches[1].iconElement().click();
        sinon.assert.calledTwice(showPopoverStub);
        assert.instanceOf(showPopoverStub.args[1][0], InlineEditor.CSSShadowEditor.CSSShadowEditor);
        const editor = showPopoverStub.args[1][0];
        const text = editorProperties(editor);
        assert.deepEqual(text, ['Inset', '8px', '9px', '10px', '11px']);
      }
    });

    it('updates the style for shadow editor changes', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px 11px red');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 1);
      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');
      swatches[0].iconElement().click();
      sinon.assert.calledOnce(showPopoverStub);

      const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
      const button =
          showPopoverStub.args[0][0].contentElement.querySelector('.shadow-editor-button-right') as HTMLElement | null;
      button?.click();

      sinon.assert.calledOnceWithExactly(applyStyleTextStub, 'box-shadow: inset 10px 11px red', false);
    });

    it('updates the style for shadow editor changes and respects ordering', () => {
      mockVariableMap['--y-color'] = '11px red';
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px var(--y-color)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 1);
      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');
      swatches[0].iconElement().click();
      sinon.assert.calledOnce(showPopoverStub);

      const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
      const inputs = Array.from(showPopoverStub.args[0][0].contentElement.querySelectorAll('.shadow-editor-field'))
                         .map(field => field.querySelector('input'));
      assert.exists(inputs[3]);
      inputs[3].value = '13px';
      inputs[3].dispatchEvent(new InputEvent('input', {data: '13px'}));

      sinon.assert.calledOnceWithExactly(applyStyleTextStub, 'box-shadow: 10px 11px 13px red', false);
    });

    it('correctly builds and updates the shadow model', () => {
      mockVariableMap['--props'] = '12px 13px red';
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px 11px red, var(--props)');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 2);

      assert.isTrue(swatches[0].model().isBoxShadow());
      assert.isFalse(swatches[0].model().inset());
      assert.strictEqual(swatches[0].model().offsetX().asCSSText(), '10px');
      assert.strictEqual(swatches[0].model().offsetY().asCSSText(), '11px');
      assert.strictEqual(swatches[0].model().blurRadius().asCSSText(), '0');
      assert.strictEqual(swatches[0].model().spreadRadius().asCSSText(), '0');

      swatches[0].model().setSpreadRadius(new InlineEditor.CSSShadowEditor.CSSLength(8, 'px'));
      swatches[0].model().setBlurRadius(new InlineEditor.CSSShadowEditor.CSSLength(5, 'px'));
      assert.strictEqual(swatches[0].model().blurRadius().asCSSText(), '5px');
      assert.strictEqual(swatches[0].model().spreadRadius().asCSSText(), '8px');

      assert.isTrue(swatches[1].model().isBoxShadow());
      assert.isFalse(swatches[1].model().inset());
      assert.strictEqual(swatches[1].model().offsetX().asCSSText(), '12px');
      assert.strictEqual(swatches[1].model().offsetY().asCSSText(), '13px');
      assert.strictEqual(swatches[1].model().blurRadius().asCSSText(), '0');
      assert.strictEqual(swatches[1].model().spreadRadius().asCSSText(), '0');

      swatches[1].model().setBlurRadius(new InlineEditor.CSSShadowEditor.CSSLength(5, 'px'));
      swatches[1].model().setSpreadRadius(new InlineEditor.CSSShadowEditor.CSSLength(8, 'px'));
      assert.strictEqual(swatches[1].model().blurRadius().asCSSText(), '5px');
      assert.strictEqual(swatches[1].model().spreadRadius().asCSSText(), '8px');
    });

    class StubSyntaxNode implements CodeMirror.SyntaxNode {
      parent: CodeMirror.SyntaxNode|null = null;
      firstChild: CodeMirror.SyntaxNode|null = null;
      lastChild: CodeMirror.SyntaxNode|null = null;
      childAfter(): CodeMirror.SyntaxNode|null {
        return null;
      }
      childBefore(): CodeMirror.SyntaxNode|null {
        return null;
      }
      enter(): CodeMirror.SyntaxNode|null {
        return null;
      }
      nextSibling: CodeMirror.SyntaxNode|null = null;
      prevSibling: CodeMirror.SyntaxNode|null = null;
      cursor(): CodeMirror.TreeCursor {
        throw new Error('Method not implemented.');
      }
      resolve(): CodeMirror.SyntaxNode {
        return this;
      }
      resolveInner(): CodeMirror.SyntaxNode {
        return this;
      }
      enterUnfinishedNodesBefore(): CodeMirror.SyntaxNode {
        return this;
      }
      toTree(): CodeMirror.Tree {
        throw new Error('Method not implemented.');
      }
      getChild(): CodeMirror.SyntaxNode|null {
        throw new Error('Method not implemented.');
      }
      getChildren(): CodeMirror.SyntaxNode[] {
        throw new Error('Method not implemented.');
      }
      from = 0;
      to = 0;
      type = new CodeMirror.NodeType();
      name = '';
      tree: CodeMirror.Tree|null = null;
      node: CodeMirror.SyntaxNode = this;
      matchContext(): boolean {
        return false;
      }
    }

    it('shadow model renders text properties, authored properties, and computed text properties correctly', () => {
      const renderingContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
      const expansionContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
      const y = new StubSyntaxNode();
      const spread = new StubSyntaxNode();
      const blur = new StubSyntaxNode();
      const variable = new StubSyntaxNode();
      const properties = [
        {
          value: '10px',
          source: null,
          expansionContext: null,
          propertyType: Elements.StylePropertyTreeElement.ShadowPropertyType.X,
        },
        {
          value: y,
          source: null,
          expansionContext: null,
          propertyType: Elements.StylePropertyTreeElement.ShadowPropertyType.Y,
        },
        {
          value: blur,
          source: variable,
          expansionContext,
          propertyType: Elements.StylePropertyTreeElement.ShadowPropertyType.BLUR,
        },
        {
          value: spread,
          source: variable,
          expansionContext,
          propertyType: Elements.StylePropertyTreeElement.ShadowPropertyType.SPREAD,
        },
      ];

      sinon.stub(Elements.PropertyRenderer.Renderer, 'render').callsFake((nodeOrNodes, context) => {
        if (!Array.isArray(nodeOrNodes)) {
          nodeOrNodes = [nodeOrNodes];
        }
        const nodes = nodeOrNodes
                          .map(node => {
                            switch (node) {
                              case y:
                                return context === renderingContext && document.createTextNode('y');
                              case blur:
                                return context === expansionContext && document.createTextNode('blur');
                              case spread:
                                return context === expansionContext && document.createTextNode('spread');
                              case variable:
                                return context === renderingContext && document.createTextNode('var()');
                              default:
                                return undefined;
                            }
                          })
                          .filter(b => !!b);
        return {
          nodes,
          nodeGroups: [nodes],
          cssControls: new Map(),
        };
      });
      const model = new Elements.StylePropertyTreeElement.ShadowModel(
          SDK.CSSPropertyParserMatchers.ShadowType.BOX_SHADOW, properties, renderingContext);

      const container = document.createElement('div');
      model.renderContents(container);
      assert.strictEqual(container.innerText, '10px y var()');

      model.setBlurRadius(new InlineEditor.CSSShadowEditor.CSSLength(12, 'px'));
      model.renderContents(container);
      assert.strictEqual(container.innerText, '10px y 12px spread');
      assert.deepEqual(properties.map(p => p.source), [null, null, null, null]);
    });
  });

  describe('AnchorFunctionRenderer', () => {
    let revealStub: sinon.SinonStub;
    let hideDOMNodeHighlightStub: sinon.SinonStub;
    let highlightMock: sinon.SinonExpectation;
    let fakeParentNode: SDK.DOMModel.DOMNode;
    let fakeDOMNode: SDK.DOMModel.DOMNode;

    beforeEach(() => {
      fakeParentNode = {
        localName() {
          return 'span';
        },
        isSVGNode() {
          return false;
        },
        getAnchorBySpecifier() {
          return Promise.resolve(fakeDOMNode);
        },
      } as SDK.DOMModel.DOMNode;

      fakeDOMNode = {
        localName() {
          return 'span';
        },
        isSVGNode() {
          return false;
        },
        highlight() {
          highlightMock();
        },
      } as SDK.DOMModel.DOMNode;
      highlightMock = sinon.mock();
      revealStub = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');
      hideDOMNodeHighlightStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');
      setMockConnectionResponseHandler('DOM.getAnchorElement', () => ({result: undefined}));
    });

    it('renders anchor() function correctly', async () => {
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(top)');

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement!.innerText, 'anchor(top)');
    });

    it('renders `AnchorFunctionLinkSwatch` after decorating the element', async () => {
      const waitForDecorationPromise =
          spyCall(Elements.StylePropertyTreeElement.AnchorFunctionRenderer, 'decorateAnchorForAnchorLink');
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylePropertyTreeElement, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await (await waitForDecorationPromise).result;
      const anchorFunctionLinkSwatch = stylePropertyTreeElement.valueElement!.querySelector('devtools-link-swatch')!;

      renderElementIntoDOM(anchorFunctionLinkSwatch);
      assert.strictEqual(anchorFunctionLinkSwatch.linkElement?.textContent, '--identifier');
    });

    it('should highlight node when `onMouseEnter` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise =
          spyCall(Elements.StylePropertyTreeElement.AnchorFunctionRenderer, 'decorateAnchorForAnchorLink');
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylesSidebarPane, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await (await waitForDecorationPromise).result;
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const anchorFunctionLinkSwatch = stylePropertyTreeElement.valueElement.querySelector('devtools-link-swatch')!;
      anchorFunctionLinkSwatch.dispatchEvent(new Event('mouseenter'));

      sinon.assert.calledOnce(highlightMock);
    });

    it('should clear DOM highlight when `onMouseLeave` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise =
          spyCall(Elements.StylePropertyTreeElement.AnchorFunctionRenderer, 'decorateAnchorForAnchorLink');
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylesSidebarPane, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await (await waitForDecorationPromise).result;
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const anchorFunctionLinkSwatch = stylePropertyTreeElement.valueElement!.querySelector('devtools-link-swatch')!;
      anchorFunctionLinkSwatch.dispatchEvent(new Event('mouseleave'));

      sinon.assert.calledOnce(hideDOMNodeHighlightStub);
    });

    it('should reveal anchor node when `onLinkActivate` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise =
          spyCall(Elements.StylePropertyTreeElement.AnchorFunctionRenderer, 'decorateAnchorForAnchorLink');
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylesSidebarPane, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await (await waitForDecorationPromise).result;
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);
      const anchorFunctionLinkSwatch = stylePropertyTreeElement.valueElement!.querySelector('devtools-link-swatch')!;
      anchorFunctionLinkSwatch.linkElement?.click();

      sinon.assert.calledOnce(revealStub);
      sinon.assert.calledWith(revealStub, fakeDOMNode);
    });

    async function createAnchorFunctionLinkSwatch(
        data: {identifier: string|undefined, anchorNode: SinonStubbedInstance<SDK.DOMModel.DOMNode>|undefined}):
        Promise<HTMLDivElement> {
      sinon.stub(stylesSidebarPane.node()!, 'getAnchorBySpecifier').resolves(data.anchorNode);
      const content = document.createElement('div');
      await Elements.StylePropertyTreeElement.AnchorFunctionRenderer.decorateAnchorForAnchorLink(
          stylesSidebarPane, content, data);
      return content;
    }

    describe('when identifier exists', () => {
      let linkSwatchDataStub: {set: sinon.SinonSpy};

      beforeEach(() => {
        linkSwatchDataStub = sinon.spy(InlineEditor.LinkSwatch.LinkSwatch.prototype, 'data', ['set']);
      });

      it('should render a defined link when `anchorNode` is resolved correctly', async () => {
        const data = {
          identifier: '--identifier',
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        await createAnchorFunctionLinkSwatch(data);

        sinon.assert.calledWith(linkSwatchDataStub.set, {
          text: data.identifier,
          isDefined: true,
          tooltip: undefined,
          jslogContext: 'anchor-link',
          onLinkActivate: sinon.match.func,
        });
      });

      it('should render an undefined link when `anchorNode` is not resolved correctly', async () => {
        const data = {
          identifier: '--identifier',
          anchorNode: undefined,
        };
        await createAnchorFunctionLinkSwatch(data);

        sinon.assert.calledWith(linkSwatchDataStub.set, {
          text: data.identifier,
          isDefined: false,
          tooltip: {title: '--identifier is not defined'},
          jslogContext: 'anchor-link',
          onLinkActivate: sinon.match.func,
        });
      });

      it('should call `onMouseEnter` when mouse enters linkSwatch', async () => {
        const data = {
          identifier: '--identifier',
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };

        const linkSwatch = await createAnchorFunctionLinkSwatch(data);
        linkSwatch.querySelector('devtools-link-swatch')?.dispatchEvent(new Event('mouseenter'));

        sinon.assert.calledOnce(data.anchorNode.highlight);
      });

      it('should call `onMouseLeave` when mouse leaves linkSwatch', async () => {
        const data = {
          identifier: '--identifier',
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        const linkSwatch = await createAnchorFunctionLinkSwatch(data);
        linkSwatch.querySelector('devtools-link-swatch')?.dispatchEvent(new Event('mouseleave'));

        sinon.assert.calledOnce(hideDOMNodeHighlightStub);
      });
    });

    describe('when identifier does not exist', () => {
      it('should not render anything when `anchorNode` is not resolved correctly', async () => {
        const data = {
          identifier: undefined,
          anchorNode: undefined,
        };
        const component = await createAnchorFunctionLinkSwatch(data);

        assert.isEmpty(component.innerHTML);
      });

      it('should render icon link when `anchorNode` is resolved correctly', async () => {
        const data = {
          identifier: undefined,
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        const component = await createAnchorFunctionLinkSwatch(data);

        const icon = component?.querySelector('devtools-icon');

        assert.exists(icon);
      });

      it('should call `onMouseEnter` when mouse enters the icon', async () => {
        const data = {
          identifier: undefined,
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        const component = await createAnchorFunctionLinkSwatch(data);

        const icon = component?.querySelector('devtools-icon')!;
        icon?.dispatchEvent(new Event('mouseenter'));

        sinon.assert.calledOnce(data.anchorNode.highlight);
      });

      it('should call `onMouseLeave` when mouse leaves the icon', async () => {
        const data = {
          identifier: undefined,
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        const component = await createAnchorFunctionLinkSwatch(data);

        const icon = component?.querySelector('devtools-icon')!;
        icon?.dispatchEvent(new Event('mouseleave'));

        sinon.assert.calledOnce(hideDOMNodeHighlightStub);
      });

      it('should call `onLinkActivate` when clicking on the icon', async () => {
        const data = {
          identifier: undefined,
          anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        };
        const component = await createAnchorFunctionLinkSwatch(data);

        const icon = component?.querySelector('devtools-icon')!;
        icon?.dispatchEvent(new Event('click'));

        sinon.assert.calledOnce(revealStub);
        assert.strictEqual(revealStub.args[0][0], data.anchorNode);
      });
    });
  });

  describe('AnchorFunctionRenderer', () => {
    let highlightMock: sinon.SinonExpectation;
    let fakeDOMNode: SDK.DOMModel.DOMNode;

    beforeEach(() => {
      fakeDOMNode = {
        localName() {
          return 'span';
        },
        isSVGNode() {
          return false;
        },
        highlight() {
          highlightMock();
        },
      } as SDK.DOMModel.DOMNode;
      highlightMock = sinon.mock();
      sinon.stub(SDK.DOMModel.DOMNode.prototype, 'getAnchorBySpecifier').resolves(fakeDOMNode);
    });

    it('renders `position-anchor` property correctly before anchor is decorated', async () => {
      const stylePropertyTreeElement = getTreeElement('position-anchor', '--anchor');

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement!.innerText, '--anchor');
    });

    it('renders `position-anchor` property correctly after anchor is decorated', async () => {
      const waitForDecorationPromise =
          spyCall(Elements.StylePropertyTreeElement.AnchorFunctionRenderer, 'decorateAnchorForAnchorLink');
      const stylePropertyTreeElement = getTreeElement('position-anchor', '--anchor');

      stylePropertyTreeElement.updateTitle();
      await (await waitForDecorationPromise).result;

      const anchorFunctionLinkSwatch = stylePropertyTreeElement.valueElement!.querySelector('devtools-link-swatch');
      assert.exists(anchorFunctionLinkSwatch);
    });
  });

  describe('LightDarkColorRenderer', () => {
    it('renders light-dark correctly', async () => {
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      const resolvePropertySpy = sinon.spy(SDK.CSSMatchedStyles.CSSMatchedStyles.prototype, 'resolveProperty');
      const colorSchemeProperty = addProperty('color-scheme', 'light dark');

      async function check(colorScheme: SDK.CSSModel.ColorScheme, lightText: string, darkText: string) {
        const variableName = (text: string) => text.substring('var('.length, text.length - 1);
        const lightDark = `light-dark(${lightText}, ${darkText})`;
        colorSchemeProperty.setLocalValue(colorScheme);
        resolvePropertySpy.resetHistory();
        const stylePropertyTreeElement = getTreeElement('color', lightDark);
        stylePropertyTreeElement.updateTitle();
        await Promise.all(colorSchemeSpy.returnValues);

        sinon.assert.calledOnceWithExactly(
            resolvePropertySpy, 'color-scheme', stylePropertyTreeElement.property.ownerStyle);

        assert.exists(stylePropertyTreeElement.valueElement);
        const swatches = stylePropertyTreeElement.valueElement.querySelectorAll('devtools-color-swatch');
        assert.exists(swatches);
        assert.lengthOf(swatches, 3);
        const [swatch, light, dark] = swatches;
        renderElementIntoDOM(stylePropertyTreeElement.valueElement);
        assert.strictEqual((swatch?.nextElementSibling as HTMLElement | null)?.innerText, lightDark);
        const activeColor = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? lightText : darkText;
        assert.strictEqual(
            swatch.getColor()?.getAuthoredText(), mockVariableMap[variableName(activeColor)] ?? activeColor);
        const active = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? light : dark;
        const inactive = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? dark : light;
        assert.isTrue(inactive.parentElement?.classList.contains('inactive-value'));
        assert.isFalse(active.parentElement?.classList.contains('inactive-value'));
        stylePropertyTreeElement.valueElement.remove();
      }

      await check(SDK.CSSModel.ColorScheme.LIGHT, 'red', 'blue');
      await check(SDK.CSSModel.ColorScheme.DARK, 'red', 'blue');
      await check(SDK.CSSModel.ColorScheme.LIGHT, 'red', 'var(--blue)');
      await check(SDK.CSSModel.ColorScheme.DARK, 'red', 'var(--blue)');
      await check(SDK.CSSModel.ColorScheme.LIGHT, 'var(--blue)', 'red');
      await check(SDK.CSSModel.ColorScheme.DARK, 'var(--blue)', 'red');
    });

    it('renders light-dark correctly if the color scheme cannot be resolved', async () => {
      const lightDark = 'light-dark(red, blue)';
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      sinon.stub(stylesSidebarPane, 'cssModel').returns(cssModel);
      cssModel.colorScheme.resolves(undefined);
      addProperty('color-scheme', 'light dark');
      const stylePropertyTreeElement = getTreeElement('color', lightDark);
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      stylePropertyTreeElement.updateTitle();
      await Promise.all(colorSchemeSpy.returnValues);

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 3);
      assert.isNull(swatches[0].getColor());
      assert.strictEqual(swatches[0].nextElementSibling?.textContent, 'light-dark(red, blue)');
      assert.strictEqual(swatches[1].nextElementSibling?.textContent, 'red');
      assert.strictEqual(swatches[2].nextElementSibling?.textContent, 'blue');
    });

    it('renders light-dark without color-scheme correctly', async () => {
      const lightDark = 'light-dark(red, blue)';
      const stylePropertyTreeElement = getTreeElement('color', lightDark);
      // leave color-scheme unset
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      stylePropertyTreeElement.updateTitle();
      await Promise.all(colorSchemeSpy.returnValues);

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 3);
      assert.strictEqual(swatches[0].getText(), 'red');
      assert.strictEqual(swatches[0].nextElementSibling?.textContent, 'light-dark(red, blue)');
      assert.strictEqual(swatches[1].nextElementSibling?.textContent, 'red');
      assert.strictEqual(swatches[2].nextElementSibling?.textContent, 'blue');
    });

    it('renders light-dark with undefined vars correctly', async () => {
      const lightDark = 'light-dark(red, var(--undefined))';
      addProperty('color-scheme', 'light dark');
      const stylePropertyTreeElement = getTreeElement('color', lightDark);
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      stylePropertyTreeElement.updateTitle();
      await Promise.all(colorSchemeSpy.returnValues);

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 1);
      assert.strictEqual(swatches[0].nextElementSibling?.textContent, 'red');
      assert.strictEqual(swatches[0].parentElement?.style.textDecoration, '');
    });

    it('connects inner and outer swatches', async () => {
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      const colorSchemeProperty = addProperty('color-scheme', 'light dark');
      for (const colorScheme of [SDK.CSSModel.ColorScheme.LIGHT, SDK.CSSModel.ColorScheme.DARK]) {
        const lightDark = 'light-dark(red, blue)';
        colorSchemeProperty.setLocalValue(colorScheme);
        const stylePropertyTreeElement = getTreeElement('color', lightDark);
        stylePropertyTreeElement.updateTitle();
        await Promise.all(colorSchemeSpy.returnValues);

        const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
        assert.exists(swatches);
        assert.lengthOf(swatches, 3);
        const [outerSwatch, lightSwatch, darkSwatch] = swatches;
        const newLightColor = Common.Color.parse('white') as Common.Color.Color;
        const newDarkColor = Common.Color.parse('black') as Common.Color.Color;
        lightSwatch.setColor(newLightColor);
        darkSwatch.setColor(newDarkColor);

        if (colorScheme === SDK.CSSModel.ColorScheme.DARK) {
          assert.strictEqual(outerSwatch.getColor(), newDarkColor);
        } else {
          assert.strictEqual(outerSwatch.getColor(), newLightColor);
        }
      }
    });
  });

  describe('LinearGradientRenderer', () => {
    it('correctly connects to an angle match', () => {
      const stylePropertyTreeElement = getTreeElement('background', 'linear-gradient(45deg, red, var(--blue))');
      stylePropertyTreeElement.updateTitle();
      const swatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-angle');
      assert.exists(swatch);
      swatch.data = {
        angleText: swatch.innerText ?? '',
        containingPane: document.createElement('div'),
      };

      sinon.stub(swatch, 'dispatchEvent');
      swatch.popOver();
      const popover = swatch.querySelector('devtools-css-angle-editor');
      assert.exists(popover);
      const clock = popover.shadowRoot?.querySelector<HTMLElement>('.clock');
      assert.exists(clock);
      assert.strictEqual(clock.style.background, 'linear-gradient(45deg, red, blue)');
    });
  });

  describe('CSSWideKeywordRenderer', () => {
    function mockResolvedKeyword(propertyName: string, _keyword: SDK.CSSMetadata.CSSWideKeyword, propertyValue = ''):
        sinon.SinonStubbedInstance<SDK.CSSProperty.CSSProperty> {
      const originalDeclaration = sinon.createStubInstance(SDK.CSSProperty.CSSProperty);
      sinon.stub(matchedStyles, 'resolveGlobalKeyword')
          .callsFake(
              (property, keyword) => property.name === propertyName && property.value === keyword ?
                  new SDK.CSSMatchedStyles.CSSValueSource(originalDeclaration) :
                  null);
      originalDeclaration.name = propertyName;
      originalDeclaration.value = propertyValue;
      originalDeclaration.ownerStyle = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
      return originalDeclaration;
    }

    it('linkifies keywords to the referenced declarations', () => {
      const keyword = SDK.CSSMetadata.CSSWideKeywords[0];
      const originalDeclaration = mockResolvedKeyword('width', keyword);
      const stylePropertyTreeElement = getTreeElement(originalDeclaration.name, keyword);
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      const linkSwatch = stylePropertyTreeElement.valueElement.querySelector('devtools-link-swatch');
      assert.isOk(linkSwatch);
      assert.strictEqual(linkSwatch.innerText, keyword);
      const spy = sinon.spy(stylePropertyTreeElement.parentPane(), 'revealProperty');
      (linkSwatch.querySelector('button') as HTMLElement | undefined)?.click();
      sinon.assert.calledOnceWithExactly(spy, originalDeclaration);
    });

    it('shows non-existant referenced declarations as unlinked', () => {
      const stylePropertyTreeElement = getTreeElement('width', SDK.CSSMetadata.CSSWideKeywords[0]);
      stylePropertyTreeElement.updateTitle();
      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.isNotOk(linkSwatch);
    });

    it('renders colors', () => {
      const keyword = SDK.CSSMetadata.CSSWideKeywords[0];
      const originalDeclaration = mockResolvedKeyword('color', keyword, 'red');
      const stylePropertyTreeElement = getTreeElement(originalDeclaration.name, keyword);
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.isOk(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(), 'red');
    });

    it('does not render inside function rules', async () => {
      const stylePropertyTreeElement = await getTreeElementForFunctionRule('--func', 'initial');
      stylePropertyTreeElement.updateTitle();
      assert.notExists(stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch'));
    });
  });

  describe('PositionTryRenderer', () => {
    it('renders the position-try fallback values with correct styles', () => {
      sinon.stub(matchedStyles, 'activePositionFallbackIndex').returns(1);
      sinon.stub(matchedStyles, 'positionTryRules').returns([]);
      const stylePropertyTreeElement = getTreeElement('position-try-fallbacks', '--top, --left, --bottom');
      stylePropertyTreeElement.updateTitle();
      const values = stylePropertyTreeElement.valueElement?.querySelectorAll(':scope > span');
      assert.exists(values);
      assert.strictEqual(values?.length, 3);
      assert.isTrue(values[0].classList.contains('inactive-value'));
      assert.isFalse(values[1].classList.contains('inactive-value'));
      assert.isTrue(values[2].classList.contains('inactive-value'));
    });

    it('renders the position-try correctly with keyword', () => {
      sinon.stub(matchedStyles, 'activePositionFallbackIndex').returns(1);
      sinon.stub(matchedStyles, 'positionTryRules').returns([]);
      const stylePropertyTreeElement =
          getTreeElement('position-try', '/* comment */ most-height --top, --left, --bottom');
      stylePropertyTreeElement.updateTitle();
      const values =
          stylePropertyTreeElement.valueElement?.querySelectorAll(':scope > span:has(> devtools-link-swatch)');
      assert.exists(values);
      assert.strictEqual(values?.length, 3);
      assert.isTrue(values[0].classList.contains('inactive-value'));
      assert.isFalse(values[1].classList.contains('inactive-value'));
      assert.isTrue(values[2].classList.contains('inactive-value'));
    });
  });

  describe('LengthRenderer', () => {
    it('shows a popover with pixel values for relative units', async () => {
      setMockConnectionResponseHandler(
          'CSS.resolveValues',
          (request: Protocol.CSS.ResolveValuesRequest) =>
              ({results: request.values.map(v => v === '2em' ? '15px' : v)}));
      const cssModel = new SDK.CSSModel.CSSModel(createTarget());
      const domModel = cssModel.domModel();
      const node = new SDK.DOMModel.DOMNode(domModel);
      node.id = 0 as Protocol.DOM.NodeId;
      LegacyUI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      const addPopoverPromise = Promise.withResolvers<void>();
      sinon.stub(Elements.StylePropertyTreeElement.LengthRenderer.prototype, 'popOverAttachedForTest')
          .callsFake(() => addPopoverPromise.resolve());
      const stylePropertyTreeElement = getTreeElement('property', '5px 2em');
      setMockConnectionResponseHandler('CSS.getComputedStyleForNode', () => ({computedStyle: {}}));

      await stylePropertyTreeElement.onpopulate();
      stylePropertyTreeElement.updateTitle();
      await addPopoverPromise.promise;
      const popover = stylePropertyTreeElement.valueElement?.querySelector('devtools-tooltip');
      assert.strictEqual(popover?.innerText, '15px');
    });

    it('passes the property name to evaluations', async () => {
      const cssModel = stylesSidebarPane.cssModel();
      assert.exists(cssModel);
      const resolveValuesStub = sinon.stub(cssModel, 'resolveValues').resolves([]);
      const stylePropertyTreeElement = getTreeElement('left', '2%');
      stylePropertyTreeElement.updateTitle();

      sinon.assert.calledOnce(resolveValuesStub);
      assert.strictEqual(resolveValuesStub.args[0][0], 'left');
    });

    it('uses the right longhand name in length shorthands', () => {
      const cssModel = stylesSidebarPane.cssModel();
      assert.exists(cssModel);
      const resolveValuesStub = sinon.stub(cssModel, 'resolveValues').resolves([]);

      for (const shorthand of Elements.StylePropertyTreeElement.SHORTHANDS_FOR_PERCENTAGES) {
        const longhands = SDK.CSSMetadata.cssMetadata().getLonghands(shorthand);
        assert.exists(longhands);
        const stylePropertyTreeElement = getTreeElement(shorthand, longhands.map((_, i) => `${i * 2}%`).join(' '));
        stylePropertyTreeElement.updateTitle();

        const args = resolveValuesStub.args.map(args => args[0]);
        assert.deepEqual(args, longhands);
        resolveValuesStub.resetHistory();
      }
    });

    it('uses the right longhand name in length shorthands inside of substitutions during tracing', async () => {
      const cssModel = stylesSidebarPane.cssModel();
      assert.exists(cssModel);
      const resolveValuesStub = sinon.stub(cssModel, 'resolveValues').callsFake((name, nodeId, ...values) => {
        return Promise.resolve(values.map(v => v === '20%' ? '100px' : v));
      });

      const customPropertyDef = addProperty('--left', '20%');
      mockVariableMap['--left'] = customPropertyDef;
      const stylePropertyTreeElement = getTreeElement('padding', '10px var(--left)');
      stylePropertyTreeElement.updateTitle();

      assert.exists(stylePropertyTreeElement.valueElement);
      renderElementIntoDOM(stylePropertyTreeElement.valueElement);

      const tooltip = stylePropertyTreeElement.valueElement.querySelector('devtools-tooltip');
      const performUpdateStub = sinon.stub(Elements.CSSValueTraceView.CSSValueTraceView.prototype, 'performUpdate');
      const performUpdatePromise = new Promise<void>(resolve => performUpdateStub.callsFake(() => {
        performUpdateStub.callThrough();
        resolve();
      }));
      tooltip?.showPopover();
      await performUpdatePromise;
      const args = resolveValuesStub.args.map(args => args[0]);
      assert.deepEqual(args, ['padding-right']);
      resolveValuesStub.resetHistory();
    });
  });

  describe('MathFunctionRenderer', () => {
    it('strikes out non-selected values', async () => {
      setMockConnectionResponseHandler(
          'CSS.resolveValues',
          (request: Protocol.CSS.ResolveValuesRequest) => ({
            results: request.values.map(
                value => value.startsWith('min') ? '4px' : value.trim().replaceAll(/(em|pt)$/g, 'px'))
          }));
      const strikeOutSpy =
          sinon.spy(Elements.StylePropertyTreeElement.MathFunctionRenderer.prototype, 'applyMathFunction');
      const stylePropertyTreeElement = getTreeElement('width', 'min(5em, 4px, 8pt)');
      stylePropertyTreeElement.updateTitle();

      sinon.assert.calledOnce(strikeOutSpy);
      await strikeOutSpy.returnValues[0];
      const args = stylePropertyTreeElement.valueElement?.querySelectorAll(
                       ':scope > span > span:not(.tracing-anchor)') as NodeListOf<HTMLSpanElement>;
      assert.lengthOf(args, 3);
      assert.deepEqual(
          Array.from(args.values()).map(arg => arg.classList.contains('inactive-value')), [true, false, true]);
    });

    it('shows a value tracing tooltip on the calc function', async () => {
      for (const property of ['calc(1px + 2px)', 'min(1px, 2px)', 'max(3px, 1px)']) {
        const stylePropertyTreeElement = getTreeElement('width', property);
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);
        renderElementIntoDOM(stylePropertyTreeElement.valueElement);
        const tooltip = stylePropertyTreeElement.valueElement.querySelector('devtools-tooltip');
        assert.exists(tooltip);
        const widget = tooltip.firstElementChild && LegacyUI.Widget.Widget.get(tooltip.firstElementChild);
        assert.instanceOf(widget, Elements.CSSValueTraceView.CSSValueTraceView);
        stylePropertyTreeElement.valueElement.remove();
      }
    });

    it('shows the original text during tracing when evaluation fails', async () => {
      setMockConnectionResponseHandler(
          'CSS.resolveValues',
          (request: Protocol.CSS.ResolveValuesRequest) => ({results: request.values.map(() => '')}));
      const evaluationSpy =
          sinon.spy(Elements.StylePropertyTreeElement.MathFunctionRenderer.prototype, 'applyEvaluation');
      const property = addProperty('width', 'calc(1 + 1)');

      const view = new Elements.CSSValueTraceView.CSSValueTraceView(undefined, () => {});
      await view.showTrace(
          property, null, matchedStyles, new Map(),
          Elements.StylePropertyTreeElement.getPropertyRenderers(
              property.name, property.ownerStyle, stylesSidebarPane, matchedStyles, null, new Map()),
          false, 0, false);

      sinon.assert.calledOnce(evaluationSpy);
      const originalText = evaluationSpy.args[0][0].textContent;
      await evaluationSpy.returnValues[0];
      assert.strictEqual(originalText, evaluationSpy.args[0][0].textContent);
    });

    it('shows the original text during tracing when evaluation fails', async () => {
      const cssModel = stylesSidebarPane.cssModel();
      assert.exists(cssModel);
      const resolveValuesStub = sinon.stub(cssModel, 'resolveValues').resolves([]);
      const property = addProperty('width', 'calc(1 + 1)');

      const view = new Elements.CSSValueTraceView.CSSValueTraceView(undefined, () => {});
      await view.showTrace(
          property, null, matchedStyles, new Map(),
          Elements.StylePropertyTreeElement.getPropertyRenderers(
              property.name, property.ownerStyle, stylesSidebarPane, matchedStyles, null, new Map()),
          false, 0, false);

      sinon.assert.calledOnce(resolveValuesStub);
      assert.strictEqual(resolveValuesStub.args[0][0], 'width');
    });
  });

  describe('AutoBaseRenderer', () => {
    it('strikes out non-selected values', async () => {
      const stylePropertyTreeElement = getTreeElement('display', '-internal-auto-base(inline, block)');

      stylePropertyTreeElement.updateTitle();

      let args = stylePropertyTreeElement.valueElement?.querySelectorAll('span') as NodeListOf<HTMLSpanElement>;
      assert.lengthOf(args, 5);
      assert.deepEqual(
          Array.from(args.values()).map(arg => arg.classList.contains('inactive-value')),
          [false, false, false, true, false]);

      stylePropertyTreeElement.setComputedStyles(new Map([['appearance', 'base-select']]));
      stylePropertyTreeElement.updateTitle();

      args = stylePropertyTreeElement.valueElement?.querySelectorAll('span') as NodeListOf<HTMLSpanElement>;
      assert.lengthOf(args, 5);
      assert.deepEqual(
          Array.from(args.values()).map(arg => arg.classList.contains('inactive-value')),
          [false, true, false, false, false]);
    });
  });

  describe('EnvFunctionRenderer', () => {
    it('strikes out non-selected values', async () => {
      const stylePropertyTreeElement = getTreeElement('--env', 'env(a, b) env(c, b)');
      stylePropertyTreeElement.updateTitle();

      const args = stylePropertyTreeElement.valueElement?.querySelectorAll('span')
                       .values()
                       .filter(span => ['a', 'b', 'c'].includes(span.textContent ?? ''))
                       .toArray();
      assert.exists(args);
      assert.lengthOf(args, 4);
      assert.deepEqual(
          Array.from(args.values()).map(arg => arg.classList.contains('inactive-value')), [false, true, true, false]);
    });

    it('shows a value tracing tooltip', async () => {
      const stylePropertyTreeElement = getTreeElement('--env', 'env(a, b) env(c, b)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);
      const tooltips = stylePropertyTreeElement.valueElement.querySelectorAll('devtools-tooltip');
      assert.lengthOf(tooltips, 2);
      const anchors = stylePropertyTreeElement.valueElement.querySelectorAll('.tracing-anchor');
      assert.lengthOf(anchors, 2);
      assert.deepEqual(anchors.values().map(anchor => anchor.textContent).toArray(), ['env', 'env']);
    });
  });

  describe('Autocompletion', function(this: Mocha.Suite) {
    let promptStub: sinon.SinonStub<Parameters<Elements.StylesSidebarPane.CSSPropertyPrompt['initialize']>>;
    beforeEach(async () => {
      promptStub = sinon.stub(Elements.StylesSidebarPane.CSSPropertyPrompt.prototype, 'initialize').resolves([]);

      const gridNode = LegacyUI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
      const currentNode = new SDK.DOMModel.DOMNode(cssModel.domModel());
      currentNode.id = 1 as Protocol.DOM.NodeId;
      currentNode.parentNode = gridNode;
      LegacyUI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, currentNode);
    });

    function suggestions() {
      assert.lengthOf(promptStub.args, 1);
      return promptStub.args[0][0].call(null, '', '');
    }

    function setParentComputedStyle(style: Record<string, string>) {
      const computedStyle = Object.keys(style).map(name => ({name, value: style[name]}));
      setMockConnectionResponseHandler('CSS.getComputedStyleForNode', ({nodeId}) => {
        if (nodeId === 0) {
          return {computedStyle};
        }
        return {};
      });
    }

    it('includes grid row names', async () => {
      setParentComputedStyle({display: 'grid', 'grid-template-rows': '[row-name] 1fr [row-name-2]'});
      const stylePropertyTreeElement = getTreeElement('grid-row', 'somename');
      await stylePropertyTreeElement.onpopulate();
      stylePropertyTreeElement.updateTitle();
      stylePropertyTreeElement.startEditingValue();
      const autocompletions = await suggestions();
      assert.deepEqual(
          autocompletions.map(({text}) => text),
          ['row-name', 'row-name-2', 'auto', 'none', 'inherit', 'initial', 'revert', 'revert-layer', 'unset']);
    });

    it('includes grid column names', async () => {
      setParentComputedStyle({display: 'grid', 'grid-template-columns': '[col-name] 1fr [col-name-2]'});
      const stylePropertyTreeElement = getTreeElement('grid-column', 'somename');
      await stylePropertyTreeElement.onpopulate();
      stylePropertyTreeElement.updateTitle();
      stylePropertyTreeElement.startEditingValue();
      const autocompletions = await suggestions();
      assert.deepEqual(
          autocompletions.map(({text}) => text),
          ['col-name', 'col-name-2', 'auto', 'none', 'inherit', 'initial', 'revert', 'revert-layer', 'unset']);
    });

    it('includes grid area names', async () => {
      setParentComputedStyle({display: 'grid', 'grid-template-areas': '"area-name-a area-name-b" "area-name-c ."'});
      const stylePropertyTreeElement = getTreeElement('grid-area', 'somename');
      await stylePropertyTreeElement.onpopulate();
      stylePropertyTreeElement.updateTitle();
      stylePropertyTreeElement.startEditingValue();
      const autocompletions = await suggestions();
      assert.deepEqual(autocompletions.map(({text}) => text), [
        'area-name-a',
        'area-name-b',
        'area-name-c',
        'auto',
        'none',
        'inherit',
        'initial',
        'revert',
        'revert-layer',
        'unset',
      ]);
    });
  });

  it('reopens open tooltips on updates', async () => {
    const openTooltipStub = sinon.stub(Tooltips.Tooltip.Tooltip.prototype, 'showPopover');
    const openTooltipPromise1 = new Promise<void>(r => openTooltipStub.callsFake(r));
    const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, red, blue)');
    stylePropertyTreeElement.updateTitle();
    const tooltip = stylePropertyTreeElement.valueElement?.querySelector(
                        'devtools-tooltip:not([jslogcontext="elements.css-value-trace"])') as Tooltips.Tooltip.Tooltip |
        null | undefined;
    assert.exists(tooltip);
    renderElementIntoDOM(tooltip);
    tooltip.showTooltip();
    await openTooltipPromise1;
    tooltip.remove();

    const openTooltipPromise2 = new Promise<void>(r => openTooltipStub.callsFake(r));
    stylePropertyTreeElement.updateTitle();
    const tooltip2 =
        stylePropertyTreeElement.valueElement?.querySelector(
            'devtools-tooltip:not([jslogcontext="elements.css-value-trace"])') as Tooltips.Tooltip.Tooltip |
        null | undefined;
    assert.exists(tooltip2);
    renderElementIntoDOM(tooltip2);
    await openTooltipPromise2;
    assert.notStrictEqual(tooltip, tooltip2);
  });

  it('shows a property docs tooltip', async () => {
    const webCustomDataStub = sinon.createStubInstance(Elements.WebCustomData.WebCustomData);
    webCustomDataStub.findCssProperty.returns({name: 'color', description: 'test color'});
    sinon.stub(stylesSidebarPane, 'webCustomData').get(() => webCustomDataStub);
    Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').set(false);
    const treeElementWithoutTooltip = getTreeElement('color', 'blue');
    treeElementWithoutTooltip.treeOutline = new LegacyUI.TreeOutline.TreeOutline();
    treeElementWithoutTooltip.updateTitle();
    assert.notExists(treeElementWithoutTooltip.listItemElement.querySelector(
        'devtools-tooltip[jslogcontext="elements.css-property-doc"]'));

    Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').set(true);
    const treeElementWithTooltip = getTreeElement('color', 'blue');
    treeElementWithTooltip.treeOutline = new LegacyUI.TreeOutline.TreeOutline();
    treeElementWithTooltip.updateTitle();
    renderElementIntoDOM(treeElementWithTooltip.listItemElement);
    const tooltip = treeElementWithTooltip.listItemElement.querySelector(
        'devtools-tooltip[jslogcontext="elements.css-property-doc"]');
    assert.instanceOf(tooltip, Tooltips.Tooltip.Tooltip);

    tooltip.showPopover();
    assert.isTrue(tooltip.open);
    tooltip.hidePopover();
    assert.isFalse(tooltip.open);

    Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').set(false);
    tooltip.showPopover();
    assert.isFalse(tooltip.open);
  });

  it('does not show a variable tooltip on custom property names in function rules', async () => {
    const stylePropertyTreeElement = await getTreeElementForFunctionRule('--func', 'red', '--foo');
    stylePropertyTreeElement.treeOutline = new LegacyUI.TreeOutline.TreeOutline();
    stylePropertyTreeElement.updateTitle();
    assert.exists(stylePropertyTreeElement.nameElement);
    assert.notExists(stylePropertyTreeElement.nameElement.getAttribute('aria-details'));
    assert.exists(stylePropertyTreeElement.nameElement.parentElement);
    assert.notExists(stylePropertyTreeElement.nameElement.parentElement.querySelector('devtools-tooltip'));
  });

  it('correctly identifies when a semicolon terminates editing a property', () => {
    const inputText = '" " ( ) [ ] { } { ( ) } { [ ( " ) " ) ] } { [ } ] } ( " ) " )';
    const positions = '+--++--++--++--++------++----------------++--------++--------';
    // + identifies a position in which a semicolon should terminate editing
    for (let i = 0; i < inputText.length; i++) {
      const shouldCommit =
          Elements.StylePropertyTreeElement.StylePropertyTreeElement.shouldCommitValueSemicolon(inputText, i);
      assert.strictEqual(shouldCommit, positions[i] === '+', `\n${inputText}\n${' '.repeat(i)}^`);
    }
  });
});
