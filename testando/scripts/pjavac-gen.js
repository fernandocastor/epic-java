#!/usr/bin/env node

var mongo = require('mongodb');

//var debug_dir = console.dir;
var debug_dir = new Function;
var debug = console.log;
var debug = new Function;
function exit() {
  process.exit(0);
}
//debug_dir = new Function;

print = console.log;

var db = new mongo.Db("java_msc", new mongo.Server("localhost", 27017));
var client;
db.open(function(error, c) {
  client = c;
  //show_nodes();
  start();
});


function show_nodes() {
  var col = new mongo.Collection(client, "trees");

  function process_rest(item) {
    get_node_str(item.node, function(self) {
      for (var j = 0; j < item.calls.length; j++) {
        col.find({_id: item.calls[j]}, function(e,c) {
          c.toArray(function(error, items) {

            get_node_str(items[0].node, function(chstr) {
              print(self + " calls " + chstr);
            });
          });
        });
      }
    });
  }

  col.find({}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        for (var i = 0; i < items.length; i++) {
          process_rest(items[i]);
        }
      });
  });
}


function start() {
  var count = 0;
  get_roots(function(roots) {
    for(var i = 0; i < roots.length; i++) {
      process_spec(roots[i], null, function() {
        count++;
        if (count == roots.length) exit();
      });
    }
  });
}

function process_spec(node, prev_str, done) {
  prev_str = prev_str ? prev_str + " -> " : "";

  debug_node("processing node ", node);
  var count = 0;
  get_node_str(node.node, function(self_str) {
    get_children(node, function(children) {
      if (children.length == 0) {
        debug_node("node is tail ", node);
        print("propagating " + node.ex + ": " + prev_str + self_str + ";");
        done();
      } else {
        debug_node("node has children ", node);
        for (var i = 0; i < children.length; i++) {
          process_spec(children[i], prev_str + self_str, function() {
            count++;
            if (count == children.length) done();
          });
        }
      }
    });
  });
}

function get_roots(retf) {
  var col = new mongo.Collection(client, "trees");

  col.find({calls:[]}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        retf(items);
      });
  });
}

function get_children(root, retf) {
  var col = new mongo.Collection(client, "trees");

  col.find({ex: root.ex, calls:root._id}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        retf(items);
      });
  });
}

function get_node_str(id, retf) {
  var col = new mongo.Collection(client, "idx");

  col.find({_id:id}, function(e, c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, items) {
      if (items.length == 0) {
        throw new Error("Index " + id + " wasnt found in idx");
      }
      if (typeof items[0].node == 'string') {
        retf(items[0].node);
      } else {
        retf(poly(items[0].node));
      }
    });
  });
}

function poly(node) {
  var s = '';

  return "{" + node.subs.join(",") + "<:" + node.base + "}::" + node.meth;
}

function debug_node(str, node) {
  get_node_str(node.node, function(rest) {
    debug(str + rest);
  });
}