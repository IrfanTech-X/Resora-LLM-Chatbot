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
// ADD CHAT MESSAGE
// =========================================================

function addMessage(
    role,
    content
) {

    const messageElement =
        document.createElement(
            "article"
        );


    messageElement.className =
        `message ${role}`;


    // -----------------------------------------------------
    // Label
    // -----------------------------------------------------

    const label =
        document.createElement(
            "div"
        );


    label.className =
        "message-label";


    label.textContent =
        role === "user"
            ? "You"
            : "Resora";


    // -----------------------------------------------------
    // Message content
    // -----------------------------------------------------

    const contentElement =
        document.createElement(
            "div"
        );


    contentElement.className =
        "message-content";


    // -----------------------------------------------------
    // Assistant Markdown
    // -----------------------------------------------------

    if (role === "assistant") {

        if (
            typeof marked !== "undefined" &&
            typeof DOMPurify !== "undefined"
        ) {

            const html =
                marked.parse(content);


            contentElement.innerHTML =
                DOMPurify.sanitize(
                    html
                );

        } else {

            contentElement.textContent =
                content;
        }

    }

    // -----------------------------------------------------
    // User message
    // -----------------------------------------------------

    else {

        contentElement.textContent =
            content;
    }


    // -----------------------------------------------------
    // Assemble message
    // -----------------------------------------------------

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
// SEND MESSAGE
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


    // Hide welcome
    hideWelcome();


    // Display user message
    addMessage(
        "user",
        message
    );


    // Reset input
    messageInput.value = "";


    updateCharacterCount();


    messageInput.style.height =
        "auto";


    // Disable send button
    sendButton.disabled =
        true;


    // Show loading
    showLoading();


    try {

        // -------------------------------------------------
        // Send request to Flask
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
        // Parse response
        // -------------------------------------------------

        const data =
            await response.json();


        // Remove loading
        removeLoading();


        // -------------------------------------------------
        // Handle API error
        // -------------------------------------------------

        if (!response.ok) {

            addMessage(
                "assistant",
                data.error ||
                "Something went wrong."
            );

            return;
        }


        // -------------------------------------------------
        // Display response
        // -------------------------------------------------

        addMessage(
            "assistant",
            data.response
        );


    } catch (error) {

        console.error(
            "Resora request error:",
            error
        );


        removeLoading();


        addMessage(
            "assistant",
            "I couldn't connect to the Resora server. Please make sure Flask is running and try again."
        );


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

        // Enter sends
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
// TEXTAREA AUTO RESIZE
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
// NEW CHAT FUNCTION
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


// =========================================================
// NEW CHAT BUTTONS
// =========================================================

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
// SIDEBAR WORKSPACE BUTTONS
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
// INITIAL STATE
// =========================================================

updateCharacterCount();

messageInput.focus();