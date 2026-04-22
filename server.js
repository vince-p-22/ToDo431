const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");

const app = express();
const PORT = 3000;

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "Group-14-HW7"; 

let db;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB and start server
MongoClient.connect(MONGO_URI)
    .then((client) => {
        db = client.db(DB_NAME);
        console.log(`Connected to MongoDB database: ${DB_NAME}`);

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

// routes

// GET all lists (titles only)
app.get("/api/lists", async (req, res) => {
    const lists = await db
        .collection("lists")
        .find({}, { projection: { title: 1 } })
        .toArray();
    res.json(lists);
});

// POST create a new list
app.post("/api/lists", async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const result = await db.collection("lists").insertOne({
        title,
        entries: [],
    });

    res.status(201).json({ _id: result.insertedId, title });
});

// DELETE a list
app.delete("/api/lists/:id", async (req, res) => {
    await db.collection("lists").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "List deleted" });
});

// GET all entries for a list
app.get("/api/lists/:id/entries", async (req, res) => {
    const list = await db
        .collection("lists")
        .findOne({ _id: new ObjectId(req.params.id) });

    if (!list) return res.status(404).json({ error: "List not found" });

    res.json(list.entries || []);
});

// POST add a new entry to a list
app.post("/api/lists/:id/entries", async (req, res) => {
    const { title, priority, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    let validatedDueDate = null;

    if (dueDate) {
        const { month, day, year, time, meridiem } = dueDate;

        if (!month || !day || !year || !time || !meridiem) {
            return res.status(400).json({ error: "All due date fields are required" });
        }

        const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ error: "Time must be in hh:mm 12-hour format" });
        }

        if (!/^\d{4}$/.test(year)) {
            return res.status(400).json({ error: "Year must be 4 digits" });
        }

        if (!["AM", "PM"].includes(meridiem)) {
            return res.status(400).json({ error: "Meridiem must be AM or PM" });
        }

        validatedDueDate = { month, day, year, time, meridiem };
    }

    const entry = {
        _id: new ObjectId(),
        title,
        priority: priority || "Low",
        dueDate: validatedDueDate,
        createdAt: new Date().toISOString(),
        completedBool: false,
        completeTime: null,
    };

    await db
        .collection("lists")
        .updateOne(
            { _id: new ObjectId(req.params.id) },
            { $push: { entries: entry } }
        );

    res.status(201).json(entry);
});

// PUT update an entry's status (check/uncheck)
app.put("/api/lists/:listId/entries/:entryId", async (req, res) => {
    const { completedBool } = req.body;
    const completeTime = completedBool ? new Date().toISOString() : null;

    await db
        .collection("lists")
        .updateOne(
            {
                _id: new ObjectId(req.params.listId),
                "entries._id": new ObjectId(req.params.entryId),
            },
            { $set: { "entries.$.completedBool": completedBool, "entries.$.completeTime": completeTime } }
        );

    res.json({ message: "Entry updated" });
});

// DELETE an entry from a list
app.delete("/api/lists/:listId/entries/:entryId", async (req, res) => {
    await db
        .collection("lists")
        .updateOne(
            { _id: new ObjectId(req.params.listId) },
            { $pull: { entries: { _id: new ObjectId(req.params.entryId) } } }
        );

    res.json({ message: "Entry deleted" });
});