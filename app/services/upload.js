var fs = require('fs')
  , notification = require(app.root + '/app/services/notification')
  , Keystone = require(app.root + '/app/services/openstack/keystone')
  , Swift = require(app.root + '/app/services/openstack/swift');


function Upload(req, isRevisions) {
  this.box = req.params.box;
  this.user = req.session.user;
  this.host = req.headers.host;
  this.isRevisions = isRevisions;
  this.file = new StorageObject();
  this.file.mime = req.files.file.type;
  this.file.name = req.files.file.name;
  this.file.size = req.files.file.size;
  this.file.tags = (this.user && this.user.boxtags[this.box] ) ? this.user.boxtags[this.box] : [];
  this.file.ext = (/[.]/.exec(this.file.name)) ? /[^.]+$/.exec(this.file.name) : undefined;
  this.isDocumentType = app.vm.lookup(this.file.mime).match(/acrobat|spreadsheet|presentation|document/);
  this.isImageType = app.vm.lookup(this.file.mime).match(/image|video/) || this.file.mime == 'image/svg+xml';
  this.tempFilePath =  process.cwd()+'/temp/'+ this.file.id +'.' + this.file.ext;

  fs.renameSync(req.files.file.path, this.tempFilePath);
}

Upload.prototype = {

  versions : function(old, tokens, callback) {
    var self = this;
    StorageObject.findOne({_id: old}, function(err, revision) {
      if (err) return callback(err);

      self.file.versions = [revision];
      self.file.status = 1;
      if (revision.versions) self.file.versions = self.file.versions.concat(revision.versions);
      revision.versions = [];
      revision.status = 2;
      revision.save(function(err) {
        if (err) return callback(err);

        self.sendSwift(callback);
      });
    });
  },

  sendSwift: function(callback) {
    var self = this;

    Box.findOne({_id: self.box}, function(err, box) {
      if (err) return callback(err);

      self.file.container = box.swift.container.name;
      self.file.box = box.id;
      self.storeBox(self.user, box, callback);
      var keystone = new Keystone(app.config.keystone);
      keystone.operatorTokens(function(err, tokens) {
        if (err) return callback(err);

        var swift = new Swift(tokens);
        var readSteram = fs.createReadStream(self.tempFilePath);
        readSteram.pipe(swift.upload(self.file));
      });
    });
  },

  storeBox : function(userInfo, box, callback) {
    var isRevisions = this.isRevisions;
    var self = this
      , file = this.file
      , isImageType = this.isImageType
      , isDocumentType = this.isDocumentType;

    if (!userInfo) return callback('WTF? no userInfo');

    User.find({_id:{$in: box.members}}, function(err, users) {
      if (err) return callback(err);

      box.size = (box.size || 0) + file.size;
      box.fileLength = (box.fileLength || 0) + 1;
      box.save();

      users.forEach(function(user) {
        user.availableSize = user.availableSize - file.size;
        user.save();

        notification.nospace(self.host, user, self.user); // host, user, sessionUser

        if (user.id == userInfo.id) {
          file.lastModifyUser = userInfo.name;
          file.lastModifyUsername = userInfo.username;
          file.author = userInfo.name;
          file.authorName = userInfo.username;
          file.status = 1;
          file.type = 1;
          file.uploadDate = new Date();
          file.lastModifyDate = new Date();
          file.description = '';

          StorageObject.FindWithRegex(file.box, file, function(err, files) {
            if (err) return callback(err);

            if (!files.length || isRevisions) {
              file.save(function(err) {
                if (err) return callback(err);

                callback(null, {
                  file: file,
                  path: self.tempFilePath,
                  availableSpace: user.availableSize,
                  isDocumentType: isDocumentType,
                  isImageType: isImageType
                });

                var history = new History({
                    head: file.id
                  , type: 'info'
                  , where: {id: file.box, name: box.name}
                  , when: file.uploadDate
                  , who: {name: user.name, username: user.username, email: user.email, ip: user.clientIp}
                  , how: 'upload'
                });

                if (isRevisions) {
                  history.head = file.versions[file.versions.length - 1]._id;
                  history.what = file.versions.length + 1;
                  history.how = 'revision';
                }

                history.save();
              });
             }
             else {

              var filenames = [];
              files.forEach(function(dupFile) {
                filenames[dupFile.name] = file.name
              });

              var index = 1, duplication = true, dupName = /(.*)\.[^.]+$/.exec(file.name)[1];
              while(duplication) {
                if (!filenames[ dupName + ' ('+ index +').'+ file.ext]) {
                  duplication = false;
                  file.name = dupName + ' ('+ index +').'+ file.ext
                  file.save(function(err) {
                    if (err) return callback(err);

                    callback(null, {
                      file: file,
                      path: self.tempFilePath,
                      availableSpace: user.availableSize,
                      isDocumentType: isDocumentType,
                      isImageType: isImageType
                    });

                    var history = new History({
                        head: file.id
                      , type: 'info'
                      , where: {id: file.box, name: box.name}
                      , when: file.uploadDate
                      , who: {name: user.name, username: user.username, email: user.email, ip: user.clientIp}
                      , how: 'upload'
                    });

                    history.save();
                  });
                }
                else{
                  index ++;
                }
              }
            }

          }); // StorageObject.FindWithRegex
        }

      }); // users.forEach
    }); // User.find
  }
};

module.exports = Upload;