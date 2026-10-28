// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Foundation from '../../foundation/foundation.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import {ScreencastView} from './ScreencastView.js';

const {html, nothing, render} = Lit;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over the toggle screencast button in the Screencast app of the Remote devices tab when toggling screencast.
   */
  toggleScreencast: 'Toggle screencast',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/screencast/ScreencastApp.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let appInstance: ScreencastApp;

export interface ViewInput {
  screencastEnabled: boolean;
  screenCaptureModel?: SDK.ScreenCaptureModel.ScreenCaptureModel;
}

export type ViewOutput = unknown;
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${UI.inspectorCommonStyles}</style>
    <devtools-split-view
      direction="column"
      sidebar-position="second"
      name="inspector-view.screencast-split-view-state"
      sidebar-initial-size="300"
      show=${input.screencastEnabled ? 'both' : 'sidebar'}
    >
      ${input.screenCaptureModel ? html`
        <devtools-widget
          slot="main"
          ${widget(ScreencastView, {screenCaptureModel: input.screenCaptureModel})}
        ></devtools-widget>
      ` : nothing}
      <devtools-widget
        slot="sidebar"
        ${widget(e => UI.InspectorView.InspectorView.instance({element: e}))}
      ></devtools-widget>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class ScreencastApp implements UI.App.App,
                                      SDK.TargetManager.SDKModelObserver<SDK.ScreenCaptureModel.ScreenCaptureModel> {
  readonly #universe: Foundation.Universe.Universe;
  readonly #view: View;
  readonly #enabledSetting: Common.Settings.Setting<boolean>;
  readonly #toggleButton: UI.Toolbar.ToolbarToggle;
  #screenCaptureModel?: SDK.ScreenCaptureModel.ScreenCaptureModel;
  #rootView?: UI.RootView.RootView;

  constructor(universe: Foundation.Universe.Universe, view: View = DEFAULT_VIEW) {
    this.#universe = universe;
    this.#view = view;
    this.#enabledSetting = Common.Settings.Settings.instance().createSetting('screencast-enabled', true);
    this.#toggleButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleScreencast), 'devices');
    this.#toggleButton.setToggled(this.#enabledSetting.get());
    this.#toggleButton.setEnabled(false);
    this.#toggleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.#toggleButtonClicked, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ScreenCaptureModel.ScreenCaptureModel, this);
  }

  static instance(universe?: Foundation.Universe.Universe): ScreencastApp {
    if (!appInstance) {
      if (!universe) {
        throw new Error('ScreencastApp.instance() requires a Universe on initial instantiation');
      }
      appInstance = new ScreencastApp(universe);
    }
    return appInstance;
  }

  get toggleButton(): UI.Toolbar.ToolbarToggle {
    return this.#toggleButton;
  }

  get rootView(): UI.RootView.RootView|undefined {
    return this.#rootView;
  }

  presentUI(document: Document): void {
    this.#rootView = new UI.RootView.RootView(this.#universe);
    this.performUpdate();
    this.#rootView.attachToDocument(document);
    this.#rootView.focus();
  }

  modelAdded(screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel): void {
    if (screenCaptureModel.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#screenCaptureModel = screenCaptureModel;
    this.performUpdate();
  }

  modelRemoved(screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel): void {
    if (this.#screenCaptureModel !== screenCaptureModel) {
      return;
    }
    this.#screenCaptureModel = undefined;
    this.performUpdate();
  }

  #toggleButtonClicked(): void {
    const enabled = this.#toggleButton.isToggled();
    this.#enabledSetting.set(enabled);
    this.performUpdate();
  }

  performUpdate(): void {
    const hasModel = Boolean(this.#screenCaptureModel);
    const screencastEnabled = Boolean(this.#enabledSetting.get() && hasModel);
    this.#toggleButton.setEnabled(hasModel);
    this.#toggleButton.setToggled(screencastEnabled);
    if (this.#rootView) {
      this.#view({
        screencastEnabled,
        screenCaptureModel: this.#screenCaptureModel,
      },
                 undefined, this.#rootView.contentElement);
    }
  }
}

let toolbarButtonProviderInstance: ToolbarButtonProvider;

export class ToolbarButtonProvider implements UI.Toolbar.Provider {
  static instance(opts: {forceNew: boolean} = {forceNew: false}): ToolbarButtonProvider {
    const {forceNew} = opts;
    if (!toolbarButtonProviderInstance || forceNew) {
      toolbarButtonProviderInstance = new ToolbarButtonProvider();
    }

    return toolbarButtonProviderInstance;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return ScreencastApp.instance().toggleButton;
  }
}

let screencastAppProviderInstance: ScreencastAppProvider;

export class ScreencastAppProvider implements UI.AppProvider.AppProvider {
  static instance(opts: {forceNew: boolean} = {forceNew: false}): ScreencastAppProvider {
    const {forceNew} = opts;
    if (!screencastAppProviderInstance || forceNew) {
      screencastAppProviderInstance = new ScreencastAppProvider();
    }

    return screencastAppProviderInstance;
  }

  createApp(universe: Foundation.Universe.Universe): UI.App.App {
    return ScreencastApp.instance(universe);
  }
}
