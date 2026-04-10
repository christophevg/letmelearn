Vue.component("AdvalvasUpdates", {
  template: `
<div>
	<h2 style="border-bottom: 1px solid #ddd">📣 Nieuwigheden</h2>

	<br>

	<v-card v-for="(item, index) in news" :key="index" style="margin-bottom: 10px;">
    <v-layout row>
      <v-flex xs7>
        <v-card-title primary-title>
          <div>
            <div class="headline" v-html="item.title"/>
						<div class="grey--text">{{ item.date }}</div>
            <p v-for="par in item.pars" v-html="par"/>
          </div>
        </v-card-title>
      </v-flex>
      <v-flex xs5>
				<div style="padding:15px">
          <v-img :src="'/app/static/images/news/' + item.image"
                 :height="item.height ? item.height : '125px'"
                  contain/>
				</div>
      </v-flex>
    </v-layout>
  </v-card>

</div>
`,
  data: function() {
    return {
      news: [
        {
          title: "Streaks!",
          date: "8 april 2026",
          pars: [
            `Oefen elke dag gedurende 15 minuten en zie je LetMeLearn Streaks opbouwen!`
          ],
          image: "streaks.png"
        },
        {
          title: "Folders voor Topics",
          date: "1 mei 2025",
          pars: [
            `De selectielijst voor Topics is niet meer. Je kan nu een hele boomstructuur aan folders maken om al je topics overzichtelijk in te bewaren.`
          ],
          image: "folders.png"
        },
        {
          title: "Archiveer Topics...",
          date: "18 september 2024",
          pars: [
            `Door middel van een nieuw knopje, kan je nu topics archiveren. Daardoor verdwijnen ze uit de topic lijst. Geen zorgen, ze blijven bewaard en zijn met een kleine handeling terug te voorschijn te toveren.`
          ],
          image: "archive.png"
        },
        {
          title: "Click om verder te gaan...",
          date: "1 juni 2024",
          pars: [
            `Klein maar fijn. Bij multiple choise vragen, kan je nu ook gewoon op het juiste antwoord klikken om verder te gaan en moet je niet meer helemaal naar de "Next..." knop.`
          ],
          image: "double-click-next.png"
        },
        {
          title: "Train met Flash Cards",
          date: "20 november 2023",
          pars: [
            `Naast Quizes, kan je nu ook al je onderwerpen <router-link to="/training">inoefenen</router-link> met "flash cards!". Hierbij krijg je de vraag te zien en kan je zelf kijken naar het antwoord op de achterzijde, en bepalen of je het nog eens opnieuw wil proberen of dat je het wel kent.`
          ],
          image: "flashcards.gif"
        },
        {
          title: "Jouw Feed",
          date: "9 november 2023",
          pars: [
            `Ad Valvas toont je vanaf nu ook jouw resultaten in jouw eigen feed!`,
            `Stay tuned for more...`
          ],
          image: "feed.png"
        },
        {
          title: "Nieuwe vraagstelling: Invullen!<br>En onderwerpen zijn aanpasbaar 🥳",
          date: "6 november 2023",
          pars: [
            `Naast de reeds bestaande eenvoudige vraagstelling. Kan je nu ook
             kiezen voor een invulbare vraag. Hierbij moet je ergens in de
             vraag één of meerdere juiste antwoorden invullen uit een lijst
             van mogelijkheden.`,
            `Je kan vanaf nu ook je bestaande onderwerpen aanpassen. Zo kan je
             de naam aanpassen en ook je eigen titels voor eigenschappen van de
             vragen aanpassen. Dus je kan bv. kiezen voor de omschrijving "FR"
             of "NL" ipv "Key" en "Value".`
          ],
          image: "new-question-type.png",
          height: "275px"
        },
        {
          title: "Foutaanduiding",
          date: "15 oktober 2023",
          pars: [
            ` Als je de antwoorden intypt en je maakt een foutje, krijg je
              vanaf nu een visuele aanduiding van wat er fout was.`
          ],
          image: "diffs.png"
        },
        {
          title: "Timer!",
          date: "1 oktober 2023",
          pars: [
            `Met de nieuwe timer functie, kan je nu tegen de tijd oefenen.
             Of gewoon exact de tijd oefenen dat je <i>moest</i> 😇`
          ],
          image: "timer.png"
        },
        {
          title: "Meerdere topics per quiz",
          date: "25 september 2023",
          pars: [
            `Je kan vanaf nu meerdere topics selecteren om een quiz te doen.`
          ],
          image: "multiple-topics.png"
        },
        {
          title: "Meerdere goede antwoorden",
          date:  "25 september 2023",
          pars: [
            `Je kan vanaf nu meerdere goede antwoorden voorzien door deze te
		         scheiden door middel van een verticale streep, een zogenaamd
		         "pipe"-symbool: "|".`
          ],
          image: "multiple-possible-answers.png"
        }
      ]
    }
  }
});

Vue.component("AdvalvasFeedQuizResult", {
  props : [ "item" ],
  template: `
  <v-list-tile-content v-if="topics.length > 0 && topics.every((i)=>i!==undefined)">
    <v-list-tile-title><b>{{ result }} Resultaat</b></v-list-tile-title>
    <v-list-tile-sub-title class="text--primary">
      onderwerp{{ topics.length < 2 ? "" : "en" }}:
      <template v-for="topic, index in topics">
        <router-link :to="'/topics#'+topic._id">{{ topic.name}}</router-link>
        <span v-if="index < topics.length - 1">,&nbsp;</span>
      </template>
      &nbsp;<router-link :to="'/quiz#' + topics.map((t)=>t._id).join(';')" style="text-decoration:none">▶️</router-link>
    </v-list-tile-sub-title>

    <v-list-tile-sub-title>
      {{ item.questions }} vragen |
      {{ item.asked }} gevraagd |
      {{ item.attempts }} pogingen |
      {{ item.correct }} correct
      <span v-if="item.elapsed"> | in {{ item.elapsed }}s</span>
    </v-list-tile-sub-title>
 </v-list-tile-content>
 <v-list-tile-content v-else>
    <v-list-tile-title><b>Whoops: 😢</b></v-list-tile-title>
    <v-list-tile-sub-title class="text--primary">
      Daar is iets verdwenen.
    </v-list-tile-sub-title>
 </v-list-tile-content>
`,
  computed: {
    topics: function() {
      if (!this.item.topics || !Array.isArray(this.item.topics)) {
        return [];
      }
      return this.item.topics.map(function(t) {
        // Handle both cases: object with _id and name, or just an ID string
        if (typeof t === "object" && t._id && t.name) {
          return t;
        }
        return store.getters.topic(t);
      });
    },
    result: function() {
      if(this.item.questions == this.item.asked) {     // all questions asked
        if(this.item.correct == this.item.attempts ) { // all correct on 1st try
          return "🥇";
        } else {
          return "🥈";
        }
      } else {
        return "🥉";
      }
    }
  }
});

Vue.component("AdvalvasFeedTraining", {
  props : [ "item" ],
  template: `
  <v-list-tile-content v-if="topics.length > 0 && topics.every((i)=>i!==undefined)">
    <v-list-tile-title><b>{{ result }} Training</b></v-list-tile-title>
    <v-list-tile-sub-title class="text--primary">
      onderwerp{{ topics.length < 2 ? "" : "en" }}:
      <template v-for="topic, index in topics">
        <router-link :to="'/topics#'+topic._id">{{ topic.name}}</router-link>
        <span v-if="index < topics.length - 1">,&nbsp;</span>
      </template>
      &nbsp;<router-link :to="'/training#' + topics.map((t)=>t._id).join(';')" style="text-decoration:none">▶️</router-link>
    </v-list-tile-sub-title>

    <v-list-tile-sub-title>
      {{ item.questions }} vragen |
      {{ item.asked }} gevraagd |
      {{ item.attempts }} pogingen |
      {{ item.correct }} correct
      <span v-if="item.elapsed"> | in {{ item.elapsed }}s</span>
    </v-list-tile-sub-title>
 </v-list-tile-content>
 <v-list-tile-content v-else>
    <v-list-tile-title><b>Whoops: 😢</b></v-list-tile-title>
    <v-list-tile-sub-title class="text--primary">
      Daar is iets verdwenen.
    </v-list-tile-sub-title>
 </v-list-tile-content>
`,
  computed: {
    topics: function() {
      if (!this.item.topics || !Array.isArray(this.item.topics)) {
        return [];
      }
      return this.item.topics.map(function(t) {
        // Handle both cases: object with _id and name, or just an ID string
        if (typeof t === "object" && t._id && t.name) {
          return t;
        }
        return store.getters.topic(t);
      });
    },
    result: function() {
      if(this.item.questions == this.item.asked) {     // all questions asked
        if(this.item.correct == this.item.attempts ) { // all correct on 1st try
          return "🙌";
        } else {
          return "💪";
        }
      } else {
        return "👏";
      }
    }
  }
})

Vue.component("AdvalvasFeedNewTopic", {
  props: [ "item" ],
  template: `
 <v-list-tile-content v-if="topic && topic._id">
   <v-list-tile-title><b>🆕 Nieuw onderwerp</b></v-list-tile-title>
   <v-list-tile-sub-title class="text--primary">
      <router-link :to="'/topics#'+ topic._id">{{ topic.name }}</router-link>
      &nbsp;<router-link :to="'/quiz#' + topic._id" style="text-decoration:none">▶️</router-link>

   </v-list-tile-sub-title>
   <v-list-tile-sub-title v-if="topic.question">
      Stijl: {{ topic.question.type }} |
      {{ topic.items.length }} {{ topic.items.length < 2 ? "vraag" : "vragen" }}
   </v-list-tile-sub-title>
</v-list-tile-content>
 <v-list-tile-content v-else>
    <v-list-tile-title><b>Whoops: 😢</b></v-list-tile-title>
    <v-list-tile-sub-title class="text--primary">
      Daar is iets verdwenen.
    </v-list-tile-sub-title>
 </v-list-tile-content>
`,
  computed: {
    topic: function() {
      var t = this.item.topic;
      if (!t) {
        return null;
      }
      // Handle both cases: object with _id and name, or just an ID string
      if (typeof t === "object" && t._id) {
        // For following feed, we only have id and name - need to fetch full topic for question.type
        var fullTopic = store.getters.topic(t._id);
        if (fullTopic) {
          return fullTopic;
        }
        // Return partial topic info for following feed (name only)
        return t;
      }
      return store.getters.topic(t);
    }
  }
});

Vue.component("AdvalvasFeed", {
  template:`
<div>
  <h2 style="border-bottom: 1px solid #ddd">📢 Jouw Feed</h2>

  <div style="margin-top: 8px;">
    <v-btn
      flat
      :color="showMy ? 'primary' : 'default'"
      @click="toggleMy"
    >
      <v-icon left small>person</v-icon>
      My Activity
    </v-btn>
    <v-btn
      flat
      :color="showFollowing ? 'primary' : 'default'"
      :disabled="followingCount === 0"
      @click="toggleFollowing"
    >
      <v-icon left small>people</v-icon>
      Following ({{ followingCount }})
    </v-btn>
  </div>

  <br>

  <!-- Loading state -->
  <div v-if="loading" class="text-center pa-4">
    <v-progress-circular indeterminate color="primary" size="32"/>
    <div class="mt-2 grey--text">Loading your feed...</div>
  </div>

  <!-- Empty state -->
  <v-card v-else-if="feed.length === 0" flat class="mt-2">
    <v-card-text class="text-center">
      <v-icon size="64" color="grey lighten-1">wb_sunny</v-icon>
      <h3 class="headline mt-3 mb-2">Welcome to LetMeLearn!</h3>
      <p class="grey--text text--darken-1 mb-4">
        Your feed is empty. Start your learning journey by creating your first topic!
      </p>
      <v-btn color="primary" to="/topics">
        <v-icon left>add</v-icon>
        Create your first topic
      </v-btn>
    </v-card-text>
  </v-card>

  <!-- Feed list -->
  <v-list v-else two-line>
    <template v-for="(item, index) in feed">
      <v-list-tile
        :key="index"
        avatar
        ripple
      >
        <v-list-tile-avatar>
          <img :src="userPicture(item)">
        </v-list-tile-avatar>

        <component :is="detail_of(item)" :item="item"/>

        <v-list-tile-action>
          <v-list-tile-action-text>{{ format_date(item.when) }}</v-list-tile-action-text>
        </v-list-tile-action>

      </v-list-tile>
      <v-divider v-if="index < feed.length - 1"/>
    </template>
  </v-list>
  <br>
</div>
`,
  data: function() {
    return {
      showMy: true,
      showFollowing: true
    };
  },
  watch: {
    feedMode: function(newMode) {
      this.updateTogglesFromMode(newMode);
    }
  },
  computed: {
    detail_of: function() {
      return function(item) {
        return {
          "quiz result"     : "AdvalvasFeedQuizResult",
          "training result" : "AdvalvasFeedTraining",
          "new topic"       : "AdvalvasFeedNewTopic"
        }[item.kind];
      }
    },
    feed: function() {
      return store.getters.feed;
    },
    loading: function() {
      return store.getters.feedLoading;
    },
    feedMode: function() {
      return store.getters.feedMode;
    },
    followingCount: function() {
      return store.getters.followingCount || 0;
    },
    format_date: function() {
      return function(when) {
        return moment(when).calendar();
      }
    }
  },
  methods: {
    userPicture: function(item) {
      if (item.user && Array.isArray(item.user) && item.user.length > 0 && item.user[0].picture) {
        return item.user[0].picture;
      }
      // Default avatar as inline SVG data URI
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239e9e9e'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    },
    updateTogglesFromMode: function(mode) {
      if (mode === "my") {
        this.showMy = true;
        this.showFollowing = false;
      } else if (mode === "following") {
        this.showMy = false;
        this.showFollowing = true;
      } else if (mode === "all") {
        this.showMy = true;
        this.showFollowing = true;
      }
    },
    getModeFromToggles: function() {
      if (this.showMy && this.showFollowing) {
        return "all";
      } else if (this.showFollowing) {
        return "following";
      } else {
        return "my";
      }
    },
    toggleMy: function() {
      this.showMy = !this.showMy;
      // If both are off, turn on "my" as default
      if (!this.showMy && !this.showFollowing) {
        this.showMy = true;
      }
      var newMode = this.getModeFromToggles();
      if (newMode !== this.feedMode) {
        store.dispatch("setFeedMode", newMode);
      }
    },
    toggleFollowing: function() {
      this.showFollowing = !this.showFollowing;
      // If both are off, turn on "my" as default
      if (!this.showMy && !this.showFollowing) {
        this.showMy = true;
      }
      var newMode = this.getModeFromToggles();
      if (newMode !== this.feedMode) {
        store.dispatch("setFeedMode", newMode);
      }
    }
  },
  mounted: function() {
    this.updateTogglesFromMode(this.feedMode);
  }
})


Vue.component("FollowingSection", {
  template: `
<div>
  <h2 style="border-bottom: 1px solid #ddd; padding-bottom: 8px;">👥 Social</h2>

  <!-- Following Card with integrated search -->
  <v-card style="margin-top: 16px;">
    <v-card-title>
      <v-icon left>people_outline</v-icon>
      <span>Following ({{ followingCount }})</span>
    </v-card-title>
    <v-card-text style="padding-top: 0;">
      <v-list v-if="following.length > 0" dense>
        <template v-for="(user, index) in following">
          <v-list-tile :key="user.email" class="following-user-tile">
            <v-list-tile-avatar size="32">
              <img :src="user.picture || defaultAvatar">
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>{{ user.name || user.email }}</v-list-tile-title>
            </v-list-tile-content>

            <v-list-tile-action class="following-unfollow-btn">
              <v-btn
                color="default"
                small
                @click.stop="unfollowUser(user.email)"
              >
                <v-icon left small>close</v-icon>
                Unfollow
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
          <v-divider v-if="index < following.length - 1" :key="'divider-f-' + user.email"></v-divider>
        </template>
      </v-list>
      <p v-else class="grey--text" style="margin: 0;">
        You're not following anyone yet. Search below to get started!
      </p>
    </v-card-text>

    <!-- Integrated User Search -->
    <v-card-text style="padding-top: 0; border-top: 1px solid #eee;" v-if="following.length > 0">
      <div style="border-top: 1px solid #eee; margin: 0 -16px; padding: 16px 16px 0;">
        <v-text-field
          v-model="searchQuery"
          label="Search by email to follow more users"
          prepend-icon="search"
          clearable
          :loading="searchLoading"
          @input="debouncedSearch"
          hint="Type at least 2 characters"
          style="margin-top: 0;"
        />
      </div>
    </v-card-text>
    <v-card-text v-else style="padding-top: 16px;">
      <v-text-field
        v-model="searchQuery"
        label="Search by email"
        prepend-icon="search"
        clearable
        :loading="searchLoading"
        @input="debouncedSearch"
        hint="Type at least 2 characters"
      />
    </v-card-text>

    <!-- Search Results -->
    <v-card-text style="padding-top: 0;" v-if="searchResults.length > 0 || (searchQuery && searchQuery.length >= 2 && !searchLoading)">
      <v-list v-if="searchResults.length > 0" two-line dense>
        <template v-for="(user, index) in searchResults">
          <v-list-tile :key="'search-' + user.email" avatar>
            <v-list-tile-avatar>
              <img :src="user.picture || defaultAvatar">
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>{{ user.name || user.email }}</v-list-tile-title>
              <v-list-tile-sub-title>{{ user.email }}</v-list-tile-sub-title>
            </v-list-tile-content>

            <v-list-tile-action>
              <FollowButton
                :email="user.email"
                :name="user.name"
                :picture="user.picture"
                small
                @followed="onFollowed"
                @unfollowed="onUnfollowed"
              />
            </v-list-tile-action>
          </v-list-tile>
          <v-divider v-if="index < searchResults.length - 1" :key="'divider-search-' + user.email"></v-divider>
        </template>
      </v-list>
      <v-alert
        v-else-if="searchQuery && searchQuery.length >= 2 && !searchLoading"
        type="info"
        :value="true"
        outline
      >
        No users found matching "{{ searchQuery }}"
      </v-alert>
    </v-card-text>
  </v-card>

  <!-- Followers Card -->
  <v-card style="margin-top: 16px;">
    <v-card-title>
      <v-icon left>people</v-icon>
      <span>Followers ({{ followersCount }})</span>
    </v-card-title>
    <v-card-text style="padding-top: 0;">
      <v-list v-if="followers.length > 0" dense>
        <template v-for="(user, index) in followers">
          <v-list-tile :key="'follower-' + user.email">
            <v-list-tile-avatar size="32">
              <img :src="user.picture || defaultAvatar">
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>{{ user.name || user.email }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <v-divider v-if="index < followers.length - 1" :key="'divider-fr-' + user.email"></v-divider>
        </template>
      </v-list>
      <p v-else class="grey--text" style="margin: 0;">
        No followers yet.
      </p>
    </v-card-text>
  </v-card>
</div>
`,
  data: function() {
    return {
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
      debounceTimer: null
    };
  },
  computed: {
    following: function() {
      return store.getters.following || [];
    },
    followers: function() {
      return store.getters.followers || [];
    },
    followingCount: function() {
      return store.getters.followingCount || 0;
    },
    followersCount: function() {
      return store.getters.followersCount || 0;
    },
    defaultAvatar: function() {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239e9e9e'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }
  },
  methods: {
    debouncedSearch: function() {
      var self = this;
      if (self.debounceTimer) {
        clearTimeout(self.debounceTimer);
      }
      self.debounceTimer = setTimeout(function() {
        self.performSearch();
      }, 300);
    },
    performSearch: function() {
      var self = this;
      if (!self.searchQuery || self.searchQuery.length < 2) {
        self.searchResults = [];
        return;
      }
      self.searchLoading = true;
      self.searchResults = [];
      store.dispatch("searchUsers", self.searchQuery)
        .then(function(users) {
          self.searchLoading = false;
          self.searchResults = users;
        })
        .catch(function(error) {
          self.searchLoading = false;
          console.error("UserSearch search error:", error);
        });
    },
    clearSearch: function() {
      var self = this;
      self.searchQuery = "";
      self.searchResults = [];
    },
    onFollowed: function(data) {
      var self = this;
      store.dispatch("loadFollowing").then(function() {
        // Reload feed if currently viewing following or all feed
        var mode = store.getters.feedMode;
        if (mode === "following" || mode === "all") {
          store.dispatch("load_feed");
        }
      });
      self.clearSearch();
    },
    onUnfollowed: function(email) {
      store.dispatch("loadFollowing").then(function() {
        // If no longer following anyone, switch to "my" feed mode
        if (store.getters.followingCount === 0) {
          store.dispatch("setFeedMode", "my");
        } else {
          var mode = store.getters.feedMode;
          if (mode === "following" || mode === "all") {
            store.dispatch("load_feed");
          }
        }
      });
    },
    unfollowUser: function(email) {
      var self = this;
      store.dispatch("unfollowUser", email)
        .then(function() {
          return store.dispatch("loadFollowing");
        })
        .then(function() {
          // If no longer following anyone, switch to "my" feed mode
          if (store.getters.followingCount === 0) {
            store.dispatch("setFeedMode", "my");
          } else {
            var mode = store.getters.feedMode;
            if (mode === "following" || mode === "all") {
              store.dispatch("load_feed");
            }
          }
        })
        .catch(function(error) {
          console.error("Failed to unfollow:", error);
        });
    }
  }
});

var Home = {
  template : `
<ProtectedPage icon="dashboard" title="Ad Valvas">

  <StatsCards style="margin-bottom: 24px"/>

  <v-layout row wrap>
    <v-flex sm12 md6 v-if="feed.length">
      <div style="padding-right: 12px;">
        <AdvalvasFeed :feed="feed"/>
      </div>
    </v-flex>

    <v-flex sm12 md6 :offset-md3="!feed.length">
      <div :style="feed.length ? 'padding-left: 12px;' : ''">
        <FollowingSection/>
        <AdvalvasUpdates style="margin-top: 24px;"/>
      </div>
    </v-flex>
  </v-layout>

</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "dashboard",
    text:    "Ad valvas",
    path:    "/",
    index:   1
  },
  computed: {
    feed: function() {
      return store.getters.feed;
    }
  },
  mounted: function() {
    store.dispatch("loadStats");
    store.dispatch("loadFollowing");
    store.dispatch("loadFollowers");
  }
};

Navigation.add(Home);
