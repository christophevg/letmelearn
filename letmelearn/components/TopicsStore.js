store.registerModule("topics", {
  state: {
    topics  : [],
    selected: [],
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
			return state.topics;
    },
    selected_hash: function(state) {
      return state.selected.map(function(topic){ return topic._id; }).join(";");
    },
		selected_items: function(state) {
			return state.selected.reduce(function(all_items, topic) {
				all_items.push(...topic.items);
				return all_items;
			}, []);
		},
    shuffled : function(state, getters) {
      return function(value2key) {
        return getters.selected_items.map(function(item){
          var key   = value2key ? item.value : item.key,
              value = value2key ? item.key   : item.value,
              take  = value2key ? "keys"     : "values";
          return {
            key    : key,
            value  : value,
            choices: store.getters.random(take, 2, value)
                                  .concat([value])
                                  .sort(()=>Math.random()-0.5)
          };
        }).sort(() => Math.random() - 0.5);
      }
    },
    random: function(state, getters) {
      return function(take, amount, excluding) {
        return getters.selected_items.map(function(item){
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
              var topic_ids = window.location.hash.substring(1);
							var topics = topic_ids.split(";").map(function(id){
								return store.getters.topic(id);
							});
              context.commit("selected_topic", topics);
            }
          },
          dataType: "json"
        });
      }
    },
    clear: function(context) {
      context.commit("topics", []);
    },
    update_topic: function(context, updating) {
      $.ajax({
        type: "PATCH",
        url: "/api/topics/" + updating.topic._id,
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(updating.update),
        success: function(result) {
          context.commit("updated_topic", updating);
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
    create_quiz: function(context, value2key) {
      context.commit("quiz", context.getters.shuffled(value2key));
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
      window.location.hash = selection.map(function(topic){
      	if( topic && topic._id ) {
          return topic._id;
        }
        return null;
      }).filter(function(topic) { return topic != null; }).join(";");
    },
    updated_topic: function(state, updated) {
      var new_topic = null;
      var new_topics = state.topics.map(function(topic) {
        if(topic._id == updated.topic._id) {
          new_topic = Object.assign({}, topic, updated.update);
          return new_topic;
        }
        return topic;
      });
      Vue.set(state, "topics", new_topics);
      state.selected = state.selected.map(function(selected){
        if(selected._id == updated.topic._id) {
          return new_topic;
        }
        return selected;
      });
    },
    new_topic: function(state, new_topic) {
      state.topics.push(new_topic);
    },
    removed_topic: function(state, removed) {
			// filter from all topics
      state.topics = state.topics.filter(function(topic){
        return topic._id != removed._id;
      });
			// filter from selected topics
			state.selected = state.selected.filter(function(topic){
				return topic._id != removed._id;
			});
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
	props: {
		multiple: Boolean,
		tags: Boolean
	},
  template : `
    <v-select v-if="simple_selection"
							v-model="single_selection"
							:items="topics"
							item-value="_id"
							item-text="name"
              :hint="hint_single_topic"
              :persistent-hint="show_single_hint"
              label=""
              @change="changed_topic"
		></v-select>
    <v-select v-else
							v-model="multiple_selection"
							:items="topics"
							item-value="_id"
							item-text="name"
              :hint="hint_multiple_topic"
              chips
              multiple
              dense
              :persistent-hint="show_multiple_hint"
              label=""
              @change="changed_topic"
		>
    <template v-slot:selection="{ item, index }">
      <v-chip close @input="remove_selected_topic(item);">
        <span>{{ item.name }}</span>
      </v-chip>
    </template>
  </v-select>
`,
  methods: {
    changed_topic: function() {
      this.$emit("change", store.state.topics.selected);
    },
    remove_selected_topic: function(removed) {
      this.multiple_selection = this.multiple_selection.filter(function(key){
        return key != removed._id;
      });
    }
  },
  computed: {
		simple_selection: function() {
			return ! this.multiple && ! this.tags;
		},
    show_single_hint: function() {
      return this.single_selection == null;
    },
    show_multiple_hint: function() {
      return this.multiple_selection.length == 0;
    },
    hint_single_topic: function() {
      return this.show_single_hint ? "kies een topic" : "";
    },
    hint_multiple_topic: function() {
      return this.show_multiple_hint ? "kies één of meerdere topics" : "";
    },
    topics: function() {
      return store.getters.topics;
    },
    multiple_selection: {
      get() {
        return store.state.topics.selected.map(function(item) { return item._id });
      },
      set(selection) {
        return store.commit("selected_topic", selection.map(function(key){ return store.getters.topic(key)}));
      }
    },
    single_selection: {
      get() {
        return store.state.topics.selected.length == 1 ? store.state.topics.selected[0]._id : null;
      },
      set(selection) {
        return store.commit("selected_topic", [store.getters.topic(selection)]);
      }
    }
		
  }
});
