var Quiz = {
  template: `
<ProtectedPage>
  
  <!-- toolbar -->
  
  <template v-slot:subheader>
      <v-layout row wrap class="pa-0 ma-0">

        <v-flex xs12 sm7 md6 d-flex align-center>
          <TopicSelector @change="change_topic" multiple tags/>
        </v-flex>

        <v-flex xs12 sm5 md6 d-flex align-center>
          <v-btn flat icon @click="start" :disabled="!selected || playing" class="ma-0">
            <v-icon>play_arrow</v-icon>
          </v-btn>
          <v-btn flat icon @click="toggle_timing" :disabled="!selected" class="ma-0">
            <v-icon>{{ timing_icon }}</v-icon>
          </v-btn>
          <v-btn flat icon @click="stop" :disabled="!playing" class="ma-0">
            <v-icon>stop</v-icon>
          </v-btn>
          <v-btn flat icon @click="reset" :disabled="!playing" class="ma-0">
            <v-icon>replay</v-icon>
          </v-btn>
          <v-btn flat icon @click="swap" :disabled="!selected" class="ma-0">
            <v-icon>{{ direction_icon }}</v-icon>
          </v-btn>
          <v-btn flat icon @click="toggle_style" :disabled="!selected" class="ma-0">
            <v-icon>{{ style_icon }}</v-icon>
          </v-btn>
        </v-flex>

      </v-layout>
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

  <template v-if="current_question">
    <component :is="current_question.type"
                v-bind="current_question.props"
                :context="this"
                @next="next_question"/>
  </template>

  <!-- done -->

  <v-layout v-if="done">
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
            
            Er waren {{ questions }} vragen.<br>
            Daarvan zijn er {{ asked_keys.length }} gesteld.<br>
            In {{ tries }} pogingen, had je er {{ correct }} juist.<br>

            <template v-if="this.timer_active">
              Je deed dit in {{ this.$refs.timer.elapsed }} seconden.<br>
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
    index:   3
  },
  mounted: function() {
    if(! this.selected ) { return }
    var expected_hash = store.getters.selected_hash
    if( window.location.hash.substring(1) != expected_hash ){
      window.location.hash = expected_hash;
    }
  },
  computed: {
    selected: function() {
      return store.state.topics.selected.length > 0;
    },
    playing: function() {
      return store.state.topics.quiz.length > 0;
    },
    direction_icon: function() {
      return this.value2key ? "arrow_back" : "arrow_forward";
    },
    style_icon: function() {
      return this.multiplechoice ? "list" : "edit";
    },
    timing_icon: function() {
      return this.timer_active ? "timer_off" : "timer";
    },
    items_count: function() {
      return this.selected ? store.getters.selected_items.length : 0;
    },
    pct_asked: function() {
      return (this.asked / this.items_count) * 100;
    },
    pct_correct: function() {
      return (this.correct / this.items_count) * 100;
    },
    question: function() {
      return store.state.topics.quiz[0];
    },
    current_question: function() {
      if(! this.question ) { return null; }
      return {
        type : "BasicQuestion",
        props: {
          question: this.question.key,
          expected: this.question.value,
          choices:  this.question.choices
        }
      }
    },
    asked: function() {
      return Object.keys(this.asked_keys).length;
    }
  },
  methods: {
    start : function() {
      this.done = false;
      this.result = false;
      this.correct = 0;
      this.tries = 0;
      this.asked_keys = []
      store.dispatch("create_quiz", this.value2key);
      this.questions = store.state.topics.quiz.length;
      if( !this.multiplechoice ) {
        setTimeout(() => {
          this.$refs.written.focus();
        }, 200);
      }
      this.$refs.timer.start();
    },
    stop : function() {
      store.dispatch("clear_quiz");
      this.$refs.timer.stop();
      this.done = true;
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
    reset : function() {
      this.stop();
      this.start();
    },
    change_topic: function(new_topic) {
      if(this.question) { this.reset(); }
    },
    swap : function() {
      this.value2key = !this.value2key;
      this.reset();
    },
    toggle_style: function() {
      this.multiplechoice = !this.multiplechoice;
      this.reset();
    },
    next_question: function(result) {
      if(this.asked_keys.indexOf(this.question.key) === -1) {
        this.asked_keys.push(this.question.key);
      }

      this.tries += 1;

      if(result.correct) {
        this.correct += 1;
        store.commit("mark_correct");
      } else {
        store.commit("mark_incorrect");        
      }

      // no next question?
      if( ! this.question ) {
        this.stop();
      }
    },
  },
  data: function() {
    return {
      value2key: false,
      multiplechoice: true,
      questions: 0,
      tries: 0,
      correct: 0,
      done: false,
      asked_keys: [],
      timer_active: false
    }
  }
};

Navigation.add(Quiz);
