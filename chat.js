// Populate hours (1-12)
const hourSelect = document.getElementById("hour");
for (let i = 1; i <= 12; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    hourSelect.appendChild(option);
}

// Populate minutes (00-59)
const minuteSelect = document.getElementById("minute");
for (let i = 0; i < 60; i++) {
    const option = document.createElement("option");
    option.value = i.toString().padStart(2, "0");
    option.textContent = i.toString().padStart(2, "0");
    minuteSelect.appendChild(option);
}

// Your existing askAI() function can now read these values:
function askAI() {
    const street = document.getElementById("streetInput").value;
    const hour = document.getElementById("hour").value;
    const minute = document.getElementById("minute").value;
    const ampm = document.getElementById("ampm").value;
    const situation = document.getElementById("situation").value;

    const time = `${hour}:${minute} ${ampm}`;

    // Send to server
    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street, time, situation })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("ai-response").textContent = data.reply;
    });
}
