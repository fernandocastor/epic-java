class E extends Exception {
}


class A {
    void a() {
        throw new E();
    }
}

class SupB {
    void b() {
        new A().a();
    }
}

class B extends SupB {
}

class S {
    void s() {
        B b = new B();
        b.b();
    }
}

propagate E: A::a() -> B::b() -> S::s();