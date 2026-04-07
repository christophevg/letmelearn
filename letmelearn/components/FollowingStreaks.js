/**
 * FollowingStreaks component.
 *
 * Displays streaks of followed users, sorted by streak descending.
 * Shows today's practice time for each user.
 */

Vue.component("FollowingStreaks", {
  template: `
    <v-card>
      <v-card-title>
        <v-icon left>whatshot</v-icon>
        <span>Following Streaks</span>
      </v-card-title>
      <v-card-text>
        <div v-if="loading" class="text-xs-center pa-3">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <v-list v-else-if="streaks.length > 0" two-line>
          <template v-for="(user, index) in streaks">
            <v-list-tile :key="user.email" avatar>
              <v-list-tile-avatar>
                <img :src="user.picture || '/app/static/images/default-avatar.png'">
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title>
                  {{ user.name || user.email }}
                  <v-chip v-if="user.streak > 0" small :color="streakColor(user.streak)" text-color="white">
                    <v-icon left small>local_fire_department</v-icon>
                    {{ user.streak }}
                  </v-chip>
                </v-list-tile-title>
                <v-list-tile-sub-title>
                  <v-icon small>schedule</v-icon>
                  {{ user.today_minutes }} min today
                </v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
            <v-divider v-if="index < streaks.length - 1" :key="'divider-' + user.email"></v-divider>
          </template>
        </v-list>

        <v-alert
          v-else
          type="info"
          :value="true"
          outline
        >
          You're not following anyone yet. Use the search to find users!
        </v-alert>
      </v-card-text>
    </v-card>
  `,
  data: function() {
    return {
      loading: false
    };
  },
  computed: {
    streaks: function() {
      return store.getters.followingStreaks || [];
    }
  },
  methods: {
    streakColor: function(streak) {
      if (streak >= 7) return "orange darken-2";
      if (streak >= 3) return "orange";
      return "grey";
    }
  },
  mounted: function() {
    var self = this;
    self.loading = true;
    store.dispatch("loadFollowingStreaks")
      .then(function() {
        self.loading = false;
      })
      .catch(function(error) {
        self.loading = false;
        console.error("FollowingStreaks load error:", error);
      });
  }
});