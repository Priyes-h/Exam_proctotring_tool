// src/components/ResultScreen.jsx

export default function ResultScreen({
  candidateName = 'Vaibhav',
  candidateId = 'student-101',
  sessionId,
  totalQuestions = 0,
  resultData = { attempted: 0, correct: 0, wrong: 0 },
  timerSeconds = 0,
  onRestart,
   onViewAnalytics,
}) {
  const attempted = resultData?.attempted ?? 0;
  const correct = resultData?.correct ?? 0;
  const wrong = resultData?.wrong ?? 0;

  const scorePercentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const accuracyPercentage = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const formatTimer = (secs) => {
    if (!secs) return '00:00';
    const total = Math.floor(Number(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="result-container">
      <div className="result-card">
        {/* Success Icon */}
        <div className="result-icon-wrapper">
          <div className="success-circle">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#22c55e" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="result-title">Exam Submitted Successfully!</h1>
        <p className="result-subtitle">
          Thank you, <strong>{candidateName}</strong> ({candidateId}). Your responses have been recorded on the server.
        </p>

        {/* Score Highlight Banner */}
        <div className="score-banner">
          <div className="score-banner-main">
            <div className="score-number">{scorePercentage}%</div>
            <div className="score-caption">Overall Score</div>
          </div>
          <div className="score-divider"></div>
          <div className="score-banner-secondary">
            <div className="mini-stat">
              <span className="label">Accuracy</span>
              <span className="value">{accuracyPercentage}%</span>
            </div>
            <div className="mini-stat">
              <span className="label">Time Taken</span>
              <span className="value">{formatTimer(timerSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-icon total">📝</div>
            <div className="metric-info">
              <span className="metric-count">{totalQuestions}</span>
              <span className="metric-name">Total Questions</span>
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-icon attempted">⚡</div>
            <div className="metric-info">
              <span className="metric-count">{attempted}</span>
              <span className="metric-name">Attempted</span>
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-icon correct">✓</div>
            <div className="metric-info">
              <span className="metric-count text-success">{correct}</span>
              <span className="metric-name">Correct</span>
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-icon wrong">✗</div>
            <div className="metric-info">
              <span className="metric-count text-danger">{wrong}</span>
              <span className="metric-name">Incorrect</span>
            </div>
          </div>
        </div>

        {/* Session Meta */}
        <div className="result-meta-box">
          <div className="meta-row">
            <span className="meta-label">Session ID:</span>
            <span className="meta-value monospace">{sessionId || 'N/A'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Submission Status:</span>
            <span className="meta-value tag-verified">Verified & Saved</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="result-actions">
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            Take Another Assessment
          </button>
          <button onClick={onViewAnalytics}>
              View Analytics & Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
