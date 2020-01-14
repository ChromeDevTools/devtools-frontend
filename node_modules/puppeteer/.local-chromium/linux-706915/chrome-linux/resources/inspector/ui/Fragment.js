export default class Fragment{constructor(element){this._element=element;this._elementsById=new Map();}
element(){return this._element;}
$(elementId){return this._elementsById.get(elementId);}
static build(strings,...values){return Fragment._render(Fragment._template(strings),values);}
static cached(strings,...values){let template=Fragment._templateCache.get(strings);if(!template){template=Fragment._template(strings);Fragment._templateCache.set(strings,template);}
return Fragment._render(template,values);}
static _template(strings){let html='';let insideText=true;for(let i=0;i<strings.length-1;i++){html+=strings[i];const close=strings[i].lastIndexOf('>');const open=strings[i].indexOf('<',close+1);if(close!==-1&&open===-1){insideText=true;}else if(open!==-1){insideText=false;}
html+=insideText?Fragment._textMarker:Fragment._attributeMarker(i);}
html+=strings[strings.length-1];const template=window.document.createElement('template');template.innerHTML=html;const walker=template.ownerDocument.createTreeWalker(template.content,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,null,false);let valueIndex=0;const emptyTextNodes=[];const binds=[];const nodesToMark=[];while(walker.nextNode()){const node=walker.currentNode;if(node.nodeType===Node.ELEMENT_NODE&&node.hasAttributes()){if(node.hasAttribute('$')){nodesToMark.push(node);binds.push({elementId:node.getAttribute('$')});node.removeAttribute('$');}
const attributesToRemove=[];for(let i=0;i<node.attributes.length;i++){const name=node.attributes[i].name;if(!Fragment._attributeMarkerRegex.test(name)&&!Fragment._attributeMarkerRegex.test(node.attributes[i].value)){continue;}
attributesToRemove.push(name);nodesToMark.push(node);const bind={attr:{index:valueIndex}};bind.attr.names=name.split(Fragment._attributeMarkerRegex);valueIndex+=bind.attr.names.length-1;bind.attr.values=node.attributes[i].value.split(Fragment._attributeMarkerRegex);valueIndex+=bind.attr.values.length-1;binds.push(bind);}
for(let i=0;i<attributesToRemove.length;i++){node.removeAttribute(attributesToRemove[i]);}}
if(node.nodeType===Node.TEXT_NODE&&node.data.indexOf(Fragment._textMarker)!==-1){const texts=node.data.split(Fragment._textMarkerRegex);node.data=texts[texts.length-1];for(let i=0;i<texts.length-1;i++){if(texts[i]){node.parentNode.insertBefore(createTextNode(texts[i]),node);}
const nodeToReplace=createElement('span');nodesToMark.push(nodeToReplace);binds.push({replaceNodeIndex:valueIndex++});node.parentNode.insertBefore(nodeToReplace,node);}}
if(node.nodeType===Node.TEXT_NODE&&(!node.previousSibling||node.previousSibling.nodeType===Node.ELEMENT_NODE)&&(!node.nextSibling||node.nextSibling.nodeType===Node.ELEMENT_NODE)&&/^\s*$/.test(node.data)){emptyTextNodes.push(node);}}
for(let i=0;i<nodesToMark.length;i++){nodesToMark[i].classList.add(Fragment._class(i));}
for(const emptyTextNode of emptyTextNodes){emptyTextNode.remove();}
return{template:template,binds:binds};}
static _render(template,values){const content=template.template.ownerDocument.importNode(template.template.content,true);const resultElement=(content.firstChild===content.lastChild?content.firstChild:content);const result=new Fragment(resultElement);const boundElements=[];for(let i=0;i<template.binds.length;i++){const className=Fragment._class(i);const element=(content.querySelector('.'+className));element.classList.remove(className);boundElements.push(element);}
for(let bindIndex=0;bindIndex<template.binds.length;bindIndex++){const bind=template.binds[bindIndex];const element=boundElements[bindIndex];if('elementId'in bind){result._elementsById.set((bind.elementId),element);}else if('replaceNodeIndex'in bind){const value=values[(bind.replaceNodeIndex)];element.parentNode.replaceChild(this._nodeForValue(value),element);}else if('attr'in bind){if(bind.attr.names.length===2&&bind.attr.values.length===1&&typeof values[bind.attr.index]==='function'){values[bind.attr.index].call(null,element);}else{let name=bind.attr.names[0];for(let i=1;i<bind.attr.names.length;i++){name+=values[bind.attr.index+i-1];name+=bind.attr.names[i];}
if(name){let value=bind.attr.values[0];for(let i=1;i<bind.attr.values.length;i++){value+=values[bind.attr.index+bind.attr.names.length-1+i-1];value+=bind.attr.values[i];}
element.setAttribute(name,value);}}}else{throw new Error('Unexpected bind');}}
return result;}
static _nodeForValue(value){if(value instanceof Node){return value;}
if(value instanceof Fragment){return value._element;}
if(Array.isArray(value)){const node=createDocumentFragment();for(const v of value){node.appendChild(this._nodeForValue(v));}
return node;}
return createTextNode(''+value);}}
export const _textMarker='{{template-text}}';export const _textMarkerRegex=/{{template-text}}/;export const _attributeMarker=index=>'template-attribute'+index;export const _attributeMarkerRegex=/template-attribute\d+/;export const _class=index=>'template-class-'+index;export const _templateCache=new Map();export const html=(strings,...vararg)=>{return Fragment.cached(strings,...vararg).element();};self.UI=self.UI||{};UI=UI||{};UI.Fragment=Fragment;UI.Fragment._textMarker=_textMarker;UI.Fragment._textMarkerRegex=_textMarkerRegex;UI.Fragment._attributeMarker=_attributeMarker;UI.Fragment._attributeMarkerRegex=_attributeMarkerRegex;UI.Fragment._class=_class;UI.Fragment._templateCache=_templateCache;UI.html=html;UI.Fragment._Template;UI.Fragment._Bind;