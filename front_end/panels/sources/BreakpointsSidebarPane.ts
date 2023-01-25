// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as SourcesComponents from './components/components.js';

let breakpointsSidebarPaneInstance: BreakpointsSidebarPane;
let breakpointsViewControllerInstance: BreakpointsSidebarController|null;

export class BreakpointsSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  readonly #breakpointsView: SourcesComponents.BreakpointsView.BreakpointsView;
  readonly #controller: BreakpointsSidebarController;

  static instance(): BreakpointsSidebarPane {
    if (!breakpointsSidebarPaneInstance) {
      breakpointsSidebarPaneInstance = new BreakpointsSidebarPane();
    }
    return breakpointsSidebarPaneInstance;
  }

  constructor() {
    super(true);
    this.#controller = BreakpointsSidebarController.instance();
    this.#breakpointsView = new SourcesComponents.BreakpointsView.BreakpointsView();
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.CheckboxToggledEvent.eventName, (event: Event) => {
          const {data: {breakpointItem, checked}} = event as SourcesComponents.BreakpointsView.CheckboxToggledEvent;
          this.#controller.breakpointStateChanged(breakpointItem, checked);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.BreakpointSelectedEvent.eventName, (event: Event) => {
          const {data: {breakpointItem}} = event as SourcesComponents.BreakpointsView.BreakpointSelectedEvent;
          void this.#controller.jumpToSource(breakpointItem);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.BreakpointEditedEvent.eventName, (event: Event) => {
          const {data: {breakpointItem}} = event as SourcesComponents.BreakpointsView.BreakpointEditedEvent;
          void this.#controller.breakpointEdited(breakpointItem);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.BreakpointsRemovedEvent.eventName, (event: Event) => {
          const {data: {breakpointItems}} = event as SourcesComponents.BreakpointsView.BreakpointsRemovedEvent;
          void this.#controller.breakpointsRemoved(breakpointItems);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.ExpandedStateChangedEvent.eventName, (event: Event) => {
          const {data: {url, expanded}} = event as SourcesComponents.BreakpointsView.ExpandedStateChangedEvent;
          void this.#controller.expandedStateChanged(url, expanded);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent.eventName, (event: Event) => {
          const {data: {checked}} =
              event as SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent;
          this.#controller.setPauseOnUncaughtExceptions(checked);
          event.consume();
        });
    this.#breakpointsView.addEventListener(
        SourcesComponents.BreakpointsView.PauseOnCaughtExceptionsStateChangedEvent.eventName, (event: Event) => {
          const {data: {checked}} = event as SourcesComponents.BreakpointsView.PauseOnCaughtExceptionsStateChangedEvent;
          this.#controller.setPauseOnCaughtExceptions(checked);
          event.consume();
        });

    this.contentElement.appendChild(this.#breakpointsView);
    this.update();
  }

  doUpdate(): Promise<void> {
    return this.#controller.update();
  }

  set data(data: SourcesComponents.BreakpointsView.BreakpointsViewData) {
    this.#breakpointsView.data = data;
  }
}

export class BreakpointsSidebarController implements UI.ContextFlavorListener.ContextFlavorListener {
  readonly #breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  readonly #breakpointItemToLocationMap =
      new WeakMap<SourcesComponents.BreakpointsView.BreakpointItem, Bindings.BreakpointManager.BreakpointLocation[]>();
  readonly #breakpointsActiveSetting: Common.Settings.Setting<boolean>;
  readonly #pauseOnUncaughtExceptionSetting: Common.Settings.Setting<boolean>;
  readonly #pauseOnCaughtExceptionSetting: Common.Settings.Setting<boolean>;

  readonly #collapsedFilesSettings: Common.Settings.Setting<Platform.DevToolsPath.UrlString[]>;
  readonly #collapsedFiles: Set<Platform.DevToolsPath.UrlString>;

  #updateScheduled = false;
  #updateRunning = false;

  private constructor(
      breakpointManager: Bindings.BreakpointManager.BreakpointManager, settings: Common.Settings.Settings) {
    this.#collapsedFilesSettings = Common.Settings.Settings.instance().createSetting('collapsedFiles', []);
    this.#collapsedFiles = new Set(this.#collapsedFilesSettings.get());
    this.#breakpointManager = breakpointManager;
    this.#breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this.#onBreakpointAdded, this);
    this.#breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this.#onBreakpointRemoved, this);
    this.#breakpointsActiveSetting = settings.moduleSetting('breakpointsActive');
    this.#breakpointsActiveSetting.addChangeListener(this.update, this);
    this.#pauseOnUncaughtExceptionSetting = settings.moduleSetting('pauseOnUncaughtException');
    this.#pauseOnUncaughtExceptionSetting.addChangeListener(this.update, this);
    this.#pauseOnCaughtExceptionSetting = settings.moduleSetting('pauseOnCaughtException');
    this.#pauseOnCaughtExceptionSetting.addChangeListener(this.update, this);
  }

  static instance({forceNew, breakpointManager, settings}: {
    forceNew: boolean|null,
    breakpointManager: Bindings.BreakpointManager.BreakpointManager,
    settings: Common.Settings.Settings,
  } = {
    forceNew: null,
    breakpointManager: Bindings.BreakpointManager.BreakpointManager.instance(),
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
        SDK.TargetManager.TargetManager.instance().targets().some(target => target.type() === SDK.Target.Type.Node);
    return !hasNodeTargets;
  }

  flavorChanged(_object: Object|null): void {
    void this.update();
  }

  breakpointStateChanged(breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem, checked: boolean): void {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    locations.forEach((value: Bindings.BreakpointManager.BreakpointLocation) => {
      const breakpoint = value.breakpoint;
      breakpoint.setEnabled(checked);
    });
  }

  async breakpointEdited(breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem): Promise<void> {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    let location: Bindings.BreakpointManager.BreakpointLocation|undefined;
    for (const locationCandidate of locations) {
      if (!location || locationCandidate.uiLocation.compareTo(location.uiLocation) < 0) {
        location = locationCandidate;
      }
    }
    if (location) {
      await Common.Revealer.reveal(location);
    }
  }

  breakpointsRemoved(breakpointItems: SourcesComponents.BreakpointsView.BreakpointItem[]): void {
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

  async jumpToSource(breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem): Promise<void> {
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
      BreakpointsSidebarPane.instance().data = data;
    }
    this.#updateRunning = false;
  }

  async getUpdatedBreakpointViewData(): Promise<SourcesComponents.BreakpointsView.BreakpointsViewData> {
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

    const scriptIdToGroup = new Map<string, SourcesComponents.BreakpointsView.BreakpointGroup>();

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

      const text = content[idx];
      const codeSnippet = text.lineAt(uiLocation.lineNumber);

      if (isHit && this.#collapsedFiles.has(sourceURL)) {
        this.#collapsedFiles.delete(sourceURL);
        this.#saveSettings();
      }
      const expanded = !this.#collapsedFiles.has(sourceURL);

      const status: SourcesComponents.BreakpointsView.BreakpointStatus = this.#getBreakpointState(locations);
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

  #onBreakpointAdded(event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>):
      Promise<void> {
    const breakpoint = event.data.breakpoint;
    if (breakpoint.origin === Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION &&
        this.#collapsedFiles.has(breakpoint.url())) {
      // Auto-expand if a new breakpoint was added to a collapsed group.
      this.#collapsedFiles.delete(breakpoint.url());
      this.#saveSettings();
    }
    return this.update();
  }

  #onBreakpointRemoved(event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>):
      Promise<void> {
    const breakpoint = event.data.breakpoint;
    if (this.#collapsedFiles.has(breakpoint.url())) {
      const locations = Bindings.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
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

  #getBreakpointTypeAndDetails(locations: Bindings.BreakpointManager.BreakpointLocation[]):
      {type: SourcesComponents.BreakpointsView.BreakpointType, hoverText?: string} {
    const breakpointWithCondition = locations.find(location => Boolean(location.breakpoint.condition()));
    const breakpoint = breakpointWithCondition?.breakpoint;
    if (!breakpoint || !breakpoint.condition()) {
      return {type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT};
    }

    const condition = breakpoint.condition();
    if (breakpoint.isLogpoint()) {
      return {type: SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT, hoverText: condition};
    }

    return {type: SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT, hoverText: condition};
  }

  #getLocationsForBreakpointItem(breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem):
      Bindings.BreakpointManager.BreakpointLocation[] {
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

  #getBreakpointLocations(): Bindings.BreakpointManager.BreakpointLocation[] {
    const locations = this.#breakpointManager.allBreakpointLocations().filter(
        breakpointLocation =>
            breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger);

    locations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));

    const result = [];
    let lastBreakpoint: Bindings.BreakpointManager.Breakpoint|null = null;
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

  #groupBreakpointLocationsById(breakpointLocations: Bindings.BreakpointManager.BreakpointLocation[]):
      Bindings.BreakpointManager.BreakpointLocation[][] {
    const map = new Platform.MapUtilities.Multimap<string, Bindings.BreakpointManager.BreakpointLocation>();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      map.set(uiLocation.id(), breakpointLocation);
    }
    const arr: Bindings.BreakpointManager.BreakpointLocation[][] = [];
    for (const id of map.keysArray()) {
      const locations = Array.from(map.get(id));
      if (locations.length) {
        arr.push(locations);
      }
    }
    return arr;
  }

  #getLocationIdsByLineId(breakpointLocations: Bindings.BreakpointManager.BreakpointLocation[]):
      Platform.MapUtilities.Multimap<string, string> {
    const result = new Platform.MapUtilities.Multimap<string, string>();

    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      result.set(uiLocation.lineId(), uiLocation.id());
    }

    return result;
  }

  #getBreakpointState(locations: Bindings.BreakpointManager.BreakpointLocation[]):
      SourcesComponents.BreakpointsView.BreakpointStatus {
    const hasEnabled = locations.some(location => location.breakpoint.enabled());
    const hasDisabled = locations.some(location => !location.breakpoint.enabled());
    let status: SourcesComponents.BreakpointsView.BreakpointStatus;
    if (hasEnabled) {
      status = hasDisabled ? SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE :
                             SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED;
    } else {
      status = SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
    }
    return status;
  }

  #getContent(locations: Bindings.BreakpointManager.BreakpointLocation[][]): Promise<TextUtils.Text.Text[]> {
    // Use a cache to share the Text objects between all breakpoints. This way
    // we share the cached line ending information that Text calculates. This
    // was very slow to calculate with a lot of breakpoints in the same very
    // large source file.
    const contentToTextMap = new Map<string, TextUtils.Text.Text>();

    return Promise.all(locations.map(async ([{uiLocation: {uiSourceCode}}]) => {
      if (uiSourceCode.mimeType() === 'application/wasm') {
        // We could mirror the logic from `SourceFrame._ensureContentLoaded()` here
        // (and if so, ideally share that code somewhere), but that's quite heavy
        // logic just to display a single Wasm instruction. Also not really clear
        // how much value this would add. So let's keep it simple for now and don't
        // display anything additional for Wasm breakpoints, and if there's demand
        // to display some text preview, we could look into selectively disassemb-
        // ling the part of the text that we need here.
        // Relevant crbug: https://crbug.com/1090256
        return new TextUtils.Text.Text('');
      }
      const {content} = await uiSourceCode.requestContent();
      const contentText = content || '';
      if (contentToTextMap.has(contentText)) {
        return contentToTextMap.get(contentText) as TextUtils.Text.Text;
      }
      const text = new TextUtils.Text.Text(contentText);
      contentToTextMap.set(contentText, text);
      return text;
    }));
  }
}
