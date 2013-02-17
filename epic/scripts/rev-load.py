#!/usr/bin/python

#
#
#[!testando.A::f(java.lang.Object)!] should throw [!V!] because it calls [!testando.A::g()!]

# 0: {
#    fullname: "testando.A::f(X)"
#    name: "f",
#    owner: "testando.A",
#    ex: [Exception, IOException]
#    calls: "ORIGIN" | [3,4,5]
# }

import sys
import os
import pymongo
import re

input = sys.argv[1]
dbname = os.environ["EPIC_DB"]

con = pymongo.Connection("localhost")
db = con[dbname]

def add_call_chain():
    fullname, ex, origin = re.findall("\[!([^!]+)!\]", input)
    owner, fname = fullname.split("::")

    if fullname.startswith("<ano"):
        col = db.err
        col.insert({"reason": "anonymous"})
        sys.exit(1)

        col = db.nodes

    # don't add duplicate
    n = col.find_one({"fullname":fullname, "ex":ex})
    if n != None:
        raise Exception("there shouldn't be a node here")

    # check for anonymous class
    if origin == "ORIGIN":
        col.insert({"fullname":fullname,
                    "name": fname,
                    "owner": owner,
                    "ex":ex,
                    "calls": None})
    else:
        callee = col.find_one({"fullname":origin, "ex":ex})
        if callee == None:
            raise Exception("where is the callee?")
        col.insert({"fullname": fullname,
                    "name": fname,
                    "owner": owner,
                    "ex": ex,
                    "calls": callee["_id"]})

def add_hierarchy():
    subclass, superclass, ex = re.findall("{!([^!]+)!}", input)

    col = db.poly

    super_type, super_fname = superclass.split("::")
    super_node = col.find_one({"name":super_fname, "type":super_type, "ex":ex})
    if super_node == None:
        super_node_id = col.insert({"name":super_fname, "type":super_type, "parent":None, "ex":ex})

    sub_type, sub_fname = subclass.split("::")
    col.insert({"name":sub_fname, "type": sub_type, "parent": super_node_id, "ex":ex})


####

if input.startswith("[!"):
    add_call_chain()
elif input.startswith("{!"):
    add_hierarchy()
else:
    raise Exception("Unknow input")
