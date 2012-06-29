class E extends Exception {
}

class A {
    void a() {
        throw new E();
    }
}

class B {
    void b() {
        new A().a();
    }
}

class S {
    void s() {
        new B().b();
    }
}

propagating E: A::a() -> S::s();