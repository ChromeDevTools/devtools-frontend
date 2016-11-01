// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.DataSaverInfobar = class extends WebInspector.Infobar {
  constructor() {
    super(
        WebInspector.Infobar.Type.Warning,
        WebInspector.UIString('Consider disabling Chrome Data Saver while debugging.'),
        WebInspector.settings.moduleSetting('disableDataSaverInfobar'));
    var message = this.createDetailsRowMessage();
    message.createTextChild('More information about  ');
    message.appendChild(WebInspector.linkifyURLAsNode(
        'https://support.google.com/chrome/answer/2392284?hl=en', 'Chrome Data Saver', undefined, true));
    message.createTextChild('.');
  }

  /**
   * @param {!WebInspector.Panel} panel
   */
  static maybeShowInPanel(panel) {
    if (Runtime.queryParam('remoteFrontend')) {
      var infobar = new WebInspector.DataSaverInfobar();
      WebInspector.DataSaverInfobar._infobars.push(infobar);
      panel.showInfobar(infobar);
    }
  }

  /**
   * @override
   */
  dispose() {
    for (var infobar of WebInspector.DataSaverInfobar._infobars)
      infobar.dispose();
  }
};

WebInspector.DataSaverInfobar._infobars = [];
