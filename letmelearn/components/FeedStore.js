/**
 * Feed Vuex store module.
 *
 * Manages the activity feed with support for:
 * - "my" mode: current user's activity
 * - "following" mode: activity from followed users
 * - "all" mode: combined activity from both
 * - "dirty" flag: tracks when feed needs refresh
 */

store.registerModule("feed", {
  state: {
    feed: [],
    mode: "my",  // "my", "following", or "all"
    loading: false,
    dirty: false  // True when feed needs refresh
  },
  getters: {
    feed: function(state) {
      return state.feed;
    },
    feedMode: function(state) {
      return state.mode;
    },
    feedLoading: function(state) {
      return state.loading;
    },
    feedDirty: function(state) {
      return state.dirty;
    }
  },
  actions: {
    load_feed: function(context) {
      var mode = context.state.mode;
      console.debug("store.actions.load_feed", { mode: mode });
      context.commit("feedLoading", true);
      api("GET", "feed?mode=" + mode, function(feed) {
        console.debug("store.actions.load_feed success", feed);
        context.commit("new_feed", feed);
        context.commit("feedLoading", false);
        context.commit("feedDirty", false);  // Clear dirty flag after successful load
      });
    },
    setFeedMode: function(context, mode) {
      console.debug("store.actions.setFeedMode", mode);
      context.commit("feedMode", mode);
      return context.dispatch("load_feed");
    },
    /**
     * Mark feed as dirty - call when quiz/training completes or topic is created.
     * Feed will be reloaded on next visit to Ad Valvas page.
     */
    markFeedDirty: function(context) {
      console.debug("store.actions.markFeedDirty");
      context.commit("feedDirty", true);
    },
    /**
     * DEPRECATED: Only for "new topic" events.
     * Quiz/training results are now derived from sessions.
     */
    add_feed_item: function(context, item) {
      if (item.kind !== "new topic") {
        console.warn("add_feed_item is deprecated for session results. Sessions are now the source of truth.");
      }
      api("POST", "feed", function(new_item) {
        context.commit("new_feed_item", new_item);
      }, item);
    }
  },
  mutations: {
    new_feed: function(state, new_feed) {
      Vue.set(state, "feed", new_feed);
    },
    new_feed_item: function(state, item) {
      state.feed.unshift(item);  // Add to beginning
    },
    feedMode: function(state, mode) {
      state.mode = mode;
    },
    feedLoading: function(state, loading) {
      state.loading = loading;
    },
    feedDirty: function(state, dirty) {
      state.dirty = dirty;
    }
  }
});