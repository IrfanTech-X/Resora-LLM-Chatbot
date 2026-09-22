// =========================================================
// DOM ELEMENTS
// =========================================================

const chatForm =
    document.getElementById("chat-form");

const messageInput =
    document.getElementById("message");

const messagesContainer =
    document.getElementById("messages");

const sendButton =
    document.getElementById("send-button");

const welcomeScreen =
    document.getElementById("welcome-screen");

const clearChatButton =
    document.getElementById("new-chat");

const newChatTop =
    document.getElementById("new-chat-top");

const characterCount =
    document.getElementById("character-count");

const mobileMenu =
    document.getElementById("mobile-menu");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebar-overlay");

// New feature: model picker

const modelSelect =
    document.getElementById("model-select");

// New feature: document upload (RAG)

const documentInput =
    document.getElementById("document-input");

const attachDocumentButton =
    document.getElementById("attach-document");

const documentBar =
    document.getElementById("document-bar");

const documentNameLabel =
    document.getElementById("document-name");

const documentStatusLabel =
    document.getElementById("document-status");

const removeDocumentButton =
    document.getElementById("remove-document");


const MAX_LENGTH = 4000;


// =========================================================
// CONVERSATION MEMORY
// =========================================================

let conversationHistory = [];


// =========================================================
// SESSION ID (new feature - RAG)
// =========================================================
// A per-browser-tab id so the server can keep this tab's uploaded
// document separate from every other visitor's. It never needs to
// be predictable or persisted -- just unique for this page load.

const sessionId =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `resora-${Date.now()}-${Math.random().toString(16).slice(2)}`;


// =========================================================
// SELECTED MODEL (new feature)
// =========================================================

let selectedModel = "";


let hasUploadedDocument = false;


// =========================================================
// LOAD AVAILABLE GROQ MODELS (new feature)
// =========================================================

async function loadModels() {

    try {

        const response =
            await fetch("/models");

        if (!response.ok) {
            throw new Error("Failed to load models.");
        }

        const data =
            await response.json();

        const models =
            Array.isArray(data.models) ?
                data.models :
                [];

        modelSelect.innerHTML = "";

        if (models.length === 0) {

            const option =
                document.createElement("option");

            option.value = data.default || "";

            option.textContent = data.default || "Default model";

            modelSelect.appendChild(option);

        } else {

            models.forEach((model) => {

                const option =
                    document.createElement("option");

                option.value = model.id;

                option.textContent = model.id;

                modelSelect.appendChild(option);
            });
        }

        // Preselect the server's default model so behavior is
        // identical to before unless the user changes it.

        selectedModel = data.default || models[0]?.id || "";

        modelSelect.value = selectedModel;

    } catch (error) {

        console.error("Could not load Groq models:", error);

        modelSelect.innerHTML =
            '<option value="">Default model</option>';

        selectedModel = "";
    }
}


modelSelect.addEventListener(
    "change",
    () => {
        selectedModel = modelSelect.value;
    }
);


// =========================================================
// SCROLL
// =========================================================

function scrollToBottom() {

    const contentArea =
        document.querySelector(".content-area");


    contentArea.scrollTo({

        top: contentArea.scrollHeight,

        behavior: "smooth"

    });
}


// =========================================================
// CHARACTER COUNT
// =========================================================

function updateCharacterCount() {

    characterCount.textContent =
        `${messageInput.value.length} / ${MAX_LENGTH}`;
}


// =========================================================
// WELCOME SCREEN
// =========================================================

function hideWelcome() {

    welcomeScreen.style.display =
        "none";
}


function showWelcome() {

    welcomeScreen.style.display =
        "block";
}


// =========================================================
// MOBILE SIDEBAR
// =========================================================

function closeMobileSidebar() {

    sidebar.classList.remove(
        "open"
    );

    sidebarOverlay.classList.remove(
        "show"
    );
}


// =========================================================
// ADD USER MESSAGE
// =========================================================

function addUserMessage(content) {

    const messageElement =
        document.createElement(
            "article"
        );


    messageElement.className =
        "message user";


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "message-label";


    label.textContent =
        "You";


    const contentElement =
        document.createElement(
            "div"
        );


    contentElement.className =
        "message-content";


    contentElement.textContent =
        content;


    messageElement.appendChild(
        label
    );


    messageElement.appendChild(
        contentElement
    );


    messagesContainer.appendChild(
        messageElement
    );


    scrollToBottom();
}


// =========================================================
// CREATE RESORA MESSAGE
// =========================================================

function createAssistantMessage() {

    const messageElement =
        document.createElement(
            "article"
        );


    messageElement.className =
        "message assistant";


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "message-label";


    label.textContent =
        "Resora";


    const contentElement =
        document.createElement(
            "div"
        );


    contentElement.className =
        "message-content";


    messageElement.appendChild(
        label
    );


    messageElement.appendChild(
        contentElement
    );


    messagesContainer.appendChild(
        messageElement
    );


    return contentElement;
}


// =========================================================
// LOADING INDICATOR
// =========================================================

function showLoading() {

    const loading =
        document.createElement(
            "article"
        );


    loading.id =
        "loading-message";


    loading.className =
        "message assistant";


    loading.innerHTML = `

        <div class="message-label">
            Resora
        </div>

        <div class="message-content">

            <div class="typing-indicator">

                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>

            </div>

        </div>

    `;


    messagesContainer.appendChild(
        loading
    );


    scrollToBottom();
}


function removeLoading() {

    const loading =
        document.getElementById(
            "loading-message"
        );


    if (loading) {

        loading.remove();
    }
}


// =========================================================
// MARKDOWN RENDERING
// =========================================================

function renderMarkdown(
    element,
    content
) {

    if (
        typeof marked !== "undefined" &&
        typeof DOMPurify !== "undefined"
    ) {

        const html =
            marked.parse(content);


        element.innerHTML =
            DOMPurify.sanitize(
                html
            );

    } else {

        element.textContent =
            content;
    }
}


// =========================================================
// STREAM RESPONSE
// =========================================================

async function sendMessage(
    message
) {

    if (
        !message ||
        sendButton.disabled
    ) {

        return;
    }


    // -----------------------------------------------------
    // Hide welcome screen
    // -----------------------------------------------------

    hideWelcome();


    // -----------------------------------------------------
    // Display user's message
    // -----------------------------------------------------

    addUserMessage(
        message
    );


    // -----------------------------------------------------
    // Add current user message to history
    // -----------------------------------------------------

    conversationHistory.push({

        role: "user",

        content: message

    });


    // -----------------------------------------------------
    // Clear input
    // -----------------------------------------------------

    messageInput.value = "";

    messageInput.style.height =
        "auto";

    updateCharacterCount();


    // -----------------------------------------------------
    // Disable send
    // -----------------------------------------------------

    sendButton.disabled =
        true;


    showLoading();


    try {

        // -------------------------------------------------
        // Send request with conversation history
        // -------------------------------------------------

        const response =
            await fetch(
                "/chat",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        message:
                            message,

                        history:
                            conversationHistory
                                .slice(
                                    0,
                                    -1
                                ),

                        model:
                            selectedModel,

                        session_id:
                            sessionId

                    })

                }
            );


        // -------------------------------------------------
        // Handle HTTP errors
        // -------------------------------------------------

        if (!response.ok) {

            removeLoading();


            let errorMessage =
                "Something went wrong.";


            try {

                const errorData =
                    await response.json();


                if (
                    errorData.error
                ) {

                    errorMessage =
                        errorData.error;
                }

            } catch {

                // Use default message
            }


            const errorElement =
                createAssistantMessage();


            errorElement.textContent =
                errorMessage;


            // Remove user message from history
            conversationHistory.pop();


            return;
        }


        // -------------------------------------------------
        // Remove typing indicator
        // -------------------------------------------------

        removeLoading();


        // -------------------------------------------------
        // Create empty assistant message
        // -------------------------------------------------

        const assistantContent =
            createAssistantMessage();


        let fullResponse = "";


        // -------------------------------------------------
        // Read response stream
        // -------------------------------------------------

        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder();


        let buffer = "";


        // -------------------------------------------------
        // Read chunks
        // -------------------------------------------------

        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {

                break;
            }


            buffer += decoder.decode(
                value,
                {
                    stream: true
                }
            );


            // -------------------------------------------------
            // Separate SSE events
            // -------------------------------------------------

            const events =
                buffer.split(
                    "\n\n"
                );


            buffer =
                events.pop();


            // -------------------------------------------------
            // Process events
            // -------------------------------------------------

            for (
                const event
                of events
            ) {

                const lines =
                    event.split("\n");


                for (
                    const line
                    of lines
                ) {

                    if (
                        !line.startsWith(
                            "data: "
                        )
                    ) {

                        continue;
                    }


                    const jsonText =
                        line.slice(
                            6
                        );


                    try {

                        const data =
                            JSON.parse(
                                jsonText
                            );


                        // ---------------------------------
                        // Server error
                        // ---------------------------------

                        if (
                            data.error
                        ) {

                            throw new Error(
                                data.error
                            );
                        }


                        // ---------------------------------
                        // Streamed content
                        // ---------------------------------

                        if (
                            data.content
                        ) {

                            fullResponse +=
                                data.content;


                            renderMarkdown(
                                assistantContent,
                                fullResponse
                            );


                            scrollToBottom();
                        }


                    } catch (error) {

                        console.error(
                            "Stream event error:",
                            error
                        );
                    }
                }
            }
        }


        // -------------------------------------------------
        // Final rendering
        // -------------------------------------------------

        renderMarkdown(
            assistantContent,
            fullResponse
        );


        // -------------------------------------------------
        // Add assistant response to history
        // -------------------------------------------------

        if (fullResponse.trim()) {

            conversationHistory.push({

                role: "assistant",

                content:
                    fullResponse

            });

        } else {

            /*
             * If no response was generated,
             * remove the user message as well.
             */

            conversationHistory.pop();


            assistantContent.textContent =
                "Resora did not return a response. Please try again.";
        }


    } catch (error) {

        console.error(
            "Resora streaming error:",
            error
        );


        removeLoading();


        // Remove failed user turn
        conversationHistory.pop();


        // Remove incomplete assistant
        const incomplete =
            messagesContainer.lastElementChild;


        if (
            incomplete &&
            incomplete.classList.contains(
                "assistant"
            )
        ) {

            incomplete.remove();
        }


        const errorElement =
            createAssistantMessage();


        errorElement.textContent =
            "Resora is temporarily unavailable. Please try again in a few seconds.";


    } finally {

        sendButton.disabled =
            false;


        messageInput.focus();
    }
}


// =========================================================
// FORM
// =========================================================

chatForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const message =
            messageInput.value.trim();


        if (!message) {

            return;
        }


        await sendMessage(
            message
        );
    }
);


// =========================================================
// ENTER / SHIFT + ENTER
// =========================================================

messageInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            chatForm.requestSubmit();
        }
    }
);


// =========================================================
// AUTO RESIZE
// =========================================================

messageInput.addEventListener(
    "input",
    () => {

        messageInput.style.height =
            "auto";


        messageInput.style.height =
            Math.min(
                messageInput.scrollHeight,
                150
            ) + "px";


        updateCharacterCount();
    }
);


// =========================================================
// RESEARCH PROMPTS
// =========================================================

document
    .querySelectorAll(
        ".research-card"
    )
    .forEach(
        (card) => {

            card.addEventListener(
                "click",
                () => {

                    const prompt =
                        card.dataset.prompt;


                    messageInput.value =
                        prompt;


                    updateCharacterCount();


                    messageInput.focus();


                    chatForm.requestSubmit();
                }
            );
        }
    );


// =========================================================
// NEW CHAT
// =========================================================

function startNewChat() {

    messagesContainer.innerHTML =
        "";


    conversationHistory =
        [];


    showWelcome();


    messageInput.value =
        "";


    messageInput.style.height =
        "auto";


    updateCharacterCount();


    messageInput.focus();
}


clearChatButton.addEventListener(
    "click",
    startNewChat
);


if (newChatTop) {

    newChatTop.addEventListener(
        "click",
        startNewChat
    );
}


// =========================================================
// MOBILE MENU
// =========================================================

mobileMenu.addEventListener(
    "click",
    () => {

        sidebar.classList.add(
            "open"
        );


        sidebarOverlay.classList.add(
            "show"
        );
    }
);


sidebarOverlay.addEventListener(
    "click",
    closeMobileSidebar
);


// =========================================================
// SIDEBAR ITEMS
// =========================================================

document
    .querySelectorAll(
        ".side-item"
    )
    .forEach(
        (item) => {

            item.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".side-item"
                        )
                        .forEach(
                            (other) => {

                                other.classList.remove(
                                    "active"
                                );
                            }
                        );


                    item.classList.add(
                        "active"
                    );


                    closeMobileSidebar();
                }
            );
        }
    );


// =========================================================
// DOCUMENT UPLOAD (new feature - RAG)
// =========================================================

function setDocumentStatus(text) {

    documentStatusLabel.textContent =
        text || "";
}


function showDocumentBar(filename, status) {

    documentNameLabel.textContent =
        filename;

    setDocumentStatus(status);

    documentBar.hidden = false;

    attachDocumentButton.classList.add(
        "has-document"
    );

    hasUploadedDocument = true;
}


function hideDocumentBar() {

    documentBar.hidden = true;

    documentNameLabel.textContent = "";

    setDocumentStatus("");

    attachDocumentButton.classList.remove(
        "has-document"
    );

    hasUploadedDocument = false;
}


attachDocumentButton.addEventListener(
    "click",
    () => {
        documentInput.click();
    }
);


documentInput.addEventListener(
    "change",
    async () => {

        const file =
            documentInput.files[0];

        if (!file) {
            return;
        }

        showDocumentBar(
            file.name,
            "Uploading and indexing..."
        );

        attachDocumentButton.disabled = true;

        try {

            const formData =
                new FormData();

            formData.append("file", file);

            formData.append("session_id", sessionId);

            const response =
                await fetch(
                    "/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const data =
                await response.json();

            if (!response.ok || data.error) {

                throw new Error(
                    data.error ||
                    "Could not process this document."
                );
            }

            showDocumentBar(
                data.filename,
                `${data.chunks} chunk${data.chunks === 1 ? "" : "s"} indexed · used to answer your questions`
            );

        } catch (error) {

            console.error(
                "Document upload error:",
                error
            );

            hideDocumentBar();

            const errorElement =
                createAssistantMessage();

            errorElement.textContent =
                error.message ||
                "Something went wrong while uploading the document.";

            hideWelcome();

            scrollToBottom();

        } finally {

            attachDocumentButton.disabled = false;

            documentInput.value = "";
        }
    }
);


removeDocumentButton.addEventListener(
    "click",
    async () => {

        try {

            await fetch(
                "/documents/clear",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        session_id: sessionId
                    })
                }
            );

        } catch (error) {

            console.error(
                "Clear document error:",
                error
            );

        } finally {

            hideDocumentBar();
        }
    }
);


// =========================================================
// INITIALIZE
// =========================================================

updateCharacterCount();

loadModels();

messageInput.focus();