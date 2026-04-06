/**
 * StatsCards Vue component.
 *
 * Displays four statistic cards for gamification:
 * - Streak: consecutive days with 15+ min quiz time
 * - Activity: today's learning minutes
 * - Accuracy: weekly correct percentage
 * - Time: total weekly learning time
 *
 * Features:
 * - Responsive layout (4 columns desktop, 2x2 mobile)
 * - Risk level color coding for streak
 * - Loading skeleton states
 */

Vue.component("StatsCards", {
  template: `
<v-layout row wrap>
  <!-- Streak Card -->
  <v-flex xs6 md3>
    <v-card class="stat-card" :class="streakCardClass">
      <v-card-title primary-title>
        <div class="stat-card-content">
          <div v-if="loading" class="skeleton">
            <div class="skeleton-number"></div>
            <div class="skeleton-label"></div>
          </div>
          <template v-else>
            <div class="stat-icon">🔥</div>
            <div class="stat-value">{{ streakCount }}</div>
            <div class="stat-label">Dagen Reeks</div>
            <div class="stat-sublabel">
              <template v-if="todayMinutes < 15">Nog {{ 15 - todayMinutes }} min</template>
              <template v-else>&nbsp;</template>
            </div>
          </template>
        </div>
      </v-card-title>
    </v-card>
  </v-flex>

  <!-- Activity Card -->
  <v-flex xs6 md3>
    <v-card class="stat-card">
      <v-card-title primary-title>
        <div class="stat-card-content">
          <div v-if="loading" class="skeleton">
            <div class="skeleton-number"></div>
            <div class="skeleton-label"></div>
          </div>
          <template v-else>
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">{{ todayMinutes }}</div>
            <div class="stat-label">Vandaag (min)</div>
            <div class="stat-sublabel">
              <template v-if="todayMinutes >= 15">✓ Doel bereikt!</template>
              <template v-else>&nbsp;</template>
            </div>
          </template>
        </div>
      </v-card-title>
    </v-card>
  </v-flex>

  <!-- Accuracy Card -->
  <v-flex xs6 md3>
    <v-card class="stat-card">
      <v-card-title primary-title>
        <div class="stat-card-content">
          <div v-if="loading" class="skeleton">
            <div class="skeleton-number"></div>
            <div class="skeleton-label"></div>
          </div>
          <template v-else>
            <div class="stat-icon">🎯</div>
            <div class="stat-value">{{ accuracy }}%</div>
            <div class="stat-label">Accuraatheid</div>
            <div class="stat-sublabel">{{ correct }}/{{ attempts }} deze week</div>
          </template>
        </div>
      </v-card-title>
    </v-card>
  </v-flex>

  <!-- Time Card -->
  <v-flex xs6 md3>
    <v-card class="stat-card">
      <v-card-title primary-title>
        <div class="stat-card-content">
          <div v-if="loading" class="skeleton">
            <div class="skeleton-number"></div>
            <div class="skeleton-label"></div>
          </div>
          <template v-else>
            <div class="stat-icon">📊</div>
            <div class="stat-value">{{ timeMinutes }}</div>
            <div class="stat-label">Totaal (min)</div>
            <div class="stat-sublabel">{{ quizzes }} quiz{{ quizzes !== 1 ? 'zes' : '' }}</div>
          </template>
        </div>
      </v-card-title>
    </v-card>
  </v-flex>
</v-layout>
  `,
  computed: {
    loading: function() {
      return store.getters.statsLoading;
    },
    streakCount: function() {
      return store.getters.streakCount;
    },
    todayMinutes: function() {
      return store.getters.todayMinutes;
    },
    streakRisk: function() {
      return store.getters.streakRisk;
    },
    riskLevel: function() {
      return store.getters.riskLevel;
    },
    streakCardClass: function() {
      if (this.loading) return "";
      if (!this.streakRisk) return "streak-safe";
      if (this.riskLevel === "high") return "streak-risk-high";
      if (this.riskLevel === "medium") return "streak-risk-medium";
      return "streak-risk-low";
    },
    accuracy: function() {
      return store.getters.weekly.accuracy || 0;
    },
    correct: function() {
      return store.getters.weekly.correct || 0;
    },
    attempts: function() {
      return store.getters.weekly.attempts || 0;
    },
    timeMinutes: function() {
      return store.getters.weekly.time_minutes || 0;
    },
    quizzes: function() {
      return store.getters.weekly.quizzes || 0;
    }
  }
});