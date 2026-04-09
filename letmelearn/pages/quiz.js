var Quiz = {
  template: `
<ProtectedPage title="Quiz" icon="question_answer">

  <!-- toolbar -->

  <template v-slot:subheader>

    <TopicSelector @change="change_topic" multiple tags/>

    <v-btn flat icon @click="start" :disabled="!selected" class="small-button" v-if="!playing">
      <v-icon>play_arrow</v-icon>
    </v-btn>

    <v-btn flat icon @click="stop" :disabled="!playing" class="ma-0" v-else>
      <v-icon>stop</v-icon>
    </v-btn>

    <v-btn flat icon  @click="toggle_timing" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ timing_icon }}</v-icon>
    </v-btn>

    <v-btn flat icon @click="reset" :disabled="!playing" class="ma-0" v-if="!show_in_menu">
      <v-icon>replay</v-icon>
    </v-btn>

    <v-btn flat icon @click="swap" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ direction_icon }}</v-icon>
    </v-btn>

    <v-btn flat icon @click="toggle_style" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ style_icon }}</v-icon>
    </v-btn>

    <v-spacer/>

    <v-menu bottom left v-if="show_in_menu">
      <template v-slot:activator="{ on }">
        <v-btn flat icon v-on="on">
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
        <v-list-tile>

          <v-btn flat icon @click="toggle_style" :disabled="!selected" class="ma-0">
            <v-icon>{{ style_icon }}</v-icon>
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
    <component ref="question"
               :is="problem.topic.question.type"
               v-bind="problem"
               :context="this"
               @next="next"/>
  </template>

  <!-- done -->

  <v-layout v-if="result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-img src="/app/static/images/happy.png" aspect-ratio="2.75"></v-img>

        <v-card-title primary-title>
          <div>
            <h3 class="headline mb-0">🎉 All done!</h3>
          </div>
        </v-card-title>

        <v-card-actions>
          <v-spacer></v-spacer>

            Er waren {{ result.questions }} vragen.<br>
            Daarvan zijn er {{ result.asked }} gesteld.<br>
            In {{ result.attempts }} pogingen, had je er {{ result.correct }} juist.<br>

            <template v-if="this.timer_active">
              Je deed dit in {{ result.elapsed }} seconden.<br>
            </template>

            <br>

          <v-spacer></v-spacer>
          <br><br>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "question_answer",
    text:    "Quiz",
    path:    "/quiz",
    index:   4
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
      console.debug("Quiz: resuming existing session");
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
    style_icon: function() {
      return this.multiplechoice ? "list" : "edit";
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
      console.debug("Quiz: sent session beacon (" + status + ")");
    },
    start: function() {
      var self = this;
      this.result = null;
      this.correct = 0;
      this.attempts = 0;
      this.asked_questions = [];

      // Start session tracking
      var topicIds = store.getters.selected_topics.map(function(topic) {
        return topic._id;
      });
      store.dispatch("startSession", { kind: "quiz", topics: topicIds })
        .then(function() {
          console.debug("Quiz: session started");
        })
        .catch(function(err) {
          console.error("Quiz: failed to start session", err);
        });

      store.dispatch("create_quiz");
      this.questions = store.getters.quiz.length;
      this.$refs.timer.start();
    },
    stop: function() {
      store.dispatch("clear_quiz");
      this.$refs.timer.stop();
      this.result = {
        kind: "quiz result",
        topics: store.getters.selected_topics.map(function(topic) { return topic._id; }),
        questions: this.questions,
        asked: this.asked,
        attempts: this.attempts,
        correct: this.correct,
        elapsed: this.$refs.timer.elapsed
      };

      // Stop session tracking (this is now the source of truth for feed)
      this.stopSession("completed");

      // Refresh stats after quiz
      store.dispatch("refreshAfterQuiz");
    },
    stopSession: function(status) {
      if (!store.getters.hasActiveSession) {
        return;
      }
      store.dispatch("stopSession", {
        status: status,
        questions: this.questions,
        asked: this.asked,
        attempts: this.attempts,
        correct: this.correct
      })
        .then(function() {
          console.debug("Quiz: session stopped (" + status + ")");
        })
        .catch(function(err) {
          console.error("Quiz: failed to stop session", err);
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
    toggle_style: function() {
      this.multiplechoice = !this.multiplechoice;
      this.reset();
    },
    next: function(success) {
      if (this.asked_questions.indexOf(this.problem) === -1) {
        this.asked_questions.push(this.problem);
      }

      this.attempts += 1;

      if (success) {
        this.correct += 1;
        store.commit("mark_correct");
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
      multiplechoice: true,
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

Navigation.add(Quiz);
