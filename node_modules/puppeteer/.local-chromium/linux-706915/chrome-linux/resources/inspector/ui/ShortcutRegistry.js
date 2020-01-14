export default class ShortcutRegistry{constructor(actionRegistry,document){this._actionRegistry=actionRegistry;this._defaultKeyToActions=new Platform.Multimap();this._defaultActionToShortcut=new Platform.Multimap();this._registerBindings(document);}
_applicableActions(key){return this._actionRegistry.applicableActions(this._defaultActionsForKey(key).valuesArray(),UI.context);}
_defaultActionsForKey(key){return this._defaultKeyToActions.get(String(key));}
globalShortcutKeys(){const keys=[];for(const key of this._defaultKeyToActions.keysArray()){const actions=this._defaultKeyToActions.get(key).valuesArray();const applicableActions=this._actionRegistry.applicableActions(actions,new UI.Context());if(applicableActions.length){keys.push(Number(key));}}
return keys;}
shortcutDescriptorsForAction(actionId){return this._defaultActionToShortcut.get(actionId).valuesArray();}
keysForActions(actionIds){const result=[];for(let i=0;i<actionIds.length;++i){const descriptors=this.shortcutDescriptorsForAction(actionIds[i]);for(let j=0;j<descriptors.length;++j){result.push(descriptors[j].key);}}
return result;}
shortcutTitleForAction(actionId){const descriptors=this.shortcutDescriptorsForAction(actionId);if(descriptors.length){return descriptors[0].name;}}
handleShortcut(event){this.handleKey(UI.KeyboardShortcut.makeKeyFromEvent(event),event.key,event);}
eventMatchesAction(event,actionId){console.assert(this._defaultActionToShortcut.has(actionId),'Unknown action '+actionId);const key=UI.KeyboardShortcut.makeKeyFromEvent(event);return this._defaultActionToShortcut.get(actionId).valuesArray().some(descriptor=>descriptor.key===key);}
addShortcutListener(element,actionId,listener,capture){console.assert(this._defaultActionToShortcut.has(actionId),'Unknown action '+actionId);element.addEventListener('keydown',event=>{if(!this.eventMatchesAction((event),actionId)||!listener.call(null)){return;}
event.consume(true);},capture);}
async handleKey(key,domKey,event){const keyModifiers=key>>8;const actions=this._applicableActions(key);if(!actions.length||isPossiblyInputKey()){return;}
if(event){event.consume(true);}
if(UI.Dialog.hasInstance()){return;}
for(const action of actions){if(await action.execute()){return;}}
function isPossiblyInputKey(){if(!event||!UI.isEditing()||/^F\d+|Control|Shift|Alt|Meta|Escape|Win|U\+001B$/.test(domKey)){return false;}
if(!keyModifiers){return true;}
const modifiers=UI.KeyboardShortcut.Modifiers;if(Host.isMac()){if(UI.KeyboardShortcut.makeKey('z',modifiers.Meta)===key){return true;}
if(UI.KeyboardShortcut.makeKey('z',modifiers.Meta|modifiers.Shift)===key){return true;}}else{if(UI.KeyboardShortcut.makeKey('z',modifiers.Ctrl)===key){return true;}
if(UI.KeyboardShortcut.makeKey('y',modifiers.Ctrl)===key){return true;}
if(!Host.isWin()&&UI.KeyboardShortcut.makeKey('z',modifiers.Ctrl|modifiers.Shift)===key){return true;}}
if((keyModifiers&(modifiers.Ctrl|modifiers.Alt))===(modifiers.Ctrl|modifiers.Alt)){return Host.isWin();}
return!hasModifier(modifiers.Ctrl)&&!hasModifier(modifiers.Alt)&&!hasModifier(modifiers.Meta);}
function hasModifier(mod){return!!(keyModifiers&mod);}}
registerShortcut(actionId,shortcut){const descriptor=UI.KeyboardShortcut.makeDescriptorFromBindingShortcut(shortcut);if(!descriptor){return;}
this._defaultActionToShortcut.set(actionId,descriptor);this._defaultKeyToActions.set(String(descriptor.key),actionId);}
_registerBindings(document){const extensions=self.runtime.extensions('action');extensions.forEach(registerExtension,this);function registerExtension(extension){const descriptor=extension.descriptor();const bindings=descriptor['bindings'];for(let i=0;bindings&&i<bindings.length;++i){if(!platformMatches(bindings[i].platform)){continue;}
const shortcuts=bindings[i]['shortcut'].split(/\s+/);shortcuts.forEach(this.registerShortcut.bind(this,descriptor['actionId']));}}
function platformMatches(platformsString){if(!platformsString){return true;}
const platforms=platformsString.split(',');let isMatch=false;const currentPlatform=Host.platform();for(let i=0;!isMatch&&i<platforms.length;++i){isMatch=platforms[i]===currentPlatform;}
return isMatch;}}}
export class ForwardedShortcut{}
ForwardedShortcut.instance=new ForwardedShortcut();UI.shortcutRegistry;self.UI=self.UI||{};UI=UI||{};UI.ShortcutRegistry=ShortcutRegistry;UI.ShortcutRegistry.ForwardedShortcut=ForwardedShortcut;