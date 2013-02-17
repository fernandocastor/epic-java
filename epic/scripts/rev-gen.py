#!/usr/bin/python

import sys
import os
import pymongo

dbname = sys.argv[1]

con = pymongo.Connection("localhost")
db = con[dbname]
col = db.nodes


def print_propagate(node, path):
    callers = col.find({"calls":node["_id"], "ex":node["ex"]})
    if callers.count() == 0:
        print "propagating " + node["ex"] + ": " + path + ";"
    else:
        for caller in callers:
            print_propagate(caller, path + " => " + caller["owner"] + "." + caller["name"])

for root in col.find({"calls":None}):
    print_propagate(root, root["owner"] + "." + root["name"])
