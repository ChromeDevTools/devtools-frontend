// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as LegacyUI from '../../ui/legacy/legacy.js';

import * as ElementsComponents from './components/components.js';
import * as Elements from './elements.js';

describeWithMockConnection('StylePropertyTreeElement', () => {
  let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;
  let mockStylePropertiesSection: sinon.SinonStubbedInstance<Elements.StylePropertiesSection.StylePropertiesSection>;
  let mockCssStyleDeclaration: sinon.SinonStubbedInstance<SDK.CSSStyleDeclaration.CSSStyleDeclaration>;
  let mockMatchedStyles: sinon.SinonStubbedInstance<SDK.CSSMatchedStyles.CSSMatchedStyles>;
  let mockVariableMap: Record<string, string>;

  beforeEach(async () => {
    stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
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

    mockStylePropertiesSection = sinon.createStubInstance(Elements.StylePropertiesSection.StylePropertiesSection);
    mockCssStyleDeclaration = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    mockMatchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles);
    mockMatchedStyles.keyframes.returns([]);
    mockMatchedStyles.availableCSSVariables.returns(Object.keys(mockVariableMap));
    mockMatchedStyles.computeCSSVariable.callsFake((style, name) => {
      return {
        value: mockVariableMap[name],
        declaration: new SDK.CSSMatchedStyles.CSSValueSource(sinon.createStubInstance(SDK.CSSProperty.CSSProperty)),
      };
    });
    mockCssStyleDeclaration.leadingProperties.returns([]);
    mockCssStyleDeclaration.styleSheetId = 'stylesheet-id' as Protocol.CSS.StyleSheetId;
    mockCssStyleDeclaration.range = new TextUtils.TextRange.TextRange(0, 0, 10, 10);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace);
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager: SDK.TargetManager.TargetManager.instance()});
  });

  function getTreeElement(name: string, value: string, longhandProperties: Protocol.CSS.CSSProperty[] = []) {
    const property = new SDK.CSSProperty.CSSProperty(
        mockCssStyleDeclaration, 0, name, value, true, false, true, false, '', undefined, longhandProperties);
    return new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
      stylesPane: stylesSidebarPane,
      section: mockStylePropertiesSection,
      matchedStyles: mockMatchedStyles,
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
         assertNullSwatchOnChildAt(0, '[is="bezier-swatch"]');
         assertNullSwatchOnChildAt(1, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(2, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(3, 'devtools-css-length');
       });

    describe('color-mix swatch', () => {
      it('should show color mix swatch when color-mix is used with a color', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, red, blue)');
        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const colorSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch') || []);
        assert.exists(colorMixSwatch);
        assert.exists(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'red'));
        assert.exists(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'blue'));
      });

      it('should show color mix swatch when color-mix is used with a known variable as color', () => {
        const stylePropertyTreeElement = getTreeElement('color', 'color-mix(in srgb, var(--a), var(--b))');
        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const cssVarSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch') || []);
        assert.exists(colorMixSwatch);
        assert.exists(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.textContent === 'var(--a)'));
        assert.exists(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.textContent === 'var(--b)'));
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
        assert.isTrue(colorMixSwatch.textContent?.includes('var(--space)'));
      });

      it('should show color mix swatch when color-mix is used with an known variable in interpolation method even if it is not a valid method',
         () => {
           const stylePropertyTreeElement =
               getTreeElement('color', 'color-mix(in lch var(--garbage-space), var(--a), var(--b))');
           stylePropertyTreeElement.updateTitle();

           const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
           assert.exists(colorMixSwatch);
           assert.isTrue(colorMixSwatch.textContent?.includes('var(--garbage-space)'));
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
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, red 50%, yellow)', true, false, true, false, '',
            undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles: mockMatchedStyles,
          property: cssPropertyWithColorMix,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        const addPopoverSpy = sinon.spy(stylesSidebarPane, 'addPopover');
        stylePropertyTreeElement.updateTitle();
        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(colorMixSwatch);
        renderElementIntoDOM(colorMixSwatch);

        assert.isTrue(addPopoverSpy.calledOnce);
        assert.strictEqual(addPopoverSpy.args[0][0], colorMixSwatch.icon);
        assert.strictEqual(addPopoverSpy.args[0][1].contents()?.textContent, '#ff8000');
      });

      it('shows a popover with it\'s computed color as wide gamut if necessary', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, oklch(.5 .5 .5) 50%, yellow)', true, false, true,
            false, '', undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles: mockMatchedStyles,
          property: cssPropertyWithColorMix,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        const addPopoverSpy = sinon.spy(stylesSidebarPane, 'addPopover');
        stylePropertyTreeElement.updateTitle();
        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(colorMixSwatch);
        renderElementIntoDOM(colorMixSwatch);

        assert.isTrue(addPopoverSpy.calledOnce);
        assert.strictEqual(addPopoverSpy.args[0][0], colorMixSwatch.icon);
        assert.strictEqual(addPopoverSpy.args[0][1].contents()?.textContent, 'color(srgb 1 0.24 0.17)');
      });

      it('propagates updates to outer color-mixes', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, color-mix(in oklch, red, green), blue)', true,
            false, true, false, '', undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles: mockMatchedStyles,
          property: cssPropertyWithColorMix,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        stylePropertyTreeElement.updateTitle();

        const outerColorMix = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.exists(outerColorMix);
        const handler = sinon.fake();
        outerColorMix.addEventListener(InlineEditor.ColorMixSwatch.Events.COLOR_CHANGED, handler);
        const innerColorMix = outerColorMix.querySelector('devtools-color-mix-swatch');
        assert.exists(innerColorMix);
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, red, green), blue)');
        assert.strictEqual(innerColorMix.getText(), 'color-mix(in oklch, red, green)');
        innerColorMix.setFirstColor('blue');
        assert.deepStrictEqual(
            handler.args[0][0].data, {text: 'color-mix(in srgb, color-mix(in oklch, blue, green), blue)'});
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, blue, green), blue)');

        // setFirstColor does not actually update the rendered color swatches or the textContent, which is why the first
        // color is still red here.
        const colorSwatch = innerColorMix.querySelector('devtools-color-swatch');
        assert.isOk(colorSwatch);
        const newColor = colorSwatch.getColor()?.as(Common.Color.Format.HEX);
        assert.isOk(newColor);
        colorSwatch.setColor(newColor);
        assert.strictEqual(outerColorMix.getText(), 'color-mix(in srgb, color-mix(in oklch, #ff0000, green), blue)');
        assert.deepStrictEqual(
            handler.args[1][0].data, {text: 'color-mix(in srgb, color-mix(in oklch, #ff0000, green), blue)'});
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
        beforeEach(() => {
          const target = createTarget();
          const domModelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
          assert.exists(domModelBeforeAssertion);
          domModel = domModelBeforeAssertion;
        });

        afterEach(() => {
          sinon.reset();
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
    swatch.setColorText(newColor);
    assert.deepEqual(stylePropertyTreeElement.renderedPropertyText(), `color: ${expectedColorString}`);

    assert.isTrue(applyStyleTextStub.alwaysCalledWith(`color: ${expectedColorString}`, false));
  });

  describe('Context menu', () => {
    const expectedHeaderSectionItemsLabels =
        ['Copy declaration', 'Copy property', 'Copy value', 'Copy rule', 'Copy declaration as JS'];
    const expectedClipboardSectionItemsLabels = ['Copy all declarations', 'Copy all declarations as JS'];
    const expectedDefaultSectionItemsLabels = ['Copy all CSS changes'];
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
      const defaultSection = contextMenu.defaultSection();
      const footerSection = contextMenu.footerSection();
      verifySection(expectedHeaderSectionItemsLabels, headerSection.items);
      verifySection(expectedClipboardSectionItemsLabels, clipboardSection.items);
      verifySection(expectedDefaultSectionItemsLabels, defaultSection.items);
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
      assert(
          !stylePropertyTreeElement.listItemElement.classList.contains('inactive-property'),
          'CSS hint was rendered unexpectedly.');
    });
  });

  describe('custom-properties', () => {
    it('linkifies var functions to declarations', async () => {
      const cssCustomPropertyDef = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, '--prop', 'value', true, false, true, false, '', undefined);
      mockMatchedStyles.computeCSSVariable.callsFake(
          (_, name) => name === '--prop' ? {
            value: 'computedvalue',
            declaration: new SDK.CSSMatchedStyles.CSSValueSource(cssCustomPropertyDef),
            fromFallback: false,
          } :
                                           null);
      const renderValueSpy = sinon.spy(Elements.PropertyRenderer.Renderer, 'renderValueElement');

      const stylePropertyTreeElement = getTreeElement('prop', 'var(--prop)');
      stylePropertyTreeElement.updateTitle();

      const varSwatch =
          renderValueSpy.returnValues.find(value => value.firstChild instanceof InlineEditor.LinkSwatch.CSSVarSwatch)
                  ?.firstChild as InlineEditor.LinkSwatch.CSSVarSwatch |
          undefined;
      assert.exists(varSwatch);
      const revealPropertySpy = sinon.spy(stylesSidebarPane, 'revealProperty');
      varSwatch.link?.linkElement?.click();
      assert.isTrue(revealPropertySpy.calledWith(cssCustomPropertyDef));
    });

    it('linkifies property definition to registrations', async () => {
      const addElementPopoverHook = sinon.stub(stylesSidebarPane, 'addPopover');
      const stylePropertyTreeElement = getTreeElement('--prop', 'value');
      stylePropertyTreeElement.updateTitle();

      assert.isTrue(addElementPopoverHook.calledOnce);

      const registration = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSRegisteredProperty);
      mockMatchedStyles.getRegisteredProperty.callsFake(name => name === '--prop' ? registration : undefined);
      mockMatchedStyles.computeCSSVariable.returns({
        value: 'computedvalue',
        declaration: new SDK.CSSMatchedStyles.CSSValueSource(sinon.createStubInstance(SDK.CSSProperty.CSSProperty)),
      });
      const popoverContents = addElementPopoverHook.args[0][1].contents();
      assert.isTrue(popoverContents instanceof ElementsComponents.CSSVariableValueView.CSSVariableValueView);
      const {details} = popoverContents as ElementsComponents.CSSVariableValueView.CSSVariableValueView;
      assert.exists(details);

      const jumpToSectionSpy = sinon.spy(stylesSidebarPane, 'jumpToSection');
      details.goToDefinition();
      assert.isTrue(jumpToSectionSpy.calledOnceWithExactly(
          '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME));
    });

    it('linkifies var functions to initial-value registrations', async () => {
      mockMatchedStyles.computeCSSVariable.returns({
        value: 'computedvalue',
        declaration: new SDK.CSSMatchedStyles.CSSValueSource(
            sinon.createStubInstance(SDK.CSSMatchedStyles.CSSRegisteredProperty, {propertyName: '--prop'})),
      });
      const renderValueSpy = sinon.spy(Elements.PropertyRenderer.Renderer, 'renderValueElement');

      const stylePropertyTreeElement = getTreeElement('prop', 'var(--prop)');
      stylePropertyTreeElement.updateTitle();

      const varSwatch =
          renderValueSpy.returnValues.find(value => value.firstChild instanceof InlineEditor.LinkSwatch.CSSVarSwatch)
                  ?.firstChild as InlineEditor.LinkSwatch.CSSVarSwatch |
          undefined;
      assert.exists(varSwatch);
      const jumpToPropertySpy = sinon.spy(stylesSidebarPane, 'jumpToProperty');
      varSwatch.link?.linkElement?.click();
      assert.isTrue(jumpToPropertySpy.calledWith(
          'initial-value', '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME));
    });
  });

  describe('CSSVarSwatch', () => {
    it('should render a CSSVarSwatch for variable usage without fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--a)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assert.exists(linkSwatch);

      assert.strictEqual(cssVarSwatch.textContent, 'var(--a)');
      assert.strictEqual(linkSwatch.shadowRoot?.textContent, '--a');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--a)');
    });

    it('should render a CSSVarSwatch for variable usage with fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, red)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assert.exists(linkSwatch);

      assert.strictEqual(linkSwatch.shadowRoot?.textContent, '--not-existing');
      assert.strictEqual(cssVarSwatch.deepTextContent(), 'var(--not-existing, red)');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--not-existing, red)');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with another variable fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, var(--a))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);

      const firstLinkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      const insideCssVarSwatch = cssVarSwatch.querySelector('devtools-css-var-swatch');
      const secondLinkSwatch = insideCssVarSwatch?.shadowRoot?.querySelector('devtools-base-link-swatch');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--not-existing, var(--a))');
      assert.strictEqual(firstLinkSwatch?.shadowRoot?.textContent, '--not-existing');
      assert.strictEqual(cssVarSwatch.textContent, 'var(--not-existing, var(--a))');
      assert.strictEqual(secondLinkSwatch?.shadowRoot?.textContent, '--a');
      assert.strictEqual(insideCssVarSwatch?.textContent, 'var(--a)');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with calc expression as fallback', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--not-existing, calc(15px + 20px))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);

      const firstLinkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');

      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--not-existing, calc(15px + 20px))');
      assert.strictEqual(firstLinkSwatch?.shadowRoot?.textContent, '--not-existing');
      assert.strictEqual(cssVarSwatch.textContent, 'var(--not-existing, calc(15px + 20px))');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with color and also a color swatch', () => {
      for (const varName of ['--a', '--not-existing']) {
        const stylePropertyTreeElement = getTreeElement('color', `var(${varName}, var(--blue))`);
        stylePropertyTreeElement.updateTitle();
        assert.exists(stylePropertyTreeElement.valueElement);

        const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
        assert.exists(cssVarSwatch);

        const colorSwatch = cssVarSwatch.querySelector('devtools-color-swatch');
        assert.exists(colorSwatch);
        assert.isTrue(InlineEditor.ColorSwatch.ColorSwatch.isColorSwatch(colorSwatch));

        const firstLinkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');

        assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, `var(${varName}, var(--blue))`);
        assert.strictEqual(firstLinkSwatch?.shadowRoot?.textContent, varName);
        assert.strictEqual(cssVarSwatch.textContent, `var(${varName}, var(--blue))`);
      }
    });

    it('should render CSSVarSwatches for multiple var() usages in the same property declaration', () => {
      const stylePropertyTreeElement = getTreeElement('--shadow', 'var(--a) var(--b)');
      stylePropertyTreeElement.updateTitle();

      const cssVarSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch');
      assert.strictEqual(cssVarSwatches?.length, 2);
    });

    it('should render a CSSVarSwatch for var() with spaces', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var( --test    )');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assert.strictEqual(linkSwatch?.shadowRoot?.textContent, '--test');
      assert.strictEqual(cssVarSwatch.textContent, 'var( --test    )');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var( --test    )');
    });

    it('connects nested color swatches', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'var(--void, red)');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assert.exists(cssVarSwatch);
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

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
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

  function setUpStyles(
      cssModel: SDK.CSSModel.CSSModel,
      cssProperties: {name: string, value: string}[],
      styleSheetId = '0' as Protocol.CSS.StyleSheetId,
      origin = Protocol.CSS.StyleSheetOrigin.Regular,
      selector = 'div',
      ): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles> {
    const matchedPayload: Protocol.CSS.RuleMatch[] = [{
      rule: {
        selectorList: {selectors: [{text: selector}], text: selector},
        origin,
        style: {cssProperties, shorthandEntries: []},
      },
      matchingSelectors: [0],
    }];
    if (cssModel.styleSheetHeaderForId(styleSheetId)) {
      cssModel.styleSheetRemoved(styleSheetId);
    }
    cssModel.styleSheetAdded({
      styleSheetId,
      frameId: '' as Protocol.Page.FrameId,
      sourceURL: '',
      origin,
      title: '',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    });
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.id = 0 as Protocol.DOM.NodeId;
    return SDK.CSSMatchedStyles.CSSMatchedStyles.create({
      cssModel,
      node,
      inlinePayload: null,
      attributesPayload: null,
      matchedPayload,
      pseudoPayload: [],
      inheritedPayload: [],
      inheritedPseudoPayload: [],
      animationsPayload: [],
      parentLayoutNodeId: undefined,
      positionTryRules: [],
      propertyRules: [],
      cssPropertyRegistrations: [],
      activePositionFallbackIndex: -1,
      fontPaletteValuesRule: undefined,
    });
  }

  describe('VariableRenderer', () => {
    it('computes the text for var()s correctly', async () => {
      const cssModel = new SDK.CSSModel.CSSModel(createTarget());

      async function matchProperty(value: string, name = 'color') {
        const matchedStyles = await setUpStyles(cssModel, [
          {name: '--blue', value: 'blue'},
          {name, value},
        ]);
        const property = matchedStyles.nodeStyles()[0].leadingProperties()[1];
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles,
          property,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        const ast =
            SDK.CSSPropertyParser.tokenizeDeclaration(stylePropertyTreeElement.name, stylePropertyTreeElement.value);
        assert.exists(ast);
        const matching = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(
            ast, [new Elements.StylePropertyTreeElement
                      .VariableRenderer(stylePropertyTreeElement, stylePropertyTreeElement.property.ownerStyle)
                      .matcher()]);

        const res = {
          hasUnresolvedVars: matching.hasUnresolvedVars(ast.tree),
          computedText: matching.getComputedText(ast.tree),
        };
        return res;
      }

      assert.deepStrictEqual(
          await matchProperty('var( --blue    )'), {hasUnresolvedVars: false, computedText: 'color: blue'});
      assert.deepStrictEqual(
          await matchProperty('var(--no, var(--blue))'), {hasUnresolvedVars: false, computedText: 'color: blue'});
      assert.deepStrictEqual(
          await matchProperty('pre var(--no) post'),
          {hasUnresolvedVars: true, computedText: 'color: pre var(--no) post'});
      assert.deepStrictEqual(
          await matchProperty('var(--no, var(--no2))'),
          {hasUnresolvedVars: true, computedText: 'color: var(--no, var(--no2))'});
      assert.deepStrictEqual(await matchProperty(''), {hasUnresolvedVars: false, computedText: 'color:'});
    });

    it('layers correctly with the font renderer', () => {
      const stylePropertyTreeElement = getTreeElement('font-size', 'calc(1 + var(--no))');
      stylePropertyTreeElement.updateTitle();
      assert.exists(stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch'));
    });
  });

  describe('ColorRenderer', () => {
    it('correctly renders children of the color swatch', () => {
      const value = 'rgb(255, var(--zero), var(--zero))';
      const stylePropertyTreeElement = getTreeElement('color', value);
      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement?.textContent, value);
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HEX), '#ff0000');

      const varSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch');
      assert.exists(varSwatches);
      assert.lengthOf(varSwatches, 2);
    });

    it('connects correctly with an inner angle swatch', () => {
      const stylePropertyTreeElement = getTreeElement('color', 'hsl(120deg, 50%, 25%)');
      stylePropertyTreeElement.updateTitle();
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');

      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HSL), 'hsl(120deg 50% 25%)');
      const eventHandler = sinon.stub<[InlineEditor.ColorSwatch.ColorChangedEvent]>();
      colorSwatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, eventHandler);

      const angleSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-angle');
      assert.exists(angleSwatch);
      angleSwatch.updateAngle({value: 130, unit: InlineEditor.CSSAngleUtils.AngleUnit.DEG});
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HSL), 'hsl(130deg 50% 25%)');
      assert.isTrue(eventHandler.calledOnce);
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
  });

  describe('BezierRenderer', () => {
    it('renders the easing function swatch', () => {
      const stylePropertyTreeElement = getTreeElement('animation-timing-function', 'ease-out');
      stylePropertyTreeElement.updateTitle();
      assert.instanceOf(stylePropertyTreeElement.valueElement?.firstChild, InlineEditor.Swatches.BezierSwatch);
    });
  });

  describe('UrlRenderer', () => {
    it('linkifies and unescapes urls', () => {
      const stylePropertyTreeElement = getTreeElement('--url', 'url(devtools:\\/\\/abc)');
      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement?.textContent, 'url(devtools://abc)');
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

        assert.strictEqual(
            stylePropertyTreeElement.valueElement?.firstElementChild instanceof InlineEditor.Swatches.CSSShadowSwatch,
            success);
        assert.strictEqual(stylePropertyTreeElement.valueElement?.textContent, value);
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
      const colorSwatch =
          stylePropertyTreeElement.valueElement?.firstElementChild?.querySelector('devtools-color-swatch');
      assert.exists(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(), 'blue');
    });

    it('renders multiple icons for multiple shadows', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', 'inset 10px 11px blue, notashadow, 6px 5px red');
      stylePropertyTreeElement.updateTitle();

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 2);
      assert.strictEqual(swatches[0].textContent, 'inset 10px 11px blue');
      assert.strictEqual(swatches[1].textContent, '6px 5px red');
    });

    it('correctly parses text-shadow', () => {
      const stylePropertyTreeElement =
          getTreeElement('text-shadow', 'inset 10px 11px blue, 6px 5px red, 5px 5px 0 0 yellow');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 1);
      assert.strictEqual(swatches[0].textContent, '6px 5px red');
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
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 2);
      assert.strictEqual(swatches[0].textContent, 'var(--offset) red');
      assert.strictEqual(swatches[1].textContent, 'var(--shadow)');
    });

    it('opens a shadow editor with the correct values', () => {
      mockVariableMap['--offset'] = '10px 10px';

      const stylePropertyTreeElement =
          getTreeElement('box-shadow', 'var(--offset) red, inset 8px 9px 10px 11px yellow');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 2);

      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');

      const editorProperties = (editor: InlineEditor.CSSShadowEditor.CSSShadowEditor): string[] =>
          Array.from(editor.contentElement.querySelectorAll('.shadow-editor-field'))
              .map(
                  field => field.querySelector('input')?.value ??
                      Array.from(field.querySelectorAll('button'))
                          .map(button => button.classList.contains('enabled') ? button.textContent : undefined)
                          .filter((b): b is string => Boolean(b)))
              .flat();

      {
        swatches[0].iconElement().click();
        assert.isTrue(showPopoverStub.calledOnce);
        assert.instanceOf(showPopoverStub.args[0][0], InlineEditor.CSSShadowEditor.CSSShadowEditor);
        const editor = showPopoverStub.args[0][0] as InlineEditor.CSSShadowEditor.CSSShadowEditor;
        const text = editorProperties(editor);
        assert.deepStrictEqual(text, ['Outset', '10px', '10px', '0', '0']);
      }

      {
        swatches[1].iconElement().click();
        assert.isTrue(showPopoverStub.calledTwice);
        assert.instanceOf(showPopoverStub.args[1][0], InlineEditor.CSSShadowEditor.CSSShadowEditor);
        const editor = showPopoverStub.args[1][0] as InlineEditor.CSSShadowEditor.CSSShadowEditor;
        const text = editorProperties(editor);
        assert.deepStrictEqual(text, ['Inset', '8px', '9px', '10px', '11px']);
      }
    });

    it('updates the style for shadow editor changes', () => {
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px 11px red');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 1);
      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');
      swatches[0].iconElement().click();
      assert.isTrue(showPopoverStub.calledOnce);

      const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
      const button =
          showPopoverStub.args[0][0].contentElement.querySelector('.shadow-editor-button-right') as HTMLElement | null;
      button?.click();

      assert.isTrue(applyStyleTextStub.calledOnceWithExactly('box-shadow: inset 10px 11px red', false));
    });

    it('updates the style for shadow editor changes and respects ordering', () => {
      mockVariableMap['--y-color'] = '11px red';
      const stylePropertyTreeElement = getTreeElement('box-shadow', '10px var(--y-color)');
      stylePropertyTreeElement.updateTitle();
      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('css-shadow-swatch');
      assert.exists(swatches);
      assert.strictEqual(swatches.length, 1);
      const showPopoverStub = sinon.stub(stylePropertyTreeElement.parentPane().swatchPopoverHelper(), 'show');
      swatches[0].iconElement().click();
      assert.isTrue(showPopoverStub.calledOnce);

      const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
      const inputs = Array.from(showPopoverStub.args[0][0].contentElement.querySelectorAll('.shadow-editor-field'))
                         .map(field => field.querySelector('input'));
      assert.exists(inputs[3]);
      inputs[3].value = '13px';
      inputs[3].dispatchEvent(new InputEvent('input', {data: '13px'}));

      assert.isTrue(applyStyleTextStub.calledOnceWithExactly('box-shadow: 10px 11px 13px red', false));
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

    class StubSyntaxnode implements CodeMirror.SyntaxNode {
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
      from: number = 0;
      to: number = 0;
      type = new CodeMirror.NodeType();
      name: string = '';
      tree: CodeMirror.Tree|null = null;
      node: CodeMirror.SyntaxNode = this;
      matchContext(): boolean {
        return false;
      }
    }

    it('shadow model renders text properties, authored properties, and computed text properties correctly', () => {
      const renderingContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
      const expansionContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
      const y = new StubSyntaxnode();
      const spread = new StubSyntaxnode();
      const blur = new StubSyntaxnode();
      const variable = new StubSyntaxnode();
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
                          .filter((b): b is Text => Boolean(b));
        return {
          nodes,
          nodeGroups: [nodes],
          cssControls: new Map(),
        };
      });
      const model = new Elements.StylePropertyTreeElement.ShadowModel(
          Elements.PropertyMatchers.ShadowType.BOX_SHADOW, properties, renderingContext);

      const container = document.createElement('div');
      model.renderContents(container);
      assert.strictEqual(container.textContent, '10px y var()');

      model.setBlurRadius(new InlineEditor.CSSShadowEditor.CSSLength(12, 'px'));
      model.renderContents(container);
      assert.strictEqual(container.textContent, '10px y 12px spread');
      assert.deepStrictEqual(properties.map(p => p.source), [null, null, null, null]);
    });
  });

  describe('AnchorFunctionRenderer', () => {
    let anchorDecoratedForTestStub: sinon.SinonStub;
    let getAnchorBySpecifierStub: sinon.SinonStub;
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
      anchorDecoratedForTestStub =
          sinon.stub(Elements.StylePropertyTreeElement.AnchorFunctionRenderer.prototype, 'anchorDecoratedForTest');
      getAnchorBySpecifierStub =
          sinon.stub(SDK.DOMModel.DOMNode.prototype, 'getAnchorBySpecifier').resolves(fakeDOMNode);
      revealStub = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');
      hideDOMNodeHighlightStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');
    });

    afterEach(() => {
      anchorDecoratedForTestStub.restore();
      getAnchorBySpecifierStub.restore();
      revealStub.restore();
      hideDOMNodeHighlightStub.restore();
    });

    it('renders anchor() function correctly', async () => {
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(top)');

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement!.textContent, 'anchor(top)');
    });

    it('renders `AnchorFunctionLinkSwatch` after decorating the element', async () => {
      const waitForDecorationPromise = expectCall(anchorDecoratedForTestStub);
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylePropertyTreeElement, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await waitForDecorationPromise;
      const anchorFunctionLinkSwatch =
          stylePropertyTreeElement.valueElement!.querySelector('devtools-anchor-function-link-swatch')! as
          ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch;

      assert.strictEqual(anchorFunctionLinkSwatch.dataForTest().identifier, '--identifier');
    });

    it('should highlight node when `onMouseEnter` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise = expectCall(anchorDecoratedForTestStub);
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylePropertyTreeElement, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await waitForDecorationPromise;
      const anchorFunctionLinkSwatch =
          stylePropertyTreeElement.valueElement!.querySelector('devtools-anchor-function-link-swatch')! as
          ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch;
      anchorFunctionLinkSwatch.dataForTest().onMouseEnter();

      assert.isTrue(highlightMock.calledOnce);
    });

    it('should clear DOM highlight when `onMouseLeave` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise = expectCall(anchorDecoratedForTestStub);
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylePropertyTreeElement, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await waitForDecorationPromise;
      const anchorFunctionLinkSwatch =
          stylePropertyTreeElement.valueElement!.querySelector('devtools-anchor-function-link-swatch')! as
          ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch;
      anchorFunctionLinkSwatch.dataForTest().onMouseLeave();

      assert.isTrue(hideDOMNodeHighlightStub.calledOnce);
    });

    it('should reveal anchor node when `onLinkActivate` triggered from `AnchorFunctionLinkSwatch`', async () => {
      const waitForDecorationPromise = expectCall(anchorDecoratedForTestStub);
      const stylePropertyTreeElement = getTreeElement('left', 'anchor(--identifier top)');
      sinon.stub(stylePropertyTreeElement, 'node').returns(fakeParentNode);

      stylePropertyTreeElement.updateTitle();
      await waitForDecorationPromise;
      const anchorFunctionLinkSwatch =
          stylePropertyTreeElement.valueElement!.querySelector('devtools-anchor-function-link-swatch')! as
          ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch;
      anchorFunctionLinkSwatch.dataForTest().onLinkActivate();

      assert.isTrue(revealStub.calledOnce);
      assert.isTrue(revealStub.calledWith(fakeDOMNode));
    });
  });

  describe('AnchorFunctionRenderer', () => {
    let anchorDecoratedForTestStub: sinon.SinonStub;
    let getAnchorBySpecifierStub: sinon.SinonStub;
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
      anchorDecoratedForTestStub =
          sinon.stub(Elements.StylePropertyTreeElement.PositionAnchorRenderer.prototype, 'anchorDecoratedForTest');
      getAnchorBySpecifierStub =
          sinon.stub(SDK.DOMModel.DOMNode.prototype, 'getAnchorBySpecifier').resolves(fakeDOMNode);
    });

    afterEach(() => {
      anchorDecoratedForTestStub.restore();
      getAnchorBySpecifierStub.restore();
    });

    it('renders `position-anchor` property correctly before anchor is decorated', async () => {
      const stylePropertyTreeElement = getTreeElement('position-anchor', '--anchor');

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement!.textContent, '--anchor');
    });

    it('renders `position-anchor` property correctly after anchor is decorated', async () => {
      const waitForDecorationPromise = expectCall(anchorDecoratedForTestStub);
      const stylePropertyTreeElement = getTreeElement('position-anchor', '--anchor');

      stylePropertyTreeElement.updateTitle();
      await waitForDecorationPromise;

      const anchorFunctionLinkSwatch =
          stylePropertyTreeElement.valueElement!.querySelector('devtools-anchor-function-link-swatch');
      assert.exists(anchorFunctionLinkSwatch);
    });
  });

  describe('LightDarkColorRenderer', () => {
    it('renders light-dark correctly', async () => {
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');

      async function check(colorScheme: SDK.CSSModel.ColorScheme, lightText: string, darkText: string) {
        const variableName = (text: string) => text.substring('var('.length, text.length - 1);
        const lightDark = `light-dark(${lightText}, ${darkText})`;
        const stylePropertyTreeElement = getTreeElement('color', lightDark);
        stylePropertyTreeElement.setComputedStyles(new Map([['color-scheme', colorScheme]]));
        stylePropertyTreeElement.updateTitle();
        await Promise.all(colorSchemeSpy.returnValues);

        const swatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
        assert.exists(swatch);
        assert.strictEqual(swatch?.textContent, lightDark);
        const activeColor = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? lightText : darkText;
        assert.strictEqual(
            swatch.getColor()?.getAuthoredText(), mockVariableMap[variableName(activeColor)] ?? activeColor);
        const [light, dark] = swatch.querySelectorAll('devtools-color-swatch');
        assert.exists(light);
        assert.exists(dark);
        const active = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? light : dark;
        const inactive = colorScheme === SDK.CSSModel.ColorScheme.LIGHT ? dark : light;
        assert.strictEqual(inactive.parentElement?.style.textDecoration, 'line-through');
        assert.strictEqual(active.parentElement?.style.textDecoration, '');
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
      const stylePropertyTreeElement = getTreeElement('color', lightDark);
      stylePropertyTreeElement.setComputedStyles(new Map([['color-scheme', 'light dark']]));
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      stylePropertyTreeElement.updateTitle();
      await Promise.all(colorSchemeSpy.returnValues);

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 3);
      assert.isNull(swatches[0].getColor());
      assert.strictEqual(swatches[0].textContent, 'light-dark(red, blue)');
      assert.strictEqual(swatches[1].textContent, 'red');
      assert.strictEqual(swatches[2].textContent, 'blue');
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
      assert.strictEqual(swatches[0].textContent, 'light-dark(red, blue)');
      assert.strictEqual(swatches[1].textContent, 'red');
      assert.strictEqual(swatches[2].textContent, 'blue');
    });

    it('renders light-dark with undefined vars correctly', async () => {
      const lightDark = 'light-dark(red, var(--undefined))';
      const stylePropertyTreeElement = getTreeElement('color', lightDark);
      stylePropertyTreeElement.setComputedStyles(new Map([['color-scheme', 'light dark']]));
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      stylePropertyTreeElement.updateTitle();
      await Promise.all(colorSchemeSpy.returnValues);

      const swatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch');
      assert.exists(swatches);
      assert.lengthOf(swatches, 1);
      assert.strictEqual(swatches[0].textContent, 'red');
      assert.strictEqual(swatches[0].parentElement?.style.textDecoration, '');
    });

    it('connects inner and outer swatches', async () => {
      const colorSchemeSpy =
          sinon.spy(Elements.StylePropertyTreeElement.LightDarkColorRenderer.prototype, 'applyColorScheme');
      for (const colorScheme of [SDK.CSSModel.ColorScheme.LIGHT, SDK.CSSModel.ColorScheme.DARK]) {
        const lightDark = 'light-dark(red, blue)';
        const stylePropertyTreeElement = getTreeElement('color', lightDark);
        stylePropertyTreeElement.setComputedStyles(new Map([['color-scheme', colorScheme]]));
        stylePropertyTreeElement.updateTitle();
        await Promise.all(colorSchemeSpy.returnValues);

        const outerSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
        assert.exists(outerSwatch);
        const innerSwatches = outerSwatch.querySelectorAll('devtools-color-swatch');
        assert.lengthOf(innerSwatches, 2);
        const [lightSwatch, darkSwatch] = innerSwatches;
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
        angleText: swatch.textContent ?? '',
        containingPane: document.createElement('div'),
      };

      sinon.stub(swatch, 'dispatchEvent');
      swatch.popOver();
      const popover = swatch.shadowRoot?.querySelector('devtools-css-angle-editor');
      assert.exists(popover);
      const clock = popover.shadowRoot?.querySelector<HTMLElement>('.clock');
      assert.exists(clock);
      assert.strictEqual(clock.style.background, 'linear-gradient(45deg, red, blue)');
    });
  });

  describe('LengthRenderer', () => {
    it('renders the length tool', () => {
      const stylePropertyTreeElement = getTreeElement('width', '100px');
      stylePropertyTreeElement.updateTitle();
      const swatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-length');
      assert.exists(swatch);
    });
  });

  describe('CSSWideKeywordRenderer', () => {
    function mockResolvedKeyword(propertyName: string, keyword: SDK.CSSMetadata.CSSWideKeyword, propertyValue = ''):
        sinon.SinonStubbedInstance<SDK.CSSProperty.CSSProperty> {
      const originalDeclaration = sinon.createStubInstance(SDK.CSSProperty.CSSProperty);
      mockMatchedStyles.resolveGlobalKeyword.callsFake(
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

      const linkSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
      assert.isOk(linkSwatch);
      const spy = sinon.spy(stylePropertyTreeElement.parentPane(), 'revealProperty');
      linkSwatch.shadowRoot?.querySelector('devtools-base-link-swatch')?.shadowRoot?.querySelector('button')?.click();
      assert.isTrue(spy.calledOnceWithExactly(originalDeclaration));
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
  });

  describe('PositionTryRenderer', () => {
    it('renders the position-try fallback values with correct styles', () => {
      mockMatchedStyles.activePositionFallbackIndex.returns(1);
      mockMatchedStyles.positionTryRules.returns([]);
      const stylePropertyTreeElement = getTreeElement('position-try-fallbacks', '--top, --left, --bottom');
      stylePropertyTreeElement.updateTitle();
      const values =
          stylePropertyTreeElement.valueElement?.querySelectorAll(':scope > span') as NodeListOf<HTMLElement>|
          undefined;
      assert.exists(values);
      assert.strictEqual(values?.length, 3);
      assert.strictEqual(values[0].style.textDecoration, 'line-through');
      assert.strictEqual(values[1].style.textDecoration, '');
      assert.strictEqual(values[2].style.textDecoration, 'line-through');
    });

    it('renders the position-try correctly with keyword', () => {
      mockMatchedStyles.activePositionFallbackIndex.returns(1);
      mockMatchedStyles.positionTryRules.returns([]);
      const stylePropertyTreeElement =
          getTreeElement('position-try', '/* comment */ most-height --top, --left, --bottom');
      stylePropertyTreeElement.updateTitle();
      const values =
          stylePropertyTreeElement.valueElement?.querySelectorAll(':scope > span') as NodeListOf<HTMLElement>|
          undefined;
      assert.exists(values);
      assert.strictEqual(values?.length, 3);
      assert.strictEqual(values[0].style.textDecoration, 'line-through');
      assert.strictEqual(values[1].style.textDecoration, '');
      assert.strictEqual(values[2].style.textDecoration, 'line-through');
    });
  });

  describe('Autocompletion', function(this: Mocha.Suite) {
    let promptStub: sinon.SinonStub<Parameters<Elements.StylesSidebarPane.CSSPropertyPrompt['initialize']>>;
    beforeEach(async () => {
      promptStub = sinon.stub(Elements.StylesSidebarPane.CSSPropertyPrompt.prototype, 'initialize').resolves([]);
      setMockConnectionResponseHandler('CSS.enable', () => ({}));

      const cssModel = new SDK.CSSModel.CSSModel(createTarget());
      await cssModel.resumeModel();
      const domModel = cssModel.domModel();
      const gridNode = new SDK.DOMModel.DOMNode(domModel);
      gridNode.id = 0 as Protocol.DOM.NodeId;
      const currentNode = new SDK.DOMModel.DOMNode(domModel);
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
});
