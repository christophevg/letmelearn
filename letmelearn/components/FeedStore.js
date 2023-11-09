store.registerModule("feed", {
  state: {
    feed: []
  },
  actions: {
    load_feed: function(context) {
      if(context.state.feed.length < 1) {
        $.ajax({
          type: "GET",
          url: "/api/feed",
          success: function(result) {
            context.commit("new_feed", result);
          },
          dataType: "json"
        });
      }
    },
    add_feed_item: function(context, item) {
      $.ajax({
        type: "POST",
        url: "/api/feed",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(item),
        success: function(new_item) {
          context.commit("new_feed_item", new_item);
        }
      });
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
