/**
 * SessionFeedback Vue component.
 *
 * Displays comprehensive feedback after completing a quiz/training session:
 * - Big Win header with dynamic motivational message
 * - Primary Stats Grid with circular progress indicators (Accuracy, Speed, Completion)
 * - Improvement Zone with trend arrows
 * - Streak Anchor with progress bar
 * - Session Details with questions, asked, attempts, time
 *
 * Props:
 * - sessionId: The ID of the completed session
 * - kind: "quiz" or "training"
 */

Vue.component("SessionFeedback", {
  props: {
    sessionId: { type: String, required: true },
    kind: { type: String, default: "quiz" }
  },
  template: `
<v-card class="session-feedback-card" v-if="!loading">

  <!-- Big Win Header -->
  <v-card-title class="primary white--text justify-center py-2">
    <div class="feedback-header text-center">
      <div class="feedback-emoji">{{ headerEmoji }}</div>
      <h2 class="feedback-title">{{ headline }}</h2>
      <p class="feedback-message mt-1 mb-0">{{ feedback.message }}</p>
    </div>
  </v-card-title>

  <v-card-text class="pt-2 pb-2">

    <!-- Primary Stats Grid -->
    <v-layout row wrap justify-center class="stats-grid">

      <!-- Accuracy Circle -->
      <v-flex xs4 class="text-center pa-1">
        <div class="stat-circle-wrapper">
          <v-progress-circular
            :size="100"
            :width="8"
            :value="accuracyValue"
            :color="accuracyColor"
          >
            <span class="stat-number">{{ accuracyValue }}</span>
          </v-progress-circular>
        </div>
        <div class="stat-label mt-1">Accuracy</div>
        <div class="stat-detail">{{ feedback.session.correct }}/{{ feedback.session.attempts }}</div>
      </v-flex>

      <!-- Speed Circle -->
      <v-flex xs4 class="text-center pa-1">
        <div class="stat-circle-wrapper">
          <v-progress-circular
            :size="100"
            :width="8"
            :value="speedValue"
            :color="speedColor"
          >
            <span class="stat-number">{{ speedDisplay }}</span>
          </v-progress-circular>
        </div>
        <div class="stat-label mt-1">Speed</div>
        <div class="stat-detail">{{ speedLabel }}</div>
      </v-flex>

      <!-- Completion Circle -->
      <v-flex xs4 class="text-center pa-1">
        <div class="stat-circle-wrapper">
          <v-progress-circular
            :size="100"
            :width="8"
            :value="completionValue"
            :color="completionColor"
          >
            <span class="stat-number">{{ completionValue }}</span>
          </v-progress-circular>
        </div>
        <div class="stat-label mt-1">Completion</div>
        <div class="stat-detail">{{ feedback.session.asked }}/{{ feedback.session.questions }}</div>
      </v-flex>
    </v-layout>

    <!-- Improvement Zone -->
    <v-card flat class="improvement-zone mt-2" v-if="hasComparisons">
      <v-card-title class="pb-0 pt-1">
        <v-icon left small>trending_up</v-icon>
        <span class="subheading">Progress vs Your Average</span>
      </v-card-title>
      <v-card-text class="py-1">
        <v-layout row wrap justify-center>
          <v-flex xs6 class="text-center">
            <div class="trend-item">
              <v-icon :color="accuracyTrendColor" large>{{ accuracyTrendIcon }}</v-icon>
              <div class="trend-value" :class="accuracyTrendClass">
                {{ accuracyTrendText }}
              </div>
              <div class="trend-label">Accuracy</div>
              <div class="trend-avg" v-if="feedback.comparisons.weekly_avg_accuracy !== null">
                avg: {{ feedback.comparisons.weekly_avg_accuracy }}%
              </div>
            </div>
          </v-flex>
          <v-flex xs6 class="text-center" v-if="hasSpeedComparison">
            <div class="trend-item">
              <v-icon :color="speedTrendColor" large>{{ speedTrendIcon }}</v-icon>
              <div class="trend-value" :class="speedTrendClass">
                {{ speedTrendText }}
              </div>
              <div class="trend-label">Speed</div>
              <div class="trend-avg" v-if="feedback.comparisons.weekly_avg_speed !== null">
                avg: {{ feedback.comparisons.weekly_avg_speed }}s
              </div>
            </div>
          </v-flex>
        </v-layout>

        <!-- Personal Best Badge -->
        <div v-if="feedback.comparisons.is_personal_best" class="personal-best">
          <span class="personal-best-icon">🏆</span>
          <span class="personal-best-text">Personal Best!</span>
        </div>

        <!-- First Session Message -->
        <div v-if="!hasComparisons && !feedback.comparisons.is_personal_best"
             class="text-center mt-1 grey--text">
          <v-icon small class="mr-1">info</v-icon>
          Baseline established! Keep practicing to see your progress.
        </div>
      </v-card-text>
    </v-card>

    <!-- Streak Anchor -->
    <v-card flat class="streak-anchor mt-2"
            :class="streakCardClass">
      <v-card-title class="pb-0 pt-1">
        <v-icon left>local_fire_department</v-icon>
        <span class="subheading">Daily Streak</span>
        <v-spacer/>
        <span class="streak-count">{{ feedback.streak.current }}</span>
      </v-card-title>
      <v-card-text class="py-1">
        <v-progress-linear
          :value="streakProgress"
          :color="streakProgressColor"
          height="8"
        />
        <div class="streak-message mt-1">
          <template v-if="feedback.streak.needs_more_time">
            <v-icon small>schedule</v-icon>
            {{ feedback.streak.minutes_remaining }} more minutes to save your streak!
          </template>
          <template v-else>
            <v-icon small color="green">check_circle</v-icon>
            Streak preserved! See you tomorrow!
          </template>
        </div>
      </v-card-text>
    </v-card>

    <!-- Session Details -->
    <v-card flat class="session-details mt-2">
      <v-card-text class="py-2">
        <v-layout row wrap>
          <v-flex xs6 class="text-center">
            <div class="detail-label">Questions</div>
            <div class="detail-value">{{ feedback.session.questions || '-' }}</div>
          </v-flex>
          <v-flex xs6 class="text-center">
            <div class="detail-label">Asked</div>
            <div class="detail-value">{{ feedback.session.asked || feedback.session.attempts }}</div>
          </v-flex>
          <v-flex xs6 class="text-center mt-1">
            <div class="detail-label">Attempts</div>
            <div class="detail-value">{{ feedback.session.attempts }}</div>
          </v-flex>
          <v-flex xs6 class="text-center mt-1">
            <div class="detail-label">Time</div>
            <div class="detail-value">{{ formatTime(feedback.session.elapsed) }}</div>
          </v-flex>
        </v-layout>
      </v-card-text>
    </v-card>

  </v-card-text>

</v-card>

<!-- Loading State -->
<v-card v-else class="session-feedback-card">
  <v-card-text class="text-center pa-4">
    <v-progress-circular indeterminate color="primary" size="48"/>
    <div class="mt-2">Loading your results...</div>
  </v-card-text>
</v-card>
  `,
  computed: {
    loading: function() {
      return store.getters.sessionFeedbackLoading;
    },
    feedback: function() {
      return store.getters.sessionFeedback;
    },
    kindLabel: function() {
      return this.kind === "training" ? "Training" : "Quiz";
    },
    // Header computed properties
    headerEmoji: function() {
      if (this.feedback.comparisons && this.feedback.comparisons.is_personal_best) {
        return "🏆";
      }
      if (this.accuracyValue >= 90) return "🎉";
      if (this.accuracyValue >= 70) return "👏";
      return "💪";
    },
    headline: function() {
      if (this.feedback.comparisons && this.feedback.comparisons.is_personal_best) {
        return "Personal Best!";
      }
      if (this.accuracyValue >= 90) return "Amazing Session!";
      if (this.accuracyValue >= 70) return "Great Session!";
      return "Keep Practicing!";
    },
    // Stats computed properties
    accuracyValue: function() {
      return Math.round(this.feedback.session.accuracy || 0);
    },
    accuracyColor: function() {
      if (this.accuracyValue >= 80) return "green";
      if (this.accuracyValue >= 60) return "orange";
      return "red";
    },
    speedValue: function() {
      var avgTime = this.feedback.session.avg_time || 0;
      // Normalize to 0-100 (faster = higher)
      // Assume 60s per question is slow (0%), 5s is fast (100%)
      var normalized = Math.max(0, Math.min(100, (60 - avgTime) / 55 * 100));
      return Math.round(normalized);
    },
    speedDisplay: function() {
      return Math.round(this.feedback.session.avg_time || 0) + "s";
    },
    speedLabel: function() {
      return "avg per question";
    },
    speedColor: function() {
      var avgTime = this.feedback.session.avg_time || 30;
      if (avgTime < 10) return "green";
      if (avgTime < 20) return "orange";
      return "red";
    },
    // Completion: percentage of questions asked vs total available
    completionValue: function() {
      var questions = this.feedback.session.questions || 1;
      var asked = this.feedback.session.asked || 0;
      return Math.round(asked / questions * 100);
    },
    completionColor: function() {
      if (this.completionValue >= 90) return "green";
      if (this.completionValue >= 70) return "orange";
      return "red";
    },
    // Comparison computed properties
    hasComparisons: function() {
      return this.feedback.comparisons &&
             (this.feedback.comparisons.accuracy_vs_avg !== null ||
              this.feedback.comparisons.speed_vs_avg !== null);
    },
    hasSpeedComparison: function() {
      return this.feedback.comparisons &&
             this.feedback.comparisons.speed_vs_avg !== null;
    },
    accuracyTrendIcon: function() {
      var delta = this.feedback.comparisons.accuracy_vs_avg || 0;
      if (delta > 0) return "trending_up";
      if (delta < 0) return "trending_down";
      return "trending_flat";
    },
    accuracyTrendColor: function() {
      var delta = this.feedback.comparisons.accuracy_vs_avg || 0;
      if (delta > 0) return "green";
      if (delta < 0) return "red";
      return "grey";
    },
    accuracyTrendClass: function() {
      var delta = this.feedback.comparisons.accuracy_vs_avg || 0;
      if (delta > 0) return "trend-positive";
      if (delta < 0) return "trend-negative";
      return "trend-neutral";
    },
    accuracyTrendText: function() {
      var delta = this.feedback.comparisons.accuracy_vs_avg || 0;
      var sign = delta >= 0 ? "+" : "";
      return sign + delta.toFixed(1) + "%";
    },
    speedTrendIcon: function() {
      // Positive = slower (bad), Negative = faster (good) - same as accuracy now
      var delta = this.feedback.comparisons.speed_vs_avg || 0;
      if (delta < 0) return "trending_up";  // Faster (good)
      if (delta > 0) return "trending_down";  // Slower (bad)
      return "trending_flat";
    },
    speedTrendColor: function() {
      var delta = this.feedback.comparisons.speed_vs_avg || 0;
      if (delta < 0) return "green";  // Faster is good
      if (delta > 0) return "red";    // Slower is bad
      return "grey";
    },
    speedTrendClass: function() {
      var delta = this.feedback.comparisons.speed_vs_avg || 0;
      if (delta < 0) return "trend-positive";  // Faster is positive
      if (delta > 0) return "trend-negative";  // Slower is negative
      return "trend-neutral";
    },
    speedTrendText: function() {
      var delta = this.feedback.comparisons.speed_vs_avg || 0;
      // For speed, negative delta means faster (saved time), positive means slower (lost time)
      // We want to show "-2s" for faster, "+2s" for slower
      var sign = delta >= 0 ? "+" : "";
      return sign + delta.toFixed(1) + "s";
    },
    // Streak computed properties
    streakProgress: function() {
      var today = this.feedback.streak.today_minutes || 0;
      return Math.min(100, (today / 15) * 100);
    },
    streakProgressColor: function() {
      // Match the risk levels for the card border
      if (!this.feedback.streak.needs_more_time) return "green";  // Goal met
      var remaining = this.feedback.streak.minutes_remaining;
      if (remaining <= 5) return "red";      // Close to deadline, high risk
      if (remaining <= 10) return "orange";  // Medium risk
      return "lime";  // Light green for low risk (far from goal, plenty of time)
    },
    streakCardClass: function() {
      if (!this.feedback.streak.needs_more_time) return "streak-safe";
      if (this.feedback.streak.minutes_remaining <= 5) return "streak-risk-high";
      if (this.feedback.streak.minutes_remaining <= 10) return "streak-risk-medium";
      return "streak-risk-low";
    }
  },
  methods: {
    formatTime: function(seconds) {
      if (!seconds) return "0s";
      if (seconds < 60) return seconds + "s";
      var mins = Math.floor(seconds / 60);
      var secs = seconds % 60;
      if (secs === 0) return mins + "m";
      return mins + "m " + secs + "s";
    }
  },
  mounted: function() {
    if (this.sessionId) {
      store.dispatch("loadSessionFeedback", this.sessionId);
    }
  }
});
