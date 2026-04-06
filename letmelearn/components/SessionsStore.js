/**
 * Sessions Vuex store module.
 *
 * Manages quiz/training session state including:
 * - Current active session tracking
 * - Session lifecycle (start, stop, resume)
 */

store.registerModule("sessions", {
  state: {
    _currentSessionId: null,
    _sessionStartTime: null,
    _sessionKind: null
  },
  getters: {
    currentSessionId: function(state) {
      return state._currentSessionId;
    },
    sessionStartTime: function(state) {
      return state._sessionStartTime;
    },
    sessionKind: function(state) {
      return state._sessionKind;
    },
    hasActiveSession: function(state) {
      return state._currentSessionId !== null;
    }
  },
  actions: {
    /**
     * Start a new session (quiz or training).
     * If an active session exists, it will be auto-stopped by the backend.
     *
     * @param {Object} context - Vuex context
     * @param {Object} payload - { kind: "quiz"|"training", topics: [...] }
     * @returns {Promise} Resolves with session data
     */
    startSession: function(context, payload) {
      console.debug("store.actions.startSession", payload);
      return new Promise(function(resolve, reject) {
        api("POST", "sessions", function(response) {
          console.debug("store.actions.startSession success", response);
          context.commit("sessionStarted", {
            sessionId: response.session_id,
            startTime: response.started_at,
            kind: payload.kind || "quiz"
          });
          resolve(response);
        }, {
          kind: payload.kind || "quiz",
          topics: payload.topics || []
        });
      });
    },

    /**
     * Stop the current session.
     *
     * @param {Object} context - Vuex context
     * @param {Object} payload - { status: "completed"|"abandoned", questions, asked, attempts, correct }
     * @returns {Promise} Resolves with session data
     */
    stopSession: function(context, payload) {
      console.debug("store.actions.stopSession", payload);
      var sessionId = context.getters.currentSessionId;
      if (!sessionId) {
        console.warn("store.actions.stopSession: no active session");
        return Promise.resolve(null);
      }
      return new Promise(function(resolve, reject) {
        api("PATCH", "sessions/" + sessionId, function(response) {
          console.debug("store.actions.stopSession success", response);
          context.commit("sessionStopped");
          resolve(response);
        }, payload || {});
      });
    },

    /**
     * Check for current active session (e.g., on page load).
     * Used to resume tracking after page refresh.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves with current session or null
     */
    checkCurrentSession: function(context) {
      console.debug("store.actions.checkCurrentSession");
      return new Promise(function(resolve, reject) {
        api("GET", "sessions/current", function(response) {
          console.debug("store.actions.checkCurrentSession response", response);
          if (response) {
            context.commit("sessionResumed", {
              sessionId: response._id,
              startTime: response.started_at,
              kind: response.kind
            });
          } else {
            context.commit("sessionStopped");
          }
          resolve(response);
        });
      });
    }
  },
  mutations: {
    sessionStarted: function(state, payload) {
      state._currentSessionId = payload.sessionId;
      state._sessionStartTime = payload.startTime;
      state._sessionKind = payload.kind;
      console.debug("store.mutations.sessionStarted", state._currentSessionId);
    },
    sessionStopped: function(state) {
      state._currentSessionId = null;
      state._sessionStartTime = null;
      state._sessionKind = null;
      console.debug("store.mutations.sessionStopped");
    },
    sessionResumed: function(state, payload) {
      state._currentSessionId = payload.sessionId;
      state._sessionStartTime = payload.startTime;
      state._sessionKind = payload.kind;
      console.debug("store.mutations.sessionResumed", state._currentSessionId);
    }
  }
});