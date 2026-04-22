const API_URL = "http://localhost:3000/api";

let currentListId = null;

// DOM Elements
const listsSection = document.getElementById("lists-section");
const entriesSection = document.getElementById("entries-section");
const listsContainer = document.getElementById("lists-container");
const entriesContainer = document.getElementById("entries-container");
const currentListTitle = document.getElementById("current-list-title");

const addListBtn = document.getElementById("add-list-btn");
const newListForm = document.getElementById("new-list-form");
const newListTitleInput = document.getElementById("new-list-title");
const saveListBtn = document.getElementById("save-list-btn");
const cancelListBtn = document.getElementById("cancel-list-btn");

const backBtn = document.getElementById("back-btn");
const deleteListBtn = document.getElementById("delete-list-btn");
const newEntryTitle = document.getElementById("new-entry-title");
const newEntryPriority = document.getElementById("new-entry-priority");
const addEntryBtn = document.getElementById("add-entry-btn");

// Load all lists on page load
document.addEventListener("DOMContentLoaded", loadLists);

// Event Listeners
addListBtn.addEventListener("click", () => {
    newListForm.classList.remove("hidden");
    newListTitleInput.focus();
});

cancelListBtn.addEventListener("click", () => {
    newListForm.classList.add("hidden");
    newListTitleInput.value = "";
});

saveListBtn.addEventListener("click", createList);

newListTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createList();
});

backBtn.addEventListener("click", showListsView);
deleteListBtn.addEventListener("click", deleteCurrentList);
addEntryBtn.addEventListener("click", addEntry);

newEntryTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addEntry();
});

// Functions
async function loadLists() {
    const res = await fetch(`${API_URL}/lists`);
    const lists = await res.json();
    listsContainer.innerHTML = "";

    if (lists.length === 0) {
        listsContainer.innerHTML = '<li class="empty-message">No lists yet. Create one above.</li>';
        return;
    }

    lists.forEach((list) => {
        const li = document.createElement("li");
        li.textContent = list.title;
        li.addEventListener("click", () => showEntriesView(list._id, list.title));
        listsContainer.appendChild(li);
    });
}

async function createList() {
    const title = newListTitleInput.value.trim();
    if (!title) return;

    await fetch(`${API_URL}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });

    newListTitleInput.value = "";
    newListForm.classList.add("hidden");
    loadLists();
}

async function deleteCurrentList() {
    if (!currentListId) return;

    await fetch(`${API_URL}/lists/${currentListId}`, {
        method: "DELETE",
    });

    showListsView();
}

function showListsView() {
    currentListId = null;
    entriesSection.classList.add("hidden");
    listsSection.classList.remove("hidden");
    loadLists();
}

async function showEntriesView(listId, title) {
    currentListId = listId;
    currentListTitle.textContent = title;
    listsSection.classList.add("hidden");
    entriesSection.classList.remove("hidden");
    loadEntries();
}

function sortByPriority(entries) {
    const order = { High: 0, Medium: 1, Low: 2 };
    return entries.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
}

async function loadEntries() {
    const res = await fetch(`${API_URL}/lists/${currentListId}/entries`);
    const entries = sortByPriority(await res.json());
    entriesContainer.innerHTML = "";

    if (entries.length === 0) {
        entriesContainer.innerHTML = '<li class="empty-message">No entries yet. Add one above.</li>';
        return;
    }

    entries.forEach((entry) => {
        const li = document.createElement("li");

        const left = document.createElement("div");
        left.className = "entry-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = entry.completedBool;
        checkbox.addEventListener("change", () => toggleEntry(entry._id, !entry.completedBool));

        const textSpan = document.createElement("span");
        textSpan.textContent = entry.title;
        if (entry.completedBool) textSpan.classList.add("checked");

        left.appendChild(checkbox);
        left.appendChild(textSpan);

        const right = document.createElement("div");
        right.className = "entry-right";

        if (entry.priority) {
            const priorityBadge = document.createElement("span");
            priorityBadge.className = `priority-badge priority-${entry.priority.toLowerCase()}`;
            priorityBadge.textContent = entry.priority;
            right.appendChild(priorityBadge);
        }

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-entry-btn";
        deleteBtn.addEventListener("click", () => deleteEntry(entry._id));
        right.appendChild(deleteBtn);

        li.appendChild(left);
        li.appendChild(right);
        entriesContainer.appendChild(li);
    });
}

async function addEntry() {
    const title = newEntryTitle.value.trim();
    if (!title) return;

    const priority = newEntryPriority.value;

    await fetch(`${API_URL}/lists/${currentListId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority }),
    });

    newEntryTitle.value = "";
    newEntryPriority.value = "Low";
    loadEntries();
}

async function toggleEntry(entryId, newStatus) {
    await fetch(`${API_URL}/lists/${currentListId}/entries/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedBool: newStatus }),
    });

    loadEntries();
}

async function deleteEntry(entryId) {
    await fetch(`${API_URL}/lists/${currentListId}/entries/${entryId}`, {
        method: "DELETE",
    });

    loadEntries();
}