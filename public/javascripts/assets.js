/*!
 * Velox - assets.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

console.info('Prototype.js: ', Prototype.Version);
console.info('Scriptaculous: ', '1.9.0');
console.info('Socket.IO: ', io.version);

var Assets = {
  uploads: [],
  documents: [],
  selected: [],
  previews: [],
  _imageQueue: [],

  totalCount: 0,
  noteXIndex: 100,
  uploading: false,
  nothingHappened: true,
  viewScrolledDown: false,
  activatedTrash: false,
  baseFontSize: 10.3,
  thumbSize: 64,
  clickEvent: "click",

  options: {
    zoomLevel: 1.5,
    viewType: "thumbs",
    conflict: "askme",
    saveSettings: true,
    pollAssets: false, // 주기적 갱신
    pollerInterval: 10,
    touch: /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) && (!(typeof Modernizr === "undefined") && Modernizr.touch)
  },

  initialize: function(options) {
    Object.extend(this.options, options || {});
    if (!this.options.boxId) return console.error("Script initialization error");

    this.mainPanel = $('main-panel');
    this.filterPanel = $('filter-panel');
    this.contentPanel = $('content-panel');
    this.assetsList = $('assets-container');
    this.notesWrapper = $('notes-wrapper');

    this.baseUrl = "/assets/" + this.options.boxId + "/";
    this.tagsUrl = "/tags/" + this.options.boxId + "/";
    this.filesUrl = "/files/" + this.options.boxId + "/";
    this.notesUrl = "/notes/" + this.options.boxId + "/";
    this.deliveryUrl = "/delivery/" + this.options.boxId + "/";

    this.zoomLevel = this.options.touch && options.zoomLevel == 1 && 3 || options.zoomLevel;
    this.activatedTemp = !!$("navigation").down('.active') && $("navigation").down('.active').up().hasClassName('temporary');
    this.activatedProj = !!$('note-button');
    this.notAvailableTags = !$$('#document_tags > div.tag').length;
    //this.updatePanel = this.updatePanel.bind(this).debounce(200);
    this.updateMenu = this.updateMenu.bind(this).debounce(200);
    this.queueRender = this.render.bind(this).debounce(500);

    this.supportCanvasElement = (function(canvas) {
      return !!(canvas.getContext && canvas.getContext( '2d' ));
    })(document.createElement( 'canvas' ));

    if (this.options.viewType == "list") this.showList();
    else this.showThumbs(this.zoomLevel);

    this.initObservers();
    this.initShortcuts();
    if (this.activatedProj) this.initNoteDragAndDrop();
    if (!this.options.touch) Velox.initVideoSkimming();

    this.refresh();

    if (this.activatedTemp)
      this.disableButtons(["upload", "edit", "tags", "download", "share", "trash", "restore", "delete", "receive", "managebox", "managetags"]);
    else
      this.enableButtons(["receive", "managebox"]);

    $('upload')[Prototype.Browser.IE ? 'show' : 'hide']().src = this.filesUrl;

    this.inited = true;
  },

  initObservers: function() {
    Velox.registerResizeCallback(this.updateLayout.bind(this));
    Velox.registerResizeCallback(this.repositionNotes.bind(this));
    Velox.registerResizeCallback(this.resizePreview.bind(this));
    Velox.registerResizeCallback(this.resizeDoc.bind(this));
    Velox.registerResizeCallback(this.queueRender.bind(this));

    if (this.options.touch) {
      this.markDocument = this.markDocumentToggle;
      this.assetsList.delegate(".asset .wrapper", 'touchend', function(event) {
        var el = this.up()
          , id = el.id.split("_")[1]
          , now = new Date().getTime()
          , lastTouch = el.lastTouch || now + 1
          , delta = now - lastTouch;
  
        if (delta < 500 && delta > 0) {

          if (el.hasClassName("with-preview")) {
            Assets.unmark();
            Assets.markDocument(event, id);
            Assets.preview(id);
          }
          else Assets.download("download-form");
        }
  
        el.lastTouch = now;
      });

      var swipe = new TouchSwipe(document.body, {
        axis: 'x', stopEvents: false,
        onSwipe: function(event, dir) {
          var preview = $('preview');
          if (!preview) return;

          if (dir) {
            var pos = dir == 'left' && 1 || -1
              , currentIdx = this.assetsIds.indexOf(this.currentDocument())
              , nextIdx = this.documents.indexOf(this.documents[currentIdx][pos < 0 ? 'previous' : 'next']('.with-preview'));

            if (0 > nextIdx || nextIdx >= this.assetsIds.length) return swipe.cancel(event);
          }

          preview.scroll && preview.scroll.state == 'running' && preview.scroll.cancel();
          preview.scroll = new Effect.Scroll(preview.imgWrapper, {
            left: !dir ? preview.left : dir == 'left' ? 3000 : 0,
            transition: Effect.Transitions[dir == 'left' ? 'circIn' : !dir ? 'cubic' : 'circOut'],
            duration: dir && 0.3 || 0.5,
            afterFinish: function() {
              dir && this.switchBy(pos);
            }.bind(this)
          });
        }.bind(this)
      });

      Velox.createDropdownButton('assets');
    } else {
      this.assetsList.delegate(".asset .wrapper", "dblclick", function(event) {
        event.stop();
        if (this.up().hasClassName("with-preview")) Assets.preview();
        else Assets.download("download-form");
      });
    }

    document
      .observe("ajax:started", function() {
        this.nothingHappened = false;
      }.bind(this))
      .observe("ajax:completed", function() {
        this.nothingHappened = true;
      }.bind(this));

    this.assetsList
      .delegate(".asset .wrapper", "click", function(event) {
        Assets.markDocument(event, this.up().id.split("_")[1]);
      })
      .delegate(".asset .version", "click", function(event) {
        event.stop();
        Assets.showEditPanel($("edit-panel").visible());
      });

    this.mainPanel
      .observe("scroll", this.queueRender.bindAsEventListener(this))
      .observe("click", function() {
        this.unmark();
        this.updateMenu();
        //Velox.hidePanels();
      }.bind(this))
      .observe("view:changed", function(data) {
        Velox.resize();
        this.queueRender();
        this.saveViewSettings(data.memo);
        this.lastSelect
          && this.lastSelect.hasClassName('selected')
          && this.mainPanel.scrollToAsset(this.lastSelect);
      }.bind(this));
  },

  initShortcuts: function() {    
    Event.registerShortcut('3', this.showThumbs.bind(this));     // 3 = Icon View (Large)
    Event.registerShortcut('A', this.browseFiles.bind(this));    // A = Upload (Add)
    Event.registerShortcut('C', this.copySelectedTo.bind(this)); // C = Copy selected
    Event.registerShortcut('W', this.createNote.bind(this));     // W = Write Note
    Event.registerShortcut('T', this.showTagsPanel.bind(this));  // T = Tags Panel
    Event.registerShortcut('E', this.showEditPanel.bind(this));  // E = Edit Panle
    Event.registerShortcut('S', this.showSharePanel.bind(this)); // S = Share Panel
    Event.registerShortcut('X', this.showManageBox.bind(this));  // X = Manage Box

    // DELETE = Delete Selected
    Event.registerShortcut([Event.KEY_DELETE, Event.KEY_BACKSPACE], function(event) {
      event.stop();
      if (!this.getSelectedAssetsCount()) return;
      if (this.activatedTrash) this.deleteSelected();
      else this.trashSelected();
    }.bind(this));

    // CMD+DELETE = Trash bin
    Event.registerShortcut(['META+DELETE', 'CTRL+DELETE', 'META+BACKSPACE'], function(event) {
      if (!this.activatedTrash) return;
      this.deleteAll();
    }.bind(this));

    // RETURN = Deafult Action
    Event.registerShortcut(Event.KEY_RETURN, function() {
      if (this.previews.length == 1) {
        if (!$('preview-button').hasClassName('panel')) this.preview();
        else Velox.hideDialog();
      } else if (!this.activatedTrash) this.download("download-form");
    }.bind(this));

    // CMD+W = Close Tab
    Event.registerShortcut(['META+W', 'CTRL+W'], function(event) {
      if (Velox.modal.visible() || !this.activatedProj) return;
      event.stop();
      Velox.removeBox(this.options.boxId, !!$('managebox-button'));
    }.bind(this));

    Velox.initKeyboardNavigation(this);
  },

  /* Selectors */
  resetAssets: function() {
    this.documents = [];
    this.assetsIds = [];
    this.selected = [];

    this.previews = [];
    Velox.locked = [];
  },

  getSelected: function() {
    return this.selected.findAll(function(el) {
      return el;
    });
  },

  getSelectedSize: function() {
    var size = 0;
    this.selected.findAll(function(el) {
      if (el) size += el.down('.a-size').readAttribute('data-size') * 1;
    });
    return size;
  },

  getSelectedAssetsCount: function() {
    return this.getSelected().length;
  },

  serializeSelected: function() {
    return this.getSelected().map(function(el) {
      return "id[]=" + encodeURIComponent(el.id.split("_")[1])
    }).join("&");
  },

  serializeSelectedAsPlainText: function() {
    return this.getSelected().map(function(el) {
      return encodeURIComponent(el.id.split("_")[1]);
    }).join(",");
  },
  
  currentDocument: function() {
    return((this.getSelectedAssetsCount() == 1) ? this.getSelected()[0].id.split("_")[1] : 0)
  },

  lastSelectId: function() {
    return this.lastSelect && this.lastSelect.id.split("_")[1] || null;
  },

  /*
  getSelectedDocumentTagsId: function() {
    return $$('#document_tags > div.active-tag').map(function(el) {
      return el.id.split('_')[1];
    }).join(',');
  },
  */

  unmark: function() {
    this.getSelected()._each(function(el) {
      el.removeClassName("selected")
    });

    this.selected = this.documents.map(function() {
      return false
    });

    this.previews = [];
  },

  _select: function(el) {
    if (!el.id.split("_")[1]) return;
    this.selected[this.documents.indexOf(el)] = this.lastSelect = el.addClassName("selected");
    if (el.hasClassName("with-preview")) this.previews.push(el);
  },

  _unselect: function(el) {
    this.selected[this.documents.indexOf(el)] = false;
    this.previews = this.previews.reject(function(_el) {
      return _el == el;
    });
    Element.removeClassName(el, "selected");
  },

  markDocument: function(event, id) {
    this.mainPanel.fire("asset:clicked");
    //Velox.hidePanels();
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) this.unmark();

    var doc = $("document_" + id);
    if (!event.shiftKey && this.selected.include(doc)) this._unselect(doc);
    else this._select(doc);

    if (event.shiftKey) {
      var selected = this.getSelected();
      if (0 < selected.length) {
        var first = selected.first()
          , last = selected.last()
          , select = false;

        this.documents.each(function(el, i) {
          if (el == first) select = true;
          if (el == last) throw $break;
          if (select && !this.selected[i]) this._select(el);
        }.bind(this));
      }
    }

    this.updateMenu();
    event.stop();
  },

  markDocumentToggle: function(event, id) {
    var doc = $("document_" + id);
    if (this.selected.include(doc)) this._unselect(doc);
    else this._select(doc);
    this.updateMenu();
    event.stop();
  },

  switchBy: function(pos, event) {
    //if (this.getSelectedAssetsCount() != 1) return;
    //console.log('Assets.switchBy', pos);
    event && event.stop();

    if (this.getSelectedAssetsCount() >= 1) {
      this.selected._each(this._unselect.bind(this));
      this._select(this.lastSelect);
    }

    var preview = $("preview")
      , currentIdx = this.assetsIds.indexOf(this.currentDocument())
      , nextIdx = preview ? this.documents.indexOf(this.documents[currentIdx][pos < 0 ? 'previous' : 'next']('.with-preview')) : currentIdx + pos;

    if (0 > nextIdx || nextIdx >= this.assetsIds.length) return false;

    var nextAsset = $("document_" + this.assetsIds[nextIdx]);
    if (nextAsset) {
      this._unselect($("document_" + this.currentDocument()));
      this._select(nextAsset);
      this.mainPanel.scrollToAsset(nextAsset);
    }

    $(document).fire("assets:switched", {
      currentAssetId: this.currentDocument()
    });

    this.updateMenu();
    
    return true;
  },

  /* Renderer */
  render: function() {
    //console.log('Assets.render');

    var height
      , scrollTop = this.mainPanel.scrollTop
      , offset = {
        top: scrollTop,
        bottom: this.mainPanel.clientHeight + scrollTop
      };

    if (this.documents[0]) height = this.documents[0].down("img").getHeight();

    for (var i = 0, len = this.documents.length; i < len; i++) {
      var doc = this.documents[i]
        , top = doc.offsetTop;

      if (!doc.loaded && (top + height >= offset.top && top <= offset.bottom)) {
        var img = doc.down("img[rel]");
        if (img) {
          var rel = img.getAttribute('rel');
          this.queueImage(img, rel, !!rel.match(this.baseUrl + 'thumbnail'));
          doc.loaded = true
        }
      }
    }
  },

  /*
  queueRender: function() {
    if (this._queue) clearTimeout(this._queue);
    this._queue = setTimeout(this.render.bind(this), 500);
  },
  */
  stopImageLoading: function() {
    this._imageQueue = [];
  },

  queueImage: function(el, src, thumb) {
    this._imageQueue.push({
      element: el,
      src: src,
      preview: thumb
    });

    if (!this._imageQueueInterval) this._imageQueueInterval = setInterval(this.imageQueueUpdate.bind(this), 5);
  },

  imageQueueUpdate: function() {
    (4).times(function(i) {
      if (i < this._imageQueue.length) {
        var queue = this._imageQueue[i];

        if (queue.image && !queue.image.complete) return;
        if (queue.image && queue.image.complete) {          
          if (queue.element.src.match('generating-preview')) this.createThumbnail(queue.element.up('.asset'));
          if (queue.element.src.match('generating-document')) this.createDocument(queue.element.up('.asset'));
          else queue.element.src = queue.src;
          queue.element.up().removeClassName('waiting');

          //if (queue.preview && this.supportCanvasElement) this._createThumbnail(queue.element, queue.src);
          //else queue.element.src = queue.src;
          this._imageQueue = (i == 0 ? this._imageQueue.slice(1) : this._imageQueue.slice(0, i).concat(this._imageQueue.slice(i + 1)))
        }

        // ISSUE: IE는 비정상 썸네일인 경우 complete 플래그가 변경되지 않아 드로잉이 멈춤
        if (!queue.image && i < this._imageQueue.length) {
          //queue = this._imageQueue[i];
          queue.image = new Image();
          queue.image.src = queue.src;
        }
      }

      if (this._imageQueue.length == 0) {
        clearInterval(this._imageQueueInterval);
        this._imageQueueInterval = null;
      }
    }.bind(this))
  },

  createDocument: function(el) {
    console.log('createDocument', el.id);

    var fileId = el.id.split("_")[1];
    new Ajax.Request(this.filesUrl + 'createdocument/' + fileId, {
      method: 'get',
      onSuccess: function(req) {
        var data = req.responseJSON;
        if (data) {
          if (data.width === null) console.error(this.filesUrl + 'createdocument/' + fileId, data);
          var width = data.width
            , height = data.height
            , isVertical = width < height
            , style = '';

          if (isVertical) style = 'width:' + ((width / height ) * 5).toFixed(1) + 'em';
          else style = 'height:' + ((height / width ) * 5).toFixed(1) + 'em';
          
          var thumb = el.down('.a-thumb').addClassName(isVertical ? 'vertical' : '')
            , img = thumb.down('img')
            , src = this.baseUrl + 'thumbnail/' + fileId;

          el.addClassName('with-preview');

          img.setStyle(style).src = src;
          el.down('.a-type').id = data.scribdId;
          el.down('img').writeAttribute("rel", src);
        }
      }.bind(this),
      onFailure: function() {
        el.down('img').src = el.down('img').readAttribute("rel");
      }
    });
  },

  createThumbnail: function(el) {
    console.log('createThumbnail', el.id);

    var fileId = el.id.split("_")[1];
    new Ajax.Request(this.filesUrl + 'createthumbnail/' + fileId, {
      method: 'get',
      onSuccess: function(req) {
        var data = req.responseJSON;
        if (data) {
          if (data.width === null) console.error(this.filesUrl + 'createthumbnail/' + fileId, data);
          var rightTop = (data.orientation || '').match(/RightTop|LeftBottom/)
            , width = rightTop ? data.height : data.width
            , height = rightTop? data.width : data.height
            , isVertical = width < height
            , style = '';

          if (isVertical) style = 'width:' + ((width / height ) * 5).toFixed(1) + 'em';
          else style = 'height:' + ((height / width ) * 5).toFixed(1) + 'em';
          
          var ext = el.down('.a-type').innerHTML;           
          !ext.match(/psd|pdf/) && el.addClassName('with-preview');

          var thumb = el.down('.a-thumb').addClassName(isVertical ? 'vertical' : '')
            , img = thumb.down('img')
            , src = this.baseUrl + 'thumbnail/' + fileId;

          if (img.readAttribute("rel").match('video')) thumb.removeClassName('icon').addClassName('video');
          img.setStyle(style).src = src;
          el.down('img').writeAttribute("rel", src);
        }
      }.bind(this),
      onFailure: function() {
        el.down('img').src = el.down('img').readAttribute("rel");
      }
    });
  },

  setContentZoom: function(zoomLevel) {
    this.mainPanel.setContentZoom(zoomLevel * 100);
    this.updateLayout(this.viewportWidth, this.viewportHeight, zoomLevel);
    this.queueRender();
  },
 
  updateLayout: function(viewportWidth, viewportHeight, zoomLevel) {
    if (!this.contentPanel.visible()) return;

    viewportWidth = this.options.touch ? this.mainPanel.getWidth() : viewportWidth - 200;
    zoomLevel = zoomLevel || this.zoomFactor;

    var size = 5 * this.baseFontSize * zoomLevel + 10;
    var grid = (viewportWidth / (size + 15)) >> 0;

    this.assetsList.className = "grid" + (grid > 20 ? 20 : grid);
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.zoomFactor = zoomLevel;
  },

  checkForResize: function(fix) {
    var zoom = this.zoomLevel * 100;
    var size = 64;

    if ($R(50, 99).include(zoom)) size = 16;
    if ($R(100, 133).include(zoom)) size = 64;
    else {
      if ($R(134, 266).include(zoom)) size = 128;
      else if ($R(267, 532).include(zoom)) size = 256;
    }

    if (fix) this.thumbSize = 64;
    if (size == this.thumbSize || this.documents.length == 0) return;

    var regexp = new RegExp("_" + this.thumbSize);
    for (var i = 0, len = this.documents.length; i < len; i++) {
      var doc = this.documents[i]
        , img = doc.down("img");

      if (img) {
        var rel = img.getAttribute("rel").replace(regexp, "_" + size);
        img.setAttribute("rel", rel);
        doc.loaded = false;
      }
    }

    this.thumbSize = size;
    this.render();
  },

  showThumbs: function(zoom) {
    if (!Object.isNumber(zoom)) zoom = zoom.keyCode == 50 ? 1 : 3;
    console.log('Assets.showThumbs', zoom);

    if (!zoom || zoom == 1) {
      $('view-thumbs-button').addClassName("active");
      $('view-big-thumbs-button').removeClassName("active");
    } else {
      if (this.options.touch) zoom = 2;
      $('view-big-thumbs-button').addClassName("active");
      $('view-thumbs-button').removeClassName("active");
    }
    $('view-list-button').removeClassName("active");
    this.mainPanel.removeClassName("view-list").addClassName("view-thumbs");

    if (zoom) this.zoomLevel = zoom; 

    this.setContentZoom(this.zoomLevel);
    this.checkForResize();

    this.mainPanel.fire("view:changed", {zoomValue: this.zoomLevel, viewType: "thumbs"});
    this.options.viewType = "thumbs";
  },

  showList: function() {
    //Element.hide("zoombar");
    Element.addClassName("view-list-button", "active");
    Element.removeClassName("view-big-thumbs-button", "active");
    Element.removeClassName("view-thumbs-button", "active");

    this.mainPanel.removeClassName("view-thumbs").addClassName("view-list");
    this.mainPanel.fire("view:changed", {viewType: "list"});
    this.options.viewType = "list";
  },

  /* Updater */
  initAfterLoad: function(html) {
    console.log('Assets.initAfterLoad');

    $("next-assets").replace(html);
    var assets = this.assetsList.select(".assets")
      , first = assets.first()
      , last = assets.last();

    if (last) {
      last.select(".asset")._each(function(el) {
        this.documents.push(el);
        this.assetsIds.push(el.id.split("_")[1]);
        el.hasClassName("selected") && this.selected.push(el);
      }.bind(this));
    }

    if (!this.activatedTrash && this.uploads.length && !first.down('.upload')) {
      if (first.down('.message')) first.down('.message').remove();
      this.uploads._each(function(el) {
        // filter display item el.tags
        first.insert({top: el});
      });
    }

    this.checkForResize(true);
    this.render();
    this.enableButtons(["refresh"]);
    this.filterPanel.removeClassName('busy');
    this.mainPanel.removeClassName('loading');

    this.nothingHappened = true;
    document.fire("assets:updated");
    //if (Velox.iscroll) Velox.iscroll.refresh();
  },

  refresh: function(params) {
    if (!this.nothingHappened) return;

    this.stopImageLoading();
    this.disableButtons(["add", "refresh"]);
    this.filterPanel.addClassName('busy');
    
    var nav = $('nav_' + this.options.boxId);
    if (nav.down('.counter')) {
      nav
        .writeAttribute('data-count', 0)
        .addClassName(nav.readAttribute('data-icon'))
          .down('.counter')
          .remove();
    }

    var dropdown = $('dropdown-selected');
    if (dropdown && dropdown.down('.counter')) {
      dropdown
        .writeAttribute('data-count', 0)
        .addClassName(dropdown.readAttribute('data-icon'))
          .down('.counter')
          .remove();
    }

    new Ajax.Request(this.baseUrl + "refresh?" + t(), {
      method: 'get',
      parameters: {
        section: ((!Object.isUndefined(params)) ? params : "all")
      }
    });

    if (this.activatedProj) {
      new Ajax.Request(this.notesUrl + "?" + t(), {
        method: 'get',
        onSuccess: function(req) {
          this.notesWrapper.update(req.responseText);
        }.bind(this)
      });
    }
  },

  _updateButtonsClassName: function(buttons, action) {
    $A(buttons)._each(function(button) {
      button = $(button + '-button');
      button && button[action + "ClassName"]("active");
    });
  },

  enableButtons: function(buttons) {
    this._updateButtonsClassName(buttons, "add");
  },

  disableButtons: function(buttons) {
    this._updateButtonsClassName(buttons, "remove");
  },

  updateUploadButton: function() {
    var exceeded = $('usage-info').hasClassName('exceeded');
    this[exceeded || this.activatedTemp ? 'disableButtons' : 'enableButtons'](["add"]);
    if (Prototype.Browser.IE) $('upload')[exceeded || this.activatedTrash ? 'hide' : 'show']();    
  },

  updateMenu: function() {
    console.info('Assets.updateMenu');

    var selected = this.getSelectedAssetsCount();

    // select temporary box
    if (this.activatedTemp) {
      if (this.documents.length == 0 || selected == 0) {
        this.disableButtons(["preview", "deleteall"]);
      } else {
        this[(this.previews.length > 0 ? "enable" : "disable") + "Buttons"](["preview"]);
      }
    // active deleted tag
    } else if (this.activatedTrash) {
      if (this.documents.length == 0 || selected == 0) {
        this.disableButtons(["restore", "delete", "preview"]);
      } else {
        this.enableButtons(["restore", "delete"]);
        this[(this.previews.length > 0 ? "enable" : "disable") + "Buttons"](["preview"]);
      }
    } else {
      var buttons = ["edit", "note", "download", "copy", "share", "trash", "tags"];
      if (this.documents.length == 0 || selected == 0) {
        this.disableButtons(buttons.push("preview") && buttons);
        Velox.hidePanels();
      } else {
        var disables = [];
        // not available share box
        if (!$("navigation").down('.project') && !$('dropdown')) {
          disables.push("copy");
          buttons.splice(buttons.indexOf("copy"), 1);
        }

        if (this.notAvailableTags) disables.push(buttons.pop()); // not available tags
        if (this.previews.length > 0) buttons.push("preview"); // not found preview in selected
        else disables.push("preview");

        this.enableButtons(buttons);
        this.disableButtons(disables);
        this.updatePanel();
      }
      this.updateUploadButton();
    }

    Velox.emit('selectedItem', this.serializeSelectedAsPlainText());
    this.updateSelectionInfo(selected, this.getAssetsCount());
  },

  updateDetail: function() {
    console.log('Assets.updateDetail');

    if (!this.getSelectedAssetsCount() || Velox.modal.visible()) Velox.hidePanels();
    else this.showEditPanel();
  },

  updatePanel: function() {
    if (!Velox.lastPanel) return this.updatePreview();

    console.log('Assets.updatePanel');

    var panelName = Velox.lastPanel.id.split('-')[0];
    if (panelName.match(/edit|tags|share/)) this['show' + panelName.capitalize() + 'Panel'](true);
  },

  updateSelectionInfo: function(count, total) {
    var reg = /(^[+-]?\d+)(\d{3})/;   // 정규식
    total += '';                      // 숫자를 문자열로 변환
  
    while (reg.test(total))
      total = total.replace(reg, '$1' + ',' + '$2');
   
    var el = $("selection-info");
    if (!count) el.update(total + " files");
    else el.update(count + " of " + total + " selected");
  },

  setAssetsCount: function(count) {
    this.totalCount = count;
  },

  getAssetsCount: function() {
    return this.totalCount;
  },

  saveViewSettings: function(options) {
    if (this.options.saveSettings) {
      new Ajax.Request(this.baseUrl + "settings", {
        parameters: {
          view_type: options.viewType,
          zoom_level: options.zoomValue
        }
      });
    }
  },

  /* Uploader */
  initDropArea: function(func) {
    func(this.contentPanel);
  },

  startUpload: function() {
    console.log('Assets.startUpload');
    //this.disableButtons(["refresh"]);
    //this.inUploadProgress = true;
    //this.filterPanel.addClassName('busy');
  },

  finishUpload: function() {
    console.log('Assets.finishUpload');
    this.uploads = [];
    //this.enableButtons(["refresh"]);
    //this.inUploadProgress = false;
    //this.filterPanel.removeClassName('busy');
  },

  completeUpload: function(item, model, id) {
    item.writeAttribute('id', 'document_' + id)
      .removeClassName('upload')
      .removeClassName('pending')
      .removeClassName('uploading');

    item.down('.cancel').remove();
    item.down('.retry').remove();
    item.down('.progress').remove();

    this.uploads.splice(this.uploads.indexOf(item), 1);
    this[model.versionId ? 'applyVersion' : 'pushNewItem'](item, model);
  },

  cancelUpload: function(item) {
    item.remove();
    this.uploads.splice(this.uploads.indexOf(item), 1);
  },

  addNewVersionBrowse: function(event, id) {
    this.selectFiles(event, id);
  },

  addNewVersion: function(file, id) {
    var doc = $('document_' + id);
    doc.remove();
    this._unselect(doc);
    this.documents.splice(this.documents.indexOf(doc), 1);
    this.selected.splice(this.selected.indexOf(doc), 1);

    return this.addNewItem(file);
  },

  _getSize: function(size) {
    var s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
      , e = Math.floor(Math.log(size) / Math.log(1024));

    return (size / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + s[e];    
  },

  addNewItem: function(file) {
    //console.log('addNewItem', file.id);

    var d = file.attributes.name.split('.')
      , ext = d[d.length - 1]
      , date = new Date(file.attributes.lastModifiedDate).format('yyyy-MM-dd hh:mm tt')
      , size = this._getSize(file.attributes.size);

    if (this.assetsList.down('.message')) this.assetsList.down('.message').remove();

    this.assetsList.down('.assets').insert({top: [
      '<div class="asset upload" id="document_' + file.id + '" title="' + file.attributes.name + ' (v.1)">',
        '<div class="wrapper">',
          '<p class="a-thumb">',
            '<img src="/images/asset.gif" alt="">',
          '</p>',
          '<p class="a-details">',
            '<b class="a-title" title="' + file.attributes.name + '"><span>' + file.attributes.name + '</span></b>',
            '<b class="a-type type-' + ext + '">' + ext + '</b>',
            '<a href="#" title="Show available versions" class="version"></a>',
            '<b class="a-size">' + size + '</b>',
            '<b class="a-uploaded">just now</b>',
            '<b class="a-author">' + $('author').innerHTML + '</b>',
            '<b class="a-date">' + date + '</b>',
          '</p>',
          '<div class="progress"><div class="msg"></div><div class="bar"></div></div>',
        '</div>',
        '<div class="cancel icon-remove"></div>',
        '<div class="retry icon-repeat"></div>',
      '</div>'
    ].join(' ')});

    var item = $('document_' + file.id);
    //item.tags = this.getSelectedDocumentTags();
    this.uploads.push(item);
    return item;
  },

  applyVersion: function(item, file) {
    //this._select(item);
    this.pushNewItem(item, file);
  },
  
  pushNewItem: function(c, file) {
    var fileId = c.id.split("_")[1];

    this.documents = [c].concat(this.documents);
    this.assetsIds.push(fileId);
    if (c.hasClassName("selected")) this.selected.push(c)

    this.checkForResize(true);
    this.render();
    this.updateMenu();

    Velox.emit('notifyNewItem');

    if (c.down('img').src.match('generating-preview')) this.createThumbnail(c);
    if (c.down('img').src.match('generating-document')) this.createDocument(c);

    this.nothingHappened = true;
    document.fire("assets:updated");
  },

  browseFiles: function(event) {
    if ($('usage-info').hasClassName('exceeded')) Velox.alert($('usage-info').innerHTML);
    if (!Velox.active('add')) return;
    
    this.selectFiles(event);
  },

  confirmConflict: function(filenames, callback) {
    console.log('Assets.confirmConflict');

    this.conflicts = [];

    new Ajax.Request(this.filesUrl + "confirm", {
      parameters: {
        filenames: filenames
      },
      onSuccess: function(req) {
        var conflicts = req.responseJSON;
        //console.log(conflicts);
        if (conflicts.length) {
          this.conflicts = conflicts;
          this.conflicts.versions = {};
          this.conflicts.callback = callback;

          if (this.options.conflict != 'askme') {
            this.conflicts._each(function(file) {
              Assets.conflicts.versions[file.name] = {
                _id : file._id,
                action: 'version'
              };
            });
            callback(this.conflicts.versions);
          } else 
            this.showConflictDialog();

        } else {
          callback();
        }
      }.bind(this)
    });
  },

  showConflictDialog: function(form) {
    var file = this.conflicts.pop();
    console.log('showConflictDialog file', file, form);
    
    if (form) {
      this.conflicts.versions[form.name.value] = {
        _id : form._id.value,
        action: form.action.value
      };

      if (form.applyall) {
        this.conflicts._each(function(file) {
          Assets.conflicts.versions[file.name] = {
            _id : file._id,
            action: form.action.value
          };
        });
        file = null;
      }

      if (!file) {
        this.conflicts.callback(this.conflicts.versions);
        Velox.hideDialog();
        return false;
      }
    } else {
      Velox.modal.visible() && Velox.hideDialog();
    }

    return Velox.showDialog({
      action: this.filesUrl + "conflict/" + file._id,
      onComplete: function() {
        if (this.conflicts.length > 1) {
          $('conflict_count').update(this.conflicts.length + ' items ');
          $('applyall').show();
        }
      }.bind(this)
    }, "Creating...");
  },

  /*
  toggleSearch: function() {
    $$("#normal-search, #full-search").invoke("toggle");
  },
  */

  /* Actions */
  _checkOverlength: function() {
    // for NginX URI length limit
    var selected = this.getSelectedAssetsCount()
    if (selected > 255) {
      Velox.alert({msg: 'overlength', args: [selected]});
      return true;
    }
    
    return false;
  },

  _download: function(form) {
    form.down("input[name=ids]").value = this.serializeSelectedAsPlainText();
    form.submit();    
  },

  download: function(formId) {
    var form = $(formId);
    
    if (!form || !Velox.active('download') || this._checkOverlength()) return false;

    var size = this.getSelectedSize()
      , selected = this.getSelectedAssetsCount();

    if (selected == 1) {
      location.href = this.filesUrl + 'download/' + this.serializeSelectedAsPlainText();
    } else if (size > 1024 * 1024 * 1024 * 4) { // 4GB
      size = this._getSize(size);
      Velox.alert({msg: 'oversize', args: [size]});
    } else if (size < 1024 * 1024 * 100) { // 100MB
      this._download(form);
    } else {
      size = this._getSize(size);
      Velox.confirm({msg: 'download', args: [selected, size]}, this._download.bind(this, form));
    }
  },

  copy: function(form) {
    // remove dialog   
    Velox.modal.update('');
    Velox.overlay.removeClassName('no-spinner').update('<p class="message">Copying...</p>');

    if (!form.serialize) form = $(form);

    new Ajax.Request(form.action, {
      method: form.method,
      parameters: Object.extend(form.serialize(true), {
        ids: this.serializeSelectedAsPlainText()
      }),
      onSuccess: function() {
        Velox.emit('notifyNewItem', selected, form.where.value);
      }.bind(this),
      onComplete: function() {
        Velox.hideDialog();
      }
    });

    return false;
  },
  
  copySelectedTo: function() {
    if (!Velox.active('copy') || this._checkOverlength()) return;

    Velox.modal.visible() && Velox.hideDialog();
    Velox.showDialog(this.filesUrl + "copy");
  },
  
  showReceiveLink: function() {
    if (!Velox.active('receive') || this.activatedTrash) return;

    Velox.modal.visible() && Velox.hideDialog();
    Velox.showDialog(this.deliveryUrl + 'receive_link')
  },

  showManageBox: function() {
    if (!Velox.active('managebox') || this.activatedTrash) return;

    Velox.modal.visible() && Velox.hideDialog();
    Velox.showDialog('/boxes/' + this.options.boxId + '/edit')
  },

  /* Preview */
  preview: function(id, hidePanel) {
    if (!Velox.active('preview') && !id) return;

    if (hidePanel !== false) Velox.hidePanels();
    if (!id) id = this.previews[0].id.split('_')[1];
    console.log('Assets.preview', id);

    this.updateMenu.cancel();
    $('preview-button').addClassName("panel");

    Velox.showDialog({
      action: this.filesUrl + 'preview/' + id + '?t=' + new Date().getTime(),
      parameters: {layout: !Velox.modal.visible()},
      onSuccess: function(req) {
        Event._observeShortcuts = true;
        Velox.modal.show();
      },
      onComplete: function() {
        if (this.paginator) this.paginator.dispatch();
        this.paginator = new Paginator('preview', this.getSelected().indexOf(this.previews[0]));
      }.bind(this)
    }, ' ');
  },

  updatePreview: function() {
    if (!Velox.overlay || !this.paginator || !this.previews.length) return;

    var id = this.previews[0].id.split('_')[1];
    console.log('Assets.updatePreview', id);

    Velox.overlay.removeClassName('no-spinner');
    $("preview-panel-content").update('');

    Velox.pageTracker(this.filesUrl + 'preview/' + id);
    new Ajax.Updater("preview-panel-content", this.filesUrl + 'preview/' + id + '?t=' + new Date().getTime(), {
      method: "get",
      evalScripts: true,
      parameters: {layout: false}
    });
  },

  resizeDoc: function(winWidth, winHeight) {
    return;
    
    var embeddedDoc = $('embedded_doc');
    if (!embeddedDoc) return;
    
    embeddedDoc.setStyle({
      marginLeft: -(embeddedDoc.getWidth() / 2) + 'px',
      marginTop: -(embeddedDoc.getHeight() / 2) - 40 + 'px'
    });
  },

  resizePreview: function(winWidth, winHeight, previewImg) {
    if (previewImg) {
      this.previewImageSize = {
        width: previewImg.getWidth(),
        height: previewImg.getHeight()
      };
    } else {
      previewImg = $('preview');
    }

    if (!previewImg || !previewImg.visible()) return;

    var imgWidth = this.previewImageSize.width
      , imgHeight = this.previewImageSize.height
      , viewPortWidth = winWidth;

    winWidth -= this.options.touch ? 20 : 320;
    winHeight -= this.options.touch ? 120 : 240;

    // resize for large image
    if (imgWidth > winWidth) {
      imgHeight = imgHeight * (winWidth / imgWidth);
      imgWidth = winWidth;
    } 
    if (imgHeight > winHeight) { 
      imgWidth = imgWidth * (winHeight / imgHeight);
      imgHeight = winHeight;
    }
    var imgTop = (winHeight - imgHeight) / 2 + (this.options.touch ? 10 : 30);

    previewImg.docTitle.setStyle({marginTop: '-' + (imgHeight - (this.options.touch ? 10 : 50)) + 'px', display: 'block'});
    previewImg.imgBorder.setStyle({width: imgWidth + 'px', padding: '0 ' + viewPortWidth + 'px', height: imgHeight * 2 + 'px', paddingTop: imgTop + 'px'});
    previewImg.left = previewImg.imgWrapper.scrollLeft = viewPortWidth - (viewPortWidth - imgWidth) / 2;
    previewImg.width = imgWidth;
    previewImg.height = imgHeight;
  
  },

  /* Panels */
  panel: function(panelName, html) {
    var buttonName = panelName + "-button";
    Velox.panel(panelName + "-panel", html);
    $(buttonName).addClassName("panel");

    if (panelName == "edit") {
      if (this.paginator) this.paginator.dispatch();
      this.paginator = new Paginator(panelName);
    }
  },

  showHideBlock: function(el) {
    if (!this._hideBlocks) this._hideBlocks = new Array(3);

    el.toggleClassName('closed');
    el.up('.block').down('.metadata-contents').toggle();

    this._hideBlocks[2 - el.up('.block').nextSiblings().length] = el.hasClassName('closed');

    return false;
  },

  showEditPanel: function(update) {
    if (!Velox.active("edit")) return;

    update = update === true;
    console.log('Assets.showEditPanel', update);

    if ($("edit-panel").visible() && !update) Velox.hidePanels()
    else {
      Velox.pageTracker(this.filesUrl + "edit/" + this.lastSelectId());
      new Ajax.Updater("edit-panel" + (update ? '-content' : ''), this.filesUrl + "edit/" + this.lastSelectId(), {
        method: "get",
        evalScripts: update,
        parameters: {layout: !update},
        onComplete: function(req) {
          Assets.panel("edit", req.responseText);
          //Assets.updateMenu();
        }
      });
    }
  },

  showTagsPanel: function(update) {
    if (!Velox.active('tags') || this._checkOverlength()) return;

    update = update === true;
    console.log('Assets.showTagsPanel', update);

    if ($('tags-panel').visible() && !update) Velox.hidePanels()
    else {
      !update && Velox.pageTracker(this.tagsUrl);
      new Ajax.Updater('tags-panel'  + (update ? '-content' : ''), this.tagsUrl, {
        method: 'get',
        evalScripts: update,
        parameters: {
          layout: !update,
          ids: this.serializeSelectedAsPlainText()
        },
        onComplete: function(req) {
          Assets.panel('tags', req.responseText);
        }
      });
    }
  },

  showSharePanel: function(update) {
    if (!Velox.active("share") || this._checkOverlength()) return;

    update = update === true;
    console.log('Assets.showSharePanel', update);

    if ($("share-panel").visible() && !update) Velox.hidePanels()
    else {
      !update && Velox.pageTracker(this.deliveryUrl + "share");
      new Ajax.Updater("share-panel" + (update ? '-content' : ''), this.deliveryUrl + "share", {
        method: "get",
        evalScripts: update,
        parameters: {layout: !update, ids: this.serializeSelectedAsPlainText()},
        onComplete: function(req) {
          Assets.panel("share", req.responseText);
          //Assets.updateMenu();
        }
      });
    }
  },

  _showShareResultDialog: function(form) {
    // remove share link
    if ($('remove_link').value == '1') {
      new Ajax.Request(form.action, {
        method: form.method,
        parameters: form.serialize(),
        onCreate: function() {
          Velox.showWaiting("Deleting...");
        },
        onComplete: function() {
          Velox.hideWaiting();
          this.showSharePanel(true);
        }.bind(this)
      });
    } else {
      // show created result
      Velox.showDialog({
        action: form.action,
        method: form.method,
        parameters: form.serialize()
      }, "Creating...", function() {
        this.showSharePanel(true);
      }.bind(this));
    }
  },

  createShareLink: function(form) {
    if (Velox.modal.visible()) return false;  

    if (!form.serialize) form = $(form);
    console.log('Assets.createShareLink', form.serialize(true));

    var recipient = $('recipient').value.strip();
    if (recipient) {
      Velox.confirm({
        msg: 'sendemail',
        args: [recipient]
      }, {
        yes: function() {
          $('notify_link').value = 1;
          this._showShareResultDialog(form);
        }.bind(this),
        no: function() {
          this._showShareResultDialog(form);
        }.bind(this)
      });
    } else this._showShareResultDialog(form);

    return false;
  },

  /* Notes */
  initNoteDragAndDrop: function() {
    var dragging = false
      , self = this
      , target
      , offsetTop
      , offsetLeft;

    this.notesWrapper.delegate(".notepaper", "mousedown", function(event) {
      var el = event.element();
      this.style.zIndex = ++self.noteXIndex;
      if (el.hasClassName('handle')) {
        event.stop();
        dragging = true;
        el.addClassName('grabbing');
        target = this;
        offsetTop = event.clientY - target.offsetTop;
        offsetLeft = event.clientX - target.offsetLeft;
      }
    });

    $(document).observe("mousemove", function(event) {
      if (dragging) {
        event.stop();
        target.setStyle({
          top: event.clientY - offsetTop + 'px',
          left: event.clientX - offsetLeft + 'px'
        });        
      }
    });

    $(document).observe("mouseup", function(event) {
      if (target) {
        target.down('.handle').removeClassName('grabbing');
        dragging = false;
        target = null;
      }
    });
  },

  createNote: function() {
    if (!Velox.active("note") || this._checkOverlength()) return;

    var theme = {
        '0': 'yellow',
        '1': 'green',
        '2': 'red',
        '3': 'blue'
      }[(Math.random() * 3).round()]
      , rotate = {
        '0': '',
        '1': 'left',
        '2': 'right'
      }[(Math.random() * 2).round()];

    Velox.pageTracker(this.notesUrl + 'create');
    new Ajax.Request(this.notesUrl + 'create', {
      method: 'get',
      parameters: {
        theme: theme,
        rotate: rotate,
        top: (Math.random() * (this.contentPanel.offsetHeight - 200)).round() + this.contentPanel.offsetTop,
        left: (Math.random() * (this.contentPanel.offsetWidth - 300)).round() + this.contentPanel.offsetLeft,
        files: this.serializeSelectedAsPlainText()
      },
      onSuccess: function(req) {
        var note = new Element('div').insert(req.responseText).down();
        note.style.zIndex = ++this.noteXIndex;
        this.notesWrapper.insert(note);
      }.bind(this)
    });
  },

  updateNote: function(form) {
    var note = form.up('.notepaper');
    new Ajax.Request(form.action, {
      method: form.method,
      parameters: Object.extend(form.serialize(true), {
        left: note.offsetLeft,
        top: note.offsetTop
      }),
      onSuccess: function(req) {
        note.replace(req.responseText);
        Velox.emit('notifyNewItem', {
          count: 1,
          type: 'warn'
        });
      }
    });
    return false;
  },

  editNote: function(el) {
    var note = el.up('.notepaper');
    Velox.pageTracker(el.href);
    new Ajax.Request(el.href, {
      method: 'get',
      parameters: {
        left: note.offsetLeft,
        top: note.offsetTop
      },
      onSuccess: function(req) {
        note.replace(req.responseText);
      }
    });

    return false;
  },

  removeNote: function(el) {
    // cancel create
    if (!el.href) return el.up('.notepaper').remove();

    // save read
    new Ajax.Request(el.href, {
      onSuccess: function(req) {
        el.up('.notepaper').remove();
      }
    }); 

    return false; 
  },

  showNote: function(el, id) {    
    if ($('note_' + id)) return;

    Velox.pageTracker(el.href);
    new Ajax.Request(el.href, {
      method: 'get',
      onSuccess: function(req) {
        var note = new Element('div').insert(req.responseText).down();
        note.style.zIndex = ++this.noteXIndex;
        this.notesWrapper.insert(note);
      }.bind(this)
    });

    return false;
  },

  focusAttachItems: function(ids) {
    console.log('Assets.focusAttachItems', ids);
    this.unmark();
    var focused = null
      , length = ids.split(',').each(function(id, idx) {
        var doc = $('document_' + id);
        if (doc) Assets._select(doc);
        if (!focused) focused = doc;
      }).length;

    focused && this.updateMenu();
    // 수산한 페이지에 포커스가 없거나 첨부한 갯수와 선택 갯수가 맞지 않으면 스크롤(지워진 경우는 난 몰라)
    if (!focused || length != this.getSelectedAssetsCount()) focused = this.documents.last();
    this.mainPanel.scrollToAsset(focused);
  },

  repositionNotes: function(winWidth, winHeight) {
    var touch = this.options.touch;

    this.notesWrapper.select('.notepaper')._each(function(el) {
      if (!el.top && !el.left) {
        el.top = el.offsetTop;
        el.left = el.offsetLeft;
      }

      var style = {}
        , width = el.offsetWidth
        , height = el.offsetHeight
        , left = el.left
        , top = el.top;
      
      if (winHeight < top + height) style.top = winHeight - height - 30 + 'px';
      else if (100 > top) style.top = 130 + 'px';
      if (winWidth < left + width) style.left = winWidth - width - 30 + 'px';
      else if (200 > left && !touch) style.left = 230 + 'px';

      el.setStyle(style);
    });
  },

  /* Tags */
  updateManageTags: function() {
    Velox.pageTracker(this.tagsUrl + "manage");

    new Ajax.Updater({
      success: "managetags-panel",
      failure: "managetags-panel"
    }, this.tagsUrl + "manage", {
      method: 'get',
      evalScripts: true,
      onComplete: function(b) {
        Element.addClassName("adminbar_tags", "active");
        Event._observeShortcuts = false;
      }
    });
  },

  toggleManagetags: function() {
    if (this.activatedTemp) return;
    //$("managetags-button").toggleClassName('icon-lock').toggleClassName('icon-unlock');
    $("managetags-button").toggleClassName('active');

    var managetagsPanel = $("managetags-panel");
    if (!managetagsPanel.visible()) {
      managetagsPanel.show();
      this.updateManageTags();
    } else {
      managetagsPanel.hide();
      $("adminbar-container").hide();
      this.mainPanel.removeClassName("loading")

      if ($("tag_tag")) $("tag_tag").blur();
    }
  },

  toggleTagOnSelected: function(tagId) {
    if (this._checkOverlength()) return false;

    Element.hasClassName("edit_multi_" + tagId, "active") ?
      this.removeTagFromSelected(tagId, this.serializeSelectedAsPlainText()) :
      this.addTagToSelected(tagId, this.serializeSelectedAsPlainText())
  },

  addTagToSelected: function(tagId, fileIds) {
    new Ajax.Request(this.tagsUrl + "multiple_set_tag", {
      parameters: {tag: tagId, ids: fileIds},
      onSuccess: function(req) {
        $('tag_' + tagId).removeClassName('disable');
        this.filterPanel.select('.active-tag').length && fileIds.split(',')._each(function(id) {
          $('document_' + id).setOpacity(1);
        });
      }.bind(this)
    });
  },

  removeTagFromSelected: function(tagId, fileIds) {
    new Ajax.Request(this.tagsUrl + "multiple_unset_tag", {
      parameters: {
        tag: tagId,
        ids: fileIds
      },
      onSuccess: function() {
        this.filterPanel.select('.active-tag').length && fileIds.split(',')._each(function(id) {
          $('document_' + id).setOpacity(0.5);
        });
      }.bind(this)
    });
  },

  resetTags: function() {
    if (!Velox.active('resettags')) return;
    this.disableButtons(["add", "refresh"]);
    new Ajax.Request(this.tagsUrl + "reset");
    this.disableButtons(["resettags"]);
  },

  updateFilterMenu: function(enable) {
    console.log('Assets.updateFilterMenu', enable);

    if (enable) {
      this.enableButtons(["resettags", "toggletags"]);
    } else {
      this.disableButtons(["resettags", "toggletags"]);
    }
  },

  toggleTagFilter: function(el, id) {
    if (this.filterPanel.hasClassName('busy')) return;

    var filters = []
      , params = {}
      , type = el.className.match('autotag') ? 'autotag' : 'tag'
      , selected = el.hasClassName('active-' + type);

    if (el.hasClassName('disable') && !selected) return;

    if (type == 'autotag') {
      if (id.match(/today|lastweek/)) $$('#autotag_today, #autotag_lastweek').invoke('writeAttribute', 'class', 'autotag');
      if (id.match(/documents|media/)) $$('#autotag_documents, #autotag_media').invoke('writeAttribute', 'class', 'autotag');      
    }

    if (!selected) filters.push(id);
    else el.writeAttribute('class', type);

    $$('#' + (type == 'tag' ? 'document' : 'auto') + '_tags > div.active-' + type)._each(function(el) {
      filters.push(el.id.split('_')[1]);
    });

    this.updateFilterMenu(filters.length || this.filterPanel.select('.active-' + (type == 'tag' ? 'autotag' : 'tag')).length);
    this.disableButtons(["add", "refresh"]);
    this.stopImageLoading();
    this.filterPanel.addClassName('busy');

    params[type == 'tag' ? 'usertags' : 'autotags'] = filters.join(',');
    new Ajax.Request(this.tagsUrl + type + "_filter_toggle", {parameters: params});
  },

  /* Trash */
  toggleTrash: function(activated) {
    console.log('Assets.toggleTrash');

    // Velox.toggleToolbar();
    if (Object.isUndefined(activated)) activated = $('autotag_deleted').hasClassName('active-autotag');
    this.activatedTrash = activated;

    $$('#add-button, #download-button, #copy-button, #trash-button, #tags-button, #edit-button, #share-button, #receive-button, #note-button, #managearchives-button, #managebox-button').invoke(activated ? 'hide' : 'show');
    $$('#restore-button, #delete-button, #deleteall-button').invoke(activated ? 'show' : 'hide');
    $('preview-button')[(activated ? 'add' : 'remove') + 'ClassName']('round');
  },

  _processTrash: function(action, message) {
    new Ajax.Request(this.filesUrl + action, {
      parameters: {
        ids: this.serializeSelectedAsPlainText()
      },
      onCreate: function() {
        Velox.showWaiting(message);
      },
      onComplete: function() {
        Velox.hideWaiting();
        Velox.hidePanels();
      },
      onSuccess: function() {
        var selected = this.getSelected();
        selected._each(function(el) {
          el.remove();
          Assets.documents.splice(Assets.documents.indexOf(el), 1);
        });
    
        action != 'delete' && Velox.emit('notifyNewItem', selected.length);
    
        this.selected = [];
        this.setAssetsCount(this.totalCount - selected.length);
        this.render();
        this.updateMenu();
      }.bind(this)
    });
  },

  restoreSelected: function() {
    var selected = this.getSelectedAssetsCount();
    if (selected == 0 || !Velox.active('restore') || this._checkOverlength()) return;

    Velox.confirm({msg: 'restore', args: [selected]}, function() {
      this._processTrash('restore', 'Restoring...');
    }.bind(this));
  },

  trashSelected: function() {
    var selected = this.getSelectedAssetsCount();
    if (selected == 0 || !Velox.active('trash') || this._checkOverlength()) return;

    Velox.confirm({msg: 'trash', args: [selected]}, function() {
      this._processTrash('trash', 'Trashing...');
    }.bind(this));
  },

  deleteSelected: function() {
    var selected = this.getSelectedAssetsCount();
    if (selected == 0 || !Velox.active('delete') || this._checkOverlength()) return;

    Velox.confirm({msg: 'delete', args: [selected]}, function() {
      this._processTrash('delete', 'Deleting...');
    }.bind(this));
  },

  deleteAll: function() {
    if (!Velox.active('deleteall')) return;

    Velox.confirm('deleteall', function() {
      new Ajax.Request(this.filesUrl + "delete_all", {
        onCreate: function() {
          Velox.showWaiting("Deleting...");
        },
        onComplete: function() {
          Velox.hideWaiting();
          Velox.hidePanels();
        },
        onSuccess: function() {
          this.nothingHappened = true;
          this.refresh();
        }.bind(this)
      });
    }.bind(this));
  }
};


/* AssetsLoader */
var AssetsLoader = {
  initialize: function() {
    this.currentPage = 1;
    this.checkDebounced = this.check.bindAsEventListener(this).debounce(500);
    Assets.mainPanel.observe("scroll", this.checkDebounced);
    this.checkDebounced();
  },
  check: function() {
    Assets.viewScrolledDown = (this.scrollDistanceFromTop() > 0) ? true : false;

    if (this.loading || !$("next-assets") || !Assets.contentPanel.visible()) return false;

    if (this.scrollDistanceFromBottom() < 80) {
      new Ajax.Request(Assets.baseUrl + "list?" + t(), {
        method: "get",
        parameters: {
          page: this.currentPage
        },
        onCreate: function() {
          this.loading = true
        }.bind(this),
        onSuccess: function(a) {
          this.currentPage++;
          this.loading = false;
          Assets.initAfterLoad(a.responseText);
          if ($("next-assets")) this.checkDebounced();
        }.bind(this),
        onFailure: function(a) {
          this.loading = false;
          Assets.initAfterLoad(a.responseText.split('<body>')[1].split('</body>')[0]);
        }.bind(this)
      })
    }
  },
  scrollDistanceFromTop: function() {
    return Assets.mainPanel.cumulativeScrollOffset()[1]
  },
  scrollDistanceFromBottom: function() {
    return Assets.assetsList.getHeight() - (Assets.mainPanel.cumulativeScrollOffset()[1] + Assets.mainPanel.getHeight())
  }
};


/* Paginator */
var Paginator = Class.create({
  initialize: function(mode, idx) {
    console.info('Paginator', mode, idx);

    this.mode = mode;

    this.getAssetsIds();
    this.currentAsset = Assets.currentDocument();
    this.currentIdx = (Assets.getSelectedAssetsCount() > 1) ? idx || 0 : Assets.documents.indexOf($("document_" + this.currentAsset));
    this.updatePageInfo(this.currentIdx);
    this.prevEventListener = this.switchToPrevious.bindAsEventListener(this);
    this.nextEventListener = this.switchToNext.bindAsEventListener(this);
    this.updateAssetsListener = this.getAssetsIds.bindAsEventListener(this);
    this.switchAssetListener = this.switchAsset.bindAsEventListener(this);
    this.updateStateDebounced = this.updateState.bind(this).debounce(200);

    $(mode + "-paging-previous").observe("click", this.prevEventListener);
    $(mode + "-paging-next").observe("click", this.nextEventListener);
    $(document).observe("assets:updated", this.updateAssetsListener);
    $(document).observe("assets:switched", this.switchAssetListener);
  },

  getAssetsIds: function() {
    var selection = Assets.getSelected();
    var assets = (selection.length > 1) ? selection : Assets.documents;
    this.assetsIds = assets.collect(function(el) {
      return el.id.split("_")[1]
    })
  },

  getTotalAssetsCount: function() {
    var selectedCount = Assets.getSelectedAssetsCount();
    return(selectedCount > 1) ? selectedCount : Assets.getAssetsCount()
  },

  switchToPrevious: function(event) {
    event && event.stop();

    var idx = null
      , wrap = null
      , current = this.currentIdx;

    if (this.mode == 'preview') {
      for (var i = this.assetsIds.length - 1; i >= 0; i--) {
        if (!$('document_' + this.assetsIds[i]).hasClassName('with-preview')) continue;
        if (current > i) { idx = i; break; }
        else if (wrap === null) wrap = i;
      }
      if (idx === null && wrap !== null) idx = wrap;
    } else idx = this.currentIdx - 1;
    
    if (idx < 0) {
      if (Assets.getSelectedAssetsCount() == 1) return;
      else idx = this.getTotalAssetsCount() - 1;
    }
    this.switchTo(idx)
  },

  switchToNext: function(event) {
    event && event.stop();

    var idx = null
      , wrap = null
      , current = this.currentIdx;

    if (this.mode == 'preview') {
      for (var i = 0; i < this.assetsIds.length; i++) {
        if (!$('document_' + this.assetsIds[i]).hasClassName('with-preview')) continue;
        if (current < i) { idx = i; break; }
        else if (wrap === null) wrap = i;
      }
      if (idx === null && wrap !== null) idx = wrap;
    } else idx = this.currentIdx + 1;

    //? Assets.documents.indexOf($('document_' + this.assetsIds[this.currentIdx]).next('.with-preview').id.split('_')[1]);
    if (idx > this.getTotalAssetsCount() - 1) {
      if (Assets.getSelectedAssetsCount() == 1) return;
      else idx = 0;
    }
    this.switchTo(idx);
  },

  switchAsset: function(event) {
    var idx = Assets.documents.indexOf($("document_" + event.memo.currentAssetId));
    this.currentIdx = idx;
    this.updatePageInfo(idx);
  },

  switchTo: function(idx) {
    this.currentIdx = idx;
    this.updatePageInfo(idx);
    this.updateStateDebounced(idx);
  },

  updateState: function(a) {
    if (Assets.getSelectedAssetsCount() != 1) return;

    console.log('Paginator.updateState', a);
    Assets._unselect($("document_" + Assets.currentDocument()));
    var b = $("document_" + this.assetsIds[a]);
    
    Assets._select(b);
    Assets.mainPanel.scrollToAsset(b);
    Assets.updateMenu();
  },

  updatePageInfo: function(idx) {
    var paging = $(this.mode + "-paging-position"); 

    paging.update((idx + 1) + "/" + this.getTotalAssetsCount());
    if (Assets.getSelectedAssetsCount() == 1) {
      if (idx == 0) $(this.mode + "-paging-previous").addClassName("disabled");
      else $(this.mode + "-paging-previous").removeClassName("disabled");

      if (idx == this.getTotalAssetsCount() - 1) $(this.mode + "-paging-next").addClassName("disabled");
      else $(this.mode + "-paging-next").removeClassName("disabled");
    }
  },

  dispatch: function() {
    $(this.mode + "-paging-previous").stopObserving("click", this.prevEventListener);
    $(this.mode + "-paging-next").stopObserving("click", this.nextEventListener);      
    $(document).stopObserving("assets:updated", this.updateAssetsListener);
    $(document).stopObserving("assets:switched", this.switchAssetListener)
    Assets.paginator = null;
  }
});

/**
 * Touchswipe Class
 */
var TouchSwipe = Class.create({initialize: function(element, options) {
  var isMoving = false
    , startX
    , startY
    , distX
    , distY
    , startTime
    , direction
    , options = Object.extend({
        timeLimit: 500
      , stopEvents: true
      , axis: null
      , minX: document.viewport.getWidth() / 2
      , minY: document.viewport.getHeight() / 2
      , onSwipe: Prototype.emptyFunction
    }, options);

  if ('ontouchstart' in document.documentElement) {
    element.addEventListener('touchstart', onTouchStart, false);
    element.addEventListener('touchend', onTouchEnd, false);
    element.addEventListener('gesturestart', cancelTouch, false);
  } else {
    return console.error('Not supported');
  }

  this.cancel = cancelTouch;
  this.setOption = function(options) {
    options = Object.extend({
        timeLimit: 500
      , stopEvents: true
      , axis: null
      , minX: document.viewport.getWidth() / 2
      , minY: document.viewport.getHeight() / 2
      , onSwipe: Prototype.emptyFunction
    }, options);
  };

  function onTouchStart(event) {
    if (event.touches.length != 1) return;
    if (options.stopEvents) event.preventDefault();

    isMoving = true;
    startTime = new Date;
    distX = distY = direction = null;
    startX = event.touches[0].pageX;
    startY = event.touches[0].pageY;

    //console.log('TouchSwipe.onTouchStart', startX, startY);
    element.addEventListener('touchmove', onTouchMove, false);
  }

  function onTouchEnd(event) {
    if (distX && distY) {
      var diff = new Date - startTime;
      if (diff < options.timeLimit) {
        var bonus = (options.timeLimit - diff) / 50;
        distX *= bonus;
        distY *= bonus;
      }
      
      if (options.axis != 'y' && (distX).abs() >= options.minX && (options.axis == 'x' || (distY).abs() < options.minY)) {
        direction = distX > 0 && 'left' || 'right'; 
      } else
      if (options.axis != 'x' && (distY).abs() >= options.minY && (options.axis == 'y' || (distX).abs() < options.minX)) {
        direction = distY > 0 && 'down' || 'up'; 
      }
    }

    //console.log('onTouchEnd', direction, distX, distY);
    if (direction) options.onSwipe(event, direction);
    else cancelTouch(event);

    element.removeEventListener('TouchSwipe.touchmove', onTouchMove);
    isMoving = false;
  }

  function onTouchMove(event) {
    if (isMoving) {
      distX = startX - event.touches[0].pageX
      distY = startY - event.touches[0].pageY;
    }
  }

  function cancelTouch(event) {
    if (!event) event = new Event;
    //console.log('TouchSwipe.cancelTouch');
    options.onSwipe(event);
  } 
}});