var async = require('async');
var query = require(app.root + '/app/services/query');

load('application'); 
before(use('setUserLocale'));
before(use('requireUser'));
after(use('refresh'), {only: ['refresh','search']});

action('index', function() {
  layout('application');
  Box.ListByAuth(params.uuid, session.user.id, function(err, selectedBox, boxes) {
    if (err) return next(err);
    Note.UnreadNote(session.user.id, function(err, result) {
      render({selected: selectedBox, boxes: boxes || [], host: req.headers.host.split(':')[0], notecount: result || []});
    });
  });
});

action('search', function() {
  if (body.q == undefined) return next(new Error('invalid parameters'));
  if (body.q.length > 0) session.user.search[params.box] =  body.q;
  else delete session.user.search[params.box];
  next();
});

action('settings', function() {
  session.user.settings.zoomLevel = req.body.zoom_level || 1;
  session.user.settings.viewType = req.body.view_type || 'thumbs';
  send('ok');
});

action('refresh', function() {
  next();
});

action('list', function() {
  async.waterfall([
    function(callback) {
      Box.GetByAuth(params.box, session.user.id, callback);
    },
    function(box, callback) {
      var q = query.refreshQuery(session, box.id);
      StorageObject.CountByQuery(q, function(err, count) {
        callback(err, q, count);
      });
    },
    function(q, count, callback) {
      StorageObject.list(q, req.query.page, function(err, files) {
        callback(err, count, files)
      });
    }
  ],
  function(err, count, files) {
    if (err) return next(err);
    layout(false);
    render({files:files, count: count, page: req.query.page});
  });
});

action('thumbnail', function() {
  StorageObject.Get(params.id, function(err, file) {
    if (err) return next(err);
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