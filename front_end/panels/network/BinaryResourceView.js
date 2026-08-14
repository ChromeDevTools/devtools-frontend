// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import binaryResourceViewStyles from './binaryResourceView.css.js';
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Text in binary resource view of the Network panel. Shown to the user as a status
     * message after the current text has been copied to the clipboard. Base64 is a format for encoding
     * data.
     */
    copiedAsBase: 'Copied as `Base64`',
    /**
     * @description Option label in binary resource view of the Network panel to view data in hexadecimal (Hex) format.
     */
    hexViewer: '`Hex` viewer',
    /**
     * @description Status message in binary resource view of the Network panel after copying text in hexadecimal (Hex) format. Hex is short for hexadecimal.
     */
    copiedAsHex: 'Copied as `Hex`',
    /**
     * @description Text in binary resource view of the Network panel. Shown to the user as a status
     * message after the current text has been copied to the clipboard. UTF-8 is a format for encoding data.
     */
    copiedAsUtf: 'Copied as `UTF-8`',
    /**
     * @description Screen reader label for a select box that chooses how to display binary data in the Network panel.
     */
    binaryViewType: 'Binary view type',
    /**
     * @description Tooltip text that appears when hovering over the largeicon copy button in the binary resource view of the Network panel.
     */
    copyToClipboard: 'Copy to clipboard',
    /**
     * @description A context menu command in the binary resource view of the Network panel, for
     * copying to the clipboard. Base64 is a format for encoding data.
     */
    copyAsBase: 'Copy as `Base64`',
    /**
     * @description A context menu command in the binary resource view of the Network panel, for copying
     * to the clipboard in hexadecimal (Hex) format. Hex is short for hexadecimal.
     */
    copyAsHex: 'Copy as `Hex`',
    /**
     * @description A context menu command in the binary resource view of the Network panel, for copying
     * to the clipboard. UTF-8 is a format for encoding data.
     */
    copyAsUtf: 'Copy as `UTF-8`',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/BinaryResourceView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const defaultView = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${binaryResourceViewStyles}</style>
    <div class="vbox flex-auto">
      ${input.binaryViewObjects.map(obj => obj.type === input.binaryViewTypeSetting.get() ? html `
          <devtools-widget
            class="widget vbox flex-auto"
            ${widget((e) => {
        const factory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(input.content, input.contentUrl, input.resourceType);
        let view;
        switch (obj.type) {
            case 'base64':
                view = factory.createBase64View(e);
                break;
            case 'hex':
                view = factory.createHexView(e);
                break;
            case 'utf8':
                view = factory.createUtf8View(e);
                break;
            default:
                throw new Error('Unsupported view type');
        }
        if ('setPositionPercentage' in view) {
            view.setPositionPercentage(input.activePositionPercentage);
        }
        return view;
    })}>
          </devtools-widget>
        ` : nothing)}
      <devtools-toolbar class="binary-view-toolbar">
          <select class="toolbar-item" title=${i18nString(UIStrings.binaryViewType)}
              aria-label=${i18nString(UIStrings.binaryViewType)}
              @change=${input.binaryViewTypeChanged}>
            ${input.binaryViewObjects.map(viewObject => html `
              <option value=${viewObject.type}
                  ?selected=${viewObject.type === input.binaryViewTypeSetting.get()}
                  jslog=${VisualLogging.item(viewObject.type).track({ click: true })}>${viewObject.label}</option>
            `)}
          </select>
        <devtools-button class="toolbar-button toolbar-item" title=${i18nString(UIStrings.copyToClipboard)}
            @click=${input.copySelectedViewToClipboard}
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        iconName: 'copy',
        jslogContext: 'copy',
    }}></devtools-button>
        ${input.copiedText.element}
      </devtools-toolbar>
    </div>
  `, target);
    // clang-format on
};
export class BinaryResourceView extends UI.Widget.VBox {
    activePositionPercentage = 0;
    binaryResourceViewFactory;
    streamingContent;
    contentUrl;
    resourceType;
    binaryViewObjects;
    binaryViewTypeSetting;
    copiedText;
    addFadeoutSettimeoutId;
    litContainer;
    #view = defaultView;
    constructor(content, contentUrl, resourceType, element) {
        super(element);
        this.registerRequiredCSS(binaryResourceViewStyles);
        this.streamingContent = content;
        this.contentUrl = contentUrl;
        this.resourceType = resourceType;
        this.binaryResourceViewFactory =
            new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(content, contentUrl, resourceType);
        this.binaryViewObjects = [
            new BinaryViewObject('base64', i18n.i18n.lockedString('Base64'), i18nString(UIStrings.copiedAsBase), this.binaryResourceViewFactory.base64.bind(this.binaryResourceViewFactory)),
            new BinaryViewObject('hex', i18nString(UIStrings.hexViewer), i18nString(UIStrings.copiedAsHex), this.binaryResourceViewFactory.hex.bind(this.binaryResourceViewFactory)),
            new BinaryViewObject('utf8', i18n.i18n.lockedString('UTF-8'), i18nString(UIStrings.copiedAsUtf), this.binaryResourceViewFactory.utf8.bind(this.binaryResourceViewFactory)),
        ];
        this.binaryViewTypeSetting = Common.Settings.Settings.instance().createSetting('binary-view-type', 'hex');
        this.copiedText = new UI.Toolbar.ToolbarText();
        this.copiedText.element.classList.add('binary-view-copied-text');
        this.addFadeoutSettimeoutId = null;
        this.litContainer = this.element.createChild('div', 'vbox flex-auto');
        this.performUpdate();
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
        const addFadeoutClass = () => {
            this.copiedText.element.classList.add('fadeout');
        };
        if (this.addFadeoutSettimeoutId) {
            clearTimeout(this.addFadeoutSettimeoutId);
            this.addFadeoutSettimeoutId = null;
        }
        this.addFadeoutSettimeoutId = window.setTimeout(addFadeoutClass, 2000);
    }
    performUpdate() {
        const viewInput = {
            activePositionPercentage: this.activePositionPercentage,
            content: this.streamingContent,
            contentUrl: this.contentUrl,
            resourceType: this.resourceType,
            binaryViewObjects: this.binaryViewObjects,
            binaryViewTypeSetting: this.binaryViewTypeSetting,
            binaryViewTypeChanged: this.binaryViewTypeChanged.bind(this),
            copySelectedViewToClipboard: this.copySelectedViewToClipboard.bind(this),
            copiedText: this.copiedText,
        };
        this.#view(viewInput, undefined, this.litContainer);
    }
    binaryViewTypeChanged(event) {
        const newViewType = event.target.value;
        if (this.binaryViewTypeSetting.get() === newViewType) {
            return;
        }
        const currentViewWidget = this.litContainer.querySelector('devtools-widget');
        if (currentViewWidget) {
            const view = UI.Widget.Widget.get(currentViewWidget);
            if (view && 'getPositionPercentage' in view) {
                this.activePositionPercentage = view.getPositionPercentage();
            }
        }
        this.binaryViewTypeSetting.set(newViewType);
        this.performUpdate();
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
    constructor(type, label, copiedMessage, content) {
        this.type = type;
        this.label = label;
        this.copiedMessage = copiedMessage;
        this.content = content;
    }
}
//# sourceMappingURL=BinaryResourceView.js.map