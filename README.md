# Let me Learn

> a simple app to support learning definitions, words,...

## Rationale

When my daugther's quizlet was in danger of becoming a paid service, it was once again time to spend a few hours to build a simple app to help her out ;-)

Of course it also included a few personal itches to be scratched:

* Since [the last such app](https://github.com/christophevg/howifeel), Heroku was no longer "free" and so I had to look for another free Python app hosting solution. With this app, I'm going to explore [Render](https://render.com).
* Over the years I've been building [baseweb](https://github.com/christophevg/baseweb), a very rapid prototyping environment. With this app, I'm going to include authorization support using OAuth, with support for Google accounts as an authenticating federated login.
* After experimenting with PWAs in [the last such app](https://github.com/christophevg/howifeel), I want to further integrate all that support in a more generic way in [baseweb](https://github.com/christophevg/baseweb).
* Once the basic app functionality works, I want to use the app to refactor some parts into reusable, generic framework components, with a focus on even more convention over configuration and genericity over specificity. I want to introduce a generic collection-access API layer and dynamical construction of corresponding Vuex store modules, offering a single pattern to access mongo collections from actual pages by simply calling store actions, with all intermediate code be it generic or dynamiclly constructed. Of course this will then be integrated in [baseweb](https://github.com/christophevg/baseweb).

So, the setup/architecture of this application will be my (currently) prefered one:

* a SP(A/)PWA based on Vue(tify)
* using OAuth/OpenID Connect for authentication by Google
* using a RESTful service
* to access documents in MongoDB

## Implementation Steps

- [x] Setup a Hello World-like service on Render
  - [x] Setup a Hello World Flask app
    ![Hello World](media/hello-world.png)
  - [x] Split service in ui and api
    ![Hello World, the sequel](media/hello-world-2.png)
  - [x] Connect api to MongoDB Cloud instance
    ![Hello World, the sequel](media/hello-world-3.png)
- [x] Apply baseweb + sppwa + oauth
  - [x] Apply baseweb
    ![Hello baseweb](media/hello-baseweb.png)
  - [x] Enable PWA usage
    <p align="center">
      <img src="https://raw.githubusercontent.com/christophevg/letmelearn/master/media/hello-pwa.png">
    </p>  
  - [x] Add login + OAuth/OpenIDC
  - [x] Add support for Google Accounts
- [x] Implement application logic
  - [x] Implement "create a topic"
  - [x] Implement "import topics"
  - [x] Implement "learn a topic"
    <p align="center">
      <img src="https://raw.githubusercontent.com/christophevg/letmelearn/master/media/letmelearn.png">
    </p>  
- [ ] Further refactor code into more generic framework
  - [ ] Generic API layer
  - [ ] Dynamic Store construction
