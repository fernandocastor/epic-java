#!/usr/bin/python

# count-ex.py <method-name>##<exception-type>

# inserts in the app_exceptions collection of ENV["EPIC_DB"] the
# information above in the following format:
#
# {"ex": <exception-type>, "methods": [m1, m2, ....mn]}


import sys
import os
import pymongo
import re

def dd(x):
    print x

input = sys.argv[1]
dbname = os.environ["EPIC_DB"]

con = pymongo.Connection("localhost")
db = con[dbname]

col = db.app_exceptions

method, ex = input.split("#")

node = col.find_one({"ex":ex})
if node == None:
    col.insert({"methods":[method],"ex":ex})
else:
    col.update({"_id":node["_id"]},{"$set":{"methods":node["methods"]+[method]}})
