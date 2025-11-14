// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Platform from '../platform/platform.js';
import { CSSContainerQuery } from './CSSContainerQuery.js';
import { CSSLayer } from './CSSLayer.js';
import { CSSMedia } from './CSSMedia.js';
import { CSSScope } from './CSSScope.js';
import { CSSStartingStyle } from './CSSStartingStyle.js';
import { CSSStyleDeclaration, Type } from './CSSStyleDeclaration.js';
import { CSSSupports } from './CSSSupports.js';
function styleSheetHeaderForRule(cssModel, { styleSheetId }) {
    return styleSheetId && cssModel.styleSheetHeaderForId(styleSheetId) || null;
}
export class CSSRule {
    cssModelInternal;
    origin;
    style;
    header;
    treeScope;
    constructor(cssModel, payload) {
        this.header = payload.header;
        this.cssModelInternal = cssModel;
        this.origin = payload.origin;
        this.treeScope = payload.originTreeScopeNodeId;
        this.style = new CSSStyleDeclaration(this.cssModelInternal, this, payload.style, Type.Regular);
    }
    get sourceURL() {
        return this.header?.sourceURL;
    }
    rebase(edit) {
        if (this.header?.id !== edit.styleSheetId) {
            return;
        }
        this.style.rebase(edit);
    }
    resourceURL() {
        return this.header?.resourceURL() ?? Platform.DevToolsPath.EmptyUrlString;
    }
    isUserAgent() {
        return this.origin === "user-agent" /* Protocol.CSS.StyleSheetOrigin.UserAgent */;
    }
    isInjected() {
        return this.origin === "injected" /* Protocol.CSS.StyleSheetOrigin.Injected */;
    }
    isViaInspector() {
        return this.origin === "inspector" /* Protocol.CSS.StyleSheetOrigin.Inspector */;
    }
    isRegular() {
        return this.origin === "regular" /* Protocol.CSS.StyleSheetOrigin.Regular */;
    }
    isKeyframeRule() {
        return false;
    }
    cssModel() {
        return this.cssModelInternal;
    }
}
class CSSValue {
    text;
    range;
    specificity;
    constructor(payload) {
        this.text = payload.text;
        if (payload.range) {
            this.range = TextUtils.TextRange.TextRange.fromObject(payload.range);
        }
        if (payload.specificity) {
            this.specificity = payload.specificity;
        }
    }
    rebase(edit) {
        if (!this.range) {
            return;
        }
        this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
}
export class CSSStyleRule extends CSSRule {
    selectors;
    nestingSelectors;
    media;
    containerQueries;
    supports;
    scopes;
    layers;
    ruleTypes;
    startingStyles;
    wasUsed;
    constructor(cssModel, payload, wasUsed) {
        super(cssModel, {
            origin: payload.origin,
            style: payload.style,
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: payload.originTreeScopeNodeId
        });
        this.reinitializeSelectors(payload.selectorList);
        this.nestingSelectors = payload.nestingSelectors;
        this.media = payload.media ? CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
        this.containerQueries = payload.containerQueries ?
            CSSContainerQuery.parseContainerQueriesPayload(cssModel, payload.containerQueries) :
            [];
        this.scopes = payload.scopes ? CSSScope.parseScopesPayload(cssModel, payload.scopes) : [];
        this.supports = payload.supports ? CSSSupports.parseSupportsPayload(cssModel, payload.supports) : [];
        this.layers = payload.layers ? CSSLayer.parseLayerPayload(cssModel, payload.layers) : [];
        this.startingStyles =
            payload.startingStyles ? CSSStartingStyle.parseStartingStylePayload(cssModel, payload.startingStyles) : [];
        this.ruleTypes = payload.ruleTypes || [];
        this.wasUsed = wasUsed || false;
    }
    static createDummyRule(cssModel, selectorText) {
        const dummyPayload = {
            selectorList: {
                text: '',
                selectors: [{ text: selectorText, value: undefined }],
            },
            style: {
                styleSheetId: '0',
                range: new TextUtils.TextRange.TextRange(0, 0, 0, 0),
                shorthandEntries: [],
                cssProperties: [],
            },
            origin: "inspector" /* Protocol.CSS.StyleSheetOrigin.Inspector */,
        };
        return new CSSStyleRule(cssModel, dummyPayload);
    }
    reinitializeSelectors(selectorList) {
        this.selectors = [];
        for (let i = 0; i < selectorList.selectors.length; ++i) {
            this.selectors.push(new CSSValue(selectorList.selectors[i]));
        }
    }
    setSelectorText(newSelector) {
        const styleSheetId = this.header?.id;
        if (!styleSheetId) {
            throw new Error('No rule stylesheet id');
        }
        const range = this.selectorRange();
        if (!range) {
            throw new Error('Rule selector is not editable');
        }
        return this.cssModelInternal.setSelectorText(styleSheetId, range, newSelector);
    }
    selectorText() {
        return this.selectors.map(selector => selector.text).join(', ');
    }
    selectorRange() {
        // Nested group rules might not contain a selector.
        // https://www.w3.org/TR/css-nesting-1/#conditionals
        if (this.selectors.length === 0) {
            return null;
        }
        const firstRange = this.selectors[0].range;
        const lastRange = this.selectors[this.selectors.length - 1].range;
        if (!firstRange || !lastRange) {
            return null;
        }
        return new TextUtils.TextRange.TextRange(firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
    }
    lineNumberInSource(selectorIndex) {
        const selector = this.selectors[selectorIndex];
        if (!selector?.range || !this.header) {
            return 0;
        }
        return this.header.lineNumberInSource(selector.range.startLine);
    }
    columnNumberInSource(selectorIndex) {
        const selector = this.selectors[selectorIndex];
        if (!selector?.range || !this.header) {
            return undefined;
        }
        return this.header.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
    }
    rebase(edit) {
        if (this.header?.id !== edit.styleSheetId) {
            return;
        }
        const range = this.selectorRange();
        if (range?.equal(edit.oldRange)) {
            this.reinitializeSelectors(edit.payload);
        }
        else {
            for (let i = 0; i < this.selectors.length; ++i) {
                this.selectors[i].rebase(edit);
            }
        }
        this.media.forEach(media => media.rebase(edit));
        this.containerQueries.forEach(cq => cq.rebase(edit));
        this.scopes.forEach(scope => scope.rebase(edit));
        this.supports.forEach(supports => supports.rebase(edit));
        super.rebase(edit);
    }
}
export class CSSPropertyRule extends CSSRule {
    #name;
    constructor(cssModel, payload) {
        super(cssModel, {
            origin: payload.origin,
            style: payload.style,
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: undefined,
        });
        this.#name = new CSSValue(payload.propertyName);
    }
    propertyName() {
        return this.#name;
    }
    initialValue() {
        return this.style.hasActiveProperty('initial-value') ? this.style.getPropertyValue('initial-value') : null;
    }
    syntax() {
        return this.style.getPropertyValue('syntax');
    }
    inherits() {
        return this.style.getPropertyValue('inherits') === 'true';
    }
    setPropertyName(newPropertyName) {
        const styleSheetId = this.header?.id;
        if (!styleSheetId) {
            throw new Error('No rule stylesheet id');
        }
        const range = this.#name.range;
        if (!range) {
            throw new Error('Property name is not editable');
        }
        return this.cssModelInternal.setPropertyRulePropertyName(styleSheetId, range, newPropertyName);
    }
}
export class CSSAtRule extends CSSRule {
    #name;
    #type;
    #subsection;
    constructor(cssModel, payload) {
        super(cssModel, {
            origin: payload.origin,
            style: payload.style,
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: undefined
        });
        this.#name = payload.name ? new CSSValue(payload.name) : null;
        this.#type = payload.type;
        this.#subsection = payload.subsection ?? null;
    }
    name() {
        return this.#name;
    }
    type() {
        return this.#type;
    }
    subsection() {
        return this.#subsection;
    }
}
export class CSSKeyframesRule {
    #animationName;
    #keyframes;
    constructor(cssModel, payload) {
        this.#animationName = new CSSValue(payload.animationName);
        this.#keyframes =
            payload.keyframes.map(keyframeRule => new CSSKeyframeRule(cssModel, keyframeRule, this.#animationName.text));
    }
    name() {
        return this.#animationName;
    }
    keyframes() {
        return this.#keyframes;
    }
}
export class CSSKeyframeRule extends CSSRule {
    #keyText;
    #parentRuleName;
    constructor(cssModel, payload, parentRuleName) {
        super(cssModel, {
            origin: payload.origin,
            style: payload.style,
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: undefined
        });
        this.reinitializeKey(payload.keyText);
        this.#parentRuleName = parentRuleName;
    }
    parentRuleName() {
        return this.#parentRuleName;
    }
    key() {
        return this.#keyText;
    }
    reinitializeKey(payload) {
        this.#keyText = new CSSValue(payload);
    }
    rebase(edit) {
        if (this.header?.id !== edit.styleSheetId || !this.#keyText.range) {
            return;
        }
        if (edit.oldRange.equal(this.#keyText.range)) {
            this.reinitializeKey(edit.payload);
        }
        else {
            this.#keyText.rebase(edit);
        }
        super.rebase(edit);
    }
    isKeyframeRule() {
        return true;
    }
    setKeyText(newKeyText) {
        const styleSheetId = this.header?.id;
        if (!styleSheetId) {
            throw new Error('No rule stylesheet id');
        }
        const range = this.#keyText.range;
        if (!range) {
            throw new Error('Keyframe key is not editable');
        }
        return this.cssModelInternal.setKeyframeKey(styleSheetId, range, newKeyText);
    }
}
export class CSSPositionTryRule extends CSSRule {
    #name;
    #active;
    constructor(cssModel, payload) {
        super(cssModel, {
            origin: payload.origin,
            style: payload.style,
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: undefined
        });
        this.#name = new CSSValue(payload.name);
        this.#active = payload.active;
    }
    name() {
        return this.#name;
    }
    active() {
        return this.#active;
    }
}
export class CSSFunctionRule extends CSSRule {
    #name;
    #parameters;
    #children;
    constructor(cssModel, payload) {
        super(cssModel, {
            origin: payload.origin,
            style: { cssProperties: [], shorthandEntries: [] },
            header: styleSheetHeaderForRule(cssModel, payload),
            originTreeScopeNodeId: undefined
        });
        this.#name = new CSSValue(payload.name);
        this.#parameters = payload.parameters.map(({ name }) => name);
        this.#children = this.protocolNodesToNestedStyles(payload.children);
    }
    functionName() {
        return this.#name;
    }
    parameters() {
        return this.#parameters;
    }
    children() {
        return this.#children;
    }
    nameWithParameters() {
        return `${this.functionName().text}(${this.parameters().join(', ')})`;
    }
    protocolNodesToNestedStyles(nodes) {
        const result = [];
        for (const node of nodes) {
            const nestedStyle = this.protocolNodeToNestedStyle(node);
            if (nestedStyle) {
                result.push(nestedStyle);
            }
        }
        return result;
    }
    protocolNodeToNestedStyle(node) {
        if (node.style) {
            return { style: new CSSStyleDeclaration(this.cssModelInternal, this, node.style, Type.Regular) };
        }
        if (node.condition) {
            const children = this.protocolNodesToNestedStyles(node.condition.children);
            if (node.condition.media) {
                return { children, media: new CSSMedia(this.cssModelInternal, node.condition.media) };
            }
            if (node.condition.containerQueries) {
                return {
                    children,
                    container: new CSSContainerQuery(this.cssModelInternal, node.condition.containerQueries),
                };
            }
            if (node.condition.supports) {
                return {
                    children,
                    supports: new CSSSupports(this.cssModelInternal, node.condition.supports),
                };
            }
            console.error('A function rule condition must have a media, container, or supports');
            return;
        }
        console.error('A function rule node must have a style or condition');
        return;
    }
}
//# sourceMappingURL=CSSRule.js.map