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

//propagating E: T::p() -> T::m() -> T::l();
propagating E: T::p() -> T::l();