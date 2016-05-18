'use babel';

import $ from 'nodobjc';
import {allowUnsafeNewFunction} from 'loophole';
import {CompositeDisposable} from 'atom';
import path from 'path';

class AtomMarkboard {
  constructor() {
    $.framework('Foundation');
    $.framework('AppKit');

    let typeArray;
    allowUnsafeNewFunction(() => {
      this.pool = $.NSAutoreleasePool('alloc')('init');
      this.pasteboard = $.NSPasteboard('generalPasteboard');
      typeArray = $.NSArray('arrayWithObject', $.NSHTMLPboardType);
    });

    this.pasteboard('declareTypes', typeArray, 'owner', null);

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-markboard:copy': () => this.copy()
    }));
  }

  copy() {
    const markdownPreviewPath = atom.packages.resolvePackagePath('markdown-preview');
    const packagePath = path.join(markdownPreviewPath, 'lib', 'renderer');
    const toHTML = require(packagePath).toHTML;

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    const text = editor.getText();
    toHTML(text, null, null, (error, html) => {
      if (error) throw error;

      let string;
      allowUnsafeNewFunction(() => {
        string = $(html);
      });

      this.pasteboard('setString', string, 'forType', $.NSHTMLPboardType);
    });
  }

  deactivate() {
    this.subscriptions.dispose();
    this.pool('drain');
  }
}

module.exports = new AtomMarkboard();
