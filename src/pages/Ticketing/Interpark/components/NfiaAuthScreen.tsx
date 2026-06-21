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
}

interface AuthOption {
  emoji?: string;
  image?: string;
  label: string;
  isCorrect: boolean;
}

const correctOption = { image: "/image/banner/nflying_cover_image_1.webp", label: "엔플라잉 (N.Flying)" };

const incorrectPool = [
  { emoji: "🥦", label: "브로콜리" },
  { emoji: "🏎️", label: "레이싱카" },
  { emoji: "🧼", label: "비누" },
  { emoji: "⏰", label: "알람시계" },
  { emoji: "🪐", label: "토성" },
  { emoji: "🍎", label: "사과" },
  { emoji: "🍔", label: "햄버거" },
  { emoji: "🧦", label: "양말" },
  { emoji: "☂️", label: "우산" },
  { emoji: "🚲", label: "자전거" },
  { emoji: "🔑", label: "열쇠" },
  { emoji: "🦖", label: "공룡" }
];

const NfiaAuthScreen = ({ onSuccess }: NfiaAuthScreenProps) => {
  const [options, setOptions] = useState<AuthOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const shuffleOptions = useCallback(() => {
    // Pick 3 random unique incorrect options
    const shuffledPool = [...incorrectPool].sort(() => 0.5 - Math.random());
    const selectedIncorrect = shuffledPool.slice(0, 3).map(opt => ({
      ...opt,
      isCorrect: false,
    }));

    const combined = [
      { ...correctOption, isCorrect: true },
      ...selectedIncorrect,
    ];

    // Shuffle all 4 options
    const shuffledOptions = combined.sort(() => 0.5 - Math.random());
    setOptions(shuffledOptions);
  }, []);

  // Initialize options on mount
  useEffect(() => {
    shuffleOptions();
  }, [shuffleOptions]);

  const handleOptionClick = (option: AuthOption) => {
    if (option.isCorrect) {
      onSuccess();
    } else {
      setErrorMsg("틀렸습니다! 당신은 엔피아가 맞나요? 😢");
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
      <VStack spacing={1} align="center" py={1}>
        <Box
          bg="purple.50"
          color="purple.600"
          px={3}
          py={1}
          rounded="full"
          fontSize="12px"
          fontWeight="bold"
          border="1px solid"
          borderColor="purple.150"
        >
          🙋 엔피아 인증 (N.Fia CAPTCHA)
        </Box>
        <Text fontSize="16px" fontWeight="900" color="gray.850" mt={1}>
          엔플라잉을 골라주세요!
        </Text>
        <Text fontSize="11px" color="gray.500" textAlign="center">
          아래의 4개 그림 중에서 엔플라잉(N.Flying)을 골라 터치하세요.
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
            h="130px"
          >
            {option.isCorrect && option.image ? (
              <Image
                src={option.image}
                w="64px"
                h="64px"
                objectFit="cover"
                rounded="xl"
                mb={2}
                border="1px solid"
                borderColor="gray.200"
                shadow="sm"
              />
            ) : (
              <Text fontSize="42px" mb={2} lineHeight="1">
                {option.emoji}
              </Text>
            )}
            <Text fontSize="12px" fontWeight="bold" color="gray.700" textAlign="center">
              {option.label}
            </Text>
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
