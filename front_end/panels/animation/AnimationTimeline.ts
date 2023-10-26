// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AnimationGroupPreviewUI} from './AnimationGroupPreviewUI.js';
import animationTimelineStyles from './animationTimeline.css.js';

import {
  AnimationModel,
  Events,
  type AnimationEffect,
  type AnimationGroup,
  type AnimationImpl,
} from './AnimationModel.js';
import {AnimationScreenshotPopover} from './AnimationScreenshotPopover.js';
import {AnimationUI} from './AnimationUI.js';

const UIStrings = {
  /**
   *@description Timeline hint text content in Animation Timeline of the Animation Inspector
   */
  selectAnEffectAboveToInspectAnd: 'Select an effect above to inspect and modify.',
  /**
   *@description Text to clear everything
   */
  clearAll: 'Clear all',
  /**
   *@description Tooltip text that appears when hovering over largeicon pause button in Animation Timeline of the Animation Inspector
   */
  pauseAll: 'Pause all',
  /**
   *@description Title of the playback rate button listbox
   */
  playbackRates: 'Playback rates',
  /**
   *@description Text in Animation Timeline of the Animation Inspector
   *@example {50} PH1
   */
  playbackRatePlaceholder: '{PH1}%',
  /**
   *@description Text of an item that pause the running task
   */
  pause: 'Pause',
  /**
   *@description Button title in Animation Timeline of the Animation Inspector
   *@example {50%} PH1
   */
  setSpeedToS: 'Set speed to {PH1}',
  /**
   *@description Title of Animation Previews listbox
   */
  animationPreviews: 'Animation previews',
  /**
   *@description Empty buffer hint text content in Animation Timeline of the Animation Inspector
   */
  waitingForAnimations: 'Waiting for animations...',
  /**
   *@description Tooltip text that appears when hovering over largeicon replay animation button in Animation Timeline of the Animation Inspector
   */
  replayTimeline: 'Replay timeline',
  /**
   *@description Text in Animation Timeline of the Animation Inspector
   */
  resumeAll: 'Resume all',
  /**
   *@description Title of control button in animation timeline of the animation inspector
   */
  playTimeline: 'Play timeline',
  /**
   *@description Title of control button in animation timeline of the animation inspector
   */
  pauseTimeline: 'Pause timeline',
  /**
   *@description Title of a specific Animation Preview
   *@example {1} PH1
   */
  animationPreviewS: 'Animation Preview {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/animation/AnimationTimeline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const nodeUIsByNode = new WeakMap<SDK.DOMModel.DOMNode, NodeUI>();

const playbackRates = new WeakMap<HTMLElement, number>();

const MIN_TIMELINE_CONTROLS_WIDTH = 120;
const DEFAULT_TIMELINE_CONTROLS_WIDTH = 150;
const MAX_TIMELINE_CONTROLS_WIDTH = 720;

let animationTimelineInstance: AnimationTimeline;

export class AnimationTimeline extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<AnimationModel> {
  #gridWrapper: HTMLElement;
  #grid: Element;
  #playbackRate: number;
  #allPaused: boolean;
  #animationsContainer: HTMLElement;
  #playbackRateButtons!: HTMLElement[];
  #previewContainer!: HTMLElement;
  #timelineScrubber!: HTMLElement;
  #currentTime!: HTMLElement;
  #popoverHelper!: UI.PopoverHelper.PopoverHelper;
  #clearButton!: UI.Toolbar.ToolbarButton;
  #selectedGroup!: AnimationGroup|null;
  #renderQueue!: AnimationUI[];
  #defaultDuration: number;
  #durationInternal: number;
  #timelineControlsWidth: number;
  readonly #nodesMap: Map<number, NodeUI>;
  #uiAnimations: AnimationUI[];
  #groupBuffer: AnimationGroup[];
  readonly #previewMap: Map<AnimationGroup, AnimationGroupPreviewUI>;
  readonly #animationsMap: Map<string, AnimationImpl>;
  #timelineScrubberLine?: HTMLElement;
  #pauseButton?: UI.Toolbar.ToolbarToggle;
  #controlButton?: UI.Toolbar.ToolbarToggle;
  #controlState?: ControlState;
  #redrawing?: boolean;
  #cachedTimelineWidth?: number;
  #scrubberPlayer?: Animation;
  #gridOffsetLeft?: number;
  #originalScrubberTime?: number|null;
  #animationGroupPausedBeforeScrub: boolean;
  #originalMousePosition?: number;
  #timelineControlsResizer: HTMLElement;
  #gridHeader!: HTMLElement;

  private constructor() {
    super(true);

    this.element.classList.add('animations-timeline');

    this.#timelineControlsResizer = this.contentElement.createChild('div', 'timeline-controls-resizer');
    this.#gridWrapper = this.contentElement.createChild('div', 'grid-overflow-wrapper');
    this.#grid = UI.UIUtils.createSVGChild(this.#gridWrapper, 'svg', 'animation-timeline-grid');

    this.#playbackRate = 1;
    this.#allPaused = false;
    this.#animationGroupPausedBeforeScrub = false;
    this.createHeader();
    this.#animationsContainer = this.contentElement.createChild('div', 'animation-timeline-rows');
    const timelineHint = this.contentElement.createChild('div', 'animation-timeline-rows-hint');
    timelineHint.textContent = i18nString(UIStrings.selectAnEffectAboveToInspectAnd);

    /** @const */ this.#defaultDuration = 100;
    this.#durationInternal = this.#defaultDuration;
    this.#nodesMap = new Map();
    this.#uiAnimations = [];
    this.#groupBuffer = [];
    this.#previewMap = new Map();
    this.#animationsMap = new Map();

    this.#timelineControlsWidth = DEFAULT_TIMELINE_CONTROLS_WIDTH;
    this.element.style.setProperty('--timeline-controls-width', `${this.#timelineControlsWidth}px`);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().observeModels(AnimationModel, this, {scoped: true});
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.nodeChanged, this);

    this.#setupTimelineControlsResizer();
  }

  static instance(opts?: {forceNew: boolean}): AnimationTimeline {
    if (!animationTimelineInstance || opts?.forceNew) {
      animationTimelineInstance = new AnimationTimeline();
    }
    return animationTimelineInstance;
  }

  #setupTimelineControlsResizer(): void {
    let resizeOriginX: number|undefined = undefined;
    UI.UIUtils.installDragHandle(
        this.#timelineControlsResizer,
        (ev: MouseEvent) => {
          resizeOriginX = ev.clientX;
          return true;
        },
        (ev: MouseEvent) => {
          if (resizeOriginX === undefined) {
            return;
          }

          const newWidth = this.#timelineControlsWidth + ev.clientX - resizeOriginX;
          this.#timelineControlsWidth =
              Math.min(Math.max(newWidth, MIN_TIMELINE_CONTROLS_WIDTH), MAX_TIMELINE_CONTROLS_WIDTH);
          resizeOriginX = ev.clientX;
          this.element.style.setProperty('--timeline-controls-width', this.#timelineControlsWidth + 'px');
          this.onResize();
        },
        () => {
          resizeOriginX = undefined;
        },
        'ew-resize');
  }

  get previewMap(): Map<AnimationGroup, AnimationGroupPreviewUI> {
    return this.#previewMap;
  }

  get uiAnimations(): AnimationUI[] {
    return this.#uiAnimations;
  }

  get groupBuffer(): AnimationGroup[] {
    return this.#groupBuffer;
  }

  override wasShown(): void {
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(AnimationModel, {scoped: true})) {
      this.addEventListeners(animationModel);
    }
    this.registerCSSFiles([animationTimelineStyles]);
  }

  override willHide(): void {
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(AnimationModel, {scoped: true})) {
      this.removeEventListeners(animationModel);
    }

    if (this.#popoverHelper) {
      this.#popoverHelper.hidePopover();
    }
  }

  modelAdded(animationModel: AnimationModel): void {
    if (this.isShowing()) {
      this.addEventListeners(animationModel);
    }
  }

  modelRemoved(animationModel: AnimationModel): void {
    this.removeEventListeners(animationModel);
  }

  private addEventListeners(animationModel: AnimationModel): void {
    void animationModel.ensureEnabled();
    animationModel.addEventListener(Events.AnimationGroupStarted, this.animationGroupStarted, this);
    animationModel.addEventListener(Events.ModelReset, this.reset, this);
  }

  private removeEventListeners(animationModel: AnimationModel): void {
    animationModel.removeEventListener(Events.AnimationGroupStarted, this.animationGroupStarted, this);
    animationModel.removeEventListener(Events.ModelReset, this.reset, this);
  }

  private nodeChanged(): void {
    for (const nodeUI of this.#nodesMap.values()) {
      nodeUI.nodeChanged();
    }
  }

  private createScrubber(): HTMLElement {
    this.#timelineScrubber = document.createElement('div');
    this.#timelineScrubber.classList.add('animation-scrubber');
    this.#timelineScrubber.classList.add('hidden');
    this.#timelineScrubberLine = this.#timelineScrubber.createChild('div', 'animation-scrubber-line');
    this.#timelineScrubberLine.createChild('div', 'animation-scrubber-head');
    this.#timelineScrubber.createChild('div', 'animation-time-overlay');
    return this.#timelineScrubber;
  }

  private createHeader(): HTMLElement {
    const toolbarContainer = this.contentElement.createChild('div', 'animation-timeline-toolbar-container');
    const topToolbar = new UI.Toolbar.Toolbar('animation-timeline-toolbar', toolbarContainer);
    this.#clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
    this.#clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationGroupsCleared);
      this.reset();
    });
    topToolbar.appendToolbarItem(this.#clearButton);
    topToolbar.appendSeparator();

    this.#pauseButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.pauseAll), 'pause', 'resume');
    this.#pauseButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      this.togglePauseAll();
    });
    topToolbar.appendToolbarItem(this.#pauseButton);

    const playbackRateControl = toolbarContainer.createChild('div', 'animation-playback-rate-control');
    playbackRateControl.addEventListener('keydown', this.handlePlaybackRateControlKeyDown.bind(this));
    UI.ARIAUtils.markAsListBox(playbackRateControl);
    UI.ARIAUtils.setLabel(playbackRateControl, i18nString(UIStrings.playbackRates));

    this.#playbackRateButtons = [];
    for (const playbackRate of GlobalPlaybackRates) {
      const button = (playbackRateControl.createChild('button', 'animation-playback-rate-button') as HTMLElement);
      button.textContent = playbackRate ? i18nString(UIStrings.playbackRatePlaceholder, {PH1: playbackRate * 100}) :
                                          i18nString(UIStrings.pause);
      playbackRates.set(button, playbackRate);
      button.addEventListener('click', this.setPlaybackRate.bind(this, playbackRate));
      UI.ARIAUtils.markAsOption(button);
      UI.Tooltip.Tooltip.install(button, i18nString(UIStrings.setSpeedToS, {PH1: button.textContent}));
      button.tabIndex = -1;
      this.#playbackRateButtons.push(button);
    }
    this.updatePlaybackControls();
    this.#previewContainer = (this.contentElement.createChild('div', 'animation-timeline-buffer') as HTMLElement);
    UI.ARIAUtils.markAsListBox(this.#previewContainer);
    UI.ARIAUtils.setLabel(this.#previewContainer, i18nString(UIStrings.animationPreviews));
    this.#popoverHelper = new UI.PopoverHelper.PopoverHelper(this.#previewContainer, this.getPopoverRequest.bind(this));
    this.#popoverHelper.setDisableOnClick(true);
    this.#popoverHelper.setTimeout(0);
    const emptyBufferHint = this.contentElement.createChild('div', 'animation-timeline-buffer-hint');
    emptyBufferHint.textContent = i18nString(UIStrings.waitingForAnimations);
    const container = this.contentElement.createChild('div', 'animation-timeline-header');
    const controls = container.createChild('div', 'animation-controls');
    this.#currentTime = (controls.createChild('div', 'animation-timeline-current-time monospace') as HTMLElement);

    const toolbar = new UI.Toolbar.Toolbar('animation-controls-toolbar', controls);
    this.#controlButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.replayTimeline), 'replay');
    this.#controlState = ControlState.Replay;
    this.#controlButton.setToggled(true);
    this.#controlButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.controlButtonToggle.bind(this));
    toolbar.appendToolbarItem(this.#controlButton);

    this.#gridHeader = container.createChild('div', 'animation-grid-header');
    UI.UIUtils.installDragHandle(
        this.#gridHeader, this.repositionScrubber.bind(this), this.scrubberDragMove.bind(this),
        this.scrubberDragEnd.bind(this), null);
    this.#gridWrapper.appendChild(this.createScrubber());

    this.#currentTime.textContent = '';

    return container;
  }

  private handlePlaybackRateControlKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    switch (keyboardEvent.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focusNextPlaybackRateButton(event.target, /* focusPrevious */ true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this.focusNextPlaybackRateButton(event.target);
        break;
    }
  }

  private focusNextPlaybackRateButton(target: EventTarget|null, focusPrevious?: boolean): void {
    const button = (target as HTMLElement);
    const currentIndex = this.#playbackRateButtons.indexOf(button);
    const nextIndex = focusPrevious ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= this.#playbackRateButtons.length) {
      return;
    }
    const nextButton = this.#playbackRateButtons[nextIndex];
    nextButton.tabIndex = 0;
    nextButton.focus();
    if (target) {
      (target as HTMLElement).tabIndex = -1;
    }
  }

  private getPopoverRequest(event: Event): UI.PopoverHelper.PopoverRequest|null {
    const element = (event.target as HTMLElement);
    if (!element || !element.isDescendant(this.#previewContainer)) {
      return null;
    }

    return {
      box: element.boxInWindow(),
      show: (popover: UI.GlassPane.GlassPane): Promise<boolean> => {
        let animGroup;
        for (const [group, previewUI] of this.#previewMap) {
          if (previewUI.element === element || previewUI.element === element.parentElement) {
            animGroup = group;
          }
        }
        console.assert(typeof animGroup !== 'undefined');
        if (!animGroup) {
          return Promise.resolve(false);
        }
        const screenshots = animGroup.screenshots();
        if (!screenshots.length) {
          return Promise.resolve(false);
        }

        let fulfill: (arg0: boolean) => void;
        const promise = new Promise<boolean>(x => {
          fulfill = x;
        });
        if (!screenshots[0].complete) {
          screenshots[0].onload = onFirstScreenshotLoaded.bind(null, screenshots);
        } else {
          onFirstScreenshotLoaded(screenshots);
        }
        return promise;

        function onFirstScreenshotLoaded(screenshots: HTMLImageElement[]): void {
          new AnimationScreenshotPopover(screenshots).show(popover.contentElement);
          fulfill(true);
        }
      },
      hide: undefined,
    };
  }

  private togglePauseAll(): void {
    this.#allPaused = !this.#allPaused;
    Host.userMetrics.actionTaken(
        this.#allPaused ? Host.UserMetrics.Action.AnimationsPaused : Host.UserMetrics.Action.AnimationsResumed,
    );
    if (this.#pauseButton) {
      this.#pauseButton.setToggled(this.#allPaused);
    }
    this.setPlaybackRate(this.#playbackRate);
    if (this.#pauseButton) {
      this.#pauseButton.setTitle(this.#allPaused ? i18nString(UIStrings.resumeAll) : i18nString(UIStrings.pauseAll));
    }
  }

  private setPlaybackRate(playbackRate: number): void {
    if (playbackRate !== this.#playbackRate) {
      Host.userMetrics.animationPlaybackRateChanged(
          playbackRate === 0.1      ? Host.UserMetrics.AnimationsPlaybackRate.Percent10 :
              playbackRate === 0.25 ? Host.UserMetrics.AnimationsPlaybackRate.Percent25 :
              playbackRate === 1    ? Host.UserMetrics.AnimationsPlaybackRate.Percent100 :
                                      Host.UserMetrics.AnimationsPlaybackRate.Other);
    }

    this.#playbackRate = playbackRate;
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(AnimationModel, {scoped: true})) {
      animationModel.setPlaybackRate(this.#allPaused ? 0 : this.#playbackRate);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationsPlaybackRateChanged);
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    }

    this.updatePlaybackControls();
  }

  private updatePlaybackControls(): void {
    for (const button of this.#playbackRateButtons) {
      const selected = this.#playbackRate === playbackRates.get(button);
      button.classList.toggle('selected', selected);
      button.tabIndex = selected ? 0 : -1;
    }
  }

  private controlButtonToggle(): void {
    if (this.#controlState === ControlState.Play) {
      this.togglePause(false);
    } else if (this.#controlState === ControlState.Replay) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationGroupReplayed);
      this.replay();
    } else {
      this.togglePause(true);
    }
  }

  private updateControlButton(): void {
    if (!this.#controlButton) {
      return;
    }

    this.#controlButton.setEnabled(Boolean(this.#selectedGroup));
    if (this.#selectedGroup && this.#selectedGroup.paused()) {
      this.#controlState = ControlState.Play;
      this.#controlButton.setToggled(true);
      this.#controlButton.setTitle(i18nString(UIStrings.playTimeline));
      this.#controlButton.setGlyph('play');
    } else if (
        !this.#scrubberPlayer || !this.#scrubberPlayer.currentTime ||
        typeof this.#scrubberPlayer.currentTime !== 'number' || this.#scrubberPlayer.currentTime >= this.duration()) {
      this.#controlState = ControlState.Replay;
      this.#controlButton.setToggled(true);
      this.#controlButton.setTitle(i18nString(UIStrings.replayTimeline));
      this.#controlButton.setGlyph('replay');
    } else {
      this.#controlState = ControlState.Pause;
      this.#controlButton.setToggled(false);
      this.#controlButton.setTitle(i18nString(UIStrings.pauseTimeline));
      this.#controlButton.setGlyph('pause');
    }
  }

  private effectivePlaybackRate(): number {
    return (this.#allPaused || (this.#selectedGroup && this.#selectedGroup.paused())) ? 0 : this.#playbackRate;
  }

  private togglePause(pause: boolean): void {
    if (this.#selectedGroup) {
      this.#selectedGroup.togglePause(pause);
      const preview = this.#previewMap.get(this.#selectedGroup);
      if (preview) {
        preview.element.classList.toggle('paused', pause);
      }
    }
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    }
    this.updateControlButton();
  }

  private replay(): void {
    if (!this.#selectedGroup) {
      return;
    }
    this.#selectedGroup.seekTo(0);
    this.animateTime(0);
    this.updateControlButton();
  }

  duration(): number {
    return this.#durationInternal;
  }

  setDuration(duration: number): void {
    this.#durationInternal = duration;
    this.scheduleRedraw();
  }

  private clearTimeline(): void {
    this.#uiAnimations = [];
    this.#nodesMap.clear();
    this.#animationsMap.clear();
    this.#animationsContainer.removeChildren();
    this.#durationInternal = this.#defaultDuration;
    this.#timelineScrubber.classList.add('hidden');
    this.#gridHeader.classList.remove('has-selected-group');
    this.#selectedGroup = null;
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.cancel();
    }
    this.#scrubberPlayer = undefined;
    this.#currentTime.textContent = '';
    this.updateControlButton();
  }

  private reset(): void {
    this.clearTimeline();
    this.setPlaybackRate(this.#playbackRate);

    for (const group of this.#groupBuffer) {
      group.release();
    }
    this.#groupBuffer = [];
    this.#previewMap.clear();
    this.#previewContainer.removeChildren();
    this.#popoverHelper.hidePopover();
    this.renderGrid();
  }

  private animationGroupStarted({data}: Common.EventTarget.EventTargetEvent<AnimationGroup>): void {
    this.addAnimationGroup(data);
  }

  private addAnimationGroup(group: AnimationGroup): void {
    function startTimeComparator(left: AnimationGroup, right: AnimationGroup): 0|1|- 1 {
      if (left.startTime() === right.startTime()) {
        return 0;
      }
      return left.startTime() > right.startTime() ? 1 : -1;
    }

    const previewGroup = this.#previewMap.get(group);
    if (previewGroup) {
      if (this.#selectedGroup === group) {
        this.syncScrubber();
      } else {
        previewGroup.replay();
      }
      return;
    }
    this.#groupBuffer.sort(startTimeComparator);
    // Discard oldest groups from buffer if necessary
    const groupsToDiscard = [];
    const bufferSize = this.width() / 50;
    while (this.#groupBuffer.length > bufferSize) {
      const toDiscard = this.#groupBuffer.splice(this.#groupBuffer[0] === this.#selectedGroup ? 1 : 0, 1);
      groupsToDiscard.push(toDiscard[0]);
    }
    for (const g of groupsToDiscard) {
      const discardGroup = this.#previewMap.get(g);
      if (!discardGroup) {
        continue;
      }
      discardGroup.element.remove();
      this.#previewMap.delete(g);
      g.release();
    }
    // Generate preview
    const preview = new AnimationGroupPreviewUI(group);
    this.#groupBuffer.push(group);
    this.#previewMap.set(group, preview);
    this.#previewContainer.appendChild(preview.element);
    preview.removeButton().addEventListener('click', this.removeAnimationGroup.bind(this, group));
    preview.element.addEventListener('click', this.selectAnimationGroup.bind(this, group));
    preview.element.addEventListener('keydown', this.handleAnimationGroupKeyDown.bind(this, group));
    UI.ARIAUtils.setLabel(
        preview.element, i18nString(UIStrings.animationPreviewS, {PH1: this.#groupBuffer.indexOf(group) + 1}));
    UI.ARIAUtils.markAsOption(preview.element);

    if (this.#previewMap.size === 1) {
      const preview = this.#previewMap.get(this.#groupBuffer[0]);
      if (preview) {
        preview.element.tabIndex = 0;
      }
    }
  }

  private handleAnimationGroupKeyDown(group: AnimationGroup, event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
      case 'Enter':
        this.selectAnimationGroup(group);
        break;
      case 'Backspace':
      case 'Delete':
        this.removeAnimationGroup(group, event);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focusNextGroup(group, /* target */ event.target, /* focusPrevious */ true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this.focusNextGroup(group, /* target */ event.target);
    }
  }

  private focusNextGroup(group: AnimationGroup, target: EventTarget|null, focusPrevious?: boolean): void {
    const currentGroupIndex = this.#groupBuffer.indexOf(group);
    const nextIndex = focusPrevious ? currentGroupIndex - 1 : currentGroupIndex + 1;
    if (nextIndex < 0 || nextIndex >= this.#groupBuffer.length) {
      return;
    }
    const preview = this.#previewMap.get(this.#groupBuffer[nextIndex]);
    if (preview) {
      preview.element.tabIndex = 0;
      preview.element.focus();
    }

    if (target) {
      (target as HTMLElement).tabIndex = -1;
    }
  }

  private removeAnimationGroup(group: AnimationGroup, event: Event): void {
    const currentGroupIndex = this.#groupBuffer.indexOf(group);

    Platform.ArrayUtilities.removeElement(this.#groupBuffer, group);
    const previewGroup = this.#previewMap.get(group);
    if (previewGroup) {
      previewGroup.element.remove();
    }
    this.#previewMap.delete(group);
    group.release();
    event.consume(true);

    if (this.#selectedGroup === group) {
      this.clearTimeline();
      this.renderGrid();
    }

    const groupLength = this.#groupBuffer.length;
    if (groupLength === 0) {
      (this.#clearButton.element as HTMLElement).focus();
      return;
    }
    const nextGroup = currentGroupIndex >= this.#groupBuffer.length ?
        this.#previewMap.get(this.#groupBuffer[this.#groupBuffer.length - 1]) :
        this.#previewMap.get(this.#groupBuffer[currentGroupIndex]);

    if (nextGroup) {
      nextGroup.element.tabIndex = 0;
      nextGroup.element.focus();
    }
  }

  private selectAnimationGroup(group: AnimationGroup): void {
    function applySelectionClass(this: AnimationTimeline, ui: AnimationGroupPreviewUI, group: AnimationGroup): void {
      ui.element.classList.toggle('selected', this.#selectedGroup === group);
    }

    if (this.#selectedGroup === group) {
      this.togglePause(false);
      this.replay();
      return;
    }
    this.clearTimeline();
    this.#selectedGroup = group;
    this.#previewMap.forEach(applySelectionClass, this);
    this.setDuration(Math.max(500, group.finiteDuration() + 100));
    for (const anim of group.animations()) {
      this.addAnimation(anim);
    }
    this.scheduleRedraw();
    this.#timelineScrubber.classList.remove('hidden');
    this.#gridHeader.classList.add('has-selected-group');
    this.togglePause(false);
    this.replay();
  }

  private addAnimation(animation: AnimationImpl): void {
    function nodeResolved(this: AnimationTimeline, node: SDK.DOMModel.DOMNode|null): void {
      uiAnimation.setNode(node);
      if (node && nodeUI) {
        nodeUI.nodeResolved(node);
        nodeUIsByNode.set(node, nodeUI);
      }
    }

    let nodeUI = this.#nodesMap.get(animation.source().backendNodeId());
    if (!nodeUI) {
      nodeUI = new NodeUI(animation.source());
      this.#animationsContainer.appendChild(nodeUI.element);
      this.#nodesMap.set(animation.source().backendNodeId(), nodeUI);
    }
    const nodeRow = nodeUI.createNewRow();
    const uiAnimation = new AnimationUI(animation, this, nodeRow);
    animation.source().deferredNode().resolve(nodeResolved.bind(this));
    this.#uiAnimations.push(uiAnimation);
    this.#animationsMap.set(animation.id(), animation);
  }

  private nodeRemoved(
      event: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode, parent: SDK.DOMModel.DOMNode}>): void {
    const {node} = event.data;
    const nodeUI = nodeUIsByNode.get(node);
    if (nodeUI) {
      nodeUI.nodeRemoved();
    }
  }

  private renderGrid(): void {
    /** @const */ const gridSize = 250;
    this.#grid.removeChildren();
    let lastDraw: number|undefined = undefined;
    for (let time = 0; time < this.duration(); time += gridSize) {
      const line = UI.UIUtils.createSVGChild(this.#grid, 'rect', 'animation-timeline-grid-line');
      line.setAttribute('x', (time * this.pixelMsRatio() + 10).toString());
      line.setAttribute('y', '23');
      line.setAttribute('height', '100%');
      line.setAttribute('width', '1');
    }
    for (let time = 0; time < this.duration(); time += gridSize) {
      const gridWidth = time * this.pixelMsRatio();
      if (lastDraw === undefined || gridWidth - lastDraw > 50) {
        lastDraw = gridWidth;
        const label = UI.UIUtils.createSVGChild(this.#grid, 'text', 'animation-timeline-grid-label');
        label.textContent = i18n.TimeUtilities.millisToString(time);
        label.setAttribute('x', (gridWidth + 10).toString());
        label.setAttribute('y', '16');
      }
    }
  }

  scheduleRedraw(): void {
    this.#renderQueue = [];
    for (const ui of this.#uiAnimations) {
      this.#renderQueue.push(ui);
    }
    if (this.#redrawing) {
      return;
    }
    this.#redrawing = true;
    this.renderGrid();
    this.#animationsContainer.window().requestAnimationFrame(this.render.bind(this));
  }

  private render(timestamp?: number): void {
    while (this.#renderQueue.length && (!timestamp || window.performance.now() - timestamp < 50)) {
      const animationUI = this.#renderQueue.shift();
      if (animationUI) {
        animationUI.redraw();
      }
    }
    if (this.#renderQueue.length) {
      this.#animationsContainer.window().requestAnimationFrame(this.render.bind(this));
    } else {
      this.#redrawing = undefined;
    }
  }

  override onResize(): void {
    this.#cachedTimelineWidth = Math.max(0, this.#animationsContainer.offsetWidth - this.#timelineControlsWidth) || 0;
    this.scheduleRedraw();
    if (this.#scrubberPlayer) {
      this.syncScrubber();
    }
    this.#gridOffsetLeft = undefined;
  }

  width(): number {
    return this.#cachedTimelineWidth || 0;
  }

  private syncScrubber(): void {
    if (!this.#selectedGroup) {
      return;
    }
    void this.#selectedGroup.currentTimePromise()
        .then(this.animateTime.bind(this))
        .then(this.updateControlButton.bind(this));
  }

  private animateTime(currentTime: number): void {
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.cancel();
    }

    this.#scrubberPlayer = this.#timelineScrubber.animate(
        [{transform: 'translateX(0px)'}, {transform: 'translateX(' + this.width() + 'px)'}],
        {duration: this.duration(), fill: 'forwards'});
    this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    this.#scrubberPlayer.onfinish = this.updateControlButton.bind(this);
    this.#scrubberPlayer.currentTime = currentTime;
    this.element.window().requestAnimationFrame(this.updateScrubber.bind(this));
  }

  pixelMsRatio(): number {
    return this.width() / this.duration() || 0;
  }

  private updateScrubber(_timestamp: number): void {
    if (!this.#scrubberPlayer) {
      return;
    }
    this.#currentTime.textContent = i18n.TimeUtilities.millisToString(this.#scrubberCurrentTime());
    if (this.#scrubberPlayer.playState.toString() === 'pending' || this.#scrubberPlayer.playState === 'running') {
      this.element.window().requestAnimationFrame(this.updateScrubber.bind(this));
    } else if (this.#scrubberPlayer.playState === 'finished') {
      this.#currentTime.textContent = '';
    }
  }

  private repositionScrubber(event: Event): boolean {
    if (!this.#selectedGroup) {
      return false;
    }

    // Seek to current mouse position.
    if (!this.#gridOffsetLeft) {
      this.#gridOffsetLeft = this.#grid.getBoundingClientRect().left + 10;
    }

    const currentTime = this.#scrubberPlayer?.currentTime;
    this.#animationGroupPausedBeforeScrub =
        this.#selectedGroup.paused() || typeof currentTime === 'number' && currentTime >= this.duration();

    const {x} = (event as any);  // eslint-disable-line @typescript-eslint/no-explicit-any
    const seekTime = Math.max(0, x - this.#gridOffsetLeft) / this.pixelMsRatio();
    this.#selectedGroup.seekTo(seekTime);
    this.togglePause(true);
    this.animateTime(seekTime);

    // Interface with scrubber drag.
    this.#originalScrubberTime = seekTime;
    this.#originalMousePosition = x;
    return true;
  }

  private scrubberDragMove(event: Event): void {
    const {x} = (event as any);  // eslint-disable-line @typescript-eslint/no-explicit-any
    const delta = x - (this.#originalMousePosition || 0);
    const currentTime =
        Math.max(0, Math.min((this.#originalScrubberTime || 0) + delta / this.pixelMsRatio(), this.duration()));
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.currentTime = currentTime;
    }
    this.#currentTime.textContent = i18n.TimeUtilities.millisToString(Math.round(currentTime));

    if (this.#selectedGroup) {
      this.#selectedGroup.seekTo(currentTime);
    }
  }

  #scrubberCurrentTime(): number {
    return typeof this.#scrubberPlayer?.currentTime === 'number' ? this.#scrubberPlayer.currentTime : 0;
  }

  private scrubberDragEnd(_event: Event): void {
    if (this.#scrubberPlayer) {
      const currentTime = Math.max(0, this.#scrubberCurrentTime());
      this.#scrubberPlayer.play();
      this.#scrubberPlayer.currentTime = currentTime;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationGroupScrubbed);
    this.#currentTime.window().requestAnimationFrame(this.updateScrubber.bind(this));

    if (!this.#animationGroupPausedBeforeScrub) {
      this.togglePause(false);
    }
  }
}

export const GlobalPlaybackRates = [1, 0.25, 0.1];

const enum ControlState {
  Play = 'play-outline',
  Replay = 'replay-outline',
  Pause = 'pause-outline',
}

export class NodeUI {
  element: HTMLDivElement;
  readonly #description: HTMLElement;
  readonly #timelineElement: HTMLElement;
  #node?: SDK.DOMModel.DOMNode|null;

  constructor(_animationEffect: AnimationEffect) {
    this.element = document.createElement('div');
    this.element.classList.add('animation-node-row');
    this.#description = this.element.createChild('div', 'animation-node-description');
    this.#timelineElement = this.element.createChild('div', 'animation-node-timeline');
    UI.ARIAUtils.markAsApplication(this.#timelineElement);
  }

  nodeResolved(node: SDK.DOMModel.DOMNode|null): void {
    if (!node) {
      UI.UIUtils.createTextChild(this.#description, '<node>');
      return;
    }
    this.#node = node;
    this.nodeChanged();
    void Common.Linkifier.Linkifier.linkify(node).then(link => {
      link.addEventListener('click', () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimatedNodeDescriptionClicked);
      });

      this.#description.appendChild(link);
    });
    if (!node.ownerDocument) {
      this.nodeRemoved();
    }
  }

  createNewRow(): Element {
    return this.#timelineElement.createChild('div', 'animation-timeline-row');
  }

  nodeRemoved(): void {
    this.element.classList.add('animation-node-removed');
    this.#node = null;
  }

  nodeChanged(): void {
    let animationNodeSelected = false;
    if (this.#node) {
      animationNodeSelected = (this.#node === UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode));
    }

    this.element.classList.toggle('animation-node-selected', animationNodeSelected);
  }
}

export class StepTimingFunction {
  steps: number;
  stepAtPosition: string;
  constructor(steps: number, stepAtPosition: string) {
    this.steps = steps;
    this.stepAtPosition = stepAtPosition;
  }

  static parse(text: string): StepTimingFunction|null {
    let match = text.match(/^steps\((\d+), (start|middle)\)$/);
    if (match) {
      return new StepTimingFunction(parseInt(match[1], 10), match[2]);
    }
    match = text.match(/^steps\((\d+)\)$/);
    if (match) {
      return new StepTimingFunction(parseInt(match[1], 10), 'end');
    }
    return null;
  }
}
