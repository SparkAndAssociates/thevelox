var fs = require('fs')
  , md = require('node-markdown').Markdown;

load('application');
before(use('setUserLocale'));

action('index', function() {
  layout('index');
  render();
});

action('privacy', function() {
  layout('index');
  render();
});

action('help', function() {
  layout(false);
  var lang = session.user && session.user.locale.split('-')[0] || 'en';
  fs.readFile(process.cwd() + '/public/documents/help.' + lang + '.md', 'utf8', function(err, data) {
    if (err) return next(err);
    data = data.split('----');
    render({index: md(data[0]), content: md(data[1])});
  });
});

action('icons', function() {
  layout(false);
  render();
});

action('test', function() {
  layout(false);
  render({routes: app.routes.routes.get.concat(app.routes.routes.post)});
});

action('confirm', function() {
  layout(false);
  render('dialog', {message: req.query.msg, args: req.query.args || [], type: req.query.type || 'normal'});
});

action('alert', function() {
  layout(false);
  render('dialog', {message: req.query.msg, args: req.query.args || [], type: req.query.type || 'normal'});
});