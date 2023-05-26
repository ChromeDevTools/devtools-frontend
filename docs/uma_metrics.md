# UMA metrics in DevTools frontend

(Googlers only) Generally, the histogram or action data is available in the Timeline category of the [UMA](http://uma/) page.

*   Select the channel you want to dive into.
*   Select the platforms you are interested in (for us, it is Linux, MacOS, Windows, ChromeOS and Lacros)
*   Add the metric you want to see, for example the generic histogram for action tracking, `DevTools.ActionTaken`.

## General histograms

* `DevTools.ActionTaken` is a generic histogram for tracking actions performed via the DevTools front-end.
* `DevTools.PanelShown` counts how often a given panel or tab is shown in the DevTools front-end.

## Histograms for the Workspaces feature

* `DevTools.ActionTaken` records `AddFileSystemToWorkspace` (_Add Filesystem to Workspace_), `RemoveFileSystemFromWorkspace`
  (_Remove Filesystem from Workspace_) and `FileSystemSourceSelected` (_Filesystem source selected_) according to developer
  interactions with the _Filesystem_ tab in the _Sources_ panels sidebar.
* `DevTools.Workspaces.PopulateWallClockTime` records the wall clock time in milliseconds elapsed while populating a project
  folder in the workspace.
* `DevTools.SidebarPaneShown` records the `navigator-files` (_Sources - Filesystem_) enum whenever the _Filesystem_ tab is
  revealed in the _Sources_ panels sidebar.

