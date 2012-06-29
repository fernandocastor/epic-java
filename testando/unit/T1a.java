class E extends Exception {
}

class F extends E {
}

class A {
    void a() {
        throw new F();
    }
}

class S {
    void s() throws E {
        new A().a();
    }
}

propagating E: A::a() -> S::s();