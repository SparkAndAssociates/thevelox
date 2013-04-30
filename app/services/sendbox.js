var fs = require('fs')
  , notification = require(app.root + '/app/services/notification')
  , Thumbnail = require(app.root + '/app/services/thumbnails/index')
  , Keystone = require(app.root + '/app/services/openstack/keystone')
  , Swift = require(app.root + '/app/services/openstack/swift');

function Sendbox(options, callback) {
  this.host = options.host;
  this.box = options.box;
  this.user = options.user;

  // file object에 status 3 추가, 3은 등록 대기 상태
  this.file = new StorageObject({
    box: options.box.id,
    mime: options.file.type,
    name: options.file.name,
    size: options.file.size,
    description: options.description,
    type: 1,
    status: options.status,
    uploadDate: new Date,
    lastModifyDate: new Date,
    lastModifyUser: options.email || 'Unknown',
    lastModifyUsername: options.clientIp,
    author: options.email || 'Unknown',
    authorName: options.clientIp,
    container: options.box.swift.container.name,
    members: options.box.members,
    isReceived: true,
    public: { 
      title: options.file.name,
      description: options.description,
      email: options.email || 'Unknown'
    },
    ext: (/[.]/.exec(options.file.name)) ? /[^.]+$/.exec(options.file.name) : undefined
  });

  this.localPath = options.file.path;
  this.isImageType = app.vm.lookup(this.file.mime) == 'image' || this.file.mime == 'application/pdf';

  this.sendSwift(function(err) {
    if (err) return callback(err);

    this.file.save();

    if (this.isImageType) this.createThumbnail();
    if (options.status == 1) this.setAvailableSize();
    
    callback(null, this.file);
    
    app.clog.info('Sendbox: created database');
  }.bind(this));
}

Sendbox.prototype = {
  createThumbnail: function() {
    this.file.localPath = this.localPath;
    new Thumbnail(null, this.file, function(err) {
      if (err) return app.clog.error(err);
      app.clog.info('Sendbox: created thumbnail');
    });
  },
  
  sendSwift: function(callback) {
    var keystone = new Keystone(app.config.keystone);
    keystone.operatorTokens(function(err, token) {
      if (err) return callback(err);

      var swift = new Swift(token)
        , readSteram = fs.createReadStream(this.localPath);
        
      readSteram.pipe(swift.upload(this.file, callback));
      app.clog.info('Sendbox: sending swift');
    }.bind(this));
  },

  setAvailableSize: function() {
    this.box.size = (this.box.size || 0) + this.file.size;
    this.box.fileLength = (this.box.fileLength || 0) + 1;
    this.box.save();

    User.find({_id: {$in: this.box.members}}, function(err, users) {
      !err && users.forEach(function(user) {
        user.availableSize = user.availableSize - this.file.size;
        user.save();

        notification.nospace(this.host, user); // host, user
      }.bind(this));
    }.bind(this));

    app.clog.info('Sendbox: checked available size');
  },

  // too heavy process
  _checkSize: function(callback) {
    Box.find({members: {$in: [this.user.id]}, status:1}, function(err, boxes) {
      if (err) return callback(err);

      var boxlist = []
        , total = 0;

      boxes.forEach(function(box) {
        boxlist.push(box.id);
      });

      StorageObject.find({box: {$in: boxlist}}, function(err, files) {
        if (err) return callback(err);

        files.forEach(function(file) {
          if (file.size) total += file.size;
        });

        app.clog.info('Sendbox: checked total free space');

        var totalSize = 100 * 1024 * 1024 * 1024; // 100GB
        User.findOne({_id: this.user.id}, function(err, user) {
          if (err) return callback(err);

          user.availableSize = totalSize - total;
          user.save();

          this.file.status = 1;
          this.file.type = 1;
          this.file.uploadDate = new Date();
          this.file.lastModifyDate = new Date();
          this.file.description = '';
          this.file.save(callback);

          app.clog.info('Sendbox: saved database and finish');

        }.bind(this));
      }.bind(this));
    }.bind(this));
  }
};


Sendbox.setAvailableSize = function(host, box, file) {
  Sendbox.prototype.setAvailableSize.call({
    box: box,
    file: file,
    host: host
  });
};

module.exports = Sendbox;