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


const MAX_LENGTH = 4000;


// =========================================================
// CONVERSATION MEMORY
// =========================================================

let conversationHistory = [];


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
                                )

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
// INITIALIZE
// =========================================================

updateCharacterCount();

messageInput.focus();