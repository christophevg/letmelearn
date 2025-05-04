store.registerModule("feed", {
  state: {
    feed: []
  },
  getters: {
    feed: function(state) {
      return [...state.feed].sort(function(a, b) {
        return a.when < b.when;
      });
    }
  },
  actions: {
    load_feed: function(context) {
      if(context.state.feed.length < 1) {
        api( "GET", "feed", function(result) {
          context.commit("new_feed", result);
        });
      }
    },
    add_feed_item: function(context, item) {
      api( "POST", "feed", function(new_item) {
        context.commit("new_feed_item", new_item);
      }, item);
    },
  },
  mutations: {
    new_feed : function(state, new_feed) {
      Vue.set(state, "feed", new_feed);
    },
    new_feed_item : function(state, item) {
      state.feed.push(item);
    }
  }
});
