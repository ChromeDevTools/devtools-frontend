export default class Context{constructor(){this._flavors=new Map();this._eventDispatchers=new Map();}
setFlavor(flavorType,flavorValue){const value=this._flavors.get(flavorType)||null;if(value===flavorValue){return;}
if(flavorValue){this._flavors.set(flavorType,flavorValue);}else{this._flavors.remove(flavorType);}
this._dispatchFlavorChange(flavorType,flavorValue);}
_dispatchFlavorChange(flavorType,flavorValue){for(const extension of self.runtime.extensions(UI.ContextFlavorListener)){if(extension.hasContextType(flavorType)){extension.instance().then(instance=>(instance).flavorChanged(flavorValue));}}
const dispatcher=this._eventDispatchers.get(flavorType);if(!dispatcher){return;}
dispatcher.dispatchEventToListeners(Context.Events.FlavorChanged,flavorValue);}
addFlavorChangeListener(flavorType,listener,thisObject){let dispatcher=this._eventDispatchers.get(flavorType);if(!dispatcher){dispatcher=new Common.Object();this._eventDispatchers.set(flavorType,dispatcher);}
dispatcher.addEventListener(Context.Events.FlavorChanged,listener,thisObject);}
removeFlavorChangeListener(flavorType,listener,thisObject){const dispatcher=this._eventDispatchers.get(flavorType);if(!dispatcher){return;}
dispatcher.removeEventListener(Context.Events.FlavorChanged,listener,thisObject);if(!dispatcher.hasEventListeners(Context.Events.FlavorChanged)){this._eventDispatchers.remove(flavorType);}}
flavor(flavorType){return this._flavors.get(flavorType)||null;}
flavors(){return new Set(this._flavors.keys());}
applicableExtensions(extensions){const targetExtensionSet=new Set();const availableFlavors=this.flavors();extensions.forEach(function(extension){if(self.runtime.isExtensionApplicableToContextTypes(extension,availableFlavors)){targetExtensionSet.add(extension);}});return targetExtensionSet;}}
export const Events={FlavorChanged:Symbol('FlavorChanged')};self.UI=self.UI||{};UI=UI||{};UI.Context=Context;UI.Context.Events=Events;UI.context=new Context();