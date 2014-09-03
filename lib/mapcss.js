/*

This file contains parts of  source code under following license:

 (c) 2013, Darafei Praliaskouski, Vladimir Agafonkin, Maksim Gurtovenko
 Kothic JS is a full-featured JavaScript map rendering engine using HTML5 Canvas.
 http://github.com/kothic/kothic-js
*/

var MapCSS = function(){
  this.styles = {};
  this.availableStyles = [];
  this.images = {};
  this.locales = [];
  this.presence_tags = [];
  this.value_tags = [];
  this.cache = {};
  this.debug = {hit: 0, miss: 0};
}

MapCSS.prototype.onError = function () {
}

MapCSS.prototype.onImagesLoad = function () {
}

/**
* Incalidate styles cache
*/
MapCSS.prototype.invalidateCache = function () {
  this.cache = {};
}

MapCSS.prototype.e_min = function (/*...*/) {
  return Math.min.apply(null, arguments);
}

MapCSS.prototype.e_max = function (/*...*/) {
  return Math.max.apply(null, arguments);
}

MapCSS.prototype.e_any = function (/*...*/) {
  var i;

  for (i = 0; i < arguments.length; i++) {
    if (typeof(arguments[i]) !== 'undefined' && arguments[i] !== '') {
      return arguments[i];
    }
  }

  return '';
}

MapCSS.prototype.e_num = function (arg) {
  if (!isNaN(parseFloat(arg))) {
    return parseFloat(arg);
  } else {
    return '';
  }
}

MapCSS.prototype.e_str = function (arg) {
  return arg;
}

MapCSS.prototype.e_int = function (arg) {
  return parseInt(arg, 10);
}

MapCSS.prototype.e_tag = function (obj, tag) {
  if (obj.hasOwnProperty(tag) && obj[tag] !== null) {
    return tag;
  } else {
    return '';
  }
}

MapCSS.prototype.e_prop = function (obj, tag) {
  if (obj.hasOwnProperty(tag) && obj[tag] !== null) {
    return obj[tag];
  } else {
    return '';
  }
}

MapCSS.prototype.e_sqrt = function (arg) {
  return Math.sqrt(arg);
}

MapCSS.prototype.e_boolean = function (arg, if_exp, else_exp) {
  if (typeof(if_exp) === 'undefined') {
    if_exp = 'true';
  }

  if (typeof(else_exp) === 'undefined') {
    else_exp = 'false';
  }

  if (arg === '0' || arg === 'false' || arg === '') {
    return else_exp;
  } else {
    return if_exp;
  }
}

MapCSS.prototype.e_metric = function (arg) {
  if (/\d\s*mm$/.test(arg)) {
    return 1000 * parseInt(arg, 10);
  } else if (/\d\s*cm$/.test(arg)) {
    return 100 * parseInt(arg, 10);
  } else if (/\d\s*dm$/.test(arg)) {
    return 10 * parseInt(arg, 10);
  } else if (/\d\s*km$/.test(arg)) {
    return 0.001 * parseInt(arg, 10);
  } else if (/\d\s*in$/.test(arg)) {
    return 0.0254 * parseInt(arg, 10);
  } else if (/\d\s*ft$/.test(arg)) {
    return 0.3048 * parseInt(arg, 10);
  } else {
    return parseInt(arg, 10);
  }
}

MapCSS.prototype.e_zmetric =  function (arg) {
  return this.e_metric(arg);
}

MapCSS.prototype.e_localize = function (tags, text) {
  var locales = this.locales, i, tag;

  for (i = 0; i < locales.length; i++) {
    tag = text + ':' + locales[i];
    if (tags[tag]) {
      return tags[tag];
    }
  }

  return tags[text];
}

MapCSS.prototype.loadStyle = function (style, restyle, sprite_images, external_images, presence_tags, value_tags) {
  var i;
  sprite_images = sprite_images || [];
  external_images = external_images || [];

  if (presence_tags) {
    for (i = 0; i < presence_tags.length; i++) {
      if (this.presence_tags.indexOf(presence_tags[i]) < 0) {
        this.presence_tags.push(presence_tags[i]);
      }
    }
  }

  if (value_tags) {
    for (i = 0; i < value_tags.length; i++) {
      if (this.value_tags.indexOf(value_tags[i]) < 0) {
        this.value_tags.push(value_tags[i]);
      }
    }
  }

  this.styles[style] = {
    restyle: restyle,
    images: sprite_images,
    external_images: external_images,
    textures: {},
    sprite_loaded: !sprite_images,
    external_images_loaded: !external_images.length
  };

  this.availableStyles.push(style);
}

/**
* Call MapCSS.onImagesLoad callback if all sprite and external
* images was loaded
*/
MapCSS.prototype._onImagesLoad = function (style) {
  if (this.styles[style].external_images_loaded && this.styles[style].sprite_loaded) {
    this.onImagesLoad();
  }
}

MapCSS.prototype.preloadSpriteImage= function (style, url) {
  var images = this.styles[style].images,
  img = new Image();

  delete this.styles[style].images;

  img.onload = function () {
    var image;
    for (image in images) {
      if (images.hasOwnProperty(image)) {
        images[image].sprite = img;
        this.images[image] = images[image];
      }
    }
    this.styles[style].sprite_loaded = true;
    this._onImagesLoad(style);
  };
  img.onerror = function (e) {
    this.onError(e);
  };
  img.src = url;
}

MapCSS.prototype.preloadExternalImages = function (style, urlPrefix) {
  var external_images = this.styles[style].external_images;
  delete this.styles[style].external_images;

  urlPrefix = urlPrefix || '';
  var len = external_images.length, loaded = 0, i;

  function loadImage(url) {
    var img = new Image();
    img.onload = function () {
      loaded++;
      this.images[url] = {
        sprite: img,
        height: img.height,
        width: img.width,
        offset: 0
      };
      if (loaded === len) {
        this.styles[style].external_images_loaded = true;
        this._onImagesLoad(style);
      }
    };
    img.onerror = function () {
      loaded++;
      if (loaded === len) {
        this.styles[style].external_images_loaded = true;
        this._onImagesLoad(style);
      }
    };
    img.src = url;
  }

  for (i = 0; i < len; i++) {
    loadImage(urlPrefix + external_images[i]);
  }
}

MapCSS.prototype.getImage = function (ref) {
  var img = this.images[ref];

  if (img && img.sprite) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img.sprite, 0, img.offset, img.width, img.height, 0, 0, img.width, img.height);
    img = this.images[ref] = canvas;
  }

  return img;
}

MapCSS.prototype.getTagKeys = function (tags, zoom, type, selector) {
  var keys = [], i;
  for (i = 0; i < this.presence_tags.length; i++) {
    if (tags.hasOwnProperty(this.presence_tags[i])) {
      keys.push(this.presence_tags[i]);
    }
  }

  for (i = 0; i < this.value_tags.length; i++) {
    if (tags.hasOwnProperty(this.value_tags[i])) {
      keys.push(this.value_tags[i] + ':' + tags[this.value_tags[i]]);
    }
  }

  return [zoom, type, selector, keys.join(':')].join(':');
}

MapCSS.prototype.restyle = function (styleNames, tags, zoom, type, selector) {
  var i, key = this.getTagKeys(tags, zoom, type, selector), actions = this.cache[key] || {};

  if (!this.cache.hasOwnProperty(key)) {
    this.debug.miss += 1;
    for (i = 0; i < styleNames.length; i++) {
      actions = this.styles[styleNames[i]].restyle(actions, tags, zoom, type, selector);
    }
    this.cache[key] = actions;
  } else {
    this.debug.hit += 1;
  }

  return actions;
}

exports.MapCSS = MapCSS;
