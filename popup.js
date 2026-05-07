const DEFAULTS = { effectMode: 'strobe' };

const radios   = document.querySelectorAll('input[name="effect"]');
const statusEl = document.getElementById('status');
const clearBtn = document.getElementById('clear-btn');

let statusTimer = null;
function flashStatus(text) {
    statusEl.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1200);
}

async function load() {
    const settings = await chrome.storage.sync.get(DEFAULTS);
    const radio    = document.getElementById('effect-' + settings.effectMode);
    if (radio) radio.checked = true;
    else       document.getElementById('effect-strobe').checked = true;
}

async function save() {
    const checked = document.querySelector('input[name="effect"]:checked');
    if (!checked) return;
    await chrome.storage.sync.set({ effectMode: checked.value });
    flashStatus('Saved');
}

radios.forEach((r) => r.addEventListener('change', save));

clearBtn.addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({ action: 'clear' });
        flashStatus('Stopped');
    } catch (e) {
        flashStatus('Error: ' + e.message);
    }
});

load();
