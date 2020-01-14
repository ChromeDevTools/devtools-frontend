export default class InspectorView extends UI.VBox{constructor(){super();UI.GlassPane.setContainer(this.element);this.setMinimumSize(240,72);this._drawerSplitWidget=new UI.SplitWidget(false,true,'Inspector.drawerSplitViewState',200,200);this._drawerSplitWidget.hideSidebar();this._drawerSplitWidget.hideDefaultResizer();this._drawerSplitWidget.enableShowModeSaving();this._drawerSplitWidget.show(this.element);if(Root.Runtime.experiments.isEnabled('splitInDrawer')){this._innerDrawerSplitWidget=new UI.SplitWidget(true,true,'Inspector.drawerSidebarSplitViewState',200,200);this._drawerSplitWidget.setSidebarWidget(this._innerDrawerSplitWidget);this._drawerSidebarTabbedLocation=UI.viewManager.createTabbedLocation(this._showDrawer.bind(this,false),'drawer-sidebar',true,true);this._drawerSidebarTabbedPane=this._drawerSidebarTabbedLocation.tabbedPane();this._drawerSidebarTabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,this._drawerTabSelected,this);this._innerDrawerSplitWidget.setSidebarWidget(this._drawerSidebarTabbedPane);}
this._drawerTabbedLocation=UI.viewManager.createTabbedLocation(this._showDrawer.bind(this,false),'drawer-view',true,true);const moreTabsButton=this._drawerTabbedLocation.enableMoreTabsButton();moreTabsButton.setTitle(ls`More Tools`);this._drawerTabbedPane=this._drawerTabbedLocation.tabbedPane();this._drawerTabbedPane.setMinimumSize(0,27);const closeDrawerButton=new UI.ToolbarButton(Common.UIString('Close drawer'),'largeicon-delete');closeDrawerButton.addEventListener(UI.ToolbarButton.Events.Click,this._closeDrawer,this);this._drawerSplitWidget.installResizer(this._drawerTabbedPane.headerElement());this._drawerTabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,this._drawerTabSelected,this);if(this._drawerSidebarTabbedPane){this._innerDrawerSplitWidget.setMainWidget(this._drawerTabbedPane);this._drawerSidebarTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);this._drawerSplitWidget.installResizer(this._drawerSidebarTabbedPane.headerElement());}else{this._drawerSplitWidget.setSidebarWidget(this._drawerTabbedPane);this._drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);}
this._tabbedLocation=UI.viewManager.createTabbedLocation(Host.InspectorFrontendHost.bringToFront.bind(Host.InspectorFrontendHost),'panel',true,true,Root.Runtime.queryParam('panel'));this._tabbedPane=this._tabbedLocation.tabbedPane();this._tabbedPane.registerRequiredCSS('ui/inspectorViewTabbedPane.css');this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,this._tabSelected,this);this._tabbedPane.setAccessibleName(Common.UIString('Panels'));Host.userMetrics.setLaunchPanel(this._tabbedPane.selectedTabId);if(Host.isUnderTest()){this._tabbedPane.setAutoSelectFirstItemOnShow(false);}
this._drawerSplitWidget.setMainWidget(this._tabbedPane);this._keyDownBound=this._keyDown.bind(this);Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ShowPanel,showPanel.bind(this));function showPanel(event){const panelName=(event.data);this.showPanel(panelName);}}
static instance(){return(self.runtime.sharedInstance(InspectorView));}
wasShown(){this.element.ownerDocument.addEventListener('keydown',this._keyDownBound,false);}
willHide(){this.element.ownerDocument.removeEventListener('keydown',this._keyDownBound,false);}
resolveLocation(locationName){if(locationName==='drawer-view'){return this._drawerTabbedLocation;}
if(locationName==='panel'){return this._tabbedLocation;}
if(locationName==='drawer-sidebar'){return this._drawerSidebarTabbedLocation;}
return null;}
createToolbars(){this._tabbedPane.leftToolbar().appendItemsAtLocation('main-toolbar-left');this._tabbedPane.rightToolbar().appendItemsAtLocation('main-toolbar-right');}
addPanel(view){this._tabbedLocation.appendView(view);}
hasPanel(panelName){return this._tabbedPane.hasTab(panelName);}
panel(panelName){return(UI.viewManager.view(panelName).widget());}
onSuspendStateChanged(allTargetsSuspended){this._currentPanelLocked=allTargetsSuspended;this._tabbedPane.setCurrentTabLocked(this._currentPanelLocked);this._tabbedPane.leftToolbar().setEnabled(!this._currentPanelLocked);this._tabbedPane.rightToolbar().setEnabled(!this._currentPanelLocked);}
canSelectPanel(panelName){return!this._currentPanelLocked||this._tabbedPane.selectedTabId===panelName;}
showPanel(panelName){return UI.viewManager.showView(panelName);}
setPanelIcon(panelName,icon){this._tabbedPane.setTabIcon(panelName,icon);}
currentPanelDeprecated(){return(UI.viewManager.materializedWidget(this._tabbedPane.selectedTabId||''));}
_showDrawer(focus){if(this._drawerTabbedPane.isShowing()){return;}
this._drawerSplitWidget.showBoth();if(focus){this._focusRestorer=new UI.WidgetFocusRestorer(this._drawerTabbedPane);}else{this._focusRestorer=null;}}
drawerVisible(){return this._drawerTabbedPane.isShowing();}
_closeDrawer(){if(!this._drawerTabbedPane.isShowing()){return;}
if(this._focusRestorer){this._focusRestorer.restore();}
this._drawerSplitWidget.hideSidebar(true);}
setDrawerMinimized(minimized){this._drawerSplitWidget.setSidebarMinimized(minimized);this._drawerSplitWidget.setResizable(!minimized);}
isDrawerMinimized(){return this._drawerSplitWidget.isSidebarMinimized();}
closeDrawerTab(id,userGesture){this._drawerTabbedPane.closeTab(id,userGesture);}
_keyDown(event){const keyboardEvent=(event);if(!UI.KeyboardShortcut.eventHasCtrlOrMeta(keyboardEvent)||event.altKey||event.shiftKey){return;}
const panelShortcutEnabled=Common.moduleSetting('shortcutPanelSwitch').get();if(panelShortcutEnabled){let panelIndex=-1;if(event.keyCode>0x30&&event.keyCode<0x3A){panelIndex=event.keyCode-0x31;}else if(event.keyCode>0x60&&event.keyCode<0x6A&&keyboardEvent.location===KeyboardEvent.DOM_KEY_LOCATION_NUMPAD){panelIndex=event.keyCode-0x61;}
if(panelIndex!==-1){const panelName=this._tabbedPane.tabIds()[panelIndex];if(panelName){if(!UI.Dialog.hasInstance()&&!this._currentPanelLocked){this.showPanel(panelName);}
event.consume(true);}}}}
onResize(){UI.GlassPane.containerMoved(this.element);}
topResizerElement(){return this._tabbedPane.headerElement();}
toolbarItemResized(){this._tabbedPane.headerResized();}
_tabSelected(event){const tabId=(event.data['tabId']);Host.userMetrics.panelShown(tabId);}
_drawerTabSelected(event){const tabId=(event.data['tabId']);Host.userMetrics.drawerShown(tabId);}
setOwnerSplit(splitWidget){this._ownerSplitWidget=splitWidget;}
minimize(){if(this._ownerSplitWidget){this._ownerSplitWidget.setSidebarMinimized(true);}}
restore(){if(this._ownerSplitWidget){this._ownerSplitWidget.setSidebarMinimized(false);}}}
export class ActionDelegate{handleAction(context,actionId){switch(actionId){case'main.toggle-drawer':if(UI.inspectorView.drawerVisible()){UI.inspectorView._closeDrawer();}else{UI.inspectorView._showDrawer(true);}
return true;case'main.next-tab':UI.inspectorView._tabbedPane.selectNextTab();UI.inspectorView._tabbedPane.focus();return true;case'main.previous-tab':UI.inspectorView._tabbedPane.selectPrevTab();UI.inspectorView._tabbedPane.focus();return true;}
return false;}}
self.UI=self.UI||{};UI=UI||{};UI.InspectorView=InspectorView;UI.InspectorView.ActionDelegate=ActionDelegate;UI.inspectorView;