export default class RootView extends UI.VBox{constructor(){super();this.markAsRoot();this.element.classList.add('root-view');this.registerRequiredCSS('ui/rootView.css');this.element.setAttribute('spellcheck',false);}
attachToDocument(document){document.defaultView.addEventListener('resize',this.doResize.bind(this),false);this._window=document.defaultView;this.doResize();this.show((document.body));}
doResize(){if(this._window){const size=this.constraints().minimum;const zoom=UI.zoomManager.zoomFactor();const right=Math.min(0,this._window.innerWidth-size.width/zoom);this.element.style.marginRight=right+'px';const bottom=Math.min(0,this._window.innerHeight-size.height/zoom);this.element.style.marginBottom=bottom+'px';}
super.doResize();}}
self.UI=self.UI||{};UI=UI||{};UI.RootView=RootView;