// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Lit from '../../third_party/lit/lit.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ElementsPanel} from './ElementsPanel.js';
import layersWidgetStyles from './layersWidget.css.js';

const {render, html, Directives: {ref}} = Lit;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/LayersWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  rootLayer: Protocol.CSS.CSSLayerData;
}

interface ViewOutput {
  treeOutline: TreeOutline.TreeOutline.TreeOutline<string>|undefined;
}

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => {
  const makeTreeNode = (parentId: string) => (layer: Protocol.CSS.CSSLayerData) => {
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
      children: async () => subLayers.sort((layer1, layer2) => layer1.order - layer2.order).map(makeTreeNode(id)),
    };
  };
  const {defaultRenderer} = TreeOutline.TreeOutline;
  const tree = [makeTreeNode('')(input.rootLayer)];
  const data: TreeOutline.TreeOutline.TreeOutlineData<string> = {
    defaultRenderer,
    tree,
  };
  const captureTreeOutline = (e?: Element): void => {
    output.treeOutline = e as typeof output.treeOutline;
  };
  const template = html`
  <style>${layersWidgetStyles}</style>
  <div class="layers-widget">
    <div class="layers-widget-title">${UIStrings.cssLayersTitle}</div>
    <devtools-tree-outline ${ref(captureTreeOutline)}
                           .data=${data}></devtools-tree-outline>
  </div>
  `;
  render(template, target);
};

let layersWidgetInstance: LayersWidget;

export class LayersWidget extends UI.Widget.Widget {
  #node: SDK.DOMModel.DOMNode|null = null;
  #view: View;
  #layerToReveal: string|null = null;

  constructor(view: View = DEFAULT_VIEW) {
    super({jslog: `${VisualLogging.pane('css-layers')}`});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#onDOMNodeChanged, this);
    this.#onDOMNodeChanged({data: UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode)});
  }

  override wasHidden(): void {
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#onDOMNodeChanged, this);
    this.#onDOMNodeChanged({data: null});
    super.wasHidden();
  }

  #onDOMNodeChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode|null>): void {
    const node = event.data?.enclosingElementOrSelf();
    if (this.#node === node) {
      return;
    }
    if (this.#node) {
      this.#node.domModel().cssModel().removeEventListener(
          SDK.CSSModel.Events.StyleSheetChanged, this.requestUpdate, this);
    }
    this.#node = event.data;
    if (this.#node) {
      this.#node.domModel().cssModel().addEventListener(
          SDK.CSSModel.Events.StyleSheetChanged, this.requestUpdate, this);
    }
    if (this.isShowing()) {
      this.requestUpdate();
    }
  }

  override async performUpdate(): Promise<void> {
    if (!this.#node) {
      return;
    }

    const rootLayer = await this.#node.domModel().cssModel().getRootLayer(this.#node.id);
    const input = {rootLayer};
    const output: ViewOutput = {treeOutline: undefined};
    this.#view(input, output, this.contentElement);

    if (output.treeOutline) {
      // We only expand the first 5 user-defined layers to not make the
      // view too overwhelming.
      await output.treeOutline.expandRecursively(5);
      if (this.#layerToReveal) {
        await output.treeOutline.expandToAndSelectTreeNodeId(this.#layerToReveal);
        this.#layerToReveal = null;
      }
    }
  }

  async revealLayer(layerName: string): Promise<void> {
    if (!this.isShowing()) {
      ElementsPanel.instance().showToolbarPane(this, ButtonProvider.instance().item());
    }
    this.#layerToReveal = `implicit outer layer.${layerName}`;
    this.requestUpdate();
    await this.updateComplete;
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
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.clicked, this);
    this.button.element.classList.add('monospace');
    this.button.element.setAttribute('jslog', `${VisualLogging.toggleSubpane('css-layers').track({click: true})}`);
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
