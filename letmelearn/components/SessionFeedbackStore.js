/**
 * SessionFeedback Vuex store module.
 *
 * Manages session feedback state including:
 * - Current feedback data
 * - Loading state
 * - Dialog visibility
 *
 * Used by SessionFeedback component to display comprehensive
 * feedback after completing a quiz or training session.
 */

store.registerModule("sessionFeedback", {
  state: {
    _visible: false,
    _loading: false,
    _feedback: null,
    _error: null,
    _sessionId: null
  },
  getters: {
    sessionFeedbackVisible: function(state) {
      return state._visible;
    },
    sessionFeedbackLoading: function(state) {
      return state._loading;
    },
    sessionFeedback: function(state) {
      return state._feedback || {
        session: {
          accuracy: 0,
          avg_time: 0,
          correct: 0,
          asked: 0,
          attempts: 0,
          questions: 0,
          elapsed: 0
        },
        comparisons: {
          accuracy_vs_avg: null,
          speed_vs_avg: null,
          is_personal_best: false
        },
        streak: {
          current: 0,
          today_minutes: 0,
          needs_more_time: true,
          minutes_remaining: 15
        },
        message: ""
      };
    },
    sessionFeedbackError: function(state) {
      return state._error;
    },
    sessionFeedbackId: function(state) {
      return state._sessionId;
    }
  },
  actions: {
    /**
     * Load feedback for a completed session.
     * Called when SessionFeedback component is mounted with sessionId.
     *
     * @param {Object} context - Vuex context
     * @param {string} sessionId - The session ID to load feedback for
     * @returns {Promise} Resolves with feedback data
     */
    loadSessionFeedback: function(context, sessionId) {
      console.debug("store.actions.loadSessionFeedback", sessionId);
      context.commit("sessionFeedbackLoading", true);
      context.commit("sessionFeedbackError", null);

      return new Promise(function(resolve, reject) {
        api("GET", "sessions/" + sessionId + "/feedback", function(response) {
          console.debug("store.actions.loadSessionFeedback success", response);
          context.commit("sessionFeedbackLoaded", response);
          context.commit("sessionFeedbackLoading", false);
          resolve(response);
        }, {}, function(error) {
          console.error("store.actions.loadSessionFeedback error", error);
          context.commit("sessionFeedbackLoading", false);
          context.commit("sessionFeedbackError", error);
          reject(error);
        });
      });
    },

    /**
     * Show the session feedback dialog.
     *
     * @param {Object} context - Vuex context
     * @param {string} sessionId - The session ID to show feedback for
     */
    showSessionFeedback: function(context, sessionId) {
      console.debug("store.actions.showSessionFeedback", sessionId);
      context.commit("sessionFeedbackId", sessionId);
      context.commit("sessionFeedbackVisible", true);
    },

    /**
     * Hide the session feedback dialog and clear state.
     *
     * @param {Object} context - Vuex context
     */
    hideSessionFeedback: function(context) {
      console.debug("store.actions.hideSessionFeedback");
      context.commit("sessionFeedbackVisible", false);
      context.commit("sessionFeedbackId", null);
    }
  },
  mutations: {
    sessionFeedbackVisible: function(state, visible) {
      state._visible = visible;
    },
    sessionFeedbackLoading: function(state, loading) {
      state._loading = loading;
    },
    sessionFeedbackLoaded: function(state, payload) {
      state._feedback = payload;
      console.debug("store.mutations.sessionFeedbackLoaded", state._feedback);
    },
    sessionFeedbackError: function(state, error) {
      state._error = error;
    },
    sessionFeedbackId: function(state, sessionId) {
      state._sessionId = sessionId;
    }
  }
});