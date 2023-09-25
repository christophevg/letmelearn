var Home = {
  template : `
<ProtectedPage>
  <h1>🎓 Ad Valvas...</h1>

  <v-layout>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title>
          <div>
            <h3 class="headline mb-0">📣 Nieuwigheden</h3>

            <br>

            <h4>Meerdere goede antwoorden</h4>
  
            <p>
  
              Je kan vanaf nu meerdere goede antwoorden voorzien door deze te
              scheiden door middel van een verticale streep, een zogenaamd
              "pipe"-symbool: "|".
  
              <br><br>
  
              <v-img
                src="/app/static/images/news/multiple-possible-answers.png"
                max-width="400"
              ></v-img>

            </p>

          </div>
        </v-card-title>
      </v-card>
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
  }
};

Navigation.add(Home);
