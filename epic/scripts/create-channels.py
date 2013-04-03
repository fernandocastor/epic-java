#!/usr/bin/python

# $ create-channels <dbname>
#
# this script creates the channel collection based on terms/paths collection
# of the dbname DB. The channel collection is in the form
#
#   {exceptions: [E1,E2..],
#    size: <number of nodes in the channel: this.path.length>
#    path: [string1, string2, ...]}
#
# which is easier to work with, when comparing versions of projects. Ex:
#
# $ create-channels  fm090_reversed_paths
#
#

import sys
import os
import pymongo

dbname = sys.argv[1]

con = pymongo.Connection("localhost")
db = con[dbname]

channels = db.channels

def store(ex, sigs):
    channels.insert({"ex":ex,
                     "channel":sigs})

def to_sig(term):
    if len(term["subs"]) == 0:
        return term["type"]+"."+term["name"]
    else:
        terms = db.terms
        sub_terms = [terms.find_one({"_id":sub_id}) for sub_id in term["subs"]]
        return "{"+', '.join([t["type"] for t in sub_terms]) + " <: " + term["type"] + "}." + term["name"]

def add_path(path):
    terms = db.terms
    ts = [terms.find_one({"_id":tid}) for tid in path["terms"]]
    if len(ts) > 1 or terms.find({"subs":ts[0]["_id"]}).count() == 0: #check if this is covered py a poly
        store(path["ex"], [to_sig(t) for t in ts])

def add_poly(poly):
    store(poly["ex"], [to_sig(poly)])

def doit():
    # ordinary paths
    paths = db.paths
    for path in paths.find():
        add_path(path)

    terms = db.terms
    paths = db.paths
    # poly terms with no path
    for poly in terms.find({"subs":{"$ne":[]}}):
        if paths.find_one({"terms":poly["_id"]}) == None:
            add_poly(poly)

doit()

