
class E extends Exception {}

abstract class SuperA {
    abstract void b();
}

class A extends SuperA {
    void a() {
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

propagating E: A::a() -> {A<:SuperA}::b();
propagating E: A::a() -> A::c() -> A::f() -> A::g();
propagating E: A::a() -> A::s() -> A::d() -> A::g();
propagating E: A::a() -> A::s() -> A::e() -> A::g();



// propagating E: A::a() -> A::b();
// propagating E: A::a() -> A::c() -> A::f() -> A::g();
// propagating E: A::a() -> A::s() -> A::d() -> A::g();
// propagating E: A::a() -> A::s() -> A::e(); //sub1


// /*
// [OK] -Simple path
//     -obj.m();
//     -new X().m();
//     -m();

// -Overriding (extends/implements)
//   -super method doesn't throws E

// -Polymorphism

//  */

// class E extends Exception {}

// abstract class SuperA {
//     abstract public void a();
// }

// class A extends SuperA {
//     public void a() {
//         if (true) throw new E();
//     }
// }

// class S {
//     void s() {
//         SuperA a = new A();
//         a.a();
//     }
// }

// class Z {
//     void z() {
//         SuperA a = new A();
//         a.a();
//     }
// }

// //propagating E: {A <: SuperA}::a() -> S::s();
// //propagating E: {A <: SuperA}::a() -> Z::z();
