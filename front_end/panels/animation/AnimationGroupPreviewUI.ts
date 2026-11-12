// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AnimationUI} from './AnimationUI.js';

const {render, html, svg, Directives: {classMap, ref}} = Lit;

const VIEW_BOX_WIDTH = 112;
const VIEW_BOX_HEIGHT = 32;
const MAX_ANIMATION_LINES_TO_SHOW = 10;
const MIN_ANIMATION_GROUP_DURATION = 750;

interface ViewInput {
  isScrollDrivenAnimationGroup: boolean;
  isPreviewAnimationDisabled: boolean;
  isSelected: boolean;
  isPaused: boolean;
  isFocusable: boolean;
  label: string;
  animationGroupDuration: number;
  animations: SDK.AnimationModel.AnimationImpl[];
  onPreviewAnimationEnd: () => void;
  onRemoveAnimationGroup: () => void;
  onSelectAnimationGroup: () => void;
  onFocusNextGroup: () => void;
  onFocusPreviousGroup: () => void;
}

interface ViewOutput {
  replay?: () => void;
}

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, output, target) => {
  const classes = classMap({
    'animation-buffer-preview': true,
    selected: input.isSelected,
    paused: input.isPaused,
    'no-animation': input.isPreviewAnimationDisabled,
  });

  const handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        input.onRemoveAnimationGroup();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        input.onFocusPreviousGroup();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        input.onFocusNextGroup();
    }
  };

  const renderAnimationLines = (): Lit.LitTemplate => {
    const timeToPixelRatio = VIEW_BOX_WIDTH / Math.max(input.animationGroupDuration, MIN_ANIMATION_GROUP_DURATION);
    const viewBox = `0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`;
    const lines = input.animations.map((animation, index) => {
      const xStartPoint = animation.delayOrStartTime();
      const xEndPoint = xStartPoint + animation.iterationDuration();
      const yPoint = Math.floor(VIEW_BOX_HEIGHT / Math.max(6, input.animations.length) * index + 1);
      const colorForAnimation = AnimationUI.colorForAnimation(animation);
      // clang-format off
      return svg`<line
        x1="${xStartPoint * timeToPixelRatio}"
        x2="${xEndPoint * timeToPixelRatio}"
        y1="${yPoint}"
        y2="${yPoint}"
        style="stroke: ${colorForAnimation}"></line>`;
      // clang-format on
    });

    // clang-format off
    return html`
      <svg
        width="100%"
        height="100%"
        viewBox=${viewBox}
        preserveAspectRatio="none"
        shape-rendering="crispEdges">
        ${lines}
      </svg>
    `;
    // clang-format on
  };

  // clang-format off
  render(html`
    <div class="animation-group-preview-ui">
      <button
        autofocus
        jslog=${VisualLogging.item(`animations.buffer-preview${input.isScrollDrivenAnimationGroup ? '-sda' : ''}`).track({click: true, resize: true})}
        class=${classes}
        role="option"
        aria-label=${input.label}
        tabindex=${input.isFocusable ? 0 : -1}
        @keydown=${handleKeyDown}
        @click=${input.onSelectAnimationGroup}
        @animationend=${input.onPreviewAnimationEnd}>
          <div class="animation-paused fill"></div>
          <devtools-icon name=${input.isScrollDrivenAnimationGroup ? 'mouse' : 'watch'} class="preview-icon"></devtools-icon>
          <div class="animation-buffer-preview-animation" ${ref(el => {
            if (el instanceof HTMLElement) {
              output.replay = () => {
                el.animate(
                  [
                    {offset: 0, width: '0%', opacity: 1},
                    {offset: 0.9, width: '100%', opacity: 1},
                    {offset: 1, width: '100%', opacity: 0},
                  ],
                  {duration: 200, easing: 'cubic-bezier(0, 0, 0.2, 1)'},
                );
              };
            }
          })}></div>
          ${renderAnimationLines()}
        </button>
        <button
          class="animation-remove-button"
          jslog=${VisualLogging.action('animations.remove-preview').track({click: true})}
          @click=${input.onRemoveAnimationGroup}>
            <devtools-icon name="cross"></devtools-icon>
        </button>
    </div>
  `, target);
  // clang-format on
};

export class AnimationGroupPreviewUI extends UI.Widget.Widget {
  label = '';
  onRemoveAnimationGroup: () => void = () => {};
  onSelectAnimationGroup: () => void = () => {};
  onFocusNextGroup: () => void = () => {};
  onFocusPreviousGroup: () => void = () => {};
  #view: View;
  #viewOutput: ViewOutput = {};
  #animationGroup?: SDK.AnimationModel.AnimationGroup;
  #previewAnimationDisabled = false;
  #selected = false;
  #paused = false;
  #focusable = false;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set animationGroup(animationGroup: SDK.AnimationModel.AnimationGroup) {
    if (this.#animationGroup === animationGroup) {
      return;
    }

    this.#animationGroup = animationGroup;
    this.requestUpdate();
  }

  set selected(selected: boolean) {
    if (this.#selected === selected) {
      return;
    }

    this.#selected = selected;
    this.requestUpdate();
  }

  set paused(paused: boolean) {
    if (this.#paused === paused) {
      return;
    }

    this.#paused = paused;
    this.requestUpdate();
  }

  set focusable(focusable: boolean) {
    if (this.#focusable === focusable) {
      return;
    }

    this.#focusable = focusable;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const animationGroup = this.#animationGroup;
    if (!animationGroup) {
      return;
    }
    this.#view({
      isScrollDrivenAnimationGroup: animationGroup.isScrollDriven(),
      isPreviewAnimationDisabled: this.#previewAnimationDisabled,
      isSelected: this.#selected,
      isPaused: this.#paused,
      isFocusable: this.#focusable,
      label: this.label,
      animationGroupDuration: animationGroup.groupDuration(),
      animations: animationGroup.animations().slice(0, MAX_ANIMATION_LINES_TO_SHOW),
      onPreviewAnimationEnd: () => {
        this.#previewAnimationDisabled = true;
        this.requestUpdate();
      },
      onRemoveAnimationGroup: () => {
        this.onRemoveAnimationGroup();
      },
      onSelectAnimationGroup: () => {
        this.onSelectAnimationGroup();
      },
      onFocusNextGroup: () => {
        this.onFocusNextGroup();
      },
      onFocusPreviousGroup: () => {
        this.onFocusPreviousGroup();
      },
    },
               this.#viewOutput, this.contentElement);
  }

  replay(): void {
    // The animation group may have been updated, so re-render the preview lines as well.
    this.requestUpdate();
    this.#viewOutput.replay?.();
  }
}
