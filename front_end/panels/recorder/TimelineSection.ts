// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import timelineSectionStyles from './timelineSection.css.js';

const {html} = Lit;

export interface TimelineSectionData {
  isFirstSection: boolean;
  isLastSection: boolean;
  isStartOfGroup: boolean;
  isEndOfGroup: boolean;
  isSelected: boolean;
  /**
   * Whether the section right before this one is in the error state. The part
   * of the timeline that connects the two sections is then drawn as an error.
   */
  isAfterError: boolean;
}

export type ViewInput = TimelineSectionData;
export type ViewOutput = unknown;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const classes = {
    'timeline-section': true,
    'is-end-of-group': input.isEndOfGroup,
    'is-start-of-group': input.isStartOfGroup,
    'is-first-section': input.isFirstSection,
    'is-last-section': input.isLastSection,
    'is-selected': input.isSelected,
    'is-after-error': input.isAfterError,
  };

  // clang-format off
  Lit.render(
    html`
    <style>${timelineSectionStyles}</style>
    <div class=${Lit.Directives.classMap(classes)}>
      <div class="timeline">
        <div class="line line-before"></div>
        <div class="line line-after"></div>
        <div class="icon"><slot name="icon"></slot></div>
      </div>
      <div class="content"><slot></slot></div>
    </div>
  `,
    target,
  );
  // clang-format on
};

export class TimelineSection extends UI.Widget.Widget {
  #isEndOfGroup = false;
  #isStartOfGroup = false;
  #isFirstSection = false;
  #isLastSection = false;
  #isSelected = false;
  #isAfterError = false;
  #view: typeof DEFAULT_VIEW;

  constructor(element?: HTMLElement,
              view: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set isEndOfGroup(value: boolean) {
    this.#isEndOfGroup = value;
    this.requestUpdate();
  }

  set isStartOfGroup(value: boolean) {
    this.#isStartOfGroup = value;
    this.requestUpdate();
  }

  set isFirstSection(value: boolean) {
    this.#isFirstSection = value;
    this.requestUpdate();
  }

  set isLastSection(value: boolean) {
    this.#isLastSection = value;
    this.requestUpdate();
  }

  set isSelected(value: boolean) {
    this.#isSelected = value;
    this.requestUpdate();
  }

  set isAfterError(value: boolean) {
    if (this.#isAfterError === value) {
      return;
    }
    this.#isAfterError = value;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          isEndOfGroup: this.#isEndOfGroup,
          isStartOfGroup: this.#isStartOfGroup,
          isFirstSection: this.#isFirstSection,
          isLastSection: this.#isLastSection,
          isSelected: this.#isSelected,
          isAfterError: this.#isAfterError,
        },
        undefined,
        this.contentElement,
    );
  }
}
