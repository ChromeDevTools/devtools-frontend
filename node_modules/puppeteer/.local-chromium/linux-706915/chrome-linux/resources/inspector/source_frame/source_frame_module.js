SourceFrame.BinaryResourceViewFactory=class{constructor(base64content,contentUrl,resourceType){this._base64content=base64content;this._contentUrl=contentUrl;this._resourceType=resourceType;this._arrayPromise=null;this._hexPromise=null;this._utf8Promise=null;}
async _fetchContentAsArray(){if(!this._arrayPromise){this._arrayPromise=new Promise(async resolve=>{const fetchResponse=await fetch('data:;base64,'+this._base64content);resolve(new Uint8Array(await fetchResponse.arrayBuffer()));});}
return await this._arrayPromise;}
async hex(){if(!this._hexPromise){this._hexPromise=new Promise(async resolve=>{const content=await this._fetchContentAsArray();const hexString=SourceFrame.BinaryResourceViewFactory.uint8ArrayToHexString(content);resolve({content:hexString,isEncoded:false});});}
return this._hexPromise;}
async base64(){return{content:this._base64content,isEncoded:true};}
async utf8(){if(!this._utf8Promise){this._utf8Promise=new Promise(async resolve=>{const content=await this._fetchContentAsArray();const utf8String=new TextDecoder('utf8').decode(content);resolve({content:utf8String,isEncoded:false});});}
return this._utf8Promise;}
createBase64View(){return new SourceFrame.ResourceSourceFrame(Common.StaticContentProvider.fromString(this._contentUrl,this._resourceType,this._base64content),false,{lineNumbers:false,lineWrapping:true});}
createHexView(){const hexViewerContentProvider=new Common.StaticContentProvider(this._contentUrl,this._resourceType,async()=>{const contentAsArray=await this._fetchContentAsArray();const content=SourceFrame.BinaryResourceViewFactory.uint8ArrayToHexViewer(contentAsArray);return{content,isEncoded:false};});return new SourceFrame.ResourceSourceFrame(hexViewerContentProvider,false,{lineNumbers:false,lineWrapping:false});}
createUtf8View(){const utf8fn=this.utf8.bind(this);const utf8ContentProvider=new Common.StaticContentProvider(this._contentUrl,this._resourceType,utf8fn);return new SourceFrame.ResourceSourceFrame(utf8ContentProvider,false,{lineNumbers:true,lineWrapping:true});}
static uint8ArrayToHexString(uint8Array){let output='';for(let i=0;i<uint8Array.length;i++){output+=SourceFrame.BinaryResourceViewFactory.numberToHex(uint8Array[i],2);}
return output;}
static numberToHex(number,padding){let hex=number.toString(16);while(hex.length<padding){hex='0'+hex;}
return hex;}
static uint8ArrayToHexViewer(array){let output='';let line=0;while((line*16)<array.length){const lineArray=array.slice(line*16,(line+1)*16);output+=SourceFrame.BinaryResourceViewFactory.numberToHex(line,8)+':';let hexColsPrinted=0;for(let i=0;i<lineArray.length;i++){if(i%2===0){output+=' ';hexColsPrinted++;}
output+=SourceFrame.BinaryResourceViewFactory.numberToHex(lineArray[i],2);hexColsPrinted+=2;}
while(hexColsPrinted<42){output+=' ';hexColsPrinted++;}
for(let i=0;i<lineArray.length;i++){const code=lineArray[i];if(code>=32&&code<=126){output+=String.fromCharCode(code);}else{output+='.';}}
output+='\n';line++;}
return output;}};;SourceFrame.SourcesTextEditor=class extends TextEditor.CodeMirrorTextEditor{constructor(delegate,codeMirrorOptions){const defaultCodeMirrorOptions={lineNumbers:true,lineWrapping:false,bracketMatchingSetting:Common.moduleSetting('textEditorBracketMatching'),padBottom:true};if(codeMirrorOptions){Object.assign(defaultCodeMirrorOptions,codeMirrorOptions);}
super(defaultCodeMirrorOptions);this.codeMirror().addKeyMap({'Enter':'smartNewlineAndIndent','Esc':'sourcesDismiss'});this._delegate=delegate;this.codeMirror().on('cursorActivity',this._cursorActivity.bind(this));this.codeMirror().on('gutterClick',this._gutterClick.bind(this));this.codeMirror().on('scroll',this._scroll.bind(this));this.codeMirror().on('focus',this._focus.bind(this));this.codeMirror().on('blur',this._blur.bind(this));this.codeMirror().on('beforeSelectionChange',this._fireBeforeSelectionChanged.bind(this));this.element.addEventListener('contextmenu',this._contextMenu.bind(this),false);this._gutterMouseMove=event=>{this.element.classList.toggle('CodeMirror-gutter-hovered',event.clientX<this.codeMirror().getGutterElement().getBoundingClientRect().right);};this._gutterMouseOut=event=>{this.element.classList.toggle('CodeMirror-gutter-hovered',false);};this.codeMirror().addKeyMap(SourceFrame.SourcesTextEditor._BlockIndentController);this._tokenHighlighter=new SourceFrame.SourcesTextEditor.TokenHighlighter(this,this.codeMirror());this._gutters=[SourceFrame.SourcesTextEditor.lineNumbersGutterType];this.codeMirror().setOption('gutters',this._gutters.slice());this.codeMirror().setOption('electricChars',false);this.codeMirror().setOption('smartIndent',false);function updateAnticipateJumpFlag(value){this._isHandlingMouseDownEvent=value;}
this.element.addEventListener('mousedown',updateAnticipateJumpFlag.bind(this,true),true);this.element.addEventListener('mousedown',updateAnticipateJumpFlag.bind(this,false),false);Common.moduleSetting('textEditorIndent').addChangeListener(this._onUpdateEditorIndentation,this);Common.moduleSetting('textEditorAutoDetectIndent').addChangeListener(this._onUpdateEditorIndentation,this);Common.moduleSetting('showWhitespacesInEditor').addChangeListener(this._updateWhitespace,this);Common.moduleSetting('textEditorCodeFolding').addChangeListener(this._updateCodeFolding,this);this._updateCodeFolding();this._autocompleteConfig={isWordChar:TextUtils.TextUtils.isWordChar};Common.moduleSetting('textEditorAutocompletion').addChangeListener(this._updateAutocomplete,this);this._updateAutocomplete();this._onUpdateEditorIndentation();this._setupWhitespaceHighlight();}
attachInfobar(infobar){this.element.insertBefore(infobar.element,this.element.firstChild);infobar.setParentView(this);this.doResize();}
static _guessIndentationLevel(lines){const tabRegex=/^\t+/;let tabLines=0;const indents={};for(let lineNumber=0;lineNumber<lines.length;++lineNumber){const text=lines[lineNumber];if(text.length===0||!TextUtils.TextUtils.isSpaceChar(text[0])){continue;}
if(tabRegex.test(text)){++tabLines;continue;}
let i=0;while(i<text.length&&TextUtils.TextUtils.isSpaceChar(text[i])){++i;}
if(i%2!==0){continue;}
indents[i]=1+(indents[i]||0);}
const linesCountPerIndentThreshold=3*lines.length/100;if(tabLines&&tabLines>linesCountPerIndentThreshold){return'\t';}
let minimumIndent=Infinity;for(const i in indents){if(indents[i]<linesCountPerIndentThreshold){continue;}
const indent=parseInt(i,10);if(minimumIndent>indent){minimumIndent=indent;}}
if(minimumIndent===Infinity){return Common.moduleSetting('textEditorIndent').get();}
return' '.repeat(minimumIndent);}
_isSearchActive(){return!!this._tokenHighlighter.highlightedRegex();}
scrollToLine(lineNumber){super.scrollToLine(lineNumber);this._scroll();}
highlightSearchResults(regex,range){function innerHighlightRegex(){if(range){this.scrollLineIntoView(range.startLine);if(range.endColumn>TextEditor.CodeMirrorTextEditor.maxHighlightLength){this.setSelection(range);}else{this.setSelection(TextUtils.TextRange.createFromLocation(range.startLine,range.startColumn));}}
this._tokenHighlighter.highlightSearchResults(regex,range);}
if(!this._selectionBeforeSearch){this._selectionBeforeSearch=this.selection();}
this.codeMirror().operation(innerHighlightRegex.bind(this));}
cancelSearchResultsHighlight(){this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));if(this._selectionBeforeSearch){this._reportJump(this._selectionBeforeSearch,this.selection());delete this._selectionBeforeSearch;}}
removeHighlight(highlightDescriptor){highlightDescriptor.clear();}
highlightRange(range,cssClass){cssClass='CodeMirror-persist-highlight '+cssClass;const pos=TextEditor.CodeMirrorUtils.toPos(range);++pos.end.ch;return this.codeMirror().markText(pos.start,pos.end,{className:cssClass,startStyle:cssClass+'-start',endStyle:cssClass+'-end'});}
installGutter(type,leftToNumbers){if(this._gutters.indexOf(type)!==-1){return;}
if(leftToNumbers){this._gutters.unshift(type);}else{this._gutters.push(type);}
this.codeMirror().setOption('gutters',this._gutters.slice());this.refresh();}
uninstallGutter(type){const index=this._gutters.indexOf(type);if(index===-1){return;}
this.codeMirror().clearGutter(type);this._gutters.splice(index,1);this.codeMirror().setOption('gutters',this._gutters.slice());this.refresh();}
setGutterDecoration(lineNumber,type,element){console.assert(this._gutters.indexOf(type)!==-1,'Cannot decorate unexisting gutter.');this.codeMirror().setGutterMarker(lineNumber,type,element);}
setExecutionLocation(lineNumber,columnNumber){this.clearPositionHighlight();this._executionLine=this.codeMirror().getLineHandle(lineNumber);if(!this._executionLine){return;}
this.showExecutionLineBackground();this.codeMirror().addLineClass(this._executionLine,'wrap','cm-execution-line-outline');let token=this.tokenAtTextPosition(lineNumber,columnNumber);if(token&&!token.type&&token.startColumn+1===token.endColumn){const tokenContent=this.codeMirror().getLine(lineNumber)[token.startColumn];if(tokenContent==='.'||tokenContent==='('){token=this.tokenAtTextPosition(lineNumber,token.endColumn+1);}}
let endColumn;if(token&&token.type){endColumn=token.endColumn;}else{endColumn=this.codeMirror().getLine(lineNumber).length;}
this._executionLineTailMarker=this.codeMirror().markText({line:lineNumber,ch:columnNumber},{line:lineNumber,ch:endColumn},{className:'cm-execution-line-tail'});}
showExecutionLineBackground(){if(this._executionLine){this.codeMirror().addLineClass(this._executionLine,'wrap','cm-execution-line');}}
hideExecutionLineBackground(){if(this._executionLine){this.codeMirror().removeLineClass(this._executionLine,'wrap','cm-execution-line');}}
clearExecutionLine(){this.clearPositionHighlight();if(this._executionLine){this.hideExecutionLineBackground();this.codeMirror().removeLineClass(this._executionLine,'wrap','cm-execution-line-outline');}
delete this._executionLine;if(this._executionLineTailMarker){this._executionLineTailMarker.clear();}
delete this._executionLineTailMarker;}
toggleLineClass(lineNumber,className,toggled){if(this.hasLineClass(lineNumber,className)===toggled){return;}
const lineHandle=this.codeMirror().getLineHandle(lineNumber);if(!lineHandle){return;}
if(toggled){this.codeMirror().addLineClass(lineHandle,'gutter',className);this.codeMirror().addLineClass(lineHandle,'wrap',className);}else{this.codeMirror().removeLineClass(lineHandle,'gutter',className);this.codeMirror().removeLineClass(lineHandle,'wrap',className);}}
hasLineClass(lineNumber,className){const lineInfo=this.codeMirror().lineInfo(lineNumber);const wrapClass=lineInfo.wrapClass||'';const classNames=wrapClass.split(' ');return classNames.indexOf(className)!==-1;}
_gutterClick(instance,lineNumber,gutterType,event){this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.GutterClick,{gutterType,lineNumber,event});}
_contextMenu(event){const contextMenu=new UI.ContextMenu(event);event.consume(true);const wrapper=event.target.enclosingNodeOrSelfWithClass('CodeMirror-gutter-wrapper');const target=wrapper?wrapper.querySelector('.CodeMirror-linenumber'):null;let promise;if(target){promise=this._delegate.populateLineGutterContextMenu(contextMenu,parseInt(target.textContent,10)-1);}else{const textSelection=this.selection();promise=this._delegate.populateTextAreaContextMenu(contextMenu,textSelection.startLine,textSelection.startColumn);}
promise.then(showAsync.bind(this));function showAsync(){contextMenu.appendApplicableItems(this);contextMenu.show();}}
editRange(range,text,origin){const newRange=super.editRange(range,text,origin);if(Common.moduleSetting('textEditorAutoDetectIndent').get()){this._onUpdateEditorIndentation();}
return newRange;}
_onUpdateEditorIndentation(){this._setEditorIndentation(TextEditor.CodeMirrorUtils.pullLines(this.codeMirror(),SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing));}
_setEditorIndentation(lines){const extraKeys={};let indent=Common.moduleSetting('textEditorIndent').get();if(Common.moduleSetting('textEditorAutoDetectIndent').get()){indent=SourceFrame.SourcesTextEditor._guessIndentationLevel(lines);}
if(indent===TextUtils.TextUtils.Indent.TabCharacter){this.codeMirror().setOption('indentWithTabs',true);this.codeMirror().setOption('indentUnit',4);}else{this.codeMirror().setOption('indentWithTabs',false);this.codeMirror().setOption('indentUnit',indent.length);extraKeys.Tab=function(codeMirror){if(codeMirror.somethingSelected()){return CodeMirror.Pass;}
const pos=codeMirror.getCursor('head');codeMirror.replaceRange(indent.substring(pos.ch%indent.length),codeMirror.getCursor());};}
this.codeMirror().setOption('extraKeys',extraKeys);this._indentationLevel=indent;}
indent(){return this._indentationLevel;}
_onAutoAppendedSpaces(){this._autoAppendedSpaces=this._autoAppendedSpaces||[];for(let i=0;i<this._autoAppendedSpaces.length;++i){const position=this._autoAppendedSpaces[i].resolve();if(!position){continue;}
const line=this.line(position.lineNumber);if(line.length===position.columnNumber&&TextUtils.TextUtils.lineIndent(line).length===line.length){this.codeMirror().replaceRange('',new CodeMirror.Pos(position.lineNumber,0),new CodeMirror.Pos(position.lineNumber,position.columnNumber));}}
this._autoAppendedSpaces=[];const selections=this.selections();for(let i=0;i<selections.length;++i){const selection=selections[i];this._autoAppendedSpaces.push(this.textEditorPositionHandle(selection.startLine,selection.startColumn));}}
_cursorActivity(){if(!this._isSearchActive()){this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));}
const start=this.codeMirror().getCursor('anchor');const end=this.codeMirror().getCursor('head');this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.SelectionChanged,TextEditor.CodeMirrorUtils.toRange(start,end));}
_reportJump(from,to){if(from&&to&&from.equal(to)){return;}
this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.JumpHappened,{from:from,to:to});}
_scroll(){const topmostLineNumber=this.codeMirror().lineAtHeight(this.codeMirror().getScrollInfo().top,'local');this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.ScrollChanged,topmostLineNumber);}
_focus(){this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.EditorFocused);}
_blur(){this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.EditorBlurred);}
_fireBeforeSelectionChanged(codeMirror,selection){if(!this._isHandlingMouseDownEvent){return;}
if(!selection.ranges.length){return;}
const primarySelection=selection.ranges[0];this._reportJump(this.selection(),TextEditor.CodeMirrorUtils.toRange(primarySelection.anchor,primarySelection.head));}
dispose(){super.dispose();Common.moduleSetting('textEditorIndent').removeChangeListener(this._onUpdateEditorIndentation,this);Common.moduleSetting('textEditorAutoDetectIndent').removeChangeListener(this._onUpdateEditorIndentation,this);Common.moduleSetting('showWhitespacesInEditor').removeChangeListener(this._updateWhitespace,this);Common.moduleSetting('textEditorCodeFolding').removeChangeListener(this._updateCodeFolding,this);}
setText(text){this._setEditorIndentation(text.split('\n').slice(0,SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing));super.setText(text);}
_updateWhitespace(){this.setMimeType(this.mimeType());}
_updateCodeFolding(){if(Common.moduleSetting('textEditorCodeFolding').get()){this.installGutter('CodeMirror-foldgutter',false);this.element.addEventListener('mousemove',this._gutterMouseMove);this.element.addEventListener('mouseout',this._gutterMouseOut);this.codeMirror().setOption('foldGutter',true);this.codeMirror().setOption('foldOptions',{minFoldSize:1});}else{this.codeMirror().execCommand('unfoldAll');this.element.removeEventListener('mousemove',this._gutterMouseMove);this.element.removeEventListener('mouseout',this._gutterMouseOut);this.uninstallGutter('CodeMirror-foldgutter');this.codeMirror().setOption('foldGutter',false);}}
rewriteMimeType(mimeType){this._setupWhitespaceHighlight();const whitespaceMode=Common.moduleSetting('showWhitespacesInEditor').get();this.element.classList.toggle('show-whitespaces',whitespaceMode==='all');if(whitespaceMode==='all'){return this._allWhitespaceOverlayMode(mimeType);}else if(whitespaceMode==='trailing'){return this._trailingWhitespaceOverlayMode(mimeType);}
return mimeType;}
_allWhitespaceOverlayMode(mimeType){let modeName=CodeMirror.mimeModes[mimeType]?(CodeMirror.mimeModes[mimeType].name||CodeMirror.mimeModes[mimeType]):CodeMirror.mimeModes['text/plain'];modeName+='+all-whitespaces';if(CodeMirror.modes[modeName]){return modeName;}
function modeConstructor(config,parserConfig){function nextToken(stream){if(stream.peek()===' '){let spaces=0;while(spaces<SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan&&stream.peek()===' '){++spaces;stream.next();}
return'whitespace whitespace-'+spaces;}
while(!stream.eol()&&stream.peek()!==' '){stream.next();}
return null;}
const whitespaceMode={token:nextToken};return CodeMirror.overlayMode(CodeMirror.getMode(config,mimeType),whitespaceMode,false);}
CodeMirror.defineMode(modeName,modeConstructor);return modeName;}
_trailingWhitespaceOverlayMode(mimeType){let modeName=CodeMirror.mimeModes[mimeType]?(CodeMirror.mimeModes[mimeType].name||CodeMirror.mimeModes[mimeType]):CodeMirror.mimeModes['text/plain'];modeName+='+trailing-whitespaces';if(CodeMirror.modes[modeName]){return modeName;}
function modeConstructor(config,parserConfig){function nextToken(stream){if(stream.match(/^\s+$/,true)){return true?'trailing-whitespace':null;}
do{stream.next();}while(!stream.eol()&&stream.peek()!==' ');return null;}
const whitespaceMode={token:nextToken};return CodeMirror.overlayMode(CodeMirror.getMode(config,mimeType),whitespaceMode,false);}
CodeMirror.defineMode(modeName,modeConstructor);return modeName;}
_setupWhitespaceHighlight(){const doc=this.element.ownerDocument;if(doc._codeMirrorWhitespaceStyleInjected||!Common.moduleSetting('showWhitespacesInEditor').get()){return;}
doc._codeMirrorWhitespaceStyleInjected=true;const classBase='.show-whitespaces .CodeMirror .cm-whitespace-';const spaceChar='·';let spaceChars='';let rules='';for(let i=1;i<=SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan;++i){spaceChars+=spaceChar;const rule=classBase+i+'::before { content: \''+spaceChars+'\';}\n';rules+=rule;}
const style=doc.createElement('style');style.textContent=rules;doc.head.appendChild(style);}
configureAutocomplete(config){this._autocompleteConfig=config;this._updateAutocomplete();}
_updateAutocomplete(){super.configureAutocomplete(Common.moduleSetting('textEditorAutocompletion').get()?this._autocompleteConfig:null);}};SourceFrame.SourcesTextEditor.GutterClickEventData;SourceFrame.SourcesTextEditor.Events={GutterClick:Symbol('GutterClick'),SelectionChanged:Symbol('SelectionChanged'),ScrollChanged:Symbol('ScrollChanged'),EditorFocused:Symbol('EditorFocused'),EditorBlurred:Symbol('EditorBlurred'),JumpHappened:Symbol('JumpHappened')};SourceFrame.SourcesTextEditorDelegate=function(){};SourceFrame.SourcesTextEditorDelegate.prototype={populateLineGutterContextMenu(contextMenu,lineNumber){},populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber){},};CodeMirror.commands.smartNewlineAndIndent=function(codeMirror){codeMirror.operation(innerSmartNewlineAndIndent.bind(null,codeMirror));function innerSmartNewlineAndIndent(codeMirror){const selections=codeMirror.listSelections();const replacements=[];for(let i=0;i<selections.length;++i){const selection=selections[i];const cur=CodeMirror.cmpPos(selection.head,selection.anchor)<0?selection.head:selection.anchor;const line=codeMirror.getLine(cur.line);const indent=TextUtils.TextUtils.lineIndent(line);replacements.push('\n'+indent.substring(0,Math.min(cur.ch,indent.length)));}
codeMirror.replaceSelections(replacements);codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();}};CodeMirror.commands.sourcesDismiss=function(codemirror){if(codemirror.listSelections().length===1&&codemirror._codeMirrorTextEditor._isSearchActive()){return CodeMirror.Pass;}
return CodeMirror.commands.dismiss(codemirror);};SourceFrame.SourcesTextEditor._BlockIndentController={name:'blockIndentKeymap',Enter:function(codeMirror){let selections=codeMirror.listSelections();const replacements=[];let allSelectionsAreCollapsedBlocks=false;for(let i=0;i<selections.length;++i){const selection=selections[i];const start=CodeMirror.cmpPos(selection.head,selection.anchor)<0?selection.head:selection.anchor;const line=codeMirror.getLine(start.line);const indent=TextUtils.TextUtils.lineIndent(line);let indentToInsert='\n'+indent+codeMirror._codeMirrorTextEditor.indent();let isCollapsedBlock=false;if(selection.head.ch===0){return CodeMirror.Pass;}
if(line.substr(selection.head.ch-1,2)==='{}'){indentToInsert+='\n'+indent;isCollapsedBlock=true;}else if(line.substr(selection.head.ch-1,1)!=='{'){return CodeMirror.Pass;}
if(i>0&&allSelectionsAreCollapsedBlocks!==isCollapsedBlock){return CodeMirror.Pass;}
replacements.push(indentToInsert);allSelectionsAreCollapsedBlocks=isCollapsedBlock;}
codeMirror.replaceSelections(replacements);if(!allSelectionsAreCollapsedBlocks){codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();return;}
selections=codeMirror.listSelections();const updatedSelections=[];for(let i=0;i<selections.length;++i){const selection=selections[i];const line=codeMirror.getLine(selection.head.line-1);const position=new CodeMirror.Pos(selection.head.line-1,line.length);updatedSelections.push({head:position,anchor:position});}
codeMirror.setSelections(updatedSelections);codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();},'\'}\'':function(codeMirror){if(codeMirror.somethingSelected()){return CodeMirror.Pass;}
let selections=codeMirror.listSelections();let replacements=[];for(let i=0;i<selections.length;++i){const selection=selections[i];const line=codeMirror.getLine(selection.head.line);if(line!==TextUtils.TextUtils.lineIndent(line)){return CodeMirror.Pass;}
replacements.push('}');}
codeMirror.replaceSelections(replacements);selections=codeMirror.listSelections();replacements=[];const updatedSelections=[];for(let i=0;i<selections.length;++i){const selection=selections[i];const matchingBracket=codeMirror.findMatchingBracket(selection.head);if(!matchingBracket||!matchingBracket.match){return;}
updatedSelections.push({head:selection.head,anchor:new CodeMirror.Pos(selection.head.line,0)});const line=codeMirror.getLine(matchingBracket.to.line);const indent=TextUtils.TextUtils.lineIndent(line);replacements.push(indent+'}');}
codeMirror.setSelections(updatedSelections);codeMirror.replaceSelections(replacements);}};SourceFrame.SourcesTextEditor.TokenHighlighter=class{constructor(textEditor,codeMirror){this._textEditor=textEditor;this._codeMirror=codeMirror;}
highlightSearchResults(regex,range){const oldRegex=this._highlightRegex;this._highlightRegex=regex;this._highlightRange=range;if(this._searchResultMarker){this._searchResultMarker.clear();delete this._searchResultMarker;}
if(this._highlightDescriptor&&this._highlightDescriptor.selectionStart){this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line,'wrap','cm-line-with-selection');}
const selectionStart=this._highlightRange?new CodeMirror.Pos(this._highlightRange.startLine,this._highlightRange.startColumn):null;if(selectionStart){this._codeMirror.addLineClass(selectionStart.line,'wrap','cm-line-with-selection');}
if(oldRegex&&this._highlightRegex.toString()===oldRegex.toString()){if(this._highlightDescriptor){this._highlightDescriptor.selectionStart=selectionStart;}}else{this._removeHighlight();this._setHighlighter(this._searchHighlighter.bind(this,this._highlightRegex),selectionStart);}
if(this._highlightRange){const pos=TextEditor.CodeMirrorUtils.toPos(this._highlightRange);this._searchResultMarker=this._codeMirror.markText(pos.start,pos.end,{className:'cm-column-with-selection'});}}
highlightedRegex(){return this._highlightRegex;}
highlightSelectedTokens(){delete this._highlightRegex;delete this._highlightRange;if(this._highlightDescriptor&&this._highlightDescriptor.selectionStart){this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line,'wrap','cm-line-with-selection');}
this._removeHighlight();const selectionStart=this._codeMirror.getCursor('start');const selectionEnd=this._codeMirror.getCursor('end');if(selectionStart.line!==selectionEnd.line){return;}
if(selectionStart.ch===selectionEnd.ch){return;}
const selections=this._codeMirror.getSelections();if(selections.length>1){return;}
const selectedText=selections[0];if(this._isWord(selectedText,selectionStart.line,selectionStart.ch,selectionEnd.ch)){if(selectionStart){this._codeMirror.addLineClass(selectionStart.line,'wrap','cm-line-with-selection');}
this._setHighlighter(this._tokenHighlighter.bind(this,selectedText,selectionStart),selectionStart);}}
_isWord(selectedText,lineNumber,startColumn,endColumn){const line=this._codeMirror.getLine(lineNumber);const leftBound=startColumn===0||!TextUtils.TextUtils.isWordChar(line.charAt(startColumn-1));const rightBound=endColumn===line.length||!TextUtils.TextUtils.isWordChar(line.charAt(endColumn));return leftBound&&rightBound&&TextUtils.TextUtils.isWord(selectedText);}
_removeHighlight(){if(this._highlightDescriptor){this._codeMirror.removeOverlay(this._highlightDescriptor.overlay);delete this._highlightDescriptor;}}
_searchHighlighter(regex,stream){if(stream.column()===0){delete this._searchMatchLength;}
if(this._searchMatchLength){if(this._searchMatchLength>2){for(let i=0;i<this._searchMatchLength-2;++i){stream.next();}
this._searchMatchLength=1;return'search-highlight';}else{stream.next();delete this._searchMatchLength;return'search-highlight search-highlight-end';}}
const match=stream.match(regex,false);if(match){stream.next();const matchLength=match[0].length;if(matchLength===1){return'search-highlight search-highlight-full';}
this._searchMatchLength=matchLength;return'search-highlight search-highlight-start';}
while(!stream.match(regex,false)&&stream.next()){}}
_tokenHighlighter(token,selectionStart,stream){const tokenFirstChar=token.charAt(0);if(stream.match(token)&&(stream.eol()||!TextUtils.TextUtils.isWordChar(stream.peek()))){return stream.column()===selectionStart.ch?'token-highlight column-with-selection':'token-highlight';}
let eatenChar;do{eatenChar=stream.next();}while(eatenChar&&(TextUtils.TextUtils.isWordChar(eatenChar)||stream.peek()!==tokenFirstChar));}
_setHighlighter(highlighter,selectionStart){const overlayMode={token:highlighter};this._codeMirror.addOverlay(overlayMode);this._highlightDescriptor={overlay:overlayMode,selectionStart:selectionStart};}};SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing=1000;SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan=16;SourceFrame.SourcesTextEditor.lineNumbersGutterType='CodeMirror-linenumbers';;SourceFrame.FontView=class extends UI.SimpleView{constructor(mimeType,contentProvider){super(Common.UIString('Font'));this.registerRequiredCSS('source_frame/fontView.css');this.element.classList.add('font-view');this._url=contentProvider.contentURL();UI.ARIAUtils.setAccessibleName(this.element,ls`Preview of font from ${this._url}`);this._mimeType=mimeType;this._contentProvider=contentProvider;this._mimeTypeLabel=new UI.ToolbarText(mimeType);}
syncToolbarItems(){return[this._mimeTypeLabel];}
_onFontContentLoaded(uniqueFontName,deferredContent){const{content}=deferredContent;const url=content?Common.ContentProvider.contentAsDataURL(content,this._mimeType,true):this._url;this.fontStyleElement.textContent=String.sprintf('@font-face { font-family: "%s"; src: url(%s); }',uniqueFontName,url);}
_createContentIfNeeded(){if(this.fontPreviewElement){return;}
const uniqueFontName='WebInspectorFontPreview'+(++SourceFrame.FontView._fontId);this.fontStyleElement=createElement('style');this._contentProvider.requestContent().then(deferredContent=>{this._onFontContentLoaded(uniqueFontName,deferredContent);});this.element.appendChild(this.fontStyleElement);const fontPreview=createElement('div');for(let i=0;i<SourceFrame.FontView._fontPreviewLines.length;++i){if(i>0){fontPreview.createChild('br');}
fontPreview.createTextChild(SourceFrame.FontView._fontPreviewLines[i]);}
this.fontPreviewElement=fontPreview.cloneNode(true);UI.ARIAUtils.markAsHidden(this.fontPreviewElement);this.fontPreviewElement.style.overflow='hidden';this.fontPreviewElement.style.setProperty('font-family',uniqueFontName);this.fontPreviewElement.style.setProperty('visibility','hidden');this._dummyElement=fontPreview;this._dummyElement.style.visibility='hidden';this._dummyElement.style.zIndex='-1';this._dummyElement.style.display='inline';this._dummyElement.style.position='absolute';this._dummyElement.style.setProperty('font-family',uniqueFontName);this._dummyElement.style.setProperty('font-size',SourceFrame.FontView._measureFontSize+'px');this.element.appendChild(this.fontPreviewElement);}
wasShown(){this._createContentIfNeeded();this.updateFontPreviewSize();}
onResize(){if(this._inResize){return;}
this._inResize=true;try{this.updateFontPreviewSize();}finally{delete this._inResize;}}
_measureElement(){this.element.appendChild(this._dummyElement);const result={width:this._dummyElement.offsetWidth,height:this._dummyElement.offsetHeight};this.element.removeChild(this._dummyElement);return result;}
updateFontPreviewSize(){if(!this.fontPreviewElement||!this.isShowing()){return;}
this.fontPreviewElement.style.removeProperty('visibility');const dimension=this._measureElement();const height=dimension.height;const width=dimension.width;const containerWidth=this.element.offsetWidth-50;const containerHeight=this.element.offsetHeight-30;if(!height||!width||!containerWidth||!containerHeight){this.fontPreviewElement.style.removeProperty('font-size');return;}
const widthRatio=containerWidth/width;const heightRatio=containerHeight/height;const finalFontSize=Math.floor(SourceFrame.FontView._measureFontSize*Math.min(widthRatio,heightRatio))-2;this.fontPreviewElement.style.setProperty('font-size',finalFontSize+'px',null);}};SourceFrame.FontView._fontPreviewLines=['ABCDEFGHIJKLM','NOPQRSTUVWXYZ','abcdefghijklm','nopqrstuvwxyz','1234567890'];SourceFrame.FontView._fontId=0;SourceFrame.FontView._measureFontSize=50;;SourceFrame.ImageView=class extends UI.SimpleView{constructor(mimeType,contentProvider){super(Common.UIString('Image'));this.registerRequiredCSS('source_frame/imageView.css');this.element.tabIndex=0;this.element.classList.add('image-view');this._url=contentProvider.contentURL();this._parsedURL=new Common.ParsedURL(this._url);this._mimeType=mimeType;this._contentProvider=contentProvider;this._uiSourceCode=contentProvider instanceof Workspace.UISourceCode?(contentProvider):null;if(this._uiSourceCode){this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);new UI.DropTarget(this.element,[UI.DropTarget.Type.ImageFile,UI.DropTarget.Type.URI],Common.UIString('Drop image file here'),this._handleDrop.bind(this));}
this._sizeLabel=new UI.ToolbarText();this._dimensionsLabel=new UI.ToolbarText();this._mimeTypeLabel=new UI.ToolbarText(mimeType);this._container=this.element.createChild('div','image');this._imagePreviewElement=this._container.createChild('img','resource-image-view');this._imagePreviewElement.addEventListener('contextmenu',this._contextMenu.bind(this),true);this._imagePreviewElement.alt=ls`Image from ${this._url}`;}
syncToolbarItems(){return[this._sizeLabel,new UI.ToolbarSeparator(),this._dimensionsLabel,new UI.ToolbarSeparator(),this._mimeTypeLabel];}
wasShown(){this._updateContentIfNeeded();}
disposeView(){if(this._uiSourceCode){this._uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);}}
_workingCopyCommitted(){this._updateContentIfNeeded();}
async _updateContentIfNeeded(){const{content}=await this._contentProvider.requestContent();if(this._cachedContent===content){return;}
const contentEncoded=await this._contentProvider.contentEncoded();this._cachedContent=content;let imageSrc=Common.ContentProvider.contentAsDataURL(content,this._mimeType,contentEncoded);if(content===null){imageSrc=this._url;}
const loadPromise=new Promise(x=>this._imagePreviewElement.onload=x);this._imagePreviewElement.src=imageSrc;const size=content&&!contentEncoded?content.length:base64ToSize(content);this._sizeLabel.setText(Number.bytesToString(size));await loadPromise;this._dimensionsLabel.setText(Common.UIString('%d × %d',this._imagePreviewElement.naturalWidth,this._imagePreviewElement.naturalHeight));}
_contextMenu(event){const contextMenu=new UI.ContextMenu(event);if(!this._parsedURL.isDataURL()){contextMenu.clipboardSection().appendItem(Common.UIString('Copy image URL'),this._copyImageURL.bind(this));}
if(this._imagePreviewElement.src){contextMenu.clipboardSection().appendItem(Common.UIString('Copy image as data URI'),this._copyImageAsDataURL.bind(this));}
contextMenu.clipboardSection().appendItem(Common.UIString('Open image in new tab'),this._openInNewTab.bind(this));contextMenu.clipboardSection().appendItem(Common.UIString('Save\u2026'),this._saveImage.bind(this));contextMenu.show();}
_copyImageAsDataURL(){Host.InspectorFrontendHost.copyText(this._imagePreviewElement.src);}
_copyImageURL(){Host.InspectorFrontendHost.copyText(this._url);}
_saveImage(){const link=createElement('a');link.download=this._parsedURL.displayName;link.href=this._url;link.click();}
_openInNewTab(){Host.InspectorFrontendHost.openInNewTab(this._url);}
async _handleDrop(dataTransfer){const items=dataTransfer.items;if(!items.length||items[0].kind!=='file'){return;}
const entry=items[0].webkitGetAsEntry();const encoded=!entry.name.endsWith('.svg');entry.file(file=>{const reader=new FileReader();reader.onloadend=()=>{let result;try{result=(reader.result);}catch(e){result=null;console.error('Can\'t read file: '+e);}
if(typeof result!=='string'){return;}
this._uiSourceCode.setContent(encoded?btoa(result):result,encoded);};if(encoded){reader.readAsBinaryString(file);}else{reader.readAsText(file);}});}};;SourceFrame.SourceFrame=class extends UI.SimpleView{constructor(lazyContent,codeMirrorOptions){super(Common.UIString('Source'));this._lazyContent=lazyContent;this._pretty=false;this._rawContent=null;this._formattedContentPromise=null;this._formattedMap=null;this._prettyToggle=new UI.ToolbarToggle(ls`Pretty print`,'largeicon-pretty-print');this._prettyToggle.addEventListener(UI.ToolbarButton.Events.Click,()=>{this._setPretty(!this._prettyToggle.toggled());});this._shouldAutoPrettyPrint=false;this._prettyToggle.setVisible(false);this._textEditor=new SourceFrame.SourcesTextEditor(this,codeMirrorOptions);this._textEditor.show(this.element);this._prettyCleanGeneration=null;this._cleanGeneration=0;this._searchConfig=null;this._delayedFindSearchMatches=null;this._currentSearchResultIndex=-1;this._searchResults=[];this._searchRegex=null;this._loadError=false;this._textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.EditorFocused,this._resetCurrentSearchResultIndex,this);this._textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.SelectionChanged,this._updateSourcePosition,this);this._textEditor.addEventListener(UI.TextEditor.Events.TextChanged,event=>{if(!this._muteChangeEventsForSetContent){this.onTextChanged(event.data.oldRange,event.data.newRange);}});this._muteChangeEventsForSetContent=false;this._sourcePosition=new UI.ToolbarText();this._searchableView=null;this._editable=false;this._textEditor.setReadOnly(true);this._positionToReveal=null;this._lineToScrollTo=null;this._selectionToSet=null;this._loaded=false;this._contentRequested=false;this._highlighterType='';this._transformer={editorToRawLocation:(editorLineNumber,editorColumnNumber=0)=>{if(!this._pretty){return[editorLineNumber,editorColumnNumber];}
return this._prettyToRawLocation(editorLineNumber,editorColumnNumber);},rawToEditorLocation:(lineNumber,columnNumber=0)=>{if(!this._pretty){return[lineNumber,columnNumber];}
return this._rawToPrettyLocation(lineNumber,columnNumber);}};}
setCanPrettyPrint(canPrettyPrint,autoPrettyPrint){this._shouldAutoPrettyPrint=canPrettyPrint&&!!autoPrettyPrint;this._prettyToggle.setVisible(canPrettyPrint);}
async _setPretty(value){this._pretty=value;this._prettyToggle.setEnabled(false);const wasLoaded=this.loaded;const selection=this.selection();let newSelection;if(this._pretty){const formatInfo=await this._requestFormattedContent();this._formattedMap=formatInfo.map;this.setContent(formatInfo.content,null);this._prettyCleanGeneration=this._textEditor.markClean();const start=this._rawToPrettyLocation(selection.startLine,selection.startColumn);const end=this._rawToPrettyLocation(selection.endLine,selection.endColumn);newSelection=new TextUtils.TextRange(start[0],start[1],end[0],end[1]);}else{this.setContent(this._rawContent,null);this._cleanGeneration=this._textEditor.markClean();const start=this._prettyToRawLocation(selection.startLine,selection.startColumn);const end=this._prettyToRawLocation(selection.endLine,selection.endColumn);newSelection=new TextUtils.TextRange(start[0],start[1],end[0],end[1]);}
if(wasLoaded){this.textEditor.revealPosition(newSelection.endLine,newSelection.endColumn,this._editable);this.textEditor.setSelection(newSelection);}
this._prettyToggle.setEnabled(true);this._updatePrettyPrintState();}
_updatePrettyPrintState(){this._prettyToggle.setToggled(this._pretty);this._textEditor.element.classList.toggle('pretty-printed',this._pretty);if(this._pretty){this._textEditor.setLineNumberFormatter(lineNumber=>{const line=this._prettyToRawLocation(lineNumber-1,0)[0]+1;if(lineNumber===1){return String(line);}
if(line!==this._prettyToRawLocation(lineNumber-2,0)[0]+1){return String(line);}
return'-';});}else{this._textEditor.setLineNumberFormatter(lineNumber=>{return String(lineNumber);});}}
transformer(){return this._transformer;}
_prettyToRawLocation(line,column){if(!this._formattedMap){return[line,column];}
return this._formattedMap.formattedToOriginal(line,column);}
_rawToPrettyLocation(line,column){if(!this._formattedMap){return[line,column];}
return this._formattedMap.originalToFormatted(line,column);}
setEditable(editable){this._editable=editable;if(this._loaded){this._textEditor.setReadOnly(!editable);}}
hasLoadError(){return this._loadError;}
wasShown(){this._ensureContentLoaded();this._wasShownOrLoaded();}
willHide(){super.willHide();this._clearPositionToReveal();}
syncToolbarItems(){return[this._prettyToggle,this._sourcePosition];}
get loaded(){return this._loaded;}
get textEditor(){return this._textEditor;}
get pretty(){return this._pretty;}
async _ensureContentLoaded(){if(!this._contentRequested){this._contentRequested=true;const{content,error}=(await this._lazyContent());this._rawContent=error||content||'';this._formattedContentPromise=null;this._formattedMap=null;this._prettyToggle.setEnabled(true);if(error){this.setContent(null,error);this._prettyToggle.setEnabled(false);setTimeout(()=>this.setHighlighterType('text/plain'),50);}else{if(this._shouldAutoPrettyPrint&&TextUtils.isMinified(content||'')){await this._setPretty(true);}else{this.setContent(this._rawContent,null);}}}}
_requestFormattedContent(){if(this._formattedContentPromise){return this._formattedContentPromise;}
let fulfill;this._formattedContentPromise=new Promise(x=>fulfill=x);new Formatter.ScriptFormatter(this._highlighterType,this._rawContent||'',(content,map)=>{fulfill({content,map});});return this._formattedContentPromise;}
revealPosition(line,column,shouldHighlight){this._lineToScrollTo=null;this._selectionToSet=null;this._positionToReveal={line:line,column:column,shouldHighlight:shouldHighlight};this._innerRevealPositionIfNeeded();}
_innerRevealPositionIfNeeded(){if(!this._positionToReveal){return;}
if(!this.loaded||!this.isShowing()){return;}
const[line,column]=this._transformer.rawToEditorLocation(this._positionToReveal.line,this._positionToReveal.column);this._textEditor.revealPosition(line,column,this._positionToReveal.shouldHighlight);this._positionToReveal=null;}
_clearPositionToReveal(){this._textEditor.clearPositionHighlight();this._positionToReveal=null;}
scrollToLine(line){this._clearPositionToReveal();this._lineToScrollTo=line;this._innerScrollToLineIfNeeded();}
_innerScrollToLineIfNeeded(){if(this._lineToScrollTo!==null){if(this.loaded&&this.isShowing()){this._textEditor.scrollToLine(this._lineToScrollTo);this._lineToScrollTo=null;}}}
selection(){return this.textEditor.selection();}
setSelection(textRange){this._selectionToSet=textRange;this._innerSetSelectionIfNeeded();}
_innerSetSelectionIfNeeded(){if(this._selectionToSet&&this.loaded&&this.isShowing()){this._textEditor.setSelection(this._selectionToSet,true);this._selectionToSet=null;}}
_wasShownOrLoaded(){this._innerRevealPositionIfNeeded();this._innerSetSelectionIfNeeded();this._innerScrollToLineIfNeeded();}
onTextChanged(oldRange,newRange){const wasPretty=this.pretty;this._pretty=this._prettyCleanGeneration!==null&&this.textEditor.isClean(this._prettyCleanGeneration);if(this._pretty!==wasPretty){this._updatePrettyPrintState();}
this._prettyToggle.setEnabled(this.isClean());if(this._searchConfig&&this._searchableView){this.performSearch(this._searchConfig,false,false);}}
isClean(){return this.textEditor.isClean(this._cleanGeneration)||(this._prettyCleanGeneration!==null&&this.textEditor.isClean(this._prettyCleanGeneration));}
contentCommitted(){this._cleanGeneration=this._textEditor.markClean();this._prettyCleanGeneration=null;this._rawContent=this.textEditor.text();this._formattedMap=null;this._formattedContentPromise=null;if(this._pretty){this._pretty=false;this._updatePrettyPrintState();}
this._prettyToggle.setEnabled(true);}
_simplifyMimeType(content,mimeType){if(!mimeType){return'';}
if(mimeType.indexOf('typescript')>=0){return'text/typescript-jsx';}
if(mimeType.indexOf('javascript')>=0||mimeType.indexOf('jscript')>=0||mimeType.indexOf('ecmascript')>=0){return'text/jsx';}
if(mimeType==='text/x-php'&&content.match(/\<\?.*\?\>/g)){return'application/x-httpd-php';}
return mimeType;}
setHighlighterType(highlighterType){this._highlighterType=highlighterType;this._updateHighlighterType('');}
highlighterType(){return this._highlighterType;}
_updateHighlighterType(content){this._textEditor.setMimeType(this._simplifyMimeType(content,this._highlighterType));}
setContent(content,loadError){this._muteChangeEventsForSetContent=true;if(!this._loaded){this._loaded=true;if(!loadError){this._textEditor.setText(content||'');this._cleanGeneration=this._textEditor.markClean();this._textEditor.setReadOnly(!this._editable);this._loadError=false;}else{this._textEditor.setText(loadError||'');this._highlighterType='text/plain';this._textEditor.setReadOnly(true);this._loadError=true;}}else{const scrollTop=this._textEditor.scrollTop();const selection=this._textEditor.selection();this._textEditor.setText(content||'');this._textEditor.setScrollTop(scrollTop);this._textEditor.setSelection(selection);}
this._updateHighlighterType(content||'');this._wasShownOrLoaded();if(this._delayedFindSearchMatches){this._delayedFindSearchMatches();this._delayedFindSearchMatches=null;}
this._muteChangeEventsForSetContent=false;}
setSearchableView(view){this._searchableView=view;}
_doFindSearchMatches(searchConfig,shouldJump,jumpBackwards){this._currentSearchResultIndex=-1;this._searchResults=[];const regex=searchConfig.toSearchRegex();this._searchRegex=regex;this._searchResults=this._collectRegexMatches(regex);if(this._searchableView){this._searchableView.updateSearchMatchesCount(this._searchResults.length);}
if(!this._searchResults.length){this._textEditor.cancelSearchResultsHighlight();}else if(shouldJump&&jumpBackwards){this.jumpToPreviousSearchResult();}else if(shouldJump){this.jumpToNextSearchResult();}else{this._textEditor.highlightSearchResults(regex,null);}}
performSearch(searchConfig,shouldJump,jumpBackwards){if(this._searchableView){this._searchableView.updateSearchMatchesCount(0);}
this._resetSearch();this._searchConfig=searchConfig;if(this.loaded){this._doFindSearchMatches(searchConfig,shouldJump,!!jumpBackwards);}else{this._delayedFindSearchMatches=this._doFindSearchMatches.bind(this,searchConfig,shouldJump,!!jumpBackwards);}
this._ensureContentLoaded();}
_resetCurrentSearchResultIndex(){if(!this._searchResults.length){return;}
this._currentSearchResultIndex=-1;if(this._searchableView){this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);}
this._textEditor.highlightSearchResults((this._searchRegex),null);}
_resetSearch(){this._searchConfig=null;this._delayedFindSearchMatches=null;this._currentSearchResultIndex=-1;this._searchResults=[];this._searchRegex=null;}
searchCanceled(){const range=this._currentSearchResultIndex!==-1?this._searchResults[this._currentSearchResultIndex]:null;this._resetSearch();if(!this.loaded){return;}
this._textEditor.cancelSearchResultsHighlight();if(range){this.setSelection(range);}}
jumpToLastSearchResult(){this.jumpToSearchResult(this._searchResults.length-1);}
_searchResultIndexForCurrentSelection(){return this._searchResults.lowerBound(this._textEditor.selection().collapseToEnd(),TextUtils.TextRange.comparator);}
jumpToNextSearchResult(){const currentIndex=this._searchResultIndexForCurrentSelection();const nextIndex=this._currentSearchResultIndex===-1?currentIndex:currentIndex+1;this.jumpToSearchResult(nextIndex);}
jumpToPreviousSearchResult(){const currentIndex=this._searchResultIndexForCurrentSelection();this.jumpToSearchResult(currentIndex-1);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}
jumpToSearchResult(index){if(!this.loaded||!this._searchResults.length){return;}
this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;if(this._searchableView){this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);}
this._textEditor.highlightSearchResults((this._searchRegex),this._searchResults[this._currentSearchResultIndex]);}
replaceSelectionWith(searchConfig,replacement){const range=this._searchResults[this._currentSearchResultIndex];if(!range){return;}
this._textEditor.highlightSearchResults((this._searchRegex),null);const oldText=this._textEditor.text(range);const regex=searchConfig.toSearchRegex();let text;if(regex.__fromRegExpQuery){text=oldText.replace(regex,replacement);}else{text=oldText.replace(regex,function(){return replacement;});}
const newRange=this._textEditor.editRange(range,text);this._textEditor.setSelection(newRange.collapseToEnd());}
replaceAllWith(searchConfig,replacement){this._resetCurrentSearchResultIndex();let text=this._textEditor.text();const range=this._textEditor.fullRange();const regex=searchConfig.toSearchRegex(true);if(regex.__fromRegExpQuery){text=text.replace(regex,replacement);}else{text=text.replace(regex,function(){return replacement;});}
const ranges=this._collectRegexMatches(regex);if(!ranges.length){return;}
const currentRangeIndex=ranges.lowerBound(this._textEditor.selection(),TextUtils.TextRange.comparator);const lastRangeIndex=mod(currentRangeIndex-1,ranges.length);const lastRange=ranges[lastRangeIndex];const replacementLineEndings=replacement.computeLineEndings();const replacementLineCount=replacementLineEndings.length;const lastLineNumber=lastRange.startLine+replacementLineEndings.length-1;let lastColumnNumber=lastRange.startColumn;if(replacementLineEndings.length>1){lastColumnNumber=replacementLineEndings[replacementLineCount-1]-replacementLineEndings[replacementLineCount-2]-1;}
this._textEditor.editRange(range,text);this._textEditor.revealPosition(lastLineNumber,lastColumnNumber);this._textEditor.setSelection(TextUtils.TextRange.createFromLocation(lastLineNumber,lastColumnNumber));}
_collectRegexMatches(regexObject){const ranges=[];for(let i=0;i<this._textEditor.linesCount;++i){let line=this._textEditor.line(i);let offset=0;let match;do{match=regexObject.exec(line);if(match){const matchEndIndex=match.index+Math.max(match[0].length,1);if(match[0].length){ranges.push(new TextUtils.TextRange(i,offset+match.index,i,offset+matchEndIndex));}
offset+=matchEndIndex;line=line.substring(matchEndIndex);}}while(match&&line);}
return ranges;}
populateLineGutterContextMenu(contextMenu,editorLineNumber){return Promise.resolve();}
populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber){return Promise.resolve();}
canEditSource(){return this._editable;}
_updateSourcePosition(){const selections=this._textEditor.selections();if(!selections.length){return;}
if(selections.length>1){this._sourcePosition.setText(Common.UIString('%d selection regions',selections.length));return;}
let textRange=selections[0];if(textRange.isEmpty()){const location=this._prettyToRawLocation(textRange.endLine,textRange.endColumn);this._sourcePosition.setText(ls`Line ${location[0] + 1}, Column ${location[1] + 1}`);return;}
textRange=textRange.normalize();const selectedText=this._textEditor.text(textRange);if(textRange.startLine===textRange.endLine){this._sourcePosition.setText(Common.UIString('%d characters selected',selectedText.length));}else{this._sourcePosition.setText(Common.UIString('%d lines, %d characters selected',textRange.endLine-textRange.startLine+1,selectedText.length));}}};SourceFrame.LineDecorator=function(){};SourceFrame.LineDecorator.prototype={decorate(uiSourceCode,textEditor,type){}};SourceFrame.Transformer;;SourceFrame.ResourceSourceFrame=class extends SourceFrame.SourceFrame{constructor(resource,autoPrettyPrint,codeMirrorOptions){super(async()=>{let content=(await resource.requestContent()).content||'';if(await resource.contentEncoded()){content=window.atob(content);}
return{content,isEncoded:false};},codeMirrorOptions);this._resource=resource;this.setCanPrettyPrint(this._resource.contentType().isDocumentOrScriptOrStyleSheet(),autoPrettyPrint);}
static createSearchableView(resource,highlighterType,autoPrettyPrint){return new SourceFrame.ResourceSourceFrame.SearchableContainer(resource,highlighterType,autoPrettyPrint);}
get resource(){return this._resource;}
populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber){contextMenu.appendApplicableItems(this._resource);return Promise.resolve();}};SourceFrame.ResourceSourceFrame.SearchableContainer=class extends UI.VBox{constructor(resource,highlighterType,autoPrettyPrint){super(true);this.registerRequiredCSS('source_frame/resourceSourceFrame.css');const sourceFrame=new SourceFrame.ResourceSourceFrame(resource,autoPrettyPrint);this._sourceFrame=sourceFrame;sourceFrame.setHighlighterType(highlighterType);const searchableView=new UI.SearchableView(sourceFrame);searchableView.element.classList.add('searchable-view');searchableView.setPlaceholder(ls`Find`);sourceFrame.show(searchableView.element);sourceFrame.setSearchableView(searchableView);searchableView.show(this.contentElement);const toolbar=new UI.Toolbar('toolbar',this.contentElement);for(const item of sourceFrame.syncToolbarItems()){toolbar.appendToolbarItem(item);}}
async revealPosition(lineNumber,columnNumber){this._sourceFrame.revealPosition(lineNumber,columnNumber,true);}};;SourceFrame.JSONView=class extends UI.VBox{constructor(parsedJSON){super();this._initialized=false;this.registerRequiredCSS('source_frame/jsonView.css');this._parsedJSON=parsedJSON;this.element.classList.add('json-view');this._searchableView;this._treeOutline;this._currentSearchFocusIndex=0;this._currentSearchTreeElements=[];this._searchRegex=null;}
static async createView(content){const parsedJSON=await SourceFrame.JSONView._parseJSON(content);if(!parsedJSON||typeof parsedJSON.data!=='object'){return null;}
const jsonView=new SourceFrame.JSONView(parsedJSON);const searchableView=new UI.SearchableView(jsonView);searchableView.setPlaceholder(Common.UIString('Find'));jsonView._searchableView=searchableView;jsonView.show(searchableView.element);return searchableView;}
static createViewSync(obj){const jsonView=new SourceFrame.JSONView(new SourceFrame.ParsedJSON(obj,'',''));const searchableView=new UI.SearchableView(jsonView);searchableView.setPlaceholder(Common.UIString('Find'));jsonView._searchableView=searchableView;jsonView.show(searchableView.element);jsonView.element.setAttribute('tabIndex',0);return searchableView;}
static _parseJSON(text){let returnObj=null;if(text){returnObj=SourceFrame.JSONView._extractJSON((text));}
if(!returnObj){return Promise.resolve((null));}
return Formatter.formatterWorkerPool().parseJSONRelaxed(returnObj.data).then(handleReturnedJSON);function handleReturnedJSON(data){if(!data){return null;}
returnObj.data=data;return returnObj;}}
static _extractJSON(text){if(text.startsWith('<')){return null;}
let inner=SourceFrame.JSONView._findBrackets(text,'{','}');const inner2=SourceFrame.JSONView._findBrackets(text,'[',']');inner=inner2.length>inner.length?inner2:inner;if(inner.length===-1||text.length-inner.length>80){return null;}
const prefix=text.substring(0,inner.start);const suffix=text.substring(inner.end+1);text=text.substring(inner.start,inner.end+1);if(suffix.trim().length&&!(suffix.trim().startsWith(')')&&prefix.trim().endsWith('('))){return null;}
return new SourceFrame.ParsedJSON(text,prefix,suffix);}
static _findBrackets(text,open,close){const start=text.indexOf(open);const end=text.lastIndexOf(close);let length=end-start-1;if(start===-1||end===-1||end<start){length=-1;}
return{start:start,end:end,length:length};}
wasShown(){this._initialize();}
_initialize(){if(this._initialized){return;}
this._initialized=true;const obj=SDK.RemoteObject.fromLocalObject(this._parsedJSON.data);const title=this._parsedJSON.prefix+obj.description+this._parsedJSON.suffix;this._treeOutline=new ObjectUI.ObjectPropertiesSection(obj,title,undefined,undefined,undefined,undefined,true);this._treeOutline.enableContextMenu();this._treeOutline.setEditable(false);this._treeOutline.expand();this.element.appendChild(this._treeOutline.element);this._treeOutline.firstChild().select(true,false);}
_jumpToMatch(index){if(!this._searchRegex){return;}
const previousFocusElement=this._currentSearchTreeElements[this._currentSearchFocusIndex];if(previousFocusElement){previousFocusElement.setSearchRegex(this._searchRegex);}
const newFocusElement=this._currentSearchTreeElements[index];if(newFocusElement){this._updateSearchIndex(index);newFocusElement.setSearchRegex(this._searchRegex,UI.highlightedCurrentSearchResultClassName);newFocusElement.reveal();}else{this._updateSearchIndex(0);}}
_updateSearchCount(count){if(!this._searchableView){return;}
this._searchableView.updateSearchMatchesCount(count);}
_updateSearchIndex(index){this._currentSearchFocusIndex=index;if(!this._searchableView){return;}
this._searchableView.updateCurrentMatchIndex(index);}
searchCanceled(){this._searchRegex=null;this._currentSearchTreeElements=[];for(let element=this._treeOutline.rootElement();element;element=element.traverseNextTreeElement(false)){if(!(element instanceof ObjectUI.ObjectPropertyTreeElement)){continue;}
element.revertHighlightChanges();}
this._updateSearchCount(0);this._updateSearchIndex(0);}
performSearch(searchConfig,shouldJump,jumpBackwards){let newIndex=this._currentSearchFocusIndex;const previousSearchFocusElement=this._currentSearchTreeElements[newIndex];this.searchCanceled();this._searchRegex=searchConfig.toSearchRegex(true);for(let element=this._treeOutline.rootElement();element;element=element.traverseNextTreeElement(false)){if(!(element instanceof ObjectUI.ObjectPropertyTreeElement)){continue;}
const hasMatch=element.setSearchRegex(this._searchRegex);if(hasMatch){this._currentSearchTreeElements.push(element);}
if(previousSearchFocusElement===element){const currentIndex=this._currentSearchTreeElements.length-1;if(hasMatch||jumpBackwards){newIndex=currentIndex;}else{newIndex=currentIndex+1;}}}
this._updateSearchCount(this._currentSearchTreeElements.length);if(!this._currentSearchTreeElements.length){this._updateSearchIndex(0);return;}
newIndex=mod(newIndex,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex);}
jumpToNextSearchResult(){if(!this._currentSearchTreeElements.length){return;}
const newIndex=mod(this._currentSearchFocusIndex+1,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex);}
jumpToPreviousSearchResult(){if(!this._currentSearchTreeElements.length){return;}
const newIndex=mod(this._currentSearchFocusIndex-1,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}};SourceFrame.ParsedJSON=class{constructor(data,prefix,suffix){this.data=data;this.prefix=prefix;this.suffix=suffix;}};;SourceFrame.XMLView=class extends UI.Widget{constructor(parsedXML){super(true);this.registerRequiredCSS('source_frame/xmlView.css');this.contentElement.classList.add('shadow-xml-view','source-code');this._treeOutline=new UI.TreeOutlineInShadow();this._treeOutline.registerRequiredCSS('source_frame/xmlTree.css');this.contentElement.appendChild(this._treeOutline.element);this._searchableView;this._currentSearchFocusIndex=0;this._currentSearchTreeElements=[];this._searchConfig;SourceFrame.XMLView.Node.populate(this._treeOutline,parsedXML,this);this._treeOutline.firstChild().select(true,false);}
static createSearchableView(parsedXML){const xmlView=new SourceFrame.XMLView(parsedXML);const searchableView=new UI.SearchableView(xmlView);searchableView.setPlaceholder(Common.UIString('Find'));xmlView._searchableView=searchableView;xmlView.show(searchableView.element);return searchableView;}
static parseXML(text,mimeType){let parsedXML;try{parsedXML=(new DOMParser()).parseFromString(text,mimeType);}catch(e){return null;}
if(parsedXML.body){return null;}
return parsedXML;}
_jumpToMatch(index,shouldJump){if(!this._searchConfig){return;}
const regex=this._searchConfig.toSearchRegex(true);const previousFocusElement=this._currentSearchTreeElements[this._currentSearchFocusIndex];if(previousFocusElement){previousFocusElement.setSearchRegex(regex);}
const newFocusElement=this._currentSearchTreeElements[index];if(newFocusElement){this._updateSearchIndex(index);if(shouldJump){newFocusElement.reveal(true);}
newFocusElement.setSearchRegex(regex,UI.highlightedCurrentSearchResultClassName);}else{this._updateSearchIndex(0);}}
_updateSearchCount(count){if(!this._searchableView){return;}
this._searchableView.updateSearchMatchesCount(count);}
_updateSearchIndex(index){this._currentSearchFocusIndex=index;if(!this._searchableView){return;}
this._searchableView.updateCurrentMatchIndex(index);}
_innerPerformSearch(shouldJump,jumpBackwards){if(!this._searchConfig){return;}
let newIndex=this._currentSearchFocusIndex;const previousSearchFocusElement=this._currentSearchTreeElements[newIndex];this._innerSearchCanceled();this._currentSearchTreeElements=[];const regex=this._searchConfig.toSearchRegex(true);for(let element=this._treeOutline.rootElement();element;element=element.traverseNextTreeElement(false)){if(!(element instanceof SourceFrame.XMLView.Node)){continue;}
const hasMatch=element.setSearchRegex(regex);if(hasMatch){this._currentSearchTreeElements.push(element);}
if(previousSearchFocusElement===element){const currentIndex=this._currentSearchTreeElements.length-1;if(hasMatch||jumpBackwards){newIndex=currentIndex;}else{newIndex=currentIndex+1;}}}
this._updateSearchCount(this._currentSearchTreeElements.length);if(!this._currentSearchTreeElements.length){this._updateSearchIndex(0);return;}
newIndex=mod(newIndex,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex,shouldJump);}
_innerSearchCanceled(){for(let element=this._treeOutline.rootElement();element;element=element.traverseNextTreeElement(false)){if(!(element instanceof SourceFrame.XMLView.Node)){continue;}
element.revertHighlightChanges();}
this._updateSearchCount(0);this._updateSearchIndex(0);}
searchCanceled(){this._searchConfig=null;this._currentSearchTreeElements=[];this._innerSearchCanceled();}
performSearch(searchConfig,shouldJump,jumpBackwards){this._searchConfig=searchConfig;this._innerPerformSearch(shouldJump,jumpBackwards);}
jumpToNextSearchResult(){if(!this._currentSearchTreeElements.length){return;}
const newIndex=mod(this._currentSearchFocusIndex+1,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex,true);}
jumpToPreviousSearchResult(){if(!this._currentSearchTreeElements.length){return;}
const newIndex=mod(this._currentSearchFocusIndex-1,this._currentSearchTreeElements.length);this._jumpToMatch(newIndex,true);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}};SourceFrame.XMLView.Node=class extends UI.TreeElement{constructor(node,closeTag,xmlView){super('',!closeTag&&!!node.childElementCount);this._node=node;this._closeTag=closeTag;this.selectable=true;this._highlightChanges=[];this._xmlView=xmlView;this._updateTitle();}
static populate(root,xmlNode,xmlView){let node=xmlNode.firstChild;while(node){const currentNode=node;node=node.nextSibling;const nodeType=currentNode.nodeType;if(nodeType===3&&currentNode.nodeValue.match(/\s+/)){continue;}
if((nodeType!==1)&&(nodeType!==3)&&(nodeType!==4)&&(nodeType!==7)&&(nodeType!==8)){continue;}
root.appendChild(new SourceFrame.XMLView.Node(currentNode,false,xmlView));}}
setSearchRegex(regex,additionalCssClassName){this.revertHighlightChanges();if(!regex){return false;}
if(this._closeTag&&this.parent&&!this.parent.expanded){return false;}
regex.lastIndex=0;let cssClasses=UI.highlightedSearchResultClassName;if(additionalCssClassName){cssClasses+=' '+additionalCssClassName;}
const content=this.listItemElement.textContent.replace(/\xA0/g,' ');let match=regex.exec(content);const ranges=[];while(match){ranges.push(new TextUtils.SourceRange(match.index,match[0].length));match=regex.exec(content);}
if(ranges.length){UI.highlightRangesWithStyleClass(this.listItemElement,ranges,cssClasses,this._highlightChanges);}
return!!this._highlightChanges.length;}
revertHighlightChanges(){UI.revertDomChanges(this._highlightChanges);this._highlightChanges=[];}
_updateTitle(){const node=this._node;switch(node.nodeType){case 1:const tag=node.tagName;if(this._closeTag){this._setTitle(['</'+tag+'>','shadow-xml-view-tag']);return;}
const titleItems=['<'+tag,'shadow-xml-view-tag'];const attributes=node.attributes;for(let i=0;i<attributes.length;++i){const attributeNode=attributes.item(i);titleItems.push('\xA0','shadow-xml-view-tag',attributeNode.name,'shadow-xml-view-attribute-name','="','shadow-xml-view-tag',attributeNode.value,'shadow-xml-view-attribute-value','"','shadow-xml-view-tag');}
if(!this.expanded){if(node.childElementCount){titleItems.push('>','shadow-xml-view-tag','\u2026','shadow-xml-view-comment','</'+tag,'shadow-xml-view-tag');}else if(this._node.textContent){titleItems.push('>','shadow-xml-view-tag',node.textContent,'shadow-xml-view-text','</'+tag,'shadow-xml-view-tag');}else{titleItems.push(' /','shadow-xml-view-tag');}}
titleItems.push('>','shadow-xml-view-tag');this._setTitle(titleItems);return;case 3:this._setTitle([node.nodeValue,'shadow-xml-view-text']);return;case 4:this._setTitle(['<![CDATA[','shadow-xml-view-cdata',node.nodeValue,'shadow-xml-view-text',']]>','shadow-xml-view-cdata']);return;case 7:this._setTitle(['<?'+node.nodeName+' '+node.nodeValue+'?>','shadow-xml-view-processing-instruction']);return;case 8:this._setTitle(['<!--'+node.nodeValue+'-->','shadow-xml-view-comment']);return;}}
_setTitle(items){const titleFragment=createDocumentFragment();for(let i=0;i<items.length;i+=2){titleFragment.createChild('span',items[i+1]).textContent=items[i];}
this.title=titleFragment;this._xmlView._innerPerformSearch(false,false);}
onattach(){this.listItemElement.classList.toggle('shadow-xml-view-close-tag',this._closeTag);}
onexpand(){this._updateTitle();}
oncollapse(){this._updateTitle();}
async onpopulate(){SourceFrame.XMLView.Node.populate(this,this._node,this._xmlView);this.appendChild(new SourceFrame.XMLView.Node(this._node,true,this._xmlView));}};;SourceFrame.PreviewFactory=class{static async createPreview(provider,mimeType){let resourceType=Common.ResourceType.fromMimeType(mimeType);if(resourceType===Common.resourceTypes.Other){resourceType=provider.contentType();}
switch(resourceType){case Common.resourceTypes.Image:return new SourceFrame.ImageView(mimeType,provider);case Common.resourceTypes.Font:return new SourceFrame.FontView(mimeType,provider);}
const deferredContent=await provider.requestContent();if(deferredContent.error){return new UI.EmptyWidget(deferredContent.error);}else if(!deferredContent.content){return new UI.EmptyWidget(Common.UIString('Nothing to preview'));}
let content=deferredContent.content;if(await provider.contentEncoded()){content=window.atob(content);}
const parsedXML=SourceFrame.XMLView.parseXML(content,mimeType);if(parsedXML){return SourceFrame.XMLView.createSearchableView(parsedXML);}
const jsonView=await SourceFrame.JSONView.createView(content);if(jsonView){return jsonView;}
if(resourceType.isTextType()){const highlighterType=provider.contentType().canonicalMimeType()||mimeType.replace(/;.*/,'');return SourceFrame.ResourceSourceFrame.createSearchableView(provider,highlighterType,true);}
return null;}};;SourceFrame.SourceCodeDiff=class{constructor(textEditor){this._textEditor=textEditor;this._animatedLines=[];this._animationTimeout=null;}
highlightModifiedLines(oldContent,newContent){if(typeof oldContent!=='string'||typeof newContent!=='string'){return;}
const diff=SourceFrame.SourceCodeDiff.computeDiff(Diff.Diff.lineDiff(oldContent.split('\n'),newContent.split('\n')));const changedLines=[];for(let i=0;i<diff.length;++i){const diffEntry=diff[i];if(diffEntry.type===SourceFrame.SourceCodeDiff.EditType.Delete){continue;}
for(let lineNumber=diffEntry.from;lineNumber<diffEntry.to;++lineNumber){const position=this._textEditor.textEditorPositionHandle(lineNumber,0);if(position){changedLines.push(position);}}}
this._updateHighlightedLines(changedLines);this._animationTimeout=setTimeout(this._updateHighlightedLines.bind(this,[]),400);}
_updateHighlightedLines(newLines){if(this._animationTimeout){clearTimeout(this._animationTimeout);}
this._animationTimeout=null;this._textEditor.operation(operation.bind(this));function operation(){toggleLines.call(this,false);this._animatedLines=newLines;toggleLines.call(this,true);}
function toggleLines(value){for(let i=0;i<this._animatedLines.length;++i){const location=this._animatedLines[i].resolve();if(location){this._textEditor.toggleLineClass(location.lineNumber,'highlight-line-modification',value);}}}}
static computeDiff(diff){const result=[];let hasAdded=false;let hasRemoved=false;let blockStartLineNumber=0;let currentLineNumber=0;let isInsideBlock=false;for(let i=0;i<diff.length;++i){const token=diff[i];if(token[0]===Diff.Diff.Operation.Equal){if(isInsideBlock){flush();}
currentLineNumber+=token[1].length;continue;}
if(!isInsideBlock){isInsideBlock=true;blockStartLineNumber=currentLineNumber;}
if(token[0]===Diff.Diff.Operation.Delete){hasRemoved=true;}else{currentLineNumber+=token[1].length;hasAdded=true;}}
if(isInsideBlock){flush();}
if(result.length>1&&result[0].from===0&&result[1].from===0){const merged={type:SourceFrame.SourceCodeDiff.EditType.Modify,from:0,to:result[1].to};result.splice(0,2,merged);}
return result;function flush(){let type=SourceFrame.SourceCodeDiff.EditType.Insert;let from=blockStartLineNumber;let to=currentLineNumber;if(hasAdded&&hasRemoved){type=SourceFrame.SourceCodeDiff.EditType.Modify;}else if(!hasAdded&&hasRemoved&&from===0&&to===0){type=SourceFrame.SourceCodeDiff.EditType.Modify;to=1;}else if(!hasAdded&&hasRemoved){type=SourceFrame.SourceCodeDiff.EditType.Delete;from-=1;}
result.push({type:type,from:from,to:to});isInsideBlock=false;hasAdded=false;hasRemoved=false;}}};SourceFrame.SourceCodeDiff.EditType={Insert:Symbol('Insert'),Delete:Symbol('Delete'),Modify:Symbol('Modify'),};;Root.Runtime.cachedResources["source_frame/fontView.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.font-view {\n    font-size: 60px;\n    white-space: pre-wrap;\n    word-wrap: break-word;\n    text-align: center;\n    padding: 15px;\n}\n\n/*# sourceURL=source_frame/fontView.css */";Root.Runtime.cachedResources["source_frame/imageView.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.image-view {\n    overflow: auto;\n}\n\n.image-view > .image {\n    padding: 20px 20px 10px 20px;\n    text-align: center;\n}\n\n.image-view img.resource-image-view {\n    max-width: 100%;\n    max-height: 1000px;\n    background-image: url(Images/checker.png);\n    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);\n    -webkit-user-select: text;\n    -webkit-user-drag: auto;\n}\n\n/*# sourceURL=source_frame/imageView.css */";Root.Runtime.cachedResources["source_frame/jsonView.css"]=".json-view {\n    padding: 2px 6px;\n    overflow: auto;\n}\n\n/*# sourceURL=source_frame/jsonView.css */";Root.Runtime.cachedResources["source_frame/messagesPopover.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.text-editor-messages-description-container {\n    display: inline-block;\n}\n\n.text-editor-row-message:first-child {\n    border-top-width: 0;\n}\n\n.text-editor-row-message {\n    line-height: 1.2;\n    white-space: nowrap;\n    display: flex;\n    align-items: center;\n    justify-content: flex-start;\n    margin-top: 2px;\n}\n\n.text-editor-row-message-repeat-count {\n    margin-right: 0.5em;\n}\n\n/*# sourceURL=source_frame/messagesPopover.css */";Root.Runtime.cachedResources["source_frame/xmlTree.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline ol {\n    list-style: none;\n    padding: 0;\n    margin: 0;\n    padding-inline-start: 16px;\n}\n\nol.tree-outline {\n    padding-inline-start: 0;\n}\n\n.tree-outline li {\n    min-height: 12px;\n}\n\n.tree-outline li.shadow-xml-view-close-tag {\n    margin-left: -16px;\n}\n\n.shadow-xml-view-tag {\n    color: rgb(136, 18, 128);\n}\n\n.shadow-xml-view-comment {\n    color: rgb(35, 110, 37);\n}\n\n.shadow-xml-view-processing-instruction {\n    color: rgb(35, 110, 37);\n}\n\n.shadow-xml-view-attribute-name {\n    color: rgb(153, 69, 0);\n}\n\n.shadow-xml-view-attribute-value {\n    color: rgb(26, 26, 166);\n}\n\n.shadow-xml-view-text {\n    color: rgb(0, 0, 0);\n    white-space: pre;\n}\n\n.shadow-xml-view-cdata {\n    color: rgb(0, 0, 0);\n}\n\n/*# sourceURL=source_frame/xmlTree.css */";Root.Runtime.cachedResources["source_frame/xmlView.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.shadow-xml-view {\n    -webkit-user-select: text;\n    overflow: auto;\n    padding: 2px 4px;\n}\n\n/*# sourceURL=source_frame/xmlView.css */";Root.Runtime.cachedResources["source_frame/resourceSourceFrame.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n.searchable-view {\n  flex: 1;\n}\n\n.toolbar {\n  background-color: #eee;\n  border-top: 1px solid #ccc;\n}\n\n/*# sourceURL=source_frame/resourceSourceFrame.css */";