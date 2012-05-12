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

propagate E: A::a() -> S::s();