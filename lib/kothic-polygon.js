/*

This file contains parts of  source code under following license:

 (c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
 Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
 http://github.com/kothic/kothic-js
*/

var Polygon = function(kothic){
  this.kothic = kothic;
  this.pathOpened = false;
}
Polygon.prototype.render = function (ctx, feature, nextFeature, ws, hs, granularity) {
  var style = feature.style,
  nextStyle = nextFeature && nextFeature.style;

  if (!this.pathOpened) {
    this.pathOpened = true;
    ctx.beginPath();
  }

  this.kothic.path(ctx, feature, false, true, ws, hs, granularity);

  if (nextFeature &&
    (nextStyle['fill-color'] === style['fill-color']) &&
    (nextStyle['fill-image'] === style['fill-image']) &&
    (nextStyle['fill-opacity'] === style['fill-opacity'])
  ) {
    return;
  }

  this.fill(ctx, style);

  this.pathOpened = false;
}

Polygon.prototype.fill = function (ctx, style, fillFn) {
  var opacity = style["fill-opacity"] || style.opacity, image;

  if (style.hasOwnProperty('fill-color')) {
    // first pass fills with solid color
    this.kothic.style.setStyles(ctx, {
      fillStyle: style["fill-color"] || "#000000",
      globalAlpha: opacity || 1
    });
    if (fillFn) {
      fillFn();
    } else {
      ctx.fill();
    }
  }

  if (style.hasOwnProperty('fill-image')) {
    // second pass fills with texture
    // console.log('fill-image','not supported',style['fill-image']);

    image = this.kothic.mapcss.getImage(style['fill-image']);
    if (image) {
      //console.log('fill-image','not supported**');
      this.kothic.style.setStyles(ctx, {
        fillStyle: ctx.createPattern(image, 'repeat'),
        globalAlpha: opacity || 1
      });
      if (fillFn) {
        fillFn();
      } else {
        ctx.fill();
      }
    }else{
      console.log(style['fill-image'],'not found');
    }
  }
}

exports.Polygon = Polygon;
