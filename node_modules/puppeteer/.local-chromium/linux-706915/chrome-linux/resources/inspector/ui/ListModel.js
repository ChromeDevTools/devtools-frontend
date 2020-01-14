export default class ListModel extends Common.Object{constructor(items){super();this._items=items||[];}
[Symbol.iterator](){return this._items[Symbol.iterator]();}
get length(){return this._items.length;}
at(index){return this._items[index];}
every(callback){return this._items.every(callback);}
filter(callback){return this._items.filter(callback);}
find(callback){return this._items.find(callback);}
findIndex(callback){return this._items.findIndex(callback);}
indexOf(value,fromIndex){return this._items.indexOf(value,fromIndex);}
insert(index,value){this._items.splice(index,0,value);this._replaced(index,[],1);}
insertWithComparator(value,comparator){this.insert(this._items.lowerBound(value,comparator),value);}
join(separator){return this._items.join(separator);}
remove(index){const result=this._items[index];this._items.splice(index,1);this._replaced(index,[result],0);return result;}
replace(index,value){const oldValue=this._items[index];this._items[index]=value;this._replaced(index,[oldValue],1);return oldValue;}
replaceRange(from,to,items){let removed;if(items.length<10000){removed=this._items.splice(from,to-from,...items);}else{removed=this._items.slice(from,to);const before=this._items.slice(0,from);const after=this._items.slice(to);this._items=[].concat(before,items,after);}
this._replaced(from,removed,items.length);return removed;}
replaceAll(items){const oldItems=this._items.slice();this._items=items;this._replaced(0,oldItems,items.length);return oldItems;}
slice(from,to){return this._items.slice(from,to);}
some(callback){return this._items.some(callback);}
_replaced(index,removed,inserted){this.dispatchEventToListeners(Events.ItemsReplaced,{index:index,removed:removed,inserted:inserted});}}
export const Events={ItemsReplaced:Symbol('ItemsReplaced'),};self.UI=self.UI||{};UI=UI||{};UI.ListModel=ListModel;UI.ListModel.Events=Events;