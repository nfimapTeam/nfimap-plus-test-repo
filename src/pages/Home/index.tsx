import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  VStack,
  Text,
  Button,
  Box,
  Icon,
  HStack,
  Heading,
  Image,
  Badge,
} from "@chakra-ui/react";
import { Ticket } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  // Carousel banner images setup
  const [currentIdx, setCurrentIdx] = useState(0);
  const bannerImages = [
    "/image/banner/nflying_cover_image_1.webp",
    "/image/banner/nflying_cover_image_2.webp",
    "/image/banner/nflying_cover_image_3.webp",
  ];

  // Ad-style captions corresponding to active slides
  const adCaptions = [
    "[광고] 디지털 싱글 환절기 발매",
    "[광고] 엔플라잉 잘생김 광고",
    "[광고] 옥탑방에서 별 따러 갈 사람? 띵곡 맛집 엔플라잉",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % bannerImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerImages.length]);

  return (
    <VStack spacing={4} align="stretch" pb={8} bg="white" minH="calc(100svh - 68px)">
      {/* 1. 상단 캐러셀 이미지 배너 (광고 스타일 레이아웃) */}
      <Box
        h="210px"
        position="relative"
        w="full"
        overflow="hidden"
        bg="gray.100"
      >
        <Image
          src={bannerImages[currentIdx]}
          alt={`N.Flying Cover ${currentIdx + 1}`}
          w="full"
          h="full"
          objectFit="cover"
          transition="all 0.5s ease-in-out"
        />

        {/* 상단 우측 '광고' 배지 */}
        <Badge
          position="absolute"
          top={3}
          right={3}
          bg="rgba(0, 0, 0, 0.4)"
          color="whiteAlpha.800"
          fontSize="9px"
          px={1.5}
          py={0.5}
          rounded="sm"
          fontWeight="normal"
          zIndex={2}
          letterSpacing="0.5px"
        >
          광고
        </Badge>
        
        {/* 하단 투명 광고 문구 카피바 & 페이지 표시 */}
        <Box
          position="absolute"
          bottom={0}
          left={0}
          w="full"
          bg="rgba(0, 0, 0, 0.55)"
          backdropFilter="blur(4px)"
          py={2}
          px={4}
          zIndex={2}
        >
          <HStack justify="space-between" align="center">
            <Text
              fontSize="12px"
              fontWeight="bold"
              color="white"
              noOfLines={1}
              flex={1}
              pr={4}
            >
              {adCaptions[currentIdx]}
            </Text>
            <Text
              fontSize="10px"
              fontWeight="bold"
              color="whiteAlpha.700"
              fontFamily="monospace"
              flexShrink={0}
            >
              {currentIdx + 1} / {bannerImages.length}
            </Text>
          </HStack>
        </Box>
      </Box>

      {/* 2. 가로형 콘텐츠 리스트 (상용 서비스 느낌의 개선) */}
      <VStack spacing={4.5} px={4} align="stretch" flex={1}>
        <Heading fontSize="15px" fontWeight="800" color="gray.850" pt={2} px={1} borderBottom="1px solid" borderColor="gray.100" pb={2}>
          플레이 존 서비스
        </Heading>

        {/* 서비스 1: NFITI 테스트 */}
        <HStack
          w="full"
          p={3.5}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          rounded="xl"
          shadow="sm"
          justify="space-between"
          align="center"
          cursor="pointer"
          onClick={() => navigate("/nfiti")}
          _hover={{ borderColor: "pink.200", bg: "pink.50/20", shadow: "md" }}
          _active={{ transform: "scale(0.995)" }}
          transition="all 0.15s"
        >
          <HStack spacing={4} flex={1} overflow="hidden">
            {/* 좌측 썸네일 박스 */}
            <Box
              w="90px"
              h="65px"
              bgGradient="linear(to-br, pink.300, purple.400)"
              rounded="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={2.5}
              shadow="sm"
              flexShrink={0}
            >
              <img
                src="/image/nfiti/start/00_START_PAGE_startN.svg"
                alt="NFITI"
                style={{ width: "100%", height: "auto" }}
              />
            </Box>

            {/* 중간 정보 및 카테고리 태그 */}
            <VStack align="start" spacing={0.5} overflow="hidden">
              <Text fontSize="10px" fontWeight="bold" color="pink.500" letterSpacing="0.5px">
                성격 궁합
              </Text>
              <Text fontSize="14px" fontWeight="bold" color="gray.800" noOfLines={1}>
                NFITI 테스트
              </Text>
              <Text fontSize="11px" color="gray.500" noOfLines={1}>
                MBTI 유형별 나와 찰떡인 멤버 매칭하기
              </Text>
            </VStack>
          </HStack>

          <Button
            size="sm"
            colorScheme="pink"
            variant="solid"
            fontSize="12px"
            fontWeight="bold"
            rounded="full"
            h="28px"
            px={4}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/nfiti");
            }}
          >
            플레이
          </Button>
        </HStack>

        {/* 서비스 2: 티켓 예매 연습소 */}
        <HStack
          w="full"
          p={3.5}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          rounded="xl"
          shadow="sm"
          justify="space-between"
          align="center"
          cursor="pointer"
          onClick={() => navigate("/ticketing")}
          _hover={{ borderColor: "red.200", bg: "red.50/10", shadow: "md" }}
          _active={{ transform: "scale(0.995)" }}
          transition="all 0.15s"
        >
          <HStack spacing={4} flex={1} overflow="hidden">
            {/* 좌측 썸네일 박스 */}
            <Box
              w="90px"
              h="65px"
              bgGradient="linear(to-br, red.400, orange.400)"
              rounded="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={2.5}
              color="white"
              shadow="sm"
              flexShrink={0}
            >
              <Icon as={Ticket} boxSize={8} />
            </Box>

            {/* 중간 정보 및 카테고리 태그 */}
            <VStack align="start" spacing={0.5} overflow="hidden">
              <Text fontSize="10px" fontWeight="bold" color="red.500" letterSpacing="0.5px">
                예매 시뮬레이션
              </Text>
              <Text fontSize="14px" fontWeight="bold" color="gray.800" noOfLines={1}>
                티켓 예매 연습소
              </Text>
              <Text fontSize="11px" color="gray.500" noOfLines={1}>
                안심코드 검증과 피켓팅 실전 환경 시뮬레이터
              </Text>
            </VStack>
          </HStack>

          <Button
            size="sm"
            colorScheme="red"
            variant="solid"
            fontSize="12px"
            fontWeight="bold"
            rounded="full"
            h="28px"
            px={4}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/ticketing");
            }}
          >
            연습하기
          </Button>
        </HStack>
      </VStack>
    </VStack>
  );
};

export default Home;