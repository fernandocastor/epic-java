class E extends Exception {
}


class A {
    void a() {
        throw new E();
    }
}

class SupB {
    void b() { } 
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

propagating E: A::a() -> S::s();