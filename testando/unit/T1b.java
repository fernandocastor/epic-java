class E extends Exception {
}

class A {
    void a(int x) {
        throw new E();
    }
    void a() {
    }
}

class S {
    void s() {
        new A().a(1);
    }
}

propagate E: A::a(int) -> S::s();