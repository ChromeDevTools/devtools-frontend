// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import layerTreeOutlineStyles from './layerTreeOutline.css.js';
import { LayerSelection, } from './LayerViewHost.js';
const UIStrings = {
    /**
     * @description A count of the number of rendering layers in Layer Tree Outline of the Layers panel
     * @example {10} PH1
     */
    layerCount: '{PH1} layers',
    /**
     * @description Label for layers sidepanel tree
     */
    layersTreePane: 'Layers Tree Pane',
    /**
     * @description A context menu item in the DView of the Layers panel
     */
    showPaintProfiler: 'Show Paint Profiler',
    /**
     * @description Details text content in Layer Tree Outline of the Layers panel
     * @example {10} PH1
     * @example {10} PH2
     */
    updateChildDimension: ' ({PH1} × {PH2})',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/LayerTreeOutline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { ref, repeat } = Directives;
export const DEFAULT_VIEW = (input, output, target) => {
    const renderNode = (node) => {
        const layer = node.layer;
        const domNode = layer.nodeForSelfOrAncestor();
        const titleText = domNode ? domNode.simpleSelector() : '#' + layer.id();
        const detailsText = i18nString(UIStrings.updateChildDimension, { PH1: layer.width(), PH2: layer.height() });
        const isSelected = layer === input.selectedLayer;
        const isHovered = layer === input.hoveredLayer;
        // clang-format off
        return html `
      <li role="treeitem"
          data-layer-id=${layer.id()}
          class=${isHovered ? 'hovered' : ''}
          ?selected=${isSelected}
          aria-expanded=${node.isExpanded ? 'true' : 'false'}
          @select=${() => input.onSelect(layer)}
          @mouseenter=${() => input.onHover(layer)}
          @mouseleave=${() => input.onHover(null)}>
        <span class="tree-node-title" @contextmenu=${(event) => {
            input.onContextMenu(event, layer);
            event.stopPropagation();
        }}>
          ${titleText} <span class="dimmed">${detailsText}</span>
        </span>
        ${node.children.length > 0 ? html `<ul role="group">${repeat(node.children, n => n.layer.id(), renderNode)}</ul>` : nothing}
      </li>
    `;
        // clang-format on
    };
    // clang-format off
    render(html `
    <style>${layerTreeOutlineStyles}</style>
    <div class="vbox layer-tree-wrapper" jslog=${VisualLogging.pane('layers-tree')}>
      <devtools-tree class="layer-tree overflow-auto"
        @contextmenu=${(event) => input.onContextMenu(event, null)}
        ${ref((el) => {
        if (el) {
            output.focusTree = () => {
                el.focus();
            };
            output.revealLayer = (layer) => {
                const li = el.querySelector(`li[data-layer-id="${layer.id()}"]`);
                if (li) {
                    // Toggling the selected attribute forces TreeViewElement to scroll the node into view.
                    li.removeAttribute('selected');
                    li.setAttribute('selected', '');
                }
            };
        }
    })}
        .template=${html `
          <style>${layerTreeOutlineStyles}</style>
          <ul role="tree" aria-label=${i18nString(UIStrings.layersTreePane)}>
            ${input.treeData.map(renderNode)}
          </ul>
        `}>
      </devtools-tree>
      <div class="hbox layer-summary">
        <span class="layer-count">${i18nString(UIStrings.layerCount, {
        PH1: input.layerCount,
    })}</span>
        <span>${i18n.ByteUtilities.bytesToString(input.totalLayerMemory)}</span>
      </div>
    </div>
  `, target);
    // clang-format on
};
export class LayerTreeOutline extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    layerViewHost;
    layerTree;
    layerSnapshotMap;
    #layerCount = 0;
    #totalLayerMemory = 0;
    #treeData = [];
    #viewOutput = {};
    #view;
    #hoveredLayer = null;
    constructor(layerViewHost, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.layerViewHost = layerViewHost;
        this.layerViewHost.registerView(this);
        this.layerViewHost.showInternalLayersSetting().addChangeListener(this.update, this);
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            treeData: this.#treeData,
            selectedLayer: this.layerViewHost.selection()?.layer() || null,
            hoveredLayer: this.#hoveredLayer,
            layerCount: this.#layerCount,
            totalLayerMemory: this.#totalLayerMemory,
            onSelect: this.onSelect.bind(this),
            onHover: this.onHover.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        }, this.#viewOutput, this.contentElement);
    }
    focus() {
        this.#viewOutput.focusTree?.();
    }
    selectObject(selection) {
        this.hoverObject(null);
        this.requestUpdate();
        if (selection) {
            // Defer revealLayer to ensure Lit has finished rendering DOM updates
            queueMicrotask(() => {
                this.#viewOutput.revealLayer?.(selection.layer());
            });
        }
    }
    hoverObject(selection) {
        this.#hoveredLayer = selection?.layer() || null;
        this.requestUpdate();
    }
    setLayerTree(layerTree) {
        this.layerTree = layerTree;
        this.update();
    }
    update() {
        let layerCount = 0;
        let totalLayerMemory = 0;
        const showInternalLayers = this.layerViewHost.showInternalLayersSetting().get();
        let root = null;
        if (this.layerTree) {
            if (!showInternalLayers) {
                root = this.layerTree.contentRoot();
            }
            if (!root) {
                root = this.layerTree.root();
            }
        }
        const childrenMap = new Map();
        if (this.layerTree && root) {
            const buildTree = (layer) => {
                if (!layer.drawsContent() && !showInternalLayers) {
                    return;
                }
                layerCount++;
                totalLayerMemory += layer.gpuMemoryUsage();
                if (layer === root) {
                    return;
                }
                let parentLayer = layer.parent();
                // Skip till nearest visible ancestor.
                while (parentLayer && parentLayer !== root && !parentLayer.drawsContent() && !showInternalLayers) {
                    parentLayer = parentLayer.parent();
                }
                if (parentLayer) {
                    let children = childrenMap.get(parentLayer);
                    if (!children) {
                        children = [];
                        childrenMap.set(parentLayer, children);
                    }
                    children.push(layer);
                }
                else {
                    console.assert(false, 'Internal error: multiple root layers');
                }
            };
            this.layerTree.forEachLayer(buildTree, root);
        }
        const makeTreeNode = (layer) => {
            const children = childrenMap.get(layer) || [];
            return {
                layer,
                isExpanded: !layer.drawsContent(),
                children: children.map(makeTreeNode),
            };
        };
        this.#treeData = root && (root.drawsContent() || showInternalLayers) ? [makeTreeNode(root)] : [];
        this.#layerCount = layerCount;
        this.#totalLayerMemory = totalLayerMemory;
        this.requestUpdate();
        if (!this.layerViewHost.selection() && this.layerTree && this.#treeData.length > 0) {
            const elementToSelect = this.layerTree.contentRoot() || this.layerTree.root();
            if (elementToSelect) {
                this.layerViewHost.selectObject(new LayerSelection(elementToSelect));
            }
        }
    }
    onHover(layer) {
        this.layerViewHost.hoverObject(layer ? new LayerSelection(layer) : null);
    }
    onSelect(layer) {
        if (this.layerViewHost.selection()?.layer() === layer) {
            return;
        }
        this.layerViewHost.selectObject(new LayerSelection(layer));
    }
    onContextMenu(event, layer) {
        const selection = layer ? new LayerSelection(layer) : null;
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        this.layerSnapshotMap = this.layerViewHost.getLayerSnapshotMap();
        if (layer && this.layerSnapshotMap.has(layer) && selection) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.showPaintProfiler), () => this.dispatchEventToListeners("PaintProfilerRequested" /* Events.PAINT_PROFILER_REQUESTED */, selection), { jslogContext: 'layers.paint-profiler' });
        }
        this.layerViewHost.showContextMenu(contextMenu, selection);
    }
}
//# sourceMappingURL=LayerTreeOutline.js.map