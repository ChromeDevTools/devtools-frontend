// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

/* The following disable is needed until all the partial view functions are part of one view function */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AnimationGroupPreviewUI} from './AnimationGroupPreviewUI.js';
import animationTimelineStyles from './animationTimeline.css.js';
import {AnimationUI} from './AnimationUI.js';

const UIStrings = {
  /**
   * @description Timeline hint text content in Animation Timeline of the Animation Inspector if no effect
   * is shown.
   * Animation effects are the visual effects of an animation on the page.
   */
  noEffectSelected: 'No animation effect selected',
  /**
   * @description Timeline hint text content in Animation Timeline of the Animation Inspector that instructs
   * users to select an effect.
   * Animation effects are the visual effects of an animation on the page.
   */
  selectAnEffectAboveToInspectAnd: 'Select an effect above to inspect and modify',
  /**
   * @description Text to clear everything
   */
  clearAll: 'Clear all',
  /**
   * @description Tooltip text that appears when hovering over largeicon pause button in Animation Timeline of the Animation Inspector
   */
  pauseAll: 'Pause all',
  /**
   * @description Title of the playback rate button listbox
   */
  playbackRates: 'Playback rates',
  /**
   * @description Text in Animation Timeline of the Animation Inspector
   * @example {50} PH1
   */
  playbackRatePlaceholder: '{PH1}%',
  /**
   * @description Text of an item that pause the running task
   */
  pause: 'Pause',
  /**
   * @description Button title in Animation Timeline of the Animation Inspector
   * @example {50%} PH1
   */
  setSpeedToS: 'Set speed to {PH1}',
  /**
   * @description Title of Animation Previews listbox
   */
  animationPreviews: 'Animation previews',
  /**
   * @description Empty buffer hint text content in Animation Timeline of the Animation Inspector.
   */
  waitingForAnimations: 'Currently waiting for animations',
  /**
   * @description Empty buffer hint text content in Animation Timeline of the Animation Inspector that explains the panel.
   */
  animationDescription: 'On this page you can inspect and modify animations.',
  /**
   * @description Tooltip text that appears when hovering over largeicon replay animation button in Animation Timeline of the Animation Inspector
   */
  replayTimeline: 'Replay timeline',
  /**
   * @description Text in Animation Timeline of the Animation Inspector
   */
  resumeAll: 'Resume all',
  /**
   * @description Title of control button in animation timeline of the animation inspector
   */
  playTimeline: 'Play timeline',
  /**
   * @description Title of control button in animation timeline of the animation inspector
   */
  pauseTimeline: 'Pause timeline',
  /**
   * @description Title of a specific Animation Preview
   * @example {1} PH1
   */
  animationPreviewS: 'Animation Preview {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/animation/AnimationTimeline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html, Directives: {classMap}} = Lit;
const nodeUIsByNode = new WeakMap<SDK.DOMModel.DOMNode, NodeUI>();

const MIN_TIMELINE_CONTROLS_WIDTH = 120;
const DEFAULT_TIMELINE_CONTROLS_WIDTH = 150;
const MAX_TIMELINE_CONTROLS_WIDTH = 720;

const ANIMATION_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/css/animations' as Platform.DevToolsPath.UrlString;

interface ToolbarViewInput {
  selectedPlaybackRate: number;
  playbackRateButtonsDisabled: boolean;
  allPaused: boolean;
  onClearClick: () => void;
  onTogglePauseAllClick: () => void;
  onSetPlaybackRateClick: (playbackRate: number) => void;
}

type ToolbarView = (input: ToolbarViewInput, output: undefined, target: HTMLElement) => void;
// clang-format off
const DEFAULT_TOOLBAR_VIEW: ToolbarView = (input: ToolbarViewInput, output: undefined, target: HTMLElement): void => {
  const renderPlaybackRateControl = (): Lit.LitTemplate => {
    const focusNextPlaybackRateButton = (eventTarget: EventTarget|null, focusPrevious?: boolean): void => {
      const currentPlaybackRateButton = (eventTarget as HTMLElement);
      const currentPlaybackRate = Number(currentPlaybackRateButton.dataset.playbackRate);
      if (Number.isNaN(currentPlaybackRate)) {
        return;
      }

      const currentIndex = GlobalPlaybackRates.indexOf(currentPlaybackRate);
      const nextIndex = focusPrevious ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= GlobalPlaybackRates.length) {
        return;
      }
      const nextPlaybackRate = GlobalPlaybackRates[nextIndex];
      const nextPlaybackRateButton = target.querySelector(`[data-playback-rate="${nextPlaybackRate}"]`) as HTMLButtonElement | undefined;
      if (!nextPlaybackRateButton) {
        return;
      }

      currentPlaybackRateButton.tabIndex = -1;
      nextPlaybackRateButton.tabIndex = 0;
      nextPlaybackRateButton.focus();
    };

    const handleKeyDown = (event: Event): void => {
      const keyboardEvent = (event as KeyboardEvent);
      switch (keyboardEvent.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          focusNextPlaybackRateButton(event.target, /* focusPrevious */ true);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          focusNextPlaybackRateButton(event.target);
          break;
      }
    };

    return html`
      <div class="animation-playback-rate-control" role="listbox" aria-label=${i18nString(UIStrings.playbackRates)} @keydown=${handleKeyDown}>
        ${GlobalPlaybackRates.map(playbackRate => {
          const isSelected = input.selectedPlaybackRate === playbackRate;
          const textContent = playbackRate ? i18nString(UIStrings.playbackRatePlaceholder, {PH1: playbackRate * 100}) : i18nString(UIStrings.pause);
          return html`
            <button class="animation-playback-rate-button" jslog=${VisualLogging.action().context(`animations.playback-rate-${playbackRate * 100}`).track({
              click: true,
              keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight',
            })}
            data-playback-rate=${playbackRate}
            .disabled=${input.playbackRateButtonsDisabled}
            class=${classMap({
              'animation-playback-rate-button': true,
              selected: isSelected,
            })}
            tabindex=${isSelected ? 0 : -1}
            role="option"
            title=${i18nString(UIStrings.setSpeedToS, {PH1: textContent})}
            @click=${() => input.onSetPlaybackRateClick(playbackRate)}>
            ${textContent}
          </button>
          `;
        })}
      </div>
    `;
  };
  render(html`
    <div class="animation-timeline-toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar class="animation-timeline-toolbar" role="presentation">
        <devtools-button
          title=${i18nString(UIStrings.clearAll)}
          aria-label=${i18nString(UIStrings.clearAll)}
          .iconName=${'clear'}
          .jslogContext=${'animations.clear'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onClearClick}>
        </devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString(UIStrings.pauseAll)}
          aria-label=${i18nString(UIStrings.pauseAll)}
          jslog=${
            /* Do not use `.jslogContext` here because we want this to be reported as Toggle */
            VisualLogging.toggle().track({click: true}).context('animations.pause-resume-all')
          }
          .iconName=${'pause'}
          .toggledIconName=${'resume'}
          .variant=${Buttons.Button.Variant.ICON_TOGGLE}
          .toggleType=${Buttons.Button.ToggleType.PRIMARY}
          .toggled=${input.allPaused}
          @click=${input.onTogglePauseAllClick}>
        </devtools-button>
      </devtools-toolbar>
      ${renderPlaybackRateControl()}
    </div>
  `, target, {host: target});
};
// clang-format on

let animationTimelineInstance: AnimationTimeline;
export class AnimationTimeline extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.AnimationModel.AnimationModel> {
  #gridWrapper: HTMLElement;
  #grid: Element;
  #playbackRate: number;
  #allPaused: boolean;
  #animationsContainer: HTMLElement;
  #previewContainer!: HTMLElement;
  #timelineScrubber!: HTMLElement;
  #currentTime!: HTMLElement;
  #clearButton!: UI.Toolbar.ToolbarButton;
  #selectedGroup!: SDK.AnimationModel.AnimationGroup|null;
  #renderQueue!: AnimationUI[];
  #defaultDuration: number;
  #durationInternal: number;
  #timelineControlsWidth: number;
  readonly #nodesMap: Map<number, NodeUI>;
  #uiAnimations: AnimationUI[];
  #groupBuffer: SDK.AnimationModel.AnimationGroup[];
  readonly #previewMap: Map<SDK.AnimationModel.AnimationGroup, AnimationGroupPreviewUI>;
  readonly #animationsMap: Map<string, SDK.AnimationModel.AnimationImpl>;
  #timelineScrubberLine?: HTMLElement;
  #pauseButton?: UI.Toolbar.ToolbarToggle;
  #controlButton?: UI.Toolbar.ToolbarButton;
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
  #scrollListenerId?: number|null;
  #collectedGroups: SDK.AnimationModel.AnimationGroup[];
  #createPreviewForCollectedGroupsThrottler = new Common.Throttler.Throttler(10);
  #animationGroupUpdatedThrottler = new Common.Throttler.Throttler(10);

  /** Container & state for rendering `toolbarView` */
  #toolbarViewContainer: HTMLElement;
  #toolbarView: ToolbarView;
  #playbackRateButtonsDisabled = false;

  constructor(toolbarView: ToolbarView = DEFAULT_TOOLBAR_VIEW) {
    super({
      jslog: `${VisualLogging.panel('animations').track({resize: true})}`,
      useShadowDom: true,
    });
    this.registerRequiredCSS(animationTimelineStyles);

    this.#toolbarView = toolbarView;
    this.element.classList.add('animations-timeline');

    this.#timelineControlsResizer = this.contentElement.createChild('div', 'timeline-controls-resizer');

    this.#gridWrapper = this.contentElement.createChild('div', 'grid-overflow-wrapper');
    this.#grid = UI.UIUtils.createSVGChild(this.#gridWrapper, 'svg', 'animation-timeline-grid');

    this.#playbackRate = 1;
    this.#allPaused = false;
    this.#animationGroupPausedBeforeScrub = false;
    this.#toolbarViewContainer = this.contentElement.createChild('div');
    this.createHeader();
    this.#animationsContainer = this.contentElement.createChild('div', 'animation-timeline-rows');
    this.#animationsContainer.setAttribute('jslog', `${VisualLogging.section('animations')}`);
    const emptyBufferHint = this.contentElement.createChild('div', 'animation-timeline-buffer-hint');
    const noAnimationsPlaceholder = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.waitingForAnimations), i18nString(UIStrings.animationDescription));
    noAnimationsPlaceholder.link = ANIMATION_EXPLANATION_URL;
    noAnimationsPlaceholder.show(emptyBufferHint);

    const timelineHint = this.contentElement.createChild('div', 'animation-timeline-rows-hint');
    const noEffectSelectedPlaceholder = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noEffectSelected), i18nString(UIStrings.selectAnEffectAboveToInspectAnd));
    noEffectSelectedPlaceholder.show(timelineHint);

    /** @constant */ this.#defaultDuration = 100;
    this.#durationInternal = this.#defaultDuration;
    this.#nodesMap = new Map();
    this.#uiAnimations = [];
    this.#groupBuffer = [];
    this.#collectedGroups = [];
    this.#previewMap = new Map();
    this.#animationsMap = new Map();

    this.#timelineControlsWidth = DEFAULT_TIMELINE_CONTROLS_WIDTH;
    this.element.style.setProperty('--timeline-controls-width', `${this.#timelineControlsWidth}px`);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.NodeRemoved, ev => this.markNodeAsRemoved(ev.data.node), this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.AnimationModel.AnimationModel, this, {scoped: true});
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.nodeChanged, this);

    this.#setupTimelineControlsResizer();
    this.performToolbarViewUpdate();
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

  get previewMap(): Map<SDK.AnimationModel.AnimationGroup, AnimationGroupPreviewUI> {
    return this.#previewMap;
  }

  get uiAnimations(): AnimationUI[] {
    return this.#uiAnimations;
  }

  get groupBuffer(): SDK.AnimationModel.AnimationGroup[] {
    return this.#groupBuffer;
  }

  override wasShown(): void {
    super.wasShown();
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.AnimationModel.AnimationModel, {scoped: true})) {
      this.#addExistingAnimationGroups(animationModel);
      this.addEventListeners(animationModel);
    }
  }

  override willHide(): void {
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.AnimationModel.AnimationModel, {scoped: true})) {
      this.removeEventListeners(animationModel);
    }
  }

  #addExistingAnimationGroups(animationModel: SDK.AnimationModel.AnimationModel): void {
    for (const animationGroup of animationModel.animationGroups.values()) {
      if (this.#previewMap.has(animationGroup)) {
        continue;
      }

      void this.addAnimationGroup(animationGroup);
    }
  }

  #showPanelInDrawer(): void {
    const viewManager = UI.ViewManager.ViewManager.instance();
    viewManager.moveView('animations', 'drawer-view', {
      shouldSelectTab: true,
      overrideSaving: true,
    });
  }

  async revealAnimationGroup(animationGroup: SDK.AnimationModel.AnimationGroup): Promise<void> {
    if (!this.#previewMap.has(animationGroup)) {
      await this.addAnimationGroup(animationGroup);
    }

    this.#showPanelInDrawer();
    return await this.selectAnimationGroup(animationGroup);
  }

  modelAdded(animationModel: SDK.AnimationModel.AnimationModel): void {
    if (this.isShowing()) {
      this.addEventListeners(animationModel);
    }
  }

  modelRemoved(animationModel: SDK.AnimationModel.AnimationModel): void {
    this.removeEventListeners(animationModel);
  }

  private addEventListeners(animationModel: SDK.AnimationModel.AnimationModel): void {
    animationModel.addEventListener(SDK.AnimationModel.Events.AnimationGroupStarted, this.animationGroupStarted, this);
    animationModel.addEventListener(SDK.AnimationModel.Events.AnimationGroupUpdated, this.animationGroupUpdated, this);
    animationModel.addEventListener(SDK.AnimationModel.Events.ModelReset, this.reset, this);
  }

  private removeEventListeners(animationModel: SDK.AnimationModel.AnimationModel): void {
    animationModel.removeEventListener(
        SDK.AnimationModel.Events.AnimationGroupStarted, this.animationGroupStarted, this);
    animationModel.removeEventListener(
        SDK.AnimationModel.Events.AnimationGroupUpdated, this.animationGroupUpdated, this);
    animationModel.removeEventListener(SDK.AnimationModel.Events.ModelReset, this.reset, this);
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

  private performToolbarViewUpdate(): void {
    this.#toolbarView(
        {
          selectedPlaybackRate: this.#playbackRate,
          playbackRateButtonsDisabled: this.#playbackRateButtonsDisabled,
          allPaused: this.#allPaused,
          onClearClick: () => {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationGroupsCleared);
            this.reset();
          },
          onTogglePauseAllClick: () => {
            this.#allPaused = !this.#allPaused;
            Host.userMetrics.actionTaken(
                this.#allPaused ? Host.UserMetrics.Action.AnimationsPaused : Host.UserMetrics.Action.AnimationsResumed,
            );
            this.setPlaybackRate(this.#playbackRate);
            if (this.#pauseButton) {
              this.#pauseButton.setTitle(
                  this.#allPaused ? i18nString(UIStrings.resumeAll) : i18nString(UIStrings.pauseAll));
            }
          },
          onSetPlaybackRateClick: (playbackRate: number) => {
            this.setPlaybackRate(playbackRate);
          }
        },
        undefined, this.#toolbarViewContainer);
  }

  private createHeader(): HTMLElement {
    this.#previewContainer = this.contentElement.createChild('div', 'animation-timeline-buffer');
    this.#previewContainer.setAttribute('jslog', `${VisualLogging.section('film-strip')}`);
    UI.ARIAUtils.markAsListBox(this.#previewContainer);
    UI.ARIAUtils.setLabel(this.#previewContainer, i18nString(UIStrings.animationPreviews));
    const container = this.contentElement.createChild('div', 'animation-timeline-header');
    const controls = container.createChild('div', 'animation-controls');
    this.#currentTime = controls.createChild('div', 'animation-timeline-current-time monospace');

    const toolbar = controls.createChild('devtools-toolbar', 'animation-controls-toolbar');
    this.#controlButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.replayTimeline), 'replay', undefined, 'animations.play-replay-pause-animation-group');
    this.#controlButton.element.classList.add('toolbar-state-on');
    this.#controlState = ControlState.REPLAY;
    this.#controlButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.controlButtonToggle.bind(this));
    toolbar.appendToolbarItem(this.#controlButton);

    this.#gridHeader = container.createChild('div', 'animation-grid-header');
    this.#gridHeader.setAttribute(
        'jslog', `${VisualLogging.timeline('animations.grid-header').track({drag: true, click: true})}`);
    UI.UIUtils.installDragHandle(
        this.#gridHeader, this.scrubberDragStart.bind(this), this.scrubberDragMove.bind(this),
        this.scrubberDragEnd.bind(this), null);
    this.#gridWrapper.appendChild(this.createScrubber());

    this.clearCurrentTimeText();

    return container;
  }

  private setPlaybackRate(playbackRate: number): void {
    if (playbackRate !== this.#playbackRate) {
      Host.userMetrics.animationPlaybackRateChanged(
          playbackRate === 0.1      ? Host.UserMetrics.AnimationsPlaybackRate.PERCENT_10 :
              playbackRate === 0.25 ? Host.UserMetrics.AnimationsPlaybackRate.PERCENT_25 :
              playbackRate === 1    ? Host.UserMetrics.AnimationsPlaybackRate.PERCENT_100 :
                                      Host.UserMetrics.AnimationsPlaybackRate.OTHER);
    }

    this.#playbackRate = playbackRate;
    for (const animationModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.AnimationModel.AnimationModel, {scoped: true})) {
      animationModel.setPlaybackRate(this.#allPaused ? 0 : this.#playbackRate);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationsPlaybackRateChanged);
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    }

    this.performToolbarViewUpdate();
  }

  private controlButtonToggle(): void {
    if (this.#controlState === ControlState.PLAY) {
      this.togglePause(false);
    } else if (this.#controlState === ControlState.REPLAY) {
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

    this.#controlButton.setEnabled(
        Boolean(this.#selectedGroup) && this.hasAnimationGroupActiveNodes() && !this.#selectedGroup?.isScrollDriven());
    if (this.#selectedGroup && this.#selectedGroup.paused()) {
      this.#controlState = ControlState.PLAY;
      this.#controlButton.element.classList.toggle('toolbar-state-on', true);
      this.#controlButton.setTitle(i18nString(UIStrings.playTimeline));
      this.#controlButton.setGlyph('play');
    } else if (
        !this.#scrubberPlayer || !this.#scrubberPlayer.currentTime ||
        typeof this.#scrubberPlayer.currentTime !== 'number' || this.#scrubberPlayer.currentTime >= this.duration()) {
      this.#controlState = ControlState.REPLAY;
      this.#controlButton.element.classList.toggle('toolbar-state-on', true);
      this.#controlButton.setTitle(i18nString(UIStrings.replayTimeline));
      this.#controlButton.setGlyph('replay');
    } else {
      this.#controlState = ControlState.PAUSE;
      this.#controlButton.element.classList.toggle('toolbar-state-on', false);
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
        preview.setPaused(pause);
      }
    }
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    }
    this.updateControlButton();
  }

  private replay(): void {
    if (!this.#selectedGroup || !this.hasAnimationGroupActiveNodes() || this.#selectedGroup.isScrollDriven()) {
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
    if (this.#selectedGroup && this.#scrollListenerId) {
      void this.#selectedGroup.scrollNode().then((node: SDK.AnimationModel.AnimationDOMNode|null) => {
        void node?.removeScrollEventListener(this.#scrollListenerId as number);
        this.#scrollListenerId = undefined;
      });
    }

    this.#uiAnimations = [];
    this.#nodesMap.clear();
    this.#animationsMap.clear();
    this.#animationsContainer.removeChildren();
    this.#durationInternal = this.#defaultDuration;
    this.#timelineScrubber.classList.add('hidden');
    this.#gridHeader.classList.remove('scrubber-enabled');
    this.#selectedGroup = null;
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.cancel();
    }
    this.#scrubberPlayer = undefined;
    this.clearCurrentTimeText();
    this.updateControlButton();
  }

  private reset(): void {
    this.clearTimeline();
    this.setPlaybackRate(this.#playbackRate);

    for (const group of this.#groupBuffer) {
      group.release();
    }
    this.#groupBuffer = [];
    this.clearPreviews();
    this.renderGrid();
  }

  private animationGroupStarted({data}: Common.EventTarget.EventTargetEvent<SDK.AnimationModel.AnimationGroup>): void {
    void this.addAnimationGroup(data);
  }

  scheduledRedrawAfterAnimationGroupUpdatedForTest(): void {
  }

  private animationGroupUpdated({
    data: group,
  }: Common.EventTarget.EventTargetEvent<SDK.AnimationModel.AnimationGroup>): void {
    void this.#animationGroupUpdatedThrottler.schedule(async () => {
      const preview = this.#previewMap.get(group);
      if (preview) {
        preview.replay();
      }

      if (this.#selectedGroup !== group) {
        return;
      }

      if (group.isScrollDriven()) {
        const animationNode = await group.scrollNode();
        if (animationNode) {
          const scrollRange = group.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical ?
              await animationNode.verticalScrollRange() :
              await animationNode.horizontalScrollRange();
          const scrollOffset = group.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical ?
              await animationNode.scrollTop() :
              await animationNode.scrollLeft();
          if (scrollRange !== null) {
            this.setDuration(scrollRange);
          }

          if (scrollOffset !== null) {
            this.setCurrentTimeText(scrollOffset);
            this.setTimelineScrubberPosition(scrollOffset);
          }
        }
      } else {
        this.setDuration(group.finiteDuration());
      }

      this.updateControlButton();
      this.scheduleRedraw();

      this.scheduledRedrawAfterAnimationGroupUpdatedForTest();
    });
  }

  private clearPreviews(): void {
    this.#previewMap.clear();
    this.#previewContainer.removeChildren();
  }

  private createPreview(group: SDK.AnimationModel.AnimationGroup): void {
    const preview = new AnimationGroupPreviewUI({
      animationGroup: group,
      label: i18nString(UIStrings.animationPreviewS, {PH1: this.#groupBuffer.length + 1}),
      onRemoveAnimationGroup: () => {
        this.removeAnimationGroup(group);
      },
      onSelectAnimationGroup: () => {
        void this.selectAnimationGroup(group);
      },
      onFocusNextGroup: () => {
        this.focusNextGroup(group);
      },
      onFocusPreviousGroup: () => {
        this.focusNextGroup(group, /* focusPrevious */ true);
      }
    });

    const previewUiContainer = document.createElement('div');
    previewUiContainer.classList.add('preview-ui-container');
    preview.markAsRoot();
    preview.show(previewUiContainer);

    this.#groupBuffer.push(group);
    this.#previewMap.set(group, preview);
    this.#previewContainer.appendChild(previewUiContainer);

    // If this is the first preview attached, we want it to be focusable directly.
    // Otherwise, we don't want the previews to be focusable via Tabbing and manage
    // their focus via arrow keys.
    if (this.#previewMap.size === 1) {
      const preview = this.#previewMap.get(this.#groupBuffer[0]);
      if (preview) {
        preview.setFocusable(true);
      }
    }
  }

  previewsCreatedForTest(): void {
  }

  scrubberOnFinishForTest(): void {
  }

  private createPreviewForCollectedGroups(): void {
    this.#collectedGroups.sort((a, b) => {
      // Scroll driven animations are rendered first.
      if (a.isScrollDriven() && !b.isScrollDriven()) {
        return -1;
      }
      if (!a.isScrollDriven() && b.isScrollDriven()) {
        return 1;
      }

      // Then compare the start times for the same type of animations.
      if (a.startTime() !== b.startTime()) {
        return a.startTime() - b.startTime();
      }

      // If the start times are the same, the one with the more animations take precedence.
      return a.animations.length - b.animations.length;
    });

    for (const group of this.#collectedGroups) {
      this.createPreview(group);
    }

    this.#collectedGroups = [];
    this.previewsCreatedForTest();
  }

  private addAnimationGroup(group: SDK.AnimationModel.AnimationGroup): Promise<void> {
    const previewGroup = this.#previewMap.get(group);
    if (previewGroup) {
      if (this.#selectedGroup === group) {
        this.syncScrubber();
      } else {
        previewGroup.replay();
      }
      return Promise.resolve();
    }

    this.#groupBuffer.sort((left, right) => left.startTime() - right.startTime());

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
      discardGroup.detach();
      this.#previewMap.delete(g);
      g.release();
    }

    // Batch creating preview for arrivals happening closely together to ensure
    // stable UI sorting in the preview container.
    this.#collectedGroups.push(group);
    return this.#createPreviewForCollectedGroupsThrottler.schedule(
        () => Promise.resolve(this.createPreviewForCollectedGroups()));
  }

  private focusNextGroup(group: SDK.AnimationModel.AnimationGroup, focusPrevious?: boolean): void {
    const currentGroupIndex = this.#groupBuffer.indexOf(group);
    const nextIndex = focusPrevious ? currentGroupIndex - 1 : currentGroupIndex + 1;
    if (nextIndex < 0 || nextIndex >= this.#groupBuffer.length) {
      return;
    }
    const preview = this.#previewMap.get(this.#groupBuffer[nextIndex]);
    if (preview) {
      preview.setFocusable(true);
      preview.focus();
    }

    const previousPreview = this.#previewMap.get(group);
    if (previousPreview) {
      previousPreview.setFocusable(false);
    }
  }

  private removeAnimationGroup(group: SDK.AnimationModel.AnimationGroup): void {
    const currentGroupIndex = this.#groupBuffer.indexOf(group);

    Platform.ArrayUtilities.removeElement(this.#groupBuffer, group);
    const previewGroup = this.#previewMap.get(group);
    if (previewGroup) {
      previewGroup.detach();
    }
    this.#previewMap.delete(group);
    group.release();
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
      nextGroup.setFocusable(true);
      nextGroup.focus();
    }
  }

  private clearCurrentTimeText(): void {
    this.#currentTime.textContent = '';
  }

  private setCurrentTimeText(time: number): void {
    if (!this.#selectedGroup) {
      return;
    }

    this.#currentTime.textContent =
        this.#selectedGroup?.isScrollDriven() ? `${time.toFixed(0)}px` : i18n.TimeUtilities.millisToString(time);
  }

  private async selectAnimationGroup(group: SDK.AnimationModel.AnimationGroup): Promise<void> {
    if (this.#selectedGroup === group) {
      this.togglePause(false);
      this.replay();
      return;
    }
    this.clearTimeline();
    this.#selectedGroup = group;
    this.#previewMap.forEach((previewUI: AnimationGroupPreviewUI, group: SDK.AnimationModel.AnimationGroup) => {
      previewUI.setSelected(this.#selectedGroup === group);
    });

    if (group.isScrollDriven()) {
      const animationNode = await group.scrollNode();
      if (!animationNode) {
        throw new Error('Scroll container is not found for the scroll driven animation');
      }

      const scrollRange = group.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical ?
          await animationNode.verticalScrollRange() :
          await animationNode.horizontalScrollRange();
      const scrollOffset = group.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical ?
          await animationNode.scrollTop() :
          await animationNode.scrollLeft();
      if (typeof scrollRange !== 'number' || typeof scrollOffset !== 'number') {
        throw new Error('Scroll range or scroll offset is not resolved for the scroll driven animation');
      }

      this.#scrollListenerId = await animationNode.addScrollEventListener(({scrollTop, scrollLeft}) => {
        const offset = group.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical ? scrollTop : scrollLeft;
        this.setCurrentTimeText(offset);
        this.setTimelineScrubberPosition(offset);
      });
      this.setDuration(scrollRange);
      this.setCurrentTimeText(scrollOffset);
      this.setTimelineScrubberPosition(scrollOffset);
      if (this.#pauseButton) {
        this.#pauseButton.setEnabled(false);
      }
      this.#playbackRateButtonsDisabled = true;
      this.performToolbarViewUpdate();
    } else {
      this.setDuration(group.finiteDuration());
      if (this.#pauseButton) {
        this.#pauseButton.setEnabled(true);
      }
      this.#playbackRateButtonsDisabled = false;
      this.performToolbarViewUpdate();
    }

    // Wait for all animations to be added and nodes to be resolved
    // until we schedule a redraw.
    await Promise.all(group.animations().map(anim => this.addAnimation(anim)));
    this.scheduleRedraw();
    this.togglePause(false);
    this.replay();
    if (this.hasAnimationGroupActiveNodes()) {
      this.#timelineScrubber.classList.remove('hidden');
      this.#gridHeader.classList.add('scrubber-enabled');
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationGroupSelected);
    if (this.#selectedGroup.isScrollDriven()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScrollDrivenAnimationGroupSelected);
    }
    this.animationGroupSelectedForTest();
  }

  animationGroupSelectedForTest(): void {
  }

  private async addAnimation(animation: SDK.AnimationModel.AnimationImpl): Promise<void> {
    let nodeUI = this.#nodesMap.get(animation.source().backendNodeId());
    if (!nodeUI) {
      nodeUI = new NodeUI(animation.source());
      this.#animationsContainer.appendChild(nodeUI.element);
      this.#nodesMap.set(animation.source().backendNodeId(), nodeUI);
    }
    const nodeRow = nodeUI.createNewRow();
    const uiAnimation = new AnimationUI(animation, this, nodeRow);
    const node = await animation.source().deferredNode().resolvePromise();
    uiAnimation.setNode(node);
    if (node && nodeUI) {
      nodeUI.nodeResolved(node);
      nodeUIsByNode.set(node, nodeUI);
    }
    this.#uiAnimations.push(uiAnimation);
    this.#animationsMap.set(animation.id(), animation);
  }

  private markNodeAsRemoved(node: SDK.DOMModel.DOMNode): void {
    nodeUIsByNode.get(node)?.nodeRemoved();

    // Mark nodeUIs of pseudo elements of the node as removed for instance, for view transitions.
    for (const pseudoElements of node.pseudoElements().values()) {
      pseudoElements.forEach(pseudoElement => this.markNodeAsRemoved(pseudoElement));
    }

    // Mark nodeUIs of children as node removed.
    node.children()?.forEach(child => {
      this.markNodeAsRemoved(child);
    });

    // If the user already has a selected animation group and
    // some of the nodes are removed, we check whether all the nodes
    // are removed for the currently selected animation. If that's the case
    // we remove the scrubber and update control button to be disabled.
    if (!this.hasAnimationGroupActiveNodes()) {
      this.#gridHeader.classList.remove('scrubber-enabled');
      this.#timelineScrubber.classList.add('hidden');
      this.#scrubberPlayer?.cancel();
      this.#scrubberPlayer = undefined;
      this.clearCurrentTimeText();
      this.updateControlButton();
    }
  }

  private hasAnimationGroupActiveNodes(): boolean {
    for (const nodeUI of this.#nodesMap.values()) {
      if (nodeUI.hasActiveNode()) {
        return true;
      }
    }

    return false;
  }

  private renderGrid(): void {
    const isScrollDriven = this.#selectedGroup?.isScrollDriven();
    // For scroll driven animations, show divider lines for each 10% progres.
    // For time based animations, show divider lines for each 250ms progress.
    const gridSize = isScrollDriven ? this.duration() / 10 : 250;
    this.#grid.removeChildren();
    let lastDraw: number|undefined = undefined;
    for (let time = 0; time < this.duration(); time += gridSize) {
      const line = UI.UIUtils.createSVGChild(this.#grid, 'rect', 'animation-timeline-grid-line');
      line.setAttribute('x', (time * this.pixelTimeRatio() + 10).toString());
      line.setAttribute('y', '23');
      line.setAttribute('height', '100%');
      line.setAttribute('width', '1');
    }
    for (let time = 0; time < this.duration(); time += gridSize) {
      const gridWidth = time * this.pixelTimeRatio();
      if (lastDraw === undefined || gridWidth - lastDraw > 50) {
        lastDraw = gridWidth;
        const label = UI.UIUtils.createSVGChild(this.#grid, 'text', 'animation-timeline-grid-label');
        label.textContent = isScrollDriven ? `${time.toFixed(0)}px` : i18n.TimeUtilities.millisToString(time);
        label.setAttribute('x', (gridWidth + 12).toString());
        label.setAttribute('y', '16');
      }
    }
  }

  scheduleRedraw(): void {
    this.renderGrid();
    this.#renderQueue = [];
    for (const ui of this.#uiAnimations) {
      this.#renderQueue.push(ui);
    }
    if (this.#redrawing) {
      return;
    }
    this.#redrawing = true;
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
    this.#cachedTimelineWidth = Math.max(0, this.contentElement.offsetWidth - this.#timelineControlsWidth) || 0;
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
    if (!this.#selectedGroup || !this.hasAnimationGroupActiveNodes()) {
      return;
    }
    void this.#selectedGroup.currentTimePromise()
        .then(this.animateTime.bind(this))
        .then(this.updateControlButton.bind(this));
  }

  private animateTime(currentTime: number): void {
    // Scroll driven animations are bound to the scroll position of the scroll container
    // thus we don't animate the scrubber based on time for scroll driven animations.
    if (this.#selectedGroup?.isScrollDriven()) {
      return;
    }

    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.cancel();
    }

    this.#scrubberPlayer = this.#timelineScrubber.animate(
        [{transform: 'translateX(0px)'}, {transform: 'translateX(' + this.width() + 'px)'}],
        {duration: this.duration(), fill: 'forwards'});
    this.#scrubberPlayer.playbackRate = this.effectivePlaybackRate();
    this.#scrubberPlayer.onfinish = () => {
      this.updateControlButton();
      this.scrubberOnFinishForTest();
    };
    this.#scrubberPlayer.currentTime = currentTime;
    this.element.window().requestAnimationFrame(this.updateScrubber.bind(this));
  }

  pixelTimeRatio(): number {
    return this.width() / this.duration() || 0;
  }

  private updateScrubber(_timestamp: number): void {
    if (!this.#scrubberPlayer) {
      return;
    }

    this.setCurrentTimeText(this.#scrubberCurrentTime());
    if (this.#scrubberPlayer.playState.toString() === 'pending' || this.#scrubberPlayer.playState === 'running') {
      this.element.window().requestAnimationFrame(this.updateScrubber.bind(this));
    }
  }

  private scrubberDragStart(event: MouseEvent): boolean {
    if (!this.#selectedGroup || !this.hasAnimationGroupActiveNodes()) {
      return false;
    }

    // Seek to current mouse position.
    if (!this.#gridOffsetLeft) {
      this.#gridOffsetLeft = this.#grid.getBoundingClientRect().left + 10;
    }

    const {x} = event;
    const seekTime = Math.max(0, x - this.#gridOffsetLeft) / this.pixelTimeRatio();
    // Interface with scrubber drag.
    this.#originalScrubberTime = seekTime;
    this.#originalMousePosition = x;
    this.setCurrentTimeText(seekTime);

    if (this.#selectedGroup.isScrollDriven()) {
      this.setTimelineScrubberPosition(seekTime);
      void this.updateScrollOffsetOnPage(seekTime);
    } else {
      const currentTime = this.#scrubberPlayer?.currentTime;
      this.#animationGroupPausedBeforeScrub =
          this.#selectedGroup.paused() || typeof currentTime === 'number' && currentTime >= this.duration();

      this.#selectedGroup.seekTo(seekTime);
      this.togglePause(true);
      this.animateTime(seekTime);
    }

    return true;
  }

  private async updateScrollOffsetOnPage(offset: number): Promise<void> {
    const node = await this.#selectedGroup?.scrollNode();
    if (!node) {
      return;
    }

    if (this.#selectedGroup?.scrollOrientation() === Protocol.DOM.ScrollOrientation.Vertical) {
      return await node.setScrollTop(offset);
    }
    return await node.setScrollLeft(offset);
  }

  private setTimelineScrubberPosition(time: number): void {
    this.#timelineScrubber.style.transform = `translateX(${time * this.pixelTimeRatio()}px)`;
  }

  private scrubberDragMove(event: MouseEvent): void {
    const {x} = event;
    const delta = x - (this.#originalMousePosition || 0);
    const currentTime =
        Math.max(0, Math.min((this.#originalScrubberTime || 0) + delta / this.pixelTimeRatio(), this.duration()));
    if (this.#scrubberPlayer) {
      this.#scrubberPlayer.currentTime = currentTime;
    } else {
      this.setTimelineScrubberPosition(currentTime);
      void this.updateScrollOffsetOnPage(currentTime);
    }

    this.setCurrentTimeText(currentTime);
    if (this.#selectedGroup && !this.#selectedGroup.isScrollDriven()) {
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
    if (this.#selectedGroup?.isScrollDriven()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScrollDrivenAnimationGroupScrubbed);
    }
    this.#currentTime.window().requestAnimationFrame(this.updateScrubber.bind(this));

    if (!this.#animationGroupPausedBeforeScrub) {
      this.togglePause(false);
    }
  }
}

export const GlobalPlaybackRates = [1, 0.25, 0.1];

const enum ControlState {
  PLAY = 'play-outline',
  REPLAY = 'replay-outline',
  PAUSE = 'pause-outline',
}

export class NodeUI {
  element: HTMLDivElement;
  readonly #description: HTMLElement;
  readonly #timelineElement: HTMLElement;
  #overlayElement?: HTMLElement;
  #node?: SDK.DOMModel.DOMNode|null;

  constructor(_animationEffect: SDK.AnimationModel.AnimationEffect) {
    this.element = document.createElement('div');
    this.element.classList.add('animation-node-row');
    this.#description = this.element.createChild('div', 'animation-node-description');
    this.#description.setAttribute('jslog', `${VisualLogging.tableCell('description').track({resize: true})}`);
    this.#timelineElement = this.element.createChild('div', 'animation-node-timeline');
    this.#timelineElement.setAttribute('jslog', `${VisualLogging.tableCell('timeline').track({resize: true})}`);
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
    if (!this.#overlayElement) {
      this.#overlayElement = document.createElement('div');
      this.#overlayElement.classList.add('animation-node-removed-overlay');
      this.#description.appendChild(this.#overlayElement);
    }
    this.#node = null;
  }

  hasActiveNode(): boolean {
    return Boolean(this.#node);
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

export class AnimationGroupRevealer implements Common.Revealer.Revealer<SDK.AnimationModel.AnimationGroup> {
  async reveal(animationGroup: SDK.AnimationModel.AnimationGroup): Promise<void> {
    await AnimationTimeline.instance().revealAnimationGroup(animationGroup);
  }
}
