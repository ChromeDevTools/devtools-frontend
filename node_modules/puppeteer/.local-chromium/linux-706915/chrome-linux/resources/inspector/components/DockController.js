export default class DockController extends Common.Object{constructor(canDock){super();this._canDock=canDock;this._closeButton=new UI.ToolbarButton(Common.UIString('Close'),'largeicon-delete');this._closeButton.addEventListener(UI.ToolbarButton.Events.Click,Host.InspectorFrontendHost.closeWindow.bind(Host.InspectorFrontendHost));if(!canDock){this._dockSide=State.Undocked;this._closeButton.setVisible(false);return;}
this._states=[State.DockedToRight,State.DockedToBottom,State.DockedToLeft,State.Undocked];this._currentDockStateSetting=Common.settings.moduleSetting('currentDockState');this._currentDockStateSetting.addChangeListener(this._dockSideChanged,this);this._lastDockStateSetting=Common.settings.createSetting('lastDockState','bottom');if(this._states.indexOf(this._currentDockStateSetting.get())===-1){this._currentDockStateSetting.set('right');}
if(this._states.indexOf(this._lastDockStateSetting.get())===-1){this._currentDockStateSetting.set('bottom');}}
initialize(){if(!this._canDock){return;}
this._titles=[Common.UIString('Dock to right'),Common.UIString('Dock to bottom'),Common.UIString('Dock to left'),Common.UIString('Undock into separate window')];this._dockSideChanged();}
_dockSideChanged(){this.setDockSide(this._currentDockStateSetting.get());}
dockSide(){return this._dockSide;}
canDock(){return this._canDock;}
isVertical(){return this._dockSide===State.DockedToRight||this._dockSide===State.DockedToLeft;}
setDockSide(dockSide){if(this._states.indexOf(dockSide)===-1){dockSide=this._states[0];}
if(this._dockSide===dockSide){return;}
if(this._dockSide){this._lastDockStateSetting.set(this._dockSide);}
this._savedFocus=document.deepActiveElement();const eventData={from:this._dockSide,to:dockSide};this.dispatchEventToListeners(Events.BeforeDockSideChanged,eventData);console.timeStamp('DockController.setIsDocked');this._dockSide=dockSide;this._currentDockStateSetting.set(dockSide);Host.InspectorFrontendHost.setIsDocked(dockSide!==State.Undocked,this._setIsDockedResponse.bind(this,eventData));this._closeButton.setVisible(this._dockSide!==State.Undocked);this.dispatchEventToListeners(Events.DockSideChanged,eventData);}
_setIsDockedResponse(eventData){this.dispatchEventToListeners(Events.AfterDockSideChanged,eventData);if(this._savedFocus){this._savedFocus.focus();this._savedFocus=null;}}
_toggleDockSide(){if(this._lastDockStateSetting.get()===this._currentDockStateSetting.get()){const index=this._states.indexOf(this._currentDockStateSetting.get())||0;this._lastDockStateSetting.set(this._states[(index+1)%this._states.length]);}
this.setDockSide(this._lastDockStateSetting.get());}}
export const State={DockedToBottom:'bottom',DockedToRight:'right',DockedToLeft:'left',Undocked:'undocked'};export const Events={BeforeDockSideChanged:Symbol('BeforeDockSideChanged'),DockSideChanged:Symbol('DockSideChanged'),AfterDockSideChanged:Symbol('AfterDockSideChanged')};export class ToggleDockActionDelegate{handleAction(context,actionId){Components.dockController._toggleDockSide();return true;}}
export class CloseButtonProvider{item(){return Components.dockController._closeButton;}}
self.Components=self.Components||{};Components=Components||{};Components.DockController=DockController;Components.DockController.State=State;Components.DockController.Events=Events;Components.DockController.ToggleDockActionDelegate=ToggleDockActionDelegate;Components.DockController.CloseButtonProvider=CloseButtonProvider;Components.dockController;