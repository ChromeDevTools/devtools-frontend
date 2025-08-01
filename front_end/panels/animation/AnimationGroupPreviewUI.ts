// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AnimationUI} from './AnimationUI.js';

const {render, html, svg, Directives: {classMap, ref}} = Lit;

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
  focus?: () => void;
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
    const timeToPixelRatio = 100 / Math.max(input.animationGroupDuration, MIN_ANIMATION_GROUP_DURATION);
    const viewBox = `0 0 100 ${VIEW_BOX_HEIGHT}`;
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
        jslog=${VisualLogging.item(`animations.buffer-preview${input.isScrollDrivenAnimationGroup ? '-sda' : ''}`).track({click: true})}
        class=${classes}
        role="option"
        aria-label=${input.label}
        tabindex=${input.isFocusable ? 0 : -1}
        @keydown=${handleKeyDown}
        @click=${input.onSelectAnimationGroup}
        @animationend=${input.onPreviewAnimationEnd}
        ${ref(el => {
          if (el instanceof HTMLElement) {
            output.focus = () => {
              el.focus();
            };
          }
        })}>
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
                  {duration: 200, easing: 'cubic-bezier(0, 0, 0.2, 1)'}
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

interface AnimationGroupPreviewConfig {
  animationGroup: SDK.AnimationModel.AnimationGroup;
  label: string;
  onRemoveAnimationGroup: () => void;
  onSelectAnimationGroup: () => void;
  onFocusNextGroup: () => void;
  onFocusPreviousGroup: () => void;
}

export class AnimationGroupPreviewUI extends UI.Widget.Widget {
  #view: View;
  #viewOutput: ViewOutput = {};
  #config: AnimationGroupPreviewConfig;
  #previewAnimationDisabled = false;
  #selected = false;
  #paused = false;
  #focusable = false;

  constructor(config: AnimationGroupPreviewConfig, view = DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.#config = config;
    this.requestUpdate();
  }

  setSelected(selected: boolean): void {
    if (this.#selected === selected) {
      return;
    }

    this.#selected = selected;
    this.requestUpdate();
  }

  setPaused(paused: boolean): void {
    if (this.#paused === paused) {
      return;
    }

    this.#paused = paused;
    this.requestUpdate();
  }

  setFocusable(focusable: boolean): void {
    if (this.#focusable === focusable) {
      return;
    }

    this.#focusable = focusable;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          isScrollDrivenAnimationGroup: this.#config.animationGroup.isScrollDriven(),
          isPreviewAnimationDisabled: this.#previewAnimationDisabled,
          isSelected: this.#selected,
          isPaused: this.#paused,
          isFocusable: this.#focusable,
          label: this.#config.label,
          animationGroupDuration: this.#config.animationGroup.groupDuration(),
          animations: this.#config.animationGroup.animations().slice(0, MAX_ANIMATION_LINES_TO_SHOW),
          onPreviewAnimationEnd: () => {
            this.#previewAnimationDisabled = true;
            this.requestUpdate();
          },
          onRemoveAnimationGroup: () => {
            this.#config.onRemoveAnimationGroup();
          },
          onSelectAnimationGroup: () => {
            this.#config.onSelectAnimationGroup();
          },
          onFocusNextGroup: () => {
            this.#config.onFocusNextGroup();
          },
          onFocusPreviousGroup: () => {
            this.#config.onFocusPreviousGroup();
          }
        },
        this.#viewOutput, this.contentElement);
  }

  override focus(): void {
    this.#viewOutput.focus?.();
  }

  replay(): void {
    this.#viewOutput.replay?.();
  }
}
