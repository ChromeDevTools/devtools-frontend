// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Foundation from '../../foundation/foundation.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as Lit from '../../ui/lit/lit.js';

import advancedAppStyles from './advancedApp.css.js';
import {DeviceModeView} from './DeviceModeView.js';
import {type Bounds, Events, InspectedPagePlaceholder} from './InspectedPagePlaceholder.js';

const {html, render} = Lit;
const {widget, widgetRef} = UI.Widget;

let appInstance: AdvancedApp|null = null;

export interface ViewInput {
  direction: 'row'|'column';
  sidebarPosition: 'first'|'second';
  show: UI.SplitWidget.ShowAttribute;
  /** Offsets the resizer towards the inspected page when docked to the side. */
  dockSide: UI.DockController.DockState;
  /** Makes the main tab bar header act as an additional resizer when docked to the bottom. */
  topResizerEnabled: boolean;
  /** `null` while undocked. */
  deviceModeView: DeviceModeView|null;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  let rootSplitWidget: UI.SplitWidget.SplitWidget|undefined;
  let inspectorView: UI.InspectorView.InspectorView|undefined;
  // clang-format off
  render(html`
    <style>${advancedAppStyles}</style>
    <devtools-split-view
        autofocus
        data-dock-side=${input.dockSide}
        direction=${input.direction}
        sidebar-position=${input.sidebarPosition}
        name="inspector-view.split-view-state"
        sidebar-initial-width="555"
        sidebar-initial-height="300"
        constraints-in-dip
        show=${input.show}
        ${widgetRef(UI.SplitWidget.SplitWidget, splitWidget => {
          rootSplitWidget = splitWidget;
        })}>
      <devtools-widget
          slot="main"
          ${widget(UI.Widget.WrapperWidget, {widget: input.deviceModeView})}>
      </devtools-widget>
      <devtools-widget
          slot="sidebar"
          autofocus
          ${widget(element => UI.InspectorView.InspectorView.instance({element}))}
          ${widgetRef(UI.InspectorView.InspectorView, widget => {
            inspectorView = widget;
          })}>
      </devtools-widget>
    </devtools-split-view>
  `, target);
  // clang-format on
  if (rootSplitWidget && inspectorView) {
    rootSplitWidget.toggleResizer(inspectorView.topResizerElement(), input.topResizerEnabled);
  }
};

export interface ToolboxViewInput {
  /** `null` while docked. */
  deviceModeView: DeviceModeView|null;
}

export type ToolboxView = (input: ToolboxViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_TOOLBOX_VIEW: ToolboxView = (input, _output, target) => {
  // clang-format off
  render(html`
    ${widget(UI.Widget.WrapperWidget, {widget: input.deviceModeView})}
  `, target);
  // clang-format on
};

export class AdvancedApp implements UI.App.App {
  readonly #universe: Foundation.Universe.Universe;
  readonly #view: View;
  readonly #toolboxView: ToolboxView;
  #rootView?: UI.RootView.RootView;
  #deviceModeView?: DeviceModeView;
  #inspectedPagePlaceholder?: InspectedPagePlaceholder;
  #toolboxWindow?: Window|null;
  #toolboxRootView?: UI.RootView.RootView;
  #changingDockSide = false;
  #direction: ViewInput['direction'] = 'row';
  #sidebarPosition: ViewInput['sidebarPosition'] = 'second';
  #show: UI.SplitWidget.ShowAttribute = 'both';
  #dockSide: UI.DockController.DockState = UI.DockController.DockState.BOTTOM;
  #topResizerEnabled = false;

  constructor(universe: Foundation.Universe.Universe, view: View = DEFAULT_VIEW,
              toolboxView: ToolboxView = DEFAULT_TOOLBOX_VIEW) {
    this.#universe = universe;
    this.#view = view;
    this.#toolboxView = toolboxView;
    UI.DockController.DockController.instance().addEventListener(UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED,
                                                                 this.#openToolboxWindow, this);
  }

  /**
   * Note: it's used by toolbox.ts without real type checks.
   */
  static instance(universe?: Foundation.Universe.Universe): AdvancedApp {
    if (!appInstance) {
      if (!universe) {
        throw new Error('AdvancedApp.instance() requires a Universe on initial instantiation');
      }
      appInstance = new AdvancedApp(universe);
    }
    return appInstance;
  }

  static removeInstance(): void {
    appInstance = null;
  }

  presentUI(document: Document): void {
    this.#rootView = new UI.RootView.RootView(this.#universe);

    this.#inspectedPagePlaceholder = InspectedPagePlaceholder.instance();
    this.#inspectedPagePlaceholder.addEventListener(Events.UPDATE, this.#onSetInspectedPageBounds, this);
    this.#deviceModeView = new DeviceModeView();

    UI.DockController.DockController.instance().addEventListener(UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED,
                                                                 this.#onBeforeDockSideChange, this);
    UI.DockController.DockController.instance().addEventListener(UI.DockController.Events.DOCK_SIDE_CHANGED,
                                                                 this.#onDockSideChange, this);
    UI.DockController.DockController.instance().addEventListener(UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED,
                                                                 this.#onAfterDockSideChange, this);
    this.#onDockSideChange();

    console.timeStamp('AdvancedApp.attachToBody');
    this.#rootView.attachToDocument(document);
    this.#rootView.focus();
    this.#inspectedPagePlaceholder.update();
  }

  #openToolboxWindow(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    if (event.data.to !== UI.DockController.DockState.UNDOCKED) {
      return;
    }

    if (this.#toolboxWindow) {
      return;
    }

    const url = window.location.href.replace('devtools_app.html', 'device_mode_emulation_frame.html');
    this.#toolboxWindow = window.open(url, undefined);
  }

  deviceModeEmulationFrameLoaded(toolboxDocument: Document): void {
    ThemeSupport.ThemeSupport.instance().addDocumentToTheme(toolboxDocument);
    UI.UIUtils.initializeUIUtils(toolboxDocument);
    UI.UIUtils.addPlatformClass(toolboxDocument.documentElement);
    UI.UIUtils.installComponentRootStyles(toolboxDocument.body);
    UI.ContextMenu.ContextMenu.installHandler(toolboxDocument);

    this.#toolboxRootView = new UI.RootView.RootView(this.#universe);
    this.#toolboxRootView.attachToDocument(toolboxDocument);

    this.#performUpdate();
  }

  /**
   * Renders synchronously, because the dock side change handlers measure the
   * inspected page placeholder right after changing the layout.
   */
  #performUpdate(): void {
    if (!this.#rootView || !this.#deviceModeView) {
      return;
    }
    const docked = this.#isDocked();
    const viewInput: ViewInput = {
      direction: this.#direction,
      sidebarPosition: this.#sidebarPosition,
      show: this.#show,
      dockSide: this.#dockSide,
      topResizerEnabled: this.#topResizerEnabled,
      deviceModeView: docked ? this.#deviceModeView : null,
    };
    // Render the view releasing the device mode view (`null`) before the view
    // acquiring it, so `WrapperWidget` detaches it before reparenting.
    if (docked) {
      if (this.#toolboxRootView) {
        this.#toolboxView({deviceModeView: null}, undefined, this.#toolboxRootView.contentElement);
      }
      this.#view(viewInput, undefined, this.#rootView.contentElement);
    } else {
      this.#view(viewInput, undefined, this.#rootView.contentElement);
      if (this.#toolboxRootView) {
        this.#toolboxView({deviceModeView: this.#deviceModeView}, undefined, this.#toolboxRootView.contentElement);
      }
    }
  }

  #onBeforeDockSideChange(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    if (event.data.to === UI.DockController.DockState.UNDOCKED && this.#toolboxRootView) {
      // Hide inspectorView and force layout to mimic the undocked state.
      this.#show = 'main';
      this.#performUpdate();
      this.#inspectedPagePlaceholder?.update();
    }

    this.#changingDockSide = true;
  }

  #onDockSideChange(event?: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    const toDockSide = event ? event.data.to : UI.DockController.DockController.instance().dockSide();
    if (toDockSide === undefined) {
      throw new Error('Got onDockSideChange event with unexpected undefined for dockSide()');
    }
    if (toDockSide === UI.DockController.DockState.UNDOCKED) {
      this.#updateForUndocked();
    } else if (this.#toolboxRootView && event && event.data.from === UI.DockController.DockState.UNDOCKED) {
      // Don't update yet for smooth transition.
      this.#show = 'main';
    } else {
      this.#updateForDocked(toDockSide);
    }
    this.#performUpdate();
  }

  #onAfterDockSideChange(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    // We may get here on the first dock side change while loading without BeforeDockSideChange.
    if (!this.#changingDockSide) {
      return;
    }
    if (event.data.from && event.data.from === UI.DockController.DockState.UNDOCKED) {
      this.#updateForDocked(event.data.to);
      this.#performUpdate();
    }
    this.#changingDockSide = false;
    this.#inspectedPagePlaceholder?.update();
  }

  #updateForDocked(dockSide: UI.DockController.DockState): void {
    const isVertical = dockSide === UI.DockController.DockState.RIGHT || dockSide === UI.DockController.DockState.LEFT;
    const isSidebarSecond =
        dockSide === UI.DockController.DockState.RIGHT || dockSide === UI.DockController.DockState.BOTTOM;
    this.#direction = isVertical ? 'column' : 'row';
    this.#sidebarPosition = isSidebarSecond ? 'second' : 'first';
    this.#show = 'both';
    this.#dockSide = dockSide;
    this.#topResizerEnabled = dockSide === UI.DockController.DockState.BOTTOM;
  }

  #updateForUndocked(): void {
    this.#show = 'sidebar';
    this.#topResizerEnabled = false;
  }

  #isDocked(): boolean {
    return UI.DockController.DockController.instance().dockSide() !== UI.DockController.DockState.UNDOCKED;
  }

  #onSetInspectedPageBounds(event: Common.EventTarget.EventTargetEvent<Bounds>): void {
    if (this.#changingDockSide || !this.#inspectedPagePlaceholder) {
      return;
    }
    const window = this.#inspectedPagePlaceholder.element.window();
    if (!window.innerWidth || !window.innerHeight) {
      return;
    }
    if (!this.#inspectedPagePlaceholder.isShowing()) {
      return;
    }
    const bounds = event.data;
    console.timeStamp('AdvancedApp.setInspectedPageBounds');
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setInspectedPageBounds(bounds);
  }
}

// Export required for usage in toolbox.ts
// @ts-expect-error Exported for Tests.js
globalThis.Emulation = globalThis.Emulation || {};
// @ts-expect-error Exported for Tests.js
globalThis.Emulation.AdvancedApp = AdvancedApp;

let advancedAppProviderInstance: AdvancedAppProvider;

export class AdvancedAppProvider implements UI.AppProvider.AppProvider {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): AdvancedAppProvider {
    const {forceNew} = opts;
    if (!advancedAppProviderInstance || forceNew) {
      advancedAppProviderInstance = new AdvancedAppProvider();
    }

    return advancedAppProviderInstance;
  }

  createApp(universe: Foundation.Universe.Universe): UI.App.App {
    return AdvancedApp.instance(universe);
  }
}
