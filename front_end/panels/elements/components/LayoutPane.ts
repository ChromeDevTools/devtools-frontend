// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/node_text/node_text.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as NodeText from '../../../ui/components/node_text/node_text.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
// eslint-disable-next-line rulesdir/es_modules_import
import inspectorCommonStyles from '../../../ui/legacy/inspectorCommon.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import layoutPaneStyles from './layoutPane.css.js';
import {type BooleanSetting, type EnumSetting, type LayoutElement, type Setting} from './LayoutPaneUtils.js';

const UIStrings = {
  /**
   *@description Title of the input to select the overlay color for an element using the color picker
   */
  chooseElementOverlayColor: 'Choose the overlay color for this element',
  /**
   *@description Title of the show element button in the Layout pane of the Elements panel
   */
  showElementInTheElementsPanel: 'Show element in the Elements panel',
  /**
   *@description Title of a section on CSS Grid tooling
   */
  grid: 'Grid',
  /**
   *@description Title of a section in the Layout Sidebar pane of the Elements panel
   */
  overlayDisplaySettings: 'Overlay display settings',
  /**
   *@description Title of a section in Layout sidebar pane
   */
  gridOverlays: 'Grid overlays',
  /**
   *@description Message in the Layout panel informing users that no CSS Grid layouts were found on the page
   */
  noGridLayoutsFoundOnThisPage: 'No grid layouts found on this page',
  /**
   *@description Title of the Flexbox section in the Layout panel
   */
  flexbox: 'Flexbox',
  /**
   *@description Title of a section in the Layout panel
   */
  flexboxOverlays: 'Flexbox overlays',
  /**
   *@description Text in the Layout panel, when no flexbox elements are found
   */
  noFlexboxLayoutsFoundOnThisPage: 'No flexbox layouts found on this page',
  /**
   *@description Screen reader announcement when opening color picker tool.
   */
  colorPickerOpened: 'Color picker opened.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/LayoutPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export {LayoutElement};

const {render, html} = LitHtml;

const nodeToLayoutElement = (node: SDK.DOMModel.DOMNode): LayoutElement => {
  const className = node.getAttribute('class');
  const nodeId = node.id;
  return {
    id: nodeId,
    color: 'var(--sys-color-inverse-surface)',
    name: node.localName(),
    domId: node.getAttribute('id'),
    domClasses: className ? className.split(/\s+/).filter(s => Boolean(s)) : undefined,
    enabled: false,
    reveal: () => {
      void Common.Revealer.reveal(node);
      void node.scrollIntoView();
    },
    highlight: () => {
      node.highlight();
    },
    hideHighlight: () => {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    },
    toggle: (_value: boolean) => {
      throw new Error('Not implemented');
    },
    setColor(_value: string): never {
      throw new Error('Not implemented');
    },
  };
};

const gridNodesToElements = (nodes: SDK.DOMModel.DOMNode[]): LayoutElement[] => {
  return nodes.map(node => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color:
          node.domModel().overlayModel().colorOfGridInPersistentOverlay(nodeId) || 'var(--sys-color-inverse-surface)',
      enabled: node.domModel().overlayModel().isHighlightedGridInPersistentOverlay(nodeId),
      toggle: (value: boolean) => {
        if (value) {
          node.domModel().overlayModel().highlightGridInPersistentOverlay(nodeId);
        } else {
          node.domModel().overlayModel().hideGridInPersistentOverlay(nodeId);
        }
      },
      setColor(value: string): void {
        this.color = value;
        node.domModel().overlayModel().setColorOfGridInPersistentOverlay(nodeId, value);
      },
    };
  });
};

const flexContainerNodesToElements = (nodes: SDK.DOMModel.DOMNode[]): LayoutElement[] => {
  return nodes.map(node => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color:
          node.domModel().overlayModel().colorOfFlexInPersistentOverlay(nodeId) || 'var(--sys-color-inverse-surface)',
      enabled: node.domModel().overlayModel().isHighlightedFlexContainerInPersistentOverlay(nodeId),
      toggle: (value: boolean) => {
        if (value) {
          node.domModel().overlayModel().highlightFlexContainerInPersistentOverlay(nodeId);
        } else {
          node.domModel().overlayModel().hideFlexContainerInPersistentOverlay(nodeId);
        }
      },
      setColor(value: string): void {
        this.color = value;
        node.domModel().overlayModel().setColorOfFlexInPersistentOverlay(nodeId, value);
      },
    };
  });
};

interface HTMLInputElementEvent extends Event {
  target: HTMLInputElement;
}

function isEnumSetting(setting: Setting): setting is EnumSetting {
  return setting.type === Common.Settings.SettingType.ENUM;
}

function isBooleanSetting(setting: Setting): setting is BooleanSetting {
  return setting.type === Common.Settings.SettingType.BOOLEAN;
}

export interface LayoutPaneData {
  settings: Setting[];
  gridElements: LayoutElement[];
  flexContainerElements?: LayoutElement[];
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
let layoutPaneWrapperInstance: LegacyWrapper.LegacyWrapper.LegacyWrapper<UI.Widget.Widget, LayoutPane>;

export class LayoutPane extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #settings: Readonly<Setting[]> = [];
  readonly #uaShadowDOMSetting: Common.Settings.Setting<boolean>;
  #domModels: SDK.DOMModel.DOMModel[];

  constructor() {
    super();
    this.#settings = this.#makeSettings();
    this.#uaShadowDOMSetting = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom');
    this.#domModels = [];
    this.#shadow.adoptedStyleSheets = [
      Input.checkboxStyles,
      layoutPaneStyles,
      inspectorCommonStyles,
    ];
  }

  static instance(): LayoutPane {
    if (!layoutPaneWrapperInstance) {
      layoutPaneWrapperInstance = LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, new LayoutPane());
    }
    layoutPaneWrapperInstance.element.style.minWidth = 'min-content';
    layoutPaneWrapperInstance.element.setAttribute('jslog', `${VisualLogging.pane('layout').track({resize: true})}`);
    return layoutPaneWrapperInstance.getComponent();
  }

  modelAdded(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.addEventListener(SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, this.render, this);
    overlayModel.addEventListener(
        SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.render, this);
    this.#domModels.push(domModel);
  }

  modelRemoved(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.removeEventListener(SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, this.render, this);
    overlayModel.removeEventListener(
        SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.render, this);
    this.#domModels = this.#domModels.filter(model => model !== domModel);
  }

  async #fetchNodesByStyle(style: {
    name: string,
    value: string,
  }[]): Promise<SDK.DOMModel.DOMNode[]> {
    const showUAShadowDOM = this.#uaShadowDOMSetting.get();

    const nodes = [];
    for (const domModel of this.#domModels) {
      try {
        const nodeIds = await domModel.getNodesByStyle(style, true /* pierce */);
        for (const nodeId of nodeIds) {
          const node = domModel.nodeForId(nodeId);
          if (node !== null && (showUAShadowDOM || !node.ancestorUserAgentShadowRoot())) {
            nodes.push(node);
          }
        }
      } catch (error) {
        // TODO(crbug.com/1167706): Sometimes in E2E tests the layout panel is updated after a DOM node
        // has been removed. This causes an error that a node has not been found.
        // We can skip nodes that resulted in an error.
        console.warn(error);
      }
    }

    return nodes;
  }

  async #fetchGridNodes(): Promise<SDK.DOMModel.DOMNode[]> {
    return await this.#fetchNodesByStyle([{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}]);
  }

  async #fetchFlexContainerNodes(): Promise<SDK.DOMModel.DOMNode[]> {
    return await this.#fetchNodesByStyle([{name: 'display', value: 'flex'}, {name: 'display', value: 'inline-flex'}]);
  }

  #makeSettings(): Setting[] {
    const settings = [];
    for (const settingName
             of ['show-grid-line-labels', 'show-grid-track-sizes', 'show-grid-areas', 'extend-grid-lines']) {
      const setting = Common.Settings.Settings.instance().moduleSetting(settingName);
      const settingValue = setting.get();
      const settingType = setting.type();
      if (!settingType) {
        throw new Error('A setting provided to LayoutSidebarPane does not have a setting type');
      }
      if (settingType !== Common.Settings.SettingType.BOOLEAN && settingType !== Common.Settings.SettingType.ENUM) {
        throw new Error('A setting provided to LayoutSidebarPane does not have a supported setting type');
      }
      const mappedSetting = {
        type: settingType,
        name: setting.name,
        title: setting.title(),
      };
      if (typeof settingValue === 'boolean') {
        settings.push({
          ...mappedSetting,
          value: settingValue,
          options: setting.options().map(opt => ({
                                           ...opt,
                                           value: (opt.value as boolean),
                                         })),
        });
      } else if (typeof settingValue === 'string') {
        settings.push({
          ...mappedSetting,
          value: settingValue,
          options: setting.options().map(opt => ({
                                           ...opt,
                                           value: (opt.value as string),
                                         })),
        });
      }
    }
    return settings;
  }

  onSettingChanged(setting: string, value: string|boolean): void {
    Common.Settings.Settings.instance().moduleSetting(setting).set(value);
  }

  override wasShown(): void {
    for (const setting of this.#settings) {
      Common.Settings.Settings.instance().moduleSetting(setting.name).addChangeListener(this.render, this);
    }
    for (const domModel of this.#domModels) {
      this.modelRemoved(domModel);
    }
    this.#domModels = [];
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this, {scoped: true});
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.render, this);
    this.#uaShadowDOMSetting.addChangeListener(this.render, this);
    void this.render();
  }

  override willHide(): void {
    for (const setting of this.#settings) {
      Common.Settings.Settings.instance().moduleSetting(setting.name).removeChangeListener(this.render, this);
    }
    SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.render, this);
    this.#uaShadowDOMSetting.removeChangeListener(this.render, this);
  }

  #onSummaryKeyDown(event: KeyboardEvent): void {
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

  override async render(): Promise<void> {
    const gridElements = gridNodesToElements(await this.#fetchGridNodes());
    const flexContainerElements = flexContainerNodesToElements(await this.#fetchFlexContainerNodes());
    await coordinator.write('LayoutPane render', () => {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      render(html`
        <details open>
          <summary class="header" @keydown=${this.#onSummaryKeyDown} jslog=${VisualLogging.sectionHeader('grid-settings').track({click: true})}>
            ${i18nString(UIStrings.grid)}
          </summary>
          <div class="content-section" jslog=${VisualLogging.section('grid-settings')}>
            <h3 class="content-section-title">${i18nString(UIStrings.overlayDisplaySettings)}</h3>
            <div class="select-settings">
              ${this.#getEnumSettings().map(setting => this.#renderEnumSetting(setting))}
            </div>
            <div class="checkbox-settings">
              ${this.#getBooleanSettings().map(setting => this.#renderBooleanSetting(setting))}
            </div>
          </div>
          ${gridElements ?
            html`<div class="content-section" jslog=${VisualLogging.section('grid-overlays')}>
              <h3 class="content-section-title">
                ${gridElements.length ? i18nString(UIStrings.gridOverlays) : i18nString(UIStrings.noGridLayoutsFoundOnThisPage)}
              </h3>
              ${gridElements.length ?
                html`<div class="elements">
                  ${gridElements.map(element => this.#renderElement(element))}
                </div>` : ''}
            </div>` : ''}
        </details>
        ${flexContainerElements !== undefined ?
          html`
          <details open>
            <summary class="header" @keydown=${this.#onSummaryKeyDown} jslog=${VisualLogging.sectionHeader('flexbox-overlays').track({click: true})}>
              ${i18nString(UIStrings.flexbox)}
            </summary>
            ${flexContainerElements ?
              html`<div class="content-section" jslog=${VisualLogging.section('flexbox-overlays')}>
                <h3 class="content-section-title">
                  ${flexContainerElements.length ? i18nString(UIStrings.flexboxOverlays) : i18nString(UIStrings.noFlexboxLayoutsFoundOnThisPage)}
                </h3>
                ${flexContainerElements.length ?
                  html`<div class="elements">
                    ${flexContainerElements.map(element => this.#renderElement(element))}
                  </div>` : ''}
              </div>` : ''}
          </details>
          `
        : ''}
      `, this.#shadow, {
        host: this,
      });
      // clang-format on
    });
  }

  #getEnumSettings(): EnumSetting[] {
    return this.#settings.filter(isEnumSetting);
  }

  #getBooleanSettings(): BooleanSetting[] {
    return this.#settings.filter(isBooleanSetting);
  }

  #onBooleanSettingChange(setting: BooleanSetting, event: HTMLInputElementEvent): void {
    event.preventDefault();
    this.onSettingChanged(setting.name, event.target.checked);
  }

  #onEnumSettingChange(setting: EnumSetting, event: HTMLInputElementEvent): void {
    event.preventDefault();
    this.onSettingChanged(setting.name, event.target.value);
  }

  #onElementToggle(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.toggle(event.target.checked);
  }

  #onElementClick(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.reveal();
  }

  #onColorChange(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.setColor(event.target.value);
    void this.render();
  }

  #onElementMouseEnter(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.highlight();
  }

  #onElementMouseLeave(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.hideHighlight();
  }

  #renderElement(element: LayoutElement): LitHtml.TemplateResult {
    const onElementToggle = this.#onElementToggle.bind(this, element);
    const onElementClick = this.#onElementClick.bind(this, element);
    const onColorChange = this.#onColorChange.bind(this, element);
    const onMouseEnter = this.#onElementMouseEnter.bind(this, element);
    const onMouseLeave = this.#onElementMouseLeave.bind(this, element);
    const onColorLabelKeyUp = (event: KeyboardEvent): void => {
      // Handle Enter and Space events to make the color picker accessible.
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const target = event.target as HTMLLabelElement;
      const input = target.querySelector('input') as HTMLInputElement;
      input.click();
      UI.ARIAUtils.alert(i18nString(UIStrings.colorPickerOpened));
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
    return html`<div class="element" jslog=${VisualLogging.item()}>
      <label data-element="true" class="checkbox-label">
        <input data-input="true" type="checkbox" .checked=${element.enabled} @change=${onElementToggle} jslog=${VisualLogging.toggle().track({click:true})} />
        <span class="node-text-container" data-label="true" @mouseenter=${onMouseEnter} @mouseleave=${onMouseLeave}>
          <devtools-node-text .data=${{
            nodeId: element.domId,
            nodeTitle: element.name,
            nodeClasses: element.domClasses,
          } as NodeText.NodeText.NodeTextData}></devtools-node-text>
        </span>
      </label>
      <label @keyup=${onColorLabelKeyUp} @keydown=${onColorLabelKeyDown} class="color-picker-label" style="background: ${element.color};" jslog=${VisualLogging.showStyleEditor('color').track({click: true})}>
        <input @change=${onColorChange} @input=${onColorChange} title=${i18nString(UIStrings.chooseElementOverlayColor)} tabindex="0" class="color-picker" type="color" value=${element.color} />
      </label>
      <devtools-button class="show-element"
                                           .title=${i18nString(UIStrings.showElementInTheElementsPanel)}
                                           aria-label=${i18nString(UIStrings.showElementInTheElementsPanel)}
                                           .iconName=${'select-element'}
                                           .jslogContext=${'elements.select-element'}
                                           .size=${Buttons.Button.Size.SMALL}
                                           .variant=${Buttons.Button.Variant.ICON}
                                           @click=${onElementClick}></devtools-button>
    </div>`;
    // clang-format on
  }

  #renderBooleanSetting(setting: BooleanSetting): LitHtml.TemplateResult {
    const onBooleanSettingChange = this.#onBooleanSettingChange.bind(this, setting);
    return html`<label data-boolean-setting="true" class="checkbox-label" title=${setting.title} jslog=${
        VisualLogging.toggle().track({click: true}).context(setting.name)}>
      <input data-input="true" type="checkbox" .checked=${setting.value} @change=${onBooleanSettingChange} />
      <span data-label="true">${setting.title}</span>
    </label>`;
  }

  #renderEnumSetting(setting: EnumSetting): LitHtml.TemplateResult {
    const onEnumSettingChange = this.#onEnumSettingChange.bind(this, setting);
    return html`<label data-enum-setting="true" class="select-label" title=${setting.title}>
      <select
        class="chrome-select"
        data-input="true"
        jslog=${VisualLogging.dropDown().track({change: true}).context(setting.name)}
        @change=${onEnumSettingChange}>
        ${
        setting.options.map(
            opt => html`<option value=${opt.value} .selected=${setting.value === opt.value} jslog=${
                VisualLogging.item(Platform.StringUtilities.toKebabCase(opt.value)).track({click: true})}>${
                opt.title}</option>`)}
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
