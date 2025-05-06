store.registerModule("auth", {
  state: {
    session: null
  },
  actions: {
    login: function(context) {
      console.debug("store.actions.login");
      oatk.login();
    },
    logout: function(context) {
      console.debug("store.actions.logout");
      oatk.logout(function() {
        context.dispatch("drop_session");
      });
    },
    setup_session: function(context) {
      console.debug("store.actions.setup_session");
      // setup oatk
      window.oatk.using_provider(store.state.config.oauth.provider);
      window.oatk.using_client_id(store.state.config.oauth.client_id);
      window.oatk.apply_flow("implicit");
      // re-establish session or create it from a token
      var self = this;
      context.dispatch("get_session", function() {
        console.debug("store.actions.setup_session", "get_session returned no session");
        // no session handler
        // if we have a token ... try to re-establish session using the token
        if(oatk.have_authenticated_user()) {
          context.dispatch("create_session");
        } else {
          console.debug("store.actions.setup_session", "no oauth user");
        }
      });
    },
    get_session: function(context, on_error) {
      console.debug("store.actions.get_session");
      $.ajax({
        type: "GET",
        url: "/api/session",
        success: function(result) {
          console.debug("store.actions.get_session", "success");
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
      console.debug("store.actions.create_session");
      oatk.http.postJSON("/api/session", {}, function(result) {
        console.debug("store.actions.create_session", "success");
        context.commit("session", result);
        store.dispatch("load_topics");
        store.dispatch("load_folders");
        store.dispatch("load_feed");
      }, function(result) {
        console.warn("store.actions.create_session", "login using access token produced error:", result);
        oatk.logout();
      });
    },
    drop_session: function(context) {
      console.debug("store.actions.drop_session");
      context.commit("session", null);
      $.ajax({
        type: "DELETE",
        url: "/api/session",
        success: function(result) {
          console.debug("store.actions.drop_session", "success");
        }
      });
    }
  },
  mutations: {
    session: function(state, new_config) {
      console.debug("store.mutations.session", new_config);
      Vue.set(state, "session", new_config);
    },
  }
});

$(document).ready(function() { store.dispatch("setup_session"); });
