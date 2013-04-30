/*!
 * Velox - archives.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

var Archives = {
  baseUrl: '/boxes/',
  assetsUrl: "/assets/",
  deliveryUrl: "/delivery/",

  documents: [],
  selected: [],

  totalCount: 0,

  options: {
    viewType: "thumbs",
    touch: (!(typeof Modernizr === "undefined") && Modernizr.touch)
  },

  // initialization
  initialize: function(options) {
    Object.extend(this.options, options || {});

    this.mainPanel = $('archives-panel');

    if (this.options.touch) Velox.createDropdownButton('archives');
    if (this.options.viewType == "list") this.showList();
    else this.showThumbs();

    this.initObservers();
    this.initShortcuts();
    this.refresh();

    this.inited = true;
  },

  initObservers: function() {
    this.mainPanel.observe("view:changed", function() {
      Velox.resize();
    });

    if (this.options.touch) {
      this.markDocument = this.markDocumentToggle;
      $("archives-container").delegate(".box", 'touchend', function(event){
        var id = this.id.split("_")[1]
          , now = new Date().getTime()
          , lastTouch = this.lastTouch || now + 1
          , delta = now - lastTouch;
  
        if (delta < 500 && delta > 0){
          if (!Archives.getSelectedAssetsCount()) Archives.markDocument(event, id);
          Archives.browseBox(id);
        }
  
        this.lastTouch = now;
      });
    }

    $("archives-container").delegate(".box", "click", function(event) {
      Archives.markDocument(event, this.id.split("_")[1])
    });

    $("archives-container").delegate(".box", "dblclick", function(event) {
      event.stop();
      Archives.browseBox(this.id.split("_")[1]);
    });

    this.mainPanel.observe("click", function(event) {
      Archives.unmark();
      Archives.updateMenu();
      //Velox.hidePanels();
    });
  },

  initShortcuts: function() {
    Event.registerShortcut('A', this.createBox.bind(this));       // A = Create Box (Add)
    Event.registerShortcut('E', this.editBox.bind(this));         // E = Edit Panle

    // RETURN = Deafult Action
    Event.registerShortcut(Event.KEY_RETURN, this.browseBox.bind(this));

    // DELETE = Remove/Archive/Delete Selected
    Event.registerShortcut(Event.KEY_DELETE, function(event) {
      if (!this.getSelected().length) return;
      if (Velox.active('remove')) this.removeSelected();
      else this.deleteSelected();
    }.bind(this));

    Velox.initKeyboardNavigation(this);
  },

  /* Selectors */
  resetAssets: function() {
    this.documents = [];
    this.assetsIds = [];
    this.selected = [];
  },

  getSelected: function() {
    return this.selected.findAll(function(el) {
      return el;
    });
  },

  getSelectedAssetsCount: function() {
    return this.getSelected().length;
  },

  serializeSelectedAsPlainText: function() {
    return this.getSelected().map(function(el) {
      return encodeURIComponent(el.id.split("_")[1]);
    }).join(",");
  },

  currentDocument: function() {
    return((this.getSelectedAssetsCount() == 1) ? this.getSelected()[0].id.split("_")[1] : 0)
  },

  getRemoves: function() {
    return this.getSelected().reject(function(el) {
      return el.hasClassName("owned") && !el.hasClassName('activated')
    });
  },

  getOwns: function() {
    return this.getSelected().reject(function(el) {
      return !el.hasClassName("owned")
    });
  },

  unmark: function() {
    this.getSelected()._each(function(el) {
      el.removeClassName("selected")
    });

    this.selected = this.documents.map(function() {
      return false
    });
  },

  _select: function(el) {
    if (!el.id.split("_")[1]) return;
    this.selected[this.documents.indexOf(el)] = this.lastSelect = el.addClassName("selected");
  },

  _unselect: function(el) {
    this.selected[this.documents.indexOf(el)] = false;
    Element.removeClassName(el, "selected");
  },

  markDocument: function(event, id) {
    this.mainPanel.fire("asset:clicked");
    //Velox.hidePanels();
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) this.unmark();

    var box = $("box_" + id);
    if (!event.shiftKey && this.selected.include(box)) this._unselect(box);
    else this._select(box);

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
    var box = $("box_" + id);
    if (this.selected.include(box)) this._unselect(box);
    else this._select(box);
    this.updateMenu();
    event.stop();
  },

  switchBy: function(pos, event) {
    //if (this.getSelectedAssetsCount() != 1) return;
    //console.log('Archives.switchBy', pos);
    event && event.stop();

    if (this.getSelectedAssetsCount() >= 1) {
      this.selected.each(this._unselect.bind(this));
      this._select(this.lastSelect);
    }

    var currentIdx = this.assetsIds.indexOf(this.currentDocument())
      , nextIdx = currentIdx + pos;

    if (0 > nextIdx || nextIdx >= this.assetsIds.length) return;

    var nextAsset = $("box_" + this.assetsIds[nextIdx]);
    if (nextAsset) {
      this._unselect($("box_" + this.currentDocument()));
      this._select(nextAsset);
      this.mainPanel.scrollToAsset(nextAsset);
    }

    $(document).fire("assets:switched", {
      currentAssetId: this.currentDocument()
    });

    this.updateMenu();
  },

  /* Updater */
  initAfterLoad: function() {
    var ul = $("archives-container").down("ul");
    if (ul) {
      ul.select(".box").each(function(el) {
        this.documents.push(el);
        this.assetsIds.push(el.id.split("_")[1]);
        el.hasClassName("selected") && this.selected.push(el);
      }.bind(this));
    }

    document.fire("assets:updated");
  },

  refresh: function() {
    this.disableButtons(["add", "refresh"]);

    new Ajax.Updater("archives-container", this.baseUrl + "list?" + t(), {
      method: 'get',
      evalScripts:true,
      onComplete: function() {
        this.enableButtons(["add", "refresh"]);
      }.bind(this)
    });
  },

  _updateButtonsClassName: function(buttons, action) {
    $A(buttons)._each(function(button) {
      $(button + '-button')[action + "ClassName"]("active");
    });
  },

  enableButtons: function(buttons) {
    this._updateButtonsClassName(buttons, "add");
  },

  disableButtons: function(buttons) {
    this._updateButtonsClassName(buttons, "remove");
  },

  updateMenu: function() {
    console.log('updateMenu');

    var selected = this.getSelected()
      , removes = this.getRemoves()
      , owns = this.getOwns();

    //console.log('on changes elect actions', a);

    if ($$('#filter-panel .active-autotag').length) {
      this.enableButtons(["resettags", "toggletags"]);
    } else {
      this.disableButtons(["resettags", "toggletags"]);
    }

    if (this.documents.length == 0 || selected.length == 0) {
      this.disableButtons(["browse", "receive", "edit", "remove", "delete", "restore"]);
    } else {
      // 선택한 문서가 한개
      if (this.documents.length == 1 || selected.length == 1) {
        this.enableButtons(["browse"]);
        // 선택한 문서가 활성화
        this[(selected[0].hasClassName('activated') ? "enable" : "disable") + "Buttons"](["receive"]);
        // 선택한 문서가 자신이 주최
        this[(owns.length ? "enable" : "disable") + "Buttons"](["edit"]);
      }
      else this.disableButtons(["browse", "edit", "receive"]);

      this[(owns.length == selected.length && !removes.length? "enable" : "disable") + "Buttons"](["restore", "delete"]);
      this[(removes.length == selected.length ? "enable" : "disable") + "Buttons"](["remove"]);
    }

    this.updateSelectionInfo(selected.length, this.getAssetsCount());
  },

  updateSelectionInfo: function(count, total) {
    var reg = /(^[+-]?\d+)(\d{3})/;   // 정규식
    total += '';                      // 숫자를 문자열로 변환
  
    while (reg.test(total))
      total = total.replace(reg, '$1' + ',' + '$2');
   
    var el = $("selection-info");
    if (!count) el.update(total + " items");
    else el.update(count + " of " + total + " selected");
  },

  setAssetsCount: function(count) {
    this.totalCount = count;
  },

  getAssetsCount: function() {
    return this.totalCount;
  },

  showThumbs: function() {
    Element.addClassName("view-big-thumbs-button", "active");
    Element.removeClassName("view-list-button", "active");
    Element.removeClassName("archives-panel", "view-list");
    Element.addClassName("archives-panel", "view-thumbs");

    this.mainPanel.fire("view:changed", {viewType: "thumbs"});
    this.options.viewType = "thumbs";
  },

  showList: function() {
    //Element.hide("zoombar");
    Element.addClassName("view-list-button", "active");
    Element.removeClassName("view-big-thumbs-button", "active");
    Element.removeClassName("archives-panel", "view-thumbs");
    Element.addClassName("archives-panel", "view-list");

    this.mainPanel.fire("view:changed", {viewType: "list"});
    this.options.viewType = "list";
  },

  /* Tags */
  toggleAutotagFilter: function(id) {
    if (this.inUploadProgress) return;

    var autotags = []
      , current = $('autotag_' + id)
      , selected = current.hasClassName('active-autotag');

    if (current.hasClassName('disable') && !selected) return;

    if (id.match(/activated|deactivated/)) $$('#autotag_activated, #autotag_deactivated').invoke('writeAttribute', 'class', 'autotag');
    if (id.match(/owned|invited/)) $$('#autotag_owned, #autotag_invited').invoke('writeAttribute', 'class', 'autotag');
  
    if (!selected) autotags.push(id);
    else current.writeAttribute('class', 'autotag');

    $$('#auto_tags > div.active-autotag').each(function(el) {
      autotags.push(el.id.split('_')[1]);
    });

    autotags.each(function(tagname) {
      $('autotag_' + tagname).addClassName('active-autotag');
    });

    var visibles = [];
    this.documents.each(function(el) {
      var count = 0;
      autotags.each(function(tagname) {
        if (el.hasClassName(tagname)) count++;
      });
      
      if (!autotags.length || autotags.length == count) visibles.push(el.show());
      else el.hide();
    }.bind(this));

    this.unmark();
    this.resetAssets();
    this.initAfterLoad();
    this.updateMenu();

    $('no-boxes')[visibles.length ? 'hide' : 'show']();
  },

  resetTags: function() {
    if (!Velox.active('resettags')) return;

    $$('#auto_tags > div.active-autotag').each(function(el) {
      el.writeAttribute('class', 'autotag');
    });

    this.documents.each(function(el) {
      el.show();
    }.bind(this));

    this.unmark();
    this.resetAssets();
    this.initAfterLoad();
    this.updateMenu();
  },

  /* Acctions */
  removeSelected: function() {
    var selected = this.getSelected()
      , count = selected.length
      , type = "leavebox"
      , owns = this.getOwns();

    if (!this.getSelectedAssetsCount() || !Velox.active('remove')) return;

    if (owns.length) {
      if (owns.length == count) type = "deactivebox";
      else type = "closebox";
    }

    Velox.confirm({msg: type, args: [count]}, function() {
      selected.each(function(el, idx) {
        Velox.removeBox(el.id.split('_')[1], function() {
          idx + 1 == count && Archives.refresh();
        });
      });
    });
  },

  _removeBox: function(target) {
    if (target.hasClassName('owned')) {
      target.removeClassName('activated').addClassName('deactivated').down('.status-badge').remove();
    } else {
      target.remove();
      this.documents.splice(Archives.documents.indexOf(target), 1);          
    }
  },

  restoreSelected: function() {
    var count = this.getSelectedAssetsCount();
    if (!this.getSelectedAssetsCount() || !Velox.active('restore')) return;
    
    Velox.confirm({msg: 'restorebox', args: [count]}, function() {
      new Ajax.Request(this.baseUrl + "restore", {
        parameters: {
          ids: this.serializeSelectedAsPlainText()
        },
        onCreate: function() {
          Velox.showWaiting("Restoring...");
        },
        onComplete: function() {
          Velox.hideWaiting();
          Velox.hidePanels();
        },
        onSuccess: function() {
          this.getSelected().each(function(el) {
            el.removeClassName('deactivated').addClassName('activated')
              .insert('<p class="status-badge">Activated</p>')
              .down('h4').addClassName('icon-folder-open').removeClassName('icon-folder-close');
  
            el.select('.members span')._each(function(member) {
              Velox.emit('addBox', {
                owner: false,
                boxId: el.id.split('_')[1],
                name: el.down('h4').innerHTML.strip()
              }, member.id.split('_')[1]);
            });
  
            Velox.addBox(null, {
              owner: true,
              boxId: el.id.split('_')[1],
              name: el.down('h4').innerHTML.strip()
            });
          });
  
          this.updateMenu();
        }.bind(this),
        onFailure: function() {
          alert("Sorry, but selected items couldn't be restore now. Please try again and if it happens again, please contact us at support@thevelox.com");
        }
      });
    }.bind(this));
  },

  deleteSelected: function() {
    var count = this.getSelectedAssetsCount();
    if (!this.getSelectedAssetsCount() || !Velox.active('delete')) return;

    Velox.confirm({msg: 'deletebox', args: [count]}, function() {
      new Ajax.Request(this.baseUrl + "delete", {
        parameters: {
          ids: this.serializeSelectedAsPlainText()
        },
        onCreate: function() {
          Velox.showWaiting("Deleting...");
        },
        onComplete: function() {
          Velox.hideWaiting();
          Velox.hidePanels();
        },
        onSuccess: function() {
          var selected = this.getSelected();
          selected.each(function(el) {
            el.remove();
            this.documents.splice(this.documents.indexOf(el), 1)
          }.bind(this));
  
          this.selected = [];
          this.setAssetsCount(this.totalCount - selected.length);
          this.updateMenu();
  
        }.bind(this),
        onFailure: function() {
          alert("Sorry, but selected items couldn't be deleted now. Please try again and if it happens again, please contact us at support@thevelox.com.");
        }
      });
    }.bind(this));
  },

  browseBox: function(id) {
    if (!this.getSelectedAssetsCount() || !Velox.active('browse')) return;
    if (!Object.isString(id)) id = null;
    location.href = this.assetsUrl + (id || this.serializeSelectedAsPlainText());
  },

  showReceiveLink: function() {
    if (!this.getSelectedAssetsCount() || !Velox.active('receive')) return;
    Velox.showDialog(this.deliveryUrl + (this.serializeSelectedAsPlainText()) + '/receive_link')
  },

  createBox: function() {
    if ($$('.tab.project').length > 4) return alert($('add-button').readAttribute('data-message'));
    Velox.showDialog(this.baseUrl + 'create');
  },

  editBox: function() {
    if (!this.getSelectedAssetsCount() || !Velox.active('edit')) return;
    Velox.showDialog(this.baseUrl + (this.serializeSelectedAsPlainText()) + '/edit')
  }
};