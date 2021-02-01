// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './NodeText.js';

import * as Common from '../common/common.js';
import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as Host from '../host/host.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Components from '../ui/components/components.js';

import {BooleanSetting, EnumSetting, LayoutElement, Setting, SettingType} from './LayoutPaneUtils.js';

import type {NodeTextData} from './NodeText.js';

export {LayoutElement};

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
  flexContainerElements?: LayoutElement[];
}

export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: Readonly<Setting[]> = [];
  private gridElements: Readonly<LayoutElement[]> = [];
  private flexContainerElements?: Readonly<LayoutElement[]> = [];

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {enableLegacyPatching: true}),
      ...getStyleSheets('ui/inspectorSyntaxHighlight.css', {enableLegacyPatching: true}),
      ...getStyleSheets('elements/layoutPane.css', {enableLegacyPatching: false}),
    ];
    this.onSummaryKeyDown = this.onSummaryKeyDown.bind(this);
  }

  set data(data: LayoutPaneData) {
    this.settings = data.settings;
    this.gridElements = data.gridElements;
    this.flexContainerElements = data.flexContainerElements;
    this.render();
  }

  private onSummaryKeyDown(event: KeyboardEvent): void {
    if (!event.target) {
      return;
    }
    const summaryElement = event.target as HTMLElement;
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;
    if (!detailsElement) {
      throw new Error('<details> element is not found for a <summary> element');
    }
    switch (event.key) {
      case 'ArrowLeft':
        detailsElement.open = false;
        break;
      case 'ArrowRight':
        detailsElement.open = true;
        break;
    }
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details open>
        <summary class="header" @keydown=${this.onSummaryKeyDown}>
          ${ls`Grid`}
        </summary>
        <div class="content-section">
          <div class="feedback-container">
            <div>
              <h3 class="content-section-title">${ls`Overlay display settings`}</h3>
            </div>
            <div class="feedback">
              <devtools-survey-link .data=${{
                trigger: 'devtools-layout-panel',
                promptText: ls`Feedback`,
                canShowSurvey: Host.InspectorFrontendHost.InspectorFrontendHostInstance.canShowSurvey,
                showSurvey: Host.InspectorFrontendHost.InspectorFrontendHostInstance.showSurvey,
              } as Components.SurveyLink.SurveyLinkData}></devtools-survey-link>
            </div>
          </div>
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
      ${this.flexContainerElements !== undefined ?
        html`
        <details open>
          <summary class="header" @keydown=${this.onSummaryKeyDown}>
            ${ls`Flexbox`}
          </summary>
          ${this.flexContainerElements ?
            html`<div class="content-section">
              <h3 class="content-section-title">
                ${this.flexContainerElements.length ? ls`Flexbox overlays` : ls`No flexbox layouts found on this page`}
              </h3>
              ${this.flexContainerElements.length ?
                html`<div class="elements">
                  ${this.flexContainerElements.map(element => this.renderElement(element))}
                </div>` : ''}
            </div>` : ''}
        </details>
        `
      : ''}
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

  private onBooleanSettingChange(setting: BooleanSetting, event: HTMLInputElementEvent): void {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.checked));
  }

  private onEnumSettingChange(setting: EnumSetting, event: HTMLInputElementEvent): void {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.value));
  }

  private onElementToggle(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.toggle(event.target.checked);
  }

  private onElementClick(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.reveal();
  }

  private onColorChange(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.setColor(event.target.value);
    this.render();
  }

  private onElementMouseEnter(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.highlight();
  }

  private onElementMouseLeave(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.hideHighlight();
  }

  private renderElement(element: LayoutElement): LitHtml.TemplateResult {
    const onElementToggle = this.onElementToggle.bind(this, element);
    const onElementClick = this.onElementClick.bind(this, element);
    const onColorChange = this.onColorChange.bind(this, element);
    const onMouseEnter = this.onElementMouseEnter.bind(this, element);
    const onMouseLeave = this.onElementMouseLeave.bind(this, element);
    const onColorLabelKeyUp = (event: KeyboardEvent): void => {
      // Handle Enter and Space events to make the color picker accessible.
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const target = event.target as HTMLLabelElement;
      const input = target.querySelector('input') as HTMLInputElement;
      input.click();
      event.preventDefault();
    };
    const onColorLabelKeyDown = (event: KeyboardEvent): void => {
      // Prevent default scrolling when the Space key is pressed.
      if (event.key === ' ') {
        event.preventDefault();
      }
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
      <label @keyup=${onColorLabelKeyUp} @keydown=${onColorLabelKeyDown} tabindex="0" class="color-picker-label" style="background: ${element.color};">
        <input @change=${onColorChange} @input=${onColorChange} class="color-picker" type="color" value=${element.color} />
      </label>
      <button tabindex="0" @click=${onElementClick} title=${showElementButtonTitle} class="show-element"></button>
    </div>`;
    // clang-format on
  }

  private renderBooleanSetting(setting: BooleanSetting): LitHtml.TemplateResult {
    const onBooleanSettingChange = this.onBooleanSettingChange.bind(this, setting);
    return html`<label data-boolean-setting="true" class="checkbox-label" title=${setting.title}>
      <input data-input="true" type="checkbox" .checked=${setting.value} @change=${onBooleanSettingChange} />
      <span data-label="true">${setting.title}</span>
    </label>`;
  }

  private renderEnumSetting(setting: EnumSetting): LitHtml.TemplateResult {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-layout-pane': LayoutPane;
  }
}
