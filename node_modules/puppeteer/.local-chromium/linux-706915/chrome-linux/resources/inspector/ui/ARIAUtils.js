let _id=0;export function nextId(prefix){return(prefix||'')+ ++_id;}
export function bindLabelToControl(label,control){const controlId=nextId('labelledControl');control.id=controlId;label.setAttribute('for',controlId);}
export function markAsAlert(element){element.setAttribute('role','alert');element.setAttribute('aria-live','polite');}
export function markAsButton(element){element.setAttribute('role','button');}
export function markAsCheckbox(element){element.setAttribute('role','checkbox');}
export function markAsCombobox(element){element.setAttribute('role','combobox');}
export function markAsModalDialog(element){element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');}
export function markAsGroup(element){element.setAttribute('role','group');}
export function markAsLink(element){element.setAttribute('role','link');}
export function markAsMenuButton(element){markAsButton(element);element.setAttribute('aria-haspopup',true);}
export function markAsProgressBar(element,min=0,max=100){element.setAttribute('role','progressbar');element.setAttribute('aria-valuemin',min);element.setAttribute('aria-valuemax',max);}
export function markAsTab(element){element.setAttribute('role','tab');}
export function markAsTree(element){element.setAttribute('role','tree');}
export function markAsTreeitem(element){element.setAttribute('role','treeitem');}
export function markAsTextBox(element){element.setAttribute('role','textbox');}
export function markAsMenu(element){element.setAttribute('role','menu');}
export function markAsMenuItem(element){element.setAttribute('role','menuitem');}
export function markAsMenuItemSubMenu(element){markAsMenuItem(element);element.setAttribute('aria-haspopup',true);}
export function markAsList(element){element.setAttribute('role','list');}
export function markAsListitem(element){element.setAttribute('role','listitem');}
export function markAsListBox(element){element.setAttribute('role','listbox');}
export function markAsMultiSelectable(element){element.setAttribute('aria-multiselectable','true');}
export function markAsOption(element){element.setAttribute('role','option');}
export function markAsRadioGroup(element){element.setAttribute('role','radiogroup');}
export function markAsHidden(element){element.setAttribute('aria-hidden','true');}
export function markAsHeading(element,level){element.setAttribute('role','heading');element.setAttribute('aria-level',level);}
export function markAsPoliteLiveRegion(element){element.setAttribute('aria-live','polite');}
export function setPlaceholder(element,placeholder){if(placeholder){element.setAttribute('aria-placeholder',placeholder);}else{element.removeAttribute('aria-placeholder');}}
export function markAsPresentation(element){element.setAttribute('role','presentation');}
export function markAsStatus(element){element.setAttribute('role','status');}
export function ensureId(element){if(!element.id){element.id=nextId('ariaElement');}}
export function setControls(element,controlledElement){if(!controlledElement){element.removeAttribute('aria-controls');return;}
ensureId(controlledElement);element.setAttribute('aria-controls',controlledElement.id);}
export function setChecked(element,value){element.setAttribute('aria-checked',!!value);}
export function setCheckboxAsIndeterminate(element){element.setAttribute('aria-checked','mixed');}
export function setExpanded(element,value){element.setAttribute('aria-expanded',!!value);}
export function unsetExpandable(element){element.removeAttribute('aria-expanded');}
export const AutocompleteInteractionModel={inline:'inline',list:'list',both:'both',none:'none',};export function setAutocomplete(element,interactionModel=AutocompleteInteractionModel.none){element.setAttribute('aria-autocomplete',interactionModel);}
export function setSelected(element,value){element.setAttribute('aria-selected',!!value);}
export function setInvalid(element,value){if(value){element.setAttribute('aria-invalid',value);}else{element.removeAttribute('aria-invalid');}}
export function setPressed(element,value){element.setAttribute('aria-pressed',!!value);}
export function setProgressBarCurrentPercentage(element,value){element.setAttribute('aria-valuenow',value);}
export function setAccessibleName(element,name){element.setAttribute('aria-label',name);}
const _descriptionMap=new WeakMap();export function setDescription(element,description){if(_descriptionMap.has(element)){_descriptionMap.get(element).remove();}
element.removeAttribute('data-aria-utils-animation-hack');if(!description){_descriptionMap.delete(element);element.removeAttribute('aria-describedby');return;}
const descriptionElement=createElement('span');descriptionElement.textContent=description;descriptionElement.style.display='none';ensureId(descriptionElement);element.setAttribute('aria-describedby',descriptionElement.id);_descriptionMap.set(element,descriptionElement);const contentfulVoidTags=new Set(['INPUT','IMG']);if(!contentfulVoidTags.has(element.tagName)){element.appendChild(descriptionElement);return;}
const inserted=element.insertAdjacentElement('afterend',descriptionElement);if(inserted){return;}
element.setAttribute('data-aria-utils-animation-hack','sorry');element.addEventListener('animationend',()=>{if(_descriptionMap.get(element)!==descriptionElement){return;}
element.removeAttribute('data-aria-utils-animation-hack');element.insertAdjacentElement('afterend',descriptionElement);},{once:true});}
export function setActiveDescendant(element,activedescendant){if(!activedescendant){element.removeAttribute('aria-activedescendant');return;}
console.assert(element.hasSameShadowRoot(activedescendant),'elements are not in the same shadow dom');ensureId(activedescendant);element.setAttribute('aria-activedescendant',activedescendant.id);}
const AlertElementSymbol=Symbol('AlertElementSybmol');export function alert(message,element){const document=element.ownerDocument;if(!document[AlertElementSymbol]){const alertElement=document.body.createChild('div');alertElement.style.position='absolute';alertElement.style.left='-999em';alertElement.style.width='100em';alertElement.style.overflow='hidden';alertElement.setAttribute('role','alert');alertElement.setAttribute('aria-atomic','true');document[AlertElementSymbol]=alertElement;}
document[AlertElementSymbol].textContent=message.trimEndWithMaxLength(10000);}
self.UI=self.UI||{};UI=UI||{};self.UI.ARIAUtils={nextId,bindLabelToControl,markAsAlert,markAsButton,markAsCheckbox,markAsCombobox,markAsModalDialog,markAsGroup,markAsLink,markAsMenuButton,markAsProgressBar,markAsTab,markAsTree,markAsTreeitem,markAsTextBox,markAsMenu,markAsMenuItem,markAsMenuItemSubMenu,markAsList,markAsListitem,markAsListBox,markAsMultiSelectable,markAsOption,markAsRadioGroup,markAsHidden,markAsHeading,markAsPoliteLiveRegion,setPlaceholder,markAsPresentation,markAsStatus,ensureId,setControls,setChecked,setCheckboxAsIndeterminate,setExpanded,unsetExpandable,AutocompleteInteractionModel,setAutocomplete,setSelected,setInvalid,setPressed,setProgressBarCurrentPercentage,setAccessibleName,setDescription,setActiveDescendant,alert,};