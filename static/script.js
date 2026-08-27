const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const messagesContainer = document.getElementById("messages");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-chat");
const welcomeScreen = document.getElementById("welcome-screen");
const characterCount = document.getElementById("character-count");

const MAX_LENGTH = 4000;


/* =========================
   Utility Functions
   ========================= */

function scrollToBottom() {
    const chatContainer = document.querySelector(".chat-container");

    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth"
    });
}


function updateCharacterCount() {
    characterCount.textContent =
        `${messageInput.value.length} / ${MAX_LENGTH}`;
}


function hideWelcomeScreen() {
    welcomeScreen.style.display = "none";
}


function showWelcomeScreen() {
    welcomeScreen.style.display = "block";
}


/* =========================
   Add Message
   ========================= */

function addMessage(role, content) {

    const message = document.createElement("div");

    message.className = `message ${role}`;

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.textContent = role === "user" ? "U" : "R";


    const messageContent = document.createElement("div");

    messageContent.className = "message-content";


    if (role === "assistant") {

        /*
         * Convert Markdown returned by the LLM into HTML.
         * DOMPurify removes potentially unsafe HTML.
         */
        if (
            typeof marked !== "undefined" &&
            typeof DOMPurify !== "undefined"
        ) {
            messageContent.innerHTML = DOMPurify.sanitize(
                marked.parse(content)
            );
        } else {
            messageContent.textContent = content;
        }

    } else {

        // User messages are always treated as plain text.
        messageContent.textContent = content;

    }


    message.appendChild(avatar);
    message.appendChild(messageContent);

    messagesContainer.appendChild(message);

    scrollToBottom();
}


/* =========================
   Loading Indicator
   ========================= */

function showLoading() {

    const message = document.createElement("div");

    message.className = "message assistant";
    message.id = "loading-message";

    message.innerHTML = `
        <div class="message-avatar">R</div>

        <div class="message-content">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(message);

    scrollToBottom();
}


function removeLoading() {

    const loadingMessage =
        document.getElementById("loading-message");

    if (loadingMessage) {
        loadingMessage.remove();
    }
}


/* =========================
   Send Message
   ========================= */

async function sendMessage(message) {

    if (!message || sendButton.disabled) {
        return;
    }


    hideWelcomeScreen();

    addMessage("user", message);

    messageInput.value = "";

    updateCharacterCount();

    sendButton.disabled = true;

    showLoading();


    try {

        const response = await fetch("/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })
        });


        const data = await response.json();

        removeLoading();


        if (!response.ok) {

            addMessage(
                "assistant",
                data.error || "Something went wrong."
            );

            return;
        }


        addMessage(
            "assistant",
            data.response
        );


    } catch (error) {

        console.error("Request error:", error);

        removeLoading();

        addMessage(
            "assistant",
            "I couldn't connect to the server. Please make sure Flask is running and try again."
        );

    } finally {

        sendButton.disabled = false;

        messageInput.focus();
    }
}


/* =========================
   Form Submission
   ========================= */

chatForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    await sendMessage(message);
});


/* =========================
   Enter Key
   ========================= */

messageInput.addEventListener("keydown", (event) => {

    /*
     * Enter sends the message.
     * Shift + Enter creates a new line.
     */

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();

        chatForm.requestSubmit();
    }
});


/* =========================
   Auto Resize Textarea
   ========================= */

messageInput.addEventListener("input", () => {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 160) + "px";

    updateCharacterCount();
});


/* =========================
   Example Prompt Buttons
   ========================= */

document.querySelectorAll(".prompt-card").forEach((button) => {

    button.addEventListener("click", () => {

        const prompt = button.dataset.prompt;

        messageInput.value = prompt;

        updateCharacterCount();

        messageInput.focus();

        chatForm.requestSubmit();
    });
});


/* =========================
   Clear Chat
   ========================= */

clearButton.addEventListener("click", () => {

    messagesContainer.innerHTML = "";

    showWelcomeScreen();

    messageInput.value = "";

    updateCharacterCount();

    messageInput.focus();
});


/* =========================
   Initial State
   ========================= */

updateCharacterCount();
messageInput.focus();