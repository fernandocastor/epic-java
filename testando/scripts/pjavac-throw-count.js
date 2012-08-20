#!/usr/bin/env node

var mongo = require('mongodb');
var winston = require('winston');
var logger = new (winston.Logger);
logger.setLevels(winston.config.syslog.levels);

// logger.add(winston.transports.Console, {colorize:true,timestamp:true});

logger.add(winston.transports.File, {level: 'info',
                                     filename:'/home/thiago/src/java_msc/testando/scripts/path.log',
                                     maxsize:1048576});


var db = new mongo.Db("java_msc", new mongo.Server("localhost", 27017));
var client;
db.open(function(error, c) {
  if (error) throw new Error(error)
  client = c;
  start();
});


function start() {
  register_paths();
}

function register_paths() {
  var splt = process.argv[2].split("#");
  var ex = splt[1];
  var method = splt[0];
  var str = method//ex + " -- " + method

  var col = new mongo.Collection(client, "tlist");
  col.insert({method:str}, function(e) {
    if (e) throw new Error(e);
    client.close();
  });
}
