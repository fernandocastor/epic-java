#!/usr/bin/python

# count-ex.py <db-name> <method-pattern>

# shows the number of methods throwing exceptions in db-name.
# method-pattern defines the initial string to match against the
# method's fully qualified name.

import sys
import os
import pymongo
import re

def dd(x):
    print x

dbname = sys.argv[1]
pattern = sys.argv[2]

con = pymongo.Connection("localhost")
db = con[dbname]

col = db.app_exceptions

i=0
dup = []
for node in  col.find():
    for method in node["methods"]:
        if method.startswith(pattern) and method not in dup:
            i=i+1
            dup.append(method)

print i
