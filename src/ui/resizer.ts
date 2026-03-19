export function initResizers(): void {
  setupHorizontalResize();
  setupVerticalResizes();
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
  );
  setupVerticalResize(
    'resize-mem-con',
    'memory-panel',
    'console-panel',
  );
}

function setupVerticalResize(
  handleId: string,
  topId: string,
  bottomId: string,
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
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
