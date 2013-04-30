var async = require('async')
  , validator = require('validator');

var Delivery = function (options) {
  if (!options) throw new Error('require argument "options"');

  // requiredParams
  this._user = options.user;
  this._params = options.params;
};

function FileValidate(file) {
  if (file.expire == -1) file.expire = undefined;
  if (file.password.trim().length == 0) file.password = undefined;

  file.recipient.forEach(function(item) {
    if (item.trim().length == 0) {
      file.recipient.splice(file.recipient.indexOf(item), 1);
    }
  });

  return file;
}

Delivery.prototype = {
  FindPublicFiles: function (callback) {
    var params = this._params, user = this._user;
    async.parallel(
      [
        function (innerCallabck) {
          Box.findOne({_id: params.box, members:{$in: [user.id]}}, innerCallabck);
        },
        function (innerCallabck) {
          StorageObject.find({_id: {$in: params.ids.split(',')}}, innerCallabck); 
        },
        function (innerCallabck) {
          PublicObject.findOne({fileRef: {$all: params.ids.split(',')}}, innerCallabck);
        }
      ],

      function(err, results) {
        //console.log(results[1])
         if (err || !results[0] || !results[1] || !results[1].length) return callback(err || new Error('File not found'));
       
        callback(null, results[0], results[1], results[2]);
      }
    );
  },

  // TODO: Change method name to 'putPublicFile'
  put_PublicFile: function (file) {
    var params = this._params;

    if (file) {
      file.subject = params.subject.trim();
      file.message = params.message.trim();
      file.expire = params.expire;
      file.created = new Date();
      file.password = params.password;
      file.recipient = params.recipient.split(',');
      file.status = 1;
    } else {
      file = new PublicObject({
        subject: params.subject.trim(),
        message: params.message.trim(),
        expire: params.expire,
        created: new Date(),
        password: params.password,
        recipient: params.recipient.split(','),
        status: 1
      });
    }

    return FileValidate(file);
  },

  SaveHistory: function (box, file, user, options, callback) {
    var history = new History({
      head: (file.versions.length > 0) ? file.versions[file.versions.length - 1]._id : file.id,
      type: options.type,
      what: options.what,
      where: {id: file.box, name:box.name},
      when: new Date,
      who: {name: user.name, username: user.username, email: user.email, ip: user.clientIp},
      how: options.how
    });

    history.save(callback);
  }
};

module.exports = Delivery;