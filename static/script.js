// ============================================================================
// Resora — chat interactions
// Wire this up to your Flask endpoint by editing CHAT_ENDPOINT below.
// Expects: POST { message: string } -> JSON { reply: string }
// ============================================================================

const CHAT_ENDPOINT = '/chat';

const els = {
    welcome: document.getElementById('welcome-screen'),
    messages: document.getElementById('messages'),
    form: document.getElementById('chat-form'),
    textarea: document.getElementById('message'),
    sendBtn: document.getElementById('send-button'),
    charCount: document.getElementById('character-count'),
    clearBtn: document.getElementById('clear-chat'),
};

let history = [];

// ---- textarea: auto-grow + live character count -------------------------

function autoGrow() {
    els.textarea.style.height = 'auto';
    els.textarea.style.height = Math.min(els.textarea.scrollHeight, 200) + 'px';
}

function updateCharCount() {
    const len = els.textarea.value.length;
    els.charCount.textContent = `${len} / 4000`;
}

els.textarea.addEventListener('input', () => {
    autoGrow();
    updateCharCount();
    els.sendBtn.disabled = els.textarea.value.trim().length === 0;
});

els.textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.form.requestSubmit();
    }
});

// ---- rendering -------------------------------------------------------------

function renderMarkdown(text) {
    if (window.marked && window.DOMPurify) {
        const raw = marked.parse(text, { breaks: true });
        return DOMPurify.sanitize(raw);
    }
    // fallback: escape + preserve line breaks
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
}

function appendMessage(role, text) {
    hideWelcome();

    const wrap = document.createElement('div');
    wrap.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';

    const body = document.createElement('div');
    body.className = 'message-body';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = renderMarkdown(text);

    body.appendChild(content);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    els.messages.appendChild(wrap);

    scrollToBottom();
    return content;
}

function appendTyping() {
    hideWelcome();

    const wrap = document.createElement('div');
    wrap.className = 'message assistant';
    wrap.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';

    const body = document.createElement('div');
    body.className = 'message-body';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

    body.appendChild(content);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    els.messages.appendChild(wrap);

    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function hideWelcome() {
    if (els.welcome && !els.welcome.hidden) {
        els.welcome.hidden = true;
    }
}

function scrollToBottom() {
    const container = document.querySelector('.chat-container');
    container.scrollTop = container.scrollHeight;
}

// ---- sending -----------------------------------------------------------

async function sendMessage(text) {
    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    els.sendBtn.disabled = true;
    appendTyping();

    try {
        const res = await fetch(CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history }),
        });

        if (!res.ok) throw new Error(`Request failed (${res.status})`);

        const data = await res.json();
        const reply = data.reply ?? data.response ?? data.message ?? 'Sorry, I could not generate a response.';

        removeTyping();
        appendMessage('assistant', reply);
        history.push({ role: 'assistant', content: reply });
    } catch (err) {
        removeTyping();
        appendMessage(
            'assistant',
            `⚠️ Couldn't reach Resora's backend (\`${CHAT_ENDPOINT}\`). ${err.message}`
        );
    } finally {
        els.sendBtn.disabled = els.textarea.value.trim().length === 0;
    }
}

els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.textarea.value.trim();
    if (!text) return;

    els.textarea.value = '';
    autoGrow();
    updateCharCount();
    sendMessage(text);
});

// ---- prompt cards --------------------------------------------------------

document.querySelectorAll('.prompt-card').forEach((card) => {
    card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        if (!prompt) return;
        els.textarea.value = prompt;
        autoGrow();
        updateCharCount();
        els.sendBtn.disabled = false;
        els.form.requestSubmit();
    });
});

// ---- clear chat ----------------------------------------------------------

els.clearBtn.addEventListener('click', () => {
    els.messages.innerHTML = '';
    history = [];
    els.welcome.hidden = false;
    els.textarea.value = '';
    autoGrow();
    updateCharCount();
    els.sendBtn.disabled = true;
});

// ---- init ------------------------------------------------------------------

updateCharCount();
els.sendBtn.disabled = true;