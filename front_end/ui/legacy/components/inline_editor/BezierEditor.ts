// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';

import {AnimationTimingModel} from './AnimationTimingModel.js';
import {AnimationTimingUI} from './AnimationTimingUI.js';
import bezierEditorStyles from './bezierEditor.css.js';
import {BezierUI} from './BezierUI.js';

const PREVIEW_ANIMATION_DEBOUNCE_DELAY = 300;

export class BezierEditor extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  private model: AnimationTimingModel;
  private previewElement: HTMLElement;
  private readonly previewOnion: HTMLElement;
  private readonly outerContainer: HTMLElement;
  private selectedCategory: PresetCategory|null;
  private readonly presetsContainer: HTMLElement;
  private readonly presetUI: BezierUI;
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
    this.setDefaultFocusedElement(this.contentElement);

    // Preview UI
    this.previewElement = this.contentElement.createChild('div', 'bezier-preview-container');
    this.previewElement.createChild('div', 'bezier-preview-animation');
    this.previewElement.addEventListener('click', this.startPreviewAnimation.bind(this));
    this.previewOnion = this.contentElement.createChild('div', 'bezier-preview-onion');
    this.previewOnion.addEventListener('click', this.startPreviewAnimation.bind(this));

    this.outerContainer = this.contentElement.createChild('div', 'bezier-container');

    // Presets UI
    this.selectedCategory = null;
    this.presetsContainer = this.outerContainer.createChild('div', 'bezier-presets');
    this.presetUI = new BezierUI({
      width: 40,
      height: 40,
      marginTop: 0,
      controlPointRadius: 2,
      shouldDrawLine: false,
    });

    this.presetCategories = [];
    for (let i = 0; i < Presets.length; i++) {
      this.presetCategories[i] = this.createCategory(Presets[i]);
      this.presetsContainer.appendChild(this.presetCategories[i].icon);
    }

    // Curve UI
    this.debouncedStartPreviewAnimation =
        Common.Debouncer.debounce(this.startPreviewAnimation.bind(this), PREVIEW_ANIMATION_DEBOUNCE_DELAY);
    this.animationTimingUI = new AnimationTimingUI({
      model: this.model,
      onChange: (model: AnimationTimingModel): void => {
        this.setModel(model);
        this.onchange();
        this.unselectPresets();
        this.debouncedStartPreviewAnimation();
      },
    });
    this.outerContainer.appendChild(this.animationTimingUI.element());

    this.header = this.contentElement.createChild('div', 'bezier-header');
    const minus = this.createPresetModifyIcon(this.header, 'bezier-preset-minus', 'M 12 6 L 8 10 L 12 14');
    const plus = this.createPresetModifyIcon(this.header, 'bezier-preset-plus', 'M 8 6 L 12 10 L 8 14');
    minus.addEventListener('click', this.presetModifyClicked.bind(this, false));
    plus.addEventListener('click', this.presetModifyClicked.bind(this, true));
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
    this.dispatchEventToListeners(Events.BezierChanged, this.model.asCSSText());
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
  }[]): PresetCategory {
    const presetElement = document.createElement('div');
    presetElement.classList.add('bezier-preset-category');
    const iconElement = UI.UIUtils.createSVGChild(presetElement, 'svg', 'bezier-preset monospace');
    const category = {presets: presetGroup, presetIndex: 0, icon: presetElement};
    this.presetUI.drawCurve(UI.Geometry.CubicBezier.parse(category.presets[0].value), iconElement);
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
      {offset: 0, transform: 'translateX(0px)', easing: this.model.asCSSText(), opacity: 1},
      {offset: 0.9, transform: 'translateX(218px)', opacity: 1},
      {offset: 1, transform: 'translateX(218px)', opacity: 0},
    ];
    this.previewAnimation = this.previewElement.animate(keyframes, animationDuration);
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  BezierChanged = 'BezierChanged',
}

export type EventTypes = {
  [Events.BezierChanged]: string,
};

export const Presets = [
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
