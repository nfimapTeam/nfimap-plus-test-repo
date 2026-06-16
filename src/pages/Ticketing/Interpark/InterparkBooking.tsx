import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, HStack, Text, Badge, VStack, Heading, Grid, Button } from "@chakra-ui/react";
import { X } from "lucide-react";

import CaptchaScreen from "./components/CaptchaScreen";
import StadiumMap from "./components/StadiumMap";
import SeatMap from "./components/SeatMap";

type BookingPhase = "queue" | "captcha" | "stadium" | "seat" | "success";

const InterparkBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") as "normal" | "nboom") || "normal";
  const delayParam = searchParams.get("delay");
  const delayMs = delayParam ? parseInt(delayParam, 10) : 0;

  // Booking states
  const [phase, setPhase] = useState<BookingPhase>("queue");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Connection Queue states
  const [currentQueue, setCurrentQueue] = useState<number>(0);
  const [initialQueueSize, setInitialQueueSize] = useState<number>(0);

  // Time tracking states
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Process connection queue if delay exists
  useEffect(() => {
    const delaySec = Math.max(0, delayMs / 1000);
    let qSize = 0;
    if (delaySec >= 0.25) {
      const base = Math.min(4, delaySec);
      qSize = Math.floor(Math.pow(base, 2) * 2000 + Math.random() * 1000);
      if (qSize > 32000) {
        qSize = 32000 + Math.floor(Math.random() * 1000);
      }
    }

    if (qSize <= 0) {
      setPhase("captcha");
      setStartTime(performance.now());
      return;
    }

    setPhase("queue");
    setInitialQueueSize(qSize);
    setCurrentQueue(qSize);

    // Dynamic countdown duration (between 2s and 12s)
    const waitTimeSec = Math.max(2, Math.min(12, qSize / 2500));
    const tickInterval = 50;
    const totalTicks = (waitTimeSec * 1000) / tickInterval;
    const decrementPerTick = Math.ceil(qSize / totalTicks);

    let tempQueue = qSize;
    const timer = setInterval(() => {
      tempQueue = Math.max(0, tempQueue - Math.floor(decrementPerTick * (0.8 + Math.random() * 0.4)));
      setCurrentQueue(tempQueue);
      if (tempQueue <= 0) {
        clearInterval(timer);
        setPhase("captcha");
        setStartTime(performance.now()); // Restart timer so that wait time isn't penalized
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [delayMs]);

  const handleCaptchaSuccess = () => {
    setPhase("stadium");
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    setPhase("seat");
  };

  const handleBackToStadium = () => {
    setSelectedSection(null);
    setPhase("stadium");
  };

  const handleSeatSelectSuccess = (seatInfo: string) => {
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    setSelectedSeat(seatInfo);
    setElapsedTime(duration);
    setPhase("success");
  };

  const handleReset = () => {
    setPhase("captcha");
    setSelectedSection(null);
    setSelectedSeat(null);
    setStartTime(performance.now());
  };

  const handleCloseBooking = () => {
    navigate("/ticketing");
  };

  return (
    <Box
      position="relative"
      zIndex={100}
      minH="100svh"
      bg="gray.50"
      display="flex"
      flexDirection="column"
      maxW="480px"
      w="full"
      mx="auto"
    >
      {/* 예약 팝업 타이틀 바 */}
      <Box bg="gray.900" color="white" py={3.5} px={4} borderBottom="3px solid" borderColor="red.500">
        <HStack justify="space-between">
          <Text fontSize="15px" fontWeight="bold" letterSpacing="0.5px">
            인터파크 티켓 예매 [연습]
          </Text>
          <HStack spacing={3}>
            <Badge colorScheme={mode === "nboom" ? "red" : "blue"} variant="solid" px={2} py={0.5} rounded="md">
              {mode === "nboom" ? "엔붐온 모드" : "일반 모드"}
            </Badge>
            <Box
              as="button"
              onClick={handleCloseBooking}
              p={2}
              m={-2}
              cursor="pointer"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              _hover={{ color: "red.400" }}
              _active={{ transform: "scale(0.9)" }}
            >
              <X size={20} />
            </Box>
          </HStack>
        </HStack>
      </Box>

      {/* 단계별 화면 렌더링 */}
      <Box flex="1" display="flex" flexDirection="column" overflow="hidden" position="relative">
        {phase === "queue" && (
          <Box flex="1" display="flex" flexDirection="column" bg="white" justifyContent="center" p={6} minH="450px">
            <VStack spacing={6} align="stretch" m="auto" maxW="380px" w="full" py={8}>
              {/* 타이틀 */}
              <VStack spacing={2} align="center" textAlign="center">
                <Box
                  w="50px"
                  h="50px"
                  bg="red.50"
                  color="red.500"
                  rounded="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="22px"
                  border="1px solid"
                  borderColor="red.100"
                >
                  ⏳
                </Box>
                <Heading fontSize="18px" fontWeight="950" color="gray.800">
                  서비스 접속 대기 안내
                </Heading>
                <Text fontSize="12px" color="gray.500" maxW="280px" lineHeight="1.4">
                  현재 접속자가 많아 대기 중입니다. 잠시만 기다려 주시면 예매 페이지로 자동 이동합니다.
                </Text>
              </VStack>

              {/* 진행 바 및 카운터 */}
              <Box bg="gray.50" p={5} rounded="2xl" border="1px solid" borderColor="gray.100" textAlign="center">
                <Text fontSize="12px" color="gray.500" fontWeight="bold">대기 순서</Text>
                <Text fontSize="32px" fontWeight="900" color="red.500" fontFamily="monospace" mt={1} letterSpacing="-1px">
                  {currentQueue.toLocaleString()}번째
                </Text>
                
                {/* 커스텀 게이지 바 */}
                <Box bg="gray.200" h="8px" rounded="full" mt={4} overflow="hidden" position="relative">
                  <Box
                    bg="red.500"
                    h="full"
                    w={`${initialQueueSize > 0 ? Math.max(0, Math.min(100, ((initialQueueSize - currentQueue) / initialQueueSize) * 100)) : 0}%`}
                    transition="width 0.1s linear"
                  />
                </Box>
              </Box>

              {/* 안내 사항 */}
              <VStack align="start" spacing={1.5} fontSize="11px" color="gray.500" bg="gray.50" p={3.5} rounded="xl" border="1px dashed" borderColor="gray.200">
                <Text fontWeight="bold" color="red.500">• 새로고침을 하거나 재접속하시면 대기시간이 더 길어집니다.</Text>
                <Text>• 접속 후 임의로 뒤로가기 버튼을 누르시면 대기가 초기화됩니다.</Text>
                <Text>• 비정상적인 접근 시 대기 순서가 차단될 수 있습니다.</Text>
              </VStack>
            </VStack>
          </Box>
        )}

        {phase === "captcha" && (
          <CaptchaScreen onSuccess={handleCaptchaSuccess} />
        )}

        {phase === "stadium" && (
          <StadiumMap mode={mode} delayMs={delayMs} onSelectSection={handleSectionSelect} />
        )}

        {phase === "seat" && selectedSection && (
          <SeatMap
            sectionId={selectedSection}
            mode={mode}
            delayMs={delayMs}
            onBackToStadium={handleBackToStadium}
            onSelectSeatSuccess={handleSeatSelectSuccess}
          />
        )}

        {phase === "success" && (
          <VStack spacing={6} py={8} px={5} align="stretch" h="full" justify="center" maxW="400px" mx="auto">
            {/* 성공 배너 */}
            <VStack spacing={2} align="center" textAlign="center" py={4}>
              <Box
                w="70px"
                h="70px"
                bg="green.500"
                color="white"
                rounded="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="36px"
                shadow="md"
              >
                🎉
              </Box>
              <Heading fontSize="22px" fontWeight="900" color="gray.800" mt={2}>
                예매 완료에 성공했습니다!
              </Heading>
              <Text fontSize="13px" color="gray.500">
                실제 티켓팅 환경에서 훌륭히 예매를 성공하셨습니다.
              </Text>
            </VStack>

            {/* 상세 티켓 명세 */}
            <Box bg="white" p={5} rounded="2xl" border="1px solid" borderColor="gray.200" shadow="sm">
              <VStack spacing={4} align="stretch">
                <Text fontSize="14px" fontWeight="bold" color="gray.400">
                  RESERVATION DETAIL
                </Text>
                
                <VStack align="start" spacing={1}>
                  <Text fontSize="11px" color="gray.400">공연명</Text>
                  <Text fontSize="15px" fontWeight="bold" color="gray.850">
                    2026 N.Flying Concert 'N-Finity' in Seoul
                  </Text>
                </VStack>

                <Grid templateColumns="1fr 1fr" gap={2} fontSize="13px">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="11px" color="gray.400">선택 좌석</Text>
                    <Text fontWeight="bold" color="blue.650">
                      {selectedSeat}
                    </Text>
                  </VStack>

                  <VStack align="end" spacing={1}>
                    <Text fontSize="11px" color="gray.400">티켓팅 모드</Text>
                    <Text fontWeight="bold" color={mode === "nboom" ? "red.600" : "blue.600"}>
                      {mode === "nboom" ? "엔붐온 모드" : "일반 모드"}
                    </Text>
                  </VStack>
                </Grid>

                <Box bg="red.50" border="1px solid" borderColor="red.100" p={3.5} rounded="xl" textAlign="center">
                  <Text fontSize="12px" color="gray.500">소요 시간 (클릭 순발력)</Text>
                  <Text fontSize="26px" fontWeight="900" color="red.500" fontFamily="monospace" mt={1}>
                    {elapsedTime.toFixed(2)}초
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* 버튼들 */}
            <VStack spacing={3}>
              <Button
                colorScheme="red"
                w="full"
                size="lg"
                rounded="xl"
                fontWeight="bold"
                onClick={handleReset}
              >
                다시 도전하기
              </Button>
              <Button
                variant="outline"
                colorScheme="gray"
                w="full"
                size="lg"
                rounded="xl"
                fontWeight="bold"
                onClick={() => navigate("/ticketing")}
              >
                예매처 목록으로 가기
              </Button>
            </VStack>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default InterparkBooking;
