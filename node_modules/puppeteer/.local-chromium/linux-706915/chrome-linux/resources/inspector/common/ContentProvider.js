Common.DeferredContent;export default class ContentProvider{contentURL(){}
contentType(){}
contentEncoded(){}
requestContent(){}
searchInContent(query,caseSensitive,isRegex){}}
export class SearchMatch{constructor(lineNumber,lineContent){this.lineNumber=lineNumber;this.lineContent=lineContent;}}
export const performSearchInContent=function(content,query,caseSensitive,isRegex){const regex=createSearchRegex(query,caseSensitive,isRegex);const text=new TextUtils.Text(content);const result=[];for(let i=0;i<text.lineCount();++i){const lineContent=text.lineAt(i);regex.lastIndex=0;if(regex.exec(lineContent)){result.push(new Common.ContentProvider.SearchMatch(i,lineContent));}}
return result;};export const contentAsDataURL=function(content,mimeType,contentEncoded,charset){const maxDataUrlSize=1024*1024;if(content===null||content.length>maxDataUrlSize){return null;}
return'data:'+mimeType+(charset?';charset='+charset:'')+(contentEncoded?';base64':'')+','+
content;};self.Common=self.Common||{};Common=Common||{};Common.ContentProvider=ContentProvider;Common.ContentProvider.SearchMatch=SearchMatch;Common.ContentProvider.performSearchInContent=performSearchInContent;Common.ContentProvider.contentAsDataURL=contentAsDataURL;