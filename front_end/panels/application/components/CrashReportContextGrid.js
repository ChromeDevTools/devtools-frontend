// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
const UIStrings = {
    /**
     * @description Text in Crash Report Context Items View of the Application panel
     */
    key: 'Key',
    /**
     * @description Text in Crash Report Context Items View of the Application panel
     */
    value: 'Value',
    /**
     * @description Context menu item to copy the key of a context entry
     */
    copyKey: 'Copy key',
    /**
     * @description Context menu item to copy the value of a context entry
     */
    copyValue: 'Copy value',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/CrashReportContextGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
      <style>
        :host {
          display: block;
        }

        div {
          overflow: auto;
        }

        td {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <style>${UI.inspectorCommonStyles}</style>
      <div>
        <devtools-data-grid striped inline>
          <table>
            <thead>
              <tr>
                <th id="key" weight="50">${i18nString(UIStrings.key)}</th>
                <th id="value" weight="50">${i18nString(UIStrings.value)}</th>
              </tr>
            </thead>
            <tbody>
              ${input.entries.map(entry => html `
                <tr class=${input.selectedKey === entry.key ? 'selected' : ''}
                    @select=${() => input.onSelect(entry.key)}
                    @contextmenu=${(e) => input.onContextMenu(e, entry.key, entry.value)}>
                  <td title=${entry.key}>${entry.key}</td>
                  <td title=${entry.value}>${entry.value}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
      </div>
    `, target);
    // clang-format on
};
export class CrashReportContextGrid extends UI.Widget.Widget {
    #entries = [];
    #filteredEntries = [];
    #selectedKey;
    #filters = [];
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set data(data) {
        this.#entries = data.entries;
        this.#selectedKey = data.selectedKey;
        this.#filters = data.filters || [];
        this.requestUpdate();
    }
    #computeFilteredEntries() {
        if (this.#filters.length === 0) {
            this.#filteredEntries = this.#entries;
            return;
        }
        this.#filteredEntries = this.#entries.filter(entry => {
            return this.#filters.every(filter => {
                const regex = filter.regex;
                if (!regex) {
                    return true;
                }
                const matches = regex.test(entry.key) || regex.test(entry.value);
                return filter.negative ? !matches : matches;
            });
        });
    }
    #onContextMenu(e, key, value) {
        const customEvent = e;
        const contextMenu = customEvent.detail;
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyKey), () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(key);
        }, { jslogContext: 'copy-key' });
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyValue), () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(value);
        }, { jslogContext: 'copy-value' });
    }
    performUpdate() {
        this.#computeFilteredEntries();
        this.#view({
            entries: this.#filteredEntries,
            selectedKey: this.#selectedKey,
            onSelect: (key) => this.element.dispatchEvent(new CustomEvent('select', { detail: key })),
            onContextMenu: (e, key, value) => this.#onContextMenu(e, key, value),
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CrashReportContextGrid.js.map