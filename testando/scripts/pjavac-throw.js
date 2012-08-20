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


function raise(e) {
  console.log(e);
  throw new Error(e);
}

function start() {
  register_paths();
}

function register_paths() {
  var splt = process.argv[2].split("#");
  var ex = splt[1];
  var method = splt[0];

  var col = new mongo.Collection(client, "methods");
  col.find({ex:ex}, function(e, res) {
    if (e) raise(e);
    res.toArray(function(error, cs) {
      if (error) raise(error);
      if (cs.length == 0) {
        col.insert({ex:ex,methods:[method]}, function(e) {
          if (e) raise(e);
          client.close();
        });
      } else {
        cs[0].methods.push(method)
        col.update({_id:cs[0]._id}, cs[0], {}, function(e) {
          if (e) raise(e);
          client.close();
        });
      }
    })
  });
}
