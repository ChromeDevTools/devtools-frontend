// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as uiI18n from '../../../../ui/i18n/i18n.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as TextEditor from '../../../components/text_editor/text_editor.js';
import { Directives, html, render } from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import { CustomPreviewComponent } from './CustomPreviewComponent.js';
import { JavaScriptREPL } from './JavaScriptREPL.js';
import objectPropertiesSectionStyles from './objectPropertiesSection.css.js';
import objectValueStyles from './objectValue.css.js';
import { RemoteObjectPreviewFormatter, renderNodeTitle } from './RemoteObjectPreviewFormatter.js';
const { repeat, ifDefined } = Directives;
const UIStrings = {
    /**
     * @description Text in Object Properties Section
     * @example {function alert()  [native code] } PH1
     */
    exceptionS: '[Exception: {PH1}]',
    /**
     * @description Text in Object Properties Section
     */
    unknown: 'unknown',
    /**
     * @description Text to expand something recursively
     */
    expandRecursively: 'Expand recursively',
    /**
     * @description Text to collapse children of a parent group
     */
    collapseChildren: 'Collapse children',
    /**
     * @description Text in Object Properties Section
     */
    noProperties: 'No properties',
    /**
     * @description Element text content in Object Properties Section
     */
    dots: '(...)',
    /**
     * @description Element title in Object Properties Section
     */
    invokePropertyGetter: 'Invoke property getter',
    /**
     * @description Show all text content in Show More Data Grid Node of a data grid
     * @example {50} PH1
     */
    showAllD: 'Show all {PH1}',
    /**
     * @description Value element text content in Object Properties Section. Shown when the developer is
     * viewing a variable in the Scope view, whose value is not available (i.e. because it was optimized
     * out) by the JavaScript engine, or inspecting a JavaScript object accessor property, which has no
     * getter. This string should be translated.
     */
    valueUnavailable: '<value unavailable>',
    /**
     * @description Tooltip for value elements in the Scope view that refer to variables whose values
     * aren't accessible to the debugger (potentially due to being optimized out by the JavaScript
     * engine), or for JavaScript object accessor properties which have no getter.
     */
    valueNotAccessibleToTheDebugger: 'Value is not accessible to the debugger',
    /**
     * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
     */
    copyValue: 'Copy value',
    /**
     * @description A context menu item in the Object Properties Section
     */
    copyPropertyPath: 'Copy property path',
    /**
     * @description Text shown when displaying a JavaScript object that has a string property that is
     * too large for DevTools to properly display a text editor. This is shown instead of the string in
     * question. Should be translated.
     */
    stringIsTooLargeToEdit: '<string is too large to edit>',
    /**
     * @description Text of attribute value when text is too long
     * @example {30 MB} PH1
     */
    showMoreS: 'Show more ({PH1})',
    /**
     * @description Text of attribute value when text is too long
     * @example {30 MB} PH1
     */
    longTextWasTruncatedS: 'long text was truncated ({PH1})',
    /**
     * @description Text for copying
     */
    copy: 'Copy',
    /**
     * @description A tooltip text that shows when hovering over a button next to value objects,
     * which are based on bytes and can be shown in a hexadecimal viewer.
     * Clicking on the button will display that object in the Memory inspector panel.
     */
    openInMemoryInpector: 'Open in Memory inspector panel',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/ObjectPropertiesSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const EXPANDABLE_MAX_LENGTH = 50;
const EXPANDABLE_MAX_DEPTH = 100;
const objectPropertiesSectionMap = new WeakMap();
class ObjectTreeNodeBase {
    parent;
    propertiesMode;
    #children;
    extraProperties = [];
    constructor(parent, propertiesMode = 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */) {
        this.parent = parent;
        this.propertiesMode = propertiesMode;
    }
    removeChildren() {
        this.#children = undefined;
    }
    removeChild(child) {
        remove(this.#children?.arrayRanges, child);
        remove(this.#children?.internalProperties, child);
        remove(this.#children?.properties, child);
        function remove(array, element) {
            if (!array) {
                return;
            }
            const index = array.indexOf(element);
            if (index >= 0) {
                array.splice(index, 1);
            }
        }
    }
    selfOrParentIfInternal() {
        return this;
    }
    async children() {
        if (!this.#children) {
            this.#children = await this.populateChildren();
        }
        return this.#children;
    }
    async populateChildren() {
        const object = this.object;
        if (!object) {
            return {};
        }
        const effectiveParent = this.selfOrParentIfInternal();
        if (this.arrayLength > ARRAY_LOAD_THRESHOLD) {
            const ranges = await arrayRangeGroups(object, 0, this.arrayLength - 1);
            const arrayRanges = ranges?.ranges.map(([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(object, { fromIndex, toIndex, count }));
            if (!arrayRanges) {
                return {};
            }
            const { properties: objectProperties, internalProperties: objectInternalProperties } = await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(this.object, true /* generatePreview */, true /* nonIndexedPropertiesOnly */);
            const properties = objectProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
            const internalProperties = objectInternalProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
            return { arrayRanges, properties, internalProperties };
        }
        let objectProperties = null;
        let objectInternalProperties = null;
        switch (this.propertiesMode) {
            case 0 /* ObjectPropertiesMode.ALL */:
                ({ properties: objectProperties } =
                    await object.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */));
                break;
            case 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */:
                ({ properties: objectProperties, internalProperties: objectInternalProperties } =
                    await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(object, true /* generatePreview */));
                break;
        }
        const properties = objectProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
        properties?.push(...this.extraProperties);
        const internalProperties = objectInternalProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
        return { properties, internalProperties };
    }
    get hasChildren() {
        return this.object?.hasChildren ?? false;
    }
    get arrayLength() {
        return this.object?.arrayLength() ?? 0;
    }
    // This is used in web tests
    async setPropertyValue(name, value) {
        return await this.object?.setPropertyValue(name, value);
    }
    addExtraProperties(...properties) {
        this.extraProperties.push(...properties.map(p => new ObjectTreeNode(p, undefined, this, undefined)));
    }
}
export class ObjectTree extends ObjectTreeNodeBase {
    #object;
    constructor(object, propertiesMode = 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */) {
        super(undefined, propertiesMode);
        this.#object = object;
    }
    get object() {
        return this.#object;
    }
}
class ArrayGroupTreeNode extends ObjectTreeNodeBase {
    #object;
    #range;
    constructor(object, range, parent, propertiesMode = 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */) {
        super(parent, propertiesMode);
        this.#object = object;
        this.#range = range;
    }
    async populateChildren() {
        if (this.#range.count > ArrayGroupingTreeElement.bucketThreshold) {
            const ranges = await arrayRangeGroups(this.object, this.#range.fromIndex, this.#range.toIndex);
            const arrayRanges = ranges?.ranges.map(([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(this.object, { fromIndex, toIndex, count }));
            return { arrayRanges };
        }
        const result = await this.#object.callFunction(buildArrayFragment, [
            { value: this.#range.fromIndex },
            { value: this.#range.toIndex },
            { value: ArrayGroupingTreeElement.sparseIterationThreshold },
        ]);
        if (!result.object || result.wasThrown) {
            return {};
        }
        const arrayFragment = result.object;
        const allProperties = await arrayFragment.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */);
        arrayFragment.release();
        const properties = allProperties.properties?.map(p => new ObjectTreeNode(p, this.propertiesMode, this, undefined));
        properties?.push(...this.extraProperties);
        properties?.sort(ObjectPropertiesSection.compareProperties);
        return { properties };
    }
    get singular() {
        return this.#range.fromIndex === this.#range.toIndex;
    }
    get range() {
        return this.#range;
    }
    get object() {
        return this.#object;
    }
}
export class ObjectTreeNode extends ObjectTreeNodeBase {
    property;
    nonSyntheticParent;
    #path;
    constructor(property, propertiesMode = 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */, parent, nonSyntheticParent) {
        super(parent, propertiesMode);
        this.property = property;
        this.nonSyntheticParent = nonSyntheticParent;
    }
    get object() {
        return this.property.value;
    }
    get name() {
        return this.property.name;
    }
    get path() {
        if (!this.#path) {
            if (this.property.synthetic) {
                this.#path = this.name;
                return this.name;
            }
            // https://tc39.es/ecma262/#prod-IdentifierName
            const useDotNotation = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
            const isInteger = /^(?:0|[1-9]\d*)$/;
            const parentPath = (this.parent instanceof ObjectTreeNode && !this.parent.property.synthetic) ? this.parent.path : '';
            if (this.property.private || useDotNotation.test(this.name)) {
                this.#path = parentPath ? `${parentPath}.${this.name}` : this.name;
            }
            else if (isInteger.test(this.name)) {
                this.#path = `${parentPath}[${this.name}]`;
            }
            else {
                this.#path = `${parentPath}[${JSON.stringify(this.name)}]`;
            }
        }
        return this.#path;
    }
    selfOrParentIfInternal() {
        return this.name === '[[Prototype]]' ? (this.parent ?? this) : this;
    }
}
export const getObjectPropertiesSectionFrom = (element) => {
    return objectPropertiesSectionMap.get(element);
};
export class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
    root;
    editable;
    #objectTreeElement;
    titleElement;
    skipProtoInternal;
    constructor(object, title, linkifier, showOverflow) {
        super();
        this.root = new ObjectTree(object);
        this.editable = true;
        if (!showOverflow) {
            this.setHideOverflow(true);
        }
        this.setFocusable(true);
        this.setShowSelectionOnKeyboardFocus(true);
        this.#objectTreeElement = new RootElement(this.root, linkifier);
        this.appendChild(this.#objectTreeElement);
        if (typeof title === 'string' || !title) {
            this.titleElement = this.element.createChild('span');
            this.titleElement.textContent = title || '';
        }
        else {
            this.titleElement = title;
            this.element.appendChild(title);
        }
        if (this.titleElement instanceof HTMLElement && !this.titleElement.hasAttribute('tabIndex')) {
            this.titleElement.tabIndex = -1;
        }
        objectPropertiesSectionMap.set(this.element, this);
        this.registerRequiredCSS(objectValueStyles, objectPropertiesSectionStyles);
        this.rootElement().childrenListElement.classList.add('source-code', 'object-properties-section');
    }
    static defaultObjectPresentation(object, linkifier, skipProto, readOnly) {
        const objectPropertiesSection = ObjectPropertiesSection.defaultObjectPropertiesSection(object, linkifier, skipProto, readOnly);
        if (!object.hasChildren) {
            return objectPropertiesSection.titleElement;
        }
        return objectPropertiesSection.element;
    }
    static defaultObjectPropertiesSection(object, linkifier, skipProto, readOnly) {
        const titleElement = document.createElement('span');
        titleElement.classList.add('source-code');
        const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(titleElement, { cssFile: objectValueStyles });
        const propertyValue = ObjectPropertiesSection.createPropertyValue(object, /* wasThrown */ false, /* showPreview */ true);
        shadowRoot.appendChild(propertyValue);
        const objectPropertiesSection = new ObjectPropertiesSection(object, titleElement, linkifier);
        objectPropertiesSection.editable = false;
        if (skipProto) {
            objectPropertiesSection.skipProto();
        }
        if (readOnly) {
            objectPropertiesSection.setEditable(false);
        }
        return objectPropertiesSection;
    }
    // The RemoteObjectProperty overload is kept for web test compatibility for now.
    static compareProperties(propertyA, propertyB) {
        if (propertyA instanceof ObjectTreeNode) {
            propertyA = propertyA.property;
        }
        if (propertyB instanceof ObjectTreeNode) {
            propertyB = propertyB.property;
        }
        if (!propertyA.synthetic && propertyB.synthetic) {
            return 1;
        }
        if (!propertyB.synthetic && propertyA.synthetic) {
            return -1;
        }
        if (!propertyA.isOwn && propertyB.isOwn) {
            return 1;
        }
        if (!propertyB.isOwn && propertyA.isOwn) {
            return -1;
        }
        if (!propertyA.enumerable && propertyB.enumerable) {
            return 1;
        }
        if (!propertyB.enumerable && propertyA.enumerable) {
            return -1;
        }
        if (propertyA.symbol && !propertyB.symbol) {
            return 1;
        }
        if (propertyB.symbol && !propertyA.symbol) {
            return -1;
        }
        if (propertyA.private && !propertyB.private) {
            return 1;
        }
        if (propertyB.private && !propertyA.private) {
            return -1;
        }
        const a = propertyA.name;
        const b = propertyB.name;
        if (a.startsWith('_') && !b.startsWith('_')) {
            return 1;
        }
        if (b.startsWith('_') && !a.startsWith('_')) {
            return -1;
        }
        return Platform.StringUtilities.naturalOrderComparator(a, b);
    }
    static createNameElement(name, isPrivate) {
        if (name === null) {
            return UI.Fragment.html `<span class="name"></span>`;
        }
        if (/^\s|\s$|^$|\n/.test(name)) {
            return UI.Fragment.html `<span class="name">"${name.replace(/\n/g, '\u21B5')}"</span>`;
        }
        if (isPrivate) {
            return UI.Fragment.html `<span class="name">
  <span class="private-property-hash">${name[0]}</span>${name.substring(1)}
  </span>`;
        }
        return UI.Fragment.html `<span class="name">${name}</span>`;
    }
    static valueElementForFunctionDescription(description, includePreview, defaultName) {
        const valueElement = document.createElement('span');
        valueElement.classList.add('object-value-function');
        description = description || '';
        const text = description.replace(/^function [gs]et /, 'function ')
            .replace(/^function [gs]et\(/, 'function\(')
            .replace(/^[gs]et /, '');
        defaultName = defaultName || '';
        // This set of best-effort regular expressions captures common function descriptions.
        // Ideally, some parser would provide prefix, arguments, function body text separately.
        const asyncMatch = text.match(/^(async\s+function)/);
        const isGenerator = text.startsWith('function*');
        const isGeneratorShorthand = text.startsWith('*');
        const isBasic = !isGenerator && text.startsWith('function');
        const isClass = text.startsWith('class ') || text.startsWith('class{');
        const firstArrowIndex = text.indexOf('=>');
        const isArrow = !asyncMatch && !isGenerator && !isBasic && !isClass && firstArrowIndex > 0;
        let textAfterPrefix;
        if (isClass) {
            textAfterPrefix = text.substring('class'.length);
            const classNameMatch = /^[^{\s]+/.exec(textAfterPrefix.trim());
            let className = defaultName;
            if (classNameMatch) {
                className = classNameMatch[0].trim() || defaultName;
            }
            addElements('class', textAfterPrefix, className);
        }
        else if (asyncMatch) {
            textAfterPrefix = text.substring(asyncMatch[1].length);
            addElements('async \u0192', textAfterPrefix, nameAndArguments(textAfterPrefix));
        }
        else if (isGenerator) {
            textAfterPrefix = text.substring('function*'.length);
            addElements('\u0192*', textAfterPrefix, nameAndArguments(textAfterPrefix));
        }
        else if (isGeneratorShorthand) {
            textAfterPrefix = text.substring('*'.length);
            addElements('\u0192*', textAfterPrefix, nameAndArguments(textAfterPrefix));
        }
        else if (isBasic) {
            textAfterPrefix = text.substring('function'.length);
            addElements('\u0192', textAfterPrefix, nameAndArguments(textAfterPrefix));
        }
        else if (isArrow) {
            const maxArrowFunctionCharacterLength = 60;
            let abbreviation = text;
            if (defaultName) {
                abbreviation = defaultName + '()';
            }
            else if (text.length > maxArrowFunctionCharacterLength) {
                abbreviation = text.substring(0, firstArrowIndex + 2) + ' {…}';
            }
            addElements('', text, abbreviation);
        }
        else {
            addElements('\u0192', text, nameAndArguments(text));
        }
        UI.Tooltip.Tooltip.install(valueElement, Platform.StringUtilities.trimEndWithMaxLength(description, 500));
        return valueElement;
        function nameAndArguments(contents) {
            const startOfArgumentsIndex = contents.indexOf('(');
            const endOfArgumentsMatch = contents.match(/\)\s*{/);
            if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch?.index !== undefined &&
                endOfArgumentsMatch.index > startOfArgumentsIndex) {
                const name = contents.substring(0, startOfArgumentsIndex).trim() || defaultName;
                const args = contents.substring(startOfArgumentsIndex, endOfArgumentsMatch.index + 1);
                return name + args;
            }
            return defaultName + '()';
        }
        function addElements(prefix, body, abbreviation) {
            const maxFunctionBodyLength = 200;
            if (prefix.length) {
                valueElement.createChild('span', 'object-value-function-prefix').textContent = prefix + ' ';
            }
            if (includePreview) {
                UI.UIUtils.createTextChild(valueElement, Platform.StringUtilities.trimEndWithMaxLength(body.trim(), maxFunctionBodyLength));
            }
            else {
                UI.UIUtils.createTextChild(valueElement, abbreviation.replace(/\n/g, ' '));
            }
        }
    }
    static createPropertyValueWithCustomSupport(value, wasThrown, showPreview, linkifier, isSyntheticProperty, variableName) {
        if (value.customPreview()) {
            const result = (new CustomPreviewComponent(value)).element;
            result.classList.add('object-properties-section-custom-section');
            return result;
        }
        return ObjectPropertiesSection.createPropertyValue(value, wasThrown, showPreview, linkifier, isSyntheticProperty, variableName);
    }
    static appendMemoryIcon(element, object, expression) {
        if (!object.isLinearMemoryInspectable()) {
            return;
        }
        const memoryIcon = new IconButton.Icon.Icon();
        memoryIcon.name = 'memory';
        memoryIcon.style.width = 'var(--sys-size-8)';
        memoryIcon.style.height = '13px';
        memoryIcon.addEventListener('click', event => {
            event.consume();
            void Common.Revealer.reveal(new SDK.RemoteObject.LinearMemoryInspectable(object, expression));
        });
        memoryIcon.setAttribute('jslog', `${VisualLogging.action('open-memory-inspector').track({ click: true })}`);
        const revealText = i18nString(UIStrings.openInMemoryInpector);
        UI.Tooltip.Tooltip.install(memoryIcon, revealText);
        UI.ARIAUtils.setLabel(memoryIcon, revealText);
        // Directly set property on memory icon, so that the memory icon is also
        // styled within the context of code mirror.
        memoryIcon.style.setProperty('vertical-align', 'sub');
        memoryIcon.style.setProperty('cursor', 'pointer');
        element.appendChild(memoryIcon);
    }
    static createPropertyValue(value, wasThrown, showPreview, linkifier, isSyntheticProperty = false, variableName) {
        let propertyValue;
        const type = value.type;
        const subtype = value.subtype;
        const description = value.description || '';
        const className = value.className;
        if (type === 'object' && subtype === 'internal#location') {
            const rawLocation = value.debuggerModel().createRawLocationByScriptId(value.value.scriptId, value.value.lineNumber, value.value.columnNumber);
            if (rawLocation && linkifier) {
                return linkifier.linkifyRawLocation(rawLocation, Platform.DevToolsPath.EmptyUrlString);
            }
            propertyValue = createUnknownInternalLocationElement();
        }
        else if (type === 'string' && typeof description === 'string') {
            propertyValue = createStringElement();
        }
        else if (type === 'object' && subtype === 'trustedtype') {
            propertyValue = createTrustedTypeElement();
        }
        else if (type === 'function') {
            propertyValue = ObjectPropertiesSection.valueElementForFunctionDescription(description);
        }
        else if (type === 'object' && subtype === 'node' && description) {
            propertyValue = createNodeElement();
        }
        else {
            const valueElement = document.createElement('span');
            valueElement.classList.add('object-value-' + (subtype || type));
            if (value.preview && showPreview) {
                const previewFormatter = new RemoteObjectPreviewFormatter();
                /* eslint-disable-next-line  @devtools/no-lit-render-outside-of-view */
                render(previewFormatter.renderObjectPreview(value.preview), valueElement);
                propertyValue = valueElement;
                UI.Tooltip.Tooltip.install(propertyValue, description || '');
            }
            else if (description.length > maxRenderableStringLength) {
                propertyValue = new ExpandableTextPropertyValue(valueElement, description, EXPANDABLE_MAX_LENGTH).element;
            }
            else {
                propertyValue = valueElement;
                propertyValue.textContent = description;
                UI.Tooltip.Tooltip.install(propertyValue, description);
            }
            if (!isSyntheticProperty) {
                this.appendMemoryIcon(valueElement, value, variableName);
            }
        }
        if (wasThrown) {
            const wrapperElement = document.createElement('span');
            wrapperElement.classList.add('error');
            wrapperElement.classList.add('value');
            wrapperElement.appendChild(uiI18n.getFormatLocalizedString(str_, UIStrings.exceptionS, { PH1: propertyValue }));
            propertyValue = wrapperElement;
        }
        propertyValue.classList.add('value');
        return propertyValue;
        function createUnknownInternalLocationElement() {
            const valueElement = document.createElement('span');
            valueElement.textContent = '<' + i18nString(UIStrings.unknown) + '>';
            UI.Tooltip.Tooltip.install(valueElement, description || '');
            return valueElement;
        }
        function createStringElement() {
            const valueElement = document.createElement('span');
            valueElement.classList.add('object-value-string');
            const text = JSON.stringify(description);
            let propertyValue;
            if (description.length > maxRenderableStringLength) {
                propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH).element;
            }
            else {
                UI.UIUtils.createTextChild(valueElement, text);
                propertyValue = valueElement;
                UI.Tooltip.Tooltip.install(valueElement, description);
            }
            return propertyValue;
        }
        function createTrustedTypeElement() {
            const valueElement = document.createElement('span');
            valueElement.classList.add('object-value-trustedtype');
            const text = `${className} "${description}"`;
            let propertyValue;
            if (text.length > maxRenderableStringLength) {
                propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH).element;
            }
            else {
                const contentString = createStringElement();
                UI.UIUtils.createTextChild(valueElement, `${className} `);
                valueElement.appendChild(contentString);
                propertyValue = valueElement;
                UI.Tooltip.Tooltip.install(valueElement, text);
            }
            return propertyValue;
        }
        function createNodeElement() {
            const valueElement = document.createElement('span');
            valueElement.classList.add('object-value-node');
            /* eslint-disable-next-line @devtools/no-lit-render-outside-of-view */
            render(renderNodeTitle(description), valueElement);
            valueElement.addEventListener('click', event => {
                void Common.Revealer.reveal(value);
                event.consume(true);
            }, false);
            valueElement.addEventListener('mousemove', () => SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(value), false);
            valueElement.addEventListener('mouseleave', () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(), false);
            return valueElement;
        }
    }
    static formatObjectAsFunction(func, element, linkify, includePreview) {
        return func.debuggerModel().functionDetailsPromise(func).then(didGetDetails);
        function didGetDetails(response) {
            if (linkify && response?.location) {
                element.classList.add('linkified');
                element.addEventListener('click', () => {
                    void Common.Revealer.reveal(response.location);
                    return false;
                });
            }
            // The includePreview flag is false for formats such as console.dir().
            let defaultName = includePreview ? '' : 'anonymous';
            if (response?.functionName) {
                defaultName = response.functionName;
            }
            const valueElement = ObjectPropertiesSection.valueElementForFunctionDescription(func.description, includePreview, defaultName);
            element.appendChild(valueElement);
        }
    }
    static isDisplayableProperty(property, parentProperty) {
        if (!parentProperty?.synthetic) {
            return true;
        }
        const name = property.name;
        const useless = (parentProperty.name === '[[Entries]]' && (name === 'length' || name === '__proto__'));
        return !useless;
    }
    skipProto() {
        this.skipProtoInternal = true;
    }
    expand() {
        this.#objectTreeElement.expand();
    }
    setEditable(value) {
        this.editable = value;
    }
    objectTreeElement() {
        return this.#objectTreeElement;
    }
    enableContextMenu() {
        this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
    }
    contextMenuEventFired(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(this.root);
        if (this.root.object instanceof SDK.RemoteObject.LocalJSONObject) {
            contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively), this.#objectTreeElement.expandRecursively.bind(this.#objectTreeElement, EXPANDABLE_MAX_DEPTH), { jslogContext: 'expand-recursively' });
            contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), this.#objectTreeElement.collapseChildren.bind(this.#objectTreeElement), { jslogContext: 'collapse-children' });
        }
        void contextMenu.show();
    }
    titleLessMode() {
        this.#objectTreeElement.listItemElement.classList.add('hidden');
        this.#objectTreeElement.childrenListElement.classList.add('title-less-mode');
        this.#objectTreeElement.expand();
    }
}
/** @constant */
const ARRAY_LOAD_THRESHOLD = 100;
const maxRenderableStringLength = 10000;
export class ObjectPropertiesSectionsTreeOutline extends UI.TreeOutline.TreeOutlineInShadow {
    editable;
    constructor(options) {
        super();
        this.registerRequiredCSS(objectValueStyles, objectPropertiesSectionStyles);
        this.editable = !(options?.readOnly);
        this.contentElement.classList.add('source-code');
        this.contentElement.classList.add('object-properties-section');
    }
}
export class RootElement extends UI.TreeOutline.TreeElement {
    object;
    linkifier;
    emptyPlaceholder;
    toggleOnClick;
    constructor(object, linkifier, emptyPlaceholder) {
        const contentElement = document.createElement('slot');
        super(contentElement);
        this.object = object;
        this.linkifier = linkifier;
        this.emptyPlaceholder = emptyPlaceholder;
        this.setExpandable(true);
        this.selectable = true;
        this.toggleOnClick = true;
        this.listItemElement.classList.add('object-properties-section-root-element');
        this.listItemElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
    }
    invalidateChildren() {
        super.invalidateChildren();
        this.object.removeChildren();
    }
    onexpand() {
        if (this.treeOutline) {
            this.treeOutline.element.classList.add('expanded');
        }
    }
    oncollapse() {
        if (this.treeOutline) {
            this.treeOutline.element.classList.remove('expanded');
        }
    }
    ondblclick(_e) {
        return true;
    }
    onContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(this.object.object);
        if (this.object instanceof SDK.RemoteObject.LocalJSONObject) {
            const { value } = this.object;
            const propertyValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
            const copyValueHandler = () => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
            };
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), copyValueHandler, { jslogContext: 'copy-value' });
        }
        contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH), { jslogContext: 'expand-recursively' });
        contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this), { jslogContext: 'collapse-children' });
        void contextMenu.show();
    }
    async onpopulate() {
        const treeOutline = this.treeOutline;
        const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
        return await ObjectPropertyTreeElement.populate(this, this.object, skipProto, false, this.linkifier, this.emptyPlaceholder);
    }
}
/**
 * Number of initially visible children in an ObjectPropertyTreeElement.
 * Remaining children are shown as soon as requested via a show more properties button.
 **/
export const InitialVisibleChildrenLimit = 200;
export const TREE_ELEMENT_DEFAULT_VIEW = (input, output, target) => {
    const isInternalEntries = input.node.property.synthetic && input.node.name === '[[Entries]]';
    if (isInternalEntries) {
        render(html `<span class=name-and-value>${input.nameElement}</span>`, target);
    }
    else {
        const completionsId = `completions-${input.node.parent?.object?.objectId?.replaceAll('.', '-')}-${input.node.name}`;
        const onAutoComplete = async (e) => {
            if (!(e.target instanceof UI.TextPrompt.TextPromptElement)) {
                return;
            }
            input.onAutoComplete(e.detail.expression, e.detail.filter, e.detail.force);
        };
        // clang-format off
        render(html `<span class=name-and-value>${input.nameElement}<span class='separator'>: </span><devtools-prompt
             @commit=${(e) => input.editingCommitted(e.detail)}
             @cancel=${() => input.editingEnded()}
             @beforeautocomplete=${onAutoComplete}
             completions=${completionsId}
             placeholder=${i18nString(UIStrings.stringIsTooLargeToEdit)}
             ?editing=${input.editing}>
               ${input.expanded && input.expandedValueElement || input.valueElement}
               <datalist id=${completionsId}>${repeat(input.completions, c => html `<option>${c}</option>`)}</datalist>
             </devtools-prompt></span><span>`, target);
        // clang-format on
    }
};
export class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
    property;
    toggleOnClick;
    highlightChanges;
    linkifier;
    maxNumPropertiesToShow;
    nameElement;
    valueElement;
    readOnly;
    prompt;
    editableDiv;
    propertyValue;
    expandedValueElement;
    #editing = false;
    #view;
    #completions = [];
    constructor(property, linkifier, view = TREE_ELEMENT_DEFAULT_VIEW) {
        // Pass an empty title, the title gets made later in onattach.
        super();
        this.#view = view;
        this.property = property;
        this.toggleOnClick = true;
        this.highlightChanges = [];
        this.linkifier = linkifier;
        this.maxNumPropertiesToShow = InitialVisibleChildrenLimit;
        this.listItemElement.addEventListener('contextmenu', this.contextMenuFired.bind(this), false);
        this.listItemElement.dataset.objectPropertyNameForTest = property.name;
        this.setExpandRecursively(property.name !== '[[Prototype]]');
    }
    static async populate(treeElement, value, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
        const properties = await value.children();
        if (properties.arrayRanges) {
            await ArrayGroupingTreeElement.populate(treeElement, properties, linkifier);
        }
        else {
            ObjectPropertyTreeElement.populateWithProperties(treeElement, properties, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder);
        }
    }
    static populateWithProperties(treeNode, { properties, internalProperties }, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
        properties?.sort(ObjectPropertiesSection.compareProperties);
        const entriesProperty = internalProperties?.find(({ property }) => property.name === '[[Entries]]');
        if (entriesProperty) {
            const treeElement = new ObjectPropertyTreeElement(entriesProperty, linkifier);
            treeElement.setExpandable(true);
            treeElement.expand();
            treeNode.appendChild(treeElement);
        }
        const tailProperties = [];
        for (const property of properties ?? []) {
            if (treeNode instanceof ObjectPropertyTreeElement &&
                !ObjectPropertiesSection.isDisplayableProperty(property.property, treeNode.property?.property)) {
                continue;
            }
            // FIXME move into node
            if (property.property.isOwn && !skipGettersAndSetters) {
                if (property.property.getter) {
                    const getterProperty = new SDK.RemoteObject.RemoteObjectProperty('get ' + property.property.name, property.property.getter, false);
                    tailProperties.push(new ObjectTreeNode(getterProperty, property.propertiesMode, property.parent));
                }
                if (property.property.setter) {
                    const setterProperty = new SDK.RemoteObject.RemoteObjectProperty('set ' + property.property.name, property.property.setter, false);
                    tailProperties.push(new ObjectTreeNode(setterProperty, property.propertiesMode, property.parent));
                }
            }
            const canShowProperty = property.property.getter || !property.property.isAccessorProperty();
            if (canShowProperty) {
                const element = new ObjectPropertyTreeElement(property, linkifier);
                if (property.property.name === 'memories' && property.object?.className === 'Memories') {
                    element.updateExpandable();
                    if (element.isExpandable()) {
                        element.expand();
                    }
                }
                treeNode.appendChild(element);
            }
        }
        for (let i = 0; i < tailProperties.length; ++i) {
            treeNode.appendChild(new ObjectPropertyTreeElement(tailProperties[i], linkifier));
        }
        for (const property of internalProperties ?? []) {
            const treeElement = new ObjectPropertyTreeElement(property, linkifier);
            if (property.property.name === '[[Entries]]') {
                continue;
            }
            if (property.property.name === '[[Prototype]]' && skipProto) {
                continue;
            }
            treeNode.appendChild(treeElement);
        }
        ObjectPropertyTreeElement.appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder);
    }
    static appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder) {
        if (treeNode.childCount()) {
            return;
        }
        const title = document.createElement('div');
        title.classList.add('gray-info-message');
        title.textContent = emptyPlaceholder || i18nString(UIStrings.noProperties);
        const infoElement = new UI.TreeOutline.TreeElement(title);
        treeNode.appendChild(infoElement);
    }
    static createRemoteObjectAccessorPropertySpan(object, propertyPath, callback) {
        const rootElement = document.createElement('span');
        const element = rootElement.createChild('span');
        element.textContent = i18nString(UIStrings.dots);
        if (!object) {
            return rootElement;
        }
        element.classList.add('object-value-calculate-value-button');
        UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
        element.addEventListener('click', onInvokeGetterClick, false);
        function onInvokeGetterClick(event) {
            event.consume();
            if (object) {
                void object.callFunction(invokeGetter, [{ value: JSON.stringify(propertyPath) }]).then(callback);
            }
        }
        function invokeGetter(arrayStr) {
            let result = this;
            const properties = JSON.parse(arrayStr);
            for (let i = 0, n = properties.length; i < n; ++i) {
                // @ts-expect-error callFunction expects this to be a generic Object, so while this works we can't be more specific on types.
                result = result[properties[i]];
            }
            return result;
        }
        return rootElement;
    }
    setSearchRegex(regex, additionalCssClassName) {
        let cssClasses = UI.UIUtils.highlightedSearchResultClassName;
        if (additionalCssClassName) {
            cssClasses += ' ' + additionalCssClassName;
        }
        this.revertHighlightChanges();
        this.applySearch(regex, this.nameElement, cssClasses);
        if (this.property.object) {
            const valueType = this.property.object.type;
            if (valueType !== 'object') {
                this.applySearch(regex, this.valueElement, cssClasses);
            }
        }
        return Boolean(this.highlightChanges.length);
    }
    applySearch(regex, element, cssClassName) {
        const ranges = [];
        const content = element.textContent || '';
        regex.lastIndex = 0;
        let match = regex.exec(content);
        while (match) {
            ranges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
            match = regex.exec(content);
        }
        if (ranges.length) {
            UI.UIUtils.highlightRangesWithStyleClass(element, ranges, cssClassName, this.highlightChanges);
        }
    }
    showAllPropertiesElementSelected(element) {
        this.removeChild(element);
        this.children().forEach(x => {
            x.hidden = false;
        });
        return false;
    }
    createShowAllPropertiesButton() {
        const element = document.createElement('div');
        element.classList.add('object-value-calculate-value-button');
        element.textContent = i18nString(UIStrings.dots);
        UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.showAllD, { PH1: this.childCount() }));
        const children = this.children();
        for (let i = this.maxNumPropertiesToShow; i < this.childCount(); ++i) {
            children[i].hidden = true;
        }
        const showAllPropertiesButton = new UI.TreeOutline.TreeElement(element);
        showAllPropertiesButton.onselect = this.showAllPropertiesElementSelected.bind(this, showAllPropertiesButton);
        this.appendChild(showAllPropertiesButton);
    }
    revertHighlightChanges() {
        UI.UIUtils.revertDomChanges(this.highlightChanges);
        this.highlightChanges = [];
    }
    async onpopulate() {
        const treeOutline = this.treeOutline;
        const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
        this.removeChildren();
        this.property.removeChildren();
        if (this.property.object) {
            await ObjectPropertyTreeElement.populate(this, this.property, skipProto, false, this.linkifier);
            if (this.childCount() > this.maxNumPropertiesToShow) {
                this.createShowAllPropertiesButton();
            }
        }
    }
    ondblclick(event) {
        const target = event.target;
        const inEditableElement = target.isSelfOrDescendant(this.valueElement) ||
            (this.expandedValueElement && target.isSelfOrDescendant(this.expandedValueElement));
        if (this.property.object && !this.property.object.customPreview() && inEditableElement &&
            (this.property.property.writable || this.property.property.setter)) {
            this.startEditing();
        }
        return false;
    }
    onenter() {
        if (this.property.object && !this.property.object.customPreview() &&
            (this.property.property.writable || this.property.property.setter)) {
            this.startEditing();
            return true;
        }
        return false;
    }
    onattach() {
        this.update();
        this.updateExpandable();
    }
    onexpand() {
        this.performUpdate();
    }
    oncollapse() {
        this.performUpdate();
    }
    createExpandedValueElement(value, isSyntheticProperty) {
        const needsAlternateValue = value.hasChildren && !value.customPreview() && value.subtype !== 'node' &&
            value.type !== 'function' && (value.type !== 'object' || value.preview);
        if (!needsAlternateValue) {
            return undefined;
        }
        const valueElement = document.createElement('span');
        valueElement.classList.add('value');
        if (value.description === 'Object') {
            valueElement.textContent = '';
        }
        else {
            valueElement.setTextContentTruncatedIfNeeded(value.description || '');
        }
        valueElement.classList.add('object-value-' + (value.subtype || value.type));
        UI.Tooltip.Tooltip.install(valueElement, value.description || '');
        if (!isSyntheticProperty) {
            ObjectPropertiesSection.appendMemoryIcon(valueElement, value);
        }
        return valueElement;
    }
    update() {
        this.nameElement =
            ObjectPropertiesSection.createNameElement(this.property.name, this.property.property.private);
        if (!this.property.property.enumerable) {
            this.nameElement.classList.add('object-properties-section-dimmed');
        }
        if (this.property.property.isOwn) {
            this.nameElement.classList.add('own-property');
        }
        if (this.property.property.synthetic) {
            this.nameElement.classList.add('synthetic-property');
        }
        this.nameElement.title = this.property.path;
        const isInternalEntries = this.property.property.synthetic && this.property.name === '[[Entries]]';
        if (isInternalEntries) {
            this.valueElement = document.createElement('span');
            this.valueElement.classList.add('value');
        }
        else if (this.property.object) {
            const showPreview = this.property.name !== '[[Prototype]]';
            this.propertyValue = ObjectPropertiesSection.createPropertyValueWithCustomSupport(this.property.object, this.property.property.wasThrown, showPreview, this.linkifier, this.property.property.synthetic, this.property.path /* variableName */);
            this.valueElement = this.propertyValue;
        }
        else if (this.property.property.getter) {
            this.valueElement = document.createElement('span');
            const element = this.valueElement.createChild('span');
            element.textContent = i18nString(UIStrings.dots);
            element.classList.add('object-value-calculate-value-button');
            UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
            const getter = this.property.property.getter;
            element.addEventListener('click', (event) => {
                event.consume();
                const invokeGetter = `
          function invokeGetter(getter) {
            return Reflect.apply(getter, this, []);
          }`;
                // Also passing a string instead of a Function to avoid coverage implementation messing with it.
                void this.property.parent
                    ?.object
                    // @ts-expect-error No way to teach TypeScript to preserve the Function-ness of `getter`.
                    ?.callFunction(invokeGetter, [SDK.RemoteObject.RemoteObject.toCallArgument(getter)])
                    .then(this.onInvokeGetterClick.bind(this));
            }, false);
        }
        else {
            this.valueElement = document.createElement('span');
            this.valueElement.classList.add('object-value-unavailable');
            this.valueElement.textContent = i18nString(UIStrings.valueUnavailable);
            UI.Tooltip.Tooltip.install(this.valueElement, i18nString(UIStrings.valueNotAccessibleToTheDebugger));
        }
        const valueText = this.valueElement.textContent;
        if (this.property.object && valueText && !this.property.property.wasThrown) {
            this.expandedValueElement =
                this.createExpandedValueElement(this.property.object, this.property.property.synthetic);
        }
        this.performUpdate();
    }
    async #updateCompletions(expression, filter, force) {
        const suggestions = await TextEditor.JavaScript.completeInContext(expression, filter, force);
        this.#completions = suggestions.map(v => v.text);
        this.performUpdate();
    }
    performUpdate() {
        const input = {
            expandedValueElement: this.expandedValueElement,
            expanded: this.expanded,
            editing: this.#editing,
            editingEnded: this.editingEnded.bind(this),
            editingCommitted: this.editingCommitted.bind(this),
            node: this.property,
            nameElement: this.nameElement,
            valueElement: this.valueElement,
            completions: this.#editing ? this.#completions : [],
            onAutoComplete: this.#updateCompletions.bind(this),
        };
        this.#view(input, {}, this.listItemElement);
    }
    getContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(this);
        if (this.property.property.symbol) {
            contextMenu.appendApplicableItems(this.property.property.symbol);
        }
        if (this.property.object) {
            contextMenu.appendApplicableItems(this.property.object);
            if (this.property.parent?.object instanceof SDK.RemoteObject.LocalJSONObject) {
                const propertyValue = typeof this.property.object === 'object' ? JSON.stringify(this.property.object, null, 2) :
                    this.property.object;
                const copyValueHandler = () => {
                    Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
                    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
                };
                contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), copyValueHandler, { jslogContext: 'copy-value' });
            }
        }
        if (!this.property.property.synthetic && this.nameElement?.title) {
            const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance, this.nameElement.title);
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyPropertyPath), copyPathHandler, { jslogContext: 'copy-property-path' });
        }
        if (this.property.parent?.object instanceof SDK.RemoteObject.LocalJSONObject) {
            contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH), { jslogContext: 'expand-recursively' });
            contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this), { jslogContext: 'collapse-children' });
        }
        return contextMenu;
    }
    contextMenuFired(event) {
        const contextMenu = this.getContextMenu(event);
        void contextMenu.show();
    }
    get editing() {
        return this.#editing;
    }
    startEditing() {
        if (!this.readOnly) {
            this.#editing = true;
            this.performUpdate();
        }
    }
    editingEnded() {
        this.#completions = [];
        this.#editing = false;
        this.performUpdate();
        this.updateExpandable();
        this.select();
    }
    async editingCommitted(newContent) {
        this.editingEnded();
        await this.applyExpression(newContent);
    }
    promptKeyDown(originalContent, event) {
        const keyboardEvent = event;
        if (keyboardEvent.key === 'Enter') {
            keyboardEvent.consume();
            void this.editingCommitted(originalContent);
            return;
        }
        if (keyboardEvent.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
            keyboardEvent.consume();
            this.editingEnded();
            return;
        }
    }
    async applyExpression(expression) {
        const property = SDK.RemoteObject.RemoteObject.toCallArgument(this.property.property.symbol || this.property.name);
        expression = JavaScriptREPL.wrapObjectLiteral(expression.trim());
        if (this.property.property.synthetic) {
            let invalidate = false;
            if (expression) {
                invalidate = await this.property.property.setSyntheticValue(expression);
            }
            if (invalidate) {
                const parent = this.parent;
                if (parent) {
                    parent.invalidateChildren();
                    void parent.onpopulate();
                }
            }
            else {
                this.update();
            }
            return;
        }
        const parentObject = this.property.parent?.object;
        const errorPromise = expression ? parentObject.setPropertyValue(property, expression) : parentObject.deleteProperty(property);
        const error = await errorPromise;
        if (error) {
            this.update();
            return;
        }
        if (!expression) {
            // The property was deleted, so remove this tree element.
            this.parent?.removeChild(this);
            this.property.parent?.removeChild(this.property);
        }
        else {
            // Call updateSiblings since their value might be based on the value that just changed.
            const parent = this.parent;
            if (parent) {
                parent.invalidateChildren();
                this.property.parent?.removeChildren();
                void parent.onpopulate();
            }
        }
    }
    invalidateChildren() {
        super.invalidateChildren();
        this.property.removeChildren();
    }
    onInvokeGetterClick(result) {
        if (!result.object) {
            return;
        }
        this.property.property.value = result.object;
        this.property.property.wasThrown = result.wasThrown || false;
        this.update();
        this.invalidateChildren();
        this.updateExpandable();
    }
    updateExpandable() {
        if (this.property.object) {
            this.setExpandable(!this.property.object.customPreview() && this.property.object.hasChildren &&
                !this.property.property.wasThrown);
        }
        else {
            this.setExpandable(false);
        }
    }
    path() {
        return this.nameElement.title;
    }
}
async function arrayRangeGroups(object, fromIndex, toIndex) {
    return await object.callFunctionJSON(packArrayRanges, [
        { value: fromIndex },
        { value: toIndex },
        { value: ArrayGroupingTreeElement.bucketThreshold },
        { value: ArrayGroupingTreeElement.sparseIterationThreshold },
    ]);
    /**
     * This function is called on the RemoteObject.
     * Note: must declare params as optional.
     */
    function packArrayRanges(fromIndex, toIndex, bucketThreshold, sparseIterationThreshold) {
        if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined ||
            bucketThreshold === undefined) {
            return;
        }
        let ownPropertyNames = null;
        const consecutiveRange = (toIndex - fromIndex >= sparseIterationThreshold) && ArrayBuffer.isView(this);
        function* arrayIndexes(object) {
            if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined) {
                return;
            }
            if (toIndex - fromIndex < sparseIterationThreshold) {
                for (let i = fromIndex; i <= toIndex; ++i) {
                    if (i in object) {
                        yield i;
                    }
                }
            }
            else {
                ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(object);
                for (let i = 0; i < ownPropertyNames.length; ++i) {
                    const name = ownPropertyNames[i];
                    const index = Number(name) >>> 0;
                    if ((String(index)) === name && fromIndex <= index && index <= toIndex) {
                        yield index;
                    }
                }
            }
        }
        let count = 0;
        if (consecutiveRange) {
            count = toIndex - fromIndex + 1;
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const ignored of arrayIndexes(this)) {
                ++count;
            }
        }
        let bucketSize = count;
        if (count <= bucketThreshold) {
            bucketSize = count;
        }
        else {
            bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);
        }
        const ranges = [];
        if (consecutiveRange) {
            for (let i = fromIndex; i <= toIndex; i += bucketSize) {
                const groupStart = i;
                let groupEnd = groupStart + bucketSize - 1;
                if (groupEnd > toIndex) {
                    groupEnd = toIndex;
                }
                ranges.push([groupStart, groupEnd, groupEnd - groupStart + 1]);
            }
        }
        else {
            count = 0;
            let groupStart = -1;
            let groupEnd = 0;
            for (const i of arrayIndexes(this)) {
                if (groupStart === -1) {
                    groupStart = i;
                }
                groupEnd = i;
                if (++count === bucketSize) {
                    ranges.push([groupStart, groupEnd, count]);
                    count = 0;
                    groupStart = -1;
                }
            }
            if (count > 0) {
                ranges.push([groupStart, groupEnd, count]);
            }
        }
        return { ranges };
    }
}
/**
 * This function is called on the RemoteObject.
 */
function buildArrayFragment(fromIndex, toIndex, sparseIterationThreshold) {
    const result = Object.create(null);
    if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined) {
        return;
    }
    if (toIndex - fromIndex < sparseIterationThreshold) {
        for (let i = fromIndex; i <= toIndex; ++i) {
            if (i in this) {
                result[i] = this[i];
            }
        }
    }
    else {
        const ownPropertyNames = Object.getOwnPropertyNames(this);
        for (let i = 0; i < ownPropertyNames.length; ++i) {
            const name = ownPropertyNames[i];
            const index = Number(name) >>> 0;
            if (String(index) === name && fromIndex <= index && index <= toIndex) {
                result[index] = this[index];
            }
        }
    }
    return result;
}
export class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
    toggleOnClick;
    linkifier;
    #child;
    constructor(child, linkifier) {
        super(Platform.StringUtilities.sprintf('[%d … %d]', child.range.fromIndex, child.range.toIndex), true);
        this.#child = child;
        this.toggleOnClick = true;
        this.linkifier = linkifier;
    }
    static async populate(treeNode, children, linkifier) {
        if (!children.arrayRanges) {
            return;
        }
        if (children.arrayRanges.length === 1) {
            await ObjectPropertyTreeElement.populate(treeNode, children.arrayRanges[0], false, false, linkifier);
        }
        else {
            for (const child of children.arrayRanges) {
                if (child.singular) {
                    await ObjectPropertyTreeElement.populate(treeNode, child, false, false, linkifier);
                }
                else {
                    treeNode.appendChild(new ArrayGroupingTreeElement(child, linkifier));
                }
            }
        }
        ObjectPropertyTreeElement.populateWithProperties(treeNode, children, false, false, linkifier);
    }
    invalidateChildren() {
        super.invalidateChildren();
        this.#child.removeChildren();
    }
    async onpopulate() {
        this.removeChildren();
        this.#child.removeChildren();
        await ObjectPropertyTreeElement.populate(this, this.#child, false, false, this.linkifier);
    }
    onattach() {
        this.listItemElement.classList.add('object-properties-section-name');
    }
    // These should be module constants but they are modified by layout tests.
    static bucketThreshold = 100;
    static sparseIterationThreshold = 250000;
}
export class ObjectPropertyPrompt extends UI.TextPrompt.TextPrompt {
    constructor() {
        super();
        this.initialize(TextEditor.JavaScript.completeInContext);
    }
}
export class ObjectPropertiesSectionsTreeExpandController {
    static #propertyPathCache = new WeakMap();
    static #sectionMap = new WeakMap();
    #expandedProperties = new Set();
    constructor(treeOutline) {
        treeOutline.addEventListener(UI.TreeOutline.Events.ElementAttached, this.#elementAttached, this);
        treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.#elementExpanded, this);
        treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.#elementCollapsed, this);
    }
    watchSection(id, section) {
        ObjectPropertiesSectionsTreeExpandController.#sectionMap.set(section, id);
        if (this.#expandedProperties.has(id)) {
            section.expand();
        }
    }
    stopWatchSectionsWithId(id) {
        for (const property of this.#expandedProperties) {
            if (property.startsWith(id + ':')) {
                this.#expandedProperties.delete(property);
            }
        }
    }
    #elementAttached(event) {
        const element = event.data;
        if (element.isExpandable() && this.#expandedProperties.has(this.#propertyPath(element))) {
            element.expand();
        }
    }
    #elementExpanded(event) {
        const element = event.data;
        this.#expandedProperties.add(this.#propertyPath(element));
    }
    #elementCollapsed(event) {
        const element = event.data;
        this.#expandedProperties.delete(this.#propertyPath(element));
    }
    #propertyPath(treeElement) {
        const cachedPropertyPath = ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.get(treeElement);
        if (cachedPropertyPath) {
            return cachedPropertyPath;
        }
        let current = treeElement;
        let sectionRoot = current;
        if (!treeElement.treeOutline) {
            throw new Error('No tree outline available');
        }
        const rootElement = treeElement.treeOutline.rootElement();
        let result;
        while (current !== rootElement) {
            let currentName = '';
            if (current instanceof ObjectPropertyTreeElement) {
                currentName = current.property.name;
            }
            else {
                currentName = typeof current.title === 'string' ? current.title : current.title.textContent || '';
            }
            result = currentName + (result ? '.' + result : '');
            sectionRoot = current;
            if (current.parent) {
                current = current.parent;
            }
        }
        const treeOutlineId = ObjectPropertiesSectionsTreeExpandController.#sectionMap.get(sectionRoot);
        result = treeOutlineId + (result ? ':' + result : '');
        ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.set(treeElement, result);
        return result;
    }
}
let rendererInstance;
export class Renderer {
    static instance(opts = { forceNew: false }) {
        const { forceNew } = opts;
        if (!rendererInstance || forceNew) {
            rendererInstance = new Renderer();
        }
        return rendererInstance;
    }
    async render(object, options) {
        if (!(object instanceof SDK.RemoteObject.RemoteObject)) {
            throw new Error('Can\'t render ' + object);
        }
        const title = options?.title;
        const section = new ObjectPropertiesSection(object, title);
        if (!title) {
            section.titleLessMode();
        }
        section.editable = Boolean(options?.editable);
        if (options?.expand) {
            section.firstChild()?.expand();
        }
        return {
            element: section.element,
            forceSelect: section.forceSelect.bind(section),
        };
    }
}
export class ExpandableTextPropertyValue {
    text;
    maxLength;
    maxDisplayableTextLength;
    #byteCount;
    #expanded = false;
    #element;
    constructor(element, text, maxLength) {
        this.#element = element;
        this.text = text;
        this.maxLength = maxLength;
        this.maxDisplayableTextLength = 10000000;
        this.#byteCount = Platform.StringUtilities.countWtf8Bytes(text);
        this.#render();
    }
    get element() {
        return this.#element;
    }
    #render() {
        const totalBytesText = i18n.ByteUtilities.bytesToString(this.#byteCount);
        const onContextMenu = (e) => {
            const { target } = e;
            if (!(target instanceof Element)) {
                return;
            }
            const listItem = target.closest('li');
            const element = listItem && UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
            if (!(element instanceof ObjectPropertyTreeElement)) {
                return;
            }
            const contextMenu = element.getContextMenu(e);
            if (this.text.length < this.maxDisplayableTextLength && !this.#expanded) {
                contextMenu.clipboardSection().appendItem(i18nString(UIStrings.showMoreS, { PH1: totalBytesText }), this.expandText.bind(this), { jslogContext: 'show-more' });
            }
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copy), this.copyText.bind(this), { jslogContext: 'copy' });
            void contextMenu.show();
            e.consume(true);
        };
        const croppedText = this.text.slice(0, this.maxLength);
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(
        // clang-format off
        html `<span title=${croppedText + '…'} @contextmenu=${onContextMenu}>
               ${this.#expanded ? this.text : croppedText}
               <button
                 ?hidden=${this.#expanded}
                 @click=${this.#canExpand ? this.expandText.bind(this) : undefined}
                 jslog=${ifDefined(this.#canExpand ? VisualLogging.action('expand').track({ click: true }) : undefined)}
                 class=${this.#canExpand ? 'expandable-inline-button' : 'undisplayable-text'}
                 data-text=${this.#canExpand ? i18nString(UIStrings.showMoreS, { PH1: totalBytesText }) :
            i18nString(UIStrings.longTextWasTruncatedS, { PH1: totalBytesText })}
                 ></button>
               <button
                 class=expandable-inline-button
                 @click=${this.copyText.bind(this)}
                 data-text=${i18nString(UIStrings.copy)}
                 jslog=${VisualLogging.action('copy').track({ click: true })}
                 ></button>
             </span>`, 
        // clang-format on
        this.#element);
    }
    get #canExpand() {
        return this.text.length < this.maxDisplayableTextLength;
    }
    expandText() {
        if (!this.#expanded) {
            this.#expanded = true;
            this.#render();
        }
    }
    copyText() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.text);
    }
}
//# sourceMappingURL=ObjectPropertiesSection.js.map