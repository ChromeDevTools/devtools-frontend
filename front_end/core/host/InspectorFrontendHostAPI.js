"use strict";
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["AppendedToURL"] = "appendedToURL";
  Events2["CanceledSaveURL"] = "canceledSaveURL";
  Events2["ColorThemeChanged"] = "colorThemeChanged";
  Events2["ContextMenuCleared"] = "contextMenuCleared";
  Events2["ContextMenuItemSelected"] = "contextMenuItemSelected";
  Events2["DeviceCountUpdated"] = "deviceCountUpdated";
  Events2["DevicesDiscoveryConfigChanged"] = "devicesDiscoveryConfigChanged";
  Events2["DevicesPortForwardingStatusChanged"] = "devicesPortForwardingStatusChanged";
  Events2["DevicesUpdated"] = "devicesUpdated";
  Events2["DispatchMessage"] = "dispatchMessage";
  Events2["DispatchMessageChunk"] = "dispatchMessageChunk";
  Events2["EnterInspectElementMode"] = "enterInspectElementMode";
  Events2["EyeDropperPickedColor"] = "eyeDropperPickedColor";
  Events2["FileSystemsLoaded"] = "fileSystemsLoaded";
  Events2["FileSystemRemoved"] = "fileSystemRemoved";
  Events2["FileSystemAdded"] = "fileSystemAdded";
  Events2["FileSystemFilesChangedAddedRemoved"] = "fileSystemFilesChangedAddedRemoved";
  Events2["IndexingTotalWorkCalculated"] = "indexingTotalWorkCalculated";
  Events2["IndexingWorked"] = "indexingWorked";
  Events2["IndexingDone"] = "indexingDone";
  Events2["KeyEventUnhandled"] = "keyEventUnhandled";
  Events2["ReloadInspectedPage"] = "reloadInspectedPage";
  Events2["RevealSourceLine"] = "revealSourceLine";
  Events2["SavedURL"] = "savedURL";
  Events2["SearchCompleted"] = "searchCompleted";
  Events2["SetInspectedTabId"] = "setInspectedTabId";
  Events2["SetUseSoftMenu"] = "setUseSoftMenu";
  Events2["ShowPanel"] = "showPanel";
  return Events2;
})(Events || {});
export const EventDescriptors = [
  ["appendedToURL" /* AppendedToURL */, ["url"]],
  ["canceledSaveURL" /* CanceledSaveURL */, ["url"]],
  ["colorThemeChanged" /* ColorThemeChanged */, []],
  ["contextMenuCleared" /* ContextMenuCleared */, []],
  ["contextMenuItemSelected" /* ContextMenuItemSelected */, ["id"]],
  ["deviceCountUpdated" /* DeviceCountUpdated */, ["count"]],
  ["devicesDiscoveryConfigChanged" /* DevicesDiscoveryConfigChanged */, ["config"]],
  ["devicesPortForwardingStatusChanged" /* DevicesPortForwardingStatusChanged */, ["status"]],
  ["devicesUpdated" /* DevicesUpdated */, ["devices"]],
  ["dispatchMessage" /* DispatchMessage */, ["messageObject"]],
  ["dispatchMessageChunk" /* DispatchMessageChunk */, ["messageChunk", "messageSize"]],
  ["enterInspectElementMode" /* EnterInspectElementMode */, []],
  ["eyeDropperPickedColor" /* EyeDropperPickedColor */, ["color"]],
  ["fileSystemsLoaded" /* FileSystemsLoaded */, ["fileSystems"]],
  ["fileSystemRemoved" /* FileSystemRemoved */, ["fileSystemPath"]],
  ["fileSystemAdded" /* FileSystemAdded */, ["errorMessage", "fileSystem"]],
  ["fileSystemFilesChangedAddedRemoved" /* FileSystemFilesChangedAddedRemoved */, ["changed", "added", "removed"]],
  ["indexingTotalWorkCalculated" /* IndexingTotalWorkCalculated */, , ["requestId", "fileSystemPath", "totalWork"]],
  ["indexingWorked" /* IndexingWorked */, ["requestId", "fileSystemPath", "worked"]],
  ["indexingDone" /* IndexingDone */, ["requestId", "fileSystemPath"]],
  ["keyEventUnhandled" /* KeyEventUnhandled */, ["event"]],
  ["reloadInspectedPage" /* ReloadInspectedPage */, ["hard"]],
  ["revealSourceLine" /* RevealSourceLine */, ["url", "lineNumber", "columnNumber"]],
  ["savedURL" /* SavedURL */, ["url", "fileSystemPath"]],
  ["searchCompleted" /* SearchCompleted */, ["requestId", "fileSystemPath", "files"]],
  ["setInspectedTabId" /* SetInspectedTabId */, ["tabId"]],
  ["setUseSoftMenu" /* SetUseSoftMenu */, ["useSoftMenu"]],
  ["showPanel" /* ShowPanel */, ["panelName"]]
];
export var EnumeratedHistogram = /* @__PURE__ */ ((EnumeratedHistogram2) => {
  EnumeratedHistogram2["ActionTaken"] = "DevTools.ActionTaken";
  EnumeratedHistogram2["PanelShown"] = "DevTools.PanelShown";
  EnumeratedHistogram2["KeyboardShortcutFired"] = "DevTools.KeyboardShortcutFired";
  EnumeratedHistogram2["IssueCreated"] = "DevTools.IssueCreated";
  EnumeratedHistogram2["IssuesPanelIssueExpanded"] = "DevTools.IssuesPanelIssueExpanded";
  EnumeratedHistogram2["IssuesPanelOpenedFrom"] = "DevTools.IssuesPanelOpenedFrom";
  EnumeratedHistogram2["IssuesPanelResourceOpened"] = "DevTools.IssuesPanelResourceOpened";
  EnumeratedHistogram2["KeybindSetSettingChanged"] = "DevTools.KeybindSetSettingChanged";
  EnumeratedHistogram2["ExperimentEnabledAtLaunch"] = "DevTools.ExperimentEnabledAtLaunch";
  EnumeratedHistogram2["ExperimentDisabledAtLaunch"] = "DevTools.ExperimentDisabledAtLaunch";
  EnumeratedHistogram2["ExperimentEnabled"] = "DevTools.ExperimentEnabled";
  EnumeratedHistogram2["ExperimentDisabled"] = "DevTools.ExperimentDisabled";
  EnumeratedHistogram2["DeveloperResourceLoaded"] = "DevTools.DeveloperResourceLoaded";
  EnumeratedHistogram2["DeveloperResourceScheme"] = "DevTools.DeveloperResourceScheme";
  EnumeratedHistogram2["Language"] = "DevTools.Language";
  EnumeratedHistogram2["SyncSetting"] = "DevTools.SyncSetting";
  EnumeratedHistogram2["RecordingAssertion"] = "DevTools.RecordingAssertion";
  EnumeratedHistogram2["RecordingCodeToggled"] = "DevTools.RecordingCodeToggled";
  EnumeratedHistogram2["RecordingCopiedToClipboard"] = "DevTools.RecordingCopiedToClipboard";
  EnumeratedHistogram2["RecordingEdited"] = "DevTools.RecordingEdited";
  EnumeratedHistogram2["RecordingExported"] = "DevTools.RecordingExported";
  EnumeratedHistogram2["RecordingReplayFinished"] = "DevTools.RecordingReplayFinished";
  EnumeratedHistogram2["RecordingReplaySpeed"] = "DevTools.RecordingReplaySpeed";
  EnumeratedHistogram2["RecordingReplayStarted"] = "DevTools.RecordingReplayStarted";
  EnumeratedHistogram2["RecordingToggled"] = "DevTools.RecordingToggled";
  EnumeratedHistogram2["SourcesPanelFileDebugged"] = "DevTools.SourcesPanelFileDebugged";
  EnumeratedHistogram2["SourcesPanelFileOpened"] = "DevTools.SourcesPanelFileOpened";
  EnumeratedHistogram2["NetworkPanelResponsePreviewOpened"] = "DevTools.NetworkPanelResponsePreviewOpened";
  EnumeratedHistogram2["TimelineNavigationSettingState"] = "DevTools.TimelineNavigationSettingState";
  EnumeratedHistogram2["LighthouseModeRun"] = "DevTools.LighthouseModeRun";
  EnumeratedHistogram2["LighthouseCategoryUsed"] = "DevTools.LighthouseCategoryUsed";
  EnumeratedHistogram2["SwatchActivated"] = "DevTools.SwatchActivated";
  EnumeratedHistogram2["AnimationPlaybackRateChanged"] = "DevTools.AnimationPlaybackRateChanged";
  EnumeratedHistogram2["BuiltInAiAvailability"] = "DevTools.BuiltInAiAvailability";
  return EnumeratedHistogram2;
})(EnumeratedHistogram || {});
//# sourceMappingURL=InspectorFrontendHostAPI.js.map
