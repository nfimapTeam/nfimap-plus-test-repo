"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, RefreshCw, Clock, Settings, HelpCircle } from "lucide-react";

const TicketlinkHome = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Practice configuration states
  const [difficulty, setDifficulty] = useState<"normal" | "nboom" | "jaehyun" | "cancel">("normal");
  const [delay, setDelay] = useState<number>(5); // seconds before open
  const [nickname, setNickname] = useState<string>("");
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState<boolean>(false);

  const toast = useToast();

  // Ticketing progress states
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("19:59:55.000");
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [isOpenTicket, setIsOpenTicket] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const openTimeRef = useRef<number | null>(null);
  const openTimeOffsetRef = useRef<number>(0);
  const simulationStartRef = useRef<number>(0);

  // Setup modal initially open unless autoStart is true or session exists
  useEffect(() => {
    const showSettings = searchParams?.get("showSettings") === "true";
    const autoStart = searchParams?.get("autoStart") === "true" && !showSettings;
    const navigationEntries = typeof window !== "undefined" ? window.performance.getEntriesByType("navigation") : [];
    const isReload = navigationEntries.length > 0 && (navigationEntries[0] as PerformanceNavigationTiming).type === "reload";

    const enteredBooking = sessionStorage.getItem("nfialink_entered_booking") === "true";
    if (showSettings || enteredBooking || (!isReload && !autoStart)) {
      sessionStorage.removeItem("ticketlink_sim_is_started");
      sessionStorage.removeItem("ticketlink_sim_difficulty");
      sessionStorage.removeItem("ticketlink_sim_delay");
      sessionStorage.removeItem("ticketlink_sim_start_time");
      sessionStorage.removeItem("ticketlink_sim_offset");
      sessionStorage.removeItem("nfialink_entered_booking");
      sessionStorage.removeItem("nfialinkStarted");
      setIsStarted(false);
      setIsOpenTicket(false);
      setTimeLeft(5);
      setCurrentTime("19:59:55.000");
      onOpen();
      return;
    }

    const hasSavedSession = sessionStorage.getItem("ticketlink_sim_is_started") === "true";
    const savedDifficulty = sessionStorage.getItem("ticketlink_sim_difficulty") as "normal" | "nboom" | "jaehyun" | "cancel" | null;
    const savedDelayStr = sessionStorage.getItem("ticketlink_sim_delay");
    const savedStartTimeStr = sessionStorage.getItem("ticketlink_sim_start_time");
    const savedOffsetStr = sessionStorage.getItem("ticketlink_sim_offset");

    const modeParam = searchParams?.get("mode") as "normal" | "nboom" | "jaehyun" | "cancel";
    const delayParam = searchParams?.get("delay");

    let targetDifficulty: "normal" | "nboom" | "jaehyun" | "cancel" = "normal";
    let targetDelay = 5;
    let targetStartTime = 0;
    let targetOffset = 0;
    let shouldStart = false;

    if (hasSavedSession && savedDifficulty && savedDelayStr && savedStartTimeStr && savedOffsetStr) {
      targetDifficulty = savedDifficulty;
      targetDelay = targetDifficulty === "cancel" ? 0 : Number(savedDelayStr);
      targetStartTime = Number(savedStartTimeStr);
      targetOffset = Number(savedOffsetStr);
      shouldStart = true;
    } else if (autoStart && modeParam) {
      targetDifficulty = modeParam;
      targetDelay = targetDifficulty === "cancel" ? 0 : Number(delayParam || 5);
      targetStartTime = Date.now();
      targetOffset = targetDifficulty === "cancel" ? 0 : (Math.random() * 300) - 150;
      shouldStart = true;

      // Save initial simulation params to sessionStorage
      sessionStorage.setItem("ticketlink_sim_is_started", "true");
      sessionStorage.setItem("ticketlink_sim_difficulty", targetDifficulty);
      sessionStorage.setItem("ticketlink_sim_delay", String(targetDelay));
      sessionStorage.setItem("ticketlink_sim_start_time", String(targetStartTime));
      sessionStorage.setItem("ticketlink_sim_offset", String(targetOffset));
    }

    if (shouldStart) {
      setDifficulty(targetDifficulty);
      setDelay(targetDelay);
      setIsStarted(true);
      setShowGuide(true);

      openTimeOffsetRef.current = targetOffset;
      simulationStartRef.current = targetStartTime;

      const elapsedMs = Date.now() - targetStartTime;
      const expectedOpenTime = targetStartTime + (targetDelay * 1000) + targetOffset;
      const initialSecondsRemaining = targetDelay - (elapsedMs / 1000);

      if (Date.now() >= expectedOpenTime || targetDifficulty === "cancel") {
        setIsOpenTicket(true);
        setTimeLeft(0);
        openTimeRef.current = expectedOpenTime;
      } else {
        setIsOpenTicket(false);
        openTimeRef.current = null;
        setTimeLeft(initialSecondsRemaining > 0 ? initialSecondsRemaining : 0);
      }

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
            openTimeRef.current = expectedOpenTime;
          }
        }

        // 30s Timeout Fail Check
        const targetOpenTime = simulationStartRef.current + (targetDelay * 1000) + openTimeOffsetRef.current;
        if (targetDifficulty !== "cancel" && Date.now() >= targetOpenTime + 30000) {
          if (timerRef.current) clearInterval(timerRef.current);
          sessionStorage.setItem("nfialinkStarted", "true");
          sessionStorage.removeItem("ticketlink_sim_is_started");
          sessionStorage.removeItem("ticketlink_sim_difficulty");
          sessionStorage.removeItem("ticketlink_sim_delay");
          sessionStorage.removeItem("ticketlink_sim_start_time");
          sessionStorage.removeItem("ticketlink_sim_offset");
          router.push(`/ticketing/nfialink/booking?mode=${targetDifficulty}&failType=timeout`);
        }
      }, 30);

      // If open time has already passed by more than 30 seconds on mount, redirect immediately
      if (targetDifficulty !== "cancel" && Date.now() >= expectedOpenTime + 30000) {
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStorage.setItem("nfialinkStarted", "true");
        sessionStorage.removeItem("ticketlink_sim_is_started");
        sessionStorage.removeItem("ticketlink_sim_difficulty");
        sessionStorage.removeItem("ticketlink_sim_delay");
        sessionStorage.removeItem("ticketlink_sim_start_time");
        sessionStorage.removeItem("ticketlink_sim_offset");
        router.push(`/ticketing/nfialink/booking?mode=${targetDifficulty}&failType=timeout`);
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
      localStorage.removeItem("nfialink_ranking_id");
      setNickname("");
    }

    onClose();
    setIsNicknameModalOpen(false);
    setIsStarted(true);

    const targetDelay = difficulty === "cancel" ? 0 : delay;
    setIsOpenTicket(difficulty === "cancel");

    setShowGuide(true);
    openTimeRef.current = null;
    openTimeOffsetRef.current = targetDelay === 0 ? 0 : (Math.random() * 300) - 150; // -150ms to +150ms
    simulationStartRef.current = Date.now();
    setTimeLeft(targetDelay);

    // Save simulation parameters to sessionStorage to persist across reloads
    sessionStorage.setItem("ticketlink_sim_is_started", "true");
    sessionStorage.setItem("ticketlink_sim_difficulty", difficulty);
    sessionStorage.setItem("ticketlink_sim_delay", String(targetDelay));
    sessionStorage.setItem("ticketlink_sim_start_time", String(simulationStartRef.current));
    sessionStorage.setItem("ticketlink_sim_offset", String(openTimeOffsetRef.current));

    const startHour = 19;
    const startMin = 59;
    const startSec = 60 - targetDelay;
    const baseMs = (startHour * 3600 + startMin * 60 + startSec) * 1000;

    if (timerRef.current) clearInterval(timerRef.current);

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

      if (secondsRemaining <= 0 || difficulty === "cancel") {
        setIsOpenTicket(true);
        if (!openTimeRef.current) {
          openTimeRef.current = simulationStartRef.current + (targetDelay * 1000) + openTimeOffsetRef.current;
        }
      }

      // 30s Timeout Fail Check
      const targetOpenTime = simulationStartRef.current + (targetDelay * 1000) + openTimeOffsetRef.current;
      if (difficulty !== "cancel" && Date.now() >= targetOpenTime + 30000) {
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStorage.setItem("nfialinkStarted", "true");
        sessionStorage.removeItem("ticketlink_sim_is_started");
        sessionStorage.removeItem("ticketlink_sim_difficulty");
        sessionStorage.removeItem("ticketlink_sim_delay");
        sessionStorage.removeItem("ticketlink_sim_start_time");
        sessionStorage.removeItem("ticketlink_sim_offset");
        router.push(`/ticketing/nfialink/booking?mode=${difficulty}&failType=timeout`);
      }
    }, 30);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleManualRefresh = () => {
    if (!isStarted) return;
    setShowGuide(false);
    setIsRefreshing(true);
    setIsPageLoading(true);

    // Stutter/lag delay when opening: add an extra 250-450ms lag if it is opening soon
    const isOpeningSoon = timeLeft <= 1;
    const stutterDelay = isOpeningSoon ? Math.floor(Math.random() * 200) + 250 : 0;
    const totalDelay = 600 + stutterDelay;

    setTimeout(() => {
      setIsRefreshing(false);
      setIsPageLoading(false);

      // Evaluate if the refresh completed AFTER the actual open time (rendering finish)
      const refreshEndTime = Date.now();
      const expectedOpenTime = simulationStartRef.current + (delay * 1000) + openTimeOffsetRef.current;
      const isCompletedAfterOpen = refreshEndTime >= expectedOpenTime;

      // Only activate the booking button if refresh was completed after the open time
      if (isCompletedAfterOpen) {
        setIsOpenTicket(true);
      }
    }, totalDelay); // Simulate page refresh delay with optional lag
  };

  const handleBookingClick = () => {
    if (!isOpenTicket) return;
    const clickTime = Date.now();
    const openTime = openTimeRef.current || clickTime;
    const delayMs = clickTime - openTime;
    sessionStorage.setItem("nfialinkStarted", "true");
    router.push(`/ticketing/nfialink/booking?mode=${difficulty}&delay=${delayMs}&countdownDelay=${delay}`);
  };

  // Dynamic calendar states
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [calendarDays, setCalendarDays] = useState<{ day: number; isCurrentMonth: boolean; isSunday?: boolean; isSelected?: boolean }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    setPeriodStr(`${formatDateStr(today)} - ${formatDateStr(nextDay)}`);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun

    const prevLast = new Date(currentYear, currentMonth, 0).getDate();
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
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" py={3} px={4} position="sticky" top={0} zIndex={10}>
        <HStack justify="space-between">
          <IconButton
            icon={<ArrowLeft size={20} />}
            aria-label="뒤로가기"
            variant="ghost"
            rounded="full"
            onClick={() => {
              sessionStorage.removeItem("ticketlink_sim_is_started");
              sessionStorage.removeItem("ticketlink_sim_difficulty");
              sessionStorage.removeItem("ticketlink_sim_delay");
              sessionStorage.removeItem("ticketlink_sim_start_time");
              sessionStorage.removeItem("ticketlink_sim_offset");
              router.push("/ticketing");
            }}
          />
          <Heading fontSize="12px" fontWeight="bold" noOfLines={1} maxW="120px" color="gray.800">
            2026 N.Flying Concert '&CON' in Seoul 🇰🇷 한국어
          </Heading>
          <HStack spacing={2}>
            <IconButton
              icon={<Settings size={18} />}
              aria-label="연습설정"
              variant="ghost"
              rounded="full"
              size="sm"
              onClick={onOpen}
              opacity={showGuide && isStarted && !isOpenTicket ? 0.4 : 1}
            />
            <Button
              leftIcon={<RefreshCw size={showGuide && isStarted && !isOpenTicket ? 18 : 15} className={isRefreshing ? "spin-animation" : ""} />}
              bg="#FF3838"
              color="white"
              _hover={{ bg: "#E02E2E", transform: "scale(1.05)" }}
              _active={{ bg: "#C22424", transform: "scale(0.97)" }}
              rounded="xl"
              onClick={handleManualRefresh}
              fontWeight="black"
              fontSize={showGuide && isStarted && !isOpenTicket ? "15px" : "12px"}
              h={showGuide && isStarted && !isOpenTicket ? "44px" : "34px"}
              px={showGuide && isStarted && !isOpenTicket ? 5 : 3}
              shadow={showGuide && isStarted && !isOpenTicket ? "0 0 0 4px rgba(255,56,56,0.35), xl" : "sm"}
              border="2px solid"
              borderColor="red.600"
              className={showGuide && isStarted && !isOpenTicket ? "pulse-animation" : ""}
              transition="all 0.3s ease"
            >
              새로고침
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* 실시간 서버시계 영역 - 크고 임팩트 있게 */}
      {isStarted && (
        <Box
          bg="linear-gradient(135deg, #CC0000 0%, #FF3838 60%, #FF6B6B 100%)"
          py={3.5}
          px={4}
          borderBottom="3px solid"
          borderColor="red.800"
          textAlign="center"
          position="relative"
          zIndex={30}
          shadow="0 4px 20px rgba(255,56,56,0.4)"
        >
          <VStack spacing={0.5} align="center">
            <HStack spacing={1.5} color="red.100" justify="center">
              <Clock size={12} />
              <Text fontSize="10px" fontWeight="bold" letterSpacing="2px" color="rgba(255,255,255,0.75)">
                엔피아링크 실시간 서버 시계
              </Text>
            </HStack>
            <Text
              fontSize="28px"
              fontWeight="black"
              fontFamily="'Courier New', monospace"
              color="white"
              letterSpacing="3px"
              lineHeight={1.1}
              textShadow="0 2px 8px rgba(0,0,0,0.3)"
            >
              {currentTime}
            </Text>
          </VStack>
        </Box>
      )}

      {/* 새로고침 안내 팁 박스 */}
      {isStarted && !isOpenTicket && (
        <Box bg="yellow.50" py={2.5} px={4} borderBottom="1px solid" borderColor="yellow.100" textAlign="center" position="relative" zIndex={20}>
          <Text fontSize="12px" fontWeight="bold" color="yellow.700">
            💡 20:00:00이 되면 우측 상단 <Text as="span" color="red.600" fontWeight="black">새로고침</Text> 버튼을 눌러야 예매가 오픈됩니다!
          </Text>
        </Box>
      )}

      {/* 모바일/웹 레이아웃 */}
      <Box
        p={4}
        overflowY="auto"
        flex="1"
        position="relative"
        opacity={showGuide && isStarted && !isOpenTicket ? 0.38 : 1}
        style={{
          filter: showGuide && isStarted && !isOpenTicket ? "blur(1.5px)" : "none",
          transition: "opacity 0.6s ease, filter 0.6s ease",
          pointerEvents: showGuide && isStarted && !isOpenTicket ? "none" : "auto",
        }}
      >
        {isPageLoading && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="white"
            zIndex={100}
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={0.98}
          >
            <VStack spacing={4}>
              <RefreshCw size={36} className="spin-animation" color="#FF3838" />
              <Text fontSize="13px" fontWeight="bold" color="gray.500">
                페이지를 불러오는 중...
              </Text>
            </VStack>
          </Box>
        )}
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
                <HStack>
                  <Text fontSize="10px" bg="red.500" color="white" px={2} py={0.5} rounded="md" fontWeight="bold">
                    단독판매
                  </Text>
                </HStack>
                <Heading fontSize="18px" fontWeight="900" lineHeight="1.3" color="gray.900">
                  2026 N.Flying Concert '&CON' in Seoul
                </Heading>

                <HStack justify="space-between" w="full" mt={1}>
                  <Text fontSize="13px" color="gray.500">
                    콘서트 • 만 9세이상
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

          {/* 달력 안내 미리보기 */}
          <Box bg="white" p={4} rounded="2xl" border="1px solid" borderColor="gray.100" shadow="sm">
            <VStack spacing={3} align="stretch">
              <Text fontSize="14px" fontWeight="bold" color="gray.700">
                관람일 안내
              </Text>
              <Text fontSize="13px" color="gray.500">
                해당 티켓팅은 실전처럼 날짜 및 좌석 선택을 바로 진행하는 방식으로 구성되어 있습니다.
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* 하단 고정 예매 버튼 */}
      <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200" position="sticky" bottom={0}>
        <VStack spacing={2} align="stretch">
          {isOpenTicket && (
            <Text fontSize="12px" color="green.600" fontWeight="black" textAlign="center">
              🎉 티켓팅이 오픈되었습니다! 예매하기 버튼을 누르세요.
            </Text>
          )}
          {!isOpenTicket && isStarted && (
            <Text fontSize="12px" color="red.500" fontWeight="bold" textAlign="center">
              ⚠️ 시계가 20:00:00이 되면 우측 상단 새로고침을 누르세요!
            </Text>
          )}
          <Button
            w="full"
            h="54px"
            bg={isOpenTicket ? "#FF3838" : "gray.300"}
            color="white"
            _hover={isOpenTicket ? { bg: "#E02E2E" } : {}}
            _active={isOpenTicket ? { bg: "#C22424" } : {}}
            isDisabled={!isOpenTicket || isRefreshing}
            isLoading={isRefreshing}
            fontWeight="black"
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
            엔피아링크 연습 설정
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
                  sessionStorage.removeItem("ticketlink_sim_is_started");
                  sessionStorage.removeItem("ticketlink_sim_difficulty");
                  sessionStorage.removeItem("ticketlink_sim_delay");
                  sessionStorage.removeItem("ticketlink_sim_start_time");
                  sessionStorage.removeItem("ticketlink_sim_offset");
                  router.push("/ticketing");
                }}
                fontWeight="bold"
              >
                뒤로가기
              </Button>
              <Button
                colorScheme="red"
                bg="#FF3838"
                _hover={{ bg: "#E02E2E" }}
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
        <ModalOverlay bg="blackAlpha.850" backdropFilter="blur(4px)" />
        <ModalContent mx={4} rounded="2xl" bg="rgba(25, 12, 12, 0.98)" border="1.5px solid" borderColor="red.500" color="white" shadow="0 10px 30px rgba(229, 62, 62, 0.3)">
          <ModalHeader textAlign="center" borderBottom="1px solid" borderColor="rgba(255,255,255,0.08)" fontSize="18px" fontWeight="black" letterSpacing="1px">
            🏆 엔피아링크 랭킹 등록
          </ModalHeader>
          <ModalBody py={6}>
            <VStack spacing={5} align="stretch">
              <Text fontSize="13px" color="red.200" fontWeight="bold" textAlign="center" lineHeight="1.6">
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
                fontWeight="black"
                bg="rgba(255, 255, 255, 0.04)"
                borderColor="red.400"
                color="white"
                h="50px"
                _placeholder={{ color: "red.300" }}
                _focus={{ borderColor: "red.300", shadow: "0 0 10px rgba(229,62,62,0.5)" }}
                autoFocus
                autoComplete="off"
              />
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="rgba(255,255,255,0.08)">
            <HStack spacing={3} w="full">
              <Button
                variant="outline"
                w="35%"
                size="lg"
                rounded="xl"
                borderColor="rgba(255,255,255,0.15)"
                color="gray.300"
                _hover={{ bg: "rgba(255,255,255,0.05)" }}
                onClick={() => {
                  setIsNicknameModalOpen(false);
                  onOpen(); // Go back to configuration modal
                }}
                fontWeight="bold"
              >
                이전으로
              </Button>
              <Button
                bgGradient="linear(to-r, #E53E3E, #DD6B20)"
                color="white"
                _hover={{ bgGradient: "linear(to-r, #C53030, #C05621)", transform: "scale(1.02)" }}
                _active={{ transform: "scale(0.98)" }}
                w="65%"
                size="lg"
                rounded="xl"
                onClick={startSimulation}
                fontWeight="bold"
                shadow="0 4px 15px rgba(229, 62, 62, 0.4)"
              >
                연습 시작하기
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>


      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 0.6s linear infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 56, 56, 0.7), 0 4px 15px rgba(255, 56, 56, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(255, 56, 56, 0), 0 4px 25px rgba(255, 56, 56, 0.6); transform: scale(1.04); }
        }
        .pulse-animation {
          animation: pulseGlow 1.1s ease-in-out infinite;
        }
        @keyframes bounceUp {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-7px); opacity: 0.75; }
        }
        .bounce-up-animation {
          animation: bounceUp 0.8s ease-in-out infinite;
        }
      `}</style>
    </VStack>
  );
};

export default TicketlinkHome;
