/*!
 * Service- Thumbnails
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
var fs = require('fs')
  , Swift = require(app.root + '/app/services/openstack/swift');

function Thumbnails(user, file, callback) {
  var engine = app.vm.lookup(file.mime) == 'video' ? 'ffmpeg' : (
         file.mime == 'image/vnd.adobe.photoshop'
      || file.mime && file.mime.match(/image\/svg/)
      || file.mime == 'application/pdf') ? 'imagemagick' : 'graphicmagick'
    , save = this[engine == 'imagemagick' ? 'saveWrite' : 'saveWriteStream'];

  this.engine = require('./' + engine);
  this.callback = callback;
  this.file = file;
  this.path = process.cwd() + '/temp/'+ file.id +'.'+ file.ext;

  if (this.file.isReceived) this.path = file.localPath;

  fs.exists(this.path, function(exists) {
    file.images = {};
    if (exists) {
      this.engine(this.path, file, save.bind(this), callback);
    } else if (user) {
      // recreate thumbnail
      this.unlink = true;
      var swift = new Swift(user);
      swift.download(file).on('end', function() {
        this.engine(this.path, file, save.bind(this), callback);
      }.bind(this)).pipe(fs.createWriteStream(this.path));
    } else
      callback(new Error('create thumbnail image faild'))
  }.bind(this));
};


Thumbnails.prototype = {

  // save buffer
  saveWrite: function(err, stdout, stderr) {
    if (err || stderr) return this.callback(err || stderr);
    this.file.images.thumbnail = new Buffer(stdout, 'binary');
    this.file.save(function(err) {
      this.callback(err);
      this.unlink && fs.unlink(this.path);
    }.bind(this));
  },

  // save stream buffer
  saveWriteStream: function(err, stdout, stderr) {
    var err = null
      , thumbnailData = []
      , thumbnailDataLength = 0;

    if (err) return this.callback(err);

    stderr.on('data', function(data) {
      err = 'stderr: ' + data;
    });

    stdout.on('data', function(data) {
      thumbnailData.push(data);
      thumbnailDataLength += data.length;
    });
  
    stdout.on('end', function() {
      if (err) return this.callback(err);

      var thumbnailBuffer = new Buffer(thumbnailDataLength);
      for (var i = 0, len = thumbnailData.length, pos = 0; i < len; i++) {
        thumbnailData[i].copy(thumbnailBuffer, pos);
        pos += thumbnailData[i].length;
      }
  
      this.file.images.thumbnail = thumbnailBuffer;
      this.file.save(function(err) {
        this.callback(err);
        this.unlink && fs.unlink(this.path);
      }.bind(this));
    }.bind(this));
  }
};

module.exports = Thumbnails;