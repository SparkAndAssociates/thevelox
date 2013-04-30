var express = require('express')
  , ejs = require('ejs')
  , middleware = require('../app/services/middlewares/index')
  , RedisStore = require('connect-redis')(express)
  , config = require('../config/config.json')

app.dynamicHelpers({
  session: function(req, res){
    return req.session;
  },
  info: function(req, res){
    return req.flash('info');
  },
  error: function(req, res){
    return req.flash('error');
  }
});

app.configure(function(){
  app.register('html', ejs);
  app.set('trust proxy', true);
  app.set('view engine', 'html');
  app.set('view options', {complexNames: true});
  app.set('defaultLocale', 'en');
  app.set('jsDirectory', '/javascripts/');
  app.set('cssDirectory', '/stylesheets/');
});

app.configure('development', function() {
  app.use(express.static(process.cwd() + '/public', {maxAge: 86400000}));
  app.use(middleware.objectIDParser());
  app.use(middleware.octetStream({tempDir: process.cwd() + '/temp/'}));
  app.use(express.bodyParser());
  app.use(express.cookieParser(config.secret));
  app.use(express.session({secret: config.secret}));
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('production', function () {  
  //Serving static files through nginx
  //app.use(express.static(process.cwd() + '/public', {maxAge: 86400000}));
  app.use(middleware.objectIDParser());
  app.use(middleware.octetStream({tempDir: process.cwd() + '/temp/'}));
  app.use(express.bodyParser());
  app.use(express.cookieParser(config.secret));
  app.use(express.session({secret: config.secret, defer: true, store: new RedisStore(config.redis)}));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(function(err, req, res, next) {
    if (err) res.status(400);
    else res.status(404);

    if (req.accepts('html')) res.render('404', {layout: false, url: req.url}); // respond with html page
    else if (req.accepts('json')) res.send({error: err || 'Not found'}); // respond with json
    else res.type('txt').send(err || 'Not found'); // default to plain-text. send()
  });
  /*
  app.get('*', function(req, res, next){
    if (req.accepts('html')) res.render('404', {layout: false, url: req.url}); // respond with html page
    else if (req.accepts('json')) res.send({error: err || 'Not found'}); // respond with json
    else res.type('txt').send(err || 'Not found'); // default to plain-text. send()
  });
  */
});