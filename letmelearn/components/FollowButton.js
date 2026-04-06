/**
 * FollowButton component.
 *
 * A button to follow/unfollow a user.
 */

Vue.component("FollowButton", {
  props: {
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ""
    },
    picture: {
      type: String,
      default: ""
    },
    small: {
      type: Boolean,
      default: false
    }
  },
  template: `
    <v-btn
      v-if="!isSelf"
      :color="isFollowing ? 'default' : 'primary'"
      :small="small"
      @click="toggleFollow"
      :loading="loading"
      :disabled="loading"
    >
      <v-icon left small>{{ isFollowing ? 'person_remove' : 'person_add' }}</v-icon>
      {{ isFollowing ? 'Unfollow' : 'Follow' }}
    </v-btn>
    <span v-else></span>
  `,
  computed: {
    isFollowing: function() {
      return store.getters.isFollowing(this.email);
    },
    isSelf: function() {
      // Check if this is the current user
      var currentUser = store.getters.feed.length > 0 && store.getters.feed[0].user
        ? store.getters.feed[0].user[0]
        : null;
      return currentUser && currentUser.email === this.email;
    }
  },
  data: function() {
    return {
      loading: false
    };
  },
  methods: {
    toggleFollow: function() {
      var self = this;
      self.loading = true;

      if (self.isFollowing) {
        store.dispatch("unfollowUser", self.email)
          .then(function() {
            self.loading = false;
            self.$emit("unfollowed", self.email);
          })
          .catch(function(error) {
            self.loading = false;
            console.error("Failed to unfollow:", error);
          });
      } else {
        store.dispatch("followUser", self.email)
          .then(function() {
            self.loading = false;
            self.$emit("followed", { email: self.email, name: self.name, picture: self.picture });
          })
          .catch(function(error) {
            self.loading = false;
            console.error("Failed to follow:", error);
          });
      }
    }
  }
});