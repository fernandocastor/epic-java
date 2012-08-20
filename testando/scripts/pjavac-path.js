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
  compare_paths(process.argv[2]);
}

function raise(x) {
  console.log(x);
  throw new Error(x)
}

function compare_paths(str) {
  var splt = str.split("#");
  var ex = splt[1];
  var method = splt[0];

  var col = new mongo.Collection(client, "methods");
  col.find({ex:ex}, function(e, res) {
    if (e) raise(e);
    res.toArray(function(error, cs) {
    if (error) raise(error);
      if (cs.length == 0) {
        raise("OPS: found no propagating");
        client.close();
      } else if (cs.length != 1) {
        raise("OPS: found more than one propagating");
        client.close();
      } else {
        //console.log("IndexOf " + method + ": " + cs[0].methods.indexOf(method))
        if (cs[0].methods.indexOf(method) == -1) {
          console.log("\n###################\n" +
                      "Excess: [" + ex + "]: " + method +
                      "\n###################\n\n");
        }
        client.close();
      }
    });
  });
}

// function diff(ex, method, methods) {
//   for (var i = 0; i < methods.length; i++) {
//     if (methods[i].indexOf(method) == -1) {
//       console.log("\n###################\n" +
//                   "Excess: [" + ex + "]: " + method +
//                  "\n###################\n\n");
//     }
//   }
// }

// function register_paths(str) {
//   var splt = str.split("#");
//   var ex = splt[0];
//   var paths = splt[1].split("%")

//   if (paths.indexOf("") != -1) {
//     paths.splice(paths.indexOf(""),1);
//   }

//   // paths.forEach(function(p) {
//   //   logger.info(prop+" @ "+p);
//   // });
// //  process.exit(0);
//   var col = new mongo.Collection(client, "paths");
//   col.find({ex:ex}, function(e, res) {
//     if (e) raise(e);
//     res.toArray(function(error, cs) {
//       if (error) raise(error);
//       if (cs.length == 0) {
//         col.insert({ex:ex,paths:paths}, function(e) {
//           if (e) raise(e);
//           client.close();
//         });
//       } else {
//         cs[0].paths = paths.concat(cs[0].paths);
//         col.update({_id:cs[0]._id}, cs[0], {}, function(e) {
//           if (e) raise(e);
//           client.close();
//         });
//       }
//     })
//   });
// }
