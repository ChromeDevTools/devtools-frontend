// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SourceFrame.PreviewFactory = class {
  /**
   * @param {!Common.ContentProvider} provider
   * @param {string} mimeType
   * @returns {!Promise<?UI.Widget>}
   */
  static async createPreview(provider, mimeType) {
    var content = await provider.requestContent();
    if (!content)
      return new UI.EmptyWidget(Common.UIString('Nothing to preview'));

    var resourceType = Common.ResourceType.fromMimeType(mimeType);
    if (resourceType === Common.resourceTypes.Other)
      resourceType = provider.contentType();

    switch (resourceType) {
      case Common.resourceTypes.Image:
        return new SourceFrame.ImageView(mimeType, provider);
      case Common.resourceTypes.Font:
        return new SourceFrame.FontView(mimeType, provider);
    }

    var parsedXML = SourceFrame.XMLView.parseXML(content, mimeType);
    if (parsedXML)
      return SourceFrame.XMLView.createSearchableView(parsedXML);

    // We support non-strict JSON parsing by parsing an AST tree which is why we offload it to a worker.
    var parsedJSON = await SourceFrame.JSONView.parseJSON(content);
    if (parsedJSON && typeof parsedJSON.data === 'object')
      return SourceFrame.JSONView.createSearchableView(/** @type {!SourceFrame.ParsedJSON} */ (parsedJSON));

    if (resourceType.isTextType()) {
      var highlighterType =
          provider.contentType().canonicalMimeType() || mimeType.replace(/;.*/, '');  // remove charset
      return SourceFrame.ResourceSourceFrame.createSearchableView(
          provider, highlighterType, true /* autoPrettyPrint */);
    }

    return null;
  }
};
