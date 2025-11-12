var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/components/BackForwardCacheView.js
var BackForwardCacheView_exports = {};
__export(BackForwardCacheView_exports, {
  BackForwardCacheView: () => BackForwardCacheView
});
import "./../../../ui/components/chrome_link/chrome_link.js";
import "./../../../ui/components/expandable_list/expandable_list.js";
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/legacy.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as Components from "./../../../ui/legacy/components/utils/utils.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import { html, nothing, render } from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/BackForwardCacheStrings.js
import * as i18n from "./../../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  notMainFrame: "Navigation happened in a frame other than the main frame.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabled.
   */
  backForwardCacheDisabled: "Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.",
  /**
   * @description Description text for not restored reason RelatedActiveContentsExist.
   * Note: "window.open()" is the name of a JavaScript method and should not be translated.
   */
  relatedActiveContentsExist: "The page was opened using '`window.open()`' and another tab has a reference to it, or the page opened a window.",
  /**
   * @description Description text for not restored reason HTTPStatusNotOK.
   */
  HTTPStatusNotOK: "Only pages with a status code of 2XX can be cached.",
  /**
   * @description Description text for not restored reason SchemeNotHTTPOrHTTPS.
   */
  schemeNotHTTPOrHTTPS: "Only pages whose URL scheme is HTTP / HTTPS can be cached.",
  /**
   * @description Description text for not restored reason Loading.
   */
  loading: "The page did not finish loading before navigating away.",
  /**
   * @description Description text for not restored reason WasGrantedMediaAccess.
   */
  wasGrantedMediaAccess: "Pages that have granted access to record video or audio are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason HTTPMethodNotGET.
   */
  HTTPMethodNotGET: "Only pages loaded via a GET request are eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SubframeIsNavigating.
   */
  subframeIsNavigating: "An iframe on the page started a navigation that did not complete.",
  /**
   * @description Description text for not restored reason Timeout.
   */
  timeout: "The page exceeded the maximum time in back/forward cache and was expired.",
  /**
   * @description Description text for not restored reason CacheLimit.
   */
  cacheLimit: "The page was evicted from the cache to allow another page to be cached.",
  /**
   * @description Description text for not restored reason JavaScriptExecution.
   */
  JavaScriptExecution: "Chrome detected an attempt to execute JavaScript while in the cache.",
  /**
   * @description Description text for not restored reason RendererProcessKilled.
   */
  rendererProcessKilled: "The renderer process for the page in back/forward cache was killed.",
  /**
   * @description Description text for not restored reason RendererProcessCrashed.
   */
  rendererProcessCrashed: "The renderer process for the page in back/forward cache crashed.",
  /**
   * @description Description text for not restored reason GrantedMediaStreamAccess.
   */
  grantedMediaStreamAccess: "Pages that have granted media stream access are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason CacheFlushed.
   */
  cacheFlushed: "The cache was intentionally cleared.",
  /**
   * @description Description text for not restored reason ServiceWorkerVersionActivation.
   */
  serviceWorkerVersionActivation: "The page was evicted from back/forward cache due to a service worker activation.",
  /**
   * @description Description text for not restored reason SessionRestored.
   */
  sessionRestored: "Chrome restarted and cleared the back/forward cache entries.",
  /**
   * @description Description text for not restored reason ServiceWorkerPostMessage.
   * Note: "MessageEvent" should not be translated.
   */
  serviceWorkerPostMessage: "A service worker attempted to send the page in back/forward cache a `MessageEvent`.",
  /**
   * @description Description text for not restored reason EnteredBackForwardCacheBeforeServiceWorkerHostAdded.
   */
  enteredBackForwardCacheBeforeServiceWorkerHostAdded: "A service worker was activated while the page was in back/forward cache.",
  /**
   * @description Description text for not restored reason ServiceWorkerClaim.
   */
  serviceWorkerClaim: "The page was claimed by a service worker while it is in back/forward cache.",
  /**
   * @description Description text for not restored reason HaveInnerContents.
   */
  haveInnerContents: "Pages that have certain kinds of embedded content (e.g. PDFs) are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason TimeoutPuttingInCache.
   */
  timeoutPuttingInCache: "The page timed out entering back/forward cache (likely due to long-running pagehide handlers).",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledByLowMemory.
   */
  backForwardCacheDisabledByLowMemory: "Back/forward cache is disabled due to insufficient memory.",
  /**
   * @description Description text for not restored reason BackForwardcCacheDisabledByCommandLine.
   */
  backForwardCacheDisabledByCommandLine: "Back/forward cache is disabled by the command line.",
  /**
   * @description Description text for not restored reason NetworkRequestDatapipeDrainedAsBytesConsumer.
   */
  networkRequestDatapipeDrainedAsBytesConsumer: "Pages that have inflight fetch() or XHR are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NetworkRequestRedirected.
   */
  networkRequestRedirected: "The page was evicted from back/forward cache because an active network request involved a redirect.",
  /**
   * @description Description text for not restored reason NetworkRequestTimeout.
   */
  networkRequestTimeout: "The page was evicted from the cache because a network connection was open too long. Chrome limits the amount of time that a page may receive data while cached.",
  /**
   * @description Description text for not restored reason NetworkExceedsBufferLimit.
   */
  networkExceedsBufferLimit: "The page was evicted from the cache because an active network connection received too much data. Chrome limits the amount of data that a page may receive while cached.",
  /**
   * @description Description text for not restored reason NavigationCancelledWhileRestoring.
   */
  navigationCancelledWhileRestoring: "Navigation was cancelled before the page could be restored from back/forward cache.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledForPrerender.
   */
  backForwardCacheDisabledForPrerender: "Back/forward cache is disabled for prerenderer.",
  /**
   * @description Description text for not restored reason userAgentOverrideDiffers.
   */
  userAgentOverrideDiffers: "Browser has changed the user agent override header.",
  /**
   * @description Description text for not restored reason ForegroundCacheLimit.
   */
  foregroundCacheLimit: "The page was evicted from the cache to allow another page to be cached.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledForDelegate.
   */
  backForwardCacheDisabledForDelegate: "Back/forward cache is not supported by delegate.",
  /**
   * @description Description text for not restored reason UnloadHandlerExistsInMainFrame.
   */
  unloadHandlerExistsInMainFrame: "The page has an unload handler in the main frame.",
  /**
   * @description Description text for not restored reason UnloadHandlerExistsInSubFrame.
   */
  unloadHandlerExistsInSubFrame: "The page has an unload handler in a sub frame.",
  /**
   * @description Description text for not restored reason ServiceWorkerUnregistration.
   */
  serviceWorkerUnregistration: "ServiceWorker was unregistered while a page was in back/forward cache.",
  /**
   * @description Description text for not restored reason NoResponseHead.
   */
  noResponseHead: "Pages that do not have a valid response head cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason CacheControlNoStore.
   */
  cacheControlNoStore: "Pages with cache-control:no-store header cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason IneligibleAPI.
   */
  ineligibleAPI: "Ineligible APIs were used.",
  /**
   * @description Description text for not restored reason InternalError.
   */
  internalError: "Internal error.",
  /**
   * @description Description text for not restored reason WebSocket.
   */
  webSocket: "Pages with WebSocket cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason WebTransport.
   */
  webTransport: "Pages with WebTransport cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason WebRTC.
   */
  webRTC: "Pages with WebRTC cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason MainResourceHasCacheControlNoStore.
   */
  mainResourceHasCacheControlNoStore: "Pages whose main resource has cache-control:no-store cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason MainResourceHasCacheControlNoCache.
   */
  mainResourceHasCacheControlNoCache: "Pages whose main resource has cache-control:no-cache cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason SubresourceHasCacheControlNoStore.
   */
  subresourceHasCacheControlNoStore: "Pages whose subresource has cache-control:no-store cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason SubresourceHasCacheControlNoCache.
   */
  subresourceHasCacheControlNoCache: "Pages whose subresource has cache-control:no-cache cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason ContainsPlugins.
   */
  containsPlugins: "Pages containing plugins are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason DocumentLoaded.
   */
  documentLoaded: "The document did not finish loading before navigating away.",
  /**
   * @description Description text for not restored reason DedicatedWorkerOrWorklet.
   */
  dedicatedWorkerOrWorklet: "Pages that use a dedicated worker or worklet are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestOthers.
   */
  outstandingNetworkRequestOthers: "Pages with an in-flight network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingIndexedDBTransaction.
   */
  outstandingIndexedDBTransaction: "Page with ongoing indexed DB transactions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedNotificationsPermission.
   */
  requestedNotificationsPermission: "Pages that have requested notifications permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedMIDIPermission.
   */
  requestedMIDIPermission: "Pages that have requested MIDI permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedAudioCapturePermission.
   */
  requestedAudioCapturePermission: "Pages that have requested audio capture permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedVideoCapturePermission.
   */
  requestedVideoCapturePermission: "Pages that have requested video capture permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedBackForwardCacheBlockedSensors.
   */
  requestedBackForwardCacheBlockedSensors: "Pages that have requested sensor permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedBackgroundWorkPermission.
   */
  requestedBackgroundWorkPermission: "Pages that have requested background sync or fetch permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason BroadcastChannel.
   */
  broadcastChannel: "The page cannot be cached because it has a BroadcastChannel instance with registered listeners.",
  /**
   * @description Description text for not restored reason IndexedDBConnection.
   */
  indexedDBConnection: "Pages that have an open IndexedDB connection are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebXR.
   */
  webXR: "Pages that use WebXR are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SharedWorker.
   */
  sharedWorker: "Pages that use SharedWorker are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SharedWorkerMessage.
   */
  sharedWorkerMessage: "The page was evicted from the cache because it received a message from a SharedWorker",
  /**
   * @description Description text for not restored reason WebLocks.
   */
  webLocks: "Pages that use WebLocks are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebHID.
   */
  webHID: "Pages that use WebHID are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebShare.
   */
  webShare: "Pages that use WebShare are not currently eligible for back/forwad cache.",
  /**
   * @description Description text for not restored reason RequestedStorageAccessGrant.
   */
  requestedStorageAccessGrant: "Pages that have requested storage access are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebNfc.
   */
  webNfc: "Pages that use WebNfc are not currently eligible for back/forwad cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestFetch.
   */
  outstandingNetworkRequestFetch: "Pages with an in-flight fetch network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestXHR.
   */
  outstandingNetworkRequestXHR: "Pages with an in-flight XHR network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason AppBanner.
   */
  appBanner: "Pages that requested an AppBanner are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason Printing.
   */
  printing: "Pages that show Printing UI are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebDatabase.
   */
  webDatabase: "Pages that use WebDatabase are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason PictureInPicture.
   */
  pictureInPicture: "Pages that use Picture-in-Picture are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SpeechRecognizer.
   */
  speechRecognizer: "Pages that use SpeechRecognizer are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason IdleManager.
   */
  idleManager: "Pages that use IdleManager are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason PaymentManager.
   */
  paymentManager: "Pages that use PaymentManager are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SpeechSynthesis.
   */
  speechSynthesis: "Pages that use SpeechSynthesis are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason KeyboardLock.
   */
  keyboardLock: "Pages that use Keyboard lock are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebOTPService.
   */
  webOTPService: "Pages that use WebOTPService are not currently eligible for bfcache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestDirectSocket.
   */
  outstandingNetworkRequestDirectSocket: "Pages with an in-flight network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason InjectedJavascript.
   */
  injectedJavascript: "Pages that `JavaScript` is injected into by extensions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason InjectedStyleSheet.
   */
  injectedStyleSheet: "Pages that a `StyleSheet` is injected into by extensions are not currently eligible for back/forward cache.",
  // TODO(tluk): Please provide meaningful description.
  /**
   * @description Description text for not restored reason ContentDiscarded.
   */
  contentDiscarded: "Undefined",
  /**
   * @description Description text for not restored reason ContentSecurityHandler.
   */
  contentSecurityHandler: "Pages that use SecurityHandler are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentWebAuthenticationAPI: "Pages that use WebAuthetication API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentFileChooser: "Pages that use FileChooser API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentSerial: "Pages that use Serial API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentFileSystemAccess: "Pages that use File System Access API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentMediaDevicesDispatcherHost: "Pages that use Media Device Dispatcher are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentWebBluetooth: "Pages that use WebBluetooth API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentWebUSB.
   */
  contentWebUSB: "Pages that use WebUSB API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaSession.
   */
  contentMediaSession: "Pages that use MediaSession API and set a playback state are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaSessionService.
   */
  contentMediaSessionService: "Pages that use MediaSession API and set action handlers are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaPlay.
   */
  contentMediaPlay: "A media player was playing upon navigating away.",
  /**
   * @description Description text for not restored reason ContentScreenReader.
   */
  contentScreenReader: "Back/forward cache is disabled due to screen reader.",
  /**
   *  @description Description text for not restored reason EmbedderPopupBlockerTabHelper.
   */
  embedderPopupBlockerTabHelper: "Popup blocker was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderSafeBrowsingTriggeredPopupBlocker.
   */
  embedderSafeBrowsingTriggeredPopupBlocker: "Safe Browsing considered this page to be abusive and blocked popup.",
  /**
   *  @description Description text for not restored reason EmbedderSafeBrowsingThreatDetails.
   */
  embedderSafeBrowsingThreatDetails: "Safe Browsing details were shown upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderAppBannerManager.
   */
  embedderAppBannerManager: "App Banner was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderDomDistillerViewerSource.
   */
  embedderDomDistillerViewerSource: "DOM Distiller Viewer was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderDomDistillerSelfDeletingRequestDelegate.
   */
  embedderDomDistillerSelfDeletingRequestDelegate: "DOM distillation was in progress upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderOomInterventionTabHelper.
   */
  embedderOomInterventionTabHelper: "Out-Of-Memory Intervention bar was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderOfflinePage.
   */
  embedderOfflinePage: "The offline page was shown upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderChromePasswordManagerClientBindCredentialManager.
   */
  embedderChromePasswordManagerClientBindCredentialManager: "Chrome Password Manager was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderPermissionRequestManager.
   */
  embedderPermissionRequestManager: "There were permission requests upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderModalDialog.
   */
  embedderModalDialog: "Modal dialog such as form resubmission or http password dialog was shown for the page upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderExtensions.
   */
  embedderExtensions: "Back/forward cache is disabled due to extensions.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionMessaging.
   */
  embedderExtensionMessaging: "Back/forward cache is disabled due to extensions using messaging API.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionMessagingForOpenPort.
   */
  embedderExtensionMessagingForOpenPort: "Extensions with long-lived connection should close the connection before entering back/forward cache.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionSentMessageToCachedFrame.
   */
  embedderExtensionSentMessageToCachedFrame: "Extensions with long-lived connection attempted to send messages to frames in back/forward cache.",
  /**
   *  @description Description text for not restored reason ErrorDocument.
   */
  errorDocument: "Back/forward cache is disabled due to a document error.",
  /**
   *  @description Description text for not restored reason FencedFramesEmbedder.
   */
  fencedFramesEmbedder: "Pages using FencedFrames cannot be stored in bfcache.",
  /**
   *  @description Description text for not restored reason KeepaliveRequest.
   */
  keepaliveRequest: "Back/forward cache is disabled due to a keepalive request.",
  /**
   *  @description Description text for not restored reason JsNetworkRequestReceivedCacheControlNoStoreResource.
   */
  jsNetworkRequestReceivedCacheControlNoStoreResource: "Back/forward cache is disabled because some JavaScript network request received resource with `Cache-Control: no-store` header.",
  /**
   *  @description Description text for not restored reason IndexedDBEvent.
   */
  indexedDBEvent: "Back/forward cache is disabled due to an IndexedDB event.",
  /**
   * @description Description text for not restored reason CookieDisabled.
   */
  cookieDisabled: "Back/forward cache is disabled because cookies are disabled on a page that uses `Cache-Control: no-store`.",
  /**
   * @description Description text for not restored reason WebRTCUsedWithCCNS.
   */
  webRTCUsedWithCCNS: "Back/forward cache is disabled because WebRTC has been used.",
  /**
   * @description Description text for not restored reason WebTransportUsedWithCCNS.
   */
  webTransportUsedWithCCNS: "Back/forward cache is disabled because WebTransport has been used.",
  /**
   * @description Description text for not restored reason WebSocketUsedWithCCNS.
   */
  webSocketUsedWithCCNS: "Back/forward cache is disabled because WebSocket has been used."
};
var str_ = i18n.i18n.registerUIStrings("panels/application/components/BackForwardCacheStrings.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var NotRestoredReasonDescription = {
  NotPrimaryMainFrame: { name: i18nLazyString(UIStrings.notMainFrame) },
  BackForwardCacheDisabled: { name: i18nLazyString(UIStrings.backForwardCacheDisabled) },
  RelatedActiveContentsExist: { name: i18nLazyString(UIStrings.relatedActiveContentsExist) },
  HTTPStatusNotOK: { name: i18nLazyString(UIStrings.HTTPStatusNotOK) },
  SchemeNotHTTPOrHTTPS: { name: i18nLazyString(UIStrings.schemeNotHTTPOrHTTPS) },
  Loading: { name: i18nLazyString(UIStrings.loading) },
  WasGrantedMediaAccess: { name: i18nLazyString(UIStrings.wasGrantedMediaAccess) },
  HTTPMethodNotGET: { name: i18nLazyString(UIStrings.HTTPMethodNotGET) },
  SubframeIsNavigating: { name: i18nLazyString(UIStrings.subframeIsNavigating) },
  Timeout: { name: i18nLazyString(UIStrings.timeout) },
  CacheLimit: { name: i18nLazyString(UIStrings.cacheLimit) },
  JavaScriptExecution: { name: i18nLazyString(UIStrings.JavaScriptExecution) },
  RendererProcessKilled: { name: i18nLazyString(UIStrings.rendererProcessKilled) },
  RendererProcessCrashed: { name: i18nLazyString(UIStrings.rendererProcessCrashed) },
  // @ts-expect-error kept for backwards compatibly
  GrantedMediaStreamAccess: { name: i18nLazyString(UIStrings.grantedMediaStreamAccess) },
  CacheFlushed: { name: i18nLazyString(UIStrings.cacheFlushed) },
  ServiceWorkerVersionActivation: { name: i18nLazyString(UIStrings.serviceWorkerVersionActivation) },
  SessionRestored: { name: i18nLazyString(UIStrings.sessionRestored) },
  ServiceWorkerPostMessage: { name: i18nLazyString(UIStrings.serviceWorkerPostMessage) },
  EnteredBackForwardCacheBeforeServiceWorkerHostAdded: { name: i18nLazyString(UIStrings.enteredBackForwardCacheBeforeServiceWorkerHostAdded) },
  ServiceWorkerClaim: { name: i18nLazyString(UIStrings.serviceWorkerClaim) },
  HaveInnerContents: { name: i18nLazyString(UIStrings.haveInnerContents) },
  TimeoutPuttingInCache: { name: i18nLazyString(UIStrings.timeoutPuttingInCache) },
  BackForwardCacheDisabledByLowMemory: { name: i18nLazyString(UIStrings.backForwardCacheDisabledByLowMemory) },
  BackForwardCacheDisabledByCommandLine: { name: i18nLazyString(UIStrings.backForwardCacheDisabledByCommandLine) },
  NetworkRequestDatapipeDrainedAsBytesConsumer: { name: i18nLazyString(UIStrings.networkRequestDatapipeDrainedAsBytesConsumer) },
  NetworkRequestRedirected: { name: i18nLazyString(UIStrings.networkRequestRedirected) },
  NetworkRequestTimeout: { name: i18nLazyString(UIStrings.networkRequestTimeout) },
  NetworkExceedsBufferLimit: { name: i18nLazyString(UIStrings.networkExceedsBufferLimit) },
  NavigationCancelledWhileRestoring: { name: i18nLazyString(UIStrings.navigationCancelledWhileRestoring) },
  BackForwardCacheDisabledForPrerender: { name: i18nLazyString(UIStrings.backForwardCacheDisabledForPrerender) },
  UserAgentOverrideDiffers: { name: i18nLazyString(UIStrings.userAgentOverrideDiffers) },
  ForegroundCacheLimit: { name: i18nLazyString(UIStrings.foregroundCacheLimit) },
  BackForwardCacheDisabledForDelegate: { name: i18nLazyString(UIStrings.backForwardCacheDisabledForDelegate) },
  UnloadHandlerExistsInMainFrame: { name: i18nLazyString(UIStrings.unloadHandlerExistsInMainFrame) },
  UnloadHandlerExistsInSubFrame: { name: i18nLazyString(UIStrings.unloadHandlerExistsInSubFrame) },
  ServiceWorkerUnregistration: { name: i18nLazyString(UIStrings.serviceWorkerUnregistration) },
  NoResponseHead: { name: i18nLazyString(UIStrings.noResponseHead) },
  CacheControlNoStore: { name: i18nLazyString(UIStrings.cacheControlNoStore) },
  CacheControlNoStoreCookieModified: { name: i18nLazyString(UIStrings.cacheControlNoStore) },
  CacheControlNoStoreHTTPOnlyCookieModified: { name: i18nLazyString(UIStrings.cacheControlNoStore) },
  DisableForRenderFrameHostCalled: { name: i18nLazyString(UIStrings.ineligibleAPI) },
  BlocklistedFeatures: { name: i18nLazyString(UIStrings.ineligibleAPI) },
  SchedulerTrackedFeatureUsed: { name: i18nLazyString(UIStrings.ineligibleAPI) },
  DomainNotAllowed: { name: i18nLazyString(UIStrings.internalError) },
  ConflictingBrowsingInstance: { name: i18nLazyString(UIStrings.internalError) },
  NotMostRecentNavigationEntry: { name: i18nLazyString(UIStrings.internalError) },
  IgnoreEventAndEvict: { name: i18nLazyString(UIStrings.internalError) },
  BrowsingInstanceNotSwapped: { name: i18nLazyString(UIStrings.internalError) },
  ActivationNavigationsDisallowedForBug1234857: { name: i18nLazyString(UIStrings.internalError) },
  Unknown: { name: i18nLazyString(UIStrings.internalError) },
  RenderFrameHostReused_SameSite: { name: i18nLazyString(UIStrings.internalError) },
  RenderFrameHostReused_CrossSite: { name: i18nLazyString(UIStrings.internalError) },
  WebSocket: { name: i18nLazyString(UIStrings.webSocket) },
  WebTransport: { name: i18nLazyString(UIStrings.webTransport) },
  WebRTC: { name: i18nLazyString(UIStrings.webRTC) },
  MainResourceHasCacheControlNoStore: { name: i18nLazyString(UIStrings.mainResourceHasCacheControlNoStore) },
  MainResourceHasCacheControlNoCache: { name: i18nLazyString(UIStrings.mainResourceHasCacheControlNoCache) },
  SubresourceHasCacheControlNoStore: { name: i18nLazyString(UIStrings.subresourceHasCacheControlNoStore) },
  SubresourceHasCacheControlNoCache: { name: i18nLazyString(UIStrings.subresourceHasCacheControlNoCache) },
  ContainsPlugins: { name: i18nLazyString(UIStrings.containsPlugins) },
  DocumentLoaded: { name: i18nLazyString(UIStrings.documentLoaded) },
  DedicatedWorkerOrWorklet: { name: i18nLazyString(UIStrings.dedicatedWorkerOrWorklet) },
  OutstandingNetworkRequestOthers: { name: i18nLazyString(UIStrings.outstandingNetworkRequestOthers) },
  OutstandingIndexedDBTransaction: { name: i18nLazyString(UIStrings.outstandingIndexedDBTransaction) },
  RequestedNotificationsPermission: { name: i18nLazyString(UIStrings.requestedNotificationsPermission) },
  RequestedMIDIPermission: { name: i18nLazyString(UIStrings.requestedMIDIPermission) },
  RequestedAudioCapturePermission: { name: i18nLazyString(UIStrings.requestedAudioCapturePermission) },
  RequestedVideoCapturePermission: { name: i18nLazyString(UIStrings.requestedVideoCapturePermission) },
  RequestedBackForwardCacheBlockedSensors: { name: i18nLazyString(UIStrings.requestedBackForwardCacheBlockedSensors) },
  RequestedBackgroundWorkPermission: { name: i18nLazyString(UIStrings.requestedBackgroundWorkPermission) },
  BroadcastChannel: { name: i18nLazyString(UIStrings.broadcastChannel) },
  IndexedDBConnection: { name: i18nLazyString(UIStrings.indexedDBConnection) },
  WebXR: { name: i18nLazyString(UIStrings.webXR) },
  SharedWorker: { name: i18nLazyString(UIStrings.sharedWorker) },
  SharedWorkerMessage: { name: i18nLazyString(UIStrings.sharedWorkerMessage) },
  WebLocks: { name: i18nLazyString(UIStrings.webLocks) },
  WebHID: { name: i18nLazyString(UIStrings.webHID) },
  WebShare: { name: i18nLazyString(UIStrings.webShare) },
  RequestedStorageAccessGrant: { name: i18nLazyString(UIStrings.requestedStorageAccessGrant) },
  WebNfc: { name: i18nLazyString(UIStrings.webNfc) },
  OutstandingNetworkRequestFetch: { name: i18nLazyString(UIStrings.outstandingNetworkRequestFetch) },
  OutstandingNetworkRequestXHR: { name: i18nLazyString(UIStrings.outstandingNetworkRequestXHR) },
  AppBanner: { name: i18nLazyString(UIStrings.appBanner) },
  Printing: { name: i18nLazyString(UIStrings.printing) },
  WebDatabase: { name: i18nLazyString(UIStrings.webDatabase) },
  PictureInPicture: { name: i18nLazyString(UIStrings.pictureInPicture) },
  SpeechRecognizer: { name: i18nLazyString(UIStrings.speechRecognizer) },
  IdleManager: { name: i18nLazyString(UIStrings.idleManager) },
  PaymentManager: { name: i18nLazyString(UIStrings.paymentManager) },
  SpeechSynthesis: { name: i18nLazyString(UIStrings.speechSynthesis) },
  KeyboardLock: { name: i18nLazyString(UIStrings.keyboardLock) },
  WebOTPService: { name: i18nLazyString(UIStrings.webOTPService) },
  OutstandingNetworkRequestDirectSocket: { name: i18nLazyString(UIStrings.outstandingNetworkRequestDirectSocket) },
  InjectedJavascript: { name: i18nLazyString(UIStrings.injectedJavascript) },
  InjectedStyleSheet: { name: i18nLazyString(UIStrings.injectedStyleSheet) },
  Dummy: { name: i18nLazyString(UIStrings.internalError) },
  ContentDiscarded: { name: i18nLazyString(UIStrings.contentDiscarded) },
  ContentSecurityHandler: { name: i18nLazyString(UIStrings.contentSecurityHandler) },
  ContentWebAuthenticationAPI: { name: i18nLazyString(UIStrings.contentWebAuthenticationAPI) },
  ContentFileChooser: { name: i18nLazyString(UIStrings.contentFileChooser) },
  ContentSerial: { name: i18nLazyString(UIStrings.contentSerial) },
  ContentFileSystemAccess: { name: i18nLazyString(UIStrings.contentFileSystemAccess) },
  ContentMediaDevicesDispatcherHost: { name: i18nLazyString(UIStrings.contentMediaDevicesDispatcherHost) },
  ContentWebBluetooth: { name: i18nLazyString(UIStrings.contentWebBluetooth) },
  ContentWebUSB: { name: i18nLazyString(UIStrings.contentWebUSB) },
  ContentMediaSession: { name: i18nLazyString(UIStrings.contentMediaSession) },
  ContentMediaSessionService: { name: i18nLazyString(UIStrings.contentMediaSessionService) },
  ContentMediaPlay: { name: i18nLazyString(UIStrings.contentMediaPlay) },
  ContentScreenReader: { name: i18nLazyString(UIStrings.contentScreenReader) },
  EmbedderPopupBlockerTabHelper: { name: i18nLazyString(UIStrings.embedderPopupBlockerTabHelper) },
  EmbedderSafeBrowsingTriggeredPopupBlocker: { name: i18nLazyString(UIStrings.embedderSafeBrowsingTriggeredPopupBlocker) },
  EmbedderSafeBrowsingThreatDetails: { name: i18nLazyString(UIStrings.embedderSafeBrowsingThreatDetails) },
  EmbedderAppBannerManager: { name: i18nLazyString(UIStrings.embedderAppBannerManager) },
  EmbedderDomDistillerViewerSource: { name: i18nLazyString(UIStrings.embedderDomDistillerViewerSource) },
  EmbedderDomDistillerSelfDeletingRequestDelegate: { name: i18nLazyString(UIStrings.embedderDomDistillerSelfDeletingRequestDelegate) },
  EmbedderOomInterventionTabHelper: { name: i18nLazyString(UIStrings.embedderOomInterventionTabHelper) },
  EmbedderOfflinePage: { name: i18nLazyString(UIStrings.embedderOfflinePage) },
  EmbedderChromePasswordManagerClientBindCredentialManager: { name: i18nLazyString(UIStrings.embedderChromePasswordManagerClientBindCredentialManager) },
  EmbedderPermissionRequestManager: { name: i18nLazyString(UIStrings.embedderPermissionRequestManager) },
  EmbedderModalDialog: { name: i18nLazyString(UIStrings.embedderModalDialog) },
  EmbedderExtensions: { name: i18nLazyString(UIStrings.embedderExtensions) },
  EmbedderExtensionMessaging: { name: i18nLazyString(UIStrings.embedderExtensionMessaging) },
  EmbedderExtensionMessagingForOpenPort: { name: i18nLazyString(UIStrings.embedderExtensionMessagingForOpenPort) },
  EmbedderExtensionSentMessageToCachedFrame: { name: i18nLazyString(UIStrings.embedderExtensionSentMessageToCachedFrame) },
  ErrorDocument: { name: i18nLazyString(UIStrings.errorDocument) },
  FencedFramesEmbedder: { name: i18nLazyString(UIStrings.fencedFramesEmbedder) },
  KeepaliveRequest: { name: i18nLazyString(UIStrings.keepaliveRequest) },
  JsNetworkRequestReceivedCacheControlNoStoreResource: { name: i18nLazyString(UIStrings.jsNetworkRequestReceivedCacheControlNoStoreResource) },
  IndexedDBEvent: { name: i18nLazyString(UIStrings.indexedDBEvent) },
  CookieDisabled: { name: i18nLazyString(UIStrings.cookieDisabled) },
  WebRTCUsedWithCCNS: { name: i18nLazyString(UIStrings.webRTCUsedWithCCNS) },
  WebTransportUsedWithCCNS: { name: i18nLazyString(UIStrings.webTransportUsedWithCCNS) },
  WebSocketUsedWithCCNS: { name: i18nLazyString(UIStrings.webSocketUsedWithCCNS) },
  HTTPAuthRequired: { name: i18n.i18n.lockedLazyString("HTTPAuthRequired") },
  CookieFlushed: { name: i18n.i18n.lockedLazyString("CookieFlushed") },
  SmartCard: { name: i18n.i18n.lockedLazyString("SmartCard") },
  LiveMediaStreamTrack: { name: i18n.i18n.lockedLazyString("LiveMediaStreamTrack") },
  UnloadHandler: { name: i18n.i18n.lockedLazyString("UnloadHandler") },
  ParserAborted: { name: i18n.i18n.lockedLazyString("ParserAborted") },
  BroadcastChannelOnMessage: { name: i18n.i18n.lockedLazyString("BroadcastChannelOnMessage") },
  RequestedByWebViewClient: { name: i18n.i18n.lockedLazyString("RequestedByWebViewClient") },
  PostMessageByWebViewClient: { name: i18n.i18n.lockedLazyString("PostMessageByWebViewClient") },
  WebViewSettingsChanged: { name: i18n.i18n.lockedLazyString("WebViewSettingsChanged") },
  WebViewJavaScriptObjectChanged: { name: i18n.i18n.lockedLazyString("WebViewJavaScriptObjectChanged") },
  WebViewMessageListenerInjected: { name: i18n.i18n.lockedLazyString("WebViewMessageListenerInjected") },
  WebViewSafeBrowsingAllowlistChanged: { name: i18n.i18n.lockedLazyString("WebViewSafeBrowsingAllowlistChanged") },
  WebViewDocumentStartJavascriptChanged: { name: i18n.i18n.lockedLazyString("WebViewDocumentStartJavascriptChanged") },
  CacheControlNoStoreDeviceBoundSessionTerminated: { name: i18nLazyString(UIStrings.cacheControlNoStore) },
  CacheLimitPrunedOnModerateMemoryPressure: { name: i18n.i18n.lockedLazyString("CacheLimitPrunedOnModerateMemoryPressure") },
  CacheLimitPrunedOnCriticalMemoryPressure: { name: i18n.i18n.lockedLazyString("CacheLimitPrunedOnCriticalMemoryPressure") }
};

// gen/front_end/panels/application/components/backForwardCacheView.css.js
var backForwardCacheView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

devtools-report-value {
  overflow: hidden;
}

.inline-icon {
  vertical-align: sub;
}

.gray-text {
  color: var(--sys-color-token-subtle);
  margin: 0 0 5px 56px;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
  overflow-wrap: break-word;
  overflow: hidden;
  grid-column-start: span 2;
}

.details-list {
  margin-left: 56px;
  grid-column-start: span 2;
}

.help-outline-icon {
  margin: 0 2px;
}

.circled-exclamation-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.status {
  margin-right: 11px;
  flex-shrink: 0;
}

.report-line {
  grid-column-start: span 2;
  display: flex;
  align-items: center;
  margin: 0 30px;
  line-height: 26px;
}

.report-key {
  color: var(--sys-color-token-subtle);
  min-width: auto;
  overflow-wrap: break-word;
  align-self: start;
}

.report-value {
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

devtools-report-value:has(devtools-tree-outline) {
  margin-left: var(--sys-size-7);
}

.cache-status-section:focus-visible {
 outline: 0;
}

.tree-outline li .selection {
  margin-left: -5px;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./backForwardCacheView.css")} */`;

// gen/front_end/panels/application/components/BackForwardCacheView.js
var UIStrings2 = {
  /**
   * @description Title text in back/forward cache view of the Application panel
   */
  mainFrame: "Main Frame",
  /**
   * @description Title text in back/forward cache view of the Application panel
   */
  backForwardCacheTitle: "Back/forward cache",
  /**
   * @description Status text for the status of the main frame
   */
  unavailable: "unavailable",
  /**
   * @description Entry name text in the back/forward cache view of the Application panel
   */
  url: "URL",
  /**
   * @description Status text for the status of the back/forward cache status
   */
  unknown: "Unknown Status",
  /**
   * @description Status text for the status of the back/forward cache status indicating that
   * the back/forward cache was not used and a normal navigation occurred instead.
   */
  normalNavigation: "Not served from back/forward cache: to trigger back/forward cache, use Chrome's back/forward buttons, or use the test button below to automatically navigate away and back.",
  /**
   * @description Status text for the status of the back/forward cache status indicating that
   * the back/forward cache was used to restore the page instead of reloading it.
   */
  restoredFromBFCache: "Successfully served from back/forward cache.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are actionable i.e. they can be cleaned up to make the
   * page eligible for back/forward cache.
   */
  pageSupportNeeded: "Actionable",
  /**
   * @description Label for the completion of the back/forward cache test
   */
  testCompleted: "Back/forward cache test completed.",
  /**
   * @description Explanation for actionable items which prevent the page from being eligible
   * for back/forward cache.
   */
  pageSupportNeededExplanation: "These reasons are actionable i.e. they can be cleaned up to make the page eligible for back/forward cache.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are circumstantial / not actionable i.e. they cannot be
   * cleaned up by developers to make the page eligible for back/forward cache.
   */
  circumstantial: "Not Actionable",
  /**
   * @description Explanation for circumstantial/non-actionable items which prevent the page from being eligible
   * for back/forward cache.
   */
  circumstantialExplanation: "These reasons are not actionable i.e. caching was prevented by something outside of the direct control of the page.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are pending support by chrome i.e. in a future version
   * of chrome they will not prevent back/forward cache usage anymore.
   */
  supportPending: "Pending Support",
  /**
   * @description Label for the button to test whether BFCache is available for the page
   */
  runTest: "Test back/forward cache",
  /**
   * @description Label for the disabled button while the test is running
   */
  runningTest: "Running test",
  /**
   * @description Link Text about explanation of back/forward cache
   */
  learnMore: "Learn more: back/forward cache eligibility",
  /**
   * @description Link Text about unload handler
   */
  neverUseUnload: "Learn more: Never use unload handler",
  /**
   * @description Explanation for 'pending support' items which prevent the page from being eligible
   * for back/forward cache.
   */
  supportPendingExplanation: "Chrome support for these reasons is pending i.e. they will not prevent the page from being eligible for back/forward cache in a future version of Chrome.",
  /**
   * @description Text that precedes displaying a link to the extension which blocked the page from being eligible for back/forward cache.
   */
  blockingExtensionId: "Extension id: ",
  /**
   * @description Label for the 'Frames' section of the back/forward cache view, which shows a frame tree of the
   * page with reasons why the frames can't be cached.
   */
  framesTitle: "Frames",
  /**
   * @description Top level summary of the total number of issues found in a single frame.
   */
  issuesInSingleFrame: "{n, plural, =1 {# issue found in 1 frame.} other {# issues found in 1 frame.}}",
  /**
   * @description Top level summary of the total number of issues found and the number of frames they were found in.
   * 'm' is never less than 2.
   * @example {3} m
   */
  issuesInMultipleFrames: "{n, plural, =1 {# issue found in {m} frames.} other {# issues found in {m} frames.}}",
  /**
   * @description Shows the number of frames with a particular issue.
   */
  framesPerIssue: "{n, plural, =1 {# frame} other {# frames}}",
  /**
   * @description Title for a frame in the frame tree that doesn't have a URL. Placeholder indicates which number frame with a blank URL it is.
   * @example {3} PH1
   */
  blankURLTitle: "Blank URL [{PH1}]",
  /**
   * @description Shows the number of files with a particular issue.
   */
  filesPerIssue: "{n, plural, =1 {# file} other {# files}}"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/application/components/BackForwardCacheView.ts", UIStrings2);
var i18nString = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var { widgetConfig } = UI.Widget;
function renderMainFrameInformation(frame, frameTreeData, reasonToFramesMap, screenStatus, navigateAwayAndBack) {
  if (!frame) {
    return html`
      <devtools-report-key>
        ${i18nString(UIStrings2.mainFrame)}
      </devtools-report-key>
      <devtools-report-value>
        ${i18nString(UIStrings2.unavailable)}
      </devtools-report-value>`;
  }
  const isTestRunning = screenStatus === "Running";
  const isTestingForbidden = Common.ParsedURL.schemeIs(frame.url, "devtools:");
  return html`
    ${renderBackForwardCacheStatus(frame.backForwardCacheDetails.restoredFromCache)}
    <devtools-report-key>${i18nString(UIStrings2.url)}</devtools-report-key>
    <devtools-report-value>${frame.url}</devtools-report-value>
    ${maybeRenderFrameTree(frameTreeData)}
    <devtools-report-section>
      <devtools-button
        aria-label=${i18nString(UIStrings2.runTest)}
        .disabled=${isTestRunning || isTestingForbidden}
        .spinner=${isTestRunning}
        .variant=${"primary"}
        @click=${navigateAwayAndBack}
        jslog=${VisualLogging.action("back-forward-cache.run-test").track({ click: true })}>
        ${isTestRunning ? html`
          ${i18nString(UIStrings2.runningTest)}` : `
          ${i18nString(UIStrings2.runTest)}
        `}
      </devtools-button>
    </devtools-report-section>
    <devtools-report-divider>
    </devtools-report-divider>
    ${maybeRenderExplanations(frame.backForwardCacheDetails.explanations, frame.backForwardCacheDetails.explanationsTree, reasonToFramesMap)}
    <devtools-report-section>
      <x-link href="https://web.dev/bfcache/" class="link"
      jslog=${VisualLogging.action("learn-more.eligibility").track({ click: true })}>
        ${i18nString(UIStrings2.learnMore)}
      </x-link>
    </devtools-report-section>`;
}
function maybeRenderFrameTree(frameTreeData) {
  if (!frameTreeData || frameTreeData.frameCount === 0 && frameTreeData.issueCount === 0) {
    return nothing;
  }
  function renderFrameTreeNode(node) {
    return html`
      <li role="treeitem" class="text-ellipsis">
        ${node.iconName ? html`
          <devtools-icon class="inline-icon extra-large" .name=${node.iconName} style="margin-bottom: -3px;">
          </devtools-icon>
        ` : nothing}
        ${node.text}
        ${node.children?.length ? html`
          <ul role="group" hidden>
            ${node.children.map((child) => renderFrameTreeNode(child))}
          </ul>` : nothing}
      </li>`;
  }
  let title = "";
  if (frameTreeData.frameCount === 1) {
    title = i18nString(UIStrings2.issuesInSingleFrame, { n: frameTreeData.issueCount });
  } else {
    title = i18nString(UIStrings2.issuesInMultipleFrames, { n: frameTreeData.issueCount, m: frameTreeData.frameCount });
  }
  return html`
    <devtools-report-key jslog=${VisualLogging.section("frames")}>${i18nString(UIStrings2.framesTitle)}</devtools-report-key>
    <devtools-report-value>
      <devtools-tree .template=${html`
        <ul role="tree">
          <li role="treeitem" class="text-ellipsis">
            ${title}
            <ul role="group">
              ${renderFrameTreeNode(frameTreeData.node)}
            </ul>
          </li>
        </ul>
      `}>
      </devtools-tree>
    </devtools-report-value>`;
}
function renderBackForwardCacheStatus(status) {
  switch (status) {
    case true:
      return html`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status extra-large">
            <devtools-icon class="inline-icon extra-large" name="check-circle" style="color: var(--icon-checkmark-green);">
            </devtools-icon>
          </div>
          ${i18nString(UIStrings2.restoredFromBFCache)}
        </devtools-report-section>`;
    // clang-format on
    case false:
      return html`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status">
            <devtools-icon class="inline-icon extra-large" name="clear">
            </devtools-icon>
          </div>
          ${i18nString(UIStrings2.normalNavigation)}
        </devtools-report-section>`;
  }
  return html`
    <devtools-report-section autofocus tabindex="-1">
      ${i18nString(UIStrings2.unknown)}
    </devtools-report-section>`;
}
function maybeRenderExplanations(explanations, explanationTree, reasonToFramesMap) {
  if (explanations.length === 0) {
    return nothing;
  }
  const pageSupportNeeded = explanations.filter(
    (explanation) => explanation.type === "PageSupportNeeded"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.PageSupportNeeded */
  );
  const supportPending = explanations.filter(
    (explanation) => explanation.type === "SupportPending"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending */
  );
  const circumstantial = explanations.filter(
    (explanation) => explanation.type === "Circumstantial"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial */
  );
  return html`
    ${renderExplanations(i18nString(UIStrings2.pageSupportNeeded), i18nString(UIStrings2.pageSupportNeededExplanation), pageSupportNeeded, reasonToFramesMap)}
    ${renderExplanations(i18nString(UIStrings2.supportPending), i18nString(UIStrings2.supportPendingExplanation), supportPending, reasonToFramesMap)}
    ${renderExplanations(i18nString(UIStrings2.circumstantial), i18nString(UIStrings2.circumstantialExplanation), circumstantial, reasonToFramesMap)}`;
}
function renderExplanations(category, explainerText, explanations, reasonToFramesMap) {
  return html`
    ${explanations.length > 0 ? html`
      <devtools-report-section-header>
        ${category}
        <div class="help-outline-icon">
          <devtools-icon class="inline-icon medium" name="help" title=${explainerText}>
          </devtools-icon>
        </div>
      </devtools-report-section-header>
      ${explanations.map((explanation) => renderReason(explanation, reasonToFramesMap.get(explanation.reason)))}
    ` : nothing}`;
}
function maybeRenderReasonContext(explanation) {
  if (explanation.reason === "EmbedderExtensionSentMessageToCachedFrame" && explanation.context) {
    const link4 = "chrome://extensions/?id=" + explanation.context;
    return html`${i18nString(UIStrings2.blockingExtensionId)}
      <devtools-chrome-link .href=${link4}>${explanation.context}</devtools-chrome-link>`;
  }
  return nothing;
}
function renderFramesPerReason(frames) {
  if (frames === void 0 || frames.length === 0) {
    return nothing;
  }
  const rows = [html`<div>${i18nString(UIStrings2.framesPerIssue, { n: frames.length })}</div>`];
  rows.push(...frames.map((url) => html`<div class="text-ellipsis" title=${url}
    jslog=${VisualLogging.treeItem()}>${url}</div>`));
  return html`
      <div class="details-list"
      jslog=${VisualLogging.tree("frames-per-issue")}>
        <devtools-expandable-list .data=${{
    rows,
    title: i18nString(UIStrings2.framesPerIssue, { n: frames.length })
  }}
        jslog=${VisualLogging.treeItem()}></devtools-expandable-list>
      </div>
    `;
}
function maybeRenderDeepLinkToUnload(explanation) {
  if (explanation.reason === "UnloadHandlerExistsInMainFrame" || explanation.reason === "UnloadHandlerExistsInSubFrame") {
    return html`
        <x-link href="https://web.dev/bfcache/#never-use-the-unload-event" class="link"
        jslog=${VisualLogging.action("learn-more.never-use-unload").track({
      click: true
    })}>
          ${i18nString(UIStrings2.neverUseUnload)}
        </x-link>`;
  }
  return nothing;
}
function maybeRenderJavaScriptDetails(details) {
  if (details === void 0 || details.length === 0) {
    return nothing;
  }
  const maxLengthForDisplayedURLs = 50;
  const rows = [html`<div>${i18nString(UIStrings2.filesPerIssue, { n: details.length })}</div>`];
  rows.push(...details.map((detail) => html`
          <devtools-widget .widgetConfig=${widgetConfig(Components.Linkifier.ScriptLocationLink, {
    sourceURL: detail.url,
    lineNumber: detail.lineNumber,
    options: {
      columnNumber: detail.columnNumber,
      showColumnNumber: true,
      inlineFrameIndex: 0,
      maxLength: maxLengthForDisplayedURLs
    }
  })}></devtools-widget>`));
  return html`
      <div class="details-list">
        <devtools-expandable-list .data=${{ rows }}></devtools-expandable-list>
      </div>
    `;
}
function renderReason(explanation, frames) {
  return html`
    <devtools-report-section>
      ${explanation.reason in NotRestoredReasonDescription ? html`
          <div class="circled-exclamation-icon">
            <devtools-icon class="inline-icon medium" style="color: var(--icon-warning)" name="warning">
            </devtools-icon>
          </div>
          <div>
            ${NotRestoredReasonDescription[explanation.reason].name()}
            ${maybeRenderDeepLinkToUnload(explanation)}
            ${maybeRenderReasonContext(explanation)}
          </div>` : nothing}
    </devtools-report-section>
    <div class="gray-text">
      ${explanation.reason}
    </div>
    ${maybeRenderJavaScriptDetails(explanation.details)}
    ${renderFramesPerReason(frames)}`;
}
var DEFAULT_VIEW = (input, output, target) => {
  render(html`
    <style>${backForwardCacheView_css_default}</style>
    <devtools-report .data=${{ reportTitle: i18nString(UIStrings2.backForwardCacheTitle) }} jslog=${VisualLogging.pane("back-forward-cache")}>

      ${renderMainFrameInformation(input.frame, input.frameTreeData, input.reasonToFramesMap, input.screenStatus, input.navigateAwayAndBack)}
    </devtools-report>
  `, target);
};
var BackForwardCacheView = class extends UI.Widget.Widget {
  #screenStatus = "Result";
  #historyIndex = 0;
  #view;
  constructor(view = DEFAULT_VIEW) {
    super({ useShadowDom: true, delegatesFocus: true });
    this.#view = view;
    this.#getMainResourceTreeModel()?.addEventListener(SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.requestUpdate, this);
    this.#getMainResourceTreeModel()?.addEventListener(SDK.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, this.requestUpdate, this);
    this.requestUpdate();
  }
  #getMainResourceTreeModel() {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    return mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel) || null;
  }
  #getMainFrame() {
    return this.#getMainResourceTreeModel()?.mainFrame || null;
  }
  async performUpdate() {
    const reasonToFramesMap = /* @__PURE__ */ new Map();
    const frame = this.#getMainFrame();
    const explanationTree = frame?.backForwardCacheDetails?.explanationsTree;
    if (explanationTree) {
      this.#buildReasonToFramesMap(explanationTree, { blankCount: 1 }, reasonToFramesMap);
    }
    const frameTreeData = this.#buildFrameTreeDataRecursive(explanationTree, { blankCount: 1 });
    frameTreeData.node.iconName = "frame";
    const viewInput = {
      frame,
      frameTreeData,
      reasonToFramesMap,
      screenStatus: this.#screenStatus,
      navigateAwayAndBack: this.#navigateAwayAndBack.bind(this)
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  #renderBackForwardCacheTestResult() {
    SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
    this.#screenStatus = "Result";
    this.requestUpdate();
    void this.updateComplete.then(() => {
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings2.testCompleted));
      this.contentElement.focus();
    });
  }
  async #onNavigatedAway() {
    SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
    await this.#waitAndGoBackInHistory(50);
  }
  async #waitAndGoBackInHistory(delay) {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const historyResults = await resourceTreeModel?.navigationHistory();
    if (!resourceTreeModel || !historyResults) {
      return;
    }
    if (historyResults.currentIndex === this.#historyIndex) {
      window.setTimeout(this.#waitAndGoBackInHistory.bind(this, delay * 2), delay);
    } else {
      SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
      resourceTreeModel.navigateToHistoryEntry(historyResults.entries[historyResults.currentIndex - 1]);
    }
  }
  async #navigateAwayAndBack() {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const historyResults = await resourceTreeModel?.navigationHistory();
    if (!resourceTreeModel || !historyResults) {
      return;
    }
    this.#historyIndex = historyResults.currentIndex;
    this.#screenStatus = "Running";
    this.requestUpdate();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
    void resourceTreeModel.navigate("chrome://terms");
  }
  // Builds a subtree of the frame tree, conaining only frames with BFCache issues and their ancestors.
  // Returns the root node, the number of frames in the subtree, and the number of issues in the subtree.
  #buildFrameTreeDataRecursive(explanationTree, nextBlankURLCount) {
    if (!explanationTree) {
      return { node: { text: "" }, frameCount: 0, issueCount: 0 };
    }
    let frameCount = 1;
    let issueCount = 0;
    const children = [];
    let nodeUrlText = "";
    if (explanationTree.url.length) {
      nodeUrlText = explanationTree.url;
    } else {
      nodeUrlText = i18nString(UIStrings2.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
      nextBlankURLCount.blankCount += 1;
    }
    for (const explanation of explanationTree.explanations) {
      const child = { text: explanation.reason };
      issueCount += 1;
      children.push(child);
    }
    for (const child of explanationTree.children) {
      const frameTreeData = this.#buildFrameTreeDataRecursive(child, nextBlankURLCount);
      if (frameTreeData.issueCount > 0) {
        children.push(frameTreeData.node);
        issueCount += frameTreeData.issueCount;
        frameCount += frameTreeData.frameCount;
      }
    }
    let node = {
      text: `(${issueCount}) ${nodeUrlText}`
    };
    if (children.length) {
      node = { ...node, children };
      node.iconName = "iframe";
    } else if (!explanationTree.url.length) {
      nextBlankURLCount.blankCount -= 1;
    }
    return { node, frameCount, issueCount };
  }
  #buildReasonToFramesMap(explanationTree, nextBlankURLCount, outputMap) {
    let url = explanationTree.url;
    if (url.length === 0) {
      url = i18nString(UIStrings2.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
      nextBlankURLCount.blankCount += 1;
    }
    explanationTree.explanations.forEach((explanation) => {
      let frames = outputMap.get(explanation.reason);
      if (frames === void 0) {
        frames = [url];
        outputMap.set(explanation.reason, frames);
      } else {
        frames.push(url);
      }
    });
    explanationTree.children.map((child) => {
      this.#buildReasonToFramesMap(child, nextBlankURLCount, outputMap);
    });
  }
};

// gen/front_end/panels/application/components/BounceTrackingMitigationsView.js
var BounceTrackingMitigationsView_exports = {};
__export(BounceTrackingMitigationsView_exports, {
  BounceTrackingMitigationsView: () => BounceTrackingMitigationsView,
  i18nString: () => i18nString2
});
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/bounceTrackingMitigationsView.css.js
var bounceTrackingMitigationsView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
devtools-data-grid {
  margin-top: 0;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./bounceTrackingMitigationsView.css")} */`;

// gen/front_end/panels/application/components/BounceTrackingMitigationsView.js
var { html: html2 } = Lit;
var UIStrings3 = {
  /**
   * @description Title text in bounce tracking mitigations view of the Application panel.
   */
  bounceTrackingMitigationsTitle: "Bounce tracking mitigations",
  /**
   * @description Label for the button to force bounce tracking mitigations to run.
   */
  forceRun: "Force run",
  /**
   * @description Label for the disabled button while bounce tracking mitigations are running
   */
  runningMitigations: "Running",
  /**
   * @description Heading of table which displays sites whose state was deleted by bounce tracking mitigations.
   */
  stateDeletedFor: "State was deleted for the following sites:",
  /**
   * @description Text shown once the deletion command has been sent to the browser process.
   */
  checkingPotentialTrackers: "Checking for potential bounce tracking sites.",
  /**
   * @description Link text about explanation of Bounce Tracking Mitigations.
   */
  learnMore: "Learn more: Bounce Tracking Mitigations",
  /**
   * @description Text shown when bounce tracking mitigations have been forced to run and
   * identified no potential bounce tracking sites to delete state for. This may also
   * indicate that bounce tracking mitigations are disabled or third-party cookies aren't being blocked.
   */
  noPotentialBounceTrackersIdentified: "State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.",
  /**
   * @description Text shown when bounce tracking mitigations are disabled.
   */
  featureDisabled: "Bounce tracking mitigations are disabled."
};
var str_3 = i18n5.i18n.registerUIStrings("panels/application/components/BounceTrackingMitigationsView.ts", UIStrings3);
var i18nString2 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var BounceTrackingMitigationsView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #trackingSites = [];
  #screenStatus = "Result";
  #checkedFeature = false;
  #seenButtonClick = false;
  connectedCallback() {
    void this.#render();
    this.parentElement?.classList.add("overflow-auto");
  }
  async #render() {
    Lit.render(html2`
      <style>${bounceTrackingMitigationsView_css_default}</style>
      <devtools-report .data=${{ reportTitle: i18nString2(UIStrings3.bounceTrackingMitigationsTitle) }}
                       jslog=${VisualLogging2.pane("bounce-tracking-mitigations")}>
        ${await this.#renderMainFrameInformation()}
      </devtools-report>
    `, this.#shadow, { host: this });
  }
  async #renderMainFrameInformation() {
    if (!this.#checkedFeature) {
      await this.#checkFeatureState();
    }
    if (this.#screenStatus === "Disabled") {
      return html2`
        <devtools-report-section>
          ${i18nString2(UIStrings3.featureDisabled)}
        </devtools-report-section>
      `;
    }
    return html2`
      <devtools-report-section>
        ${this.#renderForceRunButton()}
      </devtools-report-section>
      ${this.#renderDeletedSitesOrNoSitesMessage()}
      <devtools-report-divider>
      </devtools-report-divider>
      <devtools-report-section>
        <x-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
        jslog=${VisualLogging2.link("learn-more").track({ click: true })}>
          ${i18nString2(UIStrings3.learnMore)}
        </x-link>
      </devtools-report-section>
    `;
  }
  #renderForceRunButton() {
    const isMitigationRunning = this.#screenStatus === "Running";
    return html2`
      <devtools-button
        aria-label=${i18nString2(UIStrings3.forceRun)}
        .disabled=${isMitigationRunning}
        .spinner=${isMitigationRunning}
        .variant=${"primary"}
        @click=${this.#runMitigations}
        jslog=${VisualLogging2.action("force-run").track({ click: true })}>
        ${isMitigationRunning ? html2`
          ${i18nString2(UIStrings3.runningMitigations)}` : `
          ${i18nString2(UIStrings3.forceRun)}
        `}
      </devtools-button>
    `;
  }
  #renderDeletedSitesOrNoSitesMessage() {
    if (!this.#seenButtonClick) {
      return Lit.nothing;
    }
    if (this.#trackingSites.length === 0) {
      return html2`
        <devtools-report-section>
        ${this.#screenStatus === "Running" ? html2`
          ${i18nString2(UIStrings3.checkingPotentialTrackers)}` : `
          ${i18nString2(UIStrings3.noPotentialBounceTrackersIdentified)}
        `}
        </devtools-report-section>
      `;
    }
    return html2`
      <devtools-report-section>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="sites" weight="10" sortable>
                ${i18nString2(UIStrings3.stateDeletedFor)}
              </th>
            </tr>
            ${this.#trackingSites.map((site) => html2`
              <tr><td>${site}</td></tr>`)}
          </table>
        </devtools-data-grid>
      </devtools-report-section>
    `;
  }
  async #runMitigations() {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    this.#seenButtonClick = true;
    this.#screenStatus = "Running";
    void this.#render();
    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach((element) => {
      this.#trackingSites.push(element);
    });
    this.#renderMitigationsResult();
  }
  #renderMitigationsResult() {
    this.#screenStatus = "Result";
    void this.#render();
  }
  async #checkFeatureState() {
    this.#checkedFeature = true;
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    if (!(await mainTarget.systemInfo().invoke_getFeatureState({ featureState: "DIPS" })).featureEnabled) {
      this.#screenStatus = "Disabled";
    }
  }
};
customElements.define("devtools-bounce-tracking-mitigations-view", BounceTrackingMitigationsView);

// gen/front_end/panels/application/components/EndpointsGrid.js
var EndpointsGrid_exports = {};
__export(EndpointsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  EndpointsGrid: () => EndpointsGrid,
  i18nString: () => i18nString3
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import * as Lit2 from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/endpointsGrid.css.js
var endpointsGrid_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    overflow: auto;
    height: 100%;
  }

  .endpoints-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .endpoints-header {
    font-size: 15px;
    background-color: var(--sys-color-surface2);
    padding: 1px 4px;
    flex-shrink: 0;
  }

  devtools-data-grid {
    flex: auto;
  }
}

/*# sourceURL=${import.meta.resolve("./endpointsGrid.css")} */`;

// gen/front_end/panels/application/components/EndpointsGrid.js
var UIStrings4 = {
  /**
   * @description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  noEndpointsToDisplay: "No endpoints to display",
  /**
   * @description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  endpointsDescription: "Here you will find the list of endpoints that receive the reports"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/application/components/EndpointsGrid.ts", UIStrings4);
var i18nString3 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var { render: render3, html: html3 } = Lit2;
var DEFAULT_VIEW2 = (input, output, target) => {
  render3(html3`
    <style>${endpointsGrid_css_default}</style>
    <style>${UI2.inspectorCommonStyles}</style>
    <div class="endpoints-container" jslog=${VisualLogging3.section("endpoints")}>
      <div class="endpoints-header">${i18n7.i18n.lockedString("Endpoints")}</div>
      ${input.endpoints.size > 0 ? html3`
        <devtools-data-grid striped>
         <table>
          <tr>
            <th id="origin" weight="30">${i18n7.i18n.lockedString("Origin")}</th>
            <th id="name" weight="20">${i18n7.i18n.lockedString("Name")}</th>
            <th id="url" weight="30">${i18n7.i18n.lockedString("URL")}</th>
          </tr>
          ${Array.from(input.endpoints).map(([origin, endpointArray]) => endpointArray.map((endpoint) => html3`<tr>
                <td>${origin}</td>
                <td>${endpoint.groupName}</td>
                <td>${endpoint.url}</td>
              </tr>`)).flat()}
          </table>
        </devtools-data-grid>
      ` : html3`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString3(UIStrings4.noEndpointsToDisplay)}</span>
          <span class="empty-state-description">${i18nString3(UIStrings4.endpointsDescription)}</span>
        </div>
      `}
    </div>
  `, target);
};
var EndpointsGrid = class extends UI2.Widget.Widget {
  endpoints = /* @__PURE__ */ new Map();
  #view;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      endpoints: this.endpoints
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/FrameDetailsView.js
var FrameDetailsView_exports = {};
__export(FrameDetailsView_exports, {
  FrameDetailsReportView: () => FrameDetailsReportView
});
import "./../../../ui/components/expandable_list/expandable_list.js";
import "./../../../ui/components/report_view/report_view.js";

// gen/front_end/panels/application/components/StackTrace.js
var StackTrace_exports = {};
__export(StackTrace_exports, {
  StackTrace: () => StackTrace,
  StackTraceLinkButton: () => StackTraceLinkButton,
  StackTraceRow: () => StackTraceRow
});
import "./../../../ui/components/expandable_list/expandable_list.js";
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as Components2 from "./../../../ui/legacy/components/utils/utils.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/stackTraceLinkButton.css.js
var stackTraceLinkButton_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

button.link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
}

/*# sourceURL=${import.meta.resolve("./stackTraceLinkButton.css")} */`;

// gen/front_end/panels/application/components/stackTraceRow.css.js
var stackTraceRow_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.stack-trace-row {
  display: flex;
}

.stack-trace-function-name {
  width: 100px;
}

.stack-trace-source-location {
  display: flex;
  overflow: hidden;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stack-trace-source-location .text-ellipsis {
  padding-right: 2px;
}

.ignore-list-link {
  opacity: 60%;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--sys-size-6);

  &:focus-visible {
    outline: 2px solid var(--sys-color-state-focus-ring);
    outline-offset: 0;
    border-radius: var(--sys-shape-corner-extra-small);
  }
}

/*# sourceURL=${import.meta.resolve("./stackTraceRow.css")} */`;

// gen/front_end/panels/application/components/StackTrace.js
var { html: html4 } = Lit3;
var UIStrings5 = {
  /**
   * @description Error message stating that something went wrong when trying to render stack trace
   */
  cannotRenderStackTrace: "Cannot render stack trace",
  /**
   * @description A link to show more frames in the stack trace if more are available. Never 0.
   */
  showSMoreFrames: "{n, plural, =1 {Show # more frame} other {Show # more frames}}",
  /**
   * @description A link to rehide frames that are by default hidden.
   */
  showLess: "Show less",
  /**
   * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
   * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
   */
  creationStackTrace: "Frame Creation `Stack Trace`"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/application/components/StackTrace.ts", UIStrings5);
var i18nString4 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var StackTraceRow = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #stackTraceRowItem = null;
  set data(data) {
    this.#stackTraceRowItem = data.stackTraceRowItem;
    this.#render();
  }
  #render() {
    if (!this.#stackTraceRowItem) {
      return;
    }
    Lit3.render(html4`
      <style>${stackTraceRow_css_default}</style>
      <div class="stack-trace-row">
              <div class="stack-trace-function-name text-ellipsis" title=${this.#stackTraceRowItem.functionName}>
                ${this.#stackTraceRowItem.functionName}
              </div>
              <div class="stack-trace-source-location">
                ${this.#stackTraceRowItem.link ? html4`<div class="text-ellipsis">\xA0@\xA0${this.#stackTraceRowItem.link}</div>` : Lit3.nothing}
              </div>
            </div>
    `, this.#shadow, { host: this });
  }
};
var StackTraceLinkButton = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #onShowAllClick = () => {
  };
  #hiddenCallFramesCount = null;
  #expandedView = false;
  set data(data) {
    this.#onShowAllClick = data.onShowAllClick;
    this.#hiddenCallFramesCount = data.hiddenCallFramesCount;
    this.#expandedView = data.expandedView;
    this.#render();
  }
  #render() {
    if (!this.#hiddenCallFramesCount) {
      return;
    }
    const linkText = this.#expandedView ? i18nString4(UIStrings5.showLess) : i18nString4(UIStrings5.showSMoreFrames, { n: this.#hiddenCallFramesCount });
    Lit3.render(html4`
      <style>${stackTraceLinkButton_css_default}</style>
      <div class="stack-trace-row">
          <button class="link" @click=${() => this.#onShowAllClick()}>
            ${linkText}
          </button>
        </div>
    `, this.#shadow, { host: this });
  }
};
var StackTrace = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #linkifier = new Components2.Linkifier.Linkifier();
  #stackTraceRows = [];
  #showHidden = false;
  set data(data) {
    const frame = data.frame;
    const { creationStackTrace, creationStackTraceTarget } = frame.getCreationStackTraceData();
    if (creationStackTrace) {
      this.#stackTraceRows = data.buildStackTraceRows(creationStackTrace, creationStackTraceTarget, this.#linkifier, true, this.#onStackTraceRowsUpdated.bind(this));
    }
    this.#render();
  }
  #onStackTraceRowsUpdated(stackTraceRows) {
    this.#stackTraceRows = stackTraceRows;
    this.#render();
  }
  #onToggleShowAllClick() {
    this.#showHidden = !this.#showHidden;
    this.#render();
  }
  createRowTemplates() {
    const expandableRows = [];
    let hiddenCallFramesCount = 0;
    for (const item2 of this.#stackTraceRows) {
      let ignoreListHide = false;
      if ("link" in item2 && item2.link) {
        const uiLocation = Components2.Linkifier.Linkifier.uiLocation(item2.link);
        ignoreListHide = Boolean(uiLocation?.isIgnoreListed());
      }
      if (this.#showHidden || !ignoreListHide) {
        if ("functionName" in item2) {
          expandableRows.push(html4`
          <devtools-stack-trace-row data-stack-trace-row .data=${{
            stackTraceRowItem: item2
          }}></devtools-stack-trace-row>`);
        }
        if ("asyncDescription" in item2) {
          expandableRows.push(html4`
            <div>${item2.asyncDescription}</div>
          `);
        }
      }
      if ("functionName" in item2 && ignoreListHide) {
        hiddenCallFramesCount++;
      }
    }
    if (hiddenCallFramesCount) {
      expandableRows.push(html4`
      <devtools-stack-trace-link-button data-stack-trace-row .data=${{ onShowAllClick: this.#onToggleShowAllClick.bind(this), hiddenCallFramesCount, expandedView: this.#showHidden }}></devtools-stack-trace-link-button>
      `);
    }
    return expandableRows;
  }
  #render() {
    if (!this.#stackTraceRows.length) {
      Lit3.render(html4`
          <span>${i18nString4(UIStrings5.cannotRenderStackTrace)}</span>
        `, this.#shadow, { host: this });
      return;
    }
    const expandableRows = this.createRowTemplates();
    Lit3.render(html4`
        <devtools-expandable-list .data=${{ rows: expandableRows, title: i18nString4(UIStrings5.creationStackTrace) }}
                                  jslog=${VisualLogging4.tree()}>
        </devtools-expandable-list>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-stack-trace-row", StackTraceRow);
customElements.define("devtools-stack-trace-link-button", StackTraceLinkButton);
customElements.define("devtools-resources-stack-trace", StackTrace);

// gen/front_end/panels/application/components/FrameDetailsView.js
import * as Common3 from "./../../../core/common/common.js";
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as Root from "./../../../core/root/root.js";
import * as SDK4 from "./../../../core/sdk/sdk.js";
import * as Bindings from "./../../../models/bindings/bindings.js";
import * as Workspace from "./../../../models/workspace/workspace.js";
import * as NetworkForward2 from "./../../network/forward/forward.js";
import * as CspEvaluator from "./../../../third_party/csp_evaluator/csp_evaluator.js";
import * as Buttons4 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper3 from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator2 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as Components3 from "./../../../ui/legacy/components/utils/utils.js";
import * as UI4 from "./../../../ui/legacy/legacy.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/frameDetailsReportView.css.js
var frameDetailsReportView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button ~ .text-ellipsis {
  padding-left: 2px;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  padding: 0;
  margin-left: var(--sys-size-3);
  white-space: nowrap;;
}

button.link {
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  height: 16px;
}

button.link:has(devtools-icon) {
  margin-top: 5px;
}

devtools-button.help-button {
  top: 4px;
  position: relative;
}

button.text-link {
  padding-left: 2px;
  height: 26px;
}

.inline-button {
  padding-left: 1ex;
}

.inline-comment {
  padding-left: 1ex;
  white-space: pre-line;
}

.inline-comment::before {
  content: "(";
}

.inline-comment::after {
  content: ")";
}

.inline-name {
  color: var(--sys-color-token-subtle);
  padding-inline: 4px;
  user-select: none;
  white-space: pre-line;
}

.inline-items {
  display: flex;
}

.span-cols {
  grid-column-start: span 2;
  margin-left: var(--sys-size-9);
  line-height: 28px;
}

.report-section:has(.link) {
  line-height: var(--sys-size-12);
}

.without-min-width {
  min-width: auto;
}

.bold {
  font-weight: bold;
}

.link:not(button):has(devtools-icon) {
  vertical-align: baseline;
  margin-inline-start: 3px;
}

.inline-icon {
  margin-bottom: -5px;
  width: 18px;
  height: 18px;
  vertical-align: baseline;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./frameDetailsReportView.css")} */`;

// gen/front_end/panels/application/components/OriginTrialTreeView.js
var OriginTrialTreeView_exports = {};
__export(OriginTrialTreeView_exports, {
  OriginTrialTokenRows: () => OriginTrialTokenRows,
  OriginTrialTreeView: () => OriginTrialTreeView
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/legacy/legacy.js";
import "./../../../ui/components/adorners/adorners.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
import { Directives, html as html5, nothing as nothing4, render as render5 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/originTrialTokenRows.css.js
var originTrialTokenRows_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.content {
  display: grid;
  grid-template-columns: min-content 1fr;
}

.key {
  color: var(--sys-color-token-subtle);
  padding: 0 6px;
  text-align: right;
  white-space: pre;
}

.value {
  color: var(--sys-color-token-subtle);
  margin-inline-start: 0;
  padding: 0 6px;
}

.error-text {
  color: var(--sys-color-error-bright);
  font-weight: bold;
}

/*# sourceURL=${import.meta.resolve("./originTrialTokenRows.css")} */`;

// gen/front_end/panels/application/components/originTrialTreeView.css.js
var originTrialTreeView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  .status-badge {
    border-radius: 4px;
    padding: 4px;
    background: var(--sys-color-neutral-container);

    & > devtools-icon {
      vertical-align: sub;
    }
  }

  .badge-error {
    --override-adorner-text-color: var(--sys-color-error-bright);
    --override-adorner-border-color: var(--sys-color-error-bright);
  }

  .badge-success {
    --override-adorner-text-color: var(--sys-color-tertiary);
    --override-adorner-border-color: var(--sys-color-tertiary);
  }

  .badge-secondary {
    --override-adorner-text-color: var(--sys-color-token-subtle);
    --override-adorner-border-color: var(--sys-color-token-subtle);
  }

  /* Use mono-space source code font to assist reading of adorner content */
  devtools-adorner {
    font-family: var(--source-code-font-family);
  }

  .token-status-badge {
    display: none;
  }

  [aria-expanded='false'] .token-status-badge {
    display: inline-flex;
  }
}
/*# sourceURL=${import.meta.resolve("./originTrialTreeView.css")} */`;

// gen/front_end/panels/application/components/OriginTrialTreeView.js
var { classMap } = Directives;
var { widgetConfig: widgetConfig2 } = UI3.Widget;
var UIStrings6 = {
  /**
   * @description Label for the 'origin' field in a parsed Origin Trial Token.
   */
  origin: "Origin",
  /**
   * @description Label for `trialName` field in a parsed Origin Trial Token.
   * This field is only shown when token has unknown trial name as the token
   * will be put into 'UNKNOWN' group.
   */
  trialName: "Trial Name",
  /**
   * @description Label for `expiryTime` field in a parsed Origin Trial Token.
   */
  expiryTime: "Expiry Time",
  /**
   * @description Label for `usageRestriction` field in a parsed Origin Trial Token.
   */
  usageRestriction: "Usage Restriction",
  /**
   * @description Label for `isThirdParty` field in a parsed Origin Trial Token.
   */
  isThirdParty: "Third Party",
  /**
   * @description Label for a field containing info about an Origin Trial Token's `matchSubDomains` field.
   *An Origin Trial Token contains an origin URL. The `matchSubDomains` field describes whether the token
   *only applies to the origin URL or to all subdomains of the origin URL as well.
   *The field contains either 'true' or 'false'.
   */
  matchSubDomains: "Subdomain Matching",
  /**
   * @description Label for the raw(= encoded / not human-readable) Origin Trial Token.
   */
  rawTokenText: "Raw Token",
  /**
   * @description Label for `status` field in an Origin Trial Token.
   */
  status: "Token Status",
  /**
   * @description Label for tokenWithStatus node.
   */
  token: "Token",
  /**
   * @description Label for a badge showing the number of Origin Trial Tokens. This number is always greater than 1.
   * @example {2} PH1
   */
  tokens: "{PH1} tokens",
  /**
   * @description Label shown when there are no Origin Trial Tokens in the Frame view of the Application panel.
   */
  noTrialTokens: "No trial tokens"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/application/components/OriginTrialTreeView.ts", UIStrings6);
var i18nString5 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function renderOriginTrialTree(originTrial) {
  const success = originTrial.status === "Enabled";
  return html5`
    <li role="treeitem">
      ${originTrial.trialName}
      <devtools-adorner class="badge-${success ? "success" : "error"}">
        ${originTrial.status}
      </devtools-adorner>
      ${originTrial.tokensWithStatus.length > 1 ? html5`
        <devtools-adorner class="badge-secondary">
          ${i18nString5(UIStrings6.tokens, { PH1: originTrial.tokensWithStatus.length })}
        </devtools-adorner>` : nothing4}
      <ul role="group" hidden>
        ${originTrial.tokensWithStatus.length > 1 ? originTrial.tokensWithStatus.map(renderTokenNode) : renderTokenDetailsNodes(originTrial.tokensWithStatus[0])}
      </ul>
    </li>`;
}
function renderTokenNode(token) {
  const success = token.status === "Success";
  return html5`
    <li role="treeitem">
      ${i18nString5(UIStrings6.token)}
      <devtools-adorner class="token-status-badge badge-${success ? "success" : "error"}">
        ${token.status}
      </devtools-adorner>
      <ul role="group" hidden>
        ${renderTokenDetailsNodes(token)}
      </ul>
    </li>`;
}
function renderTokenDetails(token) {
  return html5`
    <li role="treeitem">
      <devtools-widget .widgetConfig=${widgetConfig2(OriginTrialTokenRows, { data: token })}>
      </devtools-widget>
    </li>`;
}
function renderTokenDetailsNodes(token) {
  return html5`
    ${renderTokenDetails(token)}
    ${renderRawTokenTextNode(token.rawTokenText)}
  `;
}
function renderRawTokenTextNode(tokenText) {
  return html5`
    <li role="treeitem">
      ${i18nString5(UIStrings6.rawTokenText)}
      <ul role="group" hidden>
        <li role="treeitem">
          <div style="overflow-wrap: break-word;">
            ${tokenText}
          </div>
        </li>
      </ul>
    </li>`;
}
var ROWS_DEFAULT_VIEW = (input, _output, target) => {
  const success = input.tokenWithStatus.status === "Success";
  render5(html5`
    <style>
      ${originTrialTokenRows_css_default}
      ${originTrialTreeView_css_default}
    </style>
    <div class="content">
      <div class="key">${i18nString5(UIStrings6.status)}</div>
      <div class="value">
        <devtools-adorner class="badge-${success ? "success" : "error"}">
          ${input.tokenWithStatus.status}
        </devtools-adorner>
      </div>
      ${input.parsedTokenDetails.map((field) => html5`
        <div class="key">${field.name}</div>
        <div class="value">
          <div class=${classMap({ "error-text": Boolean(field.value.hasError) })}>
            ${field.value.text}
          </div>
        </div>
      `)}
    </div>`, target);
};
var OriginTrialTokenRows = class extends UI3.Widget.Widget {
  #view;
  #tokenWithStatus = null;
  #parsedTokenDetails = [];
  #dateFormatter = new Intl.DateTimeFormat(i18n11.DevToolsLocale.DevToolsLocale.instance().locale, { dateStyle: "long", timeStyle: "long" });
  constructor(element, view = ROWS_DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#tokenWithStatus = data;
    this.#setTokenFields();
  }
  connectedCallback() {
    this.requestUpdate();
  }
  #setTokenFields() {
    if (!this.#tokenWithStatus?.parsedToken) {
      return;
    }
    this.#parsedTokenDetails = [
      {
        name: i18nString5(UIStrings6.origin),
        value: {
          text: this.#tokenWithStatus.parsedToken.origin,
          hasError: this.#tokenWithStatus.status === "WrongOrigin"
        }
      },
      {
        name: i18nString5(UIStrings6.expiryTime),
        value: {
          text: this.#dateFormatter.format(this.#tokenWithStatus.parsedToken.expiryTime * 1e3),
          hasError: this.#tokenWithStatus.status === "Expired"
          /* Protocol.Page.OriginTrialTokenStatus.Expired */
        }
      },
      {
        name: i18nString5(UIStrings6.usageRestriction),
        value: { text: this.#tokenWithStatus.parsedToken.usageRestriction }
      },
      {
        name: i18nString5(UIStrings6.isThirdParty),
        value: { text: this.#tokenWithStatus.parsedToken.isThirdParty.toString() }
      },
      {
        name: i18nString5(UIStrings6.matchSubDomains),
        value: { text: this.#tokenWithStatus.parsedToken.matchSubDomains.toString() }
      }
    ];
    if (this.#tokenWithStatus.status === "UnknownTrial") {
      this.#parsedTokenDetails = [
        {
          name: i18nString5(UIStrings6.trialName),
          value: { text: this.#tokenWithStatus.parsedToken.trialName }
        },
        ...this.#parsedTokenDetails
      ];
    }
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#tokenWithStatus) {
      return;
    }
    const viewInput = {
      tokenWithStatus: this.#tokenWithStatus,
      parsedTokenDetails: this.#parsedTokenDetails
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};
var DEFAULT_VIEW3 = (input, _output, target) => {
  if (!input.trials.length) {
    render5(html5`
      <span class="status-badge">
        <devtools-icon class="medium" name="clear"></devtools-icon>
        <span>${i18nString5(UIStrings6.noTrialTokens)}</span>
      </span>`, target);
    return;
  }
  render5(html5`
    <style>${originTrialTreeView_css_default}</style>
    <devtools-tree .template=${html5`
      <style>${originTrialTreeView_css_default}</style>
      <ul role="tree">
        ${input.trials.map(renderOriginTrialTree)}
      </ul>
    `}>
    </devtools-tree>
  `, target);
};
var OriginTrialTreeView = class extends UI3.Widget.Widget {
  #data = { trials: [] };
  #view;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view(this.#data, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/PermissionsPolicySection.js
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/components/report_view/report_view.js";
import * as Common2 from "./../../../core/common/common.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as SDK3 from "./../../../core/sdk/sdk.js";
import * as NetworkForward from "./../../network/forward/forward.js";
import * as Buttons3 from "./../../../ui/components/buttons/buttons.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/permissionsPolicySection.css.js
var permissionsPolicySection_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: contents;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

button.link {
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
}

.policies-list {
  padding-top: 3px;
}

.permissions-row {
  display: flex;
  line-height: 22px;
}

.permissions-row div {
  padding-right: 5px;
}

.feature-name {
  width: 135px;
}

.allowed-icon {
  vertical-align: sub;
}

.block-reason {
  width: 215px;
}

.disabled-features-button {
  padding-left: var(--sys-size-3);
}

/*# sourceURL=${import.meta.resolve("./permissionsPolicySection.css")} */`;

// gen/front_end/panels/application/components/PermissionsPolicySection.js
var { html: html6 } = Lit4;
var UIStrings7 = {
  /**
   * @description Label for a button. When clicked more details (for the content this button refers to) will be shown.
   */
  showDetails: "Show details",
  /**
   * @description Label for a button. When clicked some details (for the content this button refers to) will be hidden.
   */
  hideDetails: "Hide details",
  /**
   * @description Label for a list of features which are allowed according to the current Permissions policy
   *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
   */
  allowedFeatures: "Allowed Features",
  /**
   * @description Label for a list of features which are disabled according to the current Permissions policy
   *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
   */
  disabledFeatures: "Disabled Features",
  /**
   * @description Tooltip text for a link to a specific request's headers in the Network panel.
   */
  clickToShowHeader: 'Click to reveal the request whose "`Permissions-Policy`" HTTP header disables this feature.',
  /**
   * @description Tooltip text for a link to a specific iframe in the Elements panel (Iframes can be nested, the link goes
   *  to the outer-most iframe which blocks a certain feature).
   */
  clickToShowIframe: "Click to reveal the top-most iframe which does not allow this feature in the elements panel.",
  /**
   * @description Text describing that a specific feature is blocked by not being included in the iframe's "allow" attribute.
   */
  disabledByIframe: 'missing in iframe "`allow`" attribute',
  /**
   * @description Text describing that a specific feature is blocked by a Permissions Policy specified in a request header.
   */
  disabledByHeader: 'disabled by "`Permissions-Policy`" header',
  /**
   * @description Text describing that a specific feature is blocked by virtue of being inside a fenced frame tree.
   */
  disabledByFencedFrame: "disabled inside a `fencedframe`"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/application/components/PermissionsPolicySection.ts", UIStrings7);
var i18nString6 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
function renderIconLink(iconName, title, clickHandler, jsLogContext) {
  return html6`
  <devtools-button
    .iconName=${iconName}
    title=${title}
    aria-label=${title}
    .variant=${"icon"}
    .size=${"SMALL"}
    @click=${clickHandler}
    jslog=${VisualLogging5.action().track({ click: true }).context(jsLogContext)}></devtools-button>
  `;
}
var PermissionsPolicySection = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #permissionsPolicySectionData = { policies: [], showDetails: false };
  set data(data) {
    this.#permissionsPolicySectionData = data;
    void this.#render();
  }
  #toggleShowPermissionsDisallowedDetails() {
    this.#permissionsPolicySectionData.showDetails = !this.#permissionsPolicySectionData.showDetails;
    void this.#render();
  }
  #renderAllowed() {
    const allowed = this.#permissionsPolicySectionData.policies.filter((p) => p.allowed).map((p) => p.feature).sort();
    if (!allowed.length) {
      return Lit4.nothing;
    }
    return html6`
      <devtools-report-key>${i18nString6(UIStrings7.allowedFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${allowed.join(", ")}
      </devtools-report-value>
    `;
  }
  async #renderDisallowed() {
    const disallowed = this.#permissionsPolicySectionData.policies.filter((p) => !p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
    if (!disallowed.length) {
      return Lit4.nothing;
    }
    if (!this.#permissionsPolicySectionData.showDetails) {
      return html6`
        <devtools-report-key>${i18nString6(UIStrings7.disabledFeatures)}</devtools-report-key>
        <devtools-report-value>
          ${disallowed.map((p) => p.feature).join(", ")}
          <devtools-button
          class="disabled-features-button"
          .variant=${"outlined"}
          @click=${() => this.#toggleShowPermissionsDisallowedDetails()}
          jslog=${VisualLogging5.action("show-disabled-features-details").track({
        click: true
      })}>${i18nString6(UIStrings7.showDetails)}
        </devtools-button>
        </devtools-report-value>
      `;
    }
    const frameManager = SDK3.FrameManager.FrameManager.instance();
    const featureRows = await Promise.all(disallowed.map(async (policy) => {
      const frame = policy.locator ? frameManager.getFrame(policy.locator.frameId) : null;
      const blockReason = policy.locator?.blockReason;
      const linkTargetDOMNode = await (blockReason === "IframeAttribute" && frame?.getOwnerDOMNodeOrDocument());
      const resource = frame?.resourceForURL(frame.url);
      const linkTargetRequest = blockReason === "Header" && resource?.request;
      const blockReasonText = (() => {
        switch (blockReason) {
          case "IframeAttribute":
            return i18nString6(UIStrings7.disabledByIframe);
          case "Header":
            return i18nString6(UIStrings7.disabledByHeader);
          case "InFencedFrameTree":
            return i18nString6(UIStrings7.disabledByFencedFrame);
          default:
            return "";
        }
      })();
      const revealHeader = async () => {
        if (!linkTargetRequest) {
          return;
        }
        const headerName = linkTargetRequest.responseHeaderValue("permissions-policy") ? "permissions-policy" : "feature-policy";
        const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(linkTargetRequest, { name: headerName, value: "" });
        await Common2.Revealer.reveal(requestLocation);
      };
      return html6`
        <div class="permissions-row">
          <div>
            <devtools-icon class="allowed-icon extra-large" name="cross-circle">
            </devtools-icon>
          </div>
          <div class="feature-name text-ellipsis">
            ${policy.feature}
          </div>
          <div class="block-reason">${blockReasonText}</div>
          <div>
            ${linkTargetDOMNode ? renderIconLink("code-circle", i18nString6(UIStrings7.clickToShowIframe), () => Common2.Revealer.reveal(linkTargetDOMNode), "reveal-in-elements") : Lit4.nothing}
            ${linkTargetRequest ? renderIconLink("arrow-up-down-circle", i18nString6(UIStrings7.clickToShowHeader), revealHeader, "reveal-in-network") : Lit4.nothing}
          </div>
        </div>
      `;
    }));
    return html6`
      <devtools-report-key>${i18nString6(UIStrings7.disabledFeatures)}</devtools-report-key>
      <devtools-report-value class="policies-list">
        ${featureRows}
        <div class="permissions-row">
        <devtools-button
          .variant=${"outlined"}
          @click=${() => this.#toggleShowPermissionsDisallowedDetails()}
          jslog=${VisualLogging5.action("hide-disabled-features-details").track({
      click: true
    })}>${i18nString6(UIStrings7.hideDetails)}
        </devtools-button>
        </div>
      </devtools-report-value>
    `;
  }
  async #render() {
    await RenderCoordinator.write("PermissionsPolicySection render", () => {
      Lit4.render(html6`
          <style>${permissionsPolicySection_css_default}</style>
          <devtools-report-section-header>${i18n13.i18n.lockedString("Permissions Policy")}</devtools-report-section-header>
          ${this.#renderAllowed()}
          ${this.#permissionsPolicySectionData.policies.findIndex((p) => p.allowed) > 0 || this.#permissionsPolicySectionData.policies.findIndex((p) => !p.allowed) > 0 ? html6`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : Lit4.nothing}
          ${Lit4.Directives.until(this.#renderDisallowed(), Lit4.nothing)}
          <devtools-report-divider></devtools-report-divider>
        `, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-resources-permissions-policy-section", PermissionsPolicySection);

// gen/front_end/panels/application/components/FrameDetailsView.js
var { html: html7 } = Lit5;
var { widgetConfig: widgetConfig3 } = UI4.Widget;
var UIStrings8 = {
  /**
   * @description Section header in the Frame Details view
   */
  additionalInformation: "Additional Information",
  /**
   * @description Explanation for why the additional information section is being shown
   */
  thisAdditionalDebugging: "This additional (debugging) information is shown because the 'Protocol Monitor' experiment is enabled.",
  /**
   * @description Label for subtitle of frame details view
   */
  frameId: "Frame ID",
  /**
   * @description Name of a network resource type
   */
  document: "Document",
  /**
   * @description A web URL (for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  url: "URL",
  /**
   * /**
   * @description Title for a link to the Sources panel
   */
  clickToOpenInSourcesPanel: "Click to open in Sources panel",
  /**
   * @description Title for a link to the Network panel
   */
  clickToOpenInNetworkPanel: "Click to open in Network panel",
  /**
   * @description Title for unreachable URL field
   */
  unreachableUrl: "Unreachable URL",
  /**
   * @description Title for a link that applies a filter to the network panel
   */
  clickToOpenInNetworkPanelMight: "Click to open in Network panel (might require page reload)",
  /**
   * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: "Origin",
  /**
   * /**
   * @description Related node label in Timeline UIUtils of the Performance panel
   */
  ownerElement: "Owner Element",
  /**
   * @description Title for a link to the Elements panel
   */
  clickToOpenInElementsPanel: "Click to open in Elements panel",
  /**
   * @description Title for ad frame type field
   */
  adStatus: "Ad Status",
  /**
   * @description Description for ad frame type
   */
  rootDescription: "This frame has been identified as the root frame of an ad",
  /**
   * @description Value for ad frame type
   */
  root: "root",
  /**
   * @description Description for ad frame type
   */
  childDescription: "This frame has been identified as a child frame of an ad",
  /**
   * @description Value for ad frame type
   */
  child: "child",
  /**
   * @description Section header in the Frame Details view
   */
  securityIsolation: "Security & Isolation",
  /**
   * @description Section header in the Frame Details view
   */
  contentSecurityPolicy: "Content Security Policy (CSP)",
  /**
   * @description Row title for in the Frame Details view
   */
  secureContext: "Secure Context",
  /**
   * @description Text in Timeline indicating that input has happened recently
   */
  yes: "Yes",
  /**
   * @description Text in Timeline indicating that input has not happened recently
   */
  no: "No",
  /**
   * @description Label for whether a frame is cross-origin isolated
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  crossoriginIsolated: "Cross-Origin Isolated",
  /**
   * @description Explanatory text in the Frame Details view
   */
  localhostIsAlwaysASecureContext: "`Localhost` is always a secure context",
  /**
   * @description Explanatory text in the Frame Details view
   */
  aFrameAncestorIsAnInsecure: "A frame ancestor is an insecure context",
  /**
   * @description Explanatory text in the Frame Details view
   */
  theFramesSchemeIsInsecure: "The frame's scheme is insecure",
  /**
   * @description This label specifies the server endpoints to which the server is reporting errors
   *and warnings through the Report-to API. Following this label will be the URL of the server.
   */
  reportingTo: "reporting to",
  /**
   * @description Section header in the Frame Details view
   */
  apiAvailability: "API availability",
  /**
   * @description Explanation of why cross-origin isolation is important
   *(https://web.dev/why-coop-coep/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
   */
  availabilityOfCertainApisDepends: "Availability of certain APIs depends on the document being cross-origin isolated.",
  /**
   * @description Description of the SharedArrayBuffer status
   */
  availableTransferable: "available, transferable",
  /**
   * @description Description of the SharedArrayBuffer status
   */
  availableNotTransferable: "available, not transferable",
  /**
   * @description Explanation for the SharedArrayBuffer availability status
   */
  unavailable: "unavailable",
  /**
   * @description Tooltip for the SharedArrayBuffer availability status
   */
  sharedarraybufferConstructorIs: "`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`",
  /**
   * @description Tooltip for the SharedArrayBuffer availability status
   */
  sharedarraybufferConstructorIsAvailable: "`SharedArrayBuffer` constructor is available but `SABs` cannot be transferred via `postMessage`",
  /**
   * @description Explanation why SharedArrayBuffer will not be available in the future
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
   */
  willRequireCrossoriginIsolated: "\u26A0\uFE0F will require cross-origin isolated context in the future",
  /**
   * @description Explanation why SharedArrayBuffer is not available
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary).
   */
  requiresCrossoriginIsolated: "requires cross-origin isolated context",
  /**
   * @description Explanation for the SharedArrayBuffer availability status in case the transfer of a SAB requires the
   * permission policy `cross-origin-isolated` to be enabled (e.g. because the message refers to the situation in an iframe).
   */
  transferRequiresCrossoriginIsolatedPermission: "`SharedArrayBuffer` transfer requires enabling the permission policy:",
  /**
   * @description Explanation for the Measure Memory availability status
   */
  available: "available",
  /**
   * @description Tooltip for the Measure Memory availability status
   */
  thePerformanceAPI: "The `performance.measureUserAgentSpecificMemory()` API is available",
  /**
   * @description Tooltip for the Measure Memory availability status
   */
  thePerformancemeasureuseragentspecificmemory: "The `performance.measureUserAgentSpecificMemory()` API is not available",
  /**
   * @description Entry in the API availability section of the frame details view
   */
  measureMemory: "Measure Memory",
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
   * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
   */
  creationStackTrace: "Frame Creation `Stack Trace`",
  /**
   * @description Tooltip for 'Frame Creation Stack Trace' explaining that the stack
   *trace shows where in the code the frame has been created programmatically
   */
  creationStackTraceExplanation: "This frame was created programmatically. The `stack trace` shows where this happened.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  parentIsAdExplanation: "This frame is considered an ad frame because its parent frame is an ad frame.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  matchedBlockingRuleExplanation: "This frame is considered an ad frame because its current (or previous) main document is an ad resource.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  createdByAdScriptExplanation: "There was an ad script in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.",
  /**
   * @description Label for the link(s) to the ad script(s) that led to this frame's creation.
   */
  creatorAdScriptAncestry: "Creator Ad Script Ancestry",
  /**
   * @description Label for the filterlist rule that identified the root script in 'Creator Ad Script Ancestry' as an ad.
   */
  rootScriptFilterlistRule: "Root Script Filterlist Rule",
  /**
   * @description Text describing the absence of a value.
   */
  none: "None",
  /**
   * @description Explanation of what origin trials are
   *(https://developer.chrome.com/docs/web-platform/origin-trials/)
   *(please don't translate 'origin trials').
   */
  originTrialsExplanation: "Origin trials give you access to a new or experimental feature."
};
var str_8 = i18n15.i18n.registerUIStrings("panels/application/components/FrameDetailsView.ts", UIStrings8);
var i18nString7 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var FrameDetailsReportView = class extends LegacyWrapper3.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #frame;
  #target = null;
  #protocolMonitorExperimentEnabled = false;
  #permissionsPolicies = null;
  #permissionsPolicySectionData = { policies: [], showDetails: false };
  #linkifier = new Components3.Linkifier.Linkifier();
  #adScriptAncestry = null;
  constructor(frame) {
    super();
    this.#frame = frame;
    void this.render();
  }
  connectedCallback() {
    this.parentElement?.classList.add("overflow-auto");
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled("protocol-monitor");
  }
  async render() {
    const result = await this.#frame?.parentFrame()?.getAdScriptAncestry(this.#frame?.id);
    if (result && result.ancestryChain.length > 0) {
      this.#adScriptAncestry = result;
      const firstScript = this.#adScriptAncestry.ancestryChain[0];
      const debuggerModel = firstScript?.debuggerId ? await SDK4.DebuggerModel.DebuggerModel.modelForDebuggerId(firstScript.debuggerId) : null;
      this.#target = debuggerModel?.target() ?? null;
    }
    if (!this.#permissionsPolicies && this.#frame) {
      this.#permissionsPolicies = this.#frame.getPermissionsPolicyState();
    }
    await RenderCoordinator2.write("FrameDetailsView render", async () => {
      if (!this.#frame) {
        return;
      }
      Lit5.render(html7`
        <style>${frameDetailsReportView_css_default}</style>
        <devtools-report .data=${{ reportTitle: this.#frame.displayName() }}
        jslog=${VisualLogging6.pane("frames")}>
          ${this.#renderDocumentSection()}
          ${this.#renderIsolationSection()}
          ${this.#renderApiAvailabilitySection()}
          ${await this.#renderOriginTrial()}
          ${Lit5.Directives.until(this.#permissionsPolicies?.then((policies) => {
        this.#permissionsPolicySectionData.policies = policies || [];
        return html7`
              <devtools-resources-permissions-policy-section
                .data=${this.#permissionsPolicySectionData}
              >
              </devtools-resources-permissions-policy-section>
            `;
      }), Lit5.nothing)}
          ${this.#protocolMonitorExperimentEnabled ? this.#renderAdditionalInfoSection() : Lit5.nothing}
        </devtools-report>
      `, this.#shadow, { host: this });
    });
  }
  async #renderOriginTrial() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    const data = { trials: await this.#frame.getOriginTrials() };
    return html7`
    <devtools-report-section-header>
      ${i18n15.i18n.lockedString("Origin trials")}
    </devtools-report-section-header>
    <devtools-report-section>
      <span class="report-section">
        ${i18nString7(UIStrings8.originTrialsExplanation)}
        <x-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
                jslog=${VisualLogging6.link("learn-more.origin-trials").track({ click: true })}>
          ${i18nString7(UIStrings8.learnMore)}
        </x-link>
      </span>
    </devtools-report-section>
    <devtools-widget class="span-cols" .widgetConfig=${widgetConfig3(OriginTrialTreeView, { data })}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
  }
  #renderDocumentSection() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header>${i18nString7(UIStrings8.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings8.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.#maybeRenderSourcesLinkForURL()}
          ${this.#maybeRenderNetworkLinkForURL()}
          <div class="text-ellipsis" title=${this.#frame.url}>${this.#frame.url}</div>
        </div>
      </devtools-report-value>
      ${this.#maybeRenderUnreachableURL()}
      ${this.#maybeRenderOrigin()}
      ${Lit5.Directives.until(this.#renderOwnerElement(), Lit5.nothing)}
      ${this.#maybeRenderCreationStacktrace()}
      ${this.#maybeRenderAdStatus()}
      ${this.#maybeRenderCreatorAdScriptAncestry()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }
  #maybeRenderSourcesLinkForURL() {
    const frame = this.#frame;
    if (!frame || frame.unreachableUrl()) {
      return Lit5.nothing;
    }
    return renderIconLink("label", i18nString7(UIStrings8.clickToOpenInSourcesPanel), async () => {
      const sourceCode = this.#uiSourceCodeForFrame(frame);
      if (sourceCode) {
        await Common3.Revealer.reveal(sourceCode);
      }
    }, "reveal-in-sources");
  }
  #maybeRenderNetworkLinkForURL() {
    if (this.#frame) {
      const resource = this.#frame.resourceForURL(this.#frame.url);
      if (resource?.request) {
        const request = resource.request;
        return renderIconLink("arrow-up-down-circle", i18nString7(UIStrings8.clickToOpenInNetworkPanel), () => {
          const requestLocation = NetworkForward2.UIRequestLocation.UIRequestLocation.tab(
            request,
            "headers-component"
            /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
          );
          return Common3.Revealer.reveal(requestLocation);
        }, "reveal-in-network");
      }
    }
    return Lit5.nothing;
  }
  #uiSourceCodeForFrame(frame) {
    for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
      const projectTarget = Bindings.NetworkProject.NetworkProject.getTargetForProject(project);
      if (projectTarget && projectTarget === frame.resourceTreeModel().target()) {
        const uiSourceCode = project.uiSourceCodeForURL(frame.url);
        if (uiSourceCode) {
          return uiSourceCode;
        }
      }
    }
    return null;
  }
  #maybeRenderUnreachableURL() {
    if (!this.#frame || !this.#frame.unreachableUrl()) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-key>${i18nString7(UIStrings8.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.#renderNetworkLinkForUnreachableURL()}
          <div class="text-ellipsis" title=${this.#frame.unreachableUrl()}>${this.#frame.unreachableUrl()}</div>
        </div>
      </devtools-report-value>
    `;
  }
  #renderNetworkLinkForUnreachableURL() {
    if (this.#frame) {
      const unreachableUrl = Common3.ParsedURL.ParsedURL.fromString(this.#frame.unreachableUrl());
      if (unreachableUrl) {
        return renderIconLink("arrow-up-down-circle", i18nString7(UIStrings8.clickToOpenInNetworkPanelMight), () => {
          void Common3.Revealer.reveal(NetworkForward2.UIFilter.UIRequestFilter.filters([
            {
              filterType: NetworkForward2.UIFilter.FilterType.Domain,
              filterValue: unreachableUrl.domain()
            },
            {
              filterType: null,
              filterValue: unreachableUrl.path
            }
          ]));
        }, "unreachable-url.reveal-in-network");
      }
    }
    return Lit5.nothing;
  }
  #maybeRenderOrigin() {
    if (this.#frame && this.#frame.securityOrigin && this.#frame.securityOrigin !== "://") {
      return html7`
        <devtools-report-key>${i18nString7(UIStrings8.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${this.#frame.securityOrigin}>${this.#frame.securityOrigin}</div>
        </devtools-report-value>
      `;
    }
    return Lit5.nothing;
  }
  async #renderOwnerElement() {
    if (this.#frame) {
      const linkTargetDOMNode = await this.#frame.getOwnerDOMNodeOrDocument();
      if (linkTargetDOMNode) {
        return html7`
          <devtools-report-key>${i18nString7(UIStrings8.ownerElement)}</devtools-report-key>
          <devtools-report-value class="without-min-width">
            <div class="inline-items">
              <button class="link text-link" role="link" tabindex=0 title=${i18nString7(UIStrings8.clickToOpenInElementsPanel)}
                @mouseenter=${() => this.#frame?.highlight()}
                @mouseleave=${() => SDK4.OverlayModel.OverlayModel.hideDOMNodeHighlight()}
                @click=${() => Common3.Revealer.reveal(linkTargetDOMNode)}
                jslog=${VisualLogging6.action("reveal-in-elements").track({ click: true })}
              >
                &lt;${linkTargetDOMNode.nodeName().toLocaleLowerCase()}&gt;
              </button>
            </div>
          </devtools-report-value>
        `;
      }
    }
    return Lit5.nothing;
  }
  #maybeRenderCreationStacktrace() {
    const creationStackTraceData = this.#frame?.getCreationStackTraceData();
    if (creationStackTraceData?.creationStackTrace) {
      return html7`
        <devtools-report-key title=${i18nString7(UIStrings8.creationStackTraceExplanation)}>${i18nString7(UIStrings8.creationStackTrace)}</devtools-report-key>
        <devtools-report-value
        jslog=${VisualLogging6.section("frame-creation-stack-trace")}
        >
          <devtools-resources-stack-trace .data=${{
        frame: this.#frame,
        buildStackTraceRows: Components3.JSPresentationUtils.buildStackTraceRowsForLegacyRuntimeStackTrace
      }}>
          </devtools-resources-stack-trace>
        </devtools-report-value>
      `;
    }
    return Lit5.nothing;
  }
  #getAdFrameTypeStrings(type) {
    switch (type) {
      case "child":
        return { value: i18nString7(UIStrings8.child), description: i18nString7(UIStrings8.childDescription) };
      case "root":
        return { value: i18nString7(UIStrings8.root), description: i18nString7(UIStrings8.rootDescription) };
    }
  }
  #getAdFrameExplanationString(explanation) {
    switch (explanation) {
      case "CreatedByAdScript":
        return i18nString7(UIStrings8.createdByAdScriptExplanation);
      case "MatchedBlockingRule":
        return i18nString7(UIStrings8.matchedBlockingRuleExplanation);
      case "ParentIsAd":
        return i18nString7(UIStrings8.parentIsAdExplanation);
    }
  }
  #maybeRenderAdStatus() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    const adFrameType = this.#frame.adFrameType();
    if (adFrameType === "none") {
      return Lit5.nothing;
    }
    const typeStrings = this.#getAdFrameTypeStrings(adFrameType);
    const rows = [html7`<div title=${typeStrings.description}>${typeStrings.value}</div>`];
    for (const explanation of this.#frame.adFrameStatus()?.explanations || []) {
      rows.push(html7`<div>${this.#getAdFrameExplanationString(explanation)}</div>`);
    }
    return html7`
      <devtools-report-key>${i18nString7(UIStrings8.adStatus)}</devtools-report-key>
      <devtools-report-value class="ad-status-list" jslog=${VisualLogging6.section("ad-status")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString7(UIStrings8.adStatus) }}>
        </devtools-expandable-list>
      </devtools-report-value>`;
  }
  #maybeRenderCreatorAdScriptAncestry() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    const adFrameType = this.#frame.adFrameType();
    if (adFrameType === "none") {
      return Lit5.nothing;
    }
    if (!this.#target || !this.#adScriptAncestry || this.#adScriptAncestry.ancestryChain.length === 0) {
      return Lit5.nothing;
    }
    const rows = this.#adScriptAncestry.ancestryChain.map((adScriptId) => {
      const adScriptLinkElement = this.#linkifier.linkifyScriptLocation(this.#target, adScriptId.scriptId || null, Platform.DevToolsPath.EmptyUrlString, void 0, void 0);
      adScriptLinkElement?.setAttribute("jslog", `${VisualLogging6.link("ad-script").track({ click: true })}`);
      return html7`<div>${adScriptLinkElement}</div>`;
    });
    const shouldRenderFilterlistRule = this.#adScriptAncestry.rootScriptFilterlistRule !== void 0;
    return html7`
      <devtools-report-key>${i18nString7(UIStrings8.creatorAdScriptAncestry)}</devtools-report-key>
      <devtools-report-value class="creator-ad-script-ancestry-list" jslog=${VisualLogging6.section("creator-ad-script-ancestry")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString7(UIStrings8.creatorAdScriptAncestry) }}>
        </devtools-expandable-list>
      </devtools-report-value>
      ${shouldRenderFilterlistRule ? html7`
        <devtools-report-key>${i18nString7(UIStrings8.rootScriptFilterlistRule)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging6.section("root-script-filterlist-rule")}>${this.#adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : Lit5.nothing}
    `;
  }
  #renderIsolationSection() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header>${i18nString7(UIStrings8.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings8.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isSecureContext() ? i18nString7(UIStrings8.yes) : i18nString7(UIStrings8.no)}\xA0${this.#maybeRenderSecureContextExplanation()}
      </devtools-report-value>
      <devtools-report-key>${i18nString7(UIStrings8.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isCrossOriginIsolated() ? i18nString7(UIStrings8.yes) : i18nString7(UIStrings8.no)}
      </devtools-report-value>
      ${Lit5.Directives.until(this.#maybeRenderCoopCoepCSPStatus(), Lit5.nothing)}
      <devtools-report-divider></devtools-report-divider>
    `;
  }
  #maybeRenderSecureContextExplanation() {
    const explanation = this.#getSecureContextExplanation();
    if (explanation) {
      return html7`<span class="inline-comment">${explanation}</span>`;
    }
    return Lit5.nothing;
  }
  #getSecureContextExplanation() {
    switch (this.#frame?.getSecureContextType()) {
      case "Secure":
        return null;
      case "SecureLocalhost":
        return i18nString7(UIStrings8.localhostIsAlwaysASecureContext);
      case "InsecureAncestor":
        return i18nString7(UIStrings8.aFrameAncestorIsAnInsecure);
      case "InsecureScheme":
        return i18nString7(UIStrings8.theFramesSchemeIsInsecure);
    }
    return null;
  }
  async #maybeRenderCoopCoepCSPStatus() {
    if (this.#frame) {
      const model = this.#frame.resourceTreeModel().target().model(SDK4.NetworkManager.NetworkManager);
      const info = model && await model.getSecurityIsolationStatus(this.#frame.id);
      if (info) {
        return html7`
          ${this.#maybeRenderCrossOriginStatus(
          info.coep,
          i18n15.i18n.lockedString("Cross-Origin Embedder Policy (COEP)"),
          "None"
          /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */
        )}
          ${this.#maybeRenderCrossOriginStatus(
          info.coop,
          i18n15.i18n.lockedString("Cross-Origin Opener Policy (COOP)"),
          "UnsafeNone"
          /* Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone */
        )}
          ${this.#renderCSPSection(info.csp)}
        `;
      }
    }
    return Lit5.nothing;
  }
  #maybeRenderCrossOriginStatus(info, policyName, noneValue) {
    if (!info) {
      return Lit5.nothing;
    }
    function crossOriginValueToString(value) {
      switch (value) {
        case "Credentialless":
          return "credentialless";
        case "None":
          return "none";
        case "RequireCorp":
          return "require-corp";
        case "NoopenerAllowPopups":
          return "noopenener-allow-popups";
        case "SameOrigin":
          return "same-origin";
        case "SameOriginAllowPopups":
          return "same-origin-allow-popups";
        case "SameOriginPlusCoep":
          return "same-origin-plus-coep";
        case "RestrictProperties":
          return "restrict-properties";
        case "RestrictPropertiesPlusCoep":
          return "restrict-properties-plus-coep";
        case "UnsafeNone":
          return "unsafe-none";
      }
    }
    const isEnabled = info.value !== noneValue;
    const isReportOnly = !isEnabled && info.reportOnlyValue !== noneValue;
    const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    return html7`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${crossOriginValueToString(isEnabled ? info.value : info.reportOnlyValue)}
        ${isReportOnly ? html7`<span class="inline-comment">report-only</span>` : Lit5.nothing}
        ${endpoint ? html7`<span class="inline-name">${i18nString7(UIStrings8.reportingTo)}</span>${endpoint}` : Lit5.nothing}
      </devtools-report-value>
    `;
  }
  #renderEffectiveDirectives(directives) {
    const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
    const result = [];
    for (const directive in parsedDirectives) {
      result.push(html7`
          <div>
            <span class="bold">${directive}</span>
            ${": " + parsedDirectives[directive]?.join(", ")}
          </div>`);
    }
    return result;
  }
  #renderSingleCSP(cspInfo, divider) {
    return html7`
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n15.i18n.lockedString("Content-Security-Policy") : html7`
          ${i18n15.i18n.lockedString("Content-Security-Policy-Report-Only")}
          <devtools-button
            .iconName=${"help"}
            class='help-button'
            .variant=${"icon"}
            .size=${"SMALL"}
            @click=${() => {
      window.location.href = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only";
    }}
            jslog=${VisualLogging6.link("learn-more.csp-report-only").track({ click: true })}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === "HTTP" ? i18n15.i18n.lockedString("HTTP header") : i18n15.i18n.lockedString("Meta tag")}
        ${this.#renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html7`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : Lit5.nothing}
    `;
  }
  #renderCSPSection(cspInfos) {
    return html7`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString7(UIStrings8.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${cspInfos?.length ? cspInfos.map((cspInfo, index) => this.#renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html7`
        <devtools-report-key>
          ${i18n15.i18n.lockedString("Content-Security-Policy")}
        </devtools-report-key>
        <devtools-report-value>
          ${i18nString7(UIStrings8.none)}
        </devtools-report-value>
      `}
    `;
  }
  #renderApiAvailabilitySection() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header>
        ${i18nString7(UIStrings8.apiAvailability)}
      </devtools-report-section-header>
      <devtools-report-section>
        <span class="report-section">
          ${i18nString7(UIStrings8.availabilityOfCertainApisDepends)}
          <x-link
            href="https://web.dev/why-coop-coep/" class="link"
            jslog=${VisualLogging6.link("learn-more.coop-coep").track({ click: true })}>
            ${i18nString7(UIStrings8.learnMore)}
          </x-link>
        </span>
      </devtools-report-section>
      ${this.#renderSharedArrayBufferAvailability()}
      ${this.#renderMeasureMemoryAvailability()}
      <devtools-report-divider></devtools-report-divider>`;
  }
  #renderSharedArrayBufferAvailability() {
    if (this.#frame) {
      const features = this.#frame.getGatedAPIFeatures();
      if (features) {
        let renderHint = function(frame) {
          switch (frame.getCrossOriginIsolatedContextType()) {
            case "Isolated":
              return Lit5.nothing;
            case "NotIsolated":
              if (sabAvailable) {
                return html7`
                  <span class="inline-comment">
                    ${i18nString7(UIStrings8.willRequireCrossoriginIsolated)}
                  </span>`;
              }
              return html7`<span class="inline-comment">${i18nString7(UIStrings8.requiresCrossoriginIsolated)}</span>`;
            case "NotIsolatedFeatureDisabled":
              if (!sabTransferAvailable) {
                return html7`
                  <span class="inline-comment">
                    ${i18nString7(UIStrings8.transferRequiresCrossoriginIsolatedPermission)}
                    <code> cross-origin-isolated</code>
                  </span>`;
              }
              break;
          }
          return Lit5.nothing;
        };
        const sabAvailable = features.includes(
          "SharedArrayBuffers"
          /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffers */
        );
        const sabTransferAvailable = sabAvailable && features.includes(
          "SharedArrayBuffersTransferAllowed"
          /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed */
        );
        const availabilityText = sabTransferAvailable ? i18nString7(UIStrings8.availableTransferable) : sabAvailable ? i18nString7(UIStrings8.availableNotTransferable) : i18nString7(UIStrings8.unavailable);
        const tooltipText = sabTransferAvailable ? i18nString7(UIStrings8.sharedarraybufferConstructorIs) : sabAvailable ? i18nString7(UIStrings8.sharedarraybufferConstructorIsAvailable) : "";
        return html7`
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(this.#frame)}
          </devtools-report-value>
        `;
      }
    }
    return Lit5.nothing;
  }
  #renderMeasureMemoryAvailability() {
    if (this.#frame) {
      const measureMemoryAvailable = this.#frame.isCrossOriginIsolated();
      const availabilityText = measureMemoryAvailable ? i18nString7(UIStrings8.available) : i18nString7(UIStrings8.unavailable);
      const tooltipText = measureMemoryAvailable ? i18nString7(UIStrings8.thePerformanceAPI) : i18nString7(UIStrings8.thePerformancemeasureuseragentspecificmemory);
      return html7`
        <devtools-report-key>${i18nString7(UIStrings8.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>\xA0<x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslog=${VisualLogging6.link("learn-more.monitor-memory-usage").track({ click: true })}>${i18nString7(UIStrings8.learnMore)}</x-link>
        </devtools-report-value>
      `;
    }
    return Lit5.nothing;
  }
  #renderAdditionalInfoSection() {
    if (!this.#frame) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header
        title=${i18nString7(UIStrings8.thisAdditionalDebugging)}
      >${i18nString7(UIStrings8.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings8.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${this.#frame.id}>${this.#frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
  }
};
customElements.define("devtools-resources-frame-details-view", FrameDetailsReportView);

// gen/front_end/panels/application/components/InterestGroupAccessGrid.js
var InterestGroupAccessGrid_exports = {};
__export(InterestGroupAccessGrid_exports, {
  InterestGroupAccessGrid: () => InterestGroupAccessGrid,
  i18nString: () => i18nString8
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n17 from "./../../../core/i18n/i18n.js";
import * as UI5 from "./../../../ui/legacy/legacy.js";
import * as Lit6 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/interestGroupAccessGrid.css.js
var interestGroupAccessGrid_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host {
  display: flex;
  padding: 20px;
  height: 100%;
}

.heading {
  font-size: 15px;
}

devtools-data-grid {
  margin-top: 20px;
}

.info-icon {
  vertical-align: text-bottom;
  height: 14px;
}

.no-events-message {
  margin-top: 20px;
}

/*# sourceURL=${import.meta.resolve("./interestGroupAccessGrid.css")} */`;

// gen/front_end/panels/application/components/InterestGroupAccessGrid.js
var { html: html8 } = Lit6;
var UIStrings9 = {
  /**
   * @description Hover text for an info icon in the Interest Group Event panel
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  allInterestGroupStorageEvents: "All interest group storage events.",
  /**
   * @description Text in InterestGroupStorage Items View of the Application panel
   * Date and time of an Interest Group storage event in a locale-
   * dependent format.
   */
  eventTime: "Event Time",
  /**
   * @description Text in InterestGroupStorage Items View of the Application panel
   * Type of interest group event such as 'join', 'bid', 'win', or 'leave'.
   */
  eventType: "Access Type",
  /**
   * @description Text in InterestGroupStorage Items View of the Application panel
   * Owner of the interest group. The origin that controls the
   * content of information associated with the interest group such as which
   * ads get displayed.
   */
  groupOwner: "Owner",
  /**
   * @description Text in InterestGroupStorage Items View of the Application panel
   * Name of the interest group. The name is unique per-owner and identifies the
   * interest group.
   */
  groupName: "Name",
  /**
   * @description Text shown when no interest groups are detected.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  noEvents: "No interest group events detected",
  /**
   * @description Text shown when no interest groups are detected and explains what this page is about.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  interestGroupDescription: "On this page you can inspect and analyze interest groups"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/application/components/InterestGroupAccessGrid.ts", UIStrings9);
var i18nString8 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var InterestGroupAccessGrid = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #datastores = [];
  connectedCallback() {
    this.#render();
  }
  // eslint-disable-next-line @devtools/set-data-type-reference
  set data(data) {
    this.#datastores = data;
    this.#render();
  }
  #render() {
    Lit6.render(html8`
      <style>${interestGroupAccessGrid_css_default}</style>
      <style>${UI5.inspectorCommonStyles}</style>
      ${this.#datastores.length === 0 ? html8`
          <div class="empty-state">
            <span class="empty-state-header">${i18nString8(UIStrings9.noEvents)}</span>
            <span class="empty-state-description">${i18nString8(UIStrings9.interestGroupDescription)}</span>
          </div>` : html8`
          <div>
            <span class="heading">Interest Groups</span>
            <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString8(UIStrings9.allInterestGroupStorageEvents)}>
            </devtools-icon>
            ${this.#renderGrid()}
          </div>`}
    `, this.#shadow, { host: this });
  }
  #renderGrid() {
    return html8`
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="event-time" sortable weight="10">${i18nString8(UIStrings9.eventTime)}</td>
            <th id="event-type" sortable weight="5">${i18nString8(UIStrings9.eventType)}</td>
            <th id="event-group-owner" sortable weight="10">${i18nString8(UIStrings9.groupOwner)}</td>
            <th id="event-group-name" sortable weight="10">${i18nString8(UIStrings9.groupName)}</td>
          </tr>
          ${this.#datastores.map((event) => html8`
          <tr @select=${() => this.dispatchEvent(new CustomEvent("select", { detail: event }))}>
            <td>${new Date(1e3 * event.accessTime).toLocaleString()}</td>
            <td>${event.type}</td>
            <td>${event.ownerOrigin}</td>
            <td>${event.name}</td>
          </tr>
        `)}
        </table>
      </devtools-data-grid>`;
  }
};
customElements.define("devtools-interest-group-access-grid", InterestGroupAccessGrid);

// gen/front_end/panels/application/components/ProtocolHandlersView.js
var ProtocolHandlersView_exports = {};
__export(ProtocolHandlersView_exports, {
  ProtocolHandlersView: () => ProtocolHandlersView
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n19 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Buttons5 from "./../../../ui/components/buttons/buttons.js";
import * as Input from "./../../../ui/components/input/input.js";
import * as uiI18n from "./../../../ui/i18n/i18n.js";
import * as UI6 from "./../../../ui/legacy/legacy.js";
import * as Lit7 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/protocolHandlersView.css.js
var protocolHandlersView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  flex-direction: column;
}

.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.devtools-link:focus-visible {
  outline-width: unset;
}

input.devtools-text-input[type="text"] {
  padding: 3px 6px;
  margin-left: 4px;
  margin-right: 4px;
  width: 250px;
  height: 25px;
}

input.devtools-text-input[type="text"]::placeholder {
  color: var(--sys-color-token-subtle);
}

.protocol-handlers-row {
  margin: var(--sys-size-3) 0;
}

.inline-icon {
  width: 16px;
  height: 16px;

  &[name="check-circle"] {
    color: var(--icon-checkmark-green);
  }
}

@media (forced-colors: active) {
  .devtools-link:not(.devtools-link-prevent-click) {
    color: linktext;
  }

  .devtools-link:focus-visible {
    background: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./protocolHandlersView.css")} */`;

// gen/front_end/panels/application/components/ProtocolHandlersView.js
var { html: html9 } = Lit7;
var PROTOCOL_DOCUMENT_URL = "https://web.dev/url-protocol-handler/";
var UIStrings10 = {
  /**
   * @description Status message for when protocol handlers are detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolDetected: "Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.",
  /**
   * @description Status message for when protocol handlers are not detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolNotDetected: "Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.",
  /**
   * @description Text wrapping a link pointing to more information on handling protocol handlers
   * @example {https://example.com/} PH1
   */
  needHelpReadOur: "Need help? Read {PH1}.",
  /**
   * @description Link text for more information on URL protocol handler registrations for PWAs
   */
  protocolHandlerRegistrations: "URL protocol handler registration for PWAs",
  /**
   * @description In text hyperlink to the PWA manifest
   */
  manifest: "manifest",
  /**
   * @description Text for test protocol button
   */
  testProtocol: "Test protocol",
  /**
   * @description Aria text for screen reader to announce they can select a protocol handler in the dropdown
   */
  dropdownLabel: "Select protocol handler",
  /**
   * @description Aria text for screen reader to announce they can enter query parameters or endpoints into the textbox
   */
  textboxLabel: "Query parameter or endpoint for protocol handler",
  /**
   * @description Placeholder for textbox input field, rest of the URL of protocol to test.
   */
  textboxPlaceholder: "Enter URL"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/application/components/ProtocolHandlersView.ts", UIStrings10);
var i18nString9 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var ProtocolHandlersView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #protocolHandlers = [];
  #manifestLink = Platform2.DevToolsPath.EmptyUrlString;
  #selectedProtocolState = "";
  #queryInputState = "";
  set data(data) {
    const isNewManifest = this.#manifestLink !== data.manifestLink;
    this.#protocolHandlers = data.protocolHandlers;
    this.#manifestLink = data.manifestLink;
    if (isNewManifest) {
      this.#update();
    }
  }
  #update() {
    this.#queryInputState = "";
    this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? "";
    this.#render();
  }
  #renderStatusMessage() {
    const manifestInTextLink = UI6.XLink.XLink.create(this.#manifestLink, i18nString9(UIStrings10.manifest), void 0, void 0, "manifest");
    const statusString = this.#protocolHandlers.length > 0 ? UIStrings10.protocolDetected : UIStrings10.protocolNotDetected;
    return html9`
    <div class="protocol-handlers-row status">
            <devtools-icon class="inline-icon"
                           name=${this.#protocolHandlers.length > 0 ? "check-circle" : "info"}>
            </devtools-icon>
            ${uiI18n.getFormatLocalizedString(str_10, statusString, {
      PH1: manifestInTextLink
    })}
    </div>
    `;
  }
  #renderProtocolTest() {
    if (this.#protocolHandlers.length === 0) {
      return Lit7.nothing;
    }
    const protocolOptions = this.#protocolHandlers.filter((p) => p.protocol).map((p) => html9`<option value=${p.protocol} jslog=${VisualLogging7.item(p.protocol).track({
      click: true
    })}>${p.protocol}://</option>`);
    return html9`
       <div class="protocol-handlers-row">
        <select class="protocol-select" @change=${this.#handleProtocolSelect} aria-label=${i18nString9(UIStrings10.dropdownLabel)}>
           ${protocolOptions}
        </select>
        <input .value=${this.#queryInputState} class="devtools-text-input" type="text" @change=${this.#handleQueryInputChange} aria-label=${i18nString9(UIStrings10.textboxLabel)}
        placeholder=${i18nString9(UIStrings10.textboxPlaceholder)} />
        <devtools-button .variant=${"primary"} @click=${this.#handleTestProtocolClick}>
            ${i18nString9(UIStrings10.testProtocol)}
        </devtools-button>
        </div>
      `;
  }
  #handleProtocolSelect = (evt) => {
    this.#selectedProtocolState = evt.target.value;
  };
  #handleQueryInputChange = (evt) => {
    this.#queryInputState = evt.target.value;
    this.#render();
  };
  #handleTestProtocolClick = () => {
    const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}`;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureTestProtocolClicked);
  };
  #render() {
    const protocolDocLink = UI6.XLink.XLink.create(PROTOCOL_DOCUMENT_URL, i18nString9(UIStrings10.protocolHandlerRegistrations), void 0, void 0, "learn-more");
    Lit7.render(html9`
      <style>${protocolHandlersView_css_default}</style>
      <style>${UI6.inspectorCommonStyles}</style>
      <style>${Input.textInputStyles}</style>
      ${this.#renderStatusMessage()}
      <div class="protocol-handlers-row">
          ${uiI18n.getFormatLocalizedString(str_10, UIStrings10.needHelpReadOur, { PH1: protocolDocLink })}
      </div>
      ${this.#renderProtocolTest()}
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-protocol-handlers-view", ProtocolHandlersView);

// gen/front_end/panels/application/components/ReportsGrid.js
var ReportsGrid_exports = {};
__export(ReportsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  ReportsGrid: () => ReportsGrid,
  i18nString: () => i18nString10
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n21 from "./../../../core/i18n/i18n.js";
import * as Root2 from "./../../../core/root/root.js";
import * as UI7 from "./../../../ui/legacy/legacy.js";
import * as Lit8 from "./../../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/reportsGrid.css.js
var reportsGrid_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    overflow: auto;
    height: 100%;
  }

  .reporting-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .reporting-header {
    font-size: 15px;
    background-color: var(--sys-color-surface2);
    padding: 1px 4px;
    flex-shrink: 0;
  }

  devtools-data-grid {
    flex: auto;
  }

  .inline-icon {
    vertical-align: text-bottom;
  }
}

/*# sourceURL=${import.meta.resolve("./reportsGrid.css")} */`;

// gen/front_end/panels/application/components/ReportsGrid.js
var UIStrings11 = {
  /**
   * @description Placeholder text when there are no Reporting API reports.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
   */
  noReportsToDisplay: "No reports to display",
  /**
   * @description Placeholder text that explains Reporting API reports.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
   */
  reportingApiDescription: "Here you will find reporting api reports that are generated by the page.",
  /**
   * @description Link text to forward to a documentation page on reporting API.
   */
  learnMore: "Learn more",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *Status is one of 'Queued', 'Pending', 'MarkedForRemoval' or 'Success'.
   */
  status: "Status",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *Destination is the name of the endpoint the report is being sent to.
   */
  destination: "Destination",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *The column contains the timestamp of when a report was generated.
   */
  generatedAt: "Generated at"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/application/components/ReportsGrid.ts", UIStrings11);
var i18nString10 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var { render: render10, html: html10 } = Lit8;
var REPORTING_API_EXPLANATION_URL = "https://developer.chrome.com/docs/capabilities/web-apis/reporting-api";
var DEFAULT_VIEW4 = (input, output, target) => {
  render10(html10`
    <style>${reportsGrid_css_default}</style>
    <style>${UI7.inspectorCommonStyles}</style>
    <div class="reporting-container" jslog=${VisualLogging8.section("reports")}>
      <div class="reporting-header">${i18n21.i18n.lockedString("Reports")}</div>
      ${input.reports.length > 0 ? html10`
        <devtools-data-grid striped>
          <table>
            <tr>
              ${input.protocolMonitorExperimentEnabled ? html10`
                <th id="id" weight="30">${i18n21.i18n.lockedString("ID")}</th>
              ` : ""}
              <th id="url" weight="30">${i18n21.i18n.lockedString("URL")}</th>
              <th id="type" weight="20">${i18n21.i18n.lockedString("Type")}</th>
              <th id="status" weight="20">
                <style>${reportsGrid_css_default}</style>
                <span class="status-header">${i18nString10(UIStrings11.status)}</span>
                <x-link href="https://web.dev/reporting-api/#report-status"
                jslog=${VisualLogging8.link("report-status").track({ click: true })}>
                  <devtools-icon class="inline-icon medium" name="help" style="color: var(--icon-link);"
                  ></devtools-icon>
                </x-link>
              </th>
              <th id="destination" weight="20">${i18nString10(UIStrings11.destination)}</th>
              <th id="timestamp" weight="20">${i18nString10(UIStrings11.generatedAt)}</th>
              <th id="body" weight="20">${i18n21.i18n.lockedString("Body")}</th>
            </tr>
            ${input.reports.map((report) => html10`
              <tr @select=${() => input.onSelect(report.id)}>
                ${input.protocolMonitorExperimentEnabled ? html10`<td>${report.id}</td>` : ""}
                <td>${report.initiatorUrl}</td>
                <td>${report.type}</td>
                <td>${report.status}</td>
                <td>${report.destination}</td>
                <td>${new Date(report.timestamp * 1e3).toLocaleString()}</td>
                <td>${JSON.stringify(report.body)}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      ` : html10`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString10(UIStrings11.noReportsToDisplay)}</span>
          <div class="empty-state-description">
            <span>${i18nString10(UIStrings11.reportingApiDescription)}</span>
            ${UI7.XLink.XLink.create(REPORTING_API_EXPLANATION_URL, i18nString10(UIStrings11.learnMore), void 0, void 0, "learn-more")}
          </div>
        </div>
      `}
    </div>
  `, target);
};
var ReportsGrid = class extends UI7.Widget.Widget {
  reports = [];
  #protocolMonitorExperimentEnabled = false;
  #view;
  onReportSelected = () => {
  };
  constructor(element, view = DEFAULT_VIEW4) {
    super(element);
    this.#view = view;
    this.#protocolMonitorExperimentEnabled = Root2.Runtime.experiments.isEnabled("protocol-monitor");
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      reports: this.reports,
      protocolMonitorExperimentEnabled: this.#protocolMonitorExperimentEnabled,
      onSelect: this.onReportSelected
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ServiceWorkerRouterView.js
var ServiceWorkerRouterView_exports = {};
__export(ServiceWorkerRouterView_exports, {
  ServiceWorkerRouterView: () => ServiceWorkerRouterView
});
import * as LegacyWrapper5 from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as Lit9 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/serviceWorkerRouterView.css.js
var serviceWorkerRouterView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host {
  display: block;
  white-space: normal;
  max-width: 400px;
}

.router-rules {
  border: 1px solid var(--sys-color-divider);
  border-spacing: 0;
  padding-left: 10px;
  padding-right: 10px;
  line-height: initial;
  margin-top: 0;
  padding-bottom: 12px;
  text-wrap: balance;
}

.router-rule {
  display: flex;
  margin-top: 12px;
  flex-direction: column;
}

.rule-id {
  color: var(--sys-color-token-subtle);
}

.item {
  display: flex;
  flex-direction: column;
  padding-left: 10px;
}

.condition,
.source {
  list-style: none;
  display: flex;
  margin-top: 4px;
  flex-direction: row;
}

.condition > *,
.source > * {
  word-break: break-all;
  line-height: 1.5em;
}

.rule-type {
  flex: 0 0 18%;
}

/*# sourceURL=${import.meta.resolve("./serviceWorkerRouterView.css")} */`;

// gen/front_end/panels/application/components/ServiceWorkerRouterView.js
var { html: html11, render: render11 } = Lit9;
var ServiceWorkerRouterView = class extends LegacyWrapper5.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #rules = [];
  update(rules) {
    this.#rules = rules;
    if (this.#rules.length > 0) {
      this.#render();
    }
  }
  #render() {
    render11(html11`
      <style>${serviceWorkerRouterView_css_default}</style>
      <ul class="router-rules">
        ${this.#rules.map(this.#renderRouterRule)}
      </ul>
    `, this.#shadow, { host: this });
  }
  #renderRouterRule(rule) {
    return html11`
      <li class="router-rule">
        <div class="rule-id">Rule ${rule.id}</div>
        <ul class="item">
          <li class="condition">
            <div class="rule-type">Condition</div>
            <div class="rule-value">${rule.condition}</div>
          </li>
          <li class="source">
            <div class="rule-type">Source</div>
            <div class="rule-value">${rule.source}</div>
          </li>
        </ul>
      </li>
    `;
  }
};
customElements.define("devtools-service-worker-router-view", ServiceWorkerRouterView);

// gen/front_end/panels/application/components/SharedStorageAccessGrid.js
var SharedStorageAccessGrid_exports = {};
__export(SharedStorageAccessGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  SharedStorageAccessGrid: () => SharedStorageAccessGrid,
  i18nString: () => i18nString11
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n23 from "./../../../core/i18n/i18n.js";
import * as UI8 from "./../../../ui/legacy/legacy.js";
import * as Lit10 from "./../../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/sharedStorageAccessGrid.css.js
var sharedStorageAccessGrid_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  :scope {
    padding: 20px;
    height: 100%;
    display: flex;
  }

  .heading {
    font-size: 15px;
  }

  devtools-data-grid {
    margin-top: 20px;
  }

  .info-icon {
    vertical-align: text-bottom;
    height: 14px;
  }

  .no-events-message {
    margin-top: 20px;
  }
}

/*# sourceURL=${import.meta.resolve("./sharedStorageAccessGrid.css")} */`;

// gen/front_end/panels/application/components/SharedStorageAccessGrid.js
var SHARED_STORAGE_EXPLANATION_URL = "https://developers.google.com/privacy-sandbox/private-advertising/shared-storage";
var { render: render12, html: html12 } = Lit10;
var UIStrings12 = {
  /**
   * @description Text in Shared Storage Events View of the Application panel
   */
  sharedStorage: "Shared storage",
  /**
   * @description Hover text for an info icon in the Shared Storage Events panel
   */
  allSharedStorageEvents: "All shared storage events for this page.",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Date and time of an Shared Storage event in a locale-
   * dependent format.
   */
  eventTime: "Event Time",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Scope of shared storage event such as 'window', 'sharedStorageWorklet',
   * 'protectedAudienceWorklet', or 'header'.
   */
  eventScope: "Access Scope",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Method of shared storage event such as 'addModule', 'run', 'set', 'delete',
   * or 'get'.
   */
  eventMethod: "Access Method",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Owner origin of the shared storage for this access event.
   */
  ownerOrigin: "Owner Origin",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Owner site of the shared storage for this access event.
   */
  ownerSite: "Owner Site",
  /**
   * @description Text in Shared Storage Events View of the Application panel
   * Event parameters whose presence/absence depend on the access type.
   */
  eventParams: "Optional Event Params",
  /**
   * @description Text shown when no shared storage event is shown.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  noEvents: "No shared storage events detected",
  /**
   * @description Text shown when no shared storage event is shown. It explains the shared storage event page.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  sharedStorageDescription: "On this page you can view, add, edit and delete shared storage key-value pairs and view shared storage events.",
  /**
   * @description Text used in a link to learn more about the topic.
   */
  learnMore: "Learn more"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/application/components/SharedStorageAccessGrid.ts", UIStrings12);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var DEFAULT_VIEW5 = (input, _output, target) => {
  render12(html12`
    <style>${sharedStorageAccessGrid_css_default}</style>
    ${input.events.length === 0 ? html12`
        <div class="empty-state" jslog=${VisualLogging9.section().context("empty-view")}>
          <div class="empty-state-header">${i18nString11(UIStrings12.noEvents)}</div>
          <div class="empty-state-description">
            <span>${i18nString11(UIStrings12.sharedStorageDescription)}</span>
            ${UI8.XLink.XLink.create(SHARED_STORAGE_EXPLANATION_URL, i18nString11(UIStrings12.learnMore), "x-link", void 0, "learn-more")}
          </div>
        </div>` : html12`
        <div jslog=${VisualLogging9.section("events-table")}>
          <span class="heading">${i18nString11(UIStrings12.sharedStorage)}</span>
          <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString11(UIStrings12.allSharedStorageEvents)}>
          </devtools-icon>
          <devtools-data-grid striped inline>
            <table>
              <thead>
                <tr>
                  <th id="event-time" weight="10" sortable>
                    ${i18nString11(UIStrings12.eventTime)}
                  </th>
                  <th id="event-scope" weight="10" sortable>
                    ${i18nString11(UIStrings12.eventScope)}
                  </th>
                  <th id="event-method" weight="10" sortable>
                    ${i18nString11(UIStrings12.eventMethod)}
                  </th>
                  <th id="event-owner-origin" weight="10" sortable>
                    ${i18nString11(UIStrings12.ownerOrigin)}
                  </th>
                  <th id="event-owner-site" weight="10" sortable>
                    ${i18nString11(UIStrings12.ownerSite)}
                  </th>
                  <th id="event-params" weight="10" sortable>
                    ${i18nString11(UIStrings12.eventParams)}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${input.events.map((event) => html12`
                  <tr @select=${() => input.onSelect(event)}>
                    <td data-value=${event.accessTime}>
                      ${new Date(1e3 * event.accessTime).toLocaleString()}
                    </td>
                    <td>${event.scope}</td>
                    <td>${event.method}</td>
                    <td>${event.ownerOrigin}</td>
                    <td>${event.ownerSite}</td>
                    <td>${JSON.stringify(event.params)}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </devtools-data-grid>
        </div>`}`, target);
};
var SharedStorageAccessGrid = class extends UI8.Widget.Widget {
  #view;
  #events = [];
  #onSelect = () => {
  };
  constructor(element, view = DEFAULT_VIEW5) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.performUpdate();
  }
  set events(events) {
    this.#events = events;
    this.performUpdate();
  }
  set onSelect(onSelect) {
    this.#onSelect = onSelect;
    this.performUpdate();
  }
  get onSelect() {
    return this.#onSelect;
  }
  performUpdate() {
    this.#view({
      events: this.#events,
      onSelect: this.#onSelect.bind(this)
    }, {}, this.contentElement);
  }
};

// gen/front_end/panels/application/components/SharedStorageMetadataView.js
var SharedStorageMetadataView_exports = {};
__export(SharedStorageMetadataView_exports, {
  SharedStorageMetadataView: () => SharedStorageMetadataView
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n27 from "./../../../core/i18n/i18n.js";
import * as Buttons7 from "./../../../ui/components/buttons/buttons.js";
import * as Lit12 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/sharedStorageMetadataView.css.js
var sharedStorageMetadataView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

devtools-icon {
  vertical-align: text-bottom;
  margin-left: var(--sys-size-3);
  width: 16px;
  height: 16px;
}

devtools-button {
  vertical-align: sub;
  margin-left: var(--sys-size-3);
}

.entropy-budget {
  display: flex;
  align-items: center;
  height: 18px;
}

/*# sourceURL=${import.meta.resolve("./sharedStorageMetadataView.css")} */`;

// gen/front_end/panels/application/components/StorageMetadataView.js
var StorageMetadataView_exports = {};
__export(StorageMetadataView_exports, {
  StorageMetadataView: () => StorageMetadataView
});
import "./../../../ui/components/report_view/report_view.js";
import * as i18n25 from "./../../../core/i18n/i18n.js";
import * as SDK5 from "./../../../core/sdk/sdk.js";
import * as Buttons6 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper7 from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator3 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI9 from "./../../../ui/legacy/legacy.js";
import * as Lit11 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/storageMetadataView.css.js
var storageMetadataView_css_default = `/*
 * Copyright 2025 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.default-bucket {
  font-style: italic;
}

/*# sourceURL=${import.meta.resolve("./storageMetadataView.css")} */`;

// gen/front_end/panels/application/components/StorageMetadataView.js
var { html: html13 } = Lit11;
var UIStrings13 = {
  /**
   * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin).
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: "Frame origin",
  /**
   * @description Site (https://web.dev/same-site-same-origin/#site) for the URL the user sees in the omnibox.
   */
  topLevelSite: "Top-level site",
  /**
   * @description Text to show in the top-level site row, in case the value is opaque (https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  opaque: "(opaque)",
  /**
   * @description Whether the storage corresponds to an opaque key (similar to https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  isOpaque: "Is opaque",
  /**
   * @description Whether the storage corresponds to a third-party origin (https://web.dev/learn/privacy/third-parties/).
   */
  isThirdParty: "Is third-party",
  /**
   * @description Text indicating that the condition holds.
   */
  yes: "Yes",
  /**
   * @description Text indicating that the condition does not hold.
   */
  no: "No",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because top-level site is opaque.
   */
  yesBecauseTopLevelIsOpaque: "Yes, because the top-level site is opaque",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the storage key is opaque.
   */
  yesBecauseKeyIsOpaque: "Yes, because the storage key is opaque",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the origin doesn't match the top-level site.
   */
  yesBecauseOriginNotInTopLevelSite: "Yes, because the origin is outside of the top-level site",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the was a third-party origin in the ancestry chain.
   */
  yesBecauseAncestorChainHasCrossSite: "Yes, because the ancestry chain contains a third-party origin",
  /**
   * @description Text when something is loading.
   */
  loading: "Loading\u2026",
  /**
   * @description The storage bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names)
   */
  bucketName: "Bucket name",
  /**
   * @description The name of the default bucket (https://wicg.github.io/storage-buckets/explainer#the-default-bucket)
   *(This should not be a valid bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names))
   */
  defaultBucket: "Default bucket",
  /**
   * @description Text indicating that the storage is persistent (https://wicg.github.io/storage-buckets/explainer#storage-policy-persistence)
   */
  persistent: "Is persistent",
  /**
   * @description The storage durability policy (https://wicg.github.io/storage-buckets/explainer#storage-policy-durability)
   */
  durability: "Durability",
  /**
   * @description The storage quota (https://wicg.github.io/storage-buckets/explainer#storage-policy-quota)
   */
  quota: "Quota",
  /**
   * @description The storage expiration (https://wicg.github.io/storage-buckets/explainer#storage-policy-expiration)
   */
  expiration: "Expiration",
  /**
   * @description Text indicating that no value is set
   */
  none: "None",
  /**
   * @description Label of the button that triggers the Storage Bucket to be deleted.
   */
  deleteBucket: "Delete bucket",
  /**
   * @description Text shown in the confirmation dialogue that displays before deleting the bucket.
   * @example {bucket} PH1
   */
  confirmBucketDeletion: 'Delete the "{PH1}" bucket?',
  /**
   * @description Explanation text shown in the confirmation dialogue that displays before deleting the bucket.
   */
  bucketWillBeRemoved: "The selected storage bucket and contained data will be removed."
};
var str_13 = i18n25.i18n.registerUIStrings("panels/application/components/StorageMetadataView.ts", UIStrings13);
var i18nString12 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var StorageMetadataView = class extends LegacyWrapper7.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #storageBucketsModel;
  #storageKey = null;
  #storageBucket = null;
  #showOnlyBucket = true;
  setStorageKey(storageKey) {
    this.#storageKey = SDK5.StorageKeyManager.parseStorageKey(storageKey);
    void this.render();
  }
  setStorageBucket(storageBucket) {
    this.#storageBucket = storageBucket;
    this.setStorageKey(storageBucket.bucket.storageKey);
  }
  setShowOnlyBucket(show) {
    this.#showOnlyBucket = show;
  }
  enableStorageBucketControls(model) {
    this.#storageBucketsModel = model;
    if (this.#storageKey) {
      void this.render();
    }
  }
  render() {
    return RenderCoordinator3.write("StorageMetadataView render", async () => {
      Lit11.render(html13`
        <style>
          ${storageMetadataView_css_default}
        </style>
        <devtools-report .data=${{ reportTitle: this.getTitle() ?? i18nString12(UIStrings13.loading) }}>
          ${await this.renderReportContent()}
        </devtools-report>`, this.#shadow, { host: this });
    });
  }
  getTitle() {
    if (!this.#storageKey) {
      return;
    }
    const origin = this.#storageKey.origin;
    const bucketName = this.#storageBucket?.bucket.name || i18nString12(UIStrings13.defaultBucket);
    return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
  }
  key(content) {
    return html13`<devtools-report-key>${content}</devtools-report-key>`;
  }
  value(content) {
    return html13`<devtools-report-value>${content}</devtools-report-value>`;
  }
  async renderReportContent() {
    if (!this.#storageKey) {
      return Lit11.nothing;
    }
    const origin = this.#storageKey.origin;
    const ancestorChainHasCrossSite = Boolean(this.#storageKey.components.get(
      "3"
      /* SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT */
    ));
    const hasNonce = Boolean(this.#storageKey.components.get(
      "1"
      /* SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH */
    ));
    const topLevelSiteIsOpaque = Boolean(this.#storageKey.components.get(
      "4"
      /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH */
    ));
    const topLevelSite = this.#storageKey.components.get(
      "0"
      /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE */
    );
    const thirdPartyReason = ancestorChainHasCrossSite ? i18nString12(UIStrings13.yesBecauseAncestorChainHasCrossSite) : hasNonce ? i18nString12(UIStrings13.yesBecauseKeyIsOpaque) : topLevelSiteIsOpaque ? i18nString12(UIStrings13.yesBecauseTopLevelIsOpaque) : topLevelSite && origin !== topLevelSite ? i18nString12(UIStrings13.yesBecauseOriginNotInTopLevelSite) : null;
    const isIframeOrEmbedded = topLevelSite && origin !== topLevelSite;
    return html13`
        ${isIframeOrEmbedded ? html13`${this.key(i18nString12(UIStrings13.origin))}
            ${this.value(html13`<div class="text-ellipsis" title=${origin}>${origin}</div>`)}` : Lit11.nothing}
        ${topLevelSite || topLevelSiteIsOpaque ? this.key(i18nString12(UIStrings13.topLevelSite)) : Lit11.nothing}
        ${topLevelSite ? this.value(topLevelSite) : Lit11.nothing}
        ${topLevelSiteIsOpaque ? this.value(i18nString12(UIStrings13.opaque)) : Lit11.nothing}
        ${thirdPartyReason ? html13`${this.key(i18nString12(UIStrings13.isThirdParty))}${this.value(thirdPartyReason)}` : Lit11.nothing}
        ${hasNonce || topLevelSiteIsOpaque ? this.key(i18nString12(UIStrings13.isOpaque)) : Lit11.nothing}
        ${hasNonce ? this.value(i18nString12(UIStrings13.yes)) : Lit11.nothing}
        ${topLevelSiteIsOpaque ? this.value(i18nString12(UIStrings13.yesBecauseTopLevelIsOpaque)) : Lit11.nothing}
        ${this.#storageBucket ? this.#renderStorageBucketInfo() : Lit11.nothing}
        ${this.#storageBucketsModel ? this.#renderBucketControls() : Lit11.nothing}`;
  }
  #renderStorageBucketInfo() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #renderStorageBucketInfo if #bucket is null.");
    }
    const { bucket: { name }, persistent, durability, quota } = this.#storageBucket;
    const isDefault = !name;
    if (!this.#showOnlyBucket) {
      if (isDefault) {
        return html13`
          ${this.key(i18nString12(UIStrings13.bucketName))}
          ${this.value(html13`<span class="default-bucket">default</span>`)}`;
      }
      return html13`
        ${this.key(i18nString12(UIStrings13.bucketName))}
        ${this.value(name)}`;
    }
    return html13`
      ${this.key(i18nString12(UIStrings13.bucketName))}
      ${this.value(name || html13`<span class="default-bucket">default</span>`)}
      ${this.key(i18nString12(UIStrings13.persistent))}
      ${this.value(persistent ? i18nString12(UIStrings13.yes) : i18nString12(UIStrings13.no))}
      ${this.key(i18nString12(UIStrings13.durability))}
      ${this.value(durability)}
      ${this.key(i18nString12(UIStrings13.quota))}
      ${this.value(i18n25.ByteUtilities.bytesToString(quota))}
      ${this.key(i18nString12(UIStrings13.expiration))}
      ${this.value(this.#getExpirationString())}`;
  }
  #getExpirationString() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #getExpirationString if #bucket is null.");
    }
    const { expiration } = this.#storageBucket;
    if (expiration === 0) {
      return i18nString12(UIStrings13.none);
    }
    return new Date(expiration * 1e3).toLocaleString();
  }
  #renderBucketControls() {
    return html13`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section>
        <devtools-button
          aria-label=${i18nString12(UIStrings13.deleteBucket)}
          .variant=${"outlined"}
          @click=${this.#deleteBucket}>
          ${i18nString12(UIStrings13.deleteBucket)}
        </devtools-button>
      </devtools-report-section>`;
  }
  async #deleteBucket() {
    if (!this.#storageBucketsModel || !this.#storageBucket) {
      throw new Error("Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.");
    }
    const ok = await UI9.UIUtils.ConfirmDialog.show(i18nString12(UIStrings13.bucketWillBeRemoved), i18nString12(UIStrings13.confirmBucketDeletion, { PH1: this.#storageBucket.bucket.name || "" }), this, { jslogContext: "delete-bucket-confirmation" });
    if (ok) {
      this.#storageBucketsModel.deleteBucket(this.#storageBucket.bucket);
    }
  }
};
customElements.define("devtools-storage-metadata-view", StorageMetadataView);

// gen/front_end/panels/application/components/SharedStorageMetadataView.js
var { html: html14 } = Lit12;
var UIStrings14 = {
  /**
   * @description Text in SharedStorage Metadata View of the Application panel
   */
  sharedStorage: "Shared storage",
  /**
   * @description The time when the origin most recently created its shared storage database
   */
  creation: "Creation Time",
  /**
   * @description The placeholder text if there is no creation time because the origin is not yet using shared storage.
   */
  notYetCreated: "Not yet created",
  /**
   * @description The number of entries currently in the origin's database
   */
  numEntries: "Number of Entries",
  /**
   * @description The number of bits remaining in the origin's shared storage privacy budget
   */
  entropyBudget: "Entropy Budget for Fenced Frames",
  /**
   * @description Hover text for `entropyBudget` giving a more detailed explanation
   */
  budgetExplanation: "Remaining data leakage allowed within a 24-hour period for this origin in bits of entropy",
  /**
   * @description Label for a button which when clicked causes the budget to be reset to the max.
   */
  resetBudget: "Reset Budget",
  /**
   * @description The number of bytes used by entries currently in the origin's database
   */
  numBytesUsed: "Number of Bytes Used"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/application/components/SharedStorageMetadataView.ts", UIStrings14);
var i18nString13 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var SharedStorageMetadataView = class extends StorageMetadataView {
  #sharedStorageMetadataGetter;
  #creationTime = null;
  #length = 0;
  #bytesUsed = 0;
  #remainingBudget = 0;
  constructor(sharedStorageMetadataGetter, owner) {
    super();
    this.#sharedStorageMetadataGetter = sharedStorageMetadataGetter;
    this.classList.add("overflow-auto");
    this.setStorageKey(owner);
  }
  async #resetBudget() {
    await this.#sharedStorageMetadataGetter.resetBudget();
    await this.render();
  }
  getTitle() {
    return i18nString13(UIStrings14.sharedStorage);
  }
  async renderReportContent() {
    const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
    this.#creationTime = metadata?.creationTime ?? null;
    this.#length = metadata?.length ?? 0;
    this.#bytesUsed = metadata?.bytesUsed ?? 0;
    this.#remainingBudget = metadata?.remainingBudget ?? 0;
    return html14`
      <style>${sharedStorageMetadataView_css_default}</style>
      ${await super.renderReportContent()}
      ${this.key(i18nString13(UIStrings14.creation))}
      ${this.value(this.#renderDateForCreationTime())}
      ${this.key(i18nString13(UIStrings14.numEntries))}
      ${this.value(String(this.#length))}
      ${this.key(i18nString13(UIStrings14.numBytesUsed))}
      ${this.value(String(this.#bytesUsed))}
      ${this.key(html14`<span class="entropy-budget">${i18nString13(UIStrings14.entropyBudget)}<devtools-icon name="info" title=${i18nString13(UIStrings14.budgetExplanation)}></devtools-icon></span>`)}
      ${this.value(html14`<span class="entropy-budget">${this.#remainingBudget}${this.#renderResetBudgetButton()}</span>`)}`;
  }
  #renderDateForCreationTime() {
    if (!this.#creationTime) {
      return html14`${i18nString13(UIStrings14.notYetCreated)}`;
    }
    const date = new Date(1e3 * this.#creationTime);
    return html14`${date.toLocaleString()}`;
  }
  #renderResetBudgetButton() {
    return html14`
      <devtools-button .iconName=${"undo"}
                       .jslogContext=${"reset-entropy-budget"}
                       .size=${"SMALL"}
                       .title=${i18nString13(UIStrings14.resetBudget)}
                       .variant=${"icon"}
                       @click=${this.#resetBudget.bind(this)}></devtools-button>
    `;
  }
};
customElements.define("devtools-shared-storage-metadata-view", SharedStorageMetadataView);

// gen/front_end/panels/application/components/TrustTokensView.js
var TrustTokensView_exports = {};
__export(TrustTokensView_exports, {
  TrustTokensView: () => TrustTokensView,
  i18nString: () => i18nString14
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n29 from "./../../../core/i18n/i18n.js";
import * as SDK6 from "./../../../core/sdk/sdk.js";
import * as Buttons8 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper9 from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator4 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI10 from "./../../../ui/legacy/legacy.js";
import * as Lit13 from "./../../../ui/lit/lit.js";
import * as VisualLogging10 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/trustTokensView.css.js
var trustTokensView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 20px;
  height: 100%;
  display: flex;
}

.heading {
  font-size: 15px;
}

devtools-data-grid {
  margin-top: 20px;

  & devtools-button {
    width: 14px;
    height: 14px;
  }
}

devtools-icon {
  width: 14px;
  height: 14px;
}

.no-tt-message {
  margin-top: 20px;
}

/*# sourceURL=${import.meta.resolve("./trustTokensView.css")} */`;

// gen/front_end/panels/application/components/TrustTokensView.js
var PRIVATE_STATE_TOKENS_EXPLANATION_URL = "https://developers.google.com/privacy-sandbox/protections/private-state-tokens";
var { html: html15 } = Lit13;
var UIStrings15 = {
  /**
   * @description Text for the issuer of an item
   */
  issuer: "Issuer",
  /**
   * @description Column header for Trust Token table
   */
  storedTokenCount: "Stored token count",
  /**
   * @description Hover text for an info icon in the Private State Token panel
   */
  allStoredTrustTokensAvailableIn: "All stored private state tokens available in this browser instance.",
  /**
   * @description Text shown instead of a table when the table would be empty. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  noTrustTokens: "No private state tokens detected",
  /**
   * @description Text shown if there are no private state tokens. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  trustTokensDescription: "On this page you can view all available private state tokens in the current browsing context.",
  /**
   * @description Each row in the Private State Token table has a delete button. This is the text shown
   * when hovering over this button. The placeholder is a normal URL, indicating the site which
   * provided the Private State Tokens that will be deleted when the button is clicked.
   * @example {https://google.com} PH1
   */
  deleteTrustTokens: "Delete all stored private state tokens issued by {PH1}.",
  /**
   * @description Heading label for a view. Previously known as 'Trust Tokens'.
   */
  trustTokens: "Private state tokens",
  /**
   * @description Text used in a link to learn more about the topic.
   */
  learnMore: "Learn more"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/application/components/TrustTokensView.ts", UIStrings15);
var i18nString14 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var REFRESH_INTERVAL_MS = 1e3;
var TrustTokensView = class extends LegacyWrapper9.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #deleteClickHandler(issuerOrigin) {
    const mainTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({ issuerOrigin });
  }
  connectedCallback() {
    this.wrapper?.contentElement.classList.add("vbox");
    void this.render();
  }
  async render() {
    const mainTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const { tokens } = await mainTarget.storageAgent().invoke_getTrustTokens();
    tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));
    await RenderCoordinator4.write("Render TrustTokensView", () => {
      Lit13.render(html15`
        <style>${trustTokensView_css_default}</style>
        <style>${UI10.inspectorCommonStyles}</style>
        ${this.#renderGridOrNoDataMessage(tokens)}
      `, this.#shadow, { host: this });
      if (this.isConnected) {
        setTimeout(() => this.render(), REFRESH_INTERVAL_MS);
      }
    });
  }
  #renderGridOrNoDataMessage(tokens) {
    if (tokens.length === 0) {
      return html15`
        <div class="empty-state" jslog=${VisualLogging10.section().context("empty-view")}>
          <div class="empty-state-header">${i18nString14(UIStrings15.noTrustTokens)}</div>
          <div class="empty-state-description">
            <span>${i18nString14(UIStrings15.trustTokensDescription)}</span>
            ${UI10.XLink.XLink.create(PRIVATE_STATE_TOKENS_EXPLANATION_URL, i18nString14(UIStrings15.learnMore), "x-link", void 0, "learn-more")}
          </div>
        </div>
      `;
    }
    return html15`
      <div>
        <span class="heading">${i18nString14(UIStrings15.trustTokens)}</span>
        <devtools-icon name="info" title=${i18nString14(UIStrings15.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${i18nString14(UIStrings15.issuer)}</th>
              <th id="count" weight="5" sortable>${i18nString14(UIStrings15.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${tokens.filter((token) => token.count > 0).map((token) => html15`
                <tr>
                  <td>${removeTrailingSlash(token.issuerOrigin)}</td>
                  <td>${token.count}</td>
                  <td>
                    <devtools-button .iconName=${"bin"}
                                    .jslogContext=${"delete-all"}
                                    .size=${"SMALL"}
                                    .title=${i18nString14(UIStrings15.deleteTrustTokens, { PH1: removeTrailingSlash(token.issuerOrigin) })}
                                    .variant=${"icon"}
                                    @click=${this.#deleteClickHandler.bind(this, removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
  }
};
function removeTrailingSlash(s) {
  return s.replace(/\/$/, "");
}
customElements.define("devtools-trust-tokens-storage-view", TrustTokensView);
export {
  BackForwardCacheView_exports as BackForwardCacheView,
  BounceTrackingMitigationsView_exports as BounceTrackingMitigationsView,
  EndpointsGrid_exports as EndpointsGrid,
  FrameDetailsView_exports as FrameDetailsView,
  InterestGroupAccessGrid_exports as InterestGroupAccessGrid,
  OriginTrialTreeView_exports as OriginTrialTreeView,
  ProtocolHandlersView_exports as ProtocolHandlersView,
  ReportsGrid_exports as ReportsGrid,
  ServiceWorkerRouterView_exports as ServiceWorkerRouterView,
  SharedStorageAccessGrid_exports as SharedStorageAccessGrid,
  SharedStorageMetadataView_exports as SharedStorageMetadataView,
  StackTrace_exports as StackTrace,
  StorageMetadataView_exports as StorageMetadataView,
  TrustTokensView_exports as TrustTokensView
};
//# sourceMappingURL=components.js.map
