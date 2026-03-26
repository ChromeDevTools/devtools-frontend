// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';
import '../../ui/legacy/legacy.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {
  html,
  render,
} from '../../ui/lit/lit.js';

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
  noToolsPlaceholder:
      'Registered `WebMCP` tools for this page will appear here. No tools have been registered or detected yet.',
  /**
   * @description Title of text to display when no calls have been made
   */
  noCallsPlaceholderTitle: 'Tool Activity',
  /**
   * @description Text to display when no calls have been made
   */
  noCallsPlaceholder: 'Start interacting with your `WebMCP` agent to see real-time tool calls and executions here.'
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type View = (input: object, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <style>${webMCPViewStyles}</style>
    <devtools-split-view class="webmcp-view" direction="row" sidebar-position="second" name="webmcp-split-view">
      <div slot="main" class="call-log">
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noCallsPlaceholderTitle),
                                                        text: i18nString(UIStrings.noCallsPlaceholder)})}
      </div>
      <div slot="sidebar" class="tool-list">
        <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noToolsPlaceholderTitle),
                                                        text: i18nString(UIStrings.noToolsPlaceholder)})}
      </div>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class WebMCPView extends UI.Widget.VBox {
  readonly #view: View;

  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super();
    this.#view = view;
    SDK.TargetManager.TargetManager.instance().observeModels(
        SDK.WebMCPModel.WebMCPModel, {
          modelAdded: (model: SDK.WebMCPModel.WebMCPModel) => this.#webMCPModelAdded(model),
          modelRemoved: (model: SDK.WebMCPModel.WebMCPModel) => this.#webMCPModelRemoved(model),
        },
        {scoped: true});
    this.requestUpdate();
  }

  #webMCPModelAdded(model: SDK.WebMCPModel.WebMCPModel): void {
    model.addEventListener(SDK.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.addEventListener(SDK.WebMCPModel.Events.TOOLS_REMOVED, this.requestUpdate, this);
  }

  #webMCPModelRemoved(model: SDK.WebMCPModel.WebMCPModel): void {
    model.removeEventListener(SDK.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.removeEventListener(SDK.WebMCPModel.Events.TOOLS_REMOVED, this.requestUpdate, this);
  }

  override performUpdate(): void {
    this.#view({}, {}, this.contentElement);
  }
}
