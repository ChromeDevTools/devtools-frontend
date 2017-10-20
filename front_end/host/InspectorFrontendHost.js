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
/**
 * @implements {InspectorFrontendHostAPI}
 * @unrestricted
 */
Host.InspectorFrontendHostStub = class {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    /**
     * @param {!Event} event
     */
    function stopEventPropagation(event) {
      // Let browser handle Ctrl+/Ctrl- shortcuts in hosted mode.
      var zoomModifier = Host.isMac() ? event.metaKey : event.ctrlKey;
      if (zoomModifier && (event.keyCode === 187 || event.keyCode === 189))
        event.stopPropagation();
    }
    document.addEventListener('keydown', stopEventPropagation, true);
  }

  /**
   * @override
   * @return {string}
   */
  getSelectionBackgroundColor() {
    return '#6e86ff';
  }

  /**
   * @override
   * @return {string}
   */
  getSelectionForegroundColor() {
    return '#ffffff';
  }

  /**
   * @override
   * @return {string}
   */
  platform() {
    var match = navigator.userAgent.match(/Windows NT/);
    if (match)
      return 'windows';
    match = navigator.userAgent.match(/Mac OS X/);
    if (match)
      return 'mac';
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
   * @param {function()} callback
   */
  setIsDocked(isDocked, callback) {
    setTimeout(callback, 0);
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
   * @suppressGlobalPropertiesCheck
   */
  inspectedURLChanged(url) {
    document.title = Common.UIString('Developer Tools - %s', url);
  }

  /**
   * @override
   * @param {string} text
   */
  copyText(text) {
    Common.console.error('Clipboard is not enabled in hosted mode. Please inspect using chrome://inspect');
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
   * @param {string} url
   * @param {string} content
   * @param {boolean} forceSaveAs
   */
  save(url, content, forceSaveAs) {
    Common.console.error('Saving files is not enabled in hosted mode. Please inspect using chrome://inspect');
    this.events.dispatchEventToListeners(InspectorFrontendHostAPI.Events.CanceledSaveURL, url);
  }

  /**
   * @override
   * @param {string} url
   * @param {string} content
   */
  append(url, content) {
    Common.console.error('Saving files is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  /**
   * @override
   * @param {string} message
   */
  sendMessageToBackend(message) {
  }

  /**
   * @override
   * @param {string} actionName
   * @param {number} actionCode
   * @param {number} bucketSize
   */
  recordEnumeratedHistogram(actionName, actionCode, bucketSize) {
  }

  /**
   * @override
   */
  requestFileSystems() {
    this.events.dispatchEventToListeners(InspectorFrontendHostAPI.Events.FileSystemsLoaded, []);
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
   * @return {?DOMFileSystem}
   */
  isolatedFileSystem(fileSystemId, registeredName) {
    return null;
  }

  /**
   * @override
   * @param {string} url
   * @param {string} headers
   * @param {number} streamId
   * @param {function(!InspectorFrontendHostAPI.LoadNetworkResourceResult)} callback
   */
  loadNetworkResource(url, headers, streamId, callback) {
    Runtime.loadResourcePromise(url)
        .then(function(text) {
          Host.ResourceLoader.streamWrite(streamId, text);
          callback({statusCode: 200});
        })
        .catch(function() {
          callback({statusCode: 404});
        });
  }

  /**
   * @override
   * @param {function(!Object<string, string>)} callback
   */
  getPreferences(callback) {
    var prefs = {};
    for (var name in window.localStorage)
      prefs[name] = window.localStorage[name];
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
   */
  indexPath(requestId, fileSystemPath) {
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
   * @return {boolean}
   */
  isUnderTest() {
    return false;
  }

  /**
   * @override
   * @param {function()} callback
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
   * @param {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} items
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
};

/**
 * @unrestricted
 */
Host.InspectorFrontendAPIImpl = class {
  constructor() {
    this._debugFrontend =
        !!Runtime.queryParam('debugFrontend') || (window['InspectorTest'] && window['InspectorTest']['debugTest']);

    var descriptors = InspectorFrontendHostAPI.EventDescriptors;
    for (var i = 0; i < descriptors.length; ++i)
      this[descriptors[i][1]] = this._dispatch.bind(this, descriptors[i][0], descriptors[i][2], descriptors[i][3]);
  }

  /**
   * @param {symbol} name
   * @param {!Array.<string>} signature
   * @param {boolean} runOnceLoaded
   */
  _dispatch(name, signature, runOnceLoaded) {
    var params = Array.prototype.slice.call(arguments, 3);

    if (this._debugFrontend)
      setImmediate(innerDispatch);
    else
      innerDispatch();

    function innerDispatch() {
      // Single argument methods get dispatched with the param.
      if (signature.length < 2) {
        try {
          InspectorFrontendHost.events.dispatchEventToListeners(name, params[0]);
        } catch (e) {
          console.error(e + ' ' + e.stack);
        }
        return;
      }
      var data = {};
      for (var i = 0; i < signature.length; ++i)
        data[signature[i]] = params[i];
      try {
        InspectorFrontendHost.events.dispatchEventToListeners(name, data);
      } catch (e) {
        console.error(e + ' ' + e.stack);
      }
    }
  }

  /**
   * @param {number} id
   * @param {string} chunk
   */
  streamWrite(id, chunk) {
    Host.ResourceLoader.streamWrite(id, chunk);
  }
};

/**
 * @type {!InspectorFrontendHostAPI}
 */
var InspectorFrontendHost = window.InspectorFrontendHost || null;
window.InspectorFrontendHost = InspectorFrontendHost;
(function() {

  function initializeInspectorFrontendHost() {
    if (!InspectorFrontendHost) {
      // Instantiate stub for web-hosted mode if necessary.
      window.InspectorFrontendHost = InspectorFrontendHost = new Host.InspectorFrontendHostStub();
    } else {
      // Otherwise add stubs for missing methods that are declared in the interface.
      var proto = Host.InspectorFrontendHostStub.prototype;
      for (var name in proto) {
        var value = proto[name];
        if (typeof value !== 'function' || InspectorFrontendHost[name])
          continue;

        InspectorFrontendHost[name] = stub.bind(null, name);
      }
    }

    /**
     * @param {string} name
     * @return {?}
     */
    function stub(name) {
      console.error('Incompatible embedder: method InspectorFrontendHost.' + name + ' is missing. Using stub instead.');
      var args = Array.prototype.slice.call(arguments, 1);
      return proto[name].apply(InspectorFrontendHost, args);
    }

    // Attach the events object.
    InspectorFrontendHost.events = new Common.Object();
  }

  // FIXME: This file is included into both apps, since the devtools_app needs the InspectorFrontendHostAPI only,
  // so the host instance should not initialized there.
  initializeInspectorFrontendHost();
  window.InspectorFrontendAPI = new Host.InspectorFrontendAPIImpl();
})();

/**
 * @type {!Common.EventTarget}
 */
InspectorFrontendHost.events;

/**
 * @param {!Object<string, string>=} prefs
 * @return {boolean}
 */
Host.isUnderTest = function(prefs) {
  if (InspectorFrontendHost.isUnderTest())
    return true;

  if (prefs)
    return prefs['isUnderTest'] === 'true';
  return Common.settings.createSetting('isUnderTest', false).get();
};
