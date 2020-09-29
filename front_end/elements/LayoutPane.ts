// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './NodeText.js';

import * as Common from '../common/common.js';
import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {BooleanSetting, EnumSetting, LayoutElement, Setting, SettingType} from './LayoutPaneUtils.js';

import type {NodeTextData} from './NodeText.js';

const {render, html} = LitHtml;
const ls = Common.ls;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;
const showElementButtonTitle = ls`Show element in the Elements panel`;

export class SettingChangedEvent extends Event {
  data: {setting: string, value: string|boolean};

  constructor(setting: string, value: string|boolean) {
    super('setting-changed', {});
    this.data = {setting, value};
  }
}

interface HTMLInputElementEvent extends Event {
  target: HTMLInputElement;
}

function isEnumSetting(setting: Setting): setting is EnumSetting {
  return setting.type === SettingType.ENUM;
}

function isBooleanSetting(setting: Setting): setting is BooleanSetting {
  return setting.type === SettingType.BOOLEAN;
}

export interface LayoutPaneData {
  settings: Setting[];
  gridElements: LayoutElement[];
}

export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: Readonly<Setting[]> = [];
  private gridElements: Readonly<LayoutElement[]> = [];

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {patchThemeSupport: true}),
      ...getStyleSheets('ui/inspectorSyntaxHighlight.css', {patchThemeSupport: true}),
      ...getStyleSheets('elements/layoutPane.css', {patchThemeSupport: false}),
    ];
  }

  set data(data: LayoutPaneData) {
    this.settings = data.settings;
    this.gridElements = data.gridElements;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details open>
        <summary class="header">
          ${ls`Grid`}
        </summary>
        <div class="content-section">
          <h3 class="content-section-title">${ls`Overlay display settings`}</h3>
          <div class="select-settings">
            ${this.getEnumSettings().map(setting => this.renderEnumSetting(setting))}
          </div>
          <div class="checkbox-settings">
            ${this.getBooleanSettings().map(setting => this.renderBooleanSetting(setting))}
          </div>
        </div>
        ${this.gridElements ?
          html`<div class="content-section">
            <h3 class="content-section-title">
              ${this.gridElements.length ? ls`Grid overlays` : ls`No grid layouts found on this page`}
            </h3>
            ${this.gridElements.length ?
              html`<div class="elements">
                ${this.gridElements.map(element => this.renderElement(element))}
              </div>` : ''}
          </div>` : ''}
      </details>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private getEnumSettings(): EnumSetting[] {
    return this.settings.filter(isEnumSetting);
  }

  private getBooleanSettings(): BooleanSetting[] {
    return this.settings.filter(isBooleanSetting);
  }

  private onBooleanSettingChange(setting: BooleanSetting, event: HTMLInputElementEvent) {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.checked));
  }

  private onEnumSettingChange(setting: EnumSetting, event: HTMLInputElementEvent) {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.value));
  }

  private onElementToggle(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.toggle(event.target.checked);
  }

  private onElementClick(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.reveal();
  }

  private onColorChange(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.setColor(event.target.value);
    this.render();
  }

  private onElementMouseEnter(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.highlight();
  }

  private onElementMouseLeave(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.hideHighlight();
  }

  private renderElement(element: LayoutElement) {
    const onElementToggle = this.onElementToggle.bind(this, element);
    const onElementClick = this.onElementClick.bind(this, element);
    const onColorChange = this.onColorChange.bind(this, element);
    const onMouseEnter = this.onElementMouseEnter.bind(this, element);
    const onMouseLeave = this.onElementMouseLeave.bind(this, element);
    const onColorLabelKeyUp = (event: KeyboardEvent) => {
      // Handle Enter and Space events to make the color picker accessible.
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const target = event.target as HTMLLabelElement;
      const input = target.querySelector('input') as HTMLInputElement;
      input.click();
      event.preventDefault();
    };
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`<div class="element">
      <label data-element="true" class="checkbox-label" title=${element.name}>
        <input data-input="true" type="checkbox" .checked=${element.enabled} @change=${onElementToggle} />
        <span class="node-text-container" data-label="true" @mouseenter=${onMouseEnter} @mouseleave=${onMouseLeave}>
          <devtools-node-text .data=${{
            nodeId: element.domId,
            nodeTitle: element.name,
            nodeClasses: element.domClasses,
          } as NodeTextData}></devtools-node-text>
        </span>
      </label>
      <label @keyup=${onColorLabelKeyUp} tabindex="0" class="color-picker-label" style="background:${element.color}">
        <input @change=${onColorChange} @input=${onColorChange} class="color-picker" type="color" value=${element.color} />
      </label>
      <button tabindex="0" @click=${onElementClick} title=${showElementButtonTitle} class="show-element"></button>
    </div>`;
    // clang-format on
  }

  private renderBooleanSetting(setting: BooleanSetting) {
    const onBooleanSettingChange = this.onBooleanSettingChange.bind(this, setting);
    return html`<label data-boolean-setting="true" class="checkbox-label" title=${setting.title}>
      <input data-input="true" type="checkbox" .checked=${setting.value} @change=${onBooleanSettingChange} />
      <span data-label="true">${setting.title}</span>
    </label>`;
  }

  private renderEnumSetting(setting: EnumSetting) {
    const onEnumSettingChange = this.onEnumSettingChange.bind(this, setting);
    return html`<label data-enum-setting="true" class="select-label" title=${setting.title}>
      <select class="chrome-select" data-input="true" @change=${onEnumSettingChange}>
        ${
        setting.options.map(
            opt => html`<option value=${opt.value} .selected=${setting.value === opt.value}>${opt.title}</option>`)}
      </select>
    </label>`;
  }
}

customElements.define('devtools-layout-pane', LayoutPane);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-layout-pane': LayoutPane;
  }
}
