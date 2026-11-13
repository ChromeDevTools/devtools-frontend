// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as LinearMemoryInspectorComponents from '../linear_memory_inspector/components/components.js';

import binaryResourceViewStyles from './binaryResourceView.css.js';

const {widget} = UI.Widget;
const {classMap} = Directives;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/BinaryResourceView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  binaryViewObjects: BinaryViewObject[];
  content: TextUtils.StreamingContentData.StreamingContentData;
  contentUrl: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
  memory: Uint8Array<ArrayBuffer>;
  address: number;
  activePositionPercentage: number;
  binaryViewType: string;
  copiedText: string;
  copiedTextFadeout: boolean;
  onAddressChanged: (address: number) => void;
  binaryViewTypeChanged: (event: Event) => void;
  copySelectedViewToClipboard: () => void;
}
export interface ViewOutput {
  activeView?: SourceFrame.ResourceSourceFrame.ResourceSourceFrame;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <style>${binaryResourceViewStyles}</style>
    <div class="vbox flex-auto">
      ${input.binaryViewObjects.map(
        obj => obj.type !== input.binaryViewType ? nothing : obj.type === 'hex' ? html`
          ${widget(LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector, {
            memory: input.memory.length > 0 ? input.memory : new Uint8Array([0]),
            address: input.address,
            memoryOffset: 0,
            outerMemoryLength: input.memory.length > 0 ? input.memory.length : 1,
            hideValueInspector: true,
            onAddressChanged: input.onAddressChanged,
          })}
        ` : html`
          <devtools-widget
            class="widget vbox flex-auto"
            ${widget((e: HTMLElement) => {
              const factory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(
                  input.content, input.contentUrl, input.resourceType);
              let view: SourceFrame.ResourceSourceFrame.ResourceSourceFrame;
              switch (obj.type) {
                case 'base64':
                  view = factory.createBase64View(e);
                  break;
                case 'utf8':
                  view = factory.createUtf8View(e);
                  break;
                default:
                  throw new Error('Unsupported view type');
              }
              view.setPositionPercentage(input.activePositionPercentage);
              output.activeView = view;
              return view;
            })}>
          </devtools-widget>
        `,
      )}
      <devtools-toolbar class="binary-view-toolbar">
          <select class="toolbar-item" title=${i18nString(UIStrings.binaryViewType)}
              aria-label=${i18nString(UIStrings.binaryViewType)}
              @change=${input.binaryViewTypeChanged}>
            ${input.binaryViewObjects.map(viewObject => html`
              <option value=${viewObject.type}
                  .selected=${viewObject.type === input.binaryViewType}
                  jslog=${VisualLogging.item(viewObject.type).track({click: true})}>${viewObject.label}</option>
            `)}
          </select>
        <devtools-button class="toolbar-button toolbar-item" title=${i18nString(UIStrings.copyToClipboard)}
            @click=${input.copySelectedViewToClipboard}
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              iconName: 'copy',
              jslogContext: 'copy',
            } as Buttons.Button.ButtonData}></devtools-button>
        <div class=${classMap({
          'toolbar-text': true,
          'binary-view-copied-text': true,
          fadeout: input.copiedTextFadeout,
        })}>${input.copiedText}</div>
      </devtools-toolbar>
    </div>
  `, target);
  // clang-format on
};

export class BinaryResourceView extends UI.Widget.VBox {
  private activePositionPercentage = 0;
  private readonly binaryResourceViewFactory: SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory;
  private readonly streamingContent: TextUtils.StreamingContentData.StreamingContentData;
  private readonly contentUrl: Platform.DevToolsPath.UrlString;
  private readonly resourceType: Common.ResourceType.ResourceType;
  private readonly binaryViewObjects: BinaryViewObject[];
  private binaryViewTypeSetting: Common.Settings.Setting<string>;
  #memory: Uint8Array<ArrayBuffer> = new Uint8Array();
  #address = 0;
  #copiedText = '';
  #copiedTextFadeout = false;
  #fadeoutTimeoutId: number|null = null;
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};

  constructor(content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString,
              resourceType: Common.ResourceType.ResourceType, element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;

    this.streamingContent = content;
    this.contentUrl = contentUrl;
    this.resourceType = resourceType;

    this.binaryResourceViewFactory =
        new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(content, contentUrl, resourceType);

    this.binaryViewObjects = [
      new BinaryViewObject(
          'base64', i18n.i18n.lockedString('Base64'), i18nString(UIStrings.copiedAsBase),
          this.binaryResourceViewFactory.base64.bind(this.binaryResourceViewFactory)),
      new BinaryViewObject(
          'hex', i18nString(UIStrings.hexViewer), i18nString(UIStrings.copiedAsHex),
          this.binaryResourceViewFactory.hex.bind(this.binaryResourceViewFactory)),
      new BinaryViewObject(
          'utf8', i18n.i18n.lockedString('UTF-8'), i18nString(UIStrings.copiedAsUtf),
          this.binaryResourceViewFactory.utf8.bind(this.binaryResourceViewFactory)),
    ];
    this.binaryViewTypeSetting = Common.Settings.Settings.instance().createSetting('binary-view-type', 'hex');
  }

  override wasShown(): void {
    super.wasShown();
    this.#updateMemoryFromContentData();
    this.streamingContent.addEventListener(TextUtils.StreamingContentData.Events.CHUNK_ADDED,
                                           this.#updateMemoryFromContentData, this);
  }

  override willHide(): void {
    super.willHide();
    this.streamingContent.removeEventListener(TextUtils.StreamingContentData.Events.CHUNK_ADDED,
                                              this.#updateMemoryFromContentData, this);
  }

  #updateMemoryFromContentData(): void {
    this.#memory = Common.Base64.decode(this.streamingContent.content().base64);
    this.#address =
        Math.min(Math.floor(this.#memory.length * this.activePositionPercentage), Math.max(0, this.#memory.length - 1));
    this.requestUpdate();
  }

  #onAddressChanged(address: number): void {
    if (this.#address === address) {
      return;
    }
    this.#address = address;
    this.activePositionPercentage = this.#memory.length === 0 ? 0 : this.#address / this.#memory.length;
    this.requestUpdate();
  }

  private getCurrentViewObject(): BinaryViewObject|null {
    const filter = (obj: BinaryViewObject): boolean => obj.type === this.binaryViewTypeSetting.get();
    const binaryViewObject = this.binaryViewObjects.find(filter);
    console.assert(
        Boolean(binaryViewObject),
        `No binary view found for binary view type found in setting 'binary-view-type': ${
            this.binaryViewTypeSetting.get()}`);
    return binaryViewObject || null;
  }

  copySelectedViewToClipboard(): void {
    const viewObject = this.getCurrentViewObject();
    if (!viewObject) {
      return;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(viewObject.content());
    this.#copiedText = viewObject.copiedMessage;
    this.#copiedTextFadeout = false;
    if (this.#fadeoutTimeoutId) {
      clearTimeout(this.#fadeoutTimeoutId);
    }
    this.#fadeoutTimeoutId = window.setTimeout(() => {
      this.#fadeoutTimeoutId = null;
      this.#copiedTextFadeout = true;
      this.requestUpdate();
    }, 2000);
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (this.binaryViewTypeSetting.get() === 'hex') {
      this.#viewOutput.activeView = undefined;
    }
    const viewInput: ViewInput = {
      activePositionPercentage: this.activePositionPercentage,
      content: this.streamingContent,
      contentUrl: this.contentUrl,
      resourceType: this.resourceType,
      memory: this.#memory,
      address: this.#address,
      binaryViewObjects: this.binaryViewObjects,
      binaryViewType: this.binaryViewTypeSetting.get(),
      copiedText: this.#copiedText,
      copiedTextFadeout: this.#copiedTextFadeout,
      onAddressChanged: this.#onAddressChanged.bind(this),
      binaryViewTypeChanged: this.binaryViewTypeChanged.bind(this),
      copySelectedViewToClipboard: this.copySelectedViewToClipboard.bind(this),
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }

  binaryViewTypeChanged(event: Event): void {
    const newViewType = (event.target as HTMLSelectElement).value;
    if (this.binaryViewTypeSetting.get() === newViewType) {
      return;
    }

    // Carry the reading position of the outgoing view over to the new one.
    if (this.binaryViewTypeSetting.get() === 'hex') {
      this.activePositionPercentage = this.#memory.length === 0 ? 0 : this.#address / this.#memory.length;
    } else if (this.#viewOutput.activeView) {
      this.activePositionPercentage = this.#viewOutput.activeView.getPositionPercentage();
    }
    this.#address =
        Math.min(Math.floor(this.#memory.length * this.activePositionPercentage), Math.max(0, this.#memory.length - 1));

    this.binaryViewTypeSetting.set(newViewType);
    this.requestUpdate();
  }

  addCopyToContextMenu(contextMenu: UI.ContextMenu.ContextMenu, submenuItemText: string): void {
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(submenuItemText, false, 'copy');
    const footerSection = copyMenu.footerSection();

    footerSection.appendItem(i18nString(UIStrings.copyAsBase), async () => {
      const content = this.binaryResourceViewFactory.base64();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, {jslogContext: 'copy-as-base'});
    footerSection.appendItem(i18nString(UIStrings.copyAsHex), async () => {
      const content = await this.binaryResourceViewFactory.hex();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, {jslogContext: 'copy-as-hex'});
    footerSection.appendItem(i18nString(UIStrings.copyAsUtf), async () => {
      const content = await this.binaryResourceViewFactory.utf8();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, {jslogContext: 'copy-as-utf'});
  }
}

export class BinaryViewObject {
  type: string;
  label: string;
  copiedMessage: string;
  content: () => string;

  constructor(type: string, label: string, copiedMessage: string, content: () => string) {
    this.type = type;
    this.label = label;
    this.copiedMessage = copiedMessage;
    this.content = content;
  }
}
