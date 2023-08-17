// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import {PanelUtils} from '../../../panels/utils/utils.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import webBundleInfoViewStyles from './WebBundleInfoView.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
   *@description Header for the column that contains URL of the resource in a web bundle.
   */
  bundledResource: 'Bundled resource',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/WebBundleInfoView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WebBundleInfoView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-web-bundle-info`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #webBundleInfo: Readonly<SDK.NetworkRequest.WebBundleInfo>;
  #webBundleName: Readonly<string>;
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    const webBundleInfo = request.webBundleInfo();
    if (!webBundleInfo) {
      throw new Error('Trying to render a Web Bundle info without providing data');
    }

    this.#webBundleInfo = webBundleInfo;
    this.#webBundleName = request.parsedURL.lastPathComponent;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [webBundleInfoViewStyles];
  }

  override async render(): Promise<void> {
    const rows = this.#webBundleInfo.resourceUrls?.map(url => {
      const mimeType = Common.ResourceType.ResourceType.mimeFromURL(url) || null;
      const resourceType = Common.ResourceType.ResourceType.fromMimeTypeOverride(mimeType) ||
          Common.ResourceType.ResourceType.fromMimeType(mimeType);
      const iconData = PanelUtils.iconDataForResourceType(resourceType);
      return {
        cells: [
          {
            columnId: 'url',
            value: null,
            renderer(): LitHtml.TemplateResult {
              return html`
                <div style="display: flex;">
                  <${IconButton.Icon.Icon.litTagName} class="icon"
                    .data=${{...iconData, width: '20px'} as IconButton.Icon.IconData}>
                  </${IconButton.Icon.Icon.litTagName}>
                  <span>${url}</span>
                </div>`;
            },
          },
        ],
      };
    });
    render(
        html`
      <div class="header">
        <${IconButton.Icon.Icon.litTagName} class="icon"
          .data=${{color: 'var(--icon-default)', iconName: 'bundle', width: '20px'} as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
        <span>${this.#webBundleName}</span>
        <x-link href="https://web.dev/web-bundles/#explaining-web-bundles">
          <${IconButton.Icon.Icon.litTagName} class="icon"
            .data=${{color: 'var(--icon-default)', iconName: 'help', width: '16px'} as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}>
        </x-link>
      </div>
      <div>
        <${DataGrid.DataGrid.DataGrid.litTagName}
          .data=${{
          columns: [
            {
              id: 'url',
              title: i18nString(UIStrings.bundledResource),
              widthWeighting: 1,
              visible: true,
              hideable: false,
            },
          ],
          rows: rows,
          activeSort: null,
        } as DataGrid.DataGrid.DataGridData}>
        </${DataGrid.DataGrid.DataGrid.litTagName}>
      </div>`,
        this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-web-bundle-info', WebBundleInfoView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-web-bundle-info': WebBundleInfoView;
  }
}
