
class E extends Exception {
}


class A {
    void a() {
        throw new E();
    }
}

class C {
    void c() {
        new A().a();
    }
}

class SupB {
    void b() {
        new C().c();
    }
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