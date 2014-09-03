/*

This file contains parts of  source code under following license:

 (c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
 Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
 http://github.com/kothic/kothic-js
*/

var rbush = require('rbush');

var CollisionBuffer = function (height, width) {
  this.buffer = rbush();
  this.height = height;
  this.width = width;
}

CollisionBuffer.prototype.addPointWH = function (point, w, h, d, id) {
  this.buffer.insert(this.getBoxFromPoint(point, w, h, d, id));
}

CollisionBuffer.prototype.addPoints = function (params) {
  var points = [];
  for (var i = 0, len = params.length; i < len; i++) {
    points.push(this.getBoxFromPoint.apply(this, params[i]));
  }
  this.buffer.load(points);
}

CollisionBuffer.prototype.checkBox = function (b, id) {
  var result = this.buffer.search(b),
  i, len;

  if (b[0] < 0 || b[1] < 0 || b[2] > this.width || b[3] > this.height) {
    return true;
  }

  for (i = 0, len = result.length; i < len; i++) {
    // if it's the same object (only different styles), don't detect collision
    if (id !== result[i][4]) {
      return true;
    }
  }

  return false;
}

CollisionBuffer.prototype.checkPointWH = function (point, w, h, id) {
  return this.checkBox(this.getBoxFromPoint(point, w, h, 0), id);
}

CollisionBuffer.prototype.getBoxFromPoint =  function (point, w, h, d, id) {
  var dx = w / 2 + d,
  dy = h / 2 + d;

  return [
  point[0] - dx,
  point[1] - dy,
  point[0] + dx,
  point[1] + dy,
  id
  ];
}

exports.CollisionBuffer = CollisionBuffer;
