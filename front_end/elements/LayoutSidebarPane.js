// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ElementsPanel} from './ElementsPanel.js';
import {createLayoutPane, LayoutElement} from './LayoutPane_bridge.js';  // eslint-disable-line no-unused-vars

/**
 * @param {!Array<!SDK.DOMModel.DOMNode>} nodes
 * @return {!Array<!LayoutElement>}
 */
const gridNodesToElements = nodes => {
  return nodes.map(node => {
    const className = node.getAttribute('class');
    const nodeId = node.id;
    return {
      id: nodeId,
      color: node.domModel().overlayModel().colorOfGridInPersistentOverlay(nodeId) || '#000',
      name: node.localName(),
      domId: node.getAttribute('id'),
      domClasses: className ? className.split(/\s+/).filter(s => !!s) : undefined,
      enabled: node.domModel().overlayModel().isHighlightedGridInPersistentOverlay(nodeId),
      reveal: () => {
        ElementsPanel.instance().revealAndSelectNode(node, true, true);
        node.scrollIntoView();
      },
      highlight: () => {
        node.highlight();
      },
      hideHighlight: () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      },
      toggle: value => {
        if (value) {
          node.domModel().overlayModel().highlightGridInPersistentOverlay(
              nodeId, Host.UserMetrics.GridOverlayOpener.LayoutPane);
        } else {
          node.domModel().overlayModel().hideGridInPersistentOverlay(nodeId);
        }
      },
      setColor(value) {
        this.color = value;
        node.domModel().overlayModel().setColorOfGridInPersistentOverlay(nodeId, value);
      },
    };
  });
};

/**
 * @unrestricted
 */
export class LayoutSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true /* isWebComponent */);
    this._layoutPane = createLayoutPane();
    this.contentElement.appendChild(this._layoutPane);
    this._settings = ['showGridLineLabels', 'showGridTrackSizes', 'showGridAreas', 'extendGridLines'];
    this._uaShadowDOMSetting = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM');
    this._boundOnSettingChanged = this.onSettingChanged.bind(this);
    /**
     * @type {!Array<!SDK.DOMModel.DOMModel>}
     */
    this._domModels = [];
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  modelAdded(domModel) {
    const overlayModel = domModel.overlayModel();
    overlayModel.addEventListener(SDK.OverlayModel.Events.PersistentGridOverlayCleared, this.update, this);
    overlayModel.addEventListener(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, this.update, this);
    this._domModels.push(domModel);
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  modelRemoved(domModel) {
    const overlayModel = domModel.overlayModel();
    overlayModel.removeEventListener(SDK.OverlayModel.Events.PersistentGridOverlayCleared, this.update, this);
    overlayModel.removeEventListener(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, this.update, this);
    this._domModels = this._domModels.filter(model => model !== domModel);
  }

  async _fetchGridNodes() {
    const showUAShadowDOM = this._uaShadowDOMSetting.get();

    const nodes = [];
    for (const domModel of this._domModels) {
      const nodeIds = await domModel.getNodesByStyle(
          [{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}], true /* pierce */);
      for (const nodeId of nodeIds) {
        const node = domModel.nodeForId(nodeId);
        if (node !== null && (showUAShadowDOM || !node.ancestorUserAgentShadowRoot())) {
          nodes.push(node);
        }
      }
    }

    return nodes;
  }

  _mapSettings() {
    const settings = [];
    for (const settingName of this._settings) {
      const setting = Common.Settings.Settings.instance().moduleSetting(settingName);
      const ext = setting.extension();
      if (!ext) {
        continue;
      }
      const descriptor = ext.descriptor();
      settings.push({
        type: /** @type {string} */ (descriptor.settingType),
        name: descriptor.settingName,
        title: descriptor.title ? ls(descriptor.title) : '',
        value: setting.get(),
        options: descriptor.options ? descriptor.options.map(opt => ({
                                                               title: ls(opt.title),
                                                               value: /** @type {string} */ (opt.value),
                                                             })) :
                                      []
      });
    }
    return settings;
  }

  /**
   * @override
   * @protected
   * @return {!Promise<void>}
   */
  async doUpdate() {
    this._layoutPane.data = {
      gridElements: gridNodesToElements(await this._fetchGridNodes()),
      settings: this._mapSettings(),
    };
  }

  /**
   * @param {*} event
   */
  onSettingChanged(event) {
    Common.Settings.Settings.instance().moduleSetting(event.data.setting).set(event.data.value);
  }

  /**
   * @override
   */
  wasShown() {
    for (const setting of this._settings) {
      Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(this.update, this);
    }
    this._layoutPane.addEventListener('setting-changed', this._boundOnSettingChanged);
    for (const domModel of this._domModels) {
      this.modelRemoved(domModel);
    }
    this._domModels = [];
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this._uaShadowDOMSetting.addChangeListener(this.update, this);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    for (const setting of this._settings) {
      Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(this.update, this);
    }
    this._layoutPane.removeEventListener('setting-changed', this._boundOnSettingChanged);
    SDK.SDKModel.TargetManager.instance().unobserveModels(SDK.DOMModel.DOMModel, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this._uaShadowDOMSetting.removeChangeListener(this.update, this);
  }
}
