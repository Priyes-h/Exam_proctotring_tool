
import { useEffect, useMemo, useState } from "react";
import "./AnalyticsFeedback.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "N/A";

  const total = Math.max(0, Math.floor(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

function MetricCard({ label, value, detail, icon, tone }) {
  return (
    <article className={`analytics-metric ${tone || ""}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="analytics-section-heading">
      {eyebrow && <span className="analytics-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function AnalyticsFeedback({ sessionId, onBack }) {
  const [analytics, setAnalytics] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      if (!sessionId) {
        setError("No exam session was provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/exam/analytics/${encodeURIComponent(sessionId)}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load exam analytics.");
        }

        setAnalytics(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load analytics.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => controller.abort();
  }, [sessionId]);

  const total = Number(analytics?.totalQuestions) || 0;
  const attempted = Number(analytics?.attempted) || 0;
  const correct = Number(analytics?.correct) || 0;
  const wrong = Number(analytics?.wrong) || 0;
  const unanswered =
    analytics?.unanswered != null
      ? Number(analytics.unanswered)
      : Math.max(0, total - attempted);

  const score = Number(
    analytics?.scorePercent ??
      (total ? (correct / total) * 100 : 0)
  );

  const accuracy = Number(
    analytics?.accuracyPercent ??
      (attempted ? (correct / attempted) * 100 : 0)
  );

  const completion = Number(
    analytics?.completionPercent ??
      (total ? (attempted / total) * 100 : 0)
  );

  const questions = Array.isArray(analytics?.questions)
    ? analytics.questions
    : [];

  const topics = Array.isArray(analytics?.topicBreakdown)
    ? analytics.topicBreakdown
    : Array.isArray(analytics?.topics)
      ? analytics.topics
      : [];

  const timeTaken =
    analytics?.timeTakenSeconds ?? analytics?.totalTimeSeconds;

  const averageTime =
    analytics?.averageTimeSeconds ??
    (timeTaken != null && attempted > 0
      ? Number(timeTaken) / attempted
      : null);

  const filteredQuestions = useMemo(() => {
    if (questionFilter === "all") return questions;

    return questions.filter((question) => {
      const status = String(
        question.status ||
          (question.isCorrect === true
            ? "correct"
            : question.isCorrect === false
              ? "incorrect"
              : question.selectedAnswer != null
                ? "attempted"
                : "unanswered")
      ).toLowerCase();

      if (questionFilter === "correct") {
        return status === "correct" || question.isCorrect === true;
      }

      if (questionFilter === "incorrect") {
        return (
          status === "incorrect" ||
          status === "wrong" ||
          question.isCorrect === false
        );
      }

      return (
        status === "unanswered" ||
        status === "skipped" ||
        question.selectedAnswer == null
      );
    });
  }, [questions, questionFilter]);

  async function generateFeedback() {
    try {
      setFeedbackLoading(true);
      setFeedbackError("");

      const response = await fetch(
        `${API_BASE}/exam/analytics/${encodeURIComponent(
          sessionId
        )}/feedback`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to generate AI feedback.");
      }

      setFeedback(data.feedback || "The AI did not return any feedback.");
    } catch (err) {
      setFeedbackError(err.message || "Could not generate AI feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  function toggleQuestion(index) {
    setExpandedQuestions((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  }

  if (loading) {
    return (
      <main className="analytics-page analytics-state">
        <div className="analytics-spinner" />
        <h2>Preparing your performance report</h2>
        <p>Loading your exam analytics…</p>
      </main>
    );
  }

  if (error && !analytics) {
    return (
      <main className="analytics-page analytics-state">
        <div className="analytics-state-icon">!</div>
        <h2>Analytics unavailable</h2>
        <p>{error}</p>
        <button className="analytics-button secondary" onClick={onBack}>
          Back to Results
        </button>
      </main>
    );
  }

  const distribution = [
    { label: "Correct", value: correct, color: "correct" },
    { label: "Incorrect", value: wrong, color: "incorrect" },
    { label: "Unanswered", value: unanswered, color: "unanswered" },
  ];

  return (
    <main className="analytics-page">
      <div className="analytics-shell">
        <header className="analytics-header">
          <div className="analytics-brand">
            <div className="analytics-brand-mark">A</div>
            <div>
              <strong>ATHENA</strong>
              <span>STUDENT PERFORMANCE CENTER</span>
            </div>
          </div>

          <button
            type="button"
            className="analytics-button secondary"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span> Back to Results
          </button>
        </header>

        <section className="analytics-hero">
          <div>
            <span className="analytics-eyebrow">YOUR EXAM REPORT</span>
            <h1>Analytics &amp; Feedback</h1>
            <p>
              Understand your performance, review your answers, and discover
              where to focus next.
            </p>
            <div className="analytics-session">
              <span className="status-dot" />
              Exam submitted
              <span className="session-divider">·</span>
              Session: {sessionId || "N/A"}
            </div>
          </div>

          <div
            className="score-ring"
            style={{ "--score-angle": `${Math.min(100, Math.max(0, score)) * 3.6}deg` }}
            role="img"
            aria-label={`Overall score ${Math.round(score)} percent`}
          >
            <div className="score-ring-inner">
              <strong>{Math.round(score)}%</strong>
              <span>OVERALL SCORE</span>
            </div>
          </div>
        </section>

        <section className="analytics-metrics-grid" aria-label="Key metrics">
          <MetricCard
            label="Accuracy"
            value={`${Math.round(accuracy)}%`}
            detail="Correct out of attempted"
            icon="◎"
            tone="tone-blue"
          />
          <MetricCard
            label="Questions attempted"
            value={`${attempted} / ${total}`}
            detail={`${Math.round(completion)}% completion`}
            icon="↗"
            tone="tone-purple"
          />
          <MetricCard
            label="Correct answers"
            value={correct}
            detail="Points earned"
            icon="✓"
            tone="tone-green"
          />
          <MetricCard
            label="Incorrect answers"
            value={wrong}
            detail={`${unanswered} unanswered`}
            icon="×"
            tone="tone-red"
          />
        </section>

        <section className="analytics-panel">
          <SectionHeading
            eyebrow="01 / PERFORMANCE"
            title="Your answer breakdown"
            description="See how your submitted answers are distributed."
          />

          <div className="distribution-layout">
            <div className="distribution-chart">
              <div
                className="distribution-donut"
                style={{
                  "--correct-angle": `${total ? (correct / total) * 360 : 0}deg`,
                  "--wrong-angle": `${total ? (wrong / total) * 360 : 0}deg`,
                }}
                role="img"
                aria-label={`${correct} correct, ${wrong} incorrect, ${unanswered} unanswered`}
              >
                <div className="distribution-donut-center">
                  <strong>{total}</strong>
                  <span>QUESTIONS</span>
                </div>
              </div>
            </div>

            <div className="distribution-details">
              {distribution.map((item) => {
                const percentage = total
                  ? Math.round((item.value / total) * 100)
                  : 0;

                return (
                  <div className="distribution-row" key={item.label}>
                    <div className="distribution-label">
                      <span className={`legend-dot ${item.color}`} />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{percentage}%</small>
                    </div>
                    <div className="analytics-progress-track">
                      <div
                        className={`analytics-progress-fill ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="analytics-two-column">
          <article className="analytics-panel">
            <SectionHeading
              eyebrow="02 / TIME MANAGEMENT"
              title="Time analysis"
              description="Understand how you used your exam time."
            />

            <div className="time-stat">
              <span className="time-stat-icon">◷</span>
              <div>
                <span>Total time taken</span>
                <strong>{formatDuration(timeTaken)}</strong>
              </div>
            </div>

            <div className="time-stat">
              <span className="time-stat-icon">⌁</span>
              <div>
                <span>Average per attempted question</span>
                <strong>{formatDuration(averageTime)}</strong>
              </div>
            </div>

            {Array.isArray(analytics?.questionTimings) &&
            analytics.questionTimings.length > 0 ? (
              <div className="timing-list">
                <h3>Question timing</h3>
                {analytics.questionTimings.map((item, index) => (
                  <div className="timing-row" key={item.questionId ?? index}>
                    <span>Question {item.questionNumber ?? index + 1}</span>
                    <strong>{formatDuration(item.timeSpentSeconds)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="analytics-note">
                Per-question timing will appear when Athena records individual
                question durations. No timing data is invented.
              </p>
            )}
          </article>

          <article className="analytics-panel">
            <SectionHeading
              eyebrow="03 / TOPIC MASTERY"
              title="Topic-wise performance"
              description="Identify topics to revise and concepts you understand well."
            />

            {topics.length > 0 ? (
              <div className="topic-list">
                {topics.map((topic, index) => {
                  const topicName = topic.topic || topic.name || `Topic ${index + 1}`;
                  const topicScore = Number(
                    topic.accuracyPercent ??
                      (Number(topic.total) > 0
                        ? (Number(topic.correct || 0) / Number(topic.total)) * 100
                        : 0)
                  );

                  return (
                    <div className="topic-row" key={topicName}>
                      <div className="topic-row-header">
                        <span>{topicName}</span>
                        <strong>{Math.round(topicScore)}%</strong>
                      </div>
                      <div className="analytics-progress-track">
                        <div
                          className={`analytics-progress-fill ${
                            topicScore >= 70 ? "correct" : "topic-needs-work"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, topicScore))}%`,
                          }}
                        />
                      </div>
                      <small>
                        {topic.correct ?? 0} correct
                        {topic.total != null ? ` out of ${topic.total}` : ""}
                      </small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="analytics-empty">
                <span className="analytics-empty-icon">⌘</span>
                <strong>Topic insights are not available yet</strong>
                <p>
                  Add a topic or category to each question and group the
                  submitted answers by topic to unlock this analysis.
                </p>
              </div>
            )}
          </article>
        </section>

        <section className="analytics-panel">
          <SectionHeading
            eyebrow="04 / DETAILED REVIEW"
            title="Question-by-question review"
            description="Inspect your answers and learn from mistakes."
          />

          {questions.length > 0 ? (
            <>
              <div className="question-filters" aria-label="Filter questions">
                {[
                  ["all", "All questions"],
                  ["correct", "Correct"],
                  ["incorrect", "Incorrect"],
                  ["unanswered", "Unanswered"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`filter-chip ${
                      questionFilter === value ? "active" : ""
                    }`}
                    onClick={() => setQuestionFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="question-review-list">
                {filteredQuestions.map((question, index) => {
                  const id = question.questionId ?? question.id ?? index;
                  const isCorrect =
                    question.isCorrect === true ||
                    String(question.status).toLowerCase() === "correct";
                  const unansweredQuestion =
                    question.selectedAnswer == null ||
                    String(question.status).toLowerCase() === "unanswered";
                  const expanded = Boolean(expandedQuestions[id]);

                  return (
                    <article className="question-review" key={id}>
                      <button
                        type="button"
                        className="question-review-toggle"
                        onClick={() => toggleQuestion(id)}
                        aria-expanded={expanded}
                      >
                        <div className="question-review-number">
                          {question.questionNumber ?? index + 1}
                        </div>
                        <div className="question-review-summary">
                          <strong>
                            {question.question ||
                              question.text ||
                              `Question ${question.questionNumber ?? index + 1}`}
                          </strong>
                          <span>
                            {unansweredQuestion
                              ? "Not answered"
                              : isCorrect
                                ? "Correct answer"
                                : "Incorrect answer"}
                          </span>
                        </div>
                        <span
                          className={`question-status ${
                            unansweredQuestion
                              ? "status-unanswered"
                              : isCorrect
                                ? "status-correct"
                                : "status-incorrect"
                          }`}
                        >
                          {unansweredQuestion
                            ? "Skipped"
                            : isCorrect
                              ? "Correct"
                              : "Incorrect"}
                        </span>
                        <span className="question-chevron">
                          {expanded ? "−" : "+"}
                        </span>
                      </button>

                      {expanded && (
                        <div className="question-review-details">
                          <p>
                            <strong>Your answer:</strong>{" "}
                            {question.selectedAnswer ?? "Not answered"}
                          </p>
                          {question.correctAnswer != null && (
                            <p>
                              <strong>Correct answer:</strong>{" "}
                              {question.correctAnswer}
                            </p>
                          )}
                          {question.explanation && (
                            <p>
                              <strong>Explanation:</strong>{" "}
                              {question.explanation}
                            </p>
                          )}
                          {question.topic && (
                            <p>
                              <strong>Topic:</strong> {question.topic}
                            </p>
                          )}
                          {question.timeSpentSeconds != null && (
                            <p>
                              <strong>Time spent:</strong>{" "}
                              {formatDuration(question.timeSpentSeconds)}
                            </p>
                          )}
                          {!question.explanation &&
                            question.correctAnswer == null && (
                              <p className="analytics-note">
                                Answer explanations will appear when the
                                backend includes the correct answer and
                                explanation for this question.
                              </p>
                            )}
                        </div>
                      )}
                    </article>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <p className="analytics-note">
                    No questions match this filter.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="analytics-empty">
              <span className="analytics-empty-icon">☷</span>
              <strong>Detailed answer review is not available yet</strong>
              <p>
                The analytics endpoint currently returns summary statistics.
                Include a questions array with each question, selected answer,
                correctness, and optional explanation to enable this section.
              </p>
            </div>
          )}
        </section>

        <section className="analytics-ai-panel">
          <div className="analytics-ai-heading">
            <div className="analytics-ai-icon">✦</div>
            <div>
              <span className="analytics-eyebrow">05 / YOUR PERSONAL AI TUTOR</span>
              <h2>AI Performance Feedback</h2>
              <p>
                Get practical next steps based on your exam performance.
              </p>
            </div>
          </div>

          {!feedback && !feedbackLoading && (
            <div className="analytics-ai-prompt">
              <div>
                <strong>Ready to improve?</strong>
                <p>
                  Ask Athena AI to summarize your performance and recommend
                  focused revision steps.
                </p>
              </div>
              <button
                type="button"
                className="analytics-button primary"
                onClick={generateFeedback}
              >
                ✦ Generate My Feedback
              </button>
            </div>
          )}

          {feedbackLoading && (
            <div className="analytics-ai-loading">
              <div className="analytics-spinner" />
              <div>
                <strong>Analyzing your performance…</strong>
                <p>Generating your personalized feedback.</p>
              </div>
            </div>
          )}

          {feedbackError && (
            <div className="analytics-alert" role="alert">
              <p>{feedbackError}</p>
              <button
                type="button"
                className="analytics-button secondary"
                onClick={generateFeedback}
                disabled={feedbackLoading}
              >
                Try Again
              </button>
            </div>
          )}

          {feedback && (
            <div className="analytics-ai-result">
              <div className="analytics-ai-result-header">
                <strong>Your personalized study guidance</strong>
                <button
                  type="button"
                  className="analytics-button secondary"
                  onClick={generateFeedback}
                  disabled={feedbackLoading}
                >
                  Regenerate
                </button>
              </div>
              <div className="analytics-ai-text">{feedback}</div>
            </div>
          )}

          <p className="analytics-disclaimer">
            AI suggestions are for learning support. Your official exam result
            is calculated by Athena, not by AI.
          </p>
        </section>

        <footer className="analytics-footer">
          <span>ATHENA · STUDENT PERFORMANCE CENTER</span>
          <button type="button" onClick={onBack}>
            Return to exam results ↑
          </button>
        </footer>
      </div>
    </main>
  );
}
