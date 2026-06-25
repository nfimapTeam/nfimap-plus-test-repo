"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Image,
  Input,
} from "@chakra-ui/react";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, Clock, HelpCircle, Settings } from "lucide-react";

const InterparkHomeContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();

  const [difficulty, setDifficulty] = useState<"normal" | "nboom" | "jaehyun" | "cancel">("normal");
  const [delay, setDelay] = useState<number>(5); // seconds before open
  const [nickname, setNickname] = useState<string>("");
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState<boolean>(false);

  // Ticketing progress states
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("19:59:55.000");
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [isOpenTicket, setIsOpenTicket] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const openTimeRef = useRef<number | null>(null);
  const simulationStartRef = useRef<number>(0);

  // Setup modal initially open unless autoStart is true or session exists
  useEffect(() => {
    const showSettings = searchParams?.get("showSettings") === "true";
    const autoStart = searchParams?.get("autoStart") === "true" && !showSettings;
    const navigationEntries = typeof window !== "undefined" ? window.performance.getEntriesByType("navigation") : [];
    const isReload = navigationEntries.length > 0 && (navigationEntries[0] as PerformanceNavigationTiming).type === "reload";

    const enteredBooking = sessionStorage.getItem("nfiapark_entered_booking") === "true";

    if (showSettings || enteredBooking || (!isReload && !autoStart)) {
      sessionStorage.removeItem("interpark_sim_is_started");
      sessionStorage.removeItem("interpark_sim_difficulty");
      sessionStorage.removeItem("interpark_sim_delay");
      sessionStorage.removeItem("interpark_sim_start_time");
      sessionStorage.removeItem("nfiapark_entered_booking");
      sessionStorage.removeItem("nfiaparkStarted");
      setIsStarted(false);
      setIsOpenTicket(false);
      setTimeLeft(5);
      setCurrentTime("19:59:55.000");
      onOpen();
      return;
    }

    const hasSavedSession = sessionStorage.getItem("interpark_sim_is_started") === "true";
    const savedDifficulty = sessionStorage.getItem("interpark_sim_difficulty") as "normal" | "nboom" | "jaehyun" | "cancel" | null;
    const savedDelayStr = sessionStorage.getItem("interpark_sim_delay");
    const savedStartTimeStr = sessionStorage.getItem("interpark_sim_start_time");

    const modeParam = searchParams?.get("mode") as "normal" | "nboom" | "jaehyun" | "cancel";
    const delayParam = searchParams?.get("delay");

    let targetDifficulty: "normal" | "nboom" | "jaehyun" | "cancel" = "normal";
    let targetDelay = 5;
    let targetStartTime = 0;
    let shouldStart = false;

    if (hasSavedSession && savedDifficulty && savedDelayStr && savedStartTimeStr) {
      targetDifficulty = savedDifficulty;
      targetDelay = targetDifficulty === "cancel" ? 0 : Number(savedDelayStr);
      targetStartTime = Number(savedStartTimeStr);
      shouldStart = true;
    } else if (autoStart && modeParam) {
      targetDifficulty = modeParam;
      targetDelay = targetDifficulty === "cancel" ? 0 : Number(delayParam || 5);
      targetStartTime = Date.now();
      shouldStart = true;

      // Save initial simulation params to sessionStorage
      sessionStorage.setItem("interpark_sim_is_started", "true");
      sessionStorage.setItem("interpark_sim_difficulty", targetDifficulty);
      sessionStorage.setItem("interpark_sim_delay", String(targetDelay));
      sessionStorage.setItem("interpark_sim_start_time", String(targetStartTime));
    }

    if (shouldStart) {
      setDifficulty(targetDifficulty);
      setDelay(targetDelay);
      setIsStarted(true);

      const elapsedMs = Date.now() - targetStartTime;
      const initialSecondsRemaining = targetDelay - (elapsedMs / 1000);

      if (initialSecondsRemaining <= 0 || targetDifficulty === "cancel") {
        setIsOpenTicket(true);
        setTimeLeft(0);
        openTimeRef.current = targetStartTime + (targetDelay * 1000);
      } else {
        setIsOpenTicket(false);
        openTimeRef.current = null;
        setTimeLeft(initialSecondsRemaining);
      }

      simulationStartRef.current = targetStartTime;

      const startHour = 19;
      const startMin = 59;
      const startSec = 60 - targetDelay;
      const baseMs = (startHour * 3600 + startMin * 60 + startSec) * 1000;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        const currentElapsedMs = Date.now() - simulationStartRef.current;
        const secondsRemaining = targetDelay - (currentElapsedMs / 1000);

        const currentServerMs = baseMs + currentElapsedMs;
        const ms = currentServerMs % 1000;
        const totalSecs = Math.floor(currentServerMs / 1000);
        const secs = totalSecs % 60;
        const totalMins = Math.floor(totalSecs / 60);
        const mins = totalMins % 60;
        const hours = Math.floor(totalMins / 60) % 24;

        const formatTime = (h: number, m: number, s: number, milli: number) => {
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
        };

        setCurrentTime(formatTime(hours, mins, secs, ms));
        setTimeLeft(secondsRemaining > 0 ? secondsRemaining : 0);

        if (secondsRemaining <= 0 || targetDifficulty === "cancel") {
          setIsOpenTicket(true);
          if (!openTimeRef.current) {
            openTimeRef.current = simulationStartRef.current + (targetDelay * 1000);
          }
        }

        // 30s Timeout Fail Check
        const targetOpenTime = simulationStartRef.current + (targetDelay * 1000);
        if (targetDifficulty !== "cancel" && Date.now() >= targetOpenTime + 30000) {
          if (timerRef.current) clearInterval(timerRef.current);
          sessionStorage.setItem("nfiaparkStarted", "true");
          sessionStorage.removeItem("interpark_sim_is_started");
          sessionStorage.removeItem("interpark_sim_difficulty");
          sessionStorage.removeItem("interpark_sim_delay");
          sessionStorage.removeItem("interpark_sim_start_time");
          router.push(`/ticketing/nfiapark/booking?mode=${targetDifficulty}&failType=timeout`);
        }
      }, 30);

      // If open time has already passed by more than 30 seconds on mount, redirect immediately
      const openTime = targetStartTime + (targetDelay * 1000);
      if (targetDifficulty !== "cancel" && Date.now() >= openTime + 30000) {
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStorage.setItem("nfiaparkStarted", "true");
        sessionStorage.removeItem("interpark_sim_is_started");
        sessionStorage.removeItem("interpark_sim_difficulty");
        sessionStorage.removeItem("interpark_sim_delay");
        sessionStorage.removeItem("interpark_sim_start_time");
        router.push(`/ticketing/nfiapark/booking?mode=${targetDifficulty}&failType=timeout`);
      }
    } else {
      onOpen();
    }
  }, [onOpen, searchParams, router]);

  // Handle ticketing simulation
  const startSimulation = () => {
    if (difficulty === "jaehyun") {
      if (!nickname.trim()) {
        toast({
          title: "닉네임이 필요합니다!",
          description: "대환장모드 명예의 전당 등록을 위해 8자 이내의 닉네임을 입력해 주세요.",
          status: "warning",
          duration: 2500,
          isClosable: true,
          position: "top",
        });
        return;
      }
      localStorage.setItem("nickname", nickname.trim());
      sessionStorage.setItem("clean_nickname", nickname.trim());
      localStorage.removeItem("nfiapark_ranking_id");
      setNickname("");
    }

    onClose();
    setIsNicknameModalOpen(false);
    setIsStarted(true);

    const targetDelay = difficulty === "cancel" ? 0 : delay;
    setIsOpenTicket(difficulty === "cancel");

    openTimeRef.current = null;
    simulationStartRef.current = Date.now();
    setTimeLeft(targetDelay);

    // Save simulation parameters to sessionStorage to persist across reloads
    sessionStorage.setItem("interpark_sim_is_started", "true");
    sessionStorage.setItem("interpark_sim_difficulty", difficulty);
    sessionStorage.setItem("interpark_sim_delay", String(targetDelay));
    sessionStorage.setItem("interpark_sim_start_time", String(simulationStartRef.current));

    const startHour = 19;
    const startMin = 59;
    const startSec = 60 - targetDelay;
    const baseMs = (startHour * 3600 + startMin * 60 + startSec) * 1000;

    timerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - simulationStartRef.current;
      const secondsRemaining = targetDelay - (elapsedMs / 1000);

      const currentServerMs = baseMs + elapsedMs;
      const ms = currentServerMs % 1000;
      const totalSecs = Math.floor(currentServerMs / 1000);
      const secs = totalSecs % 60;
      const totalMins = Math.floor(totalSecs / 60);
      const mins = totalMins % 60;
      const hours = Math.floor(totalMins / 60) % 24;

      const formatTime = (h: number, m: number, s: number, milli: number) => {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
      };

      setCurrentTime(formatTime(hours, mins, secs, ms));
      setTimeLeft(secondsRemaining > 0 ? secondsRemaining : 0);

      if (secondsRemaining <= 0) {
        setIsOpenTicket(true);
        if (!openTimeRef.current) {
          openTimeRef.current = simulationStartRef.current + (delay * 1000);
        }
      }

      // 30s Timeout Fail Check
      const targetOpenTime = simulationStartRef.current + (delay * 1000);
      if (Date.now() >= targetOpenTime + 30000) {
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStorage.setItem("nfiaparkStarted", "true");
        sessionStorage.removeItem("interpark_sim_is_started");
        sessionStorage.removeItem("interpark_sim_difficulty");
        sessionStorage.removeItem("interpark_sim_delay");
        sessionStorage.removeItem("interpark_sim_start_time");
        router.push(`/ticketing/nfiapark/booking?mode=${difficulty}&failType=timeout`);
      }
    }, 30);
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
    sessionStorage.setItem("nfiaparkStarted", "true");
    router.push(`/ticketing/nfiapark/booking?mode=${difficulty}&delay=${delayMs}&countdownDelay=${delay}`);
  };

  // Dynamic calendar states
  const [calendarDays, setCalendarDays] = useState<{ day: number; isCurrentMonth: boolean; isSunday?: boolean; isSelected?: boolean }[]>([]);
  const [yearMonthStr, setYearMonthStr] = useState<string>("");
  const [periodStr, setPeriodStr] = useState<string>("");

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan
    const currentDate = today.getDate();

    setYearMonthStr(`${currentYear}.${String(currentMonth + 1).padStart(2, "0")}`);

    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    const formatDateStr = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    setPeriodStr(`${formatDateStr(today)} ~ ${formatDateStr(nextDay)}`);

    // First day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun

    // Last day of previous month
    const prevLast = new Date(currentYear, currentMonth, 0).getDate();
    // Last day of current month
    const currentLast = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: any[] = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevLast - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= currentLast; i++) {
      const dateObj = new Date(currentYear, currentMonth, i);
      const isSunday = dateObj.getDay() === 0;
      days.push({
        day: i,
        isCurrentMonth: true,
        isSunday,
        isSelected: i === currentDate,
      });
    }

    // Next month padding to fill up to 35 or 42 slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const nextPaddingCount = totalSlots - days.length;
    for (let i = 1; i <= nextPaddingCount; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
      });
    }

    setCalendarDays(days);
  }, []);

  return (
    <VStack spacing={0} align="stretch" h="full" bg="gray.50" position="relative">
      {/* 상단 네비 및 시계 */}
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" py={3} px={4}>
        <HStack justify="space-between">
          <IconButton
            icon={<ArrowLeft size={20} />}
            aria-label="뒤로가기"
            variant="ghost"
            rounded="full"
            onClick={() => {
              sessionStorage.removeItem("interpark_sim_is_started");
              sessionStorage.removeItem("interpark_sim_difficulty");
              sessionStorage.removeItem("interpark_sim_delay");
              sessionStorage.removeItem("interpark_sim_start_time");
              router.push("/ticketing");
            }}
          />
          {isStarted && (
            <HStack bg="blue.50" color="blue.600" px={3} py={1.5} rounded="xl" spacing={2} border="1px solid" borderColor="blue.100">
              <Clock size={16} />
              <Text fontSize="14px" fontWeight="bold" fontFamily="monospace">
                서버 시계: {currentTime}
              </Text>
            </HStack>
          )}
          <IconButton
            icon={<Settings size={18} />}
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
                  <Image src="/image/logo/logo_nfi.svg" alt="N.Flying Logo" maxW="80%" maxH="80%" objectFit="contain" />
                </Box>
              </Box>

              <VStack align="start" spacing={2} mt={2}>
                <Heading fontSize="20px" fontWeight="800" lineHeight="1.3">
                  2026 N.Flying Concert '&CON' in Seoul
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
                  <Text color="gray.800" fontWeight="600">N.Flying Hall</Text>

                  <Text color="gray.400">기간</Text>
                  <Text color="gray.800">{periodStr}</Text>
                </Grid>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* 하단 고정 예매 버튼 */}
      <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200" position="sticky" bottom={0}>
        <VStack spacing={2} align="stretch">
          {!isOpenTicket && isStarted && (
            <Text fontSize="13px" color="blue.500" fontWeight="bold" textAlign="center">
              예매 오픈까지 {Math.ceil(timeLeft)}초 남음...
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
            엔피아파크 연습 설정
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
                <RadioGroup onChange={(val) => setDifficulty(val as "normal" | "nboom" | "jaehyun" | "cancel")} value={difficulty} w="full">
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
                        콘서트 주요 구역이 극단적으로 빠르게 사라집니다.
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
                        <Text fontWeight="bold" fontSize="14px" color="purple.700">대환장 모드 (Crazy)</Text>
                      </Radio>
                      <Text fontSize="12px" color="gray.500" pl={6} mt={1}>
                        온갖 극악의 방해 요소가 괴롭히는 대환장 파티입니다.
                      </Text>
                    </Box>

                    <Box
                      border="1px solid"
                      borderColor={difficulty === "cancel" ? "teal.200" : "gray.200"}
                      bg={difficulty === "cancel" ? "teal.50" : "white"}
                      p={3}
                      rounded="xl"
                      cursor="pointer"
                      onClick={() => setDifficulty("cancel")}
                    >
                      <Radio value="cancel" colorScheme="teal">
                        <Text fontWeight="bold" fontSize="14px" color="teal.700">취켓팅 모드 (Grab)</Text>
                      </Radio>
                      <Text fontSize="12px" color="gray.500" pl={6} mt={1}>
                        새로고침으로 풀리는 취소표를 선점하는 모드입니다.
                      </Text>
                    </Box>
                  </VStack>
                </RadioGroup>
              </VStack>

              {/* 오픈 시간 대기 시간 */}
              <VStack align="start" spacing={3} opacity={difficulty === "cancel" ? 0.4 : 1} pointerEvents={difficulty === "cancel" ? "none" : "auto"}>
                <Text fontSize="15px" fontWeight="bold" color="gray.700">
                  오픈 대기 시간 (초)
                </Text>
                <RadioGroup onChange={(val) => setDelay(Number(val))} value={difficulty === "cancel" ? "" : String(delay)} w="full">
                  <HStack spacing={3}>
                    {[5, 15, 30].map((sec) => (
                      <Box
                        key={sec}
                        flex={1}
                        border="1px solid"
                        borderColor={difficulty !== "cancel" && delay === sec ? "blue.400" : "gray.200"}
                        bg={difficulty !== "cancel" && delay === sec ? "blue.50" : "white"}
                        p={3}
                        rounded="xl"
                        textAlign="center"
                        cursor={difficulty === "cancel" ? "not-allowed" : "pointer"}
                        onClick={() => difficulty !== "cancel" && setDelay(sec)}
                      >
                        <Radio value={String(sec)} colorScheme="blue" display="none" />
                        <Text fontWeight="bold" fontSize="14px">
                          {sec === 5 ? "5초 후" : `${sec}초 후`}
                        </Text>
                      </Box>
                    ))}
                  </HStack>
                </RadioGroup>
              </VStack>

            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.100">
            <HStack spacing={3} w="full">
              <Button
                variant="outline"
                w="35%"
                size="lg"
                rounded="xl"
                onClick={() => {
                  sessionStorage.removeItem("interpark_sim_is_started");
                  sessionStorage.removeItem("interpark_sim_difficulty");
                  sessionStorage.removeItem("interpark_sim_delay");
                  sessionStorage.removeItem("interpark_sim_start_time");
                  router.push("/ticketing");
                }}
                fontWeight="bold"
              >
                뒤로가기
              </Button>
              <Button
                colorScheme="blue"
                w="65%"
                size="lg"
                rounded="xl"
                onClick={() => {
                  if (difficulty === "jaehyun") {
                    onClose();
                    setIsNicknameModalOpen(true);
                  } else {
                    startSimulation();
                  }
                }}
                fontWeight="bold"
              >
                연습 시작하기
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 닉네임 입력 모달 (대환장모드 진입 시에만 노출) */}
      <Modal isOpen={isNicknameModalOpen} onClose={() => setIsNicknameModalOpen(false)} isCentered closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(3px)" />
        <ModalContent mx={4} rounded="2xl" bg="white" shadow="lg" color="gray.800">
          <ModalHeader textAlign="center" borderBottom="1px solid" borderColor="gray.100" fontSize="18px" fontWeight="bold">
            🏆 엔피아파크 랭킹 등록
          </ModalHeader>
          <ModalBody py={6}>
            <VStack spacing={5} align="stretch">
              <Text fontSize="13px" color="purple.600" fontWeight="bold" textAlign="center" lineHeight="1.6">
                대환장모드는 랭킹 등록이 가능합니다.<br />
                랭킹에 등록될 닉네임을 입력해 주세요!
              </Text>
              <Input
                placeholder="닉네임 입력 (최대 8글자)"
                value={nickname}
                onChange={(e) => {
                  if (e.target.value.length <= 8) {
                    setNickname(e.target.value);
                  }
                }}
                textAlign="center"
                fontSize="16px"
                fontWeight="bold"
                bg="gray.50"
                borderColor="purple.300"
                color="gray.800"
                h="50px"
                _placeholder={{ color: "gray.400" }}
                _focus={{ borderColor: "purple.500", bg: "white", shadow: "0 0 8px rgba(128,90,213,0.3)" }}
                autoFocus
                autoComplete="off"
              />
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.100">
            <HStack spacing={3} w="full">
              <Button
                variant="outline"
                w="35%"
                size="lg"
                rounded="xl"
                borderColor="gray.300"
                color="gray.700"
                _hover={{ bg: "gray.50" }}
                onClick={() => {
                  setIsNicknameModalOpen(false);
                  onOpen(); // Go back to configuration modal
                }}
                fontWeight="bold"
              >
                이전으로
              </Button>
              <Button
                colorScheme="purple"
                w="65%"
                size="lg"
                rounded="xl"
                onClick={startSimulation}
                fontWeight="bold"
              >
                연습 시작하기
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default function InterparkHomePage() {
  return (
    <Suspense fallback={<Box p={6} textAlign="center"><Text>로딩 중...</Text></Box>}>
      <InterparkHomeContent />
    </Suspense>
  );
}
