#!/usr/bin/env node

/*
index:
  {"node" : 'S::s()', "tags" : [ "S::s()"]}
  {"node" : { "base" : "SuperA::a()", "subs" : [ "A::a()" ] }, "tags" : [ "A::a()", "SuperA::a()" ] }
pnodes:
  {ex: 'E', path: [0, 3, 5]} //path: list of mongo ids, keying index collection

*/

var mongo = require('mongodb');

var debug_dir = null;
var debug = null;
function set_debug(bool) {
  if (bool) {
    debug_dir = console.dir;
    debug = console.log;
  } else {
    debug_dir = new Function
    debug = new Function
  }
}
set_debug(true);


function exit() {
  process.exit(0);
}


var db = new mongo.Db("java_msc", new mongo.Server("localhost", 27017));
var client;
db.open(function(error, c) {
  client = c;
  start();
});


// propagating E: {A <: SuperA}::a() -> S::s();
// propagating E: {A <: SuperA}::a() -> Z::z();
function test1() {
  //doit("[A::a()] should throw [E] because it calls [ORIGIN]");
  //doit("{A::a()} {SuperA::a()} should throw {E}");
  //doit("[S::s()] should throw [E] because it calls [SuperA::a()]");
  //doit("[Z::z()] should throw [E] because it calls [SuperA::a()]");
}

function test2() {
  //doit("[A::a()] should throw [E] because it calls [ORIGIN]");
  //doit("[A::b()] should throw [E] because it calls [A::a()]");
  //doit("[A::c()] should throw [E] because it calls [A::a()]");
  //doit("[A::s()] should throw [E] because it calls [A::a()]");
  //doit("[A::d()] should throw [E] because it calls [A::s()]");
  //doit("[A::f()] should throw [E] because it calls [A::c()]");
  //doit("[A::e()] should throw [E] because it calls [A::s()]");
  //doit("[A::g()] should throw [E] because it calls [A::d()]");
  //doit("[A::g()] should throw [E] because it calls [A::f()]");
}

function start() {
  //return exit();
  //return test1();

  if (process.argv.length != 3) {
    console.log('missing arg');
    console.dir(process.argv);
    exit();
  } else {
    doit(process.argv[2]);
  }
}


function doit(arg) {
  if (arg[0] == '{') {
    do_super(arg);
  } else {
    do_path(arg);
  }
}

function do_super(arg) {
//  doit("{A::a()} {SuperA::a()} should throw {E}");

  var regex = /\{!([^!]+)\!}/g
  var match;
  var t = [];
  while (match = regex.exec(arg)) {
    t.push(match[1]);
  }

//[ 'A::a()', 'SuperA::a()', 'E' ]
  var spec = {ex: t[2], base: t[1], sub: t[0]};
  //console.log({spec:spec});

  update_idx(spec.sub, spec.base, exit);
}

function do_path(arg) {
  //doit("[S::s()] should throw [E] because it calls [A::a()]");

  var regx = /\[!([^!]+)!\]/g;
  var match;
  var triple = [];
  while (match = regx.exec(arg)) {
    triple.push(match[1]);
  }
  var spec = {ex: triple[1], call: triple[2], node: triple[0]};
  //console.log({spec:spec});

  get_idx_ids(spec.call, spec.node, function(idx_ids) {
    var call_idx = idx_ids[0];
    var node_idx = idx_ids[1];

    debug_dir(idx_ids);

    if (!call_idx) { //[ORIGIN]
      debug('creating node that calls ORIGIN')
      get_node(spec.ex, node_idx, function(node) {
        if (node) {
          debug("duplicated node...passing");
        } else {
          create_node(spec.ex, node_idx)
        }
        exit();
      });
    } else {
      debug('looking for existing call_idx node...')
      get_node(spec.ex, call_idx, function(call_node) {
        debug('looking for existing node_idx node...')
        get_node(spec.ex, node_idx, function(node) {
          if (node) {
            debug('node_idx found')
            if (call_node) {
              debug('Adding call to existing node')
              add_call(node, call_node._id);
              exit();
            } else {
              debug('node found with no registered call node')
              if (node.ex != spec.ex) {
                debug("Exceptions differ. Create new node for new exception")
                create_node(spec.ex, node_idx)
                exit();
              } else {
                debug("Exceptions are equal -- do nothing")
                exit();
              }
            }
          } else {
            if (call_node) {
              debug('No node found. Creating one with callnode')
              create_node(spec.ex, node_idx, call_node._id);
              exit();
            } else {
              debug('No node found. Creating one -- no callnode')
              create_node(spec.ex, node_idx);
              exit();
            }
          }
        });
      });
    }
  });
}

function add_call(node, call_node_id) {
  var col = new mongo.Collection(client, "trees");
  node.calls.push(call_node_id);
  col.update({_id: node._id}, node, {}, function(e) {
    debug("UPDATED");
  });
}

function get_node(ex, idx, retf) {
  var col = new mongo.Collection(client, "trees");

  col.find({ex: ex, node: idx}, function(e, c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, items) {
        if (items.length > 1) throw "more than one node throwing " + ex + " found";
        retf( (items.length == 1) ? items[0] : null );
      });
  });
}

function create_node(ex, node_idx, call_node_idx) {
  var col = new mongo.Collection(client, "trees");

  var calls = call_node_idx ? [call_node_idx] : [];

  col.insert({ex: ex, node: node_idx, calls: calls}, function(error, docs) {
    if (error) throw new Error(error);
    debug_dir({inserted_node: docs});
  });
}

function get_idx_ids() {
  var sigs = [];
  for (var i = 0; i < arguments.length-1; i++) {
    sigs.push(arguments[i]);
  }
  fret = arguments[arguments.length-1];

  var ret = []
  for (var i = 0; i < sigs.length; i++) {
    if (sigs[i] == 'ORIGIN') {
      ret.push(null);
    } else {
      get_or_create_id(sigs[i], function(id) {
        //debug("pushing ID: " + id);
        ret.push(id);
        if (ret.length == sigs.length) fret(ret);
      });
    }
  }
}

function get_or_create_id(sig, ret) {
  var col = new mongo.Collection(client, "idx");
  col.find({tags: sig}, function(e,c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, items) {
      if (items.length == 0) {
        debug('creating id for ' + sig);
        col.insert({node: sig, tags: [sig]}, function(e,docs) {
          if (e) throw new Error(e);
          ret(docs[0]._id);
        });
      } else {
        debug('found id ' + items[0]._id);
        ret(items[0]._id);
      }
    });
  })
}

function update_idx(sub, base, retf) {
  var col = new mongo.Collection(client, "idx");
  col.find({tags: sub}, function(e,c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, items) {
      if (typeof items[0].node == 'string') {
        items[0].node = {base: clazz(base), subs: [clazz(sub)], meth: meth(sub)}
        items[0].tags = [sub, base];
      } else {
        items[0].node.subs.push(clazz(sub));
        items[0].tags.push(sub);
      }
      col.update({_id: items[0]._id}, items[0], {}, function(err) {
        if(err) throw new Error(err);
        retf();
      });
    });
  });
}

function clazz(pair) {
  return pair.match(/[^:]+/)[0];
}

function meth(pair) {
  return pair.match(/::(.*)/)[1];
}
