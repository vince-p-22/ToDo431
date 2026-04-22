const API_URL = "http://localhost:3000/api";

let currentListId = null;
let sortDirection = "asc";

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

const dueMonth = document.getElementById("due-month");
const dueDay = document.getElementById("due-day");
const dueYear = document.getElementById("due-year");
const dueTime = document.getElementById("due-time");
const dueMeridiem = document.getElementById("due-meridiem");

const sortDueDateBtn = document.getElementById("sort-due-date-btn");

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

sortDueDateBtn.addEventListener("click", toggleSortDirection);

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
    sortDirection = "asc";
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

function isValidTime12Hour(timeStr) {
    const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])$/;
    return timeRegex.test(timeStr);
}

function formatDueDate(dueDate) {
    if (!dueDate) return "";
    const { month, day, year, time, meridiem } = dueDate;

    if (!month || !day || !year || !time || !meridiem) return "";
    return `Due: ${month}/${day}/${year} ${time} ${meridiem}`;
}

function getPriorityValue(priority) {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[priority] ?? 3;
}

function getDueDateTimestamp(dueDate) {
    if (!dueDate) return null;

    const { month, day, year, time, meridiem } = dueDate;
    if (!month || !day || !year || !time || !meridiem) return null;

    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (meridiem === "AM" && hour === 12) {
        hour = 0;
    } else if (meridiem === "PM" && hour !== 12) {
        hour += 12;
    }

    const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        hour,
        minute
    );

    return date.getTime();
}

function sortEntries(entries) {
    return entries.sort((a, b) => {
        const priorityDiff = getPriorityValue(a.priority) - getPriorityValue(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const aTime = getDueDateTimestamp(a.dueDate);
        const bTime = getDueDateTimestamp(b.dueDate);

        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;

        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });
}

function toggleSortDirection() {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    sortDueDateBtn.textContent =
        sortDirection === "asc" ? "Sort: Nearest First" : "Sort: Farthest First";
    loadEntries();
}

async function loadEntries() {
    const res = await fetch(`${API_URL}/lists/${currentListId}/entries`);
    const entries = sortEntries(await res.json());
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

        const textWrapper = document.createElement("div");
        textWrapper.className = "entry-text-wrapper";

        const textSpan = document.createElement("span");
        textSpan.textContent = entry.title;
        if (entry.completedBool) textSpan.classList.add("checked");

        textWrapper.appendChild(textSpan);

        if (entry.dueDate) {
            const dueDateSpan = document.createElement("div");
            dueDateSpan.className = "due-date-text";
            dueDateSpan.textContent = formatDueDate(entry.dueDate);
            textWrapper.appendChild(dueDateSpan);
        }

        left.appendChild(checkbox);
        left.appendChild(textWrapper);

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
    let dueDate = null;

    const month = dueMonth.value;
    const day = dueDay.value;
    const year = dueYear.value.trim();
    const time = dueTime.value.trim();
    const meridiem = dueMeridiem.value;

    const anyDueDateFieldFilled = month || day || year || time || meridiem;

    if (anyDueDateFieldFilled) {
        if (!month || !day || !year || !time || !meridiem) {
            alert("Please complete all due date fields.");
            return;
        }

        if (!/^\d{4}$/.test(year)) {
            alert("Year must be 4 digits.");
            return;
        }

        if (!isValidTime12Hour(time)) {
            alert("Time must be in hh:mm format using 12-hour time, for example 09:30.");
            return;
        }

        dueDate = { month, day, year, time, meridiem };
    }

    await fetch(`${API_URL}/lists/${currentListId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, dueDate }),
    });

    newEntryTitle.value = "";
    newEntryPriority.value = "Low";
    dueMonth.value = "";
    dueDay.value = "";
    dueYear.value = "";
    dueTime.value = "";
    dueMeridiem.value = "";

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