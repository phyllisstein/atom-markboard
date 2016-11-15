'use babel';

import $ from 'nodobjc';
import {allowUnsafeNewFunction} from 'loophole';
import {CompositeDisposable} from 'atom';
import pandoc from 'pdc';
import path from 'path';

let juiceResources;
allowUnsafeNewFunction(() => {
  juiceResources = require('juice').juiceResources;
});

class AtomMarkboard {
  constructor() {
    $.framework('Foundation');
    $.framework('AppKit');

    allowUnsafeNewFunction(() => {
      this.pool = $.NSAutoreleasePool('alloc')('init');
      this.pasteboard = $.NSPasteboard('generalPasteboard');
    });

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-markboard:copy-to-markdown': () => this.copy()
    }));
  }

  get config() {
    return {
      pandocArgs: {
        default: [
          '--smart',
          '--normalize',
          '--tab-stop=4',
          '--standalone',
          '--email-obfuscation=none'
        ],
        description: 'Additional arguments for Pandoc.',
        items: {
          type: 'string'
        },
        title: 'Pandoc Arguments',
        type: 'array'
      },
      pandocExtensions: {
        default: [
          'emoji'
        ],
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
      this.copyWithPandoc();
    } else {
      this.copyWithAtom();
    }
  }

  copyWithPandoc() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    const args = atom.config.get('atom-markboard.pandocArgs');
    let extensions = atom.config.get('atom-markboard.pandocExtensions');
    extensions = extensions.length ? `+${extensions.join('+')}` : '';

    const raw = editor.getText();

    pandoc(raw, `markdown${extensions}`, 'html5', args, (err, result) => {
      if (err) {
        atom.notifications.addError('Pandoc Rendering Failed', {description: err});
        return;
      }

      juiceResources(result, {}, (juiceError, html) => {
        if (juiceError) {
          atom.notifications.addError('HTML Inlining Failed', {description: juiceError});
          return;
        }

        this.sendToClipboard(html);
      });
    });
  }

  copyWithAtom() {
    const markdownPreviewPath = atom.packages.resolvePackagePath('markdown-preview');
    const packagePath = path.join(markdownPreviewPath, 'lib', 'renderer');
    const toHTML = require(packagePath).toHTML;

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    const raw = editor.getText();
    toHTML(raw, null, null, (err, result) => {
      if (err) {
        atom.notifications.addError('Markdown Rendering Failed', {description: err});
      }

      juiceResources(result, {}, (juiceError, html) => {
        if (juiceError) {
          atom.notifications.addError('HTML Inlining Failed', {description: juiceError});
          return;
        }

        this.sendToClipboard(html);
      });
    });
  }

  deactivate() {
    this.subscriptions.dispose();
    this.pool('drain');
  }

  sendToClipboard(html) {
    allowUnsafeNewFunction(() => {
      const string = $(html);

      const pasteboardItem = $.NSPasteboardItem('alloc')('init');
      pasteboardItem('setString', string, 'forType', $.NSPasteboardTypeHTML);
      const writeObjects = $.NSArray('arrayWithObject', pasteboardItem);

      this.pasteboard('clearContents');
      this.pasteboard('writeObjects', writeObjects);
    });
  }
}

module.exports = new AtomMarkboard();
