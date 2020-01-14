let _platform;export function platform(){if(!_platform){_platform=Host.InspectorFrontendHost.platform();}
return _platform;}
let _isMac;export function isMac(){if(typeof _isMac==='undefined'){_isMac=platform()==='mac';}
return _isMac;}
let _isWin;export function isWin(){if(typeof _isWin==='undefined'){_isWin=platform()==='windows';}
return _isWin;}
let _isCustomDevtoolsFrontend;export function isCustomDevtoolsFrontend(){if(typeof _isCustomDevtoolsFrontend==='undefined'){_isCustomDevtoolsFrontend=window.location.toString().startsWith('devtools://devtools/custom/');}
return _isCustomDevtoolsFrontend;}
let _fontFamily;export function fontFamily(){if(_fontFamily){return _fontFamily;}
switch(platform()){case'linux':_fontFamily='Roboto, Ubuntu, Arial, sans-serif';break;case'mac':_fontFamily='\'Lucida Grande\', sans-serif';break;case'windows':_fontFamily='\'Segoe UI\', Tahoma, sans-serif';break;}
return _fontFamily;}
self.Host=self.Host||{};Host=Host||{};Host.platform=platform;Host.isWin=isWin;Host.isMac=isMac;Host.isCustomDevtoolsFrontend=isCustomDevtoolsFrontend;Host.fontFamily=fontFamily;