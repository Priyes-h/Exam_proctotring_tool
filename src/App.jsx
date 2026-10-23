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
import AnalyticsFeedback from './components/AnalyticsFeedback';


function App() {
  // Navigation Stage: 'permissions' | 'exam' | 'result' | 'analytics'
  const [stage, setStage] = useState('permissions');

  // Candidate Profile
  // Candidate details are entered on the pre-check screen; userId stores the roll number.
  const [candidate, setCandidate] = useState({ name: '', userId: '' });

  // Permission States
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
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
  const screenStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
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
// Attach the screen stream after React renders the preview video.
useEffect(() => {
  const video = screenVideoRef.current;
  const stream = screenStreamRef.current;

  if (!video || !stream) return;

  video.srcObject = stream;

  video.play().catch((error) => {
    console.error("Could not play screen preview:", error);
  });

  return () => {
    video.srcObject = null;
  };
}, [screenSharing]);
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

  // Ask the student to choose a screen or window and show its preview locally.
  async function startScreenShare() {
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error(
        "Screen sharing is not supported in this environment."
      );
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const [screenTrack] = stream.getVideoTracks();

    screenStreamRef.current = stream;

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
    }

    setScreenSharing(true);

    screenTrack?.addEventListener(
      "ended",
      () => {
        screenStreamRef.current = null;
        setScreenSharing(false);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
      },
      { once: true }
    );
  } catch (error) {
    console.error("Screen sharing failed:", {
      name: error.name,
      message: error.message,
    });

    if (error.name === "NotAllowedError") {
      alert(
        "Screen sharing was cancelled or denied. Please allow sharing and try again."
      );
    } else {
      alert(`Screen sharing failed: ${error.message}`);
    }
  }
}

  // Stop every screen-capture track when the assessment is finished or restarted.
  function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
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
      stopScreenShare();
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
    stopScreenShare();
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
        onViewAnalytics={() => setStage("analytics")}
      />
    );
  }
  
  if (stage === "analytics") {
    return (
      <AnalyticsFeedback
        sessionId={sessionId}
        onBack={() => setStage("result")}
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
        {/* Candidate details are associated with the backend exam session. */}
        <div className="permission-item candidate-details">
          <div className="permission-content">
            <h3>Candidate details</h3>
            <label htmlFor="candidate-name">Name</label>
            <input
              id="candidate-name"
              className="candidate-input"
              type="text"
              autoComplete="name"
              value={candidate.name}
              onChange={(event) => setCandidate((current) => ({ ...current, name: event.target.value }))}
              placeholder="Enter your name"
            />
            <label htmlFor="candidate-roll-number">Roll number</label>
            <input
              id="candidate-roll-number"
              className="candidate-input"
              type="text"
              value={candidate.userId}
              onChange={(event) => setCandidate((current) => ({ ...current, userId: event.target.value }))}
              placeholder="Enter your roll number"
            />
          </div>
        </div>

        <div className="divider"></div>
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

        <div className="divider"></div>

        {/* Screen capture is requested by an explicit student click. */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Share your screen</h3>
            <p>Choose the screen or window to share for this assessment.</p>
            <button
              type="button"
              className={`btn ${screenSharing ? 'btn-success-solid' : 'btn-secondary'}`}
              disabled={screenSharing}
              onClick={startScreenShare}
            >
              {screenSharing ? '✓ Screen Sharing' : 'Share Screen'}
            </button>
            {screenSharing && (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="screen-preview"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="bottom-actions">
        <button
          className="btn btn-primary"
          disabled={!candidate.name.trim() || !candidate.userId.trim() || !cameraEnabled || !fullScreen || !screenSharing || isStartingExam}
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
