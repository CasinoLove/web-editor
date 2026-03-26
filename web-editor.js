/* 
[Web Editor]
[Local browser-based web project editor with file tree, plain text editing, and live preview.]

Created by CasinoLove (Casinolove Kft.)

Official company details:
Registered name: Casinolove Kft.
Jurisdiction: Hungary (European Union)
Company Registration Number (Hungary): 14-09-318400
Email: hello@casinolove.org
Website: https://hu.casinolove.org/
GitHub: https://github.com/CasinoLove

License:
This project is open source. Please check the LICENSE file in the GitHub repository or the license information on our website before reuse, modification, or redistribution.
*/

(() => {
  const DB_NAME = 'cl-web-editor-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'projectEntries';
  const SETTINGS_KEY = 'cl-web-editor-settings';
  const WARNING_KEY = 'cl-web-editor-warning-dismissed';
  const PREVIEW_ORIGIN = 'https://preview.local';

  const TEXT_EXTENSIONS = new Set([
    'txt', 'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'json', 'svg', 'xml', 'md',
    'ts', 'tsx', 'jsx', 'yml', 'yaml', 'csv', 'ini', 'env', 'gitignore', 'editorconfig'
  ]);

  const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'svg'
  ]);

  const MIME_BY_EXT = {
    html: 'text/html;charset=utf-8',
    htm: 'text/html;charset=utf-8',
    css: 'text/css;charset=utf-8',
    js: 'text/javascript;charset=utf-8',
    mjs: 'text/javascript;charset=utf-8',
    cjs: 'text/javascript;charset=utf-8',
    json: 'application/json;charset=utf-8',
    txt: 'text/plain;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    svg: 'image/svg+xml;charset=utf-8',
    xml: 'application/xml;charset=utf-8',
    yml: 'text/yaml;charset=utf-8',
    yaml: 'text/yaml;charset=utf-8',
    csv: 'text/csv;charset=utf-8',
    ts: 'text/plain;charset=utf-8',
    tsx: 'text/plain;charset=utf-8',
    jsx: 'text/plain;charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    avif: 'image/avif'
  };

  const FONT_FAMILIES = {
    system: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace",
    consolas: "Consolas, 'Lucida Console', 'Courier New', monospace",
    'courier-new': "'Courier New', Courier, monospace",
    'lucida-console': "'Lucida Console', Monaco, monospace"
  };

  const state = {
    entries: new Map(),
    openFilePath: null,
    openFileIsText: false,
    savedValue: '',
    imageZoom: 1,
    objectUrls: [],
    isDirty: false,
    collapsedFolders: new Set(),
    settings: {
      theme: 'dark',
      fontSize: '16',
      fontFamily: 'system',
      syntaxHighlight: false
    },
    paneState: {
      files: true,
      editor: true,
      preview: true
    }
  };

  const els = {
    body: document.body,
    browserWarning: document.getElementById('browser-warning'),
    dismissWarning: document.getElementById('dismiss-warning'),
    fileMenuToggle: document.getElementById('file-menu-toggle'),
    fileMenu: document.getElementById('file-menu'),
    settingsMenuToggle: document.getElementById('settings-menu-toggle'),
    settingsMenu: document.getElementById('settings-menu'),
    newProjectBtn: document.getElementById('new-project-btn'),
    addExampleProjectBtn: document.getElementById('add-example-project-btn'),
    exportZipBtn: document.getElementById('export-zip-btn'),
    filesPane: document.getElementById('files-pane'),
    editorPane: document.getElementById('editor-pane'),
    previewPane: document.getElementById('preview-pane'),
    splitterFiles: document.getElementById('splitter-files'),
    splitterPreview: document.getElementById('splitter-preview'),
    themeSelect: document.getElementById('theme-select'),
    fontSizeSelect: document.getElementById('font-size-select'),
    fontFamilySelect: document.getElementById('font-family-select'),
    syntaxHighlightToggle: document.getElementById('syntax-highlight-toggle'),
    addFileBtn: document.getElementById('add-file-btn'),
    addFolderBtn: document.getElementById('add-folder-btn'),
    importFilesBtn: document.getElementById('import-files-btn'),
    importFolderBtn: document.getElementById('import-folder-btn'),
    importFilesInput: document.getElementById('import-files-input'),
    importFolderInput: document.getElementById('import-folder-input'),
    dropZone: document.getElementById('drop-zone'),
    fileTree: document.getElementById('file-tree'),
    editorEmpty: document.getElementById('editor-empty'),
    editorBinaryNote: document.getElementById('editor-binary-note'),
    editorShell: document.getElementById('editor-shell'),
    syntaxHighlight: document.getElementById('syntax-highlight'),
    codeEditor: document.getElementById('code-editor'),
    saveBtn: document.getElementById('save-btn'),
    editorFileLabel: document.getElementById('editor-file-label'),
    previewFileLabel: document.getElementById('preview-file-label'),
    previewEmpty: document.getElementById('preview-empty'),
    htmlPreview: document.getElementById('html-preview'),
    imagePreviewWrap: document.getElementById('image-preview-wrap'),
    imagePreview: document.getElementById('image-preview'),
    previewControls: document.getElementById('preview-controls'),
    zoomOutBtn: document.getElementById('zoom-out-btn'),
    zoomInBtn: document.getElementById('zoom-in-btn'),
    zoomResetBtn: document.getElementById('zoom-reset-btn'),
    zoomLabel: document.getElementById('zoom-label'),
    hideFilesBtn: document.getElementById('hide-files-btn'),
    hideEditorBtn: document.getElementById('hide-editor-btn'),
    hidePreviewBtn: document.getElementById('hide-preview-btn'),
    paneRestoreDock: document.getElementById('pane-restore-dock')
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    loadSettings();
    applySettings();
    setupBrowserWarning();
    bindEvents();
    await loadProject();
    renderTree();
    updatePaneVisibility();
    updateEditorState();
    updateSyntaxHighlight();
    updatePreview();
  }

  function bindEvents() {
    els.dismissWarning.addEventListener('click', () => {
      localStorage.setItem(WARNING_KEY, '1');
      els.browserWarning.classList.add('hidden');
    });

    els.fileMenuToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu('file');
    });

    els.settingsMenuToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu('settings');
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.menu-wrap')) {
        closeMenus();
      }
    });

    els.themeSelect.addEventListener('change', () => {
      state.settings.theme = els.themeSelect.value;
      saveSettings();
      applySettings();
    });

    els.fontSizeSelect.addEventListener('change', () => {
      state.settings.fontSize = els.fontSizeSelect.value;
      saveSettings();
      applySettings();
    });

    els.fontFamilySelect.addEventListener('change', () => {
      state.settings.fontFamily = normalizeFontFamilySetting(els.fontFamilySelect.value);
      saveSettings();
      applySettings();
    });

    els.syntaxHighlightToggle.addEventListener('change', () => {
      state.settings.syntaxHighlight = els.syntaxHighlightToggle.checked;
      saveSettings();
      applySettings();
    });

    els.newProjectBtn.addEventListener('click', async () => {
      closeMenus();
      await onNewProject();
    });

    els.addExampleProjectBtn.addEventListener('click', async () => {
      closeMenus();
      await onAddExampleProject();
    });

    els.addFileBtn.addEventListener('click', async () => {
      closeMenus();
      await onAddFile();
    });

    els.addFolderBtn.addEventListener('click', async () => {
      closeMenus();
      await onAddFolder();
    });

    els.importFilesBtn.addEventListener('click', () => {
      closeMenus();
      els.importFilesInput.click();
    });

    els.importFolderBtn.addEventListener('click', () => {
      closeMenus();
      els.importFolderInput.click();
    });

    els.exportZipBtn.addEventListener('click', async () => {
      closeMenus();
      await exportZip();
    });

    els.importFilesInput.addEventListener('change', async (event) => {
      await importFlatFiles(event.target.files);
      event.target.value = '';
    });

    els.importFolderInput.addEventListener('change', async (event) => {
      await importFolderFiles(event.target.files);
      event.target.value = '';
    });

    els.dropZone.addEventListener('dragover', onDragOver);
    els.dropZone.addEventListener('dragleave', onDragLeave);
    els.dropZone.addEventListener('drop', onDrop);

    els.codeEditor.addEventListener('input', () => {
      state.isDirty = state.openFileIsText && state.openFilePath !== null && els.codeEditor.value !== state.savedValue;
      updateEditorState();
      updateSyntaxHighlight();
      if (state.openFilePath) {
        const ext = getExtension(state.openFilePath);
        if (ext === 'html' || ext === 'htm' || ext === 'svg') {
          updatePreview();
        }
      }
    });

    els.codeEditor.addEventListener('scroll', syncEditorScroll);

    els.codeEditor.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentFile();
      }
    });

    els.saveBtn.addEventListener('click', saveCurrentFile);

    els.zoomInBtn.addEventListener('click', () => setImageZoom(state.imageZoom + 0.1));
    els.zoomOutBtn.addEventListener('click', () => setImageZoom(Math.max(0.1, state.imageZoom - 0.1)));
    els.zoomResetBtn.addEventListener('click', () => setImageZoom(1));

    els.hideFilesBtn.addEventListener('click', () => togglePane('files'));
    els.hideEditorBtn.addEventListener('click', () => togglePane('editor'));
    els.hidePreviewBtn.addEventListener('click', () => togglePane('preview'));

    setupSplitter(els.splitterFiles, els.filesPane);
    setupSplitter(els.splitterPreview, els.editorPane);

    window.addEventListener('beforeunload', (event) => {
      if (state.isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  function toggleMenu(name) {
    const fileOpen = !els.fileMenu.classList.contains('hidden');
    const settingsOpen = !els.settingsMenu.classList.contains('hidden');
    if (name === 'file') {
      const shouldOpen = !fileOpen;
      closeMenus();
      if (shouldOpen) {
        els.fileMenu.classList.remove('hidden');
        els.fileMenuToggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    const shouldOpen = !settingsOpen;
    closeMenus();
    if (shouldOpen) {
      els.settingsMenu.classList.remove('hidden');
      els.settingsMenuToggle.setAttribute('aria-expanded', 'true');
    }
  }

  function closeMenus() {
    els.fileMenu.classList.add('hidden');
    els.settingsMenu.classList.add('hidden');
    els.fileMenuToggle.setAttribute('aria-expanded', 'false');
    els.settingsMenuToggle.setAttribute('aria-expanded', 'false');
  }

  function setupBrowserWarning() {
    const dismissed = localStorage.getItem(WARNING_KEY) === '1';
    if (dismissed) {
      els.browserWarning.classList.add('hidden');
      return;
    }

    const ua = navigator.userAgent || '';
    const isDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isChromium = !!window.chrome && /Chrome|Chromium|Edg|OPR|Brave/i.test(ua);
    if (isDesktop && isChromium) {
      els.browserWarning.classList.add('hidden');
    } else {
      els.browserWarning.classList.remove('hidden');
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      state.settings = { ...state.settings, ...saved };
    } catch (error) {
      console.error(error);
    }

    state.settings.fontFamily = normalizeFontFamilySetting(state.settings.fontFamily);
    state.settings.syntaxHighlight = !!state.settings.syntaxHighlight;

    els.themeSelect.value = state.settings.theme;
    els.fontSizeSelect.value = state.settings.fontSize;
    els.fontFamilySelect.value = state.settings.fontFamily;
    els.syntaxHighlightToggle.checked = state.settings.syntaxHighlight;
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function applySettings() {
    els.body.classList.toggle('theme-light', state.settings.theme === 'light');
    document.documentElement.style.setProperty('--editor-font-size', `${state.settings.fontSize}px`);
    document.documentElement.style.setProperty('--editor-font-family', FONT_FAMILIES[state.settings.fontFamily] || FONT_FAMILIES.system);
    updateSyntaxHighlight();
  }

  function togglePane(name) {
    const visibleCount = Object.values(state.paneState).filter(Boolean).length;
    if (state.paneState[name] && visibleCount <= 1) {
      return;
    }
    state.paneState[name] = !state.paneState[name];
    updatePaneVisibility();
  }

  function updatePaneVisibility() {
    setPaneVisible(els.filesPane, state.paneState.files);
    setPaneVisible(els.editorPane, state.paneState.editor);
    setPaneVisible(els.previewPane, state.paneState.preview);

    els.splitterFiles.classList.toggle('hidden', !(state.paneState.files && state.paneState.editor));
    els.splitterPreview.classList.toggle('hidden', !(state.paneState.editor && state.paneState.preview));

    renderRestoreDock();
  }

  function setPaneVisible(element, visible) {
    element.classList.toggle('hidden-pane', !visible);
  }

  function renderRestoreDock() {
    els.paneRestoreDock.innerHTML = '';
    const hiddenPanes = [
      { key: 'files', label: 'Files', icon: '📁' },
      { key: 'editor', label: 'Editor', icon: '⌨' },
      { key: 'preview', label: 'Preview', icon: '🖥' }
    ].filter((item) => !state.paneState[item.key]);

    for (const pane of hiddenPanes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'restore-pane-btn';
      button.innerHTML = `<span aria-hidden="true">${pane.icon}</span><span class="label">${pane.label}</span>`;
      button.addEventListener('click', () => {
        state.paneState[pane.key] = true;
        updatePaneVisibility();
      });
      els.paneRestoreDock.appendChild(button);
    }
    els.paneRestoreDock.classList.toggle('hidden', hiddenPanes.length === 0);
  }

  function setupSplitter(splitter, previousPane) {
    let active = false;

    splitter.addEventListener('mousedown', () => {
      active = true;
      document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mouseup', () => {
      active = false;
      document.body.style.cursor = '';
    });

    window.addEventListener('mousemove', (event) => {
      if (!active || window.innerWidth < 900) {
        return;
      }
      const x = event.clientX;
      if (splitter === els.splitterFiles) {
        const nextLimit = window.innerWidth - 550;
        const width = clamp(x, 180, nextLimit);
        previousPane.style.width = `${width}px`;
      } else if (splitter === els.splitterPreview) {
        const leftWidth = els.filesPane.classList.contains('hidden-pane') ? 0 : els.filesPane.offsetWidth + els.splitterFiles.offsetWidth;
        const maxWidth = window.innerWidth - leftWidth - 260;
        const width = clamp(x - leftWidth, 260, maxWidth);
        previousPane.style.width = `${width}px`;
      }
    });
  }

  async function onNewProject() {
    if (!confirm('Delete the current local project and start a new empty one?')) {
      return;
    }
    if (state.isDirty && !confirm('You have unsaved changes. Continue and lose them?')) {
      return;
    }

    await clearProjectStorage();
    state.entries.clear();
    state.collapsedFolders.clear();
    resetOpenFile();
    renderTree();
    updateEditorState();
    updatePreview();
  }

  async function onAddExampleProject() {
    if (state.entries.size > 0) {
      if (!confirm('Replace the current local project with the example project?')) {
        return;
      }
      if (state.isDirty && !confirm('You have unsaved changes. Continue and lose them?')) {
        return;
      }
    }

    await clearProjectStorage();
    state.entries.clear();
    state.collapsedFolders.clear();
    resetOpenFile();
    await createExampleProject();
    renderTree();
    updateEditorState();
    updatePreview();
  }

  function resetOpenFile() {
    state.openFilePath = null;
    state.openFileIsText = false;
    state.savedValue = '';
    state.isDirty = false;
    els.codeEditor.value = '';
    cleanupObjectUrls();
    els.htmlPreview.removeAttribute('src');
    els.htmlPreview.removeAttribute('srcdoc');
    els.imagePreview.removeAttribute('src');
  }

  async function createExampleProject() {
    state.entries.set('index.html', createTextEntry(
      'index.html',
      '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My project</title>\n  <link rel="stylesheet" href="/design.css">\n</head>\n<body>\n  <h1>Hello</h1>\n  <p>Edit this project locally in your browser.</p>\n  <img src="/images/example.svg" alt="Example" width="140">\n  <script src="/app.js"></script>\n</body>\n</html>'
    ));
    state.entries.set('design.css', createTextEntry(
      'design.css',
      'body {\n  font-family: Arial, sans-serif;\n  margin: 40px;\n  background: #f4f7fb;\n  color: #132033;\n}\n\nh1 {\n  color: #0f63d8;\n}\n'
    ));
    state.entries.set('app.js', createTextEntry('app.js', "console.log('Preview loaded');\nalert('JavaScript preview works.');\n"));
    state.entries.set('images', { path: 'images', kind: 'folder' });
    state.entries.set('images/example.svg', createTextEntry(
      'images/example.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" rx="16" fill="#0f63d8"/><circle cx="70" cy="70" r="34" fill="#ffffff"/></svg>',
      'image/svg+xml;charset=utf-8'
    ));
    await saveProject();
  }

  function createTextEntry(path, text, mimeOverride = null) {
    return {
      path,
      kind: 'file',
      mime: mimeOverride || guessMime(path, true),
      encoding: 'text',
      content: text
    };
  }

  async function loadProject() {
    let db;
    try {
      db = await openDb();
      const entries = await dbGetAll(db);
      state.entries.clear();
      for (const item of entries) {
        state.entries.set(item.path, item);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  async function saveProject() {
    let db;
    try {
      db = await openDb();
      await dbReplaceAll(db, Array.from(state.entries.values()));
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  async function clearProjectStorage() {
    let db;
    try {
      db = await openDb();
      await dbClearAll(db);
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbGetAll(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function dbReplaceAll(db, items) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function dbClearAll(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function onAddFile() {
    const input = prompt('Path of the new file', 'index.html');
    if (!input) {
      return;
    }
    const path = normalizePath(input);
    if (!path || path.endsWith('/')) {
      alert('Enter a valid file path.');
      return;
    }
    await ensureFolderChain(path);
    if (state.entries.has(path)) {
      alert('That path already exists.');
      return;
    }
    state.entries.set(path, createTextEntry(path, ''));
    await saveProject();
    expandParentFolders(path);
    renderTree();
  }

  async function onAddFolder() {
    const input = prompt('Path of the new folder', 'assets');
    if (!input) {
      return;
    }
    const path = normalizePath(input);
    if (!path) {
      alert('Enter a valid folder path.');
      return;
    }
    await createFolderPath(path);
    await saveProject();
    expandParentFolders(path);
    renderTree();
  }

  async function createFolderPath(path) {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!state.entries.has(current)) {
        state.entries.set(current, { path: current, kind: 'folder' });
      }
    }
  }

  async function ensureFolderChain(path) {
    const dir = dirname(path);
    if (dir) {
      await createFolderPath(dir);
    }
  }

  function expandParentFolders(path) {
    const dir = dirname(path);
    if (!dir) {
      return;
    }
    const parts = dir.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      state.collapsedFolders.delete(current);
    }
  }

  async function importFlatFiles(fileList) {
    if (!fileList || !fileList.length) {
      return;
    }
    for (const file of fileList) {
      const path = normalizePath(file.name);
      await ensureFolderChain(path);
      const entry = await fileToEntry(file, path);
      state.entries.set(path, entry);
      expandParentFolders(path);
    }
    await saveProject();
    renderTree();
  }

  async function importFolderFiles(fileList) {
    if (!fileList || !fileList.length) {
      return;
    }
    for (const file of fileList) {
      const rawPath = file.webkitRelativePath || file.name;
      const path = normalizePath(rawPath);
      await ensureFolderChain(path);
      const entry = await fileToEntry(file, path);
      state.entries.set(path, entry);
      expandParentFolders(path);
    }
    await saveProject();
    renderTree();
  }

  async function fileToEntry(file, path) {
    const text = isTextType(path, file.type || '');
    if (text) {
      const content = await file.text();
      return {
        path,
        kind: 'file',
        mime: file.type || guessMime(path, true),
        encoding: 'text',
        content
      };
    }
    const dataUrl = await fileToDataUrl(file);
    return {
      path,
      kind: 'file',
      mime: file.type || guessMime(path, false),
      encoding: 'dataurl',
      content: dataUrl
    };
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function onDragOver(event) {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  }

  function onDragLeave(event) {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  }

  async function onDrop(event) {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
    const items = Array.from(event.dataTransfer.items || []);
    if (items.some((item) => item.webkitGetAsEntry && item.webkitGetAsEntry()?.isDirectory)) {
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          await importDroppedEntry(entry, '');
        }
      }
    } else {
      await importFlatFiles(event.dataTransfer.files);
    }
    await saveProject();
    renderTree();
  }

  async function importDroppedEntry(entry, basePath) {
    const fullPath = normalizePath(basePath ? `${basePath}/${entry.name}` : entry.name);
    if (entry.isDirectory) {
      await createFolderPath(fullPath);
      state.collapsedFolders.delete(fullPath);
      const reader = entry.createReader();
      const children = await new Promise((resolve, reject) => {
        const all = [];
        const readBatch = () => {
          reader.readEntries((results) => {
            if (!results.length) {
              resolve(all);
              return;
            }
            all.push(...results);
            readBatch();
          }, reject);
        };
        readBatch();
      });
      for (const child of children) {
        await importDroppedEntry(child, fullPath);
      }
      return;
    }

    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    await ensureFolderChain(fullPath);
    const fileEntry = await fileToEntry(file, fullPath);
    state.entries.set(fullPath, fileEntry);
    expandParentFolders(fullPath);
  }

  function renderTree() {
    const tree = buildTreeData();
    els.fileTree.innerHTML = '';

    if (!tree.length) {
      const empty = document.createElement('div');
      empty.className = 'tree-empty';
      empty.textContent = 'Project is empty. Use the File menu to add files, import a project, or load the example project.';
      els.fileTree.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    renderNodes(tree, fragment, 0);
    els.fileTree.appendChild(fragment);
  }

  function buildTreeData() {
    const root = [];
    const nodes = new Map();

    for (const [path, entry] of state.entries) {
      const parts = path.split('/');
      let currentPath = '';
      let level = root;
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let node = nodes.get(currentPath);
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            kind: index === parts.length - 1 ? entry.kind : 'folder',
            children: []
          };
          nodes.set(currentPath, node);
          level.push(node);
        }
        level = node.children;
      }
    }

    const sortNodes = (list) => {
      list.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      list.forEach((node) => sortNodes(node.children));
    };

    sortNodes(root);
    return root;
  }

  function renderNodes(nodes, parent, depth) {
    for (const node of nodes) {
      if (node.kind === 'folder') {
        const container = document.createElement('div');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tree-folder';
        button.style.paddingLeft = `${8 + depth * 18}px`;
        const collapsed = state.collapsedFolders.has(node.path);
        button.innerHTML = `<span class="tree-row"><span class="tree-arrow">${collapsed ? '▸' : '▾'}</span><span class="tree-icon">📁</span><span class="tree-name">${escapeHtml(node.name)}</span></span>`;
        button.addEventListener('click', () => {
          if (state.collapsedFolders.has(node.path)) {
            state.collapsedFolders.delete(node.path);
          } else {
            state.collapsedFolders.add(node.path);
          }
          renderTree();
        });
        container.appendChild(button);

        const childrenWrap = document.createElement('div');
        childrenWrap.className = 'tree-children';
        if (collapsed) {
          childrenWrap.classList.add('hidden');
        }
        renderNodes(node.children, childrenWrap, depth + 1);
        container.appendChild(childrenWrap);
        parent.appendChild(container);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tree-file';
        button.style.paddingLeft = `${22 + depth * 18}px`;
        if (state.openFilePath === node.path) {
          button.classList.add('active');
        }
        button.innerHTML = `<span class="tree-row"><span class="tree-icon">📄</span><span class="tree-name">${escapeHtml(node.name)}</span></span>`;
        button.addEventListener('click', async () => {
          await tryOpenFile(node.path);
        });
        parent.appendChild(button);
      }
    }
  }

  async function tryOpenFile(path) {
    if (state.openFilePath === path) {
      return;
    }
    const proceed = await confirmLeaveIfDirty();
    if (!proceed) {
      return;
    }
    const entry = state.entries.get(path);
    if (!entry || entry.kind !== 'file') {
      return;
    }
    state.openFilePath = path;
    state.openFileIsText = entry.encoding === 'text' || getExtension(path) === 'svg';
    if (state.openFileIsText) {
      state.savedValue = entry.content;
      els.codeEditor.value = entry.content;
      state.isDirty = false;
    } else {
      state.savedValue = '';
      els.codeEditor.value = '';
      state.isDirty = false;
    }
    expandParentFolders(path);
    renderTree();
    updateEditorState();
    updatePreview();
  }

  async function confirmLeaveIfDirty() {
    if (!state.isDirty) {
      return true;
    }
    const result = prompt('You have unsaved changes. Type save, discard, or cancel.', 'save');
    if (!result) {
      return false;
    }
    const choice = result.trim().toLowerCase();
    if (choice === 'save') {
      await saveCurrentFile();
      return !state.isDirty;
    }
    if (choice === 'discard') {
      state.isDirty = false;
      return true;
    }
    return false;
  }

  async function saveCurrentFile() {
    if (!state.openFilePath || !state.openFileIsText) {
      return;
    }
    const entry = state.entries.get(state.openFilePath);
    if (!entry) {
      return;
    }
    entry.content = els.codeEditor.value;
    entry.mime = guessMime(state.openFilePath, true);
    state.entries.set(state.openFilePath, entry);
    state.savedValue = els.codeEditor.value;
    state.isDirty = false;
    await saveProject();
    updateEditorState();
    updateSyntaxHighlight();
    updatePreview();
  }

  function updateEditorState() {
    const hasFile = !!state.openFilePath;
    els.editorFileLabel.textContent = hasFile ? state.openFilePath : '';
    els.saveBtn.disabled = !hasFile || !state.openFileIsText || !state.isDirty;

    if (!hasFile) {
      els.editorEmpty.classList.remove('hidden');
      els.editorBinaryNote.classList.add('hidden');
      els.editorShell.classList.add('hidden');
      updateSyntaxHighlight();
      return;
    }

    if (state.openFileIsText) {
      els.editorEmpty.classList.add('hidden');
      els.editorBinaryNote.classList.add('hidden');
      els.editorShell.classList.remove('hidden');
      updateSyntaxHighlight();
    } else {
      els.editorEmpty.classList.add('hidden');
      els.editorBinaryNote.classList.remove('hidden');
      els.editorShell.classList.add('hidden');
      updateSyntaxHighlight();
    }
  }

  function normalizeFontFamilySetting(value) {
    if (!value) {
      return 'system';
    }
    if (FONT_FAMILIES[value]) {
      return value;
    }
    const normalized = String(value).toLowerCase();
    if (normalized.includes('consolas')) {
      return 'consolas';
    }
    if (normalized.includes('courier')) {
      return 'courier-new';
    }
    if (normalized.includes('lucida')) {
      return 'lucida-console';
    }
    return 'system';
  }

  function syncEditorScroll() {
    els.syntaxHighlight.scrollTop = els.codeEditor.scrollTop;
    els.syntaxHighlight.scrollLeft = els.codeEditor.scrollLeft;
  }

  function shouldUseSyntaxHighlight() {
    return !!(state.settings.syntaxHighlight && state.openFilePath && state.openFileIsText && isSyntaxLanguageSupported(state.openFilePath));
  }

  function isSyntaxLanguageSupported(path) {
    const ext = getExtension(path);
    return ext === 'html' || ext === 'htm' || ext === 'css' || ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'xml' || ext === 'svg';
  }

  function getSyntaxLanguage(path) {
    const ext = getExtension(path);
    if (ext === 'css') {
      return 'css';
    }
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      return 'js';
    }
    if (ext === 'xml' || ext === 'svg') {
      return 'xml';
    }
    return 'html';
  }

  function updateSyntaxHighlight() {
    const active = shouldUseSyntaxHighlight();
    els.editorShell.classList.toggle('syntax-active', active);

    if (!active) {
      els.syntaxHighlight.innerHTML = '';
      return;
    }

    const code = els.codeEditor.value || '';
    const language = getSyntaxLanguage(state.openFilePath);
    els.syntaxHighlight.innerHTML = highlightCode(code, language);
    syncEditorScroll();
  }

  function highlightCode(code, language) {
    if (!code) {
      return '<br>';
    }
    if (language === 'css') {
      return highlightCss(code);
    }
    if (language === 'js') {
      return highlightJs(code);
    }
    return highlightMarkup(code);
  }

  function createTokenStore() {
    const store = [];
    return {
      protect(input, pattern, mapper) {
        return input.replace(pattern, (...args) => {
          const replacement = typeof mapper === 'function' ? mapper(...args) : mapper;
          const token = `${store.length}`;
          store.push(replacement);
          return token;
        });
      },
      restore(input) {
        return input.replace(/(\d+)/g, (_, index) => store[Number(index)] || '');
      }
    };
  }

  function highlightMarkup(code) {
    const tokens = createTokenStore();
    let text = escapeHtml(code);
    text = tokens.protect(text, /&lt;!--[\s\S]*?--&gt;/g, (match) => `<span class="token-comment">${match}</span>`);
    text = tokens.protect(text, /(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, (match) => `<span class="token-string">${match}</span>`);
    text = text.replace(/(&lt;\/?)([A-Za-z][\w:.-]*)([\s\S]*?)(\/?&gt;)/g, (full, start, tagName, attrs, end) => {
      const parsedAttrs = attrs.replace(/([A-Za-z_:][\w:.-]*)(\s*=)?/g, (attrFull, attrName, equals) => {
        if (/^\d+$/.test(attrName)) {
          return attrFull;
        }
        if (equals) {
          return `<span class="token-attr">${attrName}</span><span class="token-operator">${equals}</span>`;
        }
        return `<span class="token-attr">${attrName}</span>`;
      });
      return `<span class="token-operator">${start}</span><span class="token-tag">${tagName}</span>${parsedAttrs}<span class="token-operator">${end}</span>`;
    });
    return tokens.restore(text);
  }

  function highlightCss(code) {
    const tokens = createTokenStore();
    let text = escapeHtml(code);
    text = tokens.protect(text, /\/\*[\s\S]*?\*\//g, (match) => `<span class="token-comment">${match}</span>`);
    text = tokens.protect(text, /(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, (match) => `<span class="token-string">${match}</span>`);
    text = tokens.protect(text, /(^|[{};]\s*)([^{};]+)(?=\s*\{)/gm, (full, prefix, selector) => `${prefix}<span class="token-selector">${selector.trim()}</span>`);
    text = tokens.protect(text, /(^|[;{]\s*)(@[A-Za-z-]+)/gm, (full, prefix, atRule) => `${prefix}<span class="token-keyword">${atRule}</span>`);
    text = tokens.protect(text, /([A-Za-z-]+)(\s*:)/g, (full, propertyName, separator) => `<span class="token-property">${propertyName}</span><span class="token-operator">${separator}</span>`);
    text = tokens.protect(text, /(:\s*)(#[0-9a-fA-F]{3,8}|-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?)/g, (full, prefix, value) => `${prefix}<span class="token-number">${value}</span>`);
    text = tokens.protect(text, /[{}();:,]/g, (match) => `<span class="token-operator">${match}</span>`);
    return tokens.restore(text);
  }

  function highlightJs(code) {
    const tokens = createTokenStore();
    let text = escapeHtml(code);
    text = tokens.protect(text, /\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, (match) => {
      if (match.startsWith('/')) {
        return `<span class="token-comment">${match}</span>`;
      }
      return `${match[0]}<span class="token-comment">${match.slice(1)}</span>`;
    });
    text = tokens.protect(text, /`[\s\S]*?`|&quot;[^&]*?&quot;|&#39;[^&]*?&#39;/g, (match) => `<span class="token-string">${match}</span>`);
    text = tokens.protect(text, /(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|extends|try|catch|finally|throw|await|async|import|from|export|default|typeof|instanceof|in|of|this|null|true|false|undefined)/g, (match) => `<span class="token-keyword">${match}</span>`);
    text = tokens.protect(text, /(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)/g, (match) => `<span class="token-number">${match}</span>`);
    text = tokens.protect(text, /([A-Za-z_$][\w$]*)(?=\s*\()/g, (match) => `<span class="token-function">${match}</span>`);
    text = tokens.protect(text, /([{}()[\].,;:+\-*/%!=<>?|&]+)/g, (match) => `<span class="token-operator">${match}</span>`);
    return tokens.restore(text);
  }


  async function updatePreview() {
    cleanupObjectUrls();
    els.previewFileLabel.textContent = state.openFilePath || '';
    els.previewEmpty.classList.add('hidden');
    els.htmlPreview.classList.add('hidden');
    els.imagePreviewWrap.classList.add('hidden');
    els.previewControls.classList.add('hidden');
    els.htmlPreview.removeAttribute('src');
    els.htmlPreview.removeAttribute('srcdoc');
    els.imagePreview.removeAttribute('src');

    if (!state.openFilePath) {
      els.previewEmpty.classList.remove('hidden');
      return;
    }

    const entry = state.entries.get(state.openFilePath);
    if (!entry || entry.kind !== 'file') {
      els.previewEmpty.classList.remove('hidden');
      return;
    }

    const ext = getExtension(state.openFilePath);
    if (ext === 'html' || ext === 'htm') {
      const html = state.openFileIsText ? els.codeEditor.value : entry.content;
      const blobUrl = await buildHtmlPreview(state.openFilePath, html);
      els.htmlPreview.src = blobUrl;
      els.htmlPreview.classList.remove('hidden');
      return;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      let url = '';
      if (ext === 'svg' && state.openFileIsText) {
        url = registerObjectUrl(new Blob([els.codeEditor.value], { type: 'image/svg+xml;charset=utf-8' }));
      } else {
        url = await getObjectUrlForFile(state.openFilePath);
      }
      if (url) {
        els.imagePreview.src = url;
        els.imagePreview.alt = state.openFilePath;
        els.imagePreviewWrap.classList.remove('hidden');
        els.previewControls.classList.remove('hidden');
        setImageZoom(1);
        return;
      }
    }

    els.previewEmpty.classList.remove('hidden');
  }

  async function buildHtmlPreview(htmlPath, htmlSource) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlSource, 'text/html');
    const urlCache = new Map();

    ensureHeadElement(doc);
    injectBasePreviewHead(doc, htmlPath);
    await injectPreviewRuntime(doc, htmlPath, urlCache);

    const attributeResolvers = [
      ['img', 'src'],
      ['script', 'src'],
      ['link', 'href'],
      ['source', 'src'],
      ['source', 'srcset'],
      ['video', 'src'],
      ['video', 'poster'],
      ['audio', 'src'],
      ['track', 'src'],
      ['iframe', 'src'],
      ['embed', 'src'],
      ['object', 'data'],
      ['a', 'href']
    ];

    for (const [selector, attr] of attributeResolvers) {
      const nodes = Array.from(doc.querySelectorAll(`${selector}[${attr}]`));
      for (const node of nodes) {
        const value = node.getAttribute(attr);
        if (!value) {
          continue;
        }
        if (attr === 'srcset') {
          const rewritten = await rewriteSrcSet(value, htmlPath, urlCache);
          node.setAttribute(attr, rewritten);
        } else if (selector === 'link') {
          const rel = (node.getAttribute('rel') || '').toLowerCase();
          if (rel.includes('stylesheet') || rel.includes('icon') || rel.includes('apple-touch-icon')) {
            const rewritten = await resolveUrlForPreview(value, htmlPath, urlCache, true);
            if (rewritten) {
              node.setAttribute(attr, rewritten);
            }
          }
        } else {
          const rewritten = await resolveUrlForPreview(value, htmlPath, urlCache, selector === 'a');
          if (rewritten) {
            node.setAttribute(attr, rewritten);
          }
        }
      }
    }

    const styleNodes = Array.from(doc.querySelectorAll('style'));
    for (const styleNode of styleNodes) {
      styleNode.textContent = await rewriteCssText(styleNode.textContent || '', htmlPath, urlCache);
    }

    const inlineStyleNodes = Array.from(doc.querySelectorAll('[style]'));
    for (const node of inlineStyleNodes) {
      const value = node.getAttribute('style') || '';
      node.setAttribute('style', await rewriteCssText(value, htmlPath, urlCache));
    }

    const finalHtml = '<!doctype html>\n' + doc.documentElement.outerHTML;
    return registerObjectUrl(new Blob([finalHtml], { type: 'text/html;charset=utf-8' }));
  }

  function injectBasePreviewHead(doc, htmlPath) {
    let base = doc.querySelector('base[data-web-editor-base]');
    if (!base) {
      base = doc.createElement('base');
      base.setAttribute('data-web-editor-base', '1');
      doc.head.prepend(base);
    }

    const ownerDir = dirname(htmlPath);
    const basePath = ownerDir ? `/${ownerDir.replace(/^\/+/, '')}/` : '/';
    base.setAttribute('href', `${PREVIEW_ORIGIN}${basePath}`);

    const style = doc.createElement('style');
    style.textContent = 'html, body { min-height: 100%; }';
    doc.head.appendChild(style);
  }

  async function injectPreviewRuntime(doc, htmlPath, cache) {
    const script = doc.createElement('script');
    script.textContent = await buildPreviewRuntimeScript(htmlPath, cache);
    doc.head.prepend(script);
  }

  async function buildPreviewRuntimeScript(htmlPath, cache) {
    const manifest = {};
    for (const entry of Array.from(state.entries.values())) {
      if (!entry || entry.kind !== 'file') {
        continue;
      }
      const url = await getObjectUrlForFile(entry.path, cache);
      if (!url) {
        continue;
      }
      manifest[entry.path] = {
        url,
        mime: entry.mime || guessMime(entry.path, entry.encoding === 'text') || 'application/octet-stream'
      };
    }

    const ownerDir = dirname(htmlPath);
    const baseUrl = `${PREVIEW_ORIGIN}${ownerDir ? `/${ownerDir.replace(/^\/+/, '')}/` : '/'}`;
    const manifestJson = JSON.stringify(manifest);
    const baseUrlJson = JSON.stringify(baseUrl);
    const originJson = JSON.stringify(PREVIEW_ORIGIN);

    return String.raw`(() => {
  const PREVIEW_ORIGIN = ${originJson};
  const BASE_URL = ${baseUrlJson};
  const FILES = ${manifestJson};
  const nativeFetch = window.fetch.bind(window);
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  const nativeSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const nativeSetAttribute = Element.prototype.setAttribute;

  function normalizePath(value) {
    const parts = String(value || '').split('/');
    const out = [];
    for (const part of parts) {
      if (!part || part === '.') {
        continue;
      }
      if (part === '..') {
        out.pop();
      } else {
        out.push(part);
      }
    }
    return out.join('/');
  }

  function toProjectPath(input) {
    if (input == null) {
      return null;
    }
    const raw = typeof input === 'string' ? input : (input instanceof URL ? input.href : String(input));
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('#')) {
      return null;
    }
    try {
      const url = new URL(raw, BASE_URL);
      if (url.origin !== PREVIEW_ORIGIN) {
        return null;
      }
      return normalizePath(url.pathname.replace(/^\/+/, ''));
    } catch (error) {
      return null;
    }
  }

  function splitUrlSuffix(value) {
    let main = String(value || '');
    let suffix = '';
    const hashIndex = main.indexOf('#');
    if (hashIndex !== -1) {
      suffix = main.slice(hashIndex) + suffix;
      main = main.slice(0, hashIndex);
    }
    const queryIndex = main.indexOf('?');
    if (queryIndex !== -1) {
      suffix = main.slice(queryIndex) + suffix;
      main = main.slice(0, queryIndex);
    }
    return { main, suffix };
  }

  function toPreviewBlobUrl(input) {
    const parts = splitUrlSuffix(input);
    const projectPath = toProjectPath(parts.main);
    if (!projectPath || !FILES[projectPath]) {
      return null;
    }
    return FILES[projectPath].url + parts.suffix;
  }

  function rewriteAttributeValue(name, value) {
    if (typeof value !== 'string') {
      return value;
    }
    const lower = String(name || '').toLowerCase();
    if (lower === 'srcset') {
      const pieces = value.split(',');
      return pieces.map((piece) => {
        const trimmed = piece.trim();
        if (!trimmed) {
          return piece;
        }
        const parts = trimmed.split(/\s+/);
        const candidate = parts.shift();
        const rewritten = toPreviewBlobUrl(candidate);
        return [rewritten || candidate, parts.join(' ')].filter(Boolean).join(' ');
      }).join(', ');
    }
    const rewritten = toPreviewBlobUrl(value);
    return rewritten || value;
  }

  function patchUrlProperty(ctorName, propertyName) {
    const ctor = window[ctorName];
    if (!ctor || !ctor.prototype) {
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, propertyName);
    if (!descriptor || typeof descriptor.set !== 'function' || typeof descriptor.get !== 'function') {
      return;
    }
    Object.defineProperty(ctor.prototype, propertyName, {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        return descriptor.set.call(this, rewriteAttributeValue(propertyName, value));
      }
    });
  }

  patchUrlProperty('HTMLImageElement', 'src');
  patchUrlProperty('HTMLImageElement', 'srcset');
  patchUrlProperty('HTMLSourceElement', 'src');
  patchUrlProperty('HTMLSourceElement', 'srcset');
  patchUrlProperty('HTMLScriptElement', 'src');
  patchUrlProperty('HTMLLinkElement', 'href');
  patchUrlProperty('HTMLVideoElement', 'src');
  patchUrlProperty('HTMLVideoElement', 'poster');
  patchUrlProperty('HTMLAudioElement', 'src');
  patchUrlProperty('HTMLTrackElement', 'src');
  patchUrlProperty('HTMLEmbedElement', 'src');
  patchUrlProperty('HTMLObjectElement', 'data');
  patchUrlProperty('HTMLIFrameElement', 'src');

  Element.prototype.setAttribute = function(name, value) {
    const lower = String(name || '').toLowerCase();
    if (lower === 'src' || lower === 'href' || lower === 'data' || lower === 'poster' || lower === 'srcset') {
      value = rewriteAttributeValue(lower, value);
    }
    return nativeSetAttribute.call(this, name, value);
  };

  async function loadLocalBlob(path) {
    const record = FILES[path];
    if (!record) {
      return null;
    }
    const response = await nativeFetch(record.url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return { record, blob };
  }

  window.fetch = async function(input, init) {
    const requestUrl = input instanceof Request ? input.url : input;
    const projectPath = toProjectPath(requestUrl);
    const method = String((input instanceof Request ? input.method : (init && init.method)) || 'GET').toUpperCase();
    if (!projectPath || !FILES[projectPath] || (method !== 'GET' && method !== 'HEAD')) {
      return nativeFetch(input, init);
    }

    const loaded = await loadLocalBlob(projectPath);
    if (!loaded) {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' });
    }

    const headers = new Headers();
    headers.set('Content-Type', loaded.record.mime || loaded.blob.type || 'application/octet-stream');
    if (method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }
    return new Response(loaded.blob, { status: 200, headers });
  };

  XMLHttpRequest.prototype.open = function(method, url) {
    const projectPath = toProjectPath(url);
    if (projectPath && FILES[projectPath]) {
      this.__webEditorLocal = {
        method: String(method || 'GET').toUpperCase(),
        url: String(url),
        projectPath,
        headers: {}
      };
      return;
    }
    delete this.__webEditorLocal;
    return nativeOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this.__webEditorLocal) {
      this.__webEditorLocal.headers[String(name)] = String(value);
      return;
    }
    return nativeSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = async function(body) {
    if (!this.__webEditorLocal) {
      return nativeSend.call(this, body);
    }

    const local = this.__webEditorLocal;
    const method = local.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      delete this.__webEditorLocal;
      throw new Error('Local preview only supports GET and HEAD for XMLHttpRequest.');
    }

    const fire = (type) => {
      try {
        this.dispatchEvent(new Event(type));
      } catch (error) {}
      const handler = this['on' + type];
      if (typeof handler === 'function') {
        try {
          handler.call(this, new Event(type));
        } catch (error) {}
      }
    };

    try {
      const loaded = await loadLocalBlob(local.projectPath);
      if (!loaded) {
        Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
        Object.defineProperty(this, 'status', { value: 404, configurable: true });
        Object.defineProperty(this, 'statusText', { value: 'Not Found', configurable: true });
        Object.defineProperty(this, 'responseURL', { value: new URL(local.url, BASE_URL).href, configurable: true });
        this.getResponseHeader = () => null;
        this.getAllResponseHeaders = () => '';
        fire('readystatechange');
        fire('error');
        fire('loadend');
        delete this.__webEditorLocal;
        return;
      }

      const arrayBuffer = await loaded.blob.arrayBuffer();
      const text = new TextDecoder().decode(arrayBuffer);
      let responseValue = text;
      if (this.responseType === 'arraybuffer') {
        responseValue = arrayBuffer;
      } else if (this.responseType === 'blob') {
        responseValue = loaded.blob;
      } else if (this.responseType === 'json') {
        responseValue = text ? JSON.parse(text) : null;
      }

      Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
      Object.defineProperty(this, 'status', { value: 200, configurable: true });
      Object.defineProperty(this, 'statusText', { value: 'OK', configurable: true });
      Object.defineProperty(this, 'responseURL', { value: new URL(local.url, BASE_URL).href, configurable: true });
      Object.defineProperty(this, 'response', { value: responseValue, configurable: true });
      if (this.responseType === '' || this.responseType === 'text') {
        Object.defineProperty(this, 'responseText', { value: text, configurable: true });
      }
      Object.defineProperty(this, 'responseXML', { value: null, configurable: true });
      this.getResponseHeader = (name) => String(name || '').toLowerCase() === 'content-type' ? (loaded.record.mime || loaded.blob.type || 'application/octet-stream') : null;
      this.getAllResponseHeaders = () => 'content-type: ' + (loaded.record.mime || loaded.blob.type || 'application/octet-stream') + '\r\n';
      fire('readystatechange');
      fire('load');
      fire('loadend');
    } catch (error) {
      Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
      Object.defineProperty(this, 'status', { value: 500, configurable: true });
      Object.defineProperty(this, 'statusText', { value: 'Error', configurable: true });
      fire('readystatechange');
      fire('error');
      fire('loadend');
    } finally {
      delete this.__webEditorLocal;
    }
  };
})();`;
  }

  function ensureHeadElement(doc) {
    if (doc.head) {
      return;
    }
    const head = doc.createElement('head');
    if (doc.documentElement.firstChild) {
      doc.documentElement.insertBefore(head, doc.documentElement.firstChild);
    } else {
      doc.documentElement.appendChild(head);
    }
  }

  async function rewriteSrcSet(value, ownerPath, cache) {

    const parts = value.split(',');
    const output = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      const pieces = trimmed.split(/\s+/);
      const urlPart = pieces.shift();
      const descriptor = pieces.join(' ');
      const rewritten = await resolveUrlForPreview(urlPart, ownerPath, cache);
      output.push([rewritten || urlPart, descriptor].filter(Boolean).join(' '));
    }
    return output.join(', ');
  }

  async function resolveUrlForPreview(rawUrl, ownerPath, cache, allowHtmlNavigation = false) {
    if (!rawUrl) {
      return rawUrl;
    }
    const trimmed = rawUrl.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('javascript:')
    ) {
      return trimmed;
    }

    const [pathPart, fragment = ''] = trimmed.split('#');
    const [cleanPath, query = ''] = pathPart.split('?');
    const resolvedPath = normalizeProjectReference(ownerPath, cleanPath);
    if (!resolvedPath || !state.entries.has(resolvedPath)) {
      return trimmed;
    }

    const entry = state.entries.get(resolvedPath);
    if (!entry || entry.kind !== 'file') {
      return trimmed;
    }

    let objectUrl = cache.get(resolvedPath);
    if (!objectUrl) {
      objectUrl = await getObjectUrlForFile(resolvedPath, cache);
      cache.set(resolvedPath, objectUrl);
    }

    if (!objectUrl) {
      return trimmed;
    }

    if (query) {
      objectUrl += `?${query}`;
    }
    if (fragment) {
      objectUrl += `#${fragment}`;
    }

    if (!allowHtmlNavigation && /^(html|htm)$/i.test(getExtension(resolvedPath))) {
      return objectUrl;
    }

    return objectUrl;
  }

  async function getObjectUrlForFile(path, cache = new Map()) {
    const entry = state.entries.get(path);
    if (!entry || entry.kind !== 'file') {
      return '';
    }
    if (cache.has(path)) {
      return cache.get(path);
    }

    const ext = getExtension(path);
    let blob;

    if (entry.encoding === 'text') {
      let text = path === state.openFilePath && state.openFileIsText ? els.codeEditor.value : entry.content;
      if (ext === 'css') {
        text = await rewriteCssText(text, path, cache);
      }
      blob = new Blob([text], { type: entry.mime || guessMime(path, true) });
    } else {
      blob = dataUrlToBlob(entry.content, entry.mime || guessMime(path, false));
    }

    const url = registerObjectUrl(blob);
    cache.set(path, url);
    return url;
  }

  async function rewriteCssText(cssText, ownerPath, cache) {

    let result = cssText;

    const urlPattern = /url\((.*?)\)/gi;
    const urlMatches = Array.from(cssText.matchAll(urlPattern));
    for (const match of urlMatches) {
      const full = match[0];
      let inner = (match[1] || '').trim();
      const quote = inner.startsWith('"') || inner.startsWith("'") ? inner[0] : '';
      if (quote) {
        inner = inner.slice(1, -1);
      }
      const rewritten = await resolveUrlForPreview(inner, ownerPath, cache);
      if (rewritten && rewritten !== inner) {
        result = result.replace(full, `url(${quote}${rewritten}${quote})`);
      }
    }

    const importPattern = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/gi;
    const importMatches = Array.from(result.matchAll(importPattern));
    for (const match of importMatches) {
      const original = match[0];
      const target = match[1];
      const rewritten = await resolveUrlForPreview(target, ownerPath, cache);
      if (rewritten && rewritten !== target) {
        result = result.replace(original, original.replace(target, rewritten));
      }
    }

    return result;
  }

  function normalizeProjectReference(ownerPath, rawRef) {
    if (!rawRef) {
      return '';
    }
    const ref = rawRef.trim();
    if (ref.startsWith('/')) {
      return normalizePath(ref.slice(1));
    }
    const baseDir = dirname(ownerPath);
    return normalizePath(baseDir ? `${baseDir}/${ref}` : ref);
  }

  function cleanupObjectUrls() {
    for (const url of state.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
      }
    }
    state.objectUrls = [];
  }

  function registerObjectUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    return url;
  }

  function setImageZoom(value) {

    state.imageZoom = Number(value.toFixed(2));
    els.imagePreview.style.transform = `scale(${state.imageZoom})`;
    els.zoomLabel.textContent = `${Math.round(state.imageZoom * 100)}%`;
  }

  async function exportZip() {
    const files = [];
    for (const entry of Array.from(state.entries.values()).sort((a, b) => a.path.localeCompare(b.path))) {
      if (entry.kind === 'folder') {
        files.push({
          path: `${entry.path.replace(/\/+$/, '')}/`,
          data: new Uint8Array(0),
          isDir: true
        });
        continue;
      }
      const data = entry.encoding === 'text'
        ? new TextEncoder().encode(entry.path === state.openFilePath && state.openFileIsText && state.isDirty ? els.codeEditor.value : entry.content)
        : new Uint8Array(await dataUrlToArrayBuffer(entry.content));
      files.push({
        path: entry.path,
        data,
        isDir: false
      });
    }

    const zipBlob = await buildZip(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-project.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function buildZip(files) {
    const encoder = new TextEncoder();
    const fileRecords = [];
    let offset = 0;

    for (const file of files) {
      const pathBytes = encoder.encode(file.path);
      const data = file.data;
      const crc = crc32(data);
      const localHeader = new Uint8Array(30 + pathBytes.length);
      const localView = new DataView(localHeader.buffer);

      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, pathBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(pathBytes, 30);

      fileRecords.push({ localHeader, data, pathBytes, crc, offset });
      offset += localHeader.length + data.length;
    }

    let centralSize = 0;
    const centralParts = [];
    for (const record of fileRecords) {
      const centralHeader = new Uint8Array(46 + record.pathBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, record.crc, true);
      centralView.setUint32(20, record.data.length, true);
      centralView.setUint32(24, record.data.length, true);
      centralView.setUint16(28, record.pathBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, record.pathBytes[record.pathBytes.length - 1] === 47 ? 0x10 : 0, true);
      centralView.setUint32(42, record.offset, true);
      centralHeader.set(record.pathBytes, 46);
      centralParts.push(centralHeader);
      centralSize += centralHeader.length;
    }

    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, fileRecords.length, true);
    endView.setUint16(10, fileRecords.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    const parts = [];
    for (const record of fileRecords) {
      parts.push(record.localHeader, record.data);
    }
    parts.push(...centralParts, end);
    return new Blob(parts, { type: 'application/zip' });
  }

  function crc32(bytes) {
    let crc = -1;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function dataUrlToBlob(dataUrl, mimeFallback) {
    const [meta, data] = dataUrl.split(',');
    const mimeMatch = /data:([^;]+)/.exec(meta || '');
    const mime = mimeMatch?.[1] || mimeFallback || 'application/octet-stream';
    const binary = atob(data || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  async function dataUrlToArrayBuffer(dataUrl) {
    const blob = dataUrlToBlob(dataUrl);
    return blob.arrayBuffer();
  }

  function textToDataUrl(text, mime) {
    return blobToDataUrl(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function isTextType(path, mime = '') {
    const ext = getExtension(path);
    if (TEXT_EXTENSIONS.has(ext)) {
      return true;
    }
    return /^text\//.test(mime) || /json|xml|javascript|ecmascript|svg\+xml/.test(mime);
  }

  function guessMime(path, isText) {
    const ext = getExtension(path);
    return MIME_BY_EXT[ext] || (isText ? 'text/plain;charset=utf-8' : 'application/octet-stream');
  }

  function normalizePath(input) {
    if (!input) {
      return '';
    }
    const cleaned = input.replace(/\\/g, '/').replace(/^\/+/, '');
    const pieces = cleaned.split('/');
    const stack = [];
    for (const piece of pieces) {
      if (!piece || piece === '.') {
        continue;
      }
      if (piece === '..') {
        stack.pop();
        continue;
      }
      stack.push(piece);
    }
    return stack.join('/');
  }

  function dirname(path) {
    const normalized = normalizePath(path);
    const index = normalized.lastIndexOf('/');
    return index === -1 ? '' : normalized.slice(0, index);
  }

  function getExtension(path) {
    const name = path.split('/').pop() || '';
    const dot = name.lastIndexOf('.');
    if (dot === -1) {
      return '';
    }
    return name.slice(dot + 1).toLowerCase();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
