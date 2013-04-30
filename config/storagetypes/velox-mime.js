var path = require('path');
var fs = require('fs');

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);
  this.extensions = Object.create(null);
}

//Mime.prototype.define = function (map) {
//  for (var type in map) {
//    var exts = map[type];
//
//    for (var i = 0; i < exts.length; i++) {
//      this.types[exts[i]] = type;
//    }
//
//    // Default extension is the first one we encounter
//    if (!this.extensions[type]) {
//      this.extensions[type] = exts[0];
//    }
//  }
//};

//Mime.prototype.extension = function(mimeType) {
//  return this.extensions[mimeType];
//};

Mime.prototype.load = function(file) {
  // Read file and split into lines
  var map = {},
    ext  = {},
    tag = {},
    content = fs.readFileSync(file, 'ascii'),
    lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields[0]] = fields[1];
    if(fields[2] != undefined){
      ext[fields[0]] = fields[2];
      if(tag[fields[2]]){
        tag[fields[2]] += ','+ fields[0];
      }else tag[fields[2]] = fields[0];
    }
  });

  this.types = map;
  this.extensions = ext;
  this.autotag = tag;
  //console.log(this.tag['image']);
};


Mime.prototype.lookup = function(contentType, fallback) {
  return this.types[contentType] || fallback || this.default_type;
  //return this.types[ext][0] || fallback || this.default_type;
};

Mime.prototype.ext = function(contentType, fallback) {
  console.log(this.extensions[contentType]);
  return this.extensions[contentType] || fallback || this.default_type;
  //return this.types[ext][0] || fallback || this.default_type;
};

Mime.prototype.autotags = function(type, fallback) {
  return this.autotag[type] || fallback || this.default_type;
  //return this.types[ext][0] || fallback || this.default_type;
};

var mime = new Mime();
//mime.charsets = {
//  lookup: function(mimeType, fallback) {
//    // Assume text types are utf8
//    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
//  }
//}

mime.load(path.join(process.cwd(), 'config/storagetypes/velox.mime.types'));
mime.default_type = mime.lookup('default');

module.exports = mime;

