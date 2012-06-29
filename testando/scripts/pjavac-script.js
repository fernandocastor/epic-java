#!/usr/bin/env node

/*
hierarchy:
  {type:"T", super: "S""}

nodes:
  {ex: 'E', node: "Foo::bar(int)", type:"foo", method:"bar(int"), call: [0,1,2]} //call: node._id
*/

if (process.env["MSC_IGNORE"]) process.exit(0)

var mongo = require('mongodb');
var winston = require('winston');
var logger = new (winston.Logger);
logger.setLevels(winston.config.syslog.levels);

// logger.add(winston.transports.Console, {colorize:true,timestamp:true});

logger.add(winston.transports.File, {level: 'info',
                                     filename:'/home/thiago/src/java_msc/testando/scripts/log.log',
                                     maxsize:1048576});


var d = null;
function set_debug(bool) {
  if (bool) {
    d = function() {
      logger.info.apply(logger,arguments);
      setTimeout(function() {
        logger.transports.file.flush();
      }, 0);
    }
  } else {
    d = new Function;
  }
}

set_debug(false);

function exit() {
  d("------------------ END ---------------\n\n");
  store_arg(function() {
    client.close();
  });
}

function store_arg(fn) {
  var colidx = new mongo.Collection(client, "idx");

  function insert_arg(idx) {
    var col = new mongo.Collection(client, "args");
    col.insert({arg:argument, num:idx}, function(e) {
      if (e) throw new Error(e);
      fn();
    });
  }

  colidx.find({}, function(err, c) {
    if (err) throw new Error(err);
    else c.toArray(function(error, items) {
      var idx;
      if (items.length == 1) {
        idx = ++items[0].num;
        colidx.update({_id:items[0]._id}, items[0], {}, function(e) {
          if (e) throw new Error(e);
          insert_arg(idx);
        });
      } else {
        idx = 0;
        var col = new mongo.Collection(client, "idx");
        colidx.insert({num:idx}, function(e) {
          if (e) throw new Error(e);
          insert_arg(idx);
        });
      }
    });
  });
}

function raise(str) {
  logger.error(str);
  exit();
}

var db = new mongo.Db("java_msc", new mongo.Server("localhost", 27017));
var client;
db.open(function(error, c) {
  client = c;
  start();
});


function testh() {
  //doit("[*testando.A::a()*] should throw [*testando.E*] because it calls [*ORIGIN*]")

  //doit("{*testando.A::a()*} {*testando.SuperA::a()*} should throw {*testando.E*}");

  //doit("{*testando.SuperA::a()*} {*testando.SuperAA::a()*} should throw {*testando.E*}")
  //doit("{*testando.A::a()*} {*testando.SuperA::a()*} should throw {*testando.E*}");

  //doit("{*testando.SuperAA::a()*} {*testando.SuperSuper::a()*} should throw {*testando.E*}");
  //doit("{*testando.SuperA::a()*} {*testando.SuperAA::a()*} should throw {*testando.E*}");
  //doit("{*testando.A::a()*} {*testando.SuperA::a()*} should throw {*testando.E*}");
}

// propagating E: {A <: SuperA}::a() -> S::s();
// propagating E: {A <: SuperA}::a() -> Z::z();
function test1() {

  //doit("[*A::a()*] should throw [*E*] because it calls [*ORIGIN*]");
     /* [{node:A::a(), calls:[]}] */
     //propagating E: A::a();


  //doit("{*A::a()*} {*SuperA::a()*} should throw {*E*}");
    /* [{node:A::a(), calls:[]}, {node:SuperA::a, calls:[]}]  || [{type:A, super:SuperA, meth: a()}]*/

    ///*overriding*/ propagating E: {A<:SuperA}::a();
    //propagating E: A::a();


  //doit("[*B::b()*] should throw [*E*] because it calls [*A::a()*]");
    /* [{node:A::a(), calls:[]}, {node:SuperA::a, calls:[],virtual:true}, {node:B::b(), calls:[<A::a>]]}
       || [{type:A, super:SuperA, meth: a()}]*/
    ///*overriding*/ propagating E: {A<:SuperA}::a();
    //propagating E: A::a() -> B::b();


  //doit("[*S::s():*] should throw [*E*] because it calls [*SuperA::a()*]");
    /* [{node:A::a(), calls:[]}, {node:SuperA::a, calls:[],virtual:false}, {node:B::b(), calls:[<A::a>]], {node:S::s, calls:<SuperA>}]
       || [{type:A, super:SuperA, meth: a()}]*/
    //!-- no more overriding needed
    //propagating E: {A<:SuperA}::a() -> S::s();
    //propagating E: A::a() -> B::b();

  //doit("[*Z::z()*] should throw [*E*] because it calls [*SuperA::a()*]");
    /* [{node:A::a(), calls:[]}, {node:SuperA::a, calls:[],virtual:false}, {node:B::b(), calls:[<A::a>]], {node:S::s, calls:<SuperA>},
        {node:Z::z, calls:<SuperA>}
       || [{type:A, super:SuperA, meth: a()}]*/
    //!-- no more overriding needed
    //propagating E: {A<:SuperA}::a() -> S::s();
    //propagating E: A::a() -> B::b();
    //propagating E: {A<:SuperA}::a() -> Z::z();
}

function test2() {
  //doit("[*A::a()*] should throw [*E*] because it calls [*ORIGIN*]");
  //doit("[*B::b()*] should throw [*E*] because it calls [*A::a()*]");
  //doit("[*C::c()*] should throw [*E*] because it calls [*B::b()*]");
  //doit("[*D::d()*] should throw [*E*] because it calls [*B::b()*]");

  //doit("{*C::c()*} {*SuperC::c()*} should throw {*E*}");
  //doit("{*SubB::b()*} {*B::b()*} should throw {*E*}");

  //doit("[*SuperC::c()*] should throw [*E*] because it calls [*D::d()*]");

  //doit("[A::s()] should throw [E] because it calls [A::a()]");
  //doit("[A::d()] should throw [E] because it calls [A::s()]");
  //doit("[A::f()] should throw [E] because it calls [A::c()]");
  //doit("[A::e()] should throw [E] because it calls [A::s()]");
  //doit("[A::g()] should throw [E] because it calls [A::d()]");
  //doit("[A::g()] should throw [E] because it calls [A::f()]");
}

var argument = null
function start() {
  //return process.exit(0);
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
  argument = arg;
  d(" ============== INIT ============= ");
  d("input: " + arg);
  if (arg[0] == '{') {
    do_super(arg);
  } else {
    do_path(arg);
  }
}

function do_super(arg) {
//  doit("{A::a()} {SuperA::a()} should throw {E}");

  var regex = /\{\*([^\*]+)\*}/g
  var match;
  var t = [];
  while (match = regex.exec(arg)) {
    t.push(match[1]);
  }

//[ 'A::a()', 'SuperA::a()', 'E' ]
  var spec = {ex: t[2], base: t[1], sub: t[0]};
  d({do_super: spec})

  update_hierarchy(spec.ex, spec.sub, spec.base, function() {
    create_node(spec.ex, spec.base, null, true,exit);
  });
}

function do_path(arg) {
  //doit("[S::s()] should throw [E] because it calls [A::a()]");

  var regx = /\[\*([^\*]+)\*\]/g;
  var match;
  var triple = [];
  while (match = regx.exec(arg)) {
    triple.push(match[1]);
  }
  var spec = {ex: triple[1], call: triple[2], node: triple[0]};
  d({do_path: spec})

  if (spec.node.match(/anonymous/)) {
    d("anonymous found");
    exit();
    return;
  }
  if (spec.call == "ORIGIN") {
    d('creating node that calls ORIGIN')
    get_node(spec.ex, spec.node, function(node) {
      if (node) {
        d("duplicated node...passing");
        exit();
      } else {
        create_node(spec.ex, spec.node, null, false,exit)
      }
    });
  } else {
    d('looking for exitsing call node...')
    get_node(spec.ex, spec.call, function(call_node) {
      d('looking for existing node ...')
      get_node(spec.ex, spec.node, function(node) {
        if (node) {
          d('node found')
          if (call_node) {
              d('Adding call to existing node')
              add_call(node, call_node, exit);
          } else {
            d('node found with no registered call node')
            if (node.ex != spec.ex) {
              d("Exceptions differ. Create new node for new exception")
              create_node(spec.ex, spec.node, null, false, exit)
            } else {
              d("Exceptions are equal -- do nothing")
              exit();
            }
          }
        } else {
          if (call_node) {
            d('No node found. Creating one with callnode')
            d({callnode: call_node})
            create_node(spec.ex, spec.node, call_node, false, function() {
              call_node.virtual = false;
              update_node(call_node, exit);
            });
          } else {
            d('No node found. Creating one -- no callnode')
            create_node(spec.ex, spec.node, null, false, exit);
          }
        }
      });
    });
  }
}

function add_call(node, call_node, fn) {
  var col = new mongo.Collection(client, "trees");
  for (var i = 0; i < node.calls.length; i++) {
    if (node.calls[i].toString() == call_node._id.toString()) {
      d("call already added. Skipping...");
      fn();
      return;
    }
  }
  node.calls.push(call_node._id);
  col.update({_id: node._id}, node, {}, function(e) {
    if (e) throw new Error(e);
    d("node updated with new call");
    call_node.virtual = false;
    col.update({_id: call_node._id}, call_node,{}, function(e) {
      if (e) throw new Error(e);
      d("callnode virtual field updated");
      fn();
    })
  });
}

function get_node(ex, idx, retf) {
  var col = new mongo.Collection(client, "trees");
  d({lookup: {ex: ex, node: idx}})
  col.find({ex: ex, node: idx}, function(e, c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, items) {
      if (items.length > 1) raise("more than one node throwing " + ex + " found");
      retf( (items.length == 1) ? items[0] : null );
    });
  });
}

function create_node(ex, node, call_node, virtual, fn) {
  var col = new mongo.Collection(client, "trees");

  var calls = call_node ? [call_node._id] : [];

  col.find({ex: ex, node: node}, function(err, c) {
    if (err) throw new Error(err);
    else c.toArray(function(error, items) {
      if (items.length == 0) {
        col.insert({ex: ex, node: node, calls: calls, virtual:virtual}, function(error, docs) {
          if (error) throw new Error(error);
          d({inserted_node: docs});
          fn();
        });
      } else {
        d("Trying to add duplicated node. skipping");
        fn();
      }
    });
  });
}



function update_hierarchy(ex, sub, base, fn) {
  var col = new mongo.Collection(client, "hierarchy");

  function insert_child(parent) {
    d({doing_relationship: {sub: sub, parent:parent}})
    col.find({ex:ex, node: sub}, function(e,c) {
      if (e) throw new Error(e);
      else c.toArray(function(error, child) {
        if (child.length == 0) {
          d("no sub found. inserting new node for sub...")
          col.insert({ex: ex, node:sub, parent:parent._id}, function(error,docs) {
            if (error) throw new Error(error);
            d({inserted_sub: docs});
            fn();
          });
        } else if (child.length == 1) {
          d({found_sub: child[0]})
          if (child[0].parent == null) {
            child[0].parent = parent._id;
            col.update({_id:child[0]._id}, child[0], {}, function(e) {
              d({updated_child: child[0]});
              fn();
            });
          } else if (child[0].parent.toString() == parent._id.toString()) {
            d("Child is already subclass of its parent. bail")
            fn();
          } else {
             raise("BUG: trying to change class/subclass relationship");
          }
        } else {
          fn();
        }
      });
    });
  }

  col.find({ex:ex, node: base}, function(e,c) {
    if (e) throw new Error(e);
    else c.toArray(function(error, parents) {
      d({total_parents: parents})
      if (parents.length > 1) {
        raise("More than one node found in hierarchy");
      } else if (parents.length == 0) {
        col.insert({ex: ex, node: base, parent:null}, function(err, docs) {
          if (error) throw new Error(error);
          d({new_parent_inserted: docs});
          insert_child(docs[0]);
        });
      } else { //parents.length == 1
        d({found_parent: parents});
        insert_child(parents[0]);
      }
    })
  });
}

function update_node(call_node, fn) {
  var col = new mongo.Collection(client, "trees");

  col.update({_id: call_node._id}, call_node,{}, function(e) {
      if (e) throw new Error(e);
      d("callnode virtual field updated");
      fn();
  });
}

function clazz(pair) {
  return pair.match(/[^:]+/)[0];
}

function meth(pair) {
  return pair.match(/::(.*)/)[1];
}
