package com.sun.source.tree;
import java.util.List;

public interface PropagateMethodOrTree extends ExpressionTree {
    List<? extends Tree> getOred();
}
