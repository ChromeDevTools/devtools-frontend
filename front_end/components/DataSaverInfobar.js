// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Components.DataSaverInfobar = class extends UI.Infobar {
  constructor() {
    super(
        UI.Infobar.Type.Warning, Common.UIString('Consider disabling Chrome Data Saver while debugging.'),
        Common.settings.moduleSetting('disableDataSaverInfobar'));
    var message = this.createDetailsRowMessage();
    message.createTextChild('More information about  ');
    message.appendChild(UI.createExternalLink(
        'https://support.google.com/chrome/answer/2392284?hl=en', Common.UIString('Chrome Data Saver')));
    message.createTextChild('.');
  }

  /**
   * @param {!UI.Panel} panel
   */
  static maybeShowInPanel(panel) {
    if (Runtime.queryParam('remoteFrontend')) {
      var infobar = new Components.DataSaverInfobar();
      Components.DataSaverInfobar._infobars.push(infobar);
      panel.showInfobar(infobar);
    }
  }

  /**
   * @override
   */
  dispose() {
    for (var infobar of Components.DataSaverInfobar._infobars)
      infobar.dispose();
  }
};

Components.DataSaverInfobar._infobars = [];
