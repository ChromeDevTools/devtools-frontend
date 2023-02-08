/**
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import type * as TimelineModel from '../../../../models/timeline_model/timeline_model.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {ChartViewport, type ChartViewportDelegate} from './ChartViewport.js';

import {TimelineGrid, type Calculator} from './TimelineGrid.js';
import flameChartStyles from './flameChart.css.legacy.js';

const UIStrings = {
  /**
   *@description Aria accessible name in Flame Chart of the Performance panel
   */
  flameChart: 'Flame Chart',
  /**
   *@description Text for the screen reader to announce a hovered group
   *@example {Network} PH1
   */
  sHovered: '{PH1} hovered',
  /**
   *@description Text for screen reader to announce a selected group.
   *@example {Network} PH1
   */
  sSelected: '{PH1} selected',
  /**
   *@description Text for screen reader to announce an expanded group
   *@example {Network} PH1
   */
  sExpanded: '{PH1} expanded',
  /**
   *@description Text for screen reader to announce a collapsed group
   *@example {Network} PH1
   */
  sCollapsed: '{PH1} collapsed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/FlameChart.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FlameChartDelegate {
  windowChanged(_startTime: number, _endTime: number, _animate: boolean): void {
  }
  updateRangeSelection(_startTime: number, _endTime: number): void {
  }
  updateSelectedGroup(_flameChart: FlameChart, _group: Group|null): void {
  }
}

interface GroupExpansionState {
  [key: string]: boolean;
}

export class FlameChart extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
    implements Calculator, ChartViewportDelegate {
  private readonly groupExpansionSetting?: Common.Settings.Setting<GroupExpansionState>;
  private groupExpansionState: GroupExpansionState;
  private readonly flameChartDelegate: FlameChartDelegate;
  private chartViewport: ChartViewport;
  private dataProvider: FlameChartDataProvider;
  private candyStripeCanvas: HTMLCanvasElement;
  private viewportElement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private entryInfo: HTMLElement;
  private readonly markerHighlighElement: HTMLElement;
  private readonly highlightElement: HTMLElement;
  private readonly selectedElement: HTMLElement;
  private rulerEnabled: boolean;
  private barHeight: number;
  private textBaseline: number;
  private textPadding: number;
  private readonly headerLeftPadding: number;
  private arrowSide: number;
  private readonly expansionArrowIndent: number;
  private readonly headerLabelXPadding: number;
  private readonly headerLabelYPadding: number;
  private highlightedMarkerIndex: number;
  private highlightedEntryIndex: number;
  private selectedEntryIndex: number;
  private rawTimelineDataLength: number;
  private readonly markerPositions: Map<number, {
    x: number,
    width: number,
  }>;
  private lastMouseOffsetX: number;
  private selectedGroup: number;
  private keyboardFocusedGroup: number;
  private offsetWidth!: number;
  private offsetHeight!: number;
  private dragStartX!: number;
  private dragStartY!: number;
  private lastMouseOffsetY!: number;
  private minimumBoundaryInternal!: number;
  private maxDragOffset!: number;
  private timelineLevels?: number[][]|null;
  private visibleLevelOffsets?: Uint32Array|null;
  private visibleLevels?: Uint16Array|null;
  private groupOffsets?: Uint32Array|null;
  private rawTimelineData?: TimelineData|null;
  private forceDecorationCache?: Int8Array|null;
  private entryColorsCache?: string[]|null;
  private visibleLevelHeights?: Uint32Array;
  private totalTime?: number;

  constructor(
      dataProvider: FlameChartDataProvider, flameChartDelegate: FlameChartDelegate,
      groupExpansionSetting?: Common.Settings.Setting<GroupExpansionState>) {
    super(true);
    this.registerRequiredCSS(flameChartStyles);
    this.contentElement.classList.add('flame-chart-main-pane');
    this.groupExpansionSetting = groupExpansionSetting;
    this.groupExpansionState = groupExpansionSetting && groupExpansionSetting.get() || {};
    this.flameChartDelegate = flameChartDelegate;

    this.chartViewport = new ChartViewport(this);
    this.chartViewport.show(this.contentElement);

    this.dataProvider = dataProvider;
    this.candyStripeCanvas = document.createElement('canvas');
    this.createCandyStripePattern();

    this.viewportElement = this.chartViewport.viewportElement;
    this.canvas = (this.viewportElement.createChild('canvas', 'fill') as HTMLCanvasElement);

    this.canvas.tabIndex = 0;
    UI.ARIAUtils.setAccessibleName(this.canvas, i18nString(UIStrings.flameChart));
    UI.ARIAUtils.markAsTree(this.canvas);
    this.setDefaultFocusedElement(this.canvas);
    this.canvas.classList.add('flame-chart-canvas');
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this), false);
    this.canvas.addEventListener('click', this.onClick.bind(this), false);
    this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), false);

    this.entryInfo = this.viewportElement.createChild('div', 'flame-chart-entry-info');
    this.markerHighlighElement = this.viewportElement.createChild('div', 'flame-chart-marker-highlight-element');
    this.highlightElement = this.viewportElement.createChild('div', 'flame-chart-highlight-element');
    this.selectedElement = this.viewportElement.createChild('div', 'flame-chart-selected-element');
    this.canvas.addEventListener('focus', () => {
      this.dispatchEventToListeners(Events.CanvasFocused);
    }, false);

    UI.UIUtils.installDragHandle(
        this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this),
        null);

    this.rulerEnabled = true;
    this.barHeight = 17;
    this.textBaseline = 5;
    this.textPadding = 5;
    this.chartViewport.setWindowTimes(
        dataProvider.minimumBoundary(), dataProvider.minimumBoundary() + dataProvider.totalTime());

    this.headerLeftPadding = 6;
    this.arrowSide = 8;
    this.expansionArrowIndent = this.headerLeftPadding + this.arrowSide / 2;
    this.headerLabelXPadding = 3;
    this.headerLabelYPadding = 2;

    this.highlightedMarkerIndex = -1;
    this.highlightedEntryIndex = -1;
    this.selectedEntryIndex = -1;
    this.rawTimelineDataLength = 0;
    this.markerPositions = new Map();

    this.lastMouseOffsetX = 0;
    this.selectedGroup = -1;

    // Keyboard focused group is used to navigate groups irrespective of whether they are selectable or not
    this.keyboardFocusedGroup = -1;

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      this.scheduleUpdate();
    });
  }

  willHide(): void {
    this.hideHighlight();
  }

  setBarHeight(value: number): void {
    this.barHeight = value;
  }

  setTextBaseline(value: number): void {
    this.textBaseline = value;
  }

  setTextPadding(value: number): void {
    this.textPadding = value;
  }

  enableRuler(enable: boolean): void {
    this.rulerEnabled = enable;
  }

  alwaysShowVerticalScroll(): void {
    this.chartViewport.alwaysShowVerticalScroll();
  }

  disableRangeSelection(): void {
    this.chartViewport.disableRangeSelection();
  }

  highlightEntry(entryIndex: number): void {
    if (this.highlightedEntryIndex === entryIndex) {
      return;
    }
    if (!this.dataProvider.entryColor(entryIndex)) {
      return;
    }
    this.highlightedEntryIndex = entryIndex;
    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.dispatchEventToListeners(Events.EntryHighlighted, entryIndex);
  }

  hideHighlight(): void {
    this.entryInfo.removeChildren();
    this.highlightedEntryIndex = -1;
    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.dispatchEventToListeners(Events.EntryHighlighted, -1);
  }

  private createCandyStripePattern(): void {
    // Set the candy stripe pattern to 17px so it repeats well.
    const size = 17;
    this.candyStripeCanvas.width = size;
    this.candyStripeCanvas.height = size;

    const ctx = this.candyStripeCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Rotate the stripe by 45deg to the right.
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(Math.PI * 0.25);
    ctx.translate(-size * 0.5, -size * 0.5);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    for (let x = -size; x < size * 2; x += 3) {
      ctx.fillRect(x, -size, 1, size * 3);
    }
  }

  private resetCanvas(): void {
    const ratio = window.devicePixelRatio;
    const width = Math.round(this.offsetWidth * ratio);
    const height = Math.round(this.offsetHeight * ratio);
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width / ratio}px`;
    this.canvas.style.height = `${height / ratio}px`;
  }

  windowChanged(startTime: number, endTime: number, animate: boolean): void {
    this.flameChartDelegate.windowChanged(startTime, endTime, animate);
  }

  updateRangeSelection(startTime: number, endTime: number): void {
    this.flameChartDelegate.updateRangeSelection(startTime, endTime);
  }

  setSize(width: number, height: number): void {
    this.offsetWidth = width;
    this.offsetHeight = height;
  }

  private startDragging(event: MouseEvent): boolean {
    this.hideHighlight();
    this.maxDragOffset = 0;
    this.dragStartX = event.pageX;
    this.dragStartY = event.pageY;
    return true;
  }

  private dragging(event: MouseEvent): void {
    const dx = event.pageX - this.dragStartX;
    const dy = event.pageY - this.dragStartY;
    this.maxDragOffset = Math.max(this.maxDragOffset, Math.sqrt(dx * dx + dy * dy));
  }

  private endDragging(_event: MouseEvent): void {
    this.updateHighlight();
  }

  private timelineData(): TimelineData|null {
    if (!this.dataProvider) {
      return null;
    }
    const timelineData = this.dataProvider.timelineData();
    if (timelineData !== this.rawTimelineData ||
        (timelineData && timelineData.entryStartTimes.length !== this.rawTimelineDataLength)) {
      this.processTimelineData(timelineData);
    }
    return this.rawTimelineData || null;
  }

  private revealEntry(entryIndex: number): void {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const timeLeft = this.chartViewport.windowLeftTime();
    const timeRight = this.chartViewport.windowRightTime();
    const entryStartTime = timelineData.entryStartTimes[entryIndex];
    const entryTotalTime = timelineData.entryTotalTimes[entryIndex];
    const entryEndTime = entryStartTime + entryTotalTime;
    let minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);

    const level = timelineData.entryLevels[entryIndex];
    this.chartViewport.setScrollOffset(this.levelToOffset(level), this.levelHeight(level));

    const minVisibleWidthPx = 30;
    const futurePixelToTime = (timeRight - timeLeft) / this.offsetWidth;
    minEntryTimeWindow = Math.max(minEntryTimeWindow, futurePixelToTime * minVisibleWidthPx);
    if (timeLeft > entryEndTime) {
      const delta = timeLeft - entryEndTime + minEntryTimeWindow;
      this.windowChanged(timeLeft - delta, timeRight - delta, /* animate */ true);
    } else if (timeRight < entryStartTime) {
      const delta = entryStartTime - timeRight + minEntryTimeWindow;
      this.windowChanged(timeLeft + delta, timeRight + delta, /* animate */ true);
    }
  }

  setWindowTimes(startTime: number, endTime: number, animate?: boolean): void {
    this.chartViewport.setWindowTimes(startTime, endTime, animate);
    this.updateHighlight();
  }

  private onMouseMove(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.lastMouseOffsetX = mouseEvent.offsetX;
    this.lastMouseOffsetY = mouseEvent.offsetY;
    if (!this.enabled()) {
      return;
    }
    if (this.chartViewport.isDragging()) {
      return;
    }
    if (this.coordinatesToGroupIndex(mouseEvent.offsetX, mouseEvent.offsetY, true /* headerOnly */) >= 0) {
      this.hideHighlight();
      this.viewportElement.style.cursor = 'pointer';
      return;
    }
    this.updateHighlight();
  }

  private updateHighlight(): void {
    const entryIndex = this.coordinatesToEntryIndex(this.lastMouseOffsetX, this.lastMouseOffsetY);
    if (entryIndex === -1) {
      this.hideHighlight();
      const group = this.coordinatesToGroupIndex(this.lastMouseOffsetX, this.lastMouseOffsetY, false /* headerOnly */);
      if (group >= 0 && this.rawTimelineData && this.rawTimelineData.groups &&
          this.rawTimelineData.groups[group].selectable) {
        this.viewportElement.style.cursor = 'pointer';
      } else {
        this.viewportElement.style.cursor = 'default';
      }
      return;
    }
    if (this.chartViewport.isDragging()) {
      return;
    }
    this.updatePopover(entryIndex);
    this.viewportElement.style.cursor = this.dataProvider.canJumpToEntry(entryIndex) ? 'pointer' : 'default';
    this.highlightEntry(entryIndex);
  }

  private onMouseOut(): void {
    this.lastMouseOffsetX = -1;
    this.lastMouseOffsetY = -1;
    this.hideHighlight();
  }

  private updatePopover(entryIndex: number): void {
    if (entryIndex === this.highlightedEntryIndex) {
      this.updatePopoverOffset();
      return;
    }
    this.entryInfo.removeChildren();
    const popoverElement = this.dataProvider.prepareHighlightedEntryInfo(entryIndex);
    if (popoverElement) {
      this.entryInfo.appendChild(popoverElement);
      this.updatePopoverOffset();
    }
  }

  private updatePopoverOffset(): void {
    const mouseX = this.lastMouseOffsetX;
    const mouseY = this.lastMouseOffsetY;
    const parentWidth = this.entryInfo.parentElement ? this.entryInfo.parentElement.clientWidth : 0;
    const parentHeight = this.entryInfo.parentElement ? this.entryInfo.parentElement.clientHeight : 0;
    const infoWidth = this.entryInfo.clientWidth;
    const infoHeight = this.entryInfo.clientHeight;
    const /** @const */ offsetX = 10;
    const /** @const */ offsetY = 6;
    let x;
    let y;
    for (let quadrant = 0; quadrant < 4; ++quadrant) {
      const dx = quadrant & 2 ? -offsetX - infoWidth : offsetX;
      const dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
      x = Platform.NumberUtilities.clamp(mouseX + dx, 0, parentWidth - infoWidth);
      y = Platform.NumberUtilities.clamp(mouseY + dy, 0, parentHeight - infoHeight);
      if (x >= mouseX || mouseX >= x + infoWidth || y >= mouseY || mouseY >= y + infoHeight) {
        break;
      }
    }
    this.entryInfo.style.left = x + 'px';
    this.entryInfo.style.top = y + 'px';
  }

  private onClick(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.focus();
    // onClick comes after dragStart and dragEnd events.
    // So if there was drag (mouse move) in the middle of that events
    // we skip the click. Otherwise we jump to the sources.
    const clickThreshold = 5;
    if (this.maxDragOffset > clickThreshold) {
      return;
    }

    this.selectGroup(this.coordinatesToGroupIndex(mouseEvent.offsetX, mouseEvent.offsetY, false /* headerOnly */));
    this.toggleGroupExpand(this.coordinatesToGroupIndex(mouseEvent.offsetX, mouseEvent.offsetY, true /* headerOnly */));
    const timelineData = this.timelineData();
    if (mouseEvent.shiftKey && this.highlightedEntryIndex !== -1 && timelineData) {
      const start = timelineData.entryStartTimes[this.highlightedEntryIndex];
      const end = start + timelineData.entryTotalTimes[this.highlightedEntryIndex];
      this.chartViewport.setRangeSelection(start, end);
    } else {
      this.chartViewport.onClick(mouseEvent);
      this.dispatchEventToListeners(Events.EntryInvoked, this.highlightedEntryIndex);
    }
  }

  private selectGroup(groupIndex: number): void {
    if (groupIndex < 0 || this.selectedGroup === groupIndex) {
      return;
    }
    if (!this.rawTimelineData) {
      return;
    }

    const groups = this.rawTimelineData.groups;
    if (!groups) {
      return;
    }

    this.keyboardFocusedGroup = groupIndex;
    this.scrollGroupIntoView(groupIndex);
    const groupName = groups[groupIndex].name;
    if (!groups[groupIndex].selectable) {
      this.deselectAllGroups();
      UI.ARIAUtils.alert(i18nString(UIStrings.sHovered, {PH1: groupName}));
    } else {
      this.selectedGroup = groupIndex;
      this.flameChartDelegate.updateSelectedGroup(this, groups[groupIndex]);
      this.resetCanvas();
      this.draw();
      UI.ARIAUtils.alert(i18nString(UIStrings.sSelected, {PH1: groupName}));
    }
  }

  private deselectAllGroups(): void {
    this.selectedGroup = -1;
    this.flameChartDelegate.updateSelectedGroup(this, null);
    this.resetCanvas();
    this.draw();
  }

  private deselectAllEntries(): void {
    this.selectedEntryIndex = -1;
    this.resetCanvas();
    this.draw();
  }

  private isGroupFocused(index: number): boolean {
    return index === this.selectedGroup || index === this.keyboardFocusedGroup;
  }

  private scrollGroupIntoView(index: number): void {
    if (index < 0) {
      return;
    }

    if (!this.rawTimelineData) {
      return;
    }

    const groups = this.rawTimelineData.groups;
    const groupOffsets = this.groupOffsets;
    if (!groupOffsets || !groups) {
      return;
    }
    const groupTop = groupOffsets[index];

    let nextOffset = groupOffsets[index + 1];
    if (index === groups.length - 1) {
      nextOffset += groups[index].style.padding;
    }

    // For the top group, scroll all the way to the top of the chart
    // to accommodate the bar with time markers
    const scrollTop = index === 0 ? 0 : groupTop;

    const scrollHeight = Math.min(nextOffset - scrollTop, this.chartViewport.chartHeight());
    this.chartViewport.setScrollOffset(scrollTop, scrollHeight);
  }

  private toggleGroupExpand(groupIndex: number): void {
    if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
      return;
    }

    if (!this.rawTimelineData || !this.rawTimelineData.groups) {
      return;
    }

    this.expandGroup(groupIndex, !this.rawTimelineData.groups[groupIndex].expanded /* setExpanded */);
  }

  private expandGroup(
      groupIndex: number, setExpanded: boolean|undefined = true, propagatedExpand: boolean|undefined = false): void {
    if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
      return;
    }

    if (!this.rawTimelineData) {
      return;
    }

    const groups = this.rawTimelineData.groups;
    if (!groups) {
      return;
    }

    const group = groups[groupIndex];
    group.expanded = setExpanded;

    this.groupExpansionState[group.name] = group.expanded;
    if (this.groupExpansionSetting) {
      this.groupExpansionSetting.set(this.groupExpansionState);
    }
    this.updateLevelPositions();

    this.updateHighlight();
    if (!group.expanded) {
      const timelineData = this.timelineData();
      if (timelineData) {
        const level = timelineData.entryLevels[this.selectedEntryIndex];
        if (this.selectedEntryIndex >= 0 && level >= group.startLevel &&
            (groupIndex >= groups.length - 1 || groups[groupIndex + 1].startLevel > level)) {
          this.selectedEntryIndex = -1;
        }
      }
    }

    this.updateHeight();
    this.resetCanvas();
    this.draw();

    this.scrollGroupIntoView(groupIndex);
    // We only want to read expanded/collapsed state on user inputted expand/collapse
    if (!propagatedExpand) {
      const groupName = groups[groupIndex].name;
      const content = group.expanded ? i18nString(UIStrings.sExpanded, {PH1: groupName}) :
                                       i18nString(UIStrings.sCollapsed, {PH1: groupName});
      UI.ARIAUtils.alert(content);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!UI.KeyboardShortcut.KeyboardShortcut.hasNoModifiers(e) || !this.timelineData()) {
      return;
    }

    const eventHandled = this.handleSelectionNavigation(e);

    // Handle keyboard navigation in groups
    if (!eventHandled && this.rawTimelineData && this.rawTimelineData.groups) {
      this.handleKeyboardGroupNavigation(e);
    }
  }

  bindCanvasEvent(eventName: string, onEvent: (arg0: Event) => void): void {
    this.canvas.addEventListener(eventName, onEvent);
  }

  private handleKeyboardGroupNavigation(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    let handled = false;
    let entrySelected = false;

    if (keyboardEvent.code === 'ArrowUp') {
      handled = this.selectPreviousGroup();
    } else if (keyboardEvent.code === 'ArrowDown') {
      handled = this.selectNextGroup();
    } else if (keyboardEvent.code === 'ArrowLeft') {
      if (this.keyboardFocusedGroup >= 0) {
        this.expandGroup(this.keyboardFocusedGroup, false /* setExpanded */);
        handled = true;
      }
    } else if (keyboardEvent.code === 'ArrowRight') {
      if (this.keyboardFocusedGroup >= 0) {
        this.expandGroup(this.keyboardFocusedGroup, true /* setExpanded */);
        this.selectFirstChild();
        handled = true;
      }
    } else if (keyboardEvent.key === 'Enter') {
      entrySelected = this.selectFirstEntryInCurrentGroup();
      handled = entrySelected;
    }

    if (handled && !entrySelected) {
      this.deselectAllEntries();
    }

    if (handled) {
      keyboardEvent.consume(true);
    }
  }

  private selectFirstEntryInCurrentGroup(): boolean {
    if (!this.rawTimelineData) {
      return false;
    }

    const allGroups = this.rawTimelineData.groups;

    if (this.keyboardFocusedGroup < 0 || !allGroups) {
      return false;
    }

    const group = allGroups[this.keyboardFocusedGroup];
    const startLevelInGroup = group.startLevel;

    // Return if no levels in this group
    if (startLevelInGroup < 0) {
      return false;
    }

    // Make sure this is the innermost nested group with this startLevel
    // This is because a parent group also contains levels of all its child groups
    // So check if the next group has the same level, if it does, user should
    // go to that child group to select this entry
    if (this.keyboardFocusedGroup < allGroups.length - 1 &&
        allGroups[this.keyboardFocusedGroup + 1].startLevel === startLevelInGroup) {
      return false;
    }

    if (!this.timelineLevels) {
      return false;
    }

    // Get first (default) entry in startLevel of selected group
    const firstEntryIndex = this.timelineLevels[startLevelInGroup][0];

    this.expandGroup(this.keyboardFocusedGroup, true /* setExpanded */);
    this.setSelectedEntry(firstEntryIndex);
    return true;
  }

  private selectPreviousGroup(): boolean {
    if (this.keyboardFocusedGroup <= 0) {
      return false;
    }

    const groupIndexToSelect = this.getGroupIndexToSelect(-1 /* offset */);
    this.selectGroup(groupIndexToSelect);
    return true;
  }

  private selectNextGroup(): boolean {
    if (!this.rawTimelineData || !this.rawTimelineData.groups) {
      return false;
    }

    if (this.keyboardFocusedGroup >= this.rawTimelineData.groups.length - 1) {
      return false;
    }

    const groupIndexToSelect = this.getGroupIndexToSelect(1 /* offset */);
    this.selectGroup(groupIndexToSelect);
    return true;
  }

  private getGroupIndexToSelect(offset: number): number {
    if (!this.rawTimelineData || !this.rawTimelineData.groups) {
      throw new Error('No raw timeline data');
    }
    const allGroups = this.rawTimelineData.groups;
    let groupIndexToSelect = this.keyboardFocusedGroup;
    let groupName, groupWithSubNestingLevel;

    do {
      groupIndexToSelect += offset;
      groupName = this.rawTimelineData.groups[groupIndexToSelect].name;
      groupWithSubNestingLevel = this.keyboardFocusedGroup !== -1 &&
          allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel;
    } while (groupIndexToSelect > 0 && groupIndexToSelect < allGroups.length - 1 &&
             (!groupName || groupWithSubNestingLevel));

    return groupIndexToSelect;
  }

  private selectFirstChild(): void {
    if (!this.rawTimelineData || !this.rawTimelineData.groups) {
      return;
    }

    const allGroups = this.rawTimelineData.groups;
    if (this.keyboardFocusedGroup < 0 || this.keyboardFocusedGroup >= allGroups.length - 1) {
      return;
    }

    const groupIndexToSelect = this.keyboardFocusedGroup + 1;
    if (allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel) {
      this.selectGroup(groupIndexToSelect);
    }
  }

  private handleSelectionNavigation(event: KeyboardEvent): boolean {
    if (this.selectedEntryIndex === -1) {
      return false;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return false;
    }

    function timeComparator(time: number, entryIndex: number): number {
      if (!timelineData) {
        throw new Error('No timeline data');
      }
      return time - timelineData.entryStartTimes[entryIndex];
    }

    function entriesIntersect(entry1: number, entry2: number): boolean {
      if (!timelineData) {
        throw new Error('No timeline data');
      }

      const start1 = timelineData.entryStartTimes[entry1];
      const start2 = timelineData.entryStartTimes[entry2];
      const end1 = start1 + timelineData.entryTotalTimes[entry1];
      const end2 = start2 + timelineData.entryTotalTimes[entry2];
      return start1 < end2 && start2 < end1;
    }

    const keyboardEvent = (event as KeyboardEvent);
    const keys = UI.KeyboardShortcut.Keys;
    if (keyboardEvent.keyCode === keys.Left.code || keyboardEvent.keyCode === keys.Right.code) {
      const level = timelineData.entryLevels[this.selectedEntryIndex];
      const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
      let indexOnLevel = Platform.ArrayUtilities.lowerBound(levelIndexes, this.selectedEntryIndex, (a, b) => a - b);
      indexOnLevel += keyboardEvent.keyCode === keys.Left.code ? -1 : 1;
      event.consume(true);
      if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length) {
        this.dispatchEventToListeners(Events.EntrySelected, levelIndexes[indexOnLevel]);
      }
      return true;
    }

    if (keyboardEvent.keyCode === keys.Up.code || keyboardEvent.keyCode === keys.Down.code) {
      let level = timelineData.entryLevels[this.selectedEntryIndex];
      level += keyboardEvent.keyCode === keys.Up.code ? -1 : 1;
      if (level < 0 || (this.timelineLevels && level >= this.timelineLevels.length)) {
        this.deselectAllEntries();
        keyboardEvent.consume(true);
        return true;
      }
      const entryTime = timelineData.entryStartTimes[this.selectedEntryIndex] +
          timelineData.entryTotalTimes[this.selectedEntryIndex] / 2;
      const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
      let indexOnLevel = Platform.ArrayUtilities.upperBound(levelIndexes, entryTime, timeComparator) - 1;
      if (!entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
        ++indexOnLevel;
        if (indexOnLevel >= levelIndexes.length ||
            !entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
          if (keyboardEvent.code === 'ArrowDown') {
            return false;
          }

          // Stay in the current group and give focus to the parent group instead of entries
          this.deselectAllEntries();
          keyboardEvent.consume(true);
          return true;
        }
      }
      keyboardEvent.consume(true);
      this.dispatchEventToListeners(Events.EntrySelected, levelIndexes[indexOnLevel]);
      return true;
    }
    if (event.key === 'Enter') {
      event.consume(true);
      this.dispatchEventToListeners(Events.EntryInvoked, this.selectedEntryIndex);
      return true;
    }
    return false;
  }

  private coordinatesToEntryIndex(x: number, y: number): number {
    if (x < 0 || y < 0) {
      return -1;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return -1;
    }
    y += this.chartViewport.scrollOffset();
    if (!this.visibleLevelOffsets) {
      throw new Error('No visible level offsets');
    }
    const cursorLevel =
        Platform.ArrayUtilities.upperBound(this.visibleLevelOffsets, y, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
    if (cursorLevel < 0 || (this.visibleLevels && !this.visibleLevels[cursorLevel])) {
      return -1;
    }
    const offsetFromLevel = y - this.visibleLevelOffsets[cursorLevel];
    if (offsetFromLevel > this.levelHeight(cursorLevel)) {
      return -1;
    }

    // Check markers first.
    for (const [index, pos] of this.markerPositions) {
      if (timelineData.entryLevels[index] !== cursorLevel) {
        continue;
      }
      if (pos.x <= x && x < pos.x + pos.width) {
        return index as number;
      }
    }

    // Check regular entries.
    const entryStartTimes = timelineData.entryStartTimes;
    const entriesOnLevel: number[] = this.timelineLevels ? this.timelineLevels[cursorLevel] : [];
    if (!entriesOnLevel || !entriesOnLevel.length) {
      return -1;
    }

    const cursorTime = this.chartViewport.pixelToTime(x);
    const indexOnLevel = Math.max(
        Platform.ArrayUtilities.upperBound(
            entriesOnLevel, cursorTime, (time, entryIndex) => time - entryStartTimes[entryIndex]) -
            1,
        0);

    function checkEntryHit(this: FlameChart, entryIndex: number|undefined): boolean {
      if (entryIndex === undefined) {
        return false;
      }

      if (!timelineData) {
        return false;
      }

      const startTime = entryStartTimes[entryIndex];
      const duration = timelineData.entryTotalTimes[entryIndex];
      const startX = this.chartViewport.timeToPosition(startTime);
      const endX = this.chartViewport.timeToPosition(startTime + duration);
      const barThresholdPx = 3;
      return startX - barThresholdPx < x && x < endX + barThresholdPx;
    }

    let entryIndex: number = entriesOnLevel[indexOnLevel];
    if (checkEntryHit.call(this, entryIndex)) {
      return entryIndex;
    }
    entryIndex = entriesOnLevel[indexOnLevel + 1];
    if (checkEntryHit.call(this, entryIndex)) {
      return entryIndex;
    }
    return -1;
  }

  private coordinatesToGroupIndex(x: number, y: number, headerOnly: boolean): number {
    if (!this.rawTimelineData || !this.rawTimelineData.groups || !this.groupOffsets) {
      return -1;
    }

    if (x < 0 || y < 0) {
      return -1;
    }
    y += this.chartViewport.scrollOffset();
    const groups = this.rawTimelineData.groups || [];
    const group =
        Platform.ArrayUtilities.upperBound(this.groupOffsets, y, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
    if (group < 0 || group >= groups.length) {
      return -1;
    }
    const height = headerOnly ? groups[group].style.height : this.groupOffsets[group + 1] - this.groupOffsets[group];
    if (y - this.groupOffsets[group] >= height) {
      return -1;
    }
    if (!headerOnly) {
      return group;
    }

    const context = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    context.save();
    context.font = groups[group].style.font;
    const right = this.headerLeftPadding + this.labelWidthForGroup(context, groups[group]);
    context.restore();
    if (x > right) {
      return -1;
    }

    return group;
  }

  private markerIndexBeforeTime(time: number): number {
    const timelineData = this.timelineData();
    if (!timelineData) {
      throw new Error('No timeline data');
    }

    const markers = timelineData.markers;
    if (!markers) {
      throw new Error('No timeline markers');
    }

    return Platform.ArrayUtilities.lowerBound(
        timelineData.markers, time, (markerTimestamp, marker) => markerTimestamp - marker.startTime());
  }

  private draw(): void {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const width = this.offsetWidth;
    const height = this.offsetHeight;
    const context = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    context.save();
    const ratio = window.devicePixelRatio;
    const top = this.chartViewport.scrollOffset();
    context.scale(ratio, ratio);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, width, height);
    context.translate(0, -top);
    const defaultFont = '11px ' + Host.Platform.fontFamily();
    context.font = defaultFont;

    const {markerIndices, colorBuckets, titleIndices} = this.getDrawableData(context, timelineData);

    context.save();
    this.forEachGroupInViewport((offset, index, group, isFirst, groupHeight) => {
      if (this.isGroupFocused(index)) {
        context.fillStyle =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--selected-group-background', this.contentElement);
        context.fillRect(0, offset, width, groupHeight - group.style.padding);
      }
    });
    context.restore();

    for (const [color, {indexes}] of colorBuckets) {
      this.drawGenericEvents(context, timelineData, color, indexes);
      this.drawLongTaskRegions(context, timelineData, color, indexes);
    }

    this.drawMarkers(context, timelineData, markerIndices);

    this.drawEventTitles(context, timelineData, titleIndices, defaultFont, width);
    context.restore();

    this.drawGroupHeaders(width, height);
    this.drawFlowEvents(context, width, height);
    this.drawMarkerLines();
    const dividersData = TimelineGrid.calculateGridOffsets(this);
    const navStartTimes = Array.from(this.dataProvider.navStartTimes().values());

    let navStartTimeIndex = 0;
    const drawAdjustedTime = (time: number): string => {
      if (navStartTimes.length === 0) {
        return this.formatValue(time, dividersData.precision);
      }

      // Track when the time crosses the boundary to the next nav start record,
      // and when it does, move the nav start array index accordingly.
      const hasNextNavStartTime = navStartTimes.length > navStartTimeIndex + 1;
      if (hasNextNavStartTime && time > navStartTimes[navStartTimeIndex + 1].startTime) {
        navStartTimeIndex++;
      }

      // Adjust the time by the nearest nav start marker's value.
      const nearestMarker = navStartTimes[navStartTimeIndex];
      if (nearestMarker) {
        time -= nearestMarker.startTime - this.zeroTime();
      }

      return this.formatValue(time, dividersData.precision);
    };

    TimelineGrid.drawCanvasGrid(context, dividersData);
    if (this.rulerEnabled) {
      TimelineGrid.drawCanvasHeaders(context, dividersData, drawAdjustedTime, 3, HeaderHeight);
    }

    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
    this.updateMarkerHighlight();
  }

  /**
   * Draws generic flame chart events, that is, the plain rectangles that fill several parts
   * in the timeline like the Main Thread flamechart and the timings track.
   * Drawn on a color by color basis to minimize the amount of times context.style is switched.
   */
  private drawGenericEvents(
      context: CanvasRenderingContext2D, timelineData: TimelineData, color: string, indexes: number[]): void {
    const {entryTotalTimes, entryStartTimes, entryLevels} = timelineData;
    context.save();
    context.beginPath();
    for (let i = 0; i < indexes.length; ++i) {
      const entryIndex = indexes[i];
      const duration = entryTotalTimes[entryIndex];
      if (isNaN(duration)) {
        continue;
      }
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this.timeToPositionClipped(entryStartTime);
      const barLevel = entryLevels[entryIndex];
      const barHeight = this.levelHeight(barLevel);
      const barY = this.levelToOffset(barLevel);
      const barRight = this.timeToPositionClipped(entryStartTime + duration);
      const barWidth = Math.max(barRight - barX, 1);
      context.rect(barX, barY, barWidth - 0.4, barHeight - 1);
    }
    context.fillStyle = color;
    context.fill();
    context.restore();
  }

  /**
   * Marks the portion of long tasks where the 50ms threshold was exceeded.
   */
  private drawLongTaskRegions(
      context: CanvasRenderingContext2D, timelineData: TimelineData, color: string, indexes: number[]): void {
    const {entryTotalTimes, entryStartTimes, entryLevels} = timelineData;
    let mainThreadTopLevel = -1;

    // Find the main thread so that we can mark tasks longer than 50ms.
    if ('groups' in timelineData && Array.isArray(timelineData.groups)) {
      const mainThread = timelineData.groups.find(group => {
        if (!group.track) {
          return false;
        }
        return group.track.name === 'CrRendererMain';
      });

      if (mainThread) {
        mainThreadTopLevel = mainThread.startLevel;
      }
    }

    context.save();
    context.beginPath();
    for (let i = 0; i < indexes.length; ++i) {
      const entryIndex = indexes[i];
      const duration = entryTotalTimes[entryIndex];
      const showLongDurations = entryLevels[entryIndex] === mainThreadTopLevel;

      if (!showLongDurations) {
        continue;
      }

      if (isNaN(duration) || duration < 50) {
        continue;
      }
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this.timeToPositionClipped(entryStartTime + 50);
      const barLevel = entryLevels[entryIndex];
      const barHeight = this.levelHeight(barLevel);
      const barY = this.levelToOffset(barLevel);
      const barRight = this.timeToPositionClipped(entryStartTime + duration);
      const barWidth = Math.max(barRight - barX, 1);
      context.rect(barX, barY, barWidth - 0.4, barHeight - 1);
    }
    const candyStripePattern = context.createPattern(this.candyStripeCanvas, 'repeat');

    if (candyStripePattern) {
      context.fillStyle = candyStripePattern;
      context.fill();
    }
    context.restore();
  }

  /**
   * Preprocess the data to be drawn to speed the rendering time.
   * Especifically:
   *  - Groups events into color buckets.
   *  - Discards non visible events.
   *  - Gathers marker events (LCP, FCP, DCL, etc.).
   *  - Gathers event titles that should be rendered.
   */
  private getDrawableData(context: CanvasRenderingContext2D, timelineData: TimelineData):
      {colorBuckets: Map<string, {indexes: number[]}>, titleIndices: number[], markerIndices: number[]} {
    // These are the event indexes of events that we are drawing onto the timeline that:
    // 1) have text within them
    // 2) are visually wide enough in pixels to make it worth rendering the text.
    const titleIndices: number[] = [];

    // These point to events that represent single points in the timeline, most
    // often an event such as DCL/LCP.
    const markerIndices: number[] = [];
    const {entryTotalTimes, entryStartTimes} = timelineData;

    const height = this.offsetHeight;
    const top = this.chartViewport.scrollOffset();
    const visibleLevelOffsets = this.visibleLevelOffsets ? this.visibleLevelOffsets : new Uint32Array();

    const textPadding = this.textPadding;
    // How wide in pixels / long in duration an event needs to be to make it
    // worthwhile rendering the text inside it.
    const minTextWidth = 2 * textPadding + UI.UIUtils.measureTextWidth(context, '…');
    const minTextWidthDuration = this.chartViewport.pixelToTimeOffset(minTextWidth);

    const minVisibleBarLevel = Math.max(
        Platform.ArrayUtilities.upperBound(visibleLevelOffsets, top, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1,
        0);

    // As we parse each event, we bucket them into groups based on the color we
    // will render them with. The key of this map will be a color, and all
    // events stored in the `indexes` array for that color will be painted as
    // such. This way, when rendering events, we can render them based on
    // color, and ensure the minimum amount of changes to context.fillStyle.
    const colorBuckets = new Map<string, {indexes: number[]}>();
    for (let level = minVisibleBarLevel; level < this.dataProvider.maxStackDepth(); ++level) {
      if (this.levelToOffset(level) > top + height) {
        break;
      }
      if (!this.visibleLevels || !this.visibleLevels[level]) {
        continue;
      }
      if (!this.timelineLevels) {
        continue;
      }

      // Entries are ordered by start time within a level, so find the last visible entry.
      const levelIndexes = this.timelineLevels[level];
      const rightIndexOnLevel = Platform.ArrayUtilities.lowerBound(
                                    levelIndexes, this.chartViewport.windowRightTime(),
                                    (time, entryIndex) => time - entryStartTimes[entryIndex]) -
          1;
      let lastDrawOffset = Infinity;
      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        const duration = entryTotalTimes[entryIndex];
        // Markers are single events in time (e.g. LCP): they do not have a duration.
        if (isNaN(duration)) {
          markerIndices.push(entryIndex);
          continue;
        }

        if (duration >= minTextWidthDuration || (this.forceDecorationCache && this.forceDecorationCache[entryIndex])) {
          // If the event is big enough visually to have its text rendered,
          // or if it's in the array of event indexes that we forcibly render (as defined by the data provider)
          // then we store its index. Later on, we'll loop through all
          // `titleIndices` to render the text for each event.
          titleIndices.push(entryIndex);
        }

        const entryStartTime = entryStartTimes[entryIndex];
        const entryOffsetRight = entryStartTime + duration;
        if (entryOffsetRight <= this.chartViewport.windowLeftTime()) {
          break;
        }

        const barX = this.timeToPositionClipped(entryStartTime);
        // Check if the entry entirely fits into an already drawn pixel, we can just skip drawing it.
        if (barX >= lastDrawOffset) {
          continue;
        }
        lastDrawOffset = barX;

        if (this.entryColorsCache) {
          const color = this.entryColorsCache[entryIndex];
          let bucket = colorBuckets.get(color);
          if (!bucket) {
            bucket = {indexes: []};
            colorBuckets.set(color, bucket);
          }
          bucket.indexes.push(entryIndex);
        }
      }
    }
    return {colorBuckets, titleIndices, markerIndices};
  }

  private drawGroupHeaders(width: number, height: number): void {
    const context = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    const top = this.chartViewport.scrollOffset();
    const ratio = window.devicePixelRatio;
    if (!this.rawTimelineData) {
      return;
    }

    const groups = this.rawTimelineData.groups || [];
    if (!groups.length) {
      return;
    }

    const groupOffsets = this.groupOffsets;
    if (groupOffsets === null || groupOffsets === undefined) {
      return;
    }
    const lastGroupOffset = groupOffsets[groupOffsets.length - 1];

    context.save();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    const defaultFont = '11px ' + Host.Platform.fontFamily();
    context.font = defaultFont;

    context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background');
    this.forEachGroupInViewport((offset, index, group) => {
      const paddingHeight = group.style.padding;
      if (paddingHeight < 5) {
        return;
      }
      context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
    });
    if (groups.length && lastGroupOffset < top + height) {
      context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);
    }

    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-elevation-1');
    context.beginPath();
    this.forEachGroupInViewport((offset, index, group, isFirst) => {
      if (isFirst || group.style.padding < 4) {
        return;
      }
      hLine(offset - 2.5);
    });
    hLine(lastGroupOffset + 1.5);
    context.stroke();

    this.forEachGroupInViewport((offset, index, group) => {
      if (group.style.useFirstLineForOverview) {
        return;
      }
      if (!this.isGroupCollapsible(index) || group.expanded) {
        if (!group.style.shareHeaderLine && this.isGroupFocused(index)) {
          context.fillStyle = group.style.backgroundColor;
          context.fillRect(0, offset, width, group.style.height);
        }
        return;
      }
      let nextGroup = index + 1;
      while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel) {
        nextGroup++;
      }
      const endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this.dataProvider.maxStackDepth();
      this.drawCollapsedOverviewForGroup(group, offset, endLevel);
    });

    context.save();
    this.forEachGroupInViewport((offset, index, group) => {
      context.font = group.style.font;
      if (this.isGroupCollapsible(index) && !group.expanded || group.style.shareHeaderLine) {
        const width = this.labelWidthForGroup(context, group) + 2;
        if (this.isGroupFocused(index)) {
          context.fillStyle =
              ThemeSupport.ThemeSupport.instance().getComputedValue('--selected-group-background', this.contentElement);
        } else {
          const parsedColor = Common.Color.parse(group.style.backgroundColor);
          if (parsedColor) {
            context.fillStyle = (parsedColor.setAlpha(0.8).asString() as string);
          }
        }

        context.fillRect(
            this.headerLeftPadding - this.headerLabelXPadding, offset + this.headerLabelYPadding, width,
            group.style.height - 2 * this.headerLabelYPadding);
      }
      context.fillStyle = group.style.color;
      context.fillText(
          group.name, Math.floor(this.expansionArrowIndent * (group.style.nestingLevel + 1) + this.arrowSide),
          offset + group.style.height - this.textBaseline);
    });
    context.restore();

    context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-secondary');
    context.beginPath();
    this.forEachGroupInViewport((offset, index, group) => {
      if (this.isGroupCollapsible(index)) {
        drawExpansionArrow.call(
            this, this.expansionArrowIndent * (group.style.nestingLevel + 1),
            offset + group.style.height - this.textBaseline - this.arrowSide / 2, Boolean(group.expanded));
      }
    });
    context.fill();

    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-details-hairline-light');
    context.beginPath();
    context.stroke();

    this.forEachGroupInViewport((offset, index, group, isFirst, groupHeight) => {
      if (this.isGroupFocused(index)) {
        const lineWidth = 2;
        const bracketLength = 10;
        context.fillStyle =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--selected-group-border', this.contentElement);
        context.fillRect(0, offset - lineWidth, lineWidth, groupHeight - group.style.padding + 2 * lineWidth);
        context.fillRect(0, offset - lineWidth, bracketLength, lineWidth);
        context.fillRect(0, offset + groupHeight - group.style.padding, bracketLength, lineWidth);
      }
    });

    context.restore();

    function hLine(y: number): void {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }

    function drawExpansionArrow(this: FlameChart, x: number, y: number, expanded: boolean): void {
      const arrowHeight = this.arrowSide * Math.sqrt(3) / 2;
      const arrowCenterOffset = Math.round(arrowHeight / 2);
      context.save();
      context.translate(x, y);
      context.rotate(expanded ? Math.PI / 2 : 0);
      context.moveTo(-arrowCenterOffset, -this.arrowSide / 2);
      context.lineTo(-arrowCenterOffset, this.arrowSide / 2);
      context.lineTo(arrowHeight - arrowCenterOffset, 0);
      context.restore();
    }
  }

  /**
   * Draws page load events in the Timings track (LCP, FCP, DCL, etc.)
   */
  private drawMarkers(context: CanvasRenderingContext2D, timelineData: TimelineData, markerIndices: number[]): void {
    const {entryStartTimes, entryLevels} = timelineData;
    this.markerPositions.clear();
    context.textBaseline = 'alphabetic';
    context.save();
    context.beginPath();
    let lastMarkerLevel = -1;
    let lastMarkerX: number = -Infinity;
    // Markers are sorted top to bottom, right to left.
    for (let m = markerIndices.length - 1; m >= 0; --m) {
      const entryIndex = markerIndices[m];
      const title = this.dataProvider.entryTitle(entryIndex);
      if (!title) {
        continue;
      }
      const entryStartTime = entryStartTimes[entryIndex];
      const level = entryLevels[entryIndex];
      if (lastMarkerLevel !== level) {
        lastMarkerX = -Infinity;
      }
      const x = Math.max(this.chartViewport.timeToPosition(entryStartTime), lastMarkerX);
      const y = this.levelToOffset(level);
      const h = this.levelHeight(level);
      const padding = 4;
      const width = Math.ceil(UI.UIUtils.measureTextWidth(context, title)) + 2 * padding;
      lastMarkerX = x + width + 1;
      lastMarkerLevel = level;
      this.markerPositions.set(entryIndex, {x, width});
      context.fillStyle = this.dataProvider.entryColor(entryIndex);
      context.fillRect(x, y, width, h - 1);
      context.fillStyle = 'white';
      context.fillText(title, x + padding, y + h - this.textBaseline);
    }
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
    context.restore();
  }

  /**
   * Draws the titles of trace events in the timeline. Also calls `decorateEntry` on the data
   * provider, which can do any custom drawing on the corresponding entry's area (e.g. draw screenshots
   * in the Performance Panel timeline).
   */
  private drawEventTitles(
      context: CanvasRenderingContext2D, timelineData: TimelineData, titleIndices: number[], defaultFont: string,
      width: number): void {
    const timeToPixel = this.chartViewport.timeToPixel();
    const textPadding = this.textPadding;
    context.save();
    context.beginPath();
    const {entryStartTimes, entryLevels, entryTotalTimes} = timelineData;
    for (let i = 0; i < titleIndices.length; ++i) {
      const entryIndex = titleIndices[i];
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this.timeToPositionClipped(entryStartTime);
      const barRight = Math.min(this.timeToPositionClipped(entryStartTime + entryTotalTimes[entryIndex]), width) + 1;
      const barWidth = barRight - barX;
      const barLevel = entryLevels[entryIndex];
      const barY = this.levelToOffset(barLevel);
      let text = this.dataProvider.entryTitle(entryIndex);
      if (text && text.length) {
        context.font = this.dataProvider.entryFont(entryIndex) || defaultFont;
        text = UI.UIUtils.trimTextMiddle(context, text, barWidth - 2 * textPadding);
      }
      const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
      const barHeight = this.levelHeight(barLevel);
      if (this.dataProvider.decorateEntry(
              entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixel)) {
        continue;
      }
      if (!text || !text.length) {
        continue;
      }
      context.fillStyle = this.dataProvider.textColor(entryIndex);
      context.fillText(text, barX + textPadding, barY + barHeight - this.textBaseline);
    }

    context.restore();
  }

  private forEachGroup(callback: (arg0: number, arg1: number, arg2: Group, arg3: boolean, arg4: number) => void): void {
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups || [];
    if (!groups.length) {
      return;
    }
    const groupOffsets = this.groupOffsets;
    if (!groupOffsets) {
      return;
    }

    const groupStack: {
      nestingLevel: number,
      visible: boolean,
    }[] = [{nestingLevel: -1, visible: true}];
    for (let i = 0; i < groups.length; ++i) {
      const groupTop = groupOffsets[i];
      const group = groups[i];
      let firstGroup = true;
      let last: {
        nestingLevel: number,
        visible: boolean,
      } = groupStack[groupStack.length - 1];
      while (last && last.nestingLevel >= group.style.nestingLevel) {
        groupStack.pop();
        firstGroup = false;
        last = groupStack[groupStack.length - 1];
      }
      last = groupStack[groupStack.length - 1];
      const parentGroupVisible = last ? last.visible : false;
      const thisGroupVisible = parentGroupVisible && (!this.isGroupCollapsible(i) || group.expanded);
      groupStack.push({nestingLevel: group.style.nestingLevel, visible: Boolean(thisGroupVisible)});
      const nextOffset = i === groups.length - 1 ? groupOffsets[i + 1] + group.style.padding : groupOffsets[i + 1];
      if (!parentGroupVisible) {
        continue;
      }
      callback(groupTop, i, group, firstGroup, nextOffset - groupTop);
    }
  }

  private forEachGroupInViewport(
      callback: (arg0: number, arg1: number, arg2: Group, arg3: boolean, arg4: number) => void): void {
    const top = this.chartViewport.scrollOffset();
    this.forEachGroup((groupTop, index, group, firstGroup, height) => {
      if (groupTop - group.style.padding > top + this.offsetHeight) {
        return;
      }
      if (groupTop + height < top) {
        return;
      }
      callback(groupTop, index, group, firstGroup, height);
    });
  }

  private labelWidthForGroup(context: CanvasRenderingContext2D, group: Group): number {
    return UI.UIUtils.measureTextWidth(context, group.name) +
        this.expansionArrowIndent * (group.style.nestingLevel + 1) + 2 * this.headerLabelXPadding;
  }

  private drawCollapsedOverviewForGroup(group: Group, y: number, endLevel: number): void {
    const range = new Common.SegmentedRange.SegmentedRange<string>(mergeCallback);
    const timeWindowLeft = this.chartViewport.windowLeftTime();
    const timeWindowRight = this.chartViewport.windowRightTime();
    const context = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    const barHeight = group.style.height;
    if (!this.rawTimelineData) {
      return;
    }
    const entryStartTimes = this.rawTimelineData.entryStartTimes;
    const entryTotalTimes = this.rawTimelineData.entryTotalTimes;
    const timeToPixel = this.chartViewport.timeToPixel();

    for (let level = group.startLevel; level < endLevel; ++level) {
      const levelIndexes: number[] = this.timelineLevels ? this.timelineLevels[level] : [];
      const rightIndexOnLevel =
          Platform.ArrayUtilities.lowerBound(
              levelIndexes, timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) -
          1;
      let lastDrawOffset: number = Infinity;

      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        const entryStartTime = entryStartTimes[entryIndex];
        const barX = this.timeToPositionClipped(entryStartTime);
        const entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
        if (isNaN(entryEndTime) || barX >= lastDrawOffset) {
          continue;
        }
        if (entryEndTime <= timeWindowLeft) {
          break;
        }
        lastDrawOffset = barX;
        const color = this.entryColorsCache ? this.entryColorsCache[entryIndex] : '';
        const endBarX = this.timeToPositionClipped(entryEndTime);
        if (group.style.useDecoratorsForOverview && this.dataProvider.forceDecoration(entryIndex)) {
          const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
          const barWidth = endBarX - barX;
          context.beginPath();
          context.fillStyle = color;
          context.fillRect(barX, y, barWidth, barHeight - 1);
          this.dataProvider.decorateEntry(
              entryIndex, context, '', barX, y, barWidth, barHeight, unclippedBarX, timeToPixel);
          continue;
        }
        range.append(new Common.SegmentedRange.Segment(barX, endBarX, color));
      }
    }

    const segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
    let lastColor;
    context.beginPath();
    for (let i = 0; i < segments.length; ++i) {
      const segment = segments[i];
      if (lastColor !== segments[i].data) {
        context.fill();
        context.beginPath();
        lastColor = segments[i].data;
        context.fillStyle = lastColor;
      }
      context.rect(segment.begin, y, segment.end - segment.begin, barHeight);
    }
    context.fill();

    function mergeCallback<T>(a: Common.SegmentedRange.Segment<T>, b: Common.SegmentedRange.Segment<T>):
        Common.SegmentedRange.Segment<T>|null {
      return a.data === b.data && a.end + 0.4 > b.end ? a : null;
    }
  }

  private drawFlowEvents(context: CanvasRenderingContext2D, _width: number, _height: number): void {
    context.save();
    const ratio = window.devicePixelRatio;
    const top = this.chartViewport.scrollOffset();
    const arrowWidth = 6;
    context.scale(ratio, ratio);
    context.translate(0, -top);

    context.fillStyle = '#7f5050';
    context.strokeStyle = '#7f5050';
    const td = this.timelineData();
    if (!td) {
      return;
    }

    const endIndex = Platform.ArrayUtilities.lowerBound(
        td.flowStartTimes, this.chartViewport.windowRightTime(), Platform.ArrayUtilities.DEFAULT_COMPARATOR);

    context.lineWidth = 0.5;
    for (let i = 0; i < endIndex; ++i) {
      if (!td.flowEndTimes[i] || td.flowEndTimes[i] < this.chartViewport.windowLeftTime()) {
        continue;
      }
      const startX = this.chartViewport.timeToPosition(td.flowStartTimes[i]);
      const endX = this.chartViewport.timeToPosition(td.flowEndTimes[i]);
      const startLevel = td.flowStartLevels[i];
      const endLevel = td.flowEndLevels[i];
      const startY = this.levelToOffset(startLevel) + this.levelHeight(startLevel) / 2;
      const endY = this.levelToOffset(endLevel) + this.levelHeight(endLevel) / 2;

      const segment = Math.min((endX - startX) / 4, 40);
      const distanceTime = td.flowEndTimes[i] - td.flowStartTimes[i];
      const distanceY = (endY - startY) / 10;
      const spread = 30;
      const lineY = distanceTime < 1 ? startY : spread + Math.max(0, startY + distanceY * (i % spread));

      const p = [];
      p.push({x: startX, y: startY});
      p.push({x: startX + arrowWidth, y: startY});
      p.push({x: startX + segment + 2 * arrowWidth, y: startY});
      p.push({x: startX + segment, y: lineY});
      p.push({x: startX + segment * 2, y: lineY});
      p.push({x: endX - segment * 2, y: lineY});
      p.push({x: endX - segment, y: lineY});
      p.push({x: endX - segment - 2 * arrowWidth, y: endY});
      p.push({x: endX - arrowWidth, y: endY});

      context.beginPath();
      context.moveTo(p[0].x, p[0].y);
      context.lineTo(p[1].x, p[1].y);
      context.bezierCurveTo(p[2].x, p[2].y, p[3].x, p[3].y, p[4].x, p[4].y);
      context.lineTo(p[5].x, p[5].y);
      context.bezierCurveTo(p[6].x, p[6].y, p[7].x, p[7].y, p[8].x, p[8].y);
      context.stroke();

      context.beginPath();
      context.arc(startX, startY, 2, -Math.PI / 2, Math.PI / 2, false);
      context.fill();

      context.beginPath();
      context.moveTo(endX, endY);
      context.lineTo(endX - arrowWidth, endY - 3);
      context.lineTo(endX - arrowWidth, endY + 3);
      context.fill();
    }
    context.restore();
  }

  /**
   * Draws the vertical dashed lines in the timeline marking where the "Marker" events
   * happened in time.
   */
  private drawMarkerLines(): void {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const markers = timelineData.markers;
    const left = this.markerIndexBeforeTime(this.minimumBoundary());
    const rightBoundary = this.maximumBoundary();
    const timeToPixel = this.chartViewport.timeToPixel();

    const context = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    context.save();
    const ratio = window.devicePixelRatio;
    context.scale(ratio, ratio);
    context.translate(0, 3);
    const height = HeaderHeight - 1;
    for (let i = left; i < markers.length; i++) {
      const timestamp = markers[i].startTime();
      if (timestamp > rightBoundary) {
        break;
      }
      markers[i].draw(context, this.chartViewport.timeToPosition(timestamp), height, timeToPixel);
    }
    context.restore();
  }

  private updateMarkerHighlight(): void {
    const element = this.markerHighlighElement;
    if (element.parentElement) {
      element.remove();
    }
    const markerIndex = this.highlightedMarkerIndex;
    if (markerIndex === -1) {
      return;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const marker = timelineData.markers[markerIndex];
    const barX = this.timeToPositionClipped(marker.startTime());
    UI.Tooltip.Tooltip.install(element, marker.title() || '');
    const style = element.style;
    style.left = barX + 'px';
    style.backgroundColor = marker.color();
    this.viewportElement.appendChild(element);
  }

  private processTimelineData(timelineData: TimelineData|null): void {
    if (!timelineData) {
      this.timelineLevels = null;
      this.visibleLevelOffsets = null;
      this.visibleLevels = null;
      this.groupOffsets = null;
      this.rawTimelineData = null;
      this.forceDecorationCache = null;
      this.entryColorsCache = null;
      this.rawTimelineDataLength = 0;
      this.selectedGroup = -1;
      this.keyboardFocusedGroup = -1;
      this.flameChartDelegate.updateSelectedGroup(this, null);
      return;
    }

    this.rawTimelineData = timelineData;
    this.rawTimelineDataLength = timelineData.entryStartTimes.length;
    this.forceDecorationCache = new Int8Array(this.rawTimelineDataLength);
    this.entryColorsCache = new Array(this.rawTimelineDataLength);
    for (let i = 0; i < this.rawTimelineDataLength; ++i) {
      this.forceDecorationCache[i] = this.dataProvider.forceDecoration(i) ? 1 : 0;
      this.entryColorsCache[i] = this.dataProvider.entryColor(i);
    }

    const entryCounters = new Uint32Array(this.dataProvider.maxStackDepth() + 1);
    for (let i = 0; i < timelineData.entryLevels.length; ++i) {
      ++entryCounters[timelineData.entryLevels[i]];
    }
    const levelIndexes = new Array(entryCounters.length);
    for (let i = 0; i < levelIndexes.length; ++i) {
      levelIndexes[i] = new Uint32Array(entryCounters[i]);
      entryCounters[i] = 0;
    }

    for (let i = 0; i < timelineData.entryLevels.length; ++i) {
      const level = timelineData.entryLevels[i];
      levelIndexes[level][entryCounters[level]++] = i;
    }
    this.timelineLevels = levelIndexes;
    const groups = this.rawTimelineData.groups || [];
    for (let i = 0; i < groups.length; ++i) {
      const expanded = this.groupExpansionState[groups[i].name];
      if (expanded !== undefined) {
        groups[i].expanded = expanded;
      }
    }
    this.updateLevelPositions();
    this.updateHeight();

    this.selectedGroup = timelineData.selectedGroup ? groups.indexOf(timelineData.selectedGroup) : -1;
    this.keyboardFocusedGroup = this.selectedGroup;
    this.flameChartDelegate.updateSelectedGroup(this, timelineData.selectedGroup);
  }

  private updateLevelPositions(): void {
    const levelCount = this.dataProvider.maxStackDepth();
    const groups = this.rawTimelineData ? (this.rawTimelineData.groups || []) : [];
    this.visibleLevelOffsets = new Uint32Array(levelCount + 1);
    this.visibleLevelHeights = new Uint32Array(levelCount);
    this.visibleLevels = new Uint16Array(levelCount);
    this.groupOffsets = new Uint32Array(groups.length + 1);

    let groupIndex = -1;
    let currentOffset = this.rulerEnabled ? HeaderHeight + 2 : 2;
    let visible = true;
    const groupStack: {
      nestingLevel: number,
      visible: boolean,
    }[] = [{nestingLevel: -1, visible: true}];
    const lastGroupLevel =
        Math.max(levelCount, groups.length ? (groups[groups.length - 1] as Group).startLevel + 1 : 0);
    let level;
    for (level = 0; level < lastGroupLevel; ++level) {
      let parentGroupIsVisible = true;
      let style;
      while (groupIndex < groups.length - 1 && level === groups[groupIndex + 1].startLevel) {
        ++groupIndex;
        style = groups[groupIndex].style;
        let nextLevel = true;
        let last: {
          nestingLevel: number,
          visible: boolean,
        } = groupStack[groupStack.length - 1];
        while (last && last.nestingLevel >= style.nestingLevel) {
          groupStack.pop();
          nextLevel = false;
          last = groupStack[groupStack.length - 1];
        }
        const thisGroupIsVisible =
            groupIndex >= 0 && this.isGroupCollapsible(groupIndex) ? groups[groupIndex].expanded : true;

        last = groupStack[groupStack.length - 1];
        parentGroupIsVisible = last ? last.visible : false;
        visible = Boolean(thisGroupIsVisible) && parentGroupIsVisible;
        groupStack.push({nestingLevel: style.nestingLevel, visible: visible});
        if (parentGroupIsVisible) {
          currentOffset += nextLevel ? 0 : style.padding;
        }
        this.groupOffsets[groupIndex] = currentOffset;
        if (parentGroupIsVisible && !style.shareHeaderLine) {
          currentOffset += style.height;
        }
      }
      if (level >= levelCount) {
        continue;
      }
      const isFirstOnLevel = groupIndex >= 0 && level === groups[groupIndex].startLevel;
      const thisLevelIsVisible =
          parentGroupIsVisible && (visible || isFirstOnLevel && groups[groupIndex].style.useFirstLineForOverview);
      let height;
      if (groupIndex >= 0) {
        const group = groups[groupIndex];
        const styleB = group.style;
        height = isFirstOnLevel && !styleB.shareHeaderLine || (styleB.collapsible && !group.expanded) ?
            styleB.height :
            (styleB.itemsHeight || this.barHeight);
      } else {
        height = this.barHeight;
      }
      this.visibleLevels[level] = thisLevelIsVisible ? 1 : 0;
      this.visibleLevelOffsets[level] = currentOffset;
      this.visibleLevelHeights[level] = height;
      if (thisLevelIsVisible || (parentGroupIsVisible && style && style.shareHeaderLine && isFirstOnLevel)) {
        currentOffset += this.visibleLevelHeights[level];
      }
    }
    if (groupIndex >= 0) {
      this.groupOffsets[groupIndex + 1] = currentOffset;
    }
    this.visibleLevelOffsets[level] = currentOffset;
  }

  private isGroupCollapsible(index: number): boolean|undefined {
    if (!this.rawTimelineData) {
      return;
    }

    const groups = this.rawTimelineData.groups || [];
    const style = groups[index].style;
    if (!style.shareHeaderLine || !style.collapsible) {
      return Boolean(style.collapsible);
    }
    const isLastGroup = index + 1 >= groups.length;
    if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel) {
      return true;
    }
    const nextGroupLevel = isLastGroup ? this.dataProvider.maxStackDepth() : groups[index + 1].startLevel;
    if (nextGroupLevel !== groups[index].startLevel + 1) {
      return true;
    }
    // For groups that only have one line and share header line, pretend these are not collapsible
    // unless the itemsHeight does not match the headerHeight
    return style.height !== style.itemsHeight;
  }

  setSelectedEntry(entryIndex: number): void {
    if (this.selectedEntryIndex === entryIndex) {
      return;
    }
    if (entryIndex !== -1) {
      this.chartViewport.hideRangeSelection();
    }
    this.selectedEntryIndex = entryIndex;
    this.revealEntry(entryIndex);
    this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
  }

  private updateElementPosition(element: Element, entryIndex: number): void {
    const elementMinWidthPx = 2;
    element.classList.add('hidden');
    if (entryIndex === -1) {
      return;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }

    const startTime = timelineData.entryStartTimes[entryIndex];
    const duration = timelineData.entryTotalTimes[entryIndex];
    let barX = 0;
    let barWidth = 0;
    let visible = true;
    if (Number.isNaN(duration)) {
      const position = this.markerPositions.get(entryIndex);
      if (position) {
        barX = position.x;
        barWidth = position.width;
      } else {
        visible = false;
      }
    } else {
      barX = this.chartViewport.timeToPosition(startTime);
      barWidth = duration * this.chartViewport.timeToPixel();
    }
    if (barX + barWidth <= 0 || barX >= this.offsetWidth) {
      return;
    }
    const barCenter = barX + barWidth / 2;
    barWidth = Math.max(barWidth, elementMinWidthPx);
    barX = barCenter - barWidth / 2;
    const entryLevel = timelineData.entryLevels[entryIndex];
    const barY = this.levelToOffset(entryLevel) - this.chartViewport.scrollOffset();
    const barHeight = this.levelHeight(entryLevel);
    const style = (element as HTMLElement).style;
    style.left = barX + 'px';
    style.top = barY + 'px';
    style.width = barWidth + 'px';
    style.height = barHeight - 1 + 'px';
    element.classList.toggle('hidden', !visible);
    this.viewportElement.appendChild(element);
  }

  private timeToPositionClipped(time: number): number {
    return Platform.NumberUtilities.clamp(this.chartViewport.timeToPosition(time), 0, this.offsetWidth);
  }

  private levelToOffset(level: number): number {
    if (!this.visibleLevelOffsets) {
      throw new Error('No visible level offsets');
    }
    return this.visibleLevelOffsets[level];
  }

  private levelHeight(level: number): number {
    if (!this.visibleLevelHeights) {
      throw new Error('No visible level heights');
    }
    return this.visibleLevelHeights[level];
  }

  private updateBoundaries(): void {
    this.totalTime = this.dataProvider.totalTime();
    this.minimumBoundaryInternal = this.dataProvider.minimumBoundary();
    this.chartViewport.setBoundaries(this.minimumBoundaryInternal, this.totalTime);
  }

  private updateHeight(): void {
    const height = this.levelToOffset(this.dataProvider.maxStackDepth()) + 2;
    this.chartViewport.setContentHeight(height);
  }

  onResize(): void {
    this.scheduleUpdate();
  }

  update(): void {
    if (!this.timelineData()) {
      return;
    }
    this.resetCanvas();
    this.updateHeight();
    this.updateBoundaries();
    this.draw();
    if (!this.chartViewport.isDragging()) {
      this.updateHighlight();
    }
  }

  reset(): void {
    this.chartViewport.reset();
    this.rawTimelineData = null;
    this.rawTimelineDataLength = 0;
    this.highlightedMarkerIndex = -1;
    this.highlightedEntryIndex = -1;
    this.selectedEntryIndex = -1;
    this.chartViewport.scheduleUpdate();
  }

  scheduleUpdate(): void {
    this.chartViewport.scheduleUpdate();
  }

  private enabled(): boolean {
    return this.rawTimelineDataLength !== 0;
  }

  computePosition(time: number): number {
    return this.chartViewport.timeToPosition(time);
  }

  formatValue(value: number, precision?: number): string {
    return this.dataProvider.formatValue(value - this.zeroTime(), precision);
  }

  maximumBoundary(): number {
    return this.chartViewport.windowRightTime();
  }

  minimumBoundary(): number {
    return this.chartViewport.windowLeftTime();
  }

  zeroTime(): number {
    return this.dataProvider.minimumBoundary();
  }

  boundarySpan(): number {
    return this.maximumBoundary() - this.minimumBoundary();
  }
}

export const HeaderHeight = 15;
export const MinimalTimeWindowMs = 0.5;

export class TimelineData {
  entryLevels: number[]|Uint16Array;
  entryTotalTimes: number[]|Float32Array;
  entryStartTimes: number[]|Float64Array;
  groups: Group[];
  markers: FlameChartMarker[];
  flowStartTimes: number[];
  flowStartLevels: number[];
  flowEndTimes: number[];
  flowEndLevels: number[];
  selectedGroup: Group|null;
  constructor(
      entryLevels: number[]|Uint16Array, entryTotalTimes: number[]|Float32Array, entryStartTimes: number[]|Float64Array,
      groups: Group[]|null) {
    this.entryLevels = entryLevels;
    this.entryTotalTimes = entryTotalTimes;
    this.entryStartTimes = entryStartTimes;
    this.groups = groups || [];
    this.markers = [];
    this.flowStartTimes = [];
    this.flowStartLevels = [];
    this.flowEndTimes = [];
    this.flowEndLevels = [];
    this.selectedGroup = null;
  }
}

export interface FlameChartDataProvider {
  minimumBoundary(): number;

  totalTime(): number;

  formatValue(value: number, precision?: number): string;

  maxStackDepth(): number;

  timelineData(): TimelineData|null;

  prepareHighlightedEntryInfo(entryIndex: number): Element|null;

  canJumpToEntry(entryIndex: number): boolean;

  entryTitle(entryIndex: number): string|null;

  entryFont(entryIndex: number): string|null;

  entryColor(entryIndex: number): string;

  decorateEntry(
      entryIndex: number, context: CanvasRenderingContext2D, text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean;

  forceDecoration(entryIndex: number): boolean;

  textColor(entryIndex: number): string;

  navStartTimes(): Map<string, SDK.TracingModel.Event>;
}

export interface FlameChartMarker {
  startTime(): number;
  color(): string;
  title(): string|null;
  draw(context: CanvasRenderingContext2D, x: number, height: number, pixelsPerMillisecond: number): void;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CanvasFocused = 'CanvasFocused',
  EntryInvoked = 'EntryInvoked',
  EntrySelected = 'EntrySelected',
  EntryHighlighted = 'EntryHighlighted',
}

export type EventTypes = {
  [Events.CanvasFocused]: number|void,
  [Events.EntryInvoked]: number,
  [Events.EntrySelected]: number,
  [Events.EntryHighlighted]: number,
};

export interface Group {
  name: Common.UIString.LocalizedString;
  startLevel: number;
  expanded?: boolean;
  selectable?: boolean;
  style: {
    height: number,
    padding: number,
    collapsible: boolean,
    font: string,
    color: string,
    backgroundColor: string,
    nestingLevel: number,
    itemsHeight?: number,
    shareHeaderLine?: boolean,
    useFirstLineForOverview?: boolean,
    useDecoratorsForOverview?: boolean,
  };
  track?: TimelineModel.TimelineModel.Track|null;
}
export interface GroupStyle {
  height: number;
  padding: number;
  collapsible: boolean;
  font: string;
  color: string;
  backgroundColor: string;
  nestingLevel: number;
  itemsHeight?: number;
  shareHeaderLine?: boolean;
  useFirstLineForOverview?: boolean;
  useDecoratorsForOverview?: boolean;
}
