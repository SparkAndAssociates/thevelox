var notification = require(app.root + '/app/services/notification')
  , Swift = require(app.root + '/app/services/openstack/swift');

function Copy(options, callback) {
  this.options = options;
  this.user = options.user;
  this.callback = callback;
  this.action = this[options.how];
  this.swift = new Swift(this.user);

  this.findBoxesAndFiles(this.start.bind(this));
}

Copy.prototype = {

  start: function(err) {
    if (err) return this.callback(err);

    this.files.forEach(function(file, index) {
      var copy = new StorageObject({
        box: this.whereBox.id,
        container: this.whereBox.swift.container.name,
        ext: file.ext,
        name: file.name,
        mime: file.mime,
        size: file.size,
        tags: [],
        status: file.status,
        type: file.type
      });

      if (file.images) copy.images = file.images;
      if (file.description) copy.description = file.description;

      copy.box = this.whereBox.id;
      copy.members = this.whereBox.members;
      copy.tags = [];
      copy.uploadDate = new Date;
      copy.lastModifyDate = new Date;
      copy.lastModifyUser = this.user.name;
      copy.lastModifyUsername = this.user.username;
      copy.author = this.user.name;
      copy.authorName = this.user.username;

      this.action(file, copy, function() {
        this.end(index, file, copy);
      }.bind(this));

    }.bind(this));
  },

  // 물리적인 파일 복사
  end: function(index, file, copy) {   
    this.swift.copyObject(
        {container: this.whereBox.swift.container.name, file: copy.id}
      , {container: this.fromBox.swift.container.name, file: file.id}
      , function(err, res, body) {

      if (err) return this.callback(err);

      copy.save();

      // 복사된 파일 로그 작성
      var tohistory = new History({
          head: file.id
        , where: {id: this.whereBox.id, name: this.whereBox.name}
        , when: copy.uploadDate
        , who: {name: this.user.name, username: this.user.username, email: this.user.email, ip: this.user.clientIp}
        , how: 'copyto'
      });
      tohistory.save();

      // 복사한 파일 로그 작성
      var fromhistory = new History({
          head: copy.id
        , where: {id: this.fromBox.id, name: this.fromBox.name}
        , when: copy.uploadDate
        , who: {name: this.user.name, username: this.user.username, email: this.user.email, ip: this.user.clientIp}
        , how: 'copyfrom'
      });
      fromhistory.save();
      
      if (index == this.files.length - 1) this.callback();
    }.bind(this));
  },

  setAvailableSize: function(box, file) {
    User.find({_id: {$in: box.members}}, function(err, users) {
      if (err) return console.error(err);

      box.size = (box.size || 0) + file.size;
      box.fileLength = (box.fileLength || 0) + 1;
      box.save();

      users.forEach(function(user) {
        user.availableSize = user.availableSize - file.size;
        user.save();

        notification.nospace(this.options.host, user, this.user); // host, user, sessionUser
      }.bind(this));
    }.bind(this));
  },

  // 새로운 항목으로 복사
  newitem: function(file, copy, callback) {

    // 새로운 항목으로 등록되면 용량 차감
    this.setAvailableSize(this.whereBox, copy);

    StorageObject.FindWithRegex(copy.box, copy, function(err, _files) {
      if (err || !_files.length) {
        console.warn(err || 'Duplicated file not found');
        return callback();
      }

      var index = 1
        , filenames = []
        , duplication = true
        , dupName = /(.*)\.[^.]+$/.exec(copy.name)[1];

      _files.forEach(function(dupFile) {
        filenames[dupFile.name] = copy.name
      });

      while (duplication) {
        if (!filenames[ dupName + ' (' + index + ').' + file.ext]) {
          duplication = false;
          copy.name = dupName + ' (' + index + ').' + file.ext;
        } else index++;
      }

      callback();
    });
  },

  // 기존 파일 대체(버전) 복사
  version: function(file, copy, callback) {
    StorageObject.findOne({box: copy.box, name: copy.name, status: 1}, function(err, revision) {
      if (err || !revision) {
        console.warn(err || 'Revision not found');
        return callback();
      }

      copy.versions = [revision];
      copy.status = 1;
      if (revision.versions) copy.versions = copy.versions.concat(revision.versions);

      revision.versions = [];
      revision.status = 2;
      revision.save();
      
      callback();
    });
  },

  findBoxesAndFiles: function(callback) {
    var options = this.options;

    Box.find({$or: [{_id: options.fromBoxId}, {_id: options.whereBoxId}]}, function(err, boxes) {
      if (err || boxes.length != 2) return callback(err || new Error('Box not found'));
  
      boxes.forEach(function(box) {
        if (box.id == options.fromBoxId) this.fromBox = box;
        else if (box.id == options.whereBoxId) this.whereBox = box;
      }.bind(this));
  
      // TODO: Add check size
      StorageObject.find({_id: {$in: options.files}}, function(err, files) {
        if (err) return callback(err);

        this.files = files;
        callback(null);

      }.bind(this));
    }.bind(this));
  }
};

module.exports = Copy;