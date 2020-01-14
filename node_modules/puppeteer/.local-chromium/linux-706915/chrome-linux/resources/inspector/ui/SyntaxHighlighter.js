export default class SyntaxHighlighter{constructor(mimeType,stripExtraWhitespace){this._mimeType=mimeType;this._stripExtraWhitespace=stripExtraWhitespace;}
createSpan(content,className){const span=createElement('span');span.className=className.replace(/\S+/g,'cm-$&');if(this._stripExtraWhitespace&&className!=='whitespace'){content=content.replace(/^[\n\r]*/,'').replace(/\s*$/,'');}
span.createTextChild(content);return span;}
syntaxHighlightNode(node){const lines=node.textContent.split('\n');let plainTextStart;let line;return self.runtime.extension(TextUtils.TokenizerFactory).instance().then(processTokens.bind(this));function processTokens(tokenizerFactory){node.removeChildren();const tokenize=tokenizerFactory.createTokenizer(this._mimeType);for(let i=0;i<lines.length;++i){line=lines[i];plainTextStart=0;tokenize(line,processToken.bind(this));if(plainTextStart<line.length){const plainText=line.substring(plainTextStart,line.length);node.createTextChild(plainText);}
if(i<lines.length-1){node.createTextChild('\n');}}}
function processToken(token,tokenType,column,newColumn){if(!tokenType){return;}
if(column>plainTextStart){const plainText=line.substring(plainTextStart,column);node.createTextChild(plainText);}
node.appendChild(this.createSpan(token,tokenType));plainTextStart=newColumn;}}}
self.UI=self.UI||{};UI=UI||{};UI.SyntaxHighlighter=SyntaxHighlighter;