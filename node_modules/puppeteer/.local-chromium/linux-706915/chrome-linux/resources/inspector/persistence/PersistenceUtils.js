export default class PersistenceUtils{static tooltipForUISourceCode(uiSourceCode){const binding=Persistence.persistence.binding(uiSourceCode);if(!binding){return'';}
if(uiSourceCode===binding.network){return Persistence.FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);}
if(binding.network.contentType().isFromSourceMap()){return Common.UIString('Linked to source map: %s',binding.network.url().trimMiddle(150));}
return Common.UIString('Linked to %s',binding.network.url().trimMiddle(150));}
static iconForUISourceCode(uiSourceCode){const binding=Persistence.persistence.binding(uiSourceCode);if(binding){if(!binding.fileSystem.url().startsWith('file://')){return null;}
const icon=UI.Icon.create('mediumicon-file-sync');icon.title=PersistenceUtils.tooltipForUISourceCode(binding.network);if(Persistence.networkPersistenceManager.project()===binding.fileSystem.project()){icon.style.filter='hue-rotate(160deg)';}
return icon;}
if(uiSourceCode.project().type()!==Workspace.projectTypes.FileSystem||!uiSourceCode.url().startsWith('file://')){return null;}
const icon=UI.Icon.create('mediumicon-file');icon.title=PersistenceUtils.tooltipForUISourceCode(uiSourceCode);return icon;}}
export class LinkDecorator extends Common.Object{constructor(persistence){super();persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._bindingChanged,this);persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._bindingChanged,this);}
_bindingChanged(event){const binding=(event.data);this.dispatchEventToListeners(Components.LinkDecorator.Events.LinkIconChanged,binding.network);}
linkIcon(uiSourceCode){return PersistenceUtils.iconForUISourceCode(uiSourceCode);}}
self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.PersistenceUtils=PersistenceUtils;Persistence.PersistenceUtils.LinkDecorator=LinkDecorator;