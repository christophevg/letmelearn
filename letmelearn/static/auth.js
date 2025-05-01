store.registerModule("auth", {
  state: {
    session: null
  },
  actions: {
    login: function(context) {
      oatk.login();
    },
    logout: function(context) {
      oatk.logout(function() {
        context.dispatch("drop_session");
      });
    },
    setup_session: function(context) {
      // setup oatk
      window.oatk.using_provider(store.state.config.oauth.provider);
      window.oatk.using_client_id(store.state.config.oauth.client_id);
      window.oatk.apply_flow("implicit");
      // re-establish session or create it from a token
      var self = this;
      context.dispatch("get_session", function() {
        // no session handler
        // if we have a token ... try to re-establish session using the token
        if(oatk.have_authenticated_user()) {
          context.dispatch("create_session");
        }
      });
    },
    get_session: function(context, on_error) {
      $.ajax({
        type: "GET",
        url: "/api/session",
        success: function(result) {
          context.commit("session", result);
          store.dispatch("load_topics");
          store.dispatch("load_folders");
          store.dispatch("load_feed");
        },
        error: on_error,
        dataType: "json"
      });
    },
    create_session: function(context) {
      oatk.http.postJSON("/api/session", {}, function(result) {
        context.commit("session", result);
        store.dispatch("load_topics");
        store.dispatch("load_folders");
        store.dispatch("load_feed");
      }, function(result) {
        console.warn("login using access token produced error:", result);
        oatk.logout();
      });
    },
    drop_session: function(context) {
      context.commit("session", null);
      $.ajax({
        type: "DELETE",
        url: "/api/session",
        success: function(result) {
        }
      });
    }
  },
  mutations: {
    session: function(state, new_config) {
      Vue.set(state, "session", new_config);
    },
  }
});

store.dispatch("setup_session");
