var async = require('async')
  , notification = require(app.root + '/app/services/notification')
  , Swift = require(app.root + '/app/services/openstack/swift')
  , Container = require(app.root + '/app/services/openstack/container');

load('application'); 
before(use('setUserLocale'));
before(use('requireUser'));

action('index', function() {
  Box.MyBox(session.user.id, function(err, boxes) {
    if (err) return next(err);
    layout('application');
    render({selected: {}, boxes: boxes || []});
  });
});

action('list', function() {
  async.waterfall([
    function(callback) {
      Box.listProjects(session.user.id, function(err, boxes) {
        if (!boxes.length) callback(err, [session.user.id], boxes);
        else {
          var _members = [];
          async.forEach(boxes, function(box, endcallback) {
            box.members.forEach(function(member) {
              if (_members.indexOf(member) == -1) _members.push(member);
            });
            endcallback();
          }, function(err) {
            callback(err, _members, boxes)
          });
        }
      });
    },
    function(userIds, boxes, callback) {
      User.ListByIds(userIds, function(err, users) {
        callback(err, users, boxes);
      });
    }
  ],
  function(err, users, boxes, callback) {
    if (err) return next(err);

    var members = {};
    async.forEach(users, function(user, endcallback) {
      members[user.id] = user;
      endcallback();
    }, function(err) {
      if (err) return next(err);
      layout(false);
      render({archives: boxes, members: members, size: members[session.user.id].availableSize || 0});
    });
  });
});

action('remove', function() {
  async.waterfall([
    function(callback) {
      Box.GetByAuth(body.id, session.user.id, callback);
    },
    function(box, callback) {
      if (!box) return callback(new Error('box not found'));

      if (box.owner == session.user.id) {
        box.status = 2;
        box.save(callback);
      }
      else {
        box.members = app._.reject(box.members, function(memberId) {
          return memberId == session.user.id;
        });
        box.save(function(err) {
          callback(err, box);
        });
      }
    }
  ],
  function(err, box) {
    if (err) return next(err);
    send(box.members);
  });
});

action('checkuser', function() {
  async.waterfall([
    function(callback) {
      User.GetByName(body.username, function(err, user) {
        if (!user) {
          res.statusCode = 400;
          return callback(new Error('empty'));
        }
        callback(err, user);
      })
    },
    function(user, callback) {
      Box.MyBox(user.id, function(err, boxes) {
        if (boxes.length > 5) {
          res.statusCode = 400;
          return callback(new Error('limit'))
        }
        callback(err, user);
      });
    }
  ],
  function(err, user) {
    if (err) {
      if (err.message == 'empty') return send('Unknown user');
      else if (err.message == 'limit') return send('He is Busy Now');
      else return next(err);
    }
    if (user.id == session.user.id) return send('It\'s you', 400);
    send(user);
  });
});

action('checkname', function() {
  async.waterfall([
    function (callback) {
      Box.GetByAuthAndName(body.boxname, session.user.id, callback);
    },
    function(box, callback) {
      if (box) return callback(new Error('duplication'));
      callback(null);
    }
  ],
  function(err) {
    if (err) {
      if (err.message == 'duplication') return send('Duplicated');
      return next(err);
    }
    send('Available');
  });
});

action('create', function() {
  layout(false);
  render('edit', {box: null});
});

action('edit', function() {
  async.waterfall([
    function (callback) {
      Box.GetByOwner(params.box, session.user.id, function(err, box) {
        if (!box) return callback(new Error('Unauthenticated'));
        callback(err, box);
      });
    },
    function(box, callback) {
      User.ListByIds(box.members, function(err, users) {
        callback(err, box, users)
      });
    }
  ],
  function(err, box, users) {
    if (err) return next(err);
    layout(false);
    render('edit', {box: box, users: users});
  });
});

action('update', function() {
  async.waterfall([
    function (callback) {
      Box.GetByOwner(params.box, session.user.id, function(err, box) {
        if (!box) return callback(new Error('Unauthenticated'));
        callback(err, box);
      });
    },
    function(box, callback) {
      if (body.message.closed) {
        var container = new Container(box);
        container.Close(callback);
      }
      else {
        var users = {ids:[], names:[], acls:[]};
        if (body.message.to) {
          if (typeof(body.message.to) == 'string') {
            users.names.push(body.message.to);
          }
          else {
            body.message.to.forEach(function(user) {
              users.names.push(user);
            });
          }
        }

        if (params.indexOf(session.user.name) == -1) {
          users.names.push(session.user.name);
        }
        
        // 초대 알림 이메일 발송
        notification.invited(req.headers.host, box, users, session.user); // host, box, users, sessionUser

        var container = new Container(box, users);
        container.SetAcl(body.message.subject, body.message.message, callback);
      }
    }
  ],
  function(err) {
    if (err) return next(err);

    header('Content-type', 'text/javascript');
    send('Velox.hideDialog()');
  });
});

action('save', function() {
  async.waterfall([
    function (callback) {
      if (!body.message || !body.message.subject) return callback(new Error('Invalid parameter'));

      var users = {ids:[], names:[], acls:[]};
      if (body.message.to) {
        if (typeof(body.message.to) == 'string') {
          users.names.push(body.message.to);
        }
        else {
          body.message.to.forEach(function(user) {
            users.names.push(user)
          });
        }
      }
      if (params.indexOf(session.user.name) == -1) {
        users.names.push(session.user.name);
      }
      callback(null, users, new Box({
        owner: session.user.id
      , swift: {
          tenant: {
            id: '6049fcdd4c3a46909a9dbaad04f1636a'
          , name: 'service'
        }
      }
      , createDate: new Date()
      , lasModifyDate: new Date()
      , type: 3
      , status: 1
      }));
    },
    function (users, box, callback) {
      var containerName = session.user.name +'_share_'+ box.id; 
      box.swift.container.name = containerName;

      var container = new Container(box, users);
      container.Create(containerName, function(err, _res, _body) {
        if (err) return callback(err);
        container.SetAcl(body.message.subject, body.message.message, function(err) {
          callback(err, users, box);
        });
      });
    }
  ],
  function(err, users, box) {
    if (err) return next(err);

    header('Content-type', 'text/javascript');
    send('Velox.hideDialog(); Velox.addBox("", {new: true, boxId: "' + box.id + '", name: "' + box.name + '", users: "' + users.ids.join(',') + '"});');
  });
});

action('delete', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  Box.find({_id:{$in: body.ids.split(',')}}, function(err, boxes) {
    if (err) return next(err);

    var swift = new Swift(session.user);
    boxes.forEach(function(box, boxIndex) {
      StorageObject.find({box: box.id}, function(err, files) {
        if (err) return next(err);

        if (files && files.length > 0) {
          files.forEach(function(file, fileIndex) {
            swift.deleteObject({conainer: file.container, id: file.id}, function() {
              file.remove();
            });

            if (fileIndex == files.length - 1) box.remove();
          });
        }
        else {
          box.remove();
        }

        if (boxIndex == boxes.length - 1) send('ok');
      });
    });
  });
});

action('restore', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  Box.find({_id:{$in: body.ids.split(',')}}, function(err, boxes) {
    if (err) return next(err);

    boxes.forEach(function(box, index) {
      box.status = 1;
      box.save();
      send('ok');
    });
  });
});