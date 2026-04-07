/**
 * UserSearch component.
 *
 * Search for users by email and follow/unfollow them.
 */

Vue.component("UserSearch", {
  template: `
    <v-card>
      <v-card-title>
        <v-icon left>search</v-icon>
        <span>Find Users</span>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="searchQuery"
          label="Search by email"
          prepend-icon="email"
          clearable
          :loading="loading"
          @input="debouncedSearch"
          hint="Type at least 2 characters to search"
        />

        <v-list v-if="results.length > 0" two-line>
          <template v-for="(user, index) in results">
            <v-list-tile :key="user.email" avatar>
              <v-list-tile-avatar>
                <img :src="user.picture || '/app/static/images/default-avatar.png'">
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title>{{ user.name || user.email }}</v-list-tile-title>
                <v-list-tile-sub-title>{{ user.email }}</v-list-tile-sub-title>
              </v-list-tile-content>

              <v-list-tile-action>
                <FollowButton
                  :email="user.email"
                  :name="user.name"
                  :picture="user.picture"
                  small
                  @followed="onFollowed"
                  @unfollowed="onUnfollowed"
                />
              </v-list-tile-action>
            </v-list-tile>
            <v-divider v-if="index < results.length - 1" :key="'divider-' + user.email"></v-divider>
          </template>
        </v-list>

        <v-alert
          v-else-if="searchQuery && searchQuery.length >= 2 && !loading"
          type="info"
          :value="true"
          outline
        >
          No users found matching "{{ searchQuery }}"
        </v-alert>
      </v-card-text>
    </v-card>
  `,
  data: function() {
    return {
      searchQuery: "",
      results: [],
      loading: false,
      debounceTimer: null
    };
  },
  methods: {
    debouncedSearch: function() {
      var self = this;

      // Clear previous timer
      if (self.debounceTimer) {
        clearTimeout(self.debounceTimer);
      }

      // Set new timer
      self.debounceTimer = setTimeout(function() {
        self.performSearch();
      }, 300);
    },
    performSearch: function() {
      var self = this;

      if (!self.searchQuery || self.searchQuery.length < 2) {
        self.results = [];
        return;
      }

      self.loading = true;
      self.results = [];

      store.dispatch("searchUsers", self.searchQuery)
        .then(function(users) {
          self.loading = false;
          self.results = users;
        })
        .catch(function(error) {
          self.loading = false;
          console.error("UserSearch search error:", error);
        });
    },
    onFollowed: function(data) {
      this.$emit("followed", data);
    },
    onUnfollowed: function(email) {
      this.$emit("unfollowed", email);
    }
  }
});