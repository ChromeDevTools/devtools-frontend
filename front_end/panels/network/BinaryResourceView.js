// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import binaryResourceViewStyles from './binaryResourceView.css.js';
const UIStrings = {
    /**
     * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
     * message after the current text has been copied to the clipboard. Base64 is a format for encoding
     * data.
     */
    copiedAsBase: 'Copied as `Base64`',
    /**
     * @description Text in Binary Resource View of the Network panel
     */
    hexViewer: '`Hex` Viewer',
    /**
     * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
     * message after the current text has been copied to the clipboard. Hex is short for hexadecimal,
     * and is a format for encoding data.
     */
    copiedAsHex: 'Copied as `Hex`',
    /**
     * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
     * message after the current text has been copied to the clipboard. UTF-8 is a format for encoding data.
     */
    copiedAsUtf: 'Copied as `UTF-8`',
    /**
     * @description Screen reader label for a select box that chooses how to display binary data in the Network panel
     */
    binaryViewType: 'Binary view type',
    /**
     * @description Tooltip text that appears when hovering over the largeicon copy button in the Binary Resource View of the Network panel
     */
    copyToClipboard: 'Copy to clipboard',
    /**
     * @description A context menu command in the Binary Resource View of the Network panel, for
     * copying to the clipboard. Base64 is a format for encoding data.
     */
    copyAsBase: 'Copy as `Base64`',
    /**
     * @description A context menu command in the Binary Resource View of the Network panel, for copying
     * to the clipboard. Hex is short for hexadecimal, and is a format for encoding data.
     */
    copyAsHex: 'Copy as `Hex`',
    /**
     * @description A context menu command in the Binary Resource View of the Network panel, for copying
     *to the clipboard. UTF-8 is a format for encoding data.
     */
    copyAsUtf: 'Copy as `UTF-8`',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/BinaryResourceView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BinaryResourceView extends UI.Widget.VBox {
    binaryResourceViewFactory;
    toolbar;
    binaryViewObjects;
    binaryViewTypeSetting;
    binaryViewTypeCombobox;
    copiedText;
    addFadeoutSettimeoutId;
    lastView;
    constructor(content, contentUrl, resourceType, element) {
        super(element);
        this.registerRequiredCSS(binaryResourceViewStyles);
        this.binaryResourceViewFactory =
            new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(content, contentUrl, resourceType);
        this.toolbar = this.element.createChild('devtools-toolbar', 'binary-view-toolbar');
        this.binaryViewObjects = [
            new BinaryViewObject('base64', i18n.i18n.lockedString('Base64'), i18nString(UIStrings.copiedAsBase), this.binaryResourceViewFactory.createBase64View.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.base64.bind(this.binaryResourceViewFactory)),
            new BinaryViewObject('hex', i18nString(UIStrings.hexViewer), i18nString(UIStrings.copiedAsHex), this.binaryResourceViewFactory.createHexView.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.hex.bind(this.binaryResourceViewFactory)),
            new BinaryViewObject('utf8', i18n.i18n.lockedString('UTF-8'), i18nString(UIStrings.copiedAsUtf), this.binaryResourceViewFactory.createUtf8View.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.utf8.bind(this.binaryResourceViewFactory)),
        ];
        this.binaryViewTypeSetting = Common.Settings.Settings.instance().createSetting('binary-view-type', 'hex');
        this.binaryViewTypeCombobox =
            new UI.Toolbar.ToolbarComboBox(this.binaryViewTypeChanged.bind(this), i18nString(UIStrings.binaryViewType));
        for (const viewObject of this.binaryViewObjects) {
            this.binaryViewTypeCombobox.addOption(this.binaryViewTypeCombobox.createOption(viewObject.label, viewObject.type));
        }
        this.toolbar.appendToolbarItem(this.binaryViewTypeCombobox);
        const copyButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.copyToClipboard), 'copy');
        copyButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, _event => {
            this.copySelectedViewToClipboard();
        }, this);
        this.toolbar.appendToolbarItem(copyButton);
        this.copiedText = new UI.Toolbar.ToolbarText();
        this.copiedText.element.classList.add('binary-view-copied-text');
        this.toolbar.appendChild(this.copiedText.element);
        this.addFadeoutSettimeoutId = null;
        this.lastView = null;
        this.updateView();
    }
    getCurrentViewObject() {
        const filter = (obj) => obj.type === this.binaryViewTypeSetting.get();
        const binaryViewObject = this.binaryViewObjects.find(filter);
        console.assert(Boolean(binaryViewObject), `No binary view found for binary view type found in setting 'binary-view-type': ${this.binaryViewTypeSetting.get()}`);
        return binaryViewObject || null;
    }
    copySelectedViewToClipboard() {
        const viewObject = this.getCurrentViewObject();
        if (!viewObject) {
            return;
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(viewObject.content());
        this.copiedText.setText(viewObject.copiedMessage);
        this.copiedText.element.classList.remove('fadeout');
        function addFadeoutClass() {
            this.copiedText.element.classList.add('fadeout');
        }
        if (this.addFadeoutSettimeoutId) {
            clearTimeout(this.addFadeoutSettimeoutId);
            this.addFadeoutSettimeoutId = null;
        }
        this.addFadeoutSettimeoutId = window.setTimeout(addFadeoutClass.bind(this), 2000);
    }
    updateView() {
        const newViewObject = this.getCurrentViewObject();
        if (!newViewObject) {
            return;
        }
        const newView = newViewObject.getView();
        if (newView === this.lastView) {
            return;
        }
        if (this.lastView) {
            this.lastView.detach();
        }
        this.lastView = newView;
        newView.show(this.element, this.toolbar);
        this.binaryViewTypeCombobox.element.value = this.binaryViewTypeSetting.get();
    }
    binaryViewTypeChanged() {
        const selectedOption = (this.binaryViewTypeCombobox.selectedOption());
        if (!selectedOption) {
            return;
        }
        const newViewType = selectedOption.value;
        if (this.binaryViewTypeSetting.get() === newViewType) {
            return;
        }
        this.binaryViewTypeSetting.set(newViewType);
        this.updateView();
    }
    addCopyToContextMenu(contextMenu, submenuItemText) {
        const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(submenuItemText, false, 'copy');
        const footerSection = copyMenu.footerSection();
        footerSection.appendItem(i18nString(UIStrings.copyAsBase), async () => {
            const content = this.binaryResourceViewFactory.base64();
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
        }, { jslogContext: 'copy-as-base' });
        footerSection.appendItem(i18nString(UIStrings.copyAsHex), async () => {
            const content = await this.binaryResourceViewFactory.hex();
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
        }, { jslogContext: 'copy-as-hex' });
        footerSection.appendItem(i18nString(UIStrings.copyAsUtf), async () => {
            const content = await this.binaryResourceViewFactory.utf8();
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
        }, { jslogContext: 'copy-as-utf' });
    }
}
export class BinaryViewObject {
    type;
    label;
    copiedMessage;
    content;
    createViewFn;
    view;
    constructor(type, label, copiedMessage, createViewFn, content) {
        this.type = type;
        this.label = label;
        this.copiedMessage = copiedMessage;
        this.content = content;
        this.createViewFn = createViewFn;
        this.view = null;
    }
    getView() {
        if (!this.view) {
            this.view = this.createViewFn();
        }
        return this.view;
    }
}
//# sourceMappingURL=BinaryResourceView.js.map