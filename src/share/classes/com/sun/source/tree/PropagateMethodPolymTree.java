package com.sun.source.tree;
import java.util.List;

public interface PropagateMethodPolymTree extends ExpressionTree {

    List<? extends ExpressionTree> getSubs();
    ExpressionTree getSup();
    List<? extends ExpressionTree> getSelectors();
    List<? extends VariableTree> getParams();
}
