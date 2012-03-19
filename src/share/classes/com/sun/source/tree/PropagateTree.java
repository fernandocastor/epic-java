package com.sun.source.tree;
import java.util.List;

/**
 * A tree node for an propagate expression.
 * propagate E: A.m(int a) -> B.x();
 *           |     |           |
 *           |    LHS         RHS
 *           |-> throws
 */
public interface PropagateTree extends ExpressionTree {
    ExpressionTree getThrows();
    List<? extends VariableTree> getLHS();
    List<? extends VariableTree> getRHS();
}
