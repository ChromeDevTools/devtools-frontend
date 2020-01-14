export default class ExtensionPanel extends UI.Panel{constructor(server,panelName,id,pageURL){super(panelName);this._server=server;this._id=id;this.setHideOnDetach();this._panelToolbar=new UI.Toolbar('hidden',this.element);this._searchableView=new UI.SearchableView(this);this._searchableView.show(this.element);const extensionView=new Extensions.ExtensionView(server,this._id,pageURL,'extension');extensionView.show(this._searchableView.element);}
addToolbarItem(item){this._panelToolbar.element.classList.remove('hidden');this._panelToolbar.appendToolbarItem(item);}
searchCanceled(){this._server.notifySearchAction(this._id,Extensions.extensionAPI.panels.SearchAction.CancelSearch);this._searchableView.updateSearchMatchesCount(0);}
searchableView(){return this._searchableView;}
performSearch(searchConfig,shouldJump,jumpBackwards){const query=searchConfig.query;this._server.notifySearchAction(this._id,Extensions.extensionAPI.panels.SearchAction.PerformSearch,query);}
jumpToNextSearchResult(){this._server.notifySearchAction(this._id,Extensions.extensionAPI.panels.SearchAction.NextSearchResult);}
jumpToPreviousSearchResult(){this._server.notifySearchAction(this._id,Extensions.extensionAPI.panels.SearchAction.PreviousSearchResult);}
supportsCaseSensitiveSearch(){return false;}
supportsRegexSearch(){return false;}}
export class ExtensionButton{constructor(server,id,iconURL,tooltip,disabled){this._id=id;this._toolbarButton=new UI.ToolbarButton('','');this._toolbarButton.addEventListener(UI.ToolbarButton.Events.Click,server.notifyButtonClicked.bind(server,this._id));this.update(iconURL,tooltip,disabled);}
update(iconURL,tooltip,disabled){if(typeof iconURL==='string'){this._toolbarButton.setBackgroundImage(iconURL);}
if(typeof tooltip==='string'){this._toolbarButton.setTitle(tooltip);}
if(typeof disabled==='boolean'){this._toolbarButton.setEnabled(!disabled);}}
toolbarButton(){return this._toolbarButton;}}
export class ExtensionSidebarPane extends UI.SimpleView{constructor(server,panelName,title,id){super(title);this.element.classList.add('fill');this._panelName=panelName;this._server=server;this._id=id;}
id(){return this._id;}
panelName(){return this._panelName;}
setObject(object,title,callback){this._createObjectPropertiesView();this._setObject(SDK.RemoteObject.fromLocalObject(object),title,callback);}
setExpression(expression,title,evaluateOptions,securityOrigin,callback){this._createObjectPropertiesView();this._server.evaluate(expression,true,false,evaluateOptions,securityOrigin,this._onEvaluate.bind(this,title,callback));}
setPage(url){if(this._objectPropertiesView){this._objectPropertiesView.detach();delete this._objectPropertiesView;}
if(this._extensionView){this._extensionView.detach(true);}
this._extensionView=new Extensions.ExtensionView(this._server,this._id,url,'extension fill');this._extensionView.show(this.element);if(!this.element.style.height){this.setHeight('150px');}}
setHeight(height){this.element.style.height=height;}
_onEvaluate(title,callback,error,result,wasThrown){if(error||!result){callback(error.toString());}else{this._setObject(result,title,callback);}}
_createObjectPropertiesView(){if(this._objectPropertiesView){return;}
if(this._extensionView){this._extensionView.detach(true);delete this._extensionView;}
this._objectPropertiesView=new Extensions.ExtensionNotifierView(this._server,this._id);this._objectPropertiesView.show(this.element);}
_setObject(object,title,callback){if(!this._objectPropertiesView){callback('operation cancelled');return;}
this._objectPropertiesView.element.removeChildren();UI.Renderer.render(object,{title,editable:false}).then(result=>{if(!result){callback();return;}
if(result.tree&&result.tree.firstChild()){result.tree.firstChild().expand();}
this._objectPropertiesView.element.appendChild(result.node);callback();});}}
self.Extensions=self.Extensions||{};Extensions=Extensions||{};Extensions.ExtensionPanel=ExtensionPanel;Extensions.ExtensionButton=ExtensionButton;Extensions.ExtensionSidebarPane=ExtensionSidebarPane;