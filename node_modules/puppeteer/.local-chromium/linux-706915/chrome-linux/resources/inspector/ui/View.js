export default class View{viewId(){}
title(){}
isCloseable(){}
isTransient(){}
toolbarItems(){}
widget(){}
disposeView(){}}
export const _symbol=Symbol('view');export const _widgetSymbol=Symbol('widget');export class SimpleView extends UI.VBox{constructor(title,isWebComponent){super(isWebComponent);this._title=title;this._toolbarItems=[];this[_symbol]=this;}
viewId(){return this._title;}
title(){return this._title;}
isCloseable(){return false;}
isTransient(){return false;}
toolbarItems(){return Promise.resolve(this.syncToolbarItems());}
syncToolbarItems(){return this._toolbarItems;}
widget(){return(Promise.resolve(this));}
addToolbarItem(item){this._toolbarItems.push(item);}
revealView(){return UI.viewManager.revealView(this);}
disposeView(){}}
export class ProvidedView{constructor(extension){this._extension=extension;}
viewId(){return this._extension.descriptor()['id'];}
title(){return this._extension.title();}
isCloseable(){return this._extension.descriptor()['persistence']==='closeable';}
isTransient(){return this._extension.descriptor()['persistence']==='transient';}
toolbarItems(){const actionIds=this._extension.descriptor()['actionIds'];if(actionIds){const result=actionIds.split(',').map(id=>UI.Toolbar.createActionButtonForId(id.trim()));return Promise.resolve(result);}
if(this._extension.descriptor()['hasToolbar']){return this.widget().then(widget=>(widget).toolbarItems());}
return Promise.resolve([]);}
async widget(){this._widgetRequested=true;const widget=await this._extension.instance();if(!(widget instanceof UI.Widget)){throw new Error('view className should point to a UI.Widget');}
widget[_symbol]=this;return(widget);}
async disposeView(){if(!this._widgetRequested){return;}
const widget=await this.widget();widget.ownerViewDisposed();}}
export class ViewLocation{appendApplicableItems(locationName){}
appendView(view,insertBefore){}
showView(view,insertBefore,userGesture){}
removeView(view){}
widget(){}}
export class TabbedViewLocation extends ViewLocation{tabbedPane(){}
enableMoreTabsButton(){}}
export class ViewLocationResolver{resolveLocation(location){}}
self.UI=self.UI||{};UI=UI||{};UI.View=View;UI.View.widgetSymbol=_widgetSymbol;UI.SimpleView=SimpleView;UI.ProvidedView=ProvidedView;UI.ViewLocation=ViewLocation;UI.TabbedViewLocation=TabbedViewLocation;UI.ViewLocationResolver=ViewLocationResolver;