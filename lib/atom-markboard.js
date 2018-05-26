'use babel';

import $ from 'nodobjc';
import {allowUnsafeNewFunction} from 'loophole';
import {CompositeDisposable} from 'atom';
import {execSync} from 'child_process';
import {juiceResources} from 'juice';
import path from 'path';
import Promise from 'bluebird';

const juiceAsync = Promise.promisify(juiceResources);

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

  async copyWithPandoc() {
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

    try {
      html = await juiceAsync(html, null);
    } catch (err) {
      atom.notifications.addError('HTML Inlining Failed', {description: err.message, stack: err.stack});
      return;
    }

    return this.sendToClipboard(html);
  }

  async copyWithAtom() {
    const markdownPreviewPath = atom.packages.resolvePackagePath('markdown-preview');
    const packagePath = path.join(markdownPreviewPath, 'lib', 'renderer');
    const toHTML = require(packagePath).toHTML;
    const toHTMLAsync = Promise.promisify(toHTML);

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    const raw = editor.getText();

    let html;
    try {
      html = await toHTMLAsync(raw, null, null);
    } catch (err) {
      atom.notifications.addError('Markdown Rendering Failed', {description: err.message, stack: err.stack});
      return;
    }

    try {
      html = await juiceAsync(html);
    } catch (err) {
      atom.notifications.addError('HTML Inlining Failed', {description: err.message, stack: err.stack});
      return;
    }

    return this.sendToClipboard(html);
  }

  deactivate() {
    this.subscriptions.dispose();
    // FIXME: Releasing or draining the pool causes Atom to crash.
    // this.pool('release');
  }

  async sendToClipboard(html) {
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
