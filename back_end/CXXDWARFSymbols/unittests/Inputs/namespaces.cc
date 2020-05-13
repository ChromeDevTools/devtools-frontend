extern "C" void printfI(int);

namespace n1 {
namespace n2 {
int I = 1;
}

int I = 2;

class MyClass {
 private:
  static int I;
};

int MyClass::I = 3;

namespace {
int J = 4;
}
}  // namespace n1

namespace {
int K = 4;
}

int CppMain() {
  int L = n1::n2::I + n1::I + K;
  printfI(L);
  return L;
}

extern "C" int Main() {
  return CppMain();
}
