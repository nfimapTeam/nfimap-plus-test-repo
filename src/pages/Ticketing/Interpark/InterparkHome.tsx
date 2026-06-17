import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Heading,
  useDisclosure,
  Button,
  Grid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  RadioGroup,
  Radio,
  Divider,
} from "@chakra-ui/react";
import { ArrowLeft, RefreshCw, Clock, HelpCircle } from "lucide-react";

const InterparkHome = () => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Practice configuration states
  const [difficulty, setDifficulty] = useState<"normal" | "nboom" | "jaehyun">("normal");
  const [delay, setDelay] = useState<number>(3); // seconds before open

  // Ticketing progress states
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("19:59:57");
  const [timeLeft, setTimeLeft] = useState<number>(3);
  const [isOpenTicket, setIsOpenTicket] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const openTimeRef = useRef<number | null>(null);

  // Setup modal initially open
  useEffect(() => {
    onOpen();
  }, [onOpen]);

  // Handle ticketing simulation
  const startSimulation = () => {
    onClose();
    setIsStarted(true);
    setIsOpenTicket(false);
    openTimeRef.current = null;
    setTimeLeft(delay);

    // Initial mock clock calculation
    const startHour = 19;
    const startMin = 59;
    const startSec = 60 - delay;
    
    let currentSecondsElapsed = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      currentSecondsElapsed += 1;
      const secondsRemaining = delay - currentSecondsElapsed;

      // Update countdown display clock
      const targetSec = startSec + currentSecondsElapsed;
      let displayHour = startHour;
      let displayMin = startMin;
      let displaySec = targetSec;

      if (displaySec >= 60) {
        displaySec = displaySec - 60;
        displayMin += 1;
      }
      if (displayMin >= 60) {
        displayMin = 0;
        displayHour += 1;
      }

      const formatTime = (h: number, m: number, s: number) => {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      };

      setCurrentTime(formatTime(displayHour, displayMin, displaySec));
      setTimeLeft(secondsRemaining > 0 ? secondsRemaining : 0);

      if (secondsRemaining <= 0) {
        setIsOpenTicket(true);
        openTimeRef.current = Date.now();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleBookingClick = () => {
    if (!isOpenTicket) return;
    const clickTime = Date.now();
    const openTime = openTimeRef.current || clickTime;
    const delayMs = clickTime - openTime;
    navigate(`/ticketing/interpark/booking?mode=${difficulty}&delay=${delayMs}`);
  };

  // Calendar days setup matching July 2026 (Starts Wednesday 1st)
  // Rows: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
  const calendarDays = [
    { day: 28, isCurrentMonth: false },
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },
    { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true, isSunday: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true, isSelected: true }, // Select July 11th
    { day: 12, isCurrentMonth: true, isSunday: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true, isSunday: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true, isSunday: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
  ];

  return (
    <VStack spacing={0} align="stretch" h="full" bg="gray.50" position="relative" minH="calc(100svh - 68px)">
      {/* 상단 네비 및 시계 */}
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" py={3} px={4}>
        <HStack justify="space-between">
          <IconButton
            icon={<ArrowLeft size={20} />}
            aria-label="뒤로가기"
            variant="ghost"
            rounded="full"
            onClick={() => navigate("/ticketing")}
          />
          {isStarted && (
            <HStack bg="red.50" color="red.600" px={3} py={1.5} rounded="xl" spacing={2} border="1px solid" borderColor="red.100">
              <Clock size={16} />
              <Text fontSize="14px" fontWeight="bold" fontFamily="monospace">
                서버 시계: {currentTime}
              </Text>
            </HStack>
          )}
          <IconButton
            icon={<RefreshCw size={18} />}
            aria-label="연습설정 열기"
            variant="ghost"
            rounded="full"
            onClick={onOpen}
          />
        </HStack>
      </Box>

      {/* 모바일/웹 레이아웃 */}
      <Box p={4} overflowY="auto" flex="1">
        <VStack spacing={5} align="stretch">
          {/* 상품 상세 헤더 (포스터 및 정보) */}
          <Box bg="white" p={4} rounded="2xl" border="1px solid" borderColor="gray.100" shadow="sm">
            <VStack spacing={4} align="stretch">
              <Box bg="gray.100" rounded="xl" overflow="hidden" position="relative" pt="100%">
                {/* Fallback svg styling for poster */}
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bgGradient="linear(to-br, purple.700, pink.600)"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  p={4}
                  color="white"
                  textAlign="center"
                >
                  <Text fontSize="12px" fontWeight="bold" letterSpacing="2px" color="pink.200">
                    2026 CONCERT
                  </Text>
                  <Text fontSize="24px" fontWeight="900" mt={2} lineHeight="1.2">
                    N.Flying
                  </Text>
                  <Text fontSize="20px" fontWeight="800" bgGradient="linear(to-r, white, pink.200)" bgClip="text">
                    'N-Finity'
                  </Text>
                  <Text fontSize="12px" mt={6} opacity={0.8}>
                    IN SEOUL
                  </Text>
                </Box>
              </Box>

              <VStack align="start" spacing={2} mt={2}>
                <Heading fontSize="20px" fontWeight="800" lineHeight="1.3">
                  2026 N.Flying Concert 'N-Finity' in Seoul
                </Heading>

                <HStack justify="space-between" w="full" mt={2}>
                  <Text fontSize="13px" bg="gray.100" px={3} py={1} rounded="md" color="gray.600">
                    콘서트
                  </Text>
                  <Text fontSize="13px" color="gray.500">
                    만 9세이상
                  </Text>
                </HStack>

                <Divider my={2} />

                <Grid templateColumns="75px 1fr" gap={2} fontSize="13px">
                  <Text color="gray.400">장소</Text>
                  <Text color="gray.800" fontWeight="600">YES24 LIVE HALL</Text>

                  <Text color="gray.400">기간</Text>
                  <Text color="gray.800">2026.07.11 ~ 2026.07.12</Text>
                </Grid>
              </VStack>
            </VStack>
          </Box>

          {/* 달력 및 회차 선택 */}
          <Box bg="white" p={4} rounded="2xl" border="1px solid" borderColor="gray.100" shadow="sm">
            <VStack spacing={4} align="stretch">
              {/* 년/월 표시 */}
              <HStack justify="center" spacing={4} py={1}>
                <Text fontSize="16px" fontWeight="bold">
                  2026.07
                </Text>
              </HStack>

              {/* 달력 그리드 */}
              <Grid templateColumns="repeat(7, 1fr)" gap={1} textAlign="center" fontSize="13px">
                {/* 요일 헤더 */}
                {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
                  <Text key={day} color={idx === 0 ? "red.500" : "gray.600"} fontWeight="bold" py={1}>
                    {day}
                  </Text>
                ))}

                {/* 날짜 데이터 */}
                {calendarDays.map((item, idx) => (
                  <Box key={idx} py={1.5} display="flex" justifyContent="center" alignItems="center">
                    <Box
                      w="30px"
                      h="30px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      rounded="full"
                      fontSize="13px"
                      fontWeight={item.isSelected || item.isCurrentMonth ? "600" : "normal"}
                      color={
                        item.isSelected
                          ? "white"
                          : !item.isCurrentMonth
                          ? "gray.300"
                          : item.isSunday
                          ? "red.500"
                          : "gray.700"
                      }
                      bg={item.isSelected ? "blue.600" : "transparent"}
                    >
                      {item.day}
                    </Box>
                  </Box>
                ))}
              </Grid>

              <Divider my={1} />

              {/* 회차 정보 */}
              <VStack align="stretch" spacing={2}>
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  회차 선택
                </Text>
                <Button
                  variant="outline"
                  borderColor="blue.500"
                  color="blue.600"
                  bg="blue.50"
                  size="md"
                  w="full"
                  justifyContent="center"
                  fontWeight="bold"
                  rounded="xl"
                >
                  17:00 (1회차)
                </Button>
                <Text fontSize="12px" color="gray.500" textAlign="center" mt={1}>
                  잔여석이 안내되지 않는 상품이에요.
                </Text>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* 하단 고정 예매 버튼 */}
      <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200" position="sticky" bottom={0}>
        <VStack spacing={2} align="stretch">
          {!isOpenTicket && isStarted && (
            <Text fontSize="13px" color="red.500" fontWeight="bold" textAlign="center">
              예매 오픈까지 {timeLeft}초 남음...
            </Text>
          )}
          {isOpenTicket && (
            <Text fontSize="13px" color="green.600" fontWeight="bold" textAlign="center">
              티켓팅이 오픈되었습니다! 예매하기 버튼을 누르세요.
            </Text>
          )}
          {!isStarted && (
            <Text fontSize="12px" color="gray.500" textAlign="center">
              상단의 설정아이콘이나 시작 모달을 통해 연습을 구성하고 시작하세요.
            </Text>
          )}
          <Button
            w="full"
            h="54px"
            bg={isOpenTicket ? "blue.600" : "gray.300"}
            color="white"
            _hover={isOpenTicket ? { bg: "blue.700" } : {}}
            _active={isOpenTicket ? { bg: "blue.800" } : {}}
            isDisabled={!isOpenTicket}
            fontWeight="bold"
            fontSize="18px"
            rounded="xl"
            onClick={handleBookingClick}
          >
            예매하기
          </Button>
        </VStack>
      </Box>

      {/* 설정 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(3px)" />
        <ModalContent mx={4} rounded="2xl">
          <ModalHeader textAlign="center" borderBottom="1px solid" borderColor="gray.100">
            티켓팅 연습 설정
          </ModalHeader>
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              {/* 모드 선택 */}
              <VStack align="start" spacing={3}>
                <HStack>
                  <Text fontSize="15px" fontWeight="bold" color="gray.700">
                    연습 난이도 모드
                  </Text>
                  <HelpCircle size={16} color="gray.400" />
                </HStack>
                <RadioGroup onChange={(val) => setDifficulty(val as "normal" | "nboom" | "jaehyun")} value={difficulty} w="full">
                  <VStack spacing={3} align="stretch">
                    <Box
                      border="1px solid"
                      borderColor={difficulty === "normal" ? "blue.200" : "gray.200"}
                      bg={difficulty === "normal" ? "blue.50" : "white"}
                      p={3}
                      rounded="xl"
                      cursor="pointer"
                      onClick={() => setDifficulty("normal")}
                    >
                      <Radio value="normal" colorScheme="blue">
                        <Text fontWeight="bold" fontSize="14px">일반 모드 (Normal)</Text>
                      </Radio>
                      <Text fontSize="12px" color="gray.500" pl={6} mt={1}>
                        적절한 속도로 좌석이 소진됩니다. 초보자 연습에 적합합니다.
                      </Text>
                    </Box>

                    <Box
                      border="1px solid"
                      borderColor={difficulty === "nboom" ? "red.200" : "gray.200"}
                      bg={difficulty === "nboom" ? "red.50" : "white"}
                      p={3}
                      rounded="xl"
                      cursor="pointer"
                      onClick={() => setDifficulty("nboom")}
                    >
                      <Radio value="nboom" colorScheme="red">
                        <Text fontWeight="bold" fontSize="14px" color="red.700">엔붐온 모드 (Hard)</Text>
                      </Radio>
                      <Text fontSize="12px" color="gray.500" pl={6} mt={1}>
                        콘서트 주요 구역(Floor, 전열)이 극단적으로 빨리 사라집니다. 좌석이 엄청 빠르게 사라집니다.
                      </Text>
                    </Box>

                    <Box
                      border="1px solid"
                      borderColor={difficulty === "jaehyun" ? "purple.200" : "gray.200"}
                      bg={difficulty === "jaehyun" ? "purple.50" : "white"}
                      p={3}
                      rounded="xl"
                      cursor="pointer"
                      onClick={() => setDifficulty("jaehyun")}
                    >
                      <Radio value="jaehyun" colorScheme="purple">
                        <Text fontWeight="bold" fontSize="14px" color="purple.700">재현 모드 (Jaehyun Mode)</Text>
                      </Radio>
                      <Text fontSize="12px" color="gray.500" pl={6} mt={1}>
                        유튜브 방송 알림, 슬라이더 퍼즐 검증, 프롬(Fromm) 재현이의 채팅 알림 등 온갖 극악의 방해 요소가 당신을 괴롭힙니다.
                      </Text>
                    </Box>
                  </VStack>
                </RadioGroup>
              </VStack>

              {/* 오픈 시간 대기 시간 */}
              <VStack align="start" spacing={3}>
                <Text fontSize="15px" fontWeight="bold" color="gray.700">
                  오픈 대기 시간 (초)
                </Text>
                <RadioGroup onChange={(val) => setDelay(Number(val))} value={String(delay)} w="full">
                  <HStack spacing={3}>
                    {[3, 10, 30].map((sec) => (
                      <Box
                        key={sec}
                        flex={1}
                        border="1px solid"
                        borderColor={delay === sec ? "blue.400" : "gray.200"}
                        bg={delay === sec ? "blue.50" : "white"}
                        p={3}
                        rounded="xl"
                        textAlign="center"
                        cursor="pointer"
                        onClick={() => setDelay(sec)}
                      >
                        <Radio value={String(sec)} colorScheme="blue" display="none" />
                        <Text fontWeight="bold" fontSize="14px">
                          {sec === 3 ? "즉시 (3초)" : `${sec}초 후`}
                        </Text>
                      </Box>
                    ))}
                  </HStack>
                </RadioGroup>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.100">
            <Button colorScheme="blue" w="full" size="lg" rounded="xl" onClick={startSimulation} fontWeight="bold">
              연습 시작하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default InterparkHome;
