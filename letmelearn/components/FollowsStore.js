/**
 * Follows Vuex store module.
 *
 * Manages follow relationships for social features.
 */

store.registerModule("follows", {
  state: {
    _following: [],
    _followers: [],
    _loading: false
  },
  getters: {
    following: function(state) {
      return state._following;
    },
    followers: function(state) {
      return state._followers;
    },
    isFollowing: function(state) {
      return function(email) {
        return state._following.some(function(user) {
          return user.email === email;
        });
      };
    },
    followingCount: function(state) {
      return state._following.length;
    },
    followersCount: function(state) {
      return state._followers.length;
    },
    followsLoading: function(state) {
      return state._loading;
    }
  },
  actions: {
    loadFollowing: function(context) {
      console.debug("store.actions.loadFollowing");
      context.commit("followsLoading", true);
      return new Promise(function(resolve) {
        api("GET", "following", function(response) {
          console.debug("store.actions.loadFollowing success", response);
          context.commit("followingLoaded", response);
          context.commit("followsLoading", false);
          resolve(response);
        });
      });
    },
    loadFollowers: function(context) {
      console.debug("store.actions.loadFollowers");
      return new Promise(function(resolve) {
        api("GET", "followers", function(response) {
          console.debug("store.actions.loadFollowers success", response);
          context.commit("followersLoaded", response);
          resolve(response);
        });
      });
    },
    followUser: function(context, email) {
      console.debug("store.actions.followUser", email);
      return new Promise(function(resolve, reject) {
        api("POST", "following/" + encodeURIComponent(email), function(response) {
          console.debug("store.actions.followUser success", response);
          context.commit("userFollowed", response.following);
          resolve(response);
        }, {}, function(error) {
          console.error("store.actions.followUser error", error);
          reject(error);
        });
      });
    },
    unfollowUser: function(context, email) {
      console.debug("store.actions.unfollowUser", email);
      return new Promise(function(resolve, reject) {
        api("DELETE", "following/" + encodeURIComponent(email), function(response) {
          console.debug("store.actions.unfollowUser success", response);
          context.commit("userUnfollowed", email);
          resolve(response);
        }, {}, function(error) {
          console.error("store.actions.unfollowUser error", error);
          reject(error);
        });
      });
    },
    loadAllFollows: function(context) {
      return Promise.all([
        context.dispatch("loadFollowing"),
        context.dispatch("loadFollowers")
      ]);
    }
  },
  mutations: {
    followingLoaded: function(state, users) {
      Vue.set(state, "_following", users);
    },
    followersLoaded: function(state, users) {
      Vue.set(state, "_followers", users);
    },
    userFollowed: function(state, user) {
      // Add to following list if not already there
      var exists = state._following.some(function(u) {
        return u.email === user.email;
      });
      if (!exists) {
        state._following.unshift({
          email: user.email,
          name: user.name,
          picture: user.picture,
          followed_at: new Date().toISOString()
        });
      }
    },
    userUnfollowed: function(state, email) {
      state._following = state._following.filter(function(user) {
        return user.email !== email;
      });
    },
    followsLoading: function(state, loading) {
      state._loading = loading;
    }
  }
});