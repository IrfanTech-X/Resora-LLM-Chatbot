const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const responseDiv = document.getElementById("response");


chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    responseDiv.textContent = "Resora is thinking...";

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

        if (!response.ok) {
            responseDiv.textContent =
                data.error || "Something went wrong.";
            return;
        }

        responseDiv.textContent = data.response;

        messageInput.value = "";

    } catch (error) {
        console.error(error);

        responseDiv.textContent =
            "Unable to connect to the server.";
    }
});