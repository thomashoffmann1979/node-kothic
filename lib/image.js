var Canvas = require('canvas'),
    CImage = Canvas.Image;
var Image = function(){
  this._src = '';
}

Image.prototype = {
  get src () { return this._src; },
  set src (v) { this._src = v; return this; }
}

Image.prototype.load  = function(){
  
}

exports.Image;
