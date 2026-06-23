"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  VStack,
  Heading,
  Text,
  Button,
  Box,
  HStack,
  IconButton,
  Image,
  Badge,
} from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";

const TicketingMain = () => {
  const router = useRouter();

  const ticketingSites = [
    {
      id: "interpark",
      name: "엔피아파크 티켓",
      description: "정시에 자동으로 예매 버튼이 활성화됩니다.",
      color: "blue",
      image: "/image/ticket/interpark.webp",
      active: true,
      path: "/ticketing/nfiapark",
    },
    {
      id: "ticketlink",
      name: "엔피아링크",
      description: "직접 새로고침을 해야만 예매 버튼이 활성화됩니다.",
      color: "red",
      image: "/image/ticket/ticketlink.webp",
      active: true,
      path: "/ticketing/nfialink",
    },
  ];

  return (
    <VStack spacing={6} py={6} px={5} align="stretch" h="full">
      {/* 상단 네비게이션 */}
      <HStack spacing={4} align="center">
        <IconButton
          icon={<ArrowLeft size={20} />}
          aria-label="뒤로가기"
          variant="ghost"
          rounded="full"
          onClick={() => router.push("/")}
        />
        <Heading fontSize="20px" fontWeight="700">
          티켓팅 연습
        </Heading>
      </HStack>

      <Text fontSize="14px" color="gray.500" px={2}>
        원하는 티켓 예매 사이트를 선택하여 실전처럼 예매 연습을 해보세요. 모바일과 웹 레이아웃 모두 지원합니다.
      </Text>

      {/* 예매처 리스트 */}
      <VStack spacing={5} py={2}>
        {ticketingSites.map((site) => (
          <Box
            key={site.id}
            w="full"
            bg="white"
            rounded="2xl"
            shadow="md"
            border="1px solid"
            borderColor={site.active ? "gray.200" : "gray.100"}
            overflow="hidden"
            opacity={site.active ? 1 : 0.8}
            transition="all 0.2s"
            _hover={site.active ? { shadow: "lg", transform: "translateY(-2px)" } : {}}
          >
            {/* 카드 상단 이미지 포스터 */}
            <Box h="150px" overflow="hidden" position="relative">
              <Image
                src={site.image}
                alt={site.name}
                w="full"
                h="full"
                objectFit="cover"
                filter={site.active ? "none" : "grayscale(100%) brightness(0.65)"}
                opacity={site.active ? 1 : 0.5}
                transition="filter 0.3s, opacity 0.3s"
              />
              {/* 이미지 위 텍스트 오버레이 */}
              <Box
                position="absolute"
                bottom={0}
                left={0}
                w="full"
                bgGradient="linear(to-t, rgba(0,0,0,0.85), transparent)"
                py={3}
                px={5}
              >
                <HStack justify="space-between" align="center">
                  <Text color="white" fontWeight="900" fontSize="18px">
                    {site.name}
                  </Text>
                  {site.active ? (
                    <Badge colorScheme={site.color} variant="solid" rounded="md" px={2.5} py={0.5} fontWeight="bold">
                      OPEN
                    </Badge>
                  ) : (
                    <Badge colorScheme="gray" variant="solid" rounded="md" px={2.5} py={0.5} fontWeight="bold">
                      준비 중
                    </Badge>
                  )}
                </HStack>
              </Box>
            </Box>

            {/* 본문 정보 */}
            <VStack p={5} spacing={4} align="stretch">
              <Text fontSize="13px" color="gray.600" lineHeight="1.4">
                {site.description}
              </Text>

              <Button
                colorScheme={site.color}
                isDisabled={!site.active}
                w="full"
                rounded="xl"
                size="md"
                fontWeight="bold"
                onClick={() => site.active && router.push(site.path)}
              >
                {site.active ? "연습 시작하기" : "준비 중..."}
              </Button>
            </VStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
};

export default TicketingMain;
