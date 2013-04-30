var fs = require('fs')
  , clog = require('clog')
  , sio = require('socket.io')
  , options = {
    key: fs.readFileSync('/etc/nginx/ssl/sparkandassociates_key.pem'),
    cert: fs.readFileSync('/etc/nginx/ssl/sparkandassociates_crt.pem')
  }
  , configure = function(_io) {
    return function() {
      _io.enable('browser client minification');  // send minified clien
      _io.enable('browser client etag');          // apply etag caching logic
      _io.set('log level', 2);                    // reduce logging
      _io.set('transports', [                     // enable all transports
          'websocket'
        , 'flashsocket'
        , 'htmlfile'
        , 'xhr-polling'
        , 'jsonp-polling'
      ]);
      //_io.set('flash policy port', 843);
      //_io.enable('log');
    }
  }
  , connection = function(_io) {
    return function(socket) {
      socket.on('join', function(packet) {
        clog('io', "Join socket client", socket.id, packet);
        socket.store.data.guid = packet.guid;
        connections(packet);
      });
    
      socket.on('message', function(packet) {
        clog('io', "Socket message", socket.id, packet);
        socket.broadcast.emit(packet.guid, packet);
      });
    
      socket.on('disconnect', function() {
        clog('io', "Lost socket client", socket.id);
        var guid = socket.store.data.guid;
        setTimeout(function() {
          connections({
            action: 'updateConnections',
            guid: guid
          });
        }, 1);
      });
    
      function connections(packet) {
        packet.data = [];
        for (var id in _io.sockets.sockets) {
          var user = _io.sockets.sockets[id];
          if (packet.guid == user.store.data.guid) packet.data.push({id: id, guid: user.store.data.guid});
        }
    
        packet.data.forEach(function(user) {
          _io.sockets.sockets[user.id].emit(user.guid, packet);
        });
      }
    }
  };


var io = sio.listen(6831);
var ios = sio.listen(443, options);

io.configure(configure(io));
ios.configure(configure(ios));

// Handle WebSocket Requests
io.sockets.on('connection', connection(io));
ios.sockets.on('connection', connection(ios));