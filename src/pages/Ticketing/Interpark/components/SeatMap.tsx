import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  VStack,
  Text,
  Box,
  Grid,
  HStack,
  Button,
  IconButton,
  useToast,
  Divider,
} from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";

interface SeatMapProps {
  sectionId: string;
  mode: "normal" | "nboom";
  delayMs: number;
  onBackToStadium: () => void;
  onSelectSeatSuccess: (seatInfo: string) => void;
}

interface SeatData {
  rowName: string;
  colIndex: number; // 1-indexed
  status: "available" | "occupied" | "selected";
  id: string;
}

const SeatMap = ({ sectionId, mode, delayMs, onBackToStadium, onSelectSeatSuccess }: SeatMapProps) => {
  const toast = useToast();
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  
  const isFloor = sectionId.startsWith("F");
  const numRows = isFloor ? 14 : 10; // Floor has 14 rows (A-N), tiers have 10 rows (A-J)
  const numCols = isFloor ? 22 : 18; // Floor has 22 columns, tiers have 18 columns
  
  const rowNames = useMemo(() => {
    return ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"].slice(0, numRows);
  }, [numRows]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize seat grid
  const initializeSeats = useCallback(() => {
    const newSeats: SeatData[] = [];
    const delaySec = Math.max(0, delayMs / 1000);
    
    let baseOccupancy = 0;
    if (mode === "nboom") {
      baseOccupancy = 0.65 + delaySec * 0.25;
    } else {
      baseOccupancy = 0.35 + delaySec * 0.18;
    }
    
    rowNames.forEach((row, rIdx) => {
      for (let col = 1; col <= numCols; col++) {
        let status: "available" | "occupied" = "available";

        // Pre-occupy logic
        const randomVal = Math.random();
        
        // Front rows are more occupied initially
        const rowBias = (numRows - rIdx) / numRows; // higher bias for front rows
        
        let occupancyThreshold = baseOccupancy + rowBias * 0.25;

        // For N-Boom-On: if delay is > 0.8s, front rows (A-F) should be 100% taken.
        if (mode === "nboom") {
          if (delaySec > 0.8 && rIdx < 6) {
            occupancyThreshold = 1.0;
          }
          if (delaySec > 1.5) {
            occupancyThreshold = Math.max(occupancyThreshold, 0.98);
          }
        }

        // Clamp occupancy threshold
        const maxThreshold = (mode === "nboom" && delaySec > 1.8) ? 1.0 : 0.99;
        const finalThreshold = Math.min(maxThreshold, Math.max(0.0, occupancyThreshold));

        if (randomVal < finalThreshold) {
          status = "occupied";
        }

        newSeats.push({
          rowName: row,
          colIndex: col,
          status,
          id: `${sectionId}-${row}-${col}`,
        });
      }
    });

    setSeats(newSeats);
    setSelectedSeatId(null);
  }, [sectionId, mode, delayMs, numRows, numCols, rowNames]);

  // Run initial setup
  useEffect(() => {
    initializeSeats();
  }, [initializeSeats]);

  // Seat depletion ticker
  useEffect(() => {
    const tickTime = mode === "nboom" ? 120 : 250; // tick speed

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSeats((prevSeats) => {
        const availableSeats = prevSeats.filter((s) => s.status === "available");
        if (availableSeats.length === 0) return prevSeats;

        // Number of seats to occupy in this tick
        const numToOccupy = mode === "nboom" 
          ? Math.floor(Math.random() * 13) + 12 // 12 to 24 seats in N-Boom-On
          : Math.floor(Math.random() * 6) + 5; // 5 to 10 seats in Normal

        // Select seats to occupy, biasing front rows (A-G)
        const updatedSeats = [...prevSeats];

        // Prioritize occupying A-G rows first
        const frontAvailable = availableSeats.filter((s) => ["A", "B", "C", "D", "E", "F", "G"].includes(s.rowName));
        const backAvailable = availableSeats.filter((s) => !["A", "B", "C", "D", "E", "F", "G"].includes(s.rowName));

        for (let i = 0; i < numToOccupy; i++) {
          let seatToTake: SeatData | null = null;
          
          if (frontAvailable.length > 0 && Math.random() < 0.85) {
            const randIdx = Math.floor(Math.random() * frontAvailable.length);
            seatToTake = frontAvailable.splice(randIdx, 1)[0];
          } else if (backAvailable.length > 0) {
            const randIdx = Math.floor(Math.random() * backAvailable.length);
            seatToTake = backAvailable.splice(randIdx, 1)[0];
          } else if (frontAvailable.length > 0) {
            const randIdx = Math.floor(Math.random() * frontAvailable.length);
            seatToTake = frontAvailable.splice(randIdx, 1)[0];
          }

          if (seatToTake) {
            const idx = updatedSeats.findIndex((s) => s.id === seatToTake!.id);
            if (idx !== -1) {
              updatedSeats[idx] = {
                ...updatedSeats[idx],
                status: "occupied",
              };
            }
          }
        }

        // Bot hijack selected seat in N-Boom-On
        if (mode === "nboom" && Math.random() < 0.25) {
          const selectedIdx = updatedSeats.findIndex((s) => s.status === "selected");
          if (selectedIdx !== -1) {
            updatedSeats[selectedIdx] = {
              ...updatedSeats[selectedIdx],
              status: "occupied",
            };
          }
        }

        return updatedSeats;
      });
    }, tickTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Click seat handler
  const handleSeatClick = (seat: SeatData) => {
    if (seat.status === "occupied") {
      // Show "이선좌" immediately if they try to click a grey box
      toast({
        title: "이미 선택된 좌석입니다. (이선좌)",
        description: "다른 좌석을 선택해 주세요.",
        status: "error",
        duration: 1500,
        isClosable: true,
        position: "top",
      });
      return;
    }

    setSeats((prevSeats) =>
      prevSeats.map((s) => {
        // Toggle selected seat
        if (s.id === seat.id) {
          const newStatus = s.status === "selected" ? "available" : "selected";
          setSelectedSeatId(newStatus === "selected" ? s.id : null);
          return { ...s, status: newStatus };
        }
        // Deselect previous seat
        if (s.status === "selected") {
          return { ...s, status: "available" };
        }
        return s;
      })
    );
  };

  const handleCompleteSelection = () => {
    if (!selectedSeatId) {
      toast({
        title: "좌석을 선택하지 않았습니다.",
        description: "원하시는 좌석을 먼저 클릭해주세요.",
        status: "warning",
        duration: 1500,
        isClosable: true,
        position: "top",
      });
      return;
    }

    const selectedSeat = seats.find((s) => s.id === selectedSeatId);
    
    // Check if the seat got occupied by a bot before submit!
    if (!selectedSeat || selectedSeat.status === "occupied") {
      toast({
        title: "이미 선택된 좌석입니다. (이선좌)",
        description: "예매 진행 도중 다른 예매자가 먼저 결제창에 진입했습니다.",
        status: "error",
        duration: 2500,
        isClosable: true,
        position: "top",
      });
      setSelectedSeatId(null);
      initializeSeats(); // Reset seat map as penalty
      return;
    }

    const seatInfoStr = `${sectionId}구역 ${selectedSeat.rowName}열 ${selectedSeat.colIndex}번`;
    onSelectSeatSuccess(seatInfoStr);
  };

  // Get seat info text
  const getSelectedSeatText = () => {
    if (!selectedSeatId) return "선택된 좌석 없음";
    const selectedSeat = seats.find((s) => s.id === selectedSeatId);
    if (!selectedSeat || selectedSeat.status === "occupied") return "선택된 좌석 없음";
    return `${sectionId}구역 ${selectedSeat.rowName}열 ${selectedSeat.colIndex}번`;
  };

  const selectedSeatObj = seats.find((s) => s.id === selectedSeatId);
  const seatPrice = isFloor ? 154000 : 110000;
  const seatTier = isFloor ? "VIP석" : "일반석";

  return (
    <VStack spacing={3} align="stretch" py={2} px={1} h="full">
      {/* 상단 배치도 안내 문구 */}
      <HStack justify="space-between" align="center" px={1}>
        <Text fontSize="13px" fontWeight="bold" color="red.500">
          * {sectionId}구역의 좌석 배치도 입니다.
        </Text>
        <IconButton
          icon={<RefreshCw size={14} />}
          aria-label="좌석 배치도 새로고침"
          size="xs"
          rounded="full"
          colorScheme="gray"
          onClick={initializeSeats}
        />
      </HStack>

      {/* 좌석 그리드 컨테이너 */}
      <Box
        bg="gray.100"
        p={3}
        rounded="xl"
        border="1px solid"
        borderColor="gray.200"
        overflow="auto"
        flex="1"
        display="flex"
        flexDirection="column"
        minH="250px"
      >
        <VStack spacing={2} align="stretch" m="auto" py={4}>
          {rowNames.map((rowName) => (
            <HStack key={rowName} spacing={0.5} justify="center">
              {/* 열 이름 라벨 */}
              <Text
                fontSize="9px"
                fontWeight="bold"
                color="gray.500"
                w="35px"
                textAlign="right"
                pr={1.5}
                whiteSpace="nowrap"
              >
                {rowName}열
              </Text>
              
              {/* 실제 좌석 블록들 */}
              {seats
                .filter((s) => s.rowName === rowName)
                .map((seat) => {
                  let bgColor = "gray.300"; // occupied
                  if (seat.status === "available") {
                    bgColor = "blue.400"; // available
                  } else if (seat.status === "selected") {
                    bgColor = "orange.500"; // selected
                  }

                  return (
                    <Box
                      key={seat.id}
                      w="10px"
                      h="10px"
                      bg={bgColor}
                      rounded="1.5px"
                      cursor="pointer"
                      transition="0.1s"
                      _hover={seat.status !== "occupied" ? { transform: "scale(1.3)" } : {}}
                      onClick={() => handleSeatClick(seat)}
                    />
                  );
                })}
            </HStack>
          ))}
        </VStack>
      </Box>

      {/* 아래쪽 선택 정보 및 완료 버튼 */}
      <Box bg="white" p={3.5} rounded="xl" border="1px solid" borderColor="gray.200" shadow="sm">
        <VStack spacing={3} align="stretch">
          <Grid templateColumns="1fr 1fr" gap={2} fontSize="13px">
            <VStack align="start" spacing={1}>
              <Text color="gray.400" fontSize="11px">선택 좌석</Text>
              <Text fontWeight="bold" color="gray.800" h="20px">
                {getSelectedSeatText()}
              </Text>
            </VStack>
            <VStack align="end" spacing={1}>
              <Text color="gray.400" fontSize="11px">좌석 등급 / 가격</Text>
              <Text fontWeight="bold" color="gray.850">
                {selectedSeatObj && selectedSeatObj.status !== "occupied" 
                  ? `${seatTier} / ${seatPrice.toLocaleString()}원` 
                  : "-"}
              </Text>
            </VStack>
          </Grid>

          <Divider />

          {/* 하단 버튼 배치 */}
          <HStack spacing={3}>
            <Button
              variant="outline"
              size="md"
              flex={1}
              rounded="xl"
              onClick={onBackToStadium}
              fontWeight="bold"
            >
              이전 단계
            </Button>
            <Button
              colorScheme="blue"
              size="md"
              flex={2}
              rounded="xl"
              onClick={handleCompleteSelection}
              fontWeight="bold"
              bg="blue.600"
              _hover={{ bg: "blue.700" }}
            >
              좌석선택완료
            </Button>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default SeatMap;
