export class DOMNode{constructor(domModel){this._domModel=domModel;}
static create(domModel,doc,isInShadowTree,payload){const node=new SDK.DOMNode(domModel);node._init(doc,isInShadowTree,payload);return node;}
_init(doc,isInShadowTree,payload){this._agent=this._domModel._agent;this.ownerDocument=doc;this._isInShadowTree=isInShadowTree;this.id=payload.nodeId;this._backendNodeId=payload.backendNodeId;this._domModel._idToDOMNode[this.id]=this;this._nodeType=payload.nodeType;this._nodeName=payload.nodeName;this._localName=payload.localName;this._nodeValue=payload.nodeValue;this._pseudoType=payload.pseudoType;this._shadowRootType=payload.shadowRootType;this._frameOwnerFrameId=payload.frameId||null;this._xmlVersion=payload.xmlVersion;this._isSVGNode=!!payload.isSVG;this._creationStackTrace=null;this._shadowRoots=[];this._attributes=[];this._attributesMap={};if(payload.attributes){this._setAttributesPayload(payload.attributes);}
this._markers=new Map();this._subtreeMarkerCount=0;this._childNodeCount=payload.childNodeCount||0;this._children=null;this.nextSibling=null;this.previousSibling=null;this.firstChild=null;this.lastChild=null;this.parentNode=null;if(payload.shadowRoots){for(let i=0;i<payload.shadowRoots.length;++i){const root=payload.shadowRoots[i];const node=SDK.DOMNode.create(this._domModel,this.ownerDocument,true,root);this._shadowRoots.push(node);node.parentNode=this;}}
if(payload.templateContent){this._templateContent=SDK.DOMNode.create(this._domModel,this.ownerDocument,true,payload.templateContent);this._templateContent.parentNode=this;this._children=[];}
if(payload.contentDocument){this._contentDocument=new DOMDocument(this._domModel,payload.contentDocument);this._contentDocument.parentNode=this;this._children=[];}else if((payload.nodeName==='IFRAME'||payload.nodeName==='PORTAL')&&payload.frameId){const childTarget=SDK.targetManager.targetById(payload.frameId);const childModel=childTarget?childTarget.model(DOMModel):null;if(childModel){this._childDocumentPromiseForTesting=childModel.requestDocument();}
this._children=[];}
if(payload.importedDocument){this._importedDocument=SDK.DOMNode.create(this._domModel,this.ownerDocument,true,payload.importedDocument);this._importedDocument.parentNode=this;this._children=[];}
if(payload.distributedNodes){this._setDistributedNodePayloads(payload.distributedNodes);}
if(payload.children){this._setChildrenPayload(payload.children);}
this._setPseudoElements(payload.pseudoElements);if(this._nodeType===Node.ELEMENT_NODE){if(this.ownerDocument&&!this.ownerDocument.documentElement&&this._nodeName==='HTML'){this.ownerDocument.documentElement=this;}
if(this.ownerDocument&&!this.ownerDocument.body&&this._nodeName==='BODY'){this.ownerDocument.body=this;}}else if(this._nodeType===Node.DOCUMENT_TYPE_NODE){this.publicId=payload.publicId;this.systemId=payload.systemId;this.internalSubset=payload.internalSubset;}else if(this._nodeType===Node.ATTRIBUTE_NODE){this.name=payload.name;this.value=payload.value;}}
isSVGNode(){return this._isSVGNode;}
creationStackTrace(){if(this._creationStackTrace){return this._creationStackTrace;}
const stackTracesPromise=this._agent.invoke_getNodeStackTraces({nodeId:this.id});this._creationStackTrace=stackTracesPromise.then(res=>res.creation);return this._creationStackTrace;}
domModel(){return this._domModel;}
backendNodeId(){return this._backendNodeId;}
children(){return this._children?this._children.slice():null;}
hasAttributes(){return this._attributes.length>0;}
childNodeCount(){return this._childNodeCount;}
hasShadowRoots(){return!!this._shadowRoots.length;}
shadowRoots(){return this._shadowRoots.slice();}
templateContent(){return this._templateContent||null;}
contentDocument(){return this._contentDocument||null;}
isIframe(){return this._nodeName==='IFRAME';}
isPortal(){return this._nodeName==='PORTAL';}
importedDocument(){return this._importedDocument||null;}
nodeType(){return this._nodeType;}
nodeName(){return this._nodeName;}
pseudoType(){return this._pseudoType;}
hasPseudoElements(){return this._pseudoElements.size>0;}
pseudoElements(){return this._pseudoElements;}
beforePseudoElement(){if(!this._pseudoElements){return null;}
return this._pseudoElements.get(SDK.DOMNode.PseudoElementNames.Before);}
afterPseudoElement(){if(!this._pseudoElements){return null;}
return this._pseudoElements.get(SDK.DOMNode.PseudoElementNames.After);}
isInsertionPoint(){return!this.isXMLNode()&&(this._nodeName==='SHADOW'||this._nodeName==='CONTENT'||this._nodeName==='SLOT');}
distributedNodes(){return this._distributedNodes||[];}
isInShadowTree(){return this._isInShadowTree;}
ancestorShadowHost(){const ancestorShadowRoot=this.ancestorShadowRoot();return ancestorShadowRoot?ancestorShadowRoot.parentNode:null;}
ancestorShadowRoot(){if(!this._isInShadowTree){return null;}
let current=this;while(current&&!current.isShadowRoot()){current=current.parentNode;}
return current;}
ancestorUserAgentShadowRoot(){const ancestorShadowRoot=this.ancestorShadowRoot();if(!ancestorShadowRoot){return null;}
return ancestorShadowRoot.shadowRootType()===SDK.DOMNode.ShadowRootTypes.UserAgent?ancestorShadowRoot:null;}
isShadowRoot(){return!!this._shadowRootType;}
shadowRootType(){return this._shadowRootType||null;}
nodeNameInCorrectCase(){const shadowRootType=this.shadowRootType();if(shadowRootType){return'#shadow-root ('+shadowRootType+')';}
if(!this.localName()){return this.nodeName();}
if(this.localName().length!==this.nodeName().length){return this.nodeName();}
return this.localName();}
setNodeName(name,callback){this._agent.invoke_setNodeName({nodeId:this.id,name}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null,this._domModel.nodeForId(response.nodeId));}});}
localName(){return this._localName;}
nodeValue(){return this._nodeValue;}
setNodeValue(value,callback){this._agent.invoke_setNodeValue({nodeId:this.id,value}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null);}});}
getAttribute(name){const attr=this._attributesMap[name];return attr?attr.value:undefined;}
setAttribute(name,text,callback){this._agent.invoke_setAttributesAsText({nodeId:this.id,text,name}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null);}});}
setAttributeValue(name,value,callback){this._agent.invoke_setAttributeValue({nodeId:this.id,name,value}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null);}});}
setAttributeValuePromise(name,value){return new Promise(fulfill=>this.setAttributeValue(name,value,fulfill));}
attributes(){return this._attributes;}
async removeAttribute(name){const response=await this._agent.invoke_removeAttribute({nodeId:this.id,name});if(response[Protocol.Error]){return;}
delete this._attributesMap[name];const index=this._attributes.findIndex(attr=>attr.name===name);if(index!==-1){this._attributes.splice(index,1);}
this._domModel.markUndoableState();}
getChildNodes(callback){if(this._children){callback(this.children());return;}
this._agent.invoke_requestChildNodes({nodeId:this.id}).then(response=>{callback(response[Protocol.Error]?null:this.children());});}
async getSubtree(depth,pierce){const response=await this._agent.invoke_requestChildNodes({nodeId:this.id,depth:depth,pierce:pierce});return response[Protocol.Error]?null:this._children;}
getOuterHTML(){return this._agent.getOuterHTML(this.id);}
setOuterHTML(html,callback){this._agent.invoke_setOuterHTML({nodeId:this.id,outerHTML:html}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null);}});}
removeNode(callback){this._agent.invoke_removeNode({nodeId:this.id}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null);}});}
async copyNode(){const text=await this._agent.getOuterHTML(this.id);if(text!==null){Host.InspectorFrontendHost.copyText(text);}
return text;}
path(){function canPush(node){return node&&('index'in node||(node.isShadowRoot()&&node.parentNode))&&node._nodeName.length;}
const path=[];let node=this;while(canPush(node)){const index=typeof node.index==='number'?node.index:(node.shadowRootType()===SDK.DOMNode.ShadowRootTypes.UserAgent?'u':'a');path.push([index,node._nodeName]);node=node.parentNode;}
path.reverse();return path.join(',');}
isAncestor(node){if(!node){return false;}
let currentNode=node.parentNode;while(currentNode){if(this===currentNode){return true;}
currentNode=currentNode.parentNode;}
return false;}
isDescendant(descendant){return descendant!==null&&descendant.isAncestor(this);}
frameId(){let node=this.parentNode||this;while(!node._frameOwnerFrameId&&node.parentNode){node=node.parentNode;}
return node._frameOwnerFrameId;}
_setAttributesPayload(attrs){let attributesChanged=!this._attributes||attrs.length!==this._attributes.length*2;const oldAttributesMap=this._attributesMap||{};this._attributes=[];this._attributesMap={};for(let i=0;i<attrs.length;i+=2){const name=attrs[i];const value=attrs[i+1];this._addAttribute(name,value);if(attributesChanged){continue;}
if(!oldAttributesMap[name]||oldAttributesMap[name].value!==value){attributesChanged=true;}}
return attributesChanged;}
_insertChild(prev,payload){const node=SDK.DOMNode.create(this._domModel,this.ownerDocument,this._isInShadowTree,payload);this._children.splice(this._children.indexOf(prev)+1,0,node);this._renumber();return node;}
_removeChild(node){if(node.pseudoType()){this._pseudoElements.delete(node.pseudoType());}else{const shadowRootIndex=this._shadowRoots.indexOf(node);if(shadowRootIndex!==-1){this._shadowRoots.splice(shadowRootIndex,1);}else{console.assert(this._children.indexOf(node)!==-1);this._children.splice(this._children.indexOf(node),1);}}
node.parentNode=null;this._subtreeMarkerCount-=node._subtreeMarkerCount;if(node._subtreeMarkerCount){this._domModel.dispatchEventToListeners(Events.MarkersChanged,this);}
this._renumber();}
_setChildrenPayload(payloads){this._children=[];for(let i=0;i<payloads.length;++i){const payload=payloads[i];const node=SDK.DOMNode.create(this._domModel,this.ownerDocument,this._isInShadowTree,payload);this._children.push(node);}
this._renumber();}
_setPseudoElements(payloads){this._pseudoElements=new Map();if(!payloads){return;}
for(let i=0;i<payloads.length;++i){const node=SDK.DOMNode.create(this._domModel,this.ownerDocument,this._isInShadowTree,payloads[i]);node.parentNode=this;this._pseudoElements.set(node.pseudoType(),node);}}
_setDistributedNodePayloads(payloads){this._distributedNodes=[];for(const payload of payloads){this._distributedNodes.push(new DOMNodeShortcut(this._domModel.target(),payload.backendNodeId,payload.nodeType,payload.nodeName));}}
_renumber(){this._childNodeCount=this._children.length;if(this._childNodeCount===0){this.firstChild=null;this.lastChild=null;return;}
this.firstChild=this._children[0];this.lastChild=this._children[this._childNodeCount-1];for(let i=0;i<this._childNodeCount;++i){const child=this._children[i];child.index=i;child.nextSibling=i+1<this._childNodeCount?this._children[i+1]:null;child.previousSibling=i-1>=0?this._children[i-1]:null;child.parentNode=this;}}
_addAttribute(name,value){const attr={name:name,value:value,_node:this};this._attributesMap[name]=attr;this._attributes.push(attr);}
_setAttribute(name,value){const attr=this._attributesMap[name];if(attr){attr.value=value;}else{this._addAttribute(name,value);}}
_removeAttribute(name){const attr=this._attributesMap[name];if(attr){this._attributes.remove(attr);delete this._attributesMap[name];}}
copyTo(targetNode,anchorNode,callback){this._agent.invoke_copyTo({nodeId:this.id,targetNodeId:targetNode.id,insertBeforeNodeId:anchorNode?anchorNode.id:undefined}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null,response.nodeId);}});}
moveTo(targetNode,anchorNode,callback){this._agent.invoke_moveTo({nodeId:this.id,targetNodeId:targetNode.id,insertBeforeNodeId:anchorNode?anchorNode.id:undefined}).then(response=>{if(!response[Protocol.Error]){this._domModel.markUndoableState();}
if(callback){callback(response[Protocol.Error]||null,this._domModel.nodeForId(response.nodeId));}});}
isXMLNode(){return!!this._xmlVersion;}
setMarker(name,value){if(value===null){if(!this._markers.has(name)){return;}
this._markers.delete(name);for(let node=this;node;node=node.parentNode){--node._subtreeMarkerCount;}
for(let node=this;node;node=node.parentNode){this._domModel.dispatchEventToListeners(Events.MarkersChanged,node);}
return;}
if(this.parentNode&&!this._markers.has(name)){for(let node=this;node;node=node.parentNode){++node._subtreeMarkerCount;}}
this._markers.set(name,value);for(let node=this;node;node=node.parentNode){this._domModel.dispatchEventToListeners(Events.MarkersChanged,node);}}
marker(name){return this._markers.get(name)||null;}
traverseMarkers(visitor){function traverse(node){if(!node._subtreeMarkerCount){return;}
for(const marker of node._markers.keys()){visitor(node,marker);}
if(!node._children){return;}
for(const child of node._children){traverse(child);}}
traverse(this);}
resolveURL(url){if(!url){return url;}
for(let frameOwnerCandidate=this;frameOwnerCandidate;frameOwnerCandidate=frameOwnerCandidate.parentNode){if(frameOwnerCandidate.baseURL){return Common.ParsedURL.completeURL(frameOwnerCandidate.baseURL,url);}}
return null;}
highlight(mode){this._domModel.overlayModel().highlightInOverlay({node:this},mode);}
highlightForTwoSeconds(){this._domModel.overlayModel().highlightInOverlayForTwoSeconds({node:this});}
async resolveToObject(objectGroup){const object=await this._agent.resolveNode(this.id,undefined,objectGroup);return object&&this._domModel._runtimeModel.createRemoteObject(object);}
boxModel(){return this._agent.getBoxModel(this.id);}
setAsInspectedNode(){let node=this;while(true){let ancestor=node.ancestorUserAgentShadowRoot();if(!ancestor){break;}
ancestor=node.ancestorShadowHost();if(!ancestor){break;}
node=ancestor;}
this._agent.setInspectedNode(node.id);}
enclosingElementOrSelf(){let node=this;if(node&&node.nodeType()===Node.TEXT_NODE&&node.parentNode){node=node.parentNode;}
if(node&&node.nodeType()!==Node.ELEMENT_NODE){node=null;}
return node;}
async scrollIntoView(){const node=this.enclosingElementOrSelf();const object=await node.resolveToObject();if(!object){return;}
object.callFunction(scrollIntoView);object.release();node.highlightForTwoSeconds();function scrollIntoView(){this.scrollIntoViewIfNeeded(true);}}
async focus(){const node=this.enclosingElementOrSelf();const object=await node.resolveToObject();if(!object){return;}
await object.callFunction(focusInPage);object.release();node.highlightForTwoSeconds();this._domModel.target().pageAgent().bringToFront();function focusInPage(){this.focus();}}
simpleSelector(){const lowerCaseName=this.localName()||this.nodeName().toLowerCase();if(this.nodeType()!==Node.ELEMENT_NODE){return lowerCaseName;}
if(lowerCaseName==='input'&&this.getAttribute('type')&&!this.getAttribute('id')&&!this.getAttribute('class')){return lowerCaseName+'[type="'+this.getAttribute('type')+'"]';}
if(this.getAttribute('id')){return lowerCaseName+'#'+this.getAttribute('id');}
if(this.getAttribute('class')){return(lowerCaseName==='div'?'':lowerCaseName)+'.'+
this.getAttribute('class').trim().replace(/\s+/g,'.');}
return lowerCaseName;}}
DOMNode.PseudoElementNames={Before:'before',After:'after'};DOMNode.ShadowRootTypes={UserAgent:'user-agent',Open:'open',Closed:'closed'};export class DeferredDOMNode{constructor(target,backendNodeId){this._domModel=(target.model(DOMModel));this._backendNodeId=backendNodeId;}
resolve(callback){this.resolvePromise().then(callback);}
async resolvePromise(){const nodeIds=await this._domModel.pushNodesByBackendIdsToFrontend(new Set([this._backendNodeId]));return nodeIds&&nodeIds.get(this._backendNodeId)||null;}
backendNodeId(){return this._backendNodeId;}
domModel(){return this._domModel;}
highlight(){this._domModel.overlayModel().highlightInOverlay({deferredNode:this});}}
export class DOMNodeShortcut{constructor(target,backendNodeId,nodeType,nodeName){this.nodeType=nodeType;this.nodeName=nodeName;this.deferredNode=new SDK.DeferredDOMNode(target,backendNodeId);}}
export class DOMDocument extends DOMNode{constructor(domModel,payload){super(domModel);this._init(this,false,payload);this.documentURL=payload.documentURL||'';this.baseURL=payload.baseURL||'';}}
export default class DOMModel extends SDK.SDKModel{constructor(target){super(target);this._agent=target.domAgent();this._idToDOMNode={};this._document=null;this._attributeLoadNodeIds=new Set();target.registerDOMDispatcher(new DOMDispatcher(this));this._runtimeModel=(target.model(SDK.RuntimeModel));if(!target.suspended()){this._agent.enable();}
if(Root.Runtime.experiments.isEnabled('captureNodeCreationStacks')){this._agent.setNodeStackTracesEnabled(true);}}
runtimeModel(){return this._runtimeModel;}
cssModel(){return(this.target().model(SDK.CSSModel));}
overlayModel(){return(this.target().model(SDK.OverlayModel));}
static cancelSearch(){for(const domModel of SDK.targetManager.models(DOMModel)){domModel._cancelSearch();}}
_scheduleMutationEvent(node){if(!this.hasEventListeners(Events.DOMMutated)){return;}
this._lastMutationId=(this._lastMutationId||0)+1;Promise.resolve().then(callObserve.bind(this,node,this._lastMutationId));function callObserve(node,mutationId){if(!this.hasEventListeners(Events.DOMMutated)||this._lastMutationId!==mutationId){return;}
this.dispatchEventToListeners(Events.DOMMutated,node);}}
requestDocument(){if(this._document){return Promise.resolve(this._document);}
if(!this._pendingDocumentRequestPromise){this._pendingDocumentRequestPromise=this._requestDocument();}
return this._pendingDocumentRequestPromise;}
async _requestDocument(){const documentPayload=await this._agent.getDocument();delete this._pendingDocumentRequestPromise;if(documentPayload){this._setDocument(documentPayload);}
if(!this._document){console.error('No document');return null;}
const parentModel=this.parentModel();if(parentModel&&!this._frameOwnerNode){await parentModel.requestDocument();const response=await parentModel._agent.invoke_getFrameOwner({frameId:this.target().id()});if(!response[Protocol.Error]){this._frameOwnerNode=parentModel.nodeForId(response.nodeId);}}
if(this._frameOwnerNode){const oldDocument=this._frameOwnerNode._contentDocument;this._frameOwnerNode._contentDocument=this._document;this._frameOwnerNode._children=[];if(this._document){this._document.parentNode=this._frameOwnerNode;this.dispatchEventToListeners(Events.NodeInserted,this._document);}else if(oldDocument){this.dispatchEventToListeners(Events.NodeRemoved,{node:oldDocument,parent:this._frameOwnerNode});}}
return this._document;}
existingDocument(){return this._document;}
async pushNodeToFrontend(objectId){await this.requestDocument();const nodeId=await this._agent.requestNode(objectId);return nodeId?this.nodeForId(nodeId):null;}
pushNodeByPathToFrontend(path){return this.requestDocument().then(()=>this._agent.pushNodeByPathToFrontend(path));}
async pushNodesByBackendIdsToFrontend(backendNodeIds){await this.requestDocument();const backendNodeIdsArray=backendNodeIds.valuesArray();const nodeIds=await this._agent.pushNodesByBackendIdsToFrontend(backendNodeIdsArray);if(!nodeIds){return null;}
const map=new Map();for(let i=0;i<nodeIds.length;++i){if(nodeIds[i]){map.set(backendNodeIdsArray[i],this.nodeForId(nodeIds[i]));}}
return map;}
_wrapClientCallback(callback){function wrapper(error,result){callback(error?null:result||null);}
return wrapper;}
_attributeModified(nodeId,name,value){const node=this._idToDOMNode[nodeId];if(!node){return;}
node._setAttribute(name,value);this.dispatchEventToListeners(Events.AttrModified,{node:node,name:name});this._scheduleMutationEvent(node);}
_attributeRemoved(nodeId,name){const node=this._idToDOMNode[nodeId];if(!node){return;}
node._removeAttribute(name);this.dispatchEventToListeners(Events.AttrRemoved,{node:node,name:name});this._scheduleMutationEvent(node);}
_inlineStyleInvalidated(nodeIds){this._attributeLoadNodeIds.addAll(nodeIds);if(!this._loadNodeAttributesTimeout){this._loadNodeAttributesTimeout=setTimeout(this._loadNodeAttributes.bind(this),20);}}
_loadNodeAttributes(){delete this._loadNodeAttributesTimeout;for(const nodeId of this._attributeLoadNodeIds){this._agent.getAttributes(nodeId).then(attributes=>{if(!attributes){return;}
const node=this._idToDOMNode[nodeId];if(!node){return;}
if(node._setAttributesPayload(attributes)){this.dispatchEventToListeners(Events.AttrModified,{node:node,name:'style'});this._scheduleMutationEvent(node);}});}
this._attributeLoadNodeIds.clear();}
_characterDataModified(nodeId,newValue){const node=this._idToDOMNode[nodeId];node._nodeValue=newValue;this.dispatchEventToListeners(Events.CharacterDataModified,node);this._scheduleMutationEvent(node);}
nodeForId(nodeId){return this._idToDOMNode[nodeId]||null;}
_documentUpdated(){const documentWasRequested=this._document||this._pendingDocumentRequestPromise;this._setDocument(null);if(this.parentModel()&&documentWasRequested){this.requestDocument();}}
_setDocument(payload){this._idToDOMNode={};if(payload&&'nodeId'in payload){this._document=new DOMDocument(this,payload);}else{this._document=null;}
SDK.domModelUndoStack._dispose(this);if(!this.parentModel()){this.dispatchEventToListeners(Events.DocumentUpdated,this);}}
_setDetachedRoot(payload){if(payload.nodeName==='#document'){new DOMDocument(this,payload);}else{SDK.DOMNode.create(this,null,false,payload);}}
_setChildNodes(parentId,payloads){if(!parentId&&payloads.length){this._setDetachedRoot(payloads[0]);return;}
const parent=this._idToDOMNode[parentId];parent._setChildrenPayload(payloads);}
_childNodeCountUpdated(nodeId,newValue){const node=this._idToDOMNode[nodeId];node._childNodeCount=newValue;this.dispatchEventToListeners(Events.ChildNodeCountUpdated,node);this._scheduleMutationEvent(node);}
_childNodeInserted(parentId,prevId,payload){const parent=this._idToDOMNode[parentId];const prev=this._idToDOMNode[prevId];const node=parent._insertChild(prev,payload);this._idToDOMNode[node.id]=node;this.dispatchEventToListeners(Events.NodeInserted,node);this._scheduleMutationEvent(node);}
_childNodeRemoved(parentId,nodeId){const parent=this._idToDOMNode[parentId];const node=this._idToDOMNode[nodeId];parent._removeChild(node);this._unbind(node);this.dispatchEventToListeners(Events.NodeRemoved,{node:node,parent:parent});this._scheduleMutationEvent(node);}
_shadowRootPushed(hostId,root){const host=this._idToDOMNode[hostId];if(!host){return;}
const node=SDK.DOMNode.create(this,host.ownerDocument,true,root);node.parentNode=host;this._idToDOMNode[node.id]=node;host._shadowRoots.unshift(node);this.dispatchEventToListeners(Events.NodeInserted,node);this._scheduleMutationEvent(node);}
_shadowRootPopped(hostId,rootId){const host=this._idToDOMNode[hostId];if(!host){return;}
const root=this._idToDOMNode[rootId];if(!root){return;}
host._removeChild(root);this._unbind(root);this.dispatchEventToListeners(Events.NodeRemoved,{node:root,parent:host});this._scheduleMutationEvent(root);}
_pseudoElementAdded(parentId,pseudoElement){const parent=this._idToDOMNode[parentId];if(!parent){return;}
const node=SDK.DOMNode.create(this,parent.ownerDocument,false,pseudoElement);node.parentNode=parent;this._idToDOMNode[node.id]=node;console.assert(!parent._pseudoElements.get(node.pseudoType()));parent._pseudoElements.set(node.pseudoType(),node);this.dispatchEventToListeners(Events.NodeInserted,node);this._scheduleMutationEvent(node);}
_pseudoElementRemoved(parentId,pseudoElementId){const parent=this._idToDOMNode[parentId];if(!parent){return;}
const pseudoElement=this._idToDOMNode[pseudoElementId];if(!pseudoElement){return;}
parent._removeChild(pseudoElement);this._unbind(pseudoElement);this.dispatchEventToListeners(Events.NodeRemoved,{node:pseudoElement,parent:parent});this._scheduleMutationEvent(pseudoElement);}
_distributedNodesUpdated(insertionPointId,distributedNodes){const insertionPoint=this._idToDOMNode[insertionPointId];if(!insertionPoint){return;}
insertionPoint._setDistributedNodePayloads(distributedNodes);this.dispatchEventToListeners(Events.DistributedNodesChanged,insertionPoint);this._scheduleMutationEvent(insertionPoint);}
_unbind(node){delete this._idToDOMNode[node.id];for(let i=0;node._children&&i<node._children.length;++i){this._unbind(node._children[i]);}
for(let i=0;i<node._shadowRoots.length;++i){this._unbind(node._shadowRoots[i]);}
const pseudoElements=node.pseudoElements();for(const value of pseudoElements.values()){this._unbind(value);}
if(node._templateContent){this._unbind(node._templateContent);}}
async performSearch(query,includeUserAgentShadowDOM){const response=await this._agent.invoke_performSearch({query,includeUserAgentShadowDOM});if(!response[Protocol.Error]){this._searchId=response.searchId;}
return response[Protocol.Error]?0:response.resultCount;}
async searchResult(index){if(!this._searchId){return null;}
const nodeIds=await this._agent.getSearchResults(this._searchId,index,index+1);return nodeIds&&nodeIds.length===1?this.nodeForId(nodeIds[0]):null;}
_cancelSearch(){if(!this._searchId){return;}
this._agent.discardSearchResults(this._searchId);delete this._searchId;}
classNamesPromise(nodeId){return this._agent.collectClassNamesFromSubtree(nodeId).then(classNames=>classNames||[]);}
querySelector(nodeId,selectors){return this._agent.querySelector(nodeId,selectors);}
querySelectorAll(nodeId,selectors){return this._agent.querySelectorAll(nodeId,selectors);}
markUndoableState(minorChange){SDK.domModelUndoStack._markUndoableState(this,minorChange||false);}
async nodeForLocation(x,y,includeUserAgentShadowDOM){const response=await this._agent.invoke_getNodeForLocation({x,y,includeUserAgentShadowDOM});if(response[Protocol.Error]||!response.nodeId){return null;}
return this.nodeForId(response.nodeId);}
pushObjectAsNodeToFrontend(object){return object.isNode()?this.pushNodeToFrontend((object.objectId)):Promise.resolve(null);}
suspendModel(){return this._agent.disable().then(()=>this._setDocument(null));}
resumeModel(){return this._agent.enable();}
dispose(){SDK.domModelUndoStack._dispose(this);}
parentModel(){const parentTarget=this.target().parentTarget();return parentTarget?parentTarget.model(DOMModel):null;}}
export const Events={AttrModified:Symbol('AttrModified'),AttrRemoved:Symbol('AttrRemoved'),CharacterDataModified:Symbol('CharacterDataModified'),DOMMutated:Symbol('DOMMutated'),NodeInserted:Symbol('NodeInserted'),NodeRemoved:Symbol('NodeRemoved'),DocumentUpdated:Symbol('DocumentUpdated'),ChildNodeCountUpdated:Symbol('ChildNodeCountUpdated'),DistributedNodesChanged:Symbol('DistributedNodesChanged'),MarkersChanged:Symbol('MarkersChanged')};export class DOMDispatcher{constructor(domModel){this._domModel=domModel;}
documentUpdated(){this._domModel._documentUpdated();}
attributeModified(nodeId,name,value){this._domModel._attributeModified(nodeId,name,value);}
attributeRemoved(nodeId,name){this._domModel._attributeRemoved(nodeId,name);}
inlineStyleInvalidated(nodeIds){this._domModel._inlineStyleInvalidated(nodeIds);}
characterDataModified(nodeId,characterData){this._domModel._characterDataModified(nodeId,characterData);}
setChildNodes(parentId,payloads){this._domModel._setChildNodes(parentId,payloads);}
childNodeCountUpdated(nodeId,childNodeCount){this._domModel._childNodeCountUpdated(nodeId,childNodeCount);}
childNodeInserted(parentNodeId,previousNodeId,payload){this._domModel._childNodeInserted(parentNodeId,previousNodeId,payload);}
childNodeRemoved(parentNodeId,nodeId){this._domModel._childNodeRemoved(parentNodeId,nodeId);}
shadowRootPushed(hostId,root){this._domModel._shadowRootPushed(hostId,root);}
shadowRootPopped(hostId,rootId){this._domModel._shadowRootPopped(hostId,rootId);}
pseudoElementAdded(parentId,pseudoElement){this._domModel._pseudoElementAdded(parentId,pseudoElement);}
pseudoElementRemoved(parentId,pseudoElementId){this._domModel._pseudoElementRemoved(parentId,pseudoElementId);}
distributedNodesUpdated(insertionPointId,distributedNodes){this._domModel._distributedNodesUpdated(insertionPointId,distributedNodes);}}
export class DOMModelUndoStack{constructor(){this._stack=[];this._index=0;this._lastModelWithMinorChange=null;}
_markUndoableState(model,minorChange){if(this._lastModelWithMinorChange&&model!==this._lastModelWithMinorChange){this._lastModelWithMinorChange.markUndoableState();this._lastModelWithMinorChange=null;}
if(minorChange&&this._lastModelWithMinorChange===model){return;}
this._stack=this._stack.slice(0,this._index);this._stack.push(model);this._index=this._stack.length;if(minorChange){this._lastModelWithMinorChange=model;}else{model._agent.markUndoableState();this._lastModelWithMinorChange=null;}}
undo(){if(this._index===0){return Promise.resolve();}
--this._index;this._lastModelWithMinorChange=null;return this._stack[this._index]._agent.undo();}
redo(){if(this._index>=this._stack.length){return Promise.resolve();}
++this._index;this._lastModelWithMinorChange=null;return this._stack[this._index-1]._agent.redo();}
_dispose(model){let shift=0;for(let i=0;i<this._index;++i){if(this._stack[i]===model){++shift;}}
this._stack.remove(model);this._index-=shift;if(this._lastModelWithMinorChange===model){this._lastModelWithMinorChange=null;}}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.DOMModel=DOMModel;SDK.DOMModel.Events=Events;SDK.DeferredDOMNode=DeferredDOMNode;SDK.DOMNodeShortcut=DOMNodeShortcut;SDK.DOMDocument=DOMDocument;SDK.DOMDispatcher=DOMDispatcher;SDK.DOMModelUndoStack=DOMModelUndoStack;SDK.DOMNode=DOMNode;SDK.domModelUndoStack=new DOMModelUndoStack();SDK.DOMNode.Attribute;SDK.SDKModel.register(DOMModel,SDK.Target.Capability.DOM,true);