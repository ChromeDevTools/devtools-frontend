export default class Linkifier{constructor(maxLengthForDisplayedURLs,useLinkDecorator){this._maxLength=maxLengthForDisplayedURLs||UI.MaxLengthForDisplayedURLs;this._anchorsByTarget=new Map();this._locationPoolByTarget=new Map();this._useLinkDecorator=!!useLinkDecorator;_instances.add(this);SDK.targetManager.observeTargets(this);}
static setLinkDecorator(decorator){console.assert(!_decorator,'Cannot re-register link decorator.');_decorator=decorator;decorator.addEventListener(LinkDecorator.Events.LinkIconChanged,onLinkIconChanged);for(const linkifier of _instances){linkifier._updateAllAnchorDecorations();}
function onLinkIconChanged(event){const uiSourceCode=(event.data);const links=uiSourceCode[_sourceCodeAnchors]||[];for(const link of links){Linkifier._updateLinkDecorations(link);}}}
_updateAllAnchorDecorations(){for(const anchors of this._anchorsByTarget.values()){for(const anchor of anchors){Linkifier._updateLinkDecorations(anchor);}}}
static _bindUILocation(anchor,uiLocation){Linkifier._linkInfo(anchor).uiLocation=uiLocation;if(!uiLocation){return;}
const uiSourceCode=uiLocation.uiSourceCode;let sourceCodeAnchors=uiSourceCode[_sourceCodeAnchors];if(!sourceCodeAnchors){sourceCodeAnchors=new Set();uiSourceCode[_sourceCodeAnchors]=sourceCodeAnchors;}
sourceCodeAnchors.add(anchor);}
static _unbindUILocation(anchor){const info=Linkifier._linkInfo(anchor);if(!info.uiLocation){return;}
const uiSourceCode=info.uiLocation.uiSourceCode;info.uiLocation=null;const sourceCodeAnchors=uiSourceCode[_sourceCodeAnchors];if(sourceCodeAnchors){sourceCodeAnchors.delete(anchor);}}
targetAdded(target){this._anchorsByTarget.set(target,[]);this._locationPoolByTarget.set(target,new Bindings.LiveLocationPool());}
targetRemoved(target){const locationPool=(this._locationPoolByTarget.remove(target));locationPool.disposeAll();const anchors=this._anchorsByTarget.remove(target);for(const anchor of anchors){const info=Linkifier._linkInfo(anchor);info.liveLocation=null;Linkifier._unbindUILocation(anchor);if(info.fallback){anchor.href=info.fallback.href;anchor.title=info.fallback.title;anchor.className=info.fallback.className;anchor.textContent=info.fallback.textContent;anchor[_infoSymbol]=info.fallback[_infoSymbol];}}}
maybeLinkifyScriptLocation(target,scriptId,sourceURL,lineNumber,columnNumber,classes){let fallbackAnchor=null;if(sourceURL){fallbackAnchor=Linkifier.linkifyURL(sourceURL,{className:classes,lineNumber:lineNumber,columnNumber:columnNumber,maxLength:this._maxLength});}
if(!target||target.isDisposed()){return fallbackAnchor;}
const debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel){return fallbackAnchor;}
const rawLocation=(scriptId?debuggerModel.createRawLocationByScriptId(scriptId,lineNumber,columnNumber||0):null)||debuggerModel.createRawLocationByURL(sourceURL,lineNumber,columnNumber||0);if(!rawLocation){return fallbackAnchor;}
const anchor=Linkifier._createLink('',classes||'');const info=Linkifier._linkInfo(anchor);info.enableDecorator=this._useLinkDecorator;info.fallback=fallbackAnchor;info.liveLocation=Bindings.debuggerWorkspaceBinding.createLiveLocation(rawLocation,this._updateAnchor.bind(this,anchor),(this._locationPoolByTarget.get(rawLocation.debuggerModel.target())));const anchors=(this._anchorsByTarget.get(rawLocation.debuggerModel.target()));anchors.push(anchor);return anchor;}
linkifyScriptLocation(target,scriptId,sourceURL,lineNumber,columnNumber,classes){const scriptLink=this.maybeLinkifyScriptLocation(target,scriptId,sourceURL,lineNumber,columnNumber,classes);return scriptLink||Linkifier.linkifyURL(sourceURL,{className:classes,lineNumber:lineNumber,columnNumber:columnNumber,maxLength:this._maxLength});}
linkifyRawLocation(rawLocation,fallbackUrl,classes){return this.linkifyScriptLocation(rawLocation.debuggerModel.target(),rawLocation.scriptId,fallbackUrl,rawLocation.lineNumber,rawLocation.columnNumber,classes);}
maybeLinkifyConsoleCallFrame(target,callFrame,classes){return this.maybeLinkifyScriptLocation(target,callFrame.scriptId,callFrame.url,callFrame.lineNumber,callFrame.columnNumber,classes);}
linkifyStackTraceTopFrame(target,stackTrace,classes){console.assert(stackTrace.callFrames&&stackTrace.callFrames.length);const topFrame=stackTrace.callFrames[0];const fallbackAnchor=Linkifier.linkifyURL(topFrame.url,{className:classes,lineNumber:topFrame.lineNumber,columnNumber:topFrame.columnNumber,maxLength:this._maxLength});if(target.isDisposed()){return fallbackAnchor;}
const debuggerModel=target.model(SDK.DebuggerModel);const rawLocations=debuggerModel.createRawLocationsByStackTrace(stackTrace);if(rawLocations.length===0){return fallbackAnchor;}
const anchor=Linkifier._createLink('',classes||'');const info=Linkifier._linkInfo(anchor);info.enableDecorator=this._useLinkDecorator;info.fallback=fallbackAnchor;info.liveLocation=Bindings.debuggerWorkspaceBinding.createStackTraceTopFrameLiveLocation(rawLocations,this._updateAnchor.bind(this,anchor),(this._locationPoolByTarget.get(target)));const anchors=(this._anchorsByTarget.get(target));anchors.push(anchor);return anchor;}
linkifyCSSLocation(rawLocation,classes){const anchor=Linkifier._createLink('',classes||'');const info=Linkifier._linkInfo(anchor);info.enableDecorator=this._useLinkDecorator;info.liveLocation=Bindings.cssWorkspaceBinding.createLiveLocation(rawLocation,this._updateAnchor.bind(this,anchor),(this._locationPoolByTarget.get(rawLocation.cssModel().target())));const anchors=(this._anchorsByTarget.get(rawLocation.cssModel().target()));anchors.push(anchor);return anchor;}
reset(){for(const target of this._anchorsByTarget.keysArray()){this.targetRemoved(target);this.targetAdded(target);}}
dispose(){for(const target of this._anchorsByTarget.keysArray()){this.targetRemoved(target);}
SDK.targetManager.unobserveTargets(this);_instances.delete(this);}
_updateAnchor(anchor,liveLocation){Linkifier._unbindUILocation(anchor);const uiLocation=liveLocation.uiLocation();if(!uiLocation){return;}
Linkifier._bindUILocation(anchor,uiLocation);const text=uiLocation.linkText(true);Linkifier._setTrimmedText(anchor,text,this._maxLength);let titleText=uiLocation.uiSourceCode.url();if(typeof uiLocation.lineNumber==='number'){titleText+=':'+(uiLocation.lineNumber+1);}
anchor.title=titleText;anchor.classList.toggle('webkit-html-blackbox-link',liveLocation.isBlackboxed());Linkifier._updateLinkDecorations(anchor);}
static _updateLinkDecorations(anchor){const info=Linkifier._linkInfo(anchor);if(!info||!info.enableDecorator){return;}
if(!_decorator||!info.uiLocation){return;}
if(info.icon&&info.icon.parentElement){anchor.removeChild(info.icon);}
const icon=_decorator.linkIcon(info.uiLocation.uiSourceCode);if(icon){icon.style.setProperty('margin-right','2px');anchor.insertBefore(icon,anchor.firstChild);}
info.icon=icon;}
static linkifyURL(url,options){options=options||{};const text=options.text;const className=options.className||'';const lineNumber=options.lineNumber;const columnNumber=options.columnNumber;const preventClick=options.preventClick;const maxLength=options.maxLength||UI.MaxLengthForDisplayedURLs;if(!url||url.trim().toLowerCase().startsWith('javascript:')){const element=createElementWithClass('span',className);element.textContent=text||url||Common.UIString('(unknown)');return element;}
let linkText=text||Bindings.displayNameForURL(url);if(typeof lineNumber==='number'&&!text){linkText+=':'+(lineNumber+1);}
const title=linkText!==url?url:'';const link=Linkifier._createLink(linkText,className,maxLength,title,url,preventClick);const info=Linkifier._linkInfo(link);if(typeof lineNumber==='number'){info.lineNumber=lineNumber;}
if(typeof columnNumber==='number'){info.columnNumber=columnNumber;}
return link;}
static linkifyRevealable(revealable,text,fallbackHref){const link=Linkifier._createLink(text,'',UI.MaxLengthForDisplayedURLs,undefined,fallbackHref);Linkifier._linkInfo(link).revealable=revealable;return link;}
static _createLink(text,className,maxLength,title,href,preventClick){const link=createElementWithClass('span',className);link.classList.add('devtools-link');if(title){link.title=title;}
if(href){link.href=href;}
Linkifier._setTrimmedText(link,text,maxLength);link[_infoSymbol]={icon:null,enableDecorator:false,uiLocation:null,liveLocation:null,url:href||null,lineNumber:null,columnNumber:null,revealable:null,fallback:null};if(!preventClick){link.addEventListener('click',event=>{if(Linkifier._handleClick(event)){event.consume(true);}},false);link.addEventListener('keydown',event=>{if(isEnterKey(event)&&Linkifier._handleClick(event)){event.consume(true);}},false);}else{link.classList.add('devtools-link-prevent-click');}
UI.ARIAUtils.markAsLink(link);return link;}
static _setTrimmedText(link,text,maxLength){link.removeChildren();if(maxLength&&text.length>maxLength){const middleSplit=splitMiddle(text,maxLength);appendTextWithoutHashes(middleSplit[0]);appendHiddenText(middleSplit[1]);appendTextWithoutHashes(middleSplit[2]);}else{appendTextWithoutHashes(text);}
function appendHiddenText(string){const ellipsisNode=link.createChild('span','devtools-link-ellipsis').createTextChild('\u2026');ellipsisNode[_untruncatedNodeTextSymbol]=string;}
function appendTextWithoutHashes(string){const hashSplit=TextUtils.TextUtils.splitStringByRegexes(string,[/[a-f0-9]{20,}/g]);for(const match of hashSplit){if(match.regexIndex===-1){link.createTextChild(match.value);}else{link.createTextChild(match.value.substring(0,7));appendHiddenText(match.value.substring(7));}}}
function splitMiddle(string,maxLength){let leftIndex=Math.floor(maxLength/2);let rightIndex=string.length-Math.ceil(maxLength/2)+1;if(string.codePointAt(rightIndex-1)>=0x10000){rightIndex++;leftIndex++;}
if(leftIndex>0&&string.codePointAt(leftIndex-1)>=0x10000){leftIndex--;}
return[string.substring(0,leftIndex),string.substring(leftIndex,rightIndex),string.substring(rightIndex)];}}
static untruncatedNodeText(node){return node[_untruncatedNodeTextSymbol]||node.textContent;}
static _linkInfo(link){return(link?link[_infoSymbol]||null:null);}
static _handleClick(event){const link=(event.currentTarget);if(UI.isBeingEdited((event.target))||link.hasSelection()){return false;}
return Components.Linkifier.invokeFirstAction(link);}
static invokeFirstAction(link){const actions=Components.Linkifier._linkActions(link);if(actions.length){actions[0].handler.call(null);return true;}
return false;}
static _linkHandlerSetting(){if(!Linkifier._linkHandlerSettingInstance){Linkifier._linkHandlerSettingInstance=Common.settings.createSetting('openLinkHandler',ls`auto`);}
return Linkifier._linkHandlerSettingInstance;}
static registerLinkHandler(title,handler){_linkHandlers.set(title,handler);self.runtime.sharedInstance(LinkHandlerSettingUI)._update();}
static unregisterLinkHandler(title){_linkHandlers.delete(title);self.runtime.sharedInstance(LinkHandlerSettingUI)._update();}
static uiLocation(link){const info=Linkifier._linkInfo(link);return info?info.uiLocation:null;}
static _linkActions(link){const info=Linkifier._linkInfo(link);const result=[];if(!info){return result;}
let url='';let uiLocation=null;if(info.uiLocation){uiLocation=info.uiLocation;url=uiLocation.uiSourceCode.contentURL();}else if(info.url){url=info.url;const uiSourceCode=Workspace.workspace.uiSourceCodeForURL(url)||Workspace.workspace.uiSourceCodeForURL(Common.ParsedURL.urlWithoutHash(url));uiLocation=uiSourceCode?uiSourceCode.uiLocation(info.lineNumber||0,info.columnNumber||0):null;}
const resource=url?Bindings.resourceForURL(url):null;const contentProvider=uiLocation?uiLocation.uiSourceCode:resource;const revealable=info.revealable||uiLocation||resource;if(revealable){const destination=Common.Revealer.revealDestination(revealable);result.push({section:'reveal',title:destination?ls`Reveal in ${destination}`:ls`Reveal`,handler:()=>Common.Revealer.reveal(revealable)});}
if(contentProvider){const lineNumber=uiLocation?uiLocation.lineNumber:info.lineNumber||0;for(const title of _linkHandlers.keys()){const handler=_linkHandlers.get(title);const action={section:'reveal',title:Common.UIString('Open using %s',title),handler:handler.bind(null,contentProvider,lineNumber)};if(title===Linkifier._linkHandlerSetting().get()){result.unshift(action);}else{result.push(action);}}}
if(resource||info.url){result.push({section:'reveal',title:UI.openLinkExternallyLabel(),handler:()=>Host.InspectorFrontendHost.openInNewTab(url)});result.push({section:'clipboard',title:UI.copyLinkAddressLabel(),handler:()=>Host.InspectorFrontendHost.copyText(url)});}
return result;}}
export const _instances=new Set();export let _decorator=null;export const _sourceCodeAnchors=Symbol('Linkifier.anchors');export const _infoSymbol=Symbol('Linkifier.info');export const _untruncatedNodeTextSymbol=Symbol('Linkifier.untruncatedNodeText');export const MaxLengthToIgnoreLinkifier=10000;export const _linkHandlers=new Map();export class LinkDecorator{linkIcon(uiSourceCode){}}
LinkDecorator.Events={LinkIconChanged:Symbol('LinkIconChanged')};export class LinkContextMenuProvider{appendApplicableItems(event,contextMenu,target){let targetNode=(target);while(targetNode&&!targetNode[_infoSymbol]){targetNode=targetNode.parentNodeOrShadowHost();}
const link=(targetNode);const actions=Linkifier._linkActions(link);for(const action of actions){contextMenu.section(action.section).appendItem(action.title,action.handler);}}}
export class LinkHandlerSettingUI{constructor(){this._element=createElementWithClass('select','chrome-select');this._element.addEventListener('change',this._onChange.bind(this),false);this._update();}
_update(){this._element.removeChildren();const names=_linkHandlers.keysArray();names.unshift(Common.UIString('auto'));for(const name of names){const option=createElement('option');option.textContent=name;option.selected=name===Linkifier._linkHandlerSetting().get();this._element.appendChild(option);}
this._element.disabled=names.length<=1;}
_onChange(event){const value=event.target.value;Linkifier._linkHandlerSetting().set(value);}
settingElement(){return UI.SettingsUI.createCustomSetting(Common.UIString('Link handling:'),this._element);}}
export class ContentProviderContextMenuProvider{appendApplicableItems(event,contextMenu,target){const contentProvider=(target);if(!contentProvider.contentURL()){return;}
contextMenu.revealSection().appendItem(UI.openLinkExternallyLabel(),()=>Host.InspectorFrontendHost.openInNewTab(contentProvider.contentURL()));for(const title of _linkHandlers.keys()){const handler=_linkHandlers.get(title);contextMenu.revealSection().appendItem(Common.UIString('Open using %s',title),handler.bind(null,contentProvider,0));}
if(contentProvider instanceof SDK.NetworkRequest){return;}
contextMenu.clipboardSection().appendItem(UI.copyLinkAddressLabel(),()=>Host.InspectorFrontendHost.copyText(contentProvider.contentURL()));}}
self.Components=self.Components||{};Components=Components||{};Components.Linkifier=Linkifier;Components.Linkifier._instances=_instances;Components.Linkifier._decorator=_decorator;Components.Linkifier._sourceCodeAnchors=_sourceCodeAnchors;Components.Linkifier._infoSymbol=_infoSymbol;Components.Linkifier._untruncatedNodeTextSymbol=_untruncatedNodeTextSymbol;Components.Linkifier.MaxLengthToIgnoreLinkifier=MaxLengthToIgnoreLinkifier;Components.Linkifier._linkHandlers=_linkHandlers;Components.Linkifier.LinkContextMenuProvider=LinkContextMenuProvider;Components.Linkifier.LinkHandlerSettingUI=LinkHandlerSettingUI;Components.Linkifier.ContentProviderContextMenuProvider=ContentProviderContextMenuProvider;Components.LinkDecorator=LinkDecorator;Components._LinkInfo;Components.LinkifyURLOptions;Components.Linkifier.LinkHandler;