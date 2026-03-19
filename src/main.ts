// Material Web component imports
import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/slider/slider.js';
import '@material/web/icon/icon.js';
import '@material/web/divider/divider.js';

import { App } from './ui/app.js';
import { initResizers } from './ui/resizer.js';

const app = new App();
app.init();
initResizers();

// Add collapse functionality to right-side panels
document.querySelectorAll('#right-panels > .panel').forEach(panel => {
  const header = panel.querySelector('.panel-header');
  if (!header) return;

  // Add collapse chevron
  const chevron = document.createElement('span');
  chevron.className = 'collapse-icon material-symbols-outlined';
  chevron.textContent = 'expand_more';
  header.insertBefore(chevron, header.firstChild);

  // Click header to toggle collapse (but not when clicking action buttons)
  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.panel-actions')) return;
    const el = panel as HTMLElement;
    el.classList.toggle('collapsed');

    // When expanding, reset inline styles so flex: 1 from CSS takes effect
    if (!el.classList.contains('collapsed')) {
      el.style.flex = '';
      el.style.height = '';
    }
  });
});
