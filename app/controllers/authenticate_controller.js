var TENANT = "service"
  , moment = require('moment')
  , fs = require('fs')
  , md = require('node-markdown').Markdown
  , verification = require(app.root + '/app/services/verification')
  , Keystone = require(app.root + '/app/services/openstack/keystone')
  , Swift = require(app.root + '/app/services/openstack/swift');


load('application'); 
before(use('setUserLocale'));

action('signin', function() {
  if (session.user) return redirect(req.query.returnUrl || '/assets');

  layout('authenticate');
  render('signin', {returnUrl: req.query.returnUrl || '', rememberme: req.cookies.rememberme || ''});  
});

action('do_signin', function () {
  //인증 검사
  //세션 발급
  var keystone = new Keystone(app.config.keystone);
  keystone.memberTokens({username: body.username, password: body.password}, function(err, tokens) {
    if (err) {
      flash('error', 'The username or password is incorrect.');
      layout('authenticate');
      render('signin', {returnUrl: body.returnurl, rememberme: req.cookies.rememberme || ''});
    }
    else {
      User.findOne({_id: tokens.id}, function(err, user) {
        if (err) return next(err);

        session.user = tokens;
        session.user.autotags = {};
        session.user.boxtags = {};
        session.user.search = {};
        session.user.box = {};
        session.user.username = user.username;
        session.user.locale = user.locale || 'en';
        session.user.timezone = (user.preference.timezone && user.preference.timezone.split('_')[0] || '540') * 1; 
        session.user.dispname =  user.preference.dispname || 'username';
        session.user.clientIp = req.header('X-Forwarded-For') || req.connection.remoteAddress;
        
        session.user.settings = {
          zoomLevel: user.preference.viewtype == 2 ? 1 : 3,
          viewType: user.preference.viewtype == 1 ? 'list' : 'thumbs',
          conflict: user.preference.conflict || 'askme',
          theme: user.preference.theme
        };

        //session.socket = app.io.getSocketId();
        res.clearCookie('rememberme');
        if (body.rememberme) {
          res.cookie('rememberme', session.user.name, {expires: moment().add('days', 1)._d});
        }

        redirect(body.returnurl || '/assets');
      });
    }
  });
});

action('logout', function() {
  session.destroy();
  res.redirect('/');
});

action('signup', function() {
  layout('authenticate');
  render('signup', {returnValues:{}, invite: req.query.invite || ''});
});

// email verification
action('verify', function() {
  verification.pass(params.token, function(err, data) {
   
    if (err) {
      flash('error', err.message);
      layout('authenticate');
      return render('signup', {returnValues: {}, invite: ''});
    }

    var keystone = new Keystone(app.config.keystone);
    keystone.operatorTokens(function(err, tokens) {
      if (err) {
        flash('error', 'Swift request exception');
        layout('authenticate');
        return render('signup', {returnValues: data.body, invite: data.query.invite || ''});
      }

      keystone.createUser(tokens, {username: data.body.username, password: data.body.password}, function(err, res, newUser) {
        if (err) return next(err);

        var userinfo = JSON.parse(newUser);
        if (userinfo.error) {
          if (userinfo.error.code == 409) flash('error', 'This account is already taken!');
          else flash('error', 'Unknown Error');
          layout('authenticate');
          return render('signup', {returnValues: data.body, invite: data.query.invite || ''});
        }

        var swift = new Swift(tokens)
          , privateContainer =  userinfo.user.name + '_private';

        swift.createContainer(privateContainer, function(err, res, _body) {
          if (err) return next(err);

          swift.SetContainerACL(privateContainer, ' service:' + userinfo.user.name, ' service:' + userinfo.user.name, function(err, res, _body) {
            if (err) return next(err);

            var user = new User({
                _id: userinfo.user.id,
                name: userinfo.user.name,
                username: data.body.name,
                email: data.body.email,
                createDate: new Date(),
                availableSize: 100 * 1024 * 1024 * 1024,
                status: 1
              })
            , box = new Box({
              owner: user._id,
              members: [userinfo.user.id],
              name: "Items",
              swift: {
                  tenant: {name: TENANT}
                , container: {
                    name: privateContainer
                  , ACL: {
                      readUsers: [userinfo.user.name]
                    , writeUsers: [userinfo.user.name]
                  }
                }
              },
              createDate: new Date(),
              lastModifyDate: new Date(),
              type: 4,
              status: 1,
            });

            box.save(function() {
             user.save(function() {
                if (data.body.invite == 'neopilia') {
                  Box.findOne({_id: '50addc7c225bc6bc5900008e'}, function(err, inviteBox) {
                    if (err) return next(err);

                    inviteBox.members.push(user.id);
                    var userACl = [];

                    User.find({_id:{$in:inviteBox.members}}, function(err, users) {
                      if (err) return next(err);
                      users.forEach(function(member) {
                        userACl.push(' service:'+ member.name);
                      });
                    });

                    swift.SetContainerACL(inviteBox.swift.container.name, userACl.join(','), userACl.join(',') , function(err, res, _body) {
                      if (err) return next(err);
                      inviteBox.save();
                      flash('info','sign up complete! please sign in');
                      redirect('/signin');
                    });
                  });
                }
                else {
                  flash('info','sign up complete! please sign in');
                  redirect('/signin');
                }
             }); // user.save
           }); // box.save

          }); // swift.SetContainerACL
        }); // swift.createContainer

      }); // keystone.createUser
    }); // keystone.operatorTokens

  }); // verification.pass
});

action('do_signup', function() {
  if (!body.username || (!body.password || body.password.length < 4)) {
    flash('error', 'The username or password you entered is incorrect.');
    layout('authenticate');
    return render('signup', {returnValues: body, invite: req.query.invite || ''});
  }

  User.findOne({$or: [{email: body.email}, {name: body.username}]}, function(err, user) {
    if (err) return next(err);

    layout('authenticate');
    if (user) {
      var message = 'This email is already registered. Want to <a href="/signin">login</a>?'; //  or <a href="/recover">recover your password</a>
      if (body.username == user.name) message = 'This username is already taken!';

      flash('error', message);
      return render('signup', {returnValues: body, invite: req.query.invite || ''});
    }

    verification.send({
      host: req.headers.host,
      path: '/signup/',
      email: body.email,
      query: req.query,
      body: body
    }, function() {
      render('verify', {returnValues: body, invite: req.query.invite || ''});
    });

  });
});

action('settings', function() {
  if (!session.user) {
    flash('error', 'Session not found, please try again.');
    return send('Unauthorized', 401); 
  }

  User.Get(session.user.id, function(err, user) {
    if (err) return next(err);
    layout(false);
    render({user:user});
  });
});

action('save_settings', function() {
  User.Get(session.user.id, function(err, user) {
    if (err || !body.account) return next(err || new Error('Invalid parameter'));

    if (user.email != body.account.email) {
      // email varification if we need
    }

    user.username = body.account.name || user.username;
    user.email = body.account.email;
    user.locale = body.account.language || user.locale;
    user.preference = body.preference;

    user.notifications = {
        nospace: !!body.notifications.nospace
      , received: !!body.notifications.received
      , sent: !!body.notifications.sent
      , expired: !!body.notifications.expired
      , note: !!body.notifications.note
      , invited: !!body.notifications.invited
    };

    var doChangePassword = body.account.password && body.account.newpassword && body.account.renewpassword;
    user.save(function(err) {
      if (err) return next(err);

      session.user.locale = user.locale;
      session.user.dispname = user.preference.dispname;
      session.user.timezone = (user.preference.timezone.split('_')[0] || '540') * 1; 
      session.user.settings.conflict = user.preference.conflict || 'askme';
      session.user.settings.theme = user.preference.theme;

      if (!doChangePassword) send('ok');
    });
    
    if (doChangePassword) {
      if (body.account.newpassword != body.account.renewpassword) return send('Password does not match the confirm password', 203);
      if (body.account.password == body.account.newpassword) return send('It\'s same password', 203);

      var keystone = new Keystone(app.config.keystone);
      keystone.memberTokens({username: user.name, password: body.account.password}, function(err, tokens) {
        if (err) return send('Current Password is Incorrect', 203);

        keystone.operatorTokens(function(err, tokens) {
          if (err) return send('Keystone request error', 203);

          keystone.updateUser(tokens, {
            id: user.id,
            username: user.name,
            password: body.account.newpassword
          }, function(err, res, body) {
            send('ok');
          });
        });
      });
    }
    
  });
});

action('releasenote', function() {
  fs.readFile(process.cwd() + '/README.md', 'utf8', function(err, data) {
    if (err) return next(err);
    layout('authenticate');
    render({md: md(data.split('## Change Log')[1].split('### 0.1.0')[0])});
  });  
});