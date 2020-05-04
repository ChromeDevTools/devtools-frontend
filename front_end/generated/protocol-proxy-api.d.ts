// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This file is auto-generated, do not edit manually. *
 * Re-generate with: npm run generate-protocol-resources.
 */


/**
 * API generated from Protocol commands and events.
 */
declare namespace ProtocolProxyApi {
  export interface ProtocolApi {
    Accessibility: AccessibilityApi;

    Animation: AnimationApi;

    ApplicationCache: ApplicationCacheApi;

    Audits: AuditsApi;

    BackgroundService: BackgroundServiceApi;

    Browser: BrowserApi;

    CSS: CSSApi;

    CacheStorage: CacheStorageApi;

    Cast: CastApi;

    DOM: DOMApi;

    DOMDebugger: DOMDebuggerApi;

    DOMSnapshot: DOMSnapshotApi;

    DOMStorage: DOMStorageApi;

    Database: DatabaseApi;

    DeviceOrientation: DeviceOrientationApi;

    Emulation: EmulationApi;

    HeadlessExperimental: HeadlessExperimentalApi;

    IO: IOApi;

    IndexedDB: IndexedDBApi;

    Input: InputApi;

    Inspector: InspectorApi;

    LayerTree: LayerTreeApi;

    Log: LogApi;

    Memory: MemoryApi;

    Network: NetworkApi;

    Overlay: OverlayApi;

    Page: PageApi;

    Performance: PerformanceApi;

    Security: SecurityApi;

    ServiceWorker: ServiceWorkerApi;

    Storage: StorageApi;

    SystemInfo: SystemInfoApi;

    Target: TargetApi;

    Tethering: TetheringApi;

    Tracing: TracingApi;

    Fetch: FetchApi;

    WebAudio: WebAudioApi;

    WebAuthn: WebAuthnApi;

    Media: MediaApi;

    Console: ConsoleApi;

    Debugger: DebuggerApi;

    HeapProfiler: HeapProfilerApi;

    Profiler: ProfilerApi;

    Runtime: RuntimeApi;

    Schema: SchemaApi;
  }


  export interface AccessibilityApi {
    /**
     * Disables the accessibility domain.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables the accessibility domain which causes `AXNodeId`s to remain consistent between method calls.
     * This turns on accessibility for the page, which can impact performance until accessibility is disabled.
     */
    invoke_enable(): Promise<void>;

    /**
     * Fetches the accessibility node and partial accessibility tree for this DOM node, if it exists.
     */
    invoke_getPartialAXTree(params: Protocol.Accessibility.GetPartialAXTreeRequest):
        Promise<Protocol.Accessibility.GetPartialAXTreeResponse>;

    /**
     * Fetches the entire accessibility tree
     */
    invoke_getFullAXTree(): Promise<Protocol.Accessibility.GetFullAXTreeResponse>;
  }

  export interface AnimationApi {
    /**
     * Disables animation domain notifications.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables animation domain notifications.
     */
    invoke_enable(): Promise<void>;

    /**
     * Returns the current time of the an animation.
     */
    invoke_getCurrentTime(params: Protocol.Animation.GetCurrentTimeRequest):
        Promise<Protocol.Animation.GetCurrentTimeResponse>;

    /**
     * Gets the playback rate of the document timeline.
     */
    invoke_getPlaybackRate(): Promise<Protocol.Animation.GetPlaybackRateResponse>;

    /**
     * Releases a set of animations to no longer be manipulated.
     */
    invoke_releaseAnimations(params: Protocol.Animation.ReleaseAnimationsRequest): Promise<void>;

    /**
     * Gets the remote object of the Animation.
     */
    invoke_resolveAnimation(params: Protocol.Animation.ResolveAnimationRequest):
        Promise<Protocol.Animation.ResolveAnimationResponse>;

    /**
     * Seek a set of animations to a particular time within each animation.
     */
    invoke_seekAnimations(params: Protocol.Animation.SeekAnimationsRequest): Promise<void>;

    /**
     * Sets the paused state of a set of animations.
     */
    invoke_setPaused(params: Protocol.Animation.SetPausedRequest): Promise<void>;

    /**
     * Sets the playback rate of the document timeline.
     */
    invoke_setPlaybackRate(params: Protocol.Animation.SetPlaybackRateRequest): Promise<void>;

    /**
     * Sets the timing of an animation node.
     */
    invoke_setTiming(params: Protocol.Animation.SetTimingRequest): Promise<void>;

    /**
     * Event for when an animation has been cancelled.
     */
    on(event: 'animationCanceled', listener: (params: Protocol.Animation.AnimationCanceledEvent) => void): void;

    /**
     * Event for each animation that has been created.
     */
    on(event: 'animationCreated', listener: (params: Protocol.Animation.AnimationCreatedEvent) => void): void;

    /**
     * Event for animation that has been started.
     */
    on(event: 'animationStarted', listener: (params: Protocol.Animation.AnimationStartedEvent) => void): void;
  }

  export interface ApplicationCacheApi {
    /**
     * Enables application cache domain notifications.
     */
    invoke_enable(): Promise<void>;

    /**
     * Returns relevant application cache data for the document in given frame.
     */
    invoke_getApplicationCacheForFrame(params: Protocol.ApplicationCache.GetApplicationCacheForFrameRequest):
        Promise<Protocol.ApplicationCache.GetApplicationCacheForFrameResponse>;

    /**
     * Returns array of frame identifiers with manifest urls for each frame containing a document
     * associated with some application cache.
     */
    invoke_getFramesWithManifests(): Promise<Protocol.ApplicationCache.GetFramesWithManifestsResponse>;

    /**
     * Returns manifest URL for document in the given frame.
     */
    invoke_getManifestForFrame(params: Protocol.ApplicationCache.GetManifestForFrameRequest):
        Promise<Protocol.ApplicationCache.GetManifestForFrameResponse>;

    on(event: 'applicationCacheStatusUpdated',
       listener: (params: Protocol.ApplicationCache.ApplicationCacheStatusUpdatedEvent) => void): void;

    on(event: 'networkStateUpdated',
       listener: (params: Protocol.ApplicationCache.NetworkStateUpdatedEvent) => void): void;
  }

  export interface AuditsApi {
    /**
     * Returns the response body and size if it were re-encoded with the specified settings. Only
     * applies to images.
     */
    invoke_getEncodedResponse(params: Protocol.Audits.GetEncodedResponseRequest):
        Promise<Protocol.Audits.GetEncodedResponseResponse>;

    /**
     * Disables issues domain, prevents further issues from being reported to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables issues domain, sends the issues collected so far to the client by means of the
     * `issueAdded` event.
     */
    invoke_enable(): Promise<void>;

    on(event: 'issueAdded', listener: (params: Protocol.Audits.IssueAddedEvent) => void): void;
  }

  export interface BackgroundServiceApi {
    /**
     * Enables event updates for the service.
     */
    invoke_startObserving(params: Protocol.BackgroundService.StartObservingRequest): Promise<void>;

    /**
     * Disables event updates for the service.
     */
    invoke_stopObserving(params: Protocol.BackgroundService.StopObservingRequest): Promise<void>;

    /**
     * Set the recording state for the service.
     */
    invoke_setRecording(params: Protocol.BackgroundService.SetRecordingRequest): Promise<void>;

    /**
     * Clears all stored data for the service.
     */
    invoke_clearEvents(params: Protocol.BackgroundService.ClearEventsRequest): Promise<void>;

    /**
     * Called when the recording state for the service has been updated.
     */
    on(event: 'recordingStateChanged',
       listener: (params: Protocol.BackgroundService.RecordingStateChangedEvent) => void): void;

    /**
     * Called with all existing backgroundServiceEvents when enabled, and all new
     * events afterwards if enabled and recording.
     */
    on(event: 'backgroundServiceEventReceived',
       listener: (params: Protocol.BackgroundService.BackgroundServiceEventReceivedEvent) => void): void;
  }

  export interface BrowserApi {
    /**
     * Set permission settings for given origin.
     */
    invoke_setPermission(params: Protocol.Browser.SetPermissionRequest): Promise<void>;

    /**
     * Grant specific permissions to the given origin and reject all others.
     */
    invoke_grantPermissions(params: Protocol.Browser.GrantPermissionsRequest): Promise<void>;

    /**
     * Reset all permission management for all origins.
     */
    invoke_resetPermissions(params: Protocol.Browser.ResetPermissionsRequest): Promise<void>;

    /**
     * Set the behavior when downloading a file.
     */
    invoke_setDownloadBehavior(params: Protocol.Browser.SetDownloadBehaviorRequest): Promise<void>;

    /**
     * Close browser gracefully.
     */
    invoke_close(): Promise<void>;

    /**
     * Crashes browser on the main thread.
     */
    invoke_crash(): Promise<void>;

    /**
     * Crashes GPU process.
     */
    invoke_crashGpuProcess(): Promise<void>;

    /**
     * Returns version information.
     */
    invoke_getVersion(): Promise<Protocol.Browser.GetVersionResponse>;

    /**
     * Returns the command line switches for the browser process if, and only if
     * --enable-automation is on the commandline.
     */
    invoke_getBrowserCommandLine(): Promise<Protocol.Browser.GetBrowserCommandLineResponse>;

    /**
     * Get Chrome histograms.
     */
    invoke_getHistograms(params: Protocol.Browser.GetHistogramsRequest):
        Promise<Protocol.Browser.GetHistogramsResponse>;

    /**
     * Get a Chrome histogram by name.
     */
    invoke_getHistogram(params: Protocol.Browser.GetHistogramRequest): Promise<Protocol.Browser.GetHistogramResponse>;

    /**
     * Get position and size of the browser window.
     */
    invoke_getWindowBounds(params: Protocol.Browser.GetWindowBoundsRequest):
        Promise<Protocol.Browser.GetWindowBoundsResponse>;

    /**
     * Get the browser window that contains the devtools target.
     */
    invoke_getWindowForTarget(params: Protocol.Browser.GetWindowForTargetRequest):
        Promise<Protocol.Browser.GetWindowForTargetResponse>;

    /**
     * Set position and/or size of the browser window.
     */
    invoke_setWindowBounds(params: Protocol.Browser.SetWindowBoundsRequest): Promise<void>;

    /**
     * Set dock tile details, platform-specific.
     */
    invoke_setDockTile(params: Protocol.Browser.SetDockTileRequest): Promise<void>;
  }

  export interface CSSApi {
    /**
     * Inserts a new rule with the given `ruleText` in a stylesheet with given `styleSheetId`, at the
     * position specified by `location`.
     */
    invoke_addRule(params: Protocol.CSS.AddRuleRequest): Promise<Protocol.CSS.AddRuleResponse>;

    /**
     * Returns all class names from specified stylesheet.
     */
    invoke_collectClassNames(params: Protocol.CSS.CollectClassNamesRequest):
        Promise<Protocol.CSS.CollectClassNamesResponse>;

    /**
     * Creates a new special "via-inspector" stylesheet in the frame with given `frameId`.
     */
    invoke_createStyleSheet(params: Protocol.CSS.CreateStyleSheetRequest):
        Promise<Protocol.CSS.CreateStyleSheetResponse>;

    /**
     * Disables the CSS agent for the given page.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables the CSS agent for the given page. Clients should not assume that the CSS agent has been
     * enabled until the result of this command is received.
     */
    invoke_enable(): Promise<void>;

    /**
     * Ensures that the given node will have specified pseudo-classes whenever its style is computed by
     * the browser.
     */
    invoke_forcePseudoState(params: Protocol.CSS.ForcePseudoStateRequest): Promise<void>;

    invoke_getBackgroundColors(params: Protocol.CSS.GetBackgroundColorsRequest):
        Promise<Protocol.CSS.GetBackgroundColorsResponse>;

    /**
     * Returns the computed style for a DOM node identified by `nodeId`.
     */
    invoke_getComputedStyleForNode(params: Protocol.CSS.GetComputedStyleForNodeRequest):
        Promise<Protocol.CSS.GetComputedStyleForNodeResponse>;

    /**
     * Returns the styles defined inline (explicitly in the "style" attribute and implicitly, using DOM
     * attributes) for a DOM node identified by `nodeId`.
     */
    invoke_getInlineStylesForNode(params: Protocol.CSS.GetInlineStylesForNodeRequest):
        Promise<Protocol.CSS.GetInlineStylesForNodeResponse>;

    /**
     * Returns requested styles for a DOM node identified by `nodeId`.
     */
    invoke_getMatchedStylesForNode(params: Protocol.CSS.GetMatchedStylesForNodeRequest):
        Promise<Protocol.CSS.GetMatchedStylesForNodeResponse>;

    /**
     * Returns all media queries parsed by the rendering engine.
     */
    invoke_getMediaQueries(): Promise<Protocol.CSS.GetMediaQueriesResponse>;

    /**
     * Requests information about platform fonts which we used to render child TextNodes in the given
     * node.
     */
    invoke_getPlatformFontsForNode(params: Protocol.CSS.GetPlatformFontsForNodeRequest):
        Promise<Protocol.CSS.GetPlatformFontsForNodeResponse>;

    /**
     * Returns the current textual content for a stylesheet.
     */
    invoke_getStyleSheetText(params: Protocol.CSS.GetStyleSheetTextRequest):
        Promise<Protocol.CSS.GetStyleSheetTextResponse>;

    /**
     * Find a rule with the given active property for the given node and set the new value for this
     * property
     */
    invoke_setEffectivePropertyValueForNode(params: Protocol.CSS.SetEffectivePropertyValueForNodeRequest):
        Promise<void>;

    /**
     * Modifies the keyframe rule key text.
     */
    invoke_setKeyframeKey(params: Protocol.CSS.SetKeyframeKeyRequest): Promise<Protocol.CSS.SetKeyframeKeyResponse>;

    /**
     * Modifies the rule selector.
     */
    invoke_setMediaText(params: Protocol.CSS.SetMediaTextRequest): Promise<Protocol.CSS.SetMediaTextResponse>;

    /**
     * Modifies the rule selector.
     */
    invoke_setRuleSelector(params: Protocol.CSS.SetRuleSelectorRequest): Promise<Protocol.CSS.SetRuleSelectorResponse>;

    /**
     * Sets the new stylesheet text.
     */
    invoke_setStyleSheetText(params: Protocol.CSS.SetStyleSheetTextRequest):
        Promise<Protocol.CSS.SetStyleSheetTextResponse>;

    /**
     * Applies specified style edits one after another in the given order.
     */
    invoke_setStyleTexts(params: Protocol.CSS.SetStyleTextsRequest): Promise<Protocol.CSS.SetStyleTextsResponse>;

    /**
     * Enables the selector recording.
     */
    invoke_startRuleUsageTracking(): Promise<void>;

    /**
     * Stop tracking rule usage and return the list of rules that were used since last call to
     * `takeCoverageDelta` (or since start of coverage instrumentation)
     */
    invoke_stopRuleUsageTracking(): Promise<Protocol.CSS.StopRuleUsageTrackingResponse>;

    /**
     * Obtain list of rules that became used since last call to this method (or since start of coverage
     * instrumentation)
     */
    invoke_takeCoverageDelta(): Promise<Protocol.CSS.TakeCoverageDeltaResponse>;

    /**
     * Fires whenever a web font is updated.  A non-empty font parameter indicates a successfully loaded
     * web font
     */
    on(event: 'fontsUpdated', listener: (params: Protocol.CSS.FontsUpdatedEvent) => void): void;

    /**
     * Fires whenever a MediaQuery result changes (for example, after a browser window has been
     * resized.) The current implementation considers only viewport-dependent media features.
     */
    on(event: 'mediaQueryResultChanged', listener: () => void): void;

    /**
     * Fired whenever an active document stylesheet is added.
     */
    on(event: 'styleSheetAdded', listener: (params: Protocol.CSS.StyleSheetAddedEvent) => void): void;

    /**
     * Fired whenever a stylesheet is changed as a result of the client operation.
     */
    on(event: 'styleSheetChanged', listener: (params: Protocol.CSS.StyleSheetChangedEvent) => void): void;

    /**
     * Fired whenever an active document stylesheet is removed.
     */
    on(event: 'styleSheetRemoved', listener: (params: Protocol.CSS.StyleSheetRemovedEvent) => void): void;
  }

  export interface CacheStorageApi {
    /**
     * Deletes a cache.
     */
    invoke_deleteCache(params: Protocol.CacheStorage.DeleteCacheRequest): Promise<void>;

    /**
     * Deletes a cache entry.
     */
    invoke_deleteEntry(params: Protocol.CacheStorage.DeleteEntryRequest): Promise<void>;

    /**
     * Requests cache names.
     */
    invoke_requestCacheNames(params: Protocol.CacheStorage.RequestCacheNamesRequest):
        Promise<Protocol.CacheStorage.RequestCacheNamesResponse>;

    /**
     * Fetches cache entry.
     */
    invoke_requestCachedResponse(params: Protocol.CacheStorage.RequestCachedResponseRequest):
        Promise<Protocol.CacheStorage.RequestCachedResponseResponse>;

    /**
     * Requests data from cache.
     */
    invoke_requestEntries(params: Protocol.CacheStorage.RequestEntriesRequest):
        Promise<Protocol.CacheStorage.RequestEntriesResponse>;
  }

  export interface CastApi {
    /**
     * Starts observing for sinks that can be used for tab mirroring, and if set,
     * sinks compatible with |presentationUrl| as well. When sinks are found, a
     * |sinksUpdated| event is fired.
     * Also starts observing for issue messages. When an issue is added or removed,
     * an |issueUpdated| event is fired.
     */
    invoke_enable(params: Protocol.Cast.EnableRequest): Promise<void>;

    /**
     * Stops observing for sinks and issues.
     */
    invoke_disable(): Promise<void>;

    /**
     * Sets a sink to be used when the web page requests the browser to choose a
     * sink via Presentation API, Remote Playback API, or Cast SDK.
     */
    invoke_setSinkToUse(params: Protocol.Cast.SetSinkToUseRequest): Promise<void>;

    /**
     * Starts mirroring the tab to the sink.
     */
    invoke_startTabMirroring(params: Protocol.Cast.StartTabMirroringRequest): Promise<void>;

    /**
     * Stops the active Cast session on the sink.
     */
    invoke_stopCasting(params: Protocol.Cast.StopCastingRequest): Promise<void>;

    /**
     * This is fired whenever the list of available sinks changes. A sink is a
     * device or a software surface that you can cast to.
     */
    on(event: 'sinksUpdated', listener: (params: Protocol.Cast.SinksUpdatedEvent) => void): void;

    /**
     * This is fired whenever the outstanding issue/error message changes.
     * |issueMessage| is empty if there is no issue.
     */
    on(event: 'issueUpdated', listener: (params: Protocol.Cast.IssueUpdatedEvent) => void): void;
  }

  export interface DOMApi {
    /**
     * Collects class names for the node with given id and all of it's child nodes.
     */
    invoke_collectClassNamesFromSubtree(params: Protocol.DOM.CollectClassNamesFromSubtreeRequest):
        Promise<Protocol.DOM.CollectClassNamesFromSubtreeResponse>;

    /**
     * Creates a deep copy of the specified node and places it into the target container before the
     * given anchor.
     */
    invoke_copyTo(params: Protocol.DOM.CopyToRequest): Promise<Protocol.DOM.CopyToResponse>;

    /**
     * Describes node given its id, does not require domain to be enabled. Does not start tracking any
     * objects, can be used for automation.
     */
    invoke_describeNode(params: Protocol.DOM.DescribeNodeRequest): Promise<Protocol.DOM.DescribeNodeResponse>;

    /**
     * Scrolls the specified rect of the given node into view if not already visible.
     * Note: exactly one between nodeId, backendNodeId and objectId should be passed
     * to identify the node.
     */
    invoke_scrollIntoViewIfNeeded(params: Protocol.DOM.ScrollIntoViewIfNeededRequest): Promise<void>;

    /**
     * Disables DOM agent for the given page.
     */
    invoke_disable(): Promise<void>;

    /**
     * Discards search results from the session with the given id. `getSearchResults` should no longer
     * be called for that search.
     */
    invoke_discardSearchResults(params: Protocol.DOM.DiscardSearchResultsRequest): Promise<void>;

    /**
     * Enables DOM agent for the given page.
     */
    invoke_enable(): Promise<void>;

    /**
     * Focuses the given element.
     */
    invoke_focus(params: Protocol.DOM.FocusRequest): Promise<void>;

    /**
     * Returns attributes for the specified node.
     */
    invoke_getAttributes(params: Protocol.DOM.GetAttributesRequest): Promise<Protocol.DOM.GetAttributesResponse>;

    /**
     * Returns boxes for the given node.
     */
    invoke_getBoxModel(params: Protocol.DOM.GetBoxModelRequest): Promise<Protocol.DOM.GetBoxModelResponse>;

    /**
     * Returns quads that describe node position on the page. This method
     * might return multiple quads for inline nodes.
     */
    invoke_getContentQuads(params: Protocol.DOM.GetContentQuadsRequest): Promise<Protocol.DOM.GetContentQuadsResponse>;

    /**
     * Returns the root DOM node (and optionally the subtree) to the caller.
     */
    invoke_getDocument(params: Protocol.DOM.GetDocumentRequest): Promise<Protocol.DOM.GetDocumentResponse>;

    /**
     * Returns the root DOM node (and optionally the subtree) to the caller.
     */
    invoke_getFlattenedDocument(params: Protocol.DOM.GetFlattenedDocumentRequest):
        Promise<Protocol.DOM.GetFlattenedDocumentResponse>;

    /**
     * Returns node id at given location. Depending on whether DOM domain is enabled, nodeId is
     * either returned or not.
     */
    invoke_getNodeForLocation(params: Protocol.DOM.GetNodeForLocationRequest):
        Promise<Protocol.DOM.GetNodeForLocationResponse>;

    /**
     * Returns node's HTML markup.
     */
    invoke_getOuterHTML(params: Protocol.DOM.GetOuterHTMLRequest): Promise<Protocol.DOM.GetOuterHTMLResponse>;

    /**
     * Returns the id of the nearest ancestor that is a relayout boundary.
     */
    invoke_getRelayoutBoundary(params: Protocol.DOM.GetRelayoutBoundaryRequest):
        Promise<Protocol.DOM.GetRelayoutBoundaryResponse>;

    /**
     * Returns search results from given `fromIndex` to given `toIndex` from the search with the given
     * identifier.
     */
    invoke_getSearchResults(params: Protocol.DOM.GetSearchResultsRequest):
        Promise<Protocol.DOM.GetSearchResultsResponse>;

    /**
     * Hides any highlight.
     */
    invoke_hideHighlight(): Promise<void>;

    /**
     * Highlights DOM node.
     */
    invoke_highlightNode(): Promise<void>;

    /**
     * Highlights given rectangle.
     */
    invoke_highlightRect(): Promise<void>;

    /**
     * Marks last undoable state.
     */
    invoke_markUndoableState(): Promise<void>;

    /**
     * Moves node into the new container, places it before the given anchor.
     */
    invoke_moveTo(params: Protocol.DOM.MoveToRequest): Promise<Protocol.DOM.MoveToResponse>;

    /**
     * Searches for a given string in the DOM tree. Use `getSearchResults` to access search results or
     * `cancelSearch` to end this search session.
     */
    invoke_performSearch(params: Protocol.DOM.PerformSearchRequest): Promise<Protocol.DOM.PerformSearchResponse>;

    /**
     * Requests that the node is sent to the caller given its path. // FIXME, use XPath
     */
    invoke_pushNodeByPathToFrontend(params: Protocol.DOM.PushNodeByPathToFrontendRequest):
        Promise<Protocol.DOM.PushNodeByPathToFrontendResponse>;

    /**
     * Requests that a batch of nodes is sent to the caller given their backend node ids.
     */
    invoke_pushNodesByBackendIdsToFrontend(params: Protocol.DOM.PushNodesByBackendIdsToFrontendRequest):
        Promise<Protocol.DOM.PushNodesByBackendIdsToFrontendResponse>;

    /**
     * Executes `querySelector` on a given node.
     */
    invoke_querySelector(params: Protocol.DOM.QuerySelectorRequest): Promise<Protocol.DOM.QuerySelectorResponse>;

    /**
     * Executes `querySelectorAll` on a given node.
     */
    invoke_querySelectorAll(params: Protocol.DOM.QuerySelectorAllRequest):
        Promise<Protocol.DOM.QuerySelectorAllResponse>;

    /**
     * Re-does the last undone action.
     */
    invoke_redo(): Promise<void>;

    /**
     * Removes attribute with given name from an element with given id.
     */
    invoke_removeAttribute(params: Protocol.DOM.RemoveAttributeRequest): Promise<void>;

    /**
     * Removes node with given id.
     */
    invoke_removeNode(params: Protocol.DOM.RemoveNodeRequest): Promise<void>;

    /**
     * Requests that children of the node with given id are returned to the caller in form of
     * `setChildNodes` events where not only immediate children are retrieved, but all children down to
     * the specified depth.
     */
    invoke_requestChildNodes(params: Protocol.DOM.RequestChildNodesRequest): Promise<void>;

    /**
     * Requests that the node is sent to the caller given the JavaScript node object reference. All
     * nodes that form the path from the node to the root are also sent to the client as a series of
     * `setChildNodes` notifications.
     */
    invoke_requestNode(params: Protocol.DOM.RequestNodeRequest): Promise<Protocol.DOM.RequestNodeResponse>;

    /**
     * Resolves the JavaScript node object for a given NodeId or BackendNodeId.
     */
    invoke_resolveNode(params: Protocol.DOM.ResolveNodeRequest): Promise<Protocol.DOM.ResolveNodeResponse>;

    /**
     * Sets attribute for an element with given id.
     */
    invoke_setAttributeValue(params: Protocol.DOM.SetAttributeValueRequest): Promise<void>;

    /**
     * Sets attributes on element with given id. This method is useful when user edits some existing
     * attribute value and types in several attribute name/value pairs.
     */
    invoke_setAttributesAsText(params: Protocol.DOM.SetAttributesAsTextRequest): Promise<void>;

    /**
     * Sets files for the given file input element.
     */
    invoke_setFileInputFiles(params: Protocol.DOM.SetFileInputFilesRequest): Promise<void>;

    /**
     * Sets if stack traces should be captured for Nodes. See `Node.getNodeStackTraces`. Default is disabled.
     */
    invoke_setNodeStackTracesEnabled(params: Protocol.DOM.SetNodeStackTracesEnabledRequest): Promise<void>;

    /**
     * Gets stack traces associated with a Node. As of now, only provides stack trace for Node creation.
     */
    invoke_getNodeStackTraces(params: Protocol.DOM.GetNodeStackTracesRequest):
        Promise<Protocol.DOM.GetNodeStackTracesResponse>;

    /**
     * Returns file information for the given
     * File wrapper.
     */
    invoke_getFileInfo(params: Protocol.DOM.GetFileInfoRequest): Promise<Protocol.DOM.GetFileInfoResponse>;

    /**
     * Enables console to refer to the node with given id via $x (see Command Line API for more details
     * $x functions).
     */
    invoke_setInspectedNode(params: Protocol.DOM.SetInspectedNodeRequest): Promise<void>;

    /**
     * Sets node name for a node with given id.
     */
    invoke_setNodeName(params: Protocol.DOM.SetNodeNameRequest): Promise<Protocol.DOM.SetNodeNameResponse>;

    /**
     * Sets node value for a node with given id.
     */
    invoke_setNodeValue(params: Protocol.DOM.SetNodeValueRequest): Promise<void>;

    /**
     * Sets node HTML markup, returns new node id.
     */
    invoke_setOuterHTML(params: Protocol.DOM.SetOuterHTMLRequest): Promise<void>;

    /**
     * Undoes the last performed action.
     */
    invoke_undo(): Promise<void>;

    /**
     * Returns iframe node that owns iframe with the given domain.
     */
    invoke_getFrameOwner(params: Protocol.DOM.GetFrameOwnerRequest): Promise<Protocol.DOM.GetFrameOwnerResponse>;

    /**
     * Fired when `Element`'s attribute is modified.
     */
    on(event: 'attributeModified', listener: (params: Protocol.DOM.AttributeModifiedEvent) => void): void;

    /**
     * Fired when `Element`'s attribute is removed.
     */
    on(event: 'attributeRemoved', listener: (params: Protocol.DOM.AttributeRemovedEvent) => void): void;

    /**
     * Mirrors `DOMCharacterDataModified` event.
     */
    on(event: 'characterDataModified', listener: (params: Protocol.DOM.CharacterDataModifiedEvent) => void): void;

    /**
     * Fired when `Container`'s child node count has changed.
     */
    on(event: 'childNodeCountUpdated', listener: (params: Protocol.DOM.ChildNodeCountUpdatedEvent) => void): void;

    /**
     * Mirrors `DOMNodeInserted` event.
     */
    on(event: 'childNodeInserted', listener: (params: Protocol.DOM.ChildNodeInsertedEvent) => void): void;

    /**
     * Mirrors `DOMNodeRemoved` event.
     */
    on(event: 'childNodeRemoved', listener: (params: Protocol.DOM.ChildNodeRemovedEvent) => void): void;

    /**
     * Called when distrubution is changed.
     */
    on(event: 'distributedNodesUpdated', listener: (params: Protocol.DOM.DistributedNodesUpdatedEvent) => void): void;

    /**
     * Fired when `Document` has been totally updated. Node ids are no longer valid.
     */
    on(event: 'documentUpdated', listener: () => void): void;

    /**
     * Fired when `Element`'s inline style is modified via a CSS property modification.
     */
    on(event: 'inlineStyleInvalidated', listener: (params: Protocol.DOM.InlineStyleInvalidatedEvent) => void): void;

    /**
     * Called when a pseudo element is added to an element.
     */
    on(event: 'pseudoElementAdded', listener: (params: Protocol.DOM.PseudoElementAddedEvent) => void): void;

    /**
     * Called when a pseudo element is removed from an element.
     */
    on(event: 'pseudoElementRemoved', listener: (params: Protocol.DOM.PseudoElementRemovedEvent) => void): void;

    /**
     * Fired when backend wants to provide client with the missing DOM structure. This happens upon
     * most of the calls requesting node ids.
     */
    on(event: 'setChildNodes', listener: (params: Protocol.DOM.SetChildNodesEvent) => void): void;

    /**
     * Called when shadow root is popped from the element.
     */
    on(event: 'shadowRootPopped', listener: (params: Protocol.DOM.ShadowRootPoppedEvent) => void): void;

    /**
     * Called when shadow root is pushed into the element.
     */
    on(event: 'shadowRootPushed', listener: (params: Protocol.DOM.ShadowRootPushedEvent) => void): void;
  }

  export interface DOMDebuggerApi {
    /**
     * Returns event listeners of the given object.
     */
    invoke_getEventListeners(params: Protocol.DOMDebugger.GetEventListenersRequest):
        Promise<Protocol.DOMDebugger.GetEventListenersResponse>;

    /**
     * Removes DOM breakpoint that was set using `setDOMBreakpoint`.
     */
    invoke_removeDOMBreakpoint(params: Protocol.DOMDebugger.RemoveDOMBreakpointRequest): Promise<void>;

    /**
     * Removes breakpoint on particular DOM event.
     */
    invoke_removeEventListenerBreakpoint(params: Protocol.DOMDebugger.RemoveEventListenerBreakpointRequest):
        Promise<void>;

    /**
     * Removes breakpoint on particular native event.
     */
    invoke_removeInstrumentationBreakpoint(params: Protocol.DOMDebugger.RemoveInstrumentationBreakpointRequest):
        Promise<void>;

    /**
     * Removes breakpoint from XMLHttpRequest.
     */
    invoke_removeXHRBreakpoint(params: Protocol.DOMDebugger.RemoveXHRBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular operation with DOM.
     */
    invoke_setDOMBreakpoint(params: Protocol.DOMDebugger.SetDOMBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular DOM event.
     */
    invoke_setEventListenerBreakpoint(params: Protocol.DOMDebugger.SetEventListenerBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular native event.
     */
    invoke_setInstrumentationBreakpoint(params: Protocol.DOMDebugger.SetInstrumentationBreakpointRequest):
        Promise<void>;

    /**
     * Sets breakpoint on XMLHttpRequest.
     */
    invoke_setXHRBreakpoint(params: Protocol.DOMDebugger.SetXHRBreakpointRequest): Promise<void>;
  }

  export interface DOMSnapshotApi {
    /**
     * Disables DOM snapshot agent for the given page.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables DOM snapshot agent for the given page.
     */
    invoke_enable(): Promise<void>;

    /**
     * Returns a document snapshot, including the full DOM tree of the root node (including iframes,
     * template contents, and imported documents) in a flattened array, as well as layout and
     * white-listed computed style information for the nodes. Shadow DOM in the returned DOM tree is
     * flattened.
     */
    invoke_getSnapshot(params: Protocol.DOMSnapshot.GetSnapshotRequest):
        Promise<Protocol.DOMSnapshot.GetSnapshotResponse>;

    /**
     * Returns a document snapshot, including the full DOM tree of the root node (including iframes,
     * template contents, and imported documents) in a flattened array, as well as layout and
     * white-listed computed style information for the nodes. Shadow DOM in the returned DOM tree is
     * flattened.
     */
    invoke_captureSnapshot(params: Protocol.DOMSnapshot.CaptureSnapshotRequest):
        Promise<Protocol.DOMSnapshot.CaptureSnapshotResponse>;
  }

  export interface DOMStorageApi {
    invoke_clear(params: Protocol.DOMStorage.ClearRequest): Promise<void>;

    /**
     * Disables storage tracking, prevents storage events from being sent to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables storage tracking, storage events will now be delivered to the client.
     */
    invoke_enable(): Promise<void>;

    invoke_getDOMStorageItems(params: Protocol.DOMStorage.GetDOMStorageItemsRequest):
        Promise<Protocol.DOMStorage.GetDOMStorageItemsResponse>;

    invoke_removeDOMStorageItem(params: Protocol.DOMStorage.RemoveDOMStorageItemRequest): Promise<void>;

    invoke_setDOMStorageItem(params: Protocol.DOMStorage.SetDOMStorageItemRequest): Promise<void>;

    on(event: 'domStorageItemAdded', listener: (params: Protocol.DOMStorage.DomStorageItemAddedEvent) => void): void;

    on(event: 'domStorageItemRemoved',
       listener: (params: Protocol.DOMStorage.DomStorageItemRemovedEvent) => void): void;

    on(event: 'domStorageItemUpdated',
       listener: (params: Protocol.DOMStorage.DomStorageItemUpdatedEvent) => void): void;

    on(event: 'domStorageItemsCleared',
       listener: (params: Protocol.DOMStorage.DomStorageItemsClearedEvent) => void): void;
  }

  export interface DatabaseApi {
    /**
     * Disables database tracking, prevents database events from being sent to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables database tracking, database events will now be delivered to the client.
     */
    invoke_enable(): Promise<void>;

    invoke_executeSQL(params: Protocol.Database.ExecuteSQLRequest): Promise<Protocol.Database.ExecuteSQLResponse>;

    invoke_getDatabaseTableNames(params: Protocol.Database.GetDatabaseTableNamesRequest):
        Promise<Protocol.Database.GetDatabaseTableNamesResponse>;

    on(event: 'addDatabase', listener: (params: Protocol.Database.AddDatabaseEvent) => void): void;
  }

  export interface DeviceOrientationApi {
    /**
     * Clears the overridden Device Orientation.
     */
    invoke_clearDeviceOrientationOverride(): Promise<void>;

    /**
     * Overrides the Device Orientation.
     */
    invoke_setDeviceOrientationOverride(params: Protocol.DeviceOrientation.SetDeviceOrientationOverrideRequest):
        Promise<void>;
  }

  export interface EmulationApi {
    /**
     * Tells whether emulation is supported.
     */
    invoke_canEmulate(): Promise<Protocol.Emulation.CanEmulateResponse>;

    /**
     * Clears the overriden device metrics.
     */
    invoke_clearDeviceMetricsOverride(): Promise<void>;

    /**
     * Clears the overriden Geolocation Position and Error.
     */
    invoke_clearGeolocationOverride(): Promise<void>;

    /**
     * Requests that page scale factor is reset to initial values.
     */
    invoke_resetPageScaleFactor(): Promise<void>;

    /**
     * Enables or disables simulating a focused and active page.
     */
    invoke_setFocusEmulationEnabled(params: Protocol.Emulation.SetFocusEmulationEnabledRequest): Promise<void>;

    /**
     * Enables CPU throttling to emulate slow CPUs.
     */
    invoke_setCPUThrottlingRate(params: Protocol.Emulation.SetCPUThrottlingRateRequest): Promise<void>;

    /**
     * Sets or clears an override of the default background color of the frame. This override is used
     * if the content does not specify one.
     */
    invoke_setDefaultBackgroundColorOverride(params: Protocol.Emulation.SetDefaultBackgroundColorOverrideRequest):
        Promise<void>;

    /**
     * Overrides the values of device screen dimensions (window.screen.width, window.screen.height,
     * window.innerWidth, window.innerHeight, and "device-width"/"device-height"-related CSS media
     * query results).
     */
    invoke_setDeviceMetricsOverride(params: Protocol.Emulation.SetDeviceMetricsOverrideRequest): Promise<void>;

    invoke_setScrollbarsHidden(params: Protocol.Emulation.SetScrollbarsHiddenRequest): Promise<void>;

    invoke_setDocumentCookieDisabled(params: Protocol.Emulation.SetDocumentCookieDisabledRequest): Promise<void>;

    invoke_setEmitTouchEventsForMouse(params: Protocol.Emulation.SetEmitTouchEventsForMouseRequest): Promise<void>;

    /**
     * Emulates the given media type or media feature for CSS media queries.
     */
    invoke_setEmulatedMedia(params: Protocol.Emulation.SetEmulatedMediaRequest): Promise<void>;

    /**
     * Emulates the given vision deficiency.
     */
    invoke_setEmulatedVisionDeficiency(params: Protocol.Emulation.SetEmulatedVisionDeficiencyRequest): Promise<void>;

    /**
     * Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position
     * unavailable.
     */
    invoke_setGeolocationOverride(params: Protocol.Emulation.SetGeolocationOverrideRequest): Promise<void>;

    /**
     * Overrides value returned by the javascript navigator object.
     */
    invoke_setNavigatorOverrides(params: Protocol.Emulation.SetNavigatorOverridesRequest): Promise<void>;

    /**
     * Sets a specified page scale factor.
     */
    invoke_setPageScaleFactor(params: Protocol.Emulation.SetPageScaleFactorRequest): Promise<void>;

    /**
     * Switches script execution in the page.
     */
    invoke_setScriptExecutionDisabled(params: Protocol.Emulation.SetScriptExecutionDisabledRequest): Promise<void>;

    /**
     * Enables touch on platforms which do not support them.
     */
    invoke_setTouchEmulationEnabled(params: Protocol.Emulation.SetTouchEmulationEnabledRequest): Promise<void>;

    /**
     * Turns on virtual time for all frames (replacing real-time with a synthetic time source) and sets
     * the current virtual time policy.  Note this supersedes any previous time budget.
     */
    invoke_setVirtualTimePolicy(params: Protocol.Emulation.SetVirtualTimePolicyRequest):
        Promise<Protocol.Emulation.SetVirtualTimePolicyResponse>;

    /**
     * Overrides default host system locale with the specified one.
     */
    invoke_setLocaleOverride(params: Protocol.Emulation.SetLocaleOverrideRequest): Promise<void>;

    /**
     * Overrides default host system timezone with the specified one.
     */
    invoke_setTimezoneOverride(params: Protocol.Emulation.SetTimezoneOverrideRequest): Promise<void>;

    /**
     * Resizes the frame/viewport of the page. Note that this does not affect the frame's container
     * (e.g. browser window). Can be used to produce screenshots of the specified size. Not supported
     * on Android.
     */
    invoke_setVisibleSize(params: Protocol.Emulation.SetVisibleSizeRequest): Promise<void>;

    /**
     * Allows overriding user agent with the given string.
     */
    invoke_setUserAgentOverride(params: Protocol.Emulation.SetUserAgentOverrideRequest): Promise<void>;

    /**
     * Notification sent after the virtual time budget for the current VirtualTimePolicy has run out.
     */
    on(event: 'virtualTimeBudgetExpired', listener: () => void): void;
  }

  export interface HeadlessExperimentalApi {
    /**
     * Sends a BeginFrame to the target and returns when the frame was completed. Optionally captures a
     * screenshot from the resulting frame. Requires that the target was created with enabled
     * BeginFrameControl. Designed for use with --run-all-compositor-stages-before-draw, see also
     * https://goo.gl/3zHXhB for more background.
     */
    invoke_beginFrame(params: Protocol.HeadlessExperimental.BeginFrameRequest):
        Promise<Protocol.HeadlessExperimental.BeginFrameResponse>;

    /**
     * Disables headless events for the target.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables headless events for the target.
     */
    invoke_enable(): Promise<void>;

    /**
     * Issued when the target starts or stops needing BeginFrames.
     * Deprecated. Issue beginFrame unconditionally instead and use result from
     * beginFrame to detect whether the frames were suppressed.
     */
    on(event: 'needsBeginFramesChanged',
       listener: (params: Protocol.HeadlessExperimental.NeedsBeginFramesChangedEvent) => void): void;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface IOApi {
    /**
     * Close the stream, discard any temporary backing storage.
     */
    invoke_close(params: Protocol.IO.CloseRequest): Promise<void>;

    /**
     * Read a chunk of the stream
     */
    invoke_read(params: Protocol.IO.ReadRequest): Promise<Protocol.IO.ReadResponse>;

    /**
     * Return UUID of Blob object specified by a remote object id.
     */
    invoke_resolveBlob(params: Protocol.IO.ResolveBlobRequest): Promise<Protocol.IO.ResolveBlobResponse>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface IndexedDBApi {
    /**
     * Clears all entries from an object store.
     */
    invoke_clearObjectStore(params: Protocol.IndexedDB.ClearObjectStoreRequest): Promise<void>;

    /**
     * Deletes a database.
     */
    invoke_deleteDatabase(params: Protocol.IndexedDB.DeleteDatabaseRequest): Promise<void>;

    /**
     * Delete a range of entries from an object store
     */
    invoke_deleteObjectStoreEntries(params: Protocol.IndexedDB.DeleteObjectStoreEntriesRequest): Promise<void>;

    /**
     * Disables events from backend.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables events from backend.
     */
    invoke_enable(): Promise<void>;

    /**
     * Requests data from object store or index.
     */
    invoke_requestData(params: Protocol.IndexedDB.RequestDataRequest): Promise<Protocol.IndexedDB.RequestDataResponse>;

    /**
     * Gets metadata of an object store
     */
    invoke_getMetadata(params: Protocol.IndexedDB.GetMetadataRequest): Promise<Protocol.IndexedDB.GetMetadataResponse>;

    /**
     * Requests database with given name in given frame.
     */
    invoke_requestDatabase(params: Protocol.IndexedDB.RequestDatabaseRequest):
        Promise<Protocol.IndexedDB.RequestDatabaseResponse>;

    /**
     * Requests database names for given security origin.
     */
    invoke_requestDatabaseNames(params: Protocol.IndexedDB.RequestDatabaseNamesRequest):
        Promise<Protocol.IndexedDB.RequestDatabaseNamesResponse>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface InputApi {
    /**
     * Dispatches a key event to the page.
     */
    invoke_dispatchKeyEvent(params: Protocol.Input.DispatchKeyEventRequest): Promise<void>;

    /**
     * This method emulates inserting text that doesn't come from a key press,
     * for example an emoji keyboard or an IME.
     */
    invoke_insertText(params: Protocol.Input.InsertTextRequest): Promise<void>;

    /**
     * Dispatches a mouse event to the page.
     */
    invoke_dispatchMouseEvent(params: Protocol.Input.DispatchMouseEventRequest): Promise<void>;

    /**
     * Dispatches a touch event to the page.
     */
    invoke_dispatchTouchEvent(params: Protocol.Input.DispatchTouchEventRequest): Promise<void>;

    /**
     * Emulates touch event from the mouse event parameters.
     */
    invoke_emulateTouchFromMouseEvent(params: Protocol.Input.EmulateTouchFromMouseEventRequest): Promise<void>;

    /**
     * Ignores input events (useful while auditing page).
     */
    invoke_setIgnoreInputEvents(params: Protocol.Input.SetIgnoreInputEventsRequest): Promise<void>;

    /**
     * Synthesizes a pinch gesture over a time period by issuing appropriate touch events.
     */
    invoke_synthesizePinchGesture(params: Protocol.Input.SynthesizePinchGestureRequest): Promise<void>;

    /**
     * Synthesizes a scroll gesture over a time period by issuing appropriate touch events.
     */
    invoke_synthesizeScrollGesture(params: Protocol.Input.SynthesizeScrollGestureRequest): Promise<void>;

    /**
     * Synthesizes a tap gesture over a time period by issuing appropriate touch events.
     */
    invoke_synthesizeTapGesture(params: Protocol.Input.SynthesizeTapGestureRequest): Promise<void>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface InspectorApi {
    /**
     * Disables inspector domain notifications.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables inspector domain notifications.
     */
    invoke_enable(): Promise<void>;

    /**
     * Fired when remote debugging connection is about to be terminated. Contains detach reason.
     */
    on(event: 'detached', listener: (params: Protocol.Inspector.DetachedEvent) => void): void;

    /**
     * Fired when debugging target has crashed
     */
    on(event: 'targetCrashed', listener: () => void): void;

    /**
     * Fired when debugging target has reloaded after crash
     */
    on(event: 'targetReloadedAfterCrash', listener: () => void): void;
  }

  export interface LayerTreeApi {
    /**
     * Provides the reasons why the given layer was composited.
     */
    invoke_compositingReasons(params: Protocol.LayerTree.CompositingReasonsRequest):
        Promise<Protocol.LayerTree.CompositingReasonsResponse>;

    /**
     * Disables compositing tree inspection.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables compositing tree inspection.
     */
    invoke_enable(): Promise<void>;

    /**
     * Returns the snapshot identifier.
     */
    invoke_loadSnapshot(params: Protocol.LayerTree.LoadSnapshotRequest):
        Promise<Protocol.LayerTree.LoadSnapshotResponse>;

    /**
     * Returns the layer snapshot identifier.
     */
    invoke_makeSnapshot(params: Protocol.LayerTree.MakeSnapshotRequest):
        Promise<Protocol.LayerTree.MakeSnapshotResponse>;

    invoke_profileSnapshot(params: Protocol.LayerTree.ProfileSnapshotRequest):
        Promise<Protocol.LayerTree.ProfileSnapshotResponse>;

    /**
     * Releases layer snapshot captured by the back-end.
     */
    invoke_releaseSnapshot(params: Protocol.LayerTree.ReleaseSnapshotRequest): Promise<void>;

    /**
     * Replays the layer snapshot and returns the resulting bitmap.
     */
    invoke_replaySnapshot(params: Protocol.LayerTree.ReplaySnapshotRequest):
        Promise<Protocol.LayerTree.ReplaySnapshotResponse>;

    /**
     * Replays the layer snapshot and returns canvas log.
     */
    invoke_snapshotCommandLog(params: Protocol.LayerTree.SnapshotCommandLogRequest):
        Promise<Protocol.LayerTree.SnapshotCommandLogResponse>;

    on(event: 'layerPainted', listener: (params: Protocol.LayerTree.LayerPaintedEvent) => void): void;

    on(event: 'layerTreeDidChange', listener: (params: Protocol.LayerTree.LayerTreeDidChangeEvent) => void): void;
  }

  export interface LogApi {
    /**
     * Clears the log.
     */
    invoke_clear(): Promise<void>;

    /**
     * Disables log domain, prevents further log entries from being reported to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables log domain, sends the entries collected so far to the client by means of the
     * `entryAdded` notification.
     */
    invoke_enable(): Promise<void>;

    /**
     * start violation reporting.
     */
    invoke_startViolationsReport(params: Protocol.Log.StartViolationsReportRequest): Promise<void>;

    /**
     * Stop violation reporting.
     */
    invoke_stopViolationsReport(): Promise<void>;

    /**
     * Issued when new message was logged.
     */
    on(event: 'entryAdded', listener: (params: Protocol.Log.EntryAddedEvent) => void): void;
  }

  export interface MemoryApi {
    invoke_getDOMCounters(): Promise<Protocol.Memory.GetDOMCountersResponse>;

    invoke_prepareForLeakDetection(): Promise<void>;

    /**
     * Simulate OomIntervention by purging V8 memory.
     */
    invoke_forciblyPurgeJavaScriptMemory(): Promise<void>;

    /**
     * Enable/disable suppressing memory pressure notifications in all processes.
     */
    invoke_setPressureNotificationsSuppressed(params: Protocol.Memory.SetPressureNotificationsSuppressedRequest):
        Promise<void>;

    /**
     * Simulate a memory pressure notification in all processes.
     */
    invoke_simulatePressureNotification(params: Protocol.Memory.SimulatePressureNotificationRequest): Promise<void>;

    /**
     * Start collecting native memory profile.
     */
    invoke_startSampling(params: Protocol.Memory.StartSamplingRequest): Promise<void>;

    /**
     * Stop collecting native memory profile.
     */
    invoke_stopSampling(): Promise<void>;

    /**
     * Retrieve native memory allocations profile
     * collected since renderer process startup.
     */
    invoke_getAllTimeSamplingProfile(): Promise<Protocol.Memory.GetAllTimeSamplingProfileResponse>;

    /**
     * Retrieve native memory allocations profile
     * collected since browser process startup.
     */
    invoke_getBrowserSamplingProfile(): Promise<Protocol.Memory.GetBrowserSamplingProfileResponse>;

    /**
     * Retrieve native memory allocations profile collected since last
     * `startSampling` call.
     */
    invoke_getSamplingProfile(): Promise<Protocol.Memory.GetSamplingProfileResponse>;
  }

  export interface NetworkApi {
    /**
     * Tells whether clearing browser cache is supported.
     */
    invoke_canClearBrowserCache(): Promise<Protocol.Network.CanClearBrowserCacheResponse>;

    /**
     * Tells whether clearing browser cookies is supported.
     */
    invoke_canClearBrowserCookies(): Promise<Protocol.Network.CanClearBrowserCookiesResponse>;

    /**
     * Tells whether emulation of network conditions is supported.
     */
    invoke_canEmulateNetworkConditions(): Promise<Protocol.Network.CanEmulateNetworkConditionsResponse>;

    /**
     * Clears browser cache.
     */
    invoke_clearBrowserCache(): Promise<void>;

    /**
     * Clears browser cookies.
     */
    invoke_clearBrowserCookies(): Promise<void>;

    /**
     * Response to Network.requestIntercepted which either modifies the request to continue with any
     * modifications, or blocks it, or completes it with the provided response bytes. If a network
     * fetch occurs as a result which encounters a redirect an additional Network.requestIntercepted
     * event will be sent with the same InterceptionId.
     * Deprecated, use Fetch.continueRequest, Fetch.fulfillRequest and Fetch.failRequest instead.
     */
    invoke_continueInterceptedRequest(params: Protocol.Network.ContinueInterceptedRequestRequest): Promise<void>;

    /**
     * Deletes browser cookies with matching name and url or domain/path pair.
     */
    invoke_deleteCookies(params: Protocol.Network.DeleteCookiesRequest): Promise<void>;

    /**
     * Disables network tracking, prevents network events from being sent to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Activates emulation of network conditions.
     */
    invoke_emulateNetworkConditions(params: Protocol.Network.EmulateNetworkConditionsRequest): Promise<void>;

    /**
     * Enables network tracking, network events will now be delivered to the client.
     */
    invoke_enable(params: Protocol.Network.EnableRequest): Promise<void>;

    /**
     * Returns all browser cookies. Depending on the backend support, will return detailed cookie
     * information in the `cookies` field.
     */
    invoke_getAllCookies(): Promise<Protocol.Network.GetAllCookiesResponse>;

    /**
     * Returns the DER-encoded certificate.
     */
    invoke_getCertificate(params: Protocol.Network.GetCertificateRequest):
        Promise<Protocol.Network.GetCertificateResponse>;

    /**
     * Returns all browser cookies for the current URL. Depending on the backend support, will return
     * detailed cookie information in the `cookies` field.
     */
    invoke_getCookies(params: Protocol.Network.GetCookiesRequest): Promise<Protocol.Network.GetCookiesResponse>;

    /**
     * Returns content served for the given request.
     */
    invoke_getResponseBody(params: Protocol.Network.GetResponseBodyRequest):
        Promise<Protocol.Network.GetResponseBodyResponse>;

    /**
     * Returns post data sent with the request. Returns an error when no data was sent with the request.
     */
    invoke_getRequestPostData(params: Protocol.Network.GetRequestPostDataRequest):
        Promise<Protocol.Network.GetRequestPostDataResponse>;

    /**
     * Returns content served for the given currently intercepted request.
     */
    invoke_getResponseBodyForInterception(params: Protocol.Network.GetResponseBodyForInterceptionRequest):
        Promise<Protocol.Network.GetResponseBodyForInterceptionResponse>;

    /**
     * Returns a handle to the stream representing the response body. Note that after this command,
     * the intercepted request can't be continued as is -- you either need to cancel it or to provide
     * the response body. The stream only supports sequential read, IO.read will fail if the position
     * is specified.
     */
    invoke_takeResponseBodyForInterceptionAsStream(params:
                                                       Protocol.Network.TakeResponseBodyForInterceptionAsStreamRequest):
        Promise<Protocol.Network.TakeResponseBodyForInterceptionAsStreamResponse>;

    /**
     * This method sends a new XMLHttpRequest which is identical to the original one. The following
     * parameters should be identical: method, url, async, request body, extra headers, withCredentials
     * attribute, user, password.
     */
    invoke_replayXHR(params: Protocol.Network.ReplayXHRRequest): Promise<void>;

    /**
     * Searches for given string in response content.
     */
    invoke_searchInResponseBody(params: Protocol.Network.SearchInResponseBodyRequest):
        Promise<Protocol.Network.SearchInResponseBodyResponse>;

    /**
     * Blocks URLs from loading.
     */
    invoke_setBlockedURLs(params: Protocol.Network.SetBlockedURLsRequest): Promise<void>;

    /**
     * Toggles ignoring of service worker for each request.
     */
    invoke_setBypassServiceWorker(params: Protocol.Network.SetBypassServiceWorkerRequest): Promise<void>;

    /**
     * Toggles ignoring cache for each request. If `true`, cache will not be used.
     */
    invoke_setCacheDisabled(params: Protocol.Network.SetCacheDisabledRequest): Promise<void>;

    /**
     * Sets a cookie with the given cookie data; may overwrite equivalent cookies if they exist.
     */
    invoke_setCookie(params: Protocol.Network.SetCookieRequest): Promise<Protocol.Network.SetCookieResponse>;

    /**
     * Sets given cookies.
     */
    invoke_setCookies(params: Protocol.Network.SetCookiesRequest): Promise<void>;

    /**
     * For testing.
     */
    invoke_setDataSizeLimitsForTest(params: Protocol.Network.SetDataSizeLimitsForTestRequest): Promise<void>;

    /**
     * Specifies whether to always send extra HTTP headers with the requests from this page.
     */
    invoke_setExtraHTTPHeaders(params: Protocol.Network.SetExtraHTTPHeadersRequest): Promise<void>;

    /**
     * Sets the requests to intercept that match the provided patterns and optionally resource types.
     * Deprecated, please use Fetch.enable instead.
     */
    invoke_setRequestInterception(params: Protocol.Network.SetRequestInterceptionRequest): Promise<void>;

    /**
     * Allows overriding user agent with the given string.
     */
    invoke_setUserAgentOverride(params: Protocol.Network.SetUserAgentOverrideRequest): Promise<void>;

    /**
     * Fired when data chunk was received over the network.
     */
    on(event: 'dataReceived', listener: (params: Protocol.Network.DataReceivedEvent) => void): void;

    /**
     * Fired when EventSource message is received.
     */
    on(event: 'eventSourceMessageReceived',
       listener: (params: Protocol.Network.EventSourceMessageReceivedEvent) => void): void;

    /**
     * Fired when HTTP request has failed to load.
     */
    on(event: 'loadingFailed', listener: (params: Protocol.Network.LoadingFailedEvent) => void): void;

    /**
     * Fired when HTTP request has finished loading.
     */
    on(event: 'loadingFinished', listener: (params: Protocol.Network.LoadingFinishedEvent) => void): void;

    /**
     * Details of an intercepted HTTP request, which must be either allowed, blocked, modified or
     * mocked.
     * Deprecated, use Fetch.requestPaused instead.
     */
    on(event: 'requestIntercepted', listener: (params: Protocol.Network.RequestInterceptedEvent) => void): void;

    /**
     * Fired if request ended up loading from cache.
     */
    on(event: 'requestServedFromCache', listener: (params: Protocol.Network.RequestServedFromCacheEvent) => void): void;

    /**
     * Fired when page is about to send HTTP request.
     */
    on(event: 'requestWillBeSent', listener: (params: Protocol.Network.RequestWillBeSentEvent) => void): void;

    /**
     * Fired when resource loading priority is changed
     */
    on(event: 'resourceChangedPriority',
       listener: (params: Protocol.Network.ResourceChangedPriorityEvent) => void): void;

    /**
     * Fired when a signed exchange was received over the network
     */
    on(event: 'signedExchangeReceived', listener: (params: Protocol.Network.SignedExchangeReceivedEvent) => void): void;

    /**
     * Fired when HTTP response is available.
     */
    on(event: 'responseReceived', listener: (params: Protocol.Network.ResponseReceivedEvent) => void): void;

    /**
     * Fired when WebSocket is closed.
     */
    on(event: 'webSocketClosed', listener: (params: Protocol.Network.WebSocketClosedEvent) => void): void;

    /**
     * Fired upon WebSocket creation.
     */
    on(event: 'webSocketCreated', listener: (params: Protocol.Network.WebSocketCreatedEvent) => void): void;

    /**
     * Fired when WebSocket message error occurs.
     */
    on(event: 'webSocketFrameError', listener: (params: Protocol.Network.WebSocketFrameErrorEvent) => void): void;

    /**
     * Fired when WebSocket message is received.
     */
    on(event: 'webSocketFrameReceived', listener: (params: Protocol.Network.WebSocketFrameReceivedEvent) => void): void;

    /**
     * Fired when WebSocket message is sent.
     */
    on(event: 'webSocketFrameSent', listener: (params: Protocol.Network.WebSocketFrameSentEvent) => void): void;

    /**
     * Fired when WebSocket handshake response becomes available.
     */
    on(event: 'webSocketHandshakeResponseReceived',
       listener: (params: Protocol.Network.WebSocketHandshakeResponseReceivedEvent) => void): void;

    /**
     * Fired when WebSocket is about to initiate handshake.
     */
    on(event: 'webSocketWillSendHandshakeRequest',
       listener: (params: Protocol.Network.WebSocketWillSendHandshakeRequestEvent) => void): void;

    /**
     * Fired when additional information about a requestWillBeSent event is available from the
     * network stack. Not every requestWillBeSent event will have an additional
     * requestWillBeSentExtraInfo fired for it, and there is no guarantee whether requestWillBeSent
     * or requestWillBeSentExtraInfo will be fired first for the same request.
     */
    on(event: 'requestWillBeSentExtraInfo',
       listener: (params: Protocol.Network.RequestWillBeSentExtraInfoEvent) => void): void;

    /**
     * Fired when additional information about a responseReceived event is available from the network
     * stack. Not every responseReceived event will have an additional responseReceivedExtraInfo for
     * it, and responseReceivedExtraInfo may be fired before or after responseReceived.
     */
    on(event: 'responseReceivedExtraInfo',
       listener: (params: Protocol.Network.ResponseReceivedExtraInfoEvent) => void): void;
  }

  export interface OverlayApi {
    /**
     * Disables domain notifications.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables domain notifications.
     */
    invoke_enable(): Promise<void>;

    /**
     * For testing.
     */
    invoke_getHighlightObjectForTest(params: Protocol.Overlay.GetHighlightObjectForTestRequest):
        Promise<Protocol.Overlay.GetHighlightObjectForTestResponse>;

    /**
     * Hides any highlight.
     */
    invoke_hideHighlight(): Promise<void>;

    /**
     * Highlights owner element of the frame with given id.
     */
    invoke_highlightFrame(params: Protocol.Overlay.HighlightFrameRequest): Promise<void>;

    /**
     * Highlights DOM node with given id or with the given JavaScript object wrapper. Either nodeId or
     * objectId must be specified.
     */
    invoke_highlightNode(params: Protocol.Overlay.HighlightNodeRequest): Promise<void>;

    /**
     * Highlights given quad. Coordinates are absolute with respect to the main frame viewport.
     */
    invoke_highlightQuad(params: Protocol.Overlay.HighlightQuadRequest): Promise<void>;

    /**
     * Highlights given rectangle. Coordinates are absolute with respect to the main frame viewport.
     */
    invoke_highlightRect(params: Protocol.Overlay.HighlightRectRequest): Promise<void>;

    /**
     * Enters the 'inspect' mode. In this mode, elements that user is hovering over are highlighted.
     * Backend then generates 'inspectNodeRequested' event upon element selection.
     */
    invoke_setInspectMode(params: Protocol.Overlay.SetInspectModeRequest): Promise<void>;

    /**
     * Highlights owner element of all frames detected to be ads.
     */
    invoke_setShowAdHighlights(params: Protocol.Overlay.SetShowAdHighlightsRequest): Promise<void>;

    invoke_setPausedInDebuggerMessage(params: Protocol.Overlay.SetPausedInDebuggerMessageRequest): Promise<void>;

    /**
     * Requests that backend shows debug borders on layers
     */
    invoke_setShowDebugBorders(params: Protocol.Overlay.SetShowDebugBordersRequest): Promise<void>;

    /**
     * Requests that backend shows the FPS counter
     */
    invoke_setShowFPSCounter(params: Protocol.Overlay.SetShowFPSCounterRequest): Promise<void>;

    /**
     * Requests that backend shows paint rectangles
     */
    invoke_setShowPaintRects(params: Protocol.Overlay.SetShowPaintRectsRequest): Promise<void>;

    /**
     * Requests that backend shows layout shift regions
     */
    invoke_setShowLayoutShiftRegions(params: Protocol.Overlay.SetShowLayoutShiftRegionsRequest): Promise<void>;

    /**
     * Requests that backend shows scroll bottleneck rects
     */
    invoke_setShowScrollBottleneckRects(params: Protocol.Overlay.SetShowScrollBottleneckRectsRequest): Promise<void>;

    /**
     * Requests that backend shows hit-test borders on layers
     */
    invoke_setShowHitTestBorders(params: Protocol.Overlay.SetShowHitTestBordersRequest): Promise<void>;

    /**
     * Paints viewport size upon main frame resize.
     */
    invoke_setShowViewportSizeOnResize(params: Protocol.Overlay.SetShowViewportSizeOnResizeRequest): Promise<void>;

    /**
     * Add a dual screen device hinge
     */
    invoke_setShowHinge(params: Protocol.Overlay.SetShowHingeRequest): Promise<void>;

    /**
     * Fired when the node should be inspected. This happens after call to `setInspectMode` or when
     * user manually inspects an element.
     */
    on(event: 'inspectNodeRequested', listener: (params: Protocol.Overlay.InspectNodeRequestedEvent) => void): void;

    /**
     * Fired when the node should be highlighted. This happens after call to `setInspectMode`.
     */
    on(event: 'nodeHighlightRequested', listener: (params: Protocol.Overlay.NodeHighlightRequestedEvent) => void): void;

    /**
     * Fired when user asks to capture screenshot of some area on the page.
     */
    on(event: 'screenshotRequested', listener: (params: Protocol.Overlay.ScreenshotRequestedEvent) => void): void;

    /**
     * Fired when user cancels the inspect mode.
     */
    on(event: 'inspectModeCanceled', listener: () => void): void;
  }

  export interface PageApi {
    /**
     * Deprecated, please use addScriptToEvaluateOnNewDocument instead.
     */
    invoke_addScriptToEvaluateOnLoad(params: Protocol.Page.AddScriptToEvaluateOnLoadRequest):
        Promise<Protocol.Page.AddScriptToEvaluateOnLoadResponse>;

    /**
     * Evaluates given script in every frame upon creation (before loading frame's scripts).
     */
    invoke_addScriptToEvaluateOnNewDocument(params: Protocol.Page.AddScriptToEvaluateOnNewDocumentRequest):
        Promise<Protocol.Page.AddScriptToEvaluateOnNewDocumentResponse>;

    /**
     * Brings page to front (activates tab).
     */
    invoke_bringToFront(): Promise<void>;

    /**
     * Capture page screenshot.
     */
    invoke_captureScreenshot(params: Protocol.Page.CaptureScreenshotRequest):
        Promise<Protocol.Page.CaptureScreenshotResponse>;

    /**
     * Returns a snapshot of the page as a string. For MHTML format, the serialization includes
     * iframes, shadow DOM, external resources, and element-inline styles.
     */
    invoke_captureSnapshot(params: Protocol.Page.CaptureSnapshotRequest):
        Promise<Protocol.Page.CaptureSnapshotResponse>;

    /**
     * Clears the overriden device metrics.
     */
    invoke_clearDeviceMetricsOverride(): Promise<void>;

    /**
     * Clears the overridden Device Orientation.
     */
    invoke_clearDeviceOrientationOverride(): Promise<void>;

    /**
     * Clears the overriden Geolocation Position and Error.
     */
    invoke_clearGeolocationOverride(): Promise<void>;

    /**
     * Creates an isolated world for the given frame.
     */
    invoke_createIsolatedWorld(params: Protocol.Page.CreateIsolatedWorldRequest):
        Promise<Protocol.Page.CreateIsolatedWorldResponse>;

    /**
     * Deletes browser cookie with given name, domain and path.
     */
    invoke_deleteCookie(params: Protocol.Page.DeleteCookieRequest): Promise<void>;

    /**
     * Disables page domain notifications.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables page domain notifications.
     */
    invoke_enable(): Promise<void>;

    invoke_getAppManifest(): Promise<Protocol.Page.GetAppManifestResponse>;

    invoke_getInstallabilityErrors(): Promise<Protocol.Page.GetInstallabilityErrorsResponse>;

    invoke_getManifestIcons(): Promise<Protocol.Page.GetManifestIconsResponse>;

    /**
     * Returns all browser cookies. Depending on the backend support, will return detailed cookie
     * information in the `cookies` field.
     */
    invoke_getCookies(): Promise<Protocol.Page.GetCookiesResponse>;

    /**
     * Returns present frame tree structure.
     */
    invoke_getFrameTree(): Promise<Protocol.Page.GetFrameTreeResponse>;

    /**
     * Returns metrics relating to the layouting of the page, such as viewport bounds/scale.
     */
    invoke_getLayoutMetrics(): Promise<Protocol.Page.GetLayoutMetricsResponse>;

    /**
     * Returns navigation history for the current page.
     */
    invoke_getNavigationHistory(): Promise<Protocol.Page.GetNavigationHistoryResponse>;

    /**
     * Resets navigation history for the current page.
     */
    invoke_resetNavigationHistory(): Promise<void>;

    /**
     * Returns content of the given resource.
     */
    invoke_getResourceContent(params: Protocol.Page.GetResourceContentRequest):
        Promise<Protocol.Page.GetResourceContentResponse>;

    /**
     * Returns present frame / resource tree structure.
     */
    invoke_getResourceTree(): Promise<Protocol.Page.GetResourceTreeResponse>;

    /**
     * Accepts or dismisses a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload).
     */
    invoke_handleJavaScriptDialog(params: Protocol.Page.HandleJavaScriptDialogRequest): Promise<void>;

    /**
     * Navigates current page to the given URL.
     */
    invoke_navigate(params: Protocol.Page.NavigateRequest): Promise<Protocol.Page.NavigateResponse>;

    /**
     * Navigates current page to the given history entry.
     */
    invoke_navigateToHistoryEntry(params: Protocol.Page.NavigateToHistoryEntryRequest): Promise<void>;

    /**
     * Print page as PDF.
     */
    invoke_printToPDF(params: Protocol.Page.PrintToPDFRequest): Promise<Protocol.Page.PrintToPDFResponse>;

    /**
     * Reloads given page optionally ignoring the cache.
     */
    invoke_reload(params: Protocol.Page.ReloadRequest): Promise<void>;

    /**
     * Deprecated, please use removeScriptToEvaluateOnNewDocument instead.
     */
    invoke_removeScriptToEvaluateOnLoad(params: Protocol.Page.RemoveScriptToEvaluateOnLoadRequest): Promise<void>;

    /**
     * Removes given script from the list.
     */
    invoke_removeScriptToEvaluateOnNewDocument(params: Protocol.Page.RemoveScriptToEvaluateOnNewDocumentRequest):
        Promise<void>;

    /**
     * Acknowledges that a screencast frame has been received by the frontend.
     */
    invoke_screencastFrameAck(params: Protocol.Page.ScreencastFrameAckRequest): Promise<void>;

    /**
     * Searches for given string in resource content.
     */
    invoke_searchInResource(params: Protocol.Page.SearchInResourceRequest):
        Promise<Protocol.Page.SearchInResourceResponse>;

    /**
     * Enable Chrome's experimental ad filter on all sites.
     */
    invoke_setAdBlockingEnabled(params: Protocol.Page.SetAdBlockingEnabledRequest): Promise<void>;

    /**
     * Enable page Content Security Policy by-passing.
     */
    invoke_setBypassCSP(params: Protocol.Page.SetBypassCSPRequest): Promise<void>;

    /**
     * Overrides the values of device screen dimensions (window.screen.width, window.screen.height,
     * window.innerWidth, window.innerHeight, and "device-width"/"device-height"-related CSS media
     * query results).
     */
    invoke_setDeviceMetricsOverride(params: Protocol.Page.SetDeviceMetricsOverrideRequest): Promise<void>;

    /**
     * Overrides the Device Orientation.
     */
    invoke_setDeviceOrientationOverride(params: Protocol.Page.SetDeviceOrientationOverrideRequest): Promise<void>;

    /**
     * Set generic font families.
     */
    invoke_setFontFamilies(params: Protocol.Page.SetFontFamiliesRequest): Promise<void>;

    /**
     * Set default font sizes.
     */
    invoke_setFontSizes(params: Protocol.Page.SetFontSizesRequest): Promise<void>;

    /**
     * Sets given markup as the document's HTML.
     */
    invoke_setDocumentContent(params: Protocol.Page.SetDocumentContentRequest): Promise<void>;

    /**
     * Set the behavior when downloading a file.
     */
    invoke_setDownloadBehavior(params: Protocol.Page.SetDownloadBehaviorRequest): Promise<void>;

    /**
     * Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position
     * unavailable.
     */
    invoke_setGeolocationOverride(params: Protocol.Page.SetGeolocationOverrideRequest): Promise<void>;

    /**
     * Controls whether page will emit lifecycle events.
     */
    invoke_setLifecycleEventsEnabled(params: Protocol.Page.SetLifecycleEventsEnabledRequest): Promise<void>;

    /**
     * Toggles mouse event-based touch event emulation.
     */
    invoke_setTouchEmulationEnabled(params: Protocol.Page.SetTouchEmulationEnabledRequest): Promise<void>;

    /**
     * Starts sending each frame using the `screencastFrame` event.
     */
    invoke_startScreencast(params: Protocol.Page.StartScreencastRequest): Promise<void>;

    /**
     * Force the page stop all navigations and pending resource fetches.
     */
    invoke_stopLoading(): Promise<void>;

    /**
     * Crashes renderer on the IO thread, generates minidumps.
     */
    invoke_crash(): Promise<void>;

    /**
     * Tries to close page, running its beforeunload hooks, if any.
     */
    invoke_close(): Promise<void>;

    /**
     * Tries to update the web lifecycle state of the page.
     * It will transition the page to the given state according to:
     * https://github.com/WICG/web-lifecycle/
     */
    invoke_setWebLifecycleState(params: Protocol.Page.SetWebLifecycleStateRequest): Promise<void>;

    /**
     * Stops sending each frame in the `screencastFrame`.
     */
    invoke_stopScreencast(): Promise<void>;

    /**
     * Forces compilation cache to be generated for every subresource script.
     */
    invoke_setProduceCompilationCache(params: Protocol.Page.SetProduceCompilationCacheRequest): Promise<void>;

    /**
     * Seeds compilation cache for given url. Compilation cache does not survive
     * cross-process navigation.
     */
    invoke_addCompilationCache(params: Protocol.Page.AddCompilationCacheRequest): Promise<void>;

    /**
     * Clears seeded compilation cache.
     */
    invoke_clearCompilationCache(): Promise<void>;

    /**
     * Generates a report for testing.
     */
    invoke_generateTestReport(params: Protocol.Page.GenerateTestReportRequest): Promise<void>;

    /**
     * Pauses page execution. Can be resumed using generic Runtime.runIfWaitingForDebugger.
     */
    invoke_waitForDebugger(): Promise<void>;

    /**
     * Intercept file chooser requests and transfer control to protocol clients.
     * When file chooser interception is enabled, native file chooser dialog is not shown.
     * Instead, a protocol event `Page.fileChooserOpened` is emitted.
     */
    invoke_setInterceptFileChooserDialog(params: Protocol.Page.SetInterceptFileChooserDialogRequest): Promise<void>;

    on(event: 'domContentEventFired', listener: (params: Protocol.Page.DomContentEventFiredEvent) => void): void;

    /**
     * Emitted only when `page.interceptFileChooser` is enabled.
     */
    on(event: 'fileChooserOpened', listener: (params: Protocol.Page.FileChooserOpenedEvent) => void): void;

    /**
     * Fired when frame has been attached to its parent.
     */
    on(event: 'frameAttached', listener: (params: Protocol.Page.FrameAttachedEvent) => void): void;

    /**
     * Fired when frame no longer has a scheduled navigation.
     */
    on(event: 'frameClearedScheduledNavigation',
       listener: (params: Protocol.Page.FrameClearedScheduledNavigationEvent) => void): void;

    /**
     * Fired when frame has been detached from its parent.
     */
    on(event: 'frameDetached', listener: (params: Protocol.Page.FrameDetachedEvent) => void): void;

    /**
     * Fired once navigation of the frame has completed. Frame is now associated with the new loader.
     */
    on(event: 'frameNavigated', listener: (params: Protocol.Page.FrameNavigatedEvent) => void): void;

    on(event: 'frameResized', listener: () => void): void;

    /**
     * Fired when a renderer-initiated navigation is requested.
     * Navigation may still be cancelled after the event is issued.
     */
    on(event: 'frameRequestedNavigation',
       listener: (params: Protocol.Page.FrameRequestedNavigationEvent) => void): void;

    /**
     * Fired when frame schedules a potential navigation.
     */
    on(event: 'frameScheduledNavigation',
       listener: (params: Protocol.Page.FrameScheduledNavigationEvent) => void): void;

    /**
     * Fired when frame has started loading.
     */
    on(event: 'frameStartedLoading', listener: (params: Protocol.Page.FrameStartedLoadingEvent) => void): void;

    /**
     * Fired when frame has stopped loading.
     */
    on(event: 'frameStoppedLoading', listener: (params: Protocol.Page.FrameStoppedLoadingEvent) => void): void;

    /**
     * Fired when page is about to start a download.
     */
    on(event: 'downloadWillBegin', listener: (params: Protocol.Page.DownloadWillBeginEvent) => void): void;

    /**
     * Fired when download makes progress. Last call has |done| == true.
     */
    on(event: 'downloadProgress', listener: (params: Protocol.Page.DownloadProgressEvent) => void): void;

    /**
     * Fired when interstitial page was hidden
     */
    on(event: 'interstitialHidden', listener: () => void): void;

    /**
     * Fired when interstitial page was shown
     */
    on(event: 'interstitialShown', listener: () => void): void;

    /**
     * Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) has been
     * closed.
     */
    on(event: 'javascriptDialogClosed', listener: (params: Protocol.Page.JavascriptDialogClosedEvent) => void): void;

    /**
     * Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) is about to
     * open.
     */
    on(event: 'javascriptDialogOpening', listener: (params: Protocol.Page.JavascriptDialogOpeningEvent) => void): void;

    /**
     * Fired for top level page lifecycle events such as navigation, load, paint, etc.
     */
    on(event: 'lifecycleEvent', listener: (params: Protocol.Page.LifecycleEventEvent) => void): void;

    on(event: 'loadEventFired', listener: (params: Protocol.Page.LoadEventFiredEvent) => void): void;

    /**
     * Fired when same-document navigation happens, e.g. due to history API usage or anchor navigation.
     */
    on(event: 'navigatedWithinDocument', listener: (params: Protocol.Page.NavigatedWithinDocumentEvent) => void): void;

    /**
     * Compressed image data requested by the `startScreencast`.
     */
    on(event: 'screencastFrame', listener: (params: Protocol.Page.ScreencastFrameEvent) => void): void;

    /**
     * Fired when the page with currently enabled screencast was shown or hidden `.
     */
    on(event: 'screencastVisibilityChanged',
       listener: (params: Protocol.Page.ScreencastVisibilityChangedEvent) => void): void;

    /**
     * Fired when a new window is going to be opened, via window.open(), link click, form submission,
     * etc.
     */
    on(event: 'windowOpen', listener: (params: Protocol.Page.WindowOpenEvent) => void): void;

    /**
     * Issued for every compilation cache generated. Is only available
     * if Page.setGenerateCompilationCache is enabled.
     */
    on(event: 'compilationCacheProduced',
       listener: (params: Protocol.Page.CompilationCacheProducedEvent) => void): void;
  }

  export interface PerformanceApi {
    /**
     * Disable collecting and reporting metrics.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enable collecting and reporting metrics.
     */
    invoke_enable(params: Protocol.Performance.EnableRequest): Promise<void>;

    /**
     * Sets time domain to use for collecting and reporting duration metrics.
     * Note that this must be called before enabling metrics collection. Calling
     * this method while metrics collection is enabled returns an error.
     */
    invoke_setTimeDomain(params: Protocol.Performance.SetTimeDomainRequest): Promise<void>;

    /**
     * Retrieve current values of run-time metrics.
     */
    invoke_getMetrics(): Promise<Protocol.Performance.GetMetricsResponse>;

    /**
     * Current values of the metrics.
     */
    on(event: 'metrics', listener: (params: Protocol.Performance.MetricsEvent) => void): void;
  }

  export interface SecurityApi {
    /**
     * Disables tracking security state changes.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables tracking security state changes.
     */
    invoke_enable(): Promise<void>;

    /**
     * Enable/disable whether all certificate errors should be ignored.
     */
    invoke_setIgnoreCertificateErrors(params: Protocol.Security.SetIgnoreCertificateErrorsRequest): Promise<void>;

    /**
     * Handles a certificate error that fired a certificateError event.
     */
    invoke_handleCertificateError(params: Protocol.Security.HandleCertificateErrorRequest): Promise<void>;

    /**
     * Enable/disable overriding certificate errors. If enabled, all certificate error events need to
     * be handled by the DevTools client and should be answered with `handleCertificateError` commands.
     */
    invoke_setOverrideCertificateErrors(params: Protocol.Security.SetOverrideCertificateErrorsRequest): Promise<void>;

    /**
     * There is a certificate error. If overriding certificate errors is enabled, then it should be
     * handled with the `handleCertificateError` command. Note: this event does not fire if the
     * certificate error has been allowed internally. Only one client per target should override
     * certificate errors at the same time.
     */
    on(event: 'certificateError', listener: (params: Protocol.Security.CertificateErrorEvent) => void): void;

    /**
     * The security state of the page changed.
     */
    on(event: 'visibleSecurityStateChanged',
       listener: (params: Protocol.Security.VisibleSecurityStateChangedEvent) => void): void;

    /**
     * The security state of the page changed.
     */
    on(event: 'securityStateChanged', listener: (params: Protocol.Security.SecurityStateChangedEvent) => void): void;
  }

  export interface ServiceWorkerApi {
    invoke_deliverPushMessage(params: Protocol.ServiceWorker.DeliverPushMessageRequest): Promise<void>;

    invoke_disable(): Promise<void>;

    invoke_dispatchSyncEvent(params: Protocol.ServiceWorker.DispatchSyncEventRequest): Promise<void>;

    invoke_dispatchPeriodicSyncEvent(params: Protocol.ServiceWorker.DispatchPeriodicSyncEventRequest): Promise<void>;

    invoke_enable(): Promise<void>;

    invoke_inspectWorker(params: Protocol.ServiceWorker.InspectWorkerRequest): Promise<void>;

    invoke_setForceUpdateOnPageLoad(params: Protocol.ServiceWorker.SetForceUpdateOnPageLoadRequest): Promise<void>;

    invoke_skipWaiting(params: Protocol.ServiceWorker.SkipWaitingRequest): Promise<void>;

    invoke_startWorker(params: Protocol.ServiceWorker.StartWorkerRequest): Promise<void>;

    invoke_stopAllWorkers(): Promise<void>;

    invoke_stopWorker(params: Protocol.ServiceWorker.StopWorkerRequest): Promise<void>;

    invoke_unregister(params: Protocol.ServiceWorker.UnregisterRequest): Promise<void>;

    invoke_updateRegistration(params: Protocol.ServiceWorker.UpdateRegistrationRequest): Promise<void>;

    on(event: 'workerErrorReported', listener: (params: Protocol.ServiceWorker.WorkerErrorReportedEvent) => void): void;

    on(event: 'workerRegistrationUpdated',
       listener: (params: Protocol.ServiceWorker.WorkerRegistrationUpdatedEvent) => void): void;

    on(event: 'workerVersionUpdated',
       listener: (params: Protocol.ServiceWorker.WorkerVersionUpdatedEvent) => void): void;
  }

  export interface StorageApi {
    /**
     * Clears storage for origin.
     */
    invoke_clearDataForOrigin(params: Protocol.Storage.ClearDataForOriginRequest): Promise<void>;

    /**
     * Returns all browser cookies.
     */
    invoke_getCookies(params: Protocol.Storage.GetCookiesRequest): Promise<Protocol.Storage.GetCookiesResponse>;

    /**
     * Sets given cookies.
     */
    invoke_setCookies(params: Protocol.Storage.SetCookiesRequest): Promise<void>;

    /**
     * Clears cookies.
     */
    invoke_clearCookies(params: Protocol.Storage.ClearCookiesRequest): Promise<void>;

    /**
     * Returns usage and quota in bytes.
     */
    invoke_getUsageAndQuota(params: Protocol.Storage.GetUsageAndQuotaRequest):
        Promise<Protocol.Storage.GetUsageAndQuotaResponse>;

    /**
     * Registers origin to be notified when an update occurs to its cache storage list.
     */
    invoke_trackCacheStorageForOrigin(params: Protocol.Storage.TrackCacheStorageForOriginRequest): Promise<void>;

    /**
     * Registers origin to be notified when an update occurs to its IndexedDB.
     */
    invoke_trackIndexedDBForOrigin(params: Protocol.Storage.TrackIndexedDBForOriginRequest): Promise<void>;

    /**
     * Unregisters origin from receiving notifications for cache storage.
     */
    invoke_untrackCacheStorageForOrigin(params: Protocol.Storage.UntrackCacheStorageForOriginRequest): Promise<void>;

    /**
     * Unregisters origin from receiving notifications for IndexedDB.
     */
    invoke_untrackIndexedDBForOrigin(params: Protocol.Storage.UntrackIndexedDBForOriginRequest): Promise<void>;

    /**
     * A cache's contents have been modified.
     */
    on(event: 'cacheStorageContentUpdated',
       listener: (params: Protocol.Storage.CacheStorageContentUpdatedEvent) => void): void;

    /**
     * A cache has been added/deleted.
     */
    on(event: 'cacheStorageListUpdated',
       listener: (params: Protocol.Storage.CacheStorageListUpdatedEvent) => void): void;

    /**
     * The origin's IndexedDB object store has been modified.
     */
    on(event: 'indexedDBContentUpdated',
       listener: (params: Protocol.Storage.IndexedDBContentUpdatedEvent) => void): void;

    /**
     * The origin's IndexedDB database list has been modified.
     */
    on(event: 'indexedDBListUpdated', listener: (params: Protocol.Storage.IndexedDBListUpdatedEvent) => void): void;
  }

  export interface SystemInfoApi {
    /**
     * Returns information about the system.
     */
    invoke_getInfo(): Promise<Protocol.SystemInfo.GetInfoResponse>;

    /**
     * Returns information about all running processes.
     */
    invoke_getProcessInfo(): Promise<Protocol.SystemInfo.GetProcessInfoResponse>;
  }

  export interface TargetApi {
    /**
     * Activates (focuses) the target.
     */
    invoke_activateTarget(params: Protocol.Target.ActivateTargetRequest): Promise<void>;

    /**
     * Attaches to the target with given id.
     */
    invoke_attachToTarget(params: Protocol.Target.AttachToTargetRequest):
        Promise<Protocol.Target.AttachToTargetResponse>;

    /**
     * Attaches to the browser target, only uses flat sessionId mode.
     */
    invoke_attachToBrowserTarget(): Promise<Protocol.Target.AttachToBrowserTargetResponse>;

    /**
     * Closes the target. If the target is a page that gets closed too.
     */
    invoke_closeTarget(params: Protocol.Target.CloseTargetRequest): Promise<Protocol.Target.CloseTargetResponse>;

    /**
     * Inject object to the target's main frame that provides a communication
     * channel with browser target.
     *
     * Injected object will be available as `window[bindingName]`.
     *
     * The object has the follwing API:
     * - `binding.send(json)` - a method to send messages over the remote debugging protocol
     * - `binding.onmessage = json => handleMessage(json)` - a callback that will be called for the protocol notifications and command responses.
     */
    invoke_exposeDevToolsProtocol(params: Protocol.Target.ExposeDevToolsProtocolRequest): Promise<void>;

    /**
     * Creates a new empty BrowserContext. Similar to an incognito profile but you can have more than
     * one.
     */
    invoke_createBrowserContext(params: Protocol.Target.CreateBrowserContextRequest):
        Promise<Protocol.Target.CreateBrowserContextResponse>;

    /**
     * Returns all browser contexts created with `Target.createBrowserContext` method.
     */
    invoke_getBrowserContexts(): Promise<Protocol.Target.GetBrowserContextsResponse>;

    /**
     * Creates a new page.
     */
    invoke_createTarget(params: Protocol.Target.CreateTargetRequest): Promise<Protocol.Target.CreateTargetResponse>;

    /**
     * Detaches session with given id.
     */
    invoke_detachFromTarget(params: Protocol.Target.DetachFromTargetRequest): Promise<void>;

    /**
     * Deletes a BrowserContext. All the belonging pages will be closed without calling their
     * beforeunload hooks.
     */
    invoke_disposeBrowserContext(params: Protocol.Target.DisposeBrowserContextRequest): Promise<void>;

    /**
     * Returns information about a target.
     */
    invoke_getTargetInfo(params: Protocol.Target.GetTargetInfoRequest): Promise<Protocol.Target.GetTargetInfoResponse>;

    /**
     * Retrieves a list of available targets.
     */
    invoke_getTargets(): Promise<Protocol.Target.GetTargetsResponse>;

    /**
     * Sends protocol message over session with given id.
     * Consider using flat mode instead; see commands attachToTarget, setAutoAttach,
     * and crbug.com/991325.
     */
    invoke_sendMessageToTarget(params: Protocol.Target.SendMessageToTargetRequest): Promise<void>;

    /**
     * Controls whether to automatically attach to new targets which are considered to be related to
     * this one. When turned on, attaches to all existing related targets as well. When turned off,
     * automatically detaches from all currently attached targets.
     */
    invoke_setAutoAttach(params: Protocol.Target.SetAutoAttachRequest): Promise<void>;

    /**
     * Controls whether to discover available targets and notify via
     * `targetCreated/targetInfoChanged/targetDestroyed` events.
     */
    invoke_setDiscoverTargets(params: Protocol.Target.SetDiscoverTargetsRequest): Promise<void>;

    /**
     * Enables target discovery for the specified locations, when `setDiscoverTargets` was set to
     * `true`.
     */
    invoke_setRemoteLocations(params: Protocol.Target.SetRemoteLocationsRequest): Promise<void>;

    /**
     * Issued when attached to target because of auto-attach or `attachToTarget` command.
     */
    on(event: 'attachedToTarget', listener: (params: Protocol.Target.AttachedToTargetEvent) => void): void;

    /**
     * Issued when detached from target for any reason (including `detachFromTarget` command). Can be
     * issued multiple times per target if multiple sessions have been attached to it.
     */
    on(event: 'detachedFromTarget', listener: (params: Protocol.Target.DetachedFromTargetEvent) => void): void;

    /**
     * Notifies about a new protocol message received from the session (as reported in
     * `attachedToTarget` event).
     */
    on(event: 'receivedMessageFromTarget',
       listener: (params: Protocol.Target.ReceivedMessageFromTargetEvent) => void): void;

    /**
     * Issued when a possible inspection target is created.
     */
    on(event: 'targetCreated', listener: (params: Protocol.Target.TargetCreatedEvent) => void): void;

    /**
     * Issued when a target is destroyed.
     */
    on(event: 'targetDestroyed', listener: (params: Protocol.Target.TargetDestroyedEvent) => void): void;

    /**
     * Issued when a target has crashed.
     */
    on(event: 'targetCrashed', listener: (params: Protocol.Target.TargetCrashedEvent) => void): void;

    /**
     * Issued when some information about a target has changed. This only happens between
     * `targetCreated` and `targetDestroyed`.
     */
    on(event: 'targetInfoChanged', listener: (params: Protocol.Target.TargetInfoChangedEvent) => void): void;
  }

  export interface TetheringApi {
    /**
     * Request browser port binding.
     */
    invoke_bind(params: Protocol.Tethering.BindRequest): Promise<void>;

    /**
     * Request browser port unbinding.
     */
    invoke_unbind(params: Protocol.Tethering.UnbindRequest): Promise<void>;

    /**
     * Informs that port was successfully bound and got a specified connection id.
     */
    on(event: 'accepted', listener: (params: Protocol.Tethering.AcceptedEvent) => void): void;
  }

  export interface TracingApi {
    /**
     * Stop trace events collection.
     */
    invoke_end(): Promise<void>;

    /**
     * Gets supported tracing categories.
     */
    invoke_getCategories(): Promise<Protocol.Tracing.GetCategoriesResponse>;

    /**
     * Record a clock sync marker in the trace.
     */
    invoke_recordClockSyncMarker(params: Protocol.Tracing.RecordClockSyncMarkerRequest): Promise<void>;

    /**
     * Request a global memory dump.
     */
    invoke_requestMemoryDump(params: Protocol.Tracing.RequestMemoryDumpRequest):
        Promise<Protocol.Tracing.RequestMemoryDumpResponse>;

    /**
     * Start trace events collection.
     */
    invoke_start(params: Protocol.Tracing.StartRequest): Promise<void>;

    on(event: 'bufferUsage', listener: (params: Protocol.Tracing.BufferUsageEvent) => void): void;

    /**
     * Contains an bucket of collected trace events. When tracing is stopped collected events will be
     * send as a sequence of dataCollected events followed by tracingComplete event.
     */
    on(event: 'dataCollected', listener: (params: Protocol.Tracing.DataCollectedEvent) => void): void;

    /**
     * Signals that tracing is stopped and there is no trace buffers pending flush, all data were
     * delivered via dataCollected events.
     */
    on(event: 'tracingComplete', listener: (params: Protocol.Tracing.TracingCompleteEvent) => void): void;
  }

  export interface FetchApi {
    /**
     * Disables the fetch domain.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables issuing of requestPaused events. A request will be paused until client
     * calls one of failRequest, fulfillRequest or continueRequest/continueWithAuth.
     */
    invoke_enable(params: Protocol.Fetch.EnableRequest): Promise<void>;

    /**
     * Causes the request to fail with specified reason.
     */
    invoke_failRequest(params: Protocol.Fetch.FailRequestRequest): Promise<void>;

    /**
     * Provides response to the request.
     */
    invoke_fulfillRequest(params: Protocol.Fetch.FulfillRequestRequest): Promise<void>;

    /**
     * Continues the request, optionally modifying some of its parameters.
     */
    invoke_continueRequest(params: Protocol.Fetch.ContinueRequestRequest): Promise<void>;

    /**
     * Continues a request supplying authChallengeResponse following authRequired event.
     */
    invoke_continueWithAuth(params: Protocol.Fetch.ContinueWithAuthRequest): Promise<void>;

    /**
     * Causes the body of the response to be received from the server and
     * returned as a single string. May only be issued for a request that
     * is paused in the Response stage and is mutually exclusive with
     * takeResponseBodyForInterceptionAsStream. Calling other methods that
     * affect the request or disabling fetch domain before body is received
     * results in an undefined behavior.
     */
    invoke_getResponseBody(params: Protocol.Fetch.GetResponseBodyRequest):
        Promise<Protocol.Fetch.GetResponseBodyResponse>;

    /**
     * Returns a handle to the stream representing the response body.
     * The request must be paused in the HeadersReceived stage.
     * Note that after this command the request can't be continued
     * as is -- client either needs to cancel it or to provide the
     * response body.
     * The stream only supports sequential read, IO.read will fail if the position
     * is specified.
     * This method is mutually exclusive with getResponseBody.
     * Calling other methods that affect the request or disabling fetch
     * domain before body is received results in an undefined behavior.
     */
    invoke_takeResponseBodyAsStream(params: Protocol.Fetch.TakeResponseBodyAsStreamRequest):
        Promise<Protocol.Fetch.TakeResponseBodyAsStreamResponse>;

    /**
     * Issued when the domain is enabled and the request URL matches the
     * specified filter. The request is paused until the client responds
     * with one of continueRequest, failRequest or fulfillRequest.
     * The stage of the request can be determined by presence of responseErrorReason
     * and responseStatusCode -- the request is at the response stage if either
     * of these fields is present and in the request stage otherwise.
     */
    on(event: 'requestPaused', listener: (params: Protocol.Fetch.RequestPausedEvent) => void): void;

    /**
     * Issued when the domain is enabled with handleAuthRequests set to true.
     * The request is paused until client responds with continueWithAuth.
     */
    on(event: 'authRequired', listener: (params: Protocol.Fetch.AuthRequiredEvent) => void): void;
  }

  export interface WebAudioApi {
    /**
     * Enables the WebAudio domain and starts sending context lifetime events.
     */
    invoke_enable(): Promise<void>;

    /**
     * Disables the WebAudio domain.
     */
    invoke_disable(): Promise<void>;

    /**
     * Fetch the realtime data from the registered contexts.
     */
    invoke_getRealtimeData(params: Protocol.WebAudio.GetRealtimeDataRequest):
        Promise<Protocol.WebAudio.GetRealtimeDataResponse>;

    /**
     * Notifies that a new BaseAudioContext has been created.
     */
    on(event: 'contextCreated', listener: (params: Protocol.WebAudio.ContextCreatedEvent) => void): void;

    /**
     * Notifies that an existing BaseAudioContext will be destroyed.
     */
    on(event: 'contextWillBeDestroyed',
       listener: (params: Protocol.WebAudio.ContextWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that existing BaseAudioContext has changed some properties (id stays the same)..
     */
    on(event: 'contextChanged', listener: (params: Protocol.WebAudio.ContextChangedEvent) => void): void;

    /**
     * Notifies that the construction of an AudioListener has finished.
     */
    on(event: 'audioListenerCreated', listener: (params: Protocol.WebAudio.AudioListenerCreatedEvent) => void): void;

    /**
     * Notifies that a new AudioListener has been created.
     */
    on(event: 'audioListenerWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that a new AudioNode has been created.
     */
    on(event: 'audioNodeCreated', listener: (params: Protocol.WebAudio.AudioNodeCreatedEvent) => void): void;

    /**
     * Notifies that an existing AudioNode has been destroyed.
     */
    on(event: 'audioNodeWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that a new AudioParam has been created.
     */
    on(event: 'audioParamCreated', listener: (params: Protocol.WebAudio.AudioParamCreatedEvent) => void): void;

    /**
     * Notifies that an existing AudioParam has been destroyed.
     */
    on(event: 'audioParamWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioParamWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that two AudioNodes are connected.
     */
    on(event: 'nodesConnected', listener: (params: Protocol.WebAudio.NodesConnectedEvent) => void): void;

    /**
     * Notifies that AudioNodes are disconnected. The destination can be null, and it means all the outgoing connections from the source are disconnected.
     */
    on(event: 'nodesDisconnected', listener: (params: Protocol.WebAudio.NodesDisconnectedEvent) => void): void;

    /**
     * Notifies that an AudioNode is connected to an AudioParam.
     */
    on(event: 'nodeParamConnected', listener: (params: Protocol.WebAudio.NodeParamConnectedEvent) => void): void;

    /**
     * Notifies that an AudioNode is disconnected to an AudioParam.
     */
    on(event: 'nodeParamDisconnected', listener: (params: Protocol.WebAudio.NodeParamDisconnectedEvent) => void): void;
  }

  export interface WebAuthnApi {
    /**
     * Enable the WebAuthn domain and start intercepting credential storage and
     * retrieval with a virtual authenticator.
     */
    invoke_enable(): Promise<void>;

    /**
     * Disable the WebAuthn domain.
     */
    invoke_disable(): Promise<void>;

    /**
     * Creates and adds a virtual authenticator.
     */
    invoke_addVirtualAuthenticator(params: Protocol.WebAuthn.AddVirtualAuthenticatorRequest):
        Promise<Protocol.WebAuthn.AddVirtualAuthenticatorResponse>;

    /**
     * Removes the given authenticator.
     */
    invoke_removeVirtualAuthenticator(params: Protocol.WebAuthn.RemoveVirtualAuthenticatorRequest): Promise<void>;

    /**
     * Adds the credential to the specified authenticator.
     */
    invoke_addCredential(params: Protocol.WebAuthn.AddCredentialRequest): Promise<void>;

    /**
     * Returns a single credential stored in the given virtual authenticator that
     * matches the credential ID.
     */
    invoke_getCredential(params: Protocol.WebAuthn.GetCredentialRequest):
        Promise<Protocol.WebAuthn.GetCredentialResponse>;

    /**
     * Returns all the credentials stored in the given virtual authenticator.
     */
    invoke_getCredentials(params: Protocol.WebAuthn.GetCredentialsRequest):
        Promise<Protocol.WebAuthn.GetCredentialsResponse>;

    /**
     * Removes a credential from the authenticator.
     */
    invoke_removeCredential(params: Protocol.WebAuthn.RemoveCredentialRequest): Promise<void>;

    /**
     * Clears all the credentials from the specified device.
     */
    invoke_clearCredentials(params: Protocol.WebAuthn.ClearCredentialsRequest): Promise<void>;

    /**
     * Sets whether User Verification succeeds or fails for an authenticator.
     * The default is true.
     */
    invoke_setUserVerified(params: Protocol.WebAuthn.SetUserVerifiedRequest): Promise<void>;
  }

  export interface MediaApi {
    /**
     * Enables the Media domain
     */
    invoke_enable(): Promise<void>;

    /**
     * Disables the Media domain.
     */
    invoke_disable(): Promise<void>;

    /**
     * This can be called multiple times, and can be used to set / override /
     * remove player properties. A null propValue indicates removal.
     */
    on(event: 'playerPropertiesChanged', listener: (params: Protocol.Media.PlayerPropertiesChangedEvent) => void): void;

    /**
     * Send events as a list, allowing them to be batched on the browser for less
     * congestion. If batched, events must ALWAYS be in chronological order.
     */
    on(event: 'playerEventsAdded', listener: (params: Protocol.Media.PlayerEventsAddedEvent) => void): void;

    /**
     * Send a list of any messages that need to be delivered.
     */
    on(event: 'playerMessagesLogged', listener: (params: Protocol.Media.PlayerMessagesLoggedEvent) => void): void;

    /**
     * Send a list of any errors that need to be delivered.
     */
    on(event: 'playerErrorsRaised', listener: (params: Protocol.Media.PlayerErrorsRaisedEvent) => void): void;

    /**
     * Called whenever a player is created, or when a new agent joins and recieves
     * a list of active players. If an agent is restored, it will recieve the full
     * list of player ids and all events again.
     */
    on(event: 'playersCreated', listener: (params: Protocol.Media.PlayersCreatedEvent) => void): void;
  }

  export interface ConsoleApi {
    /**
     * Does nothing.
     */
    invoke_clearMessages(): Promise<void>;

    /**
     * Disables console domain, prevents further console messages from being reported to the client.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables console domain, sends the messages collected so far to the client by means of the
     * `messageAdded` notification.
     */
    invoke_enable(): Promise<void>;

    /**
     * Issued when new console message is added.
     */
    on(event: 'messageAdded', listener: (params: Protocol.Console.MessageAddedEvent) => void): void;
  }

  export interface DebuggerApi {
    /**
     * Continues execution until specific location is reached.
     */
    invoke_continueToLocation(params: Protocol.Debugger.ContinueToLocationRequest): Promise<void>;

    /**
     * Disables debugger for given page.
     */
    invoke_disable(): Promise<void>;

    /**
     * Enables debugger for the given page. Clients should not assume that the debugging has been
     * enabled until the result for this command is received.
     */
    invoke_enable(params: Protocol.Debugger.EnableRequest): Promise<Protocol.Debugger.EnableResponse>;

    /**
     * Evaluates expression on a given call frame.
     */
    invoke_evaluateOnCallFrame(params: Protocol.Debugger.EvaluateOnCallFrameRequest):
        Promise<Protocol.Debugger.EvaluateOnCallFrameResponse>;

    /**
     * Returns possible locations for breakpoint. scriptId in start and end range locations should be
     * the same.
     */
    invoke_getPossibleBreakpoints(params: Protocol.Debugger.GetPossibleBreakpointsRequest):
        Promise<Protocol.Debugger.GetPossibleBreakpointsResponse>;

    /**
     * Returns source for the script with given id.
     */
    invoke_getScriptSource(params: Protocol.Debugger.GetScriptSourceRequest):
        Promise<Protocol.Debugger.GetScriptSourceResponse>;

    /**
     * This command is deprecated. Use getScriptSource instead.
     */
    invoke_getWasmBytecode(params: Protocol.Debugger.GetWasmBytecodeRequest):
        Promise<Protocol.Debugger.GetWasmBytecodeResponse>;

    /**
     * Returns stack trace with given `stackTraceId`.
     */
    invoke_getStackTrace(params: Protocol.Debugger.GetStackTraceRequest):
        Promise<Protocol.Debugger.GetStackTraceResponse>;

    /**
     * Stops on the next JavaScript statement.
     */
    invoke_pause(): Promise<void>;

    invoke_pauseOnAsyncCall(params: Protocol.Debugger.PauseOnAsyncCallRequest): Promise<void>;

    /**
     * Removes JavaScript breakpoint.
     */
    invoke_removeBreakpoint(params: Protocol.Debugger.RemoveBreakpointRequest): Promise<void>;

    /**
     * Restarts particular call frame from the beginning.
     */
    invoke_restartFrame(params: Protocol.Debugger.RestartFrameRequest): Promise<Protocol.Debugger.RestartFrameResponse>;

    /**
     * Resumes JavaScript execution.
     */
    invoke_resume(params: Protocol.Debugger.ResumeRequest): Promise<void>;

    /**
     * Searches for given string in script content.
     */
    invoke_searchInContent(params: Protocol.Debugger.SearchInContentRequest):
        Promise<Protocol.Debugger.SearchInContentResponse>;

    /**
     * Enables or disables async call stacks tracking.
     */
    invoke_setAsyncCallStackDepth(params: Protocol.Debugger.SetAsyncCallStackDepthRequest): Promise<void>;

    /**
     * Replace previous blackbox patterns with passed ones. Forces backend to skip stepping/pausing in
     * scripts with url matching one of the patterns. VM will try to leave blackboxed script by
     * performing 'step in' several times, finally resorting to 'step out' if unsuccessful.
     */
    invoke_setBlackboxPatterns(params: Protocol.Debugger.SetBlackboxPatternsRequest): Promise<void>;

    /**
     * Makes backend skip steps in the script in blackboxed ranges. VM will try leave blacklisted
     * scripts by performing 'step in' several times, finally resorting to 'step out' if unsuccessful.
     * Positions array contains positions where blackbox state is changed. First interval isn't
     * blackboxed. Array should be sorted.
     */
    invoke_setBlackboxedRanges(params: Protocol.Debugger.SetBlackboxedRangesRequest): Promise<void>;

    /**
     * Sets JavaScript breakpoint at a given location.
     */
    invoke_setBreakpoint(params: Protocol.Debugger.SetBreakpointRequest):
        Promise<Protocol.Debugger.SetBreakpointResponse>;

    /**
     * Sets instrumentation breakpoint.
     */
    invoke_setInstrumentationBreakpoint(params: Protocol.Debugger.SetInstrumentationBreakpointRequest):
        Promise<Protocol.Debugger.SetInstrumentationBreakpointResponse>;

    /**
     * Sets JavaScript breakpoint at given location specified either by URL or URL regex. Once this
     * command is issued, all existing parsed scripts will have breakpoints resolved and returned in
     * `locations` property. Further matching script parsing will result in subsequent
     * `breakpointResolved` events issued. This logical breakpoint will survive page reloads.
     */
    invoke_setBreakpointByUrl(params: Protocol.Debugger.SetBreakpointByUrlRequest):
        Promise<Protocol.Debugger.SetBreakpointByUrlResponse>;

    /**
     * Sets JavaScript breakpoint before each call to the given function.
     * If another function was created from the same source as a given one,
     * calling it will also trigger the breakpoint.
     */
    invoke_setBreakpointOnFunctionCall(params: Protocol.Debugger.SetBreakpointOnFunctionCallRequest):
        Promise<Protocol.Debugger.SetBreakpointOnFunctionCallResponse>;

    /**
     * Activates / deactivates all breakpoints on the page.
     */
    invoke_setBreakpointsActive(params: Protocol.Debugger.SetBreakpointsActiveRequest): Promise<void>;

    /**
     * Defines pause on exceptions state. Can be set to stop on all exceptions, uncaught exceptions or
     * no exceptions. Initial pause on exceptions state is `none`.
     */
    invoke_setPauseOnExceptions(params: Protocol.Debugger.SetPauseOnExceptionsRequest): Promise<void>;

    /**
     * Changes return value in top frame. Available only at return break position.
     */
    invoke_setReturnValue(params: Protocol.Debugger.SetReturnValueRequest): Promise<void>;

    /**
     * Edits JavaScript source live.
     */
    invoke_setScriptSource(params: Protocol.Debugger.SetScriptSourceRequest):
        Promise<Protocol.Debugger.SetScriptSourceResponse>;

    /**
     * Makes page not interrupt on any pauses (breakpoint, exception, dom exception etc).
     */
    invoke_setSkipAllPauses(params: Protocol.Debugger.SetSkipAllPausesRequest): Promise<void>;

    /**
     * Changes value of variable in a callframe. Object-based scopes are not supported and must be
     * mutated manually.
     */
    invoke_setVariableValue(params: Protocol.Debugger.SetVariableValueRequest): Promise<void>;

    /**
     * Steps into the function call.
     */
    invoke_stepInto(params: Protocol.Debugger.StepIntoRequest): Promise<void>;

    /**
     * Steps out of the function call.
     */
    invoke_stepOut(): Promise<void>;

    /**
     * Steps over the statement.
     */
    invoke_stepOver(): Promise<void>;

    /**
     * Fired when breakpoint is resolved to an actual script and location.
     */
    on(event: 'breakpointResolved', listener: (params: Protocol.Debugger.BreakpointResolvedEvent) => void): void;

    /**
     * Fired when the virtual machine stopped on breakpoint or exception or any other stop criteria.
     */
    on(event: 'paused', listener: (params: Protocol.Debugger.PausedEvent) => void): void;

    /**
     * Fired when the virtual machine resumed execution.
     */
    on(event: 'resumed', listener: () => void): void;

    /**
     * Fired when virtual machine fails to parse the script.
     */
    on(event: 'scriptFailedToParse', listener: (params: Protocol.Debugger.ScriptFailedToParseEvent) => void): void;

    /**
     * Fired when virtual machine parses script. This event is also fired for all known and uncollected
     * scripts upon enabling debugger.
     */
    on(event: 'scriptParsed', listener: (params: Protocol.Debugger.ScriptParsedEvent) => void): void;
  }

  export interface HeapProfilerApi {
    /**
     * Enables console to refer to the node with given id via $x (see Command Line API for more details
     * $x functions).
     */
    invoke_addInspectedHeapObject(params: Protocol.HeapProfiler.AddInspectedHeapObjectRequest): Promise<void>;

    invoke_collectGarbage(): Promise<void>;

    invoke_disable(): Promise<void>;

    invoke_enable(): Promise<void>;

    invoke_getHeapObjectId(params: Protocol.HeapProfiler.GetHeapObjectIdRequest):
        Promise<Protocol.HeapProfiler.GetHeapObjectIdResponse>;

    invoke_getObjectByHeapObjectId(params: Protocol.HeapProfiler.GetObjectByHeapObjectIdRequest):
        Promise<Protocol.HeapProfiler.GetObjectByHeapObjectIdResponse>;

    invoke_getSamplingProfile(): Promise<Protocol.HeapProfiler.GetSamplingProfileResponse>;

    invoke_startSampling(params: Protocol.HeapProfiler.StartSamplingRequest): Promise<void>;

    invoke_startTrackingHeapObjects(params: Protocol.HeapProfiler.StartTrackingHeapObjectsRequest): Promise<void>;

    invoke_stopSampling(): Promise<Protocol.HeapProfiler.StopSamplingResponse>;

    invoke_stopTrackingHeapObjects(params: Protocol.HeapProfiler.StopTrackingHeapObjectsRequest): Promise<void>;

    invoke_takeHeapSnapshot(params: Protocol.HeapProfiler.TakeHeapSnapshotRequest): Promise<void>;

    on(event: 'addHeapSnapshotChunk',
       listener: (params: Protocol.HeapProfiler.AddHeapSnapshotChunkEvent) => void): void;

    /**
     * If heap objects tracking has been started then backend may send update for one or more fragments
     */
    on(event: 'heapStatsUpdate', listener: (params: Protocol.HeapProfiler.HeapStatsUpdateEvent) => void): void;

    /**
     * If heap objects tracking has been started then backend regularly sends a current value for last
     * seen object id and corresponding timestamp. If the were changes in the heap since last event
     * then one or more heapStatsUpdate events will be sent before a new lastSeenObjectId event.
     */
    on(event: 'lastSeenObjectId', listener: (params: Protocol.HeapProfiler.LastSeenObjectIdEvent) => void): void;

    on(event: 'reportHeapSnapshotProgress',
       listener: (params: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent) => void): void;

    on(event: 'resetProfiles', listener: () => void): void;
  }

  export interface ProfilerApi {
    invoke_disable(): Promise<void>;

    invoke_enable(): Promise<void>;

    /**
     * Collect coverage data for the current isolate. The coverage data may be incomplete due to
     * garbage collection.
     */
    invoke_getBestEffortCoverage(): Promise<Protocol.Profiler.GetBestEffortCoverageResponse>;

    /**
     * Changes CPU profiler sampling interval. Must be called before CPU profiles recording started.
     */
    invoke_setSamplingInterval(params: Protocol.Profiler.SetSamplingIntervalRequest): Promise<void>;

    invoke_start(): Promise<void>;

    /**
     * Enable precise code coverage. Coverage data for JavaScript executed before enabling precise code
     * coverage may be incomplete. Enabling prevents running optimized code and resets execution
     * counters.
     */
    invoke_startPreciseCoverage(params: Protocol.Profiler.StartPreciseCoverageRequest):
        Promise<Protocol.Profiler.StartPreciseCoverageResponse>;

    /**
     * Enable type profile.
     */
    invoke_startTypeProfile(): Promise<void>;

    invoke_stop(): Promise<Protocol.Profiler.StopResponse>;

    /**
     * Disable precise code coverage. Disabling releases unnecessary execution count records and allows
     * executing optimized code.
     */
    invoke_stopPreciseCoverage(): Promise<void>;

    /**
     * Disable type profile. Disabling releases type profile data collected so far.
     */
    invoke_stopTypeProfile(): Promise<void>;

    /**
     * Collect coverage data for the current isolate, and resets execution counters. Precise code
     * coverage needs to have started.
     */
    invoke_takePreciseCoverage(): Promise<Protocol.Profiler.TakePreciseCoverageResponse>;

    /**
     * Collect type profile.
     */
    invoke_takeTypeProfile(): Promise<Protocol.Profiler.TakeTypeProfileResponse>;

    /**
     * Enable run time call stats collection.
     */
    invoke_enableRuntimeCallStats(): Promise<void>;

    /**
     * Disable run time call stats collection.
     */
    invoke_disableRuntimeCallStats(): Promise<void>;

    /**
     * Retrieve run time call stats.
     */
    invoke_getRuntimeCallStats(): Promise<Protocol.Profiler.GetRuntimeCallStatsResponse>;

    on(event: 'consoleProfileFinished',
       listener: (params: Protocol.Profiler.ConsoleProfileFinishedEvent) => void): void;

    /**
     * Sent when new profile recording is started using console.profile() call.
     */
    on(event: 'consoleProfileStarted', listener: (params: Protocol.Profiler.ConsoleProfileStartedEvent) => void): void;

    /**
     * Reports coverage delta since the last poll (either from an event like this, or from
     * `takePreciseCoverage` for the current isolate. May only be sent if precise code
     * coverage has been started. This event can be trigged by the embedder to, for example,
     * trigger collection of coverage data immediatelly at a certain point in time.
     */
    on(event: 'preciseCoverageDeltaUpdate',
       listener: (params: Protocol.Profiler.PreciseCoverageDeltaUpdateEvent) => void): void;
  }

  export interface RuntimeApi {
    /**
     * Add handler to promise with given promise object id.
     */
    invoke_awaitPromise(params: Protocol.Runtime.AwaitPromiseRequest): Promise<Protocol.Runtime.AwaitPromiseResponse>;

    /**
     * Calls function with given declaration on the given object. Object group of the result is
     * inherited from the target object.
     */
    invoke_callFunctionOn(params: Protocol.Runtime.CallFunctionOnRequest):
        Promise<Protocol.Runtime.CallFunctionOnResponse>;

    /**
     * Compiles expression.
     */
    invoke_compileScript(params: Protocol.Runtime.CompileScriptRequest):
        Promise<Protocol.Runtime.CompileScriptResponse>;

    /**
     * Disables reporting of execution contexts creation.
     */
    invoke_disable(): Promise<void>;

    /**
     * Discards collected exceptions and console API calls.
     */
    invoke_discardConsoleEntries(): Promise<void>;

    /**
     * Enables reporting of execution contexts creation by means of `executionContextCreated` event.
     * When the reporting gets enabled the event will be sent immediately for each existing execution
     * context.
     */
    invoke_enable(): Promise<void>;

    /**
     * Evaluates expression on global object.
     */
    invoke_evaluate(params: Protocol.Runtime.EvaluateRequest): Promise<Protocol.Runtime.EvaluateResponse>;

    /**
     * Returns the isolate id.
     */
    invoke_getIsolateId(): Promise<Protocol.Runtime.GetIsolateIdResponse>;

    /**
     * Returns the JavaScript heap usage.
     * It is the total usage of the corresponding isolate not scoped to a particular Runtime.
     */
    invoke_getHeapUsage(): Promise<Protocol.Runtime.GetHeapUsageResponse>;

    /**
     * Returns properties of a given object. Object group of the result is inherited from the target
     * object.
     */
    invoke_getProperties(params: Protocol.Runtime.GetPropertiesRequest):
        Promise<Protocol.Runtime.GetPropertiesResponse>;

    /**
     * Returns all let, const and class variables from global scope.
     */
    invoke_globalLexicalScopeNames(params: Protocol.Runtime.GlobalLexicalScopeNamesRequest):
        Promise<Protocol.Runtime.GlobalLexicalScopeNamesResponse>;

    invoke_queryObjects(params: Protocol.Runtime.QueryObjectsRequest): Promise<Protocol.Runtime.QueryObjectsResponse>;

    /**
     * Releases remote object with given id.
     */
    invoke_releaseObject(params: Protocol.Runtime.ReleaseObjectRequest): Promise<void>;

    /**
     * Releases all remote objects that belong to a given group.
     */
    invoke_releaseObjectGroup(params: Protocol.Runtime.ReleaseObjectGroupRequest): Promise<void>;

    /**
     * Tells inspected instance to run if it was waiting for debugger to attach.
     */
    invoke_runIfWaitingForDebugger(): Promise<void>;

    /**
     * Runs script with given id in a given context.
     */
    invoke_runScript(params: Protocol.Runtime.RunScriptRequest): Promise<Protocol.Runtime.RunScriptResponse>;

    /**
     * Enables or disables async call stacks tracking.
     */
    invoke_setAsyncCallStackDepth(params: Protocol.Runtime.SetAsyncCallStackDepthRequest): Promise<void>;

    invoke_setCustomObjectFormatterEnabled(params: Protocol.Runtime.SetCustomObjectFormatterEnabledRequest):
        Promise<void>;

    invoke_setMaxCallStackSizeToCapture(params: Protocol.Runtime.SetMaxCallStackSizeToCaptureRequest): Promise<void>;

    /**
     * Terminate current or next JavaScript execution.
     * Will cancel the termination when the outer-most script execution ends.
     */
    invoke_terminateExecution(): Promise<void>;

    /**
     * If executionContextId is empty, adds binding with the given name on the
     * global objects of all inspected contexts, including those created later,
     * bindings survive reloads.
     * If executionContextId is specified, adds binding only on global object of
     * given execution context.
     * Binding function takes exactly one argument, this argument should be string,
     * in case of any other input, function throws an exception.
     * Each binding function call produces Runtime.bindingCalled notification.
     */
    invoke_addBinding(params: Protocol.Runtime.AddBindingRequest): Promise<void>;

    /**
     * This method does not remove binding function from global object but
     * unsubscribes current runtime agent from Runtime.bindingCalled notifications.
     */
    invoke_removeBinding(params: Protocol.Runtime.RemoveBindingRequest): Promise<void>;

    /**
     * Notification is issued every time when binding is called.
     */
    on(event: 'bindingCalled', listener: (params: Protocol.Runtime.BindingCalledEvent) => void): void;

    /**
     * Issued when console API was called.
     */
    on(event: 'consoleAPICalled', listener: (params: Protocol.Runtime.ConsoleAPICalledEvent) => void): void;

    /**
     * Issued when unhandled exception was revoked.
     */
    on(event: 'exceptionRevoked', listener: (params: Protocol.Runtime.ExceptionRevokedEvent) => void): void;

    /**
     * Issued when exception was thrown and unhandled.
     */
    on(event: 'exceptionThrown', listener: (params: Protocol.Runtime.ExceptionThrownEvent) => void): void;

    /**
     * Issued when new execution context is created.
     */
    on(event: 'executionContextCreated',
       listener: (params: Protocol.Runtime.ExecutionContextCreatedEvent) => void): void;

    /**
     * Issued when execution context is destroyed.
     */
    on(event: 'executionContextDestroyed',
       listener: (params: Protocol.Runtime.ExecutionContextDestroyedEvent) => void): void;

    /**
     * Issued when all executionContexts were cleared in browser
     */
    on(event: 'executionContextsCleared', listener: () => void): void;

    /**
     * Issued when object should be inspected (for example, as a result of inspect() command line API
     * call).
     */
    on(event: 'inspectRequested', listener: (params: Protocol.Runtime.InspectRequestedEvent) => void): void;
  }

  export interface SchemaApi {
    /**
     * Returns supported domains.
     */
    invoke_getDomains(): Promise<Protocol.Schema.GetDomainsResponse>;
  }
}
