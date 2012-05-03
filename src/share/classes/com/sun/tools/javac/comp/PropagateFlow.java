package com.sun.tools.javac.comp;

import com.sun.tools.javac.code.Kinds;
import com.sun.tools.javac.code.Symbol;
import com.sun.tools.javac.code.Type;
import com.sun.tools.javac.tree.JCTree;
import com.sun.tools.javac.tree.TreeScanner;
import com.sun.tools.javac.util.Context;
import com.sun.tools.javac.util.Log;

import java.util.ArrayList;
import java.util.List;

public class PropagateFlow extends TreeScanner {
    //every tree has this thing...
    protected static final Context.Key<PropagateFlow> pflowKey =
        new Context.Key<PropagateFlow>();

    public static PropagateFlow instance(Context context) {
        PropagateFlow instance = context.get(pflowKey);
        if (instance == null)
            instance = new PropagateFlow(context);
        return instance;
    }

    Env<AttrContext> env;
    //private final Names names;
    private final Log log;
    //private final Symtab syms;
    //private final Types types;
    //private final Check chk;
    //private       TreeMaker make;
    //private final Resolve rs;
    //private Env<AttrContext> attrEnv;
    //private       Lint lint;
    //private final boolean allowImprovedRethrowAnalysis;
    //private final boolean allowImprovedCatchAnalysis;
    public PropagateFlow(Context context) {
        //...and this thing.
        //context.put(pflowKey, this);
        log = Log.instance(context);
    }

    private ArrayList<Env<AttrContext>> envs;
    public void analysePropagate(ArrayList<Env<AttrContext>> envs) {
        this.envs = envs;
//        this.env = env;
//        for (JCTree p: env.toplevel.props) {
//            buildGraph((JCTree.JCPropagate)p);
//        }
        //scan(env.tree);

                /* -find out how to add "throws E" to the tree.
                 *   * JCTree$JCMethodDecl.thrown attribute
                 *   we should construct that object
                 * - Figure what structure to store the constructing
                 *   paths. When the path reaches the LHS,
                 *   we should set "thrown" attribute for each node.
                 */
        for(Env<AttrContext> e : envs) {
            if (e.tree.getTag() == JCTree.PROPAGATE) {
                try {
                    JCTree.JCPropagate p = (JCTree.JCPropagate)e.tree;
                    log.useSource(e.toplevel.sourcefile);
                    process(p);
                } catch(Exception ex) {
                    ex.printStackTrace();
                    //report unable to build paths
                }
            }
        }
    }

    List<JCTree.JCMethodDecl> lookupMethods(JCTree.JCPropagateMethodSimple m) {
        JCTree.JCClassDecl clazz = getClassForType(m.selector.selected.type);

        if (clazz == null) return null;

        JCTree.JCMethodDecl method = getOwnMethod(clazz, m.sym);
        List<JCTree.JCMethodDecl> lst = new ArrayList<JCTree.JCMethodDecl>();
        if (method == null) {
            method = getSuperMethod(clazz, m.sym);
        }
        lst.add(method);
        return lst;
    }

    List<JCTree.JCMethodDecl> lookupMethods(JCTree.JCPropagateMethodPolym m) {
        List<JCTree.JCMethodDecl> ret = new ArrayList<JCTree.JCMethodDecl>();
        for(JCTree.JCExpression s : m.selectors) {
            JCTree.JCFieldAccess f = (JCTree.JCFieldAccess) s;
            JCTree.JCClassDecl clazz = getClassForType(f.selected.type);

            if (clazz == null) continue; //ignore ast-unreachable classes

            JCTree.JCMethodDecl method = getOwnMethod(clazz, f.sym);
            if (method == null) {
                log.error(m.pos(),
                        "propagate.no.method.found",
                        f.name.toString(), clazz.name.toString());
            } else {
                ret.add(method);
            }
        }
        return ret;
    }

    JCTree.JCMethodDecl lookupMethod(JCTree.JCMethodInvocation m) {
        JCTree.JCFieldAccess f = (JCTree.JCFieldAccess) m.meth;
        JCTree.JCClassDecl clazz = getClassForType(f.selected.type);

        if (clazz == null) return null;

        JCTree.JCMethodDecl method = getOwnMethod(clazz, f.sym);
        if (method == null) {
            method = getSuperMethod(clazz, f.sym);
        }
        return method;
    }

    JCTree.JCClassDecl getClassForType(Type t) {
        if (t.tsym.owner.kind == Kinds.PCK) {
            for(Env<AttrContext> e : envs) {
                 if (t == e.tree.type) {
                        return (JCTree.JCClassDecl) e.tree;
                 }
            }
        } else if (t.tsym.owner.kind == Kinds.TYP) {
            JCTree.JCClassDecl outter = getClassForType(t.tsym.owner.type);
            for(JCTree def : outter.defs) {
                if (def.getTag() == JCTree.CLASSDEF) {
                    JCTree.JCClassDecl clazz = (JCTree.JCClassDecl) def;
                    if (t == def.type) {
                        return clazz;
                    }
                }
            }
        }
        return null;
    }

    JCTree.JCMethodDecl getSuperMethod(JCTree.JCClassDecl subclazz, Symbol sym) {
        JCTree.JCClassDecl clazz = getClassForType(subclazz.extending.type);

        if (clazz == null) return null;

        JCTree.JCMethodDecl method = getOwnMethod(clazz, sym);
        if (method == null) {
            method = getSuperMethod(clazz, sym);
        }
        return method;
    }

    JCTree.JCMethodDecl getOwnMethod(JCTree.JCClassDecl clazz, Symbol sym) {
        for (JCTree def : clazz.defs) {
            if (def.getTag() == JCTree.METHODDEF) {
                JCTree.JCMethodDecl method = (JCTree.JCMethodDecl) def;
                if (method.sym == sym) {
                    return method;
                }
            }
        }
        return null;
    }

    private List<List<JCTree.JCMethodDecl>> targetsLeft;
    private List<JCTree.JCMethodDecl> nextTargets;
    private PathTree currentTree;

    public void process(JCTree.JCPropagate p) {
        this.targetsLeft = new ArrayList<List<JCTree.JCMethodDecl>>();

        for(JCTree m : p.nodes) {
            List<JCTree.JCMethodDecl> methods = new ArrayList<JCTree.JCMethodDecl>();
            if (m.getTag() == JCTree.PROPAGATE_METHOD_SIMPLE) {
                methods = lookupMethods((JCTree.JCPropagateMethodSimple)m);
            } else if (m.getTag() == JCTree.PROPAGATE_METHOD_POLYM) {

                //important: the first item in this list
                //is the base type "C" in the decl "A,B<:C".
                //we will use this specifically later on
                methods = lookupMethods((JCTree.JCPropagateMethodPolym)m);

            } else {
                System.out.println("UOPS! this is a bug");
                //error!
            }
            if (methods.isEmpty()) {
                //some propagate nodes wheren't found
                //maybe due to previous errors or because
                //there is no AST in the envs for the specified method
                //...so bail
                return;
            }
            targetsLeft.add(methods);
        }
//        //popping...
        List<JCTree.JCMethodDecl> initials = targetsLeft.remove(targetsLeft.size()-1);
        this.nextTargets = targetsLeft.remove(targetsLeft.size()-1);

        for (JCTree.JCMethodDecl m : initials) {
            this.currentTree = new PathTree(m, p.thrown);
            buildpath(this.currentTree.node);
        }

        if (!this.currentTree.atLeastOnePathFound) {
            log.error(p.pos(),
                        "propagate.no.callgraph");
        }
    }

    void buildpath(PathNode node) {
        scan(node.self.body);
    }

    public boolean checkRecursion(JCTree.JCMethodDecl m, PathNode node) {
        if (node == null) {
            return false;
        } else if (node.self.type == m.type) {
            return true;
        } else {
            return checkRecursion(m, node.parent);
        }
    }

    boolean matchTargets(JCTree.JCMethodDecl m) {
        //we will match m on the nextTarget's head
        // -if its a simple node, the head is the actual node
        // -if its polym, the head is the base class
        JCTree.JCMethodDecl base = this.nextTargets.get(0);
        return (base.sym == m.sym);
    }

    public void visitApply(JCTree.JCMethodInvocation m) {
        JCTree.JCMethodDecl found = lookupMethod(m);
        if (found == null) {
            //the 'm' method is not in any ast
            //Doing nothing == finding a dead end in the graph path.
            //lets do nothing.
        } else if (checkRecursion(found, currentTree.node)) {
            //we already went that way...
            //lets do nothing
        } else if (matchTargets(found)) { //found is propagate node
            if (this.targetsLeft.isEmpty()) { //we found the last propagate node: full match
                currentTree.setRoot(found);
                currentTree.setupThrowPath();
            } else {
                //-load the next nextTargets
                //-proceed exploration of each method in each body of each method matched
                List<JCTree.JCMethodDecl> tgs = this.nextTargets;
                this.nextTargets = targetsLeft.remove(targetsLeft.size()-1);
                if (tgs.size() == 0) { //simple propagate
                    PathNode bk = currentTree.node;
                    currentTree.setRoot(tgs.get(0));
                    buildpath(currentTree.node);
                    currentTree.node = bk;

                } else { //polym propagate
                    //for all subtypes+supertype X, navigate on X:m()'s body
                    for (JCTree.JCMethodDecl t : tgs) {
                       PathNode bk = currentTree.node;
                       currentTree.setRoot(t);
                       buildpath(currentTree.node);
                       currentTree.node = bk;
                    }
                }
                targetsLeft.add(tgs);
                this.nextTargets = tgs;
            }
        } else if (found.body == null) {
            //found is abstract. dead end
        } else { //not a propagate node. keep searching
            PathNode bk = currentTree.node;
            currentTree.setRoot(found);
            buildpath(currentTree.node);
            currentTree.node = bk;
        }
    }



    class PathTree {
        public PathNode node = null;
        public JCTree.JCExpression thrown;
        public boolean atLeastOnePathFound;
        PathTree(JCTree.JCMethodDecl m, JCTree.JCExpression thr) {
            setRoot(m);
            this.thrown = thr;
            this.atLeastOnePathFound = false;
        }

        void setRoot(JCTree.JCMethodDecl m) {
            this.node = new PathNode(m, this.node);
        }

        void setupThrowPath() {
            this.atLeastOnePathFound = true;
            this.node.setupThrows(thrown);

            System.out.println(this.pathAsString(this.node));
        }

        String pathAsString(PathNode n) {
            if (n.parent != null) {
                return pathAsString(n.parent) + " -> "
                        + n.self.sym.owner.name + "::" + n.self.name
                        + "(" + n.self.params.toString(",") + ")";
            }
            return n.self.sym.owner.name + "::" + n.self.name
                    + "(" + n.self.params.toString(",") + ")";
        }
    }

    class PathNode {
        public PathNode parent;
        public JCTree.JCMethodDecl self;

        public PathNode(JCTree.JCMethodDecl m, PathNode parent) {
            this.parent = parent;
            this.self = m;
        }

        public void setupThrows(JCTree.JCExpression t) {
            if (!alreadyThrows((JCTree.JCIdent)t)) {
                this.self.thrown = this.self.thrown.append(t);
                this.self.type.asMethodType().thrown
                        = this.self.type.asMethodType().thrown.append(t.type);
            }
            if (this.parent != null) {
                this.parent.setupThrows(t);
            }
        }

        public boolean alreadyThrows(JCTree.JCIdent t) {
            for(JCTree.JCExpression e : self.thrown) {
                JCTree.JCIdent i = (JCTree.JCIdent) e;
                if (i.sym == t.sym) {
                    return true;
                }
            }
            return false;
        }
    }
}
