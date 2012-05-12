#!/usr/bin/env node

/*
index:
  {"node" : 'S::s()', "tags" : [ "S::s()"]}
  {"node" : { "base" : "SuperA::a()", "subs" : [ "A::a()" ] }, "tags" : [ "A::a()", "SuperA::a()" ] }
pnodes:
  {ex: 'E', path: [0, 3, 5]} //path: list of mongo ids, keying index collection

*/

var mongo = require('mongodb');

var debug_dir = console.dir;
var debug = console.log;
function exit() {
  process.exit(0);
}
//debug_dir = new Function;


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
  //return test2();

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

  var regex = /\{([^\}]+)\}/g
  var match;
  var t = [];
  while (match = regex.exec(arg)) {
    t.push(match[1]);
  }

//[ 'A::a()', 'SuperA::a()', 'E' ]
  var spec = {ex: t[2], base: t[1], sub: t[0]};
  debug_dir({spec: spec});

  update_idx(spec.sub, spec.base, exit);
}

function do_path(arg) {
  //doit("[S::s()] should throw [E] because it calls [A::a()]");

  var regx = /\[([^\]]+)\]/g;
  var match;
  var triple = [];
  while (match = regx.exec(arg)) {
    triple.push(match[1]);
  }
  var spec = {ex: triple[1], call: triple[2], node: triple[0]};
  debug_dir({spec: spec});

  get_idx_ids(spec.call, spec.node, function(idx_ids) {
    var call_idx = idx_ids[0];
    var node_idx = idx_ids[1];

    debug_dir(idx_ids);

    if (!call_idx) { //[ORIGIN]
      debug('creating node that calls ORIGIN')
      create_node(spec.ex, node_idx)
      exit();
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
              debug('WTF: node_idx found but not call_node!!')
            }
          } else {
            debug('No node found. Creating one')
            create_node(spec.ex, node_idx, call_node._id);
            exit();
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
        debug("pushing ID: " + id);
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


// //====

// function do_super(arg) {
//   //{SuperA::a()} should throw {E}
//   var regex = /\{([^\}]+)\}/g
//   var match;
//   var t = [];
//   while (match = regex.exec(arg)) {
//     t.push(match[1]);
//   }

//   debug_dir(t);
//   var sub = t[0];
//   var sup = t[1];
//   var ex = t[2];

// //[ 'A::a()', 'SuperA::a()', 'E' ]

//   //transform a single to a polym
//   var col = new mongo.Collection(client, "pnodes");
//   debug_dir({query: 1, ex: ex, node_path: sub});
//   col.find({ex: ex, node_path: sub}, function(e,c) {
//     if (e) throw new Error(e);
//     else c.toArray(function(error, items) {
//       if (items.length == 0) {
//         //find a poly now, and prepend sub to its subs
//         //if no poly found:
//         col.insert({ex: ex, node_path: {base: sup, children: [sub]]}, function(error, docs) {
//           debug_dir({inserted: docs});
//           process.exit(0);
//         });
//       } else {
//         for (var i = 0; i < items.length; i++) {
//           items[i].node_path = {base: sup, children: [sub]} //node_path == sub
//           debug_dir(items[i]);
//           col.update({_id: items[i]._id}, items[i], {}, function(err) {
//             if(err) throw new Error(err);
//             process.exit(0);
//           });
//         }
//       }
//     });
//   });

//   process_it(t[2], t[1], [t[0], t[1]]);
// }

// function do_path(arg) {
//   var regx = /\[([^\]]+)\]/g;
//   var match;
//   var triple = [];
//   while (match = regx.exec(arg)) {
//     triple.push(match[1]);
//   }
//   var spec = {ex: triple[1], invoke: triple[2], node: triple[0]};
//   debug_dir({spec: spec});

//   var ex = spec.ex;
//   var invoke = spec.invoke;
//   var node = spec.node;

//   var col = new mongo.Collection(client, "pnodes");
//   debug_dir({query: 1, ex: ex, node_path: invoke});
//   col.find({ex: ex, node_path: invoke}, function(e,c) {

//     if (e) throw new Error(e);

//     else c.toArray(function(error, items) {
//       if (items.length == 0) {
//         console.log("NOT FOUND");
//         col.insert({ex: ex, node_path: [node]}, function(error, docs) {
//           if (error) throw new Error(e);
//           debug_dir({inserted: docs});
//           process.exit(0);
//         });
//       } else {
//         console.log("FOUND");
//         if (invoke == node) {
//           console.log("invoke == node. do nothing")
//           process.exit(0);
//         } else {
//           items[0].node_path.push(node);
//           debug_dir(items);
//           col.update({_id: items[0]._id}, items[0], {}, function(err) {
//             if(err) throw new Error(err);
//             process.exit(0);
//           });
//         }
//       }
//     });
//   });
// }

// function start() {
//   //doit("[A::a()] should throw [E] because it calls [ORIGIN]");
//   //doit("[S::s()] should throw [E] because it calls [A::a()]");
//   //doit("[S::g()] should throw [E] because it calls [S::s()]");
//   //doit("[X::g()] should throw [E] because it calls [SuperA::a()]");
//   //doit("{SuperA::a()} should throw {E}");

//   //return;

//   if (process.argv.length != 3) {
//     console.log('missing arg');
//     console.dir(process.argv);
//     process.exit(0);
//   } else {
//     console.dir(process.argv);
//     doit(process.argv[2]);
//   }
// }