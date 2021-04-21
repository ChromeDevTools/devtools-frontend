// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';  // eslint-disable-line no-unused-vars
import {Events as NetworkRequestEvents, NetworkRequest} from './NetworkRequest.js';

const UIStrings = {
  /**
  *@description Text in Network Log
  *@example {Chrome Data Saver} PH1
  *@example {https://example.com} PH2
  */
  considerDisablingSWhileDebugging: 'Consider disabling {PH1} while debugging. For more info see: {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/PageLoad.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PageLoad {
  id: number;
  url: string;
  startTime: number;
  loadTime!: number;
  contentLoadTime!: number;
  mainRequest: NetworkRequest;

  constructor(mainRequest: NetworkRequest) {
    this.id = ++PageLoad.lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
    this.mainRequest = mainRequest;

    this.showDataSaverWarningIfNeeded();
  }

  private async showDataSaverWarningIfNeeded(): Promise<void> {
    const manager = NetworkManager.forRequest(this.mainRequest);
    if (!manager) {
      return;
    }
    if (!this.mainRequest.finished) {
      await this.mainRequest.once(NetworkRequestEvents.FinishedLoading);
    }
    const saveDataHeader = this.mainRequest.requestHeaderValue('Save-Data');
    if (!PageLoad.dataSaverMessageWasShown && saveDataHeader && saveDataHeader === 'on') {
      const message = i18nString(
          UIStrings.considerDisablingSWhileDebugging,
          {PH1: 'Chrome Data Saver', PH2: 'https://support.google.com/chrome/?p=datasaver'});
      manager.dispatchEventToListeners(
          NetworkManagerEvents.MessageGenerated,
          {message: message, requestId: this.mainRequest.requestId(), warning: true});
      PageLoad.dataSaverMessageWasShown = true;
    }
  }

  static forRequest(request: NetworkRequest): PageLoad|null {
    return pageLoadForRequest.get(request) || null;
  }

  bindRequest(request: NetworkRequest): void {
    pageLoadForRequest.set(request, this);
  }

  private static lastIdentifier = 0;
  private static dataSaverMessageWasShown = false;
}

const pageLoadForRequest = new WeakMap<NetworkRequest, PageLoad>();
