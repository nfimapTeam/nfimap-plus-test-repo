import React, { useState, useMemo } from "react";
import {
  VStack,
  Text,
  Box,
  HStack,
  Button,
  IconButton,
  useToast,
  Divider,
  Grid,
} from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { SeatData } from "../types";

interface SeatMapProps {
  sectionId: string;
  mode: "normal" | "nboom" | "jaehyun";
  delayMs: number;
  seats: SeatData[];
  onSeatsChange: (updatedSeats: SeatData[]) => void;
  onBackToStadium: () => void;
  onSelectSeatSuccess: (seatInfo: string, seatId: string) => void;
  hasFrommDistraction?: boolean;
  onYiseonjwa?: () => void;
}

const SeatMap = ({
  sectionId,
  mode,
  seats,
  onSeatsChange,
  onBackToStadium,
  onSelectSeatSuccess,
  hasFrommDistraction = false,
  onYiseonjwa,
}: SeatMapProps) => {
  const toast = useToast();
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  
  const isFloor = sectionId.startsWith("F");
  const numRows = isFloor ? 20 : 16; // Floor has 20 rows, tiers have 16 rows
  
  const rowNames = useMemo(() => {
    return ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"].slice(0, numRows);
  }, [numRows]);

  // Click seat handler
  const handleSeatClick = (seat: SeatData) => {
    if (hasFrommDistraction) {
      toast({
        title: "화면에 표시된 프롬(fromm) 메시지를 먼저 닫아주세요!",
        status: "warning",
        duration: 1500,
        isClosable: true,
        position: "top",
      });
      return;
    }

    if (seat.status === "occupied") {
      // Occupied seats are unclickable and do nothing
      return;
    }

    const nextSeats: SeatData[] = seats.map((s) => {
      if (s.id === seat.id) {
        const newStatus: "available" | "selected" = s.status === "selected" ? "available" : "selected";
        setSelectedSeatId(newStatus === "selected" ? s.id : null);
        return { ...s, status: newStatus };
      }
      if (s.status === "selected") {
        return { ...s, status: "available" };
      }
      return s;
    });

    onSeatsChange(nextSeats);
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

    const isJaehyun = mode === "jaehyun";
    const isNboom = mode === "nboom";

    // Simulate instant submit hijack (race condition where another user hits reserve first!)
    const hijackChance = isJaehyun ? 0.80 : isNboom ? 0.30 : 0.10;
    let finalSeats = seats;
    if (Math.random() < hijackChance) {
      finalSeats = seats.map((s) =>
        s.id === selectedSeatId ? { ...s, status: "occupied" as const } : s
      );
      onSeatsChange(finalSeats);
    }

    const selectedSeat = finalSeats.find((s) => s.id === selectedSeatId);
    
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
      if (onYiseonjwa) onYiseonjwa();
      return;
    }

    const seatInfoStr = `${sectionId}구역 ${selectedSeat.rowName}열 ${selectedSeat.colIndex}번`;
    onSelectSeatSuccess(seatInfoStr, selectedSeat.id);
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
          onClick={() => toast({ title: "좌석 상태가 갱신되었습니다.", status: "info", duration: 1000, position: "top" })}
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
                      cursor={seat.status === "occupied" ? "default" : "pointer"}
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
