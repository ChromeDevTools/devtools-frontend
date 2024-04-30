// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <string>
#include <vector>

#include "emscripten.h"
#include "emscripten/bind.h"
#include "emscripten/val.h"
#include "gmock/gmock.h"
#include "gtest/gtest.h"

#define HAS_METHOD(...) (true)

using ::testing::Matcher;
using ::testing::MatcherInterface;
using ::testing::MatchResultListener;

void PrintError(::testing::MatchResultListener* listener,
                const std::string& error);

static emscripten::val debugger = emscripten::val::null();

int run(emscripten::val debuggerContext, std::vector<std::string> args) {
  if (!debuggerContext.as<bool>()) {
    return -1;
  }
  debugger = debuggerContext;
  char arg0[] = "LLDBEvalTests";
  std::vector<char*> argv({arg0});
  for (auto& arg : args) {
    argv.push_back(arg.data());
  }
  int argc = argv.size();

  ::testing::InitGoogleTest(&argc, argv.data());
  return RUN_ALL_TESTS();
}

EMSCRIPTEN_BINDINGS(LLDBEval) {
  emscripten::function("runTests", &run);
  emscripten::register_vector<std::string>("StringArray");
}

struct EvalResult {
  std::string result;
  llvm::Optional<std::string> error;
};

class EvalTest : public ::testing::Test {
 public:
  void SetUp() {
    std::string test_name =
        ::testing::UnitTest::GetInstance()->current_test_info()->name();
    std::string break_line = "// BREAK(" + test_name + ")";
    debugger.call<emscripten::val>("runToLine", break_line).await();
  }

  void TearDown() { debugger.call<emscripten::val>("exit").await(); }

  EvalResult Eval(const std::string& expr) const {
    const auto evalResult =
        debugger.call<emscripten::val>("evaluate", expr).await();
    const auto result = evalResult["result"];
    const auto error = evalResult["error"];
    return {result.as<bool>() ? result.as<std::string>() : std::string(),
            error.as<bool>()
                ? llvm::Optional<std::string>(error.as<std::string>())
                : llvm::None};
  }

  bool Is32Bit() const { return true; }

 protected:
  struct {
    size_t GetAddressByteSize() const { return 4; }
  } process_;
  bool compare_with_lldb_ = false;  // ignored
};

class IsEqualMatcher : public MatcherInterface<EvalResult> {
 public:
  IsEqualMatcher(std::string value, bool compare_types)
      : value_(std::move(value)) {}

 public:
  bool MatchAndExplain(EvalResult result,
                       MatchResultListener* listener) const override {
    if (result.error) {
      PrintError(listener, *result.error);
      return false;
    }

    if (result.result != value_) {
      *listener << "evaluated to '" << result.result << "'";
      return false;
    }

    return true;
  }

  void DescribeTo(std::ostream* os) const override {
    *os << "evaluates to '" << value_ << "'";
  }

 private:
  std::string value_;
};

class IsOkMatcher : public MatcherInterface<EvalResult> {
 public:
  explicit IsOkMatcher(bool compare_types) {}

  bool MatchAndExplain(EvalResult result,
                       MatchResultListener* listener) const override {
    if (result.error) {
      PrintError(listener, *result.error);
      return false;
    }
    return true;
  }

  void DescribeTo(std::ostream* os) const override {
    *os << "evaluates without an error";
  }
};

class IsErrorMatcher : public MatcherInterface<EvalResult> {
 public:
  explicit IsErrorMatcher(std::string value) : value_(std::move(value)) {}

 public:
  bool MatchAndExplain(EvalResult result,
                       MatchResultListener* listener) const override {
    if (!result.error) {
      *listener << "evaluated to '" << result.result << "'";
      return false;
    }
    if (result.error->find(value_) == std::string::npos) {
      PrintError(listener, *result.error);
      return false;
    }

    return true;
  }

  void DescribeTo(std::ostream* os) const override {
    *os << "evaluates with an error: '" << value_ << "'";
  }

 private:
  std::string value_;
};
