const statusEl = document.getElementById('status');
const clearBtn = document.getElementById('clear-btn');

let statusTimer = null;
function flashStatus(text) {
    statusEl.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1200);
}

clearBtn.addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({ action: 'clear' });
        flashStatus('Cleared');
    } catch (e) {
        flashStatus('Error: ' + e.message);
    }
});
