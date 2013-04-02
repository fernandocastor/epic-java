#!/usr/bin/python

import sys
import os
import pymongo

dbname = sys.argv[1]

con = pymongo.Connection("localhost")
db = con[dbname]


output = ""
def append(string):
    global output
    output = output + string + "\n"

def prepend(string):
    global output
    output = string + "\n" + output



def to_sig(term):
    if len(term["subs"]) == 0:
        return term["type"]+"."+term["name"]
    else:
        terms = db.terms
        sub_terms = [terms.find_one({"_id":sub_id}) for sub_id in term["subs"]]
        return "{"+', '.join([t["type"] for t in sub_terms]) + " <: " + term["type"] + "}." + sub_terms[0]["name"]

def print_path(path):
    terms = db.terms
    ts = [terms.find_one({"_id":tid}) for tid in path["terms"]]
    if len(ts) > 1 or terms.find({"subs":ts[0]["_id"]}).count() == 0: #check if this is covered py a poly
        append("propagating " + path["ex"] + ": " + ' => '.join([to_sig(t) for t in ts]) + ";")

def print_poly(poly):
    prepend("propagating " + poly["ex"] + ": " + to_sig(poly) + ";")

def doit():
    # ordinary paths
    paths = db.paths
    for path in paths.find():
        print_path(path)

    terms = db.terms
    paths = db.paths
    # poly terms with no path
    for poly in terms.find({"subs":{"$ne":[]}}):
        if paths.find_one({"terms":poly["_id"]}) == None:
            print_poly(poly)

    print output

doit()

# col = db.nodes

# output = ""
# def append(string):
#     global output
#     output = output + string + "\n"

# def prepend(string):
#     global output
#     output = string + "\n" + output

# # def is_poly(node):
# #     for poly in poly_nodes:
# #         if poly["super"] == node["type"] and poly["name"] == node["name"]:
# #             return True
# #     return False

# def sig_for(node):
#     if node["parent"] == None:
#         return node["type"] + "." + node["name"]
#     else:
#         parent = col.find_one({"_id":node["parent"], "ex":node["ex"]})
#         children = [x for x in col.find({"parent":parent["_id"], "ex":node["ex"]})]
#         for poly in poly_nodes:
#             if poly["ex"] == parent["ex"] and poly["super_type"] == parent["type"]:
#                 poly["done"] = True
#         return "{" + ", ".join([c["type"] for c in children]) + "<:" + parent["type"] + "}." + node["name"]

# def poly_covering(node):
#     for poly in poly_nodes:
#         if poly["ex"] == node["ex"] and\
#                 poly["name"] == node["name"] and\
#                 (node["type"] == poly["super_type"] or\
#                      node["type"] in poly["subs"]):
#             return poly
#     return None

# def print_propagate(ex, path):
#     poly = poly_covering(path[0])
#     if len(path) == 1 and poly != None:
#         poly["done"] = True
#         prepend("propagating " + poly["ex"] + ": " + "{" + ', '.join(poly["subs"]) + " <: " + poly["super_type"] + "}." + poly["name"] + ";")
#     else:
#         append("propagating " + ex + ": " + ' => '.join([sig_for(x) for x in path]) + ";")

# def build_paths(node, path):
#     callers = col.find({"calls":node["_id"], "ex":node["ex"]})
#     if callers.count() == 0:
#         if node["parent"]:
#             parent = col.find_one({"_id":node["parent"]})
#             build_paths(parent, path)
#         else:
#             print_propagate(node['ex'], path)

#     else:
#         for caller in callers:
#             build_paths(caller, path + [caller])

#         if node["parent"]:
#             parent = col.find_one({"_id":node["parent"]})
#             build_paths(parent, path + [parent])

# for root in col.find({"calls":None}):
#     build_paths(root, [root])



# for poly in poly_nodes:
#     if "done" not in poly:
#         prepend("propagating " + poly["ex"] + ": " + "{" + ', '.join(poly["subs"]) + " <: " + poly["super_type"] + "}." + poly["name"] + ";")

# print output
