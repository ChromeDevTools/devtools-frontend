// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';

const UIStrings = {
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  notMainFrame: 'Navigation happened in a frame other than the main frame',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  backForwardCacheDisabled:
      'Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   * Note: "window.open()" is the name of a JavaScript method and should not be translated.
   */
  relatedActiveContentsExist:
      'The page was opened using \'`window.open()`\' and another tab has a reference to it, or the page opened a window',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  HTTPStatusNotOK: 'Only pages with a status code of 2XX can be cached',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  schemeNotHTTPOrHTTPS: 'Only pages whose URL scheme is HTTP / HTTPS can be cached',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  loading: 'The page didn’t finish loading before navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  wasGrantedMediaAccess:
      'Pages that have granted access to record video or audio aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  HTTPMethodNotGET: 'Only pages loaded via a GET request are eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  subframeIsNavigating: 'An iframe on the page started a navigation that didn’t complete',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  timeout: 'The page exceeded the maximum time in back/forward cache and was expired',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  cacheLimit: 'The page was evicted from the cache to allow another page to be cached',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  JavaScriptExecution: 'Chrome detected an attempt to execute JavaScript while in the cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  rendererProcessKilled: 'The renderer process for the page in back/forward cache was killed',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  rendererProcessCrashed: 'The renderer process for the page in back/forward cache crashed',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  grantedMediaStreamAccess:
      'Pages that have granted media stream access aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  cacheFlushed: 'The cache was intentionally cleared',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  serviceWorkerVersionActivation: 'The page was evicted from back/forward cache due to a service worker activation',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  sessionRestored: 'Chrome restarted and cleared the back/forward cache entries',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   * Note: "MessageEvent" should not be translated.
   */
  serviceWorkerPostMessage: 'A service worker attempted to send the page in back/forward cache a `MessageEvent`',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  enteredBackForwardCacheBeforeServiceWorkerHostAdded:
      'A service worker was activated while the page was in back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  serviceWorkerClaim: 'The page was claimed by a service worker while it is in back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  haveInnerContents:
      'Pages that have certain kinds of embedded content (e.g. PDFs) aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  timeoutPuttingInCache:
      'The page timed out entering back/forward cache (likely due to long-running pagehide handlers)',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  backForwardCacheDisabledByLowMemory: 'Back/forward cache is disabled due to insufficient memory',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  backForwardCacheDisabledByCommandLine: 'Back/forward cache is disabled by the command line',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  networkRequestDatapipeDrainedAsBytesConsumer:
      'Pages that have inflight fetch() or XHR aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  networkRequestRedirected:
      'The page was evicted from back/forward cache because an active network request involved a redirect',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  networkRequestTimeout:
      'The page was evicted from the cache because a network connection was open too long. Chrome limits the amount of time that a page may receive data while cached.',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  networkExceedsBufferLimit:
      'The page was evicted from the cache because an active network connection received too much data. Chrome limits the amount of data that a page may receive while cached.',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  navigationCancelledWhileRestoring:
      'Navigation was cancelled before the page could be restored from back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  backForwardCacheDisabledForPrerender: 'Back/forward cache is disabled for prerenderer',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  userAgentOverrideDiffers: 'Browser has changed the user agent override header',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  foregroundCacheLimit: 'The page was evicted from the cache to allow another page to be cached',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  backForwardCacheDisabledForDelegate: 'Back/forward cache isn’t supported by delegate',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  unloadHandlerExistsInMainFrame: 'The page has an unload handler in the main frame',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  unloadHandlerExistsInSubFrame: 'The page has an unload handler in a sub frame',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  serviceWorkerUnregistration: 'ServiceWorker was unregistered while a page was in back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  noResponseHead: 'Pages that don’t have a valid response head can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  cacheControlNoStore: 'Pages with cache-control:no-store header can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  ineligibleAPI: 'Ineligible APIs were used',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  internalError: 'Internal error',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webSocket: 'Pages with WebSocket can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webTransport: 'Pages with WebTransport can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webRTC: 'Pages with WebRTC can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  mainResourceHasCacheControlNoStore:
      'Pages whose main resource has cache-control:no-store can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  mainResourceHasCacheControlNoCache:
      'Pages whose main resource has cache-control:no-cache can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  subresourceHasCacheControlNoStore:
      'Pages whose subresource has cache-control:no-store can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  subresourceHasCacheControlNoCache:
      'Pages whose subresource has cache-control:no-cache can’t enter back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  containsPlugins: 'Pages containing plugins aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  documentLoaded: 'The document didn’t finish loading before navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  dedicatedWorkerOrWorklet:
      'Pages that use a dedicated worker or worklet aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  outstandingNetworkRequestOthers:
      'Pages with an in-flight network request aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  outstandingIndexedDBTransaction:
      'Pages with ongoing indexed DB transactions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedNotificationsPermission:
      'Pages that have requested notifications permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedMIDIPermission:
      'Pages that have requested MIDI permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedAudioCapturePermission:
      'Pages that have requested audio capture permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedVideoCapturePermission:
      'Pages that have requested video capture permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedBackForwardCacheBlockedSensors:
      'Pages that have requested sensor permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedBackgroundWorkPermission:
      'Pages that have requested background sync or fetch permissions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  broadcastChannel: 'The page can’t be cached because it has a BroadcastChannel instance with registered listeners',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  indexedDBConnection: 'Pages that have an open IndexedDB connection aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webXR: 'Pages that use WebXR aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  sharedWorker: 'Pages that use SharedWorker aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  sharedWorkerMessage: 'The page was evicted from the cache because it received a message from a SharedWorker',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webLocks: 'Pages that use WebLocks aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webHID: 'Pages that use WebHID aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webShare: 'Pages that use WebShare aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  requestedStorageAccessGrant:
      'Pages that have requested storage access aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webNfc: 'Pages that use WebNfc aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  outstandingNetworkRequestFetch:
      'Pages with an in-flight fetch network request aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  outstandingNetworkRequestXHR:
      'Pages with an in-flight XHR network request aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  appBanner: 'Pages that requested an AppBanner aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  printing: 'Pages that show printing UI aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webDatabase: 'Pages that use WebDatabase aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  pictureInPicture: 'Pages that use Picture-in-Picture aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  speechRecognizer: 'Pages that use SpeechRecognizer aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  idleManager: 'Pages that use IdleManager aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  paymentManager: 'Pages that use PaymentManager aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  speechSynthesis: 'Pages that use SpeechSynthesis aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  keyboardLock: 'Pages that use keyboard lock aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webOTPService: 'Pages that use WebOTPService aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  outstandingNetworkRequestDirectSocket:
      'Pages with an in-flight network request aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  injectedJavascript:
      'Pages that `JavaScript` is injected into by extensions aren’t currently eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  injectedStyleSheet:
      'Pages that a `StyleSheet` is injected into by extensions aren’t currently eligible for back/forward cache',
  // TODO(tluk): Please provide meaningful description.
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentDiscarded: 'Undefined',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentSecurityHandler: 'Pages that use SecurityHandler aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentWebAuthenticationAPI: 'Pages that use WebAuthentication API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentFileChooser: 'Pages that use FileChooser API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentSerial: 'Pages that use Serial API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentFileSystemAccess: 'Pages that use File System Access API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentMediaDevicesDispatcherHost: 'Pages that use Media Device Dispatcher aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentWebBluetooth: 'Pages that use WebBluetooth API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentWebUSB: 'Pages that use WebUSB API aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentMediaSession:
      'Pages that use MediaSession API and set a playback state aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentMediaSessionService:
      'Pages that use MediaSession API and set action handlers aren’t eligible for back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentMediaPlay: 'A media player was playing upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  contentScreenReader: 'Back/forward cache is disabled due to screen reader',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderPopupBlockerTabHelper: 'Popup blocker was present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderSafeBrowsingTriggeredPopupBlocker: 'Safe Browsing considered this page to be abusive and blocked popup',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderSafeBrowsingThreatDetails: 'Safe Browsing details were shown upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderAppBannerManager: 'App banner was present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderDomDistillerViewerSource: 'DOM distiller viewer was present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderDomDistillerSelfDeletingRequestDelegate: 'DOM distillation was in progress upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderOomInterventionTabHelper: 'Out-of-memory intervention bar was present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderOfflinePage: 'The offline page was shown upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderChromePasswordManagerClientBindCredentialManager: 'Chrome Password Manager was present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderPermissionRequestManager: 'Permission requests were present upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderModalDialog:
      'Modal dialog such as form resubmission or HTTP password dialog was shown for the page upon navigating away',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderExtensions: 'Back/forward cache is disabled due to extensions',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderExtensionMessaging: 'Back/forward cache is disabled due to extensions using messaging API',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderExtensionMessagingForOpenPort:
      'Extensions with long-lived connection should close the connection before entering back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  embedderExtensionSentMessageToCachedFrame:
      'Extensions with long-lived connection attempted to send messages to frames in back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  errorDocument: 'Back/forward cache is disabled due to a document error',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  fencedFramesEmbedder: 'Pages using FencedFrames can’t be stored in back/forward cache',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  keepaliveRequest: 'Back/forward cache is disabled due to a keepalive request',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  jsNetworkRequestReceivedCacheControlNoStoreResource:
      'Back/forward cache is disabled because some JavaScript network request received resource with `Cache-Control: no-store` header',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  indexedDBEvent: 'Back/forward cache is disabled due to an IndexedDB event',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  cookieDisabled:
      'Back/forward cache is disabled because cookies are disabled on a page that uses `Cache-Control: no-store`',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webRTCUsedWithCCNS: 'Back/forward cache is disabled because WebRTC has been used',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webTransportUsedWithCCNS: 'Back/forward cache is disabled because WebTransport has been used',
  /**
   * @description Description text in the back/forward cache view of the Application panel explaining why a page could not be restored from the back/forward cache.
   */
  webSocketUsedWithCCNS: 'Back/forward cache is disabled because WebSocket has been used',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/BackForwardCacheStrings.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

type NotRestoredReason =
    Record<Protocol.Page.BackForwardCacheNotRestoredReason, {name: () => Platform.UIString.LocalizedString}>;

export const NotRestoredReasonDescription: NotRestoredReason = {
  NotPrimaryMainFrame: {name: i18nLazyString(UIStrings.notMainFrame)},
  BackForwardCacheDisabled: {name: i18nLazyString(UIStrings.backForwardCacheDisabled)},
  RelatedActiveContentsExist: {name: i18nLazyString(UIStrings.relatedActiveContentsExist)},
  HTTPStatusNotOK: {name: i18nLazyString(UIStrings.HTTPStatusNotOK)},
  SchemeNotHTTPOrHTTPS: {name: i18nLazyString(UIStrings.schemeNotHTTPOrHTTPS)},
  Loading: {name: i18nLazyString(UIStrings.loading)},
  WasGrantedMediaAccess: {name: i18nLazyString(UIStrings.wasGrantedMediaAccess)},
  HTTPMethodNotGET: {name: i18nLazyString(UIStrings.HTTPMethodNotGET)},
  SubframeIsNavigating: {name: i18nLazyString(UIStrings.subframeIsNavigating)},
  Timeout: {name: i18nLazyString(UIStrings.timeout)},
  CacheLimit: {name: i18nLazyString(UIStrings.cacheLimit)},
  JavaScriptExecution: {name: i18nLazyString(UIStrings.JavaScriptExecution)},
  RendererProcessKilled: {name: i18nLazyString(UIStrings.rendererProcessKilled)},
  RendererProcessCrashed: {name: i18nLazyString(UIStrings.rendererProcessCrashed)},
  // @ts-expect-error kept for backwards compatibly
  GrantedMediaStreamAccess: {name: i18nLazyString(UIStrings.grantedMediaStreamAccess)},
  CacheFlushed: {name: i18nLazyString(UIStrings.cacheFlushed)},
  ServiceWorkerVersionActivation: {name: i18nLazyString(UIStrings.serviceWorkerVersionActivation)},
  SessionRestored: {name: i18nLazyString(UIStrings.sessionRestored)},
  ServiceWorkerPostMessage: {name: i18nLazyString(UIStrings.serviceWorkerPostMessage)},
  EnteredBackForwardCacheBeforeServiceWorkerHostAdded:
      {name: i18nLazyString(UIStrings.enteredBackForwardCacheBeforeServiceWorkerHostAdded)},
  ServiceWorkerClaim: {name: i18nLazyString(UIStrings.serviceWorkerClaim)},
  HaveInnerContents: {name: i18nLazyString(UIStrings.haveInnerContents)},
  TimeoutPuttingInCache: {name: i18nLazyString(UIStrings.timeoutPuttingInCache)},
  BackForwardCacheDisabledByLowMemory: {name: i18nLazyString(UIStrings.backForwardCacheDisabledByLowMemory)},
  BackForwardCacheDisabledByCommandLine: {name: i18nLazyString(UIStrings.backForwardCacheDisabledByCommandLine)},
  NetworkRequestDatapipeDrainedAsBytesConsumer:
      {name: i18nLazyString(UIStrings.networkRequestDatapipeDrainedAsBytesConsumer)},
  NetworkRequestRedirected: {name: i18nLazyString(UIStrings.networkRequestRedirected)},
  NetworkRequestTimeout: {name: i18nLazyString(UIStrings.networkRequestTimeout)},
  NetworkExceedsBufferLimit: {name: i18nLazyString(UIStrings.networkExceedsBufferLimit)},
  NavigationCancelledWhileRestoring: {name: i18nLazyString(UIStrings.navigationCancelledWhileRestoring)},
  BackForwardCacheDisabledForPrerender: {name: i18nLazyString(UIStrings.backForwardCacheDisabledForPrerender)},
  UserAgentOverrideDiffers: {name: i18nLazyString(UIStrings.userAgentOverrideDiffers)},
  ForegroundCacheLimit: {name: i18nLazyString(UIStrings.foregroundCacheLimit)},
  BackForwardCacheDisabledForDelegate: {name: i18nLazyString(UIStrings.backForwardCacheDisabledForDelegate)},
  UnloadHandlerExistsInMainFrame: {name: i18nLazyString(UIStrings.unloadHandlerExistsInMainFrame)},
  UnloadHandlerExistsInSubFrame: {name: i18nLazyString(UIStrings.unloadHandlerExistsInSubFrame)},
  ServiceWorkerUnregistration: {name: i18nLazyString(UIStrings.serviceWorkerUnregistration)},
  NoResponseHead: {name: i18nLazyString(UIStrings.noResponseHead)},
  CacheControlNoStore: {name: i18nLazyString(UIStrings.cacheControlNoStore)},
  CacheControlNoStoreCookieModified: {name: i18nLazyString(UIStrings.cacheControlNoStore)},
  CacheControlNoStoreHTTPOnlyCookieModified: {name: i18nLazyString(UIStrings.cacheControlNoStore)},
  DisableForRenderFrameHostCalled: {name: i18nLazyString(UIStrings.ineligibleAPI)},
  BlocklistedFeatures: {name: i18nLazyString(UIStrings.ineligibleAPI)},
  SchedulerTrackedFeatureUsed: {name: i18nLazyString(UIStrings.ineligibleAPI)},
  DomainNotAllowed: {name: i18nLazyString(UIStrings.internalError)},
  ConflictingBrowsingInstance: {name: i18nLazyString(UIStrings.internalError)},
  NotMostRecentNavigationEntry: {name: i18nLazyString(UIStrings.internalError)},
  IgnoreEventAndEvict: {name: i18nLazyString(UIStrings.internalError)},
  BrowsingInstanceNotSwapped: {name: i18nLazyString(UIStrings.internalError)},
  ActivationNavigationsDisallowedForBug1234857: {name: i18nLazyString(UIStrings.internalError)},
  Unknown: {name: i18nLazyString(UIStrings.internalError)},
  RenderFrameHostReused_SameSite: {name: i18nLazyString(UIStrings.internalError)},
  RenderFrameHostReused_CrossSite: {name: i18nLazyString(UIStrings.internalError)},
  WebSocket: {name: i18nLazyString(UIStrings.webSocket)},
  WebTransport: {name: i18nLazyString(UIStrings.webTransport)},
  WebRTC: {name: i18nLazyString(UIStrings.webRTC)},
  MainResourceHasCacheControlNoStore: {name: i18nLazyString(UIStrings.mainResourceHasCacheControlNoStore)},
  MainResourceHasCacheControlNoCache: {name: i18nLazyString(UIStrings.mainResourceHasCacheControlNoCache)},
  SubresourceHasCacheControlNoStore: {name: i18nLazyString(UIStrings.subresourceHasCacheControlNoStore)},
  SubresourceHasCacheControlNoCache: {name: i18nLazyString(UIStrings.subresourceHasCacheControlNoCache)},
  ContainsPlugins: {name: i18nLazyString(UIStrings.containsPlugins)},
  DocumentLoaded: {name: i18nLazyString(UIStrings.documentLoaded)},
  DedicatedWorkerOrWorklet: {name: i18nLazyString(UIStrings.dedicatedWorkerOrWorklet)},
  OutstandingNetworkRequestOthers: {name: i18nLazyString(UIStrings.outstandingNetworkRequestOthers)},
  OutstandingIndexedDBTransaction: {name: i18nLazyString(UIStrings.outstandingIndexedDBTransaction)},
  RequestedNotificationsPermission: {name: i18nLazyString(UIStrings.requestedNotificationsPermission)},
  RequestedMIDIPermission: {name: i18nLazyString(UIStrings.requestedMIDIPermission)},
  RequestedAudioCapturePermission: {name: i18nLazyString(UIStrings.requestedAudioCapturePermission)},
  RequestedVideoCapturePermission: {name: i18nLazyString(UIStrings.requestedVideoCapturePermission)},
  RequestedBackForwardCacheBlockedSensors: {name: i18nLazyString(UIStrings.requestedBackForwardCacheBlockedSensors)},
  RequestedBackgroundWorkPermission: {name: i18nLazyString(UIStrings.requestedBackgroundWorkPermission)},
  BroadcastChannel: {name: i18nLazyString(UIStrings.broadcastChannel)},
  IndexedDBConnection: {name: i18nLazyString(UIStrings.indexedDBConnection)},
  WebXR: {name: i18nLazyString(UIStrings.webXR)},
  SharedWorker: {name: i18nLazyString(UIStrings.sharedWorker)},
  SharedWorkerMessage: {name: i18nLazyString(UIStrings.sharedWorkerMessage)},
  WebLocks: {name: i18nLazyString(UIStrings.webLocks)},
  WebHID: {name: i18nLazyString(UIStrings.webHID)},
  WebShare: {name: i18nLazyString(UIStrings.webShare)},
  RequestedStorageAccessGrant: {name: i18nLazyString(UIStrings.requestedStorageAccessGrant)},
  WebNfc: {name: i18nLazyString(UIStrings.webNfc)},
  OutstandingNetworkRequestFetch: {name: i18nLazyString(UIStrings.outstandingNetworkRequestFetch)},
  OutstandingNetworkRequestXHR: {name: i18nLazyString(UIStrings.outstandingNetworkRequestXHR)},
  AppBanner: {name: i18nLazyString(UIStrings.appBanner)},
  Printing: {name: i18nLazyString(UIStrings.printing)},
  WebDatabase: {name: i18nLazyString(UIStrings.webDatabase)},
  PictureInPicture: {name: i18nLazyString(UIStrings.pictureInPicture)},
  SpeechRecognizer: {name: i18nLazyString(UIStrings.speechRecognizer)},
  IdleManager: {name: i18nLazyString(UIStrings.idleManager)},
  PaymentManager: {name: i18nLazyString(UIStrings.paymentManager)},
  SpeechSynthesis: {name: i18nLazyString(UIStrings.speechSynthesis)},
  KeyboardLock: {name: i18nLazyString(UIStrings.keyboardLock)},
  WebOTPService: {name: i18nLazyString(UIStrings.webOTPService)},
  OutstandingNetworkRequestDirectSocket: {name: i18nLazyString(UIStrings.outstandingNetworkRequestDirectSocket)},
  InjectedJavascript: {name: i18nLazyString(UIStrings.injectedJavascript)},
  InjectedStyleSheet: {name: i18nLazyString(UIStrings.injectedStyleSheet)},
  Dummy: {name: i18nLazyString(UIStrings.internalError)},
  ContentDiscarded: {name: i18nLazyString(UIStrings.contentDiscarded)},
  ContentSecurityHandler: {name: i18nLazyString(UIStrings.contentSecurityHandler)},
  ContentWebAuthenticationAPI: {name: i18nLazyString(UIStrings.contentWebAuthenticationAPI)},
  ContentFileChooser: {name: i18nLazyString(UIStrings.contentFileChooser)},
  ContentSerial: {name: i18nLazyString(UIStrings.contentSerial)},
  ContentFileSystemAccess: {name: i18nLazyString(UIStrings.contentFileSystemAccess)},
  ContentMediaDevicesDispatcherHost: {name: i18nLazyString(UIStrings.contentMediaDevicesDispatcherHost)},
  ContentWebBluetooth: {name: i18nLazyString(UIStrings.contentWebBluetooth)},
  ContentWebUSB: {name: i18nLazyString(UIStrings.contentWebUSB)},
  ContentMediaSession: {name: i18nLazyString(UIStrings.contentMediaSession)},
  ContentMediaSessionService: {name: i18nLazyString(UIStrings.contentMediaSessionService)},
  ContentMediaPlay: {name: i18nLazyString(UIStrings.contentMediaPlay)},
  ContentScreenReader: {name: i18nLazyString(UIStrings.contentScreenReader)},
  EmbedderPopupBlockerTabHelper: {name: i18nLazyString(UIStrings.embedderPopupBlockerTabHelper)},
  EmbedderSafeBrowsingTriggeredPopupBlocker:
      {name: i18nLazyString(UIStrings.embedderSafeBrowsingTriggeredPopupBlocker)},
  EmbedderSafeBrowsingThreatDetails: {name: i18nLazyString(UIStrings.embedderSafeBrowsingThreatDetails)},
  EmbedderAppBannerManager: {name: i18nLazyString(UIStrings.embedderAppBannerManager)},
  EmbedderDomDistillerViewerSource: {name: i18nLazyString(UIStrings.embedderDomDistillerViewerSource)},
  EmbedderDomDistillerSelfDeletingRequestDelegate:
      {name: i18nLazyString(UIStrings.embedderDomDistillerSelfDeletingRequestDelegate)},
  EmbedderOomInterventionTabHelper: {name: i18nLazyString(UIStrings.embedderOomInterventionTabHelper)},
  EmbedderOfflinePage: {name: i18nLazyString(UIStrings.embedderOfflinePage)},
  EmbedderChromePasswordManagerClientBindCredentialManager:
      {name: i18nLazyString(UIStrings.embedderChromePasswordManagerClientBindCredentialManager)},
  EmbedderPermissionRequestManager: {name: i18nLazyString(UIStrings.embedderPermissionRequestManager)},
  EmbedderModalDialog: {name: i18nLazyString(UIStrings.embedderModalDialog)},
  EmbedderExtensions: {name: i18nLazyString(UIStrings.embedderExtensions)},
  EmbedderExtensionMessaging: {name: i18nLazyString(UIStrings.embedderExtensionMessaging)},
  EmbedderExtensionMessagingForOpenPort: {name: i18nLazyString(UIStrings.embedderExtensionMessagingForOpenPort)},
  EmbedderExtensionSentMessageToCachedFrame:
      {name: i18nLazyString(UIStrings.embedderExtensionSentMessageToCachedFrame)},
  ErrorDocument: {name: i18nLazyString(UIStrings.errorDocument)},
  FencedFramesEmbedder: {name: i18nLazyString(UIStrings.fencedFramesEmbedder)},
  KeepaliveRequest: {name: i18nLazyString(UIStrings.keepaliveRequest)},
  JsNetworkRequestReceivedCacheControlNoStoreResource:
      {name: i18nLazyString(UIStrings.jsNetworkRequestReceivedCacheControlNoStoreResource)},
  IndexedDBEvent: {name: i18nLazyString(UIStrings.indexedDBEvent)},
  CookieDisabled: {name: i18nLazyString(UIStrings.cookieDisabled)},
  WebRTCUsedWithCCNS: {name: i18nLazyString(UIStrings.webRTCUsedWithCCNS)},
  WebTransportUsedWithCCNS: {name: i18nLazyString(UIStrings.webTransportUsedWithCCNS)},
  WebSocketUsedWithCCNS: {name: i18nLazyString(UIStrings.webSocketUsedWithCCNS)},
  HTTPAuthRequired: {name: i18n.i18n.lockedLazyString('HTTPAuthRequired')},
  CookieFlushed: {name: i18n.i18n.lockedLazyString('CookieFlushed')},
  SmartCard: {name: i18n.i18n.lockedLazyString('SmartCard')},
  LiveMediaStreamTrack: {name: i18n.i18n.lockedLazyString('LiveMediaStreamTrack')},
  UnloadHandler: {name: i18n.i18n.lockedLazyString('UnloadHandler')},
  ParserAborted: {name: i18n.i18n.lockedLazyString('ParserAborted')},
  BroadcastChannelOnMessage: {name: i18n.i18n.lockedLazyString('BroadcastChannelOnMessage')},
  RequestedByWebViewClient: {name: i18n.i18n.lockedLazyString('RequestedByWebViewClient')},
  PostMessageByWebViewClient: {name: i18n.i18n.lockedLazyString('PostMessageByWebViewClient')},
  WebViewSettingsChanged: {name: i18n.i18n.lockedLazyString('WebViewSettingsChanged')},
  WebViewJavaScriptObjectChanged: {name: i18n.i18n.lockedLazyString('WebViewJavaScriptObjectChanged')},
  WebViewMessageListenerInjected: {name: i18n.i18n.lockedLazyString('WebViewMessageListenerInjected')},
  WebViewSafeBrowsingAllowlistChanged: {name: i18n.i18n.lockedLazyString('WebViewSafeBrowsingAllowlistChanged')},
  WebViewDocumentStartJavascriptChanged: {name: i18n.i18n.lockedLazyString('WebViewDocumentStartJavascriptChanged')},
  CacheControlNoStoreDeviceBoundSessionTerminated: {name: i18nLazyString(UIStrings.cacheControlNoStore)},
  CacheLimitPrunedOnModerateMemoryPressure:
      {name: i18n.i18n.lockedLazyString('CacheLimitPrunedOnModerateMemoryPressure')},
  CacheLimitPrunedOnCriticalMemoryPressure:
      {name: i18n.i18n.lockedLazyString('CacheLimitPrunedOnCriticalMemoryPressure')},
} as const;
