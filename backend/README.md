# Exam Backend

A very small Express backend for the Electron exam application.

It uses JSON files instead of a database so students can understand the complete flow before introducing MongoDB, PostgreSQL, or another database.

## Folder Structure

```text
Athena-Clone-2/
├── app/               # Electron Main & Preload
├── backend/           # Express Backend
│   ├── data/
│   │   ├── questions.json
│   │   └── sessions.json
│   ├── package.json
│   ├── server.js
│   └── README.md
├── src/               # React + Vite UI
└── package.json
```

## Running the Backend

From the project root (`Athena-Clone-2`):
```bash
# Run backend server directly
npm run backend

# Or if you need to install backend dependencies
npm run backend:install
```

Or from inside the `backend/` directory:
```bash
cd backend
npm install
npm start
```

Server runs at:
```text
http://localhost:3000
```

## API Flow

```text
Student starts exam
        ↓
POST /exam/start
        ↓
Session is created
        ↓
GET /exam/mcq/1
        ↓
Question is returned
        ↓
POST /exam/answer
        ↓
Attempt/correct/wrong are updated
        ↓
POST /exam/submit
        ↓
Session is marked submitted
```

## 1. Start Exam

### Request

```http
POST /exam/start
Content-Type: application/json
```

```json
{
  "userId": "student-101",
  "name": "Aditya"
}
```

### Response

```json
{
  "message": "Exam session started",
  "sessionId": "session-1789830000000"
}
```

Save this `sessionId` in the frontend. It identifies this particular exam attempt.

## 2. Get One Question

```http
GET /exam/mcq/1
```

Example response:

```json
{
  "id": 1,
  "question": "Which Electron process is responsible for creating BrowserWindow?",
  "options": [
    "Renderer Process",
    "Main Process",
    "React Process",
    "Preload Process"
  ]
}
```

The correct answer is deliberately not sent to the frontend.

## 3. Get All Questions

```http
GET /exam/mcq
```

## 4. Submit One Answer

```http
POST /exam/answer
Content-Type: application/json
```

```json
{
  "sessionId": "session-1789830000000",
  "questionId": 1,
  "selectedAnswer": 1
}
```

`selectedAnswer` is the option index:

```text
0 = first option
1 = second option
2 = third option
3 = fourth option
```

Example response:

```json
{
  "message": "Answer saved",
  "isCorrect": true,
  "attempted": 1,
  "correct": 1,
  "wrong": 0
}
```

## 5. Check Session

```http
GET /exam/session/session-1789830000000
```

This returns the current exam progress.

## 6. Submit Exam

```http
POST /exam/submit
Content-Type: application/json
```

```json
{
  "sessionId": "session-1789830000000"
}
```

Example response:

```json
{
  "message": "Exam submitted successfully",
  "result": {
    "attempted": 3,
    "correct": 2,
    "wrong": 1
  }
}
```

## Important Teaching Point

The frontend never receives `correctAnswer` when fetching a question.

The backend keeps the correct answer inside `questions.json` and checks the submitted answer itself.

That gives students the basic client/server idea:

```text
Frontend             Backend
   │                    │
   │ GET question       │
   ├───────────────────→│
   │                    │ read questions.json
   │ question           │
   │←───────────────────┤
   │                    │
   │ POST answer        │
   ├───────────────────→│
   │                    │ checks correct answer
   │ result             │ updates sessions.json
   │←───────────────────┤
```

## Why JSON Files For Now?

The JSON files are acting as our database.

```text
questions.json = question database
sessions.json  = exam session database
```

Later these can be replaced with a real database without changing the basic API idea.
