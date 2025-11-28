// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Tooltips from '../../ui/components/tooltips/tooltips.js';
import { createIcon, Icon } from '../../ui/kit/kit.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { BezierPopoverIcon, ColorSwatchPopoverIcon, ShadowSwatchPopoverHelper, } from './ColorSwatchPopoverIcon.js';
import * as ElementsComponents from './components/components.js';
import { cssRuleValidatorsMap } from './CSSRuleValidator.js';
import { CSSValueTraceView } from './CSSValueTraceView.js';
import { ElementsPanel } from './ElementsPanel.js';
import { BinOpRenderer, Renderer, rendererBase, RenderingContext, StringRenderer, URLRenderer } from './PropertyRenderer.js';
import { StyleEditorWidget } from './StyleEditorWidget.js';
import { getCssDeclarationAsJavascriptProperty } from './StylePropertyUtils.js';
import { CSSPropertyPrompt, REGISTERED_PROPERTY_SECTION_NAME, StylesSidebarPane, } from './StylesSidebarPane.js';
const { html, nothing, render, Directives: { classMap } } = Lit;
const ASTUtils = SDK.CSSPropertyParser.ASTUtils;
const FlexboxEditor = ElementsComponents.StylePropertyEditor.FlexboxEditor;
const GridEditor = ElementsComponents.StylePropertyEditor.GridEditor;
const GridLanesEditor = ElementsComponents.StylePropertyEditor.GridLanesEditor;
const UIStrings = {
    /**
     * @description Text in Color Swatch Popover Icon of the Elements panel
     */
    shiftClickToChangeColorFormat: 'Shift + Click to change color format.',
    /**
     * @description Swatch icon element title in Color Swatch Popover Icon of the Elements panel
     * @example {Shift + Click to change color format.} PH1
     */
    openColorPickerS: 'Open color picker. {PH1}',
    /**
     * @description Context menu item for style property in edit mode
     */
    togglePropertyAndContinueEditing: 'Toggle property and continue editing',
    /**
     * @description Context menu item for style property in edit mode
     */
    openInSourcesPanel: 'Open in Sources panel',
    /**
     * @description A context menu item in Styles panel to copy CSS declaration
     */
    copyDeclaration: 'Copy declaration',
    /**
     * @description A context menu item in Styles panel to copy CSS property
     */
    copyProperty: 'Copy property',
    /**
     * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
     */
    copyValue: 'Copy value',
    /**
     * @description A context menu item in Styles panel to copy CSS rule
     */
    copyRule: 'Copy rule',
    /**
     * @description A context menu item in Styles panel to copy all CSS declarations
     */
    copyAllDeclarations: 'Copy all declarations',
    /**
     * @description A context menu item in Styles panel to view the computed CSS property value.
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
     * @description Title of the button that opens the CSS Grid Lanes editor in the Styles panel.
     */
    gridLanesEditorButton: 'Open `grid-lanes` editor',
    /**
     * @description A context menu item in Styles panel to copy CSS declaration as JavaScript property.
     */
    copyCssDeclarationAsJs: 'Copy declaration as JS',
    /**
     * @description A context menu item in Styles panel to copy all declarations of CSS rule as JavaScript properties.
     */
    copyAllCssDeclarationsAsJs: 'Copy all declarations as JS',
    /**
     * @description Title of the link in Styles panel to jump to the Animations panel.
     */
    jumpToAnimationsPanel: 'Jump to Animations panel',
    /**
     * @description Text displayed in a tooltip shown when hovering over a CSS property value references a name that's not
     *             defined and can't be linked to.
     * @example {--my-linkable-name} PH1
     */
    sIsNotDefined: '{PH1} is not defined',
    /**
     * @description Text in Styles Sidebar Pane of the Elements panel
     */
    invalidPropertyValue: 'Invalid property value',
    /**
     * @description Text in Styles Sidebar Pane of the Elements panel
     */
    unknownPropertyName: 'Unknown property name',
    /**
     * @description Announcement string for invalid properties.
     * @example {Invalid property value} PH1
     * @example {font-size} PH2
     * @example {invalidValue} PH3
     */
    invalidString: '{PH1}, property name: {PH2}, property value: {PH3}',
    /**
     * @description Title in the styles tab for the icon button for jumping to the anchor node.
     */
    jumpToAnchorNode: 'Jump to anchor node',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/StylePropertyTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const parentMap = new WeakMap();
// clang-format off
export class EnvFunctionRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.EnvFunctionMatch) {
    treeElement;
    matchedStyles;
    computedStyles;
    // clang-format on
    constructor(treeElement, matchedStyles, computedStyles) {
        super();
        this.treeElement = treeElement;
        this.matchedStyles = matchedStyles;
        this.computedStyles = computedStyles;
    }
    render(match, context) {
        const [, fallbackNodes] = ASTUtils.callArgs(match.node);
        if (match.value) {
            const substitution = context.tracing?.substitution();
            if (substitution) {
                if (match.varNameIsValid) {
                    return [document.createTextNode(match.value)];
                }
                return Renderer.render(fallbackNodes, substitution.renderingContext(context)).nodes;
            }
        }
        const span = document.createElement('span');
        const func = this.treeElement?.getTracingTooltip('env', match.node, this.matchedStyles, this.computedStyles, context) ??
            'env';
        const valueClass = classMap({ 'inactive-value': !match.varNameIsValid });
        const fallbackClass = classMap({ 'inactive-value': match.varNameIsValid });
        render(html `${func}(<span class=${valueClass}>${match.varName}</span>${fallbackNodes ?
            html `, <span class=${fallbackClass}>${Renderer.render(fallbackNodes, context).nodes}</span>` :
            nothing})`, span, { host: span });
        return [span];
    }
}
// clang-format off
export class FlexGridRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch) {
    // clang-format on
    #treeElement;
    #stylesPane;
    constructor(stylesPane, treeElement) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
    }
    render(match, context) {
        const children = Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context).nodes;
        if (!this.#treeElement?.editable()) {
            return children;
        }
        const key = `${this.#treeElement.section().getSectionIdx()}_${this.#treeElement.section().nextEditorTriggerButtonIdx}`;
        function getEditorClass(layoutType) {
            switch (layoutType) {
                case "flex" /* SDK.CSSPropertyParserMatchers.LayoutType.FLEX */:
                    return FlexboxEditor;
                case "grid" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID */:
                    return GridEditor;
                case "grid-lanes" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID_LANES */:
                    return GridLanesEditor;
            }
        }
        function getButtonTitle(layoutType) {
            switch (layoutType) {
                case "flex" /* SDK.CSSPropertyParserMatchers.LayoutType.FLEX */:
                    return i18nString(UIStrings.flexboxEditorButton);
                case "grid" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID */:
                    return i18nString(UIStrings.gridEditorButton);
                case "grid-lanes" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID_LANES */:
                    return i18nString(UIStrings.gridLanesEditorButton);
            }
        }
        function getSwatchType(layoutType) {
            switch (layoutType) {
                case "flex" /* SDK.CSSPropertyParserMatchers.LayoutType.FLEX */:
                    return 6 /* Host.UserMetrics.SwatchType.FLEX */;
                case "grid" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID */:
                    return 5 /* Host.UserMetrics.SwatchType.GRID */;
                case "grid-lanes" /* SDK.CSSPropertyParserMatchers.LayoutType.GRID_LANES */:
                    return 12 /* Host.UserMetrics.SwatchType.GRID_LANES */;
            }
        }
        const button = StyleEditorWidget.createTriggerButton(this.#stylesPane, this.#treeElement.section(), getEditorClass(match.layoutType), getButtonTitle(match.layoutType), key);
        button.tabIndex = -1;
        button.setAttribute('jslog', `${VisualLogging.showStyleEditor().track({ click: true }).context(match.layoutType)}`);
        this.#treeElement.section().nextEditorTriggerButtonIdx++;
        button.addEventListener('click', () => {
            Host.userMetrics.swatchActivated(getSwatchType(match.layoutType));
        });
        const helper = this.#stylesPane.swatchPopoverHelper();
        if (helper.isShowing(StyleEditorWidget.instance()) && StyleEditorWidget.instance().getTriggerKey() === key) {
            helper.setAnchorElement(button);
        }
        return [...children, button];
    }
}
// clang-format off
export class CSSWideKeywordRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch) {
    // clang-format on
    #treeElement;
    #stylesPane;
    constructor(stylesPane, treeElement) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
    }
    render(match, context) {
        const resolvedProperty = match.resolveProperty();
        if (!resolvedProperty) {
            return [document.createTextNode(match.text)];
        }
        const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
        swatch.data = {
            text: match.text,
            tooltip: resolvedProperty ? undefined : { title: i18nString(UIStrings.sIsNotDefined, { PH1: match.text }) },
            isDefined: Boolean(resolvedProperty),
            onLinkActivate: () => resolvedProperty && this.#stylesPane.jumpToDeclaration(resolvedProperty),
            jslogContext: 'css-wide-keyword-link',
        };
        if (SDK.CSSMetadata.cssMetadata().isColorAwareProperty(resolvedProperty.name) ||
            SDK.CSSMetadata.cssMetadata().isCustomProperty(resolvedProperty.name)) {
            const color = Common.Color.parse(context.matchedResult.getComputedText(match.node));
            if (color) {
                return [new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, swatch), swatch];
            }
        }
        return [swatch];
    }
}
// clang-format off
export class VariableRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.VariableMatch) {
    // clang-format on
    #stylesPane;
    #treeElement;
    #matchedStyles;
    #computedStyles;
    constructor(stylesPane, treeElement, matchedStyles, computedStyles) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
        this.#matchedStyles = matchedStyles;
        this.#computedStyles = computedStyles;
    }
    render(match, context) {
        if (this.#treeElement?.property.ownerStyle.parentRule instanceof SDK.CSSRule.CSSFunctionRule) {
            return Renderer.render(ASTUtils.children(match.node), context).nodes;
        }
        const { declaration, value: variableValue } = match.resolveVariable() ?? {};
        const fromFallback = variableValue === undefined;
        const computedValue = variableValue ?? match.fallbackValue();
        const onLinkActivate = (name) => this.#handleVarDefinitionActivate(declaration ?? name);
        const varSwatch = document.createElement('span');
        const substitution = context.tracing?.substitution({ match, context });
        if (substitution) {
            if (declaration?.declaration) {
                const { nodes, cssControls } = Renderer.renderValueNodes({ name: declaration.name, value: declaration.value ?? '' }, substitution.cachedParsedValue(declaration.declaration, this.#matchedStyles, this.#computedStyles), getPropertyRenderers(declaration.name, declaration.style, this.#stylesPane, this.#matchedStyles, null, this.#computedStyles), substitution);
                cssControls.forEach((value, key) => value.forEach(control => context.addControl(key, control)));
                return nodes;
            }
            if (!declaration && match.fallback) {
                return Renderer.render(match.fallback, substitution.renderingContext(context)).nodes;
            }
        }
        const renderedFallback = match.fallback ? Renderer.render(match.fallback, context) : undefined;
        const varCall = this.#treeElement?.getTracingTooltip('var', match.node, this.#matchedStyles, this.#computedStyles, context);
        const tooltipContents = this.#stylesPane.getVariablePopoverContents(this.#matchedStyles, match.name, variableValue ?? null);
        const tooltipId = this.#treeElement?.getTooltipId('custom-property-var');
        const tooltip = tooltipId ? { tooltipId } : undefined;
        // clang-format off
        render(html `
        <span data-title=${computedValue || ''}
              jslog=${VisualLogging.link('css-variable').track({ click: true, hover: true })}>
          ${varCall ?? 'var'}(
          <devtools-link-swatch class=css-var-link .data=${{
            tooltip,
            text: match.name,
            isDefined: computedValue !== null && !fromFallback,
            onLinkActivate,
        }}>
           </devtools-link-swatch>
           ${renderedFallback ? html `, ${renderedFallback.nodes}` : nothing})
        </span>
        ${tooltipId ? html `
          <devtools-tooltip
            id=${tooltipId}
            variant=rich
            jslogContext=elements.css-var
          >
            ${tooltipContents}
          </devtools-tooltip>
        ` : ''}
    `, varSwatch);
        // clang-format on
        const color = computedValue && Common.Color.parse(computedValue);
        if (!color) {
            return [varSwatch];
        }
        const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, varSwatch);
        context.addControl('color', colorSwatch);
        if (fromFallback) {
            renderedFallback?.cssControls.get('color')?.forEach(innerSwatch => innerSwatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => {
                colorSwatch.setColor(ev.data.color);
            }));
        }
        return [colorSwatch, varSwatch];
    }
    #handleVarDefinitionActivate(variable) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CustomPropertyLinkClicked);
        Host.userMetrics.swatchActivated(0 /* Host.UserMetrics.SwatchType.VAR_LINK */);
        if (typeof variable === 'string') {
            this.#stylesPane.jumpToProperty(variable) ||
                this.#stylesPane.jumpToProperty('initial-value', variable, REGISTERED_PROPERTY_SECTION_NAME);
        }
        else if (variable.declaration instanceof SDK.CSSProperty.CSSProperty) {
            this.#stylesPane.revealProperty(variable.declaration);
        }
        else if (variable.declaration instanceof SDK.CSSMatchedStyles.CSSRegisteredProperty) {
            this.#stylesPane.jumpToProperty('initial-value', variable.name, REGISTERED_PROPERTY_SECTION_NAME);
        }
    }
}
// clang-format off
export class AttributeRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.AttributeMatch) {
    // clang-format on
    #stylesPane;
    #treeElement;
    #matchedStyles;
    #computedStyles;
    constructor(stylesPane, treeElement, matchedStyles, computedStyles) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
        this.#matchedStyles = matchedStyles;
        this.#computedStyles = computedStyles;
    }
    render(match, context) {
        if (this.#treeElement?.property.ownerStyle.parentRule instanceof SDK.CSSRule.CSSFunctionRule) {
            return Renderer.render(ASTUtils.children(match.node), context).nodes;
        }
        const rawValue = match.rawAttributeValue();
        const attributeValue = match.resolveAttributeValue();
        const fromFallback = attributeValue === null;
        const attributeMissing = rawValue === null;
        const typeError = fromFallback && !attributeMissing;
        const attributeClass = attributeMissing ? 'inactive' : '';
        const typeClass = typeError ? 'inactive' : '';
        const fallbackClass = fromFallback ? '' : 'inactive';
        const computedValue = attributeValue ?? match.fallbackValue();
        const varSwatch = document.createElement('span');
        const substitution = context.tracing?.substitution({ match, context });
        if (substitution) {
            // TODO(b/441945435): If we combine these conditions, we can, when no fallback is
            // specified but the type check fails, render a series of substitutions
            // which may help debug why the type check failed. However, we can't
            // distinguish ordinary type mismatch from cycles, and we need a way
            // to handle cycles. And we may want UI for showing the substitutions
            // anyway, even when a fallback is specified.
            if (fromFallback) {
                if (match.fallback) {
                    return Renderer.render(match.fallback, substitution.renderingContext(context)).nodes;
                }
            }
            else if (match.substitutionText !== null) {
                const matching = SDK.CSSPropertyParser.matchDeclaration('--property', match.substitutionText, this.#matchedStyles.propertyMatchers(match.style, this.#computedStyles));
                return Renderer
                    .renderValueNodes({ name: '--property', value: match.substitutionText }, matching, getPropertyRenderers('--property', match.style, this.#stylesPane, this.#matchedStyles, null, this.#computedStyles), substitution)
                    .nodes;
            }
        }
        const renderedFallback = match.fallback ? Renderer.render(match.fallback, context) : undefined;
        const attrCall = this.#treeElement?.getTracingTooltip('attr', match.node, this.#matchedStyles, this.#computedStyles, context);
        const tooltipId = attributeMissing ? undefined : this.#treeElement?.getTooltipId('custom-attribute');
        const tooltip = tooltipId ? { tooltipId } : undefined;
        // clang-format off
        render(html `
        <span data-title=${computedValue || ''}
              jslog=${VisualLogging.link('css-variable').track({ click: true, hover: true })}
        >${attrCall ?? 'attr'}(<devtools-link-swatch class=${attributeClass} .data=${{
            tooltip,
            text: match.name,
            isDefined: true,
            onLinkActivate: () => this.#handleAttributeActivate(this.#matchedStyles.originatingNodeForStyle(match.style), match.name),
        }}></devtools-link-swatch>${tooltipId ? html `
          <devtools-tooltip
            id=${tooltipId}
            variant=rich
            jslogContext=elements.css-var
          >${JSON.stringify(rawValue)}</devtools-tooltip>` : nothing}${match.type ? html ` <span class=${typeClass}>${match.type}</span>` : nothing}${renderedFallback ? html `, <span class=${fallbackClass}>${renderedFallback.nodes}</span>` : nothing})</span>`, varSwatch);
        // clang-format on
        const color = computedValue && Common.Color.parse(computedValue);
        if (!color) {
            return [varSwatch];
        }
        const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, varSwatch);
        context.addControl('color', colorSwatch);
        if (fromFallback) {
            renderedFallback?.cssControls.get('color')?.forEach(innerSwatch => innerSwatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => {
                colorSwatch.setColor(ev.data.color);
            }));
        }
        return [colorSwatch, varSwatch];
    }
    #handleAttributeActivate(node, attribute) {
        if (!node) {
            return;
        }
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AttributeLinkClicked);
        Host.userMetrics.swatchActivated(11 /* Host.UserMetrics.SwatchType.ATTR_LINK */);
        ElementsPanel.instance().highlightNodeAttribute(node, attribute);
    }
}
// clang-format off
export class LinearGradientRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.LinearGradientMatch) {
    // clang-format on
    render(match, context) {
        const children = ASTUtils.children(match.node);
        const { nodes, cssControls } = Renderer.render(children, context);
        const angles = cssControls.get('angle');
        const angle = angles?.length === 1 ? angles[0] : null;
        if (angle instanceof InlineEditor.CSSAngle.CSSAngle) {
            angle.updateProperty(context.matchedResult.getComputedText(match.node));
            const args = ASTUtils.callArgs(match.node);
            const angleNode = args[0]?.find(node => context.matchedResult.getMatch(node) instanceof SDK.CSSPropertyParserMatchers.AngleMatch);
            const angleMatch = angleNode && context.matchedResult.getMatch(angleNode);
            if (angleMatch) {
                angle.addEventListener(InlineEditor.InlineEditorUtils.ValueChangedEvent.eventName, ev => {
                    angle.updateProperty(context.matchedResult.getComputedText(match.node, match => match === angleMatch ? ev.data.value : null));
                });
            }
        }
        return nodes;
    }
}
// clang-format off
export class RelativeColorChannelRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch) {
    // clang-format on
    #treeElement;
    constructor(treeElement) {
        super();
        this.#treeElement = treeElement;
    }
    render(match, context) {
        const color = context.findParent(match.node, SDK.CSSPropertyParserMatchers.ColorMatch);
        if (!color?.relativeColor) {
            return [document.createTextNode(match.text)];
        }
        const value = match.getColorChannelValue(color.relativeColor);
        if (value === null) {
            return [document.createTextNode(match.text)];
        }
        const evaluation = context.tracing?.applyEvaluation([], () => ({ placeholder: [document.createTextNode(value.toFixed(3))] }));
        if (evaluation) {
            return evaluation;
        }
        const span = document.createElement('span');
        span.append(match.text);
        const tooltipId = this.#treeElement?.getTooltipId('relative-color-channel');
        if (!tooltipId) {
            return [span];
        }
        span.setAttribute('aria-details', tooltipId);
        const tooltip = new Tooltips.Tooltip.Tooltip({
            id: tooltipId,
            variant: 'rich',
            anchor: span,
            jslogContext: 'elements.relative-color-channel',
        });
        tooltip.append(value.toFixed(3));
        return [span, tooltip];
    }
}
// clang-format off
export class ColorRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.ColorMatch) {
    // clang-format on
    #treeElement;
    #stylesPane;
    constructor(stylesPane, treeElement) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
    }
    #getValueChild(match, context) {
        const valueChild = document.createElement('span');
        if (match.node.name !== 'CallExpression') {
            valueChild.appendChild(document.createTextNode(match.text));
            return { valueChild };
        }
        const func = context.matchedResult.ast.text(match.node.getChild('Callee'));
        const args = ASTUtils.siblings(match.node.getChild('ArgList'));
        const childTracingContexts = context.tracing?.evaluation([args], { match, context }) ?? undefined;
        const renderingContext = childTracingContexts?.at(0)?.renderingContext(context) ?? context;
        const { nodes, cssControls } = Renderer.renderInto(args, renderingContext, valueChild);
        render(html `${this.#treeElement?.getTracingTooltip(func, match.node, this.#treeElement.matchedStyles(), this.#treeElement.getComputedStyles() ?? new Map(), renderingContext) ??
            func}${nodes}`, valueChild);
        return { valueChild, cssControls, childTracingContexts };
    }
    render(match, context) {
        const { valueChild, cssControls, childTracingContexts } = this.#getValueChild(match, context);
        let colorText = context.matchedResult.getComputedText(match.node);
        if (match.relativeColor) {
            const fakeSpan = document.body.appendChild(document.createElement('span'));
            fakeSpan.style.backgroundColor = colorText;
            colorText = window.getComputedStyle(fakeSpan).backgroundColor?.toString() || colorText;
            fakeSpan.remove();
        }
        // Now try render a color swatch if the result is parsable.
        const color = Common.Color.parse(colorText);
        if (!color) {
            if (match.node.name === 'CallExpression') {
                return Renderer.render(ASTUtils.children(match.node), context).nodes;
            }
            return [document.createTextNode(colorText)];
        }
        if (match.node.name === 'CallExpression' && childTracingContexts) {
            const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => {
                const displayColor = color.as(((color.alpha ?? 1) !== 1) ? "hexa" /* Common.Color.Format.HEXA */ : "hex" /* Common.Color.Format.HEX */);
                const colorText = document.createElement('span');
                colorText.textContent = displayColor.asString();
                const swatch = new ColorRenderer(this.#stylesPane, null)
                    .renderColorSwatch(displayColor.isGamutClipped() ? color : (displayColor.nickname() ?? displayColor), colorText);
                swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => {
                    colorText.textContent = ev.data.color.asString();
                });
                context.addControl('color', swatch);
                return { placeholder: [swatch, colorText] };
            });
            if (evaluation) {
                return evaluation;
            }
        }
        const swatch = this.renderColorSwatch(color, valueChild);
        context.addControl('color', swatch);
        // For hsl/hwb colors, hook up the angle swatch for the hue.
        if (cssControls && match.node.name === 'CallExpression' &&
            context.ast.text(match.node.getChild('Callee')).match(/^(hsla?|hwba?)/)) {
            const [angle] = cssControls.get('angle') ?? [];
            if (angle instanceof InlineEditor.CSSAngle.CSSAngle) {
                angle.updateProperty(swatch.getColor()?.asString() ?? '');
                angle.addEventListener(InlineEditor.InlineEditorUtils.ValueChangedEvent.eventName, ev => {
                    const hue = Common.Color.parseHueNumeric(ev.data.value);
                    const color = swatch.getColor();
                    if (!hue || !color) {
                        return;
                    }
                    if (color.is("hsl" /* Common.Color.Format.HSL */) || color.is("hsla" /* Common.Color.Format.HSLA */)) {
                        swatch.setColor(new Common.Color.HSL(hue, color.s, color.l, color.alpha));
                    }
                    else if (color.is("hwb" /* Common.Color.Format.HWB */) || color.is("hwba" /* Common.Color.Format.HWBA */)) {
                        swatch.setColor(new Common.Color.HWB(hue, color.w, color.b, color.alpha));
                    }
                    angle.updateProperty(swatch.getColor()?.asString() ?? '');
                });
            }
        }
        return [swatch, valueChild];
    }
    renderColorSwatch(color, valueChild) {
        const editable = this.#treeElement?.editable();
        const shiftClickMessage = i18nString(UIStrings.shiftClickToChangeColorFormat);
        const tooltip = editable ? i18nString(UIStrings.openColorPickerS, { PH1: shiftClickMessage }) : '';
        const swatch = new InlineEditor.ColorSwatch.ColorSwatch(tooltip);
        swatch.setReadonly(!editable);
        if (color) {
            swatch.renderColor(color);
        }
        if (this.#treeElement?.editable()) {
            const treeElement = this.#treeElement;
            const onColorChanged = () => {
                void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
            };
            const onColorFormatChanged = (e) => {
                valueChild.textContent = e.data.color.getAuthoredText() ?? e.data.color.asString();
                void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
            };
            swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, () => {
                Host.userMetrics.swatchActivated(2 /* Host.UserMetrics.SwatchType.COLOR */);
            });
            swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, onColorChanged);
            swatch.addEventListener(InlineEditor.ColorSwatch.ColorFormatChangedEvent.eventName, onColorFormatChanged);
            const swatchIcon = new ColorSwatchPopoverIcon(treeElement, treeElement.parentPane().swatchPopoverHelper(), swatch);
            swatchIcon.addEventListener("colorchanged" /* ColorSwatchPopoverIconEvents.COLOR_CHANGED */, ev => {
                valueChild.textContent = ev.data.getAuthoredText() ?? ev.data.asString();
                swatch.setColor(ev.data);
            });
            if (treeElement.property.name === 'color') {
                void this.#addColorContrastInfo(swatchIcon);
            }
        }
        return swatch;
    }
    async #addColorContrastInfo(swatchIcon) {
        const cssModel = this.#stylesPane.cssModel();
        const node = this.#stylesPane.node();
        if (!cssModel || typeof node?.id === 'undefined') {
            return;
        }
        const contrastInfo = new ColorPicker.ContrastInfo.ContrastInfo(await cssModel.getBackgroundColors(node.id));
        swatchIcon.setContrastInfo(contrastInfo);
    }
}
// clang-format off
export class LightDarkColorRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.LightDarkColorMatch) {
    // clang-format on
    #treeElement;
    #stylesPane;
    #matchedStyles;
    constructor(stylesPane, matchedStyles, treeElement) {
        super();
        this.#treeElement = treeElement;
        this.#stylesPane = stylesPane;
        this.#matchedStyles = matchedStyles;
    }
    render(match, context) {
        const content = document.createElement('span');
        content.appendChild(document.createTextNode('light-dark('));
        const light = content.appendChild(document.createElement('span'));
        content.appendChild(document.createTextNode(', '));
        const dark = content.appendChild(document.createElement('span'));
        content.appendChild(document.createTextNode(')'));
        const { cssControls: lightControls } = Renderer.renderInto(match.light, context, light);
        const { cssControls: darkControls } = Renderer.renderInto(match.dark, context, dark);
        if (context.matchedResult.hasUnresolvedSubstitutions(match.node)) {
            return [content];
        }
        const color = Common.Color.parse(context.matchedResult.getComputedTextRange(match.light[0], match.light[match.light.length - 1]));
        if (!color) {
            return [content];
        }
        // Pass an undefined color here to insert a placeholder swatch that will be filled in from the async
        // applyColorScheme below.
        const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(undefined, content);
        context.addControl('color', colorSwatch);
        void this.applyColorScheme(match, context, colorSwatch, light, dark, lightControls, darkControls);
        return [colorSwatch, content];
    }
    async applyColorScheme(match, context, colorSwatch, light, dark, lightControls, darkControls) {
        const activeColor = await this.#activeColor(match);
        if (!activeColor) {
            return;
        }
        const activeColorSwatches = (activeColor === match.light ? lightControls : darkControls).get('color');
        activeColorSwatches?.forEach(swatch => swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => colorSwatch.setColor(ev.data.color)));
        const inactiveColor = (activeColor === match.light) ? dark : light;
        const colorText = context.matchedResult.getComputedTextRange(activeColor[0], activeColor[activeColor.length - 1]);
        const color = colorText && Common.Color.parse(colorText);
        inactiveColor.classList.add('inactive-value');
        if (color) {
            colorSwatch.renderColor(color);
        }
    }
    // Returns the syntax node group corresponding the active color scheme:
    // If the element has color-scheme set to light or dark, return the respective group.
    // If the element has color-scheme set to both light and dark, we check the prefers-color-scheme media query.
    async #activeColor(match) {
        const activeColorSchemes = this.#matchedStyles.resolveProperty('color-scheme', match.style)
            ?.parseValue(this.#matchedStyles, new Map())
            ?.getComputedPropertyValueText()
            .split(' ') ??
            [];
        const hasLight = activeColorSchemes.includes("light" /* SDK.CSSModel.ColorScheme.LIGHT */);
        const hasDark = activeColorSchemes.includes("dark" /* SDK.CSSModel.ColorScheme.DARK */);
        if (!hasDark && !hasLight) {
            return match.light;
        }
        if (!hasLight) {
            return match.dark;
        }
        if (!hasDark) {
            return match.light;
        }
        switch (await this.#stylesPane.cssModel()?.colorScheme()) {
            case "dark" /* SDK.CSSModel.ColorScheme.DARK */:
                return match.dark;
            case "light" /* SDK.CSSModel.ColorScheme.LIGHT */:
                return match.light;
            default:
                return undefined;
        }
    }
}
// clang-format off
export class ColorMixRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.ColorMixMatch) {
    // clang-format on
    #pane;
    #matchedStyles;
    #computedStyles;
    #treeElement;
    constructor(pane, matchedStyles, computedStyles, treeElement) {
        super();
        this.#pane = pane;
        this.#matchedStyles = matchedStyles;
        this.#computedStyles = computedStyles;
        this.#treeElement = treeElement;
    }
    render(match, context) {
        const hookUpColorArg = (node, onChange) => {
            if (node instanceof InlineEditor.ColorMixSwatch.ColorMixSwatch ||
                node instanceof InlineEditor.ColorSwatch.ColorSwatch) {
                if (node instanceof InlineEditor.ColorSwatch.ColorSwatch) {
                    node.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => onChange(ev.data.color.getAuthoredText() ?? ev.data.color.asString()));
                }
                else {
                    node.addEventListener(InlineEditor.ColorMixSwatch.ColorMixChangedEvent.eventName, ev => onChange(ev.data.text));
                }
                const color = node.getText();
                if (color) {
                    onChange(color);
                    return true;
                }
            }
            return false;
        };
        const childTracingContexts = context.tracing?.evaluation([match.space, match.color1, match.color2], { match, context });
        const childRenderingContexts = childTracingContexts?.map(ctx => ctx.renderingContext(context)) ?? [context, context, context];
        const contentChild = document.createElement('span');
        const color1 = Renderer.renderInto(match.color1, childRenderingContexts[1], contentChild);
        const color2 = Renderer.renderInto(match.color2, childRenderingContexts[2], contentChild);
        render(html `${this.#treeElement?.getTracingTooltip('color-mix', match.node, this.#matchedStyles, this.#computedStyles, context) ??
            'color-mix'}(${Renderer.render(match.space, childRenderingContexts[0]).nodes}, ${color1.nodes}, ${color2.nodes})`, contentChild);
        const color1Controls = color1.cssControls.get('color') ?? [];
        const color2Controls = color2.cssControls.get('color') ?? [];
        if (context.matchedResult.hasUnresolvedSubstitutions(match.node) || color1Controls.length !== 1 ||
            color2Controls.length !== 1) {
            return [contentChild];
        }
        const space = match.space.map(space => context.matchedResult.getComputedText(space)).join(' ');
        const color1Text = match.color1.map(color => context.matchedResult.getComputedText(color)).join(' ');
        const color2Text = match.color2.map(color => context.matchedResult.getComputedText(color)).join(' ');
        const colorMixText = `color-mix(${space}, ${color1Text}, ${color2Text})`;
        const nodeId = this.#pane.node()?.id;
        if (nodeId !== undefined && childTracingContexts) {
            const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => {
                const initialColor = Common.Color.parse('#000');
                const colorText = document.createElement('span');
                colorText.textContent = initialColor.asString();
                const swatch = new ColorRenderer(this.#pane, null).renderColorSwatch(initialColor, colorText);
                swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, ev => {
                    colorText.textContent = ev.data.color.asString();
                });
                context.addControl('color', swatch);
                const asyncEvalCallback = async () => {
                    const results = await this.#pane.cssModel()?.resolveValues(undefined, nodeId, colorMixText);
                    if (results) {
                        const color = Common.Color.parse(results[0]);
                        if (color) {
                            swatch.setColor(color.as("hexa" /* Common.Color.Format.HEXA */));
                            return true;
                        }
                    }
                    return false;
                };
                return { placeholder: [swatch, colorText], asyncEvalCallback };
            });
            if (evaluation) {
                return evaluation;
            }
        }
        const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
        if (!hookUpColorArg(color1Controls[0], text => swatch.setFirstColor(text)) ||
            !hookUpColorArg(color2Controls[0], text => swatch.setSecondColor(text))) {
            return [contentChild];
        }
        swatch.tabIndex = -1;
        swatch.setColorMixText(colorMixText);
        UI.ARIAUtils.setLabel(swatch, colorMixText);
        context.addControl('color', swatch);
        if (context.tracing) {
            return [swatch, contentChild];
        }
        const tooltipId = this.#treeElement?.getTooltipId('color-mix');
        if (!tooltipId) {
            return [swatch, contentChild];
        }
        swatch.setAttribute('aria-details', tooltipId);
        const tooltip = new Tooltips.Tooltip.Tooltip({
            id: tooltipId,
            variant: 'rich',
            anchor: swatch,
            jslogContext: 'elements.css-color-mix',
        });
        const colorTextSpan = tooltip.appendChild(document.createElement('span'));
        tooltip.onbeforetoggle = e => {
            if (e.newState !== 'open') {
                return;
            }
            const color = swatch.mixedColor();
            if (!color) {
                return;
            }
            const rgb = color.as("hex" /* Common.Color.Format.HEX */);
            colorTextSpan.textContent = rgb.isGamutClipped() ? color.asString() : rgb.asString();
        };
        return [swatch, contentChild, tooltip];
    }
}
// clang-format off
export class AngleRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.AngleMatch) {
    // clang-format on
    #treeElement;
    constructor(treeElement) {
        super();
        this.#treeElement = treeElement;
    }
    render(match, context) {
        const angleText = match.text;
        if (!this.#treeElement?.editable()) {
            return [document.createTextNode(angleText)];
        }
        const cssAngle = new InlineEditor.CSSAngle.CSSAngle();
        cssAngle.setAttribute('jslog', `${VisualLogging.showStyleEditor().track({ click: true }).context('css-angle')}`);
        const valueElement = document.createElement('span');
        valueElement.textContent = angleText;
        cssAngle.data = {
            angleText,
            containingPane: this.#treeElement.parentPane().element.enclosingNodeOrSelfWithClass('style-panes-wrapper'),
        };
        cssAngle.append(valueElement);
        const treeElement = this.#treeElement;
        cssAngle.addEventListener('popovertoggled', ({ data }) => {
            const section = treeElement.section();
            if (!section) {
                return;
            }
            if (data.open) {
                treeElement.parentPane().hideAllPopovers();
                treeElement.parentPane().activeCSSAngle = cssAngle;
                Host.userMetrics.swatchActivated(7 /* Host.UserMetrics.SwatchType.ANGLE */);
            }
            section.element.classList.toggle('has-open-popover', data.open);
            treeElement.parentPane().setEditingStyle(data.open);
            // Commit the value as a major change after the angle popover is closed.
            if (!data.open) {
                void treeElement.applyStyleText(treeElement.renderedPropertyText(), true);
            }
        });
        cssAngle.addEventListener('valuechanged', async ({ data }) => {
            valueElement.textContent = data.value;
            await treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
        });
        cssAngle.addEventListener('unitchanged', ({ data }) => {
            valueElement.textContent = data.value;
        });
        context.addControl('angle', cssAngle);
        return [cssAngle];
    }
}
// clang-format off
export class LinkableNameRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.LinkableNameMatch) {
    // clang-format on
    #matchedStyles;
    #stylesPane;
    constructor(matchedStyles, stylesSidebarPane) {
        super();
        this.#matchedStyles = matchedStyles;
        this.#stylesPane = stylesSidebarPane;
    }
    #getLinkData(match) {
        switch (match.propertyName) {
            case "animation" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.ANIMATION */:
            case "animation-name" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.ANIMATION_NAME */:
                return {
                    jslogContext: 'css-animation-name',
                    metric: 1 /* Host.UserMetrics.SwatchType.ANIMATION_NAME_LINK */,
                    ruleBlock: '@keyframes',
                    isDefined: Boolean(this.#matchedStyles.keyframes().find(kf => kf.name().text === match.text)),
                };
            case "font-palette" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.FONT_PALETTE */:
                return {
                    jslogContext: 'css-font-palette',
                    metric: null,
                    ruleBlock: '@font-*',
                    isDefined: Boolean(this.#matchedStyles.atRules().find(ar => ar.type() === 'font-palette-values' && ar.name()?.text === match.text)),
                };
            case "position-try" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.POSITION_TRY */:
            case "position-try-fallbacks" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.POSITION_TRY_FALLBACKS */:
                return {
                    jslogContext: 'css-position-try',
                    metric: 10 /* Host.UserMetrics.SwatchType.POSITION_TRY_LINK */,
                    ruleBlock: '@position-try',
                    isDefined: Boolean(this.#matchedStyles.positionTryRules().find(pt => pt.name().text === match.text)),
                };
        }
    }
    render(match) {
        const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
        const { metric, jslogContext, ruleBlock, isDefined } = this.#getLinkData(match);
        swatch.data = {
            text: match.text,
            tooltip: isDefined ? undefined : { title: i18nString(UIStrings.sIsNotDefined, { PH1: match.text }) },
            isDefined,
            onLinkActivate: () => {
                metric && Host.userMetrics.swatchActivated(metric);
                if (match.propertyName === "font-palette" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.FONT_PALETTE */) {
                    this.#stylesPane.jumpToFontPaletteDefinition(match.text);
                }
                else {
                    this.#stylesPane.jumpToSectionBlock(`${ruleBlock} ${match.text}`);
                }
            },
            jslogContext,
        };
        if (match.propertyName === "animation" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.ANIMATION */ ||
            match.propertyName === "animation-name" /* SDK.CSSPropertyParserMatchers.LinkableNameProperties.ANIMATION_NAME */) {
            const el = document.createElement('span');
            el.appendChild(swatch);
            const node = this.#stylesPane.node();
            if (node) {
                const animationModel = node.domModel().target().model(SDK.AnimationModel.AnimationModel);
                void animationModel?.getAnimationGroupForAnimation(match.text, node.id).then(maybeAnimationGroup => {
                    if (!maybeAnimationGroup) {
                        return;
                    }
                    const icon = createIcon('animation', 'open-in-animations-panel');
                    icon.setAttribute('jslog', `${VisualLogging.link('open-in-animations-panel').track({ click: true })}`);
                    icon.setAttribute('role', 'button');
                    icon.setAttribute('title', i18nString(UIStrings.jumpToAnimationsPanel));
                    icon.addEventListener('mouseup', ev => {
                        ev.consume(true);
                        void Common.Revealer.reveal(maybeAnimationGroup);
                    });
                    el.insertBefore(icon, swatch);
                });
            }
            return [el];
        }
        return [swatch];
    }
}
// clang-format off
export class BezierRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.BezierMatch) {
    // clang-format on
    #treeElement;
    constructor(treeElement) {
        super();
        this.#treeElement = treeElement;
    }
    render(match, context) {
        const nodes = match.node.name === 'CallExpression' ? Renderer.render(ASTUtils.children(match.node), context).nodes :
            [document.createTextNode(match.text)];
        if (!this.#treeElement?.editable() ||
            !InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(context.matchedResult.getComputedText(match.node))) {
            return nodes;
        }
        const swatchPopoverHelper = this.#treeElement.parentPane().swatchPopoverHelper();
        const icon = createIcon('bezier-curve-filled', 'bezier-swatch-icon');
        icon.setAttribute('jslog', `${VisualLogging.showStyleEditor('bezier')}`);
        icon.tabIndex = -1;
        icon.addEventListener('click', () => {
            Host.userMetrics.swatchActivated(3 /* Host.UserMetrics.SwatchType.ANIMATION_TIMING */);
        });
        const bezierText = document.createElement('span');
        bezierText.append(...nodes);
        new BezierPopoverIcon({ treeElement: this.#treeElement, swatchPopoverHelper, swatch: icon, bezierText });
        const iconAndTextContainer = document.createElement('span');
        iconAndTextContainer.classList.add('bezier-icon-and-text');
        iconAndTextContainer.append(icon);
        iconAndTextContainer.append(bezierText);
        return [iconAndTextContainer];
    }
}
// clang-format off
export class AutoBaseRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.AutoBaseMatch) {
    #computedStyle;
    // clang-format on
    constructor(computedStyle) {
        super();
        this.#computedStyle = computedStyle;
    }
    render(match, context) {
        const content = document.createElement('span');
        content.appendChild(document.createTextNode('-internal-auto-base('));
        const auto = content.appendChild(document.createElement('span'));
        content.appendChild(document.createTextNode(', '));
        const base = content.appendChild(document.createElement('span'));
        content.appendChild(document.createTextNode(')'));
        Renderer.renderInto(match.auto, context, auto);
        Renderer.renderInto(match.base, context, base);
        const activeAppearance = this.#computedStyle.get('appearance');
        if (activeAppearance?.startsWith('base')) {
            auto.classList.add('inactive-value');
        }
        else {
            base.classList.add('inactive-value');
        }
        return [content];
    }
}
/**
 * The shadow model is an abstraction over the various shadow properties on the one hand and the order they were defined
 * in on the other, so that modifications through the shadow editor can retain the property order in the authored text.
 * The model also looks through var()s by keeping a mapping between individual properties and any var()s they are coming
 * from, replacing the var() functions as needed with concrete values when edited.
 **/
export class ShadowModel {
    #properties;
    #shadowType;
    #context;
    constructor(shadowType, properties, context) {
        this.#shadowType = shadowType;
        this.#properties = properties;
        this.#context = context;
    }
    isBoxShadow() {
        return this.#shadowType === "boxShadow" /* SDK.CSSPropertyParserMatchers.ShadowType.BOX_SHADOW */;
    }
    inset() {
        return Boolean(this.#properties.find(property => property.propertyType === "inset" /* ShadowPropertyType.INSET */));
    }
    #length(lengthType) {
        return this.#properties.find((property) => property.propertyType === lengthType)
            ?.length ??
            InlineEditor.CSSShadowEditor.CSSLength.zero();
    }
    offsetX() {
        return this.#length("x" /* ShadowPropertyType.X */);
    }
    offsetY() {
        return this.#length("y" /* ShadowPropertyType.Y */);
    }
    blurRadius() {
        return this.#length("blur" /* ShadowPropertyType.BLUR */);
    }
    spreadRadius() {
        return this.#length("spread" /* ShadowPropertyType.SPREAD */);
    }
    #needsExpansion(property) {
        return Boolean(property.expansionContext && property.source);
    }
    #expandPropertyIfNeeded(property) {
        if (this.#needsExpansion(property)) {
            // Rendering prefers `source` if present. It's sufficient to clear it in order to switch rendering to render the
            // individual properties directly.
            const source = property.source;
            this.#properties.filter(property => property.source === source).forEach(property => {
                property.source = null;
            });
        }
    }
    #expandOrGetProperty(propertyType) {
        const index = this.#properties.findIndex(property => property.propertyType === propertyType);
        const property = index >= 0 ? this.#properties[index] : undefined;
        property && this.#expandPropertyIfNeeded(property);
        return { property, index };
    }
    setInset(inset) {
        if (!this.isBoxShadow()) {
            return;
        }
        const { property, index } = this.#expandOrGetProperty("inset" /* ShadowPropertyType.INSET */);
        if (property) {
            // For `inset`, remove the entry if value is false, otherwise don't touch it.
            if (!inset) {
                this.#properties.splice(index, 1);
            }
        }
        else {
            this.#properties.unshift({ value: 'inset', source: null, expansionContext: null, propertyType: "inset" /* ShadowPropertyType.INSET */ });
        }
    }
    #setLength(value, propertyType) {
        const { property } = this.#expandOrGetProperty(propertyType);
        if (property) {
            property.value = value.asCSSText();
            property.length = value;
            property.source = null;
        }
        else {
            // Lengths are ordered X, Y, Blur, Spread, with the latter two being optional. When inserting an optional property
            // we need to insert it after Y or after Blur, depending on what's being inserted and which properties are
            // present.
            const insertionIdx = 1 +
                this.#properties.findLastIndex(property => property.propertyType === "y" /* ShadowPropertyType.Y */ ||
                    (propertyType === "spread" /* ShadowPropertyType.SPREAD */ && property.propertyType === "blur" /* ShadowPropertyType.BLUR */));
            if (insertionIdx > 0 && insertionIdx < this.#properties.length &&
                this.#needsExpansion(this.#properties[insertionIdx]) &&
                this.#properties[insertionIdx - 1].source === this.#properties[insertionIdx].source) {
                // This prevents the edge case where insertion after the last length would break up a group of values that
                // require expansion.
                this.#expandPropertyIfNeeded(this.#properties[insertionIdx]);
            }
            this.#properties.splice(insertionIdx, 0, { value: value.asCSSText(), length: value, source: null, expansionContext: null, propertyType });
        }
    }
    setOffsetX(value) {
        this.#setLength(value, "x" /* ShadowPropertyType.X */);
    }
    setOffsetY(value) {
        this.#setLength(value, "y" /* ShadowPropertyType.Y */);
    }
    setBlurRadius(value) {
        this.#setLength(value, "blur" /* ShadowPropertyType.BLUR */);
    }
    setSpreadRadius(value) {
        if (this.isBoxShadow()) {
            this.#setLength(value, "spread" /* ShadowPropertyType.SPREAD */);
        }
    }
    renderContents(span) {
        span.removeChildren();
        let previousSource = null;
        for (const property of this.#properties) {
            if (!property.source || property.source !== previousSource) {
                if (property !== this.#properties[0]) {
                    span.append(' ');
                }
                // If `source` is present on the property that means it came from a var() and we'll use that to render.
                if (property.source) {
                    span.append(...Renderer.render(property.source, this.#context).nodes);
                }
                else if (typeof property.value === 'string') {
                    span.append(property.value);
                }
                else {
                    span.append(...Renderer.render(property.value, property.expansionContext ?? this.#context).nodes);
                }
            }
            previousSource = property.source;
        }
    }
}
// clang-format off
export class ShadowRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.ShadowMatch) {
    #treeElement;
    // clang-format on
    constructor(treeElement) {
        super();
        this.#treeElement = treeElement;
    }
    shadowModel(shadow, shadowType, context) {
        const properties = [];
        const missingLengths = ["spread" /* ShadowPropertyType.SPREAD */, "blur" /* ShadowPropertyType.BLUR */, "y" /* ShadowPropertyType.Y */, "x" /* ShadowPropertyType.X */];
        let stillAcceptsLengths = true;
        // We're parsing the individual shadow properties into an array here retaining the ordering. This also looks through
        // var() functions by re-parsing the variable values on the fly. For properties coming from a var() we're keeping
        // track of their origin to allow for adhoc expansion when one of those properties is edited.
        const queue = shadow.map(value => ({ value, source: value, match: context.matchedResult.getMatch(value), expansionContext: null }));
        for (let item = queue.shift(); item; item = queue.shift()) {
            const { value, source, match, expansionContext } = item;
            const text = (expansionContext ?? context).ast.text(value);
            if (value.name === 'NumberLiteral') {
                if (!stillAcceptsLengths) {
                    return null;
                }
                const propertyType = missingLengths.pop();
                if (propertyType === undefined ||
                    (propertyType === "spread" /* ShadowPropertyType.SPREAD */ &&
                        shadowType === "textShadow" /* SDK.CSSPropertyParserMatchers.ShadowType.TEXT_SHADOW */)) {
                    return null;
                }
                const length = InlineEditor.CSSShadowEditor.CSSLength.parse(text);
                if (!length) {
                    return null;
                }
                properties.push({ value, source, length, propertyType, expansionContext });
            }
            else if (match instanceof SDK.CSSPropertyParserMatchers.VariableMatch) {
                // This doesn't come from any computed text, so we can rely on context here
                const computedValue = context.matchedResult.getComputedText(value);
                const computedValueAst = SDK.CSSPropertyParser.tokenizeDeclaration('--property', computedValue);
                if (!computedValueAst) {
                    return null;
                }
                const matches = SDK.CSSPropertyParser.BottomUpTreeMatching.walkExcludingSuccessors(computedValueAst, [new SDK.CSSPropertyParserMatchers.ColorMatcher()]);
                if (matches.hasUnresolvedSubstitutions(matches.ast.tree)) {
                    return null;
                }
                queue.unshift(...ASTUtils.siblings(ASTUtils.declValue(matches.ast.tree))
                    .map(matchedNode => ({
                    value: matchedNode,
                    source: value,
                    match: matches.getMatch(matchedNode),
                    expansionContext: new RenderingContext(computedValueAst, null, context.renderers, matches),
                })));
            }
            else {
                // The length properties must come in one block, so if there were any lengths before, followed by a non-length
                // property, we will not allow any future lengths.
                stillAcceptsLengths = missingLengths.length === 4;
                if (value.name === 'ValueName' && text.toLowerCase() === 'inset') {
                    if (shadowType === "textShadow" /* SDK.CSSPropertyParserMatchers.ShadowType.TEXT_SHADOW */ ||
                        properties.find(({ propertyType }) => propertyType === "inset" /* ShadowPropertyType.INSET */)) {
                        return null;
                    }
                    properties.push({ value, source, propertyType: "inset" /* ShadowPropertyType.INSET */, expansionContext });
                }
                else if (match instanceof SDK.CSSPropertyParserMatchers.ColorMatch ||
                    match instanceof SDK.CSSPropertyParserMatchers.ColorMixMatch) {
                    if (properties.find(({ propertyType }) => propertyType === "color" /* ShadowPropertyType.COLOR */)) {
                        return null;
                    }
                    properties.push({ value, source, propertyType: "color" /* ShadowPropertyType.COLOR */, expansionContext });
                }
                else if (value.name !== 'Comment' && value.name !== 'Important') {
                    return null;
                }
            }
        }
        if (missingLengths.length > 2) {
            // X and Y are mandatory
            return null;
        }
        return new ShadowModel(shadowType, properties, context);
    }
    render(match, context) {
        const shadows = ASTUtils.split(ASTUtils.siblings(ASTUtils.declValue(match.node)));
        const result = [];
        for (const shadow of shadows) {
            const model = this.shadowModel(shadow, match.shadowType, context);
            const isImportant = shadow.find(node => node.name === 'Important');
            if (shadow !== shadows[0]) {
                result.push(document.createTextNode(', '));
            }
            if (!model || !this.#treeElement?.editable()) {
                const { nodes } = Renderer.render(shadow, context);
                result.push(...nodes);
                continue;
            }
            const swatch = new InlineEditor.Swatches.CSSShadowSwatch(model);
            swatch.setAttribute('jslog', `${VisualLogging.showStyleEditor('css-shadow').track({ click: true })}`);
            swatch.iconElement().addEventListener('click', () => {
                Host.userMetrics.swatchActivated(4 /* Host.UserMetrics.SwatchType.SHADOW */);
            });
            const contents = document.createElement('span');
            model.renderContents(contents);
            const popoverHelper = new ShadowSwatchPopoverHelper(this.#treeElement, this.#treeElement.parentPane().swatchPopoverHelper(), swatch);
            const treeElement = this.#treeElement;
            popoverHelper.addEventListener("shadowChanged" /* ShadowEvents.SHADOW_CHANGED */, () => {
                model.renderContents(contents);
                void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
            });
            result.push(swatch, contents);
            if (isImportant) {
                result.push(...[document.createTextNode(' '), ...Renderer.render(isImportant, context).nodes]);
            }
        }
        return result;
    }
}
// clang-format off
export class FontRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.FontMatch) {
    treeElement;
    // clang-format on
    constructor(treeElement) {
        super();
        this.treeElement = treeElement;
    }
    render(match, context) {
        this.treeElement.section().registerFontProperty(this.treeElement);
        const { nodes } = Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context);
        return nodes;
    }
}
// clang-format off
export class GridTemplateRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.GridTemplateMatch) {
    // clang-format on
    render(match, context) {
        if (match.lines.length <= 1) {
            return Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context).nodes;
        }
        const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
        const container = document.createDocumentFragment();
        for (const line of match.lines) {
            const value = Renderer.render(line, context);
            const lineBreak = UI.Fragment.html `<br /><span class='styles-clipboard-only'>${indent.repeat(2)}</span>`;
            container.append(lineBreak, ...value.nodes);
        }
        return [container];
    }
}
export const SHORTHANDS_FOR_PERCENTAGES = new Set([
    'inset',
    'inset-block',
    'inset-inline',
    'margin',
    'margin-block',
    'margin-inline',
    'padding',
    'padding-block',
    'padding-inline',
]);
async function resolveValues(stylesPane, propertyName, match, context, ...values) {
    // We want to resolve values against the original property we're tracing and not the property we're substituting,
    // so try to look up the original name.
    propertyName = context.tracing?.propertyName ?? context.matchedResult.ast.propertyName ?? propertyName;
    if (SHORTHANDS_FOR_PERCENTAGES.has(propertyName) &&
        (context.tracing?.expandPercentagesInShorthands ?? context.matchedResult.getLonghandValuesCount() > 1)) {
        propertyName = context.getComputedLonghandName(match.node) ?? propertyName;
    }
    const nodeId = stylesPane.node()?.id;
    if (nodeId === undefined) {
        return null;
    }
    return (await stylesPane.cssModel()?.resolveValues(propertyName, nodeId, ...values)) ??
        (await stylesPane.cssModel()?.resolveValues(undefined, nodeId, ...values));
}
// clang-format off
export class LengthRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.LengthMatch) {
    // clang-format on
    #stylesPane;
    #treeElement;
    #propertyName;
    constructor(stylesPane, propertyName, treeElement) {
        super();
        this.#stylesPane = stylesPane;
        this.#treeElement = treeElement;
        this.#propertyName = propertyName;
    }
    render(match, context) {
        const valueElement = document.createElement('span');
        valueElement.tabIndex = -1;
        valueElement.textContent = match.text;
        const tooltip = this.#getTooltip(valueElement, match, context);
        const evaluation = context.tracing?.applyEvaluation([], () => {
            return {
                placeholder: [valueElement],
                asyncEvalCallback: () => this.#applyEvaluation(valueElement, match, context)
            };
        });
        if (evaluation) {
            return evaluation;
        }
        return tooltip ? [valueElement, tooltip] : [valueElement];
    }
    async #applyEvaluation(valueElement, match, context) {
        const pixelValue = await resolveValues(this.#stylesPane, this.#propertyName, match, context, match.text);
        if (pixelValue?.[0] && pixelValue?.[0] !== match.text) {
            valueElement.textContent = pixelValue[0];
            return true;
        }
        return false;
    }
    #getTooltip(valueElement, match, context) {
        const tooltipId = this.#treeElement?.getTooltipId('length');
        if (!tooltipId) {
            return undefined;
        }
        valueElement.setAttribute('aria-details', tooltipId);
        const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: valueElement, variant: 'rich', id: tooltipId, jslogContext: 'length-popover' });
        tooltip.addEventListener('beforetoggle', () => this.getTooltipValue(tooltip, match, context), { once: true });
        return tooltip;
    }
    async getTooltipValue(tooltip, match, context) {
        const pixelValue = await resolveValues(this.#stylesPane, this.#propertyName, match, context, match.text);
        if (!pixelValue) {
            return;
        }
        tooltip.appendChild(document.createTextNode(pixelValue[0]));
    }
}
// clang-format off
export class BaseFunctionRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.BaseFunctionMatch) {
    // clang-format on
    #stylesPane;
    #matchedStyles;
    #computedStyles;
    #treeElement;
    #propertyName;
    constructor(stylesPane, matchedStyles, computedStyles, propertyName, treeElement) {
        super();
        this.#matchedStyles = matchedStyles;
        this.#computedStyles = computedStyles;
        this.#stylesPane = stylesPane;
        this.#treeElement = treeElement;
        this.#propertyName = propertyName;
    }
    render(match, context) {
        const childTracingContexts = context.tracing?.evaluation(match.args, { match, context });
        const renderedArgs = match.args.map((arg, idx) => {
            const span = document.createElement('span');
            Renderer.renderInto(arg, childTracingContexts ? childTracingContexts[idx].renderingContext(context) : context, span);
            return span;
        });
        const span = document.createElement('span');
        render(html `${this.#treeElement?.getTracingTooltip(match.func, match.node, this.#matchedStyles, this.#computedStyles, context) ??
            match.func}(${renderedArgs.map((arg, idx) => idx === 0 ? [arg] : [html `, `, arg]).flat()})`, span);
        if (childTracingContexts) {
            const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => ({ placeholder: [span], asyncEvalCallback: () => this.applyEvaluation(span, match, context) }));
            if (evaluation) {
                return evaluation;
            }
        }
        else if (match instanceof SDK.CSSPropertyParserMatchers.MathFunctionMatch && !match.isArithmeticFunctionCall()) {
            void this.applyMathFunction(renderedArgs, match, context);
        }
        return [span];
    }
    async applyEvaluation(span, match, context) {
        const value = context.matchedResult.getComputedText(match.node, match => {
            if (match instanceof SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch) {
                const relativeColor = context.findParent(match.node, SDK.CSSPropertyParserMatchers.ColorMatch)?.relativeColor ?? null;
                return (relativeColor && match.getColorChannelValue(relativeColor)?.toFixed(3)) ?? null;
            }
            return null;
        });
        const evaled = await resolveValues(this.#stylesPane, this.#propertyName, match, context, value);
        if (!evaled?.[0] || evaled[0] === value) {
            return false;
        }
        span.textContent = evaled[0];
        return true;
    }
    async applyMathFunction(renderedArgs, match, context) {
        // To understand which argument was selected by the function, we evaluate the function as well as all the arguments
        // and compare the function result to the values of all its arguments. Evaluating the arguments eliminates nested
        // function calls and normalizes all units to px.
        const values = match.args.map(arg => context.matchedResult.getComputedTextRange(arg[0], arg[arg.length - 1]));
        values.unshift(context.matchedResult.getComputedText(match.node));
        const evaledArgs = await resolveValues(this.#stylesPane, this.#propertyName, match, context, ...values);
        if (!evaledArgs) {
            return;
        }
        const functionResult = evaledArgs.shift();
        if (!functionResult) {
            return;
        }
        for (let i = 0; i < renderedArgs.length; ++i) {
            if (evaledArgs[i] !== functionResult) {
                renderedArgs[i].classList.add('inactive-value');
            }
        }
    }
}
export class MathFunctionRenderer extends BaseFunctionRenderer {
    matchType = SDK.CSSPropertyParserMatchers.MathFunctionMatch;
}
export class CustomFunctionRenderer extends BaseFunctionRenderer {
    matchType = SDK.CSSPropertyParserMatchers.CustomFunctionMatch;
}
// clang-format off
export class AnchorFunctionRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.AnchorFunctionMatch) {
    // clang-format on
    #stylesPane;
    static async decorateAnchorForAnchorLink(stylesPane, container, { identifier, needsSpace }) {
        if (identifier) {
            render(html `${identifier}`, container, { host: container });
        }
        const anchorNode = await stylesPane.node()?.getAnchorBySpecifier(identifier) ?? undefined;
        if (!identifier && !anchorNode) {
            return;
        }
        const onLinkActivate = () => {
            if (!anchorNode) {
                return;
            }
            void Common.Revealer.reveal(anchorNode, false);
        };
        const handleIconClick = (ev) => {
            ev.stopPropagation();
            onLinkActivate();
        };
        const onMouseEnter = () => {
            anchorNode?.highlight();
        };
        const onMouseLeave = () => {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        };
        if (identifier) {
            render(
            // clang-format off
            html `<devtools-link-swatch
                @mouseenter=${onMouseEnter}
                @mouseleave=${onMouseLeave}
                .data=${{
                text: identifier,
                tooltip: anchorNode ? undefined :
                    { title: i18nString(UIStrings.sIsNotDefined, { PH1: identifier }) },
                isDefined: Boolean(anchorNode),
                jslogContext: 'anchor-link',
                onLinkActivate,
            }}
                ></devtools-link-swatch>${needsSpace ? ' ' : ''}`, 
            // clang-format on
            container, { host: container });
        }
        else {
            // clang-format off
            render(html `<devtools-icon
                   role='button'
                   title=${i18nString(UIStrings.jumpToAnchorNode)}
                   class='icon-link'
                   name='open-externally'
                   jslog=${VisualLogging.action('jump-to-anchor-node').track({ click: true })}
                   @mouseenter=${onMouseEnter}
                   @mouseleave=${onMouseLeave}
                   @mousedown=${(ev) => ev.stopPropagation()}
                   @click=${handleIconClick}
                  ></devtools-icon>${needsSpace ? ' ' : ''}`, container, { host: container });
            // clang-format on
        }
    }
    constructor(stylesPane) {
        super();
        this.#stylesPane = stylesPane;
    }
    render(match, context) {
        const content = document.createElement('span');
        if (match.node.name === 'VariableName') {
            // Link an anchor double-dashed ident to its matching anchor element.
            void AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, content, { identifier: match.text });
        }
        else {
            // The matcher passes a 'CallExpression' node with a functionName
            // ('anchor' or 'anchor-size') if the arguments need to have an implicit
            // anchor link swatch rendered.
            content.appendChild(document.createTextNode(`${match.functionName}(`));
            const swatchContainer = document.createElement('span');
            content.appendChild(swatchContainer);
            const args = ASTUtils.children(match.node.getChild('ArgList'));
            const remainingArgs = args.splice(1);
            void AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, swatchContainer, { needsSpace: remainingArgs.length > 1 });
            Renderer.renderInto(remainingArgs, context, content);
        }
        return [content];
    }
}
// clang-format off
export class PositionAnchorRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.PositionAnchorMatch) {
    #stylesPane;
    // clang-format on
    constructor(stylesPane) {
        super();
        this.#stylesPane = stylesPane;
    }
    render(match) {
        const content = document.createElement('span');
        void AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, content, { identifier: match.text });
        return [content];
    }
}
// clang-format off
export class PositionTryRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.PositionTryMatch) {
    #matchedStyles;
    // clang-format on
    constructor(matchedStyles) {
        super();
        this.#matchedStyles = matchedStyles;
    }
    render(match, context) {
        const content = [];
        if (match.preamble.length > 0) {
            const { nodes } = Renderer.render(match.preamble, context);
            content.push(...nodes);
        }
        for (const [i, fallback] of match.fallbacks.entries()) {
            const fallbackContent = document.createElement('span');
            if (i > 0) {
                fallbackContent.appendChild(document.createTextNode(', '));
            }
            if (i !== this.#matchedStyles.activePositionFallbackIndex()) {
                fallbackContent.classList.add('inactive-value');
            }
            Renderer.renderInto(fallback, context, fallbackContent);
            content.push(fallbackContent);
        }
        return content;
    }
}
export function getPropertyRenderers(propertyName, style, stylesPane, matchedStyles, treeElement, computedStyles) {
    return [
        new VariableRenderer(stylesPane, treeElement, matchedStyles, computedStyles),
        new ColorRenderer(stylesPane, treeElement),
        new ColorMixRenderer(stylesPane, matchedStyles, computedStyles, treeElement),
        new URLRenderer(style.parentRule, stylesPane.node()),
        new AngleRenderer(treeElement),
        new LinkableNameRenderer(matchedStyles, stylesPane),
        new BezierRenderer(treeElement),
        new StringRenderer(),
        new ShadowRenderer(treeElement),
        new CSSWideKeywordRenderer(stylesPane, treeElement),
        new LightDarkColorRenderer(stylesPane, matchedStyles, treeElement),
        new GridTemplateRenderer(),
        new LinearGradientRenderer(),
        new AnchorFunctionRenderer(stylesPane),
        new PositionAnchorRenderer(stylesPane),
        new FlexGridRenderer(stylesPane, treeElement),
        new EnvFunctionRenderer(treeElement, matchedStyles, computedStyles),
        new PositionTryRenderer(matchedStyles),
        new LengthRenderer(stylesPane, propertyName, treeElement),
        new MathFunctionRenderer(stylesPane, matchedStyles, computedStyles, propertyName, treeElement),
        new CustomFunctionRenderer(stylesPane, matchedStyles, computedStyles, propertyName, treeElement),
        new AutoBaseRenderer(computedStyles),
        new BinOpRenderer(),
        new RelativeColorChannelRenderer(treeElement),
        new AttributeRenderer(stylesPane, treeElement, matchedStyles, computedStyles),
    ];
}
export class StylePropertyTreeElement extends UI.TreeOutline.TreeElement {
    style;
    #matchedStyles;
    property;
    #inherited;
    #overloaded;
    #parentPane;
    #parentSection;
    isShorthand;
    applyStyleThrottler = new Common.Throttler.Throttler(0);
    newProperty;
    expandedDueToFilter = false;
    valueElement = null;
    nameElement = null;
    expandElement = null;
    originalPropertyText = '';
    hasBeenEditedIncrementally = false;
    prompt = null;
    lastComputedValue = null;
    computedStyles = null;
    parentsComputedStyles = null;
    contextForTest;
    #gridNames = undefined;
    #tooltipKeyCounts = new Map();
    constructor({ stylesPane, section, matchedStyles, property, isShorthand, inherited, overloaded, newProperty }) {
        // Pass an empty title, the title gets made later in onattach.
        const jslogContext = property.name.startsWith('--') ? 'custom-property' : property.name;
        super('', isShorthand, jslogContext);
        this.style = property.ownerStyle;
        this.#matchedStyles = matchedStyles;
        this.property = property;
        this.#inherited = inherited;
        this.#overloaded = overloaded;
        this.selectable = false;
        this.#parentPane = stylesPane;
        this.#parentSection = section;
        this.isShorthand = isShorthand;
        this.newProperty = newProperty;
        if (this.newProperty) {
            this.listItemElement.textContent = '';
        }
        this.property.addEventListener("localValueUpdated" /* SDK.CSSProperty.Events.LOCAL_VALUE_UPDATED */, () => {
            this.updateTitle();
        });
    }
    async gridNames() {
        if (!SDK.CSSMetadata.cssMetadata().isGridNameAwareProperty(this.name)) {
            return new Set();
        }
        for (let node = this.#parentPane.node()?.parentNode; node; node = node?.parentNode) {
            const style = await this.#parentPane.cssModel()?.getComputedStyle(node.id);
            const display = style?.get('display');
            const isGrid = display === 'grid' || display === 'inline-grid';
            if (!isGrid) {
                continue;
            }
            const getNames = (propertyName, predicate) => {
                const propertyValue = style?.get(propertyName);
                if (!propertyValue) {
                    return [];
                }
                const ast = SDK.CSSPropertyParser.tokenizeDeclaration(propertyName, propertyValue);
                if (!ast) {
                    return [];
                }
                return SDK.CSSPropertyParser.TreeSearch.findAll(ast, predicate).map(node => ast.text(node));
            };
            if (SDK.CSSMetadata.cssMetadata().isGridAreaNameAwareProperty(this.name)) {
                return new Set(getNames('grid-template-areas', node => node.name === 'StringLiteral')
                    ?.flatMap(row => row.substring(1, row.length - 1).split(/\s+/).filter(cell => !cell.match(/^\.*$/))));
            }
            if (SDK.CSSMetadata.cssMetadata().isGridColumnNameAwareProperty(this.name)) {
                return new Set(getNames('grid-template-columns', node => node.name === 'ValueName' && node.parent?.name === 'BracketedValue'));
            }
            return new Set(getNames('grid-template-rows', node => node.name === 'ValueName' && node.parent?.name === 'BracketedValue'));
        }
        return new Set();
    }
    matchedStyles() {
        return this.#matchedStyles;
    }
    getLonghand() {
        return this.parent instanceof StylePropertyTreeElement && this.parent.isShorthand ? this.parent : null;
    }
    editable() {
        const hasSourceData = Boolean(this.style.styleSheetId && this.style.range);
        return !this.getLonghand() && hasSourceData;
    }
    inherited() {
        return this.#inherited;
    }
    overloaded() {
        return this.#overloaded;
    }
    setOverloaded(x) {
        if (x === this.#overloaded) {
            return;
        }
        this.#overloaded = x;
        this.updateState();
    }
    setComputedStyles(computedStyles) {
        this.computedStyles = computedStyles;
    }
    getComputedStyle(property) {
        return this.computedStyles?.get(property) ?? null;
    }
    getComputedStyles() {
        return this.computedStyles;
    }
    setParentsComputedStyles(parentsComputedStyles) {
        this.parentsComputedStyles = parentsComputedStyles;
    }
    get name() {
        return this.property.name;
    }
    get value() {
        return this.property.value;
    }
    updateFilter() {
        const regex = this.#parentPane.filterRegex();
        const matches = regex !== null && (regex.test(this.property.name) || regex.test(this.property.value));
        this.listItemElement.classList.toggle('filter-match', matches);
        void this.onpopulate();
        let hasMatchingChildren = false;
        for (let i = 0; i < this.childCount(); ++i) {
            const child = this.childAt(i);
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
        }
        else if (hasMatchingChildren && !this.expanded) {
            this.expand();
            this.expandedDueToFilter = true;
        }
        else if (!hasMatchingChildren && this.expanded && this.expandedDueToFilter) {
            this.collapse();
            this.expandedDueToFilter = false;
        }
        return matches;
    }
    renderedPropertyText() {
        if (!this.nameElement || !this.valueElement) {
            return '';
        }
        return this.nameElement.innerText + ': ' + this.valueElement.innerText;
    }
    updateState() {
        if (!this.listItemElement) {
            return;
        }
        if (this.style.isPropertyImplicit(this.name)) {
            this.listItemElement.classList.add('implicit');
        }
        else {
            this.listItemElement.classList.remove('implicit');
        }
        const hasIgnorableError = !this.property.parsedOk && StylesSidebarPane.ignoreErrorsForProperty(this.property);
        if (hasIgnorableError) {
            this.listItemElement.classList.add('has-ignorable-error');
        }
        else {
            this.listItemElement.classList.remove('has-ignorable-error');
        }
        if (this.inherited()) {
            this.listItemElement.classList.add('inherited');
        }
        else {
            this.listItemElement.classList.remove('inherited');
        }
        if (this.overloaded()) {
            this.listItemElement.classList.add('overloaded');
        }
        else {
            this.listItemElement.classList.remove('overloaded');
        }
        if (this.property.disabled) {
            this.listItemElement.classList.add('disabled');
        }
        else {
            this.listItemElement.classList.remove('disabled');
        }
    }
    node() {
        return this.#parentPane.node();
    }
    parentPane() {
        return this.#parentPane;
    }
    section() {
        return this.#parentSection;
    }
    updatePane() {
        this.#parentSection.refreshUpdate(this);
    }
    async toggleDisabled(disabled) {
        const oldStyleRange = this.style.range;
        if (!oldStyleRange) {
            return;
        }
        this.#parentPane.setUserOperation(true);
        const success = await this.property.setDisabled(disabled);
        this.#parentPane.setUserOperation(false);
        if (!success) {
            return;
        }
        this.#matchedStyles.resetActiveProperties();
        this.updatePane();
        this.styleTextAppliedForTest();
    }
    async #getLonghandProperties() {
        const staticLonghandProperties = this.property.getLonghandProperties();
        if (staticLonghandProperties.some(property => property.value !== '')) {
            return staticLonghandProperties;
        }
        const parsedProperty = this.#computeCSSExpression(this.style, this.property.value);
        if (!parsedProperty || parsedProperty === this.property.value) {
            return staticLonghandProperties;
        }
        const parsedLonghands = await this.#parentPane.cssModel()?.agent.invoke_getLonghandProperties({ shorthandName: this.property.name, value: parsedProperty });
        if (!parsedLonghands || parsedLonghands.getError()) {
            return staticLonghandProperties;
        }
        return parsedLonghands.longhandProperties.map(p => SDK.CSSProperty.CSSProperty.parsePayload(this.style, -1, p));
    }
    async onpopulate() {
        if (!this.#gridNames) {
            this.#gridNames = await this.gridNames();
        }
        // Only populate once and if this property is a shorthand.
        if (this.childCount() || !this.isShorthand) {
            return;
        }
        const longhandProperties = await this.#getLonghandProperties();
        const leadingProperties = this.style.leadingProperties();
        // Re-check child count to avoid any races of concurrent onpopulate calls
        if (this.childCount()) {
            return;
        }
        for (const property of longhandProperties) {
            const name = property.name;
            let inherited = false;
            let overloaded = false;
            inherited = this.#parentSection.isPropertyInherited(name);
            overloaded = this.#matchedStyles.propertyState(property) === "Overloaded" /* SDK.CSSMatchedStyles.PropertyState.OVERLOADED */;
            const leadingProperty = leadingProperties.find(property => property.name === name && property.activeInStyle());
            if (leadingProperty) {
                overloaded = true;
            }
            const item = new StylePropertyTreeElement({
                stylesPane: this.#parentPane,
                section: this.#parentSection,
                matchedStyles: this.#matchedStyles,
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
    onattach() {
        this.updateTitle();
        this.listItemElement.addEventListener('mousedown', event => {
            if (event.button === 0) {
                parentMap.set(this.#parentPane, this);
            }
        }, false);
        this.listItemElement.addEventListener('mouseup', this.mouseUp.bind(this));
        this.listItemElement.addEventListener('click', event => {
            if (!event.target) {
                return;
            }
            const node = event.target;
            if (!node.hasSelection() && event.target !== this.listItemElement) {
                event.consume(true);
            }
        });
        // Copy context menu.
        this.listItemElement.addEventListener('contextmenu', this.handleCopyContextMenuEvent.bind(this));
    }
    onexpand() {
        this.updateExpandElement();
    }
    oncollapse() {
        this.updateExpandElement();
    }
    updateExpandElement() {
        if (!this.expandElement) {
            return;
        }
        if (this.expanded) {
            this.expandElement.name = 'triangle-down';
        }
        else {
            this.expandElement.name = 'triangle-right';
        }
    }
    // Resolves a CSS expression to its computed value with `var()` and `attr()` calls updated.
    // Still returns the string even when a `var()` or `attr()` call is not resolved.
    #computeCSSExpression(style, text) {
        const ast = SDK.CSSPropertyParser.tokenizeDeclaration('--unused', text);
        if (!ast) {
            return null;
        }
        const matching = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [
            new SDK.CSSPropertyParserMatchers.VariableMatcher(this.#matchedStyles, style),
            new SDK.CSSPropertyParserMatchers.AttributeMatcher(this.#matchedStyles, style),
            new SDK.CSSPropertyParserMatchers.EnvFunctionMatcher(this.#matchedStyles),
        ]);
        const decl = SDK.CSSPropertyParser.ASTUtils.siblings(SDK.CSSPropertyParser.ASTUtils.declValue(matching.ast.tree));
        return decl.length > 0 ? matching.getComputedTextRange(decl[0], decl[decl.length - 1]) : '';
    }
    refreshIfComputedValueChanged() {
        this.#gridNames = undefined;
        const computedValue = this.#computeCSSExpression(this.property.ownerStyle, this.property.value);
        if (computedValue === this.lastComputedValue) {
            return;
        }
        this.lastComputedValue = computedValue;
        this.#updateTitle();
    }
    updateTitle() {
        this.lastComputedValue = this.#computeCSSExpression(this.property.ownerStyle, this.property.value);
        this.#updateTitle();
    }
    #updateTitle() {
        this.#tooltipKeyCounts.clear();
        this.updateState();
        if (this.isExpandable()) {
            this.expandElement = createIcon('triangle-right', 'expand-icon');
            this.expandElement.setAttribute('jslog', `${VisualLogging.expand().track({ click: true })}`);
        }
        const renderers = this.property.parsedOk ?
            getPropertyRenderers(this.name, this.style, this.#parentPane, this.#matchedStyles, this, this.getComputedStyles() ?? new Map()) :
            [];
        if (Root.Runtime.experiments.isEnabled('font-editor') && this.property.parsedOk) {
            renderers.push(new FontRenderer(this));
        }
        this.listItemElement.removeChildren();
        const matchedResult = this.property.parseValue(this.matchedStyles(), this.computedStyles);
        this.valueElement = Renderer.renderValueElement(this.property, matchedResult, renderers).valueElement;
        this.nameElement = Renderer.renderNameElement(this.name);
        if (!this.treeOutline) {
            return;
        }
        const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
        UI.UIUtils.createTextChild(this.listItemElement.createChild('span', 'styles-clipboard-only'), indent.repeat(this.section().nestingLevel + 1) + (this.property.disabled ? '/* ' : ''));
        this.listItemElement.appendChild(this.nameElement);
        if (this.property.name.startsWith('--') &&
            !(this.property.ownerStyle.parentRule instanceof SDK.CSSRule.CSSFunctionRule)) {
            const contents = this.#parentPane.getVariablePopoverContents(this.matchedStyles(), this.property.name, this.#matchedStyles.computeCSSVariable(this.style, this.property.name)?.value ?? null);
            const tooltipId = this.getTooltipId('custom-property-decl');
            this.nameElement.setAttribute('aria-details', tooltipId);
            const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: this.nameElement, variant: 'rich', id: tooltipId, jslogContext: 'elements.css-var' });
            tooltip.appendChild(contents);
            tooltip.onbeforetoggle = (e) => {
                if (e.newState === 'open') {
                    contents.value = this.#matchedStyles.computeCSSVariable(this.style, this.property.name)?.value;
                }
            };
            this.listItemElement.appendChild(tooltip);
        }
        else if (Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
            const tooltipId = this.getTooltipId('property-doc');
            this.nameElement.setAttribute('aria-details', tooltipId);
            const tooltip = new Tooltips.Tooltip.Tooltip({
                anchor: this.nameElement,
                variant: 'rich',
                padding: 'large',
                id: tooltipId,
                jslogContext: 'elements.css-property-doc',
            });
            tooltip.onbeforetoggle = event => {
                if (event.newState !== 'open') {
                    return;
                }
                if (!Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
                    event.consume(true);
                    return;
                }
                const cssProperty = this.#parentPane.webCustomData?.findCssProperty(this.name);
                if (!cssProperty) {
                    event.consume(true);
                    return;
                }
                tooltip.removeChildren();
                tooltip.appendChild(new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty));
            };
            this.listItemElement.appendChild(tooltip);
        }
        if (this.valueElement) {
            const lineBreakValue = this.valueElement.firstElementChild?.tagName === 'BR';
            const separator = lineBreakValue ? ':' : ': ';
            this.listItemElement.createChild('span', 'styles-name-value-separator').textContent = separator;
            if (this.expandElement) {
                this.listItemElement.appendChild(this.expandElement);
                this.updateExpandElement();
            }
            this.listItemElement.appendChild(this.valueElement);
            const semicolon = this.listItemElement.createChild('span', 'styles-semicolon');
            semicolon.textContent = ';';
            semicolon.onmouseup = this.mouseUp.bind(this);
            if (this.property.disabled) {
                UI.UIUtils.createTextChild(this.listItemElement.createChild('span', 'styles-clipboard-only'), ' */');
            }
        }
        if (this.property.parsedOk) {
            this.updateAuthoringHint();
        }
        else {
            // Avoid having longhands under an invalid shorthand.
            this.listItemElement.classList.add('not-parsed-ok');
            // Add a separate exclamation mark IMG element with a tooltip.
            this.listItemElement.insertBefore(this.createExclamationMark(this.property, this.#parentPane.getVariableParserError(this.matchedStyles(), this.property.name)), this.listItemElement.firstChild);
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
        if (this.property.parsedOk && this.parent?.root) {
            const enabledCheckboxElement = document.createElement('input');
            enabledCheckboxElement.classList.add('enabled-button', 'small');
            enabledCheckboxElement.type = 'checkbox';
            enabledCheckboxElement.checked = !this.property.disabled;
            enabledCheckboxElement.setAttribute('jslog', `${VisualLogging.toggle().track({ click: true })}`);
            enabledCheckboxElement.addEventListener('mousedown', event => event.consume(), false);
            enabledCheckboxElement.addEventListener('click', event => {
                void this.toggleDisabled(!this.property.disabled);
                event.consume();
            }, false);
            if (this.nameElement && this.valueElement) {
                UI.ARIAUtils.setLabel(enabledCheckboxElement, `${this.name} ${this.value}`);
            }
            this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
        }
        const that = this;
        this.valueElement.addEventListener('keydown', nonEditingNameValueKeyDown);
        this.nameElement.addEventListener('keydown', nonEditingNameValueKeyDown);
        function nonEditingNameValueKeyDown(event) {
            if (UI.UIUtils.isBeingEdited(this)) {
                return;
            }
            if (event.key !== Platform.KeyboardUtilities.ENTER_KEY && event.key !== ' ') {
                return;
            }
            if (this === that.valueElement) {
                that.startEditingValue();
                event.consume(true);
            }
            else if (this === that.nameElement) {
                that.startEditingName();
                event.consume(true);
            }
        }
    }
    createExclamationMark(property, title) {
        const container = document.createElement('span');
        const exclamationElement = container.createChild('span');
        exclamationElement.tabIndex = -1;
        exclamationElement.classList.add('exclamation-mark');
        const invalidMessage = SDK.CSSMetadata.cssMetadata().isCSSPropertyName(property.name) ?
            i18nString(UIStrings.invalidPropertyValue) :
            i18nString(UIStrings.unknownPropertyName);
        if (title === null) {
            UI.Tooltip.Tooltip.install(exclamationElement, invalidMessage);
        }
        else {
            const tooltipId = this.getTooltipId('property-warning');
            exclamationElement.setAttribute('aria-describedby', tooltipId);
            const tooltip = new Tooltips.Tooltip.Tooltip({
                anchor: exclamationElement,
                variant: 'simple',
                id: tooltipId,
                jslogContext: 'elements.invalid-property-decl-popover'
            });
            tooltip.appendChild(title);
            container.appendChild(tooltip);
        }
        const invalidString = i18nString(UIStrings.invalidString, { PH1: invalidMessage, PH2: property.name, PH3: property.value });
        // Storing the invalidString for future screen reader support when editing the property
        property.setDisplayedStringForInvalidProperty(invalidString);
        return container;
    }
    #getLinkableFunction(functionName, matchedStyles) {
        const swatch = new InlineEditor.LinkSwatch.LinkSwatch();
        const registeredFunction = matchedStyles.getRegisteredFunction(functionName);
        const isDefined = Boolean(registeredFunction);
        swatch.data = {
            jslogContext: 'css-function',
            text: functionName,
            tooltip: isDefined ? undefined : { title: i18nString(UIStrings.sIsNotDefined, { PH1: functionName }) },
            isDefined,
            onLinkActivate: () => {
                if (!registeredFunction) {
                    return;
                }
                this.#parentPane.jumpToFunctionDefinition(registeredFunction);
            },
        };
        return swatch;
    }
    getTracingTooltip(functionName, node, matchedStyles, computedStyles, context) {
        if (context.tracing || !context.property) {
            return html `${functionName}`;
        }
        const text = context.ast.text(node);
        const expandPercentagesInShorthands = context.matchedResult.getLonghandValuesCount() > 1;
        const shorthandPositionOffset = context.matchedResult.getComputedLonghandName(node);
        const { property } = context;
        const stylesPane = this.parentPane();
        const tooltipId = this.getTooltipId(`${functionName}-trace`);
        // clang-format off
        return html `
        <span tabIndex=-1 class=tracing-anchor aria-details=${tooltipId}>${functionName.startsWith('--') ? this.#getLinkableFunction(functionName, matchedStyles) : functionName}</span>
        <devtools-tooltip
            id=${tooltipId}
            use-hotkey
            variant=rich
            jslogContext=elements.css-value-trace
            @beforetoggle=${function (e) {
            if (e.newState === 'open') {
                void this.querySelector('devtools-widget')
                    ?.getWidget()
                    ?.showTrace(property, text, matchedStyles, computedStyles, getPropertyRenderers(property.name, property.ownerStyle, stylesPane, matchedStyles, null, computedStyles), expandPercentagesInShorthands, shorthandPositionOffset, this.openedViaHotkey);
            }
        }}
            @toggle=${function (e) {
            if (e.newState !== 'open') {
                this.querySelector('devtools-widget')
                    ?.getWidget()
                    ?.resetPendingFocus();
            }
        }}>
          <devtools-widget
            @keydown=${(e) => {
            const maybeTooltip = e.target.parentElement;
            if (!(maybeTooltip instanceof Tooltips.Tooltip.Tooltip)) {
                return;
            }
            if (e.key === 'Escape' || (e.altKey && e.key === 'ArrowDown')) {
                maybeTooltip.hideTooltip();
                maybeTooltip.anchor?.focus();
                e.consume(true);
            }
        }}
            .widgetConfig=${UI.Widget.widgetConfig(CSSValueTraceView)}>
          </devtools-widget>
        </devtools-tooltip>`;
        // clang-format on
    }
    // Returns an id for <devtools-tooltips> that's stable across re-rendering of property values but unique across
    // sections and across switches between different nodes.
    getTooltipId(key) {
        const sectionId = this.section().sectionTooltipIdPrefix;
        const tooltipKeyCount = this.#tooltipKeyCounts.get(key) ?? 0;
        this.#tooltipKeyCounts.set(key, tooltipKeyCount + 1);
        const propertyNameForCounting = this.getLonghand()?.name ?? this.name;
        const ownIndex = this.style.allProperties().indexOf(this.property);
        const propertyCount = this.style.allProperties().reduce((value, property, index) => index < ownIndex && (property.name === this.name || property.name === propertyNameForCounting) ? value + 1 :
            value, 0);
        return `swatch-tooltip-${sectionId}-${this.name}-${propertyCount}-${key}-${tooltipKeyCount}`;
    }
    updateAuthoringHint() {
        this.listItemElement.classList.remove('inactive-property');
        const existingElement = this.listItemElement.querySelector('.hint');
        if (existingElement) {
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
        const cssModel = this.#parentPane.cssModel();
        const fontFaces = cssModel?.fontFaces() || [];
        const localName = this.node()?.localName();
        for (const validator of cssRuleValidatorsMap.get(propertyName) || []) {
            const hint = validator.getHint(propertyName, this.computedStyles || undefined, this.parentsComputedStyles || undefined, localName?.toLowerCase(), fontFaces);
            if (hint) {
                const wrapper = document.createElement('span');
                wrapper.classList.add('hint-wrapper');
                const hintIcon = new Icon();
                hintIcon.name = 'info';
                hintIcon.classList.add('hint', 'small');
                hintIcon.tabIndex = -1;
                wrapper.append(hintIcon);
                this.listItemElement.append(wrapper);
                this.listItemElement.classList.add('inactive-property');
                const tooltipId = this.getTooltipId('css-hint');
                hintIcon.setAttribute('aria-details', tooltipId);
                const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: hintIcon, variant: 'rich', padding: 'large', id: tooltipId, jslogContext: 'elements.css-hint' });
                tooltip.appendChild(new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hint));
                this.listItemElement.appendChild(tooltip);
                break;
            }
        }
    }
    mouseUp(event) {
        const activeTreeElement = parentMap.get(this.#parentPane);
        parentMap.delete(this.#parentPane);
        if (!activeTreeElement) {
            return;
        }
        if (this.listItemElement.hasSelection()) {
            return;
        }
        if (UI.UIUtils.isBeingEdited(event.target)) {
            return;
        }
        if (event.composedPath()[0] instanceof HTMLButtonElement) {
            return;
        }
        event.consume(true);
        if (event.target === this.listItemElement) {
            return;
        }
        let selectedElement = event.target;
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
            VisualLogging.logClick(this.nameElement, event);
            this.startEditingName();
        }
        else {
            VisualLogging.logClick(this.valueElement, event);
            this.startEditingValue();
        }
    }
    handleContextMenuEvent(context, event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        if (this.property.parsedOk && this.parent?.root) {
            const sectionIndex = this.#parentPane.focusedSectionIndex();
            contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.togglePropertyAndContinueEditing), async () => {
                if (this.treeOutline) {
                    const propertyIndex = this.treeOutline.rootElement().indexOfChild(this);
                    // order matters here: this.editingCancelled may invalidate this.treeOutline.
                    this.editingCancelled(context);
                    await this.toggleDisabled(!this.property.disabled);
                    event.consume();
                    this.#parentPane.continueEditingElement(sectionIndex, propertyIndex);
                }
            }, { checked: !this.property.disabled, jslogContext: 'toggle-property-and-continue-editing' });
        }
        const revealCallback = this.navigateToSource.bind(this);
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.openInSourcesPanel), revealCallback, { jslogContext: 'reveal-in-sources-panel' });
        void contextMenu.show();
    }
    handleCopyContextMenuEvent(event) {
        const target = event.target;
        if (!target) {
            return;
        }
        const contextMenu = this.createCopyContextMenu(event);
        void contextMenu.show();
    }
    createCopyContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.headerSection().appendItem(i18nString(UIStrings.copyDeclaration), () => {
            const propertyText = `${this.property.name}: ${this.property.value};`;
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyText);
        }, { jslogContext: 'copy-declaration' });
        contextMenu.headerSection().appendItem(i18nString(UIStrings.copyProperty), () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.name);
        }, { jslogContext: 'copy-property' });
        contextMenu.headerSection().appendItem(i18nString(UIStrings.copyValue), () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.value);
        }, { jslogContext: 'copy-value' });
        contextMenu.headerSection().appendItem(i18nString(UIStrings.copyRule), () => {
            const ruleText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).ruleText;
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
        }, { jslogContext: 'copy-rule' });
        contextMenu.headerSection().appendItem(i18nString(UIStrings.copyCssDeclarationAsJs), this.copyCssDeclarationAsJs.bind(this), { jslogContext: 'copy-css-declaration-as-js' });
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllDeclarations), () => {
            const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).allDeclarationText;
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
        }, { jslogContext: 'copy-all-declarations' });
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllCssDeclarationsAsJs), this.copyAllCssDeclarationAsJs.bind(this), { jslogContext: 'copy-all-css-declarations-as-js' });
        contextMenu.footerSection().appendItem(i18nString(UIStrings.viewComputedValue), () => {
            void this.viewComputedValue();
        }, { jslogContext: 'view-computed-value' });
        return contextMenu;
    }
    async viewComputedValue() {
        const computedStyleWidget = ElementsPanel.instance().getComputedStyleWidget();
        if (!computedStyleWidget.isShowing()) {
            await UI.ViewManager.ViewManager.instance().showView('computed');
        }
        let propertyNamePattern = '';
        if (this.isShorthand) {
            propertyNamePattern = '^' + this.property.name + '-';
        }
        else {
            propertyNamePattern = '^' + this.property.name + '$';
        }
        const regex = new RegExp(propertyNamePattern, 'i');
        await computedStyleWidget.filterComputedStyles(regex);
        computedStyleWidget.input.setValue(this.property.name);
        computedStyleWidget.input.element.focus();
    }
    copyCssDeclarationAsJs() {
        const cssDeclarationValue = getCssDeclarationAsJavascriptProperty(this.property);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationValue);
    }
    copyAllCssDeclarationAsJs() {
        const leadingProperties = this.#parentSection.style().leadingProperties();
        const cssDeclarationsAsJsProperties = leadingProperties.filter(property => !property.disabled).map(getCssDeclarationAsJavascriptProperty);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationsAsJsProperties.join(',\n'));
    }
    navigateToSource(element, omitFocus) {
        if (!this.#parentSection.navigable) {
            return;
        }
        const propertyNameClicked = element === this.nameElement;
        const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(this.property, propertyNameClicked);
        if (uiLocation) {
            void Common.Revealer.reveal(uiLocation, omitFocus);
        }
    }
    startEditingValue() {
        const context = {
            expanded: this.expanded,
            hasChildren: this.isExpandable(),
            isEditingName: false,
            originalProperty: this.property,
            previousContent: this.value,
        };
        // Grid definitions are often multiline. Instead of showing the authored text reformat it a little bit nicer.
        if (SDK.CSSMetadata.cssMetadata().isGridAreaDefiningProperty(this.name)) {
            const splitResult = TextUtils.TextUtils.Utils.splitStringByRegexes(this.value, [SDK.CSSMetadata.GridAreaRowRegex]);
            context.previousContent = splitResult.map(result => result.value.trim()).join('\n');
        }
        this.#startEditing(context);
    }
    startEditingName() {
        const context = {
            expanded: this.expanded,
            hasChildren: this.isExpandable(),
            isEditingName: true,
            originalProperty: this.property,
            previousContent: this.name.split('\n').map(l => l.trim()).join('\n'),
        };
        this.#startEditing(context);
    }
    #startEditing(context) {
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
        selectedElement.textContent = context.previousContent; // remove color swatch and the like
        function pasteHandler(context, event) {
            const clipboardEvent = event;
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
            const target = event.target;
            void this.editingCommitted(target.textContent || '', context, 'forward');
        }
        function blurListener(context, event) {
            const target = event.target;
            let text = target.textContent;
            if (!context.isEditingName) {
                text = this.value || text;
            }
            void this.editingCommitted(text || '', context, '');
        }
        this.originalPropertyText = this.property.propertyText || '';
        this.#parentPane.setEditingStyle(true);
        selectedElement.parentElement?.scrollIntoViewIfNeeded(false);
        this.prompt = new CSSPropertyPrompt(this, context.isEditingName, Array.from(this.#gridNames ?? []));
        this.prompt.setAutocompletionTimeout(0);
        this.prompt.addEventListener("TextChanged" /* UI.TextPrompt.Events.TEXT_CHANGED */, () => {
            void this.applyFreeFlowStyleTextEdit(context);
        });
        const invalidString = this.property.getInvalidStringForInvalidProperty();
        if (invalidString) {
            UI.ARIAUtils.LiveAnnouncer.alert(invalidString);
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
    editingNameValueKeyDown(context, event) {
        if (event.handled) {
            return;
        }
        const keyboardEvent = event;
        const target = keyboardEvent.target;
        let result;
        if ((keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) ||
            (context.isEditingName && keyboardEvent.key === ' ')) {
            result = 'forward';
        }
        else if (keyboardEvent.keyCode === UI.KeyboardShortcut.Keys.Esc.code ||
            keyboardEvent.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
            result = 'cancel';
        }
        else if (!context.isEditingName && this.newProperty &&
            keyboardEvent.keyCode === UI.KeyboardShortcut.Keys.Backspace.code) {
            // For a new property, when Backspace is pressed at the beginning of new property value, move back to the property name.
            const selection = target.getComponentSelection();
            if (selection && selection.isCollapsed && !selection.focusOffset) {
                event.preventDefault();
                result = 'backward';
            }
        }
        else if (keyboardEvent.key === 'Tab') {
            result = keyboardEvent.shiftKey ? 'backward' : 'forward';
            event.preventDefault();
        }
        if (result) {
            switch (result) {
                case 'cancel':
                    this.editingCancelled(context);
                    if (context.isEditingName) {
                        this.nameElement?.focus();
                    }
                    else {
                        this.valueElement?.focus();
                    }
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
    static shouldCommitValueSemicolon(text, cursorPosition) {
        // FIXME: should this account for semicolons inside comments?
        let openQuote = '';
        const openParens = [];
        for (let i = 0; i < cursorPosition; ++i) {
            const ch = text[i];
            if (ch === '\\' && openQuote !== '') {
                ++i;
            } // skip next character inside string
            else if (!openQuote && (ch === '"' || ch === '\'')) {
                openQuote = ch;
            }
            else if (ch === '[') {
                openParens.push(']');
            }
            else if (ch === '{') {
                openParens.push('}');
            }
            else if (ch === '(') {
                openParens.push(')');
            }
            else if (openQuote === ch) {
                openQuote = '';
            }
            else if (openParens.at(-1) === ch && !openQuote) {
                openParens.pop();
            }
        }
        return !openQuote && openParens.length === 0;
    }
    editingNameValueKeyPress(context, event) {
        const keyboardEvent = event;
        const target = keyboardEvent.target;
        const keyChar = String.fromCharCode(keyboardEvent.charCode);
        const selectionLeftOffset = this.#selectionLeftOffset(target);
        const isFieldInputTerminated = (context.isEditingName ? keyChar === ':' :
            keyChar === ';' && selectionLeftOffset !== null &&
                StylePropertyTreeElement.shouldCommitValueSemicolon(target.textContent || '', selectionLeftOffset));
        if (isFieldInputTerminated) {
            // Enter or colon (for name)/semicolon outside of string (for value).
            event.consume(true);
            void this.editingCommitted(target.textContent || '', context, 'forward');
            return;
        }
    }
    /** @returns Selection offset relative to `element` */
    #selectionLeftOffset(element) {
        const selection = element.getComponentSelection();
        if (!selection?.containsNode(element, true)) {
            return null;
        }
        let leftOffset = selection.anchorOffset;
        let node = selection.anchorNode;
        while (node !== element) {
            while (node?.previousSibling) {
                node = node.previousSibling;
                leftOffset += node.textContent?.length ?? 0;
            }
            node = node?.parentNodeOrShadowHost() ?? null;
        }
        return leftOffset;
    }
    async applyFreeFlowStyleTextEdit(context) {
        if (!this.prompt || !this.#parentPane.node()) {
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
        const parentNode = this.#parentPane.node();
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
            }
            else if (this.hasBeenEditedIncrementally) {
                await this.applyOriginalStyle(context);
            }
        }
        else if (this.nameElement) {
            await this.applyStyleText(`${this.nameElement.textContent}: ${valueText}`, false);
        }
    }
    kickFreeFlowStyleEditForTest() {
        const context = this.contextForTest;
        return this.applyFreeFlowStyleTextEdit(context);
    }
    editingEnded(context) {
        this.setExpandable(context.hasChildren);
        if (context.expanded) {
            this.expand();
        }
        const editedElement = context.isEditingName ? this.nameElement : this.valueElement;
        // The proxyElement has been deleted, no need to remove listener.
        if (editedElement?.parentElement) {
            editedElement.parentElement.classList.remove('child-editing');
        }
        this.#parentPane.setEditingStyle(false);
    }
    editingCancelled(context) {
        this.removePrompt();
        if (this.hasBeenEditedIncrementally) {
            void this.applyOriginalStyle(context);
        }
        else if (this.newProperty && this.treeOutline) {
            this.treeOutline.removeChild(this);
        }
        this.updateTitle();
        // This should happen last, as it clears the info necessary to restore the property value after [Page]Up/Down changes.
        this.editingEnded(context);
    }
    async applyOriginalStyle(context) {
        await this.applyStyleText(this.originalPropertyText, false, context.originalProperty);
    }
    findSibling(moveDirection) {
        let target = this;
        do {
            const sibling = moveDirection === 'forward' ? target.nextSibling : target.previousSibling;
            target = sibling instanceof StylePropertyTreeElement ? sibling : null;
        } while (target?.inherited());
        return target;
    }
    async editingCommitted(userInput, context, moveDirection) {
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
        const isPropertySplitPaste = isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
        let moveTo = this;
        const moveToOther = (isEditingName !== (moveDirection === 'forward'));
        const abandonNewProperty = this.newProperty && !userInput && (moveToOther || isEditingName);
        if (moveDirection === 'forward' && (!isEditingName || isPropertySplitPaste) ||
            moveDirection === 'backward' && isEditingName) {
            moveTo = moveTo.findSibling(moveDirection);
            if (!moveTo) {
                if (moveDirection === 'forward' && (!this.newProperty || userInput)) {
                    createNewProperty = true;
                }
                else if (moveDirection === 'backward') {
                    moveToSelector = true;
                }
            }
        }
        // Make the Changes and trigger the moveToNextCallback after updating.
        let moveToIndex = -1;
        if (moveTo !== null && this.treeOutline) {
            moveToIndex = this.treeOutline.rootElement().indexOfChild(moveTo);
        }
        const blankInput = Platform.StringUtilities.isWhitespace(userInput);
        const shouldCommitNewProperty = this.newProperty &&
            (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput) ||
                nameValueEntered);
        if (((userInput !== context.previousContent || isDirtyViaPaste) && !this.newProperty) || shouldCommitNewProperty) {
            let propertyText;
            if (nameValueEntered) {
                propertyText = this.nameElement.textContent;
            }
            else if (blankInput ||
                (this.newProperty && Platform.StringUtilities.isWhitespace(this.valueElement.textContent || ''))) {
                propertyText = '';
            }
            else if (isEditingName) {
                propertyText = userInput + ': ' + this.property.value;
            }
            else {
                propertyText = this.property.name + ': ' + userInput;
            }
            await this.applyStyleText(propertyText || '', true);
            moveToNextCallback.call(this, this.newProperty, !blankInput, this.#parentSection);
        }
        else {
            if (isEditingName) {
                this.property.name = userInput;
            }
            else {
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
        function moveToNextCallback(alreadyNew, valueChanged, section) {
            if (!moveDirection) {
                this.#parentPane.resetFocus();
                return;
            }
            // User just tabbed through without changes.
            if (moveTo && moveTo.parent) {
                if (isEditingName) {
                    moveTo.startEditingValue();
                }
                else {
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
                }
                else {
                    const treeElement = (moveToIndex >= 0 ? rootElement.childAt(moveToIndex) : null);
                    if (treeElement) {
                        if (alreadyNew && blankInput) {
                            if (moveDirection === 'forward') {
                                treeElement.startEditingName();
                            }
                            else {
                                treeElement.startEditingValue();
                            }
                        }
                        else if (!isEditingName || isPropertySplitPaste) {
                            treeElement.startEditingName();
                        }
                        else {
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
                    }
                    else {
                        sectionToEdit.moveEditorFromSelector(moveDirection);
                    }
                }
                return;
            }
            if (moveToSelector) {
                if (section.style().parentRule) {
                    section.startEditingSelector();
                }
                else {
                    section.moveEditorFromSelector(moveDirection);
                }
            }
        }
    }
    removePrompt() {
        // BUG 53242. This cannot go into editingEnded(), as it should always happen first for any editing outcome.
        if (this.prompt) {
            this.prompt.detach();
            this.prompt = null;
        }
    }
    styleTextAppliedForTest() {
    }
    applyStyleText(styleText, majorChange, property) {
        return this.applyStyleThrottler.schedule(this.innerApplyStyleText.bind(this, styleText, majorChange, property));
    }
    async innerApplyStyleText(styleText, majorChange, property) {
        // this.property might have been nulled at the end of the last innerApplyStyleText.
        if (!this.treeOutline || !this.property) {
            return;
        }
        const oldStyleRange = this.style.range;
        if (!oldStyleRange) {
            return;
        }
        const hasBeenEditedIncrementally = this.hasBeenEditedIncrementally;
        styleText = styleText.replace(/[\xA0\t]/g, ' ').trim(); // Replace &nbsp; with whitespace.
        if (!styleText.length && majorChange && this.newProperty && !hasBeenEditedIncrementally) {
            // The user deleted everything and never applied a new property value via Up/Down scrolling/live editing, so remove the tree element and update.
            this.parent?.removeChild(this);
            return;
        }
        const currentNode = this.#parentPane.node();
        this.#parentPane.setUserOperation(true);
        styleText += Platform.StringUtilities.findUnclosedCssQuote(styleText);
        styleText += ')'.repeat(Platform.StringUtilities.countUnmatchedLeftParentheses(styleText));
        // Append a ";" if the new text does not end in ";".
        // FIXME: this does not handle trailing comments.
        if (styleText.length && !/;\s*$/.test(styleText)) {
            styleText += ';';
        }
        const overwriteProperty = !this.newProperty || hasBeenEditedIncrementally;
        let success = await this.property.setText(styleText, majorChange, overwriteProperty);
        if (success && majorChange) {
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        }
        // Revert to the original text if applying the new text failed
        if (hasBeenEditedIncrementally && majorChange && !success) {
            majorChange = false;
            success = await this.property.setText(this.originalPropertyText, majorChange, overwriteProperty);
        }
        this.#parentPane.setUserOperation(false);
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
                }
                else {
                    this.updateTitle();
                }
            }
            this.styleTextAppliedForTest();
            return;
        }
        this.#matchedStyles.resetActiveProperties();
        this.hasBeenEditedIncrementally = true;
        // null check for updatedProperty before setting this.property as the code never expects this.property to be undefined or null.
        // This occurs when deleting the last index of a StylePropertiesSection as this.style._allProperties array gets updated
        // before we index it when setting the value for updatedProperty
        const deleteProperty = majorChange && !styleText.length;
        if (deleteProperty) {
            this.#parentSection.resetToolbars();
        }
        else if (!deleteProperty && updatedProperty) {
            this.property = updatedProperty;
        }
        if (currentNode === this.node()) {
            this.updatePane();
        }
        this.styleTextAppliedForTest();
    }
    ondblclick() {
        return true; // handled
    }
    isEventWithinDisclosureTriangle(event) {
        return event.target === this.expandElement;
    }
}
//# sourceMappingURL=StylePropertyTreeElement.js.map