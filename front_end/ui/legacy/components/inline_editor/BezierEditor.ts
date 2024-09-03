// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import {AnimationTimingModel} from './AnimationTimingModel.js';
import {AnimationTimingUI, PresetUI} from './AnimationTimingUI.js';
import bezierEditorStyles from './bezierEditor.css.js';

const PREVIEW_ANIMATION_DEBOUNCE_DELAY = 300;

export class BezierEditor extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  private model: AnimationTimingModel;
  private previewElement: HTMLElement;
  private readonly previewOnion: HTMLElement;
  private readonly outerContainer: HTMLElement;
  private selectedCategory: PresetCategory|null;
  private readonly presetsContainer: HTMLElement;
  private readonly presetUI: PresetUI;
  private readonly presetCategories: PresetCategory[];
  private animationTimingUI?: AnimationTimingUI;
  private readonly header: HTMLElement;
  private label: HTMLElement;
  private previewAnimation?: Animation;
  private debouncedStartPreviewAnimation: () => void;

  constructor(model: AnimationTimingModel) {
    super(true);

    this.model = model;
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute(
        'jslog', `${VisualLogging.dialog('bezierEditor').parent('mapped').track({keydown: 'Enter|Escape'})}`);
    this.setDefaultFocusedElement(this.contentElement);
    this.element.style.overflowY = 'auto';

    // Preview UI
    this.previewElement = this.contentElement.createChild('div', 'bezier-preview-container');
    this.previewElement.setAttribute('jslog', `${VisualLogging.preview().track({click: true})}`);
    this.previewElement.createChild('div', 'bezier-preview-animation');
    this.previewElement.addEventListener('click', this.startPreviewAnimation.bind(this));
    this.previewOnion = this.contentElement.createChild('div', 'bezier-preview-onion');
    this.previewOnion.setAttribute('jslog', `${VisualLogging.preview().track({click: true})}`);
    this.previewOnion.addEventListener('click', this.startPreviewAnimation.bind(this));

    this.outerContainer = this.contentElement.createChild('div', 'bezier-container');

    // Presets UI
    this.selectedCategory = null;
    this.presetsContainer = this.outerContainer.createChild('div', 'bezier-presets');
    this.presetUI = new PresetUI();

    this.presetCategories = [];
    for (let i = 0; i < Presets.length; i++) {
      const category = this.createCategory(Presets[i]);
      if (!category) {
        continue;
      }

      this.presetCategories[i] = category;
      this.presetsContainer.appendChild(this.presetCategories[i].icon);
    }

    // Curve UI
    this.debouncedStartPreviewAnimation =
        Common.Debouncer.debounce(this.startPreviewAnimation.bind(this), PREVIEW_ANIMATION_DEBOUNCE_DELAY);
    this.animationTimingUI = new AnimationTimingUI({
      model: this.model,
      onChange: (model: AnimationTimingModel) => {
        this.setModel(model);
        this.onchange();
        this.unselectPresets();
        this.debouncedStartPreviewAnimation();
      },
    });
    this.animationTimingUI.element().setAttribute(
        'jslog', `${VisualLogging.bezierCurveEditor().track({click: true, drag: true})}`);
    this.outerContainer.appendChild(this.animationTimingUI.element());

    this.header = this.contentElement.createChild('div', 'bezier-header');
    const minus = this.createPresetModifyIcon(this.header, 'bezier-preset-minus', 'M 12 6 L 8 10 L 12 14');
    minus.addEventListener('click', this.presetModifyClicked.bind(this, false));
    minus.setAttribute('jslog', `${VisualLogging.action('bezier.prev-preset').track({click: true})}`);
    const plus = this.createPresetModifyIcon(this.header, 'bezier-preset-plus', 'M 8 6 L 12 10 L 8 14');
    plus.addEventListener('click', this.presetModifyClicked.bind(this, true));
    plus.setAttribute('jslog', `${VisualLogging.action('bezier.next-preset').track({click: true})}`);
    this.label = this.header.createChild('span', 'source-code bezier-display-value');
  }

  setModel(model: AnimationTimingModel): void {
    this.model = model;
    this.animationTimingUI?.setModel(this.model);
    this.updateUI();
  }

  override wasShown(): void {
    this.registerCSSFiles([bezierEditorStyles]);
    this.unselectPresets();
    // Check if bezier matches a preset
    for (const category of this.presetCategories) {
      for (let i = 0; i < category.presets.length; i++) {
        if (this.model.asCSSText() === category.presets[i].value) {
          category.presetIndex = i;
          this.presetCategorySelected(category);
        }
      }
    }

    this.updateUI();
    this.startPreviewAnimation();
  }

  private onchange(): void {
    this.updateUI();
    this.dispatchEventToListeners(Events.BEZIER_CHANGED, this.model.asCSSText());
  }

  private updateUI(): void {
    const labelText = this.selectedCategory ? this.selectedCategory.presets[this.selectedCategory.presetIndex].name :
                                              this.model.asCSSText().replace(/\s(-\d\.\d)/g, '$1');
    this.label.textContent = labelText;
    this.animationTimingUI?.draw();
  }

  private createCategory(presetGroup: {
    name: string,
    value: string,
  }[]): PresetCategory|null {
    const pivot = AnimationTimingModel.parse(presetGroup[0].value);
    if (!pivot) {
      return null;
    }

    const presetElement = document.createElement('div');
    presetElement.classList.add('bezier-preset-category');
    presetElement.setAttribute(
        'jslog', `${VisualLogging.bezierPresetCategory().track({click: true}).context(presetGroup[0].name)}`);
    const iconElement = UI.UIUtils.createSVGChild(presetElement, 'svg', 'bezier-preset monospace');
    const category = {presets: presetGroup, presetIndex: 0, icon: presetElement};
    this.presetUI.draw(pivot, iconElement);
    iconElement.addEventListener('click', this.presetCategorySelected.bind(this, category));
    return category;
  }

  private createPresetModifyIcon(parentElement: Element, className: string, drawPath: string): Element {
    const icon = UI.UIUtils.createSVGChild(parentElement, 'svg', 'bezier-preset-modify ' + className);
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    const path = UI.UIUtils.createSVGChild(icon, 'path');
    path.setAttribute('d', drawPath);
    return icon;
  }

  private unselectPresets(): void {
    for (const category of this.presetCategories) {
      category.icon.classList.remove('bezier-preset-selected');
    }
    this.selectedCategory = null;
    this.header.classList.remove('bezier-header-active');
  }

  private presetCategorySelected(category: PresetCategory, event?: Event): void {
    if (this.selectedCategory === category) {
      return;
    }
    this.unselectPresets();
    this.header.classList.add('bezier-header-active');
    this.selectedCategory = category;
    this.selectedCategory.icon.classList.add('bezier-preset-selected');
    const newModel = AnimationTimingModel.parse(category.presets[category.presetIndex].value);
    if (newModel) {
      this.setModel(newModel);
      this.onchange();
      this.startPreviewAnimation();
    }
    if (event) {
      event.consume(true);
    }
  }

  private presetModifyClicked(intensify: boolean, _event: Event): void {
    if (this.selectedCategory === null) {
      return;
    }

    const length = this.selectedCategory.presets.length;
    this.selectedCategory.presetIndex = (this.selectedCategory.presetIndex + (intensify ? 1 : -1) + length) % length;
    const selectedPreset = this.selectedCategory.presets[this.selectedCategory.presetIndex].value;
    const newModel = AnimationTimingModel.parse(selectedPreset);
    if (newModel) {
      this.setModel(newModel);
      this.onchange();
      this.startPreviewAnimation();
    }
  }

  private startPreviewAnimation(): void {
    this.previewOnion.removeChildren();

    if (this.previewAnimation) {
      this.previewAnimation.cancel();
    }

    const animationDuration = 1600;
    const numberOnionSlices = 20;

    const keyframes = [
      {offset: 0, transform: 'translateX(0px)', opacity: 1},
      {offset: 1, transform: 'translateX(218px)', opacity: 1},
    ];
    this.previewAnimation = this.previewElement.animate(keyframes, {
      easing: this.model.asCSSText(),
      duration: animationDuration,
    });
    this.previewOnion.removeChildren();
    for (let i = 0; i <= numberOnionSlices; i++) {
      const slice = this.previewOnion.createChild('div', 'bezier-preview-animation');
      const player = slice.animate(
          [{transform: 'translateX(0px)', easing: this.model.asCSSText()}, {transform: 'translateX(218px)'}],
          {duration: animationDuration, fill: 'forwards'});
      player.pause();
      player.currentTime = animationDuration * i / numberOnionSlices;
    }
  }
}

export const enum Events {
  BEZIER_CHANGED = 'BezierChanged',
}

export type EventTypes = {
  [Events.BEZIER_CHANGED]: string,
};

export const Presets = [
  [
    {name: 'linear', value: 'linear'},
    {
      name: 'elastic',
      value:
          'linear(0 0%, 0.22 2.1%, 0.86 6.5%, 1.11 8.6%, 1.3 10.7%, 1.35 11.8%, 1.37 12.9%, 1.37 13.7%, 1.36 14.5%, 1.32 16.2%, 1.03 21.8%, 0.94 24%, 0.89 25.9%, 0.88 26.85%, 0.87 27.8%, 0.87 29.25%, 0.88 30.7%, 0.91 32.4%, 0.98 36.4%, 1.01 38.3%, 1.04 40.5%, 1.05 42.7%, 1.05 44.1%, 1.04 45.7%, 1 53.3%, 0.99 55.4%, 0.98 57.5%, 0.99 60.7%, 1 68.1%, 1.01 72.2%, 1 86.7%, 1 100%)',
    },
    {
      name: 'bounce',
      value:
          'linear(0 0%, 0 2.27%, 0.02 4.53%, 0.04 6.8%, 0.06 9.07%, 0.1 11.33%, 0.14 13.6%, 0.25 18.15%, 0.39 22.7%, 0.56 27.25%, 0.77 31.8%, 1 36.35%, 0.89 40.9%, 0.85 43.18%, 0.81 45.45%, 0.79 47.72%, 0.77 50%, 0.75 52.27%, 0.75 54.55%, 0.75 56.82%, 0.77 59.1%, 0.79 61.38%, 0.81 63.65%, 0.85 65.93%, 0.89 68.2%, 1 72.7%, 0.97 74.98%, 0.95 77.25%, 0.94 79.53%, 0.94 81.8%, 0.94 84.08%, 0.95 86.35%, 0.97 88.63%, 1 90.9%, 0.99 93.18%, 0.98 95.45%, 0.99 97.73%, 1 100%)',
    },
    {
      name: 'emphasized',
      value:
          'linear(0 0%, 0 1.8%, 0.01 3.6%, 0.03 6.35%, 0.07 9.1%, 0.13 11.4%, 0.19 13.4%, 0.27 15%, 0.34 16.1%, 0.54 18.35%, 0.66 20.6%, 0.72 22.4%, 0.77 24.6%, 0.81 27.3%, 0.85 30.4%, 0.88 35.1%, 0.92 40.6%, 0.94 47.2%, 0.96 55%, 0.98 64%, 0.99 74.4%, 1 86.4%, 1 100%)',
    },
  ],
  [
    {name: 'ease-in-out', value: 'ease-in-out'},
    {name: 'In Out · Sine', value: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)'},
    {name: 'In Out · Quadratic', value: 'cubic-bezier(0.46, 0.03, 0.52, 0.96)'},
    {name: 'In Out · Cubic', value: 'cubic-bezier(0.65, 0.05, 0.36, 1)'},
    {name: 'Fast Out, Slow In', value: 'cubic-bezier(0.4, 0, 0.2, 1)'},
    {name: 'In Out · Back', value: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)'},
  ],
  [
    {name: 'Fast Out, Linear In', value: 'cubic-bezier(0.4, 0, 1, 1)'},
    {name: 'ease-in', value: 'ease-in'},
    {name: 'In · Sine', value: 'cubic-bezier(0.47, 0, 0.75, 0.72)'},
    {name: 'In · Quadratic', value: 'cubic-bezier(0.55, 0.09, 0.68, 0.53)'},
    {name: 'In · Cubic', value: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)'},
    {name: 'In · Back', value: 'cubic-bezier(0.6, -0.28, 0.74, 0.05)'},
  ],
  [
    {name: 'ease-out', value: 'ease-out'},
    {name: 'Out · Sine', value: 'cubic-bezier(0.39, 0.58, 0.57, 1)'},
    {name: 'Out · Quadratic', value: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'},
    {name: 'Out · Cubic', value: 'cubic-bezier(0.22, 0.61, 0.36, 1)'},
    {name: 'Linear Out, Slow In', value: 'cubic-bezier(0, 0, 0.2, 1)'},
    {name: 'Out · Back', value: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)'},
  ],
];
export interface PresetCategory {
  presets: {
    name: string,
    value: string,
  }[];
  icon: Element;
  presetIndex: number;
}
