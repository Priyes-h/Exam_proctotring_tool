// src/components/ExamScreen.jsx
import { useState } from 'react';

export default function ExamScreen({
  candidateName = 'Vaibhav',
  candidateId = 'student-101',
  questions = [],
  sessionId,
  timerSeconds,
  videoRef,
  onSaveAnswer,
  onSubmitExam,
  answeredMap = {},
  isSubmittingAnswer = false,
  isSubmittingExam = false,
  onShowRules,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(answeredMap);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLocalRulesModal, setShowLocalRulesModal] = useState(false);

  const currentQuestion = questions[currentIndex] || null;
  const currentQuestionId = currentQuestion ? currentQuestion.id : null;
  const isCurrentAnswered = currentQuestionId ? answeredMap[currentQuestionId] !== undefined : false;
  const currentSelected = currentQuestionId ? selectedAnswers[currentQuestionId] : undefined;

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answeredMap).length;
  const remainingCount = totalQuestions - answeredCount;

  // Format seconds to mm:ss
  const formatTimer = (secs) => {
    if (secs === null || secs === undefined || secs === '') return '00:00';
    const total = Math.floor(Number(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex) => {
    if (isCurrentAnswered) return; // Prevent changing after submission to backend
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: optionIndex,
    }));
  };

  const handleSaveAndNext = async () => {
    if (currentSelected === undefined || isCurrentAnswered) {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      return;
    }

    try {
      await onSaveAnswer(currentQuestionId, currentSelected);
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error('Save answer error:', err);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRulesClick = () => {
    if (onShowRules) {
      onShowRules();
    } else {
      setShowLocalRulesModal(true);
    }
  };

  return (
    <div className="exam-container">
      {/* Top Header Bar */}
      <header className="exam-header">
        <div className="exam-header-left">
          <div className="exam-logo-tag">
            <span className="logo-text">ATHENA</span>
            <span className="exam-badge">LIVE TEST</span>
          </div>
          <div className="candidate-info">
            <span className="candidate-name">{candidateName}</span>
            <span className="candidate-id">({candidateId})</span>
          </div>
        </div>

        <div className="exam-header-center">
          <div className="proctor-status-chip">
            <span className="status-dot pulsing"></span>
            <span className="status-label">Heimdall Monitoring Active</span>
          </div>
        </div>

        <div className="exam-header-right">
          <div className="timer-badge">
            <svg
              className="timer-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="timer-value">{formatTimer(timerSeconds)}</span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleRulesClick}
            title="View Exam Instructions & Rules"
          >
            Rules
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmittingExam}
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Exam Content Layout */}
      <div className="exam-body">
        {/* Left / Center: Question & Options Section */}
        <main className="exam-main-panel">
          {currentQuestion ? (
            <div className="question-card">
              <div className="question-card-header">
                <div className="question-number-pill">
                  Question {currentIndex + 1} of {totalQuestions}
                </div>
                <div className="question-status-tag">
                  {isCurrentAnswered ? (
                    <span className="tag-answered">✓ Answer Saved</span>
                  ) : currentSelected !== undefined ? (
                    <span className="tag-selected">Selected (Unsaved)</span>
                  ) : (
                    <span className="tag-unanswered">Not Answered</span>
                  )}
                </div>
              </div>

              <div className="question-prompt">
                <h2>{currentQuestion.question}</h2>
              </div>

              <div className="options-list">
                {currentQuestion.options.map((optionText, idx) => {
                  const isSelected =
                    (isCurrentAnswered ? answeredMap[currentQuestionId]?.selectedAnswer : currentSelected) === idx;
                  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isCurrentAnswered}
                      className={`option-card ${isSelected ? 'selected' : ''} ${
                        isCurrentAnswered ? 'disabled' : ''
                      }`}
                      onClick={() => handleSelectOption(idx)}
                    >
                      <div className="option-letter">{optionLetters[idx] || idx + 1}</div>
                      <div className="option-text">{optionText}</div>
                      <div className="option-indicator">
                        <div className="radio-circle">{isSelected && <div className="radio-inner" />}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Action Controls */}
              <div className="question-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </button>

                <div className="actions-right">
                  {!isCurrentAnswered && currentSelected !== undefined && (
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() =>
                        setSelectedAnswers((prev) => {
                          const copy = { ...prev };
                          delete copy[currentQuestionId];
                          return copy;
                        })
                      }
                    >
                      Clear Response
                    </button>
                  )}

                  {!isCurrentAnswered ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveAndNext}
                      disabled={currentSelected === undefined || isSubmittingAnswer}
                    >
                      {isSubmittingAnswer ? 'Saving...' : 'Save & Next →'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleNext}
                      disabled={currentIndex === totalQuestions - 1}
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="question-card loading-state">
              <p>Loading question data...</p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Palette & Proctoring Preview */}
        <aside className="exam-sidebar">
          {/* Live Mini Proctoring Video */}
          <div className="proctor-panel">
            <div className="proctor-panel-header">
              <span>Proctoring Feed</span>
              <span className="live-indicator">LIVE</span>
            </div>
            <div className="proctor-video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="proctor-video"
              />
            </div>
          </div>

          {/* Question Palette */}
          <div className="palette-panel">
            <h3 className="palette-title">Question Palette</h3>

            <div className="palette-grid">
              {questions.map((q, idx) => {
                const isAnswered = answeredMap[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                const isTentative = !isAnswered && selectedAnswers[q.id] !== undefined;

                let btnClass = 'palette-btn';
                if (isCurrent) btnClass += ' active';
                if (isAnswered) btnClass += ' answered';
                else if (isTentative) btnClass += ' tentative';
                else btnClass += ' unanswered';

                return (
                  <button
                    key={q.id}
                    type="button"
                    className={btnClass}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend & Stats */}
            <div className="palette-legend">
              <div className="legend-item">
                <span className="legend-dot answered"></span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot unanswered"></span>
                <span>Unattempted ({remainingCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot active"></span>
                <span>Current</span>
              </div>
            </div>

            <div className="palette-footer">
              <div className="session-id-display">
                <small>Session: {sessionId || 'Initializing...'}</small>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Submit Assessment?</h3>
            <p className="modal-subtitle">
              Please review your test status before submitting. Once submitted, answers cannot be edited.
            </p>

            <div className="summary-stats-box">
              <div className="stat-card">
                <span className="stat-num text-primary">{totalQuestions}</span>
                <span className="stat-label">Total Questions</span>
              </div>
              <div className="stat-card">
                <span className="stat-num text-success">{answeredCount}</span>
                <span className="stat-label">Answered</span>
              </div>
              <div className="stat-card">
                <span className="stat-num text-warning">{remainingCount}</span>
                <span className="stat-label">Unanswered</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmittingExam}
              >
                Return to Test
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await onSubmitExam();
                  } catch (err) {
                    console.error('Submit error:', err);
                  }
                }}
                disabled={isSubmittingExam}
              >
                {isSubmittingExam ? 'Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Rules Modal (if not electron native dialog) */}
      {showLocalRulesModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Athena Exam Rules & Instructions</h3>
            <ul className="rules-list">
              <li>1. Stay on the exam screen at all times.</li>
              <li>2. Camera proctoring must remain enabled throughout the assessment.</li>
              <li>3. Periodic webcam snapshots will be captured for verification.</li>
              <li>4. Do not use external assistance or open unauthorized tabs/windows.</li>
              <li>5. Click <strong>Submit Exam</strong> when you have completed all questions.</li>
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowLocalRulesModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
