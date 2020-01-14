export default class ProgressIndicator{constructor(){this.element=createElementWithClass('div','progress-indicator');this._shadowRoot=UI.createShadowRootWithCoreStyles(this.element,'ui/progressIndicator.css');this._contentElement=this._shadowRoot.createChild('div','progress-indicator-shadow-container');this._labelElement=this._contentElement.createChild('div','title');this._progressElement=this._contentElement.createChild('progress');this._progressElement.value=0;this._stopButton=this._contentElement.createChild('button','progress-indicator-shadow-stop-button');this._stopButton.addEventListener('click',this.cancel.bind(this));this._isCanceled=false;this._worked=0;}
show(parent){parent.appendChild(this.element);}
done(){if(this._isDone){return;}
this._isDone=true;this.element.remove();}
cancel(){this._isCanceled=true;}
isCanceled(){return this._isCanceled;}
setTitle(title){this._labelElement.textContent=title;}
setTotalWork(totalWork){this._progressElement.max=totalWork;}
setWorked(worked,title){this._worked=worked;this._progressElement.value=worked;if(title){this.setTitle(title);}}
worked(worked){this.setWorked(this._worked+(worked||1));}}
self.UI=self.UI||{};UI=UI||{};UI.ProgressIndicator=ProgressIndicator;