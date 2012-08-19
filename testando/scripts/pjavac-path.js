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
  if (process.argv[2].indexOf("compare") == 0) {
    var str = process.argv[2].substr("compare**".length)
    compare_paths(str);
  } else if (process.argv[2].indexOf("register") == 0) {
    var str = process.argv[2].substr("register**".length)
    register_paths(str);
  } else {
    console.log("---------------error in pjavac-path: unknown cmd line arg")
    console.dir(process.argv)
  }
}

function raise(x) {
  console.log(x);
  throw new Error(x)
}

function compare_paths(str) {
  var splt = str.split("#");
  var ex = splt[0];
  var paths = splt[1].split("%")
  if (paths.indexOf("") != -1) {
    paths.splice(paths.indexOf(""),1);
  }

  var col = new mongo.Collection(client, "paths");
  col.find({ex:ex}, function(e, res) {
    if (e) raise(e);
    res.toArray(function(error, cs) {
    if (error) raise(error);
      if (cs.length == 0) {
        raise("found no propagating");
        client.close();
      } else if (cs.length != 1) {
        raise("found more than one propagating");
        client.close();
      } else {
        diff(ex, paths, cs[0].paths);
        client.close();
      }
    });
  });
}

function diff(prop, a, b) {
  for (var i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) == -1) {
      console.log("\n###################\n" +
                  "Excess: [" + prop + "]: " + a[i] +
                 "\n###################\n\n");
    }
  }

  for (var j = 0; j < b.length; j++) {
    if (a.indexOf(b[j]) == -1) {
      console.log("\n###################\n" +
                  "WTF: [" + prop + "]: " + b[j] +
                 "\n###################\n\n");
    }
  }
}

function register_paths(str) {
  var splt = str.split("#");
  var ex = splt[0];
  var paths = splt[1].split("%")

  if (paths.indexOf("") != -1) {
    paths.splice(paths.indexOf(""),1);
  }

  // paths.forEach(function(p) {
  //   logger.info(prop+" @ "+p);
  // });
//  process.exit(0);
  var col = new mongo.Collection(client, "paths");
  col.find({ex:ex}, function(e, res) {
    if (e) raise(e);
    res.toArray(function(error, cs) {
      if (error) raise(error);
      if (cs.length == 0) {
        col.insert({ex:ex,paths:paths}, function(e) {
          if (e) raise(e);
          client.close();
        });
      } else {
        cs[0].paths = paths.concat(cs[0].paths);
        col.update({_id:cs[0]._id}, cs[0], {}, function(e) {
          if (e) raise(e);
          client.close();
        });
      }
    })
  });
}
