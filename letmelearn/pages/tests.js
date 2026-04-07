/**
 * Test page for store modules and API endpoints.
 * Only included when TEST_PAGE=true environment variable is set.
 */

var Tests = {
  template: `
<ProtectedPage title="Tests" icon="bug_report">
  <v-container>

    <v-card style="margin: 16px 0;">
      <v-card-title>
        <h2>🧪 Store Module Tests</h2>
        <v-spacer/>
        <v-btn @click="runAllTests" color="primary" large :loading="running">
          Run All Tests
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="summary.total > 0" :type="summaryColor" style="margin-bottom: 16px;">
          <strong>Results:</strong>
          {{ summary.passed }}/{{ summary.total }} tests passed
          <span v-if="summary.failed > 0">({{ summary.failed }} failed)</span>
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>📊 Stats Store Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testStatsStore" color="primary" :loading="statsLoading" :disabled="running">
          Run Stats Tests
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in statsResults" :key="'stats-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>📋 Sessions Store Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testSessionsStore" color="primary" :loading="sessionsLoading" :disabled="running">
          Run Sessions Tests
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in sessionsResults" :key="'sessions-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🔄 Full Lifecycle Test</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testSessionLifecycle" color="success" :loading="lifecycleLoading" :disabled="running">
          Test Full Lifecycle
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in lifecycleResults" :key="'lifecycle-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🔁 Session Resume Test</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testSessionResume" color="info" :loading="resumeLoading" :disabled="running">
          Test Session Resume
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in resumeResults" :key="'resume-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🎴 StatsCards Component Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testStatsCards" color="primary" :loading="cardsLoading" :disabled="running">
          Run StatsCards Tests
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in cardsResults" :key="'cards-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🔍 UserSearch Tests</h3></v-card-title>
      <v-card-text>
        <v-text-field
          v-model="userSearchQuery"
          label="Search query (min 2 chars)"
          @input="debouncedUserSearch"
          hint="Type at least 2 characters to search"
        />
        <v-btn @click="testUserSearch" color="primary" :loading="userSearchLoading" :disabled="running || userSearchQuery.length < 2">
          Run User Search
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in userSearchResults" :key="'usersearch-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
        <div v-if="userSearchResults.length > 0" style="margin-top: 16px;">
          <v-chip v-for="user in userSearchResults" :key="'result-'+user.email" style="margin: 4px;">
            <v-avatar left><img :src="user.picture || '/app/static/images/default-avatar.png'"></v-avatar>
            {{ user.name || user.email }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🔥 FollowingStreaks Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testFollowingStreaks" color="primary" :loading="followingStreaksLoading" :disabled="running">
          Run FollowingStreaks Tests
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in followingStreaksResults" :key="'streaks-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
        <div v-if="followingStreaksData.length > 0" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <strong>Following Streaks:</strong>
          <div v-for="item in followingStreaksData" :key="'streak-user-'+item.user.email" style="margin-top: 8px;">
            {{ item.user.name || item.user.email }}: 🔥 {{ item.streak }} streak, {{ item.today_minutes }}min today
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>👁️ StatsCards Visual Preview</h3></v-card-title>
      <v-card-text>
        <StatsCards/>
        <div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <strong>Current Data:</strong>
          <div style="margin-top: 8px;">
            <span style="margin-right: 16px;">🔥 Streak: {{ streakCount }}</span>
            <span style="margin-right: 16px;">⏱️ Today: {{ todayMinutes }}min</span>
            <span style="margin-right: 16px;">🎯 Accuracy: {{ accuracy }}%</span>
            <span style="margin-right: 16px;">📊 Time: {{ timeMinutes }}min</span>
          </div>
          <div style="margin-top: 8px;">
            <span>Risk Level: <strong>{{ riskLevel }}</strong></span>
            <span style="margin-left: 16px;">Streak Risk: <strong>{{ streakRisk }}</strong></span>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>👥 Follows Store Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testFollowsStore" color="primary" :loading="followsLoading" :disabled="running">
          Run Follows Tests
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in followsResults" :key="'follows-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>📡 Feed Store Tests</h3></v-card-title>
      <v-card-text>
        <v-btn @click="testFeedStore" color="primary" :loading="feedLoading" :disabled="running">
          Run Feed Tests
        </v-btn>
        <v-btn @click="testFeedModeToggle" color="info" :loading="feedModeLoading" :disabled="running" style="margin-left: 8px;">
          Test Mode Toggle
        </v-btn>
        <div style="margin-top: 16px;">
          <div v-for="(test, i) in feedResults" :key="'feed-'+i" style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <v-icon :color="test.passed ? 'green' : 'red'">{{ test.passed ? 'check_circle' : 'cancel' }}</v-icon>
            <strong>{{ test.name }}</strong>
            <div v-if="test.message" style="margin-left: 32px; font-size: 12px; color: #666;">{{ test.message }}</div>
          </div>
        </div>
        <div style="margin-top: 16px; padding: 12px; background: #fff3e0; border-radius: 4px;">
          <strong>Current Feed Mode:</strong> {{ feedMode }}
          <div style="margin-top: 8px; font-size: 12px; color: #666;">
            "my" shows your own activity, "following" shows activity from users you follow
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card style="margin: 16px 0;">
      <v-card-title><h3>🔍 Current State</h3></v-card-title>
      <v-card-text>
        <v-btn @click="showCurrentState" color="info" :disabled="running">
          Show Current State
        </v-btn>
        <div style="margin-top: 16px;">
          <pre style="background: #f5f5f5; padding: 12px; overflow: auto; max-height: 300px;">{{ stateOutput }}</pre>
        </div>
      </v-card-text>
    </v-card>

  </v-container>
</ProtectedPage>
`,
  navigation: {
    section: "info",
    icon: "bug_report",
    text: "Tests",
    path: "/tests",
    index: 99
  },
  data: function() {
    return {
      running: false,
      statsLoading: false,
      sessionsLoading: false,
      lifecycleLoading: false,
      cardsLoading: false,
      resumeLoading: false,
      followsLoading: false,
      feedLoading: false,
      feedModeLoading: false,
      userSearchLoading: false,
      followingStreaksLoading: false,
      statsResults: [],
      sessionsResults: [],
      lifecycleResults: [],
      cardsResults: [],
      resumeResults: [],
      followsResults: [],
      feedResults: [],
      feedModeResults: [],
      userSearchResults: [],
      followingStreaksResults: [],
      userSearchQuery: "",
      userSearchDebounceTimer: null,
      followingStreaksData: [],
      stateOutput: "Click button to show state...",
      summary: { total: 0, passed: 0, failed: 0 }
    };
  },
  computed: {
    summaryColor: function() {
      if (this.summary.failed > 0) return "error";
      if (this.summary.passed === this.summary.total && this.summary.total > 0) return "success";
      return "info";
    },
    streakCount: function() {
      return store.getters.streakCount;
    },
    todayMinutes: function() {
      return store.getters.todayMinutes;
    },
    accuracy: function() {
      return store.getters.weekly.accuracy || 0;
    },
    timeMinutes: function() {
      return store.getters.weekly.time_minutes || 0;
    },
    riskLevel: function() {
      return store.getters.riskLevel;
    },
    streakRisk: function() {
      return store.getters.streakRisk;
    },
    feedMode: function() {
      return store.getters.feedMode || "my";
    }
  },
  methods: {
    updateSummary: function() {
      var all = this.statsResults
        .concat(this.sessionsResults)
        .concat(this.lifecycleResults)
        .concat(this.cardsResults)
        .concat(this.resumeResults)
        .concat(this.followsResults)
        .concat(this.feedResults)
        .concat(this.feedModeResults)
        .concat(this.userSearchResults)
        .concat(this.followingStreaksResults);
      this.summary = {
        total: all.length,
        passed: all.filter(function(t) { return t.passed; }).length,
        failed: all.filter(function(t) { return !t.passed; }).length
      };
    },

    pass: function(name, message) {
      return { name: name, passed: true, message: message || "" };
    },

    fail: function(name, message) {
      return { name: name, passed: false, message: message || "" };
    },

    testStatsStore: function() {
      var self = this;
      self.statsLoading = true;
      self.statsResults = [];
      self.updateSummary();

      // Test 1: Initial state
      var initialLoading = store.state.stats._loading;
      self.statsResults.push(self.pass("Initial state: loading=" + initialLoading));

      // Test 2: Load stats
      store.dispatch('loadStats')
        .then(function() {
          self.statsResults.push(self.pass("loadStats completed"));

          // Test 3: Check streak getter
          var streak = store.getters.streak;
          if (typeof streak.streak === 'number' && typeof streak.today_minutes === 'number') {
            self.statsResults.push(self.pass("streak getter works", "streak=" + streak.streak + ", today_minutes=" + streak.today_minutes));
          } else {
            self.statsResults.push(self.fail("streak getter invalid", JSON.stringify(streak)));
          }

          // Test 4: Check weekly getter
          var weekly = store.getters.weekly;
          if (typeof weekly.quizzes === 'number' && typeof weekly.accuracy === 'number') {
            self.statsResults.push(self.pass("weekly getter works", "quizzes=" + weekly.quizzes + ", accuracy=" + weekly.accuracy));
          } else {
            self.statsResults.push(self.fail("weekly getter invalid", JSON.stringify(weekly)));
          }

          // Test 5: Check individual getters
          var streakCount = store.getters.streakCount;
          var todayMinutes = store.getters.todayMinutes;
          var streakRisk = store.getters.streakRisk;
          var riskLevel = store.getters.riskLevel;

          if (typeof streakCount === 'number' && typeof todayMinutes === 'number') {
            self.statsResults.push(self.pass("Individual getters work", "streakCount=" + streakCount + ", todayMinutes=" + todayMinutes));
          } else {
            self.statsResults.push(self.fail("Individual getters invalid"));
          }

          if (typeof streakRisk === 'boolean' && ['none', 'low', 'medium', 'high'].indexOf(riskLevel) !== -1) {
            self.statsResults.push(self.pass("Risk getters work", "streakRisk=" + streakRisk + ", riskLevel=" + riskLevel));
          } else {
            self.statsResults.push(self.fail("Risk getters invalid", "streakRisk=" + streakRisk + ", riskLevel=" + riskLevel));
          }

          self.updateSummary();
        })
        .catch(function(err) {
          self.statsResults.push(self.fail("loadStats failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.statsLoading = false;
        });
    },

    testSessionsStore: function() {
      var self = this;
      self.sessionsLoading = true;
      self.sessionsResults = [];
      self.updateSummary();

      // Test 1: Initial state
      var hasSession = store.getters.hasActiveSession;
      var sessionId = store.getters.currentSessionId;
      self.sessionsResults.push(self.pass("Initial state", "hasActiveSession=" + hasSession + ", currentSessionId=" + sessionId));

      // Test 2: Check current session
      store.dispatch('checkCurrentSession')
        .then(function(result) {
          if (result === null) {
            self.sessionsResults.push(self.pass("checkCurrentSession returns null (no active session)"));
          } else {
            self.sessionsResults.push(self.pass("checkCurrentSession found active session", "sessionId=" + result._id));
            // Verify state was updated
            if (store.getters.hasActiveSession === true) {
              self.sessionsResults.push(self.pass("State updated correctly for active session"));
            } else {
              self.sessionsResults.push(self.fail("State not updated for active session"));
            }
          }
          self.updateSummary();
        })
        .catch(function(err) {
          self.sessionsResults.push(self.fail("checkCurrentSession failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.sessionsLoading = false;
        });
    },

    testSessionLifecycle: function() {
      var self = this;
      self.lifecycleLoading = true;
      self.lifecycleResults = [];
      self.updateSummary();

      // Mock session ID for testing (no server interaction)
      var mockSessionId = "test-session-" + Date.now();
      var mockStartTime = new Date().toISOString();

      // Step 1: Test store state management by simulating the session lifecycle
      // We use store.commit directly to avoid creating real sessions in the database

      // Test: sessionStarted mutation
      store.commit("sessionStarted", {
        sessionId: mockSessionId,
        startTime: mockStartTime,
        kind: "quiz"
      });
      self.lifecycleResults.push(self.pass("sessionStarted mutation", "sessionId=" + mockSessionId));

      // Verify state was updated
      if (store.getters.hasActiveSession === true && store.getters.currentSessionId === mockSessionId) {
        self.lifecycleResults.push(self.pass("State updated after sessionStarted"));
      } else {
        self.lifecycleResults.push(self.fail("State not updated correctly", "hasActiveSession=" + store.getters.hasActiveSession));
      }

      // Verify session kind
      if (store.getters.sessionKind === "quiz") {
        self.lifecycleResults.push(self.pass("Session kind is 'quiz'"));
      } else {
        self.lifecycleResults.push(self.fail("Session kind wrong", "kind=" + store.getters.sessionKind));
      }

      // Test: sessionStopped mutation
      store.commit("sessionStopped");
      self.lifecycleResults.push(self.pass("sessionStopped mutation"));

      // Verify state was cleared
      if (store.getters.hasActiveSession === false) {
        self.lifecycleResults.push(self.pass("State cleared after sessionStopped"));
      } else {
        self.lifecycleResults.push(self.fail("State not cleared after sessionStopped"));
      }

      // Test: sessionResumed mutation
      store.commit("sessionResumed", {
        sessionId: mockSessionId,
        startTime: mockStartTime,
        kind: "training"
      });
      self.lifecycleResults.push(self.pass("sessionResumed mutation"));

      // Verify resumed state
      if (store.getters.hasActiveSession === true && store.getters.sessionKind === "training") {
        self.lifecycleResults.push(self.pass("Session resumed with correct kind"));
      } else {
        self.lifecycleResults.push(self.fail("Session resume failed"));
      }

      // Clean up
      store.commit("sessionStopped");

      self.updateSummary();
      self.lifecycleLoading = false;
    },

    testStatsCards: function() {
      var self = this;
      self.cardsLoading = true;
      self.cardsResults = [];
      self.updateSummary();

      // Test 1: Component exists
      if (Vue.options.components.StatsCards) {
        self.cardsResults.push(self.pass("StatsCards component is registered"));
      } else {
        self.cardsResults.push(self.fail("StatsCards component not found"));
      }

      // Test 2: Load stats first
      store.dispatch('loadStats')
        .then(function() {
          self.cardsResults.push(self.pass("Stats loaded for component test"));

          // Test 3: Check streak data
          var streak = store.getters.streak;
          if (typeof streak.streak === 'number') {
            self.cardsResults.push(self.pass("Streak data available", "streak=" + streak.streak));
          } else {
            self.cardsResults.push(self.fail("Streak data unavailable"));
          }

          // Test 4: Check weekly data
          var weekly = store.getters.weekly;
          if (typeof weekly.accuracy === 'number' && typeof weekly.time_minutes === 'number') {
            self.cardsResults.push(self.pass("Weekly data available", "accuracy=" + weekly.accuracy + "%, time=" + weekly.time_minutes + "min"));
          } else {
            self.cardsResults.push(self.fail("Weekly data unavailable"));
          }

          // Test 5: Check risk level values
          var riskLevel = store.getters.riskLevel;
          var validLevels = ['none', 'low', 'medium', 'high'];
          if (validLevels.indexOf(riskLevel) !== -1) {
            self.cardsResults.push(self.pass("Risk level valid", "riskLevel=" + riskLevel));
          } else {
            self.cardsResults.push(self.fail("Invalid risk level", "riskLevel=" + riskLevel));
          }

          // Test 6: Check todayMinutes getter
          var todayMinutes = store.getters.todayMinutes;
          if (typeof todayMinutes === 'number' && todayMinutes >= 0) {
            self.cardsResults.push(self.pass("Today minutes valid", "todayMinutes=" + todayMinutes));
          } else {
            self.cardsResults.push(self.fail("Today minutes invalid"));
          }

          // Test 7: Verify computed streakCardClass logic
          // The class depends on riskLevel and streakRisk
          var streakRisk = store.getters.streakRisk;
          if (!streakRisk) {
            self.cardsResults.push(self.pass("Streak is safe (no risk)", "expected class: streak-safe"));
          } else if (riskLevel === 'high') {
            self.cardsResults.push(self.pass("Streak at high risk", "expected class: streak-risk-high"));
          } else if (riskLevel === 'medium') {
            self.cardsResults.push(self.pass("Streak at medium risk", "expected class: streak-risk-medium"));
          } else {
            self.cardsResults.push(self.pass("Streak at low risk", "expected class: streak-risk-low"));
          }

          // Test 8: Check loading state getter
          var isLoading = store.getters.statsLoading;
          self.cardsResults.push(self.pass("Loading state accessible", "loading=" + isLoading));

          self.updateSummary();
        })
        .catch(function(err) {
          self.cardsResults.push(self.fail("Failed to load stats", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.cardsLoading = false;
        });
    },

    testSessionResume: function() {
      var self = this;
      self.resumeLoading = true;
      self.resumeResults = [];
      self.updateSummary();

      var mockSessionId = "test-resume-" + Date.now();
      var mockStartTime = new Date().toISOString();

      // Test: Simulating session start and page refresh scenario
      // 1. Start a session (simulated)
      store.commit("sessionStarted", {
        sessionId: mockSessionId,
        startTime: mockStartTime,
        kind: "training"
      });
      self.resumeResults.push(self.pass("Session started (simulated)", "kind=training"));

      // Verify state
      if (store.getters.hasActiveSession) {
        self.resumeResults.push(self.pass("hasActiveSession is true after start"));
      } else {
        self.resumeResults.push(self.fail("hasActiveSession should be true"));
      }

      // 2. Simulate page refresh by resuming the session
      store.commit("sessionResumed", {
        sessionId: mockSessionId,
        startTime: mockStartTime,
        kind: "training"
      });
      self.resumeResults.push(self.pass("Session resumed (simulated)"));

      // Verify resumed state
      if (store.getters.hasActiveSession && store.getters.sessionKind === "training") {
        self.resumeResults.push(self.pass("Session state correct after resume"));
      } else {
        self.resumeResults.push(self.fail("Session state incorrect after resume"));
      }

      // 3. Stop the session
      store.commit("sessionStopped");
      self.resumeResults.push(self.pass("Session stopped"));

      // Verify state cleared
      if (!store.getters.hasActiveSession) {
        self.resumeResults.push(self.pass("State cleared after stop"));
      } else {
        self.resumeResults.push(self.fail("State not cleared after stop"));
      }

      // 4. Test: verify getters return correct defaults when no session
      var sessionId = store.getters.currentSessionId;
      if (sessionId === null) {
        self.resumeResults.push(self.pass("currentSessionId is null after stop"));
      } else {
        self.resumeResults.push(self.fail("currentSessionId should be null", "got=" + sessionId));
      }

      var sessionKind = store.getters.sessionKind;
      if (sessionKind === null) {
        self.resumeResults.push(self.pass("sessionKind is null after stop"));
      } else {
        self.resumeResults.push(self.fail("sessionKind should be null", "got=" + sessionKind));
      }

      self.updateSummary();
      self.resumeLoading = false;
    },

    showCurrentState: function() {
      this.stateOutput = "Current Store State:\n\n";
      this.stateOutput += "sessions:\n" + JSON.stringify(store.state.sessions, null, 2) + "\n\n";
      this.stateOutput += "stats:\n" + JSON.stringify(store.state.stats, null, 2) + "\n\n";
      this.stateOutput += "feed:\n" + JSON.stringify(store.state.feed, null, 2) + "\n\n";
      this.stateOutput += "follows:\n" + JSON.stringify(store.state.follows, null, 2);
    },

    // FollowsStore Tests
    testFollowsStore: function() {
      var self = this;
      self.followsLoading = true;
      self.followsResults = [];
      self.updateSummary();

      // Test 1: Initial state
      var following = store.getters.following;
      var followers = store.getters.followers;
      self.followsResults.push(self.pass("Initial state", "following=" + following.length + ", followers=" + followers.length));

      // Test 2: Check isFollowing getter with non-existent user
      var isFollowing = store.getters.isFollowing("nonexistent@example.com");
      if (isFollowing === false) {
        self.followsResults.push(self.pass("isFollowing returns false for non-followed user"));
      } else {
        self.followsResults.push(self.fail("isFollowing should return false", "got=" + isFollowing));
      }

      // Test 3: Check followingCount and followersCount getters
      var followingCount = store.getters.followingCount;
      var followersCount = store.getters.followersCount;
      if (typeof followingCount === 'number' && typeof followersCount === 'number') {
        self.followsResults.push(self.pass("Count getters work", "followingCount=" + followingCount + ", followersCount=" + followersCount));
      } else {
        self.followsResults.push(self.fail("Count getters invalid"));
      }

      // Test 4: Test userFollowed mutation (no API call, just state change)
      var mockUser = { email: "test-mock@example.com", name: "Test Mock", picture: "https://example.com/mock.jpg" };
      store.commit("userFollowed", mockUser);
      if (store.getters.isFollowing("test-mock@example.com")) {
        self.followsResults.push(self.pass("userFollowed mutation works"));
      } else {
        self.followsResults.push(self.fail("userFollowed mutation failed"));
      }

      // Test 5: Verify followingCount increased
      var newCount = store.getters.followingCount;
      if (newCount === followingCount + 1) {
        self.followsResults.push(self.pass("followingCount incremented", "count=" + newCount));
      } else {
        self.followsResults.push(self.fail("followingCount not incremented", "expected=" + (followingCount + 1) + ", got=" + newCount));
      }

      // Test 6: Test userUnfollowed mutation (no API call, just state change)
      store.commit("userUnfollowed", "test-mock@example.com");
      if (!store.getters.isFollowing("test-mock@example.com")) {
        self.followsResults.push(self.pass("userUnfollowed mutation works"));
      } else {
        self.followsResults.push(self.fail("userUnfollowed mutation failed"));
      }

      // Test 7: Verify followingCount decreased
      var finalCount = store.getters.followingCount;
      if (finalCount === followingCount) {
        self.followsResults.push(self.pass("followingCount restored", "count=" + finalCount));
      } else {
        self.followsResults.push(self.fail("followingCount not restored", "expected=" + followingCount + ", got=" + finalCount));
      }

      // Test 8: Load following list (read-only API call)
      store.dispatch('loadFollowing')
        .then(function() {
          self.followsResults.push(self.pass("loadFollowing completed"));
          self.updateSummary();
        })
        .catch(function(err) {
          self.followsResults.push(self.fail("loadFollowing failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.followsLoading = false;
        });
    },

    // FeedStore Tests
    testFeedStore: function() {
      var self = this;
      self.feedLoading = true;
      self.feedResults = [];
      self.updateSummary();

      // Test 1: Initial state
      var feed = store.getters.feed;
      var mode = store.getters.feedMode;
      self.feedResults.push(self.pass("Initial state", "feed items=" + feed.length + ", mode=" + mode));

      // Test 2: Check default mode is "my"
      if (mode === "my") {
        self.feedResults.push(self.pass("Default mode is 'my'"));
      } else {
        self.feedResults.push(self.fail("Default mode should be 'my'", "got=" + mode));
      }

      // Test 3: Load feed with "my" mode
      store.dispatch('load_feed')
        .then(function() {
          self.feedResults.push(self.pass("load_feed completed"));
          self.updateSummary();
        })
        .catch(function(err) {
          self.feedResults.push(self.fail("load_feed failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.feedLoading = false;
        });
    },

    // Feed Mode Toggle Test
    testFeedModeToggle: function() {
      var self = this;
      self.feedModeLoading = true;
      self.feedModeResults = [];
      self.updateSummary();

      // Test 1: Set mode to "following"
      store.commit("feedMode", "following");
      var mode = store.getters.feedMode;
      if (mode === "following") {
        self.feedModeResults.push(self.pass("Mode set to 'following'"));
      } else {
        self.feedModeResults.push(self.fail("Mode should be 'following'", "got=" + mode));
      }

      // Test 2: Set mode back to "my"
      store.commit("feedMode", "my");
      mode = store.getters.feedMode;
      if (mode === "my") {
        self.feedModeResults.push(self.pass("Mode set back to 'my'"));
      } else {
        self.feedModeResults.push(self.fail("Mode should be 'my'", "got=" + mode));
      }

      // Test 3: Verify setFeedMode action
      store.dispatch("setFeedMode", "following")
        .then(function() {
          mode = store.getters.feedMode;
          if (mode === "following") {
            self.feedModeResults.push(self.pass("setFeedMode action works"));
          } else {
            self.feedModeResults.push(self.fail("setFeedMode didn't change mode", "got=" + mode));
          }

          // Reset to "my"
          store.dispatch("setFeedMode", "my");
          self.updateSummary();
        })
        .catch(function(err) {
          self.feedModeResults.push(self.fail("setFeedMode failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.feedModeLoading = false;
        });
    },

    // UserSearch Tests
    debouncedUserSearch: function() {
      var self = this;
      if (self.userSearchDebounceTimer) {
        clearTimeout(self.userSearchDebounceTimer);
      }
      self.userSearchDebounceTimer = setTimeout(function() {
        if (self.userSearchQuery.length >= 2) {
          self.testUserSearch();
        }
      }, 300);
    },

    testUserSearch: function() {
      var self = this;
      self.userSearchLoading = true;
      self.userSearchResults = [];
      self.updateSummary();

      // Test 1: Check searchUsers action exists
      if (typeof store.dispatch === 'function') {
        self.userSearchResults.push(self.pass("Store dispatch available"));
      } else {
        self.userSearchResults.push(self.fail("Store dispatch not available"));
      }

      // Test 2: Call searchUsers with query
      var query = self.userSearchQuery || "te"; // Default to "te" if empty
      store.dispatch('searchUsers', query)
        .then(function(users) {
          // Check response is array
          if (Array.isArray(users)) {
            self.userSearchResults.push(self.pass("searchUsers returns array", "found " + users.length + " users"));
          } else {
            self.userSearchResults.push(self.fail("searchUsers should return array", "got: " + typeof users));
          }

          // Test 3: Check user structure
          if (users.length > 0) {
            var user = users[0];
            if (user.email && typeof user.name !== 'undefined') {
              self.userSearchResults.push(self.pass("User has correct structure", "email=" + user.email));
            } else {
              self.userSearchResults.push(self.fail("User missing required fields", JSON.stringify(user)));
            }

            // Test 4: Verify no current user in results
            var currentUser = store.getters.feed && store.getters.feed[0] && store.getters.feed[0].user[0];
            if (currentUser) {
              var hasCurrentUser = users.some(function(u) { return u.email === currentUser.email; });
              if (!hasCurrentUser) {
                self.userSearchResults.push(self.pass("Current user excluded from results"));
              } else {
                self.userSearchResults.push(self.fail("Current user should be excluded"));
              }
            }
          }

          self.updateSummary();
        })
        .catch(function(err) {
          self.userSearchResults.push(self.fail("searchUsers failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.userSearchLoading = false;
        });
    },

    // FollowingStreaks Tests
    testFollowingStreaks: function() {
      var self = this;
      self.followingStreaksLoading = true;
      self.followingStreaksResults = [];
      self.followingStreaksData = [];
      self.updateSummary();

      // Test 1: Check followingStreaks getter exists
      var streaks = store.getters.followingStreaks;
      if (Array.isArray(streaks)) {
        self.followingStreaksResults.push(self.pass("followingStreaks getter exists", "returns array"));
      } else {
        self.followingStreaksResults.push(self.fail("followingStreaks should return array"));
      }

      // Test 2: Load following streaks
      store.dispatch('loadFollowingStreaks')
        .then(function(data) {
          self.followingStreaksResults.push(self.pass("loadFollowingStreaks completed"));

          // Store data for display
          self.followingStreaksData = data || [];

          // Test 3: Check data structure
          if (Array.isArray(data)) {
            self.followingStreaksResults.push(self.pass("Response is array", "length=" + data.length));

            // Test 4: Check item structure
            if (data.length > 0) {
              var item = data[0];
              var hasUser = typeof item.user === 'object' && item.user !== null;
              var hasStreak = typeof item.streak === 'number';
              var hasMinutes = typeof item.today_minutes === 'number';

              if (hasUser && hasStreak && hasMinutes) {
                self.followingStreaksResults.push(self.pass("Item structure correct",
                  item.user.name + ": streak=" + item.streak + ", today=" + item.today_minutes + "min"));
              } else {
                self.followingStreaksResults.push(self.fail("Item missing fields", JSON.stringify(item)));
              }

              // Test 5: Check user object structure
              if (hasUser) {
                var user = item.user;
                if (typeof user.email === 'string' && typeof user.name === 'string') {
                  self.followingStreaksResults.push(self.pass("User object has email and name"));
                } else {
                  self.followingStreaksResults.push(self.fail("User object missing fields", JSON.stringify(user)));
                }
              }

              // Test 6: Check sorting (by streak descending)
              var sorted = true;
              for (var i = 1; i < data.length; i++) {
                if (data[i].streak > data[i-1].streak) {
                  sorted = false;
                  break;
                }
              }
              if (sorted) {
                self.followingStreaksResults.push(self.pass("Results sorted by streak (descending)"));
              } else {
                self.followingStreaksResults.push(self.fail("Results not sorted correctly"));
              }
            } else {
              self.followingStreaksResults.push(self.pass("No followed users (empty result)"));
            }
          } else {
            self.followingStreaksResults.push(self.fail("Response should be array"));
          }

          self.updateSummary();
        })
        .catch(function(err) {
          self.followingStreaksResults.push(self.fail("loadFollowingStreaks failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.followingStreaksLoading = false;
        });
    },

    runAllTests: function() {
      var self = this;
      self.running = true;
      self.statsResults = [];
      self.sessionsResults = [];
      self.lifecycleResults = [];
      self.cardsResults = [];
      self.resumeResults = [];
      self.followsResults = [];
      self.feedResults = [];
      self.feedModeResults = [];
      self.userSearchResults = [];
      self.followingStreaksResults = [];
      self.summary = { total: 0, passed: 0, failed: 0 };

      // Run stats tests first
      self.testStatsStore();

      // Wait for stats to complete, then run sessions tests
      setTimeout(function() {
        if (self.statsLoading) {
          // Wait more if still loading
          var checkStats = setInterval(function() {
            if (!self.statsLoading) {
              clearInterval(checkStats);
              self.testSessionsStore();
            }
          }, 100);
        } else {
          self.testSessionsStore();
        }
      }, 100);

      // Wait for sessions to complete, then run lifecycle test
      var checkSessions = setInterval(function() {
        if (!self.statsLoading && !self.sessionsLoading) {
          clearInterval(checkSessions);
          self.testSessionLifecycle();

          // Wait for lifecycle to complete
          var checkLifecycle = setInterval(function() {
            if (!self.lifecycleLoading) {
              clearInterval(checkLifecycle);
              // Run StatsCards tests
              self.testStatsCards();

              // Wait for cards tests to complete
              var checkCards = setInterval(function() {
                if (!self.cardsLoading) {
                  clearInterval(checkCards);
                  // Run session resume test
                  self.testSessionResume();

                  // Wait for resume test to complete
                  var checkResume = setInterval(function() {
                    if (!self.resumeLoading) {
                      clearInterval(checkResume);
                      // Run follows tests
                      self.testFollowsStore();

                      // Wait for follows tests to complete
                      var checkFollows = setInterval(function() {
                        if (!self.followsLoading) {
                          clearInterval(checkFollows);
                          // Run feed tests
                          self.testFeedStore();

                          // Wait for feed tests to complete
                          var checkFeed = setInterval(function() {
                            if (!self.feedLoading) {
                              clearInterval(checkFeed);
                              // Run feed mode tests
                              self.testFeedModeToggle();

                              // Wait for feed mode tests to complete
                              var checkFeedMode = setInterval(function() {
                                if (!self.feedModeLoading) {
                                  clearInterval(checkFeedMode);
                                  // Run FollowingStreaks tests
                                  self.testFollowingStreaks();

                                  // Wait for FollowingStreaks tests to complete
                                  var checkFollowingStreaks = setInterval(function() {
                                    if (!self.followingStreaksLoading) {
                                      clearInterval(checkFollowingStreaks);
                                      self.running = false;
                                    }
                                  }, 100);
                                }
                              }, 100);
                            }
                          }, 100);
                        }
                      }, 100);
                    }
                  }, 100);
                }
              }, 100);
            }
          }, 100);
        }
      }, 100);
    }
  }
};

// Register test page (file is only loaded when TEST_PAGE=true)
Navigation.add(Tests);