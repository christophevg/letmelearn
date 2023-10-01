var Home = {
  template : `
<ProtectedPage>
  <h1 align="center">🎓 Ad Valvas...</h1>

	<br>

	<h2 align="center">📣 Nieuwigheden</h2>

	<br>

  <v-layout>
    <v-flex xs12 sm6 offset-sm3>

			<v-card>
        <v-layout row>
          <v-flex xs7>
            <v-card-title primary-title>
              <div>
                <div class="headline">Timer!</div>
								<div class="grey--text">1 oktober 2023</div>

            		<p>
  
                  Met de nieuwe timer functie, kan je nu tegen de tijd oefenen.
                  Of gewoon exact de tijd oefenen dat je <i>moest</i> 😇

								</p>

              </div>
            </v-card-title>
          </v-flex>
          <v-flex xs5>
						<div style="padding:15px">
	            <v-img
	              src="/app/static/images/news/timer.png"
	              height="125px"
	              contain
	            ></v-img>
						</div>
          </v-flex>
        </v-layout>
      </v-card>
			
			<br>

			<v-card>
        <v-layout row>
          <v-flex xs7>
            <v-card-title primary-title>
              <div>
                <div class="headline">Meerdere topics per quiz</div>
								<div class="grey--text">25 september 2023</div>

            		<p>
  
									Je kan vanaf nu meerdere topics selecteren om een quiz te doen.

								</p>

              </div>
            </v-card-title>
          </v-flex>
          <v-flex xs5>
						<div style="padding:15px">
	            <v-img
	              src="/app/static/images/news/multiple-topics.png"
	              height="125px"
	              contain
	            ></v-img>
						</div>
          </v-flex>
        </v-layout>
      </v-card>
			
			<br>
			
			<v-card>
        <v-layout row>
          <v-flex xs7>
            <v-card-title primary-title>
              <div>
                <div class="headline">Meerdere goede antwoorden</div>
								<div class="grey--text">25 september 2023</div>

		            <p>
  
		              Je kan vanaf nu meerdere goede antwoorden voorzien door deze te
		              scheiden door middel van een verticale streep, een zogenaamd
		              "pipe"-symbool: "|".

								</p>

              </div>
            </v-card-title>
          </v-flex>
          <v-flex xs5>
						<div style="padding:15px">
	            <v-img
	              src="/app/static/images/news/multiple-possible-answers.png"
	              height="125px"
	              contain
	            ></v-img>
						</div>
          </v-flex>
        </v-layout>
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
