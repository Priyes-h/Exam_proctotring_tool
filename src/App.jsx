// src/App.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import {
  startExam,
  getQuestions,
  submitAnswer,
  submitExam,
} from './api/examApi';
import ExamScreen from './components/ExamScreen';
import ResultScreen from './components/ResultScreen';


function App() {
  // Navigation Stage: 'permissions' | 'exam' | 'result'
  const [stage, setStage] = useState('permissions');

  // Candidate Profile
  const candidate = {
    name: 'Vaibhav',
    userId: 'student-101',
  };

  // Permission States
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);

  // Exam Data States
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answeredMap, setAnsweredMap] = useState({});
  const [resultData, setResultData] = useState(null);

  // Loading & Error States
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Capture proctoring frame and send to Electron main
  const saveVideoScreenShots = useCallback(async () => {
    try {
      const stream = mediaStreamRef.current;
      if (!stream) return;

      const track = stream.getVideoTracks()[0];
      if (!track) return;

      if (window.ImageCapture) {
        const imageCapture = new window.ImageCapture(track);
        const blob = await imageCapture.takePhoto();
        const arrayBuffer = await blob.arrayBuffer();

        if (window.athena && typeof window.athena.storeCameraSnapImageOnDisk === 'function') {
          window.athena.storeCameraSnapImageOnDisk(arrayBuffer);
        }
      }
    } catch (error) {
      console.error('Failed to capture proctor snapshot:', error);
    }
  }, []);

  // Setup Electron listeners on mount
  useEffect(() => {
    let removeTimerListener = () => {};
    let removeCameraSnapListener = () => {};

    if (window.athena) {
      if (typeof window.athena.registerListenerForTimerTickFromMain === 'function') {
        removeTimerListener = window.athena.registerListenerForTimerTickFromMain((tick) => {
          setTimer(tick);
        });
      }

      if (typeof window.athena.registerListenerForCameraSnapFromMain === 'function') {
        removeCameraSnapListener = window.athena.registerListenerForCameraSnapFromMain(
          saveVideoScreenShots
        );
      }
    }

    return () => {
      removeTimerListener();
      removeCameraSnapListener();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [saveVideoScreenShots]);

  // Reconnect video stream to videoRef when switching views
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [stage, cameraEnabled]);

  // Request Camera Access
  async function getCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setApiError(null);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Cannot access Camera. Please grant camera permissions.');
    }
  }

  // Request Fullscreen
  async function enableFullScreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFullScreen(true);
    } catch (error) {
      console.error('Fullscreen error:', error);
      // Fallback for browsers / Electron if native fullscreen denied
      setFullScreen(true);
    }
  }

  // Start Exam Flow: Connect to Backend API
  async function handleGoToTest() {
    setIsStartingExam(true);
    setApiError(null);

    try {
      // 1. Start main process timer & proctoring if in Electron
      if (window.athena && typeof window.athena.startTimerOnMain === 'function') {
        try {
          await window.athena.startTimerOnMain();
        } catch (e) {
          console.warn('Electron timer start notice:', e);
        }
      } else {
        // Browser fallback timer
        let seconds = 0;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          seconds += 1;
          setTimer(seconds);
        }, 1000);
      }

      // 2. Call backend POST /exam/start
      const startRes = await startExam(candidate.userId, candidate.name);
      const activeSessionId = startRes.sessionId;
      setSessionId(activeSessionId);

      // 3. Fetch questions from backend GET /exam/mcq
      const fetchedQuestions = await getQuestions();
      setQuestions(fetchedQuestions);
      setAnsweredMap({});

      // 4. Move to exam stage
      setStage('exam');
    } catch (error) {
      console.error('Failed to start test session:', error);
      setApiError(
        `Backend Connection Error: ${error.message || 'Make sure backend is running on http://localhost:3000'}`
      );
    } finally {
      setIsStartingExam(false);
    }
  }

  // Save Single Answer: Connect to backend POST /exam/answer
  async function handleSaveAnswer(questionId, selectedAnswer) {
    setIsSubmittingAnswer(true);
    setApiError(null);

    try {
      const response = await submitAnswer(sessionId, questionId, selectedAnswer);
      setAnsweredMap((prev) => ({
        ...prev,
        [questionId]: {
          selectedAnswer,
          isCorrect: response.isCorrect,
        },
      }));
      return response;
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert(`Error saving answer: ${error.message}`);
      throw error;
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  // Finalize Exam: Connect to backend POST /exam/submit
  async function handleSubmitExam() {
    setIsSubmittingExam(true);
    setApiError(null);

    try {
      const response = await submitExam(sessionId);
      setResultData(response.result);
      setStage('result');
    } catch (error) {
      console.error('Failed to submit exam:', error);
      alert(`Error submitting exam: ${error.message}`);
    } finally {
      setIsSubmittingExam(false);
    }
  }

  // Show Rules Dialog
  function handleShowRules() {
    if (window.athena && typeof window.athena.showRules === 'function') {
      window.athena.showRules();
    } else {
      alert(
        "Athena Exam Rules:\n\n1. Stay on the exam screen.\n2. Camera must remain enabled.\n3. Do not leave the exam.\n4. Do not use external assistance.\n5. Click Submit Exam when finished."
      );
    }
  }

  // Reset to Start
  function handleRestart() {
    setStage('permissions');
    setSessionId('');
    setQuestions([]);
    setAnsweredMap({});
    setResultData(null);
    setTimer(0);
  }

  // RENDER: Exam Screen
  if (stage === 'exam') {
    return (
      <ExamScreen
        candidateName={candidate.name}
        candidateId={candidate.userId}
        questions={questions}
        sessionId={sessionId}
        timerSeconds={timer}
        videoRef={videoRef}
        onSaveAnswer={handleSaveAnswer}
        onSubmitExam={handleSubmitExam}
        answeredMap={answeredMap}
        isSubmittingAnswer={isSubmittingAnswer}
        isSubmittingExam={isSubmittingExam}
        onShowRules={handleShowRules}
      />
    );
  }

  // RENDER: Result Screen
  if (stage === 'result') {
    return (
      <ResultScreen
        candidateName={candidate.name}
        candidateId={candidate.userId}
        sessionId={sessionId}
        totalQuestions={questions.length}
        resultData={resultData}
        timerSeconds={timer}
        onRestart={handleRestart}
      />
    );
  }

  // RENDER: Permissions / Pre-check Screen (Matching image.png)
  return (
    <div className="page-container">
      {/* Header matching design */}
      <div className="header-section">
        <h1>Hi {candidate.name}!</h1>
        <p>Kindly Allow the following Permissions to Start the test:</p>
      </div>

      {apiError && (
        <div className="alert-banner">
          <div className="alert-content">
            <strong>Connection Notice:</strong> {apiError}
          </div>
          <button className="btn-close" onClick={() => setApiError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Main Permissions Card */}
      <div className="card-container">
        {/* Section 1: Configure Heimdall / Camera */}
        <div className="permission-item">
          <div className="icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <div className="permission-content">
            <h3>Configure Heimdall</h3>
            <p>Kindly configure our proctoring app to attempt quiz/contests.</p>
            <div className="action-row">
              <button
                className={`btn ${cameraEnabled ? 'btn-success-solid' : 'btn-black'}`}
                disabled={cameraEnabled}
                onClick={getCameraAccess}
              >
                {cameraEnabled ? '✓ Camera Connected' : 'Connect with Heimdall'}
              </button>

              {/* Video Feed Preview */}
              {cameraEnabled && (
                <div className="camera-preview-wrapper">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="video-preview"
                  />
                  <span className="live-tag">● Live</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Section 2: Fullscreen */}
        <div className="permission-item">
          <div className="icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </div>
          <div className="permission-content">
            <h3>Switch to full screen</h3>
            <p>Kindly close all tabs and switch to full screen</p>
            <button
              className={`btn ${fullScreen ? 'btn-success-solid' : 'btn-secondary'}`}
              disabled={fullScreen}
              onClick={enableFullScreen}
            >
              {fullScreen ? '✓ Full Screen Enabled' : 'Give Full Screen Permissions'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="bottom-actions">
        <button
          className="btn btn-primary"
          disabled={!cameraEnabled || !fullScreen || isStartingExam}
          onClick={handleGoToTest}
        >
          {isStartingExam ? 'Connecting to Backend...' : 'Go To Test'}
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleShowRules}
        >
          Need Help?
        </button>
      </div>
    </div>
  );
}

export default App;