const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studycore';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('📝 Notes API connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Note Schema
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: '#fdf2f8' // Light pink default
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  reminder: {
    type: Date
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Text search index
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Note = mongoose.model('Note', noteSchema);

// Routes

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const {
      category,
      tag,
      archived,
      pinned,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      limit = 50,
      page = 1
    } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (archived !== undefined) filter.isArchived = archived === 'true';
    if (pinned !== undefined) filter.isPinned = pinned === 'true';

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // If pinned notes exist, prioritize them
    if (pinned === undefined) {
      sort.isPinned = -1; // Pinned notes first
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notes = await Note.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Note.countDocuments(filter);

    res.json({
      success: true,
      data: notes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message
    });
  }
});

// Get note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: error.message
    });
  }
});

// Create new note
app.post('/api/notes', async (req, res) => {
  try {
    const noteData = req.body;
    
    // Validate required fields
    if (!noteData.title || !noteData.content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const note = new Note(noteData);
    await note.save();

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully'
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: error.message
    });
  }
});

// Update note
app.put('/api/notes/:id', async (req, res) => {
  try {
    const noteData = req.body;
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      noteData,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      data: note,
      message: 'Note updated successfully'
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
});

// Delete note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
});

// Toggle pin status
app.patch('/api/notes/:id/pin', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.json({
      success: true,
      data: note,
      message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`
    });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pin status',
      error: error.message
    });
  }
});

// Toggle archive status
app.patch('/api/notes/:id/archive', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.isArchived = !note.isArchived;
    await note.save();

    res.json({
      success: true,
      data: note,
      message: `Note ${note.isArchived ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Error toggling archive status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle archive status',
      error: error.message
    });
  }
});

// Get all categories
app.get('/api/notes/categories', async (req, res) => {
  try {
    const categories = await Note.distinct('category');
    
    res.json({
      success: true,
      data: categories.filter(cat => cat && cat.trim() !== '')
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get all tags
app.get('/api/notes/tags', async (req, res) => {
  try {
    const tags = await Note.distinct('tags');
    
    res.json({
      success: true,
      data: tags.filter(tag => tag && tag.trim() !== '')
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    });
  }
});

// Bulk operations
app.post('/api/notes/bulk', async (req, res) => {
  try {
    const { action, noteIds } = req.body;
    
    if (!action || !noteIds || !Array.isArray(noteIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and noteIds array are required'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'pin':
        updateData = { isPinned: true };
        message = 'Notes pinned successfully';
        break;
      case 'unpin':
        updateData = { isPinned: false };
        message = 'Notes unpinned successfully';
        break;
      case 'archive':
        updateData = { isArchived: true };
        message = 'Notes archived successfully';
        break;
      case 'unarchive':
        updateData = { isArchived: false };
        message = 'Notes unarchived successfully';
        break;
      case 'delete':
        await Note.deleteMany({ _id: { $in: noteIds } });
        message = 'Notes deleted successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    if (action !== 'delete') {
      await Note.updateMany(
        { _id: { $in: noteIds } },
        updateData
      );
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notes API is running',
    timestamp: new Date().toISOString(),
    service: 'studycore-notes-api'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`📝 Notes API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});