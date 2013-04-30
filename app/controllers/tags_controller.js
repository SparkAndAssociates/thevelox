load('application'); 
before(use('setUserLocale'));
before(use('requireUser'));
after(use('refresh'), {only: ['autotag', 'usertag', 'reset']});
layout(false);

action('autotag', function() {
  if (body.autotags && body.autotags.length > 0) session.user.autotags[params.box] = body.autotags.split(',');
  else delete session.user.autotags[params.box];
  next();
});

action('usertag', function() {
  if (body.usertags && body.usertags.length > 0)session.user.boxtags[params.box] =  body.usertags.split(',');
  else delete session.user.boxtags[params.box];
  next();
});

action('reset', function() {
  delete session.user.autotags[params.box];
  delete session.user.boxtags[params.box];
  next();
});

action('index', function(next) {
  if (!req.query.ids) return next(new Error('Invalid parameter')); 

  StorageObject.FindByIdsWithBox(session.user.id, params.box, req.query.ids.split(','), function(err, box, files){
    if (err) return next(err);

    box.tags.forEach(function(tag) {
      tag.count = 0;
      files.forEach(function(file) {
        if (file.tags.indexOf(tag.id) != -1) tag.count = tag.count + 1;
      });
    });
    render({files:files, tags: box.tags || [], wrapper: req.query.layout != 'false'});
  });
});

action('assign_tags', function() {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    var name
      , index = 0
      , boxTag = app._.find(box.tags, function(tag) {
          return tag.id == body.tag;
        });

    if (boxTag) {
      StorageObject.FindByIdsWithoutAuth(box.id, body.ids.split(','), function(err, files) {
        if (err) return next(err);
        files.forEach(function(file) {
          if (file.tags.indexOf(boxTag.id) == -1) {
            file.tags.push(boxTag.id);
            file.tagsSize = file.tags.length;
            file.save();

            var history = new History({
                head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
              , type: 'log'
              , where: {id:file.box, name:box.name}
              , when: new Date()
              , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
              , how: 'assigntag'
              , what: boxTag.name
            });
            history.save();
          }

          if (++index == files.length) {
            header('Content-Type', 'text/javascript');
            send('Element.update("edit_multi_'+ boxTag.id +'", "<b>'+boxTag.name+'</b> ('+body.ids.split(',').length+')");Element.writeAttribute("edit_multi_'+boxTag.id+'", "class", "tag active")');
          }
        });
      });
    }
  });
});

action('unassign_tags', function() {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    var name
      , index = 0
      , boxTag = app._.find(box.tags, function(tag) {
          return tag.id == body.tag;
        });

    if (boxTag) {
      StorageObject.FindByIdsWithoutAuth(box.id, body.ids.split(','), function(err, files) {
        if (err || files && !files.length) return next(err || new Error('Files not found'));

        files.forEach(function(file) {
          file.tags = app._.without(file.tags, boxTag.id);
          file.tagsSize = file.tags.length;
          file.save();

          var history = new History({
              head:  (file.versions && file.versions.length > 0 ) ? file.versions[file.versions.length - 1]._id : file.id
            , type: 'log'
            , where: {id:file.box, name:box.name}
            , when: new Date()
            , who: {name: session.user.name, username: session.user.username, email: session.user.email, ip: session.user.clientIp}
            , how: 'unassigntag'
            , what: boxTag.name
          });
          history.save();

          if (++index == files.length) {
            header('Content-Type', 'text/javascript');
            send('Element.update("edit_multi_'+ boxTag.id +'", "<b>'+boxTag.name+'</b> ('+0+')");Element.writeAttribute("edit_multi_'+boxTag.id+'", "class", "tag normal")');
          }
        });
      });
    }
  });
});

action('managetags', function(next) {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));
    render({tags: box.tags || []});
  });
});

action('create_tag', function() {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    var include = app._.find(box.tags, function(tag) {
      return tag.name == body.tag.tag;
    });

    if (include) render({tag: body.tag});
    else {
      var item = new Tag({name: body.tag.tag, count: 0});
      item.id = item._id.toString();
      box.tags.push(item);
      box.save(function(err) {
        if (err) return next(err);
        header('Content-Type', 'text/javascript');
        render({tag: item});
      });
    }
  });
});

action('edit_tag', function() {
  Box.GetByAuth(params.box, session.user.id, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    var include = app._.find(box.tags, function(tag) {
      return tag.name == body.tag;
    });

    if (include) send(body.tag);
    else {
      box.tags.forEach(function(tag) {
        if (tag.id == params.id) {
          tag.name = body.tag;
          box.save(function(err) {
            if (err) return next(err);
            send(body.tag);
          });
        }
      });
    }
  });
});

//require('mongoose').Types.ObjectId
action('remove_tag', function() {
  Box.findOne({_id: params.box, status: 1, members: {$in: [session.user.id]}}, function(err, box) {
    !err && StorageObject.find({box: box.id}, function(err, files) {
      !err && files.forEach(function(file) {
        file.tags = app._.without(file.tags, params.id);
        file.save();
      });
    });
  });

  Box.update({_id: params.box}, {$pull: {tags: {_id: params.id}}}, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));
    delete session.user.boxtags[params.box];
    send('true');
  });
});

action('reorder', function() {  
  var param = [];

  if (!body.taglist) return next(new Error('Invalid parameter')); 

  body.taglist.forEach(function(tag) {
    param.push({_id:tag});
  });

  Box.findOne({_id: params.box, status: 1, members: {$in: [session.user.id]}}, function(err, box) {
    if (err || !box) return next(err || new Error('Box not found'));

    param.forEach(function(dest) {
      box.tags.forEach(function(source) {
        if (dest._id == source.id) dest.name = source.name;
      });
    });

    box.tags = param;
    box.save();

    send(box.tags);
  });
});