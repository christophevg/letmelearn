store.registerModule("topics", {
  state: {
    _question_types     : [],     // all known question types
    _topics             : [],     // all known topics
    _treeitems          : [],     // nested tree structure (folders and topics)
    _selected_treeitems : [],     // selected treeitems (folders and topics)
    _open_folders       : [],     // opened folders
    _quiz               : [],     // shuffled items from all selected topics
    _count              : 0       // to force shuffling
  },
  getters: {
    question_types: function(state) {
      return state._question_types;
    },
    question_type: function(state, getters) {
      return function(name) {
        return getters.question_types.find(function(question) {
          return question.name == name;
        });        
      }
    },

    item: function(state, getters) {
      return function(id) {
        return getters.folder(id) || getters.topic(id);
      }
    },

    treeitems: function(state) {
      return state._treeitems;
    },
    folders: function(state, getters) {
      // use JSON to deepcopy
      const folders_only = JSON.parse(JSON.stringify(getters.treeitems));
      function recurse(items) {
        // prune this list
        items = items.filter(function(item) { return "children" in item });
        // recurse down in all children, pruning them
        for(const item of items) {
          item.children = recurse(item.children);
        }
        return items;
      }
      return recurse(folders_only);
    },

    folder : function(state, getters) {
      // given an id, returns the folder object
      return function(id) {
        function recurse(items) {
          for(const item of items) {
            if( "children" in item && item.id == id ) {
              return item;
            }
            if( item.children ) {
              const lower = recurse(item.children);
              if(lower) { return lower; }
            }
          }
          return null;
        }
        return recurse(getters.folders);
      }
    },
    path : function(state, getters) {
      // given an id, returns the list of folder objects that make up the path
      return function(id) {
        function recurse(items, path) {
          for(const item of items) {
            if( "children" in item && item.id == id ) {
              return path.concat([item]);
            }
            if( item.children ) {
              const lower = recurse(item.children, path.concat([item]));
              if(lower) { return lower; }
            }
          }
          return null;
        }
        return recurse(getters.folders, []);
      }
    },

    open_folders: function(state) {
      return state._open_folders;
    },
    
    folder_of: function(state, getters) {
      // given the id of a topic, returns the the folder it is stored in
      return function(id) {
        function recurse(items, folder) {
          for(const item of items) {
            if( item.id == id ) {
              return folder;
            }
            if(item.children) {
              const lower = recurse(item.children, item);
              // only return if not null, to continue searching other children
              if(lower) { return lower; }
            }
          }
          return null;
        }
        return recurse(getters.treeitems, null);
      }
    },

    topics: function(state) {
			return state._topics;
    },
    topic : function(state, getters) {
      return function(id) {
        return getters.topics.find(function(topic) {
          return topic._id == id;
        });
      }
    },

    selected_treeitems : function(state, getters) {
      return state._selected_treeitems;
    },

    selected_topics: function(state, getters) {
      // expands the list of selected topics to include their folder
      return state._selected_treeitems
        .filter(function(item) { return item && !("children" in item )})
        .map(function(topic){
          return {
            _id     : topic._id,
            name    : topic.name,
            question: topic.question,
            tags    : topic.tags || [],
            items   : topic.items,
            folder  : getters.folder_of(topic._id)
          }
        });
    },

    selected_hash: function(state, getters) {
      return getters.selected_topics.map(function(topic){ return topic._id; }).join(";");
    },
		all_selected_items: function(state, getters) {
      // return flat list of all items (an item is a question/answer pair)
      // along with their parent-topic
      // this is needed because multiple topics can be selected, resulting in
      // a list of all their items
			return getters.selected_topics.reduce(function(all_items, topic) {
        all_items.push(...topic.items.map(function(item){
          return {
            topic    : {
              _id      : topic._id,
              name     : topic.name,
              question : topic.question,
              tags     : topic.tags
            },
            item     : item
          } 
        }));
				return all_items;
			}, []);
		},
    quiz: function(state) {
      return state._quiz;
    },
    shuffled : function(state, getters) {
      state._count; // forces recompute
      // spread it to avoid selected_items to be sorted
      return [...getters.all_selected_items].sort(() => Math.random() - 0.5);
    },
    current_question(state) {
      if(state._quiz[0]) { return state._quiz[0]}
      return null
    }
  },
  actions: {
    
    // FOLDER ACTIONS
    
    load_folders: function(context) {
      if(context.getters.folders.length < 1) {
        api("GET", "folders", function(treeitems) {
          context.commit("treeitems", treeitems);
        }, );
      }      
    },
    
    create_folder: function(context, folder) {
      api( "POST",`folders/${folder.path}`, function(treeitems) {
        context.commit("treeitems", treeitems);
      }, { name: folder.name });
    },

    delete_folder: function(context, folder) {
      api( "DELETE", `folders/${folder}`, function(treeitems) {
        context.commit("treeitems", treeitems);
      });
    },
    
    // TOPIC ACTIONS
    
    load_topics: function(context) {
      if(context.getters.topics.length < 1) {
        api( "GET", "topics", function(topics) {
          context.commit("topics", topics);
          // adopt hash for selection
          if(window.location.hash) {
            var topics = window.location.hash.substring(1).split(";")
						  .map   (function(id)    { return store.getters.topic(id); })
              .filter(function(topic) { return topic; });
            context.commit("selected_items", topics);
          }
        });
      }
    },
    update_topic: function(context, updating) {
      api( "PATCH", `topics/${updating.topic._id}`, function(result) {
        context.commit("updated_topic", result.topic);
        context.commit("treeitems",     result.treeitems);
      }, updating.update);
    },
    create_topic: function(context, topic) {
      api( "POST", "topics", function(new_topic) {
        context.commit("new_topic", new_topic);
        store.dispatch("add_feed_item", {
          "kind" : "new topic",
          "topic" : new_topic["_id"]
        });
        if(topic.handler) { topic.handler(new_topic); }
      },
      {
        name    : topic.name,
        question: topic.question
      })
    },
    remove_topic: function(context, topic) {
      api( "DELETE", `topics/${topic._id}`, function(result) {
        context.commit("removed_topic", topic);
        context.commit("treeitems",     result.treeitems);
        context.commit("new_feed",      result.feed);
      });
    },

    // ITEM ACTIONS

    add_item: function(context, adding) {
      api( "POST", `topics/${adding.topic._id}/items`, function(result) {
        context.commit("added_item", adding);
      }, adding.item);
    },
    update_item: function(context, updating) {
      api( "PATCH", `topics/${updating.topic._id}/items`, function(result) {
        context.commit("updated_item", updating);
      },
      {
        original: updating["original"],
        update: updating["update"]
      });
    },
    delete_item: function(context, removing) {
      api( "DELETE", `topics/${removing.topic._id}/items`, function(result) {
        context.commit("removed_item", removing);
      }, removing.removal);
    },
    
    // QUIZ ACTIONS
    
    create_quiz: function(context) {
      // spread it to ensure a clean/local quiz list
      context.commit("quiz", [...context.getters.shuffled]);
    },
    clear_quiz: function(context, topic) {
      context.commit("quiz", []);
    }
  },
  mutations: {
    question_type: function(state, new_question) {
      // register a question type to the known questions
      state._question_types.push(new_question);
    },
    
    treeitems: function(state, new_items) {
      // import a new set of treeitems, including leafs with a topic id
      Vue.set(state, "_treeitems", new_items);
    },
    open_folders: function(state, selection) {
      Vue.set(state, "_open_folders", selection);
    },
    
    topics: function(state, new_topics) {
      // import a new set of topics, adding default tags if needed
      Vue.set(state, "_topics", new_topics.map(function(topic){
        if(!topic.tags) { topic.tags = []; }
        return topic;
      }));
    },
    new_topic: function(state, new_topic) {
      // add a new topic
      state._topics.push(new_topic);
    },

    selected_items: function(state, selection) {
      Vue.set(state, "_selected_treeitems", selection);      
      // update hash to reflect current state
      // only valid topics
      window.location.hash = selection
      .filter(function(item) { return item && !("children" in item)})
      .map(function(topic){
      	if( topic && topic._id ) {
          return topic._id;
        }
        return null;
      }).filter(function(topic) { return topic != null; }).join(";");
    },

    updated_topic: function(state, updated) {
      var new_topic = null;
      var new_topics = state._topics.map(function(topic) {
        if(topic._id == updated._id) {
          new_topic = Object.assign({}, topic, updated);
          return new_topic;
        }
        return topic;
      });
      Vue.set(state, "_topics", new_topics);
      state._selected_treeitems = state._selected_treeitems.map(function(selected){
        if(selected._id == updated._id) {
          return new_topic;
        }
        return selected;
      });
    },
    removed_topic: function(state, removed) {
			// filter from all topics
      state._topics = state._topics.filter(function(topic){
        return topic._id != removed._id;
      });
			// filter from selected topics
			state._selected_treeitems = state._selected_treeitems.filter(function(topic){
				return topic._id != removed._id;
			});
      // TODO: clean up window.hash
    },
    added_item: function(state, added) {
      state._topics.find(function(topic) {
        return topic._id == added.topic._id;
      }).items.push(added.item);
    },
    updated_item: function(state, updated) {
      var item = state._topics.find(function(topic) {
        return topic._id == updated.topic._id;
      }).items.find(function(item){
        return JSON.stringify(item) == JSON.stringify(updated.original);
      });
      Object.keys(item).map(function(prop) {
        Vue.set(item, prop, updated.update[prop]);
      });
    },
    removed_item: function(state, removed) {
      var topic = state._topics.find(function(topic) {
        return topic._id == removed.topic._id;
      })
      topic.items = topic.items.filter(function(item){
        return JSON.stringify(item) != JSON.stringify(removed.removal);
      });
    },
    quiz: function(state, new_quiz) {
      Vue.set(state, "_quiz", new_quiz);
      state._count++;
    },
    mark_correct: function(state) {
      state._quiz.shift();
    },
    mark_incorrect: function(state) {
      state._quiz.push(state._quiz.shift())
    }
  }
});
