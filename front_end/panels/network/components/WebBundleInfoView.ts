// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
  *@description Header for the column that contains URL of the resource in a web bundle.
  */
  bundledResource: 'Bundled resource',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/WebBundleInfoView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class WebBundleInfoView extends UI.Widget.VBox {
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    const webBundleInfo = request.webBundleInfo();
    if (!webBundleInfo) {
      throw new Error('Trying to render a Web Bundle info without providing data');
    }

    const webBundleInfoElement = new WebBundleInfoElement(webBundleInfo, request.parsedURL.lastPathComponent);
    this.contentElement.appendChild(webBundleInfoElement);
    webBundleInfoElement.render();
  }
}

export class WebBundleInfoElement extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private webBundleInfo: Readonly<SDK.NetworkRequest.WebBundleInfo>;
  private webBundleName: Readonly<string>;
  constructor(webBundleInfo: SDK.NetworkRequest.WebBundleInfo, webBundleName: string) {
    super();
    this.webBundleInfo = webBundleInfo;
    this.webBundleName = webBundleName;
  }

  render(): void {
    const rows = this.webBundleInfo.resourceUrls?.map(url => {
      return {
        cells: [
          {
            columnId: 'url',
            value: url,
          },
        ],
      };
    });
    render(
        html`
      <style>
        :host {
          --icon-padding: 4px;
        }

        .header {
          display: flex;
          font-weight: bold;
          padding: calc(2 * var(--icon-padding)) var(--icon-padding);
        }

        .icon {
          margin: 0 var(--icon-padding);
        }

      </style>
      <div class="header">
        <${IconButton.Icon.Icon.litTagName} class="icon"
          .data=${{color: '', iconName: 'resourceWebBundle', width: '16px'} as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
        <span>${this.webBundleName}</span>
        <x-link href="https://web.dev/web-bundles/#explaining-web-bundles">
          <${IconButton.Icon.Icon.litTagName} class="icon"
            .data=${
            {color: 'var(--color-text-secondary)', iconName: 'help_outline', width: '16px'} as
            IconButton.Icon.IconData}>
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
        this.shadow);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-web-bundle-info', WebBundleInfoElement);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-web-bundle-info': WebBundleInfoElement;
  }
}
