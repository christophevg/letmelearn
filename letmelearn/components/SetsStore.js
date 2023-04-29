store.registerModule("sets", {
  state: {
    sets: {
      "topic 1" : [],
      "topic 2" : [],
      "topic 3" : []
    },
    selected: null
  },
  getters: {
    set : function(state) {
      return function(name) {
        return state.sets.find(function(set) {
          return set.name == name;
        });
      }
    },
    topics: function(state) {
      return Object.keys(state.sets);
    }
  },
  actions: {
    load_sets: function(context) {
      $.ajax({
        type: "GET",
        url: "/api/sets",
        success: function(result) {
          context.commit("sets", result);
        },
        dataType: "json"
      });
    },
    clear: function(context) {
      context.commit("sets", []);
    }
  },
  mutations: {
    sets: function(state, new_sets) {
      Vue.set(state, "sets", new_sets);
    },
    selected_topic: function(state, selection) {
      Vue.set(state, "selected", selection);
    }
  }
});

Vue.component("TopicSelector", {
  template : `
    <v-select :items="topics"
              :hint="show_text"
              :persistent-hint="show"
              label="" v-model="selected"></v-select>
`,
  computed: {
    show: function() {
      return this.selected == null;
    },
    show_text: function() {
      return this.show ? "pick a topic" : "";
    },
    topics: function() {
      return store.getters.topics;
    },
    selected: {
      get() {
        return store.state.sets.selected;
      },
      set(selection) {
        return store.commit("selected_topic", selection);
      }
    }
  }
});
