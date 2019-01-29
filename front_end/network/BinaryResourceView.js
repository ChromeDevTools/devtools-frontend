// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Network.BinaryResourceView = class extends UI.VBox {
  /**
   * @param {string} base64content
   * @param {string} contentUrl
   * @param {!Common.ResourceType} resourceType
   */
  constructor(base64content, contentUrl, resourceType) {
    super();

    if (!base64content.length) {
      new UI.EmptyWidget('No data present in selected item').show(this.element);
      return;
    }

    const binaryResourceViewFactory =
        new SourceFrame.BinaryResourceViewFactory(base64content, contentUrl, resourceType);

    const tabbedPane = new UI.TabbedPane();
    tabbedPane.appendTab(
        'base64-tab-id', 'Base64', binaryResourceViewFactory.createBase64View(),
        ls`View selected binary WebSocket message as a Base64 string`);
    tabbedPane.appendTab(
        'hex-tab-id', 'Hex', binaryResourceViewFactory.createHexView(),
        ls`View selected binary WebSocket message as a hexadecimal string`);
    tabbedPane.appendTab(
        'hex-viewer-tab-id', 'Hex Viewer', binaryResourceViewFactory.createHexViewerView(),
        ls`View selected binary WebSocket message in a hex viewer`);
    tabbedPane.appendTab(
        'utf8-id', 'UTF-8', binaryResourceViewFactory.createUtf8View(),
        ls`View selected binary WebSocket message decoded as UTF-8`);
    tabbedPane.show(this.element);
  }
};
