store.registerModule("topics", {
  state: {
    topics  : [],
    selected: null,
    quiz    : []
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
    },
    shuffled : function(state) {
      return function(topic, value2key) {
        return topic.items.map(function(item){
          var key   = value2key ? item.value : item.key,
              value = value2key ? item.key   : item.value,
              take  = value2key ? "keys"     : "values";
          return {
            key    : key,
            value  : value,
            choices: store.getters.random(topic, take, 2, value)
                                  .concat([value])
                                  .sort(()=>Math.random()-0.5)
          };
        }).sort(() => Math.random() - 0.5);
      }
    },
    random: function(state) {
      return function(topic, take, amount, excluding) {
        return topic.items.map(function(item){
          return take == "values" ? item.value : item.key;
        })
        .filter(function(item) { return item != excluding; })
        .sort(() => Math.random() - 0.5).slice(0, amount);
      }
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
            // adopt hash
            if(window.location.hash) {
              var t = context.getters.topic(window.location.hash.substring(1));
              context.commit("selected_topic", t);
            }
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
    },
    update_item: function(context, updating) {
      $.ajax({
        type: "PATCH",
        url: "/api/topics/" + updating.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(updating.update),
        success: function(result) {
          context.commit("updated_item", updating);
        }
      });      
    },
    delete_item: function(context, removing) {
      $.ajax({
        type: "PATCH",
        url: "/api/topics/" + removing.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(removing.removal),
        success: function(result) {
          context.commit("removed_item", removing);
        }
      });      
    },
    create_quiz: function(context, config) {
      context.commit("quiz", context.getters.shuffled(config.topic, config.value2key));
    },
    clear_quiz: function(context, topic) {
      context.commit("quiz", []);
    }
  },
  mutations: {
    topics: function(state, new_topics) {
      Vue.set(state, "topics", new_topics);
    },
    selected_topic: function(state, selection) {
      Vue.set(state, "selected", selection);
      window.location.hash = selection._id;
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
    },
    updated_item: function(state, updated) {
      var item = state.topics.find(function(topic) {
        return topic._id == updated.topic._id;
      }).items.find(function(item){
        return item.key == updated.update.original.key;
      });
      Vue.set(item, "key",   updated.update.key);
      Vue.set(item, "value", updated.update.value);
    },
    removed_item: function(state, removed) {
      var topic = state.topics.find(function(topic) {
        return topic._id == removed.topic._id;
      })
      topic.items = topic.items.filter(function(item){
        return item.key != removed.removal.key;
      });
    },
    quiz: function(state, new_quiz) {
      Vue.set(state, "quiz", new_quiz);
    },
    mark_correct: function(state) {
      state.quiz.shift();
    },
    mark_incorrect: function(state) {
      state.quiz.push(state.quiz.shift())
    }
  }
});

Vue.component("TopicSelector", {
  template : `
    <v-select :items="topics"
              :hint="hint_text"
              :persistent-hint="show_hint"
              label=""
              @change="changed_topic"
              v-model="selected"></v-select>
`,
  methods: {
    changed_topic: function() {
      console.log("changed topic");
      this.$emit("change", store.state.topics.selected);
    }
  },
  computed: {
    show_hint: function() {
      return this.selected == null;
    },
    hint_text: function() {
      return this.show_hint ? "pick a topic" : "";
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
