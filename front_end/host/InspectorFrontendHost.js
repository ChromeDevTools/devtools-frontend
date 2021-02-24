/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
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

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {CanShowSurveyResult, ContextMenuDescriptor, EnumeratedHistogram, EventDescriptors, Events, InspectorFrontendHostAPI, LoadNetworkResourceResult, ShowSurveyResult} from './InspectorFrontendHostAPI.js';  // eslint-disable-line no-unused-vars
import {streamWrite as resourceLoaderStreamWrite} from './ResourceLoader.js';

export const UIStrings = {
  /**
  *@description Document title in Inspector Frontend Host of the DevTools window
  *@example {example.com} PH1
  */
  devtoolsS: 'DevTools - {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('host/InspectorFrontendHost.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @implements {InspectorFrontendHostAPI}
 */
export class InspectorFrontendHostStub {
  constructor() {
    /**
     * @param {!KeyboardEvent} event
     * @this {InspectorFrontendHostAPI}
     */
    function stopEventPropagation(event) {
      // Let browser handle Ctrl+/Ctrl- shortcuts in hosted mode.
      const zoomModifier = this.platform() === 'mac' ? event.metaKey : event.ctrlKey;
      if (zoomModifier && (event.key === '+' || event.key === '-')) {
        event.stopPropagation();
      }
    }
    document.addEventListener('keydown', event => {
      stopEventPropagation.call(this, /** @type {!KeyboardEvent} */ (event));
    }, true);
    /**
     * @type {!Map<string, !Array<string>>}
     */
    this._urlsBeingSaved = new Map();

    /**
     * @type {!Common.EventTarget.EventTarget}
     */
    this.events;
  }

  /**
   * @override
   * @return {string}
   */
  platform() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows NT')) {
      return 'windows';
    }
    if (userAgent.includes('Mac OS X')) {
      return 'mac';
    }
    return 'linux';
  }

  /**
   * @override
   */
  loadCompleted() {
  }

  /**
   * @override
   */
  bringToFront() {
    this._windowVisible = true;
  }

  /**
   * @override
   */
  closeWindow() {
    this._windowVisible = false;
  }

  /**
   * @override
   * @param {boolean} isDocked
   * @param {function():void} callback
   */
  setIsDocked(isDocked, callback) {
    setTimeout(callback, 0);
  }

  /**
   * @override
   * @param {string} trigger
   * @param {function(!ShowSurveyResult): void} callback
   */
  showSurvey(trigger, callback) {
    setTimeout(() => callback({surveyShown: false}), 0);
  }

  /**
   * @override
   * @param {string} trigger
   * @param {function(!CanShowSurveyResult): void} callback
   */
  canShowSurvey(trigger, callback) {
    setTimeout(() => callback({canShowSurvey: false}), 0);
  }

  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   * @override
   * @param {{x: number, y: number, width: number, height: number}} bounds
   */
  setInspectedPageBounds(bounds) {
  }

  /**
   * @override
   */
  inspectElementCompleted() {
  }

  /**
   * @override
   * @param {string} origin
   * @param {string} script
   */
  setInjectedScriptForOrigin(origin, script) {
  }

  /**
   * @override
   * @param {string} url
   */
  inspectedURLChanged(url) {
    document.title = i18nString(UIStrings.devtoolsS, {PH1: url.replace(/^https?:\/\//, '')});
  }

  /**
   * @override
   * @param {?(string|undefined)} text
   */
  copyText(text) {
    if (text === undefined || text === null) {
      return;
    }
    navigator.clipboard.writeText(text);
  }

  /**
   * @override
   * @param {string} url
   */
  openInNewTab(url) {
    window.open(url, '_blank');
  }

  /**
   * @override
   * @param {string} fileSystemPath
   */
  showItemInFolder(fileSystemPath) {
    Common.Console.Console.instance().error(
        'Show item in folder is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  /**
   * @override
   * @param {string} url
   * @param {string} content
   * @param {boolean} forceSaveAs
   */
  save(url, content, forceSaveAs) {
    let buffer = this._urlsBeingSaved.get(url);
    if (!buffer) {
      buffer = [];
      this._urlsBeingSaved.set(url, buffer);
    }
    buffer.push(content);
    this.events.dispatchEventToListeners(Events.SavedURL, {url, fileSystemPath: url});
  }

  /**
   * @override
   * @param {string} url
   * @param {string} content
   */
  append(url, content) {
    const buffer = this._urlsBeingSaved.get(url);
    if (buffer) {
      buffer.push(content);
      this.events.dispatchEventToListeners(Events.AppendedToURL, url);
    }
  }

  /**
   * @override
   * @param {string} url
   */
  close(url) {
    const buffer = this._urlsBeingSaved.get(url) || [];
    this._urlsBeingSaved.delete(url);
    let fileName = '';

    if (url) {
      try {
        const trimmed = Platform.StringUtilities.trimURL(url);
        fileName = Platform.StringUtilities.removeURLFragment(trimmed);
      } catch (error) {
        // If url is not a valid URL, it is probably a filename.
        fileName = url;
      }
    }

    const link = document.createElement('a');
    link.download = fileName;
    const blob = new Blob([buffer.join('')], {type: 'text/plain'});
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  /**
   * @override
   * @param {string} message
   */
  sendMessageToBackend(message) {
  }

  /**
   * @override
   * @param {!EnumeratedHistogram} actionName
   * @param {number} actionCode
   * @param {number} bucketSize
   */
  recordEnumeratedHistogram(actionName, actionCode, bucketSize) {
  }

  /**
   * @override
   * @param {string} histogramName
   * @param {number} duration
   */
  recordPerformanceHistogram(histogramName, duration) {
  }

  /**
   * @override
   * @param {string} umaName
   */
  recordUserMetricsAction(umaName) {
  }

  /**
   * @override
   */
  requestFileSystems() {
    this.events.dispatchEventToListeners(Events.FileSystemsLoaded, []);
  }

  /**
   * @override
   * @param {string=} type
   */
  addFileSystem(type) {
  }

  /**
   * @override
   * @param {string} fileSystemPath
   */
  removeFileSystem(fileSystemPath) {
  }

  /**
   * @override
   * @param {string} fileSystemId
   * @param {string} registeredName
   * @return {?FileSystem}
   */
  isolatedFileSystem(fileSystemId, registeredName) {
    return null;
  }

  /**
   * @override
   * @param {string} url
   * @param {string} headers
   * @param {number} streamId
   * @param {function(!LoadNetworkResourceResult):void} callback
   */
  loadNetworkResource(url, headers, streamId, callback) {
    Root.Runtime.loadResourcePromise(url)
        .then(function(text) {
          resourceLoaderStreamWrite(streamId, text);
          callback({
            statusCode: 200,
            headers: undefined,
            messageOverride: undefined,
            netError: undefined,
            netErrorName: undefined,
            urlValid: undefined
          });
        })
        .catch(function() {
          callback({
            statusCode: 404,
            headers: undefined,
            messageOverride: undefined,
            netError: undefined,
            netErrorName: undefined,
            urlValid: undefined
          });
        });
  }

  /**
   * @override
   * @param {function(!Object<string, string>):void} callback
   */
  getPreferences(callback) {
    /** @type {!Object<string, string>} */
    const prefs = {};
    for (const name in window.localStorage) {
      prefs[name] = window.localStorage[name];
    }
    callback(prefs);
  }

  /**
   * @override
   * @param {string} name
   * @param {string} value
   */
  setPreference(name, value) {
    window.localStorage[name] = value;
  }

  /**
   * @override
   * @param {string} name
   */
  removePreference(name) {
    delete window.localStorage[name];
  }

  /**
   * @override
   */
  clearPreferences() {
    window.localStorage.clear();
  }

  /**
   * @override
   * @param {!FileSystem} fileSystem
   */
  upgradeDraggedFileSystemPermissions(fileSystem) {
  }

  /**
   * @override
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} excludedFolders
   */
  indexPath(requestId, fileSystemPath, excludedFolders) {
  }

  /**
   * @override
   * @param {number} requestId
   */
  stopIndexing(requestId) {
  }

  /**
   * @override
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} query
   */
  searchInPath(requestId, fileSystemPath, query) {
  }

  /**
   * @override
   * @return {number}
   */
  zoomFactor() {
    return 1;
  }

  /**
   * @override
   */
  zoomIn() {
  }

  /**
   * @override
   */
  zoomOut() {
  }

  /**
   * @override
   */
  resetZoom() {
  }

  /**
   * @override
   * @param {string} shortcuts
   */
  setWhitelistedShortcuts(shortcuts) {
  }

  /**
   * @override
   * @param {boolean} active
   */
  setEyeDropperActive(active) {
  }

  /**
   * @param {!Array<string>} certChain
   * @override
   */
  showCertificateViewer(certChain) {
  }

  /**
   * @override
   * @param {function():void} callback
   */
  reattach(callback) {
  }

  /**
   * @override
   */
  readyForTest() {
  }

  /**
   * @override
   */
  connectionReady() {
  }

  /**
   * @override
   * @param {boolean} value
   */
  setOpenNewWindowForPopups(value) {
  }

  /**
   * @override
   * @param {!Adb.Config} config
   */
  setDevicesDiscoveryConfig(config) {
  }

  /**
   * @override
   * @param {boolean} enabled
   */
  setDevicesUpdatesEnabled(enabled) {
  }

  /**
   * @override
   * @param {string} pageId
   * @param {string} action
   */
  performActionOnRemotePage(pageId, action) {
  }

  /**
   * @override
   * @param {string} browserId
   * @param {string} url
   */
  openRemotePage(browserId, url) {
  }

  /**
   * @override
   */
  openNodeFrontend() {
  }

  /**
   * @override
   * @param {number} x
   * @param {number} y
   * @param {!Array.<!ContextMenuDescriptor>} items
   * @param {!Document} document
   */
  showContextMenuAtPoint(x, y, items, document) {
    throw 'Soft context menu should be used';
  }

  /**
   * @override
   * @return {boolean}
   */
  isHostedMode() {
    return true;
  }

  /**
   * @override
   * @param {function(!Root.Runtime.RuntimeExtensionDescriptor):void} callback
   */
  setAddExtensionCallback(callback) {
    // Extensions are not supported in hosted mode.
  }
}

/**
 * @type {!InspectorFrontendHostStub}
 */
// @ts-ignore Global injected by devtools-compatibility.js
export let InspectorFrontendHostInstance = window.InspectorFrontendHost;

class InspectorFrontendAPIImpl {
  constructor() {
    this._debugFrontend = (Boolean(Root.Runtime.Runtime.queryParam('debugFrontend'))) ||
        // @ts-ignore Compatibility hacks
        (window['InspectorTest'] && window['InspectorTest']['debugTest']);

    for (const descriptor of EventDescriptors) {
      // @ts-ignore Dispatcher magic
      this[descriptor[1]] = this._dispatch.bind(this, descriptor[0], descriptor[2], descriptor[3]);
    }
  }

  /**
   * @param {symbol} name
   * @param {!Array<string>} signature
   * @param {boolean} runOnceLoaded
   * @param {Array<string>} params
   */
  _dispatch(name, signature, runOnceLoaded, ...params) {
    if (this._debugFrontend) {
      setTimeout(() => innerDispatch(), 0);
    } else {
      innerDispatch();
    }

    function innerDispatch() {
      // Single argument methods get dispatched with the param.
      if (signature.length < 2) {
        try {
          InspectorFrontendHostInstance.events.dispatchEventToListeners(name, params[0]);
        } catch (error) {
          console.error(error + ' ' + error.stack);
        }
        return;
      }
      /** @type {!Object<string, string>} */
      const data = {};
      for (let i = 0; i < signature.length; ++i) {
        data[signature[i]] = params[i];
      }
      try {
        InspectorFrontendHostInstance.events.dispatchEventToListeners(name, data);
      } catch (error) {
        console.error(error + ' ' + error.stack);
      }
    }
  }

  /**
   * @param {number} id
   * @param {string} chunk
   */
  streamWrite(id, chunk) {
    resourceLoaderStreamWrite(id, chunk);
  }
}

(function() {

  function initializeInspectorFrontendHost() {
    /** @type {*} */
    let proto;
    if (!InspectorFrontendHostInstance) {
      // Instantiate stub for web-hosted mode if necessary.
      // @ts-ignore Global injected by devtools-compatibility.js
      window.InspectorFrontendHost = InspectorFrontendHostInstance = new InspectorFrontendHostStub();
    } else {
      // Otherwise add stubs for missing methods that are declared in the interface.
      proto = InspectorFrontendHostStub.prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const stub = proto[name];
        // @ts-ignore Global injected by devtools-compatibility.js
        if (typeof stub !== 'function' || InspectorFrontendHostInstance[name]) {
          continue;
        }

        console.error(
            `Incompatible embedder: method Host.InspectorFrontendHost.${name} is missing. Using stub instead.`);
        // @ts-ignore Global injected by devtools-compatibility.js
        InspectorFrontendHostInstance[name] = stub;
      }
    }

    // Attach the events object.
    InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
  }

  // FIXME: This file is included into both apps, since the devtools_app needs the InspectorFrontendHostAPI only,
  // so the host instance should not be initialized there.
  initializeInspectorFrontendHost();
  // @ts-ignore Global injected by devtools-compatibility.js
  window.InspectorFrontendAPI = new InspectorFrontendAPIImpl();
})();

/**
 * @param {!Object<string, string>=} prefs
 * @return {boolean}
 */
export function isUnderTest(prefs) {
  // Integration tests rely on test queryParam.
  if (Root.Runtime.Runtime.queryParam('test')) {
    return true;
  }
  // Browser tests rely on prefs.
  if (prefs) {
    return prefs['isUnderTest'] === 'true';
  }
  return Common.Settings.Settings.hasInstance() &&
      Common.Settings.Settings.instance().createSetting('isUnderTest', false).get();
}
