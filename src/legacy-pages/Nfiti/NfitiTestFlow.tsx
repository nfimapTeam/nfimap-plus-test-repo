import React, { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import Start from "./components/Start";
import Result from "./components/Result";
import NameInput from "./components/NameInput";
import Process from "./components/Process";
import { QUESTIONS, RESULT_DESCRIPTIONS, TestResult } from "./constants";
import { useSetRecoilState } from "recoil";
import { bgColorState } from "../../Atom/bgColorState";

const NfititTestFlow = () => {
  const [testStage, setTestStage] = useState<"intro" | "nameInput" | "process" | "result">("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: boolean }>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [name, setName] = useState("");
  const [resultCode, setResultCode] = useState<keyof typeof RESULT_DESCRIPTIONS | null>(null);
  const setBgColor = useSetRecoilState(bgColorState);

  useEffect(() => {
    setBgColor("purple.600");
  }, []);

  const handleStartTest = () => {
    setTestStage("nameInput");
  };

  const handleAnswer = (answer: boolean) => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (Object.keys(answers).length === QUESTIONS.length) {
      calculateResult();
    }
  }, [answers]);

  const calculateResult = () => {
    const group1 = [1, 4, 6]; // true면 E, false면 I
    const group2 = [2, 7, 9]; // true면 S, false면 N
    const group3 = [3, 5, 8]; // true면 T, false면 F

    const countTrueInGroup = (group: number[]) =>
      group.reduce((acc, id) => acc + (answers[id] ? 1 : 0), 0);

    const eOrI = countTrueInGroup(group1) > group1.length / 2 ? "E" : "I";
    const sOrN = countTrueInGroup(group2) > group2.length / 2 ? "S" : "N";
    const fOrT = countTrueInGroup(group3) > group3.length / 2 ? "T" : "F";
    const newResultCode = `${eOrI}${sOrN}${fOrT}` as keyof typeof RESULT_DESCRIPTIONS;
    setResultCode(newResultCode);
    setTestResult(RESULT_DESCRIPTIONS[newResultCode]);
    setTestStage("result");
  };

  const handleRestartTest = () => {
    setTestStage("intro");
    setTestResult(null);
    setResultCode(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setName("");
  };

  const handleNameSubmit = () => {
    if (name.trim()) {
      setTestStage("process");
    } else {
      alert("이름을 입력해주세요!");
    }
  };

  const renderContent = () => {
    switch (testStage) {
      case "intro":
        return <Start onStartTest={handleStartTest} />;
      case "nameInput":
        return <NameInput name={name} setName={setName} onSubmit={handleNameSubmit} />;
      case "process":
        return (
          <Process
            currentQuestionIndex={currentQuestionIndex}
            handleAnswer={handleAnswer}
            questions={QUESTIONS}
          />
        );
      case "result":
        return <Result name={name} resultCode={resultCode?.toString() || null} testResult={testResult} handleRestartTest={handleRestartTest} />;
    }
  };

  return <Box>{renderContent()}</Box>;
};

export default NfititTestFlow;
