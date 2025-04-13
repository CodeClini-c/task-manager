// DOM Elements
const taskInput = document.getElementById('task-input');
const addButton = document.getElementById('add-button');
const voiceButton = document.getElementById('voice-button');
const themeToggle = document.getElementById('theme-toggle');
const taskList = document.getElementById('task-list');
const statusMessage = document.getElementById('status-message');
const filterButtons = document.querySelectorAll('.filter-btn');
const progressFill = document.querySelector('.progress-fill');
const streakCountEl = document.getElementById('streak-count');
const completedTodayEl = document.getElementById('completed-today');
const dailyGoalEl = document.getElementById('daily-goal');
const badgesContainer = document.getElementById('badges-container');
const feedbackModal = document.getElementById('feedback-modal');
const closeModal = document.querySelector('.close-modal');
const modalMessage = document.getElementById('modal-message');
const modalBadge = document.getElementById('modal-badge');
const helpToggle = document.getElementById('help-toggle');
const helpContent = document.getElementById('help-content');

// State Variables
let tasks = [];
let currentFilter = 'all';
let recognition;
let isListening = false;
let userStats = {
    streak: 0,
    completedToday: 0,
    totalCompleted: 0,
    lastActive: null,
    dailyGoal: 3, // Default daily goal
    achievements: [],
    darkMode: false // Add dark mode preference to user stats
};

// Motivational messages
const motivationalMessages = [
    "Great work! 🎉",
    "You're making progress!",
    "Task completed! 👍",
    "Keep it up!",
    "You're crushing it!",
    "Awesome work!",
    "One step closer! 🚀",
    "Boom! Task done!",
    "Success builds momentum!",
    "Unstoppable! ✨"
];

// Achievement definitions
const achievements = [
    {
        id: 'first-task',
        icon: '🎯',
        title: 'First Task',
        description: 'Completed your first task',
        condition: (stats) => stats.totalCompleted >= 1
    },
    {
        id: 'five-tasks',
        icon: '⭐',
        title: 'Rising Star',
        description: 'Completed 5 tasks',
        condition: (stats) => stats.totalCompleted >= 5
    },
    {
        id: 'ten-tasks',
        icon: '🏆',
        title: 'Task Master',
        description: 'Completed 10 tasks',
        condition: (stats) => stats.totalCompleted >= 10
    },
    {
        id: 'three-streak',
        icon: '🔥',
        title: '3-Day Streak',
        description: 'Used the app for 3 days in a row',
        condition: (stats) => stats.streak >= 3
    },
    {
        id: 'daily-goal',
        icon: '🌟',
        title: 'Goal Crusher',
        description: 'Reached your daily task goal',
        condition: (stats) => stats.completedToday >= stats.dailyGoal
    },
    {
        id: 'voice-user',
        icon: '🎤',
        title: 'Voice Commander',
        description: 'Used voice commands to manage tasks',
        // This will be set manually when voice commands are used
    }
];

// Initialize speech recognition
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        // Initialize Web Speech API
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            voiceButton.classList.add('listening');
            statusMessage.textContent = 'Listening...';
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            processVoiceCommand(transcript);
            
            // Award voice commander badge if not already awarded
            if (!userStats.achievements.includes('voice-user')) {
                userStats.achievements.push('voice-user');
                saveUserStats();
                checkForNewAchievements(['voice-user']);
            }
        };
        
        recognition.onend = () => {
            isListening = false;
            voiceButton.classList.remove('listening');
            setTimeout(() => {
                if (!isListening) statusMessage.textContent = '';
            }, 3000);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            statusMessage.textContent = `Error: ${event.error}`;
            isListening = false;
            voiceButton.classList.remove('listening');
        };
        
        return true;
    } else {
        statusMessage.textContent = 'Speech recognition not supported in your browser.';
        voiceButton.disabled = true;
        return false;
    }
}

// Process voice commands
function processVoiceCommand(transcript) {
    statusMessage.textContent = `"${transcript}"`;
    
    // Add task command
    if (transcript.startsWith('add ')) {
        const taskText = transcript.substring(4).trim();
        if (taskText) {
            addTask(taskText);
            statusMessage.textContent = `Added: "${taskText}"`;
        }
    }
    // Complete task command
    else if (transcript.startsWith('complete ') || transcript.startsWith('mark ')) {
        const taskText = transcript.replace(/^complete |^mark /, '').trim();
        const matchingTask = tasks.find(task => 
            task.text.toLowerCase().includes(taskText)
        );
        
        if (matchingTask) {
            toggleTaskCompletion(matchingTask.id);
            statusMessage.textContent = `Completed: "${matchingTask.text}"`;
        } else {
            statusMessage.textContent = `No task found with: "${taskText}"`;
        }
    }
    // Delete task command
    else if (transcript.startsWith('delete ') || transcript.startsWith('remove ')) {
        const taskText = transcript.replace(/^delete |^remove /, '').trim();
        const matchingTaskIndex = tasks.findIndex(task => 
            task.text.toLowerCase().includes(taskText)
        );
        
        if (matchingTaskIndex !== -1) {
            const taskToDelete = tasks[matchingTaskIndex];
            deleteTask(taskToDelete.id);
            statusMessage.textContent = `Deleted: "${taskToDelete.text}"`;
        } else {
            statusMessage.textContent = `No task found with: "${taskText}"`;
        }
    }
    // Filter commands
    else if (transcript.includes('show all tasks')) {
        filterTasks('all');
        statusMessage.textContent = 'Showing all tasks';
    }
    else if (transcript.includes('show active tasks')) {
        filterTasks('active');
        statusMessage.textContent = 'Showing active tasks';
    }
    else if (transcript.includes('show completed tasks')) {
        filterTasks('completed');
        statusMessage.textContent = 'Showing completed tasks';
    }
    else {
        statusMessage.textContent = `Command not recognized`;
    }
}

// Toggle voice recognition
function toggleSpeechRecognition() {
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Add a new task
function addTask(text) {
    if (text.trim() === '') return;
    
    const newTask = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        dateAdded: new Date()
    };
    
    tasks.push(newTask);
    saveToLocalStorage();
    renderTasks();
    taskInput.value = '';
}

// Toggle task completion status
function toggleTaskCompletion(id) {
    let taskCompleted = false;
    
    tasks = tasks.map(task => {
        if (task.id === id) {
            // If the task is being marked as complete
            if (!task.completed) {
                taskCompleted = true;
                task.completedDate = new Date();
            }
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    
    saveToLocalStorage();
    
    if (taskCompleted) {
        // Update stats
        userStats.completedToday++;
        userStats.totalCompleted++;
        
        // Check for achievements
        checkForAchievements();
        
        // Show random motivational message
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        showFeedbackModal(randomMessage);
        
        // Play task completion animation
        const taskElement = document.querySelector(`[data-task-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.add('task-complete-animation');
            setTimeout(() => {
                taskElement.classList.remove('task-complete-animation');
                renderTasks();
            }, 1000);
        } else {
            renderTasks();
        }
    } else {
        // Task was uncompleted
        userStats.completedToday--;
        userStats.totalCompleted--;
        renderTasks();
    }
    
    // Update the progress bar and stats display
    updateStats();
    saveUserStats();
}

// Delete a task
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveToLocalStorage();
    renderTasks();
}

// Filter tasks based on completion status
function filterTasks(filter) {
    currentFilter = filter;
    
    // Update active filter button
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    
    renderTasks();
}

// Render tasks to the DOM
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks;
    
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
    filteredTasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.classList.add('task-item');
        taskItem.setAttribute('data-task-id', task.id);
        
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        
        taskItem.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <div class="task-actions">
                <button class="complete-btn">${task.completed ? 'Undo' : 'Done'}</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        const checkbox = taskItem.querySelector('.task-checkbox');
        const completeBtn = taskItem.querySelector('.complete-btn');
        const deleteBtn = taskItem.querySelector('.delete-btn');
        
        checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
        completeBtn.addEventListener('click', () => toggleTaskCompletion(task.id));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        taskList.appendChild(taskItem);
    });
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<li class="empty-message">No tasks to show</li>';
    }
}

// Update stats display
function updateStats() {
    // Update the stats display elements
    streakCountEl.textContent = userStats.streak;
    completedTodayEl.textContent = userStats.completedToday;
    dailyGoalEl.textContent = userStats.dailyGoal;
    
    // Update progress bar
    const progress = Math.min((userStats.completedToday / userStats.dailyGoal) * 100, 100);
    progressFill.style.width = `${progress}%`;
}

// Check for achievements
function checkForAchievements() {
    const newAchievements = [];
    
    achievements.forEach(achievement => {
        if (!userStats.achievements.includes(achievement.id) && 
            achievement.condition(userStats)) {
            newAchievements.push(achievement.id);
            userStats.achievements.push(achievement.id);
        }
    });
    
    saveUserStats();
    
    if (newAchievements.length > 0) {
        checkForNewAchievements(newAchievements);
    }
}

// Check for and display new achievements
function checkForNewAchievements(newAchievementIds) {
    if (newAchievementIds.length === 0) return;
    
    const newAchievement = achievements.find(a => a.id === newAchievementIds[0]);
    
    if (newAchievement) {
        // Show achievement modal
        modalMessage.textContent = `Achievement: ${newAchievement.title}`;
        modalBadge.textContent = newAchievement.icon;
        modalBadge.style.backgroundColor = '#5e72e4';
        
        feedbackModal.style.display = 'flex';
        
        // If there are more achievements, show them after this one is closed
        if (newAchievementIds.length > 1) {
            const remainingAchievements = [...newAchievementIds];
            remainingAchievements.shift();
            setTimeout(() => checkForNewAchievements(remainingAchievements), 1000);
        }
    }
    
    // Render all achievements
    renderAchievements();
}

// Render achievements to the DOM
function renderAchievements() {
    badgesContainer.innerHTML = '';
    
    achievements.forEach(achievement => {
        const badge = document.createElement('div');
        badge.classList.add('badge');
        
        if (!userStats.achievements.includes(achievement.id)) {
            badge.classList.add('locked');
            badge.textContent = '?';
        } else {
            badge.textContent = achievement.icon;
        }
        
        const tooltip = document.createElement('div');
        tooltip.classList.add('badge-tooltip');
        tooltip.textContent = userStats.achievements.includes(achievement.id) 
            ? achievement.title 
            : 'Locked Achievement';
        
        badge.appendChild(tooltip);
        badgesContainer.appendChild(badge);
    });
}

// Show feedback modal
function showFeedbackModal(message) {
    modalMessage.textContent = message;
    modalBadge.textContent = '';
    modalBadge.style.backgroundColor = 'transparent';
    feedbackModal.style.display = 'flex';
    
    // Automatically hide the modal after 1.5 seconds unless it's showing an achievement
    if (!message.includes('Achievement')) {
        setTimeout(() => {
            feedbackModal.style.display = 'none';
        }, 1500);
    }
}

// Check if we need to update the streak
function checkAndUpdateStreak() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    if (!userStats.lastActive) {
        // First time user
        userStats.streak = 1;
        userStats.lastActive = today;
    } else {
        const lastActiveDate = new Date(userStats.lastActive);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const currentDate = new Date(now);
        currentDate.setHours(0, 0, 0, 0);
        
        if (lastActiveDate.toDateString() === yesterday.toDateString()) {
            // User was active yesterday, increment streak
            userStats.streak += 1;
        } else if (lastActiveDate.toDateString() === currentDate.toDateString()) {
            // User already active today, do nothing
        } else {
            // User wasn't active yesterday, reset streak
            userStats.streak = 1;
        }
        
        userStats.lastActive = today;
    }
    
    // Reset completedToday if it's a new day
    if (!userStats.lastActive || new Date(userStats.lastActive).toDateString() !== now.toDateString()) {
        userStats.completedToday = 0;
        
        // Count today's completed tasks
        tasks.forEach(task => {
            if (task.completed && task.completedDate) {
                const completedDate = new Date(task.completedDate);
                if (completedDate.toDateString() === now.toDateString()) {
                    userStats.completedToday++;
                }
            }
        });
    }
    
    saveUserStats();
}

// Toggle help content display
function toggleHelpContent() {
    helpContent.classList.toggle('active');
}

// Toggle dark mode
function toggleDarkMode() {
    // Toggle the dark mode state
    userStats.darkMode = !userStats.darkMode;
    
    // Apply the appropriate theme
    applyTheme();
    
    // Save user preference
    saveUserStats();
}

// Apply theme based on user preference
function applyTheme() {
    if (userStats.darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Change to sun icon in dark mode
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Change to moon icon in light mode
    }
}

// Save tasks to local storage
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Save user stats to local storage
function saveUserStats() {
    localStorage.setItem('userStats', JSON.stringify(userStats));
}

// Load tasks from local storage
function loadFromLocalStorage() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
    
    const storedStats = localStorage.getItem('userStats');
    if (storedStats) {
        userStats = JSON.parse(storedStats);
    }
    
    // Check and update streak
    checkAndUpdateStreak();
}

// Initialize the application
function init() {
    loadFromLocalStorage();
    renderTasks();
    updateStats();
    renderAchievements();
    
    // Apply saved theme preference
    applyTheme();
    
    addButton.addEventListener('click', () => addTask(taskInput.value));
    
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addTask(taskInput.value);
        }
    });
    
    voiceButton.addEventListener('click', toggleSpeechRecognition);
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', toggleDarkMode);
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => filterTasks(btn.getAttribute('data-filter')));
    });
    
    // Help toggle functionality
    helpToggle.addEventListener('click', toggleHelpContent);
    
    // Close modal when x is clicked
    closeModal.addEventListener('click', () => {
        feedbackModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            feedbackModal.style.display = 'none';
        }
    });
    
    // Initialize voice recognition
    initSpeechRecognition();
}

// Run initialization when DOM content is loaded
document.addEventListener('DOMContentLoaded', init);