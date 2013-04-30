/*!
 * Velox - velox.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

/* Velox */
var Velox = {
  _resizeCallbacks: [],
  _popupId: 0,
  active: function(el) {
    return(Element.hasClassName(el + '-button', "active"));
  },

  stopEvent: function(event) {
    var element = event.element();
    element && !(element.tagName == 'IMG' || element.id == 'preview-border') && event.preventDefault();
  },

  pageTracker: function(url) {
    var uri = []
      , title = document.title.split(' : ')[0];

    url = url.replace(location.protocol + '//' + location.host, '');
    url.split('?')[0].split('/')._each(function(str) {
      str.length < 24 && str && uri.push(str);
    });

    uri = uri.join('/');

    console.log('Velox.pageTracker', uri);

    document.title = title + ' : ' + uri;
    if (!this.tracker && window._gat) this.tracker = _gat._getTracker(this.trackCode);
    if (this.tracker) this.tracker._trackPageview(url);
    document.title = title;
  },

  toggleTagsPanel: function() {
    $('content').toggleClassName('showtags');
    $('tagtool').toggleClassName('active');
    setTimeout(this.resize.bind(this), 500);
  },

  resizeTabs: function(viewportWidth) {
    if (this._switchDropdownWidth) {
      if (this._switchDropdownWidth < viewportWidth) this.revertDropdownButton();
      return;
    }
  
    var tabWidth = 0
      , overflowWidth = 400
      , tabMinWidth = 80
      , minimums = 0
      , navigationEl = $("navigation");

    var tabs = navigationEl.select('.project').each(function(el) {
      if (!el.width) el.width = el.offsetWidth;
      el.style.width = '';
      tabWidth += el.width;
    });

    var offset = viewportWidth - tabWidth - navigationEl.down('.info').offsetWidth - overflowWidth;
    if (offset < 0) {
      var _tabs = [];
      tabs.each(function(el) {
        var resizeWidthTo = el.width + offset / tabs.length;
        if (resizeWidthTo <= tabMinWidth) el.setStyle({width: tabMinWidth + 'px'});
        else _tabs.push(el);
      });

      if (_tabs.length == 1 && !this._switchDropdownWidth) {
        this._switchDropdownWidth = viewportWidth;
        $("navigation").select('.project').each(function(el) {
          el.style.width = '';
        });
        this.createDropdownButton();
      }

      _tabs.length > 1 && _tabs.each(function(el) {
        var resizeWidthTo = el.width + offset / _tabs.length;
        if (resizeWidthTo < tabMinWidth) resizeWidthTo = tabMinWidth;
        if (el.offsetWidth != resizeWidthTo) el.setStyle({width: resizeWidthTo + 'px'});
      });
    }
  },

  revertDropdownButton: function() {
    console.log('revertDropdownButton');

    this._switchDropdownWidth = null;

    var dropdownUl = $('dropdown')
      , dropdownLi = $('navigation').down('.dropdown');

    dropdownUl.select('.project').each(function(el) {
      dropdownLi.insert({before: el.addClassName('tab')});
    });

    dropdownUl.remove();
    dropdownLi.remove();
  },

  createDropdownButton: function(mode) {
    var dropdownLI = new Element('li', {'class': 'tab dropdown'})
      , dropdownUL = new Element('ul', {id: 'dropdown'})
      , selectedTab = new Element('a', {id: 'dropdown-selected', 'class': 'icon-folder-close', 'data-icon': 'icon-folder-close'})
      , toggleDropdownMenu = function(event, el) {    
        if (!el) return dropdownUL.hide();
        event.stop();
        dropdownUL.toggle();
        if (dropdownUL.visible()) {
          var dementions = el.getDimensions()
            , offsets = el.cumulativeOffset();

          dropdownUL.setStyle({
            width: dementions.width - 4 + 'px',
            top: offsets.top + dementions.height - 2 + 'px',
            left: offsets.left + 'px'
          });
        }
      };

    selectedTab.insert('<span class="tab-name">Share Boxes</span> <span class="arrow icon-caret-down"></span>')

    dropdownLI.insert(selectedTab.observe('click', function(event) {
      toggleDropdownMenu(event, dropdownLI);
    }));

    $('navigation').select('.tab.project').each(function(el, i) {
      var a = el.down('a');
      if (!i) el.insert({'before': dropdownLI});
      if (a.hasClassName('active')) {
        selectedTab.down('.tab-name').update(a.innerHTML);
        selectedTab.writeAttribute('class', a.readAttribute('class'));
        selectedTab.writeAttribute('data-icon', a.readAttribute('class'));
        el.addClassName('selected');
      }
      el.removeClassName('tab').wrap(dropdownUL);
    });

    dropdownUL.hide();

    if (!document.body._dropdownObserved) {
      document.body.insert(dropdownUL).observe('click', function(event) {
        toggleDropdownMenu(event);
      });
    
      mode && $(mode + '-container').observe('touchstart', function(event) {
        toggleDropdownMenu(event);
      });

      document.body._dropdownObserved = true
    }
  },

  initSocket: function(socket, options) {
    console.log('Velox.initSocket');

    this.socket = socket;
    this.sessionId = options.sessionId;
    this.boxId = options.boxId;

    this.socket.on('connect', function() {
      /*
      this.socket.on('reconnect', function() {
        console.warn('Socket: Reconnected to the server');
      });
      this.socket.on('reconnecting', function () {
        console.warn('Socket: Attempting to re-connect to the server');
      });
      */
      this.socket.on('error', function (e) {
        console.error('Socket: ' + (e ? e : 'A unknown error occurred'));
      });
  
      if (this.boxId) this.socket.emit('join', {action: 'updateConnections', guid: this.boxId});
  
      this.addSocketListener(this.sessionId);
      $$('#navigation .tab a, #dropdown .project a').each(function(a) {
        a.id && a.id.split('_')[1] && Velox.addSocketListener(a.id.split('_')[1]);
      });

    }.bind(this));
  },

  addSocketListener: function(guid) {
    this.socket.on(guid, function(packet) {
      var data = packet.data
        , guid = packet.guid 
        , action = packet.action;

      console.log('Socket receive:', guid, action, data);
      action = this[action];

      // this.socket.sessionid;
      //console.log(data);
      
      if (!action) return console.error(packet.action + ' is unknown socket action - ' + action);
      else action = action.bind(this);

      action(guid, data);
    }.bind(this));
  },

  removeSocketListener: function(guid) {
    this.socket.removeListener(guid, this.socket.$events[guid]);
  },

  emit: function(action, data, guid) {
    console.log('Socket send:', guid || this.boxId, action, data || null);
    this.socket.emit('message', {action: action, guid: guid || this.boxId, data: data || null});
  },

  _updateCount: function(el, changed) {
    var type = 'info';
    if (typeof changed == 'object') {
      type = changed.type;
      changed = changed.count;
    }
    changed *= 1;

    if (!el) return console.error('WTF?');

    el.removeClassName('icon-folder-open').removeClassName('icon-folder-close').removeClassName('icon-home');
    if (!el.readAttribute('data-count')) el.writeAttribute('data-count', 0);

    var count = el.readAttribute('data-count') * 1 + changed;
    el.writeAttribute('data-count', count);

    var counter = el.down('.counter');
    if (!counter) {
      el.insert({top:'<span class="counter"></span>'});
      counter = el.down('.counter');
    }
    
    counter.update(count).writeAttribute('class', 'counter').addClassName(type);
  },

  // FIXME: 없는 박스의 노티 날라옴
  notifyNewItem: function(uuid, changed) {
    console.log('Velox.notifyNewItem', uuid, changed);

    if (this._switchDropdownWidth || Modernizr.touch) this._updateCount($('dropdown-selected'), changed || 1);   
    this._updateCount($('nav_' + uuid), changed || 1);
  },

  updateConnections: function(uuid, data) {
    $('users-info').update(data.length > 1 ? ' / ' + data.length + ' users online' : '');
  },

  selectedItem: function(uuid, data) {
    data = !data ? [] : data.split(',').map(function(id) { return $('document_' + id); });
    if (this.locked) this.locked.invoke('removeClassName', 'locked');
    this.locked = data.findAll(function(el) { if (el) return el; }).invoke('addClassName', 'locked');
  },

  updateBoxName: function(uuid, value) {
    $('nav_' + uuid).update(value);
  },

  deleteBox: function(uuid, data) {
    var tab = $('nav_' + data.boxId).up()
      , active = tab.down().hasClassName('active')
      , previous = tab.previous().down();

    tab.remove();

    if (active) {
      if (data.message)
        Velox.alert(data.message, function() {
          location.href = previous.href;
        });
      else
        location.href = previous.href;
    }

    this.removeSocketListener(data.boxId);
  },

  removeBox: function(boxId, owner) {
    var el = $('nav_' + boxId)
      , target = owner ? 'archivebox' : 'removebox'
      , callback = typeof owner == 'function' ? owner : null
      , request = function() {
        new Ajax.Request('/boxes/' + boxId + "/remove", {
          parameters: {id: boxId},
          onSuccess: function(req) {
            if (el) {
              if (owner) {
                req.responseJSON._each(function(userId) {
                  if (this.sessionId != userId)
                    this.emit('deleteBox', {boxId: boxId, message: 'archived'}, userId); // TODO: req.message
                }.bind(this));
              }
              this.deleteBox(null, {boxId: boxId});
            }
    
            callback && callback();
            if (target = $('box_' + boxId)) Archives._removeBox(target);
    
          }.bind(this),
          onFailure: function(req) {
            alert('error: ' + req.responseText);
          }
        });
      }.bind(this);

    if (el && el.up('.temporary')) return location.href = '/boxes';

    if (callback) request();
    else this.confirm(target, request);
  },

  saveBox: function(form) {
    console.log('saveBox', form.serialize(true));

    var parms = form.serialize(true);

    this.modal.update('');    
    new Ajax.Request(form.action, {
      parameters: parms,
      onLoading: function(req){
        Velox.showWaiting();
      },
      onComplete: function() {
        Velox.overlay.addClassName('no-spinner');
        if (parms['edit_mode'] == 'edit') {
          var boxId = parms['box_id']
            , current = parms['current_members'].split(',')
            , members = parms['message[ids]']
            , subject = parms['message[subject]'];

          if (parms['status'] == '1') {
            if (typeof members != 'object') members = [members];
  
            current._each(function(userId) {
              if (members.indexOf(userId) == -1)
                this.emit('deleteBox', {boxId: boxId, message: 'banned'}, userId); // TODO: form.remove_message;
            }.bind(this));
  
            members._each(function(userId) {
              if (current.indexOf(userId) == -1)
                this.emit('addBox', {
                  owner: false,
                  boxId: boxId,
                  name: parms['message[subject]']
                }, userId);
            }.bind(this));

            this.emit('updateBoxName', subject);
            this.updateBoxName(boxId, subject);
          }

          if ($('box_' + boxId)) $('box_' + boxId).down('h4').update(subject);
        }
      }.bind(this)
    });

    return false;
  },

  addBox: function(uuid, data) {
    $('navigation').down('.archive').insert({before: [
      '<li class="tab project">',
        '<a href="/assets/' + data.boxId + '" class="icon-folder-open" id="nav_' + data.boxId + '">' + data.name + '</a>',
        '<span class="remove icon-remove" onclick="Velox.removeBox(\'' + data.boxId + '\', ' + data.owner + ')"></span>',      
      '</li>'
    ].join('')});

    this.addSocketListener(data.boxId);
    if (typeof Archives == 'object' && Archives.inited) Archives.refresh();
  },

  shortenURL: function(button, input) {
    if (button.disabled) return;
    console.log('Velox.shortenURL');

    input = $(input);

    new Ajax.Request('/delivery/shorten', {
      method: 'get',
      parameters: {url: input.value.strip()},
      onSuccess: function(req) {
        input.value = req.responseText;
        input.activate();
        button.addClassName('disabled').disabled = true;
      }
    });
  },

  saveSettings: function(form) {
    if (!form.serialize) form = $(form);
    console.log('saveSettings', form.serialize(true));

    var content = this.modal.innerHTML;
    this.modal.hide();
    this.overlay.removeClassName('no-spinner');

    new Ajax.Request(form.action, {
      method: form.method,
      parameters: form.serialize(),
      onSuccess: function(req) {
        if (req.status == 200) window.location.reload();
        else {
          this.modal.show()
            .down('#account_password_error span').update(req.responseText);

          this.overlay.addClassName('no-spinner');
        }
      }.bind(this)
    });

    return false;
  },

  resize: function() {
    //console.log('Velox.resize');

    var viewportHeight = document.viewport.getHeight()
      , viewportWidth = document.viewport.getWidth()
      , headerHeight = $('header').getHeight();

    $('content').setStyle({height: viewportHeight - headerHeight + 'px'});
    this.overlay && this.overlay.setStyle({height: viewportHeight + 'px'});
/*
    if ($("main-panel")) {
      var c = headerHeight + Element.getHeight("toolbar-container") + Element.getHeight("status-panel") + Element.getHeight("security-panel") + Element.getHeight("filter-panel") + Element.getHeight("system_message") + Element.getHeight("stage_message");
      $("main-panel").setStyle({
        height: (viewportHeight - c) + "px"
      });
      if ($("tags-panel")) {
        var b = headerHeight + ($("adminbar-container") ? $("adminbar-container").getHeight() : 0);
        $("tags-panel").setStyle({
          height: (viewportHeight - b) + "px"
        });
      }
    } else if ($("tags-panel")) {
      var b = headerHeight + Element.getHeight("toolbar-container") + Element.getHeight("system_message");
      $("tags-panel").setStyle({
        height: (viewportHeight - b) + "px"
      });
    }
*/
    this._resizeCallbacks.each(function(callback) {
      try {
        callback(viewportWidth, viewportHeight);
      } catch(e) {
        console.error(e);
      }      
    });
  },

  registerResizeCallback: function(callback) {
    this._resizeCallbacks.push(callback);
  },

  lastPanel: null,
  hidePanels: function() {
    console.log('Velox.hidePanels');

    if (this.lastPanel != null) {
      var options = {
        duration: 0.5,
        queue: "end"
      };

      if (Engine.isMSIE) Effect.BlindUp(this.lastPanel, options);
      else {
        new Effect.Parallel([
          Effect.BlindUp(this.lastPanel, {
            sync: true
          }),
          new Effect.Opacity(this.lastPanel, {
            from: 0.98,
            to: 0,
            sync: true
          })
        ], options);
      }

      if ($("toolbar")) {
        $("toolbar").getElementsBySelector(".panel").each(function(el) {
          el.removeClassName("panel")
        });
      }

      if (typeof Assets != 'undefined' && Assets.inited) {
        Assets.mainPanel.style.marginBottom = 0;
        Assets.paginator && this.lastPanel.id.match(/edit/) && Assets.paginator.dispatch();
      }
    }
    this.lastPanel = null;
  },

  panelAt: function(b, a) {
    this.panel(a);
  },

  panel: function(el, html) {
    el = $(el);
    if (this.lastPanel && this.lastPanel == el) return;

    this.hidePanels();

    el.setStyle({
      bottom: 0 + ($("system_message") ? $("system_message").offsetHeight : 0) + "px"
    });

    var options = {
      duration: 0.5,
      queue: "end",
      afterFinish: function() {
        html && html.evalScripts();
        if (typeof Assets != 'undefined' && Assets.inited)
          Assets.mainPanel.style.marginBottom = el.offsetHeight + 'px';
      }
    };

    if (Engine.isMSIE) Effect.BlindDown(el, options);
    else {
      new Effect.Parallel([
        Effect.BlindDown(el, {
          sync: true
        }),
        new Effect.Opacity(el, {
          from: 0,
          to: 0.98,
          sync: true
        })
      ], options);
    }

    this.lastPanel = el;
    this.overlay && this.hideDialog();
  },

  toggleToolbar: function() {
    if (this.toggleToolbarInProgress) return;
    if (Engine.isMSIE) {
      if (!$("adminbar-container").visible()) {
        $$("#content-panel, #trash-panel, #toolbar-container, #adminbar-container, #system_message").invoke("toggle");
        if ($("nav_assets")) {
          $("nav_assets").addClassName("admin");
        }
        Event._observeShortcuts = false;
      } else {
        $$("#content-panel, #trash-panel, #toolbar-container, #adminbar-container, #system_message").invoke("toggle");
        if ($("nav_assets")) {
          $("nav_assets").removeClassName("admin");
        }
        Event._observeShortcuts = true;
      }
      return;
    }

    this.toggleToolbarInProgress = true;
    if (!$("adminbar-container").visible()) {
      if ($("content-panel")) $("content-panel").hide();
      if ($("system_message")) $("system_message").hide();
      if ($("trash-panel")) $("trash-panel").show();
      if ($("adminbar-container")) $("adminbar-container").setStyle({height: 0}).show();

      new Effect.Parallel([
        new Effect.Scale("adminbar-container", 100, {
          scaleContent: false,
          scaleX: false,
          scaleMode: "contents",
          scaleFrom: 0,
          sync: true
        }),
        new Effect.Scale("toolbar-container", 0, {
          scaleContent: false,
          scaleX: false,
          sync: true
        })
      ], {
        duration: 0.5,
        afterUpdate: function(a) {
          $("toolbar-container").down().setStyle({
            bottom: (a.effects[1].dims[0] - $("toolbar-container").clientHeight) + "px"
          })
        },
        afterFinish: function() {
          $("toolbar-container").hide();
          $("nav_assets").addClassName("admin");
          Velox.resize();
          Velox.toggleToolbarInProgress = false
        }
      });

      Event._observeShortcuts = false

    } else {

      if ($("content-panel")) $("content-panel").show();
      if ($("system_message")) $("system_message").show();
      if ($("trash-panel")) $("trash-panel").hide();
      if ($("toolbar-container")) $("toolbar-container").setStyle({height: 0}).show().down().setStyle({bottom: 0});
      if ($("nav_assets")) $("nav_assets").removeClassName("admin");

      new Effect.Parallel([new Effect.Scale("toolbar-container", 100, {
        scaleContent: false,
        scaleX: false,
        scaleMode: "contents",
        scaleFrom: 0,
        sync: true
      }), new Effect.Scale("adminbar-container", 0, {
        scaleContent: false,
        scaleX: false,
        sync: true
      })], {
        duration: 0.5,
        afterUpdate: function(a) {
          $("toolbar-container").down().setStyle({
            bottom: (a.effects[1].dims[0] - $("toolbar-container").clientHeight) + "px"
          });
        },
        afterFinish: function() {
          Element.hide("adminbar-container");
          Velox.resize();
          Velox.toggleToolbarInProgress = false;
          Element.removeClassName("main-panel", "loading")
        }
      });

      if ($("tag_tag")) $("tag_tag").blur();
      Event._observeShortcuts = true;
    }
  },

  changeOverlayColor: function(color) {
     this.overlay.style.backgroundColor = '#' + color;
     this.overlay[(color == 'fff' ? 'add' : 'remove') + 'ClassName']('white')
  },

  confirm: function(message, callback, action) {
    if (!action) action = 'confirm';

    if (message === true) {
      this.hideDialog();
      this.confirmCallback && this.confirmCallback();
      delete this.confirmCallback;
 
    } else if (message === false) {
      this.hideDialog();
      this.cancelCallback && this.cancelCallback();
      delete this.cancelCallback;
 
    } else {
      if (typeof message == 'object') message = $H(message).toQueryString();
      else message = 'msg=' + message;

      if (callback) {
        if (typeof callback == 'object') {
          this.confirmCallback = callback.yes;
          this.cancelCallback = callback.no;
          message += '&type=yesorno';
        } else this.confirmCallback = callback
      }

      this.showDialog('/' + action + '?' + message);
    }

    return false;
  },
  
  alert: function(message, callback) {
    return this.confirm(message, callback, 'alert');
  },

  showDialog: function(url, message, callback) {
    var options = {};
    if (typeof url != 'string') {
      options = url;
      url = url.action;
    }

    this.showWaiting(message);
    this.pageTracker(url);
    new Ajax.Updater(this.modal, url, Object.extend({
      method: 'get',
      evalScripts: true,
      onSuccess: function(req) {
        this.modal.show();
        this.overlay.addClassName('no-spinner').update('');
      }.bind(this),
      onFailure: function(req) {
        this.hideDialog();
        console.error('request error: ' + req.responseText);
      }.bind(this),
      onComplete: function() {
        callback && callback();
      }
    }, options));
    
    return false;
  },

  hideDialog: function(event){
    var element = event && Event.element(event);
    //alert(event)
    if (element && element.id != "cancel" && (
        element.id == 'paging' || 
        element.className == 'controls' || 
        element.tagName == 'A' ||
        element.up().tagName == 'A')) return;

    // init scribd
    if ($('preload_bed0')) $('preload_bed0').remove();
    if ($('scribd_pager')) $('scribd_pager').remove();
    $$('link[rel=stylesheet]').each(function(el) {
      if (!el.href.match(location.hostname)) el.remove();
    });

    this.hideWaiting();
    if (typeof Assets != 'undefined' && Assets.inited && Assets.paginator) Assets.paginator.dispatch();

    $$('#preview-button,#share-button').invoke('removeClassName', "panel");
    this.modal.hide().update('');
 
    event && event.stop();
  },

  showWaiting: function(message) {
    message = '<p class="message">' + (message || 'Loading...') + '</p>';

    if (this.overlay) this.overlay.update(message).show();
    else {
      this.overlay = new Element("div", {
        id: "waiting_overlay"
      }).update(message);

      this.modal.observe('touchstart', function(event) {
        var el = event.element();
        if (el && el.id == 'preview-overlay') event.stop();
      });
    }

    $(document.body).addClassName("waiting").insert({
      top: this.overlay.removeClassName("no-spinner")
    });
    
    Event._observeShortcuts = false;
  },

  hideWaiting: function() {
    if (this.overlay) {
      this.overlay.hide();
      $(document.body).removeClassName("waiting");
    }

    if ($("main-panel")) $("main-panel").removeClassName("loading");
    Event._observeShortcuts = true;   
  },

  initQuickSearch: function(a, f) {
    var a = $(a);
    var d = a.up("form");
    var c = d.down("a");

    if (Prototype.Browser.WebKit && !Modernizr.touch && !window.navigator.platform.match(/Win/)) {
      a.writeAttribute("type", "search").writeAttribute("results", "10").writeAttribute("autosave", "search");
      a.observe("search", function(g) {
        if ($F(a) == "") {
          g.stop();
          f(a, "");
        }
      });

    } else {

      d.addClassName("pretty");
      var b = function() {
        if (a.value == "") d.addClassName("empty");
        else d.removeClassName("empty");
        this.focused = false
      };

      b();

      a.observe("focus", function(g) {
        if (d.hasClassName("empty")) {
          d.removeClassName("empty");
          a.value = "";
        }
        this.focused = true;
      });

      a.observe("blur", b);
      c.observe("click", function(g) {
        g.stop();
        a.value = "";
        a.focus();
        f(a, "");
      });
    }

    d.observe("keyup", function(g) {
      if (g.keyCode == Event.KEY_ESC) {
        a.value = "";
        f(a, "");
      }
    });

    function e(g) {
      if (Event._observeShortcuts && g.element() != $("search")) $("search").blur();
    }

    Event.observe(document, "click", e);
    Event.observe(document, "asset:clicked", e);
    Event.observe(document, "rubberband:activated", e);
  },

  initVideoSkimming: function() {
    $("content").delegate(".video", "mousemove", function(event) {
      var frame = 10
        , img = this.down("img")
        , width = img.getWidth() / frame
        , cell = width / frame >> 0;

      if (this.hasClassName('waiting')) return;

      function getFrame(x) {
        var j = 0, h, g;
        while(j < frame) {
          h = cell * j;
          g = cell * (j + 1);
          if (Math.abs(h - x) + Math.abs(g - x) == Math.abs(h - g)) return j;
          j++;
        }
        return j - 1;
      }

      this.newFrame = getFrame(this.localPointer(event).x);
      if (this.activeFrame != this.newFrame) {
        img.setStyle({
          left: -(this.newFrame * width) + "px"
        });
        this.activeFrame = this.newFrame;
      }
    });

    $("content").delegate(".video", "mouseout", function(a) {
      this.down("img").setStyle({
        left: ""
      });
      this.newFrame = this.activeFrame = 0;
    });
  },

  initKeyboardNavigation: function(module) {
    Event.registerShortcut('1', module.showList.bind(module));        // 1 = List View
    Event.registerShortcut('2', module.showThumbs.bind(module));      // 2 = Icon View(Smaill)
    Event.registerShortcut('R', module.showReceiveLink.bind(module)); // R = Receive Link
    Event.registerShortcut('Z', module.restoreSelected.bind(module)); // Z = Restore selected

    // SPACE = Toggle Select Item
    Event.registerShortcut(' ', function() {
      // TODO
    });

    // ESC = Sequential Cancel
    Event.registerShortcut(Event.KEY_ESC, function() {
      if (Velox.modal.visible()) return Velox.hideDialog();
      if (Velox.lastPanel != null) return Velox.hidePanels();
      if (module.toggleManagetags && !$("managetags-button").hasClassName('active')) return module.toggleManagetags();
      if (module.getSelected().length) return module.unmark();
      if (Velox.active('resettags')) return module.resetTags();        
      if ($('search').value) doSearch($('search'), "");
    });

    // CMD+A = Select All
    Event.registerShortcut(['META+A', 'CTRL+A'], function() {
      module.documents.each(module._select.bind(module));
      module.updateMenu();
    });

    // CMD+R = Refresh Assets
    Event.registerShortcut(['META+R', 'CTRL+R'], function(event) {
      if (Velox.modal.visible()) return;
      event.stop();
      module.refresh();
    });

    Event.registerShortcut(Event.KEY_LEFT, function(event) {
      if (module.options.viewType == "thumbs") module.switchBy(-1, event);
    });

    Event.registerShortcut(Event.KEY_RIGHT, function(event) {
      if (module.options.viewType == "thumbs") module.switchBy(1, event);
    });

    Event.registerShortcut(Event.KEY_UP, function(event) {
      if (module.options.viewType == "thumbs") {
        var row = (module.mainPanel.getWidth() / module.documents.first().getWidth()) >> 0;
        module.switchBy(-row, event);
      } else {
        module.switchBy(-1, event);
      }
    });

    Event.registerShortcut(Event.KEY_DOWN, function(event) {
      if (module.options.viewType == "thumbs") {
        var row = (module.mainPanel.getWidth() / module.documents.first().getWidth()) >> 0;
        module.switchBy(row, event);
      } else {
        module.switchBy(1, event);
      }
    });

    Event._observeShortcuts = true;
  }
};


Velox.Administration = {};
Velox.Administration.Users = {
  backpanel: function(a) {
    Element.show(a + "_admin");
    new Effect.Parallel([new Effect.Opacity(a, {
      from: 1,
      to: 0,
      sync: true
    }), new Effect.Scale(a, 80, {
      scaleFromCenter: true,
      restoreAfterFinish: true,
      sync: true
    }), new Effect.Opacity(a + "_admin", {
      from: 0,
      to: 1,
      sync: true
    }), new Effect.Scale(a + "_admin", 100, {
      scaleFrom: 80,
      scaleFromCenter: true,
      sync: true
    })], {
      duration: 0.5,
      afterFinish: function() {
        Element.hide(a)
      }
    });
  },

  frontpanel: function(a) {
    Element.show(a);
    new Effect.Parallel([new Effect.Opacity(a, {
      from: 0,
      to: 1,
      sync: true
    }), new Effect.Scale(a, 100, {
      scaleFrom: 80,
      scaleFromCenter: true,
      sync: true
    }), new Effect.Opacity(a + "_admin", {
      from: 1,
      to: 0,
      sync: true
    }), new Effect.Scale(a + "_admin", 80, {
      scaleFromCenter: true,
      restoreAfterFinish: true,
      sync: true
    })], {
      duration: 0.5,
      afterFinish: function() {
        Element.hide(a + "_admin")
      }
    })
  }
};


/*!
 * avgrund 0.1
 * http://lab.hakim.se/avgrund
 * MIT licensed
 *
 * Copyright (C) 2012 Hakim El Hattab, http://hakim.se
 */
var Avgrund = (function(){
  return;
  var container = document.documentElement,
    popup = document.querySelector( '.avgrund-popup-animate' ),
    cover = document.querySelector( '.avgrund-cover' ),
    currentState = null;

  container.className = container.className.replace( /\s+$/gi, '' ) + ' avgrund-ready';

  // Deactivate on ESC
  function onDocumentKeyUp( event ) {
    if ( event.keyCode === 27 ) {
      deactivate();
    }
  }

  // Deactivate on click outside
  function onDocumentClick( event ) {
    if ( event.target === cover ) {
      deactivate();
    }
  }

  function activate( state ) {
    document.addEventListener( 'keyup', onDocumentKeyUp, false );
    document.addEventListener( 'click', onDocumentClick, false );

    removeClass( popup, currentState );
    addClass( popup, 'no-transition' );
    addClass( popup, state );

    setTimeout( function() {
      removeClass( popup, 'no-transition' );
      addClass( container, 'avgrund-active' );
    }, 0 );

    currentState = state;
  }

  function deactivate() {
    document.removeEventListener( 'keyup', onDocumentKeyUp, false );
    document.removeEventListener( 'click', onDocumentClick, false );

    removeClass( container, 'avgrund-active' );
    removeClass( popup, 'avgrund-popup-animate')
  }

  function disableBlur() {
    addClass( document.documentElement, 'no-blur' );
  }

  function addClass( element, name ) {
    element.className = element.className.replace( /\s+$/gi, '' ) + ' ' + name;
  }

  function removeClass( element, name ) {
    element.className = element.className.replace( name, '' );
  }

  function show(selector){
    popup = document.querySelector( selector );
    addClass(popup, 'avgrund-popup-animate');
    activate();
    return this;
  }
  function hide() {
    deactivate();
  }

  return {
    activate: activate,
    deactivate: deactivate,
    disableBlur: disableBlur,
    show: show,
    hide: hide
  }

})();

/* Tooltip */
var Tooltip = Class.create();
Tooltip.prototype = {
  initialize: function(selector, options) {
    this.visible = false;

    this.setOptions(options);

    this.showEvent = this.show.bindAsEventListener(this);
    this.hideEvent = this.hide.bindAsEventListener(this);
    this.updateEvent = this.update.bindAsEventListener(this);
    
    $(document.body).delegate(selector, "mouseover", this.showEvent);
    $(document.body).delegate(selector, "mouseout", this.hideEvent);
  },

  setOptions: function(options) {
    this.options = {
      backgroundColor: "",
      borderColor: "",
      textColor: "",
      textShadowColor: "",
      maxWidth: 250,
      align: "left",
      delay: 250,
      mouseFollow: true,
      opacity: 0.75,
      appearDuration: 0.25,
      hideDuration: 0.25
    };

    Object.extend(this.options, options || {});
  },

  show: function(event) {
    this.xCord = Event.pointerX(event);
    this.yCord = Event.pointerY(event);

    if (!this.visible) {
      this.el = event.element();
      this.content = this.el.title.stripScripts().strip();
      this.el.title = "";
      this.el.descendants().each(function(el) {
        if (Element.readAttribute(el, "alt")) el.alt = "";
      });

      this.timeout = window.setTimeout(this.appear.bind(this), this.options.delay)
    }
  },

  hide: function(event) {
    this.el.title = this.content;

    if (this.visible) {
      this.appearingFX.cancel();
      if (this.options.mouseFollow) Event.stopObserving(this.el, "mousemove", this.updateEvent);
      new Effect.Fade(this.tooltip, {
        duration: this.options.hideDuration,
        afterFinish: function() {
          //Element.remove(this.tooltip);
        }.bind(this)
      });
    }

    this._clearTimeout(this.timeout);
    this.visible = false;
  },

  update: function(event) {
    this.xCord = Event.pointerX(event);
    this.yCord = Event.pointerY(event);
    this.setup();
  },

  appear: function() {
    if (!this.tooltip) {
      this.tooltip = new Element("div", {className: "tooltip", style: "display: none"})
        .insert(new Element("div", {className: "xarrow"}).insert('<b class="a1"></b><b class="a2"></b><b class="a3"></b><b class="a4"></b><b class="a5"></b><b class="a6"></b>'))
        .insert(new Element("div", {className: "xtop"})
          .insert(new Element("div", {className: "xb1", style: "background-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb2", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb3", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb4", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"})))
        .insert(this.body = new Element("div", {className: "xboxcontent", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ((this.options.textColor != "") ? "; color:" + this.options.textColor : "") + ((this.options.textShadowColor != "") ? "; text-shadow:2px 2px 0" + this.options.textShadowColor + ";" : "")}))
        .insert(new Element("div", {className: "xbottom"})
          .insert(new Element("div", {className: "xb4", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb3", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb2", style: "background-color:" + this.options.backgroundColor + "; border-color:" + this.options.borderColor + ";"}))
          .insert(new Element("div", {className: "xb1", style: "background-color:" + this.options.borderColor + ";"})));

      this.tooltip.select(".xarrow b").each(function(e) {
        if (!e.hasClassName("a1")) {
          e.setStyle({
            backgroundColor: this.options.backgroundColor,
            borderColor: this.options.borderColor
          })
        } else {
          e.setStyle({
            backgroundColor: this.options.borderColor
          })
        }
      }.bind(this));

      $(document.body).insert({top: this.tooltip});
      Element.extend(this.tooltip);
    }
    
    this.body.update(this.content);

    this.width = this.tooltip.setStyle({width: 'auto'}).getWidth() + 1;
    this.tooltip.style.width = this.width + "px";
    this.setup();

    if (this.options.mouseFollow) Event.observe(this.el, "mousemove", this.updateEvent)

    this.visible = true;
    this.appearingFX = new Effect.Appear(this.tooltip, {
      duration: this.options.appearDuration,
      to: this.options.opacity
    });
  },

  setup: function() {
    if (this.width > this.options.maxWidth) {
      this.width = this.options.maxWidth;
      this.tooltip.style.width = this.width + "px"
    }
    if (this.xCord + this.width >= Element.getWidth(document.body)) {
      this.options.align = "right";
      this.xCord = this.xCord - this.width + 20;
      this.tooltip.down(".xarrow").setStyle({
        left: this.width - 24 + "px"
      });
    } else {
      this.options.align = "left";
      this.tooltip.down(".xarrow").setStyle({
        left: 12 + "px"
      });
    }
    this.tooltip.style.left = this.xCord - 7 + "px";
    this.tooltip.style.top = this.yCord + 12 + "px"
  },

  _clearTimeout: function(id) {
    clearTimeout(id);
    clearInterval(id);
    return null
  }
};