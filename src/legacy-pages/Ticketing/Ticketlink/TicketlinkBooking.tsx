"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  HStack,
  Text,
  Badge,
  VStack,
  Heading,
  Grid,
  Button,
  Image,
  useToast,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
  Alert,
  AlertIcon,
  Divider,
} from "@chakra-ui/react";
import { X, ArrowLeft, RefreshCw, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { bookingResultState } from "../../../Atom/bookingResultState";
import { DISTRACTION_MEMBERS, YOUTUBE_CHANNELS, DistractionMember, getYoutubeReplyMessage } from "../constants";

import { supabase, hasSupabaseConfig } from "../../../lib/supabase";
import { getTicketlinkSeatScore, getFinalScore } from "../../../utils/score";
import { Leaderboard } from "../../../components/Leaderboard";

import PuzzleScreen from "../Interpark/components/PuzzleScreen";
import NfiaAuthScreen from "../Interpark/components/NfiaAuthScreen";

// Define booking phases
type BookingPhase = "queue" | "dateSelect" | "seatSelect" | "success" | "fail";

interface DistractionEvent {
  id: string;
  type: "youtube" | "fromm";
  sender: string;
  avatar: string;
  content: string;
  yOffset: number;
  xOffset: number;
}

interface TicketlinkSeatData {
  id: string;
  sectionName: string; // "가", "나", "다", "라", "마", "바", "사", "아"
  rowName: string; // "A" ~ "H"
  colIndex: number;
  status: "available" | "occupied" | "selected";
  grade: "VIP" | "S" | "A";
  price: number;
  hijacked?: boolean;
  disappearTime?: number;
  seatDelay?: number;
}

const TicketlinkBooking = () => {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = (searchParams?.get("mode") as "normal" | "nboom" | "jaehyun" | "cancel") || "normal";
  const delayParam = searchParams?.get("delay");
  const delayMs = delayParam ? parseInt(delayParam, 10) : 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const countdownDelayParam = searchParams?.get("countdownDelay");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const countdownDelay = countdownDelayParam ? parseInt(countdownDelayParam, 10) : 5;
  const failType = searchParams?.get("failType");

  // Booking flow phases
  const [phase, setPhase] = useState<BookingPhase>(() => {
    return failType === "timeout" ? "fail" : "queue";
  });

  const setBookingResult = useSetRecoilState(bookingResultState);
  useEffect(() => {
    setBookingResult(phase === "success" || phase === "fail");
    return () => {
      setBookingResult(false);
    };
  }, [phase, setBookingResult]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showCaptchaModal, setShowCaptchaModal] = useState<boolean>(false);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  // Time & Stats tracking
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const globalStartTimeRef = useRef<number>(performance.now());
  const [yiseonjwaCount, setYiseonjwaCount] = useState<number>(0);
  const [randomMember, setRandomMember] = useState<DistractionMember | null>(null);

  const [refreshCount, setRefreshCount] = useState<number>(0);
  const lastRefreshIdRef = useRef<number>(0);

  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserScore, setCurrentUserScore] = useState<number | undefined>(undefined);
  const [currentUserBaseScore, setCurrentUserBaseScore] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

  const [seats, setSeats] = useState<TicketlinkSeatData[]>([]);

  const seatsRef = useRef(seats);
  useEffect(() => {
    seatsRef.current = seats;
  }, [seats]);

  const selectedSeatIdRef = useRef(selectedSeatId);
  useEffect(() => {
    selectedSeatIdRef.current = selectedSeatId;
  }, [selectedSeatId]);

  // Synchronize selection state if the selected seat disappears/becomes occupied in the background
  useEffect(() => {
    if (selectedSeatId) {
      const current = seats.find((s) => s.id === selectedSeatId);
      if (current && current.status === "occupied") {
        setSelectedSeatId(null);
      }
    }
  }, [seats, selectedSeatId]);

  // Queue state
  const [currentQueue, setCurrentQueue] = useState<number>(0);
  const [initialQueueSize, setInitialQueueSize] = useState<number>(0);

  // Distractions list (Crazy Mode)
  const [distractions, setDistractions] = useState<DistractionEvent[]>([]);
  const [showPuzzleOverlay, setShowPuzzleOverlay] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);
  const [activePuzzleType, setActivePuzzleType] = useState<"slider" | "nfia">("nfia");

  useEffect(() => {
    if (showPuzzleOverlay) {
      setActivePuzzleType(Math.random() < 0.5 ? "slider" : "nfia");
    }
  }, [showPuzzleOverlay]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savedPhase, setSavedPhase] = useState<BookingPhase | null>(null);
  const [activeFullScreenDistraction, setActiveFullScreenDistraction] = useState<{
    type: "youtube" | "fromm";
    sender: string;
    avatar: string;
    content: string;
  } | null>(null);

  // Captcha text states (Local coral clean captcha)
  const [captchaText, setCaptchaText] = useState<string>("");
  const [captchaInput, setCaptchaInput] = useState<string>("");
  const [captchaError, setCaptchaError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reference for receipt screenshot
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const [showRobotCaptchaModal, setShowRobotCaptchaModal] = useState<boolean>(false);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const initialAvailableSeatsCountRef = useRef<number>(0);

  // Zoom & Pan states
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs to separate click gestures from dragging
  const dragMoveDetectedRef = useRef<boolean>(false);
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom in/out based on wheel delta
    const zoomFactor = 0.05;
    setScale((prevScale) => {
      const newScale = prevScale - e.deltaY * zoomFactor * 0.01;
      return Math.min(3, Math.max(0.8, newScale));
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    dragMoveDetectedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    if (Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y) > 6) {
      dragMoveDetectedRef.current = true;
    }
    setOffset({ x: newX, y: newY });
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      };
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      dragMoveDetectedRef.current = false;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.hypot(e.touches[0].clientX - touchStartPosRef.current.x, e.touches[0].clientY - touchStartPosRef.current.y) > 6) {
        dragMoveDetectedRef.current = true;
      }
      setOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      setScale(() => {
        const newScale = touchStartScaleRef.current * ratio;
        return Math.min(3, Math.max(0.8, newScale));
      });
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  // Reset zoom & pan when phase changes to seatSelect
  useEffect(() => {
    if (phase === "seatSelect") {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [phase]);

  // Redirect to home if page is refreshed
  useEffect(() => {
    sessionStorage.setItem("nfialink_entered_booking", "true");
    const isStarted = sessionStorage.getItem("nfialinkStarted");
    if (!isStarted) {
      router.push("/ticketing/nfialink?showSettings=true");
    } else {
      // Clear after a brief delay to allow React Strict Mode double-mount in dev to pass
      setTimeout(() => {
        sessionStorage.removeItem("nfialinkStarted");
      }, 100);
    }
  }, [router]);

  useEffect(() => {
    if (phase === "success" && !randomMember) {
      if (mode === "jaehyun") {
        setRandomMember(DISTRACTION_MEMBERS[0]);
      } else {
        const idx = Math.floor(Math.random() * DISTRACTION_MEMBERS.length);
        setRandomMember(DISTRACTION_MEMBERS[idx]);
      }
    }
  }, [phase, mode, randomMember]);

  // Generate a random 6-character captcha string
  const generateCaptchaText = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Excluded confusing characters
    let text = "";
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  };

  const drawCaptcha = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Clean and fill background with soft coral-pink texture
    ctx.fillStyle = "#FFF0F2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw coral background noise dots
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#FFA3B1" : "#FFCCD5";
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 3. Draw random noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(255,107,129,0.3)" : "rgba(255,163,177,0.3)";
      ctx.lineWidth = Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // 4. Draw distorted letters in deep coral/pink
    ctx.font = "bold 32px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    const letterSpacing = canvas.width / 7;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      ctx.save();
      const x = letterSpacing * (i + 0.8) + (Math.random() * 4 - 2);
      const y = canvas.height / 2 + (Math.random() * 12 - 6);
      ctx.translate(x, y);

      const angle = ((Math.random() * 40 - 20) * Math.PI) / 180;
      ctx.rotate(angle);

      const scaleX = 0.9 + Math.random() * 0.2;
      const scaleY = 0.9 + Math.random() * 0.2;
      ctx.scale(scaleX, scaleY);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillText(char, 2, 2);

      // Text Color (Ticketlink Pinkish Red)
      ctx.fillStyle = "#FF4D6D";
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }

    // 5. Draw crossing horizontal line
    ctx.strokeStyle = "#FF1F4B";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, canvas.height / 2 + (Math.random() * 10 - 5));
    ctx.bezierCurveTo(
      canvas.width / 3,
      canvas.height / 2 - 15,
      (canvas.width * 2) / 3,
      canvas.height / 2 + 15,
      canvas.width - 10,
      canvas.height / 2 + (Math.random() * 10 - 5)
    );
    ctx.stroke();
  }, []);

  const handleRefreshCaptcha = () => {
    const newText = generateCaptchaText();
    setCaptchaText(newText);
    setCaptchaInput("");
    setCaptchaError("");
    drawCaptcha(newText);
  };

  // Helper to deplete seats based on sorting priorities
  const depleteSeats = useCallback((currentSeats: TicketlinkSeatData[], countToDeplete: number, isInitial: boolean = false): TicketlinkSeatData[] => {
    const availableSeats = currentSeats.filter((s) => s.status === "available");
    if (availableSeats.length === 0 || countToDeplete <= 0) return currentSeats;

    const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"];

    // Sort available seats so front rows / floor seats sell out first (gradually top-to-bottom)
    const sortedAvailable = [...availableSeats].sort((a, b) => {
      const aIdx = rowNamesList.indexOf(a.rowName);
      const bIdx = rowNamesList.indexOf(b.rowName);

      if (isInitial) {
        // During initial delay, deplete seats more evenly across the entire hall
        // so sections '가' and '나' are not completely wiped out before entering
        const aRowScore = (24 - aIdx) * 5;
        const bRowScore = (24 - bIdx) * 5;
        const aScore = aRowScore + Math.random() * 150;
        const bScore = bRowScore + Math.random() * 150;
        return bScore - aScore;
      }

      // Section Priority: "가" and "나" are highest, then other VIPs, then others
      let aSecScore = 0;
      if (a.sectionName === "가" || a.sectionName === "나") {
        aSecScore = 300;
      } else if (a.sectionName === "다" || a.sectionName === "라" || a.sectionName === "마") {
        aSecScore = 200;
      } else if (a.sectionName === "바" || a.sectionName === "아") {
        aSecScore = 100;
      }

      let bSecScore = 0;
      if (b.sectionName === "가" || b.sectionName === "나") {
        bSecScore = 300;
      } else if (b.sectionName === "다" || b.sectionName === "라" || b.sectionName === "마") {
        bSecScore = 200;
      } else if (b.sectionName === "바" || b.sectionName === "아") {
        bSecScore = 100;
      }

      // Row Score: front rows have higher base score, but not strictly sequential
      const aRowScore = (24 - aIdx) * 15;
      const bRowScore = (24 - bIdx) * 15;

      // Moderate jitter for natural but clearly top-biased depletion
      const aScore = aSecScore + aRowScore + Math.random() * 150;
      const bScore = bSecScore + bRowScore + Math.random() * 150;

      return bScore - aScore;
    });

    const updatedSeats = [...currentSeats];
    const actualCount = Math.min(countToDeplete, sortedAvailable.length);
    for (let i = 0; i < actualCount; i++) {
      const seatToTake = sortedAvailable[i];
      const idx = updatedSeats.findIndex((s) => s.id === seatToTake.id);
      if (idx !== -1) {
        updatedSeats[idx] = { ...updatedSeats[idx], status: "occupied" };
      }
    }
    return updatedSeats;
  }, []);

  const getTickTimeAndDepleteCount = useCallback(() => {
    const isNboom = mode === "nboom";
    const isJaehyun = mode === "jaehyun";

    // Nboom: 70ms for smooth cascading depletion, Jaehyun: 400ms, Normal: 600ms
    const tickTime = isNboom ? 70 : isJaehyun ? 400 : 600;

    let baseNum = 0;
    if (isNboom) {
      baseNum = Math.random() < 0.6 ? 1 : 2; // 1 to 2 base for smooth depletion
    } else if (isJaehyun) {
      baseNum = Math.random() < 0.15 ? 8 : 7; // Approx 7.15 seats/tick for full depletion in ~60s
    } else {
      baseNum = Math.floor(Math.random() * 3) + 2; // Normal mode: 2 to 4
    }

    return { tickTime, baseNum };
  }, [mode]);

  // Generate initial seat state (100% available at start, pre-depleted for delayMs)
  const initializeSeats = useCallback(() => {
    const isNboom = mode === "nboom";
    const isJaehyun = mode === "jaehyun";

    const generatedSeats: TicketlinkSeatData[] = [];
    const sectionsConfig = [
      { name: "가", grade: "VIP" as const, price: 154000, rows: 14, cols: 12 },
      { name: "나", grade: "VIP" as const, price: 154000, rows: 14, cols: 12 },
      { name: "다", grade: "VIP" as const, price: 154000, rows: 12, cols: 10 },
      { name: "라", grade: "VIP" as const, price: 154000, rows: 12, cols: 12 },
      { name: "마", grade: "VIP" as const, price: 154000, rows: 12, cols: 10 },
      { name: "바", grade: "S" as const, price: 132000, rows: 24, cols: 4 },
      { name: "사", grade: "A" as const, price: 110000, rows: 8, cols: 20 },
      { name: "아", grade: "S" as const, price: 132000, rows: 24, cols: 4 },
    ];

    const rowNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"];

    sectionsConfig.forEach((sec) => {
      rowNames.slice(0, sec.rows).forEach((row) => {
        for (let col = 1; col <= sec.cols; col++) {
          generatedSeats.push({
            id: `TL-${sec.name}-${row}-${col}`,
            sectionName: sec.name,
            rowName: row,
            colIndex: col,
            status: "available",
            grade: sec.grade,
            price: sec.price,
          });
        }
      });
    });

    if (mode === "cancel") {
      const allOccupiedSeats = generatedSeats.map((s) => ({
        ...s,
        status: "occupied" as const,
      }));
      setSeats(allOccupiedSeats);
      return;
    }

    let currentSeats = generatedSeats;
    if (delayMs > 0) {
      const delaySec = delayMs / 1000;
      let depletePercent = 0;
      if (delaySec < 0.3) {
        depletePercent = delaySec * 0.1; // very few seats gone if extremely fast
      } else {
        if (isNboom) {
          depletePercent = 0.25 + (delaySec - 0.3) * 0.28;
        } else if (isJaehyun) {
          depletePercent = 0.20 + (delaySec - 0.3) * 0.22;
        } else {
          depletePercent = 0.05 + (delaySec - 0.3) * 0.08;
        }
      }
      depletePercent = Math.min(1.0, Math.max(0.0, depletePercent));
      const countToDeplete = Math.floor(generatedSeats.length * depletePercent);
      currentSeats = depleteSeats(generatedSeats, countToDeplete, true);
    }

    setSeats(currentSeats);
  }, [mode, delayMs, getTickTimeAndDepleteCount, depleteSeats]);

  // Process connection queue if delay exists
  useEffect(() => {
    if (failType === "timeout") {
      setPhase("fail");
      return;
    }
    const delaySec = Math.max(0, delayMs / 1000);
    let qSize = 0;
    if (delaySec >= 0.25) {
      const base = Math.min(4, delaySec);
      qSize = Math.floor(Math.pow(base, 2) * 2200 + Math.random() * 1000);
      if (qSize > 35000) {
        qSize = 35000 + Math.floor(Math.random() * 1000);
      }
    }

    if (qSize <= 0 || mode === "cancel") {
      setPhase("dateSelect");
      initializeSeats();
      return;
    }

    setPhase("queue");
    setInitialQueueSize(qSize);
    setCurrentQueue(qSize);

    // Countdown logic for waiting queue
    const waitTimeSec = Math.max(2, Math.min(10, qSize / 2800));
    const tickInterval = 50;
    const totalTicks = (waitTimeSec * 1000) / tickInterval;
    const decrementPerTick = Math.ceil(qSize / totalTicks);

    let tempQueue = qSize;
    const timer = setInterval(() => {
      tempQueue = Math.max(0, tempQueue - Math.floor(decrementPerTick * (0.8 + Math.random() * 0.4)));
      setCurrentQueue(tempQueue);
      if (tempQueue <= 0) {
        clearInterval(timer);
        setPhase("dateSelect");
        initializeSeats();
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [delayMs, initializeSeats]);

  // Handle seat layout depletion loop (runs continuously in background during dateSelect and seatSelect)
  useEffect(() => {
    if (phase !== "dateSelect" && phase !== "seatSelect") return;
    if (mode === "cancel") return;

    const intervalTime = phase === "seatSelect" ? 100 : 500;
    let intervalId: NodeJS.Timeout | null = null;

    intervalId = setInterval(() => {
      setSeats((prevSeats) => {
        const availableSeats = prevSeats.filter((s) => s.status === "available");
        if (availableSeats.length === 0) return prevSeats;

        let countToDeplete = 0;
        if (phase === "seatSelect") {
          const elapsed = (performance.now() - startTime) / 1000;
          const targetDuration = mode === "nboom" ? 30 : mode === "jaehyun" ? 60 : 180;
          const targetDepletedRatio = Math.min(1.0, elapsed / targetDuration);
          const targetOccupiedCount = Math.round(initialAvailableSeatsCountRef.current * targetDepletedRatio);
          const targetAvailableCount = Math.max(0, initialAvailableSeatsCountRef.current - targetOccupiedCount);
          countToDeplete = availableSeats.length - targetAvailableCount;
        } else {
          // Slowly deplete during dateSelect phase
          countToDeplete = Math.random() < 0.3 ? 1 : 0;
        }

        if (countToDeplete <= 0) return prevSeats;

        let updatedSeats = depleteSeats(prevSeats, countToDeplete);

        // Random selected seat hijack (이선좌) chance
        const hijackChance = mode === "jaehyun" ? 0.05 : mode === "nboom" ? 0.02 : 0.01;
        if (hijackChance > 0 && Math.random() < hijackChance) {
          const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
          if (selectedIdx !== -1) {
            updatedSeats = [...updatedSeats];
            updatedSeats[selectedIdx] = { ...updatedSeats[selectedIdx], status: "occupied" };
          }
        }

        return updatedSeats;
      });
    }, intervalTime);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [phase, mode, getTickTimeAndDepleteCount, depleteSeats]);

  // Failure detection (all seats sold out and no seat selected)
  useEffect(() => {
    if (phase === "seatSelect" && !showCaptchaModal) {
      if (mode === "cancel") return;
      const availableCount = seats.filter((s) => s.status === "available").length;
      const selectedSeat = seats.find((s) => s.id === selectedSeatId);

      if (selectedSeatId && selectedSeat) {
        if (selectedSeat.status === "occupied" && availableCount === 0) {
          const endTime = performance.now();
          setElapsedTime((delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000));
          setPhase("fail");
        } else if (selectedSeat.status === "occupied" && availableCount > 0) {
          setSelectedSeatId(null);
          toast({
            title: "이미 선택된 좌석입니다.",
            description: "다른 예매자가 먼저 좌석을 선택했습니다.",
            status: "error",
            duration: 1500,
            position: "top",
          });
        }
      } else {
        if (availableCount === 0) {
          const endTime = performance.now();
          setElapsedTime((delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000));
          setPhase("fail");
        }
      }
    }
  }, [seats, phase, selectedSeatId, showCaptchaModal, startTime]);

  // Cleanup overlays on success/fail
  useEffect(() => {
    if (phase === "fail" || phase === "success") {
      setShowRobotCaptchaModal(false);
      setShowPuzzleOverlay(false);
      setShowCaptchaModal(false);
      setActiveFullScreenDistraction(null);
    }
  }, [phase]);

  // Distraction event spawner (Crazy)
  useEffect(() => {
    if (mode !== "jaehyun" || phase === "success" || phase === "fail" || phase === "queue" || showCaptchaModal) {
      setDistractions([]);
      return;
    }

    const spawnDistraction = () => {
      const isYoutube = Math.random() > 0.5;
      const id = Math.random().toString(36).substr(2, 9);

      let newEvent: DistractionEvent;
      if (isYoutube) {
        const selected = YOUTUBE_CHANNELS[Math.floor(Math.random() * YOUTUBE_CHANNELS.length)];
        newEvent = {
          id,
          type: "youtube",
          sender: selected.name,
          avatar: selected.avatar,
          content: selected.content,
          yOffset: 0,
          xOffset: 0,
        };
      } else {
        const selectedMember = DISTRACTION_MEMBERS[Math.floor(Math.random() * DISTRACTION_MEMBERS.length)];
        const msg = selectedMember.messages[Math.floor(Math.random() * selectedMember.messages.length)];
        const y = Math.floor(Math.random() * 500) + 150; // Randomly spread across the seat map height
        const x = Math.floor(Math.random() * 100) + 10; // Randomly spread horizontally
        newEvent = {
          id,
          type: "fromm",
          sender: selectedMember.name,
          avatar: selectedMember.avatar,
          content: msg,
          yOffset: y,
          xOffset: x,
        };
      }

      setDistractions((prev) => {
        if (prev.length >= 7) return prev;
        return [...prev, newEvent];
      });

      if (newEvent.type === "youtube") {
        setTimeout(() => {
          setDistractions((prev) => prev.filter((d) => d.id !== id));
        }, 4500);
      }
    };

    const triggerNext = () => {
      // 80% of current frequency
      const nextDelay = (Math.random() * 1200 + 800) * 1.5625;
      return setTimeout(() => {
        spawnDistraction();
        timerId = triggerNext();
      }, nextDelay);
    };

    const firstTimerId = setTimeout(() => {
      spawnDistraction();
    }, 200);

    let timerId = triggerNext();

    return () => {
      clearTimeout(firstTimerId);
      clearTimeout(timerId);
    };
  }, [mode, phase, showCaptchaModal]);

  // Navigate to seat mapping phase and trigger Captcha modal
  const handleDateSelectNext = () => {
    if (!selectedDate || !selectedTime) return;
    // Don't re-initialize seats here so the continuous depletion is preserved
    setPhase("seatSelect");
    setShowCaptchaModal(true);
    setCaptchaInput("");
    setCaptchaError("");

    const captchaVal = generateCaptchaText();
    setCaptchaText(captchaVal);
    setTimeout(() => {
      drawCaptcha(captchaVal);
    }, 120);

    setStartTime(performance.now());
    initialAvailableSeatsCountRef.current = seats.filter(s => s.status === "available").length;
  };

  const handleCaptchaSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (captchaInput.toUpperCase() === captchaText) {
      setShowCaptchaModal(false);
      setStartTime(performance.now());
      initialAvailableSeatsCountRef.current = seats.filter(s => s.status === "available").length;
      toast({
        title: "인증되었습니다.",
        status: "success",
        duration: 1200,
        position: "top",
      });
    } else {
      setCaptchaError("보안문자가 올치하지 않습니다.");
      setCaptchaInput("");
      const refreshText = generateCaptchaText();
      setCaptchaText(refreshText);
      drawCaptcha(refreshText);
    }
  };

  // Seat Click handler
  const handleSeatClick = (seat: TicketlinkSeatData) => {
    if (dragMoveDetectedRef.current) return;

    const currentSeat = seatsRef.current.find((s) => s.id === seat.id);
    if (!currentSeat) return;

    const isCancelMode = mode === "cancel";
    const isPastDisappear = isCancelMode && currentSeat.disappearTime && Date.now() >= currentSeat.disappearTime;

    if (currentSeat.status === "occupied" || isPastDisappear) {
      if (isCancelMode) {
        toast({
          title: "이미 선택된 좌석입니다.",
          description: "예매 진행 도중 다른 예매자가 먼저 결제창에 진입했습니다.",
          status: "error",
          duration: 2500,
          position: "top",
        });
        setSeats((prev) =>
          prev.map((s) => (s.id === currentSeat.id ? { ...s, status: "occupied" } : s))
        );
        handleYiseonjwaTrigger();
      }
      return;
    }

    setSeats((prevSeats) =>
      prevSeats.map((s) => {
        if (s.id === seat.id) {
          const newStatus = s.status === "selected" ? "available" : "selected";
          setSelectedSeatId(newStatus === "selected" ? s.id : null);
          return { ...s, status: newStatus };
        }
        if (s.status === "selected") {
          return { ...s, status: "available" };
        }
        return s;
      })
    );
  };

  const handleYiseonjwaTrigger = () => {
    if (mode === "cancel") return;
    setYiseonjwaCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowRobotCaptchaModal(true);
        return 0;
      }
      return next;
    });
  };

  const handlePuzzleOverlaySuccess = async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    setShowPuzzleOverlay(false);
  };

  // Cancel mode 1m (60s) game timer
  useEffect(() => {
    if (mode !== "cancel" || phase === "success" || phase === "fail" || phase === "queue") return;

    const timer = setInterval(() => {
      const elapsedMs = performance.now() - globalStartTimeRef.current;
      if (elapsedMs >= 60000) { // 60 seconds
        clearInterval(timer);
        const endTime = performance.now();
        setElapsedTime((delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000));
        setPhase("fail");
      }
    }, 500);

    return () => clearInterval(timer);
  }, [mode, phase, delayMs]);

  const handleCancelModeRefresh = () => {
    const nextCount = refreshCount + 1;
    setRefreshCount(nextCount);

    const performRefresh = () => {
      const rand = Math.random();
      let numSeatsToGenerate = 0;
      let isLargeBatch = false;

      if (rand < 1 / 15) {
        numSeatsToGenerate = 50;
        isLargeBatch = true;
      } else if (rand < 1 / 15 + 1 / 5) {
        numSeatsToGenerate = Math.floor(Math.random() * 3) + 4; // 4, 5, 6
      }

      const resetSeats: TicketlinkSeatData[] = seatsRef.current.map((s) => ({
        ...s,
        status: "occupied",
        hijacked: false,
      }));

      const generatedSeatIds: string[] = [];

      if (numSeatsToGenerate > 0) {
        const pool = Array.from({ length: resetSeats.length }).map((_, i) => i);
        const shuffled = pool.sort(() => 0.5 - Math.random());

        const numSelectable = isLargeBatch ? 8 : numSeatsToGenerate;
        const numHijacked = isLargeBatch ? 42 : 0;

        for (let i = 0; i < numSelectable + numHijacked; i++) {
          const idx = shuffled[i];
          if (idx !== undefined) {
            const seatDelay = Math.random() * 800 + 500;
            resetSeats[idx].status = "available";
            resetSeats[idx].hijacked = i >= numSelectable;
            resetSeats[idx].seatDelay = seatDelay;
            resetSeats[idx].disappearTime = Date.now() + seatDelay;
            generatedSeatIds.push(resetSeats[idx].id);
          }
        }
      }

      setSeats(resetSeats);

      const currentRefreshId = ++lastRefreshIdRef.current;

      generatedSeatIds.forEach((seatId) => {
        const seat = resetSeats.find((s) => s.id === seatId);
        const seatDelay = seat?.seatDelay || 800;

        setTimeout(() => {
          if (currentRefreshId !== lastRefreshIdRef.current) return;
          if (selectedSeatIdRef.current === seatId) {
            setSelectedSeatId(null);
          }
          setSeats((prev) => {
            return prev.map((s) => {
              if (s.id === seatId && (s.status === "available" || s.status === "selected")) {
                return { ...s, status: "occupied" as const, hijacked: false };
              }
              return s;
            });
          });
        }, seatDelay);
      });
    };

    if (nextCount > 0 && nextCount % 10 === 0) {
      setPendingAction(() => performRefresh);
      setShowPuzzleOverlay(true);
    } else {
      performRefresh();
    }
  };

  // Seat Selection Completion
  const handleSeatSelectNext = () => {
    if (!selectedSeatId) {
      toast({
        title: "좌석을 선택하지 않았습니다.",
        description: "좌석을 선택해주세요.",
        status: "warning",
        duration: 1500,
        position: "top",
      });
      return;
    }

    const action = async () => {
      const currentSelectedSeatId = selectedSeatIdRef.current;
      const currentSeats = seatsRef.current;

      if (!currentSelectedSeatId) {
        toast({
          title: "이미 선택된 좌석입니다.",
          description: "예매 진행 도중 다른 예매자가 먼저 결제창에 진입했습니다.",
          status: "error",
          duration: 2500,
          position: "top",
        });
        handleYiseonjwaTrigger();
        return;
      }

      // Double check if seat became occupied
      const seat = currentSeats.find((s) => s.id === currentSelectedSeatId);
      const isNboom = mode === "nboom";
      const isJaehyun = mode === "jaehyun";

      // Bot hijack seat (이선좌) check on submission
      setTotalAttempts((prev) => prev + 1);

      const isCancelMode = mode === "cancel";
      const isPastDisappear = isCancelMode && seat && seat.disappearTime && Date.now() >= seat.disappearTime;

      const hijackChance = isCancelMode ? (seat?.hijacked ? 1.0 : 0.0) : (isJaehyun ? (totalAttempts < 6 ? 0.96 : 0.87) : isNboom ? 0.20 : 0.05);
      let isHijacked = false;
      if (Math.random() < hijackChance) {
        isHijacked = true;
      }

      if (!seat || seat.status === "occupied" || isHijacked || isPastDisappear) {
        // Change seat to occupied
        setSeats((prev) =>
          prev.map((s) => (s.id === currentSelectedSeatId ? { ...s, status: "occupied" } : s))
        );
        toast({
          title: "이미 선택된 좌석입니다.",
          description: "예매 진행 도중 다른 예매자가 먼저 결제창에 진입했습니다.",
          status: "error",
          duration: 2500,
          position: "top",
        });
        setSelectedSeatId(null);
        handleYiseonjwaTrigger();
        return;
      }

      // Successful Booking!
      const endTime = performance.now();
      const duration = (delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000);
      setElapsedTime(duration);

      if (mode === "jaehyun") {
        let nicknameVal = sessionStorage.getItem("clean_nickname") || localStorage.getItem("nickname") || "UNK";
        // Defensive: strip trailing digits that match any stored ranking ID
        const storedId = localStorage.getItem("nfialink_ranking_id");
        if (storedId && nicknameVal.endsWith(storedId)) {
          nicknameVal = nicknameVal.slice(0, -storedId.length) || "UNK";
        }
        setCurrentUserName(nicknameVal);
        const baseScore = getTicketlinkSeatScore(seat.sectionName, seat.rowName);
        setCurrentUserBaseScore(baseScore);
        const finalScore = getFinalScore(baseScore, duration);
        setCurrentUserScore(finalScore);

        const submitScore = async () => {
          let savedId = localStorage.getItem("nfialink_ranking_id");
          let finalId: number | null = savedId ? Number(savedId) : null;
          let dbSuccess = false;

          if (hasSupabaseConfig) {
            try {
              let existingRecord = null;
              if (finalId) {
                const { data, error } = await supabase
                  .from("ticket_rankings")
                  .select("id, score")
                  .eq("id", finalId)
                  .maybeSingle();
                if (!error && data) {
                  existingRecord = data;
                }
              }

              if (!existingRecord) {
                const { data, error: insertError } = await supabase
                  .from("ticket_rankings")
                  .insert({
                    ticket_type: "nfialink",
                    name: nicknameVal,
                    score: finalScore,
                  })
                  .select("id")
                  .single();

                if (insertError) {
                  console.error("Insert error from Supabase:", insertError);
                } else if (data) {
                  finalId = data.id;
                  localStorage.setItem("nfialink_ranking_id", String(data.id));
                  dbSuccess = true;
                }
              } else if (finalScore > Number(existingRecord.score)) {
                const { error: updateError } = await supabase
                  .from("ticket_rankings")
                  .update({
                    score: finalScore,
                  })
                  .eq("id", existingRecord.id);

                if (updateError) {
                  console.error("Update error from Supabase:", updateError);
                } else {
                  dbSuccess = true;
                }
              } else {
                dbSuccess = true; // No update needed but record is fine
              }
              if (finalId) {
                setCurrentUserId(finalId);
              }
            } catch (err) {
              console.error("Failed to submit score to Supabase:", err);
            }
          }

          // Fallback to local storage if supabase write failed or isn't configured
          if (!dbSuccess) {
            const localKey = "mock_rankings_nfialink";
            try {
              const savedStr = localStorage.getItem(localKey);
              let savedList = savedStr ? JSON.parse(savedStr) : [];

              if (!finalId) {
                finalId = Math.floor(Math.random() * 9000) + 1000;
                localStorage.setItem("nfialink_ranking_id", String(finalId));
              }

              const existingIdx = savedList.findIndex((item: any) => item.id === finalId);
              if (existingIdx !== -1) {
                if (finalScore > savedList[existingIdx].score) {
                  savedList[existingIdx].score = finalScore;
                }
              } else {
                savedList.push({
                  id: finalId,
                  name: nicknameVal,
                  score: finalScore,
                  created_at: new Date().toISOString(),
                });
              }
              savedList.sort((a: any, b: any) => b.score - a.score);
              localStorage.setItem(localKey, JSON.stringify(savedList));
              setCurrentUserId(finalId);
            } catch (e) {
              console.error("Local storage ranking update failed:", e);
            }
          }
        };
        await submitScore();
      }

      setPhase("success");
    };

    if (mode === "jaehyun") {
      setPendingAction(() => action);
      setShowPuzzleOverlay(true);
    } else {
      action();
    }
  };

  const handleRetrySimulation = () => {
    sessionStorage.removeItem("ticketlink_sim_is_started");
    sessionStorage.removeItem("ticketlink_sim_difficulty");
    sessionStorage.removeItem("ticketlink_sim_delay");
    sessionStorage.removeItem("ticketlink_sim_start_time");
    sessionStorage.removeItem("ticketlink_sim_offset");
    sessionStorage.removeItem("nfialink_entered_booking");
    sessionStorage.removeItem("nfialinkStarted");
    setTotalAttempts(0);
    router.push(`/ticketing/nfialink?showSettings=true`);
  };

  // Get selected seat info text
  const getSelectedSeat = () => {
    if (!selectedSeatId) return null;
    return seats.find((s) => s.id === selectedSeatId);
  };

  const selectedSeat = getSelectedSeat();

  const getDayOfWeekStr = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split(".");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      return `(${days[d.getDay()]})`;
    } catch (e) {
      return "";
    }
  };

  const isOverlappingStage = (seat: TicketlinkSeatData) => {
    return false;
  };

  const renderSeatBox = (seat: TicketlinkSeatData) => {
    if (isOverlappingStage(seat)) {
      return (
        <Box
          key={seat.id}
          w="3.5px"
          h="3.5px"
          visibility="hidden"
        />
      );
    }

    let bg = "#F1F3F5";
    let borderColor = "#E2E8F0";

    if (seat.status === "available") {
      bg = "#C594FF";
      borderColor = "#A855F7";
    } else if (seat.status === "selected") {
      bg = "#FF5722";
      borderColor = "#E64A19";
    }

    return (
      <Box
        key={seat.id}
        w="3.5px"
        h="3.5px"
        bg={bg}
        border="0.3px solid"
        borderColor={borderColor}
        borderRadius="0.5px"
        cursor={seat.status === "occupied" ? "default" : "pointer"}
        onClick={() => handleSeatClick(seat)}
        _hover={seat.status !== "occupied" ? { transform: "scale(1.5)", transition: "transform 0.1s" } : {}}
      />
    );
  };

  // Dynamic calendar values
  const [calendarDates, setCalendarDates] = useState<{ dayStr: string; dateNum: number; isSelectable: boolean; dateObj: Date }[]>([]);

  useEffect(() => {
    const today = new Date();
    const list: any[] = [];
    // Generate dates around today/tomorrow
    for (let i = 0; i < 7; i++) {
      const temp = new Date(today);
      temp.setDate(today.getDate() + i);
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      list.push({
        dayStr: days[temp.getDay()],
        dateNum: temp.getDate(),
        isSelectable: i === 0 || i === 1, // Only today and tomorrow are selectable
        dateObj: temp,
      });
    }
    setCalendarDates(list);

    // Default select first day
    if (list.length > 0) {
      const firstDate = list[0].dateObj;
      const formatted = `${firstDate.getFullYear()}.${String(firstDate.getMonth() + 1).padStart(2, "0")}.${String(firstDate.getDate()).padStart(2, "0")}`;
      setSelectedDate(formatted);
      setSelectedTime("18:00");
    }
  }, []);

  return (
    <Box
      position="relative"
      zIndex={100}
      minH="100svh"
      h={(phase === "success" || phase === "fail") ? "auto" : "100svh"}
      maxH={(phase === "success" || phase === "fail") ? "none" : "100svh"}
      overflow={(phase === "success" || phase === "fail") ? "visible" : "hidden"}
      bg="gray.50"
      display="flex"
      flexDirection="column"
      maxW="480px"
      w="full"
      mx="auto"
    >
      {/* Distraction overlays (Crazy) */}
      {distractions.map((d) => {
        if (d.type === "youtube") {
          return (
            <Box
              key={d.id}
              position="absolute"
              top="12px"
              left="12px"
              right="12px"
              bg="rgba(20, 20, 20, 0.96)"
              color="white"
              p={3}
              rounded="xl"
              shadow="xl"
              zIndex={200}
              border="1px solid"
              borderColor="gray.700"
              animation="slideDown 0.3s ease"
              backdropFilter="blur(6px)"
              cursor="pointer"
              onClick={() => {
                setSavedPhase(phase);
                setActiveFullScreenDistraction({
                  type: "youtube",
                  sender: d.sender,
                  avatar: d.avatar,
                  content: d.content
                });
                setDistractions((prev) => prev.filter((item) => item.id !== d.id));
              }}
            >
              <style>{`
                @keyframes slideDown {
                  from { transform: translateY(-100%); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
                }
              `}</style>
              <HStack spacing={3} align="start">
                <Box position="relative" flexShrink={0}>
                  <Image src={d.avatar} w="40px" h="40px" rounded="full" objectFit="cover" border="2px solid" borderColor="red.500" />
                  <Box position="absolute" bottom="-2px" right="-2px" bg="red.600" color="white" rounded="full" px="3px" py="1px" fontSize="7px" fontWeight="bold">
                    ▶
                  </Box>
                </Box>
                <VStack align="start" spacing={0.5} flex={1}>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="10px" fontWeight="extrabold" color="red.400" letterSpacing="0.3px">
                      YouTube • {d.sender}
                    </Text>
                    <Text fontSize="8px" color="gray.400">방금 전</Text>
                  </HStack>
                  <Text fontSize="11px" fontWeight="black" noOfLines={1} color="white">
                    {d.sender} 채널 영상 업로드!
                  </Text>
                  <Text fontSize="10px" color="gray.300" noOfLines={1}>
                    {d.content}
                  </Text>
                </VStack>
                <Box
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setDistractions((prev) => prev.filter((item) => item.id !== d.id));
                  }}
                  color="gray.400"
                  _hover={{ color: "white" }}
                  p={1}
                >
                  <X size={14} />
                </Box>
              </HStack>
            </Box>
          );
        } else {
          return (
            <Box
              key={d.id}
              position="absolute"
              top={`${d.yOffset}px`}
              left="12px"
              right="12px"
              bg="gray.900"
              color="white"
              p={3}
              rounded="2xl"
              shadow="2xl"
              zIndex={200}
              border="1.5px solid"
              borderColor="gray.700"
              animation="popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              backdropFilter="blur(6px)"
              cursor="pointer"
              onClick={() => {
                setSavedPhase(phase);
                setActiveFullScreenDistraction({
                  type: "fromm",
                  sender: d.sender,
                  avatar: d.avatar,
                  content: d.content
                });
                setDistractions((prev) => prev.filter((item) => item.id !== d.id));
              }}
            >
              <style>{`
                @keyframes popIn {
                  from { transform: scale(0.7); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}</style>
              <HStack spacing={3} align="start">
                <Image src={d.avatar} w="36px" h="36px" rounded="full" objectFit="cover" border="2px solid" borderColor="gray.600" flexShrink={0} />
                <VStack align="start" spacing={0.5} flex={1}>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="10px" fontWeight="extrabold" color="gray.300" letterSpacing="0.3px">
                      fromm • {d.sender}
                    </Text>
                    <Text fontSize="8px" color="gray.500">1분 전</Text>
                  </HStack>
                  <Text fontSize="11px" fontWeight="black" color="white" lineHeight="1.3">
                    {d.content}
                  </Text>
                </VStack>
                <Box
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setDistractions((prev) => prev.filter((item) => item.id !== d.id));
                  }}
                  color="gray.500"
                  _hover={{ color: "white" }}
                  p={1}
                >
                  <X size={14} />
                </Box>
              </HStack>
            </Box>
          );
        }
      })}

      {/* Main header title bar */}
      {phase !== "seatSelect" && (
        <Box bg="#FF3838" color="white" py={3.5} px={4} borderBottom="2px solid" borderColor="red.650">
          <HStack justify="space-between">
            <Text fontSize="15px" fontWeight="black" letterSpacing="0.5px">
              엔피아링크 예매 [연습]
            </Text>
            <HStack spacing={3}>
              <Badge colorScheme={mode === "jaehyun" ? "purple" : mode === "nboom" ? "orange" : "teal"} variant="solid" px={2.5} py={0.5} rounded="md">
                {mode === "jaehyun" ? "대환장 모드" : mode === "nboom" ? "엔붐온 모드" : "일반 모드"}
              </Badge>
              <IconButton
                icon={<X size={20} />}
                aria-label="닫기"
                variant="ghost"
                color="white"
                _hover={{ bg: "red.600" }}
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem("ticketlink_sim_is_started");
                  sessionStorage.removeItem("ticketlink_sim_difficulty");
                  sessionStorage.removeItem("ticketlink_sim_delay");
                  sessionStorage.removeItem("ticketlink_sim_start_time");
                  sessionStorage.removeItem("ticketlink_sim_offset");
                  router.push("/ticketing/nfialink?showSettings=true");
                }}
              />
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Main Flow Content renders here */}
      <Box flex="1" display="flex" flexDirection="column" overflow={(phase === "success" || phase === "fail") ? "visible" : "hidden"} position="relative">
        {phase === "queue" && (
          <Box flex="1" display="flex" flexDirection="column" bg="white" justifyContent="center" p={6}>
            <VStack spacing={6} align="stretch" m="auto" maxW="380px" w="full" py={8}>
              {/* Connection waiting queue */}
              <VStack spacing={2} align="center" textAlign="center">
                <Box w="54px" h="54px" bg="red.50" color="#FF3838" rounded="full" display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <RefreshCw size={26} className="spin-animation" />
                </Box>
                <Heading fontSize="17px" fontWeight="950" color="gray.850">
                  서비스 접속 대기열 안내
                </Heading>
                <Text fontSize="13px" color="gray.500" maxW="280px" lineHeight="1.5">
                  접속 고객이 많아 대기 중입니다. 잠시만 기다려 주시면 자동으로 예매 페이지로 이동합니다.
                </Text>
              </VStack>

              <VStack spacing={3} bg="gray.50" p={5} rounded="2xl" border="1px solid" borderColor="gray.150" align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="13px" color="gray.500">현재 대기순번</Text>
                  <Text fontSize="15px" fontWeight="black" color="#FF3838">
                    {currentQueue.toLocaleString()}번째
                  </Text>
                </HStack>
                <Box h="10px" bg="gray.200" rounded="full" overflow="hidden" position="relative">
                  <Box
                    h="full"
                    bg="#FF3838"
                    transition="width 0.1s linear"
                    w={`${Math.max(0, Math.min(100, 100 - (currentQueue / initialQueueSize) * 100))}%`}
                  />
                </Box>
                <HStack justify="space-between" fontSize="12px" color="gray.400">
                  <Text>처음 접속순번: {initialQueueSize.toLocaleString()}</Text>
                  <Text>예상 대기시간: {Math.max(1, Math.ceil(currentQueue / 3500))}초</Text>
                </HStack>
              </VStack>

              <Button
                variant="outline"
                borderColor="gray.300"
                color="gray.600"
                h="48px"
                rounded="xl"
                fontSize="14px"
                fontWeight="bold"
                onClick={() => router.push("/ticketing/nfialink?showSettings=true")}
              >
                닫기
              </Button>
            </VStack>
          </Box>
        )}

        {phase === "dateSelect" && (
          <Box flex="1" bg="white" display="flex" flexDirection="column" p={4} overflowY="auto">
            <VStack spacing={5} align="stretch">
              <Heading fontSize="16px" fontWeight="bold" color="gray.800" borderLeft="3px solid" borderColor="#FF3838" pl={2}>
                날짜 및 시간 선택
              </Heading>

              {/* Date Select Calendar Layout */}
              <Box border="1px solid" borderColor="gray.200" rounded="2xl" p={4}>
                <Text fontSize="13px" fontWeight="extrabold" color="gray.500" mb={3}>
                  {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
                </Text>
                <Grid templateColumns="repeat(7, 1fr)" gap={2} textAlign="center">
                  {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
                    <Text key={w} fontSize="11px" fontWeight="bold" color="gray.400">{w}</Text>
                  ))}
                  {calendarDates.map((d, index) => {
                    const formatted = `${d.dateObj.getFullYear()}.${String(d.dateObj.getMonth() + 1).padStart(2, "0")}.${String(d.dateObj.getDate()).padStart(2, "0")}`;
                    const isSelected = selectedDate === formatted;
                    return (
                      <VStack
                        key={index}
                        spacing={0}
                        py={2}
                        rounded="xl"
                        cursor={d.isSelectable ? "pointer" : "not-allowed"}
                        bg={isSelected ? "#FF3838" : "transparent"}
                        border="1px solid"
                        borderColor={isSelected ? "#FF3838" : "transparent"}
                        _hover={d.isSelectable && !isSelected ? { bg: "red.50" } : {}}
                        onClick={() => {
                          if (d.isSelectable) {
                            setSelectedDate(formatted);
                            // Auto select first time slot
                            setSelectedTime("18:00");
                          }
                        }}
                      >
                        <Text fontSize="11px" color={isSelected ? "white" : d.isSelectable ? "gray.700" : "gray.300"} fontWeight="bold">
                          {d.dateNum}
                        </Text>
                        <Text fontSize="9px" color={isSelected ? "white" : d.dayStr === "일" ? "red.400" : d.dayStr === "토" ? "blue.400" : "gray.400"}>
                          {d.dayStr}
                        </Text>
                      </VStack>
                    );
                  })}
                </Grid>
              </Box>

              <Divider my={1} />

              <Box bg="gray.50" p={4} rounded="xl" border="1px solid" borderColor="gray.150">
                <VStack align="stretch" spacing={2} fontSize="13px">
                  <HStack justify="space-between">
                    <Text color="gray.400">선택 날짜</Text>
                    <Text fontWeight="bold" color="gray.800">{selectedDate || "선택하지 않음"}</Text>
                  </HStack>
                </VStack>
              </Box>

              <Button
                bg="#FF3838"
                color="white"
                _hover={{ bg: "#E02E2E" }}
                _active={{ bg: "#C22424" }}
                isDisabled={!selectedDate || !selectedTime}
                h="52px"
                rounded="xl"
                fontWeight="black"
                size="lg"
                onClick={handleDateSelectNext}
              >
                다음단계 (좌석 선택)
              </Button>
            </VStack>
          </Box>
        )}

        {phase === "seatSelect" && (
          <Box flex="1" display="flex" flexDirection="column" overflow="hidden" position="relative">
            {/* Top header for seat selection matching the screenshot */}
            <Box bg="white" borderBottom="1.5px solid" borderColor="gray.200">
              {/* Header row */}
              <HStack justify="space-between" align="center" px={4} py={3}>
                <IconButton
                  icon={<ArrowLeft size={20} />}
                  aria-label="뒤로가기"
                  variant="ghost"
                  color="gray.600"
                  size="sm"
                  onClick={() => setPhase("dateSelect")}
                />
                <HStack spacing={1.5} align="center">
                  <Text fontSize="16px" fontWeight="black" color="gray.850">
                    등급/좌석 선택
                  </Text>
                  <Badge colorScheme={mode === "jaehyun" ? "purple" : mode === "nboom" ? "orange" : "teal"} variant="solid" px={1.5} py={0.5} rounded="md" fontSize="9px">
                    {mode === "jaehyun" ? "대환장" : mode === "nboom" ? "엔붐온" : "일반"}
                  </Badge>
                </HStack>
                <IconButton
                  icon={<X size={20} />}
                  aria-label="닫기"
                  variant="ghost"
                  color="gray.600"
                  size="sm"
                  onClick={() => {
                    sessionStorage.removeItem("ticketlink_sim_is_started");
                    sessionStorage.removeItem("ticketlink_sim_difficulty");
                    sessionStorage.removeItem("ticketlink_sim_delay");
                    sessionStorage.removeItem("ticketlink_sim_start_time");
                    sessionStorage.removeItem("ticketlink_sim_offset");
                    router.push("/ticketing/nfialink?showSettings=true");
                  }}
                />
              </HStack>

              {/* 3-segment progress indicator line */}
              <HStack spacing={1.5} px={4} pb={2}>
                <Box h="2.5px" flex={1} bg="gray.800" rounded="full" />
                <Box h="2.5px" flex={1} bg="gray.200" rounded="full" />
                <Box h="2.5px" flex={1} bg="gray.200" rounded="full" />
              </HStack>

              {/* Concert details band */}
              <Box borderTop="1px solid" borderColor="gray.150" bg="white" px={4} py={2.5}>
                <VStack align="start" spacing={0.5}>
                  <Text fontSize="13px" fontWeight="black" color="gray.900" noOfLines={1}>
                    2026 N.Flying Concert '&CON' in Seoul
                  </Text>
                  <Text fontSize="11px" color="gray.500" fontWeight="bold">
                    N.Flying Hall | {selectedDate}{getDayOfWeekStr(selectedDate)} {selectedTime.split(" ")[0]}
                  </Text>
                </VStack>
              </Box>
            </Box>

            {/* Stadium viewport area with dark-grey background */}
            <Box
              flex="1"
              bg="#808080"
              overflow="hidden"
              display="flex"
              p={4}
              position="relative"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              cursor={isDraggingRef.current ? "grabbing" : "grab"}
              style={{ touchAction: "none" }}
            >
              {/* White rounded stadium container */}
              <Box
                m="auto"
                w="100%"
                maxW="360px"
                h="360px"
                bg="white"
                rounded="3xl"
                shadow="lg"
                position="relative"
                overflow="hidden"
                border="1.5px solid"
                borderColor="gray.300"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: "center",
                  transition: isDraggingRef.current ? "none" : "transform 0.1s ease-out",
                }}
              >
                {/* Floating Zoom Control Panel in the top-right */}
                <VStack
                  position="absolute"
                  top="12px"
                  right="12px"
                  spacing={1.5}
                  zIndex={10}
                >
                  {/* Zoom In Button */}
                  <Box
                    w="28px"
                    h="28px"
                    bg="#A0AEC0"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="md"
                    cursor="pointer"
                    opacity={0.8}
                    _hover={{ opacity: 1 }}
                    fontWeight="bold"
                    fontSize="16px"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScale((prev) => Math.min(4.0, prev + 0.3));
                    }}
                  >
                    +
                  </Box>

                  {/* Zoom Out Button */}
                  <Box
                    w="28px"
                    h="28px"
                    bg="#A0AEC0"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="md"
                    cursor="pointer"
                    opacity={0.8}
                    _hover={{ opacity: 1 }}
                    fontWeight="bold"
                    fontSize="16px"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScale((prev) => Math.max(0.5, prev - 0.3));
                    }}
                  >
                    -
                  </Box>

                  {/* Reset Zoom Button */}
                  <Box
                    w="28px"
                    h="28px"
                    bg="#A0AEC0"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="md"
                    cursor="pointer"
                    opacity={0.8}
                    _hover={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setScale(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </Box>
                </VStack>

                {/* Inner U-shape boundary line enclosing floor */}
                <Box
                  position="absolute"
                  top="15px"
                  left="75px"
                  w="210px"
                  h="215px"
                  border="1px solid"
                  borderColor="gray.200"
                  borderTop="none"
                  borderBottomRadius="105px"
                />

                {/* Custom CSS-drawn T-STAGE */}
                {/* Top horizontal bar */}
                <Box
                  position="absolute"
                  top="20px"
                  left="120px"
                  w="120px"
                  h="16px"
                  bg="#4A4A4A"
                  color="white"
                  fontSize="8px"
                  fontWeight="black"
                  textAlign="center"
                  lineHeight="16px"
                  borderRadius="2px"
                  letterSpacing="1px"
                >
                  STAGE
                </Box>
                {/* Protrusion (runway) removed */}

                {/* Floor Sections */}
                {/* 가 (Floor Top Left) */}
                <VStack
                  position="absolute"
                  top="40px"
                  left="120px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>가</Text>
                  <Grid templateColumns="repeat(12, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "가")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 나 (Floor Top Right) */}
                <VStack
                  position="absolute"
                  top="40px"
                  left="192px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>나</Text>
                  <Grid templateColumns="repeat(12, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "나")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 다 (Floor Mid Left) */}
                <VStack
                  position="absolute"
                  top="108px"
                  left="108px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>다</Text>
                  <Grid templateColumns="repeat(10, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "다")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 라 (Floor Mid Center) */}
                <VStack
                  position="absolute"
                  top="108px"
                  left="156px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>라</Text>
                  <Grid templateColumns="repeat(12, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "라")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 마 (Floor Mid Right) */}
                <VStack
                  position="absolute"
                  top="108px"
                  left="212px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>마</Text>
                  <Grid templateColumns="repeat(10, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "마")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* CONSOLE Block */}
                <Box
                  position="absolute"
                  top="164px"
                  left="152px"
                  w="56px"
                  h="12px"
                  bg="#CCCCCC"
                  color="#4A4A4A"
                  fontSize="7px"
                  fontWeight="black"
                  textAlign="center"
                  lineHeight="12px"
                  borderRadius="2px"
                  letterSpacing="0.5px"
                >
                  CONSOLE
                </Box>
                {/* OP Badge */}
                <Box
                  position="absolute"
                  top="182px"
                  left="174px"
                  w="12px"
                  h="12px"
                  bg="black"
                  color="white"
                  fontSize="6px"
                  fontWeight="black"
                  textAlign="center"
                  lineHeight="12px"
                  borderRadius="full"
                >
                  OP
                </Box>

                {/* 바 (Left Vertical Tier) */}
                <VStack
                  position="absolute"
                  top="60px"
                  left="35px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>바</Text>
                  <Grid templateColumns="repeat(4, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "바")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 아 (Right Vertical Tier) */}
                <VStack
                  position="absolute"
                  top="60px"
                  right="35px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>아</Text>
                  <Grid templateColumns="repeat(4, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "아")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* 사 (Bottom Center Tier) */}
                <VStack
                  position="absolute"
                  top="255px"
                  left="140px"
                  spacing={0.5}
                  align="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.500" lineHeight={1}>사</Text>
                  <Grid templateColumns="repeat(20, 1fr)" gap="0.5px">
                    {seats
                      .filter((s) => s.sectionName === "사")
                      .map((seat) => renderSeatBox(seat))}
                  </Grid>
                </VStack>

                {/* Decorative rotated tiers (D & F) to complete stadium look */}
                {/* D (Bottom-Left Rotated Tier) */}
                <VStack
                  position="absolute"
                  top="205px"
                  left="60px"
                  spacing={0.5}
                  align="center"
                  transform="rotate(35deg)"
                  transformOrigin="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.400" lineHeight={1}>D</Text>
                  <Grid templateColumns="repeat(12, 1fr)" gap="0.5px">
                    {Array.from({ length: 96 }).map((_, i) => (
                      <Box
                        key={`dec-D-${i}`}
                        w="3.5px"
                        h="3.5px"
                        bg="#F1F3F5"
                        border="0.3px solid"
                        borderColor="#E2E8F0"
                        borderRadius="0.5px"
                      />
                    ))}
                  </Grid>
                </VStack>

                {/* F (Bottom-Right Rotated Tier) */}
                <VStack
                  position="absolute"
                  top="205px"
                  right="60px"
                  spacing={0.5}
                  align="center"
                  transform="rotate(-35deg)"
                  transformOrigin="center"
                >
                  <Text fontSize="6px" fontWeight="black" color="gray.400" lineHeight={1}>F</Text>
                  <Grid templateColumns="repeat(12, 1fr)" gap="0.5px">
                    {Array.from({ length: 96 }).map((_, i) => (
                      <Box
                        key={`dec-F-${i}`}
                        w="3.5px"
                        h="3.5px"
                        bg="#F1F3F5"
                        border="0.3px solid"
                        borderColor="#E2E8F0"
                        borderRadius="0.5px"
                      />
                    ))}
                  </Grid>
                </VStack>

                {/* Stadium Tier Decorative Labels */}
                <Text position="absolute" left="22px" top="95px" fontSize="8px" fontWeight="black" color="gray.300">B</Text>
                <Text position="absolute" left="22px" top="135px" fontSize="8px" fontWeight="black" color="gray.300">C</Text>
                <Text position="absolute" right="22px" top="95px" fontSize="8px" fontWeight="black" color="gray.300">G</Text>
                <Text position="absolute" right="22px" top="135px" fontSize="8px" fontWeight="black" color="gray.300">H</Text>
                <Text position="absolute" left="136px" top="235px" fontSize="7px" fontWeight="black" color="gray.300">D</Text>
                <Text position="absolute" left="177px" top="246px" fontSize="7px" fontWeight="black" color="gray.300">E</Text>
                <Text position="absolute" right="136px" top="235px" fontSize="7px" fontWeight="black" color="gray.300">F</Text>
              </Box>
            </Box>

            {/* Bottom details board and action buttons */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              bg="white"
              borderTop="1px solid"
              borderColor="gray.200"
              shadow="2xl"
              zIndex={50}
              transform={(selectedSeatId || mode === "cancel") ? "translateY(0)" : "translateY(100%)"}
              transition="transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            >
              {/* Dynamic Selected Seat Overlay Info */}
              {selectedSeat && (
                <Box bg="orange.50" px={4} py={2.5} borderBottom="1px solid" borderColor="orange.100">
                  <HStack justify="space-between" fontSize="13px">
                    <Text fontWeight="black" color="orange.800">
                      선택 좌석: {selectedSeat.sectionName}구역 {selectedSeat.rowName}열 {selectedSeat.colIndex}번 ({selectedSeat.grade}석)
                    </Text>
                    <Text fontWeight="black" color="orange.800">
                      {selectedSeat.price.toLocaleString()}원
                    </Text>
                  </HStack>
                </Box>
              )}

              {/* Class/Grade Selections Bar */}
              <HStack bg="#F8F9FA" py={2.5} px={4} borderBottom="1px solid" borderColor="gray.150" justify="space-between" align="center">
                <HStack spacing={1}>
                  <Text fontSize="12px" fontWeight="extrabold" color="gray.700">등급 선택</Text>
                  <Text fontSize="9px" color="gray.500">▲</Text>
                </HStack>
                <HStack spacing={3}>
                  <Text fontSize="10px" color="gray.400">
                    잔여: VIP {seats.filter((s) => s.grade === "VIP" && s.status === "available").length} | S {seats.filter((s) => s.grade === "S" && s.status === "available").length} | A {seats.filter((s) => s.grade === "A" && s.status === "available").length}
                  </Text>
                </HStack>
              </HStack>

              {/* Action buttons matching screenshot */}
              <HStack spacing={3} p={4}>
                <Button
                  bg="#212529"
                  color="white"
                  _hover={{ bg: "black" }}
                  _active={{ bg: "black" }}
                  flex={4}
                  rounded="xl"
                  h="48px"
                  fontSize="15px"
                  fontWeight="black"
                  onClick={() => setPhase("dateSelect")}
                >
                  이전단계
                </Button>
                <Button
                  bg={selectedSeatId ? "#212529" : "#E2E8F0"}
                  color={selectedSeatId ? "white" : "gray.400"}
                  _hover={selectedSeatId ? { bg: "black" } : {}}
                  _active={selectedSeatId ? { bg: "black" } : {}}
                  flex={6}
                  rounded="xl"
                  h="48px"
                  fontSize="15px"
                  fontWeight="black"
                  isDisabled={!selectedSeatId}
                  onClick={handleSeatSelectNext}
                >
                  다음단계
                </Button>
                {mode === "cancel" && (
                  <Button
                    colorScheme="red"
                    bg="#FF3838"
                    _hover={{ bg: "#E02E2E" }}
                    flex={4}
                    rounded="xl"
                    h="48px"
                    fontSize="15px"
                    fontWeight="black"
                    leftIcon={<RefreshCw size={15} />}
                    onClick={handleCancelModeRefresh}
                  >
                    새로고침
                  </Button>
                )}
              </HStack>
            </Box>
          </Box>
        )}

        {phase === "success" && (
          <Box
            bgGradient={mode === "jaehyun" ? "linear(to-b, #FAF5FF, #FDF2F8)" : "linear(to-b, gray.50, gray.100)"}
            p={5}
            w="full"
            flex="1"
            display="flex"
            flexDirection="column"
          >
            <VStack spacing={5} align="stretch" pb={8}>
              {/* Receipt Wrapper to screenshot */}
              <Box
                ref={receiptRef}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                rounded="2xl"
                p={6}
                shadow="md"
                position="relative"
              >
                {/* Clean white/red header */}
                <VStack spacing={3} align="center" textAlign="center" pb={5} borderBottom="1px dashed" borderColor="gray.300">
                  <Box
                    w="56px"
                    h="56px"
                    bg={mode === "jaehyun" ? "purple.500" : "green.50"}
                    color={mode === "jaehyun" ? "white" : "green.500"}
                    rounded="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="24px"
                    mb={1}
                    shadow={mode === "jaehyun" ? "0 0 15px rgba(168, 85, 247, 0.4)" : "none"}
                  >
                    {mode === "jaehyun" ? "👑" : <CheckCircle2 size={30} />}
                  </Box>
                  <Text fontSize="11px" fontWeight="black" color="red.500" letterSpacing="1px">
                    NFIALINK RESERVATION SUCCESS
                  </Text>
                  <Heading fontSize="20px" fontWeight="black" color="gray.800">
                    티켓 예매 성공 확인서
                  </Heading>
                  <Text fontSize="11px" color="gray.400">
                    인도받으실 예매 번호를 꼭 확인해주세요.
                  </Text>
                  {mode === "jaehyun" && (
                    <HStack spacing={4} w="full" mt={3} justify="center">
                      <VStack spacing={0.5} bg="purple.50" px={4} py={2} rounded="xl" border="1px solid" borderColor="purple.150" shadow="sm" flex={1}>
                        <Text fontSize="9px" color="purple.500" fontWeight="black" letterSpacing="0.5px">소요 시간</Text>
                        <Text fontSize="16px" color="purple.800" fontWeight="black" fontFamily="monospace">{elapsedTime.toFixed(2)}초</Text>
                      </VStack>
                      <VStack spacing={0.5} bg="pink.50" px={4} py={2} rounded="xl" border="1px solid" borderColor="pink.150" shadow="sm" flex={1}>
                        <Text fontSize="9px" color="pink.500" fontWeight="black" letterSpacing="0.5px">최종 점수</Text>
                        <Text fontSize="16px" color="pink.800" fontWeight="black" fontFamily="monospace">{currentUserScore?.toLocaleString()}점</Text>
                      </VStack>
                    </HStack>
                  )}
                </VStack>

                {/* Receipt Fields */}
                <VStack spacing={4} align="stretch" py={5}>
                  <Grid templateColumns="100px 1fr" gap={2} fontSize="13px">
                    <Text color="gray.400">예매번호</Text>
                    <Text color="gray.800" fontWeight="bold" fontFamily="monospace">
                      NF20150520
                    </Text>

                    <Text color="gray.400">상품명</Text>
                    <Text color="gray.800" fontWeight="extrabold">
                      2026 N.Flying Concert '&CON' in Seoul
                    </Text>

                    <Text color="gray.400">관람일시</Text>
                    <Text color="gray.800" fontWeight="bold">
                      {selectedDate} {selectedTime.split(" ")[0]}
                    </Text>

                    <Text color="gray.400">관람장소</Text>
                    <Text color="gray.800">N.Flying Hall</Text>

                    <Text color="gray.400">선택좌석</Text>
                    <Text color="gray.900" fontWeight="black">
                      {selectedSeat ? `${selectedSeat.sectionName}구역 ${selectedSeat.rowName}열 ${selectedSeat.colIndex}번 (${selectedSeat.grade}석)` : "-"}
                    </Text>

                    <Text color="gray.400">소요시간</Text>
                    <Text color="red.500" fontWeight="bold">
                      {elapsedTime.toFixed(2)}초
                    </Text>

                    {mode === "jaehyun" && (
                      <>
                        <Text color="gray.400">최종점수</Text>
                        <Text color="purple.500" fontWeight="black">
                          {currentUserScore?.toLocaleString() || 0}점
                        </Text>
                      </>
                    )}

                    <Text color="gray.400">예매자</Text>
                    <Text color="gray.800">엔피아 (N.Fia)</Text>
                  </Grid>
                </VStack>

                <Box borderTop="1px solid" borderColor="gray.100" pt={4} textAlign="center">
                  <Text fontSize="11px" color="gray.400">
                    본 확인서는 엔피아링크 예매 시뮬레이터 연습 결과입니다.
                  </Text>
                </Box>

                {/* Polaroid Congratulatory Card inside receipt */}
                {randomMember && (
                  <Box
                    p={6}
                    bg={mode === "jaehyun" ? "purple.50" : mode === "nboom" ? "red.50" : "blue.50"}
                    borderTop="2px dashed"
                    borderColor={mode === "jaehyun" ? "purple.200" : mode === "nboom" ? "red.200" : "blue.200"}
                    mt={4}
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    position="relative"
                    overflow="hidden"
                  >
                    <style>{`
                      @keyframes bounceUp {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-6px); }
                      }
                    `}</style>
                    {/* Extra decorative sparkles for Jaehyun */}
                    {mode === "jaehyun" && (
                      <>
                        <Box position="absolute" top="10px" left="15px" fontSize="16px" style={{ animation: "bounceUp 1.5s ease-in-out infinite" }}>✨</Box>
                        <Box position="absolute" top="15px" right="20px" fontSize="16px" style={{ animation: "bounceUp 1.8s ease-in-out infinite" }}>💙</Box>
                        <Box position="absolute" bottom="15px" left="25px" fontSize="16px" style={{ animation: "bounceUp 2s ease-in-out infinite" }}>🥁</Box>
                        <Box position="absolute" bottom="10px" right="15px" fontSize="16px" style={{ animation: "bounceUp 1.6s ease-in-out infinite" }}>✨</Box>
                      </>
                    )}
                    <Box
                      bg="white"
                      p="12px"
                      pb="16px"
                      shadow="md"
                      borderRadius="4px"
                      style={{
                        boxShadow: mode === "jaehyun" ? "0 0 15px rgba(168, 85, 247, 0.5), 0 4px 10px rgba(0,0,0,0.15)" : undefined,
                        border: mode === "jaehyun" ? "3px solid #b794f4" : "1px solid #e2e8f0",
                        transform: mode === "jaehyun" ? "rotate(-2deg)" : "none",
                        transition: "transform 0.3s ease",
                      }}
                      _hover={mode === "jaehyun" ? { transform: "rotate(0deg) scale(1.05) !important" } : undefined}
                      maxW="180px"
                      w="full"
                      position="relative"
                    >
                      {/* Golden Crown badge for Jaehyun */}
                      {mode === "jaehyun" && (
                        <Box
                          position="absolute"
                          top="-20px"
                          left="50%"
                          transform="translateX(-50%)"
                          fontSize="22px"
                          zIndex={10}
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
                        >
                          👑
                        </Box>
                      )}
                      <Image
                        src={randomMember.avatar}
                        w="100%"
                        h="150px"
                        objectFit="cover"
                        border="1px solid"
                        borderColor={mode === "jaehyun" ? "purple.100" : "gray.200"}
                        borderRadius="2px"
                      />
                      <VStack spacing={0} mt={3} align="center">
                        <Text
                          fontSize="12px"
                          fontWeight="bold"
                          color={mode === "jaehyun" ? "purple.700" : "gray.700"}
                          fontFamily="monospace"
                        >
                          {randomMember.realName}
                        </Text>
                        {mode === "jaehyun" && (
                          <Text fontSize="8px" color="purple.500" fontWeight="extrabold" letterSpacing="1px" mt={0.5}>
                            ★ SUPER DRUMMER ★
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Distraction Backstory Card (Crazy) */}
              {mode === "jaehyun" && (
                <Box bg="purple.50" border="1px solid" borderColor="purple.200" p={5} rounded="2xl" shadow="sm">
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={2}>
                      <Text fontSize="18px">🥁</Text>
                      <Text fontSize="15px" fontWeight="bold" color="purple.800">
                        대환장 모드의 비하인드 스토리
                      </Text>
                    </HStack>
                    <Text fontSize="13px" color="gray.700" lineHeight="1.6">
                      이 모드는 엔피아들이 한창 티켓팅에 집중하고 있을 때, 재현이가 프롬을 보내서 본의 아니게 방해 공작(?)을 펼쳤던 실제 해프닝에서 영감을 받아 탄생한 모드예요!
                    </Text>
                    <Box
                      rounded="xl"
                      overflow="hidden"
                      border="1.5px solid"
                      borderColor="purple.200"
                      bg="white"
                      p={2.5}
                      alignSelf="center"
                      w="full"
                      maxW="300px"
                      shadow="sm"
                    >
                      <Image
                        src="/image/ticket/jaehyun-reason.svg"
                        alt="재현 프롬 톡 해프닝"
                        w="full"
                        objectFit="contain"
                      />
                    </Box>
                  </VStack>
                </Box>
              )}

              {/* 대환장모드 점수 및 리더보드 */}
              {mode === "jaehyun" && (
                <VStack spacing={4} w="full">
                  <Box
                    w="full"
                    bg="rgba(168, 85, 247, 0.08)"
                    border="2px solid"
                    borderColor="purple.300"
                    p={5}
                    rounded="2xl"
                    shadow="md"
                    textAlign="center"
                  >
                    <Text fontSize="12px" fontWeight="black" color="purple.600" letterSpacing="1px">
                      CRAZY MODE RESULT
                    </Text>
                    <Heading fontSize="28px" fontWeight="black" color="purple.800" mt={1}>
                      SCORE: {currentUserScore?.toLocaleString() || 0}
                    </Heading>
                    <Divider my={3} borderColor="purple.200" />
                    <Grid templateColumns="repeat(2, 1fr)" gap={2} fontSize="12px" fontWeight="bold">
                      <VStack spacing={0.5}>
                        <Text color="gray.500">반응 시간</Text>
                        <Text fontSize="14px" color="purple.700">{elapsedTime.toFixed(2)}초</Text>
                      </VStack>
                      <VStack spacing={0.5}>
                        <Text color="gray.500">닉네임</Text>
                        <Text fontSize="14px" color="purple.700">{currentUserName}</Text>
                      </VStack>
                    </Grid>
                  </Box>

                  <Leaderboard
                    ticketType="nfialink"
                    currentUserName={currentUserName}
                    currentUserScore={currentUserScore}
                    currentUserId={currentUserId}
                  />
                </VStack>
              )}

              {/* Control Buttons */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="red"
                  bg="#FF3838"
                  _hover={{ bg: "#E02E2E" }}
                  _active={{ bg: "#C22424" }}
                  rounded="xl"
                  fontWeight="black"
                  fontSize="16px"
                  onClick={handleRetrySimulation}
                  h="52px"
                  w="full"
                  shadow="sm"
                >
                  다시 도전하기
                </Button>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  borderColor="gray.300"
                  color="gray.700"
                  rounded="xl"
                  fontWeight="black"
                  fontSize="16px"
                  onClick={() => {
                    sessionStorage.removeItem("ticketlink_sim_is_started");
                    sessionStorage.removeItem("ticketlink_sim_difficulty");
                    sessionStorage.removeItem("ticketlink_sim_delay");
                    sessionStorage.removeItem("ticketlink_sim_start_time");
                    sessionStorage.removeItem("ticketlink_sim_offset");
                    router.push("/");
                  }}
                  h="52px"
                  w="full"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                >
                  홈으로 돌아가기
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}

        {phase === "fail" && (
          <Box bg="gray.100" p={5} w="full" flex="1" display="flex" flexDirection="column">
            <VStack spacing={5} align="stretch" pb={8}>
              <Box
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                rounded="2xl"
                p={6}
                shadow="md"
                position="relative"
              >
                {/* Red failure header */}
                <VStack spacing={2} align="center" textAlign="center" pb={5} borderBottom="1px dashed" borderColor="gray.300">
                  <Box bg="red.50" color="red.500" p={2} rounded="full" mb={1}>
                    <XCircle size={32} />
                  </Box>
                  <Text fontSize="13px" fontWeight="bold" color="red.500">
                    NFIALINK RESERVATION FAILED
                  </Text>
                  <Heading fontSize="20px" fontWeight="black" color="gray.800">
                    티켓 예매 실패
                  </Heading>
                  <Text fontSize="11px" color="gray.400">
                    선택 가능한 좌석이 모두 매진되었습니다.
                  </Text>
                </VStack>

                {/* Receipt Fields */}
                <VStack spacing={4} align="stretch" py={5}>
                  <Grid templateColumns="100px 1fr" gap={2} fontSize="13px">
                    <Text color="gray.400">상품명</Text>
                    <Text color="gray.800" fontWeight="extrabold">
                      2026 N.Flying Concert '&CON' in Seoul
                    </Text>

                    <Text color="gray.400">관람일시</Text>
                    <Text color="gray.800" fontWeight="bold">
                      {selectedDate || "-"} {selectedTime.split(" ")[0]}
                    </Text>

                    <Text color="gray.400">관람장소</Text>
                    <Text color="gray.800">N.Flying Hall</Text>

                    <Text color="gray.400">선택좌석</Text>
                    <Text color="red.500" fontWeight="black">
                      매진
                    </Text>

                    <Text color="gray.400">소요시간</Text>
                    <Text color="red.500" fontWeight="bold">
                      {elapsedTime.toFixed(2)}초
                    </Text>

                    <Text color="gray.400">예매자</Text>
                    <Text color="gray.800">엔피아 (N.Fia)</Text>
                  </Grid>
                </VStack>

                <Box borderTop="1px solid" borderColor="gray.100" pt={4} textAlign="center">
                  <Text fontSize="11px" color="gray.400">
                    본 확인서는 엔피아링크 예매 시뮬레이터 연습 결과입니다.
                  </Text>
                </Box>
              </Box>

              {/* Control Buttons */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="red"
                  bg="#FF3838"
                  _hover={{ bg: "#E02E2E" }}
                  _active={{ bg: "#C22424" }}
                  rounded="xl"
                  fontWeight="black"
                  fontSize="16px"
                  onClick={handleRetrySimulation}
                  h="52px"
                  w="full"
                  shadow="sm"
                >
                  다시 도전하기
                </Button>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  borderColor="gray.300"
                  color="gray.700"
                  rounded="xl"
                  fontWeight="black"
                  fontSize="16px"
                  onClick={() => {
                    sessionStorage.removeItem("ticketlink_sim_is_started");
                    sessionStorage.removeItem("ticketlink_sim_difficulty");
                    sessionStorage.removeItem("ticketlink_sim_delay");
                    sessionStorage.removeItem("ticketlink_sim_start_time");
                    sessionStorage.removeItem("ticketlink_sim_offset");
                    router.push("/");
                  }}
                  h="52px"
                  w="full"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                >
                  홈으로 돌아가기
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Local Coral/Pink Captcha Modal */}
      <Modal isOpen={showCaptchaModal && phase !== "fail" && phase !== "success"} onClose={() => { }} size="xs" isCentered closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(2px)" />
        <ModalContent rounded="2xl" border="1px solid" borderColor="red.100">
          <ModalHeader pb={0}>
            <HStack spacing={1.5} color="#FF3838">
              <ShieldCheck size={18} />
              <Text fontSize="14px" fontWeight="black">클린예매 서비스 단계</Text>
            </HStack>
          </ModalHeader>
          <ModalBody py={4}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="12px" color="gray.500" lineHeight="1.4">
                부정 예매 방지를 위해 보안문자를 입력해주세요.
              </Text>

              {/* Captcha draw canvas */}
              <Box
                border="1px solid"
                borderColor="red.150"
                rounded="xl"
                overflow="hidden"
                bg="white"
                position="relative"
                h="100px"
              >
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={100}
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
                {/* Refresh Captcha Trigger */}
                <IconButton
                  icon={<RefreshCw size={14} />}
                  aria-label="보안문자 새로고침"
                  size="xs"
                  colorScheme="gray"
                  rounded="full"
                  position="absolute"
                  right={2}
                  top={2}
                  onClick={handleRefreshCaptcha}
                />
              </Box>

              <form onSubmit={handleCaptchaSubmit}>
                <VStack spacing={3}>
                  <Input
                    placeholder="문자 입력 (대소문자 구분 없음)"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    size="md"
                    rounded="xl"
                    textAlign="center"
                    fontSize="16px"
                    fontWeight="bold"
                    letterSpacing="1px"
                    autoFocus
                    border="2px solid"
                    borderColor="red.200"
                    _focus={{ borderColor: "#FF3838", boxShadow: "none" }}
                  />

                  {captchaError && (
                    <Alert status="error" size="sm" py={1.5} px={3} rounded="xl" fontSize="12px">
                      <AlertIcon />
                      {captchaError}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    bg="#FF3838"
                    color="white"
                    _hover={{ bg: "#E02E2E" }}
                    w="full"
                    h="44px"
                    fontWeight="bold"
                    rounded="xl"
                  >
                    입력 완료
                  </Button>
                </VStack>
              </form>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Robot Member CAPTCHA Modal */}
      <Modal isOpen={showRobotCaptchaModal && phase !== "fail" && phase !== "success"} onClose={() => { }} size="xs" isCentered closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(2px)" />
        <ModalContent rounded="2xl" border="1px solid" borderColor="red.100" overflow="hidden">
          <ModalBody p={0}>
            <NfiaAuthScreen
              isRobotCheck={true}
              onSuccess={() => {
                setShowRobotCaptchaModal(false);
                toast({
                  title: "인증되었습니다.",
                  status: "success",
                  duration: 1200,
                  position: "top",
                });
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* CAPTCHA Overlay */}
      {showPuzzleOverlay && phase !== "fail" && phase !== "success" && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.65)"
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          backdropFilter="blur(4px)"
        >
          <Box bg="white" rounded="2xl" shadow="2xl" maxW="380px" w="full" overflow="hidden">
            {mode === "jaehyun" && activePuzzleType === "nfia" ? (
              <NfiaAuthScreen onSuccess={handlePuzzleOverlaySuccess} />
            ) : (
              <PuzzleScreen onSuccess={handlePuzzleOverlaySuccess} />
            )}
          </Box>
        </Box>
      )}

      {/* Full-screen Fromm/YouTube distraction overlay */}
      {activeFullScreenDistraction && phase !== "fail" && phase !== "success" && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.75)"
          zIndex={10000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          backdropFilter="blur(8px)"
        >
          {activeFullScreenDistraction.type === "youtube" ? (
            <VStack
              bg="black"
              color="white"
              w="full"
              maxW="360px"
              h="500px"
              maxH="85vh"
              rounded="2xl"
              overflow="hidden"
              border="1px solid"
              borderColor="gray.850"
              spacing={0}
              shadow="2xl"
            >
              {/* YouTube Header */}
              <Box bg="gray.900" w="full" px={4} py={3} borderBottom="1px solid" borderColor="gray.800">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Box bg="red.600" color="white" rounded="md" px={1.5} py={0.5} fontSize="10px" fontWeight="bold">
                      YouTube
                    </Box>
                    <Text fontSize="12px" fontWeight="bold" color="gray.300">
                      LIVE
                    </Text>
                  </HStack>
                  <Badge colorScheme="red" variant="solid" fontSize="10px">
                    LIVE
                  </Badge>
                </HStack>
              </Box>

              {/* Video Area */}
              <Box bg="gray.950" w="full" flex={1} position="relative" display="flex" alignItems="center" justifyContent="center">
                <Image
                  src={activeFullScreenDistraction.avatar}
                  w="140px"
                  h="140px"
                  rounded="full"
                  objectFit="cover"
                  border="4px solid"
                  borderColor="red.500"
                  animation="pulse 2s infinite"
                />
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.9; }
                  }
                `}</style>

                <VStack
                  position="absolute"
                  bottom={3}
                  left={3}
                  right={3}
                  align="start"
                  bg="rgba(0, 0, 0, 0.6)"
                  p={3}
                  rounded="lg"
                  spacing={1}
                >
                  <Text fontSize="11px" fontWeight="bold" color="red.400">
                    {activeFullScreenDistraction.sender}
                  </Text>
                  <Text fontSize="12px" fontWeight="bold" color="white" noOfLines={2}>
                    {activeFullScreenDistraction.content}
                  </Text>
                </VStack>
              </Box>

              {/* Live Chat Area */}
              <VStack bg="gray.900" w="full" h="150px" p={3} align="stretch" spacing={2} borderTop="1px solid" borderColor="gray.800" overflowY="auto">
                <Text fontSize="10px" fontWeight="bold" color="gray.500" mb={1}>
                  실시간 채팅
                </Text>
                <VStack align="stretch" spacing={1.5} fontSize="11px" overflow="hidden">
                  <HStack spacing={1}>
                    <Text color="yellow.400" fontWeight="bold">감자엔피아:</Text>
                    <Text color="gray.200">알림 뜨자마자 뛰어옴</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="purple.300" fontWeight="bold">평피아:</Text>
                    <Text color="gray.200">티켓팅하다가 들어왔어요ㅋㅋㅋ</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="green.300" fontWeight="bold">뭘쳐다봐임마:</Text>
                    <Text color="gray.200">잠깐만 보고 나갈게</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="pink.300" fontWeight="bold">포기하지마:</Text>
                    <Text color="gray.200">지금 우리 예매 중인데ㅠㅠ</Text>
                  </HStack>
                </VStack>
              </VStack>

              {/* Close Button Panel */}
              <Box bg="gray.950" w="full" p={4} borderTop="1px solid" borderColor="gray.800">
                <Button
                  colorScheme="red"
                  w="full"
                  onClick={() => {
                    setActiveFullScreenDistraction(null);
                    setSavedPhase(null);
                  }}
                  fontWeight="bold"
                  size="lg"
                  rounded="xl"
                >
                  유튜브 닫고 티켓팅으로 돌아가기
                </Button>
              </Box>
            </VStack>
          ) : (
            <VStack
              bg="black"
              color="white"
              w="full"
              maxW="360px"
              h="500px"
              maxH="85vh"
              rounded="2xl"
              overflow="hidden"
              border="1.5px solid"
              borderColor="gray.800"
              spacing={0}
              shadow="2xl"
            >
              {/* Fromm Header */}
              <Box bg="black" w="full" px={4} py={3} borderBottom="1px solid" borderColor="gray.800">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <IconButton
                      icon={<ArrowLeft size={18} />}
                      aria-label="돌아가기"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: "white", bg: "gray.800" }}
                      _active={{ bg: "gray.700" }}
                      rounded="full"
                      size="sm"
                      onClick={() => {
                        setActiveFullScreenDistraction(null);
                        setSavedPhase(null);
                      }}
                    />
                    <Image src={activeFullScreenDistraction.avatar} w="32px" h="32px" rounded="full" objectFit="cover" border="1.5px solid" borderColor="gray.700" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="13px" fontWeight="black" color="white">
                        {activeFullScreenDistraction.sender}
                      </Text>
                      <Text fontSize="9px" color="gray.400">
                        활동 중 • fromm
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="gray" variant="subtle" fontSize="9px" px={2} py={0.5} rounded="md">
                    1:1 Chat
                  </Badge>
                </HStack>
              </Box>

              {/* Fromm Chat Log */}
              <VStack w="full" flex={1} p={4} align="stretch" spacing={3} overflowY="auto" justifyContent="end">
                <HStack align="start" spacing={2}>
                  <Image src={activeFullScreenDistraction.avatar} w="28px" h="28px" rounded="full" objectFit="cover" />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="9px" color="gray.400">
                      {activeFullScreenDistraction.sender}
                    </Text>
                    <Box bg="gray.800" color="white" py={2} px={3} rounded="xl" roundedTopLeft="none" fontSize="12px" maxW="240px">
                      {activeFullScreenDistraction.content}
                    </Box>
                  </VStack>
                </HStack>

                <HStack align="start" spacing={2} justify="flex-end" mt={2}>
                  <Box bg="gray.600" color="white" py={2} px={3} rounded="xl" roundedBottomRight="none" fontSize="12px" maxW="240px">
                    나 지금 티켓팅 중이야!! 진짜 떨려 ㅠㅠ
                  </Box>
                </HStack>

                <HStack align="start" spacing={2} mt={2}>
                  <Image src={activeFullScreenDistraction.avatar} w="28px" h="28px" rounded="full" objectFit="cover" />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="9px" color="gray.400">
                      {activeFullScreenDistraction.sender}
                    </Text>
                    <Box bg="gray.800" color="white" py={2} px={3} rounded="xl" roundedTopLeft="none" fontSize="12px" maxW="240px">
                      {getYoutubeReplyMessage(activeFullScreenDistraction.sender)}
                    </Box>
                  </VStack>
                </HStack>
              </VStack>

              {/* Chat Input Simulation */}
              <Box bg="gray.900" w="full" px={4} py={3.5} borderTop="1px solid" borderColor="gray.700">
                <HStack spacing={2} bg="rgba(255,255,255,0.08)" px={3} py={2} rounded="full">
                  <Text fontSize="11px" color="gray.500" flex={1}>
                    메시지를 입력하세요...
                  </Text>
                  <Box bg="gray.600" w="24px" h="24px" rounded="full" display="flex" alignItems="center" justifyContent="center" fontSize="11px">
                    ➔
                  </Box>
                </HStack>
              </Box>

              {/* Exit Button Panel */}
              <Box bg="gray.900" w="full" p={4} borderTop="1px solid" borderColor="gray.700">
                <Button
                  colorScheme="gray"
                  bg="white"
                  color="black"
                  _hover={{ bg: "gray.100" }}
                  _active={{ bg: "gray.200" }}
                  w="full"
                  onClick={() => {
                    setActiveFullScreenDistraction(null);
                    setSavedPhase(null);
                  }}
                  fontWeight="bold"
                  size="lg"
                  rounded="xl"
                >
                  프롬 닫고 티켓팅으로 돌아가기
                </Button>
              </Box>
            </VStack>
          )}
        </Box>
      )}

      {/* Styled Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default TicketlinkBooking;
