// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/node_text/node_text.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import layoutPaneStyles from './layoutPane.css.js';

const UIStrings = {
  /**
   * @description Title of the input to select the overlay color for an element using the color picker
   */
  chooseElementOverlayColor: 'Choose the overlay color for this element',
  /**
   * @description Title of the show element button in the Layout pane of the Elements panel
   */
  showElementInTheElementsPanel: 'Show element in the Elements panel',
  /**
   * @description Title of a section on CSS Grid/Masonry tooling
   */
  gridOrMasonry: 'Grid / Masonry',
  /**
   * @description Title of a section in the Layout Sidebar pane of the Elements panel
   */
  overlayDisplaySettings: 'Overlay display settings',
  /**
   * @description Title of a section in Layout sidebar pane
   */
  gridOrMasonryOverlays: 'Grid / Masonry overlays',
  /**
   * @description Message in the Layout panel informing users that no CSS Grid/Masonry layouts were found on the page
   */
  noGridOrMasonryLayoutsFoundOnThisPage: 'No grid or masonry layouts found on this page',
  /**
   * @description Title of the Flexbox section in the Layout panel
   */
  flexbox: 'Flexbox',
  /**
   * @description Title of a section in the Layout panel
   */
  flexboxOverlays: 'Flexbox overlays',
  /**
   * @description Text in the Layout panel, when no flexbox elements are found
   */
  noFlexboxLayoutsFoundOnThisPage: 'No flexbox layouts found on this page',
  /**
   * @description Screen reader announcement when opening color picker tool.
   */
  colorPickerOpened: 'Color picker opened.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/LayoutPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;

interface BaseSettingOption {
  title: string;
}

interface BooleanSettingOption extends BaseSettingOption {
  value: boolean;
}

interface EnumSettingOption extends BaseSettingOption {
  value: string;
}

interface BaseSetting {
  name: string;
  type: Common.Settings.SettingType.BOOLEAN|Common.Settings.SettingType.ENUM;
  title: string;
}

type BooleanSetting = BaseSetting&{options: BooleanSettingOption[], value: boolean};
type EnumSetting = BaseSetting&{options: EnumSettingOption[], value: string};
type Setting = EnumSetting|BooleanSetting;

interface LayoutElement {
  id: number;
  color: string;
  name: string;
  domId?: string;
  domClasses?: string[];
  enabled: boolean;
  reveal: () => void;
  toggle: (value: boolean) => void;
  setColor: (value: string) => void;
  highlight: () => void;
  hideHighlight: () => void;
}

const nodeToLayoutElement = (node: SDK.DOMModel.DOMNode): LayoutElement => {
  const className = node.getAttribute('class');
  const nodeId = node.id;
  return {
    id: nodeId,
    color: 'var(--sys-color-inverse-surface)',
    name: node.localName(),
    domId: node.getAttribute('id'),
    domClasses: className ? className.split(/\s+/).filter(s => !!s) : undefined,
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

interface HTMLInputElementEvent extends InputEvent {
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

let layoutPaneInstance: LayoutPane;

interface ViewInput {
  onEnumSettingChange(setting: EnumSetting, e: Event): unknown;
  flexContainerElements: LayoutElement[]|undefined;
  onElementClick(element: LayoutElement, e: MouseEvent): unknown;
  onColorChange(element: LayoutElement, e: Event): unknown;
  onMouseLeave(element: LayoutElement, e: MouseEvent): unknown;
  onMouseEnter(element: LayoutElement, e: MouseEvent): unknown;
  onElementToggle(element: LayoutElement, e: Event): unknown;
  onBooleanSettingChange(setting: BooleanSetting, e: Event): unknown;
  enumSettings: EnumSetting[];
  booleanSettings: BooleanSetting[];
  gridElements: LayoutElement[]|undefined;
  onSummaryKeyDown(e: KeyboardEvent): unknown;
}

const DEFAULT_VIEW: View = (input, output, target) => {
  const onColorLabelKeyUp = (event: KeyboardEvent): void => {
    // Handle Enter and Space events to make the color picker accessible.
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target as HTMLLabelElement;
    const input = target.querySelector('input') as HTMLInputElement;
    input.click();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.colorPickerOpened));
    event.preventDefault();
  };
  const onColorLabelKeyDown = (event: KeyboardEvent): void => {
    // Prevent default scrolling when the Space key is pressed.
    if (event.key === ' ') {
      event.preventDefault();
    }
  };
  const renderElement = (element: LayoutElement): Lit.LitTemplate => html`<div
          class="element"
          jslog=${VisualLogging.item()}>
        <devtools-checkbox
          data-element="true"
          class="checkbox-label"
          .checked=${element.enabled}
          @change=${(e: Event) => input.onElementToggle(element, e)}
          jslog=${VisualLogging.toggle().track({
    click: true
  })}>
          <span
              class="node-text-container"
              data-label="true"
              @mouseenter=${(e: MouseEvent) => input.onMouseEnter(element, e)}
              @mouseleave=${(e: MouseEvent) => input.onMouseLeave(element, e)}>
            <devtools-node-text .data=${{
    nodeId: element.domId, nodeTitle: element.name, nodeClasses: element.domClasses,
  }
  }></devtools-node-text>
          </span>
        </devtools-checkbox>
        <label
            @keyup=${onColorLabelKeyUp}
            @keydown=${onColorLabelKeyDown}
            class="color-picker-label"
            style="background: ${element.color};"
            jslog=${
      VisualLogging.showStyleEditor('color')
          .track({
            click: true
          })}>
          <input
              @change=${(e: Event) => input.onColorChange(element, e)}
              @input=${(e: InputEvent) => input.onColorChange(element, e)}
              title=${i18nString(UIStrings.chooseElementOverlayColor)}
              tabindex="0"
              class="color-picker"
              type="color"
              value=${element.color} />
        </label>
        <devtools-button class="show-element"
           .title=${i18nString(UIStrings.showElementInTheElementsPanel)}
           aria-label=${i18nString(UIStrings.showElementInTheElementsPanel)}
           .iconName=${'select-element'}
           .jslogContext=${'elements.select-element'}
           .size=${Buttons.Button.Size.SMALL}
           .variant=${Buttons.Button.Variant.ICON}
           @click=${(e: MouseEvent) => input.onElementClick(element, e)}
           ></devtools-button>
      </div>`;

  // clang-format off
  render(html`
      <div style="min-width: min-content;" jslog=${VisualLogging.pane('layout').track({resize: true})}>
        <style>${layoutPaneStyles}</style>
        <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
        <details open>
          <summary class="header"
            @keydown=${input.onSummaryKeyDown}
            jslog=${VisualLogging.sectionHeader('grid-settings').track({click: true})}>
            ${i18nString(UIStrings.gridOrMasonry)}
          </summary>
          <div class="content-section" jslog=${VisualLogging.section('grid-settings')}>
            <h3 class="content-section-title">${i18nString(UIStrings.overlayDisplaySettings)}</h3>
            <div class="select-settings">
              ${input.enumSettings.map(setting =>
                  html`<label data-enum-setting="true" class="select-label" title=${setting.title}>
                      <select
                        data-input="true"
                        jslog=${VisualLogging.dropDown().track({change: true}).context(setting.name)}
                        @change=${(e: Event) => input.onEnumSettingChange(setting, e)}>
                        ${setting.options.map(opt =>
                        html`<option
                                value=${opt.value}
                                .selected=${setting.value === opt.value}
                                jslog=${
                                  VisualLogging.item(Platform.StringUtilities.toKebabCase(opt.value)).track({
                                    click: true})}>${opt.title}</option>`)}
                      </select>
                    </label>`)}
            </div>
            <div class="checkbox-settings">
              ${input.booleanSettings.map(setting =>
                  html`<div><devtools-checkbox
                      data-boolean-setting="true"
                      class="checkbox-label"
                      title=${setting.title}
                      .checked=${setting.value}
                      @change=${(e: Event) => input.onBooleanSettingChange(setting, e)}
                      jslog=${VisualLogging.toggle().track({click: true}).context(setting.name)}>
                    ${setting.title}
                  </devtools-checkbox></div>`)}
            </div>
          </div>
          ${input.gridElements ?
            html`<div class="content-section" jslog=${VisualLogging.section('grid-overlays')}>
              <h3 class="content-section-title">
                ${input.gridElements.length ?
                    i18nString(UIStrings.gridOrMasonryOverlays) :
                    i18nString(UIStrings.noGridOrMasonryLayoutsFoundOnThisPage)}
              </h3>
              ${input.gridElements.length ?
                  html`<div class="elements">${input.gridElements.map(renderElement)}</div>` :
                  ''}
            </div>` : ''}
        </details>
        ${input.flexContainerElements !== undefined ?
          html`
          <details open>
            <summary
                class="header"
                @keydown=${input.onSummaryKeyDown}
                jslog=${VisualLogging.sectionHeader('flexbox-overlays').track({click: true})}>
              ${i18nString(UIStrings.flexbox)}
            </summary>
            ${input.flexContainerElements ?
              html`<div class="content-section" jslog=${VisualLogging.section('flexbox-overlays')}>
                <h3 class="content-section-title">
                  ${input.flexContainerElements.length ?
                      i18nString(UIStrings.flexboxOverlays) :
                      i18nString(UIStrings.noFlexboxLayoutsFoundOnThisPage)}
                </h3>
                ${input.flexContainerElements.length ?
                    html`<div class="elements">${input.flexContainerElements.map(renderElement)}</div>` :
                    ''}
              </div>` : ''}
          </details>`
        : ''}
      </div>`,
      // clang-format on
      target);
};

type View = (input: ViewInput, output: object, element: HTMLElement) => void;
export class LayoutPane extends UI.Widget.Widget {
  readonly #settings: readonly Setting[] = [];
  readonly #uaShadowDOMSetting: Common.Settings.Setting<boolean>;
  #domModels: SDK.DOMModel.DOMModel[];
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#settings = this.#makeSettings();
    this.#uaShadowDOMSetting = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom');
    this.#domModels = [];
    this.#view = view;
  }

  static instance(): LayoutPane {
    if (!layoutPaneInstance) {
      layoutPaneInstance = new LayoutPane();
    }
    return layoutPaneInstance;
  }

  modelAdded(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.addEventListener(
        SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, this.requestUpdate, this);
    overlayModel.addEventListener(
        SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.requestUpdate, this);
    this.#domModels.push(domModel);
  }

  modelRemoved(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.removeEventListener(
        SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, this.requestUpdate, this);
    overlayModel.removeEventListener(
        SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.requestUpdate, this);
    this.#domModels = this.#domModels.filter(model => model !== domModel);
  }

  async #fetchNodesByStyle(style: Array<{
    name: string,
    value: string,
  }>): Promise<SDK.DOMModel.DOMNode[]> {
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
    return await this.#fetchNodesByStyle([
      {name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}, {name: 'display', value: 'masonry'},
      {name: 'display', value: 'inline-masonry'}
    ]);
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
    super.wasShown();
    for (const setting of this.#settings) {
      Common.Settings.Settings.instance().moduleSetting(setting.name).addChangeListener(this.requestUpdate, this);
    }
    for (const domModel of this.#domModels) {
      this.modelRemoved(domModel);
    }
    this.#domModels = [];
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this, {scoped: true});
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.requestUpdate, this);
    this.#uaShadowDOMSetting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    for (const setting of this.#settings) {
      Common.Settings.Settings.instance().moduleSetting(setting.name).removeChangeListener(this.requestUpdate, this);
    }
    SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.requestUpdate, this);
    this.#uaShadowDOMSetting.removeChangeListener(this.requestUpdate, this);
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

  override async performUpdate(): Promise<void> {
    const input: ViewInput = {
      gridElements: gridNodesToElements(await this.#fetchGridNodes()),
      flexContainerElements: flexContainerNodesToElements(await this.#fetchFlexContainerNodes()),
      onEnumSettingChange: this.#onEnumSettingChange.bind(this),
      onElementClick: this.#onElementClick.bind(this),
      onColorChange: this.#onColorChange.bind(this),
      onMouseLeave: this.#onElementMouseLeave.bind(this),
      onMouseEnter: this.#onElementMouseEnter.bind(this),
      onElementToggle: this.#onElementToggle.bind(this),
      onBooleanSettingChange: this.#onBooleanSettingChange.bind(this),
      enumSettings: this.#getEnumSettings(),
      booleanSettings: this.#getBooleanSettings(),
      onSummaryKeyDown: this.#onSummaryKeyDown.bind(this),
    };

    this.#view(input, {}, this.contentElement);
  }

  #getEnumSettings(): EnumSetting[] {
    return this.#settings.filter(isEnumSetting);
  }

  #getBooleanSettings(): BooleanSetting[] {
    return this.#settings.filter(isBooleanSetting);
  }

  #onBooleanSettingChange(setting: BooleanSetting, event: Event): void {
    event.preventDefault();
    this.onSettingChanged(setting.name, (event.target as UI.UIUtils.CheckboxLabel).checked);
  }

  #onEnumSettingChange(setting: EnumSetting, event: HTMLInputElementEvent): void {
    event.preventDefault();
    this.onSettingChanged(setting.name, event.target.value);
  }

  #onElementToggle(element: LayoutElement, event: Event): void {
    event.preventDefault();
    element.toggle((event.target as UI.UIUtils.CheckboxLabel).checked);
  }

  #onElementClick(element: LayoutElement, event: MouseEvent): void {
    event.preventDefault();
    element.reveal();
  }

  #onColorChange(element: LayoutElement, event: HTMLInputElementEvent): void {
    event.preventDefault();
    element.setColor(event.target.value);
    this.requestUpdate();
  }

  #onElementMouseEnter(element: LayoutElement, event: MouseEvent): void {
    event.preventDefault();
    element.highlight();
  }

  #onElementMouseLeave(element: LayoutElement, event: MouseEvent): void {
    event.preventDefault();
    element.hideHighlight();
  }
}
