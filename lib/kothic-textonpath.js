/*

This file contains parts of  source code under following license:

 (c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
 Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
 http://github.com/kothic/kothic-js
*/

var TextOnPath = function (ctx, points, text, halo, collisions) {
  //widthCache = {};
  var kothic = ctx.kothic;
  // simplify points?

  var textWidth = ctx.measureText(text).width,
  textLen = text.length,
  pathLen = kothic.geom.getPolyLength(points);

  if (pathLen < textWidth) {
    return;  // if label won't fit - don't try to
  }

  var avgLetterWidth = getWidth(ctx, 'a');

  var letter,
  widthUsed,
  prevAngle,
  positions,
  solution = 0,
  flipCount,
  flipped = false,
  axy,
  letterWidth,
  i,
  maxAngle = Math.PI / 6;

  // iterating solutions - start from center or from one of the ends
  while (solution < 2) { //TODO change to for?
    widthUsed = solution ? getWidth(ctx, text.charAt(0)) : (pathLen - textWidth) / 2; // ???
    flipCount = 0;
    prevAngle = null;
    positions = [];

    // iterating label letter by letter (should be fixed to support ligatures/CJK, ok for Cyrillic/latin)
    for (i = 0; i < textLen; i++) {
      letter = text.charAt(i);
      letterWidth = getWidth(ctx, letter);
      axy = kothic.geom.getAngleAndCoordsAtLength(points, widthUsed, letterWidth);

      // if cannot fit letter - restart with next solution
      if (widthUsed >= pathLen || !axy) {
        solution++;
        positions = [];
        if (flipped) {  // if label was flipped, flip it back
          points.reverse();
          flipped = false;
        }
        break;
      }

      if (!prevAngle) {
        prevAngle = axy[0];
      }

      // if label collisions with another, restart it from here
      if (checkCollision(collisions, ctx, letter, axy, avgLetterWidth) || Math.abs(prevAngle - axy[0]) > maxAngle) {
        widthUsed += letterWidth;
        i = -1;
        positions = [];
        flipCount = 0;
        continue;
      }

      while (letterWidth < axy[3] && i < textLen) { // try adding following letters to current, until line changes its direction
        i++;
        letter += text.charAt(i);
        letterWidth =  getWidth(ctx, letter);
        if (checkCollision(collisions, ctx, letter, axy, avgLetterWidth)) {
          i = 0;
          widthUsed += letterWidth;
          positions = [];
          flipCount = 0;
          letter = text.charAt(i);
          letterWidth =  getWidth(ctx, letter);
          axy = kothic.geom.getAngleAndCoordsAtLength(points, widthUsed, letterWidth);
          break;
        }
        if (letterWidth >= axy[3]) {
          i--;
          letter = letter.slice(0, -1);
          letterWidth = getWidth(ctx, letter);
          break;
        }
      }

      if (!axy) {
        continue;
      }

      if ((axy[0] > (Math.PI / 2)) || (axy[0] < (-Math.PI / 2))) { // if current letters cluster was upside-down, count it
        flipCount += letter.length;
      }

      prevAngle = axy[0];
      axy.push(letter);
      positions.push(axy);
      widthUsed += letterWidth;
    } //for

    if (flipCount > textLen / 2) { // if more than half of the text is upside down, flip it and restart
      points.reverse();
      positions = [];

      if (flipped) { // if it was flipped twice - restart with other start point solution
        solution++;
        points.reverse();
        flipped = false;
      } else {
        flipped = true;
      }
    }

    if (solution >= 2) {
      return;
    }

    if (positions.length > 0) {
      break;
    }
  } //while

  var posLen = positions.length;

  for (i = 0; halo && (i < posLen); i++) {
    renderText(ctx, positions[i], true);
  }

  for (i = 0; i < posLen; i++) {
    axy = positions[i];
    renderText(ctx, axy);
    addCollision(collisions, ctx, axy[4], axy, avgLetterWidth);
  }
}

var getWidth = function(ctx, text) {
  return ctx.measureText(text).width;
}

var getTextCenter = function(axy, textWidth) {
  return [axy[1] + 0.5 * Math.cos(axy[0]) * textWidth,
  axy[2] + 0.5 * Math.sin(axy[0]) * textWidth];
}

var getCollisionParams = function(textWidth, axy, pxoffset) {
  var textHeight = textWidth * 1.5,
  cos = Math.abs(Math.cos(axy[0])),
  sin = Math.abs(Math.sin(axy[0])),
  w = cos * textWidth + sin * textHeight,
  h = sin * textWidth + cos * textHeight;

  return [getTextCenter(axy, textWidth + 2 * (pxoffset || 0)), w, h, 0];
}

var checkCollision = function(collisions, ctx, text, axy, letterWidth) {
  var textWidth =  getWidth(ctx, text);

  for (var i = 0; i < textWidth; i += letterWidth) {
    if (collisions.checkPointWH.apply(collisions,  getCollisionParams(letterWidth, axy, i))) {
      return true;
    }
  }
  return false;
}

var addCollision = function(collisions, ctx, text, axy, letterWidth) {
  var textWidth = getWidth(ctx, text),
  params = [];

  for (var i = 0; i < textWidth; i += letterWidth) {
    params.push( getCollisionParams(letterWidth, axy, i));
  }
  collisions.addPoints(params);
}

var renderText = function(ctx, axy, halo) {
  var text = axy[4],
  textCenter =  getTextCenter(axy, getWidth(ctx, text));

  ctx.translate(textCenter[0], textCenter[1]);
  ctx.rotate(axy[0]);
  ctx[halo ? 'strokeText' : 'fillText'](text, 0, 0);
  ctx.rotate(-axy[0]);
  ctx.translate(-textCenter[0], -textCenter[1]);
}

exports.TextOnPath = TextOnPath;
