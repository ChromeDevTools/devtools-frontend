// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ElementsPanel} from './ElementsPanel.js';
import layersWidgetStyles from './layersWidget.css.js';

const UIStrings = {
  /**
   * @description Title of a section in the Element State Pane Widget of the Elements panel.
   * The widget shows the layers present in the context of the currently selected node.
   * */
  cssLayersTitle: 'CSS layers',
  /**
   * @description Tooltip text in Element State Pane Widget of the Elements panel.
   * For a button that opens a tool that shows the layers present in the current document.
   */
  toggleCSSLayers: 'Toggle CSS Layers view',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/LayersWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let layersWidgetInstance: LayersWidget;

export class LayersWidget extends UI.Widget.Widget {
  private cssModel?: SDK.CSSModel.CSSModel|null;
  private layerTreeComponent = new TreeOutline.TreeOutline.TreeOutline<string>();

  constructor() {
    super(true);

    this.contentElement.className = 'styles-layers-pane';
    this.contentElement.setAttribute('jslog', `${VisualLogging.cssLayersPane()}`);
    UI.UIUtils.createTextChild(this.contentElement.createChild('div'), i18nString(UIStrings.cssLayersTitle));

    this.contentElement.appendChild(this.layerTreeComponent);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
  }

  private updateModel(cssModel: SDK.CSSModel.CSSModel|null): void {
    if (this.cssModel === cssModel) {
      return;
    }
    if (this.cssModel) {
      this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.update, this);
    }
    this.cssModel = cssModel;
    if (this.cssModel) {
      this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.update, this);
    }
  }

  override async wasShown(): Promise<void> {
    super.wasShown();
    this.registerCSSFiles([layersWidgetStyles]);
    return this.update();
  }

  private async update(): Promise<void> {
    if (!this.isShowing()) {
      return;
    }

    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }
    if (!node) {
      // do something meaningful?
      return;
    }

    this.updateModel(node.domModel().cssModel());
    if (!this.cssModel) {
      return;
    }
    const makeTreeNode = (parentId: string) =>
        (layer: Protocol.CSS.CSSLayerData): TreeOutline.TreeOutlineUtils.TreeNode<string> => {
          const subLayers = layer.subLayers;
          const name = SDK.CSSModel.CSSModel.readableLayerName(layer.name);
          const treeNodeData = layer.order + ': ' + name;
          const id = parentId ? parentId + '.' + name : name;
          if (!subLayers) {
            return {treeNodeData, id};
          }
          return {
            treeNodeData,
            id,
            children: (): Promise<TreeOutline.TreeOutlineUtils.TreeNode<string>[]> =>
                Promise.resolve(subLayers.sort((layer1, layer2) => layer1.order - layer2.order).map(makeTreeNode(id))),
          };
        };
    const rootLayer = await this.cssModel.getRootLayer(node.id);
    this.layerTreeComponent.data = {
      defaultRenderer: TreeOutline.TreeOutline.defaultRenderer,
      tree: [makeTreeNode('')(rootLayer)],
    };

    // We only expand the first 5 user-defined layers to not make the
    // view too overwhelming.
    await this.layerTreeComponent.expandRecursively(5);
  }

  async revealLayer(layerName: string): Promise<void> {
    if (!this.isShowing()) {
      ElementsPanel.instance().showToolbarPane(this, ButtonProvider.instance().item());
    }
    await this.update();
    return this.layerTreeComponent.expandToAndSelectTreeNodeId('implicit outer layer.' + layerName);
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): LayersWidget {
    const {forceNew} = opts;
    if (!layersWidgetInstance || forceNew) {
      layersWidgetInstance = new LayersWidget();
    }

    return layersWidgetInstance;
  }
}

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarToggle;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleCSSLayers), 'layers', 'layers-filled');
    this.button.setVisible(false);
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clicked, this);
    this.button.element.classList.add('monospace');
    this.button.element.setAttribute(
        'jslog', `${VisualLogging.toggleSubpane().track({click: true}).context('cssLayers')}`);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ButtonProvider {
    const {forceNew} = opts;
    if (!buttonProviderInstance || forceNew) {
      buttonProviderInstance = new ButtonProvider();
    }

    return buttonProviderInstance;
  }

  private clicked(): void {
    const view = LayersWidget.instance();
    ElementsPanel.instance().showToolbarPane(!view.isShowing() ? view : null, this.button);
  }

  item(): UI.Toolbar.ToolbarToggle {
    return this.button;
  }
}
