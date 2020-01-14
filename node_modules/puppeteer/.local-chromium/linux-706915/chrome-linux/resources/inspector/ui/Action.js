export default class Action extends Common.Object{constructor(extension){super();this._extension=extension;this._enabled=true;this._toggled=false;}
id(){return this._extension.descriptor()['actionId'];}
extension(){return this._extension;}
execute(){return this._extension.instance().then(handleAction.bind(this));function handleAction(actionDelegate){const actionId=this._extension.descriptor()['actionId'];const delegate=(actionDelegate);return delegate.handleAction(UI.context,actionId);}}
icon(){return this._extension.descriptor()['iconClass']||'';}
toggledIcon(){return this._extension.descriptor()['toggledIconClass']||'';}
toggleWithRedColor(){return!!this._extension.descriptor()['toggleWithRedColor'];}
setEnabled(enabled){if(this._enabled===enabled){return;}
this._enabled=enabled;this.dispatchEventToListeners(Events.Enabled,enabled);}
enabled(){return this._enabled;}
category(){return ls(this._extension.descriptor()['category']||'');}
tags(){return this._extension.descriptor()['tags']||'';}
toggleable(){return!!this._extension.descriptor()['toggleable'];}
title(){let title=this._extension.title()||'';const options=this._extension.descriptor()['options'];if(options){for(const pair of options){if(pair['value']!==this._toggled){title=ls(pair['title']);}}}
return title;}
toggled(){return this._toggled;}
setToggled(toggled){console.assert(this.toggleable(),'Shouldn\'t be toggling an untoggleable action',this.id());if(this._toggled===toggled){return;}
this._toggled=toggled;this.dispatchEventToListeners(Events.Toggled,toggled);}}
const Events={Enabled:Symbol('Enabled'),Toggled:Symbol('Toggled')};self.UI=self.UI||{};UI=UI||{};UI.Action=Action;UI.Action.Events=Events;