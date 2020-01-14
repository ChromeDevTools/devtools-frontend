export default class ThrottledWidget extends UI.VBox{constructor(isWebComponent,timeout){super(isWebComponent);this._updateThrottler=new Common.Throttler(timeout===undefined?100:timeout);this._updateWhenVisible=false;}
doUpdate(){return Promise.resolve();}
update(){this._updateWhenVisible=!this.isShowing();if(this._updateWhenVisible){return;}
this._updateThrottler.schedule(innerUpdate.bind(this));function innerUpdate(){if(this.isShowing()){return this.doUpdate();}
this._updateWhenVisible=true;return Promise.resolve();}}
wasShown(){super.wasShown();if(this._updateWhenVisible){this.update();}}}
self.UI=self.UI||{};UI=UI||{};UI.ThrottledWidget=ThrottledWidget;