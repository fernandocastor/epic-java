/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package com.sun.tools.javac.comp;

import com.sun.tools.javac.tree.TreeScanner;
import com.sun.tools.javac.code.Types;
import com.sun.tools.javac.tree.JCTree.JCExpression;
import com.sun.tools.javac.tree.JCTree.JCMethodDecl;
import com.sun.tools.javac.util.Context;
import com.sun.tools.javac.util.Log;


public class ThrowCounter extends TreeScanner{

    //every tree has this thing...
    protected static final Context.Key<ThrowCounter> tKey =
        new Context.Key<ThrowCounter>();

    public static ThrowCounter instance(Context context) {
        ThrowCounter instance = context.get(tKey);
        if (instance == null)
            instance = new ThrowCounter(context);
        return instance;
    }

    //private final Names names;
    private final Log log;
    private Types types;
    //private final Symtab syms;
    //private final Types types;
    private final Check chk;
    //private       TreeMaker make;
    //private final Resolve rs;
    //private Env<AttrContext> attrEnv;
    //private       Lint lint;
    //private final boolean allowImprovedRethrowAnalysis;
    //private final boolean allowImprovedCatchAnalysis;
    public ThrowCounter(Context context) {
        //...and this thing.
        //context.put(pflowKey, this);
        this.types = Types.instance(context);
        log = Log.instance(context);
        chk = Check.instance(context);
    }
    
    public void count(Env<AttrContext> e) {
        scan(e.toplevel);
    }
    
    public void visitMethodDef(JCMethodDecl tree) {
        //to count methods
        //if (tree.thrown.size() > 0) {
        //    ScriptPropagate.throwing(tree.sym.owner + "::"+tree.sym, "whatever");
        //}
        //to setup methods vs. exceptions they throw
        for(JCExpression e: tree.thrown) {
            ScriptPropagate.throwing(tree.sym.owner + "::"+tree.sym, e.type.toString());
        }
    }    
}
