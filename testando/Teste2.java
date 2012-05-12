
class E extends Exception {}

class A {
    void a() throws E {
        if (true) throw new E();
    }

    void b() {  a();   }
    void c() {  a();   }

    void s() {
        a();
        b();
    }

    void d() { s(); }
    void e() { s(); }

    void f() { c(); }

    void g() {
        d();
        e();
        f();
    }
}
