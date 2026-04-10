var Train = {
  template: `
<ProtectedPage title="Trainen" icon="fitness_center">

  <!-- toolbar -->

  <template v-slot:subheader>

    <TopicSelector @change="change_topic" multiple tags/>

    <v-btn flat icon @click="start" :disabled="!selected || playing" class="small-button">
      <v-icon>play_arrow</v-icon>
    </v-btn>

    <v-btn flat icon  @click="toggle_timing" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ timing_icon }}</v-icon>
    </v-btn>

    <v-btn flat icon @click="stop" :disabled="!playing" class="ma-0">
      <v-icon>stop</v-icon>
    </v-btn>

    <v-btn flat icon @click="reset" :disabled="!playing" class="ma-0" v-if="!show_in_menu">
      <v-icon>replay</v-icon>
    </v-btn>

    <v-btn flat icon @click="swap" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ direction_icon }}</v-icon>
    </v-btn>

    <v-menu bottom left v-if="show_in_menu">
      <template v-slot:activator="{ on }">
        <v-btn
          flat
          icon
          v-on="on"
        >
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-tile>

          <v-btn flat icon  @click="toggle_timing" :disabled="!selected" class="ma-0">
            <v-icon>{{ timing_icon }}</v-icon>
          </v-btn>

        </v-list-tile>
        <v-list-tile>

          <v-btn flat icon @click="reset" :disabled="!playing" class="ma-0">
            <v-icon>replay</v-icon>
          </v-btn>

        </v-list-tile>
        <v-list-tile>

          <v-btn flat icon @click="swap" :disabled="!selected" class="ma-0">
            <v-icon>{{ direction_icon }}</v-icon>
          </v-btn>

        </v-list-tile>
      </v-list>
    </v-menu>


  </template>

  <!-- progress bars -->

  <Timer ref="timer"
         :visible="playing"
         @changed="handle_timer_changed"
         @done="handle_timer_done"/>

  <v-toolbar height="40" v-if="playing">
    <v-toolbar-side-icon><v-icon>play_arrow</v-icon></v-toolbar-side-icon>
    <v-progress-linear
        size="items_count"
        v-model="pct_correct"
        :buffer-value="pct_asked"
        buffer
        v-if="playing"></v-progress-linear>
  </v-toolbar>

  <!-- question -->

  <template v-if="problem">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="next(true)">
        <v-card>
          <v-card-title primary-title class="justify-center">

            <div class="flip-card">
              <div class="flip-card-inner">
                <div class="flip-card-front">
                  <component :is="problem.topic.question.type"
                             training question
                             v-bind="problem"/>
                </div>
                <div class="flip-card-back">
                  <component :is="problem.topic.question.type"
                             training answer
                             v-bind="problem"/>
                </div>
              </div>
            </div>

          </v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn type="submit">ok</v-btn>
            <v-btn @click="next(false)">opnieuw</v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-flex>
  </template>

  <!-- done -->

  <v-layout v-if="showFeedback">
    <v-flex xs12 sm6 offset-sm3>
      <SessionFeedback
        :session-id="feedbackSessionId"
        :kind="kind"
        @start-new="startNew"
      />
    </v-flex>
  </v-layout>

</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "fitness_center",
    text:    "Trainen",
    path:    "/training",
    index:   3
  },
  mounted: function() {
    var self = this;

    // Handle page unload - use sendBeacon for reliable session stop
    // sendBeacon is designed for analytics/unload scenarios and guarantees delivery
    this._beforeUnloadHandler = function(e) {
      if (self.playing && store.getters.hasActiveSession) {
        self._sendSessionBeacon("abandoned");
      }
    };
    window.addEventListener("beforeunload", this._beforeUnloadHandler);

    // Handle tab visibility change - stop session when tab becomes hidden
    this._visibilityHandler = function(e) {
      if (document.visibilityState === "hidden" && self.playing) {
        self._sendSessionBeacon("abandoned");
      }
    };
    document.addEventListener("visibilitychange", this._visibilityHandler);

    // Check for existing session (page refresh/reload)
    if (store.getters.hasActiveSession) {
      console.debug("Training: resuming existing session");
    }

    if (!this.selected) { return; }
    var expected_hash = store.getters.selected_hash;
    if (window.location.hash.substring(1) != expected_hash) {
      window.location.hash = expected_hash;
    }
  },
  beforeDestroy: function() {
    // Clean up event listeners
    if (this._beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this._beforeUnloadHandler);
    }
    if (this._visibilityHandler) {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
    }
    // Stop session if still active (for normal navigation)
    if (this.playing) {
      this.stopSession("abandoned");
    }
    // Hide session feedback when navigating away
    store.dispatch("hideSessionFeedback");
  },
  computed: {
    show_in_menu: function() {
      return this.$vuetify.breakpoint.name == "xs";
    },
    selected: function() {
      return store.getters.selected_topics.length > 0;
    },
    playing: function() {
      return store.getters.quiz.length > 0;
    },
    direction_icon: function() {
      return this.right2left ? "arrow_back" : "arrow_forward";
    },
    timing_icon: function() {
      return this.timer_active ? "timer_off" : "timer";
    },
    items_count: function() {
      return this.selected ? store.getters.all_selected_items.length : 0;
    },
    pct_asked: function() {
      return (this.asked / this.items_count) * 100;
    },
    pct_correct: function() {
      return (this.correct / this.items_count) * 100;
    },
    problem: function() {
      return store.getters.current_question;
    },
    asked: function() {
      return this.asked_questions.length;
    },
    showFeedback: function() {
      return store.getters.sessionFeedbackVisible;
    },
    feedbackSessionId: function() {
      return store.getters.sessionFeedbackId || store.getters.currentSessionId;
    },
    kind: function() {
      return "training";
    }
  },
  methods: {
    /**
     * Send session stop using sendBeacon for reliable delivery during page unload.
     * sendBeacon guarantees delivery even when the page is closing.
     * @param {string} status - "completed" or "abandoned"
     */
    _sendSessionBeacon: function(status) {
      var sessionId = store.getters.currentSessionId;
      if (!sessionId) {
        return;
      }
      var data = {
        status: status,
        questions: this.questions,
        asked: this.asked,
        attempts: this.attempts,
        correct: this.correct
      };
      var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      navigator.sendBeacon("/api/sessions/" + sessionId, blob);
      console.debug("Training: sent session beacon (" + status + ")");
    },
    start: function() {
      var self = this;
      this.result = null;
      this.correct = 0;
      this.attempts = 0;
      this.asked_questions = [];

      // Hide any previous feedback
      store.dispatch("hideSessionFeedback");

      // Start session tracking
      var topicIds = store.getters.selected_topics.map(function(topic) {
        return topic._id;
      });
      store.dispatch("startSession", { kind: "training", topics: topicIds })
        .then(function() {
          console.debug("Training: session started");
        })
        .catch(function(err) {
          console.error("Training: failed to start session", err);
        });

      store.dispatch("create_quiz");
      this.questions = store.getters.quiz.length;
      this.$refs.timer.start();
    },
    stop: function() {
      var self = this;
      store.dispatch("clear_quiz");
      this.$refs.timer.stop();

      // Store result data locally for fallback
      this.result = {
        kind: "training result",
        topics: store.getters.selected_topics.map(function(topic) { return topic._id; }),
        questions: this.questions,
        asked: this.asked,
        attempts: this.attempts,
        correct: this.correct,
        elapsed: this.$refs.timer.elapsed
      };

      // Save sessionId before stopping
      var sessionId = store.getters.currentSessionId;

      // Stop session tracking and wait for completion before showing feedback
      this.stopSession("completed")
        .then(function() {
          console.debug("Training: session stopped, showing feedback");
          // Show feedback dialog if we have a session
          if (sessionId) {
            store.dispatch("showSessionFeedback", sessionId);
          }
        })
        .catch(function(err) {
          console.error("Training: failed to stop session", err);
        });

      // Refresh stats after training
      store.dispatch("refreshAfterQuiz");
    },
    stopSession: function(status) {
      if (!store.getters.hasActiveSession) {
        return Promise.resolve(null);
      }
      return store.dispatch("stopSession", {
        status: status,
        questions: this.questions,
        asked: this.asked,
        attempts: this.attempts,
        correct: this.correct
      });
    },
    toggle_timing: function() {
      this.$refs.timer.toggle_timing();
    },
    handle_timer_changed: function(duration) {
      this.timer_active = duration > 0;
    },
    handle_timer_done: function() {
      this.done = true;
      this.stop();
    },
    reset: function() {
      this.stop();
      this.start();
    },
    change_topic: function(new_topic) {
      if (this.problem) { this.reset(); }
    },
    swap: function() {
      this.right2left = !this.right2left;
      this.reset();
    },
    startNew: function() {
      this.result = null;
      this.start();
    },
    next: function(success) {
      if (this.asked_questions.indexOf(this.problem) === -1) {
        this.asked_questions.push(this.problem);
      }

      this.attempts += 1;

      if (success) {
        store.commit("mark_correct");
        this.correct += 1;
      } else {
        store.commit("mark_incorrect");
      }

      // no next question?
      if (!this.problem) {
        this.stop();
      }
    },
  },
  data: function() {
    return {
      right2left: false,
      questions: 0,
      attempts: 0,
      correct: 0,
      done: false,
      asked_questions: [],
      timer_active: false,
      result: null
    }
  }
};

Navigation.add(Train);
