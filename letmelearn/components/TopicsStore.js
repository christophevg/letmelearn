store.registerModule("topics", {
  state: {
    topics: [],
    selected: null
  },
  getters: {
    topic : function(state) {
      return function(id) {
        return state.topics.find(function(topic) {
          return topic._id == id;
        });
      }
    },
    topics: function(state) {
      return state.topics.map(function(topic) {
        return { "text" : topic.name, "value" : topic }
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
            console.log("loaded topics", result);
            context.commit("topics", result);
          },
          dataType: "json"
        });
      }
    },
    clear: function(context) {
      context.commit("topics", []);
    },
    update_topic: function(context, topic) {
      $.ajax({
        type: "PUT",
        url: "/api/topics/" + topic._id,
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          name : topic.name,
          items: topic.items
        }),
        success: function(result) {
          context.commit("updated_topic", result);
        }
      });
    },
    create_topic: function(context, topic) {
      $.ajax({
        type: "POST",
        url: "/api/topics",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          name : topic.name,
          items: topic.items
        }),
        success: function(new_topic) {
          context.commit("new_topic", new_topic);
          if(topic.handler) { topic.handler(new_topic); }
        }
      });
    },
    remove_topic: function(context, topic) {
      $.ajax({
        type: "DELETE",
        url: "/api/topics/" + topic._id,
        success: function(result) {
          context.commit("removed_topic", topic);
        }
      });
    },
    add_item: function(context, adding) {
      $.ajax({
        type: "POST",
        url: "/api/topics/" + adding.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(adding.item),
        success: function(result) {
          context.commit("added_item", adding);
        }
      });
    }
  },
  mutations: {
    topics: function(state, new_topics) {
      Vue.set(state, "topics", new_topics);
    },
    selected_topic: function(state, selection) {
      Vue.set(state, "selected", selection);
    },
    updated_topic: function(state, updated) {
      var new_topic = null;
      var new_topics = state.topics.map(function(topic) {
        if(topic._id == updated._id) {
          new_topic = Object.assign({}, topic, updated);
          return new_topic;
        }
        return topic;
      });
      Vue.set(state, "topics", new_topics);
      if(state.selected._id == updated._id) {
        Vue.set(state, "selected", new_topic);
      }
    },
    new_topic: function(state, new_topic) {
      state.topics.push(new_topic);
      console.log("appended", state.topics);
    },
    removed_topic: function(state, removed) {
      state.topics = state.topics.filter(function(topic){
        return topic._id != removed._id;
      })
      if(state.selected._id == removed._id) {
        Vue.set(state, "selected", null);
      }
    },
    added_item: function(state, added) {
      state.topics.find(function(topic) {
        return topic._id == added.topic._id;
      }).items.push(added.item);
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
