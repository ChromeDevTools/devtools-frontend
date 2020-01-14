export default class FilterSuggestionBuilder{constructor(keys,valueSorter){this._keys=keys;this._valueSorter=valueSorter||((key,result)=>result.sort());this._valuesMap=new Map();}
completions(expression,prefix,force){if(!prefix&&!force){return Promise.resolve([]);}
const negative=prefix.startsWith('-');if(negative){prefix=prefix.substring(1);}
const modifier=negative?'-':'';const valueDelimiterIndex=prefix.indexOf(':');const suggestions=[];if(valueDelimiterIndex===-1){const matcher=new RegExp('^'+prefix.escapeForRegExp(),'i');for(const key of this._keys){if(matcher.test(key)){suggestions.push({text:modifier+key+':'});}}}else{const key=prefix.substring(0,valueDelimiterIndex).toLowerCase();const value=prefix.substring(valueDelimiterIndex+1);const matcher=new RegExp('^'+value.escapeForRegExp(),'i');const values=Array.from(this._valuesMap.get(key)||new Set());this._valueSorter(key,values);for(const item of values){if(matcher.test(item)&&(item!==value)){suggestions.push({text:modifier+key+':'+item});}}}
return Promise.resolve(suggestions);}
addItem(key,value){if(!value){return;}
if(!this._valuesMap.get(key)){this._valuesMap.set(key,(new Set()));}
this._valuesMap.get(key).add(value);}
clear(){this._valuesMap.clear();}}
self.UI=self.UI||{};UI=UI||{};UI.FilterSuggestionBuilder=FilterSuggestionBuilder;