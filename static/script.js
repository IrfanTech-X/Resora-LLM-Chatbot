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
// WELCOME
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
// RENDER MARKDOWN
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
// STREAM CHAT RESPONSE
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


    hideWelcome();


    // -----------------------------------------------------
    // Display user message
    // -----------------------------------------------------

    addUserMessage(
        message
    );


    // -----------------------------------------------------
    // Clear input
    // -----------------------------------------------------

    messageInput.value = "";

    updateCharacterCount();

    messageInput.style.height =
        "auto";


    // -----------------------------------------------------
    // Disable input
    // -----------------------------------------------------

    sendButton.disabled =
        true;


    showLoading();


    try {

        // -------------------------------------------------
        // Send request
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
                            message

                    })

                }
            );


        // -------------------------------------------------
        // HTTP error
        // -------------------------------------------------

        if (!response.ok) {

            removeLoading();


            let errorMessage =
                "Something went wrong.";


            try {

                const errorData =
                    await response.json();


                if (errorData.error) {

                    errorMessage =
                        errorData.error;
                }

            } catch {

                // Keep default message
            }


            addUserMessage(
                ""
            );


            const lastMessage =
                messagesContainer.lastElementChild;


            lastMessage.remove();


            const errorElement =
                createAssistantMessage();


            errorElement.textContent =
                errorMessage;


            return;
        }


        // -------------------------------------------------
        // Remove loading
        // -------------------------------------------------

        removeLoading();


        // -------------------------------------------------
        // Create empty Resora message
        // -------------------------------------------------

        const assistantContent =
            createAssistantMessage();


        let fullResponse = "";


        // -------------------------------------------------
        // Read streaming body
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


            // Decode current chunk
            buffer += decoder.decode(
                value,
                {
                    stream: true
                }
            );


            // SSE events are separated by blank lines
            const events =
                buffer.split(
                    "\n\n"
                );


            // Keep incomplete event
            buffer =
                events.pop();


            // Process complete events
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
                        // Error from Flask
                        // ---------------------------------

                        if (data.error) {

                            throw new Error(
                                data.error
                            );
                        }


                        // ---------------------------------
                        // New text chunk
                        // ---------------------------------

                        if (
                            data.content
                        ) {

                            fullResponse +=
                                data.content;


                            /*
                             * Re-render Markdown as the
                             * response grows.
                             */

                            renderMarkdown(
                                assistantContent,
                                fullResponse
                            );


                            scrollToBottom();
                        }


                        // ---------------------------------
                        // Finished
                        // ---------------------------------

                        if (
                            data.done
                        ) {

                            renderMarkdown(
                                assistantContent,
                                fullResponse
                            );
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
        // Process any remaining buffer
        // -------------------------------------------------

        if (buffer.trim()) {

            const lines =
                buffer.split("\n");


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


                try {

                    const data =
                        JSON.parse(
                            line.slice(6)
                        );


                    if (
                        data.content
                    ) {

                        fullResponse +=
                            data.content;


                        renderMarkdown(
                            assistantContent,
                            fullResponse
                        );
                    }

                } catch (error) {

                    console.error(
                        "Final stream parsing error:",
                        error
                    );
                }
            }
        }


    } catch (error) {

        console.error(
            "Resora streaming error:",
            error
        );


        removeLoading();


        // Remove any incomplete assistant response
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
// FORM SUBMISSION
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
// ENTER / SHIFT+ENTER
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
// RESEARCH CARDS
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


    showWelcome();


    messageInput.value =
        "";


    updateCharacterCount();


    messageInput.style.height =
        "auto";


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
// INITIALIZATION
// =========================================================

updateCharacterCount();

messageInput.focus();