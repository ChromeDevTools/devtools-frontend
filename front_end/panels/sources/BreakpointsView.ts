// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Input from '../../ui/components/input/input.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import breakpointsViewStyles from './breakpointsView.css.js';
import {findNextNodeForKeyboardNavigation, getDifferentiatingPathMap, type TitleInfo} from './BreakpointsViewUtils.js';

const {html, render, Directives: {ifDefined, repeat, classMap, live}} = Lit;

const UIStrings = {
  /**
   * @description Label for a checkbox to toggle pausing on uncaught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an uncaught exception is thrown at runtime.
   */
  pauseOnUncaughtExceptions: 'Pause on uncaught exceptions',
  /**
   * @description Label for a checkbox to toggling pausing on caught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an exception is thrown, but caught (handled) at runtime.
   */
  pauseOnCaughtExceptions: 'Pause on caught exceptions',
  /**
   * @description Text exposed to screen readers on checked items.
   */
  checked: 'checked',
  /**
   * @description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: 'unchecked',
  /**
   * @description Accessible text for a breakpoint collection with a combination of checked states.
   */
  indeterminate: 'mixed',
  /**
   * @description Accessibility label for hit breakpoints in the Sources panel.
   * @example {checked} PH1
   */
  breakpointHit: '{PH1} breakpoint hit',
  /**
   * @description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint groups.
   */
  removeAllBreakpointsInFile: 'Remove all breakpoints in file',
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints in a file.
   */
  disableAllBreakpointsInFile: 'Disable all breakpoints in file',
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints in a file.
   */
  enableAllBreakpointsInFile: 'Enable all breakpoints in file',
  /**
   * @description Tooltip text that shows when hovered over an edit button that appears next to a breakpoint or conditional breakpoint in the breakpoint sidebar of the sources panel.
   */
  editCondition: 'Edit condition',
  /**
   * @description Tooltip text that shows when hovered over an edit button that appears next to a logpoint in the breakpoint sidebar of the sources panel.
   */
  editLogpoint: 'Edit logpoint',
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints.
   */
  disableAllBreakpoints: 'Disable all breakpoints',
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints.
   */
  enableAllBreakpoints: 'Enable all breakpoints',
  /**
   * @description Tooltip text that shows when hovered over a remove button that appears next to a breakpoint in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint items.
   */
  removeBreakpoint: 'Remove breakpoint',
  /**
   * @description Text to remove all breakpoints
   */
  removeAllBreakpoints: 'Remove all breakpoints',
  /**
   * @description Text in Breakpoints Sidebar Pane of the Sources panel
   */
  removeOtherBreakpoints: 'Remove other breakpoints',
  /**
   * @description Context menu item that reveals the source code location of a breakpoint in the Sources panel.
   */
  revealLocation: 'Reveal location',
  /**
   * @description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows the condition, on which the breakpoint will stop.
   * @example {x < 3} PH1
   */
  conditionCode: 'Condition: {PH1}',
  /**
   * @description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows what is going to be printed in the console, if execution hits this breakpoint.
   * @example {'hello'} PH1
   */
  logpointCode: 'Logpoint: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/BreakpointsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_SNIPPET_LENGTH = 200;

export interface BreakpointsViewData {
  breakpointsActive: boolean;
  pauseOnUncaughtExceptions: boolean;
  pauseOnCaughtExceptions: boolean;
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

let breakpointsViewInstance: BreakpointsView|null = null;
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
    const pauseOnUncaughtExceptions = this.#pauseOnUncaughtExceptionSetting.get();
    const pauseOnCaughtExceptions = this.#pauseOnCaughtExceptionSetting.get();

    const breakpointLocations = this.#getBreakpointLocations();
    if (!breakpointLocations.length) {
      return {
        breakpointsActive,
        pauseOnCaughtExceptions,
        pauseOnUncaughtExceptions,
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
      const scriptId = fstLocation.uiLocation.uiSourceCode.canonicalScriptId();
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
    if (!breakpoint?.condition()) {
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
    if (details?.callFrames.length) {
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

/**
 * These properties should really be part of {@link BreakpointItem}, but for migrating
 * to the UI eng vision, we use a Map<BreakpointItemId, BreakpointItemDetails>.
 */
export interface BreakpointItemDetails {
  itemDescription: string;
  codeSnippet: string;
  codeSnippetTooltip: string|undefined;
}

export interface BreakpointsViewInput {
  clickHandler: (event: Event) => void;
  keyDownHandler: (event: KeyboardEvent) => Promise<void>;
  pauseOnUncaughtExceptions: boolean;
  onPauseOnUncaughtExceptionsStateChanged: (event: Event) => void;
  pauseOnCaughtExceptions: boolean;
  onPauseOnCaughtExceptionsStateChanged: (event: Event) => void;
  breakpointGroups: BreakpointGroup[];
  breakpointsActive: boolean;
  groupContextMenuHandler: (group: BreakpointGroup, event: Event) => void;
  groupToggleHandler: (group: BreakpointGroup, event: Event) => void;
  groupClickHandler: (event: Event) => void;
  groupCheckboxToggled: (group: BreakpointGroup, event: Event) => void;
  urlToDifferentiatingPath: Map<Platform.DevToolsPath.UrlString, string>;
  removeAllBreakpointsInFileClickHandler: (items: BreakpointItem[], event: Event) => void;
  itemDetails: Map<string, BreakpointItemDetails>;
  itemContextMenuHandler: (item: BreakpointItem, editable: boolean, event: Event) => void;
  itemClickHandler: (event: Event) => void;
  itemSnippetClickHandler: (item: BreakpointItem, event: Event) => void;
  itemCheckboxToggled: (item: BreakpointItem, event: Event) => void;
  itemEditClickHandler: (item: BreakpointItem, event: Event) => void;
  itemRemoveClickHandler: (item: BreakpointItem, event: Event) => void;
}

export type View = (input: BreakpointsViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${Input.checkboxStyles}</style>
    <style>${breakpointsViewStyles}</style>
    <div jslog=${VisualLogging.section('sources.js-breakpoints')} id="devtools-breakpoint-view">
      <div class='pause-on-uncaught-exceptions'
          tabindex='0'
          @click=${input.clickHandler}
          @keydown=${input.keyDownHandler}
          role='checkbox'
          aria-checked=${input.pauseOnUncaughtExceptions}
          data-first-pause>
        <label class='checkbox-label'>
          <input type='checkbox' tabindex=-1 class="small" ?checked=${input.pauseOnUncaughtExceptions} @change=${input.onPauseOnUncaughtExceptionsStateChanged} jslog=${VisualLogging.toggle('pause-uncaught').track({ change: true })}>
          <span>${i18nString(UIStrings.pauseOnUncaughtExceptions)}</span>
        </label>
      </div>
      <div class='pause-on-caught-exceptions'
            tabindex='-1'
            @click=${input.clickHandler}
            @keydown=${input.keyDownHandler}
            role='checkbox'
            aria-checked=${input.pauseOnCaughtExceptions}
            data-last-pause>
          <label class='checkbox-label'>
            <input data-pause-on-caught-checkbox type='checkbox' class="small" tabindex=-1 ?checked=${input.pauseOnCaughtExceptions} @change=${input.onPauseOnCaughtExceptionsStateChanged.bind(this)} jslog=${VisualLogging.toggle('pause-on-caught-exception').track({ change: true })}>
            <span>${i18nString(UIStrings.pauseOnCaughtExceptions)}</span>
          </label>
      </div>
      <div role=tree>
        ${repeat(
          input.breakpointGroups,
          group => group.url,
          (group, groupIndex) => html`
            <details class=${classMap({active: input.breakpointsActive})}
                  ?data-first-group=${groupIndex === 0}
                  ?data-last-group=${groupIndex === input.breakpointGroups.length - 1}
                  role=group
                  aria-label='${group.name}'
                  aria-description='${group.url}'
                  ?open=${live(group.expanded)}
                  @toggle=${input.groupToggleHandler.bind(undefined, group)}>
              <summary @contextmenu=${input.groupContextMenuHandler.bind(undefined, group)}
                      tabindex='-1'
                      @keydown=${input.keyDownHandler}
                      @click=${input.clickHandler}>
                <span class='group-header' aria-hidden=true>
                  <span class='group-icon-or-disable'>
                    <devtools-icon name="file-script"></devtools-icon>
                    <input class='group-checkbox small' type='checkbox'
                          aria-label=''
                          .checked=${group.breakpointItems.some(item => item.status === BreakpointStatus.ENABLED)}
                          @change=${input.groupCheckboxToggled.bind(undefined, group)}
                          tabindex=-1
                          jslog=${VisualLogging.toggle('breakpoint-group').track({change: true,})}></input>
                  </span>
                  <span class='group-header-title' title='${group.url}'>
                    ${group.name}
                    <span class='group-header-differentiator'>
                      ${input.urlToDifferentiatingPath.get(group.url)}
                    </span>
                  </span>
                </span>
                <span class='group-hover-actions'>
                  <button data-remove-breakpoint
                          @click=${input.removeAllBreakpointsInFileClickHandler.bind(undefined, group.breakpointItems)}
                          title=${i18nString(UIStrings.removeAllBreakpointsInFile)}
                          aria-label=${i18nString(UIStrings.removeAllBreakpointsInFile)}
                          jslog=${VisualLogging.action('remove-breakpoint').track({click: true})}>
                    <devtools-icon name="bin"></devtools-icon>
                  </button>
                </span>
              </summary>
            ${repeat(
              group.breakpointItems,
              item => item.id,
              (item, itemIndex) => html`
                <div class=${classMap({
                        'breakpoint-item': true,
                        hit: item.isHit,
                        'conditional-breakpoint': item.type === SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT,
                        logpoint: item.type === SDK.DebuggerModel.BreakpointType.LOGPOINT,
                      })}
                    ?data-first-breakpoint=${itemIndex === 0}
                    ?data-last-breakpoint=${itemIndex === group.breakpointItems.length - 1}
                    aria-label=${ifDefined(input.itemDetails.get(item.id)?.itemDescription)}
                    role=treeitem
                    tabindex='-1'
                    @contextmenu=${input.itemContextMenuHandler.bind(undefined, item, group.editable)}
                    @click=${input.itemClickHandler}
                    @keydown=${input.keyDownHandler}>
                  <label class='checkbox-label'>
                    <span class='type-indicator'></span>
                    <input type='checkbox'
                          aria-label=${item.location}
                          class='small'
                          ?indeterminate=${item.status === BreakpointStatus.INDETERMINATE}
                          .checked=${item.status === BreakpointStatus.ENABLED}
                          @change=${input.itemCheckboxToggled.bind(undefined, item)}
                          tabindex=-1
                          jslog=${VisualLogging.toggle('breakpoint').track({change: true})}>
                  </label>
                  <span class='code-snippet' @click=${input.itemSnippetClickHandler.bind(undefined, item)}
                          title=${ifDefined(input.itemDetails.get(item.id)?.codeSnippetTooltip)}
                          jslog=${VisualLogging.action('sources.jump-to-breakpoint').track({click: true})}>${input.itemDetails.get(item.id)?.codeSnippet}</span>
                  <span class='breakpoint-item-location-or-actions'>
                    ${group.editable ? html`
                          <button data-edit-breakpoint @click=${input.itemEditClickHandler.bind(undefined, item)}
                                  title=${item.type === SDK.DebuggerModel.BreakpointType.LOGPOINT ? i18nString(UIStrings.editLogpoint) : i18nString(UIStrings.editCondition)}
                                  jslog=${VisualLogging.action('edit-breakpoint').track({click: true})}>
                            <devtools-icon name="edit"></devtools-icon>
                          </button>` : Lit.nothing}
                    <button data-remove-breakpoint
                            @click=${input.itemRemoveClickHandler.bind(undefined, item)}
                            title=${i18nString(UIStrings.removeBreakpoint)}
                            aria-label=${i18nString(UIStrings.removeBreakpoint)}
                            jslog=${VisualLogging.action('remove-breakpoint').track({click: true})}>
                      <devtools-icon name="bin"></devtools-icon>
                    </button>
                    <span class='location'>${item.location}</span>
                  </span>
                </div>`)}
            </details>`)}
      </div>
    </div>`, target);
  // clang-format on
};

export class BreakpointsView extends UI.Widget.VBox {
  readonly #view: View;
  readonly #controller: BreakpointsSidebarController;

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): BreakpointsView {
    if (!breakpointsViewInstance || forceNew) {
      breakpointsViewInstance = new BreakpointsView(undefined);
    }
    return breakpointsViewInstance;
  }

  constructor(element: HTMLElement|undefined, view: View = DEFAULT_VIEW) {
    // TODO(crbug.com/407751705): Scope CSS via naming/nesting and remove the shadow root.
    super(element, {useShadowDom: true});
    this.#view = view;
    this.#controller = BreakpointsSidebarController.instance();
    void this.#controller.update();
  }

  #pauseOnUncaughtExceptions = false;
  #pauseOnCaughtExceptions = false;

  #breakpointsActive = true;
  #breakpointGroups: BreakpointGroup[] = [];
  #urlToDifferentiatingPath = new Map<Platform.DevToolsPath.UrlString, string>();
  #breakpointItemDetails = new Map<string, BreakpointItemDetails>();

  set data(data: BreakpointsViewData) {
    this.#pauseOnUncaughtExceptions = data.pauseOnUncaughtExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;
    this.#breakpointItemDetails = new Map<string, BreakpointItemDetails>();

    const titleInfos: TitleInfo[] = [];
    for (const group of data.groups) {
      titleInfos.push({name: group.name, url: group.url});

      for (const item of group.breakpointItems) {
        this.#breakpointItemDetails.set(item.id, {
          itemDescription: this.#getBreakpointItemDescription(item),
          codeSnippet: Platform.StringUtilities.trimEndWithMaxLength(item.codeSnippet, MAX_SNIPPET_LENGTH),
          codeSnippetTooltip: this.#getCodeSnippetTooltip(item.type, item.hoverText),
        });
      }
    }
    this.#urlToDifferentiatingPath = getDifferentiatingPathMap(titleInfos);

    this.requestUpdate();
  }

  override wasShown(): void {
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: BreakpointsViewInput = {
      clickHandler: this.#clickHandler.bind(this),
      keyDownHandler: this.#keyDownHandler.bind(this),
      pauseOnUncaughtExceptions: this.#pauseOnUncaughtExceptions,
      onPauseOnUncaughtExceptionsStateChanged: this.#onPauseOnUncaughtExceptionsStateChanged.bind(this),
      pauseOnCaughtExceptions: this.#pauseOnCaughtExceptions,
      onPauseOnCaughtExceptionsStateChanged: this.#onPauseOnCaughtExceptionsStateChanged.bind(this),
      breakpointGroups: this.#breakpointGroups,
      breakpointsActive: this.#breakpointsActive,
      groupContextMenuHandler: this.#groupContextMenuHandler.bind(this),
      groupToggleHandler: this.#groupToggleHandler.bind(this),
      groupClickHandler: this.#groupClickHandler.bind(this),
      groupCheckboxToggled: this.#groupCheckboxToggled.bind(this),
      urlToDifferentiatingPath: this.#urlToDifferentiatingPath,
      removeAllBreakpointsInFileClickHandler: this.#removeAllBreakpointsInFileClickHandler.bind(this),
      itemDetails: this.#breakpointItemDetails,
      itemContextMenuHandler: this.#itemContextMenuHandler.bind(this),
      itemClickHandler: this.#itemClickHandler.bind(this),
      itemSnippetClickHandler: this.#itemSnippetClickHandler.bind(this),
      itemCheckboxToggled: this.#onCheckboxToggled.bind(this),
      itemEditClickHandler: this.#itemEditClickHandler.bind(this),
      itemRemoveClickHandler: this.#itemRemoveClickHandler.bind(this),
    };
    this.#view(input, {}, this.contentElement);

    // If no element is tabbable, set the pause-on-exceptions to be tabbable. This can happen
    // if the previously focused element was removed.
    if (this.contentElement.querySelector('[tabindex="0"]') === null) {
      const element = this.contentElement.querySelector<HTMLElement>('[data-first-pause]');
      element?.setAttribute('tabindex', '0');
    }
  }

  async #clickHandler(event: Event): Promise<void> {
    const currentTarget = event.currentTarget as HTMLElement;
    await this.#setSelected(currentTarget);
    event.consume();
  }

  #groupContextMenuHandler(group: BreakpointGroup, event: Event): void {
    this.#onBreakpointGroupContextMenu(event, group);
    event.consume();
  }

  #groupToggleHandler(group: BreakpointGroup, event: Event): void {
    const htmlDetails = event.target as HTMLDetailsElement;
    group.expanded = htmlDetails.open;
    void this.#controller.expandedStateChanged(group.url, group.expanded);
  }

  async #groupClickHandler(event: Event): Promise<void> {
    const selected = event.currentTarget as HTMLElement;
    await this.#setSelected(selected);
    // Record the metric for expanding/collapsing in the click handler,
    // as we only then get the number of expand/collapse actions that were
    // initiated by the user.
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointGroupExpandedStateChanged);
    event.consume();
  }

  #groupCheckboxToggled(group: BreakpointGroup, event: Event): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileCheckboxToggled);
    const element = event.target as HTMLInputElement;
    const updatedStatus = element.checked ? BreakpointStatus.ENABLED : BreakpointStatus.DISABLED;
    const itemsToUpdate = group.breakpointItems.filter(item => item.status !== updatedStatus);
    itemsToUpdate.forEach(item => {
      this.#controller.breakpointStateChanged(item, element.checked);
    });
    event.consume();
  }

  #removeAllBreakpointsInFileClickHandler(items: BreakpointItem[], event: Event): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointsInFileRemovedFromRemoveButton);
    void this.#controller.breakpointsRemoved(items);
    event.consume();
  }

  #itemContextMenuHandler(item: BreakpointItem, editable: boolean, event: Event): void {
    this.#onBreakpointEntryContextMenu(event, item, editable);
    event.consume();
  }

  async #itemClickHandler(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLDivElement;
    await this.#setSelected(target);
    event.consume();
  }

  #itemSnippetClickHandler(item: BreakpointItem, event: Event): void {
    void this.#controller.jumpToSource(item);
    event.consume();
  }

  #itemEditClickHandler(item: BreakpointItem, event: Event): void {
    void this.#controller.breakpointEdited(item, true /* editButtonClicked */);
    event.consume();
  }

  #itemRemoveClickHandler(item: BreakpointItem, event: Event): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointRemovedFromRemoveButton);
    void this.#controller.breakpointsRemoved([item]);
    event.consume();
  }

  async #keyDownHandler(event: KeyboardEvent): Promise<void> {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.consume(true);
      return await this.#handleHomeOrEndKey(event.key);
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.consume(true);
      return await this.#handleArrowKey(event.key, event.target);
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
    void RenderCoordinator.write('BreakpointsView focus on selected element', () => {
      const prevSelected = this.contentElement.querySelector('[tabindex="0"]');
      prevSelected?.setAttribute('tabindex', '-1');
      element.setAttribute('tabindex', '0');
      element.focus();
    });
  }

  async #handleArrowKey(key: Platform.KeyboardUtilities.ArrowKey, target: HTMLElement): Promise<void> {
    const setGroupExpandedState = (detailsElement: HTMLDetailsElement, expanded: boolean): Promise<void> => {
      if (expanded) {
        return RenderCoordinator.write('BreakpointsView expand', () => {
          detailsElement.setAttribute('open', '');
        });
      }
      return RenderCoordinator.write('BreakpointsView expand', () => {
        detailsElement.removeAttribute('open');
      });
    };
    const nextNode = await findNextNodeForKeyboardNavigation(target, key, setGroupExpandedState);
    return await this.#setSelected(nextNode);
  }

  async #handleHomeOrEndKey(key: 'Home'|'End'): Promise<void> {
    if (key === 'Home') {
      const pauseOnExceptionsNode = this.contentElement.querySelector<HTMLElement>('[data-first-pause]');
      return await this.#setSelected(pauseOnExceptionsNode);
    }
    if (key === 'End') {
      const numGroups = this.#breakpointGroups.length;
      if (numGroups === 0) {
        const lastPauseOnExceptionsNode = this.contentElement.querySelector<HTMLElement>('[data-last-pause]');
        return await this.#setSelected(lastPauseOnExceptionsNode);
      }
      const lastGroupIndex = numGroups - 1;
      const lastGroup = this.#breakpointGroups[lastGroupIndex];

      if (lastGroup.expanded) {
        const lastBreakpointItem =
            this.contentElement.querySelector<HTMLElement>('[data-last-group] > [data-last-breakpoint]');
        return await this.#setSelected(lastBreakpointItem);
      }
      const lastGroupSummaryElement = this.contentElement.querySelector<HTMLElement>('[data-last-group] > summary');
      return await this.#setSelected(lastGroupSummaryElement);
    }
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

  #onCheckboxToggled(item: BreakpointItem, event: Event): void {
    const element = event.target as HTMLInputElement;
    this.#controller.breakpointStateChanged(item, element.checked);
  }

  #onPauseOnCaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.#controller.setPauseOnCaughtExceptions(checked);
  }

  #onPauseOnUncaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.#controller.setPauseOnUncaughtExceptions(checked);
  }
}
