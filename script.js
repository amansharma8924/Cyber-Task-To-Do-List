// ELEMENTS
const fileInput = document.getElementById('fileInput');
const taskInput = document.getElementById('taskInput');
const timeInput = document.getElementById('timeInput'); // New
const fileList = document.getElementById('fileList');
const taskList = document.getElementById('taskList');
const directoryView = document.getElementById('directoryView');
const taskView = document.getElementById('taskView');
const pageTitle = document.getElementById('pageTitle');
const currentFileNameSpan = document.getElementById('currentFileName');
const fileCountSpan = document.getElementById('fileCount');
const clockDisplay = document.getElementById('clock');

// DATA STORE
let fileSystem = JSON.parse(localStorage.getItem('cyberFileSystem')) || [];
let currentOpenedFileId = null;

// INIT 
document.addEventListener('DOMContentLoaded', () => {
    renderFiles();
    requestPermission(); // Notification Permission
    setInterval(systemLoop, 1000); // Clock + Notification Check
});

// NOTIFICATION SYSTEM
function requestPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

function systemLoop() {
    // 1. Update Clock
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    clockDisplay.innerText = timeString;

    // 2. Check Reminders (Scan ALL files and ALL tasks)
    const currentHM = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}); // Format 14:30
    
    fileSystem.forEach(file => {
        file.tasks.forEach(task => {
            // Check if time matches, not completed, and not already notified
            if (task.time === currentHM && !task.completed && !task.notified) {
                sendNotification(file.name, task.text);
                task.notified = true; // Mark sent so it doesn't spam
                saveSystem(); // Save the 'notified' state
            }
        });
    });
}

function sendNotification(fileName, taskName) {
    if (Notification.permission === "granted") {
        new Notification(">> SYSTEM ALERT", {
            body: `PROJECT: ${fileName}\nTASK: ${taskName}`,
            icon: "icon.ico" // Optional
        });
    } else {
        alert(`>> ALERT: ${taskName} (Time Reached)`);
    }
}

// === FOLDER LOGIC ===
function createFile() {
    const fileName = fileInput.value.trim().toUpperCase();
    if (!fileName) { alert(">> ERROR: NAME REQUIRED"); return; }

    const newFile = { id: Date.now(), name: fileName, tasks: [] };
    fileSystem.push(newFile);
    saveSystem(); renderFiles();
    fileInput.value = '';
}

function renderFiles() {
    fileList.innerHTML = '';
    fileCountSpan.innerText = fileSystem.length;

    if(fileSystem.length === 0) {
        fileList.innerHTML = `<div style="text-align:center; color:#555;">>> NO DIRECTORIES FOUND <<</div>`;
        return;
    }

    fileSystem.forEach(file => {
        const completed = file.tasks.filter(t => t.completed).length;
        const total = file.tasks.length;
        const percent = total === 0 ? 0 : Math.round((completed/total)*100);

        const li = document.createElement('li');
        li.innerHTML = `
            <div onclick="openFile(${file.id})" style="flex-grow:1; cursor:pointer; display:flex; align-items:center;">
                <span class="folder-icon">[DIR]</span> ${file.name}
            </div>
            <div style="display:flex; align-items:center;">
                <span style="font-size:0.8rem; color:#888; border:1px solid #444; padding:2px; margin-right:5px;">${percent}%</span>
                <button class="delete-btn" onclick="deleteFile(${file.id})">RM</button>
            </div>
        `;
        fileList.appendChild(li);
    });
}

function deleteFile(id) {
    if(confirm(">> DELETE DIRECTORY & ALL CONTENTS?")) {
        fileSystem = fileSystem.filter(f => f.id !== id);
        saveSystem(); renderFiles();
    }
}

// === TASK LOGIC ===
function openFile(id) {
    currentOpenedFileId = id;
    const file = fileSystem.find(f => f.id === id);
    
    directoryView.style.display = 'none';
    taskView.style.display = 'block';
    
    pageTitle.innerText = `> MOUNTING: ${file.name}`;
    currentFileNameSpan.innerText = `~/projects/${file.name}/`;
    renderTasksInsideFile();
}

function goBack() {
    currentOpenedFileId = null;
    directoryView.style.display = 'block';
    taskView.style.display = 'none';
    pageTitle.innerText = `> SYSTEM_INITIATED_`;
    renderFiles();
}

function addTask() {
    const text = taskInput.value.trim();
    const time = timeInput.value; // Get Time

    if (!text) return;

    const fileIndex = fileSystem.findIndex(f => f.id === currentOpenedFileId);
    if (fileIndex > -1) {
        fileSystem[fileIndex].tasks.push({ 
            id: Date.now(), 
            text: text, 
            time: time,  // Save Time
            completed: false,
            notified: false // Reset notification status
        });
        saveSystem(); 
        renderTasksInsideFile();
        taskInput.value = ''; 
        timeInput.value = ''; // Clear inputs
        taskInput.focus();
    }
}

function renderTasksInsideFile() {
    taskList.innerHTML = '';
    const file = fileSystem.find(f => f.id === currentOpenedFileId);
    if(!file) return;

    if(file.tasks.length === 0) taskList.innerHTML = `<div style="text-align:center; color:#555;">[ EMPTY SECTOR ]</div>`;

    file.tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        
        // Show time only if set
        const timeDisplay = task.time ? `<span class="time-tag">⏰ ${task.time}</span>` : '';

        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; width:100%;">
                <input type="checkbox" 
                       ${task.completed ? 'checked' : ''} 
                       onchange="toggleTask(${task.id})"
                       style="width:16px; height:16px; flex:none;">
                
                <span class="task-text" onclick="toggleTask(${task.id})" style="cursor:pointer;">${task.text}</span>
                ${timeDisplay}
            </div>
            <button class="delete-btn" onclick="deleteTask(${task.id})">DEL</button>
        `;
        taskList.appendChild(li);
    });
}

function toggleTask(taskId) {
    const fileIndex = fileSystem.findIndex(f => f.id === currentOpenedFileId);
    if (fileIndex > -1) {
        const task = fileSystem[fileIndex].tasks.find(t => t.id === taskId);
        if (task) { 
            task.completed = !task.completed; 
            saveSystem(); 
            renderTasksInsideFile(); 
        }
    }
}

function deleteTask(taskId) {
    const fileIndex = fileSystem.findIndex(f => f.id === currentOpenedFileId);
    if (fileIndex > -1) {
        if(confirm(">> CONFIRM DELETION?")) {
            fileSystem[fileIndex].tasks = fileSystem[fileIndex].tasks.filter(t => t.id !== taskId);
            saveSystem(); 
            renderTasksInsideFile();
        }
    }
}

function saveSystem() { 
    localStorage.setItem('cyberFileSystem', JSON.stringify(fileSystem)); 
}

// Shortcuts
fileInput.addEventListener("keypress", (e) => { if(e.key === "Enter") createFile(); });

taskInput.addEventListener("keypress", (e) => { if(e.key === "Enter") addTask(); });
