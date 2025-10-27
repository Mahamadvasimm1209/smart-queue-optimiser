const API_BASE = "https://smart-queue-optimiser.onrender.com";
let myTicket = null;

const socket = io(API_BASE);

socket.on("queue_updated", (q) => {
    renderQueue(q);
    if (myTicket) updateMyPosition(q);
});

socket.on("served", (item) => {
    if (myTicket && item && myTicket.id === item.id) {
        alert("Your turn!");
        myTicket = null;
        document.getElementById("myTicket").style.display = "none";
    }
});

async function joinQueue() {
    const name = document.getElementById("name").value.trim();
    const type = document.getElementById("type").value;
    if (!name) return alert("Enter your name");
    const res = await fetch(`${API_BASE}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    myTicket = data.item;
    document.getElementById("myTicket").style.display = "block";
    renderTicket(myTicket);
}

function renderTicket(t) {
    document.getElementById("ticketInfo").innerText =
        `Ticket ID: ${t.id} | Name: ${t.name} | Type: ${t.type}`;
}

async function leaveQueue() {
    if (!myTicket) return;
    await fetch(`${API_BASE}/api/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: myTicket.id }),
    });
    myTicket = null;
    document.getElementById("myTicket").style.display = "none";
}

async function predict() {
    if (!myTicket) return;
    const res = await fetch(`${API_BASE}/api/predict/${myTicket.id}`);
    const d = await res.json();
    if (!d.found) return document.getElementById("prediction").innerText = "Not found";
    const min = Math.round(d.waitMs / 60000);
    document.getElementById("prediction").innerText =
        `Position ${d.position} — around ${min} min`;
}

function renderQueue(list) {
    const ul = document.getElementById("queueList");
    ul.innerHTML = "";
    list.forEach((item) => {
        const li = document.createElement("li");
        li.innerText = `#${item.position} - ${item.name} (${item.type})`;
        ul.appendChild(li);
    });
}

function updateMyPosition(list) {
    const found = list.find((x) => x.id === myTicket.id);
    if (found) {
        document.getElementById("ticketInfo").innerText =
            `Ticket ID: ${myTicket.id} | Name: ${myTicket.name} | Type: ${myTicket.type} | Position: ${found.position}`;
    }
}

async function adminNext() {
    await fetch(`${API_BASE}/api/admin/next`, { method: "POST" });
}

window.onload = () => {
    document.getElementById("join").addEventListener("click", joinQueue);
    document.getElementById("leave").addEventListener("click", leaveQueue);
    document.getElementById("predict").addEventListener("click", predict);
    document.getElementById("adminNext").addEventListener("click", adminNext);
    fetch(`${API_BASE}/api/queue`).then(r => r.json()).then(d => renderQueue(d.queue));
};
