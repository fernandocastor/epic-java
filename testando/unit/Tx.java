class E extends Exception {
}

class T {
    void l() {
        m();
    }
    void m() {
        n();
        o();
    }
    void n() { p();  } void o() { p(); }

    void p() {
        throw new E();
    }
}

//propagate E: T::p() -> T::m() -> T::l();
propagate E: T::p() -> T::l();