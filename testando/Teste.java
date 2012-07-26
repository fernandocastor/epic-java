// (*) -> x();
// x() -> (*);
// (*) | x() -> z();
// x() -> z() | y(*);

package testando;

class E extends Exception {}

class X {
    void a() {
    }
    void a(int x) {
        throw new E();
    }
}

class Sub extends X {
    void a() {
        throw new E();
    }
    void a(int x) {
        throw new E();
    }

    void b() {
        X x = new Sub();
        x.a();
        x.a(1);
    }
}

propagating E: {Sub<:X}.a() | {Sub<:X}.a(int) => Sub.b();
