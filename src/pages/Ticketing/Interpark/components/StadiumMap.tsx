import React from "react";
import { Box, VStack, HStack, Text, Badge, Grid, Divider } from "@chakra-ui/react";
import { SectionSeatData } from "../types";

interface StadiumMapProps {
  mode: "normal" | "nboom" | "jaehyun";
  sections: SectionSeatData[];
  onSelectSection: (sectionId: string) => void;
}

const StadiumMap = ({ mode, sections, onSelectSection }: StadiumMapProps) => {
  const totalSeats = sections.reduce((acc, sec) => acc + sec.remainingSeats, 0);

  return (
    <VStack spacing={4} align="stretch" py={3} px={2} h="full" overflowY="auto">
      {/* 정보 배너 */}
      <HStack justify="space-between" bg="gray.100" p={3} rounded="xl">
        <Text fontSize="13px" fontWeight="bold" color="gray.700">
          구역을 선택하세요
        </Text>
        <HStack>
          <Text fontSize="12px" color="gray.500">전체 잔여석:</Text>
          <Badge colorScheme={totalSeats > 100 ? "green" : "red"} fontSize="13px" px={2} py={0.5} rounded="md">
            {totalSeats}석
          </Badge>
        </HStack>
      </HStack>

      {/* 공연장 맵 비주얼 */}
      <Box
        bg="gray.850"
        p={4}
        rounded="2xl"
        border="1px solid"
        borderColor="gray.700"
        bgGradient="linear(to-b, gray.900, gray.800)"
        color="white"
        shadow="md"
        position="relative"
      >
        <VStack spacing={4} align="stretch">
          {/* 무대 (STAGE) */}
          <Box
            bg="gray.700"
            py={2.5}
            rounded="lg"
            textAlign="center"
            border="2px solid"
            borderColor="gray.600"
            boxShadow="0px 0px 10px rgba(255,255,255,0.1)"
          >
            <Text fontSize="14px" fontWeight="bold" letterSpacing="5px" color="gray.200">
              STAGE
            </Text>
          </Box>

          {/* 좌석 레이아웃 배치 */}
          <VStack spacing={3} py={2}>
            {/* FLOOR 1 & 2 */}
            <HStack spacing={6} w="full" justify="center">
              {["F1", "F2"].map((id) => {
                const sec = sections.find((s) => s.id === id);
                return (
                  <Box
                    key={id}
                    flex={1}
                    bg="purple.900"
                    border="2px solid"
                    borderColor="purple.400"
                    h="60px"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    rounded="xl"
                    cursor={sec && sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
                    opacity={sec && sec.remainingSeats > 0 ? 1 : 0.3}
                    transition="0.15s"
                    _hover={sec && sec.remainingSeats > 0 ? { transform: "scale(1.05)", bg: "purple.800" } : {}}
                    _active={sec && sec.remainingSeats > 0 ? { transform: "scale(0.98)" } : {}}
                    onClick={() => sec && sec.remainingSeats > 0 && onSelectSection(id)}
                  >
                    <Text fontSize="12px" fontWeight="bold">{sec?.name}</Text>
                    <Text fontSize="11px" color="purple.200">{sec?.remainingSeats}석</Text>
                  </Box>
                );
              })}
            </HStack>

            {/* FLOOR 3 & 4 */}
            <HStack spacing={6} w="full" justify="center">
              {["F3", "F4"].map((id) => {
                const sec = sections.find((s) => s.id === id);
                return (
                  <Box
                    key={id}
                    flex={1}
                    bg="purple.900"
                    border="2px solid"
                    borderColor="purple.400"
                    h="60px"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    rounded="xl"
                    cursor={sec && sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
                    opacity={sec && sec.remainingSeats > 0 ? 1 : 0.3}
                    transition="0.15s"
                    _hover={sec && sec.remainingSeats > 0 ? { transform: "scale(1.05)", bg: "purple.800" } : {}}
                    _active={sec && sec.remainingSeats > 0 ? { transform: "scale(0.98)" } : {}}
                    onClick={() => sec && sec.remainingSeats > 0 && onSelectSection(id)}
                  >
                    <Text fontSize="12px" fontWeight="bold">{sec?.name}</Text>
                    <Text fontSize="11px" color="purple.200">{sec?.remainingSeats}석</Text>
                  </Box>
                );
              })}
            </HStack>



            {/* 2F & 3F 구역 (사이드 및 백) */}
            <Grid templateColumns="repeat(3, 1fr)" gap={3} w="full">
              {/* 왼쪽 2F/3F 대표구역 */}
              <VStack spacing={2}>
                {["213", "313"].map((id) => {
                  const sec = sections.find((s) => s.id === id);
                  return (
                    <Box
                      key={id}
                      w="full"
                      bg={sec?.type === "2F" ? "teal.900" : "blue.900"}
                      border="1px solid"
                      borderColor={sec?.type === "2F" ? "teal.400" : "blue.400"}
                      py={2}
                      rounded="lg"
                      textAlign="center"
                      cursor={sec && sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
                      opacity={sec && sec.remainingSeats > 0 ? 1 : 0.3}
                      onClick={() => sec && sec.remainingSeats > 0 && onSelectSection(id)}
                      _hover={sec && sec.remainingSeats > 0 ? { bg: sec?.type === "2F" ? "teal.800" : "blue.800" } : {}}
                    >
                      <Text fontSize="11px" fontWeight="bold">{sec?.name}</Text>
                      <Text fontSize="10px" color="gray.300">{sec?.remainingSeats}석</Text>
                    </Box>
                  );
                })}
              </VStack>

              {/* 중앙 뒤편 3F 대표구역 */}
              <VStack spacing={2} justify="center">
                {["309", "308"].map((id) => {
                  const sec = sections.find((s) => s.id === id);
                  return (
                    <Box
                      key={id}
                      w="full"
                      bg="blue.900"
                      border="1px solid"
                      borderColor="blue.400"
                      py={2}
                      rounded="lg"
                      textAlign="center"
                      cursor={sec && sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
                      opacity={sec && sec.remainingSeats > 0 ? 1 : 0.3}
                      onClick={() => sec && sec.remainingSeats > 0 && onSelectSection(id)}
                      _hover={sec && sec.remainingSeats > 0 ? { bg: "blue.800" } : {}}
                    >
                      <Text fontSize="11px" fontWeight="bold">{sec?.name}</Text>
                      <Text fontSize="10px" color="gray.300">{sec?.remainingSeats}석</Text>
                    </Box>
                  );
                })}
              </VStack>

              {/* 오른쪽 2F/3F 대표구역 */}
              <VStack spacing={2}>
                {["203", "308"].map((id, index) => {
                  // If id is 308 (which is in the middle), let's use 314 on right side instead for visual symmetry
                  const resolvedId = index === 0 ? "203" : "314";
                  const sec = sections.find((s) => s.id === resolvedId);
                  return (
                    <Box
                      key={resolvedId}
                      w="full"
                      bg={sec?.type === "2F" ? "teal.900" : "blue.900"}
                      border="1px solid"
                      borderColor={sec?.type === "2F" ? "teal.400" : "blue.400"}
                      py={2}
                      rounded="lg"
                      textAlign="center"
                      cursor={sec && sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
                      opacity={sec && sec.remainingSeats > 0 ? 1 : 0.3}
                      onClick={() => sec && sec.remainingSeats > 0 && onSelectSection(resolvedId)}
                      _hover={sec && sec.remainingSeats > 0 ? { bg: sec?.type === "2F" ? "teal.800" : "blue.800" } : {}}
                    >
                      <Text fontSize="11px" fontWeight="bold">{sec?.name}</Text>
                      <Text fontSize="10px" color="gray.300">{sec?.remainingSeats}석</Text>
                    </Box>
                  );
                })}
              </VStack>
            </Grid>
          </VStack>
        </VStack>
      </Box>

      <Divider />

      {/* 리스트 뷰 (모바일 최적화) */}
      <VStack spacing={2} align="stretch">
        <Text fontSize="12px" fontWeight="bold" color="gray.500" px={1}>
          전체 구역 빠른 선택 리스트
        </Text>
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {sections.map((sec) => (
            <HStack
              key={sec.id}
              p={2.5}
              bg="white"
              rounded="xl"
              border="1px solid"
              borderColor="gray.200"
              justify="space-between"
              cursor={sec.remainingSeats > 0 ? "pointer" : "not-allowed"}
              opacity={sec.remainingSeats > 0 ? 1 : 0.4}
              onClick={() => sec.remainingSeats > 0 && onSelectSection(sec.id)}
              _hover={sec.remainingSeats > 0 ? { borderColor: "blue.500", bg: "blue.50" } : {}}
              transition="all 0.1s"
            >
              <Text fontSize="13px" fontWeight="bold" color="gray.700">
                {sec.name}
              </Text>
              <Badge
                colorScheme={sec.remainingSeats > 20 ? "purple" : sec.remainingSeats > 0 ? "orange" : "gray"}
                fontSize="11px"
              >
                {sec.remainingSeats > 0 ? `${sec.remainingSeats}석` : "매진"}
              </Badge>
            </HStack>
          ))}
        </Grid>
      </VStack>
    </VStack>
  );
};

export default StadiumMap;
