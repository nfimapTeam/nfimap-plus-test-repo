import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import * as htmlToImage from "html-to-image";

import PuzzleScreen from "../Interpark/components/PuzzleScreen";

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
}

const TicketlinkBooking = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mode = (searchParams.get("mode") as "normal" | "nboom" | "jaehyun") || "normal";
  const delayParam = searchParams.get("delay");
  const delayMs = delayParam ? parseInt(delayParam, 10) : 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const countdownDelayParam = searchParams.get("countdownDelay");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const countdownDelay = countdownDelayParam ? parseInt(countdownDelayParam, 10) : 5;

  // Booking flow phases
  const [phase, setPhase] = useState<BookingPhase>("queue");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showCaptchaModal, setShowCaptchaModal] = useState<boolean>(false);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  // Time & Stats tracking
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [yiseonjwaCount, setYiseonjwaCount] = useState<number>(0);

  // Seat layout grid state
  const [seats, setSeats] = useState<TicketlinkSeatData[]>([]);

  // Queue state
  const [currentQueue, setCurrentQueue] = useState<number>(0);
  const [initialQueueSize, setInitialQueueSize] = useState<number>(0);

  // Distractions list (Crazy Mode)
  const [distractions, setDistractions] = useState<DistractionEvent[]>([]);
  const [showPuzzleOverlay, setShowPuzzleOverlay] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
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
    const isStarted = sessionStorage.getItem("ticketlinkStarted");
    if (!isStarted) {
      navigate("/ticketing/ticketlink");
    } else {
      // Clear after a brief delay to allow React Strict Mode double-mount in dev to pass
      setTimeout(() => {
        sessionStorage.removeItem("ticketlinkStarted");
      }, 100);
    }
  }, [navigate]);

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

  // Process connection queue if delay exists
  useEffect(() => {
    const delaySec = Math.max(0, delayMs / 1000);
    let qSize = 0;
    if (delaySec >= 0.25) {
      const base = Math.min(4, delaySec);
      qSize = Math.floor(Math.pow(base, 2) * 2200 + Math.random() * 1000);
      if (qSize > 35000) {
        qSize = 35000 + Math.floor(Math.random() * 1000);
      }
    }

    if (qSize <= 0) {
      setPhase("dateSelect");
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
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [delayMs]);

  // Generate initial seat state
  const initializeSeats = useCallback(() => {
    const delaySec = Math.max(0, delayMs / 1000);
    const isNboom = mode === "nboom";
    const isJaehyun = mode === "jaehyun";

    // Occupancy baseline based on delay
    let baseOccupancyPercent = 0;
    if (isNboom) {
      baseOccupancyPercent = 0.48 + delaySec * 0.29;
    } else if (isJaehyun) {
      baseOccupancyPercent = 0.42 + delaySec * 0.24;
    } else {
      baseOccupancyPercent = 0.38 + delaySec * 0.22;
    }
    baseOccupancyPercent = Math.min(1.0, Math.max(0.0, baseOccupancyPercent));

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
      rowNames.slice(0, sec.rows).forEach((row, rIdx) => {
        const rowWeight = sec.rows - rIdx;
        let occupancyProb = baseOccupancyPercent * (rowWeight / sec.rows) * 1.5;

        // Front rows in Floor vanish quickly if delayed
        if ((isNboom || isJaehyun) && sec.grade === "VIP" && delaySec > 0.8 && rIdx < 3) {
          occupancyProb = 0.98;
        }

        const maxProb = (isNboom && delaySec > 1.5) ? 0.99 : 0.97;
        const finalProb = Math.min(maxProb, Math.max(0.0, occupancyProb));

        for (let col = 1; col <= sec.cols; col++) {
          const status = Math.random() < finalProb ? "occupied" : "available";
          generatedSeats.push({
            id: `TL-${sec.name}-${row}-${col}`,
            sectionName: sec.name,
            rowName: row,
            colIndex: col,
            status,
            grade: sec.grade,
            price: sec.price,
          });
        }
      });
    });

    setSeats(generatedSeats);
  }, [mode, delayMs]);

  // Handle seat layout depletion loop
  useEffect(() => {
    if (phase !== "seatSelect" || showCaptchaModal) return;

    const isNboom = mode === "nboom";
    const isJaehyun = mode === "jaehyun";
    const tickTime = isNboom ? 200 : isJaehyun ? 400 : 500;

    let intervalId: NodeJS.Timeout | null = null;

    // Ticketlink seat depletion must start 1.5s after seat mapping loads
    const delayTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        setSeats((prevSeats) => {
          const availableSeats = prevSeats.filter((s) => s.status === "available");
          if (availableSeats.length === 0) return prevSeats;

          // Pick seat depletion size based on difficulty
          let baseNum = 0;
          if (isNboom) {
            baseNum = Math.floor(Math.random() * 6) + 12; // 12 to 17 seats
          } else if (isJaehyun) {
            const delaySec = Math.max(0, delayMs / 1000);
            const baseOccupancyPercent = Math.min(1.0, Math.max(0.0, 0.42 + delaySec * 0.24));
            const approxInitialAvailable = 1072 * (1 - baseOccupancyPercent);
            const ticksIn60s = 60000 / tickTime; // 150 ticks
            baseNum = Math.max(1, Math.round(approxInitialAvailable / ticksIn60s));
          } else {
            baseNum = Math.floor(Math.random() * 4) + 3;  // 3 to 6 seats
          }

          const updatedSeats = [...prevSeats];
          const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"];

          // Sort available seats so front rows / floor seats sell out first (gradually top-to-bottom)
          const sortedAvailable = [...availableSeats].sort((a, b) => {
            const aIdx = rowNamesList.indexOf(a.rowName);
            const bIdx = rowNamesList.indexOf(b.rowName);

            const aGradeBonus = a.grade === "VIP" ? 200 : a.grade === "S" ? 100 : 0;
            const bGradeBonus = b.grade === "VIP" ? 200 : b.grade === "S" ? 100 : 0;

            const aRowScore = (24 - aIdx) * 10;
            const bRowScore = (24 - bIdx) * 10;

            let aSecBonus = 0;
            if (a.sectionName === "가" || a.sectionName === "나") {
              aSecBonus = 150;
            } else if (a.sectionName === "다" || a.sectionName === "라" || a.sectionName === "마") {
              aSecBonus = 70;
            }

            let bSecBonus = 0;
            if (b.sectionName === "가" || b.sectionName === "나") {
              bSecBonus = 150;
            } else if (b.sectionName === "다" || b.sectionName === "라" || b.sectionName === "마") {
              bSecBonus = 70;
            }

            // Combine with minor random jitter so it doesn't look perfectly robotic
            const aScore = aGradeBonus + aSecBonus + aRowScore + Math.random() * 25;
            const bScore = bGradeBonus + bSecBonus + bRowScore + Math.random() * 25;

            return bScore - aScore;
          });

          const countToDeplete = Math.min(baseNum, sortedAvailable.length);
          for (let i = 0; i < countToDeplete; i++) {
            const seatToTake = sortedAvailable[i];
            const idx = updatedSeats.findIndex((s) => s.id === seatToTake.id);
            if (idx !== -1) {
              updatedSeats[idx] = { ...updatedSeats[idx], status: "occupied" };
            }
          }

          // Random selected seat hijack (이선좌) chance
          const hijackChance = isJaehyun ? 0.16 : isNboom ? 0.12 : 0.05;
          if (Math.random() < hijackChance) {
            const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
            if (selectedIdx !== -1) {
              updatedSeats[selectedIdx] = { ...updatedSeats[selectedIdx], status: "occupied" };
            }
          }

          return updatedSeats;
        });
      }, tickTime);
    }, 1500); // 1.5 seconds delay before start

    return () => {
      clearTimeout(delayTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [phase, showCaptchaModal, mode, delayMs]);

  // Failure detection (all seats sold out and no seat selected)
  useEffect(() => {
    if (phase === "seatSelect" && !showCaptchaModal) {
      const availableCount = seats.filter((s) => s.status === "available").length;
      if (availableCount === 0 && !selectedSeatId) {
        const endTime = performance.now();
        setElapsedTime((endTime - startTime) / 1000);
        setPhase("fail");
      }
    }
  }, [seats, phase, selectedSeatId, showCaptchaModal, startTime]);

  // Distraction event spawner (Crazy Mode)
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
        const channels = [
          { name: "승협이", avatar: "/image/member/seunghyub.webp", content: "승협이의 깜짝 라이브 🎙️ - [LIVE] 엔피아 다들 모여라!" },
          { name: "하루의 마무리", avatar: "/image/member/hewseung.webp", content: "오늘 하루도 수고했어.. 위로가 되는 노래 한 소절 🎵" },
          { name: "두얼간이", avatar: "/image/member/jaehyun.webp", content: "훈이 재현이의 본격 먹방 투어! 맛집 대공개!! 🍗" }
        ];
        const selected = channels[Math.floor(Math.random() * channels.length)];
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
        const members = [
          {
            name: "김재현 🥁",
            avatar: "/image/member/jaehyun.webp",
            messages: [
              "엔피아 뭐해?",
              "티켓팅중이구나 ㅎㅎ",
              "나랑 놀자아아~",
              "자리 좋은 데 잡아야해!! 🥁",
              "두구두구두구... 과연 결과는?!",
              "심심하다.. 나랑 수다 떨 사람 🙋",
              "이번 콘서트 진짜 재밌을거야 ㅋㅋㅋ",
              "올리브영 최고!"
            ]
          },
          {
            name: "서동성 🎸",
            avatar: "/image/member/dongsung.webp",
            messages: [
              "행복한 주말 보내!",
              "월요일 화이팅!!!",
              "엔피아~",
            ]
          },
          {
            name: "먐미 🐱",
            avatar: "/image/member/chahun.webp",
            messages: [
              "오늘 날씨 좋네 ☀️",
              "로망이 사진 🐱",
              "🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕",
            ]
          },
          {
            name: "이승협 🦁",
            avatar: "/image/member/seunghyub.webp",
            messages: [
              "엔피아 밥 먹었어요? 🍚",
              "오늘도 고마워요 💙",
              "옥탑방 같이 들어요 🎵",
              "티켓팅 화이팅!",
            ]
          },
          {
            name: "유회승 🎤",
            avatar: "/image/member/hewseung.webp",
            messages: [
              "오늘 노래 연습 완료! 🎤",
              "엔피아 보고 싶다아아아",
              "감기 조심해요!! 🤧",
              "1열 와서 내 목소리 직접 들어줘!",
            ]
          }
        ];
        const selectedMember = members[Math.floor(Math.random() * members.length)];
        const msg = selectedMember.messages[Math.floor(Math.random() * selectedMember.messages.length)];
        const y = Math.floor(Math.random() * 200) + 120;
        const x = Math.floor(Math.random() * 40) + 20;
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

      setDistractions((prev) => [...prev, newEvent]);

      if (newEvent.type === "youtube") {
        setTimeout(() => {
          setDistractions((prev) => prev.filter((d) => d.id !== id));
        }, 4500);
      }
    };

    const triggerNext = () => {
      // 80% frequency adjustment
      const nextDelay = (Math.random() * 1200 + 800) * 1.25;
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
    initializeSeats();
    setPhase("seatSelect");
    setShowCaptchaModal(true);

    const captchaVal = generateCaptchaText();
    setCaptchaText(captchaVal);
    setTimeout(() => {
      drawCaptcha(captchaVal);
    }, 120);

    setStartTime(performance.now());
  };

  const handleCaptchaSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (captchaInput.toUpperCase() === captchaText) {
      setShowCaptchaModal(false);
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

    const blockListened = distractions.some((d) => d.type === "fromm");
    if (blockListened) {
      toast({
        title: "화면에 표시된 프롬(fromm) 메시지를 먼저 닫아주세요!",
        status: "warning",
        duration: 1500,
        position: "top",
      });
      return;
    }

    if (seat.status === "occupied") return;

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
    setYiseonjwaCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowPuzzleOverlay(true);
        return 0;
      }
      return next;
    });
  };

  const handlePuzzleOverlaySuccess = () => {
    setShowPuzzleOverlay(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
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

    const action = () => {
      // Double check if seat became occupied
      const seat = seats.find((s) => s.id === selectedSeatId);
      const isNboom = mode === "nboom";
      const isJaehyun = mode === "jaehyun";

      // Bot hijack seat (이선좌) check on submission
      const hijackChance = isJaehyun ? 0.75 : isNboom ? 0.28 : 0.08;
      let isHijacked = false;
      if (Math.random() < hijackChance) {
        isHijacked = true;
      }

      if (!seat || seat.status === "occupied" || isHijacked) {
        // Change seat to occupied
        setSeats((prev) =>
          prev.map((s) => (s.id === selectedSeatId ? { ...s, status: "occupied" } : s))
        );
        toast({
          title: "이미 선택된 좌석입니다. (이선좌)",
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
      setElapsedTime((endTime - startTime) / 1000);
      setPhase("success");
    };

    if (mode === "jaehyun" && Math.random() < 0.6) {
      setPendingAction(() => action);
      setShowPuzzleOverlay(true);
    } else {
      action();
    }
  };

  const handleSaveReceiptImage = () => {
    if (!receiptRef.current) return;
    htmlToImage
      .toPng(receiptRef.current, { cacheBust: true, backgroundColor: "#ffffff" })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `ticketlink-receipt-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "이미지가 성공적으로 저장되었습니다!",
          description: "다운로드 폴더를 확인해보세요.",
          status: "success",
          duration: 2500,
          position: "top",
        });
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "이미지 저장에 실패했습니다.",
          status: "error",
          duration: 2500,
          position: "top",
        });
      });
  };

  const handleRetrySimulation = () => {
    navigate(`/ticketing/ticketlink`);
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
      setSelectedTime("18:00 (1회차)");
    }
  }, []);

  return (
    <Box
      position="relative"
      zIndex={100}
      h="100svh"
      maxH="100svh"
      overflow="hidden"
      bg="gray.50"
      display="flex"
      flexDirection="column"
      maxW="480px"
      w="full"
      mx="auto"
    >
      {/* Distraction overlays (Crazy Mode) */}
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
              left={`${d.xOffset}px`}
              right={`${d.xOffset}px`}
              bg="purple.850"
              bgGradient="linear(to-br, purple.700, indigo.800)"
              color="white"
              p={3}
              rounded="2xl"
              shadow="2xl"
              zIndex={200}
              border="1.5px solid"
              borderColor="purple.400"
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
                <Image src={d.avatar} w="36px" h="36px" rounded="full" objectFit="cover" border="2px solid" borderColor="purple.300" flexShrink={0} />
                <VStack align="start" spacing={0.5} flex={1}>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="10px" fontWeight="extrabold" color="purple.200" letterSpacing="0.3px">
                      fromm • {d.sender}
                    </Text>
                    <Text fontSize="8px" color="purple.300">1분 전</Text>
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
                  color="purple.300"
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
              티켓링크 예매 [연습]
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
                onClick={() => navigate("/ticketing/ticketlink")}
              />
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Main Flow Content renders here */}
      <Box flex="1" display="flex" flexDirection="column" overflow="hidden" position="relative">
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
                onClick={() => navigate("/ticketing/ticketlink")}
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
                            setSelectedTime("18:00 (1회차)");
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
                  onClick={() => navigate("/ticketing/ticketlink")}
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
                    2026 N.Flying Concert '&con' in Seoul
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
                {/* Mini map thumbnail in the top-left */}
                <Box
                  position="absolute"
                  top="12px"
                  left="12px"
                  w="65px"
                  h="65px"
                  bg="#E2E8F0"
                  border="1.5px solid"
                  borderColor="gray.400"
                  borderRadius="lg"
                  overflow="hidden"
                  zIndex={10}
                >
                  <Box position="absolute" left="5px" top="0" bottom="0" w="1px" bg="red.500" />
                  <Box position="absolute" right="5px" top="0" bottom="0" w="1px" bg="red.500" />
                  {/* Miniature stadium shapes */}
                  <Box
                    position="absolute"
                    top="15px"
                    left="18px"
                    w="26px"
                    h="26px"
                    border="1px solid"
                    borderColor="gray.400"
                    borderBottomRadius="13px"
                  />
                  {/* Mini stage */}
                  <Box position="absolute" top="10px" left="22px" w="18px" h="4px" bg="gray.600" />
                  <Box position="absolute" top="14px" left="30px" w="2px" h="10px" bg="gray.600" />
                </Box>

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
                  top="30px"
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
                  top="44px"
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
                  top="44px"
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
              transform={selectedSeatId ? "translateY(0)" : "translateY(100%)"}
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
              </HStack>
            </Box>
          </Box>
        )}

        {phase === "success" && (
          <Box flex="1" bg="gray.100" p={5} overflowY="auto">
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
                <VStack spacing={2} align="center" textAlign="center" pb={5} borderBottom="1px dashed" borderColor="gray.300">
                  <Box bg="green.50" color="green.500" p={2} rounded="full" mb={1}>
                    <CheckCircle2 size={32} />
                  </Box>
                  <Text fontSize="13px" fontWeight="bold" color="red.500">
                    TICKETLINK RESERVATION SUCCESS
                  </Text>
                  <Heading fontSize="20px" fontWeight="black" color="gray.800">
                    티켓 예매 성공 확인서
                  </Heading>
                  <Text fontSize="11px" color="gray.400">
                    인도받으실 예매 번호를 꼭 확인해주세요.
                  </Text>
                </VStack>

                {/* Receipt Fields */}
                <VStack spacing={4} align="stretch" py={5}>
                  <Grid templateColumns="100px 1fr" gap={2} fontSize="13px">
                    <Text color="gray.400">예매번호</Text>
                    <Text color="gray.800" fontWeight="bold" fontFamily="monospace">
                      TL{Math.floor(Date.now() / 1000)}08
                    </Text>

                    <Text color="gray.400">상품명</Text>
                    <Text color="gray.800" fontWeight="extrabold">
                      2026 N.Flying Concert '&con' in Seoul
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

                    <Text color="gray.400">예매자</Text>
                    <Text color="gray.800">엔피아 (N.Fia)</Text>
                  </Grid>
                </VStack>

                <Box borderTop="1px solid" borderColor="gray.100" pt={4} textAlign="center">
                  <Text fontSize="11px" color="gray.400">
                    본 확인서는 티켓링크 예매 시뮬레이터 연습 결과입니다.
                  </Text>
                </Box>
              </Box>

              {/* Distraction Backstory Card (Crazy Mode) */}
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
                      이 모드는 사실... 엔피아들이 한참 티켓팅에 집중하고 있을 때, 재현이가 프롬으로 채팅을 보내서 본의 아니게 방해 공작(?)을 펼쳤던 귀여운 실제 해프닝에서 영감을 받아 탄생한 모드예요!
                      <br /><br />
                      당시 재현이가 팬들과 수다 떨며 보낸 톡 메시지들이 바로 이 대환장 모드의 시초랍니다. 🤣
                      그 험난한 알림 폭탄과 방해 요소를 다 이겨내고 끝내 예매에 성공하시다니 정말 대단해요! 진정한 금손 엔피아로 인정합니다! 🥳🎉
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

              {/* Save image Button */}
              <Button
                colorScheme="red"
                bg="#FF3838"
                _hover={{ bg: "#E02E2E" }}
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                }
                rounded="xl"
                fontWeight="black"
                fontSize="14px"
                onClick={handleSaveReceiptImage}
                shadow="sm"
                h="48px"
                w="full"
              >
                예매 성공 확인서 이미지 저장하기
              </Button>

              {/* Control Buttons */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="gray"
                  variant="outline"
                  borderColor="gray.300"
                  color="gray.700"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="14px"
                  onClick={handleRetrySimulation}
                  h="48px"
                  w="full"
                >
                  다시하기
                </Button>
                <Button
                  variant="ghost"
                  color="gray.500"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="13px"
                  onClick={() => navigate("/ticketing")}
                  w="full"
                >
                  메인으로 이동
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}

        {phase === "fail" && (
          <Box flex="1" bg="gray.100" p={5} overflowY="auto">
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
                    TICKETLINK RESERVATION FAILED
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
                      2026 N.Flying Concert '&con' in Seoul
                    </Text>

                    <Text color="gray.400">관람일시</Text>
                    <Text color="gray.800" fontWeight="bold">
                      {selectedDate || "-"} {selectedTime.split(" ")[0]}
                    </Text>

                    <Text color="gray.400">관람장소</Text>
                    <Text color="gray.800">N.Flying Hall</Text>

                    <Text color="gray.400">선택좌석</Text>
                    <Text color="red.500" fontWeight="black">
                      매진 (선택 가능한 좌석 없음)
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
                    본 확인서는 티켓링크 예매 시뮬레이터 연습 결과입니다.
                  </Text>
                </Box>
              </Box>

              {/* Control Buttons */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="gray"
                  variant="outline"
                  borderColor="gray.300"
                  color="gray.700"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="14px"
                  onClick={handleRetrySimulation}
                  h="48px"
                  w="full"
                >
                  다시하기
                </Button>
                <Button
                  variant="ghost"
                  color="gray.500"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="13px"
                  onClick={() => navigate("/ticketing")}
                  w="full"
                >
                  메인으로 이동
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Local Coral/Pink Captcha Modal */}
      <Modal isOpen={showCaptchaModal} onClose={() => {}} size="xs" isCentered closeOnOverlayClick={false}>
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

      {/* CAPTCHA Overlay */}
      {showPuzzleOverlay && (
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
            <PuzzleScreen onSuccess={handlePuzzleOverlaySuccess} />
          </Box>
        </Box>
      )}

      {/* Full-screen Fromm/YouTube distraction overlay */}
      {activeFullScreenDistraction && (
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
              maxW="400px"
              h="550px"
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
                    <Text color="yellow.400" fontWeight="bold">엔피아최고:</Text>
                    <Text color="gray.200">와아 실방 대박!!!</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="purple.300" fontWeight="bold">차차훈훈:</Text>
                    <Text color="gray.200">오늘 미모 실화냐 ㅠㅠㅠ</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="green.300" fontWeight="bold">회승바라기:</Text>
                    <Text color="gray.200">노래 너무 조아요 😭😭</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Text color="pink.300" fontWeight="bold">티켓팅망함:</Text>
                    <Text color="gray.200">악 나 티켓팅 중인데 알림 보고 들어옴 ㅋㅋㅋ</Text>
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
              bg="purple.900"
              bgGradient="linear(to-b, purple.950, indigo.900)"
              color="white"
              w="full"
              maxW="400px"
              h="550px"
              rounded="2xl"
              overflow="hidden"
              border="1.5px solid"
              borderColor="purple.500"
              spacing={0}
              shadow="2xl"
            >
              {/* Fromm Header */}
              <Box bg="rgba(0,0,0,0.2)" w="full" px={4} py={3} borderBottom="1px solid" borderColor="purple.800">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <IconButton
                      icon={<ArrowLeft size={18} />}
                      aria-label="돌아가기"
                      variant="ghost"
                      color="purple.200"
                      _hover={{ color: "white", bg: "purple.800" }}
                      _active={{ bg: "purple.700" }}
                      rounded="full"
                      size="sm"
                      onClick={() => {
                        setActiveFullScreenDistraction(null);
                        setSavedPhase(null);
                      }}
                    />
                    <Image src={activeFullScreenDistraction.avatar} w="32px" h="32px" rounded="full" objectFit="cover" border="1.5px solid" borderColor="purple.300" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="13px" fontWeight="black">
                        {activeFullScreenDistraction.sender}
                      </Text>
                      <Text fontSize="9px" color="purple.200">
                        활동 중 • fromm
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="purple" variant="subtle" fontSize="9px" px={2} py={0.5} rounded="md">
                    1:1 Chat
                  </Badge>
                </HStack>
              </Box>

              {/* Fromm Chat Log */}
              <VStack w="full" flex={1} p={4} align="stretch" spacing={3} overflowY="auto" justifyContent="end">
                <HStack align="start" spacing={2}>
                  <Image src={activeFullScreenDistraction.avatar} w="28px" h="28px" rounded="full" objectFit="cover" />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="9px" color="purple.200">
                      {activeFullScreenDistraction.sender}
                    </Text>
                    <Box bg="white" color="black" py={2} px={3} rounded="xl" roundedTopLeft="none" fontSize="12px" maxW="240px">
                      {activeFullScreenDistraction.content}
                    </Box>
                  </VStack>
                </HStack>

                <HStack align="start" spacing={2} justify="flex-end" mt={2}>
                  <Box bg="purple.500" color="white" py={2} px={3} rounded="xl" roundedBottomRight="none" fontSize="12px" maxW="240px">
                    나 지금 티켓팅 중이야!! 진짜 떨려 ㅠㅠ
                  </Box>
                </HStack>

                <HStack align="start" spacing={2} mt={2}>
                  <Image src={activeFullScreenDistraction.avatar} w="28px" h="28px" rounded="full" objectFit="cover" />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="9px" color="purple.200">
                      {activeFullScreenDistraction.sender}
                    </Text>
                    <Box bg="white" color="black" py={2} px={3} rounded="xl" roundedTopLeft="none" fontSize="12px" maxW="240px">
                      {activeFullScreenDistraction.sender.includes("재현")
                        ? "오오 진짜?? 미안 방해했네 ㅋㅋㅋ 대박 좋은 자리 잡아라 화이팅!! 🥳🥁"
                        : activeFullScreenDistraction.sender.includes("동성")
                          ? "앗 티켓팅 중이시구나! 제 기운을 받아서 꼭 1열 잡으세요!! 🎸🔥"
                          : activeFullScreenDistraction.sender.includes("승협")
                            ? "아 진짜요? 옥탑방 1열 가야죠!! 대박 파이팅!! 🦁💙"
                            : activeFullScreenDistraction.sender.includes("회승")
                              ? "와!! 티켓팅 대박 성공해서 제 고음 라이브 1열에서 들어줘요!! 🎤🔥"
                              : "티켓팅 방해해서 미안해요. 꼭 좋은 좌석 예매 성공하시길 바랄게요! 🐱🍀"}
                    </Box>
                  </VStack>
                </HStack>
              </VStack>

              {/* Chat Input Simulation */}
              <Box bg="rgba(0,0,0,0.3)" w="full" px={4} py={3.5} borderTop="1px solid" borderColor="purple.800">
                <HStack spacing={2} bg="rgba(255,255,255,0.08)" px={3} py={2} rounded="full">
                  <Text fontSize="11px" color="purple.300" flex={1}>
                    메시지를 입력하세요...
                  </Text>
                  <Box bg="purple.500" w="24px" h="24px" rounded="full" display="flex" alignItems="center" justifyContent="center" fontSize="11px">
                    ➔
                  </Box>
                </HStack>
              </Box>

              {/* Exit Button Panel */}
              <Box bg="rgba(0,0,0,0.5)" w="full" p={4} borderTop="1px solid" borderColor="purple.800">
                <Button
                  colorScheme="purple"
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
