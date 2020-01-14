self.mod=function(m,n){return((m%n)+n)%n;};String.prototype.findAll=function(string){const matches=[];let i=this.indexOf(string);while(i!==-1){matches.push(i);i=this.indexOf(string,i+string.length);}
return matches;};String.prototype.reverse=function(){return this.split('').reverse().join('');};String.prototype.replaceControlCharacters=function(){return this.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u0080-\u009f]/g,'�');};String.prototype.isWhitespace=function(){return/^\s*$/.test(this);};String.prototype.computeLineEndings=function(){const endings=this.findAll('\n');endings.push(this.length);return endings;};String.prototype.escapeCharacters=function(chars){let foundChar=false;for(let i=0;i<chars.length;++i){if(this.indexOf(chars.charAt(i))!==-1){foundChar=true;break;}}
if(!foundChar){return String(this);}
let result='';for(let i=0;i<this.length;++i){if(chars.indexOf(this.charAt(i))!==-1){result+='\\';}
result+=this.charAt(i);}
return result;};String.regexSpecialCharacters=function(){return'^[]{}()\\.^$*+?|-,';};String.prototype.escapeForRegExp=function(){return this.escapeCharacters(String.regexSpecialCharacters());};String.filterRegex=function(query){const toEscape=String.regexSpecialCharacters();let regexString='';for(let i=0;i<query.length;++i){let c=query.charAt(i);if(toEscape.indexOf(c)!==-1){c='\\'+c;}
if(i){regexString+='[^\\0'+c+']*';}
regexString+=c;}
return new RegExp(regexString,'i');};String.escapeInvalidUnicodeCharacters=function(text){if(!String._invalidCharactersRegExp){let invalidCharacters='';for(let i=0xfffe;i<=0x10ffff;i+=0x10000){invalidCharacters+=String.fromCodePoint(i,i+1);}
String._invalidCharactersRegExp=new RegExp(`[${invalidCharacters}\uD800-\uDFFF\uFDD0-\uFDEF]`,'gu');}
let result='';let lastPos=0;while(true){const match=String._invalidCharactersRegExp.exec(text);if(!match){break;}
result+=text.substring(lastPos,match.index)+'\\u'+text.charCodeAt(match.index).toString(16);if(match.index+1<String._invalidCharactersRegExp.lastIndex){result+='\\u'+text.charCodeAt(match.index+1).toString(16);}
lastPos=String._invalidCharactersRegExp.lastIndex;}
return result+text.substring(lastPos);};String.prototype.escapeHTML=function(){return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};String.prototype.unescapeHTML=function(){return this.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#58;/g,':').replace(/&quot;/g,'"').replace(/&#60;/g,'<').replace(/&#62;/g,'>').replace(/&amp;/g,'&');};String.prototype.collapseWhitespace=function(){return this.replace(/[\s\xA0]+/g,' ');};String.prototype.trimMiddle=function(maxLength){if(this.length<=maxLength){return String(this);}
let leftHalf=maxLength>>1;let rightHalf=maxLength-leftHalf-1;if(this.codePointAt(this.length-rightHalf-1)>=0x10000){--rightHalf;++leftHalf;}
if(leftHalf>0&&this.codePointAt(leftHalf-1)>=0x10000){--leftHalf;}
return this.substr(0,leftHalf)+'\u2026'+this.substr(this.length-rightHalf,rightHalf);};String.prototype.trimEndWithMaxLength=function(maxLength){if(this.length<=maxLength){return String(this);}
return this.substr(0,maxLength-1)+'\u2026';};String.prototype.trimURL=function(baseURLDomain){let result=this.replace(/^(https|http|file):\/\//i,'');if(baseURLDomain){if(result.toLowerCase().startsWith(baseURLDomain.toLowerCase())){result=result.substr(baseURLDomain.length);}}
return result;};String.prototype.toTitleCase=function(){return this.substring(0,1).toUpperCase()+this.substring(1);};String.prototype.compareTo=function(other){if(this>other){return 1;}
if(this<other){return-1;}
return 0;};String.prototype.removeURLFragment=function(){let fragmentIndex=this.indexOf('#');if(fragmentIndex===-1){fragmentIndex=this.length;}
return this.substring(0,fragmentIndex);};String.hashCode=function(string){if(!string){return 0;}
const p=((1<<30)*4-5);const z=0x5033d967;const z2=0x59d2f15d;let s=0;let zi=1;for(let i=0;i<string.length;i++){const xi=string.charCodeAt(i)*z2;s=(s+zi*xi)%p;zi=(zi*z)%p;}
s=(s+zi*(p-1))%p;return Math.abs(s|0);};String.isDigitAt=function(string,index){const c=string.charCodeAt(index);return(48<=c&&c<=57);};String.prototype.toBase64=function(){function encodeBits(b){return b<26?b+65:b<52?b+71:b<62?b-4:b===62?43:b===63?47:65;}
const encoder=new TextEncoder();const data=encoder.encode(this.toString());const n=data.length;let encoded='';if(n===0){return encoded;}
let shift;let v=0;for(let i=0;i<n;i++){shift=i%3;v|=data[i]<<(16>>>shift&24);if(shift===2){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),encodeBits(v&63));v=0;}}
if(shift===0){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),61,61);}else if(shift===1){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),61);}
return encoded;};String.naturalOrderComparator=function(a,b){const chunk=/^\d+|^\D+/;let chunka,chunkb,anum,bnum;while(1){if(a){if(!b){return 1;}}else{if(b){return-1;}else{return 0;}}
chunka=a.match(chunk)[0];chunkb=b.match(chunk)[0];anum=!isNaN(chunka);bnum=!isNaN(chunkb);if(anum&&!bnum){return-1;}
if(bnum&&!anum){return 1;}
if(anum&&bnum){const diff=chunka-chunkb;if(diff){return diff;}
if(chunka.length!==chunkb.length){if(!+chunka&&!+chunkb)
{return chunka.length-chunkb.length;}else{return chunkb.length-chunka.length;}}}else if(chunka!==chunkb){return(chunka<chunkb)?-1:1;}
a=a.substring(chunka.length);b=b.substring(chunkb.length);}};String.caseInsensetiveComparator=function(a,b){a=a.toUpperCase();b=b.toUpperCase();if(a===b){return 0;}
return a>b?1:-1;};Number.constrain=function(num,min,max){if(num<min){num=min;}else if(num>max){num=max;}
return num;};Number.gcd=function(a,b){if(b===0){return a;}else{return Number.gcd(b,a%b);}};Number.toFixedIfFloating=function(value){if(!value||isNaN(value)){return value;}
const number=Number(value);return number%1?number.toFixed(3):String(number);};Date.prototype.isValid=function(){return!isNaN(this.getTime());};Date.prototype.toISO8601Compact=function(){function leadZero(x){return(x>9?'':'0')+x;}
return this.getFullYear()+leadZero(this.getMonth()+1)+leadZero(this.getDate())+'T'+
leadZero(this.getHours())+leadZero(this.getMinutes())+leadZero(this.getSeconds());};Object.defineProperty(Array.prototype,'remove',{value:function(value,firstOnly){let index=this.indexOf(value);if(index===-1){return false;}
if(firstOnly){this.splice(index,1);return true;}
for(let i=index+1,n=this.length;i<n;++i){if(this[i]!==value){this[index++]=this[i];}}
this.length=index;return true;}});Object.defineProperty(Array.prototype,'pushAll',{value:function(array){for(let i=0;i<array.length;++i){this.push(array[i]);}}});Object.defineProperty(Array.prototype,'rotate',{value:function(index){const result=[];for(let i=index;i<index+this.length;++i){result.push(this[i%this.length]);}
return result;}});Object.defineProperty(Array.prototype,'sortNumbers',{value:function(){function numericComparator(a,b){return a-b;}
this.sort(numericComparator);}});(function(){const partition={value:function(comparator,left,right,pivotIndex){function swap(array,i1,i2){const temp=array[i1];array[i1]=array[i2];array[i2]=temp;}
const pivotValue=this[pivotIndex];swap(this,right,pivotIndex);let storeIndex=left;for(let i=left;i<right;++i){if(comparator(this[i],pivotValue)<0){swap(this,storeIndex,i);++storeIndex;}}
swap(this,right,storeIndex);return storeIndex;}};Object.defineProperty(Array.prototype,'partition',partition);Object.defineProperty(Uint32Array.prototype,'partition',partition);const sortRange={value:function(comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight){function quickSortRange(array,comparator,left,right,sortWindowLeft,sortWindowRight){if(right<=left){return;}
const pivotIndex=Math.floor(Math.random()*(right-left))+left;const pivotNewIndex=array.partition(comparator,left,right,pivotIndex);if(sortWindowLeft<pivotNewIndex){quickSortRange(array,comparator,left,pivotNewIndex-1,sortWindowLeft,sortWindowRight);}
if(pivotNewIndex<sortWindowRight){quickSortRange(array,comparator,pivotNewIndex+1,right,sortWindowLeft,sortWindowRight);}}
if(leftBound===0&&rightBound===(this.length-1)&&sortWindowLeft===0&&sortWindowRight>=rightBound){this.sort(comparator);}else{quickSortRange(this,comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight);}
return this;}};Object.defineProperty(Array.prototype,'sortRange',sortRange);Object.defineProperty(Uint32Array.prototype,'sortRange',sortRange);})();Object.defineProperty(Array.prototype,'lowerBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;let l=left||0;let r=right!==undefined?right:this.length;while(l<r){const m=(l+r)>>1;if(comparator(object,this[m])>0){l=m+1;}else{r=m;}}
return r;}});Object.defineProperty(Array.prototype,'upperBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;let l=left||0;let r=right!==undefined?right:this.length;while(l<r){const m=(l+r)>>1;if(comparator(object,this[m])>=0){l=m+1;}else{r=m;}}
return r;}});Object.defineProperty(Uint32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Uint32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Int32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Int32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Float64Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Array.prototype,'binaryIndexOf',{value:function(value,comparator){const index=this.lowerBound(value,comparator);return index<this.length&&comparator(value,this[index])===0?index:-1;}});Object.defineProperty(Array.prototype,'select',{value:function(field){const result=new Array(this.length);for(let i=0;i<this.length;++i){result[i]=this[i][field];}
return result;}});Object.defineProperty(Array.prototype,'peekLast',{value:function(){return this[this.length-1];}});(function(){function mergeOrIntersect(array1,array2,comparator,mergeNotIntersect){const result=[];let i=0;let j=0;while(i<array1.length&&j<array2.length){const compareValue=comparator(array1[i],array2[j]);if(mergeNotIntersect||!compareValue){result.push(compareValue<=0?array1[i]:array2[j]);}
if(compareValue<=0){i++;}
if(compareValue>=0){j++;}}
if(mergeNotIntersect){while(i<array1.length){result.push(array1[i++]);}
while(j<array2.length){result.push(array2[j++]);}}
return result;}
Object.defineProperty(Array.prototype,'intersectOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,false);}});Object.defineProperty(Array.prototype,'mergeOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,true);}});})();String.sprintf=function(format,var_arg){return String.vsprintf(format,Array.prototype.slice.call(arguments,1));};String.tokenizeFormatString=function(format,formatters){const tokens=[];function addStringToken(str){if(!str){return;}
if(tokens.length&&tokens[tokens.length-1].type==='string'){tokens[tokens.length-1].value+=str;}else{tokens.push({type:'string',value:str});}}
function addSpecifierToken(specifier,precision,substitutionIndex){tokens.push({type:'specifier',specifier:specifier,precision:precision,substitutionIndex:substitutionIndex});}
function addAnsiColor(code){const types={3:'color',9:'colorLight',4:'bgColor',10:'bgColorLight'};const colorCodes=['black','red','green','yellow','blue','magenta','cyan','lightGray','','default'];const colorCodesLight=['darkGray','lightRed','lightGreen','lightYellow','lightBlue','lightMagenta','lightCyan','white',''];const colors={color:colorCodes,colorLight:colorCodesLight,bgColor:colorCodes,bgColorLight:colorCodesLight};const type=types[Math.floor(code/10)];if(!type){return;}
const color=colors[type][code%10];if(!color){return;}
tokens.push({type:'specifier',specifier:'c',value:{description:(type.startsWith('bg')?'background : ':'color: ')+color}});}
let textStart=0;let substitutionIndex=0;const re=new RegExp(`%%|%(?:(\\d+)\\$)?(?:\\.(\\d*))?([${Object.keys(formatters).join('')}])|\\u001b\\[(\\d+)m`,'g');for(let match=re.exec(format);!!match;match=re.exec(format)){const matchStart=match.index;if(matchStart>textStart){addStringToken(format.substring(textStart,matchStart));}
if(match[0]==='%%'){addStringToken('%');}else if(match[0].startsWith('%')){const[_,substitionString,precisionString,specifierString]=match;if(substitionString&&Number(substitionString)>0){substitutionIndex=Number(substitionString)-1;}
const precision=precisionString?Number(precisionString):-1;addSpecifierToken(specifierString,precision,substitutionIndex);++substitutionIndex;}else{const code=Number(match[4]);addAnsiColor(code);}
textStart=matchStart+match[0].length;}
addStringToken(format.substring(textStart));return tokens;};String.standardFormatters={d:function(substitution){return!isNaN(substitution)?substitution:0;},f:function(substitution,token){if(substitution&&token.precision>-1){substitution=substitution.toFixed(token.precision);}
return!isNaN(substitution)?substitution:(token.precision>-1?Number(0).toFixed(token.precision):0);},s:function(substitution){return substitution;}};String.vsprintf=function(format,substitutions){return String.format(format,substitutions,String.standardFormatters,'',function(a,b){return a+b;}).formattedResult;};String.format=function(format,substitutions,formatters,initialValue,append,tokenizedFormat){if(!format||((!substitutions||!substitutions.length)&&format.search(/\u001b\[(\d+)m/)===-1)){return{formattedResult:append(initialValue,format),unusedSubstitutions:substitutions};}
function prettyFunctionName(){return'String.format("'+format+'", "'+Array.prototype.join.call(substitutions,'", "')+'")';}
function warn(msg){console.warn(prettyFunctionName()+': '+msg);}
function error(msg){console.error(prettyFunctionName()+': '+msg);}
let result=initialValue;const tokens=tokenizedFormat||String.tokenizeFormatString(format,formatters);const usedSubstitutionIndexes={};for(let i=0;i<tokens.length;++i){const token=tokens[i];if(token.type==='string'){result=append(result,token.value);continue;}
if(token.type!=='specifier'){error('Unknown token type "'+token.type+'" found.');continue;}
if(!token.value&&token.substitutionIndex>=substitutions.length){error('not enough substitution arguments. Had '+substitutions.length+' but needed '+
(token.substitutionIndex+1)+', so substitution was skipped.');result=append(result,'%'+(token.precision>-1?token.precision:'')+token.specifier);continue;}
if(!token.value){usedSubstitutionIndexes[token.substitutionIndex]=true;}
if(!(token.specifier in formatters)){warn('unsupported format character \u201C'+token.specifier+'\u201D. Treating as a string.');result=append(result,token.value?'':substitutions[token.substitutionIndex]);continue;}
result=append(result,formatters[token.specifier](token.value||substitutions[token.substitutionIndex],token));}
const unusedSubstitutions=[];for(let i=0;i<substitutions.length;++i){if(i in usedSubstitutionIndexes){continue;}
unusedSubstitutions.push(substitutions[i]);}
return{formattedResult:result,unusedSubstitutions:unusedSubstitutions};};self.createSearchRegex=function(query,caseSensitive,isRegex){const regexFlags=caseSensitive?'g':'gi';let regexObject;if(isRegex){try{regexObject=new RegExp(query,regexFlags);}catch(e){}}
if(!regexObject){regexObject=self.createPlainTextSearchRegex(query,regexFlags);}
return regexObject;};self.createPlainTextSearchRegex=function(query,flags){const regexSpecialCharacters=String.regexSpecialCharacters();let regex='';for(let i=0;i<query.length;++i){const c=query.charAt(i);if(regexSpecialCharacters.indexOf(c)!==-1){regex+='\\';}
regex+=c;}
return new RegExp(regex,flags||'');};self.countRegexMatches=function(regex,content){let text=content;let result=0;let match;while(text&&(match=regex.exec(text))){if(match[0].length>0){++result;}
text=text.substring(match.index+1);}
return result;};self.spacesPadding=function(spacesCount){return'\xA0'.repeat(spacesCount);};self.numberToStringWithSpacesPadding=function(value,symbolsCount){const numberString=value.toString();const paddingLength=Math.max(0,symbolsCount-numberString.length);return self.spacesPadding(paddingLength)+numberString;};Set.prototype.valuesArray=function(){return Array.from(this.values());};Set.prototype.firstValue=function(){if(!this.size){return null;}
return this.values().next().value;};Set.prototype.addAll=function(iterable){for(const e of iterable){this.add(e);}};Set.prototype.containsAll=function(iterable){for(const e of iterable){if(!this.has(e)){return false;}}
return true;};Map.prototype.remove=function(key){const value=this.get(key);this.delete(key);return value;};Map.prototype.valuesArray=function(){return Array.from(this.values());};Map.prototype.keysArray=function(){return Array.from(this.keys());};Map.prototype.inverse=function(){const result=new Platform.Multimap();for(const key of this.keys()){const value=this.get(key);result.set(value,key);}
return result;};const Multimap=class{constructor(){this._map=new Map();}
set(key,value){let set=this._map.get(key);if(!set){set=new Set();this._map.set(key,set);}
set.add(value);}
get(key){return this._map.get(key)||new Set();}
has(key){return this._map.has(key);}
hasValue(key,value){const set=this._map.get(key);if(!set){return false;}
return set.has(value);}
get size(){return this._map.size;}
delete(key,value){const values=this.get(key);if(!values){return false;}
const result=values.delete(value);if(!values.size){this._map.delete(key);}
return result;}
deleteAll(key){this._map.delete(key);}
keysArray(){return this._map.keysArray();}
valuesArray(){const result=[];const keys=this.keysArray();for(let i=0;i<keys.length;++i){result.pushAll(this.get(keys[i]).valuesArray());}
return result;}
clear(){this._map.clear();}};self.loadXHR=function(url){return new Promise(load);function load(successCallback,failureCallback){function onReadyStateChanged(){if(xhr.readyState!==XMLHttpRequest.DONE){return;}
if(xhr.status!==200){xhr.onreadystatechange=null;failureCallback(new Error(xhr.status));return;}
xhr.onreadystatechange=null;successCallback(xhr.responseText);}
const xhr=new XMLHttpRequest();xhr.withCredentials=false;xhr.open('GET',url,true);xhr.onreadystatechange=onReadyStateChanged;xhr.send(null);}};self.suppressUnused=function(value){};self.setImmediate=function(callback){const args=[...arguments].slice(1);Promise.resolve().then(()=>callback(...args));return 0;};Promise.prototype.spread=function(callback){return this.then(spreadPromise);function spreadPromise(arg){return callback.apply(null,arg);}};Promise.prototype.catchException=function(defaultValue){return this.catch(function(error){console.error(error);return defaultValue;});};Map.prototype.diff=function(other,isEqual){const leftKeys=this.keysArray();const rightKeys=other.keysArray();leftKeys.sort((a,b)=>a-b);rightKeys.sort((a,b)=>a-b);const removed=[];const added=[];const equal=[];let leftIndex=0;let rightIndex=0;while(leftIndex<leftKeys.length&&rightIndex<rightKeys.length){const leftKey=leftKeys[leftIndex];const rightKey=rightKeys[rightIndex];if(leftKey===rightKey&&isEqual(this.get(leftKey),other.get(rightKey))){equal.push(this.get(leftKey));++leftIndex;++rightIndex;continue;}
if(leftKey<=rightKey){removed.push(this.get(leftKey));++leftIndex;continue;}
added.push(other.get(rightKey));++rightIndex;}
while(leftIndex<leftKeys.length){const leftKey=leftKeys[leftIndex++];removed.push(this.get(leftKey));}
while(rightIndex<rightKeys.length){const rightKey=rightKeys[rightIndex++];added.push(other.get(rightKey));}
return{added:added,removed:removed,equal:equal};};self.runOnWindowLoad=function(callback){function windowLoaded(){self.removeEventListener('DOMContentLoaded',windowLoaded,false);callback();}
if(document.readyState==='complete'||document.readyState==='interactive'){callback();}else{self.addEventListener('DOMContentLoaded',windowLoaded,false);}};const _singletonSymbol=Symbol('singleton');self.singleton=function(constructorFunction){if(_singletonSymbol in constructorFunction){return constructorFunction[_singletonSymbol];}
const instance=new constructorFunction();constructorFunction[_singletonSymbol]=instance;return instance;};self.base64ToSize=function(content){if(!content){return 0;}
let size=content.length*3/4;if(content[content.length-1]==='='){size--;}
if(content.length>1&&content[content.length-2]==='='){size--;}
return size;};self.Platform=self.Platform||{};Platform=Platform||{};Platform.Multimap=Multimap;