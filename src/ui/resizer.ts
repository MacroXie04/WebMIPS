const LAYOUT_KEY = 'webmips-layout';

interface LayoutState {
  editorWidth?: number;
  regHeight?: number;
  memHeight?: number;
  conHeight?: number;
  pipeHeight?: number;
}

function saveLayout(update: Partial<LayoutState>): void {
  const saved = localStorage.getItem(LAYOUT_KEY);
  const state: LayoutState = saved ? JSON.parse(saved) : {};
  Object.assign(state, update);
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(state));
}

function loadLayout(): LayoutState {
  const saved = localStorage.getItem(LAYOUT_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function initResizers(): void {
  const layout = loadLayout();
  restoreLayout(layout);
  setupHorizontalResize();
  setupVerticalResizes();
}

function restoreLayout(layout: LayoutState): void {
  const editor = document.getElementById('editor-panel');
  const right = document.getElementById('right-panels');
  const reg = document.getElementById('registers-panel');
  const mem = document.getElementById('memory-panel');
  const con = document.getElementById('console-panel');

  if (layout.editorWidth && editor && right) {
    const container = editor.parentElement!;
    const handle = document.getElementById('resize-main')!;
    const containerWidth = container.getBoundingClientRect().width;
    const handleWidth = handle.getBoundingClientRect().width;
    const editorW = Math.max(200, Math.min(containerWidth - 200 - handleWidth, layout.editorWidth));
    editor.style.flex = 'none';
    editor.style.width = editorW + 'px';
    right.style.width = (containerWidth - editorW - handleWidth) + 'px';
  }

  if (layout.regHeight && reg) {
    reg.style.flex = 'none';
    reg.style.height = layout.regHeight + 'px';
  }
  if (layout.memHeight && mem) {
    mem.style.flex = 'none';
    mem.style.height = layout.memHeight + 'px';
  }
  if (layout.conHeight && con) {
    con.style.flex = 'none';
    con.style.height = layout.conHeight + 'px';
  }

  const pipe = document.getElementById('pipeline-panel');
  if (layout.pipeHeight && pipe) {
    pipe.style.flex = 'none';
    pipe.style.height = layout.pipeHeight + 'px';
  }
}

// Editor ↔ Right panels (horizontal drag)
function setupHorizontalResize(): void {
  const handle = document.getElementById('resize-main')!;
  const editor = document.getElementById('editor-panel')!;
  const right = document.getElementById('right-panels')!;
  const container = editor.parentElement!;

  let startX = 0;
  let startEditorWidth = 0;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startEditorWidth = editor.getBoundingClientRect().width;
    document.body.classList.add('resizing-h');
    handle.classList.add('active');

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const containerWidth = container.getBoundingClientRect().width;
      const handleWidth = handle.getBoundingClientRect().width;
      const newEditorWidth = Math.max(200, Math.min(containerWidth - 200 - handleWidth, startEditorWidth + dx));
      const newRightWidth = containerWidth - newEditorWidth - handleWidth;

      editor.style.flex = 'none';
      editor.style.width = newEditorWidth + 'px';
      right.style.width = newRightWidth + 'px';
    };

    const onUp = () => {
      document.body.classList.remove('resizing-h');
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveLayout({ editorWidth: editor.getBoundingClientRect().width });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// Registers ↔ Memory and Memory ↔ Console (vertical drags)
function setupVerticalResizes(): void {
  setupVerticalResize(
    'resize-reg-mem',
    'registers-panel',
    'memory-panel',
    'regHeight',
    'memHeight',
  );
  setupVerticalResize(
    'resize-mem-con',
    'memory-panel',
    'console-panel',
    'memHeight',
    'conHeight',
  );
  setupVerticalResize(
    'resize-con-pipe',
    'console-panel',
    'pipeline-panel',
    'conHeight',
    'pipeHeight',
  );
}

function setupVerticalResize(
  handleId: string,
  topId: string,
  bottomId: string,
  topKey: keyof LayoutState,
  bottomKey: keyof LayoutState,
): void {
  const handle = document.getElementById(handleId)!;
  const top = document.getElementById(topId)!;
  const bottom = document.getElementById(bottomId)!;

  let startY = 0;
  let startTopHeight = 0;
  let startBottomHeight = 0;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startTopHeight = top.getBoundingClientRect().height;
    startBottomHeight = bottom.getBoundingClientRect().height;
    document.body.classList.add('resizing-v');
    handle.classList.add('active');

    const onMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      const totalHeight = startTopHeight + startBottomHeight;
      const newTopHeight = Math.max(80, Math.min(totalHeight - 80, startTopHeight + dy));
      const newBottomHeight = totalHeight - newTopHeight;

      top.style.flex = 'none';
      top.style.height = newTopHeight + 'px';
      bottom.style.flex = 'none';
      bottom.style.height = newBottomHeight + 'px';
    };

    const onUp = () => {
      document.body.classList.remove('resizing-v');
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveLayout({
        [topKey]: top.getBoundingClientRect().height,
        [bottomKey]: bottom.getBoundingClientRect().height,
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
