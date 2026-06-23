"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  VStack,
  Text,
  Button,
  Box,
  HStack,
  Heading,
  Image,
  Badge,
} from "@chakra-ui/react";

const Home = () => {
  const router = useRouter();

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
    "[광고] 엔플라잉이 좋고 노래가 잘생겼어요",
    "[광고] 옥탑방 올라갔다가 엔플라잉에 눌러앉음 🏠",
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
          엔피아 존
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
          onClick={() => router.push("/nfiti")}
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
                덕질 유형 테스트
              </Text>
              <Text fontSize="14px" fontWeight="bold" color="gray.800" noOfLines={1}>
                NFITI
              </Text>
              <Text fontSize="11px" color="gray.500" noOfLines={1}>
                나는 어떤 유형의 엔피아일까?
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
              router.push("/nfiti");
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
          onClick={() => router.push("/ticketing")}
          _hover={{ borderColor: "red.200", bg: "red.50/10", shadow: "md" }}
          _active={{ transform: "scale(0.995)" }}
          transition="all 0.15s"
        >
          <HStack spacing={4} flex={1} overflow="hidden">
            {/* 좌측 썸네일 박스 (디테일한 글래스모피즘 티켓 디자인) */}
            <Box
              w="90px"
              h="65px"
              bgGradient="linear(to-br, #FF416C, #FF4B2B)"
              rounded="lg"
              position="relative"
              overflow="hidden"
              display="flex"
              alignItems="center"
              justifyContent="center"
              shadow="sm"
              flexShrink={0}
            >
              {/* 배경 원형 발광 데코 */}
              <Box
                position="absolute"
                w="60px"
                h="60px"
                bg="whiteAlpha.200"
                rounded="full"
                top="-15px"
                right="-15px"
              />
              <Box
                position="absolute"
                w="35px"
                h="35px"
                bg="whiteAlpha.150"
                rounded="full"
                bottom="-10px"
                left="-10px"
              />
              
              {/* 미니 티켓 셰이프 */}
              <Box
                w="76px"
                h="42px"
                bg="rgba(255, 255, 255, 0.16)"
                backdropFilter="blur(3px)"
                border="1.5px solid rgba(255, 255, 255, 0.4)"
                rounded="md"
                position="relative"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                p={1}
                boxShadow="0 4px 10px rgba(0, 0, 0, 0.12)"
              >
                {/* 좌우 절취 홈 (Notches) */}
                <Box
                  position="absolute"
                  left="-5px"
                  top="50%"
                  transform="translateY(-50%)"
                  w="8px"
                  h="8px"
                  bg="#FF416C"
                  rounded="full"
                  borderRight="1.5px solid rgba(255, 255, 255, 0.4)"
                />
                <Box
                  position="absolute"
                  right="-5px"
                  top="50%"
                  transform="translateY(-50%)"
                  w="8px"
                  h="8px"
                  bg="#FF4B2B"
                  rounded="full"
                  borderLeft="1.5px solid rgba(255, 255, 255, 0.4)"
                />

                {/* 좌우 절취용 미세 점선 (Ticket perforation lines) */}
                <Box
                  position="absolute"
                  left="6px"
                  top="4px"
                  bottom="4px"
                  w="1px"
                  borderLeft="1px dashed rgba(255, 255, 255, 0.4)"
                />
                <Box
                  position="absolute"
                  right="6px"
                  top="4px"
                  bottom="4px"
                  w="1px"
                  borderLeft="1px dashed rgba(255, 255, 255, 0.4)"
                />

                {/* 티켓 디테일 정보 */}
                <VStack align="center" spacing={1} justify="center" h="full" w="full" px={3}>
                  <Text fontSize="7px" fontWeight="black" color="white" transform="scale(0.85)" transformOrigin="center center" lineHeight={1} whiteSpace="nowrap" letterSpacing="0.5px">
                    N.FIMAP+
                  </Text>
                  <Text fontSize="9px" fontWeight="950" color="white" letterSpacing="0.8px" lineHeight={1}>
                    TICKET
                  </Text>
                </VStack>
              </Box>
            </Box>

            {/* 중간 정보 및 카테고리 태그 */}
            <VStack align="start" spacing={0.5} overflow="hidden">
              <Text fontSize="10px" fontWeight="bold" color="red.500" letterSpacing="0.5px">
                예매 시뮬레이션
              </Text>
              <Text fontSize="14px" fontWeight="bold" color="gray.800" noOfLines={1}>
                티켓팅 연습
              </Text>
              <Text fontSize="11px" color="gray.500" noOfLines={1}>
                실전처럼 연습하는 엔플라잉 티켓팅
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
              router.push("/ticketing");
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
