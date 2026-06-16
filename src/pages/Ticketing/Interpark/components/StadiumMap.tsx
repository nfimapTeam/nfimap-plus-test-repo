import React, { useState, useEffect } from "react";
import { Box, VStack, HStack, Text, Badge, Grid, Divider } from "@chakra-ui/react";

interface StadiumMapProps {
  mode: "normal" | "nboom";
  delayMs: number;
  onSelectSection: (sectionId: string) => void;
}

interface SectionSeatData {
  id: string;
  name: string;
  type: "FLOOR" | "2F" | "3F";
  color: string;
  initialSeats: number;
  remainingSeats: number;
  depleteSpeed: number; // seat depletion rate factor
}

const StadiumMap = ({ mode, delayMs, onSelectSection }: StadiumMapProps) => {
  const [sections, setSections] = useState<SectionSeatData[]>(() => {
    const delaySec = Math.max(0, delayMs / 1000);
    
    const calculateStartingSeats = (id: string, initialTotal: number) => {
      let startingPercent = 1.0;
      if (mode === "nboom") {
        const isFloor = id.startsWith("F");
        if (isFloor) {
          startingPercent = Math.max(0, 0.6 - delaySec * 0.4);
        } else {
          startingPercent = Math.max(0, 0.85 - delaySec * 0.25);
        }
      } else {
        const isFloor = id.startsWith("F");
        if (isFloor) {
          startingPercent = Math.max(0, 0.9 - delaySec * 0.15);
        } else {
          startingPercent = Math.max(0, 0.95 - delaySec * 0.08);
        }
      }
      startingPercent = Math.min(1.0, Math.max(0.0, startingPercent * (0.9 + Math.random() * 0.2)));
      return Math.floor(initialTotal * startingPercent);
    };

    return [
      // Floor (Purple)
      { id: "F1", name: "Floor F1", type: "FLOOR", color: "purple.500", initialSeats: 308, remainingSeats: calculateStartingSeats("F1", 308), depleteSpeed: mode === "nboom" ? 28 : 8 },
      { id: "F2", name: "Floor F2", type: "FLOOR", color: "purple.500", initialSeats: 308, remainingSeats: calculateStartingSeats("F2", 308), depleteSpeed: mode === "nboom" ? 28 : 8 },
      { id: "F3", name: "Floor F3", type: "FLOOR", color: "purple.500", initialSeats: 308, remainingSeats: calculateStartingSeats("F3", 308), depleteSpeed: mode === "nboom" ? 24 : 7 },
      { id: "F4", name: "Floor F4", type: "FLOOR", color: "purple.500", initialSeats: 308, remainingSeats: calculateStartingSeats("F4", 308), depleteSpeed: mode === "nboom" ? 24 : 7 },
      // 2F (Green & Blue)
      { id: "202", name: "202구역", type: "2F", color: "teal.500", initialSeats: 180, remainingSeats: calculateStartingSeats("202", 180), depleteSpeed: mode === "nboom" ? 15 : 4 },
      { id: "203", name: "203구역", type: "2F", color: "green.500", initialSeats: 180, remainingSeats: calculateStartingSeats("203", 180), depleteSpeed: mode === "nboom" ? 16 : 4 },
      { id: "204", name: "204구역", type: "2F", color: "green.500", initialSeats: 180, remainingSeats: calculateStartingSeats("204", 180), depleteSpeed: mode === "nboom" ? 16 : 4 },
      { id: "205", name: "205구역", type: "2F", color: "teal.500", initialSeats: 180, remainingSeats: calculateStartingSeats("205", 180), depleteSpeed: mode === "nboom" ? 15 : 4 },
      { id: "213", name: "213구역", type: "2F", color: "teal.500", initialSeats: 180, remainingSeats: calculateStartingSeats("213", 180), depleteSpeed: mode === "nboom" ? 15 : 4 },
      { id: "212", name: "212구역", type: "2F", color: "teal.500", initialSeats: 180, remainingSeats: calculateStartingSeats("212", 180), depleteSpeed: mode === "nboom" ? 15 : 4 },
      // 3F (Blue)
      { id: "308", name: "308구역", type: "3F", color: "blue.500", initialSeats: 180, remainingSeats: calculateStartingSeats("308", 180), depleteSpeed: mode === "nboom" ? 12 : 3 },
      { id: "309", name: "309구역", type: "3F", color: "blue.500", initialSeats: 180, remainingSeats: calculateStartingSeats("309", 180), depleteSpeed: mode === "nboom" ? 12 : 3 },
      { id: "313", name: "313구역", type: "3F", color: "blue.500", initialSeats: 180, remainingSeats: calculateStartingSeats("313", 180), depleteSpeed: mode === "nboom" ? 10 : 2 },
      { id: "314", name: "314구역", type: "3F", color: "blue.500", initialSeats: 180, remainingSeats: calculateStartingSeats("314", 180), depleteSpeed: mode === "nboom" ? 10 : 2 },
    ];
  });

  // Seat depletion interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSections((prevSections) =>
        prevSections.map((sec) => {
          if (sec.remainingSeats <= 0) return sec;

          // Random tick depletion
          const depleteAmount = Math.floor(Math.random() * sec.depleteSpeed * 2);
          const newSeats = sec.remainingSeats - depleteAmount;

          return {
            ...sec,
            remainingSeats: newSeats < 0 ? 0 : newSeats,
          };
        })
      );
    }, 250);

    return () => clearInterval(interval);
  }, []);

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

            {/* CONSOLE */}
            <Box
              bg="gray.800"
              border="1px solid"
              borderColor="gray.600"
              w="140px"
              py={1.5}
              rounded="md"
              textAlign="center"
              opacity={0.7}
            >
              <Text fontSize="10px" color="gray.400" letterSpacing="2px">
                CONSOLE
              </Text>
            </Box>

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
