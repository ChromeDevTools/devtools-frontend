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
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
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
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {
  AngleMatch,
  AngleMatcher,
  BezierMatch,
  BezierMatcher,
  type BottomUpTreeMatching,
  children,
  ColorMatch,
  ColorMatcher,
  ColorMixMatch,
  ColorMixMatcher,
  type CSSControlMap,
  LinkableNameMatch,
  LinkableNameMatcher,
  LinkableNameProperties,
  Renderer,
  type RenderingContext,
  StringMatch,
  StringMatcher,
  URLMatch,
  URLMatcher,
  VariableMatch,
  VariableMatcher,
} from './PropertyParser.js';
import {StyleEditorWidget} from './StyleEditorWidget.js';
import {type StylePropertiesSection} from './StylePropertiesSection.js';
import {getCssDeclarationAsJavascriptProperty} from './StylePropertyUtils.js';
import {
  CSSPropertyPrompt,
  REGISTERED_PROPERTY_SECTION_NAME,
  StylesSidebarPane,
  StylesSidebarPropertyRenderer,
  unescapeCssString,
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
  section: StylePropertiesSection;
  matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
  property: SDK.CSSProperty.CSSProperty;
  isShorthand: boolean;
  inherited: boolean;
  overloaded: boolean;
  newProperty: boolean;
}

export class VariableRenderer extends VariableMatch {
  readonly #treeElement: StylePropertyTreeElement;
  readonly #style: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
  constructor(
      treeElement: StylePropertyTreeElement, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, text: string,
      name: string, fallback: CodeMirror.SyntaxNode[], matching: BottomUpTreeMatching) {
    super(text, name, fallback, matching);
    this.#treeElement = treeElement;
    this.#style = style;
  }

  resolveVariable(): SDK.CSSMatchedStyles.CSSVariableValue|null {
    return this.#matchedStyles.computeCSSVariable(this.#style, this.name);
  }

  fallbackValue(): string|null {
    if (this.fallback.length === 0 || this.fallback.some(node => this.matching.hasUnresolvedVars(node))) {
      return null;
    }
    return this.fallback.map(node => this.matching.getComputedText(node)).join(' ');
  }

  computedText(): string|null {
    return this.resolveVariable()?.value ?? this.fallbackValue();
  }

  render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[] {
    const renderedFallback = this.fallback.length > 0 ? Renderer.render(this.fallback, context) : undefined;

    const {declaration, value: variableValue} = this.resolveVariable() ?? {};
    const fromFallback = !variableValue;
    const computedValue = variableValue ?? this.fallbackValue();

    const varSwatch = new InlineEditor.LinkSwatch.CSSVarSwatch();
    varSwatch.data = {
      computedValue,
      variableName: this.name,
      fromFallback,
      fallbackText: this.fallback.map(n => context.ast.text(n)).join(' '),
      onLinkActivate: name => this.#handleVarDefinitionActivate(declaration ?? name),
    };

    if (renderedFallback?.nodes.length) {
      // When slotting someting into the fallback slot, also emit text children so that .textContent produces the
      // correct var value.
      varSwatch.appendChild(document.createTextNode(`var(${this.name}`));
      const span = varSwatch.appendChild(document.createElement('span'));
      span.appendChild(document.createTextNode(', '));
      span.slot = 'fallback';
      renderedFallback.nodes.forEach(n => span.appendChild(n));
      varSwatch.appendChild(document.createTextNode(')'));
    } else {
      UI.UIUtils.createTextChild(varSwatch, this.text);
    }

    if (varSwatch.link) {
      this.#pane.addPopover(varSwatch.link, {
        contents: () => this.#treeElement.getVariablePopoverContents(this.name, variableValue ?? null),
        jslogContext: 'elements.css-var',
      });
    }

    if (!computedValue || !Common.Color.parse(computedValue)) {
      return [varSwatch];
    }

    const colorSwatch = new ColorRenderer(this.#treeElement, computedValue).renderColorSwatch(varSwatch);
    context.addControl('color', colorSwatch);
    return [colorSwatch];
  }

  static matcher(treeElement: StylePropertyTreeElement, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration):
      VariableMatcher {
    return new VariableMatcher(
        (text, name, fallback, matching) => new VariableRenderer(treeElement, style, text, name, fallback, matching));
  }

  get #pane(): StylesSidebarPane {
    return this.#treeElement.parentPane();
  }

  get #matchedStyles(): SDK.CSSMatchedStyles.CSSMatchedStyles {
    return this.#treeElement.matchedStyles();
  }

  #handleVarDefinitionActivate(variable: string|SDK.CSSProperty.CSSProperty|
                               SDK.CSSMatchedStyles.CSSRegisteredProperty): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CustomPropertyLinkClicked);
    Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.VarLink);
    if (variable instanceof SDK.CSSProperty.CSSProperty) {
      this.#pane.revealProperty(variable);
    } else if (variable instanceof SDK.CSSMatchedStyles.CSSRegisteredProperty) {
      this.#pane.jumpToProperty('initial-value', variable.propertyName(), REGISTERED_PROPERTY_SECTION_NAME);
    } else {
      this.#pane.jumpToProperty(variable) ||
          this.#pane.jumpToProperty('initial-value', variable, REGISTERED_PROPERTY_SECTION_NAME);
    }
  }
}

export class ColorRenderer extends ColorMatch {
  constructor(private readonly treeElement: StylePropertyTreeElement, text: string) {
    super(text);
  }

  static matcher(treeElement: StylePropertyTreeElement): ColorMatcher {
    return new ColorMatcher(text => new ColorRenderer(treeElement, text));
  }

  #getValueChild(node: CodeMirror.SyntaxNode, context: RenderingContext):
      {valueChild: HTMLSpanElement, cssControls?: CSSControlMap} {
    const valueChild = document.createElement('span');
    if (node.name === 'ColorLiteral' || (node.name === 'ValueName' && Common.Color.Nicknames.has(this.text))) {
      valueChild.appendChild(document.createTextNode(this.text));
      return {valueChild};
    }
    const {cssControls} = Renderer.renderInto(children(node), context, valueChild);
    return {valueChild, cssControls};
  }

  render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[] {
    const {valueChild, cssControls} = this.#getValueChild(node, context);
    const swatch = this.renderColorSwatch(valueChild, context.matchedResult.getComputedText(node));
    context.addControl('color', swatch);

    if (cssControls && node.name === 'CallExpression' &&
        context.ast.text(node.getChild('Callee')).match(/^(hsla?|hwba?)/)) {
      const angles = cssControls.get('angle');
      if (angles?.length === 1 && angles[0] instanceof InlineEditor.CSSAngle.CSSAngle) {
        angles[0].addEventListener(InlineEditor.InlineEditorUtils.ValueChangedEvent.eventName, ev => {
          const hue = Common.Color.parseHueNumeric(ev.data.value);
          const color = swatch.getColor();
          if (!hue || !color) {
            return;
          }
          if (color.is(Common.Color.Format.HSL) || color.is(Common.Color.Format.HSLA)) {
            swatch.renderColor(new Common.Color.HSL(hue, color.s, color.l, color.alpha));
          } else if (color.is(Common.Color.Format.HWB) || color.is(Common.Color.Format.HWBA)) {
            swatch.renderColor(new Common.Color.HWB(hue, color.w, color.b, color.alpha));
          }
        });
      }
    }
    return [swatch];
  }

  renderColorSwatch(valueChild?: Node, text?: string): InlineEditor.ColorSwatch.ColorSwatch {
    const editable = this.treeElement.editable();
    const shiftClickMessage = i18nString(UIStrings.shiftClickToChangeColorFormat);
    const tooltip = editable ? i18nString(UIStrings.openColorPickerS, {PH1: shiftClickMessage}) : '';

    const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
    swatch.setReadonly(!editable);
    swatch.renderColor(text ?? this.text, editable, tooltip);

    if (!valueChild) {
      valueChild = swatch.createChild('span');
      const color = swatch.getColor();
      valueChild.textContent =
          color ? (color.getAuthoredText() ?? color.asString(swatch.getFormat() ?? undefined)) : this.text;
    }
    swatch.appendChild(valueChild);

    const onColorChanged = (event: InlineEditor.ColorSwatch.ColorChangedEvent): void => {
      const {data} = event;
      swatch.firstElementChild && swatch.firstElementChild.remove();
      swatch.createChild('span').textContent = data.text;
      void this.treeElement.applyStyleText(this.treeElement.renderedPropertyText(), false);
    };

    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, () => {
      Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Color);
    });
    swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, onColorChanged);

    if (editable) {
      const swatchIcon =
          new ColorSwatchPopoverIcon(this.treeElement, this.treeElement.parentPane().swatchPopoverHelper(), swatch);
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
      void this.#addColorContrastInfo(swatchIcon);
    }

    return swatch;
  }

  async #addColorContrastInfo(swatchIcon: ColorSwatchPopoverIcon): Promise<void> {
    const cssModel = this.treeElement.parentPane().cssModel();
    const node = this.treeElement.node();
    if (this.treeElement.property.name !== 'color' || !cssModel || !node || typeof node.id === 'undefined') {
      return;
    }
    const contrastInfo = new ColorPicker.ContrastInfo.ContrastInfo(await cssModel.getBackgroundColors(node.id));
    swatchIcon.setContrastInfo(contrastInfo);
  }
}

export class ColorMixRenderer extends ColorMixMatch {
  #pane: StylesSidebarPane;
  constructor(
      pane: StylesSidebarPane, text: string, space: CodeMirror.SyntaxNode[], color1: CodeMirror.SyntaxNode[],
      color2: CodeMirror.SyntaxNode[]) {
    super(text, space, color1, color2);
    this.#pane = pane;
  }

  override render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[] {
    const hookUpColorArg = (node: Node, onChange: (newColorText: string) => void): boolean => {
      if (node instanceof InlineEditor.ColorMixSwatch.ColorMixSwatch ||
          node instanceof InlineEditor.ColorSwatch.ColorSwatch) {
        if (node instanceof InlineEditor.ColorSwatch.ColorSwatch) {
          node.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => onChange(ev.data.text));
        } else {
          node.addEventListener(InlineEditor.ColorMixSwatch.Events.ColorChanged, ev => onChange(ev.data.text));
        }
        const color = node.getText();
        if (color) {
          onChange(color);
          return true;
        }
      }
      return false;
    };

    const contentChild = document.createElement('span');
    contentChild.appendChild(document.createTextNode('color-mix('));
    Renderer.renderInto(this.space, context, contentChild);
    contentChild.appendChild(document.createTextNode(', '));
    const color1 = Renderer.renderInto(this.color1, context, contentChild).cssControls.get('color') ?? [];
    contentChild.appendChild(document.createTextNode(', '));
    const color2 = Renderer.renderInto(this.color2, context, contentChild).cssControls.get('color') ?? [];
    contentChild.appendChild(document.createTextNode(')'));

    if (context.matchedResult.hasUnresolvedVars(node) || color1.length !== 1 || color2.length !== 1) {
      return [contentChild];
    }

    const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
    if (!hookUpColorArg(color1[0], text => swatch.setFirstColor(text)) ||
        !hookUpColorArg(color2[0], text => swatch.setSecondColor(text))) {
      return [contentChild];
    }

    const space = this.space.map(space => context.matchedResult.getComputedText(space)).join(' ');
    const color1Text = this.color1.map(color => context.matchedResult.getComputedText(color)).join(' ');
    const color2Text = this.color2.map(color => context.matchedResult.getComputedText(color)).join(' ');
    swatch.appendChild(contentChild);
    swatch.setColorMixText(`color-mix(${space}, ${color1Text}, ${color2Text})`);
    swatch.setRegisterPopoverCallback(swatch => {
      if (swatch.icon) {
        this.#pane.addPopover(swatch.icon, {
          contents: () => {
            const color = swatch.mixedColor();
            if (!color) {
              return undefined;
            }
            const span = document.createElement('span');
            span.style.padding = '11px 7px';
            const rgb = color.as(Common.Color.Format.HEX);
            const text = rgb.isGamutClipped() ? color.asString() : rgb.asString();
            if (!text) {
              return undefined;
            }
            span.appendChild(document.createTextNode(text));
            return span;
          },
          jslogContext: 'elements.css-color-mix',
        });
      }
    });

    context.addControl('color', swatch);
    return [swatch];
  }

  static matcher(pane: StylesSidebarPane): ColorMixMatcher {
    return new ColorMixMatcher(
        (text, space, color1, color2) => new ColorMixRenderer(pane, text, space, color1, color2));
  }
}

export class URLRenderer extends URLMatch {
  constructor(
      private readonly rule: SDK.CSSRule.CSSRule|null, private readonly node: SDK.DOMModel.DOMNode|null,
      url: Platform.DevToolsPath.UrlString, text: string) {
    super(unescapeCssString(url) as Platform.DevToolsPath.UrlString, text);
  }
  override render(): Node[] {
    const container = document.createDocumentFragment();
    UI.UIUtils.createTextChild(container, 'url(');
    let hrefUrl: Platform.DevToolsPath.UrlString|null = null;
    if (this.rule && this.rule.resourceURL()) {
      hrefUrl = Common.ParsedURL.ParsedURL.completeURL(this.rule.resourceURL(), this.url);
    } else if (this.node) {
      hrefUrl = this.node.resolveURL(this.url);
    }
    const link = ImagePreviewPopover.setImageUrl(
        Components.Linkifier.Linkifier.linkifyURL(hrefUrl || this.url, {
          text: this.url,
          preventClick: false,
          // crbug.com/1027168
          // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
          // so that we don't have to keep two versions (original vs. trimmed) of URL
          // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
          bypassURLTrimming: true,
          showColumnNumber: false,
          inlineFrameIndex: 0,
        }),
        hrefUrl || this.url);
    container.appendChild(link);
    UI.UIUtils.createTextChild(container, ')');
    return [container];
  }

  static matcher(rule: SDK.CSSRule.CSSRule|null, node: SDK.DOMModel.DOMNode|null): URLMatcher {
    return new URLMatcher((url, text) => new URLRenderer(rule, node, url, text));
  }
}

export class AngleRenderer extends AngleMatch {
  #treeElement: StylePropertyTreeElement;
  constructor(text: string, treeElement: StylePropertyTreeElement) {
    super(text);
    this.#treeElement = treeElement;
  }

  override render(_: unknown, context: RenderingContext): Node[] {
    const angleText = this.text;
    if (!this.#treeElement.editable()) {
      return [document.createTextNode(angleText)];
    }
    const cssAngle = new InlineEditor.CSSAngle.CSSAngle();
    cssAngle.setAttribute('jslog', `${VisualLogging.showStyleEditor().track({click: true}).context('css-angle')}`);
    const valueElement = document.createElement('span');
    valueElement.textContent = angleText;
    const computedPropertyValue = this.#treeElement.matchedStyles().computeValue(
                                      this.#treeElement.property.ownerStyle, this.#treeElement.property.value) ||
        '';
    cssAngle.data = {
      propertyName: this.#treeElement.property.name,
      propertyValue: computedPropertyValue,
      angleText,
      containingPane:
          (this.#treeElement.parentPane().element.enclosingNodeOrSelfWithClass('style-panes-wrapper') as HTMLElement),
    };
    cssAngle.append(valueElement);

    cssAngle.addEventListener('popovertoggled', ({data}) => {
      const section = this.#treeElement.section();
      if (!section) {
        return;
      }

      if (data.open) {
        this.#treeElement.parentPane().hideAllPopovers();
        this.#treeElement.parentPane().activeCSSAngle = cssAngle;
        Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.Angle);
      }

      section.element.classList.toggle('has-open-popover', data.open);
      this.#treeElement.parentPane().setEditingStyle(data.open);

      // Commit the value as a major change after the angle popover is closed.
      if (!data.open) {
        void this.#treeElement.applyStyleText(this.#treeElement.renderedPropertyText(), true);
      }
    });
    cssAngle.addEventListener('valuechanged', async ({data}) => {
      valueElement.textContent = data.value;
      await this.#treeElement.applyStyleText(this.#treeElement.renderedPropertyText(), false);
      const computedPropertyValue = this.#treeElement.matchedStyles().computeValue(
                                        this.#treeElement.property.ownerStyle, this.#treeElement.property.value) ||
          '';
      cssAngle.updateProperty(this.#treeElement.property.name, computedPropertyValue);
    });
    cssAngle.addEventListener('unitchanged', ({data}) => {
      valueElement.textContent = data.value;
    });

    context.addControl('angle', cssAngle);
    return [cssAngle];
  }

  static matcher(treeElement: StylePropertyTreeElement): AngleMatcher {
    return new AngleMatcher(text => new AngleRenderer(text, treeElement));
  }
}

export class LinkableNameRenderer extends LinkableNameMatch {
  readonly #treeElement: StylePropertyTreeElement;
  constructor(treeElement: StylePropertyTreeElement, text: string, propertyName: LinkableNameProperties) {
    super(text, propertyName);
    this.#treeElement = treeElement;
  }

  #getLinkData():
      {jslogContext: string, metric: null|Host.UserMetrics.SwatchType, ruleBlock: string, isDefined: boolean} {
    switch (this.properyName) {
      case LinkableNameProperties.AnimationName:
        return {
          jslogContext: 'css-animation-name',
          metric: Host.UserMetrics.SwatchType.AnimationNameLink,
          ruleBlock: '@keyframes',
          isDefined: Boolean(this.#treeElement.matchedStyles().keyframes().find(kf => kf.name().text === this.text)),
        };
      case LinkableNameProperties.FontPalette:
        return {
          jslogContext: 'css-font-palette',
          metric: null,
          ruleBlock: '@font-palette-values',
          isDefined: this.#treeElement.matchedStyles().fontPaletteValuesRule()?.name().text === this.text,
        };
      case LinkableNameProperties.PositionFallback:
        return {
          jslogContext: 'css-position-fallback',
          metric: Host.UserMetrics.SwatchType.PositionFallbackLink,
          ruleBlock: '@position-fallback',
          isDefined: Boolean(
              this.#treeElement.matchedStyles().positionFallbackRules().find(pf => pf.name().text === this.text)),
        };
    }
  }

  override render(): Node[] {
    const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
    UI.UIUtils.createTextChild(swatch, this.text);
    const {metric, jslogContext, ruleBlock, isDefined} = this.#getLinkData();
    swatch.data = {
      text: this.text,
      isDefined,
      onLinkActivate: (): void => {
        metric && Host.userMetrics.swatchActivated(metric);
        this.#treeElement.parentPane().jumpToSectionBlock(`${ruleBlock} ${this.text}`);
      },
      jslogContext,
    };

    return [swatch];
  }

  static matcher(treeElement: StylePropertyTreeElement): LinkableNameMatcher {
    return new LinkableNameMatcher((text, propertyName) => new LinkableNameRenderer(treeElement, text, propertyName));
  }
}

export class BezierRenderer extends BezierMatch {
  readonly #treeElement: StylePropertyTreeElement;
  constructor(treeElement: StylePropertyTreeElement, text: string) {
    super(text);
    this.#treeElement = treeElement;
  }

  override render(): Node[] {
    return [this.renderSwatch()];
  }

  renderSwatch(): Node {
    if (!this.#treeElement.editable()) {
      return document.createTextNode(this.text);
    }
    const swatchPopoverHelper = this.#treeElement.parentPane().swatchPopoverHelper();
    const swatch = InlineEditor.Swatches.BezierSwatch.create();
    swatch.iconElement().addEventListener('click', () => {
      Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.AnimationTiming);
    });
    swatch.setBezierText(this.text);
    new BezierPopoverIcon({treeElement: this.#treeElement, swatchPopoverHelper, swatch});
    return swatch;
  }

  static matcher(treeElement: StylePropertyTreeElement): BezierMatcher {
    return new BezierMatcher(text => new BezierRenderer(treeElement, text));
  }
}

export class StringRenderer extends StringMatch {
  override render(): Node[] {
    const element = document.createElement('span');
    element.innerText = this.text;
    UI.Tooltip.Tooltip.install(element, unescapeCssString(this.text));
    return [element];
  }

  static matcher(): StringMatcher {
    return new StringMatcher(text => new StringRenderer(text));
  }
}

export class StylePropertyTreeElement extends UI.TreeOutline.TreeElement {
  private readonly style: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
  private matchedStylesInternal: SDK.CSSMatchedStyles.CSSMatchedStyles;
  property: SDK.CSSProperty.CSSProperty;
  private readonly inheritedInternal: boolean;
  private overloadedInternal: boolean;
  private parentPaneInternal: StylesSidebarPane;
  #parentSection: StylePropertiesSection;
  isShorthand: boolean;
  private readonly applyStyleThrottler: Common.Throttler.Throttler;
  private newProperty: boolean;
  private expandedDueToFilter: boolean;
  valueElement: HTMLElement|null;
  nameElement: HTMLElement|null;
  private expandElement: IconButton.Icon.Icon|null;
  private originalPropertyText: string;
  private hasBeenEditedIncrementally: boolean;
  private prompt: CSSPropertyPrompt|null;
  private lastComputedValue: string|null;
  private computedStyles: Map<string, string>|null = null;
  private parentsComputedStyles: Map<string, string>|null = null;
  private contextForTest!: Context|undefined;
  #propertyTextFromSource: string;

  constructor(
      {stylesPane, section, matchedStyles, property, isShorthand, inherited, overloaded, newProperty}:
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
    this.#parentSection = section;
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

  editable(): boolean {
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
          contentChild.appendChild(
              this.editable() && InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(part.value) ?
                  new BezierRenderer(this, part.value).renderSwatch() :
                  document.createTextNode(part.value));
          break;
        case InlineEditor.CSSAnimationModel.PartType.AnimationName:
          contentChild.appendChild(
              new LinkableNameRenderer(this, part.value, LinkableNameProperties.AnimationName).render()[0]);
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

  // TODO(chromium:1504820) Delete once callers are migrated
  private processVar(text: string, {shouldShowColorSwatch = true}: {shouldShowColorSwatch?: boolean} = {}): HTMLElement
      |Text {
    // The regex that matches to variables in `StylesSidebarPropertyRenderer`
    // uses a lazy match. Because of this, when there are multiple right parantheses inside the
    // var() function, it stops the match. So, for a match like `var(--a, var(--b))`, the text
    // corresponds to `var(--a, var(--b)`; before processing it, we make sure that parantheses
    // are matched.
    const parenthesesBalancedText = text + ')'.repeat(Platform.StringUtilities.countUnmatchedLeftParentheses(text));
    const computedSingleValue =
        this.matchedStylesInternal.computeSingleVariableValue(this.style, parenthesesBalancedText);
    const {variableName, fallback} = SDK.CSSMatchedStyles.parseCSSVariableNameAndFallback(parenthesesBalancedText);
    if (!computedSingleValue || !variableName) {
      return document.createTextNode(parenthesesBalancedText);
    }

    const {declaration} = this.matchedStylesInternal.computeCSSVariable(this.style, variableName) ?? {};
    const {computedValue, fromFallback} = computedSingleValue;
    let fallbackHtml: Array<HTMLElement|Text>|null = null;
    if (fromFallback && fallback?.startsWith('var(')) {
      fallbackHtml = [this.processVar(fallback, {shouldShowColorSwatch: false})];
    } else if (fallback) {
      fallbackHtml = [document.createTextNode(fallback)];
    }

    const varSwatch = new InlineEditor.LinkSwatch.CSSVarSwatch();
    varSwatch.data = {
      computedValue,
      variableName,
      fromFallback,
      fallbackText: fallbackHtml ? fallbackHtml[0].textContent : null,
      onLinkActivate: name => this.handleVarDefinitionActivate(declaration ?? name),
    };

    if (varSwatch.link?.linkElement) {
      const {textContent} = varSwatch.link.linkElement;
      if (textContent) {
        const computedValueOfLink = textContent ?
            this.matchedStylesInternal.computeSingleVariableValue(this.style, `var(${textContent})`) :
            null;
        this.parentPaneInternal.addPopover(varSwatch.link, {
          contents: () => this.getVariablePopoverContents(textContent, computedValueOfLink?.computedValue ?? null),
          jslogContext: 'elements.css-var',
        });
      }
    }

    if (fallbackHtml) {
      // When slotting someting into the fallback slot, also emit text children so that .textContent produces the
      // correct var value.
      varSwatch.appendChild(document.createTextNode(`var(${this.name}`));
      const span = varSwatch.appendChild(document.createElement('span'));
      span.appendChild(document.createTextNode(', '));
      span.slot = 'fallback';
      span.appendChild(fallbackHtml[0]);
      varSwatch.appendChild(document.createTextNode(')'));
    } else {
      UI.UIUtils.createTextChild(varSwatch, text);
    }

    if (!computedValue || !Common.Color.parse(computedValue) || !shouldShowColorSwatch) {
      return varSwatch;
    }

    return new ColorRenderer(this, computedValue).renderColorSwatch(varSwatch);
  }

  private handleVarDefinitionActivate(variable: string|SDK.CSSProperty.CSSProperty|
                                      SDK.CSSMatchedStyles.CSSRegisteredProperty): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CustomPropertyLinkClicked);
    Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.VarLink);
    if (variable instanceof SDK.CSSProperty.CSSProperty) {
      this.parentPaneInternal.revealProperty(variable);
    } else if (variable instanceof SDK.CSSMatchedStyles.CSSRegisteredProperty) {
      this.parentPaneInternal.jumpToProperty(
          'initial-value', variable.propertyName(), REGISTERED_PROPERTY_SECTION_NAME);
    } else {
      this.parentPaneInternal.jumpToProperty(variable) ||
          this.parentPaneInternal.jumpToProperty('initial-value', variable, REGISTERED_PROPERTY_SECTION_NAME);
    }
  }

  renderedPropertyText(): string {
    if (!this.nameElement || !this.valueElement) {
      return '';
    }
    return this.nameElement.textContent + ': ' + this.valueElement.textContent;
  }

  private processFont(text: string): Node {
    this.#parentSection.registerFontProperty(this);
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
      cssShadowSwatch.setAttribute('jslog', `${VisualLogging.showStyleEditor('css-shadow').track({click: true})}`);
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

    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    const container = document.createDocumentFragment();
    for (const result of splitResult) {
      const value = result.value.trim();
      const content = UI.Fragment.html`<br /><span class='styles-clipboard-only'>${indent.repeat(2)}</span>${value}`;
      container.appendChild(content);
    }
    return container;
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

  section(): StylePropertiesSection {
    return this.#parentSection;
  }

  private updatePane(): void {
    this.#parentSection.refreshUpdate(this);
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

      inherited = this.#parentSection.isPropertyInherited(name);
      overloaded = this.matchedStylesInternal.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;

      const leadingProperty = leadingProperties.find(property => property.name === name && property.activeInStyle());
      if (leadingProperty) {
        overloaded = true;
      }

      const item = new StylePropertyTreeElement({
        stylesPane: this.parentPaneInternal,
        section: this.#parentSection,
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
      this.expandElement.name = 'triangle-down';
    } else {
      this.expandElement.name = 'triangle-right';
    }
  }

  #getRegisteredPropertyDetails(variableName: string): ElementsComponents.CSSVariableValueView.RegisteredPropertyDetails
      |undefined {
    const registration = this.matchedStyles().getRegisteredProperty(variableName);
    const goToDefinition = (): void =>
        this.parentPaneInternal.jumpToSection(variableName, REGISTERED_PROPERTY_SECTION_NAME);
    return registration ? {registration, goToDefinition} : undefined;
  }

  getVariablePopoverContents(variableName: string, computedValue: string|null): HTMLElement|undefined {
    return new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
      variableName,
      value: computedValue ?? undefined,
      details: this.#getRegisteredPropertyDetails(variableName),
    });
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
      this.expandElement = IconButton.Icon.create('triangle-right', 'expand-icon');
      this.expandElement.setAttribute('jslog', `${VisualLogging.expand().track({click: true})}`);
    }

    const propertyRenderer =
        new StylesSidebarPropertyRenderer(this.style.parentRule, this.node(), this.name, this.value, [
          VariableRenderer.matcher(this, this.style),
          ColorRenderer.matcher(this),
          ColorMixRenderer.matcher(this.parentPaneInternal),
          URLRenderer.matcher(this.style.parentRule, this.node()),
          AngleRenderer.matcher(this),
          LinkableNameRenderer.matcher(this),
          BezierRenderer.matcher(this),
          StringRenderer.matcher(),
        ]);
    if (this.property.parsedOk) {
      propertyRenderer.setAnimationHandler(this.processAnimation.bind(this));
      propertyRenderer.setFontHandler(this.processFont.bind(this));
      propertyRenderer.setShadowHandler(this.processShadow.bind(this));
      propertyRenderer.setGridHandler(this.processGrid.bind(this));
      propertyRenderer.setLengthHandler(this.processLength.bind(this));
    }

    this.listItemElement.removeChildren();
    this.nameElement = (propertyRenderer.renderName() as HTMLElement);
    if (this.property.name.startsWith('--') && this.nameElement) {
      this.parentPaneInternal.addPopover(this.nameElement, {
        contents: () => this.getVariablePopoverContents(
            this.property.name,
            this.matchedStylesInternal.computeCSSVariable(this.style, this.property.name)?.value ?? null),
        jslogContext: 'elements.css-var',
      });
    }
    this.valueElement = (propertyRenderer.renderValue() as HTMLElement);
    if (!this.treeOutline) {
      return;
    }

    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    UI.UIUtils.createTextChild(
        this.listItemElement.createChild('span', 'styles-clipboard-only'),
        indent.repeat(this.section().nestingLevel + 1) + (this.property.disabled ? '/* ' : ''));
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

    if (this.valueElement && this.#parentSection.editable && this.property.name === 'display') {
      const propertyValue = this.property.trimmedValueWithoutImportant();
      const isFlex = propertyValue === 'flex' || propertyValue === 'inline-flex';
      const isGrid = propertyValue === 'grid' || propertyValue === 'inline-grid';
      if (isFlex || isGrid) {
        const key = `${this.#parentSection.getSectionIdx()}_${this.#parentSection.nextEditorTriggerButtonIdx}`;
        const button = StyleEditorWidget.createTriggerButton(
            this.parentPaneInternal, this.#parentSection, isFlex ? FlexboxEditor : GridEditor,
            isFlex ? i18nString(UIStrings.flexboxEditorButton) : i18nString(UIStrings.gridEditorButton), key);
        button.setAttribute(
            'jslog', `${VisualLogging.showStyleEditor().track({click: true}).context(isFlex ? 'flex' : 'grid')}`);
        this.#parentSection.nextEditorTriggerButtonIdx++;
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

    if (this.property.parsedOk && this.parent && this.parent.root) {
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

      const copyIcon = IconButton.Icon.create('copy', 'copy');
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

    let selectedElement = event.target as Element;
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && this.#parentSection.navigable) {
      this.navigateToSource(selectedElement);
      return;
    }

    if (this.expandElement && selectedElement === this.expandElement) {
      return;
    }

    if (!this.#parentSection.editable) {
      return;
    }

    selectedElement = selectedElement.enclosingNodeOrSelfWithClass('webkit-css-property') ||
        selectedElement.enclosingNodeOrSelfWithClass('value') ||
        selectedElement.enclosingNodeOrSelfWithClass('styles-semicolon');
    if (!selectedElement || selectedElement === this.nameElement) {
      this.startEditingName();
    } else {
      this.startEditingValue();
    }
  }

  private handleContextMenuEvent(context: Context, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (this.property.parsedOk && this.parent && this.parent.root) {
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
          }, {checked: !this.property.disabled, jslogContext: 'toggle-property-and-continue-editing'});
    }
    const revealCallback = this.navigateToSource.bind(this) as () => void;
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.revealInSourcesPanel), revealCallback, {jslogContext: 'reveal-in-sources-panel'});
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
    }, {jslogContext: 'copy-declaration'});

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyProperty), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.name);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.PropertyViaContextMenu);
    }, {jslogContext: 'copy-property'});

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyValue), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.value);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.ValueViaContextMenu);
    }, {jslogContext: 'copy-value'});

    contextMenu.headerSection().appendItem(i18nString(UIStrings.copyRule), () => {
      const ruleText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).ruleText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.RuleViaContextMenu);
    }, {jslogContext: 'copy-rule'});

    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.copyCssDeclarationAsJs), this.copyCssDeclarationAsJs.bind(this),
        {jslogContext: 'copy-css-declaration-as-js'});

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllDeclarations), () => {
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).allDeclarationText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllDeclarationsViaContextMenu);
    }, {jslogContext: 'copy-all-declarations'});

    contextMenu.clipboardSection().appendItem(
        i18nString(UIStrings.copyAllCssDeclarationsAsJs), this.copyAllCssDeclarationAsJs.bind(this),
        {jslogContext: 'copy-all-css-declarations-as-js'});

    // TODO(changhaohan): conditionally add this item only when there are changes to copy
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyAllCSSChanges), async () => {
      const allChanges = await this.parentPane().getFormattedChanges();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allChanges);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllChangesViaStylesPane);
    }, {jslogContext: 'copy-all-css-changes'});

    contextMenu.footerSection().appendItem(i18nString(UIStrings.viewComputedValue), () => {
      void this.viewComputedValue();
    }, {jslogContext: 'view-computed-value'});

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

    computedStyleWidget.input.setValue(this.property.name);
    computedStyleWidget.input.element.focus();
  }

  private copyCssDeclarationAsJs(): void {
    const cssDeclarationValue = getCssDeclarationAsJavascriptProperty(this.property);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationValue);
    Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.DeclarationAsJSViaContextMenu);
  }

  private copyAllCssDeclarationAsJs(): void {
    const leadingProperties = this.#parentSection.style().leadingProperties();
    const cssDeclarationsAsJsProperties =
        leadingProperties.filter(property => !property.disabled).map(getCssDeclarationAsJavascriptProperty);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationsAsJsProperties.join(',\n'));
    Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.AllDeclarationsAsJSViaContextMenu);
  }

  private navigateToSource(element: Element, omitFocus?: boolean): void {
    if (!this.#parentSection.navigable) {
      return;
    }
    const propertyNameClicked = element === this.nameElement;
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.property, propertyNameClicked);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, omitFocus);
    }
  }

  startEditingValue(): void {
    const context: Context = {
      expanded: this.expanded,
      hasChildren: this.isExpandable(),
      isEditingName: false,
      originalProperty: this.property,
      previousContent: this.value,
    };

    // Grid definitions are often multiline. Instead of showing the authored text reformat it a little bit nicer.
    if (SDK.CSSMetadata.cssMetadata().isGridAreaDefiningProperty(this.name)) {
      const splitResult =
          TextUtils.TextUtils.Utils.splitStringByRegexes(this.value, [SDK.CSSMetadata.GridAreaRowRegex]);
      context.previousContent = splitResult.map(result => result.value.trim()).join('\n');
    }

    this.#startEditing(context);
  }

  startEditingName(): void {
    const context: Context = {
      expanded: this.expanded,
      hasChildren: this.isExpandable(),
      isEditingName: true,
      originalProperty: this.property,
      previousContent: this.name.split('\n').map(l => l.trim()).join('\n'),
    };

    this.#startEditing(context);
  }

  #startEditing(context: Context): void {
    this.contextForTest = context;

    // FIXME: we don't allow editing of longhand properties under a shorthand right now.
    if (this.parent instanceof StylePropertyTreeElement && this.parent.isShorthand) {
      return;
    }

    const selectedElement = context.isEditingName ? this.nameElement : this.valueElement;
    if (!selectedElement) {
      return;
    }

    if (UI.UIUtils.isBeingEdited(selectedElement)) {
      return;
    }

    // Lie about our children to prevent expanding on double click and to collapse shorthands.
    this.setExpandable(false);

    selectedElement.parentElement?.classList.add('child-editing');
    selectedElement.textContent = context.previousContent;  // remove color swatch and the like

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
    selectedElement.parentElement?.scrollIntoViewIfNeeded(false);

    this.prompt = new CSSPropertyPrompt(this, context.isEditingName);
    this.prompt.setAutocompletionTimeout(0);

    this.prompt.addEventListener(UI.TextPrompt.Events.TextChanged, () => {
      void this.applyFreeFlowStyleTextEdit(context);
    });

    const invalidString = this.property.getInvalidStringForInvalidProperty();
    if (invalidString) {
      UI.ARIAUtils.alert(invalidString);
    }

    const proxyElement = this.prompt.attachAndStartEditing(selectedElement, blurListener.bind(this, context));
    this.navigateToSource(selectedElement, true);

    proxyElement.addEventListener('keydown', this.editingNameValueKeyDown.bind(this, context), false);
    proxyElement.addEventListener('keypress', this.editingNameValueKeyPress.bind(this, context), false);
    if (context.isEditingName) {
      proxyElement.addEventListener('paste', pasteHandler.bind(this, context), false);
      proxyElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this, context), false);
    }

    selectedElement.getComponentSelection()?.selectAllChildren(selectedElement);
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
      moveToNextCallback.call(this, this.newProperty, !blankInput, this.#parentSection);
    } else {
      if (isEditingName) {
        this.property.name = userInput;
      } else {
        this.property.value = userInput;
      }
      if (!isDataPasted && !this.newProperty) {
        this.updateTitle();
      }
      moveToNextCallback.call(this, this.newProperty, false, this.#parentSection);
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
        if (isEditingName) {
          moveTo.startEditingValue();
        } else {
          moveTo.startEditingName();
        }
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
            if (alreadyNew && blankInput) {
              if (moveDirection === 'forward') {
                treeElement.startEditingName();
              } else {
                treeElement.startEditingValue();
              }
            } else if (!isEditingName || isPropertySplitPaste) {
              treeElement.startEditingName();
            } else {
              treeElement.startEditingValue();
            }
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

        section.addNewBlankProperty().startEditingName();
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
    if (deleteProperty) {
      this.#parentSection.resetToolbars();
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
