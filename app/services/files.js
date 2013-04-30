var async = require('async')
  , Swift = require(app.root + '/app/services/openstack/swift');

var Files = exports.Files = function(options) {
  if (!options) throw new Error('500');

  // requiredParams
  this._user = options.user;
  this._params = options.params;
};

Files.prototype = {
  BoxFromMember: function(callback) {
    Box.GetFromMember(this._params.box, this._user.id, callback);
  },

  TrashFiles: function(box, callback) {
    if (!box) return callback(new Error('UnAuthorization'));
  
    var trashFunc = this.ChangeStatus
      , historyFunc = this.History
      , user = this._user;

    async.forEach(this._params.ids.split(','), 
      function(id, endcallback) {
        trashFunc(id, 2, function(err, file) {
          historyFunc(box, file, user, {type:'info', how: 'trash'}, endcallback);
        });
      },
      function(err) {
        callback(err);
      });
  },

  RestoreFiles: function(box, callback) {
    if (!box) return callback(new Error('UnAuthorization'));

    var trashFunc = this.ChangeStatus
      , historyFunc = this.History
      , user = this._user;

    async.forEach(this._params.ids.split(','), 
      function(id, endcallback) {
        ChangeStatus(id, 1,  function(err, file) {
          if (err|| !file) return endcallback(new Error('500'));
          historyFunc(box, file, user, {type: 'info', how:'restore'}, endcallback)
        });
      },
      function(err) {
        callback(err);
      });
  },

  ChangeStatus: function(id, status, callback) {
    StorageObject.findByIdAndUpdate(id, {status: status}, callback);
  },

  History: function(box, file, user, options, callback) {
    var history = new History({
      head:  (file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id,
      type: options.type,
      where: {id: file.box, name:box.name},
      when: new Date,
      who: {name: user.name, username: user.username, email: user.email, ip: user.clientIp},
      how: options.how
    });
    history.save(callback);
  },

  DeleteFiles: function(box, callback) {
    var deleteFunc = this.DeleteFile
      , historyFunc = this.History
      , swift = this.getSwiftRef()
      , user = this._user;

    async.forEach(this._params.ids.split(','),
      function(id, endcallback) {
        deleteFunc(id, function(err, file) {
          if (err|| !file) return endcallback(new Error('500'));

          box.size = box.size - (file.size || 0);
          swift.deleteObject({container: box.swift.container.name, id: file.id}, function(_err, _res, _body) {});
          historyFunc(box, file, user, {type: 'info', how: 'delete'}, endcallback);
        });
      },
      function(err) {
        callback(err, box);
      });
  },

  Delete: function(fileIds, box, callback) {
    if (!box) return callback(new Error('Box Not Found'));

    var historyFunc = this.History
      , swift = this.getSwiftRef()
      , user = this._user;

    StorageObject.find({box: box.id, _id:{$in: fileIds}, type: 1, status: 2}, function(err, files) {
      if (err) return callback(err);

      async.forEach(files, 
        function(file, endcallback) {
          file.remove(function(err) {
            if (err) return callback(err);

            box.size = box.size - (file.size || 0);
            swift.deleteObject({container: box.swift.container.name, id: file.id}, function(_err, _res, _body) {});
            historyFunc(box, file, user, {type: 'info', how: 'delete'}, endcallback);
          })
        },
        function(err) {
          callback(err, box, files);
        });
    });
  },

  DeleteAll: function(box, callback) {
    if (!box) return callback(new Error('Box Not Found'));

    var historyFunc = this.History
      , swift = this.getSwiftRef()
      , user = this._user;

    StorageObject.find({box: box.id,  type: 1, status: 2}, function(err, files) {
      if (err) return callback(err);

      async.forEach(files, 
        function(file, endcallback) {
          file.remove(function(err) {
            if (err) return callback(err);

            box.size = box.size - (file.size || 0);
            swift.deleteObject({container: box.swift.container.name, id: file.id}, function(_err, _res, _body) {});
            historyFunc(box, file, user, {type: 'info', how: 'delete'}, endcallback);
          });
        },
        function(err) {
          callback(err, box, files);
        });
    });
  },

  DelelteAllFiles: function(box, callback) {
     var historyFunc = this.History
       , swift = this.getSwiftRef()
       , user = this._user;

     StorageObject.find({box: this._params.box, type: 1, status: 2}, function(err, files) {
       if (err) return callback(err);

       async.forEach(files,  
         function(file, endcallabck) {
           file.remove(function(err) {
             box.size = box.size - (file.size || 0);
             swift.deleteObject({container: box.swift.container.name, id: file.id}, function(_err, _res, _body) {});
             historyFunc(box, file, user, {type: 'info', how: 'delete'}, endcallabck);
           });
         },
         function(err) {
           callback(err, box);
         });
     });
  },

  DeleteFile: function(id, callback) {
    StorageObject.findByIdAndRemove(id, callback);
  },

  BoxSizeCalc: function(box, callback) {
    box.save(callback);
    User.find({_id:{ $in: box.members}}, function(err, users) {
      users.forEach(function(user) {
        Box.find({members: { $in:[user.id]}}, function(err, boxes) {
          var available = 100 * 1024 * 1024 * 1024;
          boxes.forEach(function(useBox) {
            available = available - (useBox.size || 0);
          });
          user.availableSize = available > 0 ? available : 0;
          user.save();
        });
      });
    });
  },

  getSwiftRef: function() {
    if (this.swift) return this.swift;
    this.swift = new Swift(this._user);
    return this.swift;
  },

  SingleDownload: function(file) {
    return this.getSwiftRef().download(file);
  }
};

exports.singleDownload = function singleDownload(user, file) {
  var swift = new Swift(user);
  return swift.download(file);
};