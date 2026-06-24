"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, HStack, Text, Badge, VStack, Heading, Grid, Button, Image, useToast, IconButton, Modal, ModalOverlay, ModalContent, ModalBody, Divider } from "@chakra-ui/react";
import { X, ArrowLeft, XCircle } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { bookingResultState } from "../../../Atom/bookingResultState";
import { DISTRACTION_MEMBERS, YOUTUBE_CHANNELS, DistractionMember, getYoutubeReplyMessage } from "../constants";

import { supabase, hasSupabaseConfig } from "../../../lib/supabase";
import { getInterparkSeatScore, getFinalScore } from "../../../utils/score";
import { Leaderboard } from "../../../components/Leaderboard";

import CaptchaScreen from "./components/CaptchaScreen";
import PuzzleScreen from "./components/PuzzleScreen";
import NfiaAuthScreen from "./components/NfiaAuthScreen";
import StadiumMap from "./components/StadiumMap";
import SeatMap from "./components/SeatMap";
import { SectionSeatData, SeatData } from "./types";

type BookingPhase = "queue" | "dateSelect" | "captcha" | "stadium" | "seat" | "success" | "fail";

interface DistractionEvent {
  id: string;
  type: "youtube" | "fromm";
  sender: string;
  avatar: string;
  content: string;
  yOffset: number;
  xOffset: number;
}

const sectionConfigs: Omit<SectionSeatData, "remainingSeats">[] = [
  // Floor (Purple)
  { id: "F1", name: "Floor F1", type: "FLOOR", color: "purple.500", initialSeats: 600, depleteSpeed: 28 },
  { id: "F2", name: "Floor F2", type: "FLOOR", color: "purple.500", initialSeats: 600, depleteSpeed: 28 },
  { id: "F3", name: "Floor F3", type: "FLOOR", color: "purple.500", initialSeats: 600, depleteSpeed: 24 },
  { id: "F4", name: "Floor F4", type: "FLOOR", color: "purple.500", initialSeats: 600, depleteSpeed: 24 },
  // 1F (Green & Teal)
  { id: "101", name: "101구역", type: "1F", color: "green.500", initialSeats: 400, depleteSpeed: 16 },
  { id: "102", name: "102구역", type: "1F", color: "teal.500", initialSeats: 400, depleteSpeed: 15 },
  { id: "103", name: "103구역", type: "1F", color: "green.500", initialSeats: 400, depleteSpeed: 16 },
  // 2F (Blue)
  { id: "201", name: "201구역", type: "2F", color: "blue.500", initialSeats: 400, depleteSpeed: 12 },
  { id: "202", name: "202구역", type: "2F", color: "blue.500", initialSeats: 400, depleteSpeed: 10 },
  { id: "203", name: "203구역", type: "2F", color: "blue.500", initialSeats: 400, depleteSpeed: 12 },
];

const getDepletedRatio = (sectionId: string, targetDepletedRatio: number): number => {
  const t = Math.min(1.0, Math.max(0.0, targetDepletedRatio));
  let ratio = 0;
  if (sectionId === "F1" || sectionId === "F2") {
    ratio = t <= 0.8 ? t * 1.25 : 1.0;
  } else if (sectionId === "F3" || sectionId === "F4") {
    ratio = t <= 2 / 3 ? t * 0.25 : 0.167 + 2.5 * (t - 2 / 3);
  } else if (sectionId.startsWith("1")) {
    ratio = t <= 2 / 3 ? t * 0.225 : 0.15 + 2.55 * (t - 2 / 3);
  } else if (sectionId.startsWith("2")) {
    ratio = t <= 2 / 3 ? t * 0.13125 : 0.0875 + 2.7375 * (t - 2 / 3);
  }
  return Math.min(1.0, Math.max(0.0, ratio));
};

const generateInitialSeatsForSection = (
  sectionId: string,
  mode: "normal" | "nboom" | "jaehyun" | "cancel",
  delayMs: number
): SeatData[] => {
  const isFloor = sectionId.startsWith("F");
  const numRows = isFloor ? 20 : 16;
  const numCols = isFloor ? 30 : 25;
  const rowNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"].slice(0, numRows);

  if (mode === "cancel") {
    const seats: SeatData[] = [];
    rowNames.forEach((row) => {
      for (let col = 1; col <= numCols; col++) {
        seats.push({
          rowName: row,
          colIndex: col,
          status: "occupied",
          id: `${sectionId}-${row}-${col}`,
        });
      }
    });
    return seats;
  }

  const delaySec = Math.max(0, delayMs / 1000);
  const isHard = mode === "nboom";

  // Pre-occupy percentage baseline based on delay
  let baseOccupancyPercent = 0;
  if (mode === "nboom") {
    // Nboom (hard) mode baseline: starts at 45% occupied and increases with delay
    baseOccupancyPercent = 0.45 + delaySec * 0.35;
  } else if (mode === "jaehyun") {
    // Jaehyun (crazy) mode baseline: starts at 40% occupied and increases with delay
    baseOccupancyPercent = 0.40 + delaySec * 0.30;
  } else {
    // Normal mode baseline
    if (delaySec < 0.3) {
      baseOccupancyPercent = delaySec * 0.3;
    } else {
      baseOccupancyPercent = 0.25 + (delaySec - 0.3) * 0.28;
    }
  }
  baseOccupancyPercent = Math.min(1.0, Math.max(0.0, baseOccupancyPercent));

  const sectionBaseOccupancy = getDepletedRatio(sectionId, baseOccupancyPercent);

  const seats: SeatData[] = [];
  rowNames.forEach((row, rIdx) => {
    const rowWeight = numRows - rIdx; // A is numRows, T is 1
    // Scale occupancy probability based on row weight
    let occupancyProb = sectionBaseOccupancy * (rowWeight / numRows) * 1.6;

    // Front rows (first 4 rows) should be extremely occupied if delay is large
    if (delaySec > 0.5 && rIdx < 4) {
      occupancyProb = Math.max(occupancyProb, isHard ? 0.98 : 0.90);
    }
    if (delaySec > 0.5 && rIdx < 6) {
      occupancyProb = Math.max(occupancyProb, isHard ? 0.92 : 0.75);
    }

    // Clamp
    const maxProb = (isHard && delaySec > 1.5) ? 0.99 : 0.97;
    const finalProb = Math.min(maxProb, Math.max(0.0, occupancyProb));

    for (let col = 1; col <= numCols; col++) {
      const status = Math.random() < finalProb ? "occupied" : "available";
      seats.push({
        rowName: row,
        colIndex: col,
        status,
        id: `${sectionId}-${row}-${col}`,
      });
    }
  });

  return seats;
};


const InterparkBooking = () => {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams?.get("mode") as "normal" | "nboom" | "jaehyun" | "cancel") || "normal";
  const delayParam = searchParams?.get("delay");
  const delayMs = delayParam ? parseInt(delayParam, 10) : 0;
  const failType = searchParams?.get("failType");

  // Booking states
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
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formattedDateStr, setFormattedDateStr] = useState<string>("2026.07.11 (토) 17:00");
  useEffect(() => {
    const today = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    setFormattedDateStr(`${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")} (${days[today.getDay()]}) 17:00`);
  }, []);

  const receiptRef = useRef<HTMLDivElement | null>(null);

  // Centralized session seat states
  const [sections, setSections] = useState<SectionSeatData[]>([]);
  const [detailedSeats, setDetailedSeats] = useState<Record<string, SeatData[]>>({});

  const detailedSeatsRef = useRef(detailedSeats);
  useEffect(() => {
    detailedSeatsRef.current = detailedSeats;
  }, [detailedSeats]);

  const [showPuzzleOverlay, setShowPuzzleOverlay] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);
  const [activePuzzleType, setActivePuzzleType] = useState<"slider" | "nfia">("nfia");

  const [refreshCount, setRefreshCount] = useState<number>(0);
  const lastRefreshIdRef = useRef<number>(0);

  useEffect(() => {
    if (showPuzzleOverlay) {
      setActivePuzzleType(Math.random() < 0.5 ? "slider" : "nfia");
    }
  }, [showPuzzleOverlay]);
  const [activeFullScreenDistraction, setActiveFullScreenDistraction] = useState<{
    type: "youtube" | "fromm";
    sender: string;
    avatar: string;
    content: string;
  } | null>(null);
  const [savedPhase, setSavedPhase] = useState<BookingPhase | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [yiseonjwaCount, setYiseonjwaCount] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [randomMember, setRandomMember] = useState<DistractionMember | null>(null);

  const [showRobotCaptchaModal, setShowRobotCaptchaModal] = useState<boolean>(false);
  const initialAvailableSeatsBySectionRef = useRef<Record<string, number>>({});

  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserScore, setCurrentUserScore] = useState<number | undefined>(undefined);
  const [currentUserBaseScore, setCurrentUserBaseScore] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

  // Initialize state once at mount or reset
  const initializeBookingSession = useCallback(() => {
    const initialSeatsMap: Record<string, SeatData[]> = {};
    const initialMap: Record<string, number> = {};
    const initializedSections = sectionConfigs.map((cfg) => {
      const generatedSeats = generateInitialSeatsForSection(cfg.id, mode, delayMs);
      initialSeatsMap[cfg.id] = generatedSeats;

      const remainingCount = generatedSeats.filter((s) => s.status === "available").length;
      initialMap[cfg.id] = remainingCount;
      return {
        ...cfg,
        remainingSeats: remainingCount,
      } as SectionSeatData;
    });

    initialAvailableSeatsBySectionRef.current = initialMap;
    setDetailedSeats(initialSeatsMap);
    setSections(initializedSections);
  }, [mode, delayMs]);

  useEffect(() => {
    initializeBookingSession();
  }, [initializeBookingSession]);

  // Redirect to home if page is refreshed
  useEffect(() => {
    sessionStorage.setItem("nfiapark_entered_booking", "true");
    const isStarted = sessionStorage.getItem("nfiaparkStarted");
    if (!isStarted) {
      router.push("/ticketing/nfiapark?showSettings=true");
    } else {
      // Clear after a brief delay to allow React Strict Mode double-mount in dev to pass
      setTimeout(() => {
        sessionStorage.removeItem("nfiaparkStarted");
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


  // Connection Queue states
  const [currentQueue, setCurrentQueue] = useState<number>(0);
  const [initialQueueSize, setInitialQueueSize] = useState<number>(0);

  // Distractions queue
  const [distractions, setDistractions] = useState<DistractionEvent[]>([]);

  // Time tracking states
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const globalStartTimeRef = useRef<number>(performance.now());

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
      qSize = Math.floor(Math.pow(base, 2) * 2000 + Math.random() * 1000);
      if (qSize > 32000) {
        qSize = 32000 + Math.floor(Math.random() * 1000);
      }
    }

    if (qSize <= 0 || mode === "cancel") {
      setStartTime(performance.now());
      setPhase("dateSelect");
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
        setStartTime(performance.now());
        setPhase("dateSelect");
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [delayMs, mode]);

  // Central background seat depletion loop (Optimized to prevent stuttering)
  useEffect(() => {
    if (phase === "queue" || phase === "success" || phase === "fail") return;
    if (mode === "cancel") return;

    const isJaehyun = mode === "jaehyun";
    const isNboom = mode === "nboom";

    // Fast 100ms interval for smooth linear depletion
    const tickTime = 100;

    const intervalId = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const targetDuration = isNboom ? 18 : isJaehyun ? 60 : 80;
      const targetDepletedRatio = Math.min(1.0, elapsed / targetDuration);

      // 1. Calculate target remaining seats and deplete sections list
      setSections((prevSections) => {
        if (prevSections.length === 0) return prevSections;
        return prevSections.map((sec) => {
          // Calculate section-specific depletion speed to satisfy top-first priority (F1/F2 -> F3/F4 -> Others)
          const secDepletedRatio = getDepletedRatio(sec.id, targetDepletedRatio);
          const initialAvail = initialAvailableSeatsBySectionRef.current[sec.id] || sec.initialSeats;
          const targetRemaining = Math.max(0, initialAvail - Math.round(initialAvail * secDepletedRatio));
          return {
            ...sec,
            remainingSeats: targetRemaining,
          };
        });
      });

      // 2. Update detailedSeats ONLY for the selectedSection (if any)
      if (selectedSection) {
        setDetailedSeats((prevDetailed) => {
          const prevSeats = prevDetailed[selectedSection];
          if (!prevSeats) return prevDetailed;

          // Compute target remaining seats directly for the selected section using math
          const secDepletedRatio = getDepletedRatio(selectedSection, targetDepletedRatio);
          const initialAvail = initialAvailableSeatsBySectionRef.current[selectedSection] || (selectedSection.startsWith("F") ? 600 : 400);
          const targetRemaining = Math.max(0, initialAvail - Math.round(initialAvail * secDepletedRatio));

          const availableSeats = prevSeats.filter((s) => s.status === "available" && !s.hijacked);
          const numToOccupy = availableSeats.length - targetRemaining;
          if (numToOccupy <= 0) return prevDetailed;

          const updatedSeats = [...prevSeats];
          const numRows = selectedSection.startsWith("F") ? 20 : 16;
          const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];

          // Sort available seats: front rows first but with jitter
          const sortedAvailable = [...availableSeats].sort((a, b) => {
            const aIdx = rowNamesList.indexOf(a.rowName);
            const bIdx = rowNamesList.indexOf(b.rowName);
            const aWeight = numRows - aIdx;
            const bWeight = numRows - bIdx;

            const aScore = aWeight * 100 + Math.random() * 20;
            const bScore = bWeight * 100 + Math.random() * 20;

            return bScore - aScore;
          });

          let occupiedCount = 0;
          for (let i = 0; i < Math.min(numToOccupy, sortedAvailable.length); i++) {
            const seatToTake = sortedAvailable[i];
            const idx = updatedSeats.findIndex((s) => s.id === seatToTake.id);
            if (idx !== -1) {
              updatedSeats[idx] = { ...updatedSeats[idx], status: "occupied" };
              occupiedCount++;
            }
          }

          // If available seats in the section are completely depleted but we still need to occupy,
          // hijack user's selected seat if it's not already hijacked.
          const remainingToOccupy = numToOccupy - occupiedCount;
          if (remainingToOccupy > 0) {
            const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
            if (selectedIdx !== -1 && !updatedSeats[selectedIdx].hijacked) {
              updatedSeats[selectedIdx] = {
                ...updatedSeats[selectedIdx],
                hijacked: true,
              };
            }
          }

          // Bot hijack selected seat in selected section (marks as hijacked, not changing status immediately on UI)
          const hijackChance = isJaehyun ? 0.05 : isNboom ? 0.02 : 0.01;
          if (hijackChance > 0 && Math.random() < hijackChance) {
            const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
            if (selectedIdx !== -1 && !updatedSeats[selectedIdx].hijacked) {
              updatedSeats[selectedIdx] = {
                ...updatedSeats[selectedIdx],
                hijacked: true,
              };
            }
          }

          return {
            ...prevDetailed,
            [selectedSection]: updatedSeats,
          };
        });
      }
    }, tickTime);

    return () => {
      clearInterval(intervalId);
    };
  }, [mode, phase, startTime, selectedSection]);

  // Check for failure (all seats sold out across sections/selected section and no seat selected)
  useEffect(() => {
    if (phase === "queue" || phase === "success" || phase === "fail" || phase === "dateSelect" || phase === "captcha") return;
    if (mode === "cancel") return;

    let isFailed = false;

    if (phase === "stadium") {
      const totalAvailable = sections.reduce((sum, sec) => sum + sec.remainingSeats, 0);
      if (totalAvailable === 0) {
        isFailed = true;
      }
    } else if (phase === "seat" && selectedSection) {
      const seatsList = detailedSeats[selectedSection] || [];
      const availableCount = seatsList.filter((s) => s.status === "available" && !s.hijacked).length;
      const selectedSeatObj = seatsList.find((s) => s.status === "selected");

      if (selectedSeatObj) {
        if (selectedSeatObj.hijacked) {
          if (availableCount === 0) {
            isFailed = true;
          } else {
            // Deselect and mark as occupied immediately so the user can select another seat
            setDetailedSeats((prev) => {
              const next = { ...prev };
              const sectionSeats = next[selectedSection] || [];
              next[selectedSection] = sectionSeats.map((s) =>
                s.id === selectedSeatObj.id ? { ...s, status: "occupied" } : s
              );
              return next;
            });
            toast({
              title: "이미 선택된 좌석입니다.",
              description: "다른 예매자가 먼저 좌석을 선택했습니다.",
              status: "error",
              duration: 1500,
              position: "top",
            });
          }
        }
      } else {
        if (availableCount === 0) {
          isFailed = true;
        }
      }
    }

    if (isFailed) {
      const endTime = performance.now();
      setElapsedTime((delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000));
      setPhase("fail");
    }
  }, [sections, detailedSeats, phase, startTime, selectedSection]);

  // Cleanup overlays on success/fail
  useEffect(() => {
    if (phase === "fail" || phase === "success") {
      setShowRobotCaptchaModal(false);
      setShowPuzzleOverlay(false);
      setActiveFullScreenDistraction(null);
    }
  }, [phase]);

  // Distraction event spawner loop in Jaehyun Mode
  useEffect(() => {
    if (mode !== "jaehyun" || phase === "success" || phase === "fail" || phase === "queue") {
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

      // Automatically clear after 4.5 seconds (only for YouTube)
      if (newEvent.type === "youtube") {
        setTimeout(() => {
          setDistractions((prev) => prev.filter((d) => d.id !== id));
        }, 4500);
      }
    };

    const triggerNext = () => {
      const nextDelay = (Math.random() * 1200 + 800) * 1.5625; // Decreased frequency to 80% of current
      return setTimeout(() => {
        spawnDistraction();
        timerId = triggerNext();
      }, nextDelay);
    };

    // Spawn the first distraction almost immediately
    const firstTimerId = setTimeout(() => {
      spawnDistraction();
    }, 200);

    let timerId = triggerNext();

    return () => {
      clearTimeout(firstTimerId);
      clearTimeout(timerId);
    };
  }, [mode, phase]);

  const handleDateSelectNext = () => {
    if (!selectedDate || !selectedTime) return;
    setPhase("captcha");
  };

  const handleCaptchaSuccess = () => {
    if (savedPhase) {
      setPhase(savedPhase);
      setSavedPhase(null);
    } else {
      setPhase("stadium");
    }
  };

  const handlePuzzleOverlaySuccess = async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    setShowPuzzleOverlay(false);
  };

  const syncSelectedSectionSeats = useCallback((sectionId: string, targetRemaining: number) => {
    setDetailedSeats((prevDetailed) => {
      const prevSeats = prevDetailed[sectionId];
      if (!prevSeats) return prevDetailed;

      const availableSeats = prevSeats.filter((s) => s.status === "available");
      const difference = availableSeats.length - targetRemaining;
      if (difference <= 0) return prevDetailed;

      const updatedSeats = [...prevSeats];
      const numRows = sectionId.startsWith("F") ? 20 : 16;
      const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];

      // Sort available seats: front rows first but with jitter
      const sortedAvailable = [...availableSeats].sort((a, b) => {
        const aIdx = rowNamesList.indexOf(a.rowName);
        const bIdx = rowNamesList.indexOf(b.rowName);
        const aWeight = numRows - aIdx;
        const bWeight = numRows - bIdx;

        const aScore = aWeight * 100 + Math.random() * 20;
        const bScore = bWeight * 100 + Math.random() * 20;

        return bScore - aScore;
      });

      for (let i = 0; i < Math.min(difference, sortedAvailable.length); i++) {
        const seatToTake = sortedAvailable[i];
        const idx = updatedSeats.findIndex((s) => s.id === seatToTake.id);
        if (idx !== -1) {
          updatedSeats[idx] = { ...updatedSeats[idx], status: "occupied" };
        }
      }

      return {
        ...prevDetailed,
        [sectionId]: updatedSeats,
      };
    });
  }, []);

  const handleSectionSelect = (sectionId: string) => {
    const action = () => {
      setSelectedSection(sectionId);
      const sec = sections.find((s) => s.id === sectionId);
      if (sec) {
        syncSelectedSectionSeats(sectionId, sec.remainingSeats);
      }
      setPhase("seat");
    };

    if (mode === "jaehyun") {
      setPendingAction(() => action);
      setShowPuzzleOverlay(true);
    } else {
      action();
    }
  };

  const handleBackToStadium = () => {
    setSelectedSection(null);
    setPhase("stadium");
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
    if (!selectedSection) return;

    const nextCount = refreshCount + 1;
    setRefreshCount(nextCount);

    const performRefresh = () => {
      const rand = Math.random();
      let numSeatsToGenerate = 0;
      let isLargeBatch = false;

      if (rand < 1 / 15) {
        numSeatsToGenerate = 30;
        isLargeBatch = true;
      } else if (rand < 1 / 15 + 1 / 5) {
        numSeatsToGenerate = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
      }

      const sectionSeats = detailedSeatsRef.current[selectedSection];
      if (!sectionSeats) return;

      const resetSeats: SeatData[] = sectionSeats.map((s) => ({
        ...s,
        status: "occupied",
        hijacked: false,
      }));

      const generatedSeatIds: string[] = [];

      if (numSeatsToGenerate > 0) {
        const pool = Array.from({ length: resetSeats.length }).map((_, i) => i);
        const shuffled = pool.sort(() => 0.5 - Math.random());

        const numSelectable = isLargeBatch ? 5 : numSeatsToGenerate;
        const numHijacked = isLargeBatch ? 25 : 0;

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

      setDetailedSeats((prev) => ({
        ...prev,
        [selectedSection]: resetSeats,
      }));

      if (numSeatsToGenerate === 0) {
        setSections((prevSecs) => {
          return prevSecs.map((sec) => {
            if (sec.id === selectedSection) {
              return { ...sec, remainingSeats: 0 };
            }
            return sec;
          });
        });
      } else {
        const numSelectable = isLargeBatch ? 5 : numSeatsToGenerate;
        const numHijacked = isLargeBatch ? 25 : 0;
        setSections((prevSecs) => {
          return prevSecs.map((sec) => {
            if (sec.id === selectedSection) {
              return { ...sec, remainingSeats: numSelectable + numHijacked };
            }
            return sec;
          });
        });
      }

      const currentRefreshId = ++lastRefreshIdRef.current;

      generatedSeatIds.forEach((seatId) => {
        const seat = resetSeats.find((s) => s.id === seatId);
        const seatDelay = seat?.seatDelay || 800;

        setTimeout(() => {
          if (currentRefreshId !== lastRefreshIdRef.current) return;
          
          // Clear selectedSeat state if the selected seat disappeared!
          // We can check if selectedSeat matches seatInfo
          const sectionId = seatId.split("-")[0];
          const rowName = seatId.split("-")[1];
          const colIndex = seatId.split("-")[2];
          const seatInfoStr = `${sectionId}구역 ${rowName}열 ${colIndex}번`;

          setSelectedSeat((prev) => {
            if (prev === seatInfoStr) return null;
            return prev;
          });

          setDetailedSeats((prev) => {
            const sectionSeats = prev[selectedSection];
            if (!sectionSeats) return prev;

            const updated = sectionSeats.map((s) => {
              if (s.id === seatId && (s.status === "available" || s.status === "selected")) {
                return { ...s, status: "occupied" as const, hijacked: false };
              }
              return s;
            });

            const remainingCount = updated.filter((s) => s.status === "available").length;
            setSections((prevSecs) => {
              return prevSecs.map((sec) => {
                if (sec.id === selectedSection) {
                  return { ...sec, remainingSeats: remainingCount };
                }
                return sec;
              });
            });

            return { ...prev, [selectedSection]: updated };
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

  const handleYiseonjwaTrigger = () => {
    if (mode === "cancel") return;
    setYiseonjwaCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setSelectedSection(null);
        setPhase("stadium");
        setShowRobotCaptchaModal(true);
        return 0;
      }
      return next;
    });
  };

  const handleSeatSelectSuccess = (seatInfo: string, seatId: string) => {
    const action = async () => {
      const currentDetailedSeats = detailedSeatsRef.current;
      // Double check if seat became occupied in the background
      const sectionId = seatId.split("-")[0];
      const rowName = seatId.split("-")[1];
      const seats = currentDetailedSeats[sectionId] || [];
      const seat = seats.find((s) => s.id === seatId);

      const isCancelMode = mode === "cancel";
      const isPastDisappear = isCancelMode && seat && seat.disappearTime && Date.now() >= seat.disappearTime;

      if (!seat || seat.status === "occupied" || seat.hijacked || isPastDisappear) {
        // Change seat to occupied on map
        setDetailedSeats((prev) => {
          const next = { ...prev };
          const sectionSeats = next[sectionId] || [];
          next[sectionId] = sectionSeats.map((s) =>
            s.id === seatId ? { ...s, status: "occupied" } : s
          );
          return next;
        });

        toast({
          title: "이미 선택된 좌석입니다.",
          description: "예매 진행 도중 다른 예매자가 먼저 결제창에 진입했습니다.",
          status: "error",
          duration: 2500,
          isClosable: true,
          position: "top",
        });
        handleYiseonjwaTrigger();
        return;
      }

      const endTime = performance.now();
      const duration = (delayMs / 1000) + ((endTime - globalStartTimeRef.current) / 1000); // in seconds

      // Mark the seat as occupied/reserved to avoid double booking
      setDetailedSeats((prev) => {
        const next = { ...prev };
        const sectionSeats = next[sectionId];
        if (sectionSeats) {
          next[sectionId] = sectionSeats.map((s) =>
            s.id === seatId ? { ...s, status: "occupied" } : s
          );
        }
        return next;
      });

      setSelectedSeat(seatInfo);
      setElapsedTime(duration);

      if (mode === "jaehyun") {
        let nicknameVal = sessionStorage.getItem("clean_nickname") || localStorage.getItem("nickname") || "UNK";
        // Defensive: strip trailing digits that match any stored ranking ID
        const storedId = localStorage.getItem("nfiapark_ranking_id");
        if (storedId && nicknameVal.endsWith(storedId)) {
          nicknameVal = nicknameVal.slice(0, -storedId.length) || "UNK";
        }
        setCurrentUserName(nicknameVal);
        const baseScore = getInterparkSeatScore(sectionId, rowName);
        setCurrentUserBaseScore(baseScore);
        const finalScore = getFinalScore(baseScore, duration);
        setCurrentUserScore(finalScore);

        const submitScore = async () => {
          let savedId = localStorage.getItem("nfiapark_ranking_id");
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
                    ticket_type: "nfiapark",
                    name: nicknameVal,
                    score: finalScore,
                  })
                  .select("id")
                  .single();

                if (insertError) {
                  console.error("Insert error from Supabase:", insertError);
                } else if (data) {
                  finalId = data.id;
                  localStorage.setItem("nfiapark_ranking_id", String(data.id));
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
            const localKey = "mock_rankings_nfiapark";
            try {
              const savedStr = localStorage.getItem(localKey);
              let savedList = savedStr ? JSON.parse(savedStr) : [];

              if (!finalId) {
                finalId = Math.floor(Math.random() * 9000) + 1000;
                localStorage.setItem("nfiapark_ranking_id", String(finalId));
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

    action();
  };

  const handleReset = () => {
    sessionStorage.removeItem("interpark_sim_is_started");
    sessionStorage.removeItem("interpark_sim_difficulty");
    sessionStorage.removeItem("interpark_sim_delay");
    sessionStorage.removeItem("interpark_sim_start_time");
    sessionStorage.removeItem("nfiapark_entered_booking");
    sessionStorage.removeItem("nfiaparkStarted");
    setTotalAttempts(0);
    router.push(`/ticketing/nfiapark?showSettings=true`);
  };

  const handleCloseBooking = () => {
    sessionStorage.removeItem("interpark_sim_is_started");
    sessionStorage.removeItem("interpark_sim_difficulty");
    sessionStorage.removeItem("interpark_sim_delay");
    sessionStorage.removeItem("interpark_sim_start_time");
    sessionStorage.removeItem("nfiapark_entered_booking");
    sessionStorage.removeItem("nfiaparkStarted");
    router.push("/ticketing/nfiapark?showSettings=true");
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
      {/* 방해 알림 요소 레이어 */}
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
                  <Box position="absolute" bottom="-2px" right="-2px" bg="red.650" color="white" rounded="full" px="3px" py="1px" fontSize="7px" fontWeight="bold">
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

      {/* 예약 팝업 타이틀 바 */}
      <Box bg="gray.900" color="white" py={3.5} px={4} borderBottom="3px solid" borderColor="blue.500">
        <HStack justify="space-between">
          <Text fontSize="15px" fontWeight="bold" letterSpacing="0.5px">
            엔피아파크 티켓 예매 [연습]
          </Text>
          <HStack spacing={3}>
            <Badge colorScheme={mode === "jaehyun" ? "purple" : mode === "nboom" ? "red" : "blue"} variant="solid" px={2} py={0.5} rounded="md">
              {mode === "jaehyun" ? "대환장 모드" : mode === "nboom" ? "엔붐온 모드" : "일반 모드"}
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
      <Box flex="1" display="flex" flexDirection="column" overflow={(phase === "success" || phase === "fail") ? "visible" : "hidden"} position="relative">
        {phase === "queue" && (
          <Box flex="1" display="flex" flexDirection="column" bg="white" justifyContent="center" p={6} minH="450px">
            <VStack spacing={6} align="stretch" m="auto" maxW="380px" w="full" py={8}>
              {/* 타이틀 */}
              <VStack spacing={2} align="center" textAlign="center">
                <Box
                  w="50px"
                  h="50px"
                  bg="blue.50"
                  color="blue.500"
                  rounded="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="22px"
                  border="1px solid"
                  borderColor="blue.100"
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
                <Text fontSize="32px" fontWeight="900" color="blue.500" fontFamily="monospace" mt={1} letterSpacing="-1px">
                  {currentQueue.toLocaleString()}번째
                </Text>

                {/* 커스텀 게이지 바 */}
                <Box bg="gray.200" h="8px" rounded="full" mt={4} overflow="hidden" position="relative">
                  <Box
                    bg="blue.500"
                    h="full"
                    w={`${initialQueueSize > 0 ? Math.max(0, Math.min(100, ((initialQueueSize - currentQueue) / initialQueueSize) * 100)) : 0}%`}
                    transition="width 0.1s linear"
                  />
                </Box>
              </Box>

              {/* 안내 사항 */}
              <VStack align="start" spacing={1.5} fontSize="11px" color="gray.500" bg="gray.50" p={3.5} rounded="xl" border="1px dashed" borderColor="gray.200">
                <Text fontWeight="bold" color="blue.500">• 새로고침을 하거나 재접속하시면 대기시간이 더 길어집니다.</Text>
                <Text>• 접속 후 임의로 뒤로가기 버튼을 누르시면 대기가 초기화됩니다.</Text>
                <Text>• 비정상적인 접근 시 대기 순서가 차단될 수 있습니다.</Text>
              </VStack>
            </VStack>
          </Box>
        )}

        {phase === "dateSelect" && (
          <Box flex="1" bg="white" display="flex" flexDirection="column" p={4} overflowY="auto">
            <VStack spacing={5} align="stretch">
              <Heading fontSize="16px" fontWeight="bold" color="gray.800" borderLeft="3px solid" borderColor="blue.500" pl={2}>
                관람일 선택
              </Heading>

              {/* Calendar */}
              <Box border="1px solid" borderColor="gray.200" rounded="2xl" p={4}>
                <Text fontSize="13px" fontWeight="extrabold" color="gray.500" mb={3}>
                  {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
                </Text>
                <Grid templateColumns="repeat(7, 1fr)" gap={2} textAlign="center">
                  {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
                    <Text key={w} fontSize="11px" fontWeight="bold" color="gray.400">{w}</Text>
                  ))}
                  {(() => {
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    const dates = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(today);
                      d.setDate(today.getDate() + i);
                      const days = ["일", "월", "화", "수", "목", "금", "토"];
                      const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                      const isSelectable = i === 0 || i === 1;
                      const isSelected = selectedDate === formatted;
                      dates.push(
                        <VStack
                          key={i}
                          spacing={0}
                          py={2}
                          rounded="xl"
                          cursor={isSelectable ? "pointer" : "not-allowed"}
                          bg={isSelected ? "blue.600" : "transparent"}
                          border="1px solid"
                          borderColor={isSelected ? "blue.600" : "transparent"}
                          _hover={isSelectable && !isSelected ? { bg: "blue.50" } : {}}
                          onClick={() => {
                            if (isSelectable) {
                              setSelectedDate(formatted);
                              setSelectedTime("17:00");
                            }
                          }}
                        >
                          <Text fontSize="11px" color={isSelected ? "white" : isSelectable ? "gray.700" : "gray.300"} fontWeight="bold">
                            {d.getDate()}
                          </Text>
                          <Text fontSize="9px" color={isSelected ? "white" : days[d.getDay()] === "일" ? "red.400" : days[d.getDay()] === "토" ? "blue.400" : "gray.400"}>
                            {days[d.getDay()]}
                          </Text>
                        </VStack>
                      );
                    }
                    return dates;
                  })()}
                </Grid>
              </Box>

              <Divider my={1} />

              {/* 회차 정보 */}
              <VStack align="stretch" spacing={2}>
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  회차 선택
                </Text>
                <Button
                  variant={selectedTime ? "solid" : "outline"}
                  colorScheme={selectedTime ? "blue" : "gray"}
                  borderColor={selectedTime ? "blue.500" : "gray.200"}
                  size="md"
                  w="full"
                  justifyContent="center"
                  fontWeight="bold"
                  rounded="xl"
                  onClick={() => {
                    if (selectedDate) setSelectedTime("17:00");
                  }}
                  isDisabled={!selectedDate}
                >
                  17:00
                </Button>
              </VStack>

              {/* 선택 정보 */}
              <Box bg="gray.50" p={4} rounded="xl" border="1px solid" borderColor="gray.150">
                <VStack align="stretch" spacing={2} fontSize="13px">
                  <HStack justify="space-between">
                    <Text color="gray.400">선택 날짜</Text>
                    <Text fontWeight="bold" color="gray.800">{selectedDate || "선택하지 않음"}</Text>
                  </HStack>
                </VStack>
              </Box>

              <Button
                colorScheme="blue"
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

        {phase === "captcha" && (
          <CaptchaScreen onSuccess={handleCaptchaSuccess} />
        )}

        {phase === "stadium" && (
          <StadiumMap mode={mode} sections={sections} onSelectSection={handleSectionSelect} />
        )}

        {phase === "seat" && selectedSection && (
          <SeatMap
            sectionId={selectedSection}
            mode={mode}
            delayMs={delayMs}
            seats={detailedSeats[selectedSection] || []}
            onSeatsChange={(updatedSeats) =>
              setDetailedSeats((prev) => ({ ...prev, [selectedSection]: updatedSeats }))
            }
            onBackToStadium={handleBackToStadium}
            onSelectSeatSuccess={handleSeatSelectSuccess}
            hasFrommDistraction={distractions.some((d) => d.type === "fromm")}
            onYiseonjwa={handleYiseonjwaTrigger}
            totalAttempts={totalAttempts}
            onIncrementAttempts={() => setTotalAttempts((prev) => prev + 1)}
            onRefreshSeats={handleCancelModeRefresh}
          />
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
            <VStack spacing={6} pb={8} align="stretch" maxW="400px" mx="auto" w="full">
              {/* 성공 배너 */}

              {/* 상세 티켓 명세 */}
              <VStack
                ref={receiptRef}
                spacing={0}
                bg="white"
                rounded="2xl"
                border="1px solid"
                borderColor="gray.200"
                shadow="lg"
                overflow="hidden"
                align="stretch"
              >
                {/* Ticket Header */}
                <Box bgGradient="linear(to-r, blue.500, blue.600)" color="white" py={3.5} px={5} textAlign="center">
                  <Text fontSize="10px" fontWeight="black" letterSpacing="2px" opacity={0.9}>
                    NFIAPARK TICKET PRACTICE
                  </Text>
                  <Text fontSize="16px" fontWeight="950" mt={0.5} letterSpacing="0.5px">
                    예매 성공 확인서
                  </Text>
                </Box>

                {/* Ticket Body */}
                <VStack p={5} spacing={4} align="stretch" bg="white">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="11px" color="gray.400" fontWeight="bold">CONCERT</Text>
                    <Text fontSize="15px" fontWeight="black" color="gray.800" lineHeight="1.3">
                      2026 N.Flying Concert '&CON' in Seoul
                    </Text>
                  </VStack>

                  <Grid templateColumns="1fr 1fr" gap={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">DATE</Text>
                      <Text fontSize="13px" fontWeight="bold" color="gray.700">
                        {formattedDateStr}
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">STADIUM</Text>
                      <Text fontSize="13px" fontWeight="bold" color="gray.700" textAlign="right">
                        N.Flying Hall
                      </Text>
                    </VStack>
                  </Grid>

                  <Grid templateColumns="1fr 1fr" gap={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">SEAT</Text>
                      <Text fontSize="14px" fontWeight="black" color="blue.600">
                        {selectedSeat}
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">MODE</Text>
                      <Badge
                        colorScheme={mode === "jaehyun" ? "purple" : mode === "nboom" ? "red" : "blue"}
                        variant="solid"
                        px={2.5}
                        py={0.5}
                        rounded="md"
                        fontSize="11px"
                        fontWeight="bold"
                      >
                        {mode === "jaehyun" ? "대환장 모드 🤪" : mode === "nboom" ? "엔붐온 모드 ⚡" : "일반 모드 🔵"}
                      </Badge>
                    </VStack>
                  </Grid>
                </VStack>

                {/* Perforation Line Container */}
                <Box position="relative" h="20px" bg="white">
                  {/* Left Circle Punch */}
                  <Box
                    position="absolute"
                    left="-10px"
                    top="0"
                    w="20px"
                    h="20px"
                    bg="gray.50"
                    borderRadius="full"
                    borderRight="1px solid"
                    borderColor="gray.200"
                    zIndex={5}
                  />
                  {/* Right Circle Punch */}
                  <Box
                    position="absolute"
                    right="-10px"
                    top="0"
                    w="20px"
                    h="20px"
                    bg="gray.50"
                    borderRadius="full"
                    borderLeft="1px solid"
                    borderColor="gray.200"
                    zIndex={5}
                  />
                  {/* Dashed Line */}
                  <Box
                    position="absolute"
                    left="15px"
                    right="15px"
                    top="9px"
                    borderTop="2px dashed"
                    borderColor="gray.200"
                  />
                </Box>

                {/* Ticket Stub (Receipt/Bottom Part) */}
                <VStack p={5} spacing={3} align="stretch" bg="white">
                  {mode === "jaehyun" ? (
                    <Grid templateColumns="1fr 1fr" gap={3}>
                      <Box bg="purple.50" border="1px solid" borderColor="purple.100" p={3.5} rounded="xl" textAlign="center">
                        <Text fontSize="10px" color="purple.500" fontWeight="bold" letterSpacing="0.5px">
                          소요 시간
                        </Text>
                        <Text fontSize="24px" fontWeight="black" color="purple.800" fontFamily="monospace" mt={1} lineHeight="1">
                          {elapsedTime.toFixed(2)}초
                        </Text>
                      </Box>
                      <Box bg="pink.50" border="1px solid" borderColor="pink.100" p={3.5} rounded="xl" textAlign="center">
                        <Text fontSize="10px" color="pink.500" fontWeight="bold" letterSpacing="0.5px">
                          최종 점수
                        </Text>
                        <Text fontSize="24px" fontWeight="black" color="pink.800" fontFamily="monospace" mt={1} lineHeight="1">
                          {currentUserScore?.toLocaleString() || 0}
                        </Text>
                      </Box>
                    </Grid>
                  ) : (
                    <Box bg="blue.50" border="1px solid" borderColor="blue.100" p={4} rounded="xl" textAlign="center">
                      <Text fontSize="11px" color="blue.500" fontWeight="bold" letterSpacing="0.5px">
                        소요 시간
                      </Text>
                      <Text fontSize="30px" fontWeight="950" color="blue.650" fontFamily="monospace" mt={1} lineHeight="1">
                        {elapsedTime.toFixed(2)}초
                      </Text>
                    </Box>
                  )}

                  <VStack spacing={1} mt={2}>
                    <HStack spacing={2} justify="center" h={8}>
                      {["4px", "12px", "4px", "8px", "16px", "4px", "12px", "4px", "8px", "12px", "4px", "16px", "8px", "4px", "12px", "8px", "4px", "12px", "4px", "8px"].map((w, i) => (
                        <Box key={i} w={w} h="full" bg="gray.800" />
                      ))}
                    </HStack>
                    <Text fontSize="9px" color="gray.400" fontFamily="monospace" letterSpacing="1px" textAlign="center">
                      NF20150520
                    </Text>
                  </VStack>
                </VStack>

                {/* Polaroid Congratulatory Card inside receipt */}
                {randomMember && (
                  <Box
                    p={6}
                    bg={mode === "jaehyun" ? "purple.50" : mode === "nboom" ? "red.50" : "blue.50"}
                    borderTop="2px dashed"
                    borderColor={mode === "jaehyun" ? "purple.200" : mode === "nboom" ? "red.200" : "blue.200"}
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
              </VStack>

              {/* 대환장 모드 서사 비하인드 카드 */}
              {mode === "jaehyun" && (
                <Box
                  bg="purple.50"
                  border="1px solid"
                  borderColor="purple.200"
                  p={5}
                  rounded="2xl"
                  shadow="sm"
                  w="full"
                >
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
                      borderColor="purple.250"
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
                    ticketType="nfiapark"
                    currentUserName={currentUserName}
                    currentUserScore={currentUserScore}
                    currentUserId={currentUserId}
                  />
                </VStack>
              )}

              {/* 제어 버튼 영역 */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  w="full"
                  size="lg"
                  h="52px"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="16px"
                  onClick={handleReset}
                  shadow="md"
                  _hover={{ bg: "blue.600" }}
                  _active={{ bg: "blue.700" }}
                >
                  다시 도전하기
                </Button>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  borderColor="gray.300"
                  color="gray.700"
                  w="full"
                  size="lg"
                  h="52px"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="16px"
                  onClick={() => {
                    sessionStorage.removeItem("interpark_sim_is_started");
                    sessionStorage.removeItem("interpark_sim_difficulty");
                    sessionStorage.removeItem("interpark_sim_delay");
                    sessionStorage.removeItem("interpark_sim_start_time");
                    router.push("/");
                  }}
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
          <Box bg="gray.50" p={5} w="full" flex="1" display="flex" flexDirection="column">
            <VStack spacing={6} pb={8} align="stretch" maxW="400px" mx="auto" w="full">
              {/* 실패 배너 */}
              <VStack spacing={2} align="center" textAlign="center" py={2}>
                <Box
                  w="70px"
                  h="70px"
                  bg="blue.50"
                  color="blue.500"
                  rounded="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  shadow="md"
                >
                  <XCircle size={40} />
                </Box>
                <Heading fontSize="22px" fontWeight="900" color="gray.800" mt={2}>
                  예매에 실패했습니다.
                </Heading>
                <Text fontSize="13px" color="gray.500">
                  선택 가능한 좌석이 모두 매진되었습니다.
                </Text>
              </VStack>

              {/* 상세 티켓 명세 */}
              <VStack
                spacing={0}
                bg="white"
                rounded="2xl"
                border="1px solid"
                borderColor="gray.200"
                shadow="lg"
                overflow="hidden"
                align="stretch"
              >
                {/* Ticket Header */}
                <Box bgGradient="linear(to-r, blue.500, blue.600)" color="white" py={3.5} px={5} textAlign="center">
                  <Text fontSize="10px" fontWeight="black" letterSpacing="2px" opacity={0.9}>
                    NFIAPARK TICKET PRACTICE
                  </Text>
                  <Text fontSize="16px" fontWeight="950" mt={0.5} letterSpacing="0.5px">
                    예매 실패 확인서
                  </Text>
                </Box>

                {/* Ticket Body */}
                <VStack p={5} spacing={4} align="stretch" bg="white">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="11px" color="gray.400" fontWeight="bold">CONCERT</Text>
                    <Text fontSize="15px" fontWeight="black" color="gray.800" lineHeight="1.3">
                      2026 N.Flying Concert '&CON' in Seoul
                    </Text>
                  </VStack>

                  <Grid templateColumns="1fr 1fr" gap={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">DATE</Text>
                      <Text fontSize="13px" fontWeight="bold" color="gray.700">
                        {formattedDateStr}
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">STADIUM</Text>
                      <Text fontSize="13px" fontWeight="bold" color="gray.700" textAlign="right">
                        N.Flying Hall
                      </Text>
                    </VStack>
                  </Grid>

                  <Grid templateColumns="1fr 1fr" gap={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">SEAT</Text>
                      <Text fontSize="14px" fontWeight="black" color="blue.600">
                        매진
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontSize="11px" color="gray.400" fontWeight="bold">MODE</Text>
                      <Badge
                        colorScheme={mode === "jaehyun" ? "purple" : mode === "nboom" ? "red" : "blue"}
                        variant="solid"
                        px={2.5}
                        py={0.5}
                        rounded="md"
                      >
                        {mode === "jaehyun" ? "대환장" : mode === "nboom" ? "엔붐온" : "일반"}
                      </Badge>
                    </VStack>
                  </Grid>
                </VStack>

                {/* Perforation Line Container */}
                <Box position="relative" h="20px" bg="white">
                  {/* Left Circle Punch */}
                  <Box
                    position="absolute"
                    left="-10px"
                    top="0"
                    w="20px"
                    h="20px"
                    bg="gray.50"
                    borderRadius="full"
                    borderRight="1px solid"
                    borderColor="gray.200"
                    zIndex={5}
                  />
                  {/* Right Circle Punch */}
                  <Box
                    position="absolute"
                    right="-10px"
                    top="0"
                    w="20px"
                    h="20px"
                    bg="gray.50"
                    borderRadius="full"
                    borderLeft="1px solid"
                    borderColor="gray.200"
                    zIndex={5}
                  />
                  {/* Dashed Line */}
                  <Box
                    position="absolute"
                    left="15px"
                    right="15px"
                    top="9px"
                    borderTop="2px dashed"
                    borderColor="gray.200"
                  />
                </Box>

                {/* Ticket Stub (Receipt/Bottom Part) */}
                <VStack p={5} spacing={3} align="stretch" bg="white">
                  <Box bg="blue.50" border="1px solid" borderColor="blue.100" p={4} rounded="xl" textAlign="center">
                    <Text fontSize="11px" color="blue.500" fontWeight="bold" letterSpacing="0.5px">
                      진행 시간
                    </Text>
                    <Text fontSize="30px" fontWeight="950" color="blue.650" fontFamily="monospace" mt={1} lineHeight="1">
                      {elapsedTime.toFixed(2)}초
                    </Text>
                  </Box>
                </VStack>
              </VStack>

              {/* 제어 버튼 영역 */}
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  w="full"
                  size="lg"
                  h="52px"
                  rounded="xl"
                  fontWeight="bold"
                  onClick={handleReset}
                  shadow="md"
                  _hover={{ bg: "blue.650" }}
                  _active={{ bg: "blue.700" }}
                >
                  다시 도전하기
                </Button>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  borderColor="gray.300"
                  color="gray.700"
                  w="full"
                  size="lg"
                  h="52px"
                  rounded="xl"
                  fontWeight="bold"
                  fontSize="16px"
                  onClick={() => {
                    sessionStorage.removeItem("interpark_sim_is_started");
                    sessionStorage.removeItem("interpark_sim_difficulty");
                    sessionStorage.removeItem("interpark_sim_delay");
                    sessionStorage.removeItem("interpark_sim_start_time");
                    router.push("/");
                  }}
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                >
                  홈으로 돌아가기
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}
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
            <Box bg="white" rounded="2xl" shadow="2xl" maxW="400px" w="full" overflow="hidden">
              {mode === "jaehyun" && activePuzzleType === "nfia" ? (
                <NfiaAuthScreen onSuccess={handlePuzzleOverlaySuccess} />
              ) : (
                <PuzzleScreen onSuccess={handlePuzzleOverlaySuccess} />
              )}
            </Box>
          </Box>
        )}

        {/* Fullscreen Distraction Overlays */}
        {activeFullScreenDistraction && phase !== "fail" && phase !== "success" && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(0, 0, 0, 0.8)"
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
                borderColor="gray.800"
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
                      if (savedPhase) {
                        setPhase(savedPhase);
                        setSavedPhase(null);
                      } else {
                        setPhase("stadium");
                      }
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
                borderColor="gray.700"
                spacing={0}
                shadow="2xl"
              >
                {/* Fromm Header */}
                <Box bg="gray.900" w="full" px={4} py={3} borderBottom="1px solid" borderColor="gray.700">
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
                          if (savedPhase) {
                            setPhase(savedPhase);
                            setSavedPhase(null);
                          } else {
                            setPhase("stadium");
                          }
                        }}
                      />
                      <Image src={activeFullScreenDistraction.avatar} w="32px" h="32px" rounded="full" objectFit="cover" border="1.5px solid" borderColor="gray.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="13px" fontWeight="black">
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
                      if (savedPhase) {
                        setPhase(savedPhase);
                        setSavedPhase(null);
                      } else {
                        setPhase("stadium");
                      }
                    }}
                    fontWeight="bold"
                    size="lg"
                    rounded="xl"
                  >
                    프롬 나가고 티켓팅으로 돌아가기
                  </Button>
                </Box>
              </VStack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default InterparkBooking;
