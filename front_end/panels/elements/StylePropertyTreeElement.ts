// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  BezierPopoverIcon,
  ColorSwatchPopoverIcon,
  ColorSwatchPopoverIconEvents,
  ShadowSwatchPopoverHelper,
} from './ColorSwatchPopoverIcon.js';
import * as ElementsComponents from './components/components.js';
import {cssRuleValidatorsMap, type Hint} from './CSSRuleValidator.js';
import {ElementsPanel} from './ElementsPanel.js';
import {StyleEditorWidget} from './StyleEditorWidget.js';
import {type StylePropertiesSection} from './StylePropertiesSection.js';
import {getCssDeclarationAsJavascriptProperty} from './StylePropertyUtils.js';
import {
  CSSPropertyPrompt,
  REGISTERED_PROPERTY_SECTION_NAME,
  StylesSidebarPane,
  StylesSidebarPropertyRenderer,
} from './StylesSidebarPane.js';

const FlexboxEditor = ElementsComponents.StylePropertyEditor.FlexboxEditor;
const GridEditor = ElementsComponents.StylePropertyEditor.GridEditor;

export const activeHints = new WeakMap<Element, Hint>();

const UIStrings = {
  /**
   *@description Text in Color Swatch Popover Icon of the Elements panel
   */
  shiftClickToChangeColorFormat: 'Shift + Click to change color format.',
  /**
   *@description Swatch icon element title in Color Swatch Popover Icon of the Elements panel
   *@example {Shift + Click to change color format.} PH1
   */
  openColorPickerS: 'Open color picker. {PH1}',
  /**
   *@description Context menu item for style property in edit mode
   */
  togglePropertyAndContinueEditing: 'Toggle property and continue editing',
  /**
   *@description Context menu item for style property in edit mode
   */
  revealInSourcesPanel: 'Reveal in Sources panel',
  /**
   *@description A context menu item in Styles panel to copy CSS declaration
   */
  copyDeclaration: 'Copy declaration',
  /**
   *@description A context menu item in Styles panel to copy CSS property
   */
  copyProperty: 'Copy property',
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: 'Copy value',
  /**
   *@description A context menu item in Styles panel to copy CSS rule
   */
  copyRule: 'Copy rule',
  /**
   *@description A context menu item in Styles panel to copy all CSS declarations
   */
  copyAllDeclarations: 'Copy all declarations',
  /**
   *@description  A context menu item in Styles panel to copy all the CSS changes
   */
  copyAllCSSChanges: 'Copy all CSS changes',
  /**
   *@description A context menu item in Styles panel to view the computed CSS property value.
   */
  viewComputedValue: 'View computed value',
  /**
   * @description Title of the button that opens the flexbox editor in the Styles panel.
   */
  flexboxEditorButton: 'Open `flexbox` editor',
  /**
   * @description Title of the button that opens the CSS Grid editor in the Styles panel.
   */
  gridEditorButton: 'Open `grid` editor',
  /**
   *@description A context menu item in Styles panel to copy CSS declaration as JavaScript property.
   */
  copyCssDeclarationAsJs: 'Copy declaration as JS',
  /**
   *@description A context menu item in Styles panel to copy all declarations of CSS rule as JavaScript properties.
   */
  copyAllCssDeclarationsAsJs: 'Copy all declarations as JS',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/StylePropertyTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const parentMap = new WeakMap<StylesSidebarPane, StylePropertyTreeElement>();

interface StylePropertyTreeElementParams {
  stylesPane: StylesSidebarPane;
  matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
  property: SDK.CSSProperty.CSSProperty;
  isShorthand: boolean;
  inherited: boolean;
  overloaded: boolean;
  newProperty: boolean;
}

export class StylePropertyTreeElement extends UI.TreeOutline.TreeElement {
  private readonly style: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
  private matchedStylesInternal: SDK.CSSMatchedStyles.CSSMatchedStyles;
  property: SDK.CSSProperty.CSSProperty;
  private readonly inheritedInternal: boolean;
  private overloadedInternal: boolean;
  private parentPaneInternal: StylesSidebarPane;
  isShorthand: boolean;
  private readonly applyStyleThrottler: Common.Throttler.Throttler;
  private newProperty: boolean;
  private expandedDueToFilter: boolean;
  valueElement: HTMLElement|null;
  nameElement: HTMLElement|null;
  private expandElement: UI.Icon.Icon|null;
  private originalPropertyText: string;
  private hasBeenEditedIncrementally: boolean;
  private prompt: CSSPropertyPrompt|null;
  private lastComputedValue: string|null;
  private computedStyles: Map<string, string>|null = null;
  private parentsComputedStyles: Map<string, string>|null = null;
  private contextForTest!: Context|undefined;
  #propertyTextFromSource: string;

  constructor(
      {stylesPane, matchedStyles, property, isShorthand, inherited, overloaded, newProperty}:
          StylePropertyTreeElementParams,
  ) {
    // Pass an empty title, the title gets made later in onattach.
    super('', isShorthand);
    this.style = property.ownerStyle;
    this.matchedStylesInternal = matchedStyles;
    this.property = property;
    this.inheritedInternal = inherited;
    this.overloadedInternal = overloaded;
    this.selectable = false;
    this.parentPaneInternal = stylesPane;
    this.isShorthand = isShorthand;
    this.applyStyleThrottler = new Common.Throttler.Throttler(0);
    this.newProperty = newProperty;
    if (this.newProperty) {
      this.listItemElement.textContent = '';
    }
    this.expandedDueToFilter = false;
    this.valueElement = null;
    this.nameElement = null;
    this.expandElement = null;
    this.originalPropertyText = '';
    this.hasBeenEditedIncrementally = false;
    this.prompt = null;

    this.lastComputedValue = null;

    this.#propertyTextFromSource = property.propertyText || '';
  }

  matchedStyles(): SDK.CSSMatchedStyles.CSSMatchedStyles {
    return this.matchedStylesInternal;
  }

  private editable(): boolean {
    const isLonghandInsideShorthand = this.parent instanceof StylePropertyTreeElement && this.parent.isShorthand;
    const hasSourceData = Boolean(this.style.styleSheetId && this.style.range);
    return !isLonghandInsideShorthand && hasSourceData;
  }

  inherited(): boolean {
    return this.inheritedInternal;
  }

  overloaded(): boolean {
    return this.overloadedInternal;
  }

  setOverloaded(x: boolean): void {
    if (x === this.overloadedInternal) {
      return;
    }
    this.overloadedInternal = x;
    this.updateState();
  }

  setComputedStyles(computedStyles: Map<string, string>|null): void {
    this.computedStyles = computedStyles;
  }

  setParentsComputedStyles(parentsComputedStyles: Map<string, string>|null): void {
    this.parentsComputedStyles = parentsComputedStyles;
  }

  get name(): string {
    return this.property.name;
  }

  get value(): string {
    return this.property.value;
  }

  updateFilter(): boolean {
    const regex = this.parentPaneInternal.filterRegex();
    const matches = regex !== null && (regex.test(this.property.name) || regex.test(this.property.value));
    this.listItemElement.classList.toggle('filter-match', matches);

    void this.onpopulate();
    let hasMatchingChildren = false;

    for (let i = 0; i < this.childCount(); ++i) {
      const child = (this.childAt(i) as StylePropertyTreeElement | null);
      if (!child || (child && !child.updateFilter())) {
        continue;
      }
      hasMatchingChildren = true;
    }

    if (!regex) {
      if (this.expandedDueToFilter) {
        this.collapse();
      }
      this.expandedDueToFilter = false;
    } else if (hasMatchingChildren && !this.expanded) {
      this.expand();
      this.expandedDueToFilter = true;
    } else if (!hasMatchingChildren && this.expanded && this.expandedDueToFilter) {
      this.collapse();
      this.expandedDueToFilter = false;
    }
    return matches;
  }

  private renderColorSwatch(text: string, valueChild?: Node|null): Node {
    const useUserSettingFormat = this.editable();
    const shiftClickMessage = i18nString(UIStrings.shiftClickToChangeColorFormat);
    const tooltip = this.editable() ? i18nString(UIStrings.openColorPickerS, {PH1: shiftClickMessage}) : '';

    const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
    swatch.setReadonly(!this.editable());
    swatch.renderColor(text, useUserSettingFormat, tooltip);

    if (!valueChild) {
      valueChild = swatch.createChild('span');
      const color = swatch.getColor();
      valueChild.textContent =
          color ? (color.getAuthoredText() ?? color.asString(swatch.getFormat() ?? undefined)) : text;
    }
    swatch.appendChild(valueChild);

    const onColorChanged = (event: InlineEditor.ColorSwatch.ColorChangedEvent): void => {
      const {data} = event;
      swatch.firstElementChild && swatch.firstElementChild.remove();
      swatch.createChild('span').textContent = data.text;
      void this.applyStyleText(this.renderedPropertyText(), false);
    };

    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, () => {
      Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Color);
    });
    swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, onColorChanged);

    if (this.editable()) {
      const swatchIcon = new ColorSwatchPopoverIcon(this, this.parentPaneInternal.swatchPopoverHelper(), swatch);
      swatchIcon.addEventListener(ColorSwatchPopoverIconEvents.ColorChanged, ev => {
        // TODO(crbug.com/1402233): Is it really okay to dispatch an event from `Swatch` here?
        // This needs consideration as current structure feels a bit different:
        // There are: ColorSwatch, ColorSwatchPopoverIcon, and Spectrum
        // * Our entry into the Spectrum is `ColorSwatch` and `ColorSwatch` is able to
        // update the color too. (its format at least, don't know the difference)
        // * ColorSwatchPopoverIcon is a helper to show/hide the Spectrum popover
        // * Spectrum is the color picker
        //
        // My idea is: merge `ColorSwatch` and `ColorSwatchPopoverIcon`
        // and emit `ColorChanged` event whenever color is changed.
        // Until then, this is a hack to kind of emulate the behavior described above
        // `swatch` is dispatching its own ColorChangedEvent with the changed
        // color text whenever the color changes.
        swatch.dispatchEvent(new InlineEditor.ColorSwatch.ColorChangedEvent(ev.data));
      });
      void this.addColorContrastInfo(swatchIcon);
    }

    return swatch;
  }

  private processAnimationName(animationNamePropertyText: string): Node {
    const animationNames = animationNamePropertyText.split(',').map(name => name.trim());
    const contentChild = document.createElement('span');
    for (let i = 0; i < animationNames.length; i++) {
      const animationName = animationNames[i];
      const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
      UI.UIUtils.createTextChild(swatch, animationName);
      const isDefined = Boolean(this.matchedStylesInternal.keyframes().find(kf => kf.name().text === animationName));
      swatch.data = {
        text: animationName,
        isDefined,
        onLinkActivate: (): void => {
          Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.AnimationNameLink);
          this.parentPaneInternal.jumpToSectionBlock(`@keyframes ${animationName}`);
        },
        jslogContext: 'cssAnimationName',
      };
      contentChild.appendChild(swatch);

      if (i !== animationNames.length - 1) {
        contentChild.appendChild(document.createTextNode(', '));
      }
    }

    return contentChild;
  }

  private processAnimation(animationPropertyValue: string): Node {
    const animationNameProperty =
        this.property.getLonghandProperties().find(longhand => longhand.name === 'animation-name');
    if (!animationNameProperty) {
      return document.createTextNode(animationPropertyValue);
    }

    const animationNames = animationNameProperty.value.split(',').map(name => name.trim());
    const cssAnimationModel =
        InlineEditor.CSSAnimationModel.CSSAnimationModel.parse(animationPropertyValue, animationNames);
    const contentChild = document.createElement('span');
    for (let i = 0; i < cssAnimationModel.parts.length; i++) {
      const part = cssAnimationModel.parts[i];
      switch (part.type) {
        case InlineEditor.CSSAnimationModel.PartType.Text:
          contentChild.appendChild(document.createTextNode(part.value));
          break;
        case InlineEditor.CSSAnimationModel.PartType.EasingFunction:
          contentChild.appendChild(this.processBezier(part.value));
          break;
        case InlineEditor.CSSAnimationModel.PartType.AnimationName:
          contentChild.appendChild(this.processAnimationName(part.value));
          break;
        case InlineEditor.CSSAnimationModel.PartType.Variable:
          contentChild.appendChild(this.processVar(part.value));
          break;
      }

      if (cssAnimationModel.parts[i + 1]?.value !== ',' && i !== cssAnimationModel.parts.length - 1) {
        contentChild.appendChild(document.createTextNode(' '));
      }
    }

    return contentChild;
  }

  private processPositionFallback(propertyText: string): Node {
    const contentChild = document.createElement('span');
    const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
    UI.UIUtils.createTextChild(swatch, propertyText);
    const isDefined =
        Boolean(this.matchedStylesInternal.positionFallbackRules().find(pf => pf.name().text === propertyText));
    swatch.data = {
      text: propertyText,
      isDefined,
      onLinkActivate: (): void => {
        Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.PositionFallbackLink);
        this.parentPaneInternal.jumpToSectionBlock(`@position-fallback ${propertyText}`);
      },
      jslogContext: 'cssPositionFallback',
    };
    contentChild.appendChild(swatch);

    return contentChild;
  }

  private processColor(text: string, valueChild?: Node|null): Node {
    return this.renderColorSwatch(text, valueChild);
  }

  private processColorMix(text: string): Node {
    let colorMixText = text;
    let interpolationMethodResolvedCorrectly = false;
    const paramColorValues: string[] = [];
    const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse(text);
    if (!colorMixModel) {
      return document.createTextNode(text);
    }

    const handleInterpolationMethod = (interpolationMethod: string): void => {
      const matches =
          TextUtils.TextUtils.Utils.splitStringByRegexes(interpolationMethod, [SDK.CSSMetadata.VariableRegex]);
      for (const match of matches) {
        if (match.regexIndex === 0) {
          const computedSingleValue = this.matchedStylesInternal.computeSingleVariableValue(this.style, match.value);
          if (!computedSingleValue || !computedSingleValue.computedValue) {
            return;
          }

          colorMixText = colorMixText.replace(match.value, computedSingleValue.computedValue);
          const varSwatch = this.processVar(match.value);
          contentChild.appendChild(varSwatch);
        } else {
          contentChild.appendChild(document.createTextNode(match.value));
        }
      }

      interpolationMethodResolvedCorrectly = true;
      return;
    };

    const handleValue = (value: string, onChange: (newColorText: string) => void): void => {
      // Parameter is a CSS variable
      if (value.match(SDK.CSSMetadata.VariableRegex)) {
        const computedSingleValue = this.matchedStylesInternal.computeSingleVariableValue(this.style, value);
        // The variable is not defined or it is not a color
        if (!computedSingleValue || !computedSingleValue.computedValue ||
            !Common.Color.parse(computedSingleValue.computedValue)) {
          return;
        }

        const {computedValue} = computedSingleValue;
        // Update `var` reference in the color mix text with the variable's
        // computed value since the same variable is not defined in DevTools
        // reference to that in the CSS will result in undefined color.
        colorMixText = colorMixText.replace(value, computedValue);
        const varSwatch = this.processVar(value);
        if (varSwatch instanceof InlineEditor.ColorSwatch.ColorSwatch) {
          varSwatch.addEventListener(
              InlineEditor.ColorSwatch.ColorChangedEvent.eventName,
              (ev: InlineEditor.ColorSwatch.ColorChangedEvent) => {
                onChange(ev.data.text);
              });
        }
        contentChild.appendChild(varSwatch);
        paramColorValues.push(computedSingleValue.computedValue);
        return;
      }

      // Parameter is specified as an actual color (i.e. #000)
      if (value.match(Common.Color.Regex)) {
        const colorSwatch = this.processColor(value);
        if (colorSwatch instanceof InlineEditor.ColorSwatch.ColorSwatch) {
          colorSwatch.addEventListener(
              InlineEditor.ColorSwatch.ColorChangedEvent.eventName,
              (ev: InlineEditor.ColorSwatch.ColorChangedEvent) => {
                onChange(ev.data.text);
              });
        }

        contentChild.appendChild(colorSwatch);
        paramColorValues.push(value);
      }
    };

    const handleParam =
        (paramParts: InlineEditor.ColorMixModel.ParamPart[], onChange: (newColorText: string) => void): void => {
          for (let i = 0; i < paramParts.length; i++) {
            const part = paramParts[i];
            if (part.name === InlineEditor.ColorMixModel.PartName.Value) {
              handleValue(part.value, onChange);
            } else {
              contentChild.appendChild(document.createTextNode(part.value));
            }

            if (i !== paramParts.length - 1) {
              contentChild.appendChild(document.createTextNode(' '));
            }
          }
        };

    const [interpolationMethod, firstParam, secondParam] = colorMixModel.parts;
    const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
    const contentChild = document.createElement('span');
    contentChild.appendChild(document.createTextNode('color-mix('));
    handleInterpolationMethod(interpolationMethod.value);
    contentChild.appendChild(document.createTextNode(', '));
    handleParam(firstParam.value, (color: string) => {
      swatch.setFirstColor(color);
    });
    contentChild.appendChild(document.createTextNode(', '));
    handleParam(secondParam.value, (color: string) => {
      swatch.setSecondColor(color);
    });
    contentChild.appendChild(document.createTextNode(')'));

    if (paramColorValues.length !== 2 || !interpolationMethodResolvedCorrectly) {
      return document.createTextNode(text);
    }
    swatch.appendChild(contentChild);
    swatch.setFirstColor(paramColorValues[0]);
    swatch.setSecondColor(paramColorValues[1]);
    swatch.setColorMixText(colorMixText);

    return swatch;
  }

  private processVar(text: string): Node {
    const computedSingleValue = this.matchedStylesInternal.computeSingleVariableValue(this.style, text);
    if (!computedSingleValue) {
      return document.createTextNode(text);
    }

    const {computedValue, fromFallback} = computedSingleValue;

    const varSwatch = new InlineEditor.LinkSwatch.CSSVarSwatch();
    UI.UIUtils.createTextChild(varSwatch, text);
    varSwatch.data = {
      text,
      computedValue,
      fromFallback,
      onLinkActivate: this.handleVarDefinitionActivate.bind(this),
    };

    if (varSwatch.link?.linkElement) {
      const {textContent} = varSwatch.link.linkElement;
      this.parentPaneInternal.addPopover(
          varSwatch.link, () => textContent ? this.#getVariablePopoverContents(textContent, computedValue) : undefined);
    }

    if (!computedValue || !Common.Color.parse(computedValue)) {
      return varSwatch;
    }

    return this.processColor(computedValue, varSwatch);
  }

  private handleVarDefinitionActivate(variableName: string): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CustomPropertyLinkClicked);
    Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.VarLink);
    this.parentPaneInternal.jumpToProperty(variableName) ||
        this.parentPaneInternal.jumpToProperty('initial-value', variableName, REGISTERED_PROPERTY_SECTION_NAME);
  }

  private async addColorContrastInfo(swatchIcon: ColorSwatchPopoverIcon): Promise<void> {
    if (this.property.name !== 'color' || !this.parentPaneInternal.cssModel() || !this.node()) {
      return;
    }
    const cssModel = this.parentPaneInternal.cssModel();
    const node = this.node();
    if (cssModel && node && typeof node.id !== 'undefined') {
      const contrastInfo = new ColorPicker.ContrastInfo.ContrastInfo(await cssModel.getBackgroundColors(node.id));
      swatchIcon.setContrastInfo(contrastInfo);
    }
  }

  renderedPropertyText(): string {
    if (!this.nameElement || !this.valueElement) {
      return '';
    }
    return this.nameElement.textContent + ': ' + this.valueElement.textContent;
  }

  private processBezier(text: string): Node {
    if (!this.editable() || !InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(text)) {
      return document.createTextNode(text);
    }
    const swatchPopoverHelper = this.parentPaneInternal.swatchPopoverHelper();
    const swatch = InlineEditor.Swatches.BezierSwatch.create();
    swatch.iconElement().addEventListener('click', () => {
      Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.AnimationTiming);
    });
    swatch.setBezierText(text);
    new BezierPopoverIcon({treeElement: this, swatchPopoverHelper, swatch});
    return swatch;
  }

  private processFont(text: string): Node {
    const section = this.section();
    if (section) {
      section.registerFontProperty(this);
    }
    return document.createTextNode(text);
  }

  private processShadow(propertyValue: string, propertyName: string): Node {
    if (!this.editable()) {
      return document.createTextNode(propertyValue);
    }
    let shadows;
    if (propertyName === 'text-shadow') {
      shadows = InlineEditor.CSSShadowModel.CSSShadowModel.parseTextShadow(propertyValue);
    } else {
      shadows = InlineEditor.CSSShadowModel.CSSShadowModel.parseBoxShadow(propertyValue);
    }
    if (!shadows.length) {
      return document.createTextNode(propertyValue);
    }
    const container = document.createDocumentFragment();
    const swatchPopoverHelper = this.parentPaneInternal.swatchPopoverHelper();
    for (let i = 0; i < shadows.length; i++) {
      if (i !== 0) {
        container.appendChild(document.createTextNode(', '));
      }  // Add back commas and spaces between each shadow.
      // TODO(flandy): editing the property value should use the original value with all spaces.
      const cssShadowSwatch = InlineEditor.Swatches.CSSShadowSwatch.create();
      cssShadowSwatch.setAttribute(
          'jslog', `${VisualLogging.showStyleEditor().context('cssShadow').track({click: true})}`);
      cssShadowSwatch.setCSSShadow(shadows[i]);
      cssShadowSwatch.iconElement().addEventListener('click', () => {
        Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Shadow);
      });
      new ShadowSwatchPopoverHelper(this, swatchPopoverHelper, cssShadowSwatch);
      const colorSwatch = cssShadowSwatch.colorSwatch();
      if (colorSwatch) {
        colorSwatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, () => {
          Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Color);
        });
        const swatchIcon = new ColorSwatchPopoverIcon(this, swatchPopoverHelper, colorSwatch);
        swatchIcon.addEventListener(ColorSwatchPopoverIconEvents.ColorChanged, ev => {
          // TODO(crbug.com/1402233): Is it really okay to dispatch an event from `Swatch` here?
          colorSwatch.dispatchEvent(new InlineEditor.ColorSwatch.ColorChangedEvent(ev.data));
        });
        colorSwatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, () => {
          void this.applyStyleText(this.renderedPropertyText(), false);
        });
      }
      container.appendChild(cssShadowSwatch);
    }
    return container;
  }

  private processGrid(propertyValue: string, _propertyName: string): Node {
    const splitResult =
        TextUtils.TextUtils.Utils.splitStringByRegexes(propertyValue, [SDK.CSSMetadata.GridAreaRowRegex]);
    if (splitResult.length <= 1) {
      return document.createTextNode(propertyValue);
    }

    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    const container = document.createDocumentFragment();
    for (const result of splitResult) {
      const value = result.value.trim();
      const content = UI.Fragment.html`<br /><span class='styles-clipboard-only'>${indent.repeat(2)}</span>${value}`;
      container.appendChild(content);
    }
    return container;
  }

  private processAngle(angleText: string): Text|InlineEditor.CSSAngle.CSSAngle {
    if (!this.editable()) {
      return document.createTextNode(angleText);
    }
    const cssAngle = new InlineEditor.CSSAngle.CSSAngle();
    cssAngle.setAttribute('jslog', `${VisualLogging.showStyleEditor().track({click: true}).context('cssAngle')}`);
    const valueElement = document.createElement('span');
    valueElement.textContent = angleText;
    const computedPropertyValue =
        this.matchedStylesInternal.computeValue(this.property.ownerStyle, this.property.value) || '';
    cssAngle.data = {
      propertyName: this.property.name,
      propertyValue: computedPropertyValue,
      angleText,
      containingPane:
          (this.parentPaneInternal.element.enclosingNodeOrSelfWithClass('style-panes-wrapper') as HTMLElement),
    };
    cssAngle.append(valueElement);

    const popoverToggled = (event: Event): void => {
      const section = this.section();
      if (!section) {
        return;
      }

      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const {data} = (event as any);
      if (data.open) {
        this.parentPaneInternal.hideAllPopovers();
        this.parentPaneInternal.activeCSSAngle = cssAngle;
        Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Angle);
      }

      section.element.classList.toggle('has-open-popover', data.open);
      this.parentPaneInternal.setEditingStyle(data.open);
    };

    const valueChanged = async(event: Event): Promise<void> => {
      const {data} = (event as InlineEditor.InlineEditorUtils.ValueChangedEvent);

      valueElement.textContent = data.value;
      await this.applyStyleText(this.renderedPropertyText(), false);
      const computedPropertyValue =
          this.matchedStylesInternal.computeValue(this.property.ownerStyle, this.property.value) || '';
      cssAngle.updateProperty(this.property.name, computedPropertyValue);
    };

    const unitChanged = async(event: Event): Promise<void> => {
      const {data} = (event as InlineEditor.CSSAngle.UnitChangedEvent);
      valueElement.textContent = data.value;
    };

    cssAngle.addEventListener('popovertoggled', popoverToggled);
    cssAngle.addEventListener('valuechanged', valueChanged);
    cssAngle.addEventListener('unitchanged', unitChanged);

    return cssAngle;
  }

  private processLength(lengthText: string): Text|InlineEditor.CSSLength.CSSLength {
    if (!this.editable()) {
      return document.createTextNode(lengthText);
    }
    const cssLength = new InlineEditor.CSSLength.CSSLength();
    const valueElement = document.createElement('span');
    valueElement.textContent = lengthText;
    cssLength.data = {
      lengthText,
      overloaded: this.overloadedInternal,
    };
    cssLength.append(valueElement);

    const onValueChanged = (event: Event): void => {
      const {data} = (event as InlineEditor.InlineEditorUtils.ValueChangedEvent);

      valueElement.textContent = data.value;
      this.parentPaneInternal.setEditingStyle(true);
      void this.applyStyleText(this.renderedPropertyText(), false);
    };

    const onDraggingFinished = (): void => {
      this.parentPaneInternal.setEditingStyle(false);
    };

    cssLength.addEventListener('valuechanged', onValueChanged);
    cssLength.addEventListener('draggingfinished', onDraggingFinished);

    return cssLength;
  }

  private updateState(): void {
    if (!this.listItemElement) {
      return;
    }

    if (this.style.isPropertyImplicit(this.name)) {
      this.listItemElement.classList.add('implicit');
    } else {
      this.listItemElement.classList.remove('implicit');
    }

    const hasIgnorableError = !this.property.parsedOk && StylesSidebarPane.ignoreErrorsForProperty(this.property);
    if (hasIgnorableError) {
      this.listItemElement.classList.add('has-ignorable-error');
    } else {
      this.listItemElement.classList.remove('has-ignorable-error');
    }

    if (this.inherited()) {
      this.listItemElement.classList.add('inherited');
    } else {
      this.listItemElement.classList.remove('inherited');
    }

    if (this.overloaded()) {
      this.listItemElement.classList.add('overloaded');
    } else {
      this.listItemElement.classList.remove('overloaded');
    }

    if (this.property.disabled) {
      this.listItemElement.classList.add('disabled');
    } else {
      this.listItemElement.classList.remove('disabled');
    }

    this.listItemElement.classList.toggle('changed', this.isPropertyChanged(this.property));
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.parentPaneInternal.node();
  }

  parentPane(): StylesSidebarPane {
    return this.parentPaneInternal;
  }

  section(): StylePropertiesSection|null {
    if (!this.treeOutline) {
      return null;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.treeOutline as any).section;
  }

  private updatePane(): void {
    const section = this.section();
    if (section) {
      section.refreshUpdate(this);
    }
  }

  private async toggleDisabled(disabled: boolean): Promise<void> {
    const oldStyleRange = this.style.range;
    if (!oldStyleRange) {
      return;
    }

    this.parentPaneInternal.setUserOperation(true);
    const success = await this.property.setDisabled(disabled);
    this.parentPaneInternal.setUserOperation(false);

    if (!success) {
      return;
    }
    this.matchedStylesInternal.resetActiveProperties();
    this.updatePane();
    this.styleTextAppliedForTest();
  }

  private isPropertyChanged(property: SDK.CSSProperty.CSSProperty): boolean {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES)) {
      return false;
    }
    // Check local cache first, then check against diffs from the workspace.
    return this.#propertyTextFromSource !== property.propertyText || this.parentPane().isPropertyChanged(property);
  }

  override async onpopulate(): Promise<void> {
    // Only populate once and if this property is a shorthand.
    if (this.childCount() || !this.isShorthand) {
      return;
    }

    const longhandProperties = this.property.getLonghandProperties();
    const leadingProperties = this.style.leadingProperties();

    for (const property of longhandProperties) {
      const name = property.name;
      let inherited = false;
      let overloaded = false;

      const section = this.section();
      if (section) {
        inherited = section.isPropertyInherited(name);
        overloaded =
            this.matchedStylesInternal.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;
      }

      const leadingProperty = leadingProperties.find(property => property.name === name && property.activeInStyle());
      if (leadingProperty) {
        overloaded = true;
      }

      const item = new StylePropertyTreeElement({
        stylesPane: this.parentPaneInternal,
        matchedStyles: this.matchedStylesInternal,
        property,
        isShorthand: false,
        inherited,
        overloaded,
        newProperty: false,
      });
      item.setComputedStyles(this.computedStyles);
      item.setParentsComputedStyles(this.parentsComputedStyles);
      this.appendChild(item);
    }
  }

  override onattach(): void {
    this.updateTitle();

    this.listItemElement.addEventListener('mousedown', event => {
      if (event.button === 0) {
        parentMap.set(this.parentPaneInternal, this);
      }
    }, false);
    this.listItemElement.addEventListener('mouseup', this.mouseUp.bind(this));
    this.listItemElement.addEventListener('click', event => {
      if (!event.target) {
        return;
      }

      const node = (event.target as HTMLElement);
      if (!node.hasSelection() && event.target !== this.listItemElement) {
        event.consume(true);
      }
    });

    // Copy context menu.
    this.listItemElement.addEventListener('contextmenu', this.handleCopyContextMenuEvent.bind(this));
  }

  override onexpand(): void {
    this.updateExpandElement();
  }

  override oncollapse(): void {
    this.updateExpandElement();
  }

  private updateExpandElement(): void {
    if (!this.expandElement) {
      return;
    }
    if (this.expanded) {
      this.expandElement.setIconType('triangle-down');
    } else {
      this.expandElement.setIconType('triangle-right');
    }
  }

  #getRegisteredPropertyDetails(variableName: string): ElementsComponents.CSSVariableValueView.RegisteredPropertyDetails
      |undefined {
    const registration = this.matchedStyles().getRegisteredProperty(variableName);
    const goToDefinition = (): void =>
        this.parentPaneInternal.jumpToSection(variableName, REGISTERED_PROPERTY_SECTION_NAME);
    return registration ? {registration, goToDefinition} : undefined;
  }

  #getVariablePopoverContents(variableName: string, computedValue: string|null): HTMLElement|undefined {
    const registrationDetails = this.#getRegisteredPropertyDetails(variableName);
    if (!registrationDetails && !computedValue) {
      return undefined;
    }
    return new ElementsComponents.CSSVariableValueView.CSSVariableValueView(computedValue ?? '', registrationDetails);
  }

  updateTitleIfComputedValueChanged(): void {
    const computedValue = this.matchedStylesInternal.computeValue(this.property.ownerStyle, this.property.value);
    if (computedValue === this.lastComputedValue) {
      return;
    }
    this.lastComputedValue = computedValue;
    this.innerUpdateTitle();
  }

  updateTitle(): void {
    this.lastComputedValue = this.matchedStylesInternal.computeValue(this.property.ownerStyle, this.property.value);
    this.innerUpdateTitle();
  }

  private innerUpdateTitle(): void {
    this.updateState();
    if (this.isExpandable()) {
      this.expandElement = UI.Icon.Icon.create('triangle-right', 'expand-icon');
      this.expandElement.setAttribute('jslog', `${VisualLogging.treeItemExpand().track({click: true})}`);
    }

    const propertyRenderer =
        new StylesSidebarPropertyRenderer(this.style.parentRule, this.node(), this.name, this.value);
    if (this.property.parsedOk) {
      propertyRenderer.setVarHandler(this.processVar.bind(this));
      propertyRenderer.setAnimationNameHandler(this.processAnimationName.bind(this));
      propertyRenderer.setAnimationHandler(this.processAnimation.bind(this));
      propertyRenderer.setColorHandler(this.processColor.bind(this));
      propertyRenderer.setColorMixHandler(this.processColorMix.bind(this));
      propertyRenderer.setBezierHandler(this.processBezier.bind(this));
      propertyRenderer.setFontHandler(this.processFont.bind(this));
      propertyRenderer.setShadowHandler(this.processShadow.bind(this));
      propertyRenderer.setGridHandler(this.processGrid.bind(this));
      propertyRenderer.setAngleHandler(this.processAngle.bind(this));
      propertyRenderer.setLengthHandler(this.processLength.bind(this));
      propertyRenderer.setPositionFallbackHandler(this.processPositionFallback.bind(this));
    }

    this.listItemElement.removeChildren();
    this.nameElement = (propertyRenderer.renderName() as HTMLElement);
    if (this.property.name.startsWith('--') && this.nameElement) {
      this.parentPaneInternal.addPopover(
          this.nameElement,
          () => this.#getVariablePopoverContents(
              this.property.name, this.matchedStylesInternal.computeCSSVariable(this.style, this.property.name)));
    }
    this.valueElement = (propertyRenderer.renderValue() as HTMLElement);
    if (!this.treeOutline) {
      return;
    }

    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    UI.UIUtils.createTextChild(
        this.listItemElement.createChild('span', 'styles-clipboard-only'),
        indent + (this.property.disabled ? '/* ' : ''));
    if (this.nameElement) {
      this.listItemElement.appendChild(this.nameElement);
    }
    if (this.valueElement) {
      const lineBreakValue =
          this.valueElement.firstElementChild && this.valueElement.firstElementChild.tagName === 'BR';
      const separator = lineBreakValue ? ':' : ': ';
      this.listItemElement.createChild('span', 'styles-name-value-separator').textContent = separator;
      if (this.expandElement) {
        this.listItemElement.appendChild(this.expandElement);
      }
      this.listItemElement.appendChild(this.valueElement);
      const semicolon = this.listItemElement.createChild('span', 'styles-semicolon');
      semicolon.textContent = ';';
      semicolon.onmouseup = this.mouseUp.bind(this);
      if (this.property.disabled) {
        UI.UIUtils.createTextChild(this.listItemElement.createChild('span', 'styles-clipboard-only'), ' */');
      }
    }

    const section = this.section();
    if (this.valueElement && section && section.editable && this.property.name === 'display') {
      const propertyValue = this.property.trimmedValueWithoutImportant();
      const isFlex = propertyValue === 'flex' || propertyValue === 'inline-flex';
      const isGrid = propertyValue === 'grid' || propertyValue === 'inline-grid';
      if (isFlex || isGrid) {
        const key = `${section.getSectionIdx()}_${section.nextEditorTriggerButtonIdx}`;
        const button = StyleEditorWidget.createTriggerButton(
            this.parentPaneInternal, section, isFlex ? FlexboxEditor : GridEditor,
            isFlex ? i18nString(UIStrings.flexboxEditorButton) : i18nString(UIStrings.gridEditorButton), key);
        button.setAttribute(
            'jslog', `${VisualLogging.showStyleEditor().track({click: true}).context(isFlex ? 'flex' : 'grid')}`);
        section.nextEditorTriggerButtonIdx++;
        button.addEventListener('click', () => {
          Host.userMetrics.swatchActivated(
              isFlex ? Host.UserMetrics.SwatchType.Flex : Host.UserMetrics.SwatchType.Grid);
        });
        this.listItemElement.appendChild(button);
        const helper = this.parentPaneInternal.swatchPopoverHelper();
        if (helper.isShowing(StyleEditorWidget.instance()) && StyleEditorWidget.instance().getTriggerKey() === key) {
          helper.setAnchorElement(button);
        }
      }
    }

    if (this.property.parsedOk) {
      this.updateAuthoringHint();
    } else {
      // Avoid having longhands under an invalid shorthand.
      this.listItemElement.classList.add('not-parsed-ok');

      const registrationDetails = this.#getRegisteredPropertyDetails(this.property.name);
      const tooltip = registrationDetails ?
          new ElementsComponents.CSSVariableValueView.CSSVariableParserError(registrationDetails) :
          null;
      // Add a separate exclamation mark IMG element with a tooltip.
      this.listItemElement.insertBefore(
          this.parentPaneInternal.createExclamationMark(this.property, tooltip), this.listItemElement.firstChild);

      // When the property is valid but the property value is invalid,
      // add line-through only to the property value.
      const invalidPropertyValue = SDK.CSSMetadata.cssMetadata().isCSSPropertyName(this.property.name);
      if (invalidPropertyValue) {
        this.listItemElement.classList.add('invalid-property-value');
      }
    }

    if (!this.property.activeInStyle()) {
      this.listItemElement.classList.add('inactive');
    }
    this.updateFilter();

    if (this.property.parsedOk && this.section() && this.parent && this.parent.root) {
      const enabledCheckboxElement = document.createElement('input');
      enabledCheckboxElement.className = 'enabled-button';
      enabledCheckboxElement.type = 'checkbox';
      enabledCheckboxElement.checked = !this.property.disabled;
      enabledCheckboxElement.setAttribute('jslog', `${VisualLogging.toggle().track({click: true})}`);
      enabledCheckboxElement.addEventListener('mousedown', event => event.consume(), false);
      enabledCheckboxElement.addEventListener('click', event => {
        void this.toggleDisabled(!this.property.disabled);
        event.consume();
      }, false);
      if (this.nameElement && this.valueElement) {
        UI.ARIAUtils.setLabel(
            enabledCheckboxElement, `${this.nameElement.textContent} ${this.valueElement.textContent}`);
      }

      const copyIcon = UI.Icon.Icon.create('copy', 'copy');
      UI.Tooltip.Tooltip.install(copyIcon, i18nString(UIStrings.copyDeclaration));
      copyIcon.addEventListener('click', () => {
        const propertyText = `${this.property.name}: ${this.property.value};`;
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyText);
        Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.DeclarationViaChangedLine);
      });
      this.listItemElement.append(copyIcon);
      this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
    }
  }

  updateAuthoringHint(): void {
    this.listItemElement.classList.remove('inactive-property');
    const existingElement = this.listItemElement.querySelector('.hint');
    if (existingElement) {
      activeHints.delete(existingElement);
      existingElement?.closest('.hint-wrapper')?.remove();
    }
    const propertyName = this.property.name;

    if (!cssRuleValidatorsMap.has(propertyName)) {
      return;
    }

    // Different rules apply to SVG nodes altogether. We currently don't have SVG-specific hints.
    if (this.node()?.isSVGNode()) {
      return;
    }

    const cssModel = this.parentPaneInternal.cssModel();
    const fontFaces = cssModel?.fontFaces() || [];

    const localName = this.node()?.localName();
    for (const validator of cssRuleValidatorsMap.get(propertyName) || []) {
      const hint = validator.getHint(
          propertyName, this.computedStyles || undefined, this.parentsComputedStyles || undefined,
          localName?.toLowerCase(), fontFaces);
      if (hint) {
        Host.userMetrics.cssHintShown(validator.getMetricType());
        const wrapper = document.createElement('span');
        wrapper.classList.add('hint-wrapper');
        const hintIcon = new IconButton.Icon.Icon();
        hintIcon.data = {iconName: 'info', color: 'var(--icon-default)', width: '14px', height: '14px'};
        hintIcon.classList.add('hint');
        wrapper.append(hintIcon);
        activeHints.set(hintIcon, hint);
        this.listItemElement.append(wrapper);
        this.listItemElement.classList.add('inactive-property');
        break;
      }
    }
  }

  private mouseUp(event: MouseEvent): void {
    const activeTreeElement = parentMap.get(this.parentPaneInternal);
    parentMap.delete(this.parentPaneInternal);
    if (!activeTreeElement) {
      return;
    }
    if (this.listItemElement.hasSelection()) {
      return;
    }
    if (UI.UIUtils.isBeingEdited((event.target as Node))) {
      return;
    }

    event.consume(true);

    if (event.target === this.listItemElement) {
      return;
    }

    const section = this.section();
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && section && section.navigable) {
      this.navigateToSource((event.target as Element));
      return;
    }
    this.startEditing((event.target as Element));
  }

  private handleContextMenuEvent(context: Context, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (this.property.parsedOk && this.section() && this.parent && this.parent.root) {
      const sectionIndex = this.parentPaneInternal.focusedSectionIndex();
      contextMenu.defaultSection().appendCheckboxItem(
          i18nString(UIStrings.togglePropertyAndContinueEditing), async () => {
            if (this.treeOutline) {
              const propertyIndex = this.treeOutline.rootElement().indexOfChild(this);
              // order matters here: this.editingCancelled may invalidate this.treeOutline.
              this.editingCancelled(null, context);
              await this.toggleDisabled(!this.property.disabled);
              event.consume();
              this.parentPaneInternal.continueEditingElement(sectionIndex, propertyIndex);
            }
          }, !this.property.disabled);
    }
    const revealCallback = this.navigateToSource.bind(this) as () => void;
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.revealInSourcesPanel), revealCallback);
    void contextMenu.show();
  }

  private handleCopyContextMenuEvent(event: Event): void {
    const target = (event.target as Element | null);

    if (!target) {
      return;
    }

    const contextMenu = this.createCopyContextMenu(event);
    void contextMenu.show();
  }

  createCopyContextMenu(event: Event): UI.ContextMenu.ContextMenu {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyDeclaration), () => {
      const propertyText = `${this.property.name}: ${this.property.value};`;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.DeclarationViaContextMenu);
    });

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyProperty), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.name);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.PropertyViaContextMenu);
    });

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyValue), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.value);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.ValueViaContextMenu);
    });

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyRule), () => {
      const section = (this.section() as StylePropertiesSection);
      const ruleText = StylesSidebarPane.formatLeadingProperties(section).ruleText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.RuleViaContextMenu);
    });

    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.copyCssDeclarationAsJs), this.copyCssDeclarationAsJs.bind(this));

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllDeclarations), () => {
      const section = (this.section() as StylePropertiesSection);
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(section).allDeclarationText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllDeclarationsViaContextMenu);
    });

    contextMenu.clipboardSection().appendItem(
        i18nString(UIStrings.copyAllCssDeclarationsAsJs), this.copyAllCssDeclarationAsJs.bind(this));

    // TODO(changhaohan): conditionally add this item only when there are changes to copy
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyAllCSSChanges), async () => {
      const allChanges = await this.parentPane().getFormattedChanges();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allChanges);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllChangesViaStylesPane);
    });

    contextMenu.footerSection().appendItem(i18nString(UIStrings.viewComputedValue), () => {
      void this.viewComputedValue();
    });

    return contextMenu;
  }

  private async viewComputedValue(): Promise<void> {
    const computedStyleWidget = ElementsPanel.instance().getComputedStyleWidget();

    if (!computedStyleWidget.isShowing()) {
      await UI.ViewManager.ViewManager.instance().showView('Computed');
    }

    let propertyNamePattern = '';
    if (this.isShorthand) {
      propertyNamePattern = '^' + this.property.name + '-';
    } else {
      propertyNamePattern = '^' + this.property.name + '$';
    }
    const regex = new RegExp(propertyNamePattern, 'i');
    await computedStyleWidget.filterComputedStyles(regex);

    const filterInput = (computedStyleWidget.input as HTMLInputElement);
    filterInput.value = this.property.name;
    filterInput.focus();
  }

  private copyCssDeclarationAsJs(): void {
    const cssDeclarationValue = getCssDeclarationAsJavascriptProperty(this.property);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationValue);
    Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.DeclarationAsJSViaContextMenu);
  }

  private copyAllCssDeclarationAsJs(): void {
    const section = this.section() as StylePropertiesSection;
    const leadingProperties = (section.style()).leadingProperties();
    const cssDeclarationsAsJsProperties =
        leadingProperties.filter(property => !property.disabled).map(getCssDeclarationAsJavascriptProperty);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationsAsJsProperties.join(',\n'));
    Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllDeclarationsAsJSViaContextMenu);
  }

  private navigateToSource(element: Element, omitFocus?: boolean): void {
    const section = this.section();
    if (!section || !section.navigable) {
      return;
    }
    const propertyNameClicked = element === this.nameElement;
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.property, propertyNameClicked);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, omitFocus);
    }
  }

  startEditing(selectElement?: Element|null): void {
    // FIXME: we don't allow editing of longhand properties under a shorthand right now.
    if (this.parent instanceof StylePropertyTreeElement && this.parent.isShorthand) {
      return;
    }

    if (this.expandElement && selectElement === this.expandElement) {
      return;
    }

    const section = this.section();
    if (section && !section.editable) {
      return;
    }

    if (selectElement) {
      selectElement = selectElement.enclosingNodeOrSelfWithClass('webkit-css-property') ||
          selectElement.enclosingNodeOrSelfWithClass('value') ||
          selectElement.enclosingNodeOrSelfWithClass('styles-semicolon');
    }
    if (!selectElement) {
      selectElement = this.nameElement;
    }

    if (UI.UIUtils.isBeingEdited(selectElement)) {
      return;
    }

    const isEditingName = selectElement === this.nameElement;
    if (!isEditingName && this.valueElement) {
      if (SDK.CSSMetadata.cssMetadata().isGridAreaDefiningProperty(this.name)) {
        this.valueElement.textContent = restoreGridIndents(this.value);
      }
      this.valueElement.textContent = restoreURLs(this.valueElement.textContent || '', this.value);
      selectElement = this.valueElement;
    }

    function restoreGridIndents(value: string): string {
      const splitResult = TextUtils.TextUtils.Utils.splitStringByRegexes(value, [SDK.CSSMetadata.GridAreaRowRegex]);
      return splitResult.map(result => result.value.trim()).join('\n');
    }

    function restoreURLs(fieldValue: string, modelValue: string): string {
      const splitFieldValue = fieldValue.split(SDK.CSSMetadata.URLRegex);
      if (splitFieldValue.length === 1) {
        return fieldValue;
      }
      const modelUrlRegex = new RegExp(SDK.CSSMetadata.URLRegex);
      for (let i = 1; i < splitFieldValue.length; i += 2) {
        const match = modelUrlRegex.exec(modelValue);
        if (match) {
          splitFieldValue[i] = match[0];
        }
      }
      return splitFieldValue.join('');
    }

    const previousContent = selectElement ? (selectElement.textContent || '') : '';

    const context: Context = {
      expanded: this.expanded,
      hasChildren: this.isExpandable(),
      isEditingName: isEditingName,
      originalProperty: this.property,
      previousContent: previousContent,
      originalName: undefined,
      originalValue: undefined,
    };
    this.contextForTest = context;

    // Lie about our children to prevent expanding on double click and to collapse shorthands.
    this.setExpandable(false);

    if (selectElement) {
      if (selectElement.parentElement) {
        selectElement.parentElement.classList.add('child-editing');
      }
      selectElement.textContent = selectElement.textContent;  // remove color swatch and the like
    }

    function pasteHandler(this: StylePropertyTreeElement, context: Context, event: Event): void {
      const clipboardEvent = (event as ClipboardEvent);
      const clipboardData = clipboardEvent.clipboardData;
      if (!clipboardData) {
        return;
      }

      const data = clipboardData.getData('Text');
      if (!data) {
        return;
      }
      const colonIdx = data.indexOf(':');
      if (colonIdx < 0) {
        return;
      }
      const name = data.substring(0, colonIdx).trim();
      const value = data.substring(colonIdx + 1).trim();

      event.preventDefault();

      if (typeof context.originalName === 'undefined') {
        if (this.nameElement) {
          context.originalName = this.nameElement.textContent || '';
        }

        if (this.valueElement) {
          context.originalValue = this.valueElement.textContent || '';
        }
      }
      this.property.name = name;
      this.property.value = value;
      if (this.nameElement) {
        this.nameElement.textContent = name;
        this.nameElement.normalize();
      }

      if (this.valueElement) {
        this.valueElement.textContent = value;
        this.valueElement.normalize();
      }

      const target = (event.target as HTMLElement);
      void this.editingCommitted(target.textContent || '', context, 'forward');
    }

    function blurListener(this: StylePropertyTreeElement, context: Context, event: Event): void {
      const target = (event.target as HTMLElement);
      let text: (string|null) = target.textContent;
      if (!context.isEditingName) {
        text = this.value || text;
      }
      void this.editingCommitted(text || '', context, '');
    }

    this.originalPropertyText = this.property.propertyText || '';

    this.parentPaneInternal.setEditingStyle(true, this);
    if (selectElement && selectElement.parentElement) {
      selectElement.parentElement.scrollIntoViewIfNeeded(false);
    }

    this.prompt = new CSSPropertyPrompt(this, isEditingName);
    this.prompt.setAutocompletionTimeout(0);

    this.prompt.addEventListener(UI.TextPrompt.Events.TextChanged, _event => {
      void this.applyFreeFlowStyleTextEdit(context);
    });

    const invalidString = this.property.getInvalidStringForInvalidProperty();
    if (invalidString && selectElement) {
      UI.ARIAUtils.alert(invalidString);
    }

    if (selectElement) {
      const proxyElement = this.prompt.attachAndStartEditing(selectElement, blurListener.bind(this, context));
      this.navigateToSource(selectElement, true);

      proxyElement.addEventListener('keydown', this.editingNameValueKeyDown.bind(this, context), false);
      proxyElement.addEventListener('keypress', this.editingNameValueKeyPress.bind(this, context), false);
      if (isEditingName) {
        proxyElement.addEventListener('paste', pasteHandler.bind(this, context), false);
        proxyElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this, context), false);
      }

      const componentSelection = selectElement.getComponentSelection();
      if (componentSelection) {
        componentSelection.selectAllChildren(selectElement);
      }
    }
  }

  private editingNameValueKeyDown(context: Context, event: Event): void {
    if (event.handled) {
      return;
    }

    const keyboardEvent = (event as KeyboardEvent);
    const target = (keyboardEvent.target as HTMLElement);
    let result;
    if ((keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) ||
        (context.isEditingName && keyboardEvent.key === ' ')) {
      result = 'forward';
    } else if (
        keyboardEvent.keyCode === UI.KeyboardShortcut.Keys.Esc.code ||
        keyboardEvent.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      result = 'cancel';
    } else if (
        !context.isEditingName && this.newProperty &&
        keyboardEvent.keyCode === UI.KeyboardShortcut.Keys.Backspace.code) {
      // For a new property, when Backspace is pressed at the beginning of new property value, move back to the property name.
      const selection = target.getComponentSelection();
      if (selection && selection.isCollapsed && !selection.focusOffset) {
        event.preventDefault();
        result = 'backward';
      }
    } else if (keyboardEvent.key === 'Tab') {
      result = keyboardEvent.shiftKey ? 'backward' : 'forward';
      event.preventDefault();
    }

    if (result) {
      switch (result) {
        case 'cancel':
          this.editingCancelled(null, context);
          break;
        case 'forward':
        case 'backward':
          void this.editingCommitted(target.textContent || '', context, result);
          break;
      }

      event.consume();
      return;
    }
  }

  private editingNameValueKeyPress(context: Context, event: Event): void {
    function shouldCommitValueSemicolon(text: string, cursorPosition: number): boolean {
      // FIXME: should this account for semicolons inside comments?
      let openQuote = '';
      for (let i = 0; i < cursorPosition; ++i) {
        const ch = text[i];
        if (ch === '\\' && openQuote !== '') {
          ++i;
        }  // skip next character inside string
        else if (!openQuote && (ch === '"' || ch === '\'')) {
          openQuote = ch;
        } else if (openQuote === ch) {
          openQuote = '';
        }
      }
      return !openQuote;
    }

    const keyboardEvent = (event as KeyboardEvent);
    const target = (keyboardEvent.target as HTMLElement);
    const keyChar = String.fromCharCode(keyboardEvent.charCode);
    const selectionLeftOffset = this.#selectionLeftOffset(target);
    const isFieldInputTerminated =
        (context.isEditingName ? keyChar === ':' :
                                 keyChar === ';' && selectionLeftOffset !== null &&
                 shouldCommitValueSemicolon(target.textContent || '', selectionLeftOffset));
    if (isFieldInputTerminated) {
      // Enter or colon (for name)/semicolon outside of string (for value).
      event.consume(true);
      void this.editingCommitted(target.textContent || '', context, 'forward');
      return;
    }
  }

  /** @returns Selection offset relative to `element` */
  #selectionLeftOffset(element: HTMLElement): number|null {
    const selection = element.getComponentSelection();
    if (!selection?.containsNode(element, true)) {
      return null;
    }

    let leftOffset = selection.anchorOffset;
    let node: ChildNode|(Node | null) = selection.anchorNode;

    while (node !== element) {
      while (node?.previousSibling) {
        node = node.previousSibling;
        leftOffset += node.textContent?.length ?? 0;
      }
      node = node?.parentNodeOrShadowHost() ?? null;
    }

    return leftOffset;
  }

  private async applyFreeFlowStyleTextEdit(context: Context): Promise<void> {
    if (!this.prompt || !this.parentPaneInternal.node()) {
      return;
    }

    const enteredText = this.prompt.text();
    if (context.isEditingName && enteredText.includes(':')) {
      void this.editingCommitted(enteredText, context, 'forward');
      return;
    }

    const valueText = this.prompt.textWithCurrentSuggestion();
    if (valueText.includes(';')) {
      return;
    }
    // Prevent destructive side-effects during live-edit. crbug.com/433889
    const parentNode = this.parentPaneInternal.node();
    if (parentNode) {
      const isPseudo = Boolean(parentNode.pseudoType());
      if (isPseudo) {
        if (this.name.toLowerCase() === 'content') {
          return;
        }
        const lowerValueText = valueText.trim().toLowerCase();
        if (lowerValueText.startsWith('content:') || lowerValueText === 'display: none') {
          return;
        }
      }
    }

    if (context.isEditingName) {
      if (valueText.includes(':')) {
        await this.applyStyleText(valueText, false);
      } else if (this.hasBeenEditedIncrementally) {
        await this.applyOriginalStyle(context);
      }
    } else {
      if (this.nameElement) {
        await this.applyStyleText(`${this.nameElement.textContent}: ${valueText}`, false);
      }
    }
  }

  kickFreeFlowStyleEditForTest(): Promise<void> {
    const context = this.contextForTest;
    return this.applyFreeFlowStyleTextEdit((context as Context));
  }

  editingEnded(context: Context): void {
    this.setExpandable(context.hasChildren);
    if (context.expanded) {
      this.expand();
    }
    const editedElement = context.isEditingName ? this.nameElement : this.valueElement;
    // The proxyElement has been deleted, no need to remove listener.
    if (editedElement && editedElement.parentElement) {
      editedElement.parentElement.classList.remove('child-editing');
    }

    this.parentPaneInternal.setEditingStyle(false);
  }

  editingCancelled(element: Element|null, context: Context): void {
    this.removePrompt();

    if (this.hasBeenEditedIncrementally) {
      void this.applyOriginalStyle(context);
    } else if (this.newProperty && this.treeOutline) {
      this.treeOutline.removeChild(this);
    }
    this.updateTitle();

    // This should happen last, as it clears the info necessary to restore the property value after [Page]Up/Down changes.
    this.editingEnded(context);
  }

  private async applyOriginalStyle(context: Context): Promise<void> {
    await this.applyStyleText(this.originalPropertyText, false, context.originalProperty);
  }

  private findSibling(moveDirection: string): StylePropertyTreeElement|null {
    let target: (StylePropertyTreeElement|null)|this = this;
    do {
      const sibling: UI.TreeOutline.TreeElement|null =
          moveDirection === 'forward' ? target.nextSibling : target.previousSibling;
      target = sibling instanceof StylePropertyTreeElement ? sibling : null;
    } while (target && target.inherited());

    return target;
  }

  private async editingCommitted(userInput: string, context: Context, moveDirection: string): Promise<void> {
    this.removePrompt();
    this.editingEnded(context);
    const isEditingName = context.isEditingName;
    // If the underlying property has been ripped out, always assume that the value having been entered was
    // a name-value pair and attempt to process it via the SDK.
    if (!this.nameElement || !this.valueElement) {
      return;
    }

    const nameElementValue = this.nameElement.textContent || '';
    const nameValueEntered = (isEditingName && nameElementValue.includes(':')) || !this.property;

    // Determine where to move to before making changes
    let createNewProperty = false;
    let moveToSelector = false;
    const isDataPasted = typeof context.originalName !== 'undefined';
    const isDirtyViaPaste = isDataPasted &&
        (this.nameElement.textContent !== context.originalName ||
         this.valueElement.textContent !== context.originalValue);
    const isPropertySplitPaste =
        isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
    let moveTo: (StylePropertyTreeElement|null)|this = this;
    const moveToOther = (isEditingName !== (moveDirection === 'forward'));
    const abandonNewProperty = this.newProperty && !userInput && (moveToOther || isEditingName);
    if (moveDirection === 'forward' && (!isEditingName || isPropertySplitPaste) ||
        moveDirection === 'backward' && isEditingName) {
      moveTo = moveTo.findSibling(moveDirection);
      if (!moveTo) {
        if (moveDirection === 'forward' && (!this.newProperty || userInput)) {
          createNewProperty = true;
        } else if (moveDirection === 'backward') {
          moveToSelector = true;
        }
      }
    }

    // Make the Changes and trigger the moveToNextCallback after updating.
    let moveToIndex = -1;
    if (moveTo !== null && this.treeOutline) {
      moveToIndex = this.treeOutline.rootElement().indexOfChild((moveTo as UI.TreeOutline.TreeElement));
    }
    const blankInput = Platform.StringUtilities.isWhitespace(userInput);
    const shouldCommitNewProperty = this.newProperty &&
        (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput) ||
         nameValueEntered);
    const section = (this.section() as StylePropertiesSection);
    if (((userInput !== context.previousContent || isDirtyViaPaste) && !this.newProperty) || shouldCommitNewProperty) {
      let propertyText;
      if (nameValueEntered) {
        propertyText = this.nameElement.textContent;
      } else if (
          blankInput ||
          (this.newProperty && Platform.StringUtilities.isWhitespace(this.valueElement.textContent || ''))) {
        propertyText = '';
      } else {
        if (isEditingName) {
          propertyText = userInput + ': ' + this.property.value;
        } else {
          propertyText = this.property.name + ': ' + userInput;
        }
      }
      await this.applyStyleText(propertyText || '', true);
      moveToNextCallback.call(this, this.newProperty, !blankInput, section);
    } else {
      if (isEditingName) {
        this.property.name = userInput;
      } else {
        this.property.value = userInput;
      }
      if (!isDataPasted && !this.newProperty) {
        this.updateTitle();
      }
      moveToNextCallback.call(this, this.newProperty, false, section);
    }

    /**
     * The Callback to start editing the next/previous property/selector.
     */
    function moveToNextCallback(
        this: StylePropertyTreeElement, alreadyNew: boolean, valueChanged: boolean,
        section: StylePropertiesSection): void {
      if (!moveDirection) {
        this.parentPaneInternal.resetFocus();
        return;
      }

      // User just tabbed through without changes.
      if (moveTo && moveTo.parent) {
        moveTo.startEditing(!isEditingName ? moveTo.nameElement : moveTo.valueElement);
        return;
      }

      // User has made a change then tabbed, wiping all the original treeElements.
      // Recalculate the new treeElement for the same property we were going to edit next.
      if (moveTo && !moveTo.parent) {
        const rootElement = section.propertiesTreeOutline.rootElement();
        if (moveDirection === 'forward' && blankInput && !isEditingName) {
          --moveToIndex;
        }
        if (moveToIndex >= rootElement.childCount() && !this.newProperty) {
          createNewProperty = true;
        } else {
          const treeElement =
              (moveToIndex >= 0 ? rootElement.childAt(moveToIndex) : null) as StylePropertyTreeElement | null;
          if (treeElement) {
            let elementToEdit =
                !isEditingName || isPropertySplitPaste ? treeElement.nameElement : treeElement.valueElement;
            if (alreadyNew && blankInput) {
              elementToEdit = moveDirection === 'forward' ? treeElement.nameElement : treeElement.valueElement;
            }
            treeElement.startEditing(elementToEdit);
            return;
          }
          if (!alreadyNew) {
            moveToSelector = true;
          }
        }
      }

      // Create a new attribute in this section (or move to next editable selector if possible).
      if (createNewProperty) {
        if (alreadyNew && !valueChanged && (isEditingName !== (moveDirection === 'backward'))) {
          return;
        }

        section.addNewBlankProperty().startEditing();
        return;
      }

      if (abandonNewProperty) {
        moveTo = this.findSibling(moveDirection);
        const sectionToEdit = (moveTo || moveDirection === 'backward') ? section : section.nextEditableSibling();
        if (sectionToEdit) {
          if (sectionToEdit.style().parentRule) {
            sectionToEdit.startEditingSelector();
          } else {
            sectionToEdit.moveEditorFromSelector(moveDirection);
          }
        }
        return;
      }

      if (moveToSelector) {
        if (section.style().parentRule) {
          section.startEditingSelector();
        } else {
          section.moveEditorFromSelector(moveDirection);
        }
      }
    }
  }

  private removePrompt(): void {
    // BUG 53242. This cannot go into editingEnded(), as it should always happen first for any editing outcome.
    if (this.prompt) {
      this.prompt.detach();
      this.prompt = null;
    }
  }

  styleTextAppliedForTest(): void {
  }

  applyStyleText(styleText: string, majorChange: boolean, property?: SDK.CSSProperty.CSSProperty|null): Promise<void> {
    return this.applyStyleThrottler.schedule(this.innerApplyStyleText.bind(this, styleText, majorChange, property));
  }

  private async innerApplyStyleText(
      styleText: string, majorChange: boolean, property?: SDK.CSSProperty.CSSProperty|null): Promise<void> {
    // this.property might have been nulled at the end of the last innerApplyStyleText
    if (!this.treeOutline || !this.property) {
      return;
    }

    const oldStyleRange = this.style.range;
    if (!oldStyleRange) {
      return;
    }

    const hasBeenEditedIncrementally = this.hasBeenEditedIncrementally;
    styleText = styleText.replace(/[\xA0\t]/g, ' ').trim();  // Replace &nbsp; with whitespace.
    if (!styleText.length && majorChange && this.newProperty && !hasBeenEditedIncrementally) {
      // The user deleted everything and never applied a new property value via Up/Down scrolling/live editing, so remove the tree element and update.
      this.parent && this.parent.removeChild(this);
      return;
    }

    const currentNode = this.parentPaneInternal.node();
    this.parentPaneInternal.setUserOperation(true);

    styleText += Platform.StringUtilities.findUnclosedCssQuote(styleText);
    styleText += ')'.repeat(Platform.StringUtilities.countUnmatchedLeftParentheses(styleText));

    // Append a ";" if the new text does not end in ";".
    // FIXME: this does not handle trailing comments.
    if (styleText.length && !/;\s*$/.test(styleText)) {
      styleText += ';';
    }

    const overwriteProperty = !this.newProperty || hasBeenEditedIncrementally;
    let success: boolean = await this.property.setText(styleText, majorChange, overwriteProperty);
    // Revert to the original text if applying the new text failed
    if (hasBeenEditedIncrementally && majorChange && !success) {
      majorChange = false;
      success = await this.property.setText(this.originalPropertyText, majorChange, overwriteProperty);
    }
    this.parentPaneInternal.setUserOperation(false);

    // TODO: using this.property.index to access its containing StyleDeclaration's property will result in
    // off-by-1 errors when the containing StyleDeclaration's respective property has already been deleted.
    // These referencing logic needs to be updated to be more robust.
    const updatedProperty = property || this.style.propertyAt(this.property.index);
    const isPropertyWithinBounds = this.property.index < this.style.allProperties().length;
    if (!success || (!updatedProperty && isPropertyWithinBounds)) {
      if (majorChange) {
        // It did not apply, cancel editing.
        if (this.newProperty) {
          this.treeOutline.removeChild(this);
        } else {
          this.updateTitle();
        }
      }
      this.styleTextAppliedForTest();
      return;
    }
    if (updatedProperty) {
      this.listItemElement.classList.toggle('changed', this.isPropertyChanged(updatedProperty));
      this.parentPane().updateChangeStatus();
    }

    this.matchedStylesInternal.resetActiveProperties();
    this.hasBeenEditedIncrementally = true;

    // null check for updatedProperty before setting this.property as the code never expects this.property to be undefined or null.
    // This occurs when deleting the last index of a StylePropertiesSection as this.style._allProperties array gets updated
    // before we index it when setting the value for updatedProperty
    const deleteProperty = majorChange && !styleText.length;
    const section = this.section();
    if (deleteProperty && section) {
      section.resetToolbars();
    } else if (!deleteProperty && updatedProperty) {
      this.property = updatedProperty;
    }

    if (currentNode === this.node()) {
      this.updatePane();
    }

    this.styleTextAppliedForTest();
  }

  override ondblclick(): boolean {
    return true;  // handled
  }

  override isEventWithinDisclosureTriangle(event: Event): boolean {
    return event.target === this.expandElement;
  }
}
export interface Context {
  expanded: boolean;
  hasChildren: boolean;
  isEditingName: boolean;
  originalProperty?: SDK.CSSProperty.CSSProperty;
  originalName?: string;
  originalValue?: string;
  previousContent: string;
}
