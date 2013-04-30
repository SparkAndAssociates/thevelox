/*!
 * Velox - extensions.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

if (!window.console) console = {
  log: Prototype.emptyFunction,
  info: Prototype.emptyFunction,
  warn: Prototype.emptyFunction,
  error: Prototype.emptyFunction
};

/* i18n */
var I18n = {
  defaultLanguage: "en",
  currentLanguage: "en",
  locales: {},
  template: function(text, data, settings) {
    settings = Object.extend({
      evaluate    : /<%([\s\S]+?)%>/g,
      interpolate : /<%=([\s\S]+?)%>/g,
      escape      : /<%-([\s\S]+?)%>/g
    }, settings);
  
    var self = this;

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || /(.)^/).source,
      (settings.interpolate || /(.)^/).source,
      (settings.evaluate || /(.)^/).source
    ].join('|') + '|$', 'g');
  
    var escapes = {
      "'":      "'",
      '\\':     '\\',
      '\r':     'r',
      '\n':     'n',
      '\t':     't',
      '\u2028': 'u2028',
      '\u2029': 'u2029'
    };
  
    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(/\\|'|\r|\n|\t|\u2028|\u2029/g, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";
  
    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
  
    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";
  
    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }
  
    var func = function(obj) {
      if (obj instanceof _) return obj;
      if (!(this instanceof _)) return new _(obj);
      this._wrapped = obj;
    }
  
    if (data) return render(data, func);
    var template = function(data) {
      return render.call(this, data, func);
    };
  
    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';
  
    return template;
  },
  translate: function(b, a) {
    var c = this.locales[this.currentLanguage][b];
    if(a == undefined) {
      return c
    } else {
      return this.template(c, a)
    }
  },
  t: function(b, a) {
    return this.translate(b, a)
  }
};


/* Modernizr */
 
window.Modernizr = (function(aj, ai, ah) {
  function O() {
    af.input = function(e) {
      for(var d = 0, f = e.length; d < f; d++) {
        Q[e[d]] = e[d] in Y
      }
      return Q
    }("autocomplete autofocus list placeholder max min multiple pattern required step".split(" ")), af.inputtypes = function(b) {
      for(var l = 0, k, j, g, c = b.length; l < c; l++) {
        Y.setAttribute("type", j = b[l]), k = Y.type !== "text", k && (Y.value = X, Y.style.cssText = "position:absolute;visibility:hidden;", /^range$/.test(j) && Y.style.WebkitAppearance !== ah ? (ad.appendChild(Y), g = ai.defaultView, k = g.getComputedStyle && g.getComputedStyle(Y, null).WebkitAppearance !== "textfield" && Y.offsetHeight !== 0, ad.removeChild(Y)) : /^(search|tel)$/.test(j) || (/^(url|email)$/.test(j) ? k = Y.checkValidity && Y.checkValidity() === !1 : /^color$/.test(j) ? (ad.appendChild(Y), ad.offsetWidth, k = Y.value != X, ad.removeChild(Y)) : k = Y.value != X)), R[b[l]] = !! k
      }
      return R
    }("search tel url email datetime date month week time datetime-local number range color".split(" "))
  }

  function S(d, c) {
    return !!~ ("" + d).indexOf(c)
  }

  function U(d, c) {
    return typeof d === c
  }

  function F(d, c) {
    return G(V.join(d + ";") + (c || ""))
  }

  function G(b) {
    Z.cssText = b
  }

  var ag = "2.0.6",
    af = {},
    ae = !0,
    ad = ai.documentElement,
    ac = ai.head || ai.getElementsByTagName("head")[0],
    ab = "modernizr",
    aa = ai.createElement(ab),
    Z = aa.style,
    Y = ai.createElement("input"),
    X = ":)",
    W = Object.prototype.toString,
    V = " -webkit- -moz- -o- -ms- -khtml- ".split(" "),
    T = {},
    R = {},
    Q = {},
    N = [],
    M = function(b, q, p, o) {
      var n, m, l, g = ai.createElement("div");
      if(parseInt(p, 10)) {
        while(p--) {
          l = ai.createElement("div"), l.id = o ? o[p] : ab + (p + 1), g.appendChild(l)
        }
      }
      n = ["&shy;", "<style>", b, "</style>"].join(""), g.id = ab, g.innerHTML += n, ad.appendChild(g), m = q(g, b), g.parentNode.removeChild(g);
      return !!m
    },
    K = function() {
      function c(h, g) {
        g = g || ai.createElement(b[h] || "div"), h = "on" + h;
        var a = h in g;
        a || (g.setAttribute || (g = ai.createElement("div")), g.setAttribute && g.removeAttribute && (g.setAttribute(h, ""), a = U(g[h], "function"), U(g[h], ah) || (g[h] = ah), g.removeAttribute(h))), g = null;
        return a
      }
      var b = {
        select: "input",
        change: "input",
        submit: "form",
        reset: "form",
        error: "img",
        load: "img",
        abort: "img"
      };
      return c
    }(),
    J, I = {}.hasOwnProperty,
    H;

  !U(I, ah) && !U(I.call, ah) ? H = function(d, c) {
    return I.call(d, c)
  } : H = function(d, c) {
    return c in d && U(d.constructor.prototype[c], ah)
  };

  var P = function(h, e) {
      var b = h.join(""),
        a = e.length;
      M(b, function(o, n) {
        var m = ai.styleSheets[ai.styleSheets.length - 1],
          l = m.cssRules && m.cssRules[0] ? m.cssRules[0].cssText : m.cssText || "",
          k = o.childNodes,
          g = {};
        while(a--) {
          g[k[a].id] = k[a]
        }
        af.touch = "ontouchstart" in aj || g.touch.offsetTop === 9
      }, a, e)
    }([, ["@media (", V.join("touch-enabled),("), ab, ")", "{#touch{top:9px;position:absolute}}"].join("")], [, "touch"]);

  T.touch = function() {
    return af.touch
  }, T.draganddrop = function() {
    return K("dragstart") && K("drop")
  };

  for(var L in T) {
    H(T, L) && (J = L.toLowerCase(), af[J] = T[L](), N.push((af[J] ? "" : "no-") + J))
  }

  af.input || O(), af.addTest = function(e, c) {
    if(typeof e == "object") {
      for(var f in e) {
        H(e, f) && af.addTest(f, e[f])
      }
    } else {
      e = e.toLowerCase();
      if(af[e] !== ah) {
        return
      }
      c = typeof c == "boolean" ? c : !! c(), ad.className += " " + (c ? "" : "no-") + e, af[e] = c
    }
    return af
  }, G(""), aa = Y = null, af._version = ag, af._prefixes = V, af.hasEvent = K, af.testStyles = M, ad.className = ad.className.replace(/\bno-js\b/, "") + (ae ? " js " + N.join(" ") : "");

  return af
})(this, this.document);
 
/* Placeholder */
function placeholderShiv(wrapper) {
  if ("placeholder" in document.createElement("textarea") != false) return;

  var vid = "_placeholder";
  $(wrapper || document.body).select("input[placeholder]").each(function(el) {
    var labels
      , cloned
      , hint = el.readAttribute("placeholder");

    if (el.readAttribute("type") == "password") {
      cloned = el.clone();
      cloned.name = '';

      try {
        cloned.type = "text"
      } catch(error) {
        return;
      }

      cloned.value = hint;
      cloned.addClassName("placeholder");

      if (el.id) {
        cloned.id += vid;
        labels = $$('label[for="' + el.id + '"]');
        labels.invoke("writeAttribute", "for", el.id + vid);
      }

      el.writeAttribute({
        accesskey: "",
        tabindex: ""
      }).hide().insert({
        before: cloned
      });

      cloned.observe("focus", function() {
        this.hide();
        el.show();
        el.focus();
      });

      el.observe("blur", function() {
        if (this.value === "") {
          this.hide();
          cloned.show();
        }
      });

    } else {
      el.addClassName("placeholder").value = hint;
      el.observe("focus", function() {
        if (this.hasClassName("placeholder")) this.clear().removeClassName("placeholder");
      });
      el.observe("blur", function() {
        if (this.value === "") this.addClassName("placeholder").value = hint;
      });
    }
  });
}

/* IEPNGFix */
if (!window.IEPNGFix) window.IEPNGFix = {};

IEPNGFix.tileBG = function(g, r, o) {
  var H = this.data[g.uniqueID],
    b = Math.max(g.clientWidth, g.scrollWidth),
    h = Math.max(g.clientHeight, g.scrollHeight),
    k = g.currentStyle.backgroundPositionX,
    j = g.currentStyle.backgroundPositionY,
    p = g.currentStyle.backgroundRepeat;

  if (!H.tiles) {
    H.tiles = {
      src: "",
      cache: [],
      img: new Image(),
      old: {}
    }
  }

  var D = H.tiles,
    w = D.img.width,
    c = D.img.height;

  if (r) {
    if (!o && r != D.src) {
      D.img.onload = function() {
        this.onload = null;
        IEPNGFix.tileBG(g, r, 1)
      };
      return D.img.src = r
    }
  } else {
    if (D.src) {
      o = 1
    }
    w = c = 0
  }

  D.src = r;

  if (!o && b == D.old.w && h == D.old.h && k == D.old.x && j == D.old.y && p == D.old.r) {
    return
  }

  var e = {
    top: "0%",
    left: "0%",
    center: "50%",
    bottom: "100%",
    right: "100%"
  },
    m, l, a;

  m = e[k] || k;
  l = e[j] || j;

  if (a = m.match(/(\d+)%/)) {
    m = Math.round((b - w) * (parseInt(a[1]) / 100))
  }

  if (a = l.match(/(\d+)%/)) {
    l = Math.round((h - c) * (parseInt(a[1]) / 100))
  }

  m = parseInt(m);
  l = parseInt(l);

  var F = {
    repeat: 1,
    "repeat-x": 1
  }[p],
    C = {
      repeat: 1,
      "repeat-y": 1
    }[p];

  if (F) {
    m %= w;
    if (m > 0) {
      m -= w
    }
  }

  if (C) {
    l %= c;
    if (l > 0) {
      l -= c
    }
  }

  this.hook.enabled = 0;

  if (!({
    relative: 1,
    absolute: 1
  }[g.currentStyle.position])) {
    g.style.position = "relative"
  }

  var f = 0,
    n, B = F ? b : m + 0.1,
    u, z = C ? h : l + 0.1,
    A, q, E;

  if (w && c) {
    for(n = m; n < B; n += w) {
      for(u = l; u < z; u += c) {
        E = 0;
        if (!D.cache[f]) {
          D.cache[f] = document.createElement("div");
          E = 1
        }
        var v = (n + w > b ? b - n : w),
          G = (u + c > h ? h - u : c);
        A = D.cache[f];
        q = A.style;
        q.behavior = "none";
        q.left = n + "px";
        q.top = u + "px";
        q.width = v + "px";
        q.height = G + "px";
        q.clip = "rect(" + (u < 0 ? 0 - u : 0) + "px," + v + "px," + G + "px," + (n < 0 ? 0 - n : 0) + "px)";
        q.display = "block";
        if (E) {
          q.position = "absolute";
          q.zIndex = -999;
          if (g.firstChild) {
            g.insertBefore(A, g.firstChild)
          } else {
            g.appendChild(A)
          }
        }
        this.fix(A, r, 0);
        f++
      }
    }
  }

  while(f < D.cache.length) {
    this.fix(D.cache[f], "", 0);
    D.cache[f++].style.display = "none"
  }

  this.hook.enabled = 1;
  D.old = {
    w: b,
    h: h,
    x: k,
    y: j,
    r: p
  }
};

/* Timestemp */
function t() {
  return "&t=" + (new Date().getTime())
}

/* Engine */
var Engine = {
  detect: function() {
    var a = navigator.userAgent;
    this.isKHTML = /Konqueror|Safari|KHTML/.test(a);
    this.isGecko = (/Gecko/.test(a) && !this.isKHTML);
    this.isOpera = /Opera/.test(a);
    this.isMSIE = (/MSIE/.test(a) && !this.isOpera);
    this.isMSIE7 = this.isMSIE && (a.indexOf("MSIE 7") != -1);
    this.isMSIE8 = this.isMSIE && (a.indexOf("MSIE 8") != -1);
    this.isFF3 = /Firefox\/3.0/.test(a);
    this.isChrome = a.toLowerCase().indexOf("chrome") > -1
  }
};

Engine.detect();

/* Ajax.Responders.register */
Ajax.Responders.register({
  onCreate: function(a) {
    if(!a.url.include("poll")) {
      $(document).fire("ajax:started");
      if($("busy") && Ajax.activeRequestCount > 0) {
        this.busyFx && this.busyFx.cancel();
        this.busyFx = new Effect.Appear("busy", {
          duration: 0.1,
          to: 0.8
        });
      }
    }
  },
  onComplete: function(a) {
    if (a.transport.status == 401) return location.reload();
    if(!a.url.include("poll")) {
      $(document).fire("ajax:completed");
      if($("busy") && Ajax.activeRequestCount == 0) {
        this.busyFx && this.busyFx.cancel();
        this.busyFx = new Effect.Fade("busy", {
          duration: 0.1
        });
      }
    }
  },
  onFailure: function(a) {
    console.error('request failure', a);
    if (a.transport.status == 401) return location.refresh();
    Assets.initAfterLoad(a.responseText.split('<body>')[1].split('</body>')[0]);
  }
});

/* Sizes */
Position.getPageSize = function() {
  var c, a;
  if (window.innerHeight && window.scrollMaxY) {
    c = document.body.scrollWidth;
    a = window.innerHeight + window.scrollMaxY
  } else {
    if (document.body.scrollHeight > document.body.offsetHeight) {
      c = document.body.scrollWidth;
      a = document.body.scrollHeight
    } else {
      c = document.body.offsetWidth;
      a = document.body.offsetHeight
    }
  }
  var b, d;
  if (self.innerHeight) {
    b = self.innerWidth;
    d = self.innerHeight
  } else {
    if (document.documentElement && document.documentElement.clientHeight) {
      b = document.documentElement.clientWidth;
      d = document.documentElement.clientHeight
    } else {
      if (document.body) {
        b = document.body.clientWidth;
        d = document.body.clientHeight
      }
    }
  }
  pageHeight = Math.max(d, a);
  pageWidth = Math.max(b, c);
  return {
    page: {
      width: pageWidth,
      height: pageHeight
    },
    window: {
      width: b,
      height: d
    }
  }
};

/* DelayedObserver */
Form.Element.DelayedObserver = Class.create();
Form.Element.DelayedObserver.prototype = {
  initialize: function(b, a, c) {
    this.delay = a || 0.5;
    this.element = $(b);
    this.callback = c;
    this.timer = null;
    this.lastValue = $F(this.element);
    Event.observe(this.element, "keyup", this.delayedListener.bindAsEventListener(this))
  },
  delayedListener: function(a) {
    if (this.lastValue == $F(this.element)) {
      return
    }
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
    if ($("full-search-button")) {
      $("full-search-button").style.display = this.lastValue == "" ? "none" : ""
    }
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element))
  }
};

/* Extend Event */
Object.extend(Event, {
  shortcuts: [],
  _observeShortcuts: true,
  localPointer: function(a, b) {
    var d = [Event.pointerX(b), Event.pointerY(b)];
    var c = Position.page($(a));
    return {
      x: d[0] - (c[0] + (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0)),
      y: d[1] - (c[1] + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0))
    }
  },

  registerShortcut: function(shortcut, callback) {
    var mod = function(event) {
        return (!event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey);
      }
      , parse = function(keys) {
        var _mod, _key;
        (keys = keys.toUpperCase().split('+')).each(function(code) {
          if (code.match(/ctrl|shift|meta|alt/i) && keys.length > 1) _mod = function(event) {
            return ((code == 'CTRL'  && event.ctrlKey  || code != 'CTRL'  && !event.ctrlKey)
                 && (code == 'SHIFT' && event.shiftKey || code != 'SHIFT' && !event.shiftKey)
                 && (code == 'META'  && event.metaKey  || code != 'META'  && !event.metaKey)
                 && (code == 'ALT'   && event.altKey   || code != 'ALT'   && !event.altKey));
            };
          else _key = Event['KEY_' + code] || code;
        });
        return [_mod || mod, _key];
      };

    if (!Object.isArray(shortcut)) shortcut = [shortcut];
    shortcut.each(function(code, i) {
      var mode = mod;
      if (Object.isString(code) && 1 < code.length) {
        mode = parse(code);
        code = mode[1];
        mode = mode[0];
      }

      Event.shortcuts.push({key: code, mod: mode, func: callback});
    });
  },

  observeShortcut: function(event) {
    if (!Event._observeShortcuts && event.keyCode != Event.KEY_ESC) return;

    var el = event.element();
    if (/input|textarea|select|object|option/i.test(el.tagName)) {
      if (event.keyCode == Event.KEY_ESC) el.blur();
      return;
    }

    Event.shortcuts.map(function(shortcut) {
      if ( (Object.isString(shortcut.key) && shortcut.key == String.fromCharCode(event.keyCode) && shortcut.mod(event))
        || (Object.isNumber(shortcut.key) && shortcut.key == event.keyCode && shortcut.mod(event)) ) {
        return shortcut.func;
      }
    }).compact().each(function(callback) {
      if (Object.isFunction(callback)) callback(event);
    });
  }
});

/* Event.delegate */
(function() {

  function handler(event) {
    var element = event.element()
      , family = [element].concat(element.ancestors());

    ((this.retrieve("prototype_delegates") || $H()).get(event.eventName || event.type) || []).each(function(search) {
      if (element = Selector.matchElements(family, search.key)[0]) search.value.invoke("call", element, event);
    });
  }

  function delegate(element, selector, type, callback) {
    element = $(element);

    var data = element.retrieve("prototype_delegates");
    if (Object.isUndefined(data)) element.store("prototype_delegates", data = $H());

    var delegates = data.get(type);
    if (Object.isUndefined(delegates)) {
      Event.observe(element, type, handler);
      data.set(type, $H()).set(selector, [callback]);
    } else {
      (delegates.get(selector) || delegates.set(selector, [])).push(callback);
    }
    return element;
  }

  function observe(element, data, type) {
    data.unset(type);
    Event.observe(element, type, handler);
  }

  function stopObserving(element, data, selector, type, delegates) {
    delegates.unset(selector);
    if (delegates.values().length == 0) observe(element, data, type);
  }

  function stopDelegate(element, selector, type, callback) {
    element = $(element);

    var data = element.retrieve("prototype_delegates");
    if (Object.isUndefined(data)) return;

    switch(arguments.length) {
    case 1:
      data.each(function(search) {
        observe(element, data, search.key);
      });
      break;

    case 2:
      data.each(function(search) {
        stopObserving(element, data, selector, search.key, search.value);
      });
      break;

    case 3:
      var delegates = data.get(type);
      if (delegates) stopObserving(element, data, selector, type, delegates);
      break;

    default:
    case 4:
      var delegates = data.get(type);
      if (!delegates) return;
      var callbacks = delegates.get(selector);
      if (callbacks) {
        callbacks = callbacks.reject(function(func) {
          return func == callback;
        });
        if (callbacks.length > 0) {
          delegates.set(selector, callbacks);
        } else {
          stopObserving(element, data, selector, type, delegates);
        }
      }
    }
  }

  document.delegate = delegate.methodize();
  document.stopDelegate = stopDelegate.methodize();

  Event.delegate = delegate;
  Event.stopDelegate = stopDelegate;

  Element.addMethods({
    delegate: delegate,
    stopDelegating: stopDelegate
  });
})();

/* Extend Date */
Date.prototype.format = function(format) {
  var date = this
    , weekName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    , pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		}, h;

  return format.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|tt)/gi, function(key) {
    switch (key) {
      case "yyyy": return date.getFullYear();
      case "yy": return pad(date.getFullYear() % 1000, 2);
      case "MM": return pad(date.getMonth() + 1, 2);
      case "dd": return pad(date.getDate(), 2);
      case "E": return weekName[date.getDay()];
      case "HH": return pad(date.getHours(), 2);
      case "hh": return pad((h = date.getHours() % 12) ? h : 12, 2);
      case "mm": return pad(date.getMinutes(), 2);
      case "ss": return pad(date.getSeconds(), 2);
      case "tt": return date.getHours() < 12 ? "AM" : "PM";
      default: return key;
    }
  });
};

/* Extend Transitions*/
Object.extend(Effect.Transitions, {
  cubic: function(a) {
    a /= 0.5;
    return a < 1 ? 0.5 * a * a * a : 0.5 * ((a - 2) * (a - 2) * (a - 2) + 2);
  }
});

/**
 * Easing Equations (c) 2003 Robert Penner, all rights reserved.
 * This work is subject to the terms in http://www.robertpenner.com/easing_terms_of_use.html.
 * Add Transitions description:
 * exponential(느림>빠름>느림), slowstop(매우빠름>느림), cubic(느림>빠름), circ(빠름>보통),
 * expoIn(매우느림>매우빠름), expoOut(매우빠름>매우느림), quadIn(느림>보통), quadOut(보통>느림),
 * circOut(매우빠름>느림>매우느림), circIn(매우느림<느림<매우빠름),
 * backIn(원위치>튀어나옴>빠름), backOut(빠름>튀어나옴>원위치),
 * sineOut(보통>느림), sineIn(느림>보통), sineInOut(보통>빠름>느림)
 */

Object.extend(Effect.Transitions, {
  exponential: function(pos) {return 1 - Math.pow(1 - pos, 2);},
  slowstop: function(pos) {return 1 - Math.pow(0.5, 20 * pos);},
  cubic_: function(pos) {return Math.pow(pos, 3);},
  circ: function(pos) {return Math.sqrt(pos);},
  expoIn: function(pos) { return Math.pow(2, 10 * (pos - 1)); },
  expoOut: function(pos) { return (-Math.pow(2, -10 * pos) + 1); },
  quadIn: function(pos) { return Math.pow(pos, 2); },
  quadOut: function(pos) { return -(pos)*(pos-2); },
  circOut: function(pos) { return Math.sqrt(1 - Math.pow(pos-1,2)); },
  circIn: function(pos) { return -(Math.sqrt(1 - Math.pow(pos, 2)) - 1); },
  backIn: function(pos) { return (pos)*pos*((2.7)*pos - 1.7); },
  backOut: function(pos) { return ((pos-1)*(pos-1)*((2.7)*(pos-1) + 1.7) + 1); },
  sineOut: function(pos) { return Math.sin(pos * (Math.PI/2)); },
  sineIn: function(pos) { return -Math.cos(pos * (Math.PI/2)) + 1; },
  sineInOut: function(pos) { return -(Math.cos(Math.PI*pos) - 1)/2; }
});


/* Effect ScrollToAsset */
Effect.ScrollToAsset = function(el, asset) {
  var options = arguments[2] || {}
    , el = $(el)
    , asset = $(asset)
    , from = el.scrollTop
    , to = asset.offsetTop;

  // arrow down
  if (from < to) {
    var scrollerHeight = el.offsetHeight
      , assetHeight = asset.offsetHeight;
    
    to = from + scrollerHeight < to + assetHeight ? to - scrollerHeight + assetHeight : null;
  }

  if (to !== null) {
    el._ani && el._ani.cancel(); 
    return el._ani = new Effect.Tween(el, from, to, options, function(value) {
      el.scrollTop = value.round();
    });
  }
};


/**
 * Position based scrollTo effect
 * @author Firejune<to@firejune.com>
 * @license MIT
 */
Effect.Scroll = Class.create(Effect.Base, {
  initialize: function(element) {
    var args = $A(arguments)
      , options = typeof args.last() == "object" ? args.last() : {};

    this.element = $(element)
    this.scroll = {
        left: options.left || 0
      , top: options.top || 0
    };

    this.start(options);
  },
  setup: function() {
    this.scrollLeft = this.element.scrollLeft;
    this.scrollTop = this.element.scrollTop;

    if (this.options.offset) {
      this.scrollLeft += this.options.offset;
      this.scrollTop += this.options.offset;
    }

    this.delta = {
        x: this.scroll.left - this.scrollLeft
      , y: this.scroll.top - this.scrollTop
    };
  },
  update: function(position) {
    this.element.scrollLeft = (this.scrollLeft + position * this.delta.x).round();
    this.element.scrollTop = (this.scrollY + position * this.delta.y).round();
  }
});

Element.addMethods({
  localPointer: Event.localPointer,
  scrollToAsset: function(el, asset) {
    Effect.ScrollToAsset(el, asset, {
      duration: 0.25,
      transition: Effect.Transitions.cubic
    });
    return el;
  },

  getHeight: function(a) {
    return($(a) ? ($(a).visible() ? Element.getDimensions(a).height : 0) : 0)
  }
});


/* Function debounce */
Function.prototype.debounce = function(time) {
  var func = this
    , timer;

  exec.cancel = function() {
    timer && clearTimeout(timer);
  };

  function exec() {
    var self = this
      , args = arguments;

    function callback() {
      func.apply(self, args);
      timer = null;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(callback, time || 100)
  }

  return exec;
};


/* Extend Control */
if (!Control) var Control = {}
Control.serializeNodes = function(a, c) {
  var e = new Array();
  var b = {
    tagName: false,
    className: false
  };
  Object.extend(b, arguments[2] || {});
  for(var d = 0; d < a.length; d++) {
    if ((!b.tagName || (a[d].tagName == b.tagName.toUpperCase())) && (!b.className || Element.hasClassName(a[d], b.className)) && (a[d].id)) {
      e.push(encodeURIComponent(c) + "[]=" + encodeURIComponent(a[d].id.split("_")[1]))
    }
  }
  return e.join("&")
};

Control.MatrixSelect = Class.create();
Control.MatrixSelect.prototype = {
  initialize: function(b) {
    this.element = $(b);
    this.options = (arguments[1] || {});
    this.nodes = [];
    if (this.element.childNodes) {
      for(var a = 0; a < this.element.childNodes.length; a++) {
        if (this.element.childNodes[a].tagName == "DIV") {
          this.nodes.push(this.element.childNodes[a]);
          Event.observe(this.element.childNodes[a], "click", this.toggleOption.bindAsEventListener(this))
        }
      }
    }
    if (this.options.onChange) {
      this.options.onChange(Control.serializeNodes(this.nodes, this.element.id, {
        className: "active"
      }))
    }
  },
  toggleOption: function(b) {
    var a = Event.findElement(b, "DIV");
    Element[Element.hasClassName(a, "active") ? "removeClassName" : "addClassName"](a, "active");
    if (this.options.onChange) {
      this.options.onChange(Control.serializeNodes(this.nodes, this.element.id, {
        className: "active"
      }))
    }
    Event.stop(b)
  }
};

Control.Selector = Class.create();
Control.Selector.prototype = {
  initialize: function(a) {
    this.element = $(a);
    this.active = false;
    this.wasactive = false;
    this.wasmoved = false;
    this.pos = Position.page(this.element);
    this.offsetLeft = $('filter-panel').getWidth();
    this.pos[0] -= this.offsetLeft;

    Event.observe(this.element.up(), "mousedown", this.setActive.bindAsEventListener(this), false);
    Event.observe(document, "mouseup", this.setInactive.bindAsEventListener(this), false);
    Event.observe(document, "mousemove", this.change.bindAsEventListener(this), false);
    Event.observe(this.element.up(), "click", this.cancelIfActive.bindAsEventListener(this), false);
  },

  setActive: function(a) {
    a.preventDefault();
    //Velox.hidePanels();

    if (a.metaKey || a.shiftKey || a.ctrlKey || a.altKey) return;
    if (this.active) this.setInactive();

    this.active = true;
    this.wasactive = false;
    this.originalEl = Event.element(a);
    this.originalX = a.clientX - this.offsetLeft;
    this.originalY = a.clientY + $("main-panel").scrollTop;
    this.selection = new Element("div", {className: "rubberband", style: ""});

    $("content").appendChild(this.selection);
    this.updateDocs();
    document.fire("rubberband:activated");
  },

  setInactive: function(a) {
    if (this.active) {
      this.stopScrolling();
      this.active = false;
      this.wasactive = true;
      Element.remove(this.selection);
      this.element.style.cursor = "";
      document.fire("rubberband:deactivated");
      a.preventDefault();

      //this.inactiveTimer && clearTimeout(this.inactiveTimer);
      //this.inactiveTimer = setTimeout(Assets.updateDetail.bind(Assets), 350);
    }
  },

  updateDocs: function() {
    var a = this.pos[1];
    this.docs = Assets.documents.collect(function(b) {
      return([b.offsetLeft, b.offsetTop + a, b.offsetLeft + b.offsetWidth, b.offsetTop + b.offsetHeight + a, b]);
    });
  },

  cancelIfActive: function(a) {
    if ((Engine.isMSIE7 || Engine.isMSIE8) && this.wasactive && this.wasmoved) {
      this.wasactive = false;
      this.wasmoved = false;
      a.preventDefault();
    }
  },

  stopScrolling: function() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  },

  startScrolling: function(a) {
    this.scrollSpeed = a * 15;
    this.lastScrolled = new Date();
    this.scrollInterval = setInterval(this.scroll.bind(this), 10);
  },

  scroll: function() {
    var b = new Date();
    var e = b - this.lastScrolled;
    this.lastScrolled = b;
    var a = $("main-panel").scrollTop;
    $("main-panel").scrollTop += (this.scrollSpeed * e / 1000);

    var c = $("main-panel").scrollTop - a;
    var d = this.lastY + $("main-panel").scrollTop;
    if (d < this.originalY) {
      this.y2 = this.originalY;
      this.y1 = d;
    } else {
      this.y2 = d;
      this.y1 = this.originalY;
    }

    Assets.render();
    this.mark();
  },

  change: function(c) {
    if (this.active) {
      if (!Engine.isGecko && !Event.isLeftClick(c)) return this.setInactive(c);

      c.stop();
      var a = c.clientX - this.offsetLeft;
      var f = c.clientY;
      if (a == this.lastX && f == this.lastY) return;

      this.lastX = a;
      this.lastY = f;
      this.element.style.cursor = "move";
      this.scrollOffset = $("main-panel").scrollTop;
      var e = $("main-panel").offsetTop;
      var b = e + $("main-panel").offsetHeight;

      if (this.scrollInterval) this.scroll();
      this.stopScrolling();

      if (f < (e + 20)) this.startScrolling(f - (e + 20));
      if (f > (b - 20)) this.startScrolling(f - (b - 20));

      var d = this.pos;
      if (a > (d[0] + this.element.offsetWidth)) a = d[0] + this.element.offsetWidth;
      if (f > (d[1] + this.element.parentNode.offsetHeight)) f = d[1] + this.element.parentNode.offsetHeight;
      if (a < d[0]) a = d[0];
      if (f < d[1]) f = d[1];

      if (a < this.originalX) {
        this.x2 = this.originalX;
        this.x1 = a;
      } else {
        this.x2 = a;
        this.x1 = this.originalX;
      }

      f += this.scrollOffset;
      if (f < this.originalY) {
        this.y2 = this.originalY;
        this.y1 = f;
      } else {
        this.y2 = f;
        this.y1 = this.originalY;
      }

      this.mark();
      this.wasmoved = true;
    }
  },

  mark: function() {
    if (this.docs.length < Assets.documents.length) this.updateDocs();

    this.scrollOffset = $("main-panel").scrollTop;
    var a = {
      left: this.x1 + this.offsetLeft + "px",
      width: (this.x2 - this.x1) + "px"
    };

    if ((this.y1 - this.scrollOffset) < this.pos[1]) {
      a.top = this.pos[1] + "px";
      a.height = Math.min(this.y2 - this.scrollOffset - this.pos[1], this.element.parentNode.offsetHeight) + "px"
    } else {
      a.top = this.y1 - this.scrollOffset + "px";
      a.height = Math.min(this.y2 - this.y1, this.element.parentNode.offsetHeight - (this.y1 - this.scrollOffset - this.pos[1])) + "px"
    }

    Element.setStyle(this.selection, a);

    var b = Assets.selected;
    var c = false;
    this.docs.each(function(e, d) {
      if ((e[0] >= this.x1 || e[2] >= this.x1) && (e[1] >= this.y1 || e[3] >= this.y1) && (e[0] <= this.x2 || e[2] <= this.x2) && (e[1] <= this.y2 || e[3] <= this.y2)) {
        if (!b[d]) {
          c = true;
          Assets._select(e[4]);
        }
      } else {
        if (b[d]) {
          c = true;
          Assets._unselect(e[4]);
        }
      }
    }.bind(this));

    if (c) Assets.updateMenu();
  }
};

/* Extend String */
Object.extend(String.prototype, (function() {
  /**
   * base64.js (Danny Goodman) 
   * http://www.dannyg.com
   */
  // Load the lookup arrays once
  var enc64List = [], dec64List = [], i;
  for (i = 0; i < 26; i++) enc64List[enc64List.length] = String.fromCharCode(65 + i);
  for (i = 0; i < 26; i++) enc64List[enc64List.length] = String.fromCharCode(97 + i);
  for (i = 0; i < 10; i++) enc64List[enc64List.length] = String.fromCharCode(48 + i);
  enc64List[enc64List.length] = "+";
  enc64List[enc64List.length] = "/";
  for (i = 0; i < 128; i++) dec64List[dec64List.length] = -1;
  for (i = 0; i < 64; i++) dec64List[enc64List[i].charCodeAt(0)] = i;

  function base64Encode() {
    var input = this.split(""), output = "", c, d, e, end = 0, u, v, w, x, ptr = -1;
    while(end == 0) {
      c = (typeof input[++ptr] != "undefined") ? input[ptr].charCodeAt(0) : ((end = 1) ? 0 : 0);
      d = (typeof input[++ptr] != "undefined") ? input[ptr].charCodeAt(0) : ((end += 1) ? 0 : 0);
      e = (typeof input[++ptr] != "undefined") ? input[ptr].charCodeAt(0) : ((end += 1) ? 0 : 0);
      u = enc64List[c >> 2];
      v = enc64List[(0x00000003 & c) << 4 | d >> 4];
      w = enc64List[(0x0000000F & d) << 2 | e >> 6];
      x = enc64List[e & 0x0000003F];
      
      // handle padding to even out unevenly divisible string lengths
      if (end >= 1) x = "=";
      if (end == 2) w = "=";
      if (end < 3) {output += u + v + w + x;}
    }
    // format for 76-character line lengths per RFC
    var formattedOutput = "", lineLength = 76;
    while (output.length > lineLength) {
      formattedOutput += output.substring(0, lineLength) + "\n";
      output = output.substring(lineLength);
    }
    return formattedOutput + output;
  };

  function base64Decode() {
    var input = this.split(""), output = "", ptr = 0, c = 0, d = 0, e = 0, f = 0, i = 0, n = 0;
    do {
      f = input[ptr++].charCodeAt(0);
      i = dec64List[f];
      if ( f >= 0 && f < 128 && i != -1 ) {
        if ( n % 4 == 0 ) c = i << 2;
        else if ( n % 4 == 1 ) {
          c = c | ( i >> 4 );
          d = ( i & 0x0000000F ) << 4;
        } else if ( n % 4 == 2 ) {
          d = d | ( i >> 2 );
          e = ( i & 0x00000003 ) << 6;
        } else e = e | i;
        n++;
        if ( n % 4 == 0 ) output += String.fromCharCode(c) + String.fromCharCode(d) +  String.fromCharCode(e);
      }
    } while (typeof input[ptr] != "undefined");
    return output + (n % 4 == 3 ? String.fromCharCode(c) + String.fromCharCode(d) : n % 4 == 2 ? String.fromCharCode(c) : "");
  };

  /**
   * simple template engine
   *
   * @param {String} template source
   * @param {Object} dictionary object like json
   * @return {String} replaced string
   *
   */
  function template(dic, parentKey) {
    //console.log('template', arguments);
    var src = this;
    for (var key in dic) {
      var _key = (parentKey ? parentKey + '.' : '') + key;
      if (typeof dic[key] == 'object') src = src.template(dic[key], _key);
      else src = src.replace(new RegExp('{' + _key + '}', 'g'), dic[key]);
    }
    return src;
  }

  return {
    base64Encode: base64Encode,
    base64Decode: base64Decode,
    template: template
  };
})());