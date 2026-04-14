const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/studycore';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('🎯 Habit Tracker API connected to MongoDB');
  console.log(`📍 Database: ${MONGODB_URI}`);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Habit Schema
const habitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Habit title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['health', 'study', 'fitness', 'mindfulness', 'productivity', 'personal', 'other'],
      message: 'Invalid category'
    },
    default: 'personal'
  },
  color: {
    type: String,
    default: '#10b981', // Lime green default
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format']
  },
  icon: {
    type: String,
    default: '🎯'
  },
  frequency: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'custom'],
      message: 'Invalid frequency'
    },
    default: 'daily'
  },
  target: {
    type: Number,
    default: 1,
    min: [1, 'Target must be at least 1'],
    max: [100, 'Target cannot exceed 100']
  },
  unit: {
    type: String,
    default: 'times',
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters']
  },
  reminderTime: {
    type: String,
    default: null,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Habit Entry Schema
const habitEntrySchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: [true, 'Habit ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  dateString: {
    type: String,
    required: [true, 'Date string is required']
  },
  completed: {
    type: Number,
    default: 0,
    min: [0, 'Completion count cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  },
  mood: {
    type: String,
    enum: ['😔', '😐', '😊', '😃', '🤩'],
    default: null
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update timestamps
habitSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

habitEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better performance
habitEntrySchema.index({ habitId: 1, dateString: 1 }, { unique: true });
habitEntrySchema.index({ date: 1 });
habitEntrySchema.index({ habitId: 1, date: -1 });
habitSchema.index({ isActive: 1, createdAt: -1 });
habitSchema.index({ category: 1 });

const Habit = mongoose.model('Habit', habitSchema);
const HabitEntry = mongoose.model('HabitEntry', habitEntrySchema);

// Helper Functions
const getDateString = (date = new Date()) => {
  return moment(date).format('YYYY-MM-DD');
};

const calculateStreak = async (habitId, endDate = new Date()) => {
  try {
    const habit = await Habit.findById(habitId);
    if (!habit) return { currentStreak: 0, longestStreak: 0 };

    const entries = await HabitEntry.find({
      habitId: habitId,
      date: { $gte: habit.startDate, $lte: endDate }
    }).sort({ date: -1 });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = moment(endDate);

    // Check if today is completed first
    const today = getDateString(endDate);
    const todayEntry = entries.find(entry => entry.dateString === today);
    let streakBroken = false;

    for (const entry of entries) {
      const entryDate = moment(entry.date);
      const dayDiff = lastDate.diff(entryDate, 'days');

      if (entry.completed >= habit.target) {
        if (dayDiff <= 1) {
          tempStreak++;
          if (!streakBroken && (dayDiff === 0 || (dayDiff === 1 && lastDate.format('YYYY-MM-DD') === today))) {
            currentStreak = tempStreak;
          }
        } else if (dayDiff > 1) {
          tempStreak = 1;
          streakBroken = true;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (tempStreak > 0 && !streakBroken) {
          streakBroken = true;
        }
        tempStreak = 0;
      }
      lastDate = entryDate;
    }

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error calculating streak:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
};

const getHabitStats = async (habitId, days = 30) => {
  try {
    const habit = await Habit.findById(habitId);
    if (!habit) return null;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await HabitEntry.find({
      habitId: habitId,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalDays = days;
    const completedDays = entries.filter(entry => entry.completed >= habit.target).length;
    const partialDays = entries.filter(entry => entry.completed > 0 && entry.completed < habit.target).length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays * 100).toFixed(1) : 0;
    const streaks = await calculateStreak(habitId);

    return {
      totalDays,
      completedDays,
      partialDays,
      completionRate: parseFloat(completionRate),
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      averagePerDay: entries.length > 0 ? 
        (entries.reduce((sum, entry) => sum + entry.completed, 0) / entries.length).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Error getting habit stats:', error);
    return null;
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Habit Tracker API is running',
    timestamp: new Date().toISOString(),
    service: 'studycore-habit-tracker-api',
    version: '1.0.0'
  });
});

// Get all habits
app.get('/api/habits', async (req, res) => {
  try {
    const { 
      category, 
      active, 
      priority,
      difficulty,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      limit = 50,
      page = 1
    } = req.query;
    
    let filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    if (priority) filter.priority = priority;
    if (difficulty) filter.difficulty = difficulty;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const habits = await Habit.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get stats for each habit
    const habitsWithStats = await Promise.all(
      habits.map(async (habit) => {
        const stats = await getHabitStats(habit._id);
        const todayEntry = await HabitEntry.findOne({
          habitId: habit._id,
          dateString: getDateString()
        });
        
        return {
          ...habit.toObject(),
          stats: stats || {
            currentStreak: 0,
            longestStreak: 0,
            completionRate: 0
          },
          todayCompleted: todayEntry ? todayEntry.completed : 0,
          todayTarget: habit.target,
          todayProgress: habit.target > 0 ? 
            Math.min((todayEntry ? todayEntry.completed : 0) / habit.target * 100, 100).toFixed(1) : 0
        };
      })
    );

    const total = await Habit.countDocuments(filter);

    res.json({
      success: true,
      data: habitsWithStats,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habits',
      error: error.message
    });
  }
});

// Get habit by ID
app.get('/api/habits/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const stats = await getHabitStats(habit._id);
    const todayEntry = await HabitEntry.findOne({
      habitId: habit._id,
      dateString: getDateString()
    });

    res.json({
      success: true,
      data: {
        ...habit.toObject(),
        stats: stats || {
          currentStreak: 0,
          longestStreak: 0,
          completionRate: 0
        },
        todayCompleted: todayEntry ? todayEntry.completed : 0,
        todayNotes: todayEntry ? todayEntry.notes : '',
        todayMood: todayEntry ? todayEntry.mood : null
      }
    });
  } catch (error) {
    console.error('Error fetching habit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit',
      error: error.message
    });
  }
});

// Create new habit
app.post('/api/habits', async (req, res) => {
  try {
    const habitData = req.body;
    
    // Validate required fields
    if (!habitData.title || !habitData.title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Habit title is required'
      });
    }

    // Set default values
    if (!habitData.category) habitData.category = 'personal';
    if (!habitData.color) habitData.color = '#10b981';
    if (!habitData.icon) habitData.icon = '🎯';

    const habit = new Habit(habitData);
    await habit.save();

    res.status(201).json({
      success: true,
      data: habit,
      message: 'Habit created successfully'
    });
  } catch (error) {
    console.error('Error creating habit:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create habit',
      error: error.message
    });
  }
});

// Update habit
app.put('/api/habits/:id', async (req, res) => {
  try {
    const habit = await Habit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    res.json({
      success: true,
      data: habit,
      message: 'Habit updated successfully'
    });
  } catch (error) {
    console.error('Error updating habit:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update habit',
      error: error.message
    });
  }
});

// Delete habit
app.delete('/api/habits/:id', async (req, res) => {
  try {
    const habit = await Habit.findByIdAndDelete(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Delete all related entries
    await HabitEntry.deleteMany({ habitId: req.params.id });

    res.json({
      success: true,
      message: 'Habit and all related entries deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete habit',
      error: error.message
    });
  }
});

// Mark habit as completed for today (or specific date)
app.post('/api/habits/:id/complete', async (req, res) => {
  try {
    const { date, notes, mood, difficulty, increment = 1 } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const dateString = getDateString(targetDate);

    const habit = await Habit.findById(req.params.id);
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    let entry = await HabitEntry.findOne({
      habitId: req.params.id,
      dateString: dateString
    });

    if (entry) {
      entry.completed += increment;
      if (notes !== undefined) entry.notes = notes;
      if (mood !== undefined) entry.mood = mood;
      if (difficulty !== undefined) entry.difficulty = difficulty;
    } else {
      entry = new HabitEntry({
        habitId: req.params.id,
        date: targetDate,
        dateString: dateString,
        completed: increment,
        notes: notes || '',
        mood: mood || null,
        difficulty: difficulty || null
      });
    }

    await entry.save();

    // Get updated stats
    const stats = await getHabitStats(req.params.id);

    res.json({
      success: true,
      data: {
        entry,
        stats: stats || { currentStreak: 0, longestStreak: 0 }
      },
      message: 'Habit progress updated successfully'
    });
  } catch (error) {
    console.error('Error completing habit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update habit progress',
      error: error.message
    });
  }
});

// Update habit entry for specific date
app.put('/api/habits/:id/entries/:date', async (req, res) => {
  try {
    const { completed, notes, mood, difficulty } = req.body;
    const dateString = req.params.date;
    
    // Validate date format
    if (!moment(dateString, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const habit = await Habit.findById(req.params.id);
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    let entry = await HabitEntry.findOne({
      habitId: req.params.id,
      dateString: dateString
    });

    if (entry) {
      if (completed !== undefined) entry.completed = Math.max(0, completed);
      if (notes !== undefined) entry.notes = notes;
      if (mood !== undefined) entry.mood = mood;
      if (difficulty !== undefined) entry.difficulty = difficulty;
      await entry.save();
    } else {
      entry = new HabitEntry({
        habitId: req.params.id,
        date: new Date(dateString),
        dateString: dateString,
        completed: Math.max(0, completed || 0),
        notes: notes || '',
        mood: mood || null,
        difficulty: difficulty || null
      });
      await entry.save();
    }

    const stats = await getHabitStats(req.params.id);

    res.json({
      success: true,
      data: {
        entry,
        stats: stats || { currentStreak: 0, longestStreak: 0 }
      },
      message: 'Habit entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating habit entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update habit entry',
      error: error.message
    });
  }
});

// Get habit history
app.get('/api/habits/:id/history', async (req, res) => {
  try {
    const { startDate, endDate, limit = 30, page = 1 } = req.query;
    
    const habit = await Habit.findById(req.params.id);
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    let filter = { habitId: req.params.id };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const entries = await HabitEntry.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await HabitEntry.countDocuments(filter);
    const stats = await getHabitStats(req.params.id);

    res.json({
      success: true,
      data: {
        entries,
        habit: {
          title: habit.title,
          target: habit.target,
          unit: habit.unit
        },
        stats: stats || {
          totalDays: 0,
          completedDays: 0,
          completionRate: 0,
          currentStreak: 0,
          longestStreak: 0
        },
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching habit history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit history',
      error: error.message
    });
  }
});

// Get dashboard stats
app.get('/api/habits/dashboard/stats', async (req, res) => {
  try {
    const today = getDateString();
    const activeHabits = await Habit.find({ isActive: true });
    
    // Get today's progress for all active habits
    const todayEntries = await HabitEntry.find({
      dateString: today,
      habitId: { $in: activeHabits.map(h => h._id) }
    });

    // Calculate today's stats
    const completedToday = todayEntries.filter(entry => {
      const habit = activeHabits.find(h => h._id.toString() === entry.habitId.toString());
      return habit && entry.completed >= habit.target;
    }).length;

    const partialToday = todayEntries.filter(entry => {
      const habit = activeHabits.find(h => h._id.toString() === entry.habitId.toString());
      return habit && entry.completed > 0 && entry.completed < habit.target;
    }).length;

    // Calculate weekly stats
    const weekStart = moment().startOf('week').toDate();
    const weekEnd = moment().endOf('week').toDate();
    
    const weekEntries = await HabitEntry.find({
      date: { $gte: weekStart, $lte: weekEnd },
      habitId: { $in: activeHabits.map(h => h._id) }
    });

    const weeklyCompletions = weekEntries.filter(entry => {
      const habit = activeHabits.find(h => h._id.toString() === entry.habitId.toString());
      return habit && entry.completed >= habit.target;
    }).length;

    const expectedWeeklyCompletions = activeHabits.length * 7;
    const weeklyCompletionRate = expectedWeeklyCompletions > 0 ? 
      (weeklyCompletions / expectedWeeklyCompletions * 100).toFixed(1) : 0;

    // Get habits with best streaks
    const habitsWithStreaks = await Promise.all(
      activeHabits.slice(0, 5).map(async (habit) => {
        const stats = await getHabitStats(habit._id, 7);
        return {
          id: habit._id,
          title: habit.title,
          icon: habit.icon,
          color: habit.color,
          currentStreak: stats ? stats.currentStreak : 0,
          completionRate: stats ? stats.completionRate : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalActiveHabits: activeHabits.length,
        completedToday,
        partialToday,
        pendingToday: activeHabits.length - completedToday - partialToday,
        todayProgress: activeHabits.length > 0 ? 
          (completedToday / activeHabits.length * 100).toFixed(1) : 0,
        weeklyCompletionRate: parseFloat(weeklyCompletionRate),
        topHabits: habitsWithStreaks.sort((a, b) => b.currentStreak - a.currentStreak),
        todayEntries: todayEntries.map(entry => {
          const habit = activeHabits.find(h => h._id.toString() === entry.habitId.toString());
          return {
            ...entry.toObject(),
            habitTitle: habit ? habit.title : 'Unknown',
            habitTarget: habit ? habit.target : 1,
            habitIcon: habit ? habit.icon : '🎯',
            habitColor: habit ? habit.color : '#10b981'
          };
        })
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// Get habit categories with stats
app.get('/api/habits/categories', async (req, res) => {
  try {
    const categories = [
      { 
        value: 'health', 
        label: 'Health', 
        icon: '🏥', 
        color: '#ef4444',
        description: 'Physical and mental wellbeing'
      },
      { 
        value: 'study', 
        label: 'Study', 
        icon: '📚', 
        color: '#3b82f6',
        description: 'Learning and education'
      },
      { 
        value: 'fitness', 
        label: 'Fitness', 
        icon: '💪', 
        color: '#f59e0b',
        description: 'Exercise and physical activity'
      },
      { 
        value: 'mindfulness', 
        label: 'Mindfulness', 
        icon: '🧘', 
        color: '#8b5cf6',
        description: 'Meditation and mental clarity'
      },
      { 
        value: 'productivity', 
        label: 'Productivity', 
        icon: '🔥', 
        color: '#10b981',
        description: 'Efficiency and goal achievement'
      },
      { 
        value: 'personal', 
        label: 'Personal', 
        icon: '👤', 
        color: '#06b6d4',
        description: 'Personal development and growth'
      },
      { 
        value: 'other', 
        label: 'Other', 
        icon: '📝', 
        color: '#6b7280',
        description: 'For everything else in your journey'
      }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching habit categories'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Habit Tracker API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health Check: http://localhost:${PORT}/health`);
});
