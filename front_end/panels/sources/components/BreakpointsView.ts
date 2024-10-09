// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Breakpoints from '../../../models/breakpoints/breakpoints.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import breakpointsViewStyles from './breakpointsView.css.js';
import {findNextNodeForKeyboardNavigation, getDifferentiatingPathMap, type TitleInfo} from './BreakpointsViewUtils.js';

const UIStrings = {
  /**
   *@description Label for a checkbox to toggle pausing on uncaught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an uncaught exception is thrown at runtime.
   */
  pauseOnUncaughtExceptions: 'Pause on uncaught exceptions',
  /**
   *@description Label for a checkbox to toggling pausing on caught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an exception is thrown, but caught (handled) at runtime.
   */
  pauseOnCaughtExceptions: 'Pause on caught exceptions',
  /**
   *@description Text exposed to screen readers on checked items.
   */
  checked: 'checked',
  /**
   *@description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: 'unchecked',
  /**
   *@description Accessible text for a breakpoint collection with a combination of checked states.
   */
  indeterminate: 'mixed',
  /**
   *@description Accessibility label for hit breakpoints in the Sources panel.
   *@example {checked} PH1
   */
  breakpointHit: '{PH1} breakpoint hit',
  /**
   *@description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint groups.
   */
  removeAllBreakpointsInFile: 'Remove all breakpoints in file',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints in a file.
   */
  disableAllBreakpointsInFile: 'Disable all breakpoints in file',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints in a file.
   */
  enableAllBreakpointsInFile: 'Enable all breakpoints in file',
  /**
   *@description Tooltip text that shows when hovered over an edit button that appears next to a breakpoint or conditional breakpoint in the breakpoint sidebar of the sources panel.
   */
  editCondition: 'Edit condition',
  /**
   *@description Tooltip text that shows when hovered over an edit button that appears next to a logpoint in the breakpoint sidebar of the sources panel.
   */
  editLogpoint: 'Edit logpoint',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints.
   */
  disableAllBreakpoints: 'Disable all breakpoints',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints.
   */
  enableAllBreakpoints: 'Enable all breakpoints',
  /**
   *@description Tooltip text that shows when hovered over a remove button that appears next to a breakpoint in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint items.
   */
  removeBreakpoint: 'Remove breakpoint',
  /**
   *@description Text to remove all breakpoints
   */
  removeAllBreakpoints: 'Remove all breakpoints',
  /**
   *@description Text in Breakpoints Sidebar Pane of the Sources panel
   */
  removeOtherBreakpoints: 'Remove other breakpoints',
  /**
   *@description Context menu item that reveals the source code location of a breakpoint in the Sources panel.
   */
  revealLocation: 'Reveal location',
  /**
   *@description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows the condition, on which the breakpoint will stop.
   *@example {x < 3} PH1
   */
  conditionCode: 'Condition: {PH1}',
  /**
   *@description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows what is going to be printed in the console, if execution hits this breakpoint.
   *@example {'hello'} PH1
   */
  logpointCode: 'Logpoint: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/components/BreakpointsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const MAX_SNIPPET_LENGTH = 200;

export interface BreakpointsViewData {
  breakpointsActive: boolean;
  pauseOnUncaughtExceptions: boolean;
  pauseOnCaughtExceptions: boolean;
  // TODO(crbug.com/1382762): Remove special casing with dependent toggles as soon as Node LTS caught up on independent pause of exception toggles.
  independentPauseToggles: boolean;
  groups: BreakpointGroup[];
}

export interface BreakpointGroup {
  name: string;
  url: Platform.DevToolsPath.UrlString;
  editable: boolean;
  expanded: boolean;
  breakpointItems: BreakpointItem[];
}

export interface BreakpointItem {
  id: string;
  location: string;
  codeSnippet: string;
  isHit: boolean;
  status: BreakpointStatus;
  type: SDK.DebuggerModel.BreakpointType;
  hoverText?: string;
}

export const enum BreakpointStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  INDETERMINATE = 'INDETERMINATE',
}

let breakpointsViewInstance: LegacyWrapper.LegacyWrapper.LegacyWrapper<UI.Widget.Widget, BreakpointsView>|null;
let breakpointsViewControllerInstance: BreakpointsSidebarController|null;

export class BreakpointsSidebarController implements UI.ContextFlavorListener.ContextFlavorListener {
  readonly #breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;
  readonly #breakpointItemToLocationMap =
      new WeakMap<BreakpointItem, Breakpoints.BreakpointManager.BreakpointLocation[]>();
  readonly #breakpointsActiveSetting: Common.Settings.Setting<boolean>;
  readonly #pauseOnUncaughtExceptionSetting: Common.Settings.Setting<boolean>;
  readonly #pauseOnCaughtExceptionSetting: Common.Settings.Setting<boolean>;

  readonly #collapsedFilesSettings: Common.Settings.Setting<Platform.DevToolsPath.UrlString[]>;
  readonly #collapsedFiles: Set<Platform.DevToolsPath.UrlString>;

  // This is used to keep track of outstanding edits to breakpoints that were initiated
  // by the breakpoint edit button (for UMA).
  #outstandingBreakpointEdited: Breakpoints.BreakpointManager.Breakpoint|undefined;
  #updateScheduled = false;
  #updateRunning = false;

  private constructor(
      breakpointManager: Breakpoints.BreakpointManager.BreakpointManager, settings: Common.Settings.Settings) {
    this.#collapsedFilesSettings = Common.Settings.Settings.instance().createSetting('collapsed-files', []);
    this.#collapsedFiles = new Set(this.#collapsedFilesSettings.get());
    this.#breakpointManager = breakpointManager;
    this.#breakpointManager.addEventListener(
        Breakpoints.BreakpointManager.Events.BreakpointAdded, this.#onBreakpointAdded, this);
    this.#breakpointManager.addEventListener(
        Breakpoints.BreakpointManager.Events.BreakpointRemoved, this.#onBreakpointRemoved, this);
    this.#breakpointsActiveSetting = settings.moduleSetting('breakpoints-active');
    this.#breakpointsActiveSetting.addChangeListener(this.update, this);
    this.#pauseOnUncaughtExceptionSetting = settings.moduleSetting('pause-on-uncaught-exception');
    this.#pauseOnUncaughtExceptionSetting.addChangeListener(this.update, this);
    this.#pauseOnCaughtExceptionSetting = settings.moduleSetting('pause-on-caught-exception');
    this.#pauseOnCaughtExceptionSetting.addChangeListener(this.update, this);
  }

  static instance({forceNew, breakpointManager, settings}: {
    forceNew: boolean|null,
    breakpointManager: Breakpoints.BreakpointManager.BreakpointManager,
    settings: Common.Settings.Settings,
  } = {
    forceNew: null,
    breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
    settings: Common.Settings.Settings.instance(),
  }): BreakpointsSidebarController {
    if (!breakpointsViewControllerInstance || forceNew) {
      breakpointsViewControllerInstance = new BreakpointsSidebarController(breakpointManager, settings);
    }
    return breakpointsViewControllerInstance;
  }

  static removeInstance(): void {
    breakpointsViewControllerInstance = null;
  }

  static targetSupportsIndependentPauseOnExceptionToggles(): boolean {
    const hasNodeTargets =
        SDK.TargetManager.TargetManager.instance().targets().some(target => target.type() === SDK.Target.Type.NODE);
    return !hasNodeTargets;
  }

  flavorChanged(_object: Object|null): void {
    void this.update();
  }

  breakpointEditFinished(breakpoint: Breakpoints.BreakpointManager.Breakpoint|null, edited: boolean): void {
    if (this.#outstandingBreakpointEdited && this.#outstandingBreakpointEdited === breakpoint) {
      if (edited) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointConditionEditedFromSidebar);
      }
      this.#outstandingBreakpointEdited = undefined;
    }
  }

  breakpointStateChanged(breakpointItem: BreakpointItem, checked: boolean): void {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    locations.forEach((value: Breakpoints.BreakpointManager.BreakpointLocation) => {
      const breakpoint = value.breakpoint;
      breakpoint.setEnabled(checked);
    });
  }

  async breakpointEdited(breakpointItem: BreakpointItem, editButtonClicked: boolean): Promise<void> {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    let location: Breakpoints.BreakpointManager.BreakpointLocation|undefined;
    for (const locationCandidate of locations) {
      if (!location || locationCandidate.uiLocation.compareTo(location.uiLocation) < 0) {
        location = locationCandidate;
      }
    }
    if (location) {
      if (editButtonClicked) {
        this.#outstandingBreakpointEdited = location.breakpoint;
      }
      await Common.Revealer.reveal(location);
    }
  }

  breakpointsRemoved(breakpointItems: BreakpointItem[]): void {
    const locations = breakpointItems.flatMap(breakpointItem => this.#getLocationsForBreakpointItem(breakpointItem));
    locations.forEach(location => location?.breakpoint.remove(false /* keepInStorage */));
  }

  expandedStateChanged(url: Platform.DevToolsPath.UrlString, expanded: boolean): void {
    if (expanded) {
      this.#collapsedFiles.delete(url);
    } else {
      this.#collapsedFiles.add(url);
    }

    this.#saveSettings();
  }

  async jumpToSource(breakpointItem: BreakpointItem): Promise<void> {
    const uiLocations = this.#getLocationsForBreakpointItem(breakpointItem).map(location => location.uiLocation);
    let uiLocation: Workspace.UISourceCode.UILocation|undefined;
    for (const uiLocationCandidate of uiLocations) {
      if (!uiLocation || uiLocationCandidate.compareTo(uiLocation) < 0) {
        uiLocation = uiLocationCandidate;
      }
    }
    if (uiLocation) {
      await Common.Revealer.reveal(uiLocation);
    }
  }

  setPauseOnUncaughtExceptions(value: boolean): void {
    this.#pauseOnUncaughtExceptionSetting.set(value);
  }

  setPauseOnCaughtExceptions(value: boolean): void {
    this.#pauseOnCaughtExceptionSetting.set(value);
  }

  async update(): Promise<void> {
    this.#updateScheduled = true;
    if (this.#updateRunning) {
      return;
    }
    this.#updateRunning = true;
    while (this.#updateScheduled) {
      this.#updateScheduled = false;
      const data = await this.getUpdatedBreakpointViewData();
      BreakpointsView.instance().data = data;
    }
    this.#updateRunning = false;
  }

  async getUpdatedBreakpointViewData(): Promise<BreakpointsViewData> {
    const breakpointsActive = this.#breakpointsActiveSetting.get();
    const independentPauseToggles = BreakpointsSidebarController.targetSupportsIndependentPauseOnExceptionToggles();
    const pauseOnUncaughtExceptions = this.#pauseOnUncaughtExceptionSetting.get();
    const pauseOnCaughtExceptions = this.#pauseOnCaughtExceptionSetting.get();

    const breakpointLocations = this.#getBreakpointLocations();
    if (!breakpointLocations.length) {
      return {
        breakpointsActive,
        pauseOnCaughtExceptions,
        pauseOnUncaughtExceptions,
        independentPauseToggles,
        groups: [],
      };
    }

    const locationsGroupedById = this.#groupBreakpointLocationsById(breakpointLocations);
    const locationIdsByLineId = this.#getLocationIdsByLineId(breakpointLocations);

    const [content, selectedUILocation] = await Promise.all([
      this.#getContent(locationsGroupedById),
      this.#getHitUILocation(),
    ]);

    const scriptIdToGroup = new Map<string, BreakpointGroup>();

    for (let idx = 0; idx < locationsGroupedById.length; idx++) {
      const locations = locationsGroupedById[idx];
      const fstLocation = locations[0];
      const sourceURL = fstLocation.uiLocation.uiSourceCode.url();
      const scriptId = fstLocation.uiLocation.uiSourceCode.canononicalScriptId();
      const uiLocation = fstLocation.uiLocation;

      const isHit = selectedUILocation !== null &&
          locations.some(location => location.uiLocation.id() === selectedUILocation.id());

      const numBreakpointsOnLine = locationIdsByLineId.get(uiLocation.lineId()).size;
      const showColumn = numBreakpointsOnLine > 1;
      const locationText = uiLocation.lineAndColumnText(showColumn) as string;

      const contentData = content[idx];
      const codeSnippet = contentData instanceof TextUtils.WasmDisassembly.WasmDisassembly ?
          contentData.lines[contentData.bytecodeOffsetToLineNumber(uiLocation.columnNumber ?? 0)] ?? '' :
          contentData.textObj.lineAt(uiLocation.lineNumber);

      if (isHit && this.#collapsedFiles.has(sourceURL)) {
        this.#collapsedFiles.delete(sourceURL);
        this.#saveSettings();
      }
      const expanded = !this.#collapsedFiles.has(sourceURL);

      const status: BreakpointStatus = this.#getBreakpointState(locations);
      const {type, hoverText} = this.#getBreakpointTypeAndDetails(locations);
      const item = {
        id: fstLocation.breakpoint.breakpointStorageId(),
        location: locationText,
        codeSnippet,
        isHit,
        status,
        type,
        hoverText,
      };
      this.#breakpointItemToLocationMap.set(item, locations);

      let group = scriptIdToGroup.get(scriptId);
      if (group) {
        group.breakpointItems.push(item);
        group.expanded ||= expanded;
      } else {
        const editable = this.#breakpointManager.supportsConditionalBreakpoints(uiLocation.uiSourceCode);
        group = {
          url: sourceURL,
          name: uiLocation.uiSourceCode.displayName(),
          editable,
          expanded,
          breakpointItems: [item],
        };
        scriptIdToGroup.set(scriptId, group);
      }
    }
    return {
      breakpointsActive,
      pauseOnCaughtExceptions,
      pauseOnUncaughtExceptions,
      independentPauseToggles,
      groups: Array.from(scriptIdToGroup.values()),
    };
  }

  #onBreakpointAdded(event: Common.EventTarget.EventTargetEvent<Breakpoints.BreakpointManager.BreakpointLocation>):
      Promise<void> {
    const breakpoint = event.data.breakpoint;
    if (breakpoint.origin === Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION &&
        this.#collapsedFiles.has(breakpoint.url())) {
      // Auto-expand if a new breakpoint was added to a collapsed group.
      this.#collapsedFiles.delete(breakpoint.url());
      this.#saveSettings();
    }
    return this.update();
  }

  #onBreakpointRemoved(event: Common.EventTarget.EventTargetEvent<Breakpoints.BreakpointManager.BreakpointLocation>):
      Promise<void> {
    const breakpoint = event.data.breakpoint;
    if (this.#collapsedFiles.has(breakpoint.url())) {
      const locations = Breakpoints.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
      const otherBreakpointsOnSameFileExist =
          locations.some(location => location.breakpoint.url() === breakpoint.url());
      if (!otherBreakpointsOnSameFileExist) {
        // Clear up the #collapsedFiles set from this url if no breakpoint is left in this group.
        this.#collapsedFiles.delete(breakpoint.url());
        this.#saveSettings();
      }
    }
    return this.update();
  }

  #saveSettings(): void {
    this.#collapsedFilesSettings.set(Array.from(this.#collapsedFiles.values()));
  }

  #getBreakpointTypeAndDetails(locations: Breakpoints.BreakpointManager.BreakpointLocation[]):
      {type: SDK.DebuggerModel.BreakpointType, hoverText?: string} {
    const breakpointWithCondition = locations.find(location => Boolean(location.breakpoint.condition()));
    const breakpoint = breakpointWithCondition?.breakpoint;
    if (!breakpoint || !breakpoint.condition()) {
      return {type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT};
    }

    const condition = breakpoint.condition();
    if (breakpoint.isLogpoint()) {
      return {type: SDK.DebuggerModel.BreakpointType.LOGPOINT, hoverText: condition};
    }

    return {type: SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT, hoverText: condition};
  }

  #getLocationsForBreakpointItem(breakpointItem: BreakpointItem): Breakpoints.BreakpointManager.BreakpointLocation[] {
    const locations = this.#breakpointItemToLocationMap.get(breakpointItem);
    assertNotNullOrUndefined(locations);
    return locations;
  }

  async #getHitUILocation(): Promise<Workspace.UISourceCode.UILocation|null> {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (details && details.callFrames.length) {
      return await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
          details.callFrames[0].location());
    }
    return null;
  }

  #getBreakpointLocations(): Breakpoints.BreakpointManager.BreakpointLocation[] {
    const locations = this.#breakpointManager.allBreakpointLocations().filter(
        breakpointLocation =>
            breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger);

    locations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));

    const result = [];
    let lastBreakpoint: Breakpoints.BreakpointManager.Breakpoint|null = null;
    let lastLocation: Workspace.UISourceCode.UILocation|null = null;
    for (const location of locations) {
      if (location.breakpoint !== lastBreakpoint || (lastLocation && location.uiLocation.compareTo(lastLocation))) {
        result.push(location);
        lastBreakpoint = location.breakpoint;
        lastLocation = location.uiLocation;
      }
    }
    return result;
  }

  #groupBreakpointLocationsById(breakpointLocations: Breakpoints.BreakpointManager.BreakpointLocation[]):
      Breakpoints.BreakpointManager.BreakpointLocation[][] {
    const map = new Platform.MapUtilities.Multimap<string, Breakpoints.BreakpointManager.BreakpointLocation>();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      map.set(uiLocation.id(), breakpointLocation);
    }
    const arr: Breakpoints.BreakpointManager.BreakpointLocation[][] = [];
    for (const id of map.keysArray()) {
      const locations = Array.from(map.get(id));
      if (locations.length) {
        arr.push(locations);
      }
    }
    return arr;
  }

  #getLocationIdsByLineId(breakpointLocations: Breakpoints.BreakpointManager.BreakpointLocation[]):
      Platform.MapUtilities.Multimap<string, string> {
    const result = new Platform.MapUtilities.Multimap<string, string>();

    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      result.set(uiLocation.lineId(), uiLocation.id());
    }

    return result;
  }

  #getBreakpointState(locations: Breakpoints.BreakpointManager.BreakpointLocation[]): BreakpointStatus {
    const hasEnabled = locations.some(location => location.breakpoint.enabled());
    const hasDisabled = locations.some(location => !location.breakpoint.enabled());
    let status: BreakpointStatus;
    if (hasEnabled) {
      status = hasDisabled ? BreakpointStatus.INDETERMINATE : BreakpointStatus.ENABLED;
    } else {
      status = BreakpointStatus.DISABLED;
    }
    return status;
  }

  #getContent(locations: Breakpoints.BreakpointManager.BreakpointLocation[][]):
      Promise<TextUtils.ContentData.ContentData[]> {
    return Promise.all(locations.map(async ([{uiLocation: {uiSourceCode}}]) => {
      const contentData = await uiSourceCode.requestContentData({cachedWasmOnly: true});
      return TextUtils.ContentData.ContentData.contentDataOrEmpty(contentData);
    }));
  }
}

export class BreakpointsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #controller: BreakpointsSidebarController;

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): BreakpointsView {
    if (!breakpointsViewInstance || forceNew) {
      breakpointsViewInstance = LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, new BreakpointsView());
    }
    return breakpointsViewInstance.getComponent();
  }

  constructor() {
    super();
    this.#controller = BreakpointsSidebarController.instance();
    this.setAttribute('jslog', `${VisualLogging.section('sources.js-breakpoints')}`);
    void this.#controller.update();
  }

  static readonly litTagName = LitHtml.literal`devtools-breakpoint-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #pauseOnUncaughtExceptions: boolean = false;
  #pauseOnCaughtExceptions: boolean = false;

  // TODO(crbug.com/1382762): Remove special casing with dependent toggles as soon as Node LTS caught up on independent pause of exception toggles.
  #independentPauseToggles: boolean = false;

  #breakpointsActive: boolean = true;
  #breakpointGroups: BreakpointGroup[] = [];
  #urlToDifferentiatingPath: Map<Platform.DevToolsPath.UrlString, string> = new Map();

  set data(data: BreakpointsViewData) {
    this.#pauseOnUncaughtExceptions = data.pauseOnUncaughtExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#independentPauseToggles = data.independentPauseToggles;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;

    const titleInfos: TitleInfo[] = [];
    for (const group of data.groups) {
      titleInfos.push({name: group.name, url: group.url});
    }
    this.#urlToDifferentiatingPath = getDifferentiatingPathMap(titleInfos);

    void this.render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, breakpointsViewStyles];
  }

  override async render(): Promise<void> {
    await coordinator.write('BreakpointsView render', () => {
      const clickHandler = async(event: Event): Promise<void> => {
        const currentTarget = event.currentTarget as HTMLElement;
        await this.#setSelected(currentTarget);
        event.consume();
      };

      const pauseOnCaughtIsChecked =
          (this.#independentPauseToggles || this.#pauseOnUncaughtExceptions) && this.#pauseOnCaughtExceptions;
      const pauseOnCaughtExceptionIsDisabled = !this.#independentPauseToggles && !this.#pauseOnUncaughtExceptions;
      // clang-format off
      const out = LitHtml.html`
        <div class='pause-on-uncaught-exceptions'
            tabindex='0'
            @click=${clickHandler}
            @keydown=${this.#keyDownHandler}
            role='checkbox'
            aria-checked=${this.#pauseOnUncaughtExceptions}
            data-first-pause>
          <label class='checkbox-label'>
            <input type='checkbox' tabindex=-1 class="small" ?checked=${this.#pauseOnUncaughtExceptions} @change=${this.#onPauseOnUncaughtExceptionsStateChanged.bind(this)} jslog=${VisualLogging.toggle('pause-uncaught').track({ change: true })}>
            <span>${i18nString(UIStrings.pauseOnUncaughtExceptions)}</span>
          </label>
        </div>
        <div class='pause-on-caught-exceptions'
              tabindex='-1'
              @click=${clickHandler}
              @keydown=${this.#keyDownHandler}
              role='checkbox'
              aria-checked=${pauseOnCaughtIsChecked}
              data-last-pause>
            <label class='checkbox-label'>
              <input data-pause-on-caught-checkbox type='checkbox' class="small" tabindex=-1 ?checked=${pauseOnCaughtIsChecked} ?disabled=${pauseOnCaughtExceptionIsDisabled} @change=${this.#onPauseOnCaughtExceptionsStateChanged.bind(this)} jslog=${VisualLogging.toggle('pause-on-caught-exception').track({ change: true })}>
              <span>${i18nString(UIStrings.pauseOnCaughtExceptions)}</span>
            </label>
        </div>
        <div role=tree>
          ${LitHtml.Directives.repeat(
            this.#breakpointGroups,
            group => group.url,
            (group, groupIndex) => LitHtml.html`${this.#renderBreakpointGroup(group, groupIndex)}`)}
        </div>`;
      // clang-format on
      LitHtml.render(out, this.#shadow, {host: this});
    });

    // If no element is tabbable, set the pause-on-exceptions to be tabbable. This can happen
    // if the previously focused element was removed.
    await coordinator.write('BreakpointsView make pause-on-exceptions focusable', () => {
      if (this.#shadow.querySelector('[tabindex="0"]') === null) {
        const element = this.#shadow.querySelector<HTMLElement>('[data-first-pause]');
        element?.setAttribute('tabindex', '0');
      }
    });
  }

  async #keyDownHandler(event: KeyboardEvent): Promise<void> {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.consume(true);
      return this.#handleHomeOrEndKey(event.key);
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.consume(true);
      return this.#handleArrowKey(event.key, event.target);
    }
    if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      const currentTarget = event.currentTarget as HTMLElement;
      await this.#setSelected(currentTarget);
      const input = currentTarget.querySelector<HTMLInputElement>('input');
      if (input) {
        input.click();
      }
      event.consume();
    }
    return;
  }

  async #setSelected(element: HTMLElement|null): Promise<void> {
    if (!element) {
      return;
    }
    void coordinator.write('BreakpointsView focus on selected element', () => {
      const prevSelected = this.#shadow.querySelector('[tabindex="0"]');
      prevSelected?.setAttribute('tabindex', '-1');
      element.setAttribute('tabindex', '0');
      element.focus();
    });
  }

  async #handleArrowKey(key: Platform.KeyboardUtilities.ArrowKey, target: HTMLElement): Promise<void> {
    const setGroupExpandedState = (detailsElement: HTMLDetailsElement, expanded: boolean): Promise<void> => {
      if (expanded) {
        return coordinator.write('BreakpointsView expand', () => {
          detailsElement.setAttribute('open', '');
        });
      }
      return coordinator.write('BreakpointsView expand', () => {
        detailsElement.removeAttribute('open');
      });
    };
    const nextNode = await findNextNodeForKeyboardNavigation(target, key, setGroupExpandedState);
    return this.#setSelected(nextNode);
  }

  async #handleHomeOrEndKey(key: 'Home'|'End'): Promise<void> {
    if (key === 'Home') {
      const pauseOnExceptionsNode = this.#shadow.querySelector<HTMLElement>('[data-first-pause]');
      return this.#setSelected(pauseOnExceptionsNode);
    }
    if (key === 'End') {
      const numGroups = this.#breakpointGroups.length;
      if (numGroups === 0) {
        const lastPauseOnExceptionsNode = this.#shadow.querySelector<HTMLElement>('[data-last-pause]');
        return this.#setSelected(lastPauseOnExceptionsNode);
      }
      const lastGroupIndex = numGroups - 1;
      const lastGroup = this.#breakpointGroups[lastGroupIndex];

      if (lastGroup.expanded) {
        const lastBreakpointItem =
            this.#shadow.querySelector<HTMLElement>('[data-last-group] > [data-last-breakpoint]');
        return this.#setSelected(lastBreakpointItem);
      }
      const lastGroupSummaryElement = this.#shadow.querySelector<HTMLElement>('[data-last-group] > summary');
      return this.#setSelected(lastGroupSummaryElement);
    }
    return;
  }

  #renderEditBreakpointButton(breakpointItem: BreakpointItem): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      void this.#controller.breakpointEdited(breakpointItem, true /* editButtonClicked */);
      event.consume();
    };
    const title = breakpointItem.type === SDK.DebuggerModel.BreakpointType.LOGPOINT ?
        i18nString(UIStrings.editLogpoint) :
        i18nString(UIStrings.editCondition);
    // clang-format off
    return LitHtml.html`
    <button data-edit-breakpoint @click=${clickHandler} title=${title} jslog=${VisualLogging.action('edit-breakpoint').track({click: true})}>
      <${IconButton.Icon.Icon.litTagName} name="edit"></${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
    // clang-format on
  }

  #renderRemoveBreakpointButton(
      breakpointItems: BreakpointItem[], tooltipText: string, action: Host.UserMetrics.Action): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      Host.userMetrics.actionTaken(action);
      void this.#controller.breakpointsRemoved(breakpointItems);
      event.consume();
    };
    // clang-format off
    return LitHtml.html`
    <button data-remove-breakpoint @click=${clickHandler} title=${tooltipText} aria-label=${tooltipText} jslog=${VisualLogging.action('remove-breakpoint').track({click: true})}>
      <${IconButton.Icon.Icon.litTagName} name="bin"></${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
    // clang-format on
  }

  #onBreakpointGroupContextMenu(event: Event, breakpointGroup: BreakpointGroup): void {
    const {breakpointItems} = breakpointGroup;
    const menu = new UI.ContextMenu.ContextMenu(event);

    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpointsInFile), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileRemovedFromContextMenu);
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, {jslogContext: 'remove-file-breakpoints'});
    const otherGroups = this.#breakpointGroups.filter(group => group !== breakpointGroup);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      const breakpointItems = otherGroups.map(({breakpointItems}) => breakpointItems).flat();
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, {disabled: otherGroups.length === 0, jslogContext: 'remove-other-breakpoints'});
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems).flat();
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, {jslogContext: 'remove-all-breakpoints'});

    const notEnabledItems =
        breakpointItems.filter(breakpointItem => breakpointItem.status !== BreakpointStatus.ENABLED);
    menu.debugSection().appendItem(i18nString(UIStrings.enableAllBreakpointsInFile), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileEnabledDisabledFromContextMenu);
      for (const breakpointItem of notEnabledItems) {
        this.#controller.breakpointStateChanged(breakpointItem, true);
      }
    }, {disabled: notEnabledItems.length === 0, jslogContext: 'enable-file-breakpoints'});
    const notDisabledItems =
        breakpointItems.filter(breakpointItem => breakpointItem.status !== BreakpointStatus.DISABLED);
    menu.debugSection().appendItem(i18nString(UIStrings.disableAllBreakpointsInFile), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileEnabledDisabledFromContextMenu);
      for (const breakpointItem of notDisabledItems) {
        this.#controller.breakpointStateChanged(breakpointItem, false);
      }
    }, {disabled: notDisabledItems.length === 0, jslogContext: 'disable-file-breakpoints'});

    void menu.show();
  }

  #renderBreakpointGroup(group: BreakpointGroup, groupIndex: number): LitHtml.TemplateResult {
    const contextmenuHandler = (event: Event): void => {
      this.#onBreakpointGroupContextMenu(event, group);
      event.consume();
    };
    const toggleHandler = (event: Event): void => {
      const htmlDetails = event.target as HTMLDetailsElement;
      group.expanded = htmlDetails.open;
      void this.#controller.expandedStateChanged(group.url, group.expanded);
    };
    const clickHandler = async(event: Event): Promise<void> => {
      const selected = event.currentTarget as HTMLElement;
      await this.#setSelected(selected);
      // Record the metric for expanding/collapsing in the click handler,
      // as we only then get the number of expand/collapse actions that were
      // initiated by the user.
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointGroupExpandedStateChanged);
      event.consume();
    };
    const classMap = {
      active: this.#breakpointsActive,
    };
    // clang-format off
    return LitHtml.html`
      <details class=${LitHtml.Directives.classMap(classMap)}
               ?data-first-group=${groupIndex === 0}
               ?data-last-group=${groupIndex === this.#breakpointGroups.length - 1}
               role=group
               aria-label='${group.name}'
               aria-description='${group.url}'
               ?open=${LitHtml.Directives.live(group.expanded)}
               @toggle=${toggleHandler}>
          <summary @contextmenu=${contextmenuHandler}
                   tabindex='-1'
                   @keydown=${this.#keyDownHandler}
                   @click=${clickHandler}>
            <span class='group-header' aria-hidden=true><span class='group-icon-or-disable'>${this.#renderFileIcon()}${this.#renderGroupCheckbox(group)}</span><span class='group-header-title' title='${group.url}'>${group.name}<span class='group-header-differentiator'>${this.#urlToDifferentiatingPath.get(group.url)}</span></span></span>
            <span class='group-hover-actions'>
              ${this.#renderRemoveBreakpointButton(group.breakpointItems, i18nString(UIStrings.removeAllBreakpointsInFile), Host.UserMetrics.Action.BreakpointsInFileRemovedFromRemoveButton)}
            </span>
          </summary>
        ${LitHtml.Directives.repeat(
          group.breakpointItems,
          item => item.id,
          (item, breakpointItemIndex) => this.#renderBreakpointEntry(item, group.editable, groupIndex, breakpointItemIndex))}
      </details>
      `;
    // clang-format on
  }

  #renderGroupCheckbox(group: BreakpointGroup): LitHtml.TemplateResult {
    const groupCheckboxToggled = (e: Event): void => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileCheckboxToggled);
      const element = e.target as HTMLInputElement;
      const updatedStatus = element.checked ? BreakpointStatus.ENABLED : BreakpointStatus.DISABLED;
      const itemsToUpdate = group.breakpointItems.filter(item => item.status !== updatedStatus);
      itemsToUpdate.forEach(item => {
        this.#controller.breakpointStateChanged(item, element.checked);
      });
      e.consume();
    };

    const checked = group.breakpointItems.some(item => item.status === BreakpointStatus.ENABLED);
    return LitHtml.html`
      <input class='group-checkbox small' type='checkbox'
            aria-label=''
            .checked=${checked}
            @change=${groupCheckboxToggled}
            tabindex=-1
            jslog=${VisualLogging.toggle('breakpoint-group').track({
      change: true,
    })}>
    `;
  }

  #renderFileIcon(): LitHtml.TemplateResult {
    return LitHtml.html`<${IconButton.Icon.Icon.litTagName} name="file-script"></${IconButton.Icon.Icon.litTagName}>`;
  }

  #onBreakpointEntryContextMenu(event: Event, breakpointItem: BreakpointItem, editable: boolean): void {
    const items = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems).flat();
    const otherItems = items.filter(item => item !== breakpointItem);

    const menu = new UI.ContextMenu.ContextMenu(event);
    const editBreakpointText = breakpointItem.type === SDK.DebuggerModel.BreakpointType.LOGPOINT ?
        i18nString(UIStrings.editLogpoint) :
        i18nString(UIStrings.editCondition);
    menu.revealSection().appendItem(i18nString(UIStrings.revealLocation), () => {
      void this.#controller.jumpToSource(breakpointItem);
    }, {jslogContext: 'jump-to-breakpoint'});

    menu.editSection().appendItem(editBreakpointText, () => {
      void this.#controller.breakpointEdited(breakpointItem, false /* editButtonClicked */);
    }, {disabled: !editable, jslogContext: 'edit-breakpoint'});

    menu.defaultSection().appendItem(
        i18nString(UIStrings.enableAllBreakpoints),
        items.forEach.bind(items, item => this.#controller.breakpointStateChanged(item, true)), {
          disabled: items.every(item => item.status === BreakpointStatus.ENABLED),
          jslogContext: 'enable-all-breakpoints',
        });
    menu.defaultSection().appendItem(
        i18nString(UIStrings.disableAllBreakpoints),
        items.forEach.bind(items, item => this.#controller.breakpointStateChanged(item, false)), {
          disabled: items.every(item => item.status === BreakpointStatus.DISABLED),
          jslogContext: 'disable-all-breakpoints',
        });

    menu.footerSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointRemovedFromContextMenu);
      void this.#controller.breakpointsRemoved([breakpointItem]);
    }, {jslogContext: 'remove-breakpoint'});
    menu.footerSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      void this.#controller.breakpointsRemoved(otherItems);
    }, {disabled: otherItems.length === 0, jslogContext: 'remove-other-breakpoints'});
    menu.footerSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems).flat();
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, {jslogContext: 'remove-all-breakpoints'});

    void menu.show();
  }

  #renderBreakpointEntry(
      breakpointItem: BreakpointItem, editable: boolean, groupIndex: number,
      breakpointItemIndex: number): LitHtml.TemplateResult {
    const codeSnippetClickHandler = (event: Event): void => {
      void this.#controller.jumpToSource(breakpointItem);
      event.consume();
    };
    const breakpointItemClickHandler = async(event: Event): Promise<void> => {
      const target = event.currentTarget as HTMLDivElement;
      await this.#setSelected(target);
      event.consume();
    };
    const contextmenuHandler = (event: Event): void => {
      this.#onBreakpointEntryContextMenu(event, breakpointItem, editable);
      event.consume();
    };
    const classMap = {
      'breakpoint-item': true,
      hit: breakpointItem.isHit,
      'conditional-breakpoint': breakpointItem.type === SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT,
      logpoint: breakpointItem.type === SDK.DebuggerModel.BreakpointType.LOGPOINT,
    };
    const breakpointItemDescription = this.#getBreakpointItemDescription(breakpointItem);
    const codeSnippet = Platform.StringUtilities.trimEndWithMaxLength(breakpointItem.codeSnippet, MAX_SNIPPET_LENGTH);
    const codeSnippetTooltip = this.#getCodeSnippetTooltip(breakpointItem.type, breakpointItem.hoverText);
    const itemsInGroup = this.#breakpointGroups[groupIndex].breakpointItems;

    // clang-format off
    return LitHtml.html`
    <div class=${LitHtml.Directives.classMap(classMap)}
         ?data-first-breakpoint=${breakpointItemIndex === 0}
         ?data-last-breakpoint=${breakpointItemIndex === itemsInGroup.length - 1}
         aria-label=${breakpointItemDescription}
         role=treeitem
         tabindex='-1'
         @contextmenu=${contextmenuHandler}
         @click=${breakpointItemClickHandler}
         @keydown=${this.#keyDownHandler}>
      <label class='checkbox-label'>
        <span class='type-indicator'></span>
        <input type='checkbox'
              aria-label=${breakpointItem.location}
              class='small'
              ?indeterminate=${breakpointItem.status === BreakpointStatus.INDETERMINATE}
              .checked=${breakpointItem.status === BreakpointStatus.ENABLED}
              @change=${(e: Event) => this.#onCheckboxToggled(e, breakpointItem)}
              tabindex=-1
              jslog=${VisualLogging.toggle('breakpoint').track({change: true})}>
      </label>
      <span class='code-snippet' @click=${codeSnippetClickHandler} title=${LitHtml.Directives.ifDefined(codeSnippetTooltip)} jslog=${VisualLogging.action('sources.jump-to-breakpoint').track({click: true})}>${codeSnippet}</span>
      <span class='breakpoint-item-location-or-actions'>
        ${editable ? this.#renderEditBreakpointButton(breakpointItem) : LitHtml.nothing}
        ${this.#renderRemoveBreakpointButton([breakpointItem], i18nString(UIStrings.removeBreakpoint), Host.UserMetrics.Action.BreakpointRemovedFromRemoveButton)}
        <span class='location'>${breakpointItem.location}</span>
      </span>
    </div>
    `;
    // clang-format on
  }

  #getCodeSnippetTooltip(type: SDK.DebuggerModel.BreakpointType, hoverText?: string): string|undefined {
    switch (type) {
      case SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT:
        return undefined;
      case SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.conditionCode, {PH1: hoverText});
      case SDK.DebuggerModel.BreakpointType.LOGPOINT:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.logpointCode, {PH1: hoverText});
    }
  }

  #getBreakpointItemDescription(breakpointItem: BreakpointItem): Platform.UIString.LocalizedString {
    let checkboxDescription;
    switch (breakpointItem.status) {
      case BreakpointStatus.ENABLED:
        checkboxDescription = i18nString(UIStrings.checked);
        break;
      case BreakpointStatus.DISABLED:
        checkboxDescription = i18nString(UIStrings.unchecked);
        break;
      case BreakpointStatus.INDETERMINATE:
        checkboxDescription = i18nString(UIStrings.indeterminate);
        break;
    }
    if (!breakpointItem.isHit) {
      return checkboxDescription;
    }
    return i18nString(UIStrings.breakpointHit, {PH1: checkboxDescription});
  }

  #onCheckboxToggled(e: Event, item: BreakpointItem): void {
    const element = e.target as HTMLInputElement;
    this.#controller.breakpointStateChanged(item, element.checked);
  }

  #onPauseOnCaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.#controller.setPauseOnCaughtExceptions(checked);
  }

  #onPauseOnUncaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    if (!this.#independentPauseToggles) {
      const pauseOnCaughtCheckbox = this.#shadow.querySelector<HTMLInputElement>('[data-pause-on-caught-checkbox]');
      assertNotNullOrUndefined(pauseOnCaughtCheckbox);
      if (!checked && pauseOnCaughtCheckbox.checked) {
        // If we can only pause on caught exceptions if we pause on uncaught exceptions, make sure to
        // uncheck the pause on caught exception checkbox.
        pauseOnCaughtCheckbox.click();
      }

      void coordinator.write('BreakpointsView update pause-on-uncaught-exception', () => {
        // Disable/enable the pause on caught exception checkbox depending on whether
        // or not we are pausing on uncaught exceptions.
        if (checked) {
          pauseOnCaughtCheckbox.disabled = false;
        } else {
          pauseOnCaughtCheckbox.disabled = true;
        }
      });
    }
    this.#controller.setPauseOnUncaughtExceptions(checked);
  }
}

customElements.define('devtools-breakpoint-view', BreakpointsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breakpoint-view': BreakpointsView;
  }
}
