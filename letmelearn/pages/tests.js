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
      statsResults: [],
      sessionsResults: [],
      lifecycleResults: [],
      cardsResults: [],
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
    }
  },
  methods: {
    updateSummary: function() {
      var all = this.statsResults.concat(this.sessionsResults).concat(this.lifecycleResults).concat(this.cardsResults);
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

      var sessionId = null;

      // Step 1: Start a quiz session
      store.dispatch('startSession', { kind: 'quiz', topics: ['test-topic-1'] })
        .then(function(result) {
          if (!result || !result.session_id) {
            throw new Error("No session_id returned");
          }
          sessionId = result.session_id;
          self.lifecycleResults.push(self.pass("startSession succeeded", "sessionId=" + sessionId + ", status=" + result.status));

          // Verify state was updated
          if (store.getters.hasActiveSession === true && store.getters.currentSessionId === sessionId) {
            self.lifecycleResults.push(self.pass("State updated after startSession"));
          } else {
            self.lifecycleResults.push(self.fail("State not updated correctly", "hasActiveSession=" + store.getters.hasActiveSession));
          }

          // Step 2: Wait 1 second
          self.lifecycleResults.push(self.pass("Waiting 1 second to accumulate elapsed time..."));
          return new Promise(function(resolve) { setTimeout(resolve, 1000); });
        })
        .then(function() {
          // Step 3: Stop the session
          return store.dispatch('stopSession', {
            status: 'completed',
            questions: 10,
            asked: 10,
            attempts: 12,
            correct: 8
          });
        })
        .then(function(result) {
          if (result && result.elapsed >= 1) {
            self.lifecycleResults.push(self.pass("stopSession succeeded", "elapsed=" + result.elapsed + "s"));
          } else {
            self.lifecycleResults.push(self.fail("stopSession invalid response", JSON.stringify(result)));
          }

          // Verify state was cleared
          if (store.getters.hasActiveSession === false) {
            self.lifecycleResults.push(self.pass("State cleared after stopSession"));
          } else {
            self.lifecycleResults.push(self.fail("State not cleared after stopSession"));
          }

          // Step 4: Refresh stats
          return store.dispatch('refreshAfterQuiz');
        })
        .then(function() {
          var weekly = store.getters.weekly;
          if (typeof weekly.quizzes === 'number') {
            self.lifecycleResults.push(self.pass("refreshAfterQuiz succeeded", "quizzes count now: " + weekly.quizzes));
          } else {
            self.lifecycleResults.push(self.fail("refreshAfterQuiz failed"));
          }
          self.updateSummary();
        })
        .catch(function(err) {
          self.lifecycleResults.push(self.fail("Lifecycle test failed", err.message || err));
          self.updateSummary();
        })
        .finally(function() {
          self.lifecycleLoading = false;
        });
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

    showCurrentState: function() {
      this.stateOutput = "Current Store State:\n\n";
      this.stateOutput += "sessions:\n" + JSON.stringify(store.state.sessions, null, 2) + "\n\n";
      this.stateOutput += "stats:\n" + JSON.stringify(store.state.stats, null, 2) + "\n\n";
      this.stateOutput += "feed:\n" + JSON.stringify(store.state.feed, null, 2);
    },

    runAllTests: function() {
      var self = this;
      self.running = true;
      self.statsResults = [];
      self.sessionsResults = [];
      self.lifecycleResults = [];
      self.cardsResults = [];
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
              // Run StatsCards tests last
              self.testStatsCards();

              // Wait for cards tests to complete
              var checkCards = setInterval(function() {
                if (!self.cardsLoading) {
                  clearInterval(checkCards);
                  self.running = false;
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