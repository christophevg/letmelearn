/**
 * RFC 7807 Problem Details error handling.
 * Parses Problem Details JSON responses and provides user-friendly error messages.
 */

/**
 * Parse an RFC 7807 Problem Details response.
 * @param {Object} response - The jQuery AJAX response
 * @returns {Object} Parsed problem details with type, title, status, detail, instance
 */
function parseProblemDetails(response) {
  if (response.responseJSON && response.responseJSON.type) {
    return response.responseJSON;
  }
  // Fallback for non-standard error responses
  return {
    type: "unknown",
    title: "Error",
    status: response.status || 500,
    detail: response.responseJSON ? response.responseJSON.message : response.statusText
  };
}

/**
 * Get a user-friendly error message from Problem Details.
 * @param {Object} problem - Parsed problem details
 * @returns {string} User-friendly error message
 */
function getProblemMessage(problem) {
  // Extract the fragment from type (e.g., "/errors#not-found" -> "not-found")
  var errorId = problem.type ? problem.type.split("#")[1] : null;

  // Map error IDs to Dutch messages
  var messages = {
    "self-follow": "Je kunt jezelf niet volgen.",
    "user-not-found": "Deze gebruiker bestaat niet.",
    "session-not-found": "Deze sessie bestaat niet.",
    "invalid-session": "Ongeldige sessie ID.",
    "duplicate-name": "Deze naam bestaat al. Kies een andere naam.",
    "unauthorized": "Je moet ingelogd zijn om deze actie uit te voeren.",
    "forbidden": "Je hebt geen toegang tot deze actie.",
    "not-found": "Het opgevraagde item bestaat niet.",
    "bad-request": "Ongeldig verzoek. Controleer je invoer.",
    "unprocessable-entity": "Het verzoek kon niet verwerkt worden.",
    "internal-error": "Er is een onverwachte fout opgetreden. Probeer het later opnieuw."
  };

  // Check for mapped message
  if (errorId && messages[errorId]) {
    return messages[errorId];
  }

  // Use detail if available
  if (problem.detail) {
    return problem.detail;
  }

  // Use title
  if (problem.title) {
    return problem.title;
  }

  return "Er is iets misgegaan. Probeer het opnieuw.";
}

/**
 * Handle API errors and dispatch to store.
 * @param {Object} result - jQuery AJAX error result
 */
function handleApiError(result) {
  var problem = parseProblemDetails(result);
  var message = getProblemMessage(problem);

  // Log to console for debugging
  console.error("API Error:", problem.type, problem.status, problem.detail);

  // Dispatch to store
  if (store && store.dispatch) {
    store.dispatch("raise_error", message);
  }

  return problem;
}

/**
 * API wrapper with RFC 7807 error handling.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} endpoint - API endpoint (without /api/ prefix)
 * @param {Function} success - Success callback
 * @param {Object} data - Optional request body
 * @param {Function} error - Optional error callback
 */
function api(method, endpoint, success, data, error) {
  var request = {
    type: method,
    url: "/api/" + endpoint,
    contentType: "application/json",
    dataType: "json",
    success: success,
    error: function(result) {
      var handled = handleApiError(result);
      if (error) {
        error(handled, result);
      }
    }
  };
  if (data) {
    request.data = JSON.stringify(data);
  }
  $.ajax(request);
}