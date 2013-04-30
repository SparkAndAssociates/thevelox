var moment = require('moment')
  , async = require('async')
  , download = require(app.root + '/app/services/download')
  , Upload = require(app.root + '/app/services/upload')
  , Thumbnail = require(app.root + '/app/services/thumbnails/index')
  , Copy = require(app.root +'/app/services/copy')
  , Scribd = require(app.root + '/app/services/scribd')
  , FilesLogic = require(app.root +'/app/services/files').Files;

load('application'); 
before(use('setUserLocale'));
before(use('requireUser'), {except: ['atom']});
layout(false);

action('index', function() {  
  render();
});

action('conflict', function() {
  StorageObject.GetFormBox(params.box, params.file, function(err, file) {
    if (err) return next(err);
   render({file:file});
  });
});

action('confirm', function() {
  if (!body.filenames) return next(new Error('Invalid parameter')); 

  var filenames = body.filenames.split(',');
  StorageObject.FindByNames(params.box, filenames, function(err, files) {
    if (err) return next(err);
    send(files || {});
  });
});

action('varsion', function() {
  if (!req.files) return next(new Error('Invalid parameter')); 
  app.clog.info('file uploaded', req.files.file);

  var upload = new Upload(req, true);
  upload.versions(req.params.id, req.session.user, function(err, result) {
    if (err) return next(err);

    if (req.xhr) {
      result.wrapper = false;
      header('Content-Type', 'application/json; charset=utf-8');
    } else {
      result.wrapper = true;
      header('Content-Type', 'text/javascript; charset=utf-8');
    }

    render('complete', result);
  });
});

action('upload', function() {
  //this.file = new File();
  if (!req.files) return next(new Error('Invalid parameter')); 
  app.clog.info('file uploaded', req.files.file);

  var upload = new Upload(req, false);
  upload.sendSwift(function(err, result){
    if (err) return next(err);

    if (req.xhr) {
      result.wrapper = false;
      header('Content-Type', 'application/json; charset=utf-8');
    } else {
      result.wrapper = true;
      header('Content-Type', 'text/javascript; charset=utf-8');
    }

    render('complete', result);
  });
});

action('copy', function() {
  Box.find({_id: { $ne : params.box}, members: {$in: [session.user.id]}, status:1 }, function(err, boxes) {
    if (err) return next(err);

    var boxExtend = [];
    boxes.forEach(function(box, index) {
      User.findOne({_id:box.owner}, function(err, user) {
        if (err) return next(err);

        boxExtend.push({boxInfo: box, userInfo:user});
        if (boxes.length == boxExtend.length) {
          render({
            boxes: boxExtend.sort(function(a, b) {
              return b.boxInfo.type == 4 || a.boxInfo.createDate - b.boxInfo.createDate;
            })
          }); // render
        }

      }); // User.findOne
    }); // boxes.forEach

  }); // Box.find
});

action('do_copy', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  new Copy({
    how: body.how, // newitem | version
    files: body.ids.split(','),
    fromBoxId: params.box,
    whereBoxId: body.where,
    user: session.user,
    host: req.headers.host
  }, function(err) {
    if (err) return next(err);

    header('Content-Type', 'text/javascript');
    send("Velox.hideDialog()");
  });

});

action('createthumbnail', function() {
  StorageObject.GetFormUser(params.id, session.user.id, function(err, file) {
    if (err) return next(err);

    new Thumbnail(session.user, file, function(err) {
      if (err) return next(err);

      send(file.images ? {width: file.images.width, height: file.images.height, orientation: file.images.orientation} : null);
    });
  });
});

action('createdocument', function() {
  StorageObject.GetFormUser(params.id, session.user.id, function(err, file) {
    if (err) return next(err);

    new Scribd(file).create(function(err) {
      if (err) return next(err);

      send(file.images ? {width: file.images.width, height: file.images.height, scribdId: file.scribd.id} : null);
    });
  });
});

action('preview', function() {
  StorageObject.GetFormUser(params.id, session.user.id, function(err, file) {
    if (err) return next(err);
    header('Accept-Ranges', 'bytes');
    header('Cache-Control', 'public, max-age=86400');
    if (file.scribd.id) render('scribd', {file: file, wrapper: req.query.layout != 'false'});
    else render({file: file, wrapper: req.query.layout != 'false'});
  });
});

action('atom', function() {
  StorageObject.findOne({box: params.box, _id: params.id }, function(err, file) {
    if (err) return next(err);

    var autotags = [], boxtags = [];
    var head = file.versions && file.versions.length > 0 ? file.versions[file.versions.length - 1]._id : file.id;
    Box.findOne({_id: file.box}, function(err, box) {
      if (err) return next(err);

      History.find({head: head}).sort("-when").limit(10).exec(function(err, histories){
        if (err) return next(err);

        header('Content-Type', 'application/atom+xml; charset=utf-8');
        render({file: file, autotags: autotags,  boxtags: boxtags, histories: histories || [], wrapper: req.query.layout != 'false'});
      });
    });
  });

});

action('edit', function() {
  StorageObject.findOne({box: params.box, _id: params.id }, function(err, file) {
    if (err) return next(err);

    var autotags = [], boxtags = [];
    Box.findOne({_id: file.box}, function(err, box) {
      if (err) return next(err);
      box.tags.forEach(function(tag) {
        file.tags.forEach(function(fileTag) {
          if (tag.id == fileTag) boxtags.push(tag.name);
        });
      });
      // if (file.tags.length <1) autotags.push('untagged');
      // if (file.status ==2 )autotags.push('deleted');
      // if (file.isSended) autotags.push('sended');
      if (file.uploadDate > moment().add('days', -1)) autotags.push('today');
      if (file.uploadDate > moment().add('days', -7)) autotags.push('lastweek');
      var med = app._.find(app.vm.autotags('media').split(','), function(tag) {
        return tag == file.mime;
      });
      if (med) autotags.push('media');

      var doc = app._.find(app.vm.autotags('documents').split(','), function(tag) {
        return tag == file.mime;
      });

      if (doc) autotags.push('documents');

      var head = file.versions && file.versions.length > 0 ? file.versions[file.versions.length - 1]._id : file.id;
      History.find({head: head}).sort("-when").limit(10).exec(function(err, histories){
        if (err) return next(err);

        var vertical = false
          , preview = file.images && file.images.thumbnail;

        if (preview) {
          var orientation = file.images.orientation || ''
            , width = file.images.width
            , height = file.images.height;
    
          if (orientation.match(/RightTop|LeftBottom/)) {
            width = file.images.height;
            height = file.images.width;
          }
          
          vertical = width < height;
        }

        render({file: file, autotags: autotags, boxtags: boxtags, histories: histories || [], usenick: session.user.usenick, vertical: vertical, wrapper: req.query.layout != 'false'});
      });
    });
  });
});

action('edit_save', function() {
  Box.findOne({_id: params.box, status: 1,  members: {$in: [session.user.id]}}, function(err, box) {
    if (err) return next(err);
    StorageObject.findOne({box: params.box, _id: params.id }, function(err, file) {
      if (err) return next(err);
      var what = null;
      if (body.editorId == 'file_description') {
        what = {
            field: 'description'
          , from: file.description
          , to: body.file
        };
        file.description = body.file;
      }
      else if (body.editorId == 'file_name') {
        what = {
            field: 'filename'
          , from: file.name
          , to: body.file
        };
        file.name = body.file;
      }

      file.save(function() {
        send(body.file);
        var history = new History({
            head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
          , type: 'log'
          , where: {id:file.box, name: box.name}
          , when: new Date
          , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
          , how: 'edit'
          , what: what
        });
        history.save();
      });
    });
  });
});

action('download_multiple', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  var list = body.ids.split(',')
    , user = session.user;

  Box.findOne({_id: params.box, status: 1,  members: {$in: [session.user.id]}}, function(err, box) {
    if (err) return next(err);

    StorageObject.find({box: box.id, _id: {$in: list}, status: 1}, function(err, files) {
      if (err) return next(err);

      header('Content-Type', 'application/zip');
      download.multiple(user, files, res, function(err) {
        if (err) return next(err);

        files.forEach(function(file) {
          var history = new History({
              head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
            , type: 'log'
            , where: {id: file.box, name: box.name}
            , when: new Date
            , who: {name: user.name, username: user.username, email: user.email, ip: session.user.clientIp}
            , how: 'downloadmultiple'
          });
          history.save();
        }); // files.forEach
      }); // download.multiple
    }); // StorageObject.find
  }); // Box.findOne
});

action('download', function() {
  async.parallel([
    function(callback){
      Box.Get(params.box, callback);
    },
    function(callback){
      StorageObject.Get(params.id, callback);
    }
  ],
  function(err, results){
    if (err || !results[0] || !results[1]) return next(err || new Error('File not found'));
    var box = results[0], file = results[1];
    var user = session.user;
    res.attachment(file.name);
    download.single(user, file).pipe(res);

    var history = new History({
        head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
      , type: 'log'
      , where: {id: file.box, name: box.name}
      , when: new Date
      , who: {name: user.name, username: user.username, email: user.email, ip: user.clientIp}
      , how: 'downloadsingle'
    });
    history.save();
  });
});

action('direct', function() {
  StorageObject.findOne({box: params.box, _id: params.id}, function(err, file) {
    if (err) return next(err);
    download.single(session.user, file).pipe(res);
  });
});

action('trash', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  var biz = new FilesLogic({user: session.user, params: app._.extend(body, params)});
  async.waterfall([
    biz.BoxFromMember.bind(biz),
    biz.TrashFiles.bind(biz)
  ],
  function (err, results){
    if (err) return next(err);
    send(true);
  });
});


action('delete', function() {
  var file = new FilesLogic({user: session.user, params: app._.extend(body, params)});
  async.waterfall([
    Box.GetFromMember.bind(Box, params.box, session.user.id), 
    file.DeleteAll.bind(file)
  ],
  function (err, box, files){
    if (err) return next(err);

    files.forEach(function(file) {
      if (file.scribd.id) new Scribd(file).remove();
    });

    send(true);
  });
});

action('delete_all', function() {
  var file = new FilesLogic({user: session.user, params: app._.extend(body, params)});

  async.waterfall([
    Box.GetFromMember.bind(Box, params.box, session.user.id), 
    file.DeleteAll.bind(file)
  ],
  function (err, box, files){
    if (err) return next(err);

    files.forEach(function(file) {
      if (file.scribd.id) new Scribd(file).remove();
    });
    send(true);
  });
});

action('restore', function() {
  if (!body.ids) return next(new Error('Invalid parameter')); 

  var biz = new FilesLogic({user: session.user, params: app._.extend(body, params)});
  async.waterfall([
    biz.BoxFromMember.bind(biz),
    biz.RestoreFiles.bind(biz)
  ],
  function (err, results){
    if (err) return next(err);
    send(true);
  });
});