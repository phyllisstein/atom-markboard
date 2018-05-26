"use strict";

var _nodobjc = _interopRequireDefault(require("nodobjc"));

var _loophole = require("loophole");

var _atom = require("atom");

var _childProcessPromise = require("child-process-promise");

var _juice = require("juice");

var _path = _interopRequireDefault(require("path"));

var _bluebird = _interopRequireDefault(require("bluebird"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const juiceAsync = _bluebird.default.promisify(_juice.juiceResources);

class AtomMarkboard {
  activate() {
    _nodobjc.default.framework('Foundation');

    _nodobjc.default.framework('AppKit');

    (0, _loophole.allowUnsafeNewFunction)(() => {
      this.pool = _nodobjc.default.NSAutoreleasePool('alloc')('init');
      this.pasteboard = _nodobjc.default.NSPasteboard('generalPasteboard');
    });
    this.subscriptions = new _atom.CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-markboard:copy-to-markdown': () => this.copy()
    }));
  }

  get config() {
    const tabStop = atom.config.get('editor.tabLength', {
      scope: ['source.gfm']
    });
    return {
      pandocArgs: {
        default: [`--tab-stop=${tabStop}`, '--standalone', '--email-obfuscation=none'],
        description: 'Additional arguments for Pandoc.',
        items: {
          type: 'string'
        },
        title: 'Pandoc Arguments',
        type: 'array'
      },
      pandocExtensions: {
        default: ['emoji', 'smart'],
        description: 'Pandoc Markdown extensions to enable.',
        items: {
          type: 'string'
        },
        title: 'Pandoc Markdown Extensions',
        type: 'array'
      },
      usePandoc: {
        default: false,
        description: 'Render your document with [Pandoc](http://pandoc.org/).',
        title: 'Use Pandoc',
        type: 'boolean'
      }
    };
  }

  copy() {
    if (atom.config.get('atom-markboard.usePandoc')) {
      return this.copyWithPandoc();
    }

    return this.copyWithAtom();
  }

  copyWithPandoc() {
    return new _bluebird.default(function ($return, $error) {
      let editor, raw, args, extensions, command, html;
      editor = atom.workspace.getActiveTextEditor();
      if (!editor) return $return();
      raw = editor.getText();
      args = atom.config.get('atom-markboard.pandocArgs');
      extensions = atom.config.get('atom-markboard.pandocExtensions');
      extensions = extensions.length ? `+${extensions.join('+')}` : '';
      command = ['pandoc', `--from=markdown${extensions}`, '--to=html5'].concat(args).join(' ').trim();

      var $Try_1_Post = function () {
        try {
          var $Try_2_Post = function () {
            try {
              return $return(this.sendToClipboard(html));
            } catch ($boundEx) {
              return $error($boundEx);
            }
          }.bind(this);

          var $Try_2_Catch = function (err) {
            try {
              atom.notifications.addError('HTML Inlining Failed', {
                description: err.message,
                stack: err.stack
              });
              return $return();
            } catch ($boundEx) {
              return $error($boundEx);
            }
          };

          try {
            return Promise.resolve(juiceAsync(html)).then(function ($await_5) {
              try {
                html = $await_5;
                return $Try_2_Post();
              } catch ($boundEx) {
                return $Try_2_Catch($boundEx);
              }
            }, $Try_2_Catch);
          } catch (err) {
            $Try_2_Catch(err)
          }
        } catch ($boundEx) {
          return $error($boundEx);
        }
      }.bind(this);

      var $Try_1_Catch = function (err) {
        try {
          atom.notifications.addError('Pandoc Rendering Failed', {
            description: err.message,
            stack: err.stack
          });
          return $return();
        } catch ($boundEx) {
          return $error($boundEx);
        }
      };

      try {
        return Promise.resolve((0, _childProcessPromise.exec)(command, {
          encoding: 'utf8',
          input: raw
        })).then(function ($await_6) {
          try {
            html = $await_6;
            return $Try_1_Post();
          } catch ($boundEx) {
            return $Try_1_Catch($boundEx);
          }
        }, $Try_1_Catch);
      } catch (err) {
        $Try_1_Catch(err)
      }
    }.bind(this));
  }

  copyWithAtom() {
    return new Promise(function ($return, $error) {
      let markdownPreviewPath, packagePath, toHTML, toHTMLAsync, editor, raw, html;
      markdownPreviewPath = atom.packages.resolvePackagePath('markdown-preview');
      packagePath = _path.default.join(markdownPreviewPath, 'lib', 'renderer');
      toHTML = require(packagePath).toHTML;
      toHTMLAsync = _bluebird.default.promisify(toHTML);
      editor = atom.workspace.getActiveTextEditor();
      if (!editor) return $return();
      raw = editor.getText();

      var $Try_3_Post = function () {
        try {
          var $Try_4_Post = function () {
            try {
              return $return(this.sendToClipboard(html));
            } catch ($boundEx) {
              return $error($boundEx);
            }
          }.bind(this);

          var $Try_4_Catch = function (err) {
            try {
              atom.notifications.addError('HTML Inlining Failed', {
                description: err.message,
                stack: err.stack
              });
              return $return();
            } catch ($boundEx) {
              return $error($boundEx);
            }
          };

          try {
            return Promise.resolve(juiceAsync(html)).then(function ($await_7) {
              try {
                html = $await_7;
                return $Try_4_Post();
              } catch ($boundEx) {
                return $Try_4_Catch($boundEx);
              }
            }, $Try_4_Catch);
          } catch (err) {
            $Try_4_Catch(err)
          }
        } catch ($boundEx) {
          return $error($boundEx);
        }
      }.bind(this);

      var $Try_3_Catch = function (err) {
        try {
          atom.notifications.addError('Markdown Rendering Failed', {
            description: err.message,
            stack: err.stack
          });
          return $return();
        } catch ($boundEx) {
          return $error($boundEx);
        }
      };

      try {
        return Promise.resolve(toHTMLAsync(raw, null, null)).then(function ($await_8) {
          try {
            html = $await_8;
            return $Try_3_Post();
          } catch ($boundEx) {
            return $Try_3_Catch($boundEx);
          }
        }, $Try_3_Catch);
      } catch (err) {
        $Try_3_Catch(err)
      }
    }.bind(this));
  }

  deactivate() {
    this.subscriptions.dispose();
    this.pool('drain');
  }

  sendToClipboard(html) {
    return new Promise(function ($return, $error) {
      (0, _loophole.allowUnsafeNewFunction)(() => {
        const string = (0, _nodobjc.default)(html);

        const pasteboardItem = _nodobjc.default.NSPasteboardItem('alloc')('init');

        pasteboardItem('setString', string, 'forType', _nodobjc.default.NSPasteboardTypeHTML);

        const writeObjects = _nodobjc.default.NSArray('arrayWithObject', pasteboardItem);

        this.pasteboard('clearContents');
        this.pasteboard('writeObjects', writeObjects);
      });
      return $return();
    });
  }

}

module.exports = new AtomMarkboard();