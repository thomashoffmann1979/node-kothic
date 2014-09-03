/*

This file contains parts of  source code under following license:

 (c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
 Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
 http://github.com/kothic/kothic-js
*/

var dashPattern={};
var kothic;

var Path = function(_kothic){
  kothic = _kothic;
}

Path.prototype.path = function(){
  return path;
}

var path = function(ctx, feature, dashes, fill, ws, hs, granularity){

  var type = feature.type,
  coords = feature.coordinates;

  if (type === "Polygon") {
    coords = [coords];
    type = "MultiPolygon";
  }

  if (type === "LineString") {
    coords = [coords];
    type = "MultiLineString";
  }

  var i, j, k,
  points,
  len = coords.length,
  len2, pointsLen,
  prevPoint, point, screenPoint,
  dx, dy, dist, pad = 50;

  if (type === "MultiPolygon") {
    for (i = 0; i < len; i++) {
      for (k = 0, len2 = coords[i].length; k < len2; k++) {
        points = coords[i][k];
        pointsLen = points.length;
        prevPoint = points[0];

        for (j = 0; j <= pointsLen; j++) {
          point = points[j] || points[0];
          screenPoint = kothic.geom.transformPoint(point, ws, hs);

          if (j === 0 || (!fill &&
            isTileBoundary(point, granularity) &&
            isTileBoundary(prevPoint, granularity))
          ) {
            moveTo(ctx, screenPoint, dashes);
          } else if (fill || !dashes) {
            ctx.lineTo(screenPoint[0], screenPoint[1]);
          } else {
            dashTo(ctx, screenPoint);
          }
          prevPoint = point;
        }
      }
    }
  }

  if (type === "MultiLineString") {
    for (i = 0; i < len; i++) {
      points = coords[i];
      pointsLen = points.length;

      for (j = 0; j < pointsLen; j++) {
        point = points[j];
        screenPoint = kothic.geom.transformPoint(point, ws, hs);

        // continue path off the tile by some abount to fix path edges between tiles
        if ((j === 0 || j === pointsLen - 1) && isTileBoundary(point, granularity)) {
          prevPoint = points[j ? pointsLen - 2 : 1];

          dx = point[0] - prevPoint[0];
          dy = point[1] - prevPoint[1];
          dist = Math.sqrt(dx * dx + dy * dy);

          screenPoint[0] = screenPoint[0] + pad * dx / dist;
          screenPoint[1] = screenPoint[1] + pad * dy / dist;
        }

        if (j === 0) {
          moveTo(ctx, screenPoint, dashes);
        } else if (dashes) {
          dashTo(ctx, screenPoint);
        } else {
          ctx.lineTo(screenPoint[0], screenPoint[1]);
        }
      }
    }
  }

}

var setDashPattern = function(point, dashes) {
  dashPattern = {
    pattern: dashes,
    seg: 0,
    phs: 0,
    x: point[0],
    y: point[1]
  };
}



var moveTo = function(ctx, point, dashes) {
  ctx.moveTo(point[0], point[1]);
  if (dashes) {
    setDashPattern(point, dashes);
  }
}

var dashTo = function(ctx, point) {
  var pt = dashPattern,
  dx = point[0] - pt.x,
  dy = point[1] - pt.y,
  dist = Math.sqrt(dx * dx + dy * dy),
  x, more, t;

  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.moveTo(0, 0);

  x = 0;
  do {
    t = pt.pattern[pt.seg];
    x += t - pt.phs;
    more = x < dist;

    if (!more) {
      pt.phs = t - (x - dist);
      x = dist;
    }

    ctx[pt.seg % 2 ? 'moveTo' : 'lineTo'](x, 0);

    if (more) {
      pt.phs = 0;
      pt.seg = ++pt.seg % pt.pattern.length;
    }
  } while (more);

  pt.x = point[0];
  pt.y = point[1];

  ctx.restore();
}

var isTileBoundary = function(p, size) {
  return p[0] === 0 || p[0] === size || p[1] === 0 || p[1] === size;
}

exports.Path = Path;
