import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, HStack, Text, Badge, VStack, Heading, Grid, Button, Image, useToast, IconButton } from "@chakra-ui/react";
import { X, ArrowLeft, XCircle } from "lucide-react";
import { DISTRACTION_MEMBERS, YOUTUBE_CHANNELS, DistractionMember, getYoutubeReplyMessage } from "../constants";

import CaptchaScreen from "./components/CaptchaScreen";
import PuzzleScreen from "./components/PuzzleScreen";
import NfiaAuthScreen from "./components/NfiaAuthScreen";
import StadiumMap from "./components/StadiumMap";
import SeatMap from "./components/SeatMap";
import { SectionSeatData, SeatData } from "./types";

type BookingPhase = "queue" | "captcha" | "stadium" | "seat" | "success" | "fail";

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
  // 2F (Green & Blue)
  { id: "202", name: "202구역", type: "2F", color: "teal.500", initialSeats: 400, depleteSpeed: 15 },
  { id: "203", name: "203구역", type: "2F", color: "green.500", initialSeats: 400, depleteSpeed: 16 },
  { id: "204", name: "204구역", type: "2F", color: "green.500", initialSeats: 400, depleteSpeed: 16 },
  { id: "205", name: "205구역", type: "2F", color: "teal.500", initialSeats: 400, depleteSpeed: 15 },
  { id: "212", name: "212구역", type: "2F", color: "teal.500", initialSeats: 400, depleteSpeed: 15 },
  { id: "213", name: "213구역", type: "2F", color: "teal.500", initialSeats: 400, depleteSpeed: 15 },
  // 3F (Blue)
  { id: "308", name: "308구역", type: "3F", color: "blue.500", initialSeats: 400, depleteSpeed: 12 },
  { id: "309", name: "309구역", type: "3F", color: "blue.500", initialSeats: 400, depleteSpeed: 12 },
  { id: "313", name: "313구역", type: "3F", color: "blue.500", initialSeats: 400, depleteSpeed: 10 },
  { id: "314", name: "314구역", type: "3F", color: "blue.500", initialSeats: 400, depleteSpeed: 10 },
];

const generateInitialSeatsForSection = (
  sectionId: string,
  mode: "normal" | "nboom" | "jaehyun",
  delayMs: number
): SeatData[] => {
  const isFloor = sectionId.startsWith("F");
  const numRows = isFloor ? 20 : 16;
  const numCols = isFloor ? 30 : 25;
  const rowNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"].slice(0, numRows);

  const delaySec = Math.max(0, delayMs / 1000);
  const isHard = mode === "nboom";

  // Pre-occupy percentage baseline based on delay
  let baseOccupancyPercent = 0;
  if (isHard) {
    baseOccupancyPercent = 0.40 + delaySec * 0.25;
  } else {
    baseOccupancyPercent = 0.35 + delaySec * 0.18;
  }
  baseOccupancyPercent = Math.min(1.0, Math.max(0.0, baseOccupancyPercent));

  const seats: SeatData[] = [];
  rowNames.forEach((row, rIdx) => {
    const rowWeight = numRows - rIdx; // A is numRows, T is 1
    // Scale occupancy probability based on row weight
    let occupancyProb = baseOccupancyPercent * (rowWeight / numRows) * 1.6;

    // Front rows (first 4 rows) should be extremely occupied if delay is large
    if (isHard && delaySec > 0.8 && rIdx < 4) {
      occupancyProb = 0.98;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") as "normal" | "nboom" | "jaehyun") || "normal";
  const delayParam = searchParams.get("delay");
  const delayMs = delayParam ? parseInt(delayParam, 10) : 0;

  // Booking states
  const [phase, setPhase] = useState<BookingPhase>("queue");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

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
  const [showPuzzleOverlay, setShowPuzzleOverlay] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [activePuzzleType, setActivePuzzleType] = useState<"slider" | "nfia">("nfia");

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
  const [randomMember, setRandomMember] = useState<DistractionMember | null>(null);

  // Initialize state once at mount or reset
  const initializeBookingSession = useCallback(() => {
    const initialSeatsMap: Record<string, SeatData[]> = {};
    const initializedSections = sectionConfigs.map((cfg) => {
      const generatedSeats = generateInitialSeatsForSection(cfg.id, mode, delayMs);
      initialSeatsMap[cfg.id] = generatedSeats;

      const remainingCount = generatedSeats.filter((s) => s.status === "available").length;
      return {
        ...cfg,
        remainingSeats: remainingCount,
      } as SectionSeatData;
    });

    setDetailedSeats(initialSeatsMap);
    setSections(initializedSections);
  }, [mode, delayMs]);

  useEffect(() => {
    initializeBookingSession();
  }, [initializeBookingSession]);

  // Redirect to home if page is refreshed
  useEffect(() => {
    const isStarted = sessionStorage.getItem("nfiaparkStarted");
    if (!isStarted) {
      navigate("/ticketing/nfiapark");
    } else {
      // Clear after a brief delay to allow React Strict Mode double-mount in dev to pass
      setTimeout(() => {
        sessionStorage.removeItem("nfiaparkStarted");
      }, 100);
    }
  }, [navigate]);

  useEffect(() => {
    if (phase === "success" && !randomMember && mode === "jaehyun") {
      const idx = Math.floor(Math.random() * DISTRACTION_MEMBERS.length);
      setRandomMember(DISTRACTION_MEMBERS[idx]);
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
  }, [delayMs, mode]);

  // Central background seat depletion loop
  useEffect(() => {
    if (phase === "queue" || phase === "success" || phase === "fail") return;

    const isJaehyun = mode === "jaehyun";
    const isNboom = mode === "nboom";

    // Tick speed: 70ms for N-Boom-On (hard) to ensure smooth cascading depletion, 400ms for Normal, 600ms for Jaehyun
    const tickTime = isNboom ? 70 : mode === "normal" ? 400 : 600;

    let intervalId: NodeJS.Timeout | null = null;

    const startTimeout = setTimeout(() => {
      intervalId = setInterval(() => {
        setDetailedSeats((prevDetailed) => {
          const nextDetailed = { ...prevDetailed };
          let anyChanged = false;

          Object.keys(nextDetailed).forEach((sectionId) => {
            const prevSeats = nextDetailed[sectionId];
            const availableSeats = prevSeats.filter((s) => s.status === "available");
            if (availableSeats.length === 0) return;

            // Find config for this section to apply its speed factor
            const cfg = sectionConfigs.find((c) => c.id === sectionId);
            const speedFactor = cfg ? (cfg.depleteSpeed / 20) : 1.0;

            // Seats to occupy in this tick
            let numToOccupy = 0;
            if (isNboom) {
              const baseNum = Math.random() < 0.6 ? 1 : 2; // 1 to 2 base for smooth depletion
              numToOccupy = Math.max(1, Math.round(baseNum * speedFactor));
            } else if (mode === "jaehyun") {
              const delaySec = Math.max(0, delayMs / 1000);
              const baseOccupancyPercent = Math.min(1.0, Math.max(0.0, 0.35 + delaySec * 0.18));
              const approxInitialAvailable = (cfg?.initialSeats || 400) * (1 - baseOccupancyPercent);
              const ticksIn60s = 60000 / tickTime; // 100 ticks
              numToOccupy = Math.max(1, Math.round(approxInitialAvailable / ticksIn60s));
            } else {
              const baseNum = Math.floor(Math.random() * 3) + 2; // 2 to 4 base (Harder Normal)
              numToOccupy = Math.floor(baseNum * speedFactor);
            }

            if (numToOccupy <= 0) return;
            anyChanged = true;

            const updatedSeats = [...prevSeats];

            // Row configuration details for scoring
            const numRows = sectionId.startsWith("F") ? 20 : 16;
            const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];

            // Sort available seats randomly but heavily biased towards the front (row A downwards)
            const sortedAvailable = [...availableSeats].sort((a, b) => {
              const aIdx = rowNamesList.indexOf(a.rowName);
              const bIdx = rowNamesList.indexOf(b.rowName);
              const aWeight = numRows - aIdx;
              const bWeight = numRows - bIdx;

              const aScore = Math.random() * Math.pow(aWeight, 1.8);
              const bScore = Math.random() * Math.pow(bWeight, 1.8);

              return bScore - aScore; // Highest score first
            });

            for (let i = 0; i < Math.min(numToOccupy, sortedAvailable.length); i++) {
              const seatToTake = sortedAvailable[i];
              const idx = updatedSeats.findIndex((s) => s.id === seatToTake.id);
              if (idx !== -1) {
                updatedSeats[idx] = {
                  ...updatedSeats[idx],
                  status: "occupied",
                };
              }
            }

            // Bot hijack selected seat in all modes
            const hijackChance = isJaehyun ? 0.15 : isNboom ? 0.18 : 0.05;
            if (Math.random() < hijackChance) {
              const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
              if (selectedIdx !== -1) {
                updatedSeats[selectedIdx] = {
                  ...updatedSeats[selectedIdx],
                  status: "occupied",
                };
              }
            }

            nextDetailed[sectionId] = updatedSeats;
          });

          return anyChanged ? nextDetailed : prevDetailed;
        });
      }, tickTime);
    }, 1000);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, phase, delayMs]);

  // Sync remaining seats counts in sections with detailedSeats
  useEffect(() => {
    setSections((prevSections) => {
      if (prevSections.length === 0) return prevSections;
      const nextSections = prevSections.map((sec) => {
        const seats = detailedSeats[sec.id];
        if (!seats) return sec;
        const remaining = seats.filter((s) => s.status === "available").length;
        if (sec.remainingSeats !== remaining) {
          return {
            ...sec,
            remainingSeats: remaining,
          };
        }
        return sec;
      });

      const hasChanged = nextSections.some((sec, idx) => sec.remainingSeats !== prevSections[idx].remainingSeats);
      return hasChanged ? nextSections : prevSections;
    });
  }, [detailedSeats]);

  // Check for failure (all seats sold out across all sections and no seat selected)
  useEffect(() => {
    if (phase !== "stadium" && phase !== "seat") return;

    const sectionsKeys = Object.keys(detailedSeats);
    if (sectionsKeys.length === 0) return;

    let totalAvailable = 0;
    sectionsKeys.forEach((secId) => {
      const seatsList = detailedSeats[secId];
      if (seatsList) {
        totalAvailable += seatsList.filter((s) => s.status === "available").length;
      }
    });

    let hasSelectedSeat = false;
    sectionsKeys.forEach((secId) => {
      const seatsList = detailedSeats[secId];
      if (seatsList && seatsList.some((s) => s.status === "selected")) {
        hasSelectedSeat = true;
      }
    });

    if (totalAvailable === 0 && !hasSelectedSeat) {
      const endTime = performance.now();
      setElapsedTime((endTime - startTime) / 1000);
      setPhase("fail");
    }
  }, [detailedSeats, phase, startTime]);

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
        const y = Math.floor(Math.random() * 200) + 120; // 120px - 320px down
        const x = Math.floor(Math.random() * 40) + 20;   // 20px - 60px margins
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

      // Automatically clear after 4.5 seconds (only for YouTube)
      if (newEvent.type === "youtube") {
        setTimeout(() => {
          setDistractions((prev) => prev.filter((d) => d.id !== id));
        }, 4500);
      }
    };

    const triggerNext = () => {
      const nextDelay = (Math.random() * 1200 + 800) * 1.25; // Decreased frequency to 80%
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

  const handleCaptchaSuccess = () => {
    if (savedPhase) {
      setPhase(savedPhase);
      setSavedPhase(null);
    } else {
      setPhase("stadium");
    }
  };

  const handlePuzzleOverlaySuccess = () => {
    setShowPuzzleOverlay(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    const action = () => {
      setSelectedSection(sectionId);
      setPhase("seat");
    };

    if (mode === "jaehyun" && Math.random() < 0.5) {
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

  const handleYiseonjwaTrigger = () => {
    setYiseonjwaCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setSelectedSection(null);
        setPhase("captcha");
        return 0;
      }
      return next;
    });
  };

  const handleSeatSelectSuccess = (seatInfo: string, seatId: string) => {
    const action = () => {
      // Double check if seat became occupied in the background
      const sectionId = seatId.split("-")[0];
      const seats = detailedSeats[sectionId] || [];
      const seat = seats.find((s) => s.id === seatId);

      if (!seat || seat.status === "occupied") {
        toast({
          title: "이미 선택된 좌석입니다. (이선좌)",
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
      const duration = (endTime - startTime) / 1000; // in seconds

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
      setPhase("success");
    };

    if (mode === "jaehyun" && Math.random() < 0.6) {
      setPendingAction(() => action);
      setShowPuzzleOverlay(true);
    } else {
      action();
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem("interpark_sim_is_started");
    sessionStorage.removeItem("interpark_sim_difficulty");
    sessionStorage.removeItem("interpark_sim_delay");
    sessionStorage.removeItem("interpark_sim_start_time");
    navigate(`/ticketing/nfiapark`);
  };

  const handleCloseBooking = () => {
    sessionStorage.removeItem("interpark_sim_is_started");
    sessionStorage.removeItem("interpark_sim_difficulty");
    sessionStorage.removeItem("interpark_sim_delay");
    sessionStorage.removeItem("interpark_sim_start_time");
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
      <Box flex="1" display="flex" flexDirection="column" overflow="hidden" position="relative">
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
          />
        )}

        {phase === "success" && (
          <VStack spacing={6} py={8} px={5} align="stretch" h="full" justify="center" maxW="400px" mx="auto">
            {/* 성공 배너 */}
            <VStack spacing={2} align="center" textAlign="center" py={2}>
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
                  ENFIAPARK TICKET PRACTICE
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
                    2026 N.Flying Concert '&con' in Seoul
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
                <Box bg="blue.50" border="1px solid" borderColor="blue.100" p={4} rounded="xl" textAlign="center">
                  <Text fontSize="11px" color="blue.500" fontWeight="bold" letterSpacing="0.5px">
                    소요 시간 (클릭 순발력)
                  </Text>
                  <Text fontSize="30px" fontWeight="950" color="blue.650" fontFamily="monospace" mt={1} lineHeight="1">
                    {elapsedTime.toFixed(2)}초
                  </Text>
                </Box>

                <VStack spacing={1} mt={2}>
                  <HStack spacing={2} justify="center" h={8}>
                    {["4px", "12px", "4px", "8px", "16px", "4px", "12px", "4px", "8px", "12px", "4px", "16px", "8px", "4px", "12px", "8px", "4px", "12px", "4px", "8px"].map((w, i) => (
                      <Box key={i} w={w} h="full" bg="gray.800" />
                    ))}
                  </HStack>
                  <Text fontSize="9px" color="gray.400" fontFamily="monospace" letterSpacing="1px" textAlign="center">
                    NFI-{Math.floor(100000 + Math.random() * 900000)}
                  </Text>
                </VStack>
              </VStack>

              {/* Jaehyun Mode Congratulatory Card inside receipt */}
              {mode === "jaehyun" && randomMember && (
                <Box
                  p={6}
                  bg="purple.50"
                  borderTop="2px dashed"
                  borderColor="purple.200"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Box
                    bg="white"
                    p="12px"
                    pb="32px"
                    shadow="md"
                    border="1px solid"
                    borderColor="gray.200"
                    maxW="180px"
                    w="full"
                  >
                    <Image
                      src={randomMember.avatar}
                      w="100%"
                      h="150px"
                      objectFit="cover"
                      border="1px solid"
                      borderColor="gray.200"
                    />
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
                    이 모드는 사실... 엔피아들이 한참 티켓팅에 집중하고 있을 때, 재현이가 프롬으로 채팅을 보내서 본의 아니게 방해 공작(?)을 펼쳤던 귀여운 실제 해프닝에서 영감을 받아 탄생한 모드예요!
                    <br /><br />
                    당시 재현이가 팬들과 수다 떨며 보낸 톡 메시지들이 바로 이 대환장 모드의 시초랍니다. 🤣
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
                  navigate("/");
                }}
                bg="white"
                _hover={{ bg: "gray.50" }}
              >
                홈으로 돌아가기
              </Button>
            </VStack>
          </VStack>
        )}

        {phase === "fail" && (
          <VStack spacing={6} py={8} px={5} align="stretch" h="full" justify="center" maxW="400px" mx="auto">
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
                  ENFIAPARK TICKET PRACTICE
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
                    2026 N.Flying Concert '&con' in Seoul
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
                      매진 (선택 가능한 좌석 없음)
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
                  navigate("/");
                }}
                bg="white"
                _hover={{ bg: "gray.50" }}
              >
                홈으로 돌아가기
              </Button>
            </VStack>
          </VStack>
        )}
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
        {activeFullScreenDistraction && (
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
                maxW="400px"
                h="550px"
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
                      setPhase("captcha");
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
                          setPhase("captcha");
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
                    <Box bg="indigo.600" color="white" py={2} px={3} rounded="xl" roundedBottomRight="none" fontSize="12px" maxW="240px">
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
                        {getYoutubeReplyMessage(activeFullScreenDistraction.sender)}
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
                    bg="purple.600"
                    color="white"
                    _hover={{ bg: "purple.500" }}
                    _active={{ bg: "purple.750" }}
                    w="full"
                    onClick={() => {
                      setActiveFullScreenDistraction(null);
                      setPhase("captcha");
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
