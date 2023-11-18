var About = {
  template : `
<div>
  <v-layout>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-img
          src="/app/static/images/let-me-learn.png"
          aspect-ratio="2.75"
        ></v-img>

        <v-card-title primary-title>
          <div>
            <h3 class="headline mb-0">Let me Learn!</h3>
            <p>
              Toen Quizlet grotendeels betalend werd, en dochterlief enkele belangrijke
              toetsen in het verschiet had, was er maar één ding dat ik kon doen...
            </p>
  
            <p>
              "Let me Learn!" is een online/web toepassinkje dat toelaat om op 
              verschillende manieren begrippen/woorden/... te oefenen, leren en te testen.
            </p>
  
            <p>
              Want wat je zelf implementeert... 😇
            </p>
          </div>
        </v-card-title>

      </v-card>
    </v-flex>
  </v-layout>
</div>
`,
  navigation: {
    section: "info",
    icon:    "info",
    text:    "Over",
    path:    "/about",
    index:   1
  }
};

Navigation.add(About);
