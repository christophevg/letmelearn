Vue.component("AdvalvasUpdates", {
  template: `
<div>
	<h2 align="center">📣 Nieuwigheden</h2>

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

Vue.component("AdvalvasFeed", {
  template:`
<div>
	<h2 align="center">💪 Jouw Feed</h2>
  <br>
  Coming Soon
</div>
`
})


var Home = {
  template : `
<ProtectedPage>
  <h1 align="center">🎓 Ad Valvas...</h1>

  <v-layout row wrap>
    <v-flex sm12 md6 v-if="feed.length">
      <AdvalvasFeed/>
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
      return [] // TODO get from "feed" store
    }
  }
};

Navigation.add(Home);
