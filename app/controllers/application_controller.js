var query = require(app.root + '/app/services/query');

function setUserLocale () {
  // define locale from user settings, or from headers or use default
  var languages = req.headers['accept-language'];
  var locale = (req.session.user && req.session.user.locale)? req.session.user.locale.split('-')[0] : languages && languages.split(',')[0].split('-')[0] || 'en';
  setLocale(locale);
  next();
}

function requireUser() {
  if (!session.user) {
    header("HTTP/1.1 401 Unauthorized"); 
    if (req.xhr) {
      flash('error', 'Session not found, please try again.');
      return send('Unauthorized', 401); 
    } else {
      req.session.redirect = req.path;
      return redirect('/signin?returnUrl=' + req.url); 
    }
  }
  next();
}

function refresh() {
  query.UsedTags(session, params.box, function(err, availableSize, usedTags) {
    if (err) return next(err);
    //console.log(Note.count +'')
    layout(false);
    header('Content-type', 'text/javascript');
    availableSize  =  availableSize <1  ?  0 : availableSize;
    render('refresh', {size: availableSize, usedTags : usedTags, autotags: session.user.autotags[params.box] || [] , usertags: session.user.boxtags[params.box] || []});
  });
}

publish('refresh', refresh);
publish('requireUser', requireUser);
publish('setUserLocale', setUserLocale);