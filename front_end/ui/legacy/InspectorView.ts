// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import {createIcon, type Icon} from '../kit/kit.js';
import * as Lit from '../lit/lit.js';
import * as SettingsUI from '../settings/settings.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import type {ActionDelegate as ActionDelegateInterface} from './ActionRegistration.js';
import {ActionRegistry} from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import type {Context} from './Context.js';
import type {ContextMenu} from './ContextMenu.js';
import {Dialog} from './Dialog.js';
import {DockController, DockState, Events as DockControllerEvents} from './DockController.js';
import {GlassPane} from './GlassPane.js';
import {Infobar, type InfobarAction, Type as InfobarType} from './Infobar.js';
import {InspectorDrawerView} from './InspectorDrawerView.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import type {Panel} from './Panel.js';
import {type SettingForOrientation, ShowMode, SplitWidget} from './SplitWidget.js';
import {StatusBarWidget} from './StatusBar.js';
import {type EventData, Events as TabbedPaneEvents, type TabbedPane, type TabbedPaneTabDelegate} from './TabbedPane.js';
import {Tooltip} from './Tooltip.js';
import {UIUserMetrics} from './UIUserMetrics.js';
import type {TabbedViewLocation, View as TabbedView, ViewLocation, ViewLocationResolver} from './View.js';
import {ViewManager} from './ViewManager.js';
import {VBox, type Widget, widget, WidgetFocusRestorer, widgetRef} from './Widget.js';

const {Directives, html, nothing, render} = Lit;
const {repeat} = Directives;

const UIStrings = {
  /**
   * @description Announcement text for screen readers when the drawer is minimized.
   */
  drawerMinimized: 'Drawer minimized',
  /**
   * @description Announcement text for screen readers when the drawer is expanded.
   */
  drawerExpanded: 'Drawer expanded',
  /**
   * @description Accessible label for the main tab bar that contains panels.
   */
  panels: 'Panels',
  /**
   * @description Button text in an infobar to reload the inspected page.
   */
  reloadDebuggedTab: 'Reload page',
  /**
   * @description Button text in an infobar to reload DevTools.
   */
  reloadDevtools: 'Reload DevTools',
  /**
   * @description Button text in an infobar to restart Chrome.
   */
  restartChrome: 'Restart Chrome',
  /**
   * @description Confirmation prompt text when restarting Chrome.
   */
  areYouSureYouWantToRestartChrome: 'Are you sure you want to restart Chrome?',
  /**
   * @description Context menu item to move a tab to the main tab bar.
   */
  moveToMainTabBar: 'Move to main tab bar',
  /**
   * @description Context menu item to move a tab to the drawer.
   */
  moveToDrawer: 'Move to drawer',
  /**
   * @description Infobar message shown when the DevTools language does not match the browser language.
   * @example {German} PH1
   */
  devToolsLanguageMissmatch: 'DevTools is now available in {PH1}',
  /**
   * @description Button text in an infobar to configure DevTools to match the browser language.
   */
  setToBrowserLanguage: 'Always match Chrome’s language',
  /**
   * @description Button text in an infobar to switch DevTools to a specific language.
   * @example {German} PH1
   */
  setToSpecificLanguage: 'Switch DevTools to {PH1}',
  /**
   * @description Accessible label for the main toolbar.
   */
  mainToolbar: 'Main toolbar',
  /**
   * @description Accessible label for the drawer.
   */
  drawer: 'Drawer',
  /**
   * @description Announcement text for screen readers when the drawer is shown.
   */
  drawerShown: 'Drawer shown',
  /**
   * @description Announcement text for screen readers when the drawer is hidden.
   */
  drawerHidden: 'Drawer hidden',
  /**
   * @description Infobar message prompting the user to select a folder for local overrides.
   */
  selectOverrideFolder: 'Select a folder to store override files in',
  /**
   * @description Button text in an infobar to open a folder picker for local overrides.
   */
  selectFolder: 'Select folder',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorViewInstance: InspectorView|null = null;

const MIN_MAIN_PANEL_WIDTH = 240;
const MIN_VERTICAL_DRAWER_WIDTH = 280;
// Inspector need to have space for both main panel and the drawer + some slack for borders
const MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER = 250;
const MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER = 530;
const MIN_INSPECTOR_HEIGHT = 72;

export enum DrawerOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  UNSET = 'unset',
}

export enum DockMode {
  BOTTOM = 'bottom',
  SIDE = 'side',  // For LEFT and RIGHT
  UNDOCKED = 'undocked',
}

export interface DrawerOrientationByDockMode {
  [DockMode.BOTTOM]: DrawerOrientation;
  [DockMode.SIDE]: DrawerOrientation;
  [DockMode.UNDOCKED]: DrawerOrientation;
}

interface ScrollState {
  element: HTMLElement;
  scrollTop: number;
  scrollLeft: number;
}

interface DrawerSplitViewStateSetting {
  vertical?: Partial<SettingForOrientation>;
  horizontal?: Partial<SettingForOrientation>;
}

export interface InfobarSpec {
  key: string;
  type: InfobarType;
  text: string;
  actions: InfobarAction[];
  disableSetting: Common.Settings.Setting<boolean>|null;
  jslogContext: string;
  onClose: () => void;
}

export interface ViewInput {
  infobars: readonly InfobarSpec[];
  isVerticalSplit: boolean;
  isDrawerOpen: boolean;
  statusBarVisible: boolean;
  onDrawerOpenChanged: (isOpen: boolean) => void;
}

export interface ViewOutput {
  attachSplitPanels?: (mainWidget: Widget, attachDrawer: (splitWidget: SplitWidget) => void) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  let drawerSplitWidget: SplitWidget|undefined;
  // clang-format off
  render(html`
    ${input.infobars.length > 0 ? html`
      <div class="flex-none">
        ${repeat(input.infobars, bar => bar.key, bar => widget(Infobar, {
          type: bar.type,
          text: bar.text,
          actions: bar.actions,
          disableSetting: bar.disableSetting,
          jslogContext: bar.jslogContext,
          onClose: bar.onClose,
        }))}
      </div>
    ` : nothing}
    <devtools-split-view
        autofocus
        direction=${input.isVerticalSplit ? 'column' : 'row'}
        sidebar-position="second"
        name="inspector.drawer-split-view-state"
        sidebar-initial-size="200"
        show=${input.isDrawerOpen ? 'both' : 'main'}
        @change=${(e: Event) => {
          if (e.target === e.currentTarget && e instanceof CustomEvent) {
            input.onDrawerOpenChanged(e.detail !== ShowMode.ONLY_MAIN);
          }
        }}
        ${widgetRef(SplitWidget, splitWidget => {
          drawerSplitWidget = splitWidget;
        })}>
    </devtools-split-view>
    ${input.statusBarVisible ? html`
      <devtools-widget class="flex-none" ${widget(StatusBarWidget)}></devtools-widget>
    ` : nothing}
  `, target);
  // clang-format on
  output.attachSplitPanels = (mainWidget: Widget, attachDrawer: (splitWidget: SplitWidget) => void): void => {
    if (!drawerSplitWidget) {
      return;
    }
    if (drawerSplitWidget.mainWidget() !== mainWidget) {
      drawerSplitWidget.setMainWidget(mainWidget);
      drawerSplitWidget.setDefaultFocusedChild(mainWidget);
    }
    attachDrawer(drawerSplitWidget);
  };
};

export class InspectorView extends VBox implements ViewLocationResolver {
  readonly #view: View;
  readonly #drawerOrientationByDockSetting: Common.Settings.Setting<DrawerOrientationByDockMode>;
  readonly #drawerSplitViewStateSetting: Common.Settings.Setting<DrawerSplitViewStateSetting>;
  readonly #drawerView: InspectorDrawerView;
  readonly #tabDelegate: InspectorViewTabDelegate;
  readonly #tabbedLocation: TabbedViewLocation;
  readonly tabbedPane: TabbedPane;
  readonly #keyDownBound: (event: KeyboardEvent) => void;
  #isVerticalSplit: boolean;
  #drawerShowMode: ShowMode;
  #infobars: InfobarSpec[] = [];
  #statusBarVisible = false;
  #needsUpdate = true;
  #updatingDrawerState = false;
  #currentPanelLocked?: boolean;
  #focusRestorer?: WidgetFocusRestorer|null;
  #mainPanelAtDrawerFocus: string|null = null;
  #resizeObserver: ResizeObserver;
  #drawerShowModeBeforeDockSideChange: ShowMode|null = null;
  #drawerMinimizedBeforeDockSideChange: boolean|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    GlassPane.setContainer(this.element);
    this.setMinimumSize(MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER, MIN_INSPECTOR_HEIGHT);

    // DevTools sidebar is a vertical split of main tab bar panels and a drawer.
    this.#drawerOrientationByDockSetting =
        Common.Settings.Settings.instance().createSetting('inspector.drawer-orientation-by-dock-mode', {
          [DockMode.BOTTOM]: DrawerOrientation.UNSET,
          [DockMode.SIDE]: DrawerOrientation.UNSET,
          [DockMode.UNDOCKED]: DrawerOrientation.UNSET,
        });
    this.#drawerSplitViewStateSetting = Common.Settings.Settings.instance().createSetting<DrawerSplitViewStateSetting>(
        'inspector.drawer-split-view-state', {});
    const initialOrientation = this.#getOrientationForDockMode();
    this.#isVerticalSplit = initialOrientation === DrawerOrientation.VERTICAL;
    this.#drawerShowMode = this.#readSavedDrawerShowMode(this.#isVerticalSplit) ?? ShowMode.ONLY_MAIN;

    this.#tabDelegate = new InspectorViewTabDelegate();

    // Create drawer tabbed pane.
    this.#drawerView = new InspectorDrawerView({
      revealDrawer: this.showDrawer.bind(this, {
        focus: false,
        hasTargetDrawer: true,
      }),
      isVisible: () => Boolean(this.#drawerView?.isVisibleForEvents()),
      drawerLabel: i18nString(UIStrings.drawer),
      onToggleMinimized: this.toggleDrawerMinimized.bind(this),
      onHide: this.closeDrawer.bind(this),
      onToggleOrientation: this.toggleDrawerOrientation.bind(this),
      onExpandFromMinimized: this.#expandDrawerFromInteraction.bind(this),
      onMinimizeFromTabInteraction: this.minimizeDrawer.bind(this),
      onTabSelected: this.#tabSelected.bind(this),
      isConsoleOpenInMainAndDrawer: tabId => tabId === 'console-view' && this.tabbedPane.selectedTabId === 'console',
      tabDelegate: this.#tabDelegate,
      enableOrientationToggle: Boolean(Root.Runtime.hostConfig.devToolsFlexibleLayout?.verticalDrawerEnabled),
      isVertical: this.#isVerticalSplit,
      verticalExpandedMinimumWidth: MIN_VERTICAL_DRAWER_WIDTH,
      minimumSizes: {
        inspectorWidthWhenVertical: MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER,
        inspectorWidthWhenHorizontal: MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER,
        inspectorHeight: MIN_INSPECTOR_HEIGHT,
      },
      setInspectorMinimumSize: this.setMinimumSize.bind(this),
    });

    // Create main area tabbed pane.
    this.#tabbedLocation = this.#createMainTabbedLocation();
    this.tabbedPane = this.#tabbedLocation.tabbedPane();

    this.#keyDownBound = this.#keyDown.bind(this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));

    function showPanel(this: InspectorView, {data: panelName}: Common.EventTarget.EventTargetEvent<string>): void {
      void this.showPanel(panelName);
    }

    if (shouldShowLocaleInfobar()) {
      this.#infobars.push(createLocaleInfobarSpec(() => this.#removeInfobar('locale-mismatch')));
    }
    this.#resizeObserver = new ResizeObserver(this.#observedResize.bind(this));
    DockController.instance().addEventListener(DockControllerEvents.BEFORE_DOCK_SIDE_CHANGED,
                                               this.#rememberDrawerStateBeforeDockSideChange, this);
    DockController.instance().addEventListener(DockControllerEvents.DOCK_SIDE_CHANGED,
                                               this.#applyDrawerOrientationForDockSide, this);
    DockController.instance().addEventListener(DockControllerEvents.AFTER_DOCK_SIDE_CHANGED,
                                               this.#restoreDrawerStateAfterDockSideChange, this);

    this.#runWithDrawerStateUpdate(() => {
      // Restore minimized state before syncing non-ONLY_MAIN showMode so applyState(..., false)
      // does not clear the persisted 'inspector.drawer-minimized' local setting at startup.
      this.#drawerView.restoreMinimizedStateFromSettings();
      if (this.#drawerView.isMinimized()) {
        this.#drawerShowMode = this.#drawerView.showMode();
        this.#saveDrawerShowMode(this.#drawerShowMode);
      } else if (this.#drawerShowMode !== ShowMode.ONLY_MAIN) {
        this.#drawerView.applyState(this.#drawerShowMode, false);
      }
    });
    this.performUpdate();
  }

  #runWithDrawerStateUpdate(fn: () => void): void {
    const wasUpdating = this.#updatingDrawerState;
    this.#updatingDrawerState = true;
    try {
      fn();
    } finally {
      this.#updatingDrawerState = wasUpdating;
    }
  }

  override requestUpdate(): void {
    this.#needsUpdate = true;
    super.requestUpdate();
  }

  override performUpdate(): void {
    this.#needsUpdate = false;
    const input: ViewInput = {
      infobars: this.#infobars,
      isVerticalSplit: this.#isVerticalSplit,
      isDrawerOpen: this.#drawerShowMode !== ShowMode.ONLY_MAIN,
      statusBarVisible: this.#statusBarVisible,
      onDrawerOpenChanged: this.#onDrawerOpenChanged,
    };
    const output: ViewOutput = {};
    this.#view(input, output, this.contentElement);
    this.#runWithDrawerStateUpdate(() => {
      output.attachSplitPanels?.(this.tabbedPane, splitWidget => this.#drawerView.attachSplitWidget(splitWidget));
    });
  }

  #createMainTabbedLocation(): TabbedViewLocation {
    const tabbedLocation = ViewManager.instance().createTabbedLocation(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance),
        'panel', true, true, {
          defaultTab: Root.Runtime.Runtime.queryParam('panel'),
          plusButton: {jslogContext: 'plus-button-panel'},
        });

    const tabbedPane = tabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(MIN_MAIN_PANEL_WIDTH, 0);
    tabbedPane.element.classList.add('main-tabbed-pane');
    // The 'Inspect element' and 'Device mode' buttons in the tabs toolbar takes longer to load than
    // the tabs themselves, so a space equal to the buttons' total width is preemptively allocated
    // to prevent to prevent a shift in the tab layout. Note that when DevTools cannot be docked,
    // the Device mode button is not added and so the allocated space is smaller.
    const allocatedSpace = Root.Runtime.conditions.canDock() ? '69px' : '41px';
    tabbedPane.leftToolbar().style.minWidth = allocatedSpace;
    tabbedPane.addEventListener(
        TabbedPaneEvents.TabSelected,
        (event: Common.EventTarget.EventTargetEvent<EventData>) => this.#tabSelected(event.data.tabId), this);
    const selectedTab = tabbedPane.selectedTabId;
    if (selectedTab) {
      UIUserMetrics.instance().panelShown(selectedTab, true);
    }
    tabbedPane.setAccessibleName(i18nString(UIStrings.panels));
    tabbedPane.setTabDelegate(this.#tabDelegate);

    const mainHeaderElement = tabbedPane.headerElement();
    ARIAUtils.markAsNavigation(mainHeaderElement);
    ARIAUtils.setLabel(mainHeaderElement, i18nString(UIStrings.mainToolbar));
    mainHeaderElement.setAttribute('jslog', `${VisualLogging.toolbar('main').track({
                                     drag: true,
                                     keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
                                   })}`);

    // Store the initial selected panel for use in launch histograms
    UIUserMetrics.instance().setLaunchPanel(tabbedPane.selectedTabId);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      tabbedPane.setAutoSelectFirstItemOnShow(false);
    }
    return tabbedLocation;
  }

  static instance(opts: {
    forceNew?: boolean|null,
    element?: HTMLElement,
    view?: View,
  }|undefined = {forceNew: null}): InspectorView {
    const {forceNew, element, view} = opts;
    if (!inspectorViewInstance || forceNew) {
      inspectorViewInstance = new InspectorView(element, view);
    }

    return inspectorViewInstance;
  }

  static maybeGetInspectorViewInstance(): InspectorView|null {
    return inspectorViewInstance;
  }

  static removeInstance(): void {
    inspectorViewInstance = null;
  }

  applyDrawerOrientationForDockSideForTest(): void {
  }

  #applyDrawerOrientationForDockSide(): void {
    const newOrientation = this.#getOrientationForDockMode();
    this.#applyDrawerOrientation(newOrientation);
    this.applyDrawerOrientationForDockSideForTest();
  }

  #getDockMode(): DockMode {
    const dockSide = DockController.instance().dockSide();
    if (dockSide === DockState.BOTTOM) {
      return DockMode.BOTTOM;
    }
    if (dockSide === DockState.UNDOCKED) {
      return DockMode.UNDOCKED;
    }

    return DockMode.SIDE;
  }

  #getOrientationForDockMode(): Omit<DrawerOrientation, DrawerOrientation.UNSET> {
    const dockMode = this.#getDockMode();
    const orientationSetting = this.#drawerOrientationByDockSetting.get();

    let orientation = orientationSetting[dockMode];
    if (orientation === DrawerOrientation.UNSET) {
      // Apply defaults: horizontal for side-dock, vertical for bottom-dock.
      orientation = dockMode === DockMode.BOTTOM ? DrawerOrientation.VERTICAL : DrawerOrientation.HORIZONTAL;
    }
    return orientation;
  }

  #drawerOrientationKey(isVertical = this.#isVerticalSplit): 'vertical'|'horizontal' {
    return isVertical ? 'vertical' : 'horizontal';
  }

  #readSavedDrawerShowMode(isVertical: boolean): ShowMode|undefined {
    return this.#drawerSplitViewStateSetting.get()[this.#drawerOrientationKey(isVertical)]?.showMode;
  }

  #saveDrawerShowMode(showMode: ShowMode): void {
    const key = this.#drawerOrientationKey();
    const state = this.#drawerSplitViewStateSetting.get();
    this.#drawerSplitViewStateSetting.set({
      ...state,
      [key]: {
        ...state[key],
        showMode,
      },
    });
  }

  #setDrawerShowMode(showMode: ShowMode): void {
    if (this.#drawerShowMode === showMode) {
      return;
    }
    this.#drawerShowMode = showMode;
    this.#saveDrawerShowMode(showMode);
    this.requestUpdate();
  }

  readonly #onDrawerOpenChanged = (isOpen: boolean): void => {
    if (this.#updatingDrawerState) {
      return;
    }
    this.#applyDrawerState(isOpen ? ShowMode.BOTH : ShowMode.ONLY_MAIN, this.isDrawerMinimized());
  };

  #applyDrawerOrientation(orientation: Omit<DrawerOrientation, DrawerOrientation.UNSET>): void {
    const shouldBeVertical = orientation === DrawerOrientation.VERTICAL;
    if (shouldBeVertical === this.#isVerticalSplit && shouldBeVertical === this.#drawerView.isVertical()) {
      return;
    }

    this.#isVerticalSplit = shouldBeVertical;
    this.#runWithDrawerStateUpdate(() => {
      this.#drawerView.setVertical(shouldBeVertical);
    });
    this.#drawerShowMode = this.#drawerView.showMode();
    this.#saveDrawerShowMode(this.#drawerShowMode);
    this.requestUpdate();
  }

  #applyDrawerState(showMode: ShowMode, minimized: boolean): void {
    this.#runWithDrawerStateUpdate(() => {
      this.#drawerView.applyState(showMode, minimized);
    });
    this.#setDrawerShowMode(this.#drawerView.showMode());
  }

  #observedResize(): void {
    const rect = this.element.getBoundingClientRect();
    // Set custom properties on the root element so top-layer elements
    // (such as native popovers inside Shadow DOM) can inherit them.
    // Top-layer popovers inside Shadow DOM roots inherit CSS custom properties
    // from documentElement rather than local parent elements or shadow hosts.
    const root = this.element.ownerDocument.documentElement;
    root.style.setProperty('--devtools-window-left', `${rect.left}px`);
    root.style.setProperty('--devtools-window-right', `${window.innerWidth - rect.right}px`);
    root.style.setProperty('--devtools-window-width', `${rect.width}px`);
    root.style.setProperty('--devtools-window-top', `${rect.top}px`);
    root.style.setProperty('--devtools-window-bottom', `${window.innerHeight - rect.bottom}px`);
    root.style.setProperty('--devtools-window-height', `${rect.height}px`);
  }

  override wasShown(): void {
    super.wasShown();
    if (this.#needsUpdate) {
      this.requestUpdate();
    }
    this.#resizeObserver.observe(this.element);
    this.#observedResize();
    this.element.ownerDocument.addEventListener('keydown', this.#keyDownBound, false);
    this.#applyDrawerOrientationForDockSide();
  }

  override willHide(): void {
    super.willHide();
    this.#resizeObserver.unobserve(this.element);
    this.element.ownerDocument.removeEventListener('keydown', this.#keyDownBound, false);
  }

  #rememberDrawerStateBeforeDockSideChange(): void {
    this.#drawerShowModeBeforeDockSideChange = this.#drawerView.showMode();
    this.#drawerMinimizedBeforeDockSideChange = this.isDrawerMinimized();
  }

  #restoreDrawerStateAfterDockSideChange(): void {
    const showMode = this.#drawerShowModeBeforeDockSideChange;
    const minimized = this.#drawerMinimizedBeforeDockSideChange;
    this.#drawerShowModeBeforeDockSideChange = null;
    this.#drawerMinimizedBeforeDockSideChange = null;

    if (showMode === null || minimized === null) {
      return;
    }

    this.#applyDrawerState(showMode, minimized);
  }

  resolveLocation(locationName: string): ViewLocation|null {
    if (locationName === 'drawer-view') {
      return this.#drawerView.tabbedLocation;
    }
    if (locationName === 'panel') {
      return this.#tabbedLocation;
    }
    return null;
  }

  async createToolbars(): Promise<void> {
    await Promise.all([
      this.tabbedPane.leftToolbar().appendItemsAtLocation('main-toolbar-left'),
      this.tabbedPane.rightToolbar().appendItemsAtLocation('main-toolbar-right'),
    ]);
  }

  addPanel(view: TabbedView): void {
    this.#tabbedLocation.appendView(view);
  }

  hasPanel(panelName: string): boolean {
    return this.tabbedPane.hasTab(panelName);
  }

  async panel(panelName: string): Promise<Panel> {
    const view = ViewManager.instance().view(panelName);
    if (!view) {
      throw new Error(`Expected view for panel '${panelName}'`);
    }
    return await (view.widget() as Promise<Panel>);
  }

  onSuspendStateChanged(allTargetsSuspended: boolean): void {
    this.#currentPanelLocked = allTargetsSuspended;
    this.tabbedPane.setCurrentTabLocked(this.#currentPanelLocked);
    this.tabbedPane.leftToolbar().setEnabled(!this.#currentPanelLocked);
    this.tabbedPane.rightToolbar().setEnabled(!this.#currentPanelLocked);
  }

  canSelectPanel(panelName: string): boolean {
    return !this.#currentPanelLocked || this.tabbedPane.selectedTabId === panelName;
  }

  async showPanel(panelName: string): Promise<void> {
    await ViewManager.instance().showView(panelName);
  }

  setPanelWarnings(tabId: string, warnings: string[]): void {
    // Find the tabbed location where the panel lives
    const tabbedPane = this.#getTabbedPaneForTabId(tabId);
    if (tabbedPane) {
      let icon: Icon|null = null;
      if (warnings.length !== 0) {
        const warning = warnings.length === 1 ? warnings[0] : '· ' + warnings.join('\n· ');
        icon = createIcon('warning-filled', 'small');
        icon.classList.add('warning');
        Tooltip.install(icon, warning);
      }
      tabbedPane.setTrailingTabIcon(tabId, icon);
    }
  }

  #getTabbedPaneForTabId(tabId: string): TabbedPane|null {
    // Tab exists in the main panel
    if (this.tabbedPane.hasTab(tabId)) {
      return this.tabbedPane;
    }

    // Tab exists in the drawer
    if (this.#drawerView.tabbedPane.hasTab(tabId)) {
      return this.#drawerView.tabbedPane;
    }

    // Tab is not open
    return null;
  }

  currentPanelDeprecated(): Widget|null {
    return (ViewManager.instance().materializedWidget(this.tabbedPane.selectedTabId || ''));
  }

  showDrawer({focus, hasTargetDrawer}: {focus: boolean, hasTargetDrawer: boolean}): void {
    // Both checks are needed: during an animated hide, drawerVisible()
    // (tabbedPane.isShowing()) remains true until the animation completes and
    // the widget is detached, but sidebarIsShowing() turns false synchronously.
    if (this.#drawerView.drawerVisible() && this.#drawerView.sidebarIsShowing()) {
      // Only expand a minimized drawer when the user explicitly requested
      // focus (e.g. keyboard shortcut or direct action). Programmatic calls
      // (like tab switches) should not auto-expand.
      if (focus && this.isDrawerMinimized()) {
        this.setDrawerMinimized(false);
        ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerExpanded));
      }
      return;
    }
    this.#applyDrawerOrientationForDockSide();
    this.#runWithDrawerStateUpdate(() => {
      this.#drawerView.show(hasTargetDrawer);
    });
    this.#setDrawerShowMode(this.#drawerView.showMode());
    if (focus) {
      this.#focusRestorer = new WidgetFocusRestorer(this.#drawerView.tabbedPane);
      this.#mainPanelAtDrawerFocus = this.tabbedPane.selectedTabId;
    } else {
      this.#focusRestorer = null;
      this.#mainPanelAtDrawerFocus = null;
    }
    ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerShown));
  }

  drawerVisible(): boolean {
    return this.#drawerView.drawerVisible();
  }

  minimizeDrawer(): void {
    if (!this.#drawerView.drawerVisible()) {
      return;
    }
    this.#focusRestorer = null;
    this.#mainPanelAtDrawerFocus = null;
    this.setDrawerMinimized(true);
    ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerMinimized));
  }

  closeDrawer(): void {
    if (!this.#drawerView.drawerVisible()) {
      return;
    }
    // Preserve main panel scroll positions across the drawer layout change.
    const scrollState = this.#captureMainPanelScrollState();
    if (this.#focusRestorer && this.#mainPanelAtDrawerFocus === this.tabbedPane.selectedTabId) {
      this.#focusRestorer.restore();
    }
    this.#focusRestorer = null;
    this.#mainPanelAtDrawerFocus = null;
    this.#runWithDrawerStateUpdate(() => {
      this.#drawerView.hide();
    });
    this.#setDrawerShowMode(this.#drawerView.showMode());
    this.#restoreMainPanelScrollState(scrollState);
    ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerHidden));
  }

  toggleDrawerOrientation({force}: {force?: Omit<DrawerOrientation, DrawerOrientation.UNSET>} = {}): void {
    if (!this.#drawerView.drawerVisible()) {
      return;
    }

    const dockMode = this.#getDockMode();
    const currentSettings = this.#drawerOrientationByDockSetting.get();

    let newOrientation: Omit<DrawerOrientation, DrawerOrientation.UNSET>;
    if (force) {
      newOrientation = force;
    } else {
      const currentOrientation = this.#getOrientationForDockMode();
      newOrientation =
          currentOrientation === DrawerOrientation.VERTICAL ? DrawerOrientation.HORIZONTAL : DrawerOrientation.VERTICAL;
    }

    currentSettings[dockMode] = newOrientation as DrawerOrientation;
    this.#drawerOrientationByDockSetting.set(currentSettings);

    this.#applyDrawerOrientation(newOrientation);
  }

  isUserExplicitlyUpdatedDrawerOrientation(): boolean {
    const orientationSetting = this.#drawerOrientationByDockSetting.get();
    const dockMode = this.#getDockMode();
    return orientationSetting[dockMode] !== DrawerOrientation.UNSET;
  }

  setDrawerMinimized(minimized: boolean): void {
    // Preserve main panel scroll positions across the drawer layout change.
    const scrollState = this.#captureMainPanelScrollState();
    this.#runWithDrawerStateUpdate(() => {
      this.#drawerView.setMinimized(minimized);
    });
    this.#restoreMainPanelScrollState(scrollState);
  }

  // Showing, hiding, or minimizing the drawer causes SplitWidget to
  // manipulate CSS classes and remove inline layout properties, triggering a
  // flexbox reflow that resets scroll positions in the main panel. We capture
  // them before the operation and restore them afterwards to preserve the
  // user's scroll position.
  #captureMainPanelScrollState(): ScrollState[] {
    const selectedTabId = this.tabbedPane.selectedTabId;
    if (!selectedTabId) {
      return [];
    }

    let panel: Widget|null = null;
    try {
      panel = ViewManager.instance().materializedWidget(selectedTabId);
    } catch {
      return [];
    }

    if (!panel) {
      return [];
    }

    const rootElement = panel.element as HTMLElement;
    const scrollableElements: HTMLElement[] = [
      rootElement,
      ...rootElement.querySelectorAll<HTMLElement>('*'),
    ];

    return scrollableElements.filter(element => element.scrollTop !== 0 || element.scrollLeft !== 0)
        .map(element => ({
               element,
               scrollTop: element.scrollTop,
               scrollLeft: element.scrollLeft,
             }));
  }

  #restoreMainPanelScrollState(scrollState: ScrollState[]): void {
    if (!scrollState.length) {
      return;
    }

    this.element.window().requestAnimationFrame(() => {
      for (const {element, scrollTop, scrollLeft} of scrollState) {
        if (!element.isConnected) {
          continue;
        }
        element.scrollTop = scrollTop;
        element.scrollLeft = scrollLeft;
      }
    });
  }

  drawerSize(): number {
    return this.#drawerView.drawerSize();
  }

  setDrawerSize(size: number): void {
    this.#drawerView.setDrawerSize(size);
  }

  totalSize(): number {
    return this.#drawerView.totalSize();
  }

  isDrawerMinimized(): boolean {
    return this.#drawerView.isMinimized();
  }

  toggleDrawerMinimized(): void {
    if (!this.#drawerView.drawerVisible()) {
      // If the drawer is not visible at all, show and expand it.
      this.showDrawer({focus: true, hasTargetDrawer: false});
      return;
    }
    const minimized = this.isDrawerMinimized();
    if (minimized && this.#drawerView.tabbedPane.selectedTabId === 'console-view' &&
        this.tabbedPane.selectedTabId === 'console') {
      return;
    }
    this.setDrawerMinimized(!minimized);
    if (!minimized) {
      ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerMinimized));
    } else {
      ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerExpanded));
    }
  }

  isDrawerOrientationVertical(): boolean {
    return this.#drawerView.isVertical();
  }

  #expandDrawerFromInteraction(): void {
    this.setDrawerMinimized(false);
    ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.drawerExpanded));
  }

  #keyDown(event: KeyboardEvent): void {
    if (!KeyboardShortcut.eventHasCtrlEquivalentKey(event) || event.altKey || event.shiftKey) {
      return;
    }

    // Ctrl/Cmd + 1-9 should show corresponding panel.
    const panelShortcutEnabled =
        Common.Settings.Settings.instance().resolve(SettingsUI.MainSettings.shortcutPanelSwitchSettingDescriptor).get();
    if (panelShortcutEnabled) {
      let panelIndex = -1;
      if (event.keyCode > 0x30 && event.keyCode < 0x3A) {
        panelIndex = event.keyCode - 0x31;
      } else if (
          event.keyCode > 0x60 && event.keyCode < 0x6A && event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
        panelIndex = event.keyCode - 0x61;
      }
      if (panelIndex !== -1) {
        const panelName = this.tabbedPane.tabIds()[panelIndex];
        if (panelName) {
          if (!Dialog.hasInstance() && !this.#currentPanelLocked) {
            void this.showPanel(panelName);
            void VisualLogging.logKeyDown(null, event, `panel-by-index-${panelName}`);
          }
          event.consume(true);
        }
      }
    }
  }

  override onResize(): void {
    GlassPane.containerMoved(this.element);
  }

  topResizerElement(): Element {
    return this.tabbedPane.headerElement();
  }

  toolbarItemResized(): void {
    this.tabbedPane.headerResized();
  }

  #tabSelected(tabId: string): void {
    UIUserMetrics.instance().panelShown(tabId, false);
  }

  ownerSplit(): SplitWidget|null {
    const parent = this.parentWidget();
    return parent instanceof SplitWidget ? parent : null;
  }

  minimize(): void {
    this.ownerSplit()?.setSidebarMinimized(true);
  }

  restore(): void {
    this.ownerSplit()?.setSidebarMinimized(false);
  }

  #hasInfobar(key: string): boolean {
    return this.#infobars.some(bar => bar.key === key);
  }

  #addInfobar(spec: InfobarSpec): void {
    this.#infobars = [...this.#infobars, spec];
    this.requestUpdate();
  }

  #removeInfobar(key: string): void {
    if (!this.#hasInfobar(key)) {
      return;
    }
    this.#infobars = this.#infobars.filter(bar => bar.key !== key);
    if (key === 'debugged-tab-reload-required') {
      SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel,
                                                                     SDK.ResourceTreeModel.Events.PrimaryPageChanged,
                                                                     this.removeDebuggedTabReloadRequiredWarning, this);
    }
    this.requestUpdate();
  }

  displayDebuggedTabReloadRequiredWarning(message: string): void {
    if (!this.#hasInfobar('debugged-tab-reload-required')) {
      this.#addInfobar({
        key: 'debugged-tab-reload-required',
        type: InfobarType.INFO,
        text: message,
        actions: [
          {
            text: i18nString(UIStrings.reloadDebuggedTab),
            delegate: () => {
              reloadDebuggedTab();
              this.removeDebuggedTabReloadRequiredWarning();
            },
            dismiss: false,
            buttonVariant: Buttons.Button.Variant.PRIMARY,
            jslogContext: 'main.debug-reload',
          },
        ],
        disableSetting: null,
        jslogContext: 'reload-required',
        onClose: () => this.#removeInfobar('debugged-tab-reload-required'),
      });

      SDK.TargetManager.TargetManager.instance().addModelListener(
          SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          this.removeDebuggedTabReloadRequiredWarning, this);
    }
  }

  removeDebuggedTabReloadRequiredWarning(): void {
    this.#removeInfobar('debugged-tab-reload-required');
  }

  displayReloadRequiredWarning(message: string): void {
    if (!this.#hasInfobar('reload-required') && !this.#hasInfobar('chrome-restart-required')) {
      this.#addInfobar({
        key: 'reload-required',
        type: InfobarType.INFO,
        text: message,
        actions: [
          {
            text: i18nString(UIStrings.reloadDevtools),
            delegate: () => reloadDevTools(),
            dismiss: false,
            buttonVariant: Buttons.Button.Variant.PRIMARY,
            jslogContext: 'main.debug-reload',
          },
        ],
        disableSetting: null,
        jslogContext: 'reload-required',
        onClose: () => this.#removeInfobar('reload-required'),
      });
    }
  }

  displayChromeRestartRequiredWarning(message: string): void {
    this.#removeInfobar('reload-required');
    if (!this.#hasInfobar('chrome-restart-required')) {
      this.#addInfobar({
        key: 'chrome-restart-required',
        type: InfobarType.INFO,
        text: message,
        actions: [
          {
            text: i18nString(UIStrings.restartChrome),
            delegate: () => {
              if (confirm(i18nString(UIStrings.areYouSureYouWantToRestartChrome))) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.requestRestart();
              }
            },
            dismiss: false,
            buttonVariant: Buttons.Button.Variant.PRIMARY,
            jslogContext: 'main.chrome-restart-chrome',
          },
        ],
        disableSetting: null,
        jslogContext: 'reload-required',
        onClose: () => this.#removeInfobar('chrome-restart-required'),
      });
    }
  }

  displaySelectOverrideFolderInfobar(callback: () => void): void {
    if (!this.#hasInfobar('select-override-folder')) {
      this.#addInfobar({
        key: 'select-override-folder',
        type: InfobarType.INFO,
        text: i18nString(UIStrings.selectOverrideFolder),
        actions: [
          {
            text: i18nString(UIStrings.selectFolder),
            delegate: () => callback(),
            dismiss: true,
            buttonVariant: Buttons.Button.Variant.TONAL,
            jslogContext: 'select-folder',
          },
        ],
        disableSetting: null,
        jslogContext: 'select-override-folder',
        onClose: () => this.#removeInfobar('select-override-folder'),
      });
    }
  }

  renderStatusBar(visible = true): void {
    if (this.#statusBarVisible === visible) {
      return;
    }
    this.#statusBarVisible = visible;
    this.requestUpdate();
    void this.updateComplete.then(() => this.doResize());
  }
}

function getDisableLocaleInfoBarSetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('disable-locale-info-bar', false);
}

function shouldShowLocaleInfobar(): boolean {
  if (getDisableLocaleInfoBarSetting().get()) {
    return false;
  }

  // If the language setting is different than 'en-US', the user already
  // used the setting before, so don't show the toolbar.
  const languageSettingValue = Common.Settings.Settings.instance().moduleSetting<string>('language').get();
  if (languageSettingValue !== 'en-US') {
    return false;
  }

  // When the selected DevTools locale differs from the locale of the browser UI, we want to notify
  // users only once, that they have the opportunity to adjust DevTools locale to match Chrome's locale.
  return !i18n.DevToolsLocale.localeLanguagesMatch(navigator.language, languageSettingValue) &&
      i18n.DevToolsLocale.DevToolsLocale.instance().languageIsSupportedByDevTools(navigator.language);
}

function createLocaleInfobarSpec(onDismiss: () => void): InfobarSpec {
  const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
  const closestSupportedLocale = devtoolsLocale.lookupClosestDevToolsLocale(navigator.language);
  const locale = new Intl.Locale(closestSupportedLocale);
  const closestSupportedLanguageInCurrentLocale =
      new Intl.DisplayNames([devtoolsLocale.locale], {type: 'language'}).of(locale.language || 'en') || 'English';

  const languageSetting = Common.Settings.Settings.instance().moduleSetting<string>('language');
  return {
    key: 'locale-mismatch',
    type: InfobarType.INFO,
    text: i18nString(UIStrings.devToolsLanguageMissmatch, {PH1: closestSupportedLanguageInCurrentLocale}),
    actions: [
      {
        text: i18nString(UIStrings.setToBrowserLanguage),
        delegate: () => {
          languageSetting.set('browserLanguage');
          getDisableLocaleInfoBarSetting().set(true);
          reloadDevTools();
        },
        dismiss: true,
        jslogContext: 'set-to-browser-language',
      },
      {
        text: i18nString(UIStrings.setToSpecificLanguage, {PH1: closestSupportedLanguageInCurrentLocale}),
        delegate: () => {
          languageSetting.set(closestSupportedLocale);
          getDisableLocaleInfoBarSetting().set(true);
          reloadDevTools();
        },
        dismiss: true,
        jslogContext: 'set-to-specific-language',
      },
    ],
    disableSetting: getDisableLocaleInfoBarSetting(),
    jslogContext: 'language-mismatch',
    // Closing the infobar with the close button or Esc also answers it, so that
    // we notify users only once.
    onClose: () => {
      getDisableLocaleInfoBarSetting().set(true);
      onDismiss();
    },
  };
}

function reloadDevTools(): void {
  if (DockController.instance().canDock() && DockController.instance().dockSide() === DockState.UNDOCKED) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {});
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}

function reloadDebuggedTab(): void {
  void ActionRegistry.instance().getAction('inspector-main.reload').execute();
}

export class ActionDelegate implements ActionDelegateInterface {
  handleAction(_context: Context, actionId: string): boolean {
    switch (actionId) {
      case 'main.toggle-drawer':
        if (InspectorView.instance().drawerVisible()) {
          InspectorView.instance().closeDrawer();
        } else {
          InspectorView.instance().showDrawer({
            focus: true,
            hasTargetDrawer: false,
          });
        }
        return true;
      case 'main.toggle-drawer-orientation':
        InspectorView.instance().toggleDrawerOrientation();
        return true;
      case 'main.next-tab':
        InspectorView.instance().tabbedPane.selectNextTab();
        InspectorView.instance().tabbedPane.focus();
        return true;
      case 'main.previous-tab':
        InspectorView.instance().tabbedPane.selectPrevTab();
        InspectorView.instance().tabbedPane.focus();
        return true;
    }
    return false;
  }
}

export class InspectorViewTabDelegate implements TabbedPaneTabDelegate {
  closeTabs(tabbedPane: TabbedPane, ids: string[]): void {
    tabbedPane.closeTabs(ids, true);
  }

  moveToDrawer(tabId: string): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TabMovedToDrawer);
    ViewManager.instance().moveView(tabId, 'drawer-view');
  }

  moveToMainTabBar(tabId: string): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TabMovedToMainPanel);
    ViewManager.instance().moveView(tabId, 'panel');
  }

  onContextMenu(tabId: string, contextMenu: ContextMenu): void {
    // Special case for console, we don't show the movable context panel for this two tabs
    if (tabId === 'console' || tabId === 'console-view') {
      return;
    }

    const locationName = ViewManager.instance().locationNameForViewId(tabId);
    if (locationName === 'drawer-view') {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.moveToMainTabBar), this.moveToMainTabBar.bind(this, tabId),
          {jslogContext: 'move-to-top'});
    } else {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.moveToDrawer), this.moveToDrawer.bind(this, tabId), {jslogContext: 'move-to-bottom'});
    }
  }
}
