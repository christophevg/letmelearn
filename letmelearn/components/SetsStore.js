store.registerModule("sets", {
  state: {
    sets: [],
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
      return state.sets.map(function(item) {
        return item._id;
      });
    }
  },
  actions: {
    load_sets: function(context) {
      if(context.getters.topics.length < 1) {
        $.ajax({
          type: "GET",
          url: "/api/sets",
          success: function(result) {
            context.commit("sets", result);
          },
          dataType: "json"
        });
      }
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
  mounted: function() {
    store.dispatch("load_sets");
  },
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
