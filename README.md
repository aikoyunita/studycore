# StudyCore

A microservices-based student productivity suite

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React, Axios, Lucide React |
| **Backend** | Node.js, Express |
| **Database** | MongoDB Atlas |
| **Containerization** | Docker, Docker Compose |

## Architecture

StudyCore consists of 4 independent microservices, each running in its own Docker container:

- **Tasks API** (port 5001): CRUD operations for tasks with priority and due dates
- **Pomodoro API** (port 5002): Session management and statistics
- **Notes API** (port 5003): Note storage with tags and archiving
- **Habits API** (port 5004): Habit tracking with streak calculation

All services connect to a shared MongoDB Atlas cloud database.

## Features

- **Tasks Management**: Create, prioritize, and track tasks
- **Pomodoro Timer**: Focus sessions with break intervals
- **Notes**: Capture and organize thoughts
- **Habits Tracker**: Build and maintain daily habits

## Getting Started

1. Clone the repository
2. Run `docker-compose up --build`
3. Open http://localhost:3000

## API Endpoints

### Tasks API (5001)

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Pomodoro API (5002)

- `GET /api/sessions` - Get sessions
- `POST /api/sessions` - Create session

### Notes API (5003)

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create note
- `DELETE /api/notes/:id` - Delete note

### Habits API (5004)

- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create habit
- `PUT /api/habits/:id` - Update habit

## Screenshots

[screenshot here]

## Built as a full-stack microservices project to demonstrate containerisation, API design, and React frontend development