const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studycore';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🍅 Pomodoro API connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Pomodoro Session Schema
const sessionSchema = new mongoose.Schema({
  duration: {
    type: Number,
    required: true,
    default: 1500 // 25 minutes in seconds
  },
  completed: {
    type: Boolean,
    default: false
  },
  sessionType: {
    type: String,
    enum: ['work', 'shortBreak', 'longBreak'],
    default: 'work'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  pausedDuration: {
    type: Number,
    default: 0
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pomodoro Settings Schema
const settingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default'
  },
  workDuration: {
    type: Number,
    default: 1500 // 25 minutes
  },
  shortBreakDuration: {
    type: Number,
    default: 300 // 5 minutes
  },
  longBreakDuration: {
    type: Number,
    default: 900 // 15 minutes
  },
  sessionsUntilLongBreak: {
    type: Number,
    default: 4
  },
  autoStartBreaks: {
    type: Boolean,
    default: false
  },
  autoStartWork: {
    type: Boolean,
    default: false
  },
  soundEnabled: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Session = mongoose.model('PomodoroSession', sessionSchema);
const Settings = mongoose.model('PomodoroSettings', settingsSchema);

// Routes

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { date, completed, sessionType } = req.query;
    let filter = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.startTime = { $gte: startDate, $lt: endDate };
    }
    
    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    
    if (sessionType) {
      filter.sessionType = sessionType;
    }
    
    const sessions = await Session.find(filter).sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { duration, sessionType, taskId, notes } = req.body;
    
    const session = new Session({
      duration: duration || 1500,
      sessionType: sessionType || 'work',
      startTime: new Date(),
      taskId,
      notes
    });
    
    const savedSession = await session.save();
    res.status(201).json(savedSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Complete session
app.patch('/api/sessions/:id/complete', async (req, res) => {
  try {
    const { endTime, pausedDuration, notes } = req.body;
    
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.completed = true;
    session.endTime = endTime ? new Date(endTime) : new Date();
    if (pausedDuration !== undefined) session.pausedDuration = pausedDuration;
    if (notes !== undefined) session.notes = notes;
    
    const updatedSession = await session.save();
    res.json(updatedSession);
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// Get session statistics
app.get('/api/sessions/stats', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { startTime: { $gte: today } };
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { startTime: { $gte: weekStart } };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { startTime: { $gte: monthStart } };
        break;
    }
    
    const totalSessions = await Session.countDocuments(dateFilter);
    const completedSessions = await Session.countDocuments({
      ...dateFilter,
      completed: true
    });
    
    const workSessions = await Session.countDocuments({
      ...dateFilter,
      sessionType: 'work',
      completed: true
    });
    
    const totalFocusTime = await Session.aggregate([
      { $match: { ...dateFilter, completed: true, sessionType: 'work' } },
      {
        $group: {
          _id: null,
          totalTime: { $sum: '$duration' }
        }
      }
    ]);
    
    const focusTimeMinutes = totalFocusTime.length > 0 ? 
      Math.round(totalFocusTime[0].totalTime / 60) : 0;
    
    res.json({
      totalSessions,
      completedSessions,
      workSessions,
      focusTimeMinutes,
      completionRate: totalSessions > 0 ? 
        Math.round((completedSessions / totalSessions) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({ error: 'Failed to fetch session statistics' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: 'default' });
    if (!settings) {
      settings = new Settings({ userId: 'default' });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const settings = await Settings.findOneAndUpdate(
      { userId: 'default' },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'StudyCore Pomodoro API',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Pomodoro API running on port ${PORT}`);
});