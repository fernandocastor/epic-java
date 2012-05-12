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

class C {
    void c() {
        if (true) { new A().a(); }
        else { new S().s();  }
    }
}

class S {
    void s() {
        new B().b();
        new C().c();
    }
}

propagate E: A::a() -> S::s();