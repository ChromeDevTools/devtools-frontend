// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';
import customPreviewComponentStyles from './customPreviewComponent.css.js';
import { ObjectPropertiesSection, ObjectPropertiesSectionsTreeOutline, ObjectPropertyTreeElement, ObjectTree, } from './ObjectPropertiesSection.js';
const UIStrings = {
    /**
     * @description A context menu item in the Custom Preview Component
     */
    showAsJavascriptObject: 'Show as JavaScript object',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/CustomPreviewComponent.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CustomPreviewSection {
    sectionElement;
    object;
    expanded;
    cachedContent;
    header;
    expandIcon;
    constructor(object) {
        this.sectionElement = document.createElement('span');
        this.sectionElement.classList.add('custom-expandable-section');
        this.object = object;
        this.expanded = false;
        this.cachedContent = null;
        const customPreview = object.customPreview();
        if (!customPreview) {
            return;
        }
        let headerJSON;
        try {
            headerJSON = JSON.parse(customPreview.header);
        }
        catch (e) {
            Common.Console.Console.instance().error('Broken formatter: header is invalid json ' + e);
            return;
        }
        this.header = this.renderJSONMLTag(headerJSON);
        if (this.header.nodeType === Node.TEXT_NODE) {
            Common.Console.Console.instance().error('Broken formatter: header should be an element node.');
            return;
        }
        if (customPreview.bodyGetterId) {
            if (this.header instanceof Element) {
                this.header.classList.add('custom-expandable-section-header');
            }
            this.header.addEventListener('click', this.onClick.bind(this), false);
            this.expandIcon = IconButton.Icon.create('triangle-right', 'custom-expand-icon');
            this.header.insertBefore(this.expandIcon, this.header.firstChild);
        }
        this.sectionElement.appendChild(this.header);
    }
    element() {
        return this.sectionElement;
    }
    renderJSONMLTag(jsonML) {
        if (!Array.isArray(jsonML)) {
            return document.createTextNode(String(jsonML));
        }
        return jsonML[0] === 'object' ? this.layoutObjectTag(jsonML) : this.renderElement(jsonML);
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderElement(object) {
        const tagName = object.shift();
        if (!ALLOWED_TAGS.includes(tagName)) {
            Common.Console.Console.instance().error('Broken formatter: element ' + tagName + ' is not allowed!');
            return document.createElement('span');
        }
        const element = document.createElement(tagName);
        if ((typeof object[0] === 'object') && !Array.isArray(object[0])) {
            const attributes = object.shift();
            for (const key in attributes) {
                const value = attributes[key];
                if ((key !== 'style') || (typeof value !== 'string')) {
                    continue;
                }
                element.setAttribute(key, value);
            }
        }
        this.appendJsonMLTags(element, object);
        return element;
    }
    layoutObjectTag(objectTag) {
        objectTag.shift();
        const attributes = objectTag.shift();
        const remoteObject = this.object.runtimeModel().createRemoteObject(attributes);
        if (remoteObject.customPreview()) {
            return (new CustomPreviewSection(remoteObject)).element();
        }
        const sectionElement = ObjectPropertiesSection.defaultObjectPresentation(remoteObject);
        sectionElement.classList.toggle('custom-expandable-section-standard-section', remoteObject.hasChildren);
        return sectionElement;
    }
    appendJsonMLTags(parentElement, jsonMLTags) {
        for (let i = 0; i < jsonMLTags.length; ++i) {
            parentElement.appendChild(this.renderJSONMLTag(jsonMLTags[i]));
        }
    }
    onClick(event) {
        event.consume(true);
        if (this.cachedContent) {
            this.toggleExpand();
        }
        else {
            void this.loadBody();
        }
    }
    toggleExpand() {
        this.expanded = !this.expanded;
        if (this.header instanceof Element) {
            this.header.classList.toggle('expanded', this.expanded);
        }
        if (this.cachedContent instanceof Element) {
            this.cachedContent.classList.toggle('hidden', !this.expanded);
        }
        if (this.expandIcon) {
            if (this.expanded) {
                this.expandIcon.name = 'triangle-down';
            }
            else {
                this.expandIcon.name = 'triangle-right';
            }
        }
    }
    defaultBodyTreeOutline;
    async loadBody() {
        const customPreview = this.object.customPreview();
        if (!customPreview) {
            return;
        }
        if (customPreview.bodyGetterId) {
            const bodyJsonML = await this.object.callFunctionJSON(bodyGetter => bodyGetter(), [{ objectId: customPreview.bodyGetterId }]);
            if (bodyJsonML === null) {
                // Per https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html#custom-formatter-structure
                // we are supposed to fall back to the default format when the `body()` callback returns `null`.
                this.defaultBodyTreeOutline = new ObjectPropertiesSectionsTreeOutline({ readOnly: true });
                this.defaultBodyTreeOutline.setShowSelectionOnKeyboardFocus(/* show */ true, /* preventTabOrder */ false);
                this.defaultBodyTreeOutline.element.classList.add('custom-expandable-section-default-body');
                void ObjectPropertyTreeElement.populate(this.defaultBodyTreeOutline.rootElement(), new ObjectTree(this.object), false, false);
                this.cachedContent = this.defaultBodyTreeOutline.element;
            }
            else {
                this.cachedContent = this.renderJSONMLTag(bodyJsonML);
            }
            this.sectionElement.appendChild(this.cachedContent);
            this.toggleExpand();
        }
    }
}
const ALLOWED_TAGS = ['span', 'div', 'ol', 'li', 'table', 'tr', 'td'];
export class CustomPreviewComponent {
    object;
    customPreviewSection;
    element;
    constructor(object) {
        this.object = object;
        this.customPreviewSection = new CustomPreviewSection(object);
        this.element = document.createElement('span');
        this.element.classList.add('source-code');
        const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(this.element, { cssFile: customPreviewComponentStyles });
        this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
        shadowRoot.appendChild(this.customPreviewSection.element());
    }
    expandIfPossible() {
        const customPreview = this.object.customPreview();
        if (customPreview && customPreview.bodyGetterId && this.customPreviewSection) {
            void this.customPreviewSection.loadBody();
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
            this.element.shadowRoot.textContent = '';
            this.customPreviewSection = null;
            this.element.shadowRoot.appendChild(ObjectPropertiesSection.defaultObjectPresentation(this.object));
        }
    }
}
//# sourceMappingURL=CustomPreviewComponent.js.map