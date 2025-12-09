// src/pages/Home/index.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  VStack,
  Heading,
  Text,
  Button,
  Box,
  SimpleGrid,
  Icon,
  HStack,
} from "@chakra-ui/react";
import { Heart, Camera } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <VStack
      spacing={8}
      py={8}
      px={6}
      align="stretch"
      h="full"
      justify="space-between"
    >
      {/* 상단 타이틀 */}
      <VStack spacing={4} align="center" textAlign="center">
        <Heading
          fontSize="32px"
          fontWeight="800"
          bgGradient="linear(to-r, purple.500, pink.500)"
          bgClip="text"
        >
          NFIMAP+ PLAYZONE
        </Heading>

        <Text fontSize="16px" color="gray.600" lineHeight="1.6">
          엔플라잉을 사랑하는 엔피아들을 위한<br />
          소소하지만 특별한 놀이터
        </Text>

        {/* 멤버 태그 */}
        <HStack justify="center" flexWrap="wrap" gap={2} mt={3}>
          {["이승협", "차훈", "김재현", "유회승", "서동성"].map((name) => (
            <Box
              key={name}
              px={3}
              py={1}
              bg="purple.100"
              color="purple.700"
              fontSize="13px"
              fontWeight="600"
              rounded="full"
            >
              {name}
            </Box>
          ))}
        </HStack>
      </VStack>

      {/* 메인 카드들 – 모바일은 세로로 쌓임 */}
      <VStack spacing={6} flex={1} justify="center">
        {/* NFITI 테스트 */}
        <Box
          bg="white"
          rounded="2xl"
          shadow="xl"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.100"
          _active={{ transform: "scale(0.98)" }}
          transition="0.2s"
        >
          <Box bgGradient="linear(to-br, purple.500, pink.500)" py={6}>
            <VStack color="white">
              <Icon as={Heart} boxSize={10} />
              <Text fontSize="xl" fontWeight="bold">
                NFITI 테스트
              </Text>
            </VStack>
          </Box>
          <VStack p={5} spacing={3} align="start">
            <Text fontSize="15px" color="gray.700">
              MBTI로 알아보는<br />
              <Text as="span" fontWeight="bold" color="pink.600">
                나와 찰떡인 멤버
              </Text>
            </Text>
            <Button
              w="full"
              colorScheme="pink"
              size="lg"
              rounded="xl"
              fontWeight="bold"
              onClick={() => navigate("/nfiti")}
            >
              시작하기
            </Button>
          </VStack>
        </Box>

        {/* 닮은꼴 찾기 */}
        <Box
          bg="white"
          rounded="2xl"
          shadow="xl"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.100"
          _active={{ transform: "scale(0.98)" }}
          transition="0.2s"
        >
          <Box bgGradient="linear(to-br, blue.500, purple.500)" py={6}>
            <VStack color="white">
              <Icon as={Camera} boxSize={10} />
              <Text fontSize="xl" fontWeight="bold">
                닮은꼴 찾기
              </Text>
            </VStack>
          </Box>
          <VStack p={5} spacing={3} align="start">
            <Text fontSize="15px" color="gray.700">
              사진 업로드하면 AI가<br />
              <Text as="span" fontWeight="bold" color="blue.600">
                닮은 멤버
              </Text>
              를 찾아줘요
            </Text>
            <Button
              w="full"
              colorScheme="purple"
              size="lg"
              rounded="xl"
              fontWeight="bold"
              onClick={() => navigate("/lookalike")}
            >
              사진 업로드하기
            </Button>
          </VStack>
        </Box>
      </VStack>

      {/* 하단 문구 */}
      <Text textAlign="center" fontSize="14px" color="gray.500" pb={4}>
        N.Flying과 함께하는 모든 순간이 빛나는 곳
      </Text>
    </VStack>
  );
};

export default Home;