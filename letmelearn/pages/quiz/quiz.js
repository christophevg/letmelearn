var Quiz = {
  template: `
<ProtectedPage>
  
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
 
    <v-btn flat icon @click="toggle_style" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>{{ style_icon }}</v-icon>
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
            Daarvan zijn er {{ asked }} gesteld.<br>
            In {{ attempts }} pogingen, had je er {{ correct }} juist.<br>

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
    show_in_menu: function() {
      return this.$vuetify.breakpoint.name == "xs";
    },
    selected: function() {
      return store.state.topics.selected.length > 0;
    },
    playing: function() {
      return store.state.topics.quiz.length > 0;
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
      return this.selected ? store.getters.selected_items.length : 0;
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
    start : function() {
      this.done = false;
      this.correct = 0;
      this.attempts = 0;
      this.asked_questions = []
      store.dispatch("create_quiz");
      this.questions = store.state.topics.quiz.length;
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
      if(this.problem) { this.reset(); }
    },
    swap : function() {
      this.right2left = !this.right2left;
      this.reset();
    },
    toggle_style: function() {
      this.multiplechoice = !this.multiplechoice;
      this.reset();
    },
    next: function(success) {
      if(this.asked_questions.indexOf(this.problem) === -1) {
        this.asked_questions.push(this.problem);
      }

      this.attempts += 1;

      if(success) {
        this.correct += 1;
        store.commit("mark_correct");
      } else {
        store.commit("mark_incorrect");        
      }

      // no next question?
      if( ! this.problem ) {
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
      timer_active: false
    }
  }
};

Navigation.add(Quiz);
