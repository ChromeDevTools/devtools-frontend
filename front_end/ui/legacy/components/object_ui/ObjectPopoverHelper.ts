// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Geometry from '../../../../models/geometry/geometry.js';
import * as UI from '../../legacy.js';
import * as Components from '../utils/utils.js';

import {CustomPreviewComponent} from './CustomPreviewComponent.js';
import objectPopoverStyles from './objectPopover.css.js';
import {ObjectPropertiesSection} from './ObjectPropertiesSection.js';
import objectValueStyles from './objectValue.css.js';

const UIStrings = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/ObjectPopoverHelper.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ObjectPopoverHelper {
  private readonly linkifier: Components.Linkifier.Linkifier|null;
  private readonly resultHighlightedAsDOM: boolean;
  constructor(linkifier: Components.Linkifier.Linkifier|null, resultHighlightedAsDOM: boolean) {
    this.linkifier = linkifier;
    this.resultHighlightedAsDOM = resultHighlightedAsDOM;
  }

  dispose(): void {
    if (this.resultHighlightedAsDOM) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    if (this.linkifier) {
      this.linkifier.dispose();
    }
  }

  static async buildObjectPopover(result: SDK.RemoteObject.RemoteObject, popover: UI.GlassPane.GlassPane):
      Promise<ObjectPopoverHelper|null> {
    const description = Platform.StringUtilities.trimEndWithMaxLength(result.description || '', MaxPopoverTextLength);
    let popoverContentElement: HTMLSpanElement|HTMLDivElement|null = null;
    if (result.type === 'function' || result.type === 'object') {
      let linkifier: Components.Linkifier.Linkifier|null = null;
      let resultHighlightedAsDOM = false;
      if (result.subtype === 'node') {
        SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result);
        resultHighlightedAsDOM = true;
      }

      if (result.customPreview()) {
        const customPreviewComponent = new CustomPreviewComponent(result);
        customPreviewComponent.expandIfPossible();
        popoverContentElement = customPreviewComponent.element;
      } else {
        popoverContentElement = document.createElement('div');
        popoverContentElement.classList.add('object-popover-content');
        popover.registerRequiredCSS(objectValueStyles, objectPopoverStyles);
        const titleElement = popoverContentElement.createChild('div', 'object-popover-title');
        if (result.type === 'function') {
          titleElement.classList.add('source-code');
          titleElement.appendChild(ObjectPropertiesSection.valueElementForFunctionDescription(result.description));
        } else {
          titleElement.classList.add('monospace');
          titleElement.createChild('span').textContent = description;
        }
        linkifier = new Components.Linkifier.Linkifier();
        const section = new ObjectPropertiesSection(result, '', linkifier, true /* showOverflow */);
        section.element.classList.add('object-popover-tree');
        section.titleLessMode();
        popoverContentElement.appendChild(section.element);
      }
      popoverContentElement.dataset.stableNameForTest = 'object-popover-content';
      popover.setMaxContentSize(new Geometry.Size(300, 250));
      popover.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_SIZE);
      popover.contentElement.appendChild(popoverContentElement);
      return new ObjectPopoverHelper(linkifier, resultHighlightedAsDOM);
    }

    popoverContentElement = document.createElement('span');
    popoverContentElement.dataset.stableNameForTest = 'object-popover-content';
    popover.registerRequiredCSS(objectValueStyles, objectPopoverStyles);
    const valueElement = popoverContentElement.createChild('span', 'monospace object-value-' + result.type);
    valueElement.style.whiteSpace = 'pre';

    if (result.type === 'string') {
      UI.UIUtils.createTextChildren(valueElement, `"${description}"`);
    } else {
      valueElement.textContent = description;
    }

    popover.contentElement.appendChild(popoverContentElement);
    return new ObjectPopoverHelper(null, false);
  }

  static buildDescriptionPopover(description: string, link: string, popover: UI.GlassPane.GlassPane):
      ObjectPopoverHelper {
    const popoverContentElement = document.createElement('div');
    popoverContentElement.classList.add('object-popover-description-box');
    const descriptionDiv = document.createElement('div');
    descriptionDiv.dataset.stableNameForTest = 'object-popover-content';
    popover.registerRequiredCSS(objectPopoverStyles);
    descriptionDiv.textContent = description;
    const learnMoreLink =
        UI.XLink.XLink.create(link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more');
    const footerDiv = document.createElement('div');
    footerDiv.classList.add('object-popover-footer');
    footerDiv.appendChild(learnMoreLink);

    popoverContentElement.appendChild(descriptionDiv);
    popoverContentElement.appendChild(footerDiv);
    popover.contentElement.appendChild(popoverContentElement);
    return new ObjectPopoverHelper(null, false);
  }
}

const MaxPopoverTextLength = 10000;
