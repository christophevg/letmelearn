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
  <v-list-tile-content>
    <v-list-tile-title><b>{{ result }} Resultaat</b></v-list-tile-title>
    <v-list-tile-sub-title v-if="topics" class="text--primary">
      onderwerp{{ topics.length < 2 ? "" : "en" }}:
      <template v-for="topic, index in topics">
        <a :href="'/topics#'+topic._id">{{ topic.name}}</a>
        <span v-if="index < topics.length - 1">,&nbsp;</span>
      </template>
      &nbsp;<a :href="'/quiz#' + topics.map((t)=>t._id).join(';')" style="text-decoration:none">▶️</a>
    </v-list-tile-sub-title>

    <v-list-tile-sub-title>
      {{ item.questions }} vragen | 
      {{ item.asked }} gevraagd | 
      {{ item.attempts }} pogingen |  
      {{ item.correct }} correct
      <span v-if="item.elapsed"> | in {{ item.elapsed }}s</span>
    </v-list-tile-sub-title>
 </v-list-tile-content>
`,
  computed: {
    topics: function() {
      return this.item.topics.map((id) => store.getters.topic(id));
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
})

Vue.component("AdvalvasFeedNewTopic", {
  props: [ "item" ],
  template: `
 <v-list-tile-content>
   <v-list-tile-title><b>🆕 Nieuw onderwerp</b></v-list-tile-title>
   <v-list-tile-sub-title class="text--primary">
      <a :href="'/topics#'+ topic._id">{{ topic.name }}</a>
      &nbsp;<a :href="'/quiz#' + topic._id" style="text-decoration:none">▶️</a>
  
   </v-list-tile-sub-title>
   <v-list-tile-sub-title>
      Stijl: {{ topic.question.type }} |
      {{ topic.items.length }} {{ topic.items.length < 2 ? "vraag" : "vragen" }}
   </v-list-tile-sub-title>
</v-list-tile-content>
`,
  computed: {
    topic: function() {
      return store.getters.topic(this.item.topic);
    }
  }        
});

Vue.component("AdvalvasFeed", {
  template:`
<div>
	<h2 style="border-bottom: 1px solid #ddd">💪 Jouw Feed</h2>
  
  <br>

  <v-list two-line>
    <template v-for="(item, index) in feed">
      <v-list-tile
        :key="index"
        avatar
        ripple
      >
        <v-list-tile-avatar>
          <img :src="item.user[0].picture">
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
  computed: {
    detail_of: function() {
      return function(item) {
        return {
          "quiz result" : "AdvalvasFeedQuizResult",
          "new topic"   : "AdvalvasFeedNewTopic"
        }[item.kind];
      }
    },
    feed: function() {
      return store.getters.feed;
    },
    format_date: function() {
      return function(when) {
        return moment(when).calendar();
      }
    }
  }
})


var Home = {
  template : `
<ProtectedPage>
  
  <template v-slot:subheader>
    <h1 align="center">🎓 Ad Valvas...</h1>
    <v-spacer/>
  </template>

  <v-layout row wrap>
    <v-flex sm12 md6 v-if="feed.length">
      <AdvalvasFeed :feed="feed"/>
    </v-flex>

    <v-flex sm12 md6 :offset-md3="!feed.length">
      <AdvalvasUpdates/>
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
  }
};

Navigation.add(Home);
