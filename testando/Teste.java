package testando;

class E extends Exception {}

class A {
    void a() {
        throw new E();
    }

    void b() {
        a();
    }

    void c() {
        b();
    }

    void e() {
        b();
    }

    void d() {
        c();
    }
    void f() {
        d();
        e();
    }
}

propagating E: A.a() | A.b() -> A.f();
