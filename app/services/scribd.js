/*!
 * Service - Scribds
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
var request = require('request')
  , Scribd = require('scribd');

var Scribds = module.exports = function(file) {

  var apikey = '46k4qij7iljd6lv70eesb'
    , secret = 'sec-3h5piryxffdyla5adgxt2m29pi';

  this.file = file;
  this.path = process.cwd() + '/temp/'+ file.id +'.'+ file.ext;
  this.scribd = new Scribd(apikey, secret);
};


Scribds.prototype = {

  remove: function(callback) {
    this.scribd.delete(callback, this.file.scribd.id);
  },

  create: function(callback) {
    this.callback = callback;

    if (this.file.scribd.id) {
      this.getThumbnailUrl();
      return;
    }

    this.scribd.upload({
        file: this.path
      , access: "private"
    }, function(err, res) {
      if (err) return this.callback(err);
      app.clog.info('scribd.upload', res);
      this.file.scribd = {
          id: res.doc_id
        , key: res.access_key
        , password: res.secret_password
      };
      this.file.save();
    }.bind(this));

    this.scribd.on('conversion', this.onConversion.bind(this));
  },

  onConversion: function(err, docId) {
    app.clog.info('scribd.onConversion', docId);
    if (err) return this.callback(err);
    if (this.file.scribd.id == docId) this.getThumbnailUrl();
  },

  getThumbnailUrl: function() {
    app.clog.info('scribd.getThumbnailUrl');

    this.scribd.getSettings(function(err, res) {
      if (err) return console.error(err);
      this.getThumbnailStream(res.thumbnail_url);
    }.bind(this), this.file.scribd.id);
  },

  // save stream buffer
  getThumbnailStream: function(url) {
    app.clog.info('scribd.getThumbnailStream');

    var thumbnailSize = url.split('/')[6].split('x')
      , thumbnailData = []
      , thumbnailDataLength = 0;

    request({
      method: "GET",
      uri: url

    }).on('data', function(data) {
      thumbnailData.push(data);
      thumbnailDataLength += data.length;

    }).on('end', function() {
      var thumbnailBuffer = new Buffer(thumbnailDataLength);

      for (var i = 0, len = thumbnailData.length, pos = 0; i < len; i++) {
        thumbnailData[i].copy(thumbnailBuffer, pos);
        pos += thumbnailData[i].length;
      }

      this.file.images = {
        width: thumbnailSize[0],
        height: thumbnailSize[1]
      };

      this.file.images.thumbnail = thumbnailBuffer;
      this.file.save(this.callback);
    }.bind(this));
  }
};