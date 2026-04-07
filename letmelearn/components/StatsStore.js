/**
 * Stats Vuex store module.
 *
 * Manages statistics state for gamification including:
 * - Streak tracking (consecutive days with 15+ min quiz time)
 * - Weekly statistics aggregation
 */

store.registerModule("stats", {
  state: {
    _streak: {
      streak: 0,
      today_minutes: 0,
      streak_risk: true,
      risk_level: "high"
    },
    _weekly: {
      quizzes: 0,
      correct: 0,
      attempts: 0,
      accuracy: 0,
      time_minutes: 0
    },
    _followingStreaks: [],
    _loading: false,
    _error: null
  },
  getters: {
    streak: function(state) {
      return state._streak;
    },
    weekly: function(state) {
      return state._weekly;
    },
    statsLoading: function(state) {
      return state._loading;
    },
    statsError: function(state) {
      return state._error;
    },
    streakRisk: function(state) {
      return state._streak.streak_risk;
    },
    riskLevel: function(state) {
      return state._streak.risk_level;
    },
    todayMinutes: function(state) {
      return state._streak.today_minutes;
    },
    streakCount: function(state) {
      return state._streak.streak;
    },
    followingStreaks: function(state) {
      return state._followingStreaks;
    }
  },
  actions: {
    /**
     * Load all statistics (streak and weekly).
     * Called on page mount to display current stats.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves when stats are loaded
     */
    loadStats: function(context) {
      console.debug("store.actions.loadStats");
      context.commit("statsLoading", true);
      context.commit("statsError", null);

      return Promise.all([
        context.dispatch("loadStreak"),
        context.dispatch("loadWeekly")
      ]).then(function() {
        context.commit("statsLoading", false);
      }).catch(function(error) {
        context.commit("statsLoading", false);
        context.commit("statsError", error.message || "Failed to load stats");
        console.error("store.actions.loadStats error", error);
      });
    },

    /**
     * Load streak statistics.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves with streak data
     */
    loadStreak: function(context) {
      console.debug("store.actions.loadStreak");
      return new Promise(function(resolve, reject) {
        api("GET", "stats/streak", function(response) {
          console.debug("store.actions.loadStreak success", response);
          context.commit("streakLoaded", response);
          resolve(response);
        });
      });
    },

    /**
     * Load weekly statistics.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves with weekly data
     */
    loadWeekly: function(context) {
      console.debug("store.actions.loadWeekly");
      return new Promise(function(resolve, reject) {
        api("GET", "stats/weekly", function(response) {
          console.debug("store.actions.loadWeekly success", response);
          context.commit("weeklyLoaded", response);
          resolve(response);
        });
      });
    },

    /**
     * Refresh stats after completing a quiz/training.
     * Reloads streak and weekly stats to reflect new activity.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves when stats are refreshed
     */
    refreshAfterQuiz: function(context) {
      console.debug("store.actions.refreshAfterQuiz");
      return context.dispatch("loadStats");
    },

    /**
     * Load streak data for followed users.
     *
     * @param {Object} context - Vuex context
     * @returns {Promise} Resolves with following streaks data
     */
    loadFollowingStreaks: function(context) {
      console.debug("store.actions.loadFollowingStreaks");
      return new Promise(function(resolve, reject) {
        api("GET", "stats/following/streaks", function(response) {
          console.debug("store.actions.loadFollowingStreaks success", response);
          context.commit("followingStreaksLoaded", response);
          resolve(response);
        }, {}, function(error) {
          console.error("store.actions.loadFollowingStreaks error", error);
          reject(error);
        });
      });
    }
  },
  mutations: {
    streakLoaded: function(state, payload) {
      state._streak = {
        streak: payload.streak || 0,
        today_minutes: payload.today_minutes || 0,
        streak_risk: payload.streak_risk !== undefined ? payload.streak_risk : true,
        risk_level: payload.risk_level || "high"
      };
      console.debug("store.mutations.streakLoaded", state._streak);
    },
    weeklyLoaded: function(state, payload) {
      state._weekly = {
        quizzes: payload.quizzes || 0,
        correct: payload.correct || 0,
        attempts: payload.attempts || 0,
        accuracy: payload.accuracy || 0,
        time_minutes: payload.time_minutes || 0
      };
      console.debug("store.mutations.weeklyLoaded", state._weekly);
    },
    statsLoading: function(state, loading) {
      state._loading = loading;
    },
    statsError: function(state, error) {
      state._error = error;
    },
    followingStreaksLoaded: function(state, payload) {
      state._followingStreaks = payload || [];
      console.debug("store.mutations.followingStreaksLoaded", state._followingStreaks);
    }
  }
});