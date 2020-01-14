export function reload(){if(Components.dockController.canDock()&&Components.dockController.dockSide()===Components.DockController.State.Undocked){Host.InspectorFrontendHost.setIsDocked(true,function(){});}
window.location.reload();}
self.Components=self.Components||{};Components=Components||{};Components.reload=reload;