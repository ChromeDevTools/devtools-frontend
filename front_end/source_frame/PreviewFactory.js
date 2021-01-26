// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {FontView} from './FontView.js';
import {ImageView} from './ImageView.js';
import {JSONView} from './JSONView.js';
import {ResourceSourceFrame} from './ResourceSourceFrame.js';
import {XMLView} from './XMLView.js';

export const UIStrings = {
  /**
  *@description Text in Preview Factory of the Sources panel
  */
  nothingToPreview: 'Nothing to preview',
};
const str_ = i18n.i18n.registerUIStrings('source_frame/PreviewFactory.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PreviewFactory {
  /**
   * @param {!TextUtils.ContentProvider.ContentProvider} provider
   * @param {string} mimeType
   * @returns {!Promise<?UI.Widget.Widget>}
   */
  static async createPreview(provider, mimeType) {
    let resourceType = Common.ResourceType.ResourceType.fromMimeType(mimeType);
    if (resourceType === Common.ResourceType.resourceTypes.Other) {
      resourceType = provider.contentType();
    }

    switch (resourceType) {
      case Common.ResourceType.resourceTypes.Image:
        return new ImageView(mimeType, provider);
      case Common.ResourceType.resourceTypes.Font:
        return new FontView(mimeType, provider);
    }

    const deferredContent = await provider.requestContent();
    if (deferredContent.content === null) {
      return new UI.EmptyWidget.EmptyWidget(deferredContent.error);
    }
    if (!deferredContent.content) {
      return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.nothingToPreview));
    }

    let content = deferredContent.content;
    if (await provider.contentEncoded()) {
      content = window.atob(content);
    }

    const parsedXML = XMLView.parseXML(content, mimeType);
    if (parsedXML) {
      return XMLView.createSearchableView(parsedXML);
    }

    const jsonView = await JSONView.createView(content);
    if (jsonView) {
      return jsonView;
    }

    if (resourceType.isTextType()) {
      const highlighterType =
          mimeType.replace(/;.*/, '') /* remove charset */ || provider.contentType().canonicalMimeType();
      return ResourceSourceFrame.createSearchableView(provider, highlighterType, true /* autoPrettyPrint */);
    }

    return null;
  }
}
