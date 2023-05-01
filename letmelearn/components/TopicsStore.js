store.registerModule("topics", {
  state: {
    topics: [],
    selected: null
  },
  getters: {
    topic : function(state) {
      return function(name) {
        return state.topics.find(function(topic) {
          return topic.name == name;
        });
      }
    },
    topics: function(state) {
      return state.topics.map(function(item) {
        return item._id;
      });
    }
  },
  actions: {
    load_topics: function(context) {
      if(context.getters.topics.length < 1) {
        $.ajax({
          type: "GET",
          url: "/api/topics",
          success: function(result) {
            context.commit("topics", result);
          },
          dataType: "json"
        });
      }
    },
    clear: function(context) {
      context.commit("topics", []);
    }
  },
  mutations: {
    topics: function(state, new_topics) {
      Vue.set(state, "topics", new_topics);
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
    store.dispatch("load_topics");
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
        return store.state.topics.selected;
      },
      set(selection) {
        return store.commit("selected_topic", selection);
      }
    }
  }
});
