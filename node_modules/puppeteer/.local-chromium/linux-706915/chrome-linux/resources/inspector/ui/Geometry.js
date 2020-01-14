const Geometry={};export default Geometry;export const _Eps=1e-5;export class Vector{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}
length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);}
normalize(){const length=this.length();if(length<=UI.Geometry._Eps){return;}
this.x/=length;this.y/=length;this.z/=length;}}
export class Point{constructor(x,y){this.x=x;this.y=y;}
distanceTo(p){return Math.sqrt(Math.pow(p.x-this.x,2)+Math.pow(p.y-this.y,2));}
projectOn(line){if(line.x===0&&line.y===0){return new Point(0,0);}
return line.scale((this.x*line.x+this.y*line.y)/(Math.pow(line.x,2)+Math.pow(line.y,2)));}
scale(scalar){return new Point(this.x*scalar,this.y*scalar);}
toString(){return Math.round(this.x*100)/100+', '+Math.round(this.y*100)/100;}}
export class CubicBezier{constructor(point1,point2){this.controlPoints=[point1,point2];}
static parse(text){const keywordValues=CubicBezier.KeywordValues;const value=text.toLowerCase().replace(/\s+/g,'');if(Object.keys(keywordValues).indexOf(value)!==-1){return CubicBezier.parse(keywordValues[value]);}
const bezierRegex=/^cubic-bezier\(([^,]+),([^,]+),([^,]+),([^,]+)\)$/;const match=value.match(bezierRegex);if(match){const control1=new Point(parseFloat(match[1]),parseFloat(match[2]));const control2=new Point(parseFloat(match[3]),parseFloat(match[4]));return new CubicBezier(control1,control2);}
return null;}
evaluateAt(t){function evaluate(v1,v2,t){return 3*(1-t)*(1-t)*t*v1+3*(1-t)*t*t*v2+Math.pow(t,3);}
const x=evaluate(this.controlPoints[0].x,this.controlPoints[1].x,t);const y=evaluate(this.controlPoints[0].y,this.controlPoints[1].y,t);return new Point(x,y);}
asCSSText(){const raw='cubic-bezier('+this.controlPoints.join(', ')+')';const keywordValues=CubicBezier.KeywordValues;for(const keyword in keywordValues){if(raw===keywordValues[keyword]){return keyword;}}
return raw;}}
CubicBezier.Regex=/((cubic-bezier\([^)]+\))|\b(linear|ease-in-out|ease-in|ease-out|ease)\b)/g;CubicBezier.KeywordValues={'linear':'cubic-bezier(0, 0, 1, 1)','ease':'cubic-bezier(0.25, 0.1, 0.25, 1)','ease-in':'cubic-bezier(0.42, 0, 1, 1)','ease-in-out':'cubic-bezier(0.42, 0, 0.58, 1)','ease-out':'cubic-bezier(0, 0, 0.58, 1)'};export class EulerAngles{constructor(alpha,beta,gamma){this.alpha=alpha;this.beta=beta;this.gamma=gamma;}
static fromRotationMatrix(rotationMatrix){const beta=Math.atan2(rotationMatrix.m23,rotationMatrix.m33);const gamma=Math.atan2(-rotationMatrix.m13,Math.sqrt(rotationMatrix.m11*rotationMatrix.m11+rotationMatrix.m12*rotationMatrix.m12));const alpha=Math.atan2(rotationMatrix.m12,rotationMatrix.m11);return new EulerAngles(radiansToDegrees(alpha),radiansToDegrees(beta),radiansToDegrees(gamma));}
toRotate3DString(){const gammaAxisY=-Math.sin(degreesToRadians(this.beta));const gammaAxisZ=Math.cos(degreesToRadians(this.beta));const axis={alpha:[0,1,0],beta:[-1,0,0],gamma:[0,gammaAxisY,gammaAxisZ]};return'rotate3d('+axis.alpha.join(',')+','+this.alpha+'deg) '+'rotate3d('+axis.beta.join(',')+','+this.beta+'deg) '+'rotate3d('+axis.gamma.join(',')+','+this.gamma+'deg)';}}
export const scalarProduct=function(u,v){return u.x*v.x+u.y*v.y+u.z*v.z;};export const crossProduct=function(u,v){const x=u.y*v.z-u.z*v.y;const y=u.z*v.x-u.x*v.z;const z=u.x*v.y-u.y*v.x;return new Vector(x,y,z);};export const subtract=function(u,v){const x=u.x-v.x;const y=u.y-v.y;const z=u.z-v.z;return new Vector(x,y,z);};export const multiplyVectorByMatrixAndNormalize=function(v,m){const t=v.x*m.m14+v.y*m.m24+v.z*m.m34+m.m44;const x=(v.x*m.m11+v.y*m.m21+v.z*m.m31+m.m41)/t;const y=(v.x*m.m12+v.y*m.m22+v.z*m.m32+m.m42)/t;const z=(v.x*m.m13+v.y*m.m23+v.z*m.m33+m.m43)/t;return new Vector(x,y,z);};export const calculateAngle=function(u,v){const uLength=u.length();const vLength=v.length();if(uLength<=_Eps||vLength<=_Eps){return 0;}
const cos=scalarProduct(u,v)/uLength/vLength;if(Math.abs(cos)>1){return 0;}
return radiansToDegrees(Math.acos(cos));};export const degreesToRadians=function(deg){return deg*Math.PI/180;};export const radiansToDegrees=function(rad){return rad*180/Math.PI;};export const boundsForTransformedPoints=function(matrix,points,aggregateBounds){if(!aggregateBounds){aggregateBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};}
if(points.length%3){console.assert('Invalid size of points array');}
for(let p=0;p<points.length;p+=3){let vector=new Vector(points[p],points[p+1],points[p+2]);vector=UI.Geometry.multiplyVectorByMatrixAndNormalize(vector,matrix);aggregateBounds.minX=Math.min(aggregateBounds.minX,vector.x);aggregateBounds.maxX=Math.max(aggregateBounds.maxX,vector.x);aggregateBounds.minY=Math.min(aggregateBounds.minY,vector.y);aggregateBounds.maxY=Math.max(aggregateBounds.maxY,vector.y);}
return aggregateBounds;};export class Size{constructor(width,height){this.width=width;this.height=height;}
clipTo(size){if(!size){return this;}
return new Size(Math.min(this.width,size.width),Math.min(this.height,size.height));}
scale(scale){return new Size(this.width*scale,this.height*scale);}
isEqual(size){return!!size&&this.width===size.width&&this.height===size.height;}
widthToMax(size){return new Size(Math.max(this.width,(typeof size==='number'?size:size.width)),this.height);}
addWidth(size){return new Size(this.width+(typeof size==='number'?size:size.width),this.height);}
heightToMax(size){return new Size(this.width,Math.max(this.height,(typeof size==='number'?size:size.height)));}
addHeight(size){return new Size(this.width,this.height+(typeof size==='number'?size:size.height));}}
export class Insets{constructor(left,top,right,bottom){this.left=left;this.top=top;this.right=right;this.bottom=bottom;}
isEqual(insets){return!!insets&&this.left===insets.left&&this.top===insets.top&&this.right===insets.right&&this.bottom===insets.bottom;}}
export class Rect{constructor(left,top,width,height){this.left=left;this.top=top;this.width=width;this.height=height;}
isEqual(rect){return!!rect&&this.left===rect.left&&this.top===rect.top&&this.width===rect.width&&this.height===rect.height;}
scale(scale){return new Rect(this.left*scale,this.top*scale,this.width*scale,this.height*scale);}
size(){return new Size(this.width,this.height);}
relativeTo(origin){return new Rect(this.left-origin.left,this.top-origin.top,this.width,this.height);}
rebaseTo(origin){return new Rect(this.left+origin.left,this.top+origin.top,this.width,this.height);}}
export class Constraints{constructor(minimum,preferred){this.minimum=minimum||new Size(0,0);this.preferred=preferred||this.minimum;if(this.minimum.width>this.preferred.width||this.minimum.height>this.preferred.height){throw new Error('Minimum size is greater than preferred.');}}
isEqual(constraints){return!!constraints&&this.minimum.isEqual(constraints.minimum)&&this.preferred.isEqual(constraints.preferred);}
widthToMax(value){if(typeof value==='number'){return new Constraints(this.minimum.widthToMax(value),this.preferred.widthToMax(value));}
return new Constraints(this.minimum.widthToMax(value.minimum),this.preferred.widthToMax(value.preferred));}
addWidth(value){if(typeof value==='number'){return new Constraints(this.minimum.addWidth(value),this.preferred.addWidth(value));}
return new Constraints(this.minimum.addWidth(value.minimum),this.preferred.addWidth(value.preferred));}
heightToMax(value){if(typeof value==='number'){return new Constraints(this.minimum.heightToMax(value),this.preferred.heightToMax(value));}
return new Constraints(this.minimum.heightToMax(value.minimum),this.preferred.heightToMax(value.preferred));}
addHeight(value){if(typeof value==='number'){return new Constraints(this.minimum.addHeight(value),this.preferred.addHeight(value));}
return new Constraints(this.minimum.addHeight(value.minimum),this.preferred.addHeight(value.preferred));}}
self.UI=self.UI||{};UI=UI||{};UI.Geometry=Geometry;UI.Geometry._Eps=_Eps;UI.Geometry.Vector=Vector;UI.Geometry.Point=Point;UI.Geometry.CubicBezier=CubicBezier;UI.Geometry.EulerAngles=EulerAngles;UI.Geometry.scalarProduct=scalarProduct;UI.Geometry.crossProduct=crossProduct;UI.Geometry.subtract=subtract;UI.Geometry.multiplyVectorByMatrixAndNormalize=multiplyVectorByMatrixAndNormalize;UI.Geometry.calculateAngle=calculateAngle;UI.Geometry.degreesToRadians=degreesToRadians;UI.Geometry.radiansToDegrees=radiansToDegrees;UI.Size=Size;UI.Insets=Insets;UI.Rect=Rect;UI.Constraints=Constraints;UI.Geometry.boundsForTransformedPoints=boundsForTransformedPoints;