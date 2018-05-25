'use babel';

import $ from 'nodobjc';
import {allowUnsafeNewFunction} from 'loophole';
import {CompositeDisposable} from 'atom';
import {execSync} from 'child_process';
import path from 'path';

class AtomMarkboard {
  activate() {
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
    const tabStop = atom.config.get('editor.tabLength', {scope: ['source.gfm']});
    return {
      pandocArgs: {
        default: [
          `--tab-stop=${tabStop}`,
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
          'emoji',
          'smart'
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
      return this.copyWithPandoc();
    }

    return this.copyWithAtom();
  }

  copyWithPandoc() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;
    const raw = editor.getText();

    const args = atom.config.get('atom-markboard.pandocArgs');
    let extensions = atom.config.get('atom-markboard.pandocExtensions');
    extensions = extensions.length ? `+${extensions.join('+')}` : '';

    const command = ['pandoc', `--from=markdown${extensions}`, '--to=html5']
      .concat(args)
      .join(' ')
      .trim();

    let html;
    try {
      html = execSync(command, {encoding: 'utf8', input: raw});
    } catch (err) {
      atom.notifications.addError('Pandoc Rendering Failed', {description: err.message, stack: err.stack});
      return;
    }

    this.sendToClipboard(html);
  }

  copyWithAtom() {
    const markdownPreviewPath = atom.packages.resolvePackagePath('markdown-preview');
    const packagePath = path.join(markdownPreviewPath, 'lib', 'renderer');
    const toHTML = require(packagePath).toHTML;

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    const raw = editor.getText();

    let html;
    try {
      html = toHTML(raw, null, null);
    } catch (err) {
      atom.notifications.addError('Markdown Rendering Failed', {description: err.message, stack: err.stack});
      return;
    }

    this.sendToClipboard(html);
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
