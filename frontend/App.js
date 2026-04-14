import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Pause, 
  StickyNote, 
  Calendar,
  Music,
  Sparkles,
  Heart,
  Star,
  Coffee
} from 'lucide-react';
import './App.css';

function App() {
  // States for different features
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [habits, setHabits] = useState([]);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  // Motivational quotes for Gen Z
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

  // Load data on component mount
  useEffect(() => {
    loadTasks();
    loadNotes();
    loadHabits();
    
    // Change quote every 30 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 30000);

    return () => clearInterval(quoteInterval);
  }, []);

  // Pomodoro timer effect
  useEffect(() => {
    let interval = null;
    if (isRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(time => time - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsRunning(false);
      alert('Pomodoro session complete! Time for a break bestie 💕');
      setPomodoroTime(25 * 60);
    }
    return () => clearInterval(interval);
  }, [isRunning, pomodoroTime]);

  // API functions
  const loadTasks = async () => {
    try {
      const response = await axios.get(`${TASKS_API}/api/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Fallback data
      setTasks([
        { _id: '1', text: 'finish math homework', completed: false, priority: 'high' },
        { _id: '2', text: 'study for chemistry test', completed: false, priority: 'medium' }
      ]);
    }
  };

  const loadNotes = async () => {
    try {
      //const response = await axios.get(`${NOTES_API}/api/notes`);
      //setNotes(response.data);
      // ✅ With axios
      const response = await axios.get(`${NOTES_API}/api/notes`);
      / 🔍 DEBUG: Let's see what we're actually getting
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data.data:', response.data.data);
      console.log('Is response.data.data an array?', Array.isArray(response.data.data));
      setNotes(response.data.data); // response.data.data because axios wraps it once more
    } catch (error) {
      console.error('Error loading notes:', error);
      // Fallback data
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
      // Fallback data
      setHabits([
        { _id: '1', name: 'drink water', streak: 5, completed: false },
        { _id: '2', name: 'read for 30 mins', streak: 3, completed: true }
      ]);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      const response = await axios.post(`${TASKS_API}/api/tasks`, {
        text: newTask,
        completed: false,
        priority: 'medium'
      });
      setTasks([...tasks, response.data]);
    } catch (error) {
      // Fallback: add to local state
      const newTaskObj = {
        _id: Date.now().toString(),
        text: newTask,
        completed: false,
        priority: 'medium'
      };
      setTasks([...tasks, newTaskObj]);
    }
    setNewTask('');
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
      // Fallback: update local state
      setTasks(tasks.map(task => 
        task._id === id ? { ...task, completed: !task.completed } : task
      ));
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const response = await axios.post(`${NOTES_API}/api/notes`, {
        title: `Note ${notes.length + 1}`,
        content: newNote
      });
      setNotes([...notes, response.data]);
    } catch (error) {
      // Fallback: add to local state
      const newNoteObj = {
        _id: Date.now().toString(),
        title: `Note ${notes.length + 1}`,
        content: newNote
      };
      setNotes([...notes, newNoteObj]);
    }
    setNewNote('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <Sparkles className="logo-icon" />
            StudyCore
          </h1>
          <div className="quote-container">
            <p className="motivational-quote">{currentQuote}</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        {[
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
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="section">
            <div className="section-header">
              <h2>✨ Task Manager</h2>
              <p className="section-subtitle">slay those assignments bestie</p>
            </div>
            
            <div className="add-item">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="what needs to get done?"
                className="input-field"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button onClick={addTask} className="add-button">
                Add Task
              </button>
            </div>

            <div className="task-list">
              {tasks.map(task => (
                <div key={task._id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <button
                    onClick={() => toggleTask(task._id)}
                    className="task-toggle"
                  >
                    {task.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  <span className="task-text">{task.text}</span>
                  <span className={`priority ${task.priority}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pomodoro Tab */}
        {activeTab === 'pomodoro' && (
          <div className="section">
            <div className="section-header">
              <h2>🍅 Focus Time</h2>
              <p className="section-subtitle">time to lock in fr</p>
            </div>
            
            <div className="pomodoro-container">
              <div className="timer-display">
                <div className="timer-circle">
                  <span className="timer-text">{formatTime(pomodoroTime)}</span>
                </div>
              </div>
              
              <div className="timer-controls">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`control-button ${isRunning ? 'pause' : 'play'}`}
                >
                  {isRunning ? <Pause size={24} /> : <Play size={24} />}
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                
                <button
                  onClick={() => {
                    setPomodoroTime(25 * 60);
                    setIsRunning(false);
                  }}
                  className="control-button reset"
                >
                  Reset
                </button>
              </div>

              <div className="focus-stats">
                <div className="stat-card">
                  <Coffee size={20} />
                  <span>Sessions today: 3</span>
                </div>
                <div className="stat-card">
                  <Heart size={20} />
                  <span>Total focus: 2h 15m</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="section">
            <div className="section-header">
              <h2>📝 Digital Notes</h2>
              <p className="section-subtitle">capture those big brain moments</p>
            </div>
            
            <div className="add-item">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="what's on your mind?"
                className="textarea-field"
                rows="3"
              />
              <button onClick={addNote} className="add-button">
                Save Note
              </button>
            </div>

            <div className="notes-grid">
              {notes.map(note => (
                <div key={note._id} className="note-card">
                  <h3 className="note-title">{note.title}</h3>
                  <p className="note-content">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits Tab */}
        {activeTab === 'habits' && (
          <div className="section">
            <div className="section-header">
              <h2>⭐ Habit Tracker</h2>
              <p className="section-subtitle">building that character development arc</p>
            </div>
            
            <div className="habits-list">
              {habits.map(habit => (
                <div key={habit._id} className="habit-item">
                  <div className="habit-info">
                    <span className="habit-name">{habit.name}</span>
                    <span className="habit-streak">🔥 {habit.streak} day streak</span>
                  </div>
                  <button
                    className={`habit-check ${habit.completed ? 'completed' : ''}`}
                    onClick={() => {
                      setHabits(habits.map(h => 
                        h._id === habit._id 
                          ? { ...h, completed: !h.completed, streak: h.completed ? h.streak - 1 : h.streak + 1 }
                          : h
                      ));
                    }}
                  >
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