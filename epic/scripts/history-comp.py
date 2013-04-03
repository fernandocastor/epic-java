#!/usr/bin/python

# $ history-comp <only-diff-ex> <db-1> <db-2>
#
# this script tries to find paths in db-1 and db-2 channel collections
# which intersect in a least some method. If only-diff-ex is true,
# only show the channels with intersecting methods and different
# exception types
#
# ex:
# $ history-comp true fm090_reversed_paths fm081_reversed_paths
#



import sys
import os
import pymongo

comp_diff = sys.argv[1]
dbname1 = sys.argv[2]
dbname2 = sys.argv[3]

con = pymongo.Connection("localhost")
db1 = con[dbname1]
db2 = con[dbname2]

channels1 = db1.channels
channels2 = db2.channels


c1s = [x for x in channels1.find()]
c2s = [x for x in channels2.find()]

done = []

def compare(c1, c2):
    for i in range(0, len(c1)):
        for j in range(i, len(c2)):
            if c1[i] == c2[j]:
                return c1[i]

def repeated(c1, c2):
    global done
    for d in done:
        if d[0] == str(c1["channel"]) and d[1] == str(c2["channel"]):
            return True
        else:
            return d[0] == str(c2["channel"]) and d[1] == str(c1["channel"])

def print_c(c1, c2, s,l,r):
    global done
    if not repeated(c1, c2):
        done.append([str(c1["channel"]), str(c2["channel"])])
        print "* Ex types: " + c1["ex"] + " | " + c2["ex"]
        print "* Similar on: " + s
        print "* " + l + " :: " + str(c1["channel"])
        print "++"
        print "* " + r + " :: " + str(c2["channel"])
        print "--------------------------"

def doit(l,r, c1s, c2s):
    for i in range(0, len(c1s)):
        for j in range(i, len(c2s)):
            if len(c1s[i]["channel"]) > 1 or len(c2s[j]["channel"]) > 1:
                s = compare(c1s[i]["channel"], c2s[j]["channel"])
                if s != None:
                    if comp_diff == "false":
                        print_c(c1s[i], c2s[j],s,l,r)
                    elif c1s[i]["ex"] != c2s[j]["ex"]:
                        print_c(c1s[i], c2s[j],s,l,r)

doit('left', 'right', c1s, c2s)
doit('right', 'left',c2s, c1s)
