import React, { useState, useEffect, useCallback } from "react";
import {
  VStack,
  Text,
  Box,
  Alert,
  AlertIcon,
  Grid,
  Image,
} from "@chakra-ui/react";

interface NfiaAuthScreenProps {
  onSuccess: () => void;
  isRobotCheck?: boolean;
}

interface AuthOption {
  image: string;
  label: string;
  isCorrect: boolean;
}

const nflyingMembers = [
  { name: "김재현", image: "/image/member/jaehyun.webp" },
  { name: "서동성", image: "/image/member/dongsung.webp" },
  { name: "차훈", image: "/image/member/chahun.webp" },
  { name: "이승협", image: "/image/member/seunghyub.webp" },
  { name: "유회승", image: "/image/member/hewseung.webp" }
];

const NfiaAuthScreen = ({ onSuccess, isRobotCheck = false }: NfiaAuthScreenProps) => {
  const [options, setOptions] = useState<AuthOption[]>([]);
  const [targetName, setTargetName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const shuffleOptions = useCallback(() => {
    // Pick 4 random unique members from the list of 5
    const shuffledPool = [...nflyingMembers].sort(() => 0.5 - Math.random());
    const selected4 = shuffledPool.slice(0, 4);

    // Pick 1 of the 4 as the correct answer
    const correctIndex = Math.floor(Math.random() * 4);
    const correctMember = selected4[correctIndex];
    setTargetName(correctMember.name);

    const mappedOptions = selected4.map(opt => ({
      image: opt.image,
      label: opt.name,
      isCorrect: opt.name === correctMember.name,
    }));

    setOptions(mappedOptions);
  }, []);

  // Initialize options on mount
  useEffect(() => {
    shuffleOptions();
  }, [shuffleOptions]);

  const handleOptionClick = (option: AuthOption) => {
    if (option.isCorrect) {
      onSuccess();
    } else {
      setErrorMsg(`틀렸습니다!😢`);
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        shuffleOptions();
      }, 500);
    }
  };

  return (
    <VStack
      spacing={5}
      p={6}
      bg="white"
      h="full"
      justifyContent="center"
      align="stretch"
      maxW="400px"
      mx="auto"
      className={isShaking ? "shake-animation" : ""}
      style={{
        transition: "transform 0.1s ease",
      }}
    >
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      {/* 헤더 안내문 */}
      <VStack spacing={2} align="center" py={1}>
        <Text fontSize="18px" fontWeight="bold" color={isRobotCheck ? "red.600" : "purple.600"}>
          {isRobotCheck ? "🤖 당신은 로봇인가요?" : "🙋 엔피아 인증 (N.Fia CAPTCHA)"}
        </Text>
        <Text fontSize="15px" color="gray.700" textAlign="center">
          아래 이미지 중 진짜 <Text as="span" fontWeight="900" fontSize="17px" color="black">{
            targetName === "김재현" ? "재현이" :
              targetName === "서동성" ? "동성이" :
                targetName === "차훈" ? "훈이" :
                  targetName === "이승협" ? "승협이" :
                    targetName === "유회승" ? "회승이" : targetName
          }</Text>를 선택하세요.
        </Text>
      </VStack>

      {/* 2x2 카드 선택 그리드 */}
      <Grid templateColumns="repeat(2, 1fr)" gap={4} py={2}>
        {options.map((option, idx) => (
          <Box
            key={idx}
            as="button"
            onClick={() => handleOptionClick(option)}
            p={4}
            bg="gray.50"
            border="2px solid"
            borderColor="gray.100"
            rounded="2xl"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            transition="all 0.2s"
            _hover={{
              bg: "purple.50",
              borderColor: "purple.200",
              transform: "translateY(-4px)",
              shadow: "md",
            }}
            _active={{
              bg: "purple.100",
              transform: "translateY(-1px)",
            }}
            cursor="pointer"
            h="120px"
          >
            <Image
              src={option.image}
              w="80px"
              h="80px"
              objectFit="cover"
              rounded="xl"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
              pointerEvents="none"
            />
          </Box>
        ))}
      </Grid>

      {/* 피드백 경고창 */}
      {errorMsg && (
        <Alert status="error" size="sm" py={2} px={3} rounded="xl" fontSize="12px">
          <AlertIcon />
          {errorMsg}
        </Alert>
      )}
    </VStack>
  );
};

export default NfiaAuthScreen;
