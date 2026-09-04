// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import { Directives, html, nothing, render } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
import { sanitizeStyle } from './CSSStyleSanitizer.js';
import customPreviewComponentStyles from './customPreviewComponent.css.js';
import { defaultObjectPresentation, ObjectPropertiesSectionWidget, ObjectTree, } from './ObjectPropertiesSection.js';
const UIStrings = {
    /**
     * @description Context menu item to show a custom formatted object as a standard JavaScript object.
     */
    showAsJavascriptObject: 'Show as JavaScript object',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/CustomPreviewComponent.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CustomPreviewSection extends UI.Widget.Widget {
    #object;
    expanded = false;
    cachedContent;
    headerJsonML;
    view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.view = view;
    }
    get object() {
        return this.#object;
    }
    set object(object) {
        if (this.#object === object) {
            return;
        }
        this.#object = object;
        this.headerJsonML = undefined;
        this.cachedContent = undefined;
        this.expanded = false;
        this.parseHeader();
        // CustomPreviewComponent is used synchronously by ConsoleViewMessage. We must render synchronously
        // so ConsoleViewport can measure the true row height upon insertion.
        this.performUpdate();
    }
    parseHeader() {
        const customPreview = this.#object?.customPreview();
        if (!customPreview) {
            return;
        }
        try {
            this.headerJsonML = JSON.parse(customPreview.header);
        }
        catch (e) {
            Common.Console.Console.instance().error('Broken formatter: header is invalid json ' + e);
        }
    }
    performUpdate() {
        this.view({
            object: this.#object,
            headerJsonML: this.headerJsonML,
            expanded: this.expanded,
            cachedContent: this.cachedContent,
            toggleExpanded: this.toggleExpanded,
        }, undefined, this.contentElement);
    }
    toggleExpanded = () => {
        if (this.cachedContent !== undefined) {
            this.toggleExpand();
        }
        else {
            void this.loadBody();
        }
    };
    toggleExpand() {
        this.expanded = !this.expanded;
        this.performUpdate();
    }
    async loadBody() {
        const customPreview = this.#object?.customPreview();
        if (!this.#object || !customPreview?.bodyGetterId) {
            return;
        }
        const bodyJsonML = await this.#object.callFunctionJSON(bodyGetter => bodyGetter(), [{ objectId: customPreview.bodyGetterId }]);
        if (bodyJsonML === null) {
            // Per https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html#custom-formatter-structure
            // we are supposed to fall back to the default format when the `body()` callback returns `null`.
            const objectTree = new ObjectTree(this.#object, {
                readOnly: true,
                propertiesMode: 1 /* ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
            });
            objectTree.expanded = true;
            this.cachedContent = objectTree;
        }
        else {
            this.cachedContent = bodyJsonML;
        }
        this.expanded = true;
        this.performUpdate();
    }
}
const ALLOWED_TAGS = ['span', 'div', 'ol', 'li', 'table', 'tr', 'td'];
export const DEFAULT_VIEW = (input, _output, target) => {
    const renderJSONMLTag = (object, jsonML) => {
        if (!Array.isArray(jsonML)) {
            return html `${String(jsonML)}`;
        }
        if (jsonML[0] !== 'object') {
            return renderElement(object, jsonML);
        }
        if (jsonML.length !== 2) {
            Common.Console.Console.instance().error('Broken formatter: object reference must contain exactly two elements');
            return html `<span></span>`;
        }
        return layoutObjectTag(object, jsonML);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderElement = (object, jsonML) => {
        const it = jsonML[Symbol.iterator]();
        const tagName = it.next().value;
        if (!ALLOWED_TAGS.includes(tagName)) {
            Common.Console.Console.instance().error('Broken formatter: element ' + tagName + ' is not allowed!');
            return html `<span></span>`;
        }
        let next = it.next();
        const stylePropertyMap = {};
        if (typeof next.value === 'object' && !Array.isArray(next.value) && next.value !== null) {
            const attributes = next.value;
            for (const key in attributes) {
                const value = attributes[key];
                if ((key !== 'style') || (typeof value !== 'string')) {
                    continue;
                }
                const sanitizedStyle = new Map();
                sanitizeStyle(sanitizedStyle, value);
                for (const [property, { value: propertyValue, priority }] of sanitizedStyle) {
                    stylePropertyMap[property] = priority ? `${propertyValue} !${priority}` : propertyValue;
                }
            }
            next = it.next();
        }
        const children = [];
        while (!next.done) {
            children.push(renderJSONMLTag(object, next.value));
            next = it.next();
        }
        const style = Directives.styleMap(stylePropertyMap);
        switch (tagName) {
            case 'span':
                return html `<span style=${style}>${children}</span>`;
            case 'div':
                return html `<div style=${style}>${children}</div>`;
            case 'ol':
                return html `<ol style=${style}>${children}</ol>`;
            case 'li':
                return html `<li style=${style}>${children}</li>`;
            case 'table':
                return html `<table style=${style}>${children}</table>`;
            case 'tr':
                return html `<tr style=${style}>${children}</tr>`;
            case 'td':
                return html `<td style=${style}>${children}</td>`;
            default:
                return html `<span>${children}</span>`;
        }
    };
    const layoutObjectTag = (object, objectTag) => {
        const it = objectTag[Symbol.iterator]();
        it.next(); // skip 'object'
        const attributes = it.next().value;
        const remoteObject = object.runtimeModel().createRemoteObject(attributes);
        if (remoteObject.customPreview()) {
            return html `${UI.Widget.widget(CustomPreviewSection, { object: remoteObject })}`;
        }
        return defaultObjectPresentation(remoteObject, undefined, undefined, undefined, { 'custom-expandable-section-standard-section': remoteObject.hasChildren });
    };
    const onClick = (event) => {
        event.consume(true);
        input.toggleExpanded();
    };
    const object = input.object;
    const customPreview = object?.customPreview();
    if (!object || !customPreview || !input.headerJsonML) {
        render(nothing, target);
        return;
    }
    const headerTemplate = renderJSONMLTag(object, input.headerJsonML);
    if (customPreview.bodyGetterId) {
        let bodyContent;
        if (input.cachedContent instanceof ObjectTree) {
            bodyContent = html `<devtools-widget class="custom-expandable-section-default-body" ${UI.Widget.widget(ObjectPropertiesSectionWidget, {
                objectTree: input.cachedContent,
                showOverflow: false,
            })}></devtools-widget>`;
        }
        else if (input.cachedContent) {
            bodyContent = renderJSONMLTag(object, input.cachedContent);
        }
        render(html `
      <span class=${Directives.classMap({ 'custom-expandable-section-header': true,
            expanded: input.expanded })} @click=${onClick}>
        <devtools-icon name=${input.expanded ? 'triangle-down' : 'triangle-right'} class="custom-expand-icon"></devtools-icon>
        ${headerTemplate}
      </span>
      ${bodyContent ?
            html `<span class="custom-expandable-section-body" ?hidden=${!input.expanded}>${bodyContent}</span>` :
            nothing}
    `, target, { container: { classes: ['custom-expandable-section'] } });
    }
    else {
        render(html `${headerTemplate}`, target, { container: { classes: ['custom-expandable-section'] } });
    }
};
export class CustomPreviewComponent {
    object;
    customPreviewSection;
    element;
    constructor(object) {
        this.object = object;
        this.customPreviewSection = new CustomPreviewSection();
        this.customPreviewSection.object = object;
        this.element = document.createElement('span');
        this.element.classList.add('source-code');
        const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(this.element, { cssFile: customPreviewComponentStyles });
        this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
        this.customPreviewSection.show(shadowRoot, undefined, /* suppressOrphanWidgetError= */ true);
    }
    async expandIfPossible() {
        const customPreview = this.object.customPreview();
        if (customPreview && customPreview.bodyGetterId && this.customPreviewSection) {
            await this.customPreviewSection.loadBody();
        }
    }
    contextMenuEventFired(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        if (this.customPreviewSection) {
            contextMenu.revealSection().appendItem(i18nString(UIStrings.showAsJavascriptObject), this.disassemble.bind(this), { jslogContext: 'show-as-javascript-object' });
        }
        contextMenu.appendApplicableItems(this.object);
        void contextMenu.show();
    }
    disassemble() {
        if (this.element.shadowRoot) {
            if (this.customPreviewSection) {
                this.customPreviewSection.detach();
                this.customPreviewSection = null;
            }
            this.element.shadowRoot.textContent = '';
            // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
            render(defaultObjectPresentation(this.object), this.element.shadowRoot);
        }
    }
}
//# sourceMappingURL=CustomPreviewComponent.js.map