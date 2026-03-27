// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render, } from '../../ui/lit/lit.js';
import webMCPViewStyles from './webMCPView.css.js';
const UIStrings = {
    /**
     * @description Text for the header of the tool registry section
     */
    toolRegistry: 'Available Tools',
    /**
     * @description Title of text to display when no tools are registered
     */
    noToolsPlaceholderTitle: 'Available `WebMCP` Tools',
    /**
     * @description Text to display when no tools are registered
     */
    noToolsPlaceholder: 'Registered `WebMCP` tools for this page will appear here. No tools have been registered or detected yet.',
    /**
     * @description Title of text to display when no calls have been made
     */
    noCallsPlaceholderTitle: 'Tool Activity',
    /**
     * @description Text to display when no calls have been made
     */
    noCallsPlaceholder: 'Start interacting with your `WebMCP` agent to see real-time tool calls and executions here.'
};
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    const tools = input.tools;
    // clang-format off
    render(html `
    <style>${webMCPViewStyles}</style>
    <devtools-split-view class="webmcp-view" direction="row" sidebar-position="second" name="webmcp-split-view">
      <div slot="main" class="call-log">
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noCallsPlaceholderTitle),
        text: i18nString(UIStrings.noCallsPlaceholder) })}
      </div>
      <div slot="sidebar" class="tool-list">
        <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
        ${tools.length === 0 ? html `
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noToolsPlaceholderTitle),
        text: i18nString(UIStrings.noToolsPlaceholder) })}
        ` : html `
          <devtools-list>
            ${tools.map(tool => html `
                <div class="tool-item">
                  <div class="tool-name-container">
                    <div class="tool-name source-code">${tool.name}</div>
                  </div>
                  <div class="tool-description">${tool.description}</div>
                </div>
              `)}
          </devtools-list>
        `}
      </div>
    </devtools-split-view>
  `, target);
    // clang-format on
};
export class WebMCPView extends UI.Widget.VBox {
    #view;
    constructor(target, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebMCPModel.WebMCPModel, {
            modelAdded: (model) => this.#webMCPModelAdded(model),
            modelRemoved: (model) => this.#webMCPModelRemoved(model),
        });
        this.requestUpdate();
    }
    #webMCPModelAdded(model) {
        model.addEventListener("ToolsAdded" /* SDK.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.addEventListener("ToolsRemoved" /* SDK.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
    }
    #webMCPModelRemoved(model) {
        model.removeEventListener("ToolsAdded" /* SDK.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.removeEventListener("ToolsRemoved" /* SDK.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
    }
    performUpdate() {
        const tools = SDK.TargetManager.TargetManager.instance()
            .models(SDK.WebMCPModel.WebMCPModel)
            .flatMap(m => m.tools.toArray())
            .sort((a, b) => a.name.localeCompare(b.name));
        this.#view({
            tools,
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=WebMCPView.js.map