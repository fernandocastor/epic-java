package com.sun.tools.javac.comp;

import com.sun.tools.javac.code.Kinds;
import com.sun.tools.javac.code.Symbol;
import com.sun.tools.javac.code.Type;
import com.sun.tools.javac.tree.JCTree;
import com.sun.tools.javac.tree.TreeScanner;
import com.sun.tools.javac.util.Context;
import com.sun.tools.javac.util.Log;

import java.util.ArrayList;

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

    public void process(JCTree.JCPropagate p) {
        this.targets = new ArrayList<JCTree.JCMethodDecl>();

        for(JCTree.JCPropagateMethod m : p.nodes) {
            JCTree.JCMethodDecl method = lookupMethod(m);

            if (method == null) {
                //probably there was a semantic error
                //and m is not bound to any method. So, bail!
                return;
            } else {
                targets.add(method);
            }
        }

        //popping...
        JCTree.JCMethodDecl rhs = targets.remove(targets.size()-1);
        this.currentTarget = targets.remove(targets.size()-1);

        this.currentTree = new PathTree(rhs, p.thrown);

        buildpath(this.currentTree.node);

        if (!this.currentTree.atLeastOnePathFound) {
            log.error(p.pos(),
                        "propagate.no.callgraph");
        }
    }

    private PathTree currentTree;
    private ArrayList<JCTree.JCMethodDecl> targets;
    private JCTree.JCMethodDecl currentTarget;

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

    public void visitApply(JCTree.JCMethodInvocation m) {
        JCTree.JCMethodDecl found = lookupMethod(m);
        if (found == null) {
            //the 'm' method is not in any sources being
            //compiled.
            //lets do nothing.
        } else if (checkRecursion(found, currentTree.node)) {
            //we already went that way...
            //lets do nothing
        } else if (found.sym == this.currentTarget.sym) {
            if (targets.isEmpty()) {
                currentTree.setRoot(found);
                currentTree.setupThrowPath();
            } else {
                JCTree.JCMethodDecl bkTarget = this.currentTarget;
                this.currentTarget = targets.remove(targets.size()-1);
                PathNode bk = currentTree.node;
                currentTree.setRoot(found);
                buildpath(currentTree.node);
                targets.add(this.currentTarget);
                this.currentTarget = bkTarget;
                currentTree.node = bk;
            }
        } else if (found.body == null) {
            //found is abstract
            System.err.println(" -- Dealing with abstract method! --");
        } else {
            PathNode bk = currentTree.node;
            currentTree.setRoot(found);
            buildpath(currentTree.node);
            currentTree.node = bk;
        }
    }

    JCTree.JCMethodDecl lookupMethod(JCTree.JCPropagateMethod m) {
        JCTree.JCClassDecl clazz = getClassForType(m.selector.selected.type);

        if (clazz == null) return null;

        JCTree.JCMethodDecl method = getOwnMethod(clazz, m.sym);
        return method;
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
}
