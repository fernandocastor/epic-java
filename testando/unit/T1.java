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

propagating E: A::a() -> S::s();