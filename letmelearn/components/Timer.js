Vue.component("Timer", {
  props : [ "visible" ],
  template: `
<div>
  <!-- configuration dialog -->
  
  <v-dialog v-model="timing_dialog" persistent width="500px">
    <v-form>
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Timer settings...
        </v-card-title>

        <v-card-text>
          <v-text-field v-model="minutes" label="Minuten"></v-text-field>
        </v-card-text>

        <v-card-actions>
          <v-btn color="secondary" flat @click="minutes = null; timing_dialog = false;">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat @click="apply(); timing_dialog = false;">Set...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  <v-toolbar height="40" v-if="this.visible && this.seconds > 0">
    <v-toolbar-side-icon><v-icon>timer</v-icon></v-toolbar-side-icon>
    <v-progress-linear v-model="pct" buffer></v-progress-linear>
  </v-toolbar>
</div>
`,
  methods: {
    toggle_timing: function() {
      if(! this.minutes) {
        this.minutes       = 1;
        this.timing_dialog = true;
      } else {
        this.minutes = null;
        this.apply();
      }
    },
    apply: function() {
      this.$emit("changed", this.minutes);
      if(this.visible) {
        this.start();
      }
    },
    start: function() {
      if( this.seconds <= 0 ) {
        // we only start when there are a number of seconds selected
        return;
      }
      // set the number of seconds to count down and start the clock
      this.seconds_left = this.seconds;
      this.timeout_id = setTimeout(this.tick, 1000);
    },
    stop: function() {
      clearTimeout(this.timeout_id);
    },
    tick: function() {
      // the timer ticks every second using a timeout.
      // when there are still seconds left, it continues
      // when there are no more seconds left, the "done event" is emitted
      if( this.seconds_left > 0) {
        this.seconds_left--;
        this.timeout_id = setTimeout(this.tick, 1000);
      } else {
        this.$emit("done");
      }
    }
  },
  computed: {
    seconds: function() {
      return this.minutes * 60;
    },
    pct : function() {
      return Math.round( (this.seconds_left / this.seconds) * 100 );
    },
    elapsed: function() {
      return this.seconds - this.seconds_left;
    }
  },
  data: function() {
    return {
      timeout_id: null,
      timing_dialog: false,
      minutes: 0,
      seconds_left: 0
    }
  }
});
