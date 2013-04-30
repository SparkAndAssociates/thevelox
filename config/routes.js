exports.routes = function (map) {

  // Generic routes. Add all your routes below this line
  // feel free to remove generic routes
  map.root('index#index');
  map.get('/privacy', 'index#privacy');
  map.get('/confirm','index#confirm');
  map.get('/alert','index#alert');
  map.get('/help','index#help');
  map.get('/icons', 'index#icons');
  map.get('/test', 'index#test');

  //authenticate controller
  map.get('/signin/:error?', 'authenticate#signin');
  map.post('/signin', 'authenticate#do_signin');
  map.get('/signup/:token', 'authenticate#verify');
  map.get('/signup','authenticate#signup');
  map.post('/signup','authenticate#do_signup');
  map.get('/signout', 'authenticate#logout');
  map.get('/settings','authenticate#settings');
  map.post('/settings','authenticate#save_settings');
  map.get('/releasenote','authenticate#releasenote');
  
  //assets controller
  map.get('/assets/:uuid?', 'assets#index');
  map.get('/assets/:box/refresh', 'assets#refresh');
  map.get('/assets/:box/list', 'assets#list');
  map.get('/assets/:box/thumbnail/:id', 'assets#thumbnail');
  map.post('/assets/:box/search', 'assets#search');
  map.post('/assets/:box/settings', 'assets#settings');

  //notes controller
  map.get('/notes/:box/create', 'notes#add');
  map.post('/notes/:box/create', 'notes#create');
  map.get('/notes/:box/edit/:id', 'notes#edit');
  map.post('/notes/:box/update/:id', 'notes#update');
  map.get('/notes/:box/show/:id', 'notes#show');
  map.post('/notes/:box/read/:id', 'notes#read');
  map.post('/notes/:box/remove/:id', 'notes#remove');
  map.get('/notes/:box', 'notes#index');

  //tag controller
  map.get('/tags/:box', 'tags#index');
  map.get('/tags/:box/manage', 'tags#managetags');
  map.post('/tags/:box/create', 'tags#create_tag');
  map.post('/tags/:box/edit/:id', 'tags#edit_tag');
  map.post('/tags/:box/destroy/:id', 'tags#remove_tag');
  map.post('/tags/:box/reset', 'tags#reset');
  map.post('/tags/:box/reorder', 'tags#reorder');
  map.post('/tags/:box/autotag_filter_toggle', 'tags#autotag');
  map.post('/tags/:box/tag_filter_toggle', 'tags#usertag');
  map.post('/tags/:box/multiple_set_tag', 'tags#assign_tags');
  map.post('/tags/:box/multiple_unset_tag', 'tags#unassign_tags');

  //files controller
  map.get('/files/:box', 'files#index');
  map.post('/files/:box/upload/:id', 'files#varsion');
  map.post('/files/:box/upload', 'files#upload');
  map.get('/files/:box/download/:id', 'files#download');
  map.post('/files/:box/download', 'files#download_multiple');
  map.get('/files/:box/direct/:id', 'files#direct');
  map.get('/files/:box/preview/:id', 'files#preview');
  map.get('/files/:box/conflict/:file', 'files#conflict');
  map.get('/files/:box/createthumbnail/:id', 'files#createthumbnail');
  map.get('/files/:box/createdocument/:id', 'files#createdocument');
  map.get('/files/:box/copy', 'files#copy');
  map.post('/files/:box/copy', 'files#do_copy');
  map.post('/files/:box/trash', 'files#trash');
  map.post('/files/:box/delete', 'files#delete');
  map.post('/files/:box/delete_all', 'files#delete_all');
  map.post('/files/:box/restore', 'files#restore');
  map.get('/files/:box/atom/:id', 'files#atom');
  map.get('/files/:box/edit/:id', 'files#edit');
  map.post('/files/:box/edit/:id', 'files#edit_save');
  map.post('/files/:box/confirm', 'files#confirm');

  //boxes controller
  map.get('/boxes', 'boxes#index');
  map.get('/boxes/list', 'boxes#list');
  map.get('/boxes/create', 'boxes#create');
  map.post('/boxes/create', 'boxes#save');
  map.post('/boxes/delete', 'boxes#delete');
  map.post('/boxes/restore', 'boxes#restore');
  map.post('/boxes/checkuser', 'boxes#checkuser');
  map.post('/boxes/checkname', 'boxes#checkname');
  map.get('/boxes/:box/edit', 'boxes#edit');
  map.post('/boxes/:box/edit', 'boxes#update');
  map.post('/boxes/:box/remove', 'boxes#remove');

  //delivery controller
  map.get('/delivery/shorten', 'delivery#shorten');
  map.get('/delivery/:box/receive_link', 'delivery#receive_link');
  map.post('/delivery/:box/update', 'delivery#update_receive_link');
  map.post('/delivery/:box/create_link', 'delivery#create_link');
  map.post('/delivery/:share/auth', 'delivery#submit');
  map.get('/delivery/:share/auth', 'delivery#auth');
  map.get('/delivery/:share/verify/:token', 'delivery#verify');
  map.get('/delivery/:share/download/:id', 'delivery#download');
  map.get('/delivery/:share/thumbnail/:id', 'delivery#thumbnail');
  map.get('/delivery/:share/downloadall', 'delivery#downloadall');
  map.get('/delivery/:box/share', 'delivery#share');
  map.post('/delivery/:user/:box', 'delivery#upload');
  map.get('/delivery/:user/:uuid', 'delivery#sendbox');
  map.post('/delivery/:user/:box/auth', 'delivery#submit');
  map.get('/delivery/:user/:box/auth', 'delivery#auth');
  map.get('/delivery/:user/:box/verify/:token', 'delivery#verify');
  map.get('/delivery/:uuid', 'delivery#export');

  //domore
  map.get('/container', 'container#index');

  //administration
  map.get('/administration', 'administration#index');

  //map.all(':controller/:action');
  //map.all(':controller/:box/:action');
};
