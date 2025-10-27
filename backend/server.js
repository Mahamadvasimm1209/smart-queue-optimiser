require("dotenv").config();  // Load .env file first

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Queue = require("./queue");

// MongoDB Model (inline for now)
const queueItemSchema = new mongoose.Schema({
    name: String,
    type: String,
    priority: Number,
    createdAt: { type: Date, default: Date.now }
});
const QueueItem = mongoose.model("QueueItem", queueItemSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
const queue = new Queue();

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));


// === ROUTES ===

// Get queue
app.get("/api/queue", (req, res) => res.json({ queue: queue.getQueue() }));

// Join queue
app.post("/api/join", async (req, res) => {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const item = queue.enqueue({ name, type });
    // Save to MongoDB
    await QueueItem.create({
        name: item.name,
        type: item.type,
        priority: item.priority
    });

    io.emit("queue_updated", queue.getQueue());
    res.json({ ok: true, item });
});

// Leave queue
app.post("/api/leave", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID required" });

    const ok = queue.remove(id);
    io.emit("queue_updated", queue.getQueue());
    res.json({ ok });
});

// Serve next
app.post("/api/admin/next", (req, res) => {
    const item = queue.dequeue();
    io.emit("queue_updated", queue.getQueue());
    io.emit("served", item);
    res.json({ ok: true, item });
});

// Predict wait time
app.get("/api/predict/:id", (req, res) => {
    const id = Number(req.params.id);
    const q = queue.getQueue();
    const pos = q.findIndex(x => x.id === id);
    if (pos === -1) return res.json({ found: false });
    const waitMs = queue.predictWaitTimeForPosition(pos + 1);
    res.json({ found: true, position: pos + 1, waitMs });
});


// === SOCKET EVENTS ===
io.on("connection", socket => {
    console.log("Client connected");
    socket.emit("queue_updated", queue.getQueue());
    socket.on("disconnect", () => console.log("Client disconnected"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
