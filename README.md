# Athena — Exam Proctoring & Student Analytics Platform

**Athena** is a React and Electron-based examination platform designed to provide a structured online assessment experience, exam session management, and detailed student performance analytics. It includes an Express.js backend, file-based JSON storage, and AI-powered feedback using the Groq API.

The platform combines an exam interface with a performance dashboard to help students understand their results, review their answers, and identify areas for improvement.

## ✨ Features

### 📝 Examination System
- Interactive multiple-choice question (MCQ) interface.
- Exam session creation and management.
- Answer submission and automatic evaluation.
- Exam submission and result summaries.
- Tracking of attempted, correct, incorrect, and unanswered questions.

### 📊 Student Analytics & Feedback
- Overall score and accuracy calculations.
- Question completion statistics.
- Question-by-question answer review.
- Selected-answer and correct-answer comparisons.
- Exam duration and timing analytics.
- Topic-wise performance analysis when topic metadata is available.

### 🤖 AI-Powered Feedback
- Personalized performance summaries using Groq.
- Identification of strengths and areas for improvement based on available results.
- Actionable study recommendations.
- Supportive feedback to guide future preparation.

### 🖥️ Desktop Application
- React-based user interface.
- Electron integration for a desktop application experience.
- Component-based frontend architecture.

### ⚙️ Backend & Data Management
- REST API built with Node.js and Express.js.
- JSON-file storage for questions and exam sessions.
- Session tracking and answer evaluation.
- Environment-variable configuration for API credentials.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tooling |
| Electron | Desktop application integration |
| Node.js | JavaScript runtime |
| Express.js | Backend REST API |
| JSON | Question and exam-session storage |
| Groq API | AI-generated performance feedback |
| CSS | Responsive UI styling |
| Git & GitHub | Version control and collaboration |

## 📁 Project Structure

```text
Proctoring_Tool_latest/
├── app/
│   └── user-camera-snap/
├── backend/
│   ├── data/
│   │   ├── questions.json
│   │   └── sessions.json
│   ├── server.js
│   ├── package.json
│   └── .env
├── src/
│   ├── components/
│   │   ├── AnalyticsFeedback.jsx
│   │   ├── AnalyticsFeedback.css
│   │   └── ResultScreen.jsx
│   ├── api/
│   ├── App.jsx
│   └── App.css
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

*Note: This is a representative structure; retain any additional files and directories in your actual project.*

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- npm
- [Git](https://git-scm.com/)
- A Groq API key for AI-generated feedback

### 1. Clone the repository

```bash
git clone <REPOSITORY_URL>
cd Proctoring_Tool_latest
```

### 2. Install frontend dependencies

From the project root:

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```env
GROQ_API_KEY=groq_api_key
```

Obtain your API key from the [Groq Console](https://console.groq.com/).

**Security:** Never commit your `.env` file or expose your API key in frontend code. Ensure `.env` is included in your `.gitignore`.

### 5. Start the backend

From the `backend/` directory:

```bash
node server.js
```

The backend should start at:

```text
http://localhost:3000
```

You can verify that it is running by visiting:

```text
http://localhost:3000/
```

Expected response:

```json
{
  "message": "Exam backend is running"
}
```

### 6. Start the frontend

Open another terminal, navigate to the project root, and run:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

If the frontend or Electron app uses a separate startup script, check the root `package.json` for the appropriate command.

## 🔌 API Endpoints

The Express backend currently exposes the following core endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check backend status |
| POST | `/exam/start` | Start a new exam session |
| GET | `/exam/mcq` | Retrieve exam questions without correct answers |
| GET | `/exam/mcq/:id` | Retrieve a specific question |
| POST | `/exam/answer` | Submit and evaluate an answer |
| GET | `/exam/session/:sessionId` | Retrieve exam session information |
| POST | `/exam/submit` | Submit an exam |
| GET | `/exam/analytics/:sessionId` | Retrieve analytics for a submitted exam |
| POST | `/exam/analytics/:sessionId/feedback` | Generate AI-powered performance feedback |

### Example: Start an Exam

**Request**

```http
POST /exam/start
Content-Type: application/json
```

```json
{
  "userId": "student-101",
  "name": "Student"
}
```

The response includes the newly created `sessionId`.

### Example: Retrieve Analytics

```http
GET /exam/analytics/session-123456
```

The actual session ID must belong to an existing submitted exam.

The analytics response includes statistics such as:

- Total questions
- Attempted questions
- Correct and incorrect answers
- Unanswered questions
- Score percentage
- Accuracy percentage
- Completion percentage
- Question-level review and timing information, when available

## 🧠 How AI Feedback Works

Athena uses the Groq API to generate performance feedback from exam analytics.

The general workflow is:

1. The student completes and submits an exam.
2. The backend calculates the official examination results.
3. The analytics endpoint provides the available performance data.
4. The backend sends the analytics to the Groq API.
5. The generated feedback is displayed on the Analytics & Feedback page.

AI feedback is intended to support learning and revision. The backend's calculated results remain the source of truth for the exam score.

## 📈 Analytics Methodology

- **Score percentage:** Correct answers divided by total questions, multiplied by 100.
- **Accuracy percentage:** Correct answers divided by attempted questions, multiplied by 100.
- **Completion percentage:** Attempted questions divided by total questions, multiplied by 100.
- **Unanswered questions:** Total questions minus attempted questions.
- **Exam duration:** Difference between the recorded start and submission timestamps.

Question-level timing depends on the timestamps available in the session data. Estimates based on answer submission timestamps should not be interpreted as precise active reading time.

Topic-wise analytics require topic metadata to be included in the question bank.

## 🔒 Security Considerations

- Store API credentials in environment variables.
- Never expose the Groq API key in the React frontend.
- Validate all incoming request data on the backend.
- Restrict access to session and analytics information to authorized users.
- Avoid exposing correct answers or answer evaluations to students before submission.
- Consider authentication, authorization, rate limiting, and persistent database storage before deploying publicly.
- Ensure webcam snapshots and other potentially sensitive exam data are not accidentally committed to version control.

## 🗺️ Future Improvements

Potential areas for further development include:

- More detailed question-level timing and behavioral analytics.
- Topic tagging and topic-wise mastery reports.
- Stronger exam-session authentication and authorization.
- Database integration for scalable storage.
- Improved examination integrity and proctoring workflows.
- Exportable student performance reports.
- Enhanced accessibility and mobile-responsive layouts.
- More granular analytics for instructors and administrators.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the affected functionality.
5. Submit a pull request describing your changes.


---

**Built with React, Electron, Express.js, and Groq.**
