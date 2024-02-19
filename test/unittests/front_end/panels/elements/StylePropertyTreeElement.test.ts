// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as ElementsComponents from '../../../../../front_end/panels/elements/components/components.js';
import * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as InlineEditor from '../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import type * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

const {assert} = chai;

describeWithRealConnection('StylePropertyTreeElement', async () => {
  let Elements: typeof ElementsModule;
  let stylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane;
  let mockStylePropertiesSection:
      sinon.SinonStubbedInstance<ElementsModule.StylePropertiesSection.StylePropertiesSection>;
  let mockCssStyleDeclaration: sinon.SinonStubbedInstance<SDK.CSSStyleDeclaration.CSSStyleDeclaration>;
  let mockMatchedStyles: sinon.SinonStubbedInstance<SDK.CSSMatchedStyles.CSSMatchedStyles>;
  let mockCssProperty: sinon.SinonStubbedInstance<SDK.CSSProperty.CSSProperty>;

  beforeEach(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');

    stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});

    mockStylePropertiesSection = sinon.createStubInstance(ElementsModule.StylePropertiesSection.StylePropertiesSection);
    mockCssStyleDeclaration = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    mockMatchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles);
    mockCssProperty = sinon.createStubInstance(SDK.CSSProperty.CSSProperty);
    mockMatchedStyles.keyframes.returns([]);
    mockMatchedStyles.computeSingleVariableValue.callsFake((_, param) => {
      const mockVariableMap: Record<string, string> = {
        'var(--a)': 'red',
        'var(--b)': 'blue',
        'var(--blue)': 'blue',
        'var(--space)': 'shorter hue',
        'var(--garbage-space)': 'this-is-garbage-text',
        'var(--prop)': 'customproperty',
        'var(--zero)': '0',
      };

      if (!mockVariableMap[param]) {
        return {
          computedValue: null,
          declaration: null,
          fromFallback: true,
        };
      }

      return {
        computedValue: mockVariableMap[param],
        declaration: null,
        fromFallback: false,
      };
    });
    mockMatchedStyles.computeCSSVariable.callsFake((style, name) => {
      const value = mockMatchedStyles.computeSingleVariableValue(style, `var(${name})`);
      return value && value.computedValue ? {value: value.computedValue, declaration: null} : null;
    });
    mockCssStyleDeclaration.leadingProperties.returns([]);
    mockCssStyleDeclaration.styleSheetId = 'stylesheet-id' as Protocol.CSS.StyleSheetId;
    mockCssStyleDeclaration.range = new TextUtils.TextRange.TextRange(0, 0, 10, 10);
  });

  describe('updateTitle', () => {
    it('timing swatch, shadow swatch and length swatch are not shown for longhands expanded inside shorthands',
       async () => {
         const cssAnimationShorthand = new SDK.CSSProperty.CSSProperty(
             mockCssStyleDeclaration, 0, '', '', true, false, true, false, '', undefined, [
               {name: 'animation-timing-function', value: 'linear'},
               {name: 'text-shadow', value: '2px 2px #ff0000'},
               {name: 'box-shadow', value: '2px 2px #ff0000'},
               {name: 'margin-top', value: '10px'},
             ]);
         const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
           stylesPane: stylesSidebarPane,
           section: mockStylePropertiesSection,
           matchedStyles: mockMatchedStyles,
           property: cssAnimationShorthand,
           isShorthand: true,
           inherited: false,
           overloaded: false,
           newProperty: true,
         });

         await stylePropertyTreeElement.onpopulate();

         stylePropertyTreeElement.updateTitle();
         stylePropertyTreeElement.expand();

         const assertNullSwatchOnChildAt = (n: number, swatchSelector: string) => {
           const childValueElement =
               (stylePropertyTreeElement.childAt(n) as ElementsModule.StylePropertyTreeElement.StylePropertyTreeElement)
                   .valueElement;
           assertNotNullOrUndefined(childValueElement);
           assert.notExists(childValueElement.querySelector(swatchSelector));
         };
         assertNullSwatchOnChildAt(0, '[is="bezier-swatch"]');
         assertNullSwatchOnChildAt(1, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(2, '[is="css-shadow-swatch"]');
         assertNullSwatchOnChildAt(3, 'devtools-css-length');
       });

    describe('color-mix swatch', () => {
      it('should show color mix swatch when color-mix is used with a color', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, red, blue)', true, false, true, false, '',
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

        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const colorSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch') || []);
        assertNotNullOrUndefined(colorMixSwatch);
        assertNotNullOrUndefined(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'red'));
        assertNotNullOrUndefined(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'blue'));
      });

      it('should show color mix swatch when color-mix is used with a known variable as color', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, var(--a), var(--b))', true, false, true, false, '',
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

        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const cssVarSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch') || []);
        assertNotNullOrUndefined(colorMixSwatch);
        assertNotNullOrUndefined(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.textContent === 'var(--a)'));
        assertNotNullOrUndefined(cssVarSwatches.find(cssVarSwatch => cssVarSwatch.textContent === 'var(--b)'));
      });

      it('should not show color mix swatch when color-mix is used with an unknown variable as color', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, var(--unknown-a), var(--b))', true, false, true,
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

        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assert.isNull(colorMixSwatch);
      });

      it('should show color mix swatch when color-mix is used with a known variable in interpolation method', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in lch var(--space), var(--a), var(--b))', true, false,
            true, false, '', undefined);
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

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        assertNotNullOrUndefined(colorMixSwatch);
        assert.isTrue(colorMixSwatch.textContent?.includes('var(--space)'));
      });

      it('should show color mix swatch when color-mix is used with an known variable in interpolation method even if it is not a valid method',
         () => {
           const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
               mockCssStyleDeclaration, 0, 'color', 'color-mix(in lch var(--garbage-space), var(--a), var(--b))', true,
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

           const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
           assertNotNullOrUndefined(colorMixSwatch);
           assert.isTrue(colorMixSwatch.textContent?.includes('var(--garbage-space)'));
         });

      it('should not show color mix swatch when color-mix is used with an unknown variable in interpolation method',
         () => {
           const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
               mockCssStyleDeclaration, 0, 'color', 'color-mix(in lch var(--not-existing-space), var(--a), var(--b))',
               true, false, true, false, '', undefined);
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

           const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
           assert.isNull(colorMixSwatch);
         });
    });

    describe('animation-name', () => {
      it('should link-swatch be rendered for animation-name declaration', () => {
        const cssAnimationNameProperty = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'animation-name', 'first-keyframe', true, false, true, false, '', undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles: mockMatchedStyles,
          property: cssAnimationNameProperty,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        stylePropertyTreeElement.updateTitle();

        const animationNameSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-link-swatch');
        assert.isNotNull(animationNameSwatch);
      });

      it('should two link-swatches be rendered for animation-name declaration that contains two keyframe references',
         () => {
           const cssAnimationNameProperty = new SDK.CSSProperty.CSSProperty(
               mockCssStyleDeclaration, 0, 'animation-name', 'first-keyframe, second-keyframe', true, false, true,
               false, '', undefined);
           const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
             stylesPane: stylesSidebarPane,
             section: mockStylePropertiesSection,
             matchedStyles: mockMatchedStyles,
             property: cssAnimationNameProperty,
             isShorthand: false,
             inherited: false,
             overloaded: false,
             newProperty: true,
           });

           stylePropertyTreeElement.updateTitle();

           const animationNameSwatches =
               stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-link-swatch');
           assert.strictEqual(animationNameSwatches?.length, 2);
         });
    });
  });

  it('applies the new style when the color format is changed', async () => {
    const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
        mockCssStyleDeclaration, 0, 'color', 'color(srgb .5 .5 1)', true, false, true, false, '', undefined);
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

    const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
    // Make sure we don't leave a dangling promise behind:
    const returnValue = (async () => {})();
    await returnValue;
    applyStyleTextStub.returns(returnValue);

    stylePropertyTreeElement.updateTitle();

    const {valueElement} = stylePropertyTreeElement;
    assertNotNullOrUndefined(valueElement);

    const swatch = valueElement.querySelector<InlineEditor.ColorSwatch.ColorSwatch>(
        `${InlineEditor.ColorSwatch.ColorSwatch.litTagName.value}`);

    assertNotNullOrUndefined(swatch);

    const expectedColorString = swatch.getColor()?.asString(Common.Color.Format.LAB);
    assertNotNullOrUndefined(expectedColorString);
    assert.match(expectedColorString, /lab\([-.0-9]* [-.0-9]* [-.0-9]*\)/);

    swatch.setFormat(Common.Color.Format.LAB);
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
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: mockCssProperty,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

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
    let Elements: typeof ElementsModule;
    let stylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane;

    beforeEach(async () => {
      Elements = await import('../../../../../front_end/panels/elements/elements.js');
      stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
    });

    it('should create a hint for inline elements', () => {
      sinon.stub(stylesSidebarPane, 'node').returns({
        localName() {
          return 'span';
        },
        isSVGNode() {
          return false;
        },
      } as SDK.DOMModel.DOMNode);
      const cssPropertyWidth = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'width', '100px', true, false, true, false, '', undefined);
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: cssPropertyWidth,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });
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
      const cssPropertyWidth = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'width', '100px', true, false, true, false, '', undefined);
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: cssPropertyWidth,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });
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
      const cssCustomPropertyUse = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'prop', 'var(--prop)', true, false, true, false, '', undefined);
      const cssCustomPropertyDef = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, '--prop', 'value', true, false, true, false, '', undefined);
      mockMatchedStyles.computeCSSVariable.callsFake(
          (_, name) => name === '--prop' ?
              {value: 'computedvalue', declaration: cssCustomPropertyDef, fromFallback: false} :
              null);
      const renderValueSpy =
          sinon.spy(ElementsModule.StylesSidebarPane.StylesSidebarPropertyRenderer.prototype, 'renderValue');
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: cssCustomPropertyUse,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      stylePropertyTreeElement.updateTitle();

      const varSwatch =
          renderValueSpy.returnValues.find(value => value.firstChild instanceof InlineEditor.LinkSwatch.CSSVarSwatch)
                  ?.firstChild as InlineEditor.LinkSwatch.CSSVarSwatch |
          undefined;
      assertNotNullOrUndefined(varSwatch);
      const revealPropertySpy = sinon.spy(stylesSidebarPane, 'revealProperty');
      varSwatch.link?.linkElement?.dispatchEvent(new MouseEvent('mousedown'));
      assert.isTrue(revealPropertySpy.calledWith(cssCustomPropertyDef));
    });

    it('linkifies property definition to registrations', async () => {
      const cssCustomPropertyDef = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, '--prop', 'value', true, false, true, false, '', undefined);
      const addElementPopoverHook = sinon.stub(stylesSidebarPane, 'addPopover');
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: cssCustomPropertyDef,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      stylePropertyTreeElement.updateTitle();

      assert.isTrue(addElementPopoverHook.calledOnce);

      const registration = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSRegisteredProperty);
      mockMatchedStyles.getRegisteredProperty.callsFake(name => name === '--prop' ? registration : undefined);
      mockMatchedStyles.computeCSSVariable.returns({value: 'computedvalue', declaration: null});
      const popoverContents = addElementPopoverHook.args[0][1]();
      assert.isTrue(popoverContents instanceof ElementsComponents.CSSVariableValueView.CSSVariableValueView);
      const {details} = popoverContents as ElementsComponents.CSSVariableValueView.CSSVariableValueView;
      assertNotNullOrUndefined(details);

      const jumpToSectionSpy = sinon.spy(stylesSidebarPane, 'jumpToSection');
      details.goToDefinition();
      assert.isTrue(jumpToSectionSpy.calledOnceWithExactly(
          '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME));
    });

    it('linkifies var functions to initial-value registrations', async () => {
      const cssCustomPropertyDef = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'prop', 'var(--prop)', true, false, true, false, '', undefined);
      mockMatchedStyles.computeCSSVariable.returns({value: 'computedvalue', declaration: null});
      const renderValueSpy =
          sinon.spy(ElementsModule.StylesSidebarPane.StylesSidebarPropertyRenderer.prototype, 'renderValue');
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property: cssCustomPropertyDef,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      stylePropertyTreeElement.updateTitle();

      const varSwatch =
          renderValueSpy.returnValues.find(value => value.firstChild instanceof InlineEditor.LinkSwatch.CSSVarSwatch)
                  ?.firstChild as InlineEditor.LinkSwatch.CSSVarSwatch |
          undefined;
      assertNotNullOrUndefined(varSwatch);
      const jumpToPropertySpy = sinon.spy(stylesSidebarPane, 'jumpToProperty');
      varSwatch.link?.linkElement?.dispatchEvent(new MouseEvent('mousedown'));
      assert.isTrue(jumpToPropertySpy.calledWith(
          'initial-value', '--prop', Elements.StylesSidebarPane.REGISTERED_PROPERTY_SECTION_NAME));
    });
  });

  describe('CSSVarSwatch', () => {
    it('should render a CSSVarSwatch for variable usage without fallback', () => {
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'var(--a)', true, false, true, false, '', undefined);
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
      assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assertNotNullOrUndefined(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assertNotNullOrUndefined(linkSwatch);

      assert.strictEqual(cssVarSwatch.textContent, 'var(--a)');
      assert.strictEqual(linkSwatch.shadowRoot?.textContent, '--a');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--a)');
    });

    it('should render a CSSVarSwatch for variable usage with fallback', () => {
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'var(--not-existing, red)', true, false, true, false, '', undefined);
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
      assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assertNotNullOrUndefined(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assertNotNullOrUndefined(linkSwatch);

      assert.strictEqual(linkSwatch.shadowRoot?.textContent, '--not-existing');
      assert.strictEqual(cssVarSwatch.deepTextContent(), 'var(--not-existing, red)');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--not-existing, red)');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with another variable fallback', () => {
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'var(--not-existing, var(--a))', true, false, true, false, '',
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

      stylePropertyTreeElement.updateTitle();
      assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assertNotNullOrUndefined(cssVarSwatch);

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
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'var(--not-existing, calc(15px + 20px))', true, false, true, false, '',
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

      stylePropertyTreeElement.updateTitle();
      assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assertNotNullOrUndefined(cssVarSwatch);

      const firstLinkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');

      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var(--not-existing, calc(15px + 20px))');
      assert.strictEqual(firstLinkSwatch?.shadowRoot?.textContent, '--not-existing');
      assert.strictEqual(cssVarSwatch.textContent, 'var(--not-existing, calc(15px + 20px))');
    });

    it('should render a CSSVarSwatch inside CSSVarSwatch for variable usage with color and also a color swatch', () => {
      for (const varName of ['--a', '--not-existing']) {
        const cssProperty = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', `var(${varName}, var(--blue))`, true, false, true, false, '',
            undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
          stylesPane: stylesSidebarPane,
          section: mockStylePropertiesSection,
          matchedStyles: mockMatchedStyles,
          property: cssProperty,
          isShorthand: false,
          inherited: false,
          overloaded: false,
          newProperty: true,
        });

        stylePropertyTreeElement.updateTitle();
        assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

        const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
        assertNotNullOrUndefined(cssVarSwatch);

        const colorSwatch = cssVarSwatch.querySelector('devtools-color-swatch');
        assertNotNullOrUndefined(colorSwatch);
        assert.isTrue(InlineEditor.ColorSwatch.ColorSwatch.isColorSwatch(colorSwatch));

        const firstLinkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');

        assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, `var(${varName}, var(--blue))`);
        assert.strictEqual(firstLinkSwatch?.shadowRoot?.textContent, varName);
        assert.strictEqual(cssVarSwatch.textContent, `var(${varName}, var(--blue))`);
      }
    });

    it('should render CSSVarSwatches for multiple var() usages in the same property declaration', () => {
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, '--shadow', 'var(--a) var(--b)', true, false, true, false, '', undefined);
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

      const cssVarSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch');
      assert.strictEqual(cssVarSwatches?.length, 2);
    });

    it('should render a CSSVarSwatch for var() with spaces', () => {
      const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'var( --test    )', true, false, true, false, '', undefined);
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
      assertNotNullOrUndefined(stylePropertyTreeElement.valueElement);

      const cssVarSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-var-swatch');
      assertNotNullOrUndefined(cssVarSwatch);

      const linkSwatch = cssVarSwatch.shadowRoot?.querySelector('devtools-base-link-swatch');
      assert.strictEqual(linkSwatch?.shadowRoot?.textContent, '--test');
      assert.strictEqual(cssVarSwatch.textContent, 'var( --test    )');
      assert.strictEqual(stylePropertyTreeElement.valueElement.textContent, 'var( --test    )');
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
      positionFallbackRules: [],
      propertyRules: [],
      cssPropertyRegistrations: [],
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

        const ast = Elements.PropertyParser.tokenizePropertyValue(
            stylePropertyTreeElement.value, stylePropertyTreeElement.name);
        assertNotNullOrUndefined(ast);
        const {computedText} = Elements.PropertyParser.BottomUpTreeMatching.walk(
            ast, [Elements.StylePropertyTreeElement.VariableRenderer.matcher(
                     stylePropertyTreeElement, stylePropertyTreeElement.property.ownerStyle)]);
        const res = {
          hasUnresolvedVars: computedText.hasUnresolvedVars(0, value.length),
          computedText: computedText.get(0, value.length),
        };
        return res;
      }

      assert.deepStrictEqual(await matchProperty('var( --blue    )'), {hasUnresolvedVars: false, computedText: 'blue'});
      assert.deepStrictEqual(
          await matchProperty('var(--no, var(--blue))'), {hasUnresolvedVars: false, computedText: 'blue'});
      assert.deepStrictEqual(
          await matchProperty('pre var(--no) post'), {hasUnresolvedVars: true, computedText: 'pre var(--no) post'});
      assert.deepStrictEqual(
          await matchProperty('var(--no, var(--no2))'),
          {hasUnresolvedVars: true, computedText: 'var(--no, var(--no2))'});
    });
  });

  describe('ColorRenderer', () => {
    it('correctly renders children of the color swatch', () => {
      const property = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'rgb(255, var(--zero), var(--zero))', true, false, true, false, '',
          undefined);
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement?.textContent, property.value);
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assertNotNullOrUndefined(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HEX), '#ff0000');

      const varSwatches = stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-css-var-swatch');
      assertNotNullOrUndefined(varSwatches);
      assert.lengthOf(varSwatches, 2);
    });

    it('does not render an angle swatch for hues', () => {
      const property = new SDK.CSSProperty.CSSProperty(
          mockCssStyleDeclaration, 0, 'color', 'hsl(165deg 50% 25%)', true, false, true, false, '', undefined);
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane: stylesSidebarPane,
        section: mockStylePropertiesSection,
        matchedStyles: mockMatchedStyles,
        property,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      stylePropertyTreeElement.updateTitle();

      assert.strictEqual(stylePropertyTreeElement.valueElement?.textContent, property.value);
      const colorSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-swatch');
      assertNotNullOrUndefined(colorSwatch);
      assert.strictEqual(colorSwatch.getColor()?.asString(Common.Color.Format.HEX), '#206050');

      const angleSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-css-angle');
      assert.isNull(angleSwatch);
    });
  });
});
