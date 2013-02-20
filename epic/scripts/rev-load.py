#!/usr/bin/python

# DB structure:
#   db.terms = {signature,name,type,ex, subs:[...]} //subs is array of term ids
#   db.paths = {ex,terms:[...]} //terms is array of term ids

# -each path corresponds to a single propagate statement
#   -therefore, there may be terms with same signature differing on ex
#   - ...     , there may be paths with same terms differing on ex
# -Calling errors have the caller appended to the corresponding path's terms
#  where callee is part of
# -inheritance error adds subtype info to the term, based on ex
#  (tied to ex, so we don't specify a tree of classes for every exception,
#   since not all subtypes may throw all exceptions of the super type)

# terms with subype info that are not part of a path should
# have a propagate for them only.

# examples of input:

# [!A::f()!] should throw [!E!] because it calls [!ORIGIN!]
#  [!A::g()!] should throw [!E!] because it calls [!A::f()!]
#   [!A::h()!] should throw [!E!] because it calls [!A::g()!]
#   [!A::i()!] should throw [!E!] because it calls [!A::g()!]
#  [!A::j()!] should throw [!E!] because it calls [!A::f()!]

# {!A::f()!} {!SuperA::f()!} should throw {!E!}

#  [!B::k()!] should throw [!E!] because it calls [!SuperA::f()!]

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

def add_call_chain():
    sig, ex, origin_sig = re.findall("\[!([^!]+)!\]", input)
    ftype, fname = sig.split("::")

    # check for anonymous class
    if sig.startswith("<ano"):
        dd("its an anonymous!")
        col = db.err
        col.insert({"reason": "anonymous"})
        sys.exit(1)

    terms = db.terms

    # don't add duplicate
    n = terms.find_one({"signature":sig,"ex":ex})
    if n != None:
        raise Exception("there shouldn't be a term here")

    # get a term for the caller
    term = terms.find_one({"signature":sig, "ex":ex})
    if term != None:
        dd("A term was found for " + sig)
        term_id = term["_id"]
    else:
        dd("Creating a term for " + sig)
        term_id = terms.insert({"name": fname,
                                "type": ftype,
                                "signature":sig,
                                "ex": ex,
                                "subs":[]})

    # if ORIGIN, create a new path with term as head
    # else, find the paths with (origin,ex) and append term to it
    #   if (origin) is not tail, duplicate the path, prune rest, and append term
    paths = db.paths
    if origin_sig == "ORIGIN":
        dd("its origin, creating a path...")
        paths.insert({"ex":ex,
                      "terms":[term_id]})
    else:
        dd("its not origin, finding paths...")
        org = terms.find_one({"signature": origin_sig, "ex":ex})
        if org == None:
            raise Exception("we *should* have an origin here")
        p = paths.find_one({"ex":ex,"terms":org["_id"]})

        if p == None: # super::f may not be part of any path, because of overriding error
                      # (see add_hierarchy below). Lets create one with two slots
            paths.insert({"ex":ex,
                          "terms":[org["_id"], term_id]})
        else:
            aterms = p["terms"]
            spliced = aterms[:aterms.index(org["_id"])] + [org["_id"]]
            if spliced == aterms: # org is tail, just append and update
                dd("a path has org as tail, updating")
                p["terms"].append(term_id)
                paths.update({"_id":p["_id"]}, {"$set":{"terms":p["terms"]}})
            else: # org was in the middle of the path, create another path
                dd("a path has org in middle, duplicating path")
                spliced.append(term_id)
                paths.insert({"ex":ex,
                              "terms":spliced})

def add_hierarchy():
    subsig, supersig, ex = re.findall("{!([^!]+)!}", input)

    terms = db.terms

    sub_type, fname = subsig.split("::")
    super_type, fname = supersig.split("::")

    ts = terms.find({"signature":supersig,"ex":ex})
    if ts.count() > 0: # just add sub info and we are done
        for t in ts:
            term["subs"].append(sub_type)
            terms.update({"_id":term["_id"]}, {"$set":{"subs":term["subs"]}})
    else: #there is no path with base::f.
          #create term for them. They are not part of a path, so we will have single propagates for them
        sub = terms.find_one({"ex":ex, "signature":subsig})
        if sub == None:
            raise Exception("there should be a sub method here")

        term_id = terms.insert({"name": fname,
                                "type": super_type,
                                "signature":supersig,
                                "ex": ex,
                                "subs":[sub["_id"]]})


####

if input.startswith("[!"):
    dd("adding call chain")
    add_call_chain()
elif input.startswith("{!"):
    add_hierarchy()
else:
    raise Exception("Unknow input")
