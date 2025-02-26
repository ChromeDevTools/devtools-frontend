/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../legacy.js';
import * as Components from '../utils/utils.js';

import {CustomPreviewComponent} from './CustomPreviewComponent.js';
import objectPopoverStyles from './objectPopover.css.js';
import {ObjectPropertiesSection} from './ObjectPropertiesSection.js';
import objectValueStyles from './objectValue.css.js';

const UIStrings = {
  /**
   *@description Text that is usually a hyperlink to more documentation
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
      popover.setMaxContentSize(new UI.Geometry.Size(300, 250));
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
