(function() {
  if(! window.console ) { window.console = {} }

  var loggers = {}, logging = false;

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

  loggers.warn("Logging is disabled. Enable using `console.enable_logging`.");
  
})();
