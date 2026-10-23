const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Start a new exam session
 * @param {string} userId
 * @param {string} name
 * @returns {Promise<{message: string, sessionId: string}>}
 */
export async function startExam(userId = 'student-101', name = 'Vaibhav') {
  const response = await fetch(`${API_BASE_URL}/exam/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, name }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to start exam (${response.status})`);
  }

  return response.json();
}

/**
 * Get all questions (options included, correct answer hidden)
 * @returns {Promise<Array<{id: number, question: string, options: string[]}>>}
 */
export async function getQuestions() {
  const response = await fetch(`${API_BASE_URL}/exam/mcq`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch questions (${response.status})`);
  }

  return response.json();
}

/**
 * Get a single question by ID
 * @param {number|string} id
 * @returns {Promise<{id: number, question: string, options: string[]}>}
 */
export async function getQuestionById(id) {
  const response = await fetch(`${API_BASE_URL}/exam/mcq/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch question ${id} (${response.status})`);
  }

  return response.json();
}

/**
 * Submit an answer for a specific question
 * @param {string} sessionId
 * @param {number} questionId
 * @param {number} selectedAnswer - index 0, 1, 2, 3
 * @returns {Promise<{message: string, isCorrect: boolean, attempted: number, correct: number, wrong: number}>}
 */
export async function submitAnswer(sessionId, questionId, selectedAnswer) {
  const response = await fetch(`${API_BASE_URL}/exam/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      questionId: Number(questionId),
      selectedAnswer: Number(selectedAnswer),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to submit answer (${response.status})`);
  }

  return response.json();
}

/**
 * Get the current session state and answers
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function getSessionProgress(sessionId) {
  const response = await fetch(`${API_BASE_URL}/exam/session/${sessionId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to get session details (${response.status})`);
  }

  return response.json();
}

/**
 * Submit the whole exam
 * @param {string} sessionId
 * @returns {Promise<{message: string, result: {attempted: number, correct: number, wrong: number}}>}
 */
export async function submitExam(sessionId) {
  const response = await fetch(`${API_BASE_URL}/exam/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to submit exam (${response.status})`);
  }

  return response.json();
}
