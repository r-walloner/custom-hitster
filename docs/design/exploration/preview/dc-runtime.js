/*
 * dc-runtime.js — a tiny stand-alone player for the Claude canvas ".dc.html"
 * boards in ../canvas/, so they open in any browser without the canvas editor.
 *
 * Supports what these boards use: {{dotted.path}} holes in text and attributes,
 * on* event handlers bound to functions, <sc-for list as>, <sc-if value>,
 * boolean attributes (checked, disabled, selected) bound to a whole {{hole}},
 * data-props defaults as this.props, and state/setState/componentDidMount.
 * Holes (text and attributes) are re-evaluated on every setState. A loop or
 * condition rebuilds its own nodes only when its shape changes (item count,
 * keys and boolean flags, or the condition flipping), so CSS animations keep
 * running everywhere else.
 */
(function () {
  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this.__update) this.__update();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__update) this.__update(); };
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, locals, vals) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var cur = Object.prototype.hasOwnProperty.call(locals, parts[0]) ? locals[parts[0]] : vals()[parts[0]];
    for (var i = 1; i < parts.length && cur != null; i++) cur = cur[parts[i]];
    return cur;
  }
  function interpolate(str, locals, vals) {
    return str.replace(HOLE, function (_, p) { var v = lookup(p, locals, vals); return v == null ? '' : String(v); });
  }

  function mount(Component, root, template, props) {
    var inst = new Component(props);
    var current = {};
    var bindings = [];
    function vals() { return current; }
    function compute() { current = inst.renderVals ? (inst.renderVals() || {}) : {}; }

    function build(node, locals, parent, binds, anchor) {
      function put(n) { parent.insertBefore(n, anchor || null); }
      if (node.nodeType === 3) {
        var text = node.nodeValue;
        var t = document.createTextNode('');
        if (HOLE.test(text)) {
          HOLE.lastIndex = 0;
          var b = function () { t.nodeValue = interpolate(text, locals, vals); };
          binds.push(b); b();
        } else t.nodeValue = text;
        put(t);
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toLowerCase();
      if (tag === 'sc-for' || tag === 'sc-if') {
        var startMark = document.createComment(tag), endMark = document.createComment('/' + tag);
        put(startMark); put(endMark);
        var inner = [], scopes = [], lastKey = null;
        var expr = function (attr) { return (node.getAttribute(attr) || '').replace(/^\s*\{\{|\}\}\s*$/g, ''); };
        // The block's shape: rebuilt only when it changes, so animations inside keep running.
        var shape = function (v) {
          if (tag === 'sc-if') return v ? '1' : '0';
          return (v || []).map(function (item) {
            if (item === null || typeof item !== 'object') return typeof item;
            return Object.keys(item).sort().map(function (k) { return typeof item[k] === 'boolean' ? k + '=' + item[k] : k; }).join(',');
          }).join('|');
        };
        var render = function () {
          var v = lookup(expr(tag === 'sc-for' ? 'list' : 'value'), locals, vals);
          var key = shape(v);
          if (key === lastKey) {
            if (tag === 'sc-for') scopes.forEach(function (l, i) { l[l.$as] = v[i]; });
            inner.forEach(function (b) { b(); });
            return;
          }
          lastKey = key;
          while (startMark.nextSibling && startMark.nextSibling !== endMark) parent.removeChild(startMark.nextSibling);
          inner = []; scopes = [];
          if (tag === 'sc-for') {
            var as = node.getAttribute('as') || 'item';
            (v || []).forEach(function (item, i) {
              var l = Object.assign({}, locals); l[as] = item; l.$index = i; l.$as = as;
              scopes.push(l);
              node.childNodes.forEach(function (c) { build(c, l, parent, inner, endMark); });
            });
          } else if (v) {
            node.childNodes.forEach(function (c) { build(c, locals, parent, inner, endMark); });
          }
        };
        render();
        binds.push(render);
        return;
      }
      var el = node.namespaceURI === 'http://www.w3.org/2000/svg'
        ? document.createElementNS(node.namespaceURI, node.tagName)
        : document.createElement(node.tagName);
      Array.prototype.forEach.call(node.attributes, function (a) {
        var name = a.name, value = a.value;
        if (/^hint-/.test(name)) return;
        var whole = WHOLE.exec(value);
        if (/^(checked|disabled|selected)$/.test(name) && whole) {
          var prop = name;
          var bb = function () { var on = !!lookup(whole[1], locals, vals); el[prop] = on; if (on) el.setAttribute(prop, ''); else el.removeAttribute(prop); };
          binds.push(bb); bb();
          return;
        }
        if (/^on[a-z]+$/i.test(name) && whole) {
          var evt = name.slice(2).toLowerCase();
          el.addEventListener(evt, function (e) { var fn = lookup(whole[1], locals, vals); if (typeof fn === 'function') fn(e); });
          return;
        }
        if (HOLE.test(value)) {
          HOLE.lastIndex = 0;
          var attr = name === 'classname' ? 'class' : name;
          var b = function () { el.setAttribute(attr, interpolate(value, locals, vals)); };
          binds.push(b); b();
        } else el.setAttribute(name, value);
      });
      var kids = node.content ? node.content.childNodes : node.childNodes;
      kids.forEach(function (c) { build(c, locals, el, binds, null); });
      put(el);
    }

    compute();
    template.childNodes.forEach(function (c) { build(c, {}, root, bindings, null); });
    inst.__update = function () { compute(); bindings.forEach(function (b) { b(); }); };
    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('pagehide', function () { if (inst.componentWillUnmount) inst.componentWillUnmount(); });
    return inst;
  }

  window.DCRuntime = { mount: mount };
})();
