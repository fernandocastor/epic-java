#!/usr/bin/env node


var mongo = require('mongodb');
var winston = require('winston');
var logger = new (winston.Logger);
logger.setLevels(winston.config.syslog.levels);

// logger.add(winston.transports.Console, {colorize:true,timestamp:true});

logger.add(winston.transports.File, {level: 'info',
                                     filename:'/home/thiago/src/java_msc/testando/scripts/gen.log',
                                     maxsize:1048576});


var d = null;
function set_debug(bool) {
  if (bool) {
    d = function() {
      logger.info.apply(logger,arguments);
      // setTimeout(function() {
      //   logger.transports.file.flush();
      // }, 110);
    }
  } else {
    d = {info: new Function};
  }
}
set_debug(true);

function raise(str) {
  //console.log("RAISED: " + str);
  logger.error(str);
  exit();
}

function exit() {
  //console.log("EXITED");
  //d("------------------ END ---------------\n\n");
  console.log(output)
  client.close();
}

var output = ''

var print = function(str) {
  output += str + "\n";
}

var prepend = function(str) {
  output = str + "\n" + output;
}
// var print = console.log;
// var prepend = console.log;



var db = new mongo.Db("java_msc", new mongo.Server("localhost", 27017));
var client;
db.open(function(error, c) {
  if (error) throw new Error(error)
  client = c;
  start();
});

function start() {
  var i = 0;
  get_roots(function(roots) {
    //console.log("got roots: " + roots.length);
    if (roots.length == 0) {
      process_virtuals();
    } else {
      roots.forEach(function(root) {
        //console.log("about to process_node " + root.node);
        process_node(root, null, [], function() {
          i++;
          //console.log("finished process_node " + root.node + " --- [[" + i + "]]");
          if (roots.length == i) {
            //console.log("roots.length == i. --> process virtuals");
            process_virtuals();
          }
        });
      });
    }
  });
}

var poly_nodes = []

function process_virtuals() {
  //console.log("processingd _virtuals...")

  var i = 0;
  get_root_virtuals(function(rootvs) {
    if (rootvs.length == 0) {
      //console.log("no virtuals. EXITING");
      exit();
    }
    rootvs.forEach(function(root) {
      //console.log("about to call poly_str on " + root.node);
      get_poly_str(root, function(node_str) {
        //console.log("mark/prepend " + root.node + " -- " + node_str)
        if (mark_polynode(root.ex, node_str)) {
          prepend("/*poly mark */ propagating " + root.ex + ": " + node_str + ";");
        }
        //console.log("exit? " + i + ": i == rootvs.length" + (i == rootvs.length));
        i++;
        if (i == rootvs.length) exit();
      });
    });
  });
}

function mark_polynode(ex, str) {
  for (var i = 0; i < poly_nodes.length; i++) {
    if (poly_nodes[i] == str) return false;
  }
  poly_nodes.push(str);
  return true;
}

function get_root_virtuals(fn) {
  var col = new mongo.Collection(client, "hierarchy");
  col.find({parent:null}, function(e,c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, cs) {
      fn(cs);
    });
  });
}

function get_poly_str(node, fn) {
  // function ddd(x) {
  //   console.log("poly["+node.node+"] " + x);
  // }

  //ddd("entered");

  var ret = []

  var i = 0;
  function load_children(hnode, lowest, fnn) {
    var col = new mongo.Collection(client, "hierarchy");
    //ddd("poly load_children: " + hnode.node);

    col.find({ex:hnode.ex, parent:hnode._id}, function(e, chs) {
      //ddd("query children returned for " + hnode.node);
      if (e)
        throw new Error(e);
      chs.toArray(function(error, hchildren) {
        //ddd("chs.toArray: " + hnode.node + " " + hchildren.length);
        if (error) throw new Error(error);
        //ddd(hnode.node + " has " + hchildren.length + " children");
        i += hchildren.length;
        if (hchildren.length == 0) {
          if (lowest) ret.push(lowest);
          //ddd(hnode.node + " has no children. calling fnn");
          fnn();
        } else {
          hchildren.forEach(function(c) {
            //ddd("load_children soon: " + c.node);
            load_children(c, c, function() {
              i--;
              //ddd("loaded child " + c.node + " ["+i+"]");
              if (i == 0) fnn();
            });
          });
        }
      });
    });
  }

  load_children(node, null, function() {
    //ddd("poly DONE")
    if (ret.length == 0) {
      fn(node.node)
    } else {
      fn("{"+(ret.map(function(x) {return clazz(x.node)}).join(",")+"<:"+clazz(node.node)+"}::"+method(node.node)));
    }
  });
}

function resolve_node_str(node, fn) {
  //console.log("resolve_node on " + node.node);
  var col = new mongo.Collection(client, "hierarchy");

  col.find({ex:node.ex, node: node.node}, function(e, c) {
    if (e) throw new Error(e);
      else c.toArray(function(error, hs) {
        //console.log("resolve_node found a node hierarchy for " + node.node + "? " +  hs.length);
       if (hs.length == 0) return fn(node.node);
        else if (hs.length > 1) {
          raise("BUG: found more than one node in hierarchy: " + node.node);
        } else {
          //console.log("in resolve_node, about to call poly_str on " + hs[0].node)
          get_poly_str(hs[0], function(str) {
            mark_polynode(node.ex, str);
            fn(str);
          });
        }
      });
  });
}

function process_node(node, str, nodes, fn) {
  // function ddd(x) {
  //   console.log("proc[" + node.node + "] " + x);
  // }

  function in_nodes(n) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].node == n.node) return true;
    }
    return false;
  }

  str = str ? str + " -> " : '';

  //ddd("entering");

  get_children(node, function(children) {
    //ddd("node_children: " + children.length)
    if (children.length == 0) {
      //ddd(node.node + " is tail node");
      resolve_node_str(node, function(node_str) {
        print("propagating " + node.ex + ": " + str + node_str + ";");
        fn();
      });
    } else {
      //ddd("has children...")
      resolve_node_str(node, function(node_str) {
        //ddd("resolved node_str: " + node.node + " -- " + node_str)
        var i = 0;
        children.forEach(function(child) {
          if (in_nodes(child)) {
            //ddd(child.node + " is in_nodes!, skipping!");
            i++;
          } else {
            //ddd("calling process_child on " + child.node);
            process_node(child, str + node_str, nodes, function() {
              i++;
              if (i == children.length) fn();
            });
          }
        });
      });
    }
  });
}



function get_roots(fn) {
  var col = new mongo.Collection(client, "trees");

  col.find({calls:[], virtual:false}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        if (error) throw new Error(e);
        fn(items)
      });
  });
}
function get_children(node, fn) {
  var col = new mongo.Collection(client, "trees");

  col.find({ex: node.ex, calls:node._id}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        if(error) throw new Error(error);
        fn(items);
      });
  });
}

function clazz(pair) {
  return pair.match(/[^:]+/)[0];
}

function method(pair) {
  return pair.match(/::(.*)/)[1];
}
