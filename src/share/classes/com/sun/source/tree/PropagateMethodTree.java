package com.sun.source.tree;
import javax.lang.model.element.Name;
import java.util.List;

public interface PropagateMethodTree extends ExpressionTree {
    ExpressionTree getClassName();
    Name getMethodName();
    List<? extends VariableTree> getParams();
}
