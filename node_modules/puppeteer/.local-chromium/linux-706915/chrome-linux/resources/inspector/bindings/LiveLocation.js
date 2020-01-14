export default class LiveLocation{update(){}
uiLocation(){}
dispose(){}
isBlackboxed(){}}
export class LiveLocationWithPool{constructor(updateDelegate,locationPool){this._updateDelegate=updateDelegate;this._locationPool=locationPool;this._locationPool._add(this);}
update(){this._updateDelegate(this);}
uiLocation(){throw'Not implemented';}
dispose(){this._locationPool._delete(this);this._updateDelegate=null;}
isBlackboxed(){throw'Not implemented';}}
export class LiveLocationPool{constructor(){this._locations=new Set();}
_add(location){this._locations.add(location);}
_delete(location){this._locations.delete(location);}
disposeAll(){for(const location of this._locations){location.dispose();}}}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.LiveLocation=LiveLocation;Bindings.LiveLocationWithPool=LiveLocationWithPool;Bindings.LiveLocationPool=LiveLocationPool;