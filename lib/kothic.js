/*


This file contains parts of  source code under following license:

(c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
http://github.com/kothic/kothic-js

*/
var CollisionBuffer = require('./collisionbuffer').CollisionBuffer;
var MapCSS = require('./mapcss').MapCSS;
var Style = require('./kothic-style').Style;
var Geom = require('./kothic-geom').Geom;
var Line = require('./kothic-line').Line;
var Path = require('./kothic-path').Path;
var Polygon = require('./kothic-polygon').Polygon;
var TextIcons = require('./kothic-texticons').TextIcons;
var TextOnPath = require('./kothic-textonpath').TextOnPath;
var Canvas = require('canvas');
var fs = require('fs');

var Kothic = function(devicePixelRatio){
  this._devicePixelRatio = (devicePixelRatio) ? devicePixelRatio : 1;
  this.mapcss = new MapCSS();
  this.style = new Style(this);
  this.geom = new Geom(this);
  this.line = new Line(this);
  this.texticons = new TextIcons(this);
  this.textOnPath = TextOnPath;
  this.Path = new Path(this);
  this.path = this.Path.path();// new Path(this);
  this.polygon = new Polygon(this);
  this.canvas = new Canvas(256, 256)
}



Kothic.prototype = {
  get devicePixelRatio () { return this._devicePixelRatio; },
  set devicePixelRatio (v) { this._devicePixelRatio = v; return this; }
}

Kothic.prototype.importStyle = function(filePath){
  require(filePath).style(this.mapcss);
}
Kothic.prototype.setGeoJSON = function(data){
  this.geoJSON = data;
}

Kothic.prototype.setZoom = function(zoom){
  this.zoom = zoom;
}

Kothic.prototype.setOptions = function(options){
  this.options = options;
}

Kothic.prototype.run = function(resultFile,callback){
  var out = fs.createWriteStream(resultFile),
  stream = this.canvas.pngStream();;

  this.render( this.geoJSON, this.zoom, this.options);

  out = fs.createWriteStream(resultFile);

  stream.on('data', function(chunk){
    out.write(chunk);
  });

  stream.on('error', function(chunk){
    //out.write(chunk);
    console.log('kothic error',arguments);
  });

  out.on('close', function(chunk){
    callback(false);
  });

  stream.on('end', function(chunk){
    out.end();
  });
}

Kothic.prototype.render = function ( data, zoom, options) {
  var self = this,
  canvas = this.canvas;

  var styles = (options && options.styles) || [];
  this.mapcss.locales = (options && options.locales) || [];

  var width = canvas.width,
  height = canvas.height;

  if (this.devicePixelRatio !== 1) {
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = canvas.width * this.devicePixelRatio;
    canvas.height = canvas.height * this.devicePixelRatio;
  }

  var ctx = canvas.getContext('2d');
  ctx.kothic = this;

  ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

  var granularity = data.granularity,
  ws = width / granularity, hs = height / granularity,
  collisionBuffer = new CollisionBuffer(height, width);

  console.time('styles');

  // setup layer styles
  var layers = self.style.populateLayers(data.features, zoom, styles),
  layerIds = self.getLayerIds(layers);

  // render the map
  self.style.setStyles(ctx, this.style.defaultCanvasStyles);

  console.timeEnd('styles');

  console.time('geometry');
  self._renderBackground(ctx, width, height, zoom, styles);
  self._renderGeometryFeatures(layerIds, layers, ctx, ws, hs, granularity);
  self._renderTextAndIcons(layerIds, layers, ctx, ws, hs, collisionBuffer);
  if (options && options.onRenderComplete) {
    options.onRenderComplete();
  }
  console.timeEnd('geometry');

  /*
  self.getFrame(function () {
  console.time('geometry');

  self._renderBackground(ctx, width, height, zoom, styles);
  self._renderGeometryFeatures(layerIds, layers, ctx, ws, hs, granularity);

  if (options && options.onRenderComplete) {
  options.onRenderComplete();
}

console.timeEnd('geometry');

self.getFrame(function () {
console.time('text/icons');
self._renderTextAndIcons(layerIds, layers, ctx, ws, hs, collisionBuffer);
console.timeEnd('text/icons');

//Kothic._renderCollisions(ctx, collisionBuffer.buffer.data);
});
});
*/
}


Kothic.prototype._renderCollisions = function (ctx, node) {
  var i, len, a;
  if (node.leaf) {
    for (i = 0, len = node.children.length; i < len; i++) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      a = node.children[i];
      ctx.strokeRect(Math.round(a[0]), Math.round(a[1]), Math.round(a[2] - a[0]), Math.round(a[3] - a[1]));
    }
  } else {
    for (i = 0, len = node.children.length; i < len; i++) {
      this._renderCollisions(ctx, node.children[i]);
    }
  }
}

Kothic.prototype.getLayerIds = function (layers) {
  return Object.keys(layers).sort(function (a, b) {
    return parseInt(a, 10) - parseInt(b, 10);
  });
}

Kothic.prototype.getFrame = function (fn) {
  //var reqFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  //               window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  return setTimeout(1000/60,fn);
  //reqFrame.call(window, fn);
}


Kothic.prototype._renderBackground = function (ctx, width, height, zoom, styles) {
  var style = this.mapcss.restyle(styles, {}, {}, zoom, 'canvas', 'canvas');
  var self = this;
  var fillRect = function () {
    ctx.fillRect(-1, -1, width + 1, height + 1);
  };

  for (var i in style) {
    self.polygon.fill(ctx, style[i], fillRect);
  }
}

Kothic.prototype._renderGeometryFeatures = function (layerIds, layers, ctx, ws, hs, granularity) {
  var layersToRender = {},
  i, j, len, features, style, queue, bgQueue,
  self=this;

  // polygons
  for (i = 0; i < layerIds.length; i++) {
    features = layers[layerIds[i]];

    bgQueue = layersToRender._bg = layersToRender._bg || {};
    queue = layersToRender[layerIds[i]] = layersToRender[layerIds[i]] || {};

    for (j = 0, len = features.length; j < len; j++) {
      style = features[j].style;

      if ('fill-color' in style || 'fill-image' in style) {
        if (style['fill-position'] === 'background') {
          bgQueue.polygons = bgQueue.polygons || [];
          bgQueue.polygons.push(features[j]);
        } else {
          queue.polygons = queue.polygons || [];
          queue.polygons.push(features[j]);
        }
      }
    }
  }

  // casings
  for (i = 0; i < layerIds.length; i++) {
    features = layers[layerIds[i]];
    queue = layersToRender[layerIds[i]] = layersToRender[layerIds[i]] || {};

    for (j = 0, len = features.length; j < len; j++) {

      if ('casing-width' in features[j].style) {
        queue.casings = queue.casings || [];
        queue.casings.push(features[j]);
      }
    }
  }

  // lines
  for (i = 0; i < layerIds.length; i++) {
    features = layers[layerIds[i]];
    queue = layersToRender[layerIds[i]] = layersToRender[layerIds[i]] || {};

    for (j = 0, len = features.length; j < len; j++) {

      if ('width' in features[j].style) {
        queue.lines = queue.lines || [];
        queue.lines.push(features[j]);
      }
    }
  }

  layerIds = ['_bg'].concat(layerIds);

  for (i = 0; i < layerIds.length; i++) {
    queue = layersToRender[layerIds[i]];
    if (queue){

      if (queue.polygons) {
        for (j = 0, len = queue.polygons.length; j < len; j++) {
          self.polygon.render(ctx, queue.polygons[j], queue.polygons[j + 1], ws, hs, granularity);
        }
      }
      if (queue.casings) {
        ctx.lineCap = 'butt';
        for (j = 0, len = queue.casings.length; j < len; j++) {
          self.line.renderCasing(ctx, queue.casings[j], queue.casings[j + 1], ws, hs, granularity);
        }
      }
      if (queue.lines) {
        ctx.lineCap = 'round';
        for (j = 0, len = queue.lines.length; j < len; j++) {
          self.line.render(ctx, queue.lines[j], queue.lines[j + 1], ws, hs, granularity);
        }
      }
    }
  }
}

Kothic.prototype._renderTextAndIcons = function (layerIds, layers, ctx, ws, hs, collisionBuffer) {
  //TODO: Move to the features detector
  var j, style, i,
  passes = [],
  self=this;

  for (i = 0; i < layerIds.length; i++) {
    var features = layers[layerIds[i]],
    featuresLen = features.length;

    // render icons without text
    for (j = featuresLen - 1; j >= 0; j--) {
      style = features[j].style;
      if (style.hasOwnProperty('icon-image') && !style.text) {
        self.texticons.render(ctx, features[j], collisionBuffer, ws, hs, false, true);
      }
    }

    // render text on features without icons
    for (j = featuresLen - 1; j >= 0; j--) {
      style = features[j].style;
      if (!style.hasOwnProperty('icon-image') && style.text) {
        self.texticons.render(ctx, features[j], collisionBuffer, ws, hs, true, false);
      }
    }

    // for features with both icon and text, render both or neither
    for (j = featuresLen - 1; j >= 0; j--) {
      style = features[j].style;
      if (style.hasOwnProperty('icon-image') && style.text) {
        self.texticons.render(ctx, features[j], collisionBuffer, ws, hs, true, true);
      }
    }

    // render shields with text
    for (j = featuresLen - 1; j >= 0; j--) {
      style = features[j].style;
      if (style['shield-text']) {
        console.log('shield-text','no supported');
        self.shields.render(ctx, features[j], collisionBuffer, ws, hs);
      }
    }
  }

  return passes;
}




exports.Kothic = Kothic;
