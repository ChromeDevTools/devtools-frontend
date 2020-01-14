export class TextEditorFactory{createEditor(options){}}
export class TextEditor extends Common.EventTarget{widget(){}
fullRange(){}
selection(){}
setSelection(selection){}
text(textRange){}
textWithCurrentSuggestion(){}
setText(text){}
line(lineNumber){}
newlineAndIndent(){}
addKeyDownHandler(handler){}
configureAutocomplete(config){}
clearAutocomplete(){}
visualCoordinates(lineNumber,columnNumber){}
tokenAtTextPosition(lineNumber,columnNumber){}
setPlaceholder(placeholder){}}
export const Events={CursorChanged:Symbol('CursorChanged'),TextChanged:Symbol('TextChanged'),SuggestionChanged:Symbol('SuggestionChanged')};self.UI=self.UI||{};UI=UI||{};UI.TextEditor=TextEditor;UI.TextEditorFactory=TextEditorFactory;UI.TextEditor.Events=Events;UI.TextEditor.Options;UI.AutocompleteConfig;