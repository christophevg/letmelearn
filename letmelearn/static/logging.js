(function() {
  if(! window.console ) { window.console = {} }

  var loggers = {},
      logging = location.hostname === "localhost"
             || location.hostname === "127.0.0.1";

  // keep copy of original loggers
  for(let logger of ["log", "info", "debug", "warn" ]) {
    loggers[logger] = window.console[logger];
  }

  // create guarded versions
  for(let logger in loggers) {
    if(loggers[logger]) {
      window.console[logger] = function(...args) {
        if(!logging) { return; }
        loggers[logger](...args);
      }
    }
  }
  
  // utility functions to change behavior
  window.console["enable_logging"]  = function() { logging = true;  }
  window.console["disable_logging"] = function() { logging = false; }

  loggers.info(
`%cWelkom bij...
 _         _                      _                          
| |    ___| |_   _ __ ___   ___  | |    ___  __ _ _ __ _ __  
| |   / _ \\ __| | '_ \` _ \\ / _ \\ | |   / _ \\/ _\` | '__| '_ \\ 
| |__|  __/ |_  | | | | | |  __/ | |__|  __/ (_| | |  | | | |
|_____\\___|\\__| |_| |_| |_|\\___| |_____\\___|\\__,_|_|  |_| |_|`,
    `font-family: monospace`
  );

  if(!logging) {
    loggers.warn("Logging is disabled. Enable using `console.enable_logging`.");
  }
  
})();
