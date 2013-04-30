var Bitly = require('bitly')
  , async = require('async')
  , Sendbox = require(app.root + '/app/services/sendbox')
  , download = require(app.root + '/app/services/download')
  , notification = require(app.root + '/app/services/notification')
  , verification = require(app.root + '/app/services/verification')
  , Delivery = require(app.root + '/app/services/delivery')
  , Swift = require(app.root + '/app/services/openstack/swift')
  , Keystone = require(app.root + '/app/services/openstack/keystone')
  , helper = require(app.root + '/app/helpers/application_helper');

load('application');
before(use('setUserLocale'));
before(use('requireUser'), {except: ['auth', 'submit', 'verify', 'sendbox', 'export', 'upload', 'thumbnail', 'download', 'downloadall']});

action('shorten', function() {
  if (!req.query.url) return next(new Error('Invalid parameter')); 

  var bitly = new Bitly(app.config.bitly.user, app.config.bitly.key);
  bitly.shorten(req.query.url, function(err, response) {
    if (err) return next(err);
    send(response.data.url);
  });
});

action('share', function() {
  if (!req.query.ids) return next(new Error('Invalid parameter')); 

  var param = app._.extend(body, params);
  param = app._.extend(param, req.query);

  var logic = new Delivery({user: session.user, params: param});
  logic.FindPublicFiles(function(err, box, origins, external) {
    if (err) return next(err);
    layout(false);
    render({files: origins, external: external || {}, ids: req.query.ids, wrapper: req.query.layout != 'false'});
  });
});

action('create_link', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  var param = app._.extend(body, params);
  var logic = new Delivery({user: session.user, params: param});
  logic.FindPublicFiles(function(err, box, origins, external) {
    if (err) return next(err);

    if (external) {
      if (body.remove == '1') {
        external.status = 0;
        external.save();
        send('ok');
      } else {
        external = logic.put_PublicFile(external);
        external.save();
      }

      origins.forEach(function(origin) {
        logic.SaveHistory(box, origin, session.user, {
          type: 'info',
          how: 'updatelink',
          what: {id: external.id, subject: external.subject}
        });
      });

    } else {
      external = logic.put_PublicFile(null);
      origins.forEach(function(origin) {
        var findList = app._.find(external.fileRef, function(item) {
          return item.toString() == origin.id;
        });

        // updating sent flag
        origin.isSended = true;
        origin.save();
        
        if (!findList) external.fileRef.push(origin.id);

        logic.SaveHistory(box, origin, session.user, {
          type: 'info',
          how: 'createlink',
          what: {id: external.id, subject: external.subject}
        });
      });

      external.save();
    }

    // render dialog for result of create link
    layout(false);

    if (body.notify == '1') {
      verification.notify({
        host: req.headers.host,
        path: '/delivery/' + external.id + '/verify/',
        email: req.body.recipient,
        from: session.user.name,
        subject: external.subject
      }, function(err, message) {
        if (err) return next(err);
        render({id: external.id, share: external});
      });
    } else {
      render({id: external.id, share: external});
    }
  });
});

action('receive_link', function() {
  Box.findOne({_id: params.box, members: {$in: [session.user.id]}}, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    layout(false);
    render({userId: session.user.name, containerId: box.id, box: box});
  });
});

action('update_receive_link', function() {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    box.linkInfo = {
      subject: body.subject,
      message: body.message,
      password: body.password, 
      isEnabled: body.status == '1',
      recipient: body.recipient && body.recipient.split(',') || []
    };

    box.save();
    send('ok');
  });
});

// upload of sendbox
action('upload', function() {
  //FIXME: 중복되는 파일명이 있다면 유니크 파일명 적용
  User.findOne({_id: params.user}, function(err, user) {
    if (err || !user) return next(err || new Error('User not found'));

    Box.findOne({_id: params.box, members:{$in: [user.id]}}, function(err, box) {
      if (err) return next(err);

      var host = req.headers.host
        , status = body.drop.verified_email && 1 || 3
        , email = body.drop.email || body.drop.verified_email;

      new Sendbox({
        user: user,
        box: box,
        status: status,
        description: body.drop.description,
        file: req.files.drop.file,
        host: host,
        email: email,
        clientIp: req.header('X-Forwarded-For') || req.connection.remoteAddress
      }, function(err, file) {
        if (err) return next(err);

        if (status == 3) {
          verification.send({
            host: host,
            path: '/delivery/' + user.id + '/' + box.id + '/verify/',
            email: email,
            fileId: file.id
          }, function(err, result) {
            if (err) return next(err);

            console.log(result);
            send("<script>parent.uplFinished(false)</script>");
          });
        } else {
          send("<script>parent.uplFinished(true)</script>");
          notification.received(host, params.box, email); // host, boxId, from
        }
      });
    });
  });
});

// receive file form external users
action('sendbox', function() {
  if (!params.user && !params.uuid) return next(new Error('Invalid parameters'));

  var query = {};

  if (params.user.length >= 24) query._id = params.user;
  else query.name = params.user;

  User.findOne(query, function(err, user) {
    if (err || !user) return next(err || new Error('User not found'));

    Box.findOne({_id: params.uuid, members: {$in:[user.id]}}, function(err, box) {
      if (err || !box) return next(err || new Error('Box not found'));

      if (box.linkInfo.isEnabled === false) {
        layout('delivery');
        return render('auth', {mode: 'closed', path: '', share: {}});
      }

      // protection
      if (!session.user && (
        (session.passed != user.id + '/' + box.id && box.linkInfo.password) ||
        (session.verified != user.id + '/' + box.id && box.linkInfo.recipient && box.linkInfo.recipient.length)
      )) return redirect('/delivery/' + user.id + '/' + box.id + '/auth');

      layout('delivery');

      // varification
      if (session.fileId) {

        StorageObject.find({status: 3}, function(err, files) {
          if (err) return next(err);

          files.forEach(function(file) {
            if (file.id == session.fileId) {
              // file status change
              file.status = 1;
              file.save();

              delete session.fileId;
    
              // 남은 공간 차감
              Sendbox.setAvailableSize(req.headers.host, box, file); // host, box, file

            } else if (file.uploadDate + 1000 * 60 * 60 * 24 < new Date) {
              // 외부에서 전달한 파일이 대기 상태로 24시간이 경과한 파일과 데이터 삭제
              Box.findOne({_id: file.box}, function(err, _box) {
                if (err) return next(err);

                var keystone = new Keystone(app.config.keystone);
                keystone.operatorTokens(function(err, tokens) {
                  var swift = new Swift(tokens);
                  swift.deleteObject({container: _box.swift.container.name, id: file.id}, function(err, _res, _body) {
                    if (err) return next(err);
      
                    console.log('removed the expired panding file:', file);
                    file.remove();
                  });
                });
              });
            }
          });

          notification.received(req.headers.host, box.id, session.email); // host, boxId, from
          render({box: box, user: user, share: {}, verified: true});
        });
      } else {
        render({box: box, user: user, share: {}, verified: false});
      }
    });
  });
});

// export internal file for external users
action('export', function() {
  if (!params.uuid) return next(new Error('Invalid parameters'));

  async.waterfall([
    function(callback) {
      PublicObject.findOne({_id: params.uuid}, function(err, external) {
        if (err || !external) return callback(err || new Error('File not found'));
        callback(null, external);
      });
    },
    function(external, callback) {
      StorageObject.find({_id: {$in: external.fileRef}}, function(err, files) {
        if (err || !files || !files.length) return callback(err || new Error('Files not found'));
        callback(null, external, files);
      });
    }
  ],
  function(err, external, files) {
    if (err) return next(err);

    var expired = false;
    if (external.status == 0) expired = true;
    else if (external.expire) {
      var expire = new Date(external.created.getTime() + 1000 * 60 * 60 * external.expire);
      if (expire < new Date) expired = true;
    }

    if (expired) {
      // 만료 되었는데 상태가 살아있는 경우 (status 2 추가 2는 만료)
      if (external.status == 1) {      
        notification.expired(req.headers.host, files[0].box, external); // host, boxId, data
        //external.status = 2;
        external.save();
      }

      layout('delivery');
      return render('auth', {mode: 'expired', path: '', share: external});
    }

    // protect
    if (verification.protect(session, external)) return redirect('/delivery/' + external.id + '/auth');

    // history
    files.forEach(function(file) {
      var history = new History({
        when: new Date,
        type: 'info',
        how: 'accesslink',
        head: (file.versions.length > 0) ? file.versions[file.versions.length - 1]._id : file.id,
        what: {id: external.id, subject: external.subject},
        who: {email: session.email || null, ip: req.header('X-Forwarded-For') || req.connection.remoteAddress}
      });

      history.save();
    });

    layout('delivery');
    render({files:files, share: external});
  });
});


// protected password or email or both
function auth(err, data, path) {
  if (err) return next(err);

  var mode = null;
  if (!session.user) {
    if (session.verified != (path || data.id) && data.recipient && data.recipient.length) mode = 'recipient';
    else if (session.passed != (path || data.id) && data.password) mode = 'password';    
  }

  if (mode === null) return redirect('/delivery/' + path);    

  layout('delivery');
  render('auth', {mode: mode, path: path, share: data});
}

action('auth', function() {
  // export
  if (params.share)
    PublicObject.findOne({_id: params.share}, function(err, external) {
      if (err) return next(err);
      auth(err, external, params.share, null);
    });
  // sendbox
  else if (params.box && params.user)
    Box.findOne({_id: params.box, members: {$in:[params.user]}}, function(err, box) {
      if (err) return next(err);
      auth(err, box.linkInfo, params.user + '/' + box.id);
    });

  else next(new Error('Invalid parameter'));
});

// authenticate password or email submit
function form(data, body, path) {
  var url = '/delivery/' + path;
  if (data.password && body.password) {
    if (data.password != body.password) {
      flash('error', 'The password you entered is incorrect.');
      url += '/auth';
    } else {
      session.passed = path;
    }

  } else if (data.recipient && data.recipient.length && body.email) {
    if (data.recipient.indexOf(body.email) == -1) {
      flash('error', 'The email you entered is incorrect.');
      url += '/auth';
    } else {

      verification.send({
        host: req.headers.host,
        path: '/delivery/' + path + '/verify/',
        email: body.email
      }, function() {
        layout('delivery');
        render('auth', {mode: 'sent_email', path: path, share: data});
      });

      return;
    }
  }

  redirect(url);
}

action('submit', function() {
  // export
  if (params.share)
    PublicObject.findOne({_id: params.share}, function(err, external) {
      if (err || !external) return next(err || new Error('File not found'));
      form(external, body, params.share);
    });
  // sendbox
  else if (params.box && params.user)
    Box.findOne({_id: params.box, members: {$in:[params.user]}}, function(err, box) {
      if (err || !box) return next(err || new Error('Box not found'));
      form(box.linkInfo, body, params.user + '/' + params.box);
    });

  else next(new Error('Invalid parameter'));
});

// email verification
action('verify', function() {
  verification.pass(params.token, function(err, data) {
    var path = params.share || params.user + '/' + params.box;

    if (err) {
      flash('error', err.message);
    } else {
      if (data.fileId) session.fileId = data.fileId; // for sendbox
      session.email = data.email;
      session.verified = path;   
    }

    redirect('/delivery/' + path);      
  });
});

action('download', function() {
  PublicObject.findOne({_id: params.share}, function(err, external) {
    if (err || !external || !external.fileRef.length) return next(err || new Error('File not found'));

    // protect
    if (verification.protect(session, external)) return send('Unauthorized', 401);

    StorageObject.findOne({_id: params.id}, function(err, file) {
      if (err || !file) return next(err || new Error('File not found'));
  
      var keystone = new Keystone(app.config.keystone);
      keystone.operatorTokens(function(err, tokens) {
        var swift = new Swift(tokens);
        swift.download(file).pipe(res);
        notification.sent(req.headers.host, file.box, external, session.email); // host, boxId, external, from
      });
    });
  });
});

action('downloadall', function() {
  PublicObject.findOne({_id: params.share}).populate('fileRef').exec(function(err, external) {
    if (err || !external || !external.fileRef.length) return next(err || new Error('File not found'));

    // protect
    if (verification.protect(session, external)) return send('Unauthorized', 401);

    var keystone = new Keystone(app.config.keystone);
    keystone.operatorTokens(function(err, tokens) {
      download.multiple(tokens, external.fileRef, res);
      StorageObject.findOne({_id: external.fileRef[0]}, function(err, file) {
        if (err || !file) return console.error(err || 'sent file email notification error: file not found');
        notification.sent(req.headers.host, file.box, external, session.email); // host, boxId, external, from
      });
    });
  });
});

action('thumbnail', function() {
  PublicObject.findOne({_id: params.share}, function(err, external) {
    if (err || !external || !external.fileRef.length) return next(err || new Error('File not found'));

    // protection
    if (verification.protect(session, external)) return send('Unauthorized', 401);

    StorageObject.findOne({_id: params.id}, function(err, file) {
      if (err || !file) return next(err || new Error('File not found'));
      if (!file.images || !file.images.thumbnail) return next(new Error('Is no image format'));

      if (file.images && file.images.thumbnail) {
        header('Accept-Ranges', 'bytes');
        header('Cache-Control', 'public, max-age=86400');
        header('Content-Type', 'image/jpeg');
        header('Content-Length', file.images.thumbnail.position);
        res.write(file.images.thumbnail.buffer);
        res.end();
      }
    });
  });
});