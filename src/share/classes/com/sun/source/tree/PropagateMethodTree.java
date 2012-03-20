package com.sun.source.tree;
import java.util.List;

public interface PropagateMethodTree extends ExpressionTree {
    ExpressionTree getSelector();
    List<? extends VariableTree> getParams();
}
