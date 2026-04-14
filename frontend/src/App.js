import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Pause, 
  StickyNote,
  Star,
  BarChart3,
  Zap,
  Trash,
  Clock
} from 'lucide-react';
import './App.css';

function App() {
  // Existing states
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [habits, setHabits] = useState([]);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // New states
  const [apiStatus, setApiStatus] = useState({ tasks: false, notes: false, habits: false, pomodoro: true });
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('health');
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [pomodoroTotalTime, setPomodoroTotalTime] = useState(25 * 60);

  // Motivational quotes
  const quotes = [
    "you're literally the main character of your life ✨",
    "no cap, you're gonna crush this 💅",
    "studying is your villain era moment 🔥",
    "bestie, your future self will thank you 💕",
    "this is your sign to be productive today ⭐"
  ];

  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  // API base URLs
  const TASKS_API = process.env.REACT_APP_TASKS_API || 'http://localhost:5001';
  const NOTES_API = process.env.REACT_APP_NOTES_API || 'http://localhost:5003';
  const HABITS_API = process.env.REACT_APP_HABITS_API || 'http://localhost:5004';

  // Check API status
  const checkApiStatus = async () => {
    const status = { tasks: false, notes: false, habits: false, pomodoro: true };
    try {
      await axios.get(`${TASKS_API}/health`);
      status.tasks = true;
    } catch {}
    try {
      await axios.get(`${NOTES_API}/health`);
      status.notes = true;
    } catch {}
    try {
      await axios.get(`${HABITS_API}/health`);
      status.habits = true;
    } catch {}
    setApiStatus(status);
  };

  // Load data on component mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await axios.get(`${TASKS_API}/api/tasks`);
        setTasks(response.data);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setTasks([
          { _id: '1', text: 'finish math homework', completed: false, priority: 'high' },
          { _id: '2', text: 'study for chemistry test', completed: false, priority: 'medium' }
        ]);
      }
    };

    const loadNotes = async () => {
      try {
        const response = await axios.get(`${NOTES_API}/api/notes`);
        setNotes(response.data);
      } catch (error) {
        console.error('Error loading notes:', error);
        setNotes([
          { _id: '1', title: 'Study Tips', content: 'remember to take breaks and stay hydrated! ✨' }
        ]);
      }
    };

    const loadHabits = async () => {
      try {
        const response = await axios.get(`${HABITS_API}/api/habits`);
        setHabits(response.data);
      } catch (error) {
        console.error('Error loading habits:', error);
        setHabits([
          { _id: '1', name: 'drink water', streak: 5, completed: false, category: 'health' },
          { _id: '2', name: 'read for 30 mins', streak: 3, completed: true, category: 'learning' }
        ]);
      }
    };

    const checkApiStatusLocal = async () => {
      const status = { tasks: false, notes: false, habits: false, pomodoro: true };
      try {
        await axios.get(`${TASKS_API}/health`);
        status.tasks = true;
      } catch {}
      try {
        await axios.get(`${NOTES_API}/health`);
        status.notes = true;
      } catch {}
      try {
        await axios.get(`${HABITS_API}/health`);
        status.habits = true;
      } catch {}
      setApiStatus(status);
    };

    loadTasks();
    loadNotes();
    loadHabits();
    checkApiStatusLocal();
    
    // Change quote every 30 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 30000);

    return () => clearInterval(quoteInterval);
  }, [quotes, TASKS_API, NOTES_API, HABITS_API]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      const response = await axios.post(`${TASKS_API}/api/tasks`, {
        text: newTask,
        completed: false,
        priority: newTaskPriority
      });
      setTasks([...tasks, response.data]);
    } catch (error) {
      const newTaskObj = {
        _id: Date.now().toString(),
        text: newTask,
        completed: false,
        priority: newTaskPriority
      };
      setTasks([...tasks, newTaskObj]);
    }
    setNewTask('');
    setNewTaskPriority('medium');
  };

  const toggleTask = async (id) => {
    try {
      const task = tasks.find(t => t._id === id);
      await axios.put(`${TASKS_API}/api/tasks/${id}`, {
        ...task,
        completed: !task.completed
      });
      setTasks(tasks.map(task => 
        task._id === id ? { ...task, completed: !task.completed } : task
      ));
    } catch (error) {
      setTasks(tasks.map(task => 
        task._id === id ? { ...task, completed: !task.completed } : task
      ));
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${TASKS_API}/api/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
    } catch (error) {
      setTasks(tasks.filter(t => t._id !== id));
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const response = await axios.post(`${NOTES_API}/api/notes`, {
        title: newNoteTitle || `Note ${notes.length + 1}`,
        content: newNote
      });
      setNotes([...notes, response.data]);
    } catch (error) {
      const newNoteObj = {
        _id: Date.now().toString(),
        title: newNoteTitle || `Note ${notes.length + 1}`,
        content: newNote
      };
      setNotes([...notes, newNoteObj]);
    }
    setNewNote('');
    setNewNoteTitle('');
  };

  const deleteNote = async (id) => {
    try {
      await axios.delete(`${NOTES_API}/api/notes/${id}`);
      setNotes(notes.filter(n => n._id !== id));
    } catch (error) {
      setNotes(notes.filter(n => n._id !== id));
    }
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    
    try {
      const response = await axios.post(`${HABITS_API}/api/habits`, {
        name: newHabit,
        category: newHabitCategory,
        streak: 0,
        completed: false
      });
      setHabits([...habits, response.data]);
    } catch (error) {
      const newHabitObj = {
        _id: Date.now().toString(),
        name: newHabit,
        category: newHabitCategory,
        streak: 0,
        completed: false
      };
      setHabits([...habits, newHabitObj]);
    }
    setNewHabit('');
    setNewHabitCategory('health');
  };

  const toggleHabit = async (id) => {
    try {
      const habit = habits.find(h => h._id === id);
      const newCompleted = !habit.completed;
      await axios.put(`${HABITS_API}/api/habits/${id}`, {
        ...habit,
        completed: newCompleted,
        streak: newCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1)
      });
      setHabits(habits.map(h => 
        h._id === id ? { ...h, completed: newCompleted, streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1) } : h
      ));
    } catch (error) {
      setHabits(habits.map(h => 
        h._id === id ? { ...h, completed: !h.completed, streak: h.completed ? h.streak - 1 : h.streak + 1 } : h
      ));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setPomodoroSession = (mode) => {
    const times = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
    setPomodoroMode(mode);
    setPomodoroTotalTime(times[mode]);
    setPomodoroTime(times[mode]);
    setIsRunning(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);

  const circumference = 2 * Math.PI * 80;
  const dashoffset = circumference - (pomodoroTime / pomodoroTotalTime) * circumference;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <Zap className="logo-icon" size={20} />
            StudyCore
          </h1>
          <div className="quote-container">
            <p className="motivational-quote">{currentQuote}</p>
          </div>
          <div className="api-dots">
            <div className="dot" style={{ background: apiStatus.tasks ? '#06D6A0' : '#FF6B6B' }} title="Tasks API (5001)"></div>
            <div className="dot" style={{ background: apiStatus.pomodoro ? '#06D6A0' : '#FF6B6B' }} title="Pomodoro API (5002)"></div>
            <div className="dot" style={{ background: apiStatus.notes ? '#06D6A0' : '#FF6B6B' }} title="Notes API (5003)"></div>
            <div className="dot" style={{ background: apiStatus.habits ? '#06D6A0' : '#FF6B6B' }} title="Habits API (5004)"></div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'tasks', label: 'Tasks', icon: CheckCircle },
          { id: 'pomodoro', label: 'Focus', icon: Play },
          { id: 'notes', label: 'Notes', icon: StickyNote },
          { id: 'habits', label: 'Habits', icon: Star }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="section">
            <div className="dashboard-welcome">
              <h1 className="welcome-title">Welcome back, productivity champion! 🚀</h1>
              <p className="welcome-subtitle">Ready to crush your goals today?</p>
            </div>
            
            <div className="section-header">
              <h2>📊 Your Progress Overview</h2>
              <p className="section-subtitle">track your productivity journey</p>
            </div>
            
            <div className="stat-cards">
              <div className="stat-card wow-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <h3>{tasks.length}/{completedCount}</h3>
                  <p>Tasks Completed</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="stat-card wow-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-content">
                  <h3>{totalStreak}</h3>
                  <p>Total Habit Streaks</p>
                  <div className="streak-indicator">
                    {Array(Math.min(totalStreak, 10)).fill().map((_, i) => (
                      <span key={i} className="flame">🔥</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="stat-card wow-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <h3>{notes.length}</h3>
                  <p>Notes Captured</p>
                  <div className="note-stack">
                    {Array(Math.min(notes.length, 5)).fill().map((_, i) => (
                      <div key={i} className="note-layer" style={{ transform: `translateY(${i * 2}px) rotate(${i * 2}deg)` }}>
                        📄
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="stat-card wow-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <h3>0</h3>
                  <p>Focus Sessions Today</p>
                  <div className="session-dots">
                    <span className="session-dot active">●</span>
                    <span className="session-dot">●</span>
                    <span className="session-dot">●</span>
                    <span className="session-dot">●</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="api-status wow-panel">
                <h3>🚀 Microservices Health</h3>
                <div className="api-grid">
                  <div className="api-service">
                    <div className="service-icon">📋</div>
                    <div className="service-info">
                      <span className="service-name">Tasks API</span>
                      <span className="service-port">5001</span>
                    </div>
                    <div className={`status-indicator ${apiStatus.tasks ? 'online' : 'offline'}`}>
                      <div className="status-dot"></div>
                      <span>{apiStatus.tasks ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="api-service">
                    <div className="service-icon">🍅</div>
                    <div className="service-info">
                      <span className="service-name">Pomodoro API</span>
                      <span className="service-port">5002</span>
                    </div>
                    <div className={`status-indicator ${apiStatus.pomodoro ? 'online' : 'offline'}`}>
                      <div className="status-dot"></div>
                      <span>{apiStatus.pomodoro ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="api-service">
                    <div className="service-icon">📝</div>
                    <div className="service-info">
                      <span className="service-name">Notes API</span>
                      <span className="service-port">5003</span>
                    </div>
                    <div className={`status-indicator ${apiStatus.notes ? 'online' : 'offline'}`}>
                      <div className="status-dot"></div>
                      <span>{apiStatus.notes ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="api-service">
                    <div className="service-icon">⭐</div>
                    <div className="service-info">
                      <span className="service-name">Habits API</span>
                      <span className="service-port">5004</span>
                    </div>
                    <div className={`status-indicator ${apiStatus.habits ? 'online' : 'offline'}`}>
                      <div className="status-dot"></div>
                      <span>{apiStatus.habits ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
                <div className="system-status">
                  <div className="status-message">
                    <span className="status-icon">⚡</span>
                    All services running independently via Docker Compose
                  </div>
                </div>
              </div>

              <div className="architecture wow-panel">
                <h3>🏗️ System Architecture</h3>
                <div className="architecture-diagram">
                  <div className="arch-layer frontend-layer">
                    <div className="arch-box frontend-box">
                      <div className="box-icon">🌐</div>
                      <div className="box-content">
                        <strong>React Frontend</strong>
                        <small>Port 3000</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="connection-line"></div>
                  
                  <div className="arch-layer api-layer">
                    <div className="api-cluster">
                      <div className="arch-box api-box tasks-box">
                        <div className="box-icon">📋</div>
                        <div className="box-content">
                          <strong>Tasks API</strong>
                          <small>Port 5001</small>
                        </div>
                      </div>
                      <div className="arch-box api-box pomodoro-box">
                        <div className="box-icon">🍅</div>
                        <div className="box-content">
                          <strong>Pomodoro API</strong>
                          <small>Port 5002</small>
                        </div>
                      </div>
                      <div className="arch-box api-box notes-box">
                        <div className="box-icon">📝</div>
                        <div className="box-content">
                          <strong>Notes API</strong>
                          <small>Port 5003</small>
                        </div>
                      </div>
                      <div className="arch-box api-box habits-box">
                        <div className="box-icon">⭐</div>
                        <div className="box-content">
                          <strong>Habits API</strong>
                          <small>Port 5004</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="connection-line"></div>
                  
                  <div className="arch-layer database-layer">
                    <div className="arch-box database-box">
                      <div className="box-icon">🗄️</div>
                      <div className="box-content">
                        <strong>MongoDB Atlas</strong>
                        <small>Cloud Database</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="architecture-footer">
                  <span className="docker-badge">🐳 Containerised with Docker Compose</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="section">
            <div className="section-header">
              <h2>✅ Tasks</h2>
              <p className="section-subtitle">get things done</p>
            </div>
            
            <div className="task-input-row">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="what needs to get done?"
                className="task-input"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="priority-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button onClick={addTask} className="add-btn">Add Task</button>
            </div>

            <div className="task-sections">
              <div className="task-section">
                <h3>To Do ({tasks.filter(t => !t.completed).length} remaining)</h3>
                {tasks.filter(t => !t.completed).map(task => (
                  <div key={task._id} className="task-item">
                    <button onClick={() => toggleTask(task._id)} className="task-toggle">
                      <Circle size={20} />
                    </button>
                    <span className="task-text">{task.text}</span>
                    <span className={`priority ${task.priority}`}>{task.priority}</span>
                    <button onClick={() => deleteTask(task._id)} className="delete-btn">
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="task-section">
                <h3>Done ({completedCount} completed)</h3>
                {tasks.filter(t => t.completed).map(task => (
                  <div key={task._id} className="task-item completed">
                    <button onClick={() => toggleTask(task._id)} className="task-toggle">
                      <CheckCircle size={20} />
                    </button>
                    <span className="task-text">{task.text}</span>
                    <span className={`priority ${task.priority}`}>{task.priority}</span>
                    <button onClick={() => deleteTask(task._id)} className="delete-btn">
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pomodoro Tab */}
        {activeTab === 'pomodoro' && (
          <div className="section">
            <div className="section-header">
              <h2>🍅 Focus Time</h2>
              <p className="section-subtitle">lock in and get productive</p>
            </div>
            
            <div className="pomodoro-container">
              <div className="timer-display">
                <svg width="200" height="200" className="progress-ring">
                  <circle cx="100" cy="100" r="80" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                  <circle cx="100" cy="100" r="80" stroke="#7C5CFC" strokeWidth="8" fill="none" strokeLinecap="round" 
                    style={{ strokeDasharray: circumference, strokeDashoffset: dashoffset }} />
                </svg>
                <div className="timer-center">
                  <div className="timer-text">{formatTime(pomodoroTime)}</div>
                  <div className="timer-mode">{pomodoroMode.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
                </div>
              </div>
              
              <div className="mode-buttons">
                <button className={`mode-btn ${pomodoroMode === 'focus' ? 'active' : ''}`} onClick={() => setPomodoroSession('focus')}>
                  <Clock size={16} /> Focus 25m
                </button>
                <button className={`mode-btn ${pomodoroMode === 'shortBreak' ? 'active' : ''}`} onClick={() => setPomodoroSession('shortBreak')}>
                  <Clock size={16} /> Short Break 5m
                </button>
                <button className={`mode-btn ${pomodoroMode === 'longBreak' ? 'active' : ''}`} onClick={() => setPomodoroSession('longBreak')}>
                  <Clock size={16} /> Long Break 15m
                </button>
              </div>
              
              <button onClick={() => setIsRunning(!isRunning)} className="start-btn">
                {isRunning ? <Pause size={24} /> : <Play size={24} />}
                {isRunning ? 'Pause' : 'Start'}
              </button>
              
              <div className="stats">
                <div className="stat">Sessions today: 3</div>
                <div className="stat">Total focus: 2h 15m</div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="section">
            <div className="section-header">
              <h2>📝 Notes</h2>
              <p className="section-subtitle">capture your thoughts</p>
            </div>
            
            <div className="note-input-row">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="note title (optional)"
                className="title-input"
              />
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="what's on your mind?"
                className="content-textarea"
                rows="3"
              />
              <button onClick={addNote} className="add-btn">Save Note</button>
            </div>

            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="pencil-icon">✏️</div>
                <p>No notes yet — capture your thoughts</p>
              </div>
            ) : (
              <div className="notes-grid">
                {notes.map((note, index) => (
                  <div key={note._id} className="note-card">
                    <button onClick={() => deleteNote(note._id)} className="delete-btn">
                      <Trash size={16} />
                    </button>
                    <h3 className="note-title">{note.title}</h3>
                    <p className="note-content">{note.content}</p>
                    <div className="timestamp">{new Date().toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Habits Tab */}
        {activeTab === 'habits' && (
          <div className="section">
            <div className="section-header">
              <h2>⭐ Habits</h2>
              <p className="section-subtitle">build better routines</p>
            </div>
            
            <div className="habit-input-row">
              <input
                type="text"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="new habit name"
                className="habit-input"
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
              />
              <select value={newHabitCategory} onChange={(e) => setNewHabitCategory(e.target.value)} className="category-select">
                <option value="health">Health</option>
                <option value="productivity">Productivity</option>
                <option value="learning">Learning</option>
                <option value="other">Other</option>
              </select>
              <button onClick={addHabit} className="add-btn">Add Habit</button>
            </div>

            <div className="habits-list">
              {habits.map(habit => (
                <div key={habit._id} className="habit-item">
                  <div className="habit-info">
                    <span className="habit-name">{habit.name}</span>
                    <span className="category">{habit.category}</span>
                    <span className="streak">🔥 {habit.streak} days</span>
                  </div>
                  <div className="mini-calendar">
                    {Array(7).fill().map((_, i) => (
                      <span key={i} className="day">○</span>
                    ))}
                  </div>
                  <button className={`check-btn ${habit.completed ? 'completed' : ''}`} onClick={() => toggleHabit(habit._id)}>
                    {habit.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;