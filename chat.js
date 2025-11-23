// Attach function to window object
window.sendChatMessage = async function () {
    // Get the values fro street and time typed in by user 
    const street = document.getElementById("street-input").value;
    const time = document.getElementById("time-input").value;

    console.log("Sending:", street, time);

    // Send request to Node server and send JSON string to server
    const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street, time })
    });

    // Gets response from server and convert to JS object
    const data = await response.json();
    // Display answer from Gemini API
    document.getElementById("chat-output").textContent = data.reply;
};
