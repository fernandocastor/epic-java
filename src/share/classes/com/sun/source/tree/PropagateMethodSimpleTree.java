package com.sun.source.tree;
import java.util.List;

public interface PropagateMethodSimpleTree extends ExpressionTree {
    ExpressionTree getSelector();
    List<? extends VariableTree> getParams();
}
