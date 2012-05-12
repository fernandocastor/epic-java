class E extends Exception {
}


class A {
    void a() {
        throw new E();
    }
}

abstract class SupB {
    abstract void b();
}

class B extends SupB {
    void b() {
        new A().a();
    }
}

class S {
    void s() {
        SupB b = new B();
        b.b();
    }
}

propagate E: A::a() -> {B <: SupB}::b() -> S::s();