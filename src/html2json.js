(function(global) {
  const DEBUG = false;
  var debug = DEBUG ? console.log.bind(console) : function(){};

  if (typeof module === 'object' && typeof module.exports === 'object') {
    require('../lib/Pure-JavaScript-HTML5-Parser/htmlparser.js');
  }

  function q(v) {
    return '"' + v + '"';
  }

  function removeDOCTYPE(html) {
    return html
      .replace(/<\?xml.*\?>\n/, '')
      .replace(/<!doctype.*\>\n/, '')
      .replace(/<!DOCTYPE.*\>\n/, '');
  }

  function changeWxTag(name){
    if(name === "section"){
      return "div"
    }
  }

  global.html2json = function html2json(html) {
    html = removeDOCTYPE(html);
    var bufArray = [];
    var results = {
      node: 'root',
      children: [],
    };
    HTMLParser(html, {
      start: function(tag, attrs, unary) {
        debug(tag, attrs, unary);
        // node for this element
        tag = changeWxTag(tag);
        var node = {
          type: 'node',
          name: tag,
        };
        if (attrs.length !== 0) {
          node.attr = attrs.reduce(function(pre, attr) {
            var name = attr.name;
            var value = attr.value;

            // has multi attibutes
            // make it array of attribute
            if (value.match(/ /)) {
              value = value.split(' ');
            }

            // if attr already exists
            // merge it
            if (pre[name]) {
              if (Array.isArray(pre[name])) {
                // already array, push to last
                pre[name].push(value);
              } else {
                // single value, make it array
                pre[name] = [pre[name], value];
              }
            } else {
              // not exist, put it
              pre[name] = value;
            }

            return pre;
          }, {});
        }
        if (unary) {
          // if this tag dosen't have end tag
          // like <img src="hoge.png"/>
          // add to parents
          var parent = bufArray[0] || results;
          if (parent.children === undefined) {
            parent.children = [];
          }
          parent.children.push(node);
        } else {
          bufArray.unshift(node);
        }
      },
      end: function(tag) {
        debug(tag);
        tag = changeWxTag(tag);
        // merge into parent tag
        var node = bufArray.shift();
        if (node.name !== tag) console.error('invalid state: mismatch end tag');

        if (bufArray.length === 0) {
          results.children.push(node);
        } else {
          var parent = bufArray[0];
          if (parent.children === undefined) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      },
      chars: function(text) {
        debug(text);
        var node = {
          type: 'text',
          text: text,
        };
        if (bufArray.length === 0) {
          results.children.push(node);
        } else {
          var parent = bufArray[0];
          if (parent.children === undefined) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      },
      comment: function(text) {
        debug(text);
        var node = {
          node: 'comment',
          text: text,
        };
        var parent = bufArray[0];
        if (parent.children === undefined) {
          parent.children = [];
        }
        parent.children.push(node);
      },
    });
    return results;
  };

  global.json2html = function json2html(json) {
    // Empty Elements - HTML 4.01
    var empty = ['area', 'base', 'basefont', 'br', 'col', 'frame', 'hr', 'img', 'input', 'isindex', 'link', 'meta', 'param', 'embed'];

    var children = '';
    if (json.children) {
      children = json.children.map(function(c) {
        return json2html(c);
      }).join('');
    }

    var attr = '';
    if (json.attr) {
      attr = Object.keys(json.attr).map(function(key) {
        var value = json.attr[key];
        if (Array.isArray(value)) value = value.join(' ');
        return key + '=' + q(value);
      }).join(' ');
      if (attr !== '') attr = ' ' + attr;
    }

    if (json.type === 'node') {
      var tag = json.name;
      if (empty.indexOf(tag) > -1) {
        // empty element
        return '<' + json.name + attr + '/>';
      }

      // non empty element
      var open = '<' + json.name + attr + '>';
      var close = '</' + json.name + '>';
      return open + children + close;
    }

    if (json.type === 'text') {
      return json.text;
    }

    if (json.node === 'comment') {
      return '<!--' + json.text + '-->';
    }

    if (json.node === 'root') {
      return children;
    }
  };
})(this);
