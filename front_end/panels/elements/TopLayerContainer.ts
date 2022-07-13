// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as ElementsComponents from './components/components.js';
import * as ElementsTreeOutline from './ElementsTreeOutline.js';

import {type ElementsTreeElement} from './ElementsTreeElement.js';

const UIStrings = {
  /**
   * @description Top layer is rendered closest to the user within a viewport, therefore its elements always appear on top of all other content
   */
  topLayer: 'top-layer',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/TopLayerContainer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class TopLayerContainer extends UI.TreeOutline.TreeElement {
  treeOutline: ElementsTreeOutline.ElementsTreeOutline|null;
  domModel: SDK.DOMModel.DOMModel;
  currentTopLayerElements: Set<ElementsTreeElement>;
  bodyElement: ElementsTreeElement;

  constructor(bodyElement: ElementsTreeElement) {
    super('#top-layer');
    this.bodyElement = bodyElement;
    this.domModel = bodyElement.node().domModel();
    this.treeOutline = null;
    this.currentTopLayerElements = new Set();
  }

  updateBody(bodyElement: ElementsTreeElement): void {
    this.bodyElement = bodyElement;
  }

  async addTopLayerElementsAsChildren(): Promise<boolean> {
    this.removeCurrentTopLayerElementsAdorners();
    this.currentTopLayerElements = new Set();
    const newTopLayerElementsIDs = await this.domModel.getTopLayerElements();
    if (newTopLayerElementsIDs === null) {
      return false;
    }
    let topLayerElementIndex = 0;
    if (newTopLayerElementsIDs) {
      for (const elementID of newTopLayerElementsIDs) {
        const topLayerDOMNode = this.domModel.idToDOMNode.get(elementID);
        // Will need to add support for backdrop in the future.
        if (topLayerDOMNode && topLayerDOMNode.nodeName() !== '::backdrop') {
          topLayerElementIndex++;
          const topLayerElementShortcut = new SDK.DOMModel.DOMNodeShortcut(
              this.domModel.target(), topLayerDOMNode.backendNodeId(), 0, topLayerDOMNode.nodeName());
          const topLayerTreeElement = this.treeOutline?.treeElementByNode.get(topLayerDOMNode);
          const topLayerElementRepresentation = new ElementsTreeOutline.ShortcutTreeElement(topLayerElementShortcut);
          if (topLayerTreeElement && !this.currentTopLayerElements.has(topLayerTreeElement)) {
            this.appendChild(topLayerElementRepresentation);
            this.addTopLayerAdorner(topLayerTreeElement, topLayerElementRepresentation, topLayerElementIndex);
            this.currentTopLayerElements.add(topLayerTreeElement);
          }
        }
      }
    }
    return topLayerElementIndex > 0;
  }

  private removeCurrentTopLayerElementsAdorners(): void {
    for (const topLayerElement of this.currentTopLayerElements) {
      topLayerElement.removeAllAdorners();
    }
  }

  private addTopLayerAdorner(
      element: ElementsTreeElement, topLayerElementRepresentation: ElementsTreeOutline.ShortcutTreeElement,
      topLayerElementIndex: number): void {
    const config = ElementsComponents.AdornerManager.getRegisteredAdorner(
        ElementsComponents.AdornerManager.RegisteredAdorners.TOP_LAYER);
    const adornerContent = document.createElement('span');
    adornerContent.classList.add('adorner-with-icon');
    const linkIcon = new IconButton.Icon.Icon();
    linkIcon
        .data = {iconName: 'ic_show_node_16x16', color: 'var(--color-text-disabled)', width: '12px', height: '12px'};
    const adornerText = document.createElement('span');
    adornerText.textContent = ` top-layer (${topLayerElementIndex}) `;
    adornerContent.append(linkIcon);
    adornerContent.append(adornerText);
    const adorner = element?.adorn(config, adornerContent);
    if (adorner) {
      const onClick = (((): void => {
                         topLayerElementRepresentation.revealAndSelect();
                       }) as EventListener);
      adorner.addInteraction(onClick, {
        isToggle: false,
        shouldPropagateOnKeydown: false,
        ariaLabelDefault: i18nString(UIStrings.topLayer),
        ariaLabelActive: i18nString(UIStrings.topLayer),
      });
      adorner.addEventListener('mousedown', e => e.consume(), false);
    }
  }
}
