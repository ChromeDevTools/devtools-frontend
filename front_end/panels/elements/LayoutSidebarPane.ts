// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsComponents from './components/components.js';

import {ElementsPanel} from './ElementsPanel.js';

const nodeToLayoutElement = (node: SDK.DOMModel.DOMNode): ElementsComponents.LayoutPane.LayoutElement => {
  const className = node.getAttribute('class');
  const nodeId = node.id;
  return {
    id: nodeId,
    color: '#000',
    name: node.localName(),
    domId: node.getAttribute('id'),
    domClasses: className ? className.split(/\s+/).filter(s => Boolean(s)) : undefined,
    enabled: false,
    reveal: (): void => {
      ElementsPanel.instance().revealAndSelectNode(node, true, true);
      node.scrollIntoView();
    },
    highlight: (): void => {
      node.highlight();
    },
    hideHighlight: (): void => {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    },
    toggle: (_value: boolean): never => {
      throw new Error('Not implemented');
    },
    setColor(_value: string): never {
      throw new Error('Not implemented');
    },
  };
};

const gridNodesToElements = (nodes: SDK.DOMModel.DOMNode[]): ElementsComponents.LayoutPane.LayoutElement[] => {
  return nodes.map(node => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color: node.domModel().overlayModel().colorOfGridInPersistentOverlay(nodeId) || '#000',
      enabled: node.domModel().overlayModel().isHighlightedGridInPersistentOverlay(nodeId),
      toggle: (value: boolean): void => {
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

let layoutSidebarPaneInstance: LayoutSidebarPane;

const flexContainerNodesToElements = (nodes: SDK.DOMModel.DOMNode[]): ElementsComponents.LayoutPane.LayoutElement[] => {
  return nodes.map(node => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color: node.domModel().overlayModel().colorOfFlexInPersistentOverlay(nodeId) || '#000',
      enabled: node.domModel().overlayModel().isHighlightedFlexContainerInPersistentOverlay(nodeId),
      toggle: (value: boolean): void => {
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

export class LayoutSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  _layoutPane: ElementsComponents.LayoutPane.LayoutPane;
  _settings: string[];
  _uaShadowDOMSetting: Common.Settings.Setting<boolean>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _boundOnSettingChanged: (event: any) => void;
  _domModels: SDK.DOMModel.DOMModel[];

  constructor() {
    super(true /* isWebComponent */);
    this._layoutPane = new ElementsComponents.LayoutPane.LayoutPane();
    this.contentElement.appendChild(this._layoutPane);
    this._settings = ['showGridLineLabels', 'showGridTrackSizes', 'showGridAreas', 'extendGridLines'];
    this._uaShadowDOMSetting = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM');
    this._boundOnSettingChanged = this.onSettingChanged.bind(this);
    this._domModels = [];
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): LayoutSidebarPane {
    const {forceNew} = opts;
    if (!layoutSidebarPaneInstance || forceNew) {
      layoutSidebarPaneInstance = new LayoutSidebarPane();
    }

    return layoutSidebarPaneInstance;
  }

  modelAdded(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.addEventListener(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, this.update, this);
    overlayModel.addEventListener(
        SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, this.update, this);
    this._domModels.push(domModel);
  }

  modelRemoved(domModel: SDK.DOMModel.DOMModel): void {
    const overlayModel = domModel.overlayModel();
    overlayModel.removeEventListener(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, this.update, this);
    overlayModel.removeEventListener(
        SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, this.update, this);
    this._domModels = this._domModels.filter(model => model !== domModel);
  }

  async _fetchNodesByStyle(style: {
    name: string,
    value: string,
  }[]): Promise<SDK.DOMModel.DOMNode[]> {
    const showUAShadowDOM = this._uaShadowDOMSetting.get();

    const nodes = [];
    for (const domModel of this._domModels) {
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

  async _fetchGridNodes(): Promise<SDK.DOMModel.DOMNode[]> {
    return await this._fetchNodesByStyle([{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}]);
  }

  async _fetchFlexContainerNodes(): Promise<SDK.DOMModel.DOMNode[]> {
    return await this._fetchNodesByStyle([{name: 'display', value: 'flex'}, {name: 'display', value: 'inline-flex'}]);
  }

  _mapSettings(): ElementsComponents.LayoutPaneUtils.Setting[] {
    const settings = [];
    for (const settingName of this._settings) {
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

  async doUpdate(): Promise<void> {
    this._layoutPane.data = {
      gridElements: gridNodesToElements(await this._fetchGridNodes()),
      flexContainerElements: flexContainerNodesToElements(await this._fetchFlexContainerNodes()),
      settings: this._mapSettings(),
    };
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSettingChanged(event: any): void {
    Common.Settings.Settings.instance().moduleSetting(event.data.setting).set(event.data.value);
  }

  wasShown(): void {
    for (const setting of this._settings) {
      Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(this.update, this);
    }
    this._layoutPane.addEventListener('settingchanged', this._boundOnSettingChanged);
    for (const domModel of this._domModels) {
      this.modelRemoved(domModel);
    }
    this._domModels = [];
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this._uaShadowDOMSetting.addChangeListener(this.update, this);
    this.update();
  }

  willHide(): void {
    for (const setting of this._settings) {
      Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(this.update, this);
    }
    this._layoutPane.removeEventListener('settingchanged', this._boundOnSettingChanged);
    SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this._uaShadowDOMSetting.removeChangeListener(this.update, this);
  }
}
