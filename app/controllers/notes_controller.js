var notification = require(app.root + '/app/services/notification');

load('application'); 
before(use('setUserLocale'));
before(use('requireUser'));
layout(false);

action('index', function() {
  Note.find({box: params.box, members:{$in: [session.user.id]}}, function(err, notes){
    if (err) return next(err);
    render({notes: notes, boxid: params.box});
  })
});

action('add', function() {
  if (!req.query.files) return send('Invalid parameter', 400); 
  StorageObject.find({box: params.box, _id: {$in: req.query.files.split(',')}}, function(err, files) {
    if (err) return next(err);
    var note = req.query;
    note.user = {
      id: session.user.id,
      name: session.user.name,
      username: session.user.username
    };
 
    render('_note', {_note: note, boxid: params.box, files: files});
  });
});

action('create', function() {
  Box.findOne({_id: params.box}, function(err, box){
    if (err) return next(err);
    StorageObject.find({box: params.box, _id: {$in: body.files.split(',')}}, function(err, files) {
      if (err) return next(err);
      var note = new Note({
        user: {
          id: session.user.id,
          name: session.user.name,
          username: session.user.username
        },
        box: params.box,
        files: body.files.split(','),
        members: box.members,
        theme: body.theme,
        rotate: body.rotate,
        text: body.text,
        top: body.top,
        left: body.left,
        created: new Date
      });

      note.save(function(err){
        if (err) return next(err);
        render('_note', {_note: note, boxid: params.box, files: files});
        notification.noted(req.headers.host, params.box, session.user); // host, boxId, sessionUser
      });

      files.forEach(function(file) {
        var history = new History({
            head:  (file.versions && file.versions.length > 0) ? file.versions[file.versions.length - 1]._id : file.id
          , where: {id: file.box, name: box.name}
          , when: new Date
          , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
          , how: 'createnote'
          , what: {
              id: note.id
            , text: note.text
          }
        });
  
        history.save();
      });
    });
  });
});

action('edit', function() {
  Note.findOne({box: params.box, _id: params.id}, function(err, note){
    if (err) return next(err);

    note.top = req.query.top;
    note.left = req.query.left;

    StorageObject.find({box: params.box, _id: {$in: note.files}}, function(err, files){
      if (err) return next(err);
      render('_note', {_note: note, boxid: params.box, files: files});
    });
  });
});

action('update', function() {
  Box.findOne({_id: params.box}, function(err, box){
    if (err) return next(err);
    StorageObject.find({box: params.box, _id: {$in: body.files.split(',')}}, function(err, files) {
      if (err) return next(err);
      Note.findOne({box:params.box, _id: params.id}, function(err, note){
        if (err) return next(err);
        note.files = body.files.split(',');
        note.theme = body.theme;
        note.rotate = body.rotate;
        note.text = body.text;
        note.top = body.top;
        note.left = body.left;
        note.save(function(err){
          if (err) return next(err);         
          render('_note', {_note: note, boxid: params.box, files: files});
        });

        files.forEach(function(file) {
          var history = new History({
              head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
            , where: {id: file.box, name: box.name}
            , when: new Date()
            , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
            , how: 'updatenote'
            , what: {
                id: note.id
              , text: note.text
            }
          });
    
          history.save();
        });
      });
    });
  });
});

action('read', function() {
  Note.findOne({box:params.box, _id: params.id}, function(err, note){
    if (err) return next(err);
    Box.findOne({_id: params.box}, function(err, box){
      if (err) return next(err);
      StorageObject.find({box: params.box, _id: {$in: note.files}}, function(err, files) {
        if (err) return next(err);

        note.members.splice(note.members.indexOf(session.user.id), 1);
        note.save(function(err) {
          if (err) return next(err);
          send('ok');
        });

        files.forEach(function(file) {
          var history = new History({
              head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
            , where: {id: file.box, name: box.name}
            , when: new Date()
            , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
            , how: 'readnote'
            , what: {
                id: note.id
              , text: note.text
            }
          });

          history.save();
        });
      });
    });
  });
});

action('show', function() {
  Note.findOne({box:params.box, _id: params.id}, function(err, note){
    if (err) return next(err);
    if (req.query.top) note.top = req.query.top;
    if (req.query.left) note.left = req.query.left;
    StorageObject.find({box: params.box, _id: {$in: note.files}}, function(err, files){
      if (err) return next(err);
      render('_note', {_note: note, boxid: params.box, files: files});
    });
  });
});

action('remove', function() {
  send('ok');
});