/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {CompatibilityTracksAppender, type DrawOverride, type TrackAppenderName} from './CompatibilityTracksAppender.js';
import {initiatorsDataToDraw} from './Initiators.js';
import {ModificationsManager} from './ModificationsManager.js';
import {ThreadAppender} from './ThreadAppender.js';
import timelineFlamechartPopoverStyles from './timelineFlamechartPopover.css.js';
import {FlameChartStyle, Selection} from './TimelineFlameChartView.js';
import {
  selectionFromEvent,
  selectionIsRange,
  selectionsEqual,
  type TimelineSelection,
} from './TimelineSelection.js';
import {buildPersistedConfig} from './TrackConfiguration.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   * @description Text for rendering frames
   */
  frames: 'Frames',
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  idleFrame: 'Idle frame',
  /**
   * @description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  droppedFrame: 'Dropped frame',
  /**
   * @description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  partiallyPresentedFrame: 'Partially-presented frame',
  /**
   * @description Text for a rendering frame
   */
  frame: 'Frame',
  /**
   * @description Text for Hiding a function from the Flame Chart
   */
  hideFunction: 'Hide function',
  /**
   * @description Text for Hiding all children of a function from the Flame Chart
   */
  hideChildren: 'Hide children',
  /**
   * @description Text for Hiding all child entries that are identical to the selected entry from the Flame Chart
   */
  hideRepeatingChildren: 'Hide repeating children',
  /**
   * @description Text for remove script from ignore list from the Flame Chart
   */
  removeScriptFromIgnoreList: 'Remove script from ignore list',
  /**
   * @description Text for add script to ignore list from the Flame Chart
   */
  addScriptToIgnoreList: 'Add script to ignore list',
  /**
   * @description Text for an action that shows all of the hidden children of an entry
   */
  resetChildren: 'Reset children',
  /**
   * @description Text for an action that shows all of the hidden entries of the Flame Chart
   */
  resetTrace: 'Reset trace',
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: 'Start a chat',
  /**
   * @description Context menu item in Performance panel to label an entry.
   */
  labelEntry: 'Label entry',
  /**
   * @description Context menu item in Performance panel to assess the purpose of an entry via AI.
   */
  assessThePurpose: 'Assess the purpose',
  /**
   * @description Context menu item in Performance panel to identify time spent in a call tree via AI.
   */
  identifyTimeSpent: 'Identify time spent',
  /**
   * @description Context menu item in Performance panel to find improvements for a call tree via AI.
   */
  findImprovements: 'Find improvements',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineFlameChartDataProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class TimelineFlameChartDataProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    PerfUI.FlameChart.FlameChartDataProvider {
  private droppedFramePattern: CanvasPattern|null;
  private partialFramePattern: CanvasPattern|null;
  private timelineDataInternal: PerfUI.FlameChart.FlameChartTimelineData|null = null;
  private currentLevel = 0;

  private compatibilityTracksAppender: CompatibilityTracksAppender|null = null;
  private parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;

  #minimumBoundary = 0;
  private timeSpan = 0;
  private readonly framesGroupStyle: PerfUI.FlameChart.GroupStyle;
  private readonly screenshotsGroupStyle: PerfUI.FlameChart.GroupStyle;

  // Contains all the entries that are DRAWN onto the track. Entries that have
  // been hidden - either by a user action, or because they aren't visible at
  // all - will not appear in this array and it will change per-render. For
  // example, if a user collapses an icicle in the flamechart, those entries
  // that are now hidden will no longer be in this array.
  // This also includes entrys that used to be special cased (e.g.
  // TimelineFrames) that are now of type Types.Events.Event and so the old
  // `TimelineFlameChartEntry` type has been removed in faovur of using
  // Trace.Types.Events.Event directly. See crrev.com/c/5973695 for details.
  private entryData: Trace.Types.Events.Event[] = [];

  private entryTypeByLevel: EntryType[] = [];
  private entryIndexToTitle: string[] = [];
  #lastInitiatorEntryIndex = -1;

  private lastSelection: Selection|null = null;
  readonly #font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;
  #eventIndexByEvent = new WeakMap<Trace.Types.Events.Event, number|null>();
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;

  /**
   * When we create initiator chains for a selected event, we store those
   * chains in this map so that if the user reselects the same event we do not
   * have to recalculate. This is reset when the trace changes.
   */
  #initiatorsCache = new Map<number, PerfUI.FlameChart.FlameChartInitiatorData[]>();
  #persistedGroupConfigSetting: Common.Settings.Setting<PerfUI.FlameChart.PersistedGroupConfig[]|null>|null = null;

  constructor() {
    super();
    this.reset();

    [this.droppedFramePattern, this.partialFramePattern] = this.preparePatternCanvas();

    this.framesGroupStyle = this.buildGroupStyle({useFirstLineForOverview: true});
    this.screenshotsGroupStyle =
        this.buildGroupStyle({useFirstLineForOverview: true, nestingLevel: 1, collapsible: false, itemsHeight: 150});

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      const headers = [
        this.framesGroupStyle,
        this.screenshotsGroupStyle,
      ];
      for (const header of headers) {
        header.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface');
        header.backgroundColor =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
      }
    });
    Utils.ImageCache.emitter.addEventListener(
        'screenshot-loaded', () => this.dispatchEventToListeners(Events.DATA_CHANGED));

    Common.Settings.Settings.instance()
        .moduleSetting('skip-stack-frames-pattern')
        .addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('skip-content-scripts')
        .addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('automatically-ignore-list-known-third-party-scripts')
        .addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('enable-ignore-listing')
        .addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('skip-anonymous-scripts')
        .addChangeListener(this.#onIgnoreListChanged.bind(this));
  }

  handleTrackConfigurationChange(groups: readonly PerfUI.FlameChart.Group[], indexesInVisualOrder: number[]): void {
    if (!this.#persistedGroupConfigSetting) {
      return;
    }
    if (!this.parsedTrace) {
      return;
    }
    const persistedDataForTrace = buildPersistedConfig(groups, indexesInVisualOrder);
    this.#persistedGroupConfigSetting.set(persistedDataForTrace);
  }

  setPersistedGroupConfigSetting(setting: Common.Settings.Setting<PerfUI.FlameChart.PersistedGroupConfig[]|null>):
      void {
    this.#persistedGroupConfigSetting = setting;
  }

  hasTrackConfigurationMode(): boolean {
    return true;
  }

  getPossibleActions(entryIndex: number, groupIndex: number): PerfUI.FlameChart.PossibleFilterActions|void {
    const data = this.timelineData();
    if (!data) {
      return;
    }
    const group = data.groups.at(groupIndex);
    // Early exit here if there is no group or:
    // 1. The group is not expanded: it needs to be expanded to allow the
    //    context menu actions to occur.
    // 2. The group does not have the showStackContextMenu flag which indicates
    //    that it does not show entries that support the stack actions.
    if (!group || !group.expanded || !group.showStackContextMenu) {
      return;
    }

    // Check which actions are possible on an entry.
    // If an action would not change the entries (for example it has no children to collapse), we do not need to show it.
    return this.findPossibleContextMenuActions(entryIndex);
  }

  customizedContextMenu(mouseEvent: MouseEvent, entryIndex: number, groupIndex: number): UI.ContextMenu.ContextMenu
      |undefined {
    const entry = this.eventByIndex(entryIndex);
    if (!entry) {
      return;
    }

    const possibleActions = this.getPossibleActions(entryIndex, groupIndex);

    // This action and its 'execute' is defined in `freestyler-meta`
    const PERF_AI_ACTION_ID = 'drjones.performance-panel-context';
    const perfAIEntryPointEnabled =
        Boolean(entry && this.parsedTrace && UI.ActionRegistry.ActionRegistry.instance().hasAction(PERF_AI_ACTION_ID));

    if (!possibleActions && !perfAIEntryPointEnabled) {
      // Early exit: no possible actions (e.g. collapsing children) and no AI
      // entrypoint, so we don't need to do anything.
      return;
    }

    const contextMenu = new UI.ContextMenu.ContextMenu(mouseEvent);
    if (perfAIEntryPointEnabled && this.parsedTrace) {
      const aiCallTree = Utils.AICallTree.AICallTree.fromEvent(entry, this.parsedTrace);
      if (aiCallTree) {
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction(PERF_AI_ACTION_ID);
        // The other side of setFlavor is handleTraceEntryNodeFlavorChange() in FreestylerPanel
        const context = Utils.AIContext.AgentFocus.fromCallTree(aiCallTree);
        UI.Context.Context.instance().setFlavor(Utils.AIContext.AgentFocus, context);

        if (Root.Runtime.hostConfig.devToolsAiSubmenuPrompts?.enabled) {
          function appendSubmenuPromptAction(
              submenu: UI.ContextMenu.SubMenu, action: UI.ActionRegistration.Action,
              label: Common.UIString.LocalizedString, prompt: string, jslogContext: string): void {
            submenu.defaultSection().appendItem(
                label, () => action.execute({prompt}), {disabled: !action.enabled(), jslogContext});
          }

          const submenu = contextMenu.footerSection().appendSubMenuItem(
              action.title(), false, PERF_AI_ACTION_ID,
              Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.featureName);
          submenu.defaultSection().appendAction(PERF_AI_ACTION_ID, i18nString(UIStrings.startAChat));
          submenu.defaultSection().appendItem(i18nString(UIStrings.labelEntry), () => {
            this.dispatchEventToListeners(
                Events.ENTRY_LABEL_ANNOTATION_ADDED, {entryIndex, withLinkCreationButton: false});
          }, {
            jslogContext: 'timeline.annotations.create-entry-label',
          });
          appendSubmenuPromptAction(
              submenu, action, i18nString(UIStrings.assessThePurpose), 'What\'s the purpose of this entry?',
              PERF_AI_ACTION_ID + '.purpose');
          appendSubmenuPromptAction(
              submenu, action, i18nString(UIStrings.identifyTimeSpent),
              'Where is most time being spent in this call tree?', PERF_AI_ACTION_ID + '.time-spent');
          appendSubmenuPromptAction(
              submenu, action, i18nString(UIStrings.findImprovements), 'How can I reduce the time of this call tree?',
              PERF_AI_ACTION_ID + '.improvements');
        } else if (Root.Runtime.hostConfig.devToolsAiDebugWithAi?.enabled) {
          contextMenu.footerSection().appendAction(
              PERF_AI_ACTION_ID, undefined, false, undefined,
              Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.featureName);
        } else {
          contextMenu.footerSection().appendAction(PERF_AI_ACTION_ID);
        }
      }
    }

    if (!possibleActions) {
      // All the code below here adds possible actions to the context menu,
      // some of which may be marked as disabled. If we didn't get any possible
      // actions, rather than add them all and mark all of them as disabled, we
      // early exit + don't add any of them.
      return contextMenu;
    }

    const hideEntryOption = contextMenu.defaultSection().appendItem(i18nString(UIStrings.hideFunction), () => {
      this.modifyTree(PerfUI.FlameChart.FilterAction.MERGE_FUNCTION, entryIndex);
    }, {
      disabled: !possibleActions?.[PerfUI.FlameChart.FilterAction.MERGE_FUNCTION],
      jslogContext: 'hide-function',
    });
    hideEntryOption.setAccelerator(UI.KeyboardShortcut.Keys.H, [UI.KeyboardShortcut.Modifiers.None]);
    hideEntryOption.setIsDevToolsPerformanceMenuItem(true);

    const hideChildrenOption = contextMenu.defaultSection().appendItem(i18nString(UIStrings.hideChildren), () => {
      this.modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION, entryIndex);
    }, {
      disabled: !possibleActions?.[PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION],
      jslogContext: 'hide-children',
    });
    hideChildrenOption.setAccelerator(UI.KeyboardShortcut.Keys.C, [UI.KeyboardShortcut.Modifiers.None]);
    hideChildrenOption.setIsDevToolsPerformanceMenuItem(true);

    const hideRepeatingChildrenOption =
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.hideRepeatingChildren), () => {
          this.modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entryIndex);
        }, {
          disabled: !possibleActions?.[PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS],
          jslogContext: 'hide-repeating-children',
        });
    hideRepeatingChildrenOption.setAccelerator(UI.KeyboardShortcut.Keys.R, [UI.KeyboardShortcut.Modifiers.None]);
    hideRepeatingChildrenOption.setIsDevToolsPerformanceMenuItem(true);

    const resetChildrenOption = contextMenu.defaultSection().appendItem(i18nString(UIStrings.resetChildren), () => {
      this.modifyTree(PerfUI.FlameChart.FilterAction.RESET_CHILDREN, entryIndex);
    }, {
      disabled: !possibleActions?.[PerfUI.FlameChart.FilterAction.RESET_CHILDREN],
      jslogContext: 'reset-children',
    });
    resetChildrenOption.setAccelerator(UI.KeyboardShortcut.Keys.U, [UI.KeyboardShortcut.Modifiers.None]);
    resetChildrenOption.setIsDevToolsPerformanceMenuItem(true);

    contextMenu.defaultSection().appendItem(i18nString(UIStrings.resetTrace), () => {
      this.modifyTree(PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS, entryIndex);
    }, {
      disabled: !possibleActions?.[PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS],
      jslogContext: 'reset-trace',
    });

    if (!this.parsedTrace || Trace.Types.Events.isLegacyTimelineFrame(entry)) {
      return contextMenu;
    }

    const url = Utils.SourceMapsResolver.SourceMapsResolver.resolvedURLForEntry(this.parsedTrace, entry);
    if (!url) {
      return contextMenu;
    }
    if (Utils.IgnoreList.isIgnoreListedEntry(entry)) {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeScriptFromIgnoreList), () => {
        Workspace.IgnoreListManager.IgnoreListManager.instance().unIgnoreListURL(url);
        this.#onIgnoreListChanged();
      }, {
        jslogContext: 'remove-from-ignore-list',
      });
    } else {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.addScriptToIgnoreList), () => {
        Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(url);
        this.#onIgnoreListChanged();
      }, {
        jslogContext: 'add-to-ignore-list',
      });
    }

    return contextMenu;
  }

  #onIgnoreListChanged(): void {
    this.timelineData(/* rebuild= */ true);
    this.dispatchEventToListeners(Events.DATA_CHANGED);
  }

  modifyTree(action: PerfUI.FlameChart.FilterAction, entryIndex: number): void {
    const entry = this.entryData[entryIndex];

    ModificationsManager.activeManager()?.getEntriesFilter().applyFilterAction({type: action, entry});
    this.timelineData(true);
    this.buildFlowForInitiator(entryIndex);
    this.dispatchEventToListeners(Events.DATA_CHANGED);
  }

  findPossibleContextMenuActions(entryIndex: number): PerfUI.FlameChart.PossibleFilterActions|void {
    const entry = this.entryData[entryIndex];
    return ModificationsManager.activeManager()?.getEntriesFilter().findPossibleActions(entry);
  }

  handleFlameChartTransformKeyboardEvent(event: KeyboardEvent, entryIndex: number, groupIndex: number): void {
    const possibleActions = this.getPossibleActions(entryIndex, groupIndex);
    if (!possibleActions) {
      return;
    }

    let handled = false;

    if (event.code === 'KeyH' && possibleActions[PerfUI.FlameChart.FilterAction.MERGE_FUNCTION]) {
      this.modifyTree(PerfUI.FlameChart.FilterAction.MERGE_FUNCTION, entryIndex);
      handled = true;
    } else if (event.code === 'KeyC' && possibleActions[PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION]) {
      this.modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION, entryIndex);
      handled = true;
    } else if (
        event.code === 'KeyR' && possibleActions[PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS]) {
      this.modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entryIndex);
      handled = true;
    } else if (event.code === 'KeyU') {
      this.modifyTree(PerfUI.FlameChart.FilterAction.RESET_CHILDREN, entryIndex);
      handled = true;
    }

    if (handled) {
      event.consume(true);
    }
  }

  private buildGroupStyle(extra: Object): PerfUI.FlameChart.GroupStyle {
    const defaultGroupStyle = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface'),
      backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container'),
      nestingLevel: 0,
      shareHeaderLine: true,
    };
    return Object.assign(defaultGroupStyle, extra);
  }

  setModel(parsedTrace: Trace.Handlers.Types.ParsedTrace, entityMapper: Utils.EntityMapper.EntityMapper): void {
    this.reset();
    this.parsedTrace = parsedTrace;
    const {traceBounds} = parsedTrace.Meta;
    const minTime = Trace.Helpers.Timing.microToMilli(traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(traceBounds.max);
    this.#minimumBoundary = minTime;
    this.timeSpan = minTime === maxTime ? 1000 : maxTime - this.#minimumBoundary;
    this.#entityMapper = entityMapper;
  }

  /**
   * Instances and caches a CompatibilityTracksAppender using the
   * internal flame chart data and the trace parsed data coming from the
   * trace engine.
   * The model data must have been set to the data provider instance before
   * attempting to instance the CompatibilityTracksAppender.
   */
  compatibilityTracksAppenderInstance(forceNew = false): CompatibilityTracksAppender {
    if (!this.compatibilityTracksAppender || forceNew) {
      if (!this.parsedTrace) {
        throw new Error(
            'Attempted to instantiate a CompatibilityTracksAppender without having set the trace parse data first.');
      }
      this.timelineDataInternal = this.#instantiateTimelineData();
      this.compatibilityTracksAppender = new CompatibilityTracksAppender(
          this.timelineDataInternal, this.parsedTrace, this.entryData, this.entryTypeByLevel, this.#entityMapper);
    }
    return this.compatibilityTracksAppender;
  }

  /**
   * Returns the instance of the timeline flame chart data, without
   * adding data to it. In case the timeline data hasn't been instanced
   * creates a new instance and returns it.
   */
  #instantiateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    if (!this.timelineDataInternal) {
      this.timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    }
    return this.timelineDataInternal;
  }

  /**
   * Builds the flame chart data whilst allowing for a custom filtering of track appenders.
   * This is ONLY to be used in test environments.
   */
  buildWithCustomTracksForTest(options?: {
    /**
     * Filters the track by the given name. Only tracks that match this filter will be drawn.
     */
    filterTracks?: (name: string, trackIndex: number) => boolean,
    /**
     * Choose if a given track is expanded based on the name
     */
    expandTracks?: (name: string, trackIndex: number) => boolean,
  }): void {
    const compatAppender = this.compatibilityTracksAppenderInstance();  // Make sure the instance exists in tests
    const appenders = compatAppender.allVisibleTrackAppenders();
    let visibleTrackIndexCounter = 0;
    for (const appender of appenders) {
      const trackName = appender instanceof ThreadAppender ? appender.trackName() : appender.appenderName;

      const shouldIncludeTrack = options?.filterTracks?.call(null, trackName, visibleTrackIndexCounter) ?? true;
      if (!shouldIncludeTrack) {
        continue;
      }

      const shouldExpandTrack = options?.expandTracks?.call(null, trackName, visibleTrackIndexCounter) ?? true;
      this.currentLevel = appender.appendTrackAtLevel(this.currentLevel, shouldExpandTrack);
      visibleTrackIndexCounter++;
    }
  }

  groupTreeEvents(group: PerfUI.FlameChart.Group): Trace.Types.Events.Event[]|null {
    return this.compatibilityTracksAppender?.groupEventsForTreeView(group) ?? null;
  }

  mainFrameNavigationStartEvents(): readonly Trace.Types.Events.NavigationStart[] {
    if (!this.parsedTrace) {
      return [];
    }
    return this.parsedTrace.Meta.mainFrameNavigations;
  }

  entryTitle(entryIndex: number): string|null {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === EntryType.SCREENSHOT) {
      return '';
    }
    if (entryType === EntryType.TRACK_APPENDER) {
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.FlameChartTimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = (this.entryData[entryIndex]);
      return this.compatibilityTracksAppender?.titleForEvent(event, eventLevel) || null;
    }
    let title: Common.UIString.LocalizedString|string = this.entryIndexToTitle[entryIndex];
    if (!title) {
      title = `Unexpected entryIndex ${entryIndex}`;
      console.error(title);
    }
    return title;
  }

  textColor(index: number): string {
    const event = this.entryData[index];
    return Utils.IgnoreList.isIgnoreListedEntry(event) ? '#888' : FlameChartStyle.textColor;
  }

  entryFont(_index: number): string|null {
    return this.#font;
  }

  /**
   * Clear the cache and rebuild the timeline data This should be called
   * when the trace file is the same but we want to rebuild the timeline
   * data. Some possible example: when we hide/unhide an event, or the
   * ignore list is changed etc.
   */
  rebuildTimelineData(): void {
    this.currentLevel = 0;
    this.entryData = [];
    this.entryTypeByLevel = [];
    this.entryIndexToTitle = [];
    this.#eventIndexByEvent = new Map();

    if (this.timelineDataInternal) {
      this.compatibilityTracksAppender?.setFlameChartDataAndEntryData(
          this.timelineDataInternal, this.entryData, this.entryTypeByLevel);
      this.compatibilityTracksAppender?.threadAppenders().forEach(
          threadAppender => threadAppender.setHeaderAppended(false));
    }
  }

  /**
   * Reset all data other than the UI elements.
   * This should be called when
   * - initialized the data provider
   * - a new trace file is coming (when `setModel()` is called)
   * etc.
   */
  reset(): void {
    this.currentLevel = 0;
    this.entryData = [];
    this.entryTypeByLevel = [];
    this.entryIndexToTitle = [];
    this.#eventIndexByEvent = new Map();
    this.#minimumBoundary = 0;
    this.timeSpan = 0;

    this.compatibilityTracksAppender?.reset();
    this.compatibilityTracksAppender = null;
    this.timelineDataInternal = null;
    this.parsedTrace = null;
    this.#entityMapper = null;
    this.#lastInitiatorEntryIndex = -1;
    this.#initiatorsCache.clear();
  }

  maxStackDepth(): number {
    return this.currentLevel;
  }

  /**
   * Builds the flame chart data using the tracks appender (which use
   * the new trace engine). The result built data is cached and returned.
   */
  timelineData(rebuild = false): PerfUI.FlameChart.FlameChartTimelineData {
    if (!rebuild && this.timelineDataInternal && this.timelineDataInternal.entryLevels.length !== 0) {
      // If the flame chart data is built already and we don't want to rebuild, we can return the cached data.
      // |entryLevels.length| is used to check if the cached data is not empty (correctly built),
      return this.timelineDataInternal;
    }

    this.timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();

    if (rebuild) {
      // This function will interact with the |compatibilityTracksAppender|, which needs the reference of
      // |timelineDataInternal|, so make sure this is called after the correct |timelineDataInternal|.
      this.rebuildTimelineData();
    }

    this.currentLevel = 0;

    if (this.parsedTrace) {
      this.compatibilityTracksAppender = this.compatibilityTracksAppenderInstance();
      // Note for readers: NodeJS CpuProfiles are purposefully NOT generic.
      // We wrap them in a `TracingStartedInPage` event, which causes them to
      // be treated like "real" Chrome traces. This is by design!
      if (this.parsedTrace.Meta.traceIsGeneric) {
        this.#processGenericTrace();
      } else {
        this.#processInspectorTrace();
      }
    }
    return this.timelineDataInternal;
  }

  #processGenericTrace(): void {
    if (!this.compatibilityTracksAppender) {
      return;
    }

    const appendersByProcess = this.compatibilityTracksAppender.allThreadAppendersByProcess();

    for (const [pid, threadAppenders] of appendersByProcess) {
      const processGroupStyle = this.buildGroupStyle({shareHeaderLine: false});
      const processName = this.parsedTrace?.Meta.processNames.get(pid)?.args.name || 'Process';
      this.appendHeader(`${processName} (${pid})`, processGroupStyle, true, false);
      for (const appender of threadAppenders) {
        appender.setHeaderNestingLevel(1);
        this.currentLevel = appender.appendTrackAtLevel(this.currentLevel);
      }
    }
  }

  #processInspectorTrace(): void {
    // In CPU Profiles the trace data will not have frames nor
    // screenshots, so we can keep this call as it will be a no-op in
    // these cases.
    this.#appendFramesAndScreenshotsTrack();

    const weight = (track: {type?: string, forMainFrame?: boolean, appenderName?: TrackAppenderName}): number => {
      switch (track.appenderName) {
        case 'Animations':
          return 0;
        case 'Timings':
          return 1;
        case 'Interactions':
          return 2;
        case 'LayoutShifts':
          return 3;
        case 'Extension':
          return 4;
        case 'Thread':
          return 5;
        case 'ServerTimings':
          return 6;
        case 'GPU':
          return 7;
        case 'Thread_AuctionWorklet':
          return 8;
        default:
          return 9;
      }
    };

    const allTrackAppenders =
        this.compatibilityTracksAppender ? this.compatibilityTracksAppender.allVisibleTrackAppenders() : [];

    allTrackAppenders.sort((a, b) => weight(a) - weight(b));

    for (const appender of allTrackAppenders) {
      if (!this.parsedTrace) {
        continue;
      }

      this.currentLevel = appender.appendTrackAtLevel(this.currentLevel);

      // If there is not a selected group, we want to default to selecting the
      // main thread track. Therefore in this check we look to see if the
      // current appender is a ThreadAppender and represnets the Main Thread.
      // If it is, we mark the group as selected.
      if (this.timelineDataInternal && !this.timelineDataInternal.selectedGroup) {
        if (appender instanceof ThreadAppender &&
            (appender.threadType === Trace.Handlers.Threads.ThreadType.MAIN_THREAD ||
             appender.threadType === Trace.Handlers.Threads.ThreadType.CPU_PROFILE)) {
          const group = this.compatibilityTracksAppender?.groupForAppender(appender);
          if (group) {
            this.timelineDataInternal.selectedGroup = group;
          }
        }
      }
    }
    if (this.timelineDataInternal?.selectedGroup) {
      this.timelineDataInternal.selectedGroup.expanded = true;
    }
  }

  minimumBoundary(): number {
    return this.#minimumBoundary;
  }

  totalTime(): number {
    return this.timeSpan;
  }

  search(visibleWindow: Trace.Types.Timing.TraceWindowMicro, filter?: Trace.Extras.TraceFilter.TraceFilter):
      PerfUI.FlameChart.DataProviderSearchResult[] {
    const results: PerfUI.FlameChart.DataProviderSearchResult[] = [];
    this.timelineData();
    for (let i = 0; i < this.entryData.length; ++i) {
      const entry = this.entryData[i];
      if (!entry) {
        continue;
      }

      if (Trace.Types.Events.isLegacyTimelineFrame(entry)) {
        continue;
      }

      if (Trace.Types.Events.isLegacyScreenshot(entry)) {
        // Screenshots are represented as trace events, but you can't search for them, so skip.
        continue;
      }
      if (!Trace.Helpers.Timing.eventIsInBounds(entry, visibleWindow)) {
        continue;
      }
      if (!filter || filter.accept(entry, this.parsedTrace || undefined)) {
        const startTimeMilli = Trace.Helpers.Timing.microToMilli(entry.ts);
        results.push({index: i, startTimeMilli, provider: 'main'});
      }
    }
    return results;
  }

  getEntryTypeForLevel(level: number): EntryType {
    return this.entryTypeByLevel[level];
  }

  /**
   * The frames and screenshots track is special cased because it is rendered
   * differently to the rest of the tracks and not as a series of events. This
   * is why it is not done via the appender system; we track frames &
   * screenshots as a different EntryType to the TrackAppender entries,
   * because then when it comes to drawing we can decorate them differently.
   **/
  #appendFramesAndScreenshotsTrack(): void {
    if (!this.parsedTrace) {
      return;
    }
    const filmStrip = Trace.Extras.FilmStrip.fromParsedTrace(this.parsedTrace);
    const hasScreenshots = filmStrip.frames.length > 0;
    const hasFrames = this.parsedTrace.Frames.frames.length > 0;
    if (!hasFrames && !hasScreenshots) {
      return;
    }

    this.framesGroupStyle.collapsible = hasScreenshots;
    const expanded = Root.Runtime.Runtime.queryParam('flamechart-force-expand') === 'frames';

    this.appendHeader(i18nString(UIStrings.frames), this.framesGroupStyle, false /* selectable */, expanded);

    this.entryTypeByLevel[this.currentLevel] = EntryType.FRAME;
    for (const frame of this.parsedTrace.Frames.frames) {
      this.#appendFrame(frame);
    }
    ++this.currentLevel;

    if (!hasScreenshots) {
      return;
    }
    this.#appendScreenshots(filmStrip);
  }

  #appendScreenshots(filmStrip: Trace.Extras.FilmStrip.Data): void {
    if (!this.timelineDataInternal || !this.parsedTrace) {
      return;
    }
    this.appendHeader('', this.screenshotsGroupStyle, false /* selectable */);
    this.entryTypeByLevel[this.currentLevel] = EntryType.SCREENSHOT;
    let prevTimestamp: Trace.Types.Timing.Milli|undefined = undefined;

    for (const filmStripFrame of filmStrip.frames) {
      const screenshotTimeInMilliSeconds = Trace.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
      this.entryData.push(filmStripFrame.screenshotEvent);
      (this.timelineDataInternal.entryLevels as number[]).push(this.currentLevel);
      (this.timelineDataInternal.entryStartTimes as number[]).push(screenshotTimeInMilliSeconds);
      if (prevTimestamp) {
        (this.timelineDataInternal.entryTotalTimes as number[]).push(screenshotTimeInMilliSeconds - prevTimestamp);
      }
      prevTimestamp = screenshotTimeInMilliSeconds;
    }
    if (filmStrip.frames.length && prevTimestamp !== undefined) {
      const maxRecordTimeMillis = Trace.Helpers.Timing.traceWindowMilliSeconds(this.parsedTrace.Meta.traceBounds).max;

      // Set the total time of the final screenshot so it takes up the remainder of the trace.
      (this.timelineDataInternal.entryTotalTimes as number[]).push(maxRecordTimeMillis - prevTimestamp);
    }
    ++this.currentLevel;
  }

  #entryTypeForIndex(entryIndex: number): EntryType {
    const level = this.timelineData().entryLevels[entryIndex];
    return this.entryTypeByLevel[level];
  }

  preparePopoverElement(entryIndex: number): Element|null {
    let time = '';
    let title;
    let warningElements: Element[] = [];
    let timeElementClassName = 'popoverinfo-time';
    const additionalContent: HTMLElement[] = [];

    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === EntryType.TRACK_APPENDER) {
      if (!this.compatibilityTracksAppender) {
        return null;
      }
      const event = (this.entryData[entryIndex]);
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.FlameChartTimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const popoverInfo = this.compatibilityTracksAppender.popoverInfo(event, eventLevel);
      title = popoverInfo.title;
      time = popoverInfo.formattedTime;
      warningElements = popoverInfo.warningElements || warningElements;
      if (popoverInfo.additionalElements?.length) {
        additionalContent.push(...popoverInfo.additionalElements);
      }

      this.dispatchEventToListeners(Events.FLAME_CHART_ITEM_HOVERED, event);

    } else if (entryType === EntryType.FRAME) {
      const frame = (this.entryData[entryIndex] as Trace.Types.Events.LegacyTimelineFrame);
      time = i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(frame.duration), 1);

      if (frame.idle) {
        title = i18nString(UIStrings.idleFrame);
      } else if (frame.dropped) {
        title = frame.isPartial ? i18nString(UIStrings.partiallyPresentedFrame) : i18nString(UIStrings.droppedFrame);
        timeElementClassName = 'popoverinfo-warning';
      } else {
        title = i18nString(UIStrings.frame);
      }
    } else {
      this.dispatchEventToListeners(Events.FLAME_CHART_ITEM_HOVERED, null);
      return null;
    }

    const popoverElement = document.createElement('div');
    const root = UI.UIUtils.createShadowRootWithCoreStyles(popoverElement, {cssFile: timelineFlamechartPopoverStyles});
    const popoverContents = root.createChild('div', 'timeline-flamechart-popover');
    popoverContents.createChild('span', timeElementClassName).textContent = time;
    popoverContents.createChild('span', 'popoverinfo-title').textContent = title;
    for (const warningElement of warningElements) {
      warningElement.classList.add('popoverinfo-warning');
      popoverContents.appendChild(warningElement);
    }
    for (const elem of additionalContent) {
      popoverContents.appendChild(elem);
    }
    return popoverElement;
  }

  preparePopoverForCollapsedArrow(entryIndex: number): Element|null {
    const element = document.createElement('div');
    const root = UI.UIUtils.createShadowRootWithCoreStyles(element, {cssFile: timelineFlamechartPopoverStyles});

    const entry = this.entryData[entryIndex];
    const hiddenEntriesAmount =
        ModificationsManager.activeManager()?.getEntriesFilter().findHiddenDescendantsAmount(entry);

    if (!hiddenEntriesAmount) {
      return null;
    }
    const contents = root.createChild('div', 'timeline-flamechart-popover');
    contents.createChild('span', 'popoverinfo-title').textContent = hiddenEntriesAmount + ' hidden';

    return element;
  }

  getDrawOverride(entryIndex: number): DrawOverride|undefined {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType !== EntryType.TRACK_APPENDER) {
      return;
    }

    const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.FlameChartTimelineData);
    const eventLevel = timelineData.entryLevels[entryIndex];
    const event = (this.entryData[entryIndex]);
    return this.compatibilityTracksAppender?.getDrawOverride(event, eventLevel);
  }

  #entryColorForFrame(entryIndex: number): string {
    const frame = (this.entryData[entryIndex] as Trace.Types.Events.LegacyTimelineFrame);
    if (frame.idle) {
      return 'white';
    }
    if (frame.dropped) {
      if (frame.isPartial) {
        // For partially presented frame boxes, paint a yellow background with
        // a sparse white dashed-line pattern overlay.
        return '#f0e442';
      }
      // For dropped frame boxes, paint a red background with a dense white
      // solid-line pattern overlay.
      return '#f08080';
    }
    return '#d7f0d1';
  }

  entryColor(entryIndex: number): string {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === EntryType.FRAME) {
      return this.#entryColorForFrame(entryIndex);
    }
    if (entryType === EntryType.TRACK_APPENDER) {
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.FlameChartTimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = (this.entryData[entryIndex]);
      return this.compatibilityTracksAppender?.colorForEvent(event, eventLevel) || '';
    }
    return '';
  }

  private preparePatternCanvas(): Array<CanvasPattern|null> {
    // Set the candy stripe pattern to 17px so it repeats well.
    const size = 17;
    const droppedFrameCanvas = document.createElement('canvas');
    const partialFrameCanvas = document.createElement('canvas');
    droppedFrameCanvas.width = droppedFrameCanvas.height = size;
    partialFrameCanvas.width = partialFrameCanvas.height = size;

    const ctx = droppedFrameCanvas.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
    // Make a dense solid-line pattern.
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(Math.PI * 0.25);
    ctx.translate(-size * 0.5, -size * 0.5);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    for (let x = -size; x < size * 2; x += 3) {
      ctx.fillRect(x, -size, 1, size * 3);
    }
    const droppedFramePattern = ctx.createPattern(droppedFrameCanvas, 'repeat');

    const ctx2 = partialFrameCanvas.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
    // Make a sparse dashed-line pattern.
    ctx2.strokeStyle = 'rgb(255, 255, 255)';
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(17, 0);
    ctx2.lineTo(10, 7);
    ctx2.moveTo(8, 9);
    ctx2.lineTo(2, 15);
    ctx2.stroke();
    const partialFramePattern = ctx.createPattern(partialFrameCanvas, 'repeat');
    return [droppedFramePattern, partialFramePattern];
  }

  private drawFrame(
      entryIndex: number, context: CanvasRenderingContext2D, barX: number, barY: number, barWidth: number,
      barHeight: number, transformColor: (color: string) => string): void {
    const hPadding = 1;
    const frame = this.entryData[entryIndex] as Trace.Types.Events.LegacyTimelineFrame;
    barX += hPadding;
    barWidth -= 2 * hPadding;
    context.fillStyle = transformColor(this.entryColor(entryIndex));

    if (frame.dropped) {
      context.fillRect(barX, barY, barWidth, barHeight);
      if (frame.isPartial) {
        // For partially presented frame boxes, paint a yellow background with
        // a sparse white dashed-line pattern overlay.
        context.fillStyle = this.partialFramePattern || context.fillStyle;
      } else {
        // For dropped frame boxes, paint a red background with a dense white
        // solid-line pattern overlay.
        context.fillStyle = this.droppedFramePattern || context.fillStyle;
      }
    }
    context.fillRect(barX, barY, barWidth, barHeight);

    const frameDurationText =
        i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(frame.duration), 1);
    const textWidth = context.measureText(frameDurationText).width;
    if (textWidth <= barWidth) {
      context.fillStyle = this.textColor(entryIndex);
      context.fillText(frameDurationText, barX + (barWidth - textWidth) / 2, barY + barHeight - 4);
    }
  }

  private async drawScreenshot(
      entryIndex: number, context: CanvasRenderingContext2D, barX: number, barY: number, barWidth: number,
      barHeight: number): Promise<void> {
    const screenshot = (this.entryData[entryIndex] as Trace.Types.Events.LegacySyntheticScreenshot);
    const image = Utils.ImageCache.getOrQueue(screenshot);
    if (!image) {
      return;
    }
    const imageX = barX + 1;
    const imageY = barY + 1;
    const imageHeight = barHeight - 2;
    const scale = imageHeight / image.naturalHeight;
    const imageWidth = Math.floor(image.naturalWidth * scale);
    context.save();
    context.beginPath();
    context.rect(barX, barY, barWidth, barHeight);
    context.clip();
    context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    context.strokeStyle = '#ccc';
    context.strokeRect(imageX - 0.5, imageY - 0.5, Math.min(barWidth - 1, imageWidth + 1), imageHeight);
    context.restore();
  }

  decorateEntry(
      entryIndex: number, context: CanvasRenderingContext2D, text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number,
      transformColor: (color: string) => string): boolean {
    const entryType = this.#entryTypeForIndex(entryIndex);

    if (entryType === EntryType.FRAME) {
      this.drawFrame(entryIndex, context, barX, barY, barWidth, barHeight, transformColor);
      return true;
    }

    if (entryType === EntryType.SCREENSHOT) {
      void this.drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight);
      return true;
    }

    if (entryType === EntryType.TRACK_APPENDER) {
      const entry = this.entryData[entryIndex];
      if (Trace.Types.Events.isSyntheticInteraction(entry)) {
        this.#drawInteractionEventWithWhiskers(
            context, entryIndex, text, entry, barX, barY, unclippedBarX, barWidth, barHeight, timeToPixelRatio);
        return true;
      }
    }

    return false;
  }

  /**
   * Draws the left and right whiskers around an interaction in the timeline.
   * @param context the canvas that will be drawn onto
   * @param entryIndex
   * @param entryTitle the title of the entry
   * @param entry the entry itself
   * @param barX the starting X pixel position of the bar representing this event. This is clipped: if the bar is off the left side of the screen, this value will be 0
   * @param barY the starting Y pixel position of the bar representing this event.
   * @param unclippedBarXStartPixel the starting X pixel position of the bar representing this event, not clipped. This means if the bar is off the left of the screen this will be a negative number.
   * @param barWidth the width of the full bar in pixels
   * @param barHeight the height of the full bar in pixels
   * @param timeToPixelRatio the ratio required to convert a millisecond time to a pixel value.
   **/
  #drawInteractionEventWithWhiskers(
      context: CanvasRenderingContext2D, entryIndex: number, entryTitle: string|null,
      entry: Trace.Types.Events.SyntheticInteractionPair, barX: number, barY: number, unclippedBarXStartPixel: number,
      barWidth: number, barHeight: number, timeToPixelRatio: number): void {
    /**
     * An interaction is drawn with whiskers as so:
     * |----------[=======]-------------|
     * => The left whisker is the event's start time (event.ts)
     * => The box start is the event's processingStart time
     * => The box end is the event's processingEnd time
     * => The right whisker is the event's end time (event.ts + event.dur)
     *
     * When we draw the event in the InteractionsAppender, we draw a huge box
     * that spans the entire of the above. So here we need to draw over the
     * rectangle that is outside of {processingStart, processingEnd} and
     * replace it with the whiskers.
     * TODO(crbug.com/1495248): rework how we draw whiskers to avoid this inefficiency
     */

    const beginTime = Trace.Helpers.Timing.microToMilli(entry.ts);
    const entireBarEndXPixel = barX + barWidth;

    function timeToPixel(time: Trace.Types.Timing.Micro): number {
      const timeMilli = Trace.Helpers.Timing.microToMilli(time);
      return Math.floor(unclippedBarXStartPixel + (timeMilli - beginTime) * timeToPixelRatio);
    }

    context.save();

    // Clear portions of initial rect to prepare for the ticks.
    context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
    let desiredBoxStartX = timeToPixel(entry.processingStart);
    const desiredBoxEndX = timeToPixel(entry.processingEnd);

    // If the entry has no processing duration, ensure the box is 1px wide so at least it is visible.
    if (entry.processingEnd - entry.processingStart === 0) {
      desiredBoxStartX -= 1;
    }

    context.fillRect(barX, barY - 0.5, desiredBoxStartX - barX, barHeight);
    context.fillRect(desiredBoxEndX, barY - 0.5, entireBarEndXPixel - desiredBoxEndX, barHeight);

    // Draws left and right whiskers
    function drawTick(begin: number, end: number, y: number): void {
      const tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end, y);
    }

    // The left whisker starts at the entry timestamp, and continues until the start of the box (processingStart).
    const leftWhiskerX = timeToPixel(entry.ts);
    // The right whisker ends at (entry.ts + entry.dur). We draw the line from the end of the box (processingEnd).
    const rightWhiskerX = timeToPixel(Trace.Types.Timing.Micro(entry.ts + entry.dur));
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = '#ccc';
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    const leftTick = leftWhiskerX + 0.5;
    const rightTick = rightWhiskerX - 0.5;
    drawTick(leftTick, desiredBoxStartX, lineY);
    drawTick(rightTick, desiredBoxEndX, lineY);
    context.stroke();

    if (entryTitle) {
      // BarX will be set to 0 if the start of the box if off the screen to the
      // left. If this happens, the desiredBoxStartX will be negative. In that
      // case, we fallback to the BarX. This ensures that even if the box
      // starts off-screen, we draw the text at the first visible on screen
      // pixels, so the user can still see the event's title.
      const textStartX = desiredBoxStartX > 0 ? desiredBoxStartX : barX;
      context.font = this.#font;
      const textWidth = UI.UIUtils.measureTextWidth(context, entryTitle);

      // These numbers are duplicated from FlameChart.ts.
      const textPadding = 5;
      const textBaseline = 5;

      // Only draw the text if it can fit in the amount of box that is visible.
      if (textWidth <= desiredBoxEndX - textStartX + textPadding) {
        context.fillStyle = this.textColor(entryIndex);
        context.fillText(entryTitle, textStartX + textPadding, barY + barHeight - textBaseline);
      }
    }
    context.restore();
  }

  forceDecoration(entryIndex: number): boolean {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === EntryType.FRAME) {
      return true;
    }
    if (entryType === EntryType.SCREENSHOT) {
      return true;
    }
    const event = (this.entryData[entryIndex]);

    if (Trace.Types.Events.isSyntheticInteraction(event)) {
      // We draw interactions with whiskers, which are done via the
      // decorateEntry() method, hence we always want to force these to be
      // decorated.
      return true;
    }
    return Boolean(this.parsedTrace?.Warnings.perEvent.get(event));
  }

  private appendHeader(title: string, style: PerfUI.FlameChart.GroupStyle, selectable: boolean, expanded?: boolean):
      PerfUI.FlameChart.Group {
    const group =
        ({startLevel: this.currentLevel, name: title, style, selectable, expanded} as PerfUI.FlameChart.Group);
    (this.timelineDataInternal as PerfUI.FlameChart.FlameChartTimelineData).groups.push(group);
    return group;
  }

  #appendFrame(frame: Trace.Types.Events.LegacyTimelineFrame): void {
    const index = this.entryData.length;
    this.entryData.push(frame);
    const durationMilliseconds = Trace.Helpers.Timing.microToMilli(frame.duration);
    this.entryIndexToTitle[index] = i18n.TimeUtilities.millisToString(durationMilliseconds, true);
    if (!this.timelineDataInternal) {
      return;
    }
    this.timelineDataInternal.entryLevels[index] = this.currentLevel;
    this.timelineDataInternal.entryTotalTimes[index] = durationMilliseconds;
    this.timelineDataInternal.entryStartTimes[index] = Trace.Helpers.Timing.microToMilli(frame.startTime);
  }

  createSelection(entryIndex: number): TimelineSelection|null {
    const entry = this.entryData[entryIndex];
    const timelineSelection: TimelineSelection|null = entry ? selectionFromEvent(entry) : null;
    if (timelineSelection) {
      this.lastSelection = new Selection(timelineSelection, entryIndex);
    }
    return timelineSelection;
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  groupForEvent(entryIndex: number): PerfUI.FlameChart.Group|null {
    if (!this.compatibilityTracksAppender) {
      return null;
    }
    const level = this.timelineDataInternal?.entryLevels[entryIndex] ?? null;
    if (level === null) {
      return null;
    }
    const groupForLevel = this.compatibilityTracksAppender.groupForLevel(level);
    if (!groupForLevel) {
      return null;
    }
    return groupForLevel;
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryIndexForSelection(selection: TimelineSelection|null): number {
    if (!selection || selectionIsRange(selection) || Trace.Types.Events.isNetworkTrackEntry(selection.event)) {
      return -1;
    }

    if (this.lastSelection && selectionsEqual(this.lastSelection.timelineSelection, selection)) {
      return this.lastSelection.entryIndex;
    }

    const index = this.entryData.indexOf(selection.event);
    // If the index is -1 and the selection is a TraceEvent, it might be
    // the case that this Entry is hidden by the Context Menu action.
    // Try revealing the entry and getting the index again.
    if (index === -1) {
      if (this.timelineDataInternal?.selectedGroup) {
        ModificationsManager.activeManager()?.getEntriesFilter().revealEntry(selection.event);
        this.timelineData(true);
      }
    }

    if (index !== -1) {
      this.lastSelection = new Selection(selection, index);
    }
    return index;
  }

  /**
   * Return the index for the given entry. Note that this method assumes that
   * timelineData() has been generated. If it hasn't, this method will return
   * null.
   */
  indexForEvent(targetEvent: Trace.Types.Events.Event): number|null {
    // Gets the index for the given event by walking through the array of entryData.
    // This may seem inefficient - but we have seen that by building up large
    // maps keyed by trace events that this has a significant impact on the
    // performance of the panel.
    // Therefore, we strike a middle ground: look up the event the first time,
    // but then cache the result.
    const fromCache = this.#eventIndexByEvent.get(targetEvent);
    if (typeof fromCache === 'number') {
      return fromCache;
    }
    const index = this.entryData.indexOf(targetEvent);
    const result = index > -1 ? index : null;
    this.#eventIndexByEvent.set(targetEvent, result);
    return result;
  }

  /**
   * Build the data for initiators and initiated entries.
   * @param entryIndex
   * @returns if we should re-render the flame chart (canvas)
   */
  buildFlowForInitiator(entryIndex: number): boolean {
    if (!this.parsedTrace || !this.compatibilityTracksAppender || !this.timelineDataInternal) {
      return false;
    }

    if (this.#lastInitiatorEntryIndex === entryIndex) {
      // If the user clicks on an entry twice by mistake, this can fire. But if
      // the entry matches the selected entry, then there is nothing more for
      // us to do.
      return false;
    }

    this.#lastInitiatorEntryIndex = entryIndex;

    const previousInitiatorsDataLength = this.timelineDataInternal.initiatorsData.length;

    if (entryIndex === -1) {
      // User has deselected an event, so if it had any initiators we need to clear them.
      if (this.timelineDataInternal.initiatorsData.length === 0) {
        // The previous selected entry had no initiators, so we can early exit and not redraw anything.
        return false;
      }
      // Clear initiator data and trigger a re-render.
      this.timelineDataInternal.emptyInitiators();
      return true;
    }

    // If the user hasn't clicked on an event, bail, as there are no initiators
    // for screenshots or frames.
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType !== EntryType.TRACK_APPENDER) {
      return false;
    }

    // Avoid re-building the initiators if we already did it previously.
    const cached = this.#initiatorsCache.get(entryIndex);
    if (cached) {
      this.timelineDataInternal.initiatorsData = cached;
      return true;
    }

    // At this point, we know we:
    // 1. Have an event to build initiators for.
    // 2. Know that it's not an event with initiators that are cached.
    const event = this.entryData[entryIndex];
    // Reset to clear any previous arrows from the last event.
    this.timelineDataInternal.emptyInitiators();

    const hiddenEvents: Trace.Types.Events.Event[] =
        ModificationsManager.activeManager()?.getEntriesFilter().invisibleEntries() ?? [];
    const expandableEntries: Trace.Types.Events.Event[] =
        ModificationsManager.activeManager()?.getEntriesFilter().expandableEntries() ?? [];

    const initiatorsData = initiatorsDataToDraw(this.parsedTrace, event, hiddenEvents, expandableEntries);

    if (initiatorsData.length === 0) {
      // Small optimization: cache if this entry has 0 initiators, meaning if
      // it gets reselected we don't redo the work to find out it has 0
      // initiators.
      this.#initiatorsCache.set(entryIndex, []);
    }

    // Previous event had 0 initiators, new event has 0, therefore exit early and don't render.
    if (previousInitiatorsDataLength === 0 && initiatorsData.length === 0) {
      return false;
    }

    for (const initiatorData of initiatorsData) {
      const eventIndex = this.indexForEvent(initiatorData.event);
      const initiatorIndex = this.indexForEvent(initiatorData.initiator);
      if (eventIndex === null || initiatorIndex === null) {
        continue;
      }
      this.timelineDataInternal.initiatorsData.push({
        initiatorIndex,
        eventIndex,
        isInitiatorHidden: initiatorData.isInitiatorHidden,
        isEntryHidden: initiatorData.isEntryHidden,
      });
    }
    this.#initiatorsCache.set(entryIndex, this.timelineDataInternal.initiatorsData);
    return true;
  }

  eventByIndex(entryIndex: number): Trace.Types.Events.Event|null {
    if (entryIndex < 0) {
      return null;
    }
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === EntryType.TRACK_APPENDER) {
      return this.entryData[entryIndex];
    }
    if (entryType === EntryType.FRAME) {
      return this.entryData[entryIndex] as Trace.Types.Events.LegacyTimelineFrame;
    }
    return null;
  }
}

export const InstantEventVisibleDurationMs = Trace.Types.Timing.Milli(0.001);

export const enum Events {
  DATA_CHANGED = 'DataChanged',
  FLAME_CHART_ITEM_HOVERED = 'FlameChartItemHovered',
  ENTRY_LABEL_ANNOTATION_ADDED = 'EntryLabelAnnotationAdded'
}

export interface EventTypes {
  [Events.DATA_CHANGED]: void;
  [Events.FLAME_CHART_ITEM_HOVERED]: Trace.Types.Events.Event|null;
  [Events.ENTRY_LABEL_ANNOTATION_ADDED]: {
    entryIndex: number,
    withLinkCreationButton: boolean,
  };
}

// an entry is a trace event, they are classified into "entry types"
// because some events are rendered differently. For example, screenshot
// events are rendered as images. Checks for entry types allow to have
// different styles, names, etc. for events that look differently.
// In the future we won't have this checks: instead we will forward
// the event to the corresponding "track appender" and it will determine
// how the event shall be rendered.
export const enum EntryType {
  FRAME = 'Frame',
  TRACK_APPENDER = 'TrackAppender',
  SCREENSHOT = 'Screenshot',
}
