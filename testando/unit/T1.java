class E extends Exception {
}

class A {
    void a() {
        throw new E();
    }
}

class S {
    void s() {
        new A().a();
    }
}

propagate E: A::a() -> S::s();