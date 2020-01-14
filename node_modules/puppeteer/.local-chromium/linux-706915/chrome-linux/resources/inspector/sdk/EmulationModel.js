export default class EmulationModel extends SDK.SDKModel{constructor(target){super(target);this._emulationAgent=target.emulationAgent();this._pageAgent=target.pageAgent();this._deviceOrientationAgent=target.deviceOrientationAgent();this._cssModel=target.model(SDK.CSSModel);this._overlayModel=target.model(SDK.OverlayModel);if(this._overlayModel){this._overlayModel.addEventListener(SDK.OverlayModel.Events.InspectModeWillBeToggled,this._updateTouch,this);}
const disableJavascriptSetting=Common.settings.moduleSetting('javaScriptDisabled');disableJavascriptSetting.addChangeListener(()=>this._emulationAgent.setScriptExecutionDisabled(disableJavascriptSetting.get()));if(disableJavascriptSetting.get()){this._emulationAgent.setScriptExecutionDisabled(true);}
const mediaTypeSetting=Common.moduleSetting('emulatedCSSMedia');const mediaFeaturePrefersColorSchemeSetting=Common.moduleSetting('emulatedCSSMediaFeaturePrefersColorScheme');const mediaFeaturePrefersReducedMotionSetting=Common.moduleSetting('emulatedCSSMediaFeaturePrefersReducedMotion');this._mediaConfiguration=new Map([['type',mediaTypeSetting.get()],['prefers-color-scheme',mediaFeaturePrefersColorSchemeSetting.get()],['prefers-reduced-motion',mediaFeaturePrefersReducedMotionSetting.get()],]);mediaTypeSetting.addChangeListener(()=>{this._mediaConfiguration.set('type',mediaTypeSetting.get());this._updateCssMedia();});mediaFeaturePrefersColorSchemeSetting.addChangeListener(()=>{this._mediaConfiguration.set('prefers-color-scheme',mediaFeaturePrefersColorSchemeSetting.get());this._updateCssMedia();});mediaFeaturePrefersReducedMotionSetting.addChangeListener(()=>{this._mediaConfiguration.set('prefers-reduced-motion',mediaFeaturePrefersReducedMotionSetting.get());this._updateCssMedia();});this._updateCssMedia();this._touchEnabled=false;this._touchMobile=false;this._customTouchEnabled=false;this._touchConfiguration={enabled:false,configuration:'mobile',scriptId:''};}
supportsDeviceEmulation(){return this.target().hasAllCapabilities(SDK.Target.Capability.DeviceEmulation);}
resetPageScaleFactor(){return this._emulationAgent.resetPageScaleFactor();}
emulateDevice(metrics){if(metrics){return this._emulationAgent.invoke_setDeviceMetricsOverride(metrics);}else{return this._emulationAgent.clearDeviceMetricsOverride();}}
overlayModel(){return this._overlayModel;}
emulateGeolocation(geolocation){if(!geolocation){this._emulationAgent.clearGeolocationOverride();this._emulationAgent.setTimezoneOverride('');return;}
if(geolocation.error){this._emulationAgent.setGeolocationOverride();this._emulationAgent.setTimezoneOverride('');}else{this._emulationAgent.setGeolocationOverride(geolocation.latitude,geolocation.longitude,Geolocation.DefaultMockAccuracy);this._emulationAgent.setTimezoneOverride(geolocation.timezoneId);}}
emulateDeviceOrientation(deviceOrientation){if(deviceOrientation){this._deviceOrientationAgent.setDeviceOrientationOverride(deviceOrientation.alpha,deviceOrientation.beta,deviceOrientation.gamma);}else{this._deviceOrientationAgent.clearDeviceOrientationOverride();}}
_emulateCSSMedia(type,features){this._emulationAgent.setEmulatedMedia(type,features);if(this._cssModel){this._cssModel.mediaQueryResultChanged();}}
setCPUThrottlingRate(rate){this._emulationAgent.setCPUThrottlingRate(rate);}
emulateTouch(enabled,mobile){this._touchEnabled=enabled;this._touchMobile=mobile;this._updateTouch();}
overrideEmulateTouch(enabled){this._customTouchEnabled=enabled;this._updateTouch();}
_updateTouch(){let configuration={enabled:this._touchEnabled,configuration:this._touchMobile?'mobile':'desktop',};if(this._customTouchEnabled){configuration={enabled:true,configuration:'mobile'};}
if(this._overlayModel&&this._overlayModel.inspectModeEnabled()){configuration={enabled:false,configuration:'mobile'};}
if(!this._touchConfiguration.enabled&&!configuration.enabled){return;}
if(this._touchConfiguration.enabled&&configuration.enabled&&this._touchConfiguration.configuration===configuration.configuration){return;}
this._touchConfiguration=configuration;this._emulationAgent.setTouchEmulationEnabled(configuration.enabled,1);this._emulationAgent.setEmitTouchEventsForMouse(configuration.enabled,configuration.configuration);}
_updateCssMedia(){const type=this._mediaConfiguration.get('type');const features=[{name:'prefers-color-scheme',value:this._mediaConfiguration.get('prefers-color-scheme'),},{name:'prefers-reduced-motion',value:this._mediaConfiguration.get('prefers-reduced-motion'),},];this._emulateCSSMedia(type,features);}}
export class Geolocation{constructor(latitude,longitude,timezoneId,error){this.latitude=latitude;this.longitude=longitude;this.timezoneId=timezoneId;this.error=error;}
static parseSetting(value){if(value){const[position,timezoneId,error]=value.split(':');const[latitude,longitude]=position.split('@');return new Geolocation(parseFloat(latitude),parseFloat(longitude),timezoneId,Boolean(error));}
return new Geolocation(0,0,'',false);}
static parseUserInput(latitudeString,longitudeString,timezoneId){if(!latitudeString&&!longitudeString){return null;}
const{valid:isLatitudeValid}=Geolocation.latitudeValidator(latitudeString);const{valid:isLongitudeValid}=Geolocation.longitudeValidator(longitudeString);if(!isLatitudeValid&&!isLongitudeValid){return null;}
const latitude=isLatitudeValid?parseFloat(latitudeString):-1;const longitude=isLongitudeValid?parseFloat(longitudeString):-1;return new Geolocation(latitude,longitude,timezoneId,false);}
static latitudeValidator(value){const numValue=parseFloat(value);const valid=/^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value)&&numValue>=-90&&numValue<=90;return{valid};}
static longitudeValidator(value){const numValue=parseFloat(value);const valid=/^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value)&&numValue>=-180&&numValue<=180;return{valid};}
static timezoneIdValidator(value){const valid=value.includes('/');return{valid};}
toSetting(){return`${this.latitude}@${this.longitude}:${this.timezoneId}:${this.error || ''}`;}}
Geolocation.DefaultMockAccuracy=150;export class DeviceOrientation{constructor(alpha,beta,gamma){this.alpha=alpha;this.beta=beta;this.gamma=gamma;}
static parseSetting(value){if(value){const jsonObject=JSON.parse(value);return new DeviceOrientation(jsonObject.alpha,jsonObject.beta,jsonObject.gamma);}
return new DeviceOrientation(0,0,0);}
static parseUserInput(alphaString,betaString,gammaString){if(!alphaString&&!betaString&&!gammaString){return null;}
const{valid:isAlphaValid}=DeviceOrientation.validator(alphaString);const{valid:isBetaValid}=DeviceOrientation.validator(betaString);const{valid:isGammaValid}=DeviceOrientation.validator(gammaString);if(!isAlphaValid&&!isBetaValid&&!isGammaValid){return null;}
const alpha=isAlphaValid?parseFloat(alphaString):-1;const beta=isBetaValid?parseFloat(betaString):-1;const gamma=isGammaValid?parseFloat(gammaString):-1;return new DeviceOrientation(alpha,beta,gamma);}
static validator(value){const valid=/^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value);return{valid};}
toSetting(){return JSON.stringify(this);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.EmulationModel=EmulationModel;SDK.EmulationModel.Geolocation=Geolocation;SDK.EmulationModel.DeviceOrientation=DeviceOrientation;SDK.SDKModel.register(EmulationModel,SDK.Target.Capability.Emulation,true);