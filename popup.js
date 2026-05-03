const COLORS   = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
const DEFAULTS = { colorMode: 'fixed', fixedColor: 'yellow' };

const modeFixed   = document.getElementById('mode-fixed');
const modeRgb     = document.getElementById('mode-rgb');
const colorSelect = document.getElementById('color-select');
const statusEl    = document.getElementById('status');
const clearBtn    = document.getElementById('clear-btn');

let statusTimer = null;
function flashStatus(text) {
    statusEl.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1200);
}

async function load() {
    const settings = await chrome.storage.sync.get(DEFAULTS);
    if (settings.colorMode === 'rgb') modeRgb.checked = true;
    else                              modeFixed.checked = true;
    colorSelect.value    = COLORS.includes(settings.fixedColor) ? settings.fixedColor : 'yellow';
    colorSelect.disabled = (settings.colorMode === 'rgb');
}

async function save() {
    const colorMode  = modeRgb.checked ? 'rgb' : 'fixed';
    const fixedColor = colorSelect.value;
    await chrome.storage.sync.set({ colorMode, fixedColor });
    colorSelect.disabled = (colorMode === 'rgb');
    flashStatus('Saved');
}

[modeFixed, modeRgb, colorSelect].forEach((el) => {
    el.addEventListener('change', save);
});

colorSelect.addEventListener('focus', () => {
    if (!modeFixed.checked) {
        modeFixed.checked = true;
        save();
    }
});

clearBtn.addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({ action: 'clear' });
        flashStatus('Cleared');
    } catch (e) {
        flashStatus('Error: ' + e.message);
    }
});

load();
