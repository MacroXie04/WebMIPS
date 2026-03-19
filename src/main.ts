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
