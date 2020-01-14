export default class ZoomManager extends Common.Object{constructor(window,frontendHost){super();this._frontendHost=frontendHost;this._zoomFactor=this._frontendHost.zoomFactor();window.addEventListener('resize',this._onWindowResize.bind(this),true);}
zoomFactor(){return this._zoomFactor;}
cssToDIP(value){return value*this._zoomFactor;}
dipToCSS(valueDIP){return valueDIP/this._zoomFactor;}
_onWindowResize(){const oldZoomFactor=this._zoomFactor;this._zoomFactor=this._frontendHost.zoomFactor();if(oldZoomFactor!==this._zoomFactor){this.dispatchEventToListeners(Events.ZoomChanged,{from:oldZoomFactor,to:this._zoomFactor});}}}
export const Events={ZoomChanged:Symbol('ZoomChanged')};self.UI=self.UI||{};UI=UI||{};UI.ZoomManager=ZoomManager;UI.ZoomManager.Events=Events;UI.zoomManager;