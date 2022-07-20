// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
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
  domContainer: ElementsTreeOutline.ElementsTreeOutline;
  currentTopLayerElements: Set<ElementsTreeElement>;
  topLayerUpdateThrottler: Common.Throttler.Throttler;
  #inserted = false;

  constructor(domContainer: ElementsTreeOutline.ElementsTreeOutline) {
    super('#top-layer');
    this.domContainer = domContainer;
    this.currentTopLayerElements = new Set();
    this.topLayerUpdateThrottler = new Common.Throttler.Throttler(1);
  }

  async throttledUpdateTopLayerElements(): Promise<void> {
    await this.topLayerUpdateThrottler.schedule(() => this.updateTopLayerElements());
  }

  async updateTopLayerElements(): Promise<void> {
    this.removeChildren();
    this.removeCurrentTopLayerElementsAdorners();
    this.currentTopLayerElements = new Set();

    const domModel = this.domContainer.rootDOMNode?.domModel();
    if (!domModel) {
      this.hidden = true;
      return;
    }

    const newTopLayerElementsIDs = await domModel.getTopLayerElements();
    if (!newTopLayerElementsIDs || newTopLayerElementsIDs.length === 0) {
      this.hidden = true;
      return;
    }

    let topLayerElementIndex = 0;
    for (let i = 0; i < newTopLayerElementsIDs.length; i++) {
      const topLayerDOMNode = domModel.idToDOMNode.get(newTopLayerElementsIDs[i]);
      if (topLayerDOMNode && topLayerDOMNode.nodeName() !== '::backdrop') {
        const topLayerElementShortcut = new SDK.DOMModel.DOMNodeShortcut(
            domModel.target(), topLayerDOMNode.backendNodeId(), 0, topLayerDOMNode.nodeName());
        const topLayerElementRepresentation = new ElementsTreeOutline.ShortcutTreeElement(topLayerElementShortcut);
        const topLayerTreeElement = this.domContainer.treeElementByNode.get(topLayerDOMNode);
        if (!topLayerTreeElement) {
          continue;
        }

        topLayerElementIndex++;
        this.addTopLayerAdorner(topLayerTreeElement, topLayerElementRepresentation, topLayerElementIndex);
        this.currentTopLayerElements.add(topLayerTreeElement);
        this.appendChild(topLayerElementRepresentation);
        // Add the element's backdrop if previous top layer element is a backdrop.
        const previousTopLayerDOMNode = (i > 0) ? domModel.idToDOMNode.get(newTopLayerElementsIDs[i - 1]) : undefined;
        if (previousTopLayerDOMNode && previousTopLayerDOMNode.nodeName() === '::backdrop') {
          const backdropElementShortcut = new SDK.DOMModel.DOMNodeShortcut(
              domModel.target(), previousTopLayerDOMNode.backendNodeId(), 0, previousTopLayerDOMNode.nodeName());
          const backdropElementRepresentation = new ElementsTreeOutline.ShortcutTreeElement(backdropElementShortcut);
          topLayerElementRepresentation.appendChild(backdropElementRepresentation);
        }
      }
    }

    this.hidden = topLayerElementIndex <= 0;
    if (!this.hidden && !this.#inserted) {
      this.domContainer.appendChild(this);
      this.#inserted = true;
    }
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
