const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, "data");
const questionsPath = path.join(dataDir, "questions.json");
const sessionsPath = path.join(dataDir, "sessions.json");
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readQuestions() {
  if (!fs.existsSync(questionsPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
}

function readSessions() {
  if (!fs.existsSync(sessionsPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

function makeSessionId() {
  return `session-${Date.now()}`;
}

function questionForStudent(question) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
  };
}

function buildAnalytics(sessionId) {
  const sessions = readSessions();
  const questions = readQuestions();

  const session = Array.isArray(sessions)
    ? sessions.find((s) => s.sessionId === sessionId)
    : sessions[sessionId];

  if (!session) {
    return null;
  }

  if (session.status !== "submitted") {
    return { notSubmitted: true };
  }

  const answers = session.answers || [];
  const totalQuestions = questions.length;

  // Calculate the official results from saved answers.
  const answerMap = new Map(
    answers.map((answer) => [Number(answer.questionId), answer])
  );

  const correct = answers.filter((answer) => answer.isCorrect).length;
  const attempted = answers.length;
  const wrong = attempted - correct;
  const unanswered = Math.max(0, totalQuestions - attempted);

  const scorePercent = totalQuestions
    ? Math.round((correct / totalQuestions) * 100)
    : 0;

  const accuracyPercent = attempted
    ? Math.round((correct / attempted) * 100)
    : 0;

  const completionPercent = totalQuestions
    ? Math.round((attempted / totalQuestions) * 100)
    : 0;

  // Overall duration, in seconds.
  const startTime = Date.parse(session.startedAt);
  const endTime = Date.parse(session.submittedAt);

  const timeTakenSeconds =
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    endTime >= startTime
      ? Math.round((endTime - startTime) / 1000)
      : null;

  const averageTimeSeconds =
    timeTakenSeconds !== null && attempted > 0
      ? Math.round(timeTakenSeconds / attempted)
      : null;

  // Estimate time between consecutive answer submissions.
  const chronologicalAnswers = [...answers].sort(
    (a, b) =>
      Date.parse(a.answeredAt) - Date.parse(b.answeredAt)
  );

  const questionTimings = [];
  let previousTime = startTime;

  for (const answer of chronologicalAnswers) {
    const answerTime = Date.parse(answer.answeredAt);

    if (
      Number.isFinite(previousTime) &&
      Number.isFinite(answerTime) &&
      answerTime >= previousTime
    ) {
      questionTimings.push({
        questionId: Number(answer.questionId),
        timeSpentSeconds: Math.round(
          (answerTime - previousTime) / 1000
        ),
      });
    }

    if (Number.isFinite(answerTime)) {
      previousTime = answerTime;
    }
  }

  const timingMap = new Map(
    questionTimings.map((timing) => [
      timing.questionId,
      timing.timeSpentSeconds,
    ])
  );

  // Build a review entry for every question, including unanswered ones.
  const questionReview = questions.map((question, index) => {
    const answer = answerMap.get(Number(question.id));
    const isAnswered = Boolean(answer);

    const selectedIndex = isAnswered
      ? Number(answer.selectedAnswer)
      : null;

    const correctIndex = Number(question.correctAnswer);

    return {
      questionId: question.id,
      questionNumber: index + 1,
      question: question.question,
      options: question.options || [],

      selectedAnswer: isAnswered
        ? selectedIndex
        : null,

      selectedAnswerText:
        isAnswered &&
        Number.isInteger(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < (question.options || []).length
          ? question.options[selectedIndex]
          : null,

      correctAnswer: correctIndex,

      correctAnswerText:
        Number.isInteger(correctIndex) &&
        correctIndex >= 0 &&
        correctIndex < (question.options || []).length
          ? question.options[correctIndex]
          : null,

      isCorrect: isAnswered
        ? Boolean(answer.isCorrect)
        : null,

      status: !isAnswered
        ? "unanswered"
        : answer.isCorrect
          ? "correct"
          : "wrong",

      answeredAt: answer?.answeredAt || null,
      timeSpentSeconds:
        timingMap.get(Number(question.id)) ?? null,

      // These fields are available if you add them to questions.json.
      topic: question.topic || null,
      explanation: question.explanation || null,
    };
  });

  // Build topic statistics only when questions actually have topics.
  const topicGroups = new Map();

  for (const question of questionReview) {
    if (!question.topic) continue;

    if (!topicGroups.has(question.topic)) {
      topicGroups.set(question.topic, {
        topic: question.topic,
        total: 0,
        attempted: 0,
        correct: 0,
      });
    }

    const group = topicGroups.get(question.topic);
    group.total += 1;

    if (question.status !== "unanswered") {
      group.attempted += 1;
    }

    if (question.isCorrect === true) {
      group.correct += 1;
    }
  }

  const topicBreakdown = [...topicGroups.values()].map((group) => ({
    ...group,
    accuracyPercent: group.attempted
      ? Math.round((group.correct / group.attempted) * 100)
      : 0,
  }));

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    name: session.name,
    status: session.status,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,

    totalQuestions,
    attempted,
    correct,
    wrong,
    unanswered,

    scorePercent,
    accuracyPercent,
    completionPercent,

    timeTakenSeconds,
    totalTimeSeconds: timeTakenSeconds,
    averageTimeSeconds,
    questionTimings,

    questions: questionReview,
    topics: topicBreakdown,
    topicBreakdown,
  };
}


app.get("/", (req, res) => {
  res.json({ message: "Exam backend is running" });
});

// Start a new exam session
app.post("/exam/start", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      message: "userId and name are required",
    });
  }

  const sessions = readSessions();

  const session = {
    sessionId: makeSessionId(),
    userId,
    name,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    status: "in-progress",
    attempted: 0,
    correct: 0,
    wrong: 0,
    answers: [],
  };

  sessions.push(session);
  saveSessions(sessions);

  res.status(201).json({
    message: "Exam session started",
    sessionId: session.sessionId,
  });
});

// Get one question
app.get("/exam/mcq/:id", (req, res) => {
  const questions = readQuestions();
  const id = Number(req.params.id);

  const question = questions.find((item) => item.id === id);

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(questionForStudent(question));
});

// Get all questions without correct answers
app.get("/exam/mcq", (req, res) => {
  const questions = readQuestions();
  res.json(questions.map(questionForStudent));
});

// Submit one answer
app.post("/exam/answer", (req, res) => {
  const { sessionId, questionId, selectedAnswer } = req.body;

  if (!sessionId || questionId === undefined || selectedAnswer === undefined) {
    return res.status(400).json({
      message: "sessionId, questionId and selectedAnswer are required",
    });
  }

  const questions = readQuestions();
  const sessions = readSessions();

  const question = questions.find(
    (item) => item.id === Number(questionId)
  );

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const session = sessions.find(
    (item) => item.sessionId === sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status !== "in-progress") {
    return res.status(400).json({ message: "Exam is already submitted" });
  }

  const alreadyAnswered = session.answers.find(
    (answer) => answer.questionId === Number(questionId)
  );

  if (alreadyAnswered) {
    return res.status(400).json({
      message: "Question already answered",
    });
  }

  const isCorrect = Number(selectedAnswer) === question.correctAnswer;

  session.answers.push({
    questionId: question.id,
    selectedAnswer: Number(selectedAnswer),
    isCorrect,
    answeredAt: new Date().toISOString(),
  });

  session.attempted += 1;

  if (isCorrect) {
    session.correct += 1;
  } else {
    session.wrong += 1;
  }

  saveSessions(sessions);

  res.json({
    message: "Answer saved",
    isCorrect,
    attempted: session.attempted,
    correct: session.correct,
    wrong: session.wrong,
  });
});

// Get current session progress
app.get("/exam/session/:sessionId", (req, res) => {
  const sessions = readSessions();

  const session = sessions.find(
    (item) => item.sessionId === req.params.sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  res.json(session);
});
app.get("/exam/analytics/:sessionId", (req, res) => {
  try {
    const analytics = buildAnalytics(req.params.sessionId);

    if (!analytics) {
      return res.status(404).json({
        message: "Exam session not found",
      });
    }

    if (analytics.notSubmitted) {
      return res.status(400).json({
        message: "Submit the exam before viewing analytics",
      });
    }

    return res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      message: "Failed to load analytics",
    });
  }
});
app.post(
  "/exam/analytics/:sessionId/feedback",
  async (req, res) => {
    try {
      if (!groq) {
        return res.status(503).json({
          message: "Groq API is not configured",
        });
      }

      const analytics = buildAnalytics(req.params.sessionId);

      if (!analytics) {
        return res.status(404).json({
          message: "Exam session not found",
        });
      }

      if (analytics.notSubmitted) {
        return res.status(400).json({
          message: "Submit the exam before requesting feedback",
        });
      }

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content:
              "You are a supportive exam tutor. Analyze the supplied exam statistics and provide concise, practical feedback. Use these headings: Performance Summary, Strengths, Areas to Improve, Next Steps. Never invent subject-specific weaknesses because no question-level topic data is provided. Be encouraging but honest.",
          },
          {
            role: "user",
            content: JSON.stringify(analytics),
          },
        ],
      });

      const feedback =
        completion.choices[0]?.message?.content ||
        "Feedback could not be generated.";

      return res.json({ feedback });
    } catch (error) {
      console.error("Groq feedback error:", error);

      return res.status(500).json({
        message: "Failed to generate feedback",
      });
    }
  }
);

// Submit the whole exam
app.post("/exam/submit", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const sessions = readSessions();

  const session = sessions.find(
    (item) => item.sessionId === sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  session.status = "submitted";
  session.submittedAt = new Date().toISOString();

  saveSessions(sessions);

  res.json({
    message: "Exam submitted successfully",
    result: {
      attempted: session.attempted,
      correct: session.correct,
      wrong: session.wrong,
    },
  });
});

const server = app.listen(PORT, () => {
  console.log(`Exam backend running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use. Backend service is already running.`);
  } else {
    console.error("Backend server error:", err);
  }
});
