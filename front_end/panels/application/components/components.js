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
import "./../../../ui/components/expandable_list/expandable_list.js";
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/legacy.js";
import "./../../../ui/kit/kit.js";
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
    const link6 = "chrome://extensions/?id=" + explanation.context;
    return html`${i18nString(UIStrings2.blockingExtensionId)}
      <devtools-link .href=${link6}>${explanation.context}</devtools-link>`;
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
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  i18nString: () => i18nString2
});
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
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
var renderForceRunButton = (input) => {
  const isMitigationRunning = input.screenStatus === "Running";
  return html2`
    <devtools-button
      aria-label=${i18nString2(UIStrings3.forceRun)}
      .disabled=${isMitigationRunning}
      .spinner=${isMitigationRunning}
      .variant=${"primary"}
      @click=${input.runMitigations}
      jslog=${VisualLogging2.action("force-run").track({ click: true })}>
      ${isMitigationRunning ? html2`
        ${i18nString2(UIStrings3.runningMitigations)}` : `
        ${i18nString2(UIStrings3.forceRun)}
      `}
    </devtools-button>
  `;
};
var renderDeletedSitesOrNoSitesMessage = (input) => {
  if (!input.seenButtonClick) {
    return Lit.nothing;
  }
  if (input.trackingSites.length === 0) {
    return html2`
      <devtools-report-section>
      ${input.screenStatus === "Running" ? html2`
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
          ${input.trackingSites.map((site) => html2`
            <tr><td>${site}</td></tr>`)}
        </table>
      </devtools-data-grid>
    </devtools-report-section>
  `;
};
var renderMainFrameInformation2 = (input) => {
  if (input.screenStatus === "Initializing") {
    return Lit.nothing;
  }
  if (input.screenStatus === "Disabled") {
    return html2`
      <devtools-report-section>
        ${i18nString2(UIStrings3.featureDisabled)}
      </devtools-report-section>
    `;
  }
  return html2`
    <devtools-report-section>
      ${renderForceRunButton(input)}
    </devtools-report-section>
    ${renderDeletedSitesOrNoSitesMessage(input)}
    <devtools-report-divider>
    </devtools-report-divider>
    <devtools-report-section>
      <x-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
      jslog=${VisualLogging2.link("learn-more").track({ click: true })}>
        ${i18nString2(UIStrings3.learnMore)}
      </x-link>
    </devtools-report-section>
  `;
};
var DEFAULT_VIEW2 = (input, _output, target) => {
  Lit.render(html2`
    <style>${bounceTrackingMitigationsView_css_default}</style>
    <style>${UI2.inspectorCommonStyles}</style>
    <devtools-report .data=${{ reportTitle: i18nString2(UIStrings3.bounceTrackingMitigationsTitle) }}
                      jslog=${VisualLogging2.pane("bounce-tracking-mitigations")}>
      ${renderMainFrameInformation2(input)}
    </devtools-report>
  `, target);
};
var BounceTrackingMitigationsView = class extends UI2.Widget.Widget {
  #trackingSites = [];
  #screenStatus = "Initializing";
  #seenButtonClick = false;
  #view;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true, classes: ["overflow-auto"] });
    this.#view = view;
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      this.#screenStatus = "Result";
    } else {
      void mainTarget.systemInfo().invoke_getFeatureState({ featureState: "DIPS" }).then((state) => {
        this.#screenStatus = state.featureEnabled ? "Result" : "Disabled";
        this.requestUpdate();
      });
    }
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      screenStatus: this.#screenStatus,
      trackingSites: this.#trackingSites,
      seenButtonClick: this.#seenButtonClick,
      runMitigations: this.#runMitigations.bind(this)
    }, void 0, this.contentElement);
  }
  async #runMitigations() {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    this.#seenButtonClick = true;
    this.#screenStatus = "Running";
    this.requestUpdate();
    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach((element) => {
      this.#trackingSites.push(element);
    });
    this.#renderMitigationsResult();
  }
  #renderMitigationsResult() {
    this.#screenStatus = "Result";
    this.requestUpdate();
  }
};

// gen/front_end/panels/application/components/EndpointsGrid.js
var EndpointsGrid_exports = {};
__export(EndpointsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  EndpointsGrid: () => EndpointsGrid,
  i18nString: () => i18nString3
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
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
var DEFAULT_VIEW3 = (input, output, target) => {
  render3(html3`
    <style>${endpointsGrid_css_default}</style>
    <style>${UI3.inspectorCommonStyles}</style>
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
var EndpointsGrid = class extends UI3.Widget.Widget {
  endpoints = /* @__PURE__ */ new Map();
  #view;
  constructor(element, view = DEFAULT_VIEW3) {
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

// gen/front_end/panels/application/components/InterestGroupAccessGrid.js
var InterestGroupAccessGrid_exports = {};
__export(InterestGroupAccessGrid_exports, {
  InterestGroupAccessGrid: () => InterestGroupAccessGrid,
  i18nString: () => i18nString4
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as UI4 from "./../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../ui/lit/lit.js";

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
var { html: html4 } = Lit3;
var UIStrings5 = {
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
var str_5 = i18n9.i18n.registerUIStrings("panels/application/components/InterestGroupAccessGrid.ts", UIStrings5);
var i18nString4 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
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
    Lit3.render(html4`
      <style>${interestGroupAccessGrid_css_default}</style>
      <style>${UI4.inspectorCommonStyles}</style>
      ${this.#datastores.length === 0 ? html4`
          <div class="empty-state">
            <span class="empty-state-header">${i18nString4(UIStrings5.noEvents)}</span>
            <span class="empty-state-description">${i18nString4(UIStrings5.interestGroupDescription)}</span>
          </div>` : html4`
          <div>
            <span class="heading">Interest Groups</span>
            <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString4(UIStrings5.allInterestGroupStorageEvents)}>
            </devtools-icon>
            ${this.#renderGrid()}
          </div>`}
    `, this.#shadow, { host: this });
  }
  #renderGrid() {
    return html4`
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="event-time" sortable weight="10">${i18nString4(UIStrings5.eventTime)}</td>
            <th id="event-type" sortable weight="5">${i18nString4(UIStrings5.eventType)}</td>
            <th id="event-group-owner" sortable weight="10">${i18nString4(UIStrings5.groupOwner)}</td>
            <th id="event-group-name" sortable weight="10">${i18nString4(UIStrings5.groupName)}</td>
          </tr>
          ${this.#datastores.map((event) => html4`
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

// gen/front_end/panels/application/components/PermissionsPolicySection.js
var PermissionsPolicySection_exports = {};
__export(PermissionsPolicySection_exports, {
  PermissionsPolicySection: () => PermissionsPolicySection,
  renderIconLink: () => renderIconLink
});
import "./../../../ui/kit/kit.js";
import "./../../../ui/components/report_view/report_view.js";
import * as Common2 from "./../../../core/common/common.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as SDK3 from "./../../../core/sdk/sdk.js";
import * as NetworkForward from "./../../network/forward/forward.js";
import * as Buttons3 from "./../../../ui/components/buttons/buttons.js";
import * as UI5 from "./../../../ui/legacy/legacy.js";
import { html as html5, nothing as nothing3, render as render5 } from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

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
var UIStrings6 = {
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
var str_6 = i18n11.i18n.registerUIStrings("panels/application/components/PermissionsPolicySection.ts", UIStrings6);
var i18nString5 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function renderIconLink(iconName, title, clickHandler, jsLogContext) {
  return html5`
    <devtools-button
      .iconName=${iconName}
      title=${title}
      aria-label=${title}
      .variant=${"icon"}
      .size=${"SMALL"}
      @click=${clickHandler}
      jslog=${VisualLogging4.action().track({ click: true }).context(jsLogContext)}>
    </devtools-button>`;
}
function renderAllowed(allowed) {
  if (!allowed.length) {
    return nothing3;
  }
  return html5`
    <devtools-report-key>${i18nString5(UIStrings6.allowedFeatures)}</devtools-report-key>
    <devtools-report-value>${allowed.map(({ feature }) => feature).join(", ")}</devtools-report-value>`;
}
function renderDisallowed(data, showDetails, onToggleShowDetails, onRevealDOMNode, onRevealHeader) {
  if (!data.length) {
    return nothing3;
  }
  if (!showDetails) {
    return html5`
      <devtools-report-key>${i18nString5(UIStrings6.disabledFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${data.map(({ policy }) => policy.feature).join(", ")}
        <devtools-button
            class="disabled-features-button"
            .variant=${"outlined"}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging4.action("show-disabled-features-details").track({ click: true })}>
          ${i18nString5(UIStrings6.showDetails)}
        </devtools-button>
      </devtools-report-value>`;
  }
  const featureRows = data.map(({ policy, blockReason, linkTargetDOMNode, linkTargetRequest }) => {
    const blockReasonText = (() => {
      switch (blockReason) {
        case "IframeAttribute":
          return i18nString5(UIStrings6.disabledByIframe);
        case "Header":
          return i18nString5(UIStrings6.disabledByHeader);
        case "InFencedFrameTree":
          return i18nString5(UIStrings6.disabledByFencedFrame);
        default:
          return "";
      }
    })();
    return html5`
      <div class="permissions-row">
        <div>
          <devtools-icon class="allowed-icon extra-large" name="cross-circle">
          </devtools-icon>
        </div>
        <div class="feature-name text-ellipsis">${policy.feature}</div>
        <div class="block-reason">${blockReasonText}</div>
        <div>
          ${linkTargetDOMNode ? renderIconLink("code-circle", i18nString5(UIStrings6.clickToShowIframe), () => onRevealDOMNode(linkTargetDOMNode), "reveal-in-elements") : nothing3}
          ${linkTargetRequest ? renderIconLink("arrow-up-down-circle", i18nString5(UIStrings6.clickToShowHeader), () => onRevealHeader(linkTargetRequest), "reveal-in-network") : nothing3}
        </div>
      </div>`;
  });
  return html5`
    <devtools-report-key>${i18nString5(UIStrings6.disabledFeatures)}</devtools-report-key>
    <devtools-report-value class="policies-list">
      ${featureRows}
      <div class="permissions-row">
        <devtools-button
            .variant=${"outlined"}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging4.action("hide-disabled-features-details").track({ click: true })}>
          ${i18nString5(UIStrings6.hideDetails)}
        </devtools-button>
      </div>
    </devtools-report-value>`;
}
var DEFAULT_VIEW4 = (input, output, target) => {
  render5(html5`
    <style>${permissionsPolicySection_css_default}</style>
    <devtools-report-section-header>
      ${i18n11.i18n.lockedString("Permissions Policy")}
    </devtools-report-section-header>
    ${renderAllowed(input.allowed)}
    ${input.allowed.length > 0 && input.disallowed.length > 0 ? html5`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing3}
    ${renderDisallowed(input.disallowed, input.showDetails, input.onToggleShowDetails, input.onRevealDOMNode, input.onRevealHeader)}
    <devtools-report-divider></devtools-report-divider>`, target);
};
var PermissionsPolicySection = class extends UI5.Widget.Widget {
  #policies = [];
  #showDetails = false;
  #view;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set policies(policies) {
    this.#policies = policies;
    this.requestUpdate();
  }
  get policies() {
    return this.#policies;
  }
  set showDetails(showDetails) {
    this.#showDetails = showDetails;
    this.requestUpdate();
  }
  get showDetails() {
    return this.#showDetails;
  }
  #toggleShowPermissionsDisallowedDetails() {
    this.showDetails = !this.showDetails;
  }
  async #revealDOMNode(linkTargetDOMNode) {
    await Common2.Revealer.reveal(linkTargetDOMNode);
  }
  async #revealHeader(linkTargetRequest) {
    if (!linkTargetRequest) {
      return;
    }
    const headerName = linkTargetRequest.responseHeaderValue("permissions-policy") ? "permissions-policy" : "feature-policy";
    const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(linkTargetRequest, { name: headerName, value: "" });
    await Common2.Revealer.reveal(requestLocation);
  }
  async performUpdate() {
    const frameManager = SDK3.FrameManager.FrameManager.instance();
    const policies = this.#policies.sort((a, b) => a.feature.localeCompare(b.feature));
    const allowed = policies.filter((p) => p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
    const disallowed = policies.filter((p) => !p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
    const disallowedData = this.#showDetails ? await Promise.all(disallowed.map(async (policy) => {
      const frame = policy.locator ? frameManager.getFrame(policy.locator.frameId) : void 0;
      const blockReason = policy.locator?.blockReason;
      const linkTargetDOMNode = await (blockReason === "IframeAttribute" && frame?.getOwnerDOMNodeOrDocument() || void 0);
      const resource = frame?.resourceForURL(frame.url);
      const linkTargetRequest = blockReason === "Header" && resource?.request || void 0;
      return { policy, blockReason, linkTargetDOMNode, linkTargetRequest };
    })) : disallowed.map((policy) => ({ policy }));
    this.#view({
      allowed,
      disallowed: disallowedData,
      showDetails: this.#showDetails,
      onToggleShowDetails: this.#toggleShowPermissionsDisallowedDetails.bind(this),
      onRevealDOMNode: this.#revealDOMNode.bind(this),
      onRevealHeader: this.#revealHeader.bind(this)
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ProtocolHandlersView.js
var ProtocolHandlersView_exports = {};
__export(ProtocolHandlersView_exports, {
  ProtocolHandlersView: () => ProtocolHandlersView
});
import "./../../../ui/kit/kit.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as Buttons4 from "./../../../ui/components/buttons/buttons.js";
import * as Input from "./../../../ui/components/input/input.js";
import * as uiI18n from "./../../../ui/i18n/i18n.js";
import * as UI6 from "./../../../ui/legacy/legacy.js";
import { html as html6, i18nTemplate as unboundI18nTemplate, nothing as nothing4, render as render6 } from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

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
var PROTOCOL_DOCUMENT_URL = "https://web.dev/url-protocol-handler/";
var UIStrings7 = {
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
var str_7 = i18n13.i18n.registerUIStrings("panels/application/components/ProtocolHandlersView.ts", UIStrings7);
var i18nString6 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var i18nTemplate = unboundI18nTemplate.bind(void 0, str_7);
function renderStatusMessage(protocolHandlers, manifestLink) {
  const manifestInTextLink = UI6.XLink.XLink.create(manifestLink, i18nString6(UIStrings7.manifest), void 0, void 0, "manifest");
  const statusString = protocolHandlers.length > 0 ? UIStrings7.protocolDetected : UIStrings7.protocolNotDetected;
  return html6`
    <div class="protocol-handlers-row status">
      <devtools-icon class="inline-icon"
                     name=${protocolHandlers.length > 0 ? "check-circle" : "info"}>
      </devtools-icon>
      ${uiI18n.getFormatLocalizedString(str_7, statusString, { PH1: manifestInTextLink })}
    </div>`;
}
function renderProtocolTest(protocolHandlers, queryInputState, protocolSelectHandler, queryInputChangeHandler, testProtocolClickHandler) {
  if (protocolHandlers.length === 0) {
    return nothing4;
  }
  return html6`
    <div class="protocol-handlers-row">
      <select class="protocol-select" @change=${protocolSelectHandler}
              aria-label=${i18nString6(UIStrings7.dropdownLabel)}>
        ${protocolHandlers.filter((p) => p.protocol).map(({ protocol }) => html6`
          <option value=${protocol} jslog=${VisualLogging5.item(protocol).track({ click: true })}>
            ${protocol}://
          </option>`)}
      </select>
      <input .value=${queryInputState} class="devtools-text-input" type="text"
             @change=${queryInputChangeHandler} aria-label=${i18nString6(UIStrings7.textboxLabel)}
             placeholder=${i18nString6(UIStrings7.textboxPlaceholder)} />
      <devtools-button .variant=${"primary"} @click=${testProtocolClickHandler}>
        ${i18nString6(UIStrings7.testProtocol)}
      </devtools-button>
    </div>`;
}
var DEFAULT_VIEW5 = (input, _output, target) => {
  render6(html6`
    <style>${protocolHandlersView_css_default}</style>
    <style>${UI6.inspectorCommonStyles}</style>
    <style>${Input.textInputStyles}</style>
    ${renderStatusMessage(input.protocolHandler, input.manifestLink)}
    <div class="protocol-handlers-row">
      ${i18nTemplate(UIStrings7.needHelpReadOur, { PH1: html6`
        <x-link href=${PROTOCOL_DOCUMENT_URL} tabindex=0 class="devtools-link" autofocus jslog=${VisualLogging5.link("learn-more").track({ click: true, keydown: "Enter|Space" })}>
          ${i18nString6(UIStrings7.protocolHandlerRegistrations)}
        </x-link>` })}
    </div>
    ${renderProtocolTest(input.protocolHandler, input.queryInputState, input.protocolSelectHandler, input.queryInputChangeHandler, input.testProtocolClickHandler)}
  `, target);
};
var ProtocolHandlersView = class extends UI6.Widget.Widget {
  #protocolHandlers = [];
  #manifestLink = Platform.DevToolsPath.EmptyUrlString;
  #selectedProtocolState = "";
  #queryInputState = "";
  #view;
  constructor(element, view = DEFAULT_VIEW5) {
    super(element, { useShadowDom: false, classes: ["vbox"] });
    this.#view = view;
  }
  set protocolHandlers(protocolHandlers) {
    this.#protocolHandlers = protocolHandlers;
    this.requestUpdate();
  }
  get protocolHandlers() {
    return this.#protocolHandlers;
  }
  set manifestLink(manifestLink) {
    const isNewManifest = this.#manifestLink !== manifestLink;
    this.#manifestLink = manifestLink;
    if (isNewManifest) {
      this.#queryInputState = "";
      this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? "";
    }
    this.requestUpdate();
  }
  get manifestLink() {
    return this.#manifestLink;
  }
  #handleProtocolSelect = (evt) => {
    this.#selectedProtocolState = evt.target.value;
  };
  #handleQueryInputChange = (evt) => {
    this.#queryInputState = evt.target.value;
    this.requestUpdate();
  };
  #handleTestProtocolClick = () => {
    const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}`;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureTestProtocolClicked);
  };
  performUpdate() {
    this.#view({
      protocolHandler: this.#protocolHandlers,
      manifestLink: this.#manifestLink,
      queryInputState: this.#queryInputState,
      protocolSelectHandler: this.#handleProtocolSelect,
      queryInputChangeHandler: this.#handleQueryInputChange,
      testProtocolClickHandler: this.#handleTestProtocolClick
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ReportsGrid.js
var ReportsGrid_exports = {};
__export(ReportsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW6,
  ReportsGrid: () => ReportsGrid,
  i18nString: () => i18nString7
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as Root from "./../../../core/root/root.js";
import * as UI7 from "./../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";

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
var UIStrings8 = {
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
var str_8 = i18n15.i18n.registerUIStrings("panels/application/components/ReportsGrid.ts", UIStrings8);
var i18nString7 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var { render: render7, html: html7 } = Lit4;
var REPORTING_API_EXPLANATION_URL = "https://developer.chrome.com/docs/capabilities/web-apis/reporting-api";
var DEFAULT_VIEW6 = (input, output, target) => {
  render7(html7`
    <style>${reportsGrid_css_default}</style>
    <style>${UI7.inspectorCommonStyles}</style>
    <div class="reporting-container" jslog=${VisualLogging6.section("reports")}>
      <div class="reporting-header">${i18n15.i18n.lockedString("Reports")}</div>
      ${input.reports.length > 0 ? html7`
        <devtools-data-grid striped>
          <table>
            <tr>
              ${input.protocolMonitorExperimentEnabled ? html7`
                <th id="id" weight="30">${i18n15.i18n.lockedString("ID")}</th>
              ` : ""}
              <th id="url" weight="30">${i18n15.i18n.lockedString("URL")}</th>
              <th id="type" weight="20">${i18n15.i18n.lockedString("Type")}</th>
              <th id="status" weight="20">
                <style>${reportsGrid_css_default}</style>
                <span class="status-header">${i18nString7(UIStrings8.status)}</span>
                <x-link href="https://web.dev/reporting-api/#report-status"
                jslog=${VisualLogging6.link("report-status").track({ click: true })}>
                  <devtools-icon class="inline-icon medium" name="help" style="color: var(--icon-link);"
                  ></devtools-icon>
                </x-link>
              </th>
              <th id="destination" weight="20">${i18nString7(UIStrings8.destination)}</th>
              <th id="timestamp" weight="20">${i18nString7(UIStrings8.generatedAt)}</th>
              <th id="body" weight="20">${i18n15.i18n.lockedString("Body")}</th>
            </tr>
            ${input.reports.map((report) => html7`
              <tr @select=${() => input.onSelect(report.id)}>
                ${input.protocolMonitorExperimentEnabled ? html7`<td>${report.id}</td>` : ""}
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
      ` : html7`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString7(UIStrings8.noReportsToDisplay)}</span>
          <div class="empty-state-description">
            <span>${i18nString7(UIStrings8.reportingApiDescription)}</span>
            <x-link
              class="devtools-link"
              href=${REPORTING_API_EXPLANATION_URL}
              jslog=${VisualLogging6.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
            >${i18nString7(UIStrings8.learnMore)}</x-link>
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
  constructor(element, view = DEFAULT_VIEW6) {
    super(element);
    this.#view = view;
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled("protocol-monitor");
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
import * as UI8 from "./../../../ui/legacy/legacy.js";
import { html as html8, render as render8 } from "./../../../ui/lit/lit.js";

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
function renderRouterRule(rule) {
  return html8`
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
    </li>`;
}
var DEFAULT_VIEW7 = (input, _output, target) => {
  render8(html8`
    <style>${serviceWorkerRouterView_css_default}</style>
    <ul class="router-rules">
      ${input.rules.map(renderRouterRule)}
    </ul>`, target);
};
var ServiceWorkerRouterView = class extends UI8.Widget.Widget {
  #rules = [];
  #view;
  constructor(element, view = DEFAULT_VIEW7) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set rules(rules) {
    this.#rules = rules;
    if (this.#rules.length > 0) {
      this.requestUpdate();
    }
  }
  get rules() {
    return this.#rules;
  }
  performUpdate() {
    this.#view({ rules: this.#rules }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/SharedStorageAccessGrid.js
var SharedStorageAccessGrid_exports = {};
__export(SharedStorageAccessGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  SharedStorageAccessGrid: () => SharedStorageAccessGrid,
  i18nString: () => i18nString8
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n17 from "./../../../core/i18n/i18n.js";
import * as UI9 from "./../../../ui/legacy/legacy.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";

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
var { render: render9, html: html9 } = Lit5;
var UIStrings9 = {
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
var str_9 = i18n17.i18n.registerUIStrings("panels/application/components/SharedStorageAccessGrid.ts", UIStrings9);
var i18nString8 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var DEFAULT_VIEW8 = (input, _output, target) => {
  render9(html9`
    <style>${sharedStorageAccessGrid_css_default}</style>
    ${input.events.length === 0 ? html9`
        <div class="empty-state" jslog=${VisualLogging7.section().context("empty-view")}>
          <div class="empty-state-header">${i18nString8(UIStrings9.noEvents)}</div>
          <div class="empty-state-description">
            <span>${i18nString8(UIStrings9.sharedStorageDescription)}</span>
            <x-link
              class="x-link devtools-link"
              href=${SHARED_STORAGE_EXPLANATION_URL}
              jslog=${VisualLogging7.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
            >${i18nString8(UIStrings9.learnMore)}</x-link>
          </div>
        </div>` : html9`
        <div jslog=${VisualLogging7.section("events-table")}>
          <span class="heading">${i18nString8(UIStrings9.sharedStorage)}</span>
          <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString8(UIStrings9.allSharedStorageEvents)}>
          </devtools-icon>
          <devtools-data-grid striped inline>
            <table>
              <thead>
                <tr>
                  <th id="event-time" weight="10" sortable>
                    ${i18nString8(UIStrings9.eventTime)}
                  </th>
                  <th id="event-scope" weight="10" sortable>
                    ${i18nString8(UIStrings9.eventScope)}
                  </th>
                  <th id="event-method" weight="10" sortable>
                    ${i18nString8(UIStrings9.eventMethod)}
                  </th>
                  <th id="event-owner-origin" weight="10" sortable>
                    ${i18nString8(UIStrings9.ownerOrigin)}
                  </th>
                  <th id="event-owner-site" weight="10" sortable>
                    ${i18nString8(UIStrings9.ownerSite)}
                  </th>
                  <th id="event-params" weight="10" sortable>
                    ${i18nString8(UIStrings9.eventParams)}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${input.events.map((event) => html9`
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
var SharedStorageAccessGrid = class extends UI9.Widget.Widget {
  #view;
  #events = [];
  #onSelect = () => {
  };
  constructor(element, view = DEFAULT_VIEW8) {
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
import "./../../../ui/kit/kit.js";
import * as i18n21 from "./../../../core/i18n/i18n.js";
import * as Buttons6 from "./../../../ui/components/buttons/buttons.js";
import * as Lit6 from "./../../../ui/lit/lit.js";

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
import * as i18n19 from "./../../../core/i18n/i18n.js";
import * as SDK4 from "./../../../core/sdk/sdk.js";
import * as Buttons5 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI10 from "./../../../ui/legacy/legacy.js";
import { html as html10, nothing as nothing5, render as render10 } from "./../../../ui/lit/lit.js";

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
var UIStrings10 = {
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
var str_10 = i18n19.i18n.registerUIStrings("panels/application/components/StorageMetadataView.ts", UIStrings10);
var i18nString9 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var StorageMetadataView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #storageBucketsModel;
  #storageKey = null;
  #storageBucket = null;
  #showOnlyBucket = true;
  setStorageKey(storageKey) {
    this.#storageKey = SDK4.StorageKeyManager.parseStorageKey(storageKey);
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
    return RenderCoordinator.write("StorageMetadataView render", async () => {
      render10(html10`
        <style>${storageMetadataView_css_default}</style>
        <devtools-report .data=${{ reportTitle: this.getTitle() ?? i18nString9(UIStrings10.loading) }}>
          ${await this.renderReportContent()}
        </devtools-report>`, this.#shadow, { host: this });
    });
  }
  getTitle() {
    if (!this.#storageKey) {
      return;
    }
    const origin = this.#storageKey.origin;
    const bucketName = this.#storageBucket?.bucket.name || i18nString9(UIStrings10.defaultBucket);
    return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
  }
  key(content) {
    return html10`<devtools-report-key>${content}</devtools-report-key>`;
  }
  value(content) {
    return html10`<devtools-report-value>${content}</devtools-report-value>`;
  }
  async renderReportContent() {
    if (!this.#storageKey) {
      return nothing5;
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
    const thirdPartyReason = ancestorChainHasCrossSite ? i18nString9(UIStrings10.yesBecauseAncestorChainHasCrossSite) : hasNonce ? i18nString9(UIStrings10.yesBecauseKeyIsOpaque) : topLevelSiteIsOpaque ? i18nString9(UIStrings10.yesBecauseTopLevelIsOpaque) : topLevelSite && origin !== topLevelSite ? i18nString9(UIStrings10.yesBecauseOriginNotInTopLevelSite) : null;
    const isIframeOrEmbedded = topLevelSite && origin !== topLevelSite;
    return html10`
        ${isIframeOrEmbedded ? html10`${this.key(i18nString9(UIStrings10.origin))}
            ${this.value(html10`<div class="text-ellipsis" title=${origin}>${origin}</div>`)}` : nothing5}
        ${topLevelSite || topLevelSiteIsOpaque ? this.key(i18nString9(UIStrings10.topLevelSite)) : nothing5}
        ${topLevelSite ? this.value(topLevelSite) : nothing5}
        ${topLevelSiteIsOpaque ? this.value(i18nString9(UIStrings10.opaque)) : nothing5}
        ${thirdPartyReason ? html10`
          ${this.key(i18nString9(UIStrings10.isThirdParty))}${this.value(thirdPartyReason)}` : nothing5}
        ${hasNonce || topLevelSiteIsOpaque ? this.key(i18nString9(UIStrings10.isOpaque)) : nothing5}
        ${hasNonce ? this.value(i18nString9(UIStrings10.yes)) : nothing5}
        ${topLevelSiteIsOpaque ? this.value(i18nString9(UIStrings10.yesBecauseTopLevelIsOpaque)) : nothing5}
        ${this.#storageBucket ? this.#renderStorageBucketInfo() : nothing5}
        ${this.#storageBucketsModel ? this.#renderBucketControls() : nothing5}`;
  }
  #renderStorageBucketInfo() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #renderStorageBucketInfo if #bucket is null.");
    }
    const { bucket: { name }, persistent, durability, quota } = this.#storageBucket;
    const isDefault = !name;
    if (!this.#showOnlyBucket) {
      if (isDefault) {
        return html10`
          ${this.key(i18nString9(UIStrings10.bucketName))}
          ${this.value(html10`<span class="default-bucket">default</span>`)}`;
      }
      return html10`
        ${this.key(i18nString9(UIStrings10.bucketName))}
        ${this.value(name)}`;
    }
    return html10`
      ${this.key(i18nString9(UIStrings10.bucketName))}
      ${this.value(name || html10`<span class="default-bucket">default</span>`)}
      ${this.key(i18nString9(UIStrings10.persistent))}
      ${this.value(persistent ? i18nString9(UIStrings10.yes) : i18nString9(UIStrings10.no))}
      ${this.key(i18nString9(UIStrings10.durability))}
      ${this.value(durability)}
      ${this.key(i18nString9(UIStrings10.quota))}
      ${this.value(i18n19.ByteUtilities.bytesToString(quota))}
      ${this.key(i18nString9(UIStrings10.expiration))}
      ${this.value(this.#getExpirationString())}`;
  }
  #getExpirationString() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #getExpirationString if #bucket is null.");
    }
    const { expiration } = this.#storageBucket;
    if (expiration === 0) {
      return i18nString9(UIStrings10.none);
    }
    return new Date(expiration * 1e3).toLocaleString();
  }
  #renderBucketControls() {
    return html10`
    <devtools-report-divider></devtools-report-divider>
    <devtools-report-section>
      <devtools-button aria-label=${i18nString9(UIStrings10.deleteBucket)}
                       .variant=${"outlined"}
                       @click=${this.#deleteBucket}>
        ${i18nString9(UIStrings10.deleteBucket)}
      </devtools-button>
    </devtools-report-section>`;
  }
  async #deleteBucket() {
    if (!this.#storageBucketsModel || !this.#storageBucket) {
      throw new Error("Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.");
    }
    const ok = await UI10.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.bucketWillBeRemoved), i18nString9(UIStrings10.confirmBucketDeletion, { PH1: this.#storageBucket.bucket.name || "" }), this, { jslogContext: "delete-bucket-confirmation" });
    if (ok) {
      this.#storageBucketsModel.deleteBucket(this.#storageBucket.bucket);
    }
  }
};
customElements.define("devtools-storage-metadata-view", StorageMetadataView);

// gen/front_end/panels/application/components/SharedStorageMetadataView.js
var { html: html11 } = Lit6;
var UIStrings11 = {
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
var str_11 = i18n21.i18n.registerUIStrings("panels/application/components/SharedStorageMetadataView.ts", UIStrings11);
var i18nString10 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
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
    return i18nString10(UIStrings11.sharedStorage);
  }
  async renderReportContent() {
    const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
    this.#creationTime = metadata?.creationTime ?? null;
    this.#length = metadata?.length ?? 0;
    this.#bytesUsed = metadata?.bytesUsed ?? 0;
    this.#remainingBudget = metadata?.remainingBudget ?? 0;
    return html11`
      <style>${sharedStorageMetadataView_css_default}</style>
      ${await super.renderReportContent()}
      ${this.key(i18nString10(UIStrings11.creation))}
      ${this.value(this.#renderDateForCreationTime())}
      ${this.key(i18nString10(UIStrings11.numEntries))}
      ${this.value(String(this.#length))}
      ${this.key(i18nString10(UIStrings11.numBytesUsed))}
      ${this.value(String(this.#bytesUsed))}
      ${this.key(html11`<span class="entropy-budget">${i18nString10(UIStrings11.entropyBudget)}<devtools-icon name="info" title=${i18nString10(UIStrings11.budgetExplanation)}></devtools-icon></span>`)}
      ${this.value(html11`<span class="entropy-budget">${this.#remainingBudget}${this.#renderResetBudgetButton()}</span>`)}`;
  }
  #renderDateForCreationTime() {
    if (!this.#creationTime) {
      return html11`${i18nString10(UIStrings11.notYetCreated)}`;
    }
    const date = new Date(1e3 * this.#creationTime);
    return html11`${date.toLocaleString()}`;
  }
  #renderResetBudgetButton() {
    return html11`
      <devtools-button .iconName=${"undo"}
                       .jslogContext=${"reset-entropy-budget"}
                       .size=${"SMALL"}
                       .title=${i18nString10(UIStrings11.resetBudget)}
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
  i18nString: () => i18nString11
});
import "./../../../ui/kit/kit.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n23 from "./../../../core/i18n/i18n.js";
import * as SDK5 from "./../../../core/sdk/sdk.js";
import * as Buttons7 from "./../../../ui/components/buttons/buttons.js";
import * as UI11 from "./../../../ui/legacy/legacy.js";
import * as Lit7 from "./../../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../../ui/visual_logging/visual_logging.js";

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
var { html: html12 } = Lit7;
var UIStrings12 = {
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
var str_12 = i18n23.i18n.registerUIStrings("panels/application/components/TrustTokensView.ts", UIStrings12);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var REFRESH_INTERVAL_MS = 1e3;
function renderGridOrNoDataMessage(input) {
  if (input.tokens.length === 0) {
    return html12`
        <div jslog=${VisualLogging8.pane("trust-tokens")}>
          <div class="empty-state" jslog=${VisualLogging8.section().context("empty-view")}>
            <div class="empty-state-header">${i18nString11(UIStrings12.noTrustTokens)}</div>
            <div class="empty-state-description">
              <span>${i18nString11(UIStrings12.trustTokensDescription)}</span>
              <x-link
                class="x-link devtools-link"
                href=${PRIVATE_STATE_TOKENS_EXPLANATION_URL}
                jslog=${VisualLogging8.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
              >${i18nString11(UIStrings12.learnMore)}</x-link>
            </div>
          </div>
        </div>
      `;
  }
  return html12`
      <div jslog=${VisualLogging8.pane("trust-tokens")}>
        <span class="heading">${i18nString11(UIStrings12.trustTokens)}</span>
        <devtools-icon name="info" title=${i18nString11(UIStrings12.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${i18nString11(UIStrings12.issuer)}</th>
              <th id="count" weight="5" sortable>${i18nString11(UIStrings12.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${input.tokens.filter((token) => token.count > 0).map((token) => html12`
                <tr>
                  <td>${removeTrailingSlash(token.issuerOrigin)}</td>
                  <td>${token.count}</td>
                  <td>
                    <devtools-button .iconName=${"bin"}
                                    .jslogContext=${"delete-all"}
                                    .size=${"SMALL"}
                                    .title=${i18nString11(UIStrings12.deleteTrustTokens, { PH1: removeTrailingSlash(token.issuerOrigin) })}
                                    .variant=${"icon"}
                                    @click=${() => input.deleteClickHandler(removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
}
var DEFAULT_VIEW9 = (input, output, target) => {
  Lit7.render(html12`
    <style>${trustTokensView_css_default}</style>
    <style>${UI11.inspectorCommonStyles}</style>
    ${renderGridOrNoDataMessage(input)}
  `, target);
};
var TrustTokensView = class extends UI11.Widget.VBox {
  #updateInterval = 0;
  #tokens = [];
  #view;
  constructor(element, view = DEFAULT_VIEW9) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
    this.#updateInterval = setInterval(this.requestUpdate.bind(this), REFRESH_INTERVAL_MS);
  }
  willHide() {
    super.willHide();
    clearInterval(this.#updateInterval);
    this.#updateInterval = 0;
  }
  async performUpdate() {
    const mainTarget = SDK5.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const { tokens } = await mainTarget.storageAgent().invoke_getTrustTokens();
    tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));
    this.#tokens = tokens;
    this.#view({ tokens: this.#tokens, deleteClickHandler: this.#deleteClickHandler.bind(this) }, void 0, this.contentElement);
  }
  #deleteClickHandler(issuerOrigin) {
    const mainTarget = SDK5.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({ issuerOrigin });
  }
};
function removeTrailingSlash(s) {
  return s.replace(/\/$/, "");
}
export {
  BackForwardCacheView_exports as BackForwardCacheView,
  BounceTrackingMitigationsView_exports as BounceTrackingMitigationsView,
  EndpointsGrid_exports as EndpointsGrid,
  InterestGroupAccessGrid_exports as InterestGroupAccessGrid,
  PermissionsPolicySection_exports as PermissionsPolicySection,
  ProtocolHandlersView_exports as ProtocolHandlersView,
  ReportsGrid_exports as ReportsGrid,
  ServiceWorkerRouterView_exports as ServiceWorkerRouterView,
  SharedStorageAccessGrid_exports as SharedStorageAccessGrid,
  SharedStorageMetadataView_exports as SharedStorageMetadataView,
  StorageMetadataView_exports as StorageMetadataView,
  TrustTokensView_exports as TrustTokensView
};
//# sourceMappingURL=components.js.map
