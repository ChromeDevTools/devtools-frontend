export default class Linkifier{linkify(object,options){}}
export function linkify(object,options){if(!object){return Promise.reject(new Error('Can\'t linkify '+object));}
return self.runtime.extension(Common.Linkifier,object).instance().then(linkifier=>linkifier.linkify(object,options));}
self.Common=self.Common||{};Common=Common||{};Common.Linkifier=Linkifier;Common.Linkifier.linkify=linkify;Common.Linkifier.Options;