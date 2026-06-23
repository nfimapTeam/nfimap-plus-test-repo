import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  VStack,
  Text,
  Button,
  Box,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";


interface PuzzleScreenProps {
  onSuccess: () => void;
}

const PuzzleScreen = ({ onSuccess }: PuzzleScreenProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sliderX, setSliderX] = useState<number>(10);
  const [targetX, setTargetX] = useState<number>(180);
  const [targetY, setTargetY] = useState<number>(50);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Puzzle piece size
  const pieceSize = 40;

  // Path generator for a classic puzzle piece shape
  const drawPuzzlePiecePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const r = size / 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // top edge tab (outward)
    ctx.lineTo(x + size / 2 - r, y);
    ctx.arc(x + size / 2, y, r, Math.PI, 0, false);
    ctx.lineTo(x + size, y);
    // right edge tab (outward)
    ctx.lineTo(x + size, y + size / 2 - r);
    ctx.arc(x + size, y + size / 2, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(x + size, y + size);
    // bottom edge tab (inward)
    ctx.lineTo(x + size / 2 + r, y + size);
    ctx.arc(x + size / 2, y + size, r, 0, Math.PI, false);
    ctx.lineTo(x, y + size);
    // left edge tab (inward)
    ctx.lineTo(x, y + size / 2 + r);
    ctx.arc(x, y + size / 2, r, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(x, y);
    ctx.closePath();
  };

  // Generate new random positions
  const resetPuzzlePositions = useCallback(() => {
    const randomX = Math.floor(Math.random() * 90) + 150; // Between 150px and 240px
    const randomY = Math.floor(Math.random() * 50) + 30;  // Between 30px and 80px
    setTargetX(randomX);
    setTargetY(randomY);
    setSliderX(10);
    setErrorMsg("");
  }, []);

  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.src = "/image/banner/nflying_cover_image_1.webp";
    img.onload = () => {
      setBgImage(img);
      setIsLoaded(true);
    };
    resetPuzzlePositions();
  }, [resetPuzzlePositions]);

  // Render loop
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw full background image scaled to canvas
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // 2. Draw shadow cutout at target location
    ctx.save();
    drawPuzzlePiecePath(ctx, targetX, targetY, pieceSize);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "black";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Draw movable puzzle piece matching the crop of target location
    ctx.save();
    drawPuzzlePiecePath(ctx, sliderX, targetY, pieceSize);
    ctx.clip();
    // Shift background image in opposite direction to align crop when sliderX === targetX
    ctx.drawImage(bgImage, sliderX - targetX, 0, canvas.width, canvas.height);
    ctx.restore();

    // 4. Draw cyan glowing stroke around the movable piece
    ctx.save();
    drawPuzzlePiecePath(ctx, sliderX, targetY, pieceSize);
    ctx.strokeStyle = "#a78bfa"; // Light purple theme color
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#8b5cf6";
    ctx.stroke();
    ctx.restore();
  }, [bgImage, sliderX, targetX, targetY]);

  // Redraw when states change
  useEffect(() => {
    if (isLoaded) {
      drawCanvas();
    }
  }, [isLoaded, drawCanvas]);

  const handleSubmit = () => {
    const tolerance = 5; // Allowable pixel margin of error
    const diff = Math.abs(sliderX - targetX);

    if (diff <= tolerance) {
      onSuccess();
    } else {
      setErrorMsg("로봇 차단 해제 실패! 퍼즐의 위치가 정확하지 않습니다.");
      setIsShaking(true);
      // Shake animation trigger
      setTimeout(() => {
        setIsShaking(false);
        resetPuzzlePositions();
      }, 500);
    }
  };

  return (
    <VStack
      spacing={5}
      p={6}
      bg="white"
      h="full"
      justifyContent="center"
      align="stretch"
      maxW="400px"
      mx="auto"
      className={isShaking ? "shake-animation" : ""}
      style={{
        transition: "transform 0.1s ease",
      }}
    >
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      {/* 헤더 안내문 */}
      <VStack spacing={1} align="center" py={1}>
        <Box
          bg="purple.50"
          color="purple.600"
          px={3}
          py={1}
          rounded="full"
          fontSize="12px"
          fontWeight="bold"
          border="1px solid"
          borderColor="purple.150"
        >
          🤖 로봇 방지 검증 (CAPTCHA)
        </Box>
        <Text fontSize="16px" fontWeight="900" color="gray.850" mt={1}>
          슬라이더로 퍼즐을 맞춰주세요
        </Text>
        <Text fontSize="11px" color="gray.500" textAlign="center">
          하단의 조절 바를 밀어 빈 공간에 정확히 맞추세요.
        </Text>
      </VStack>

      {/* 캔버스 뷰포트 */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        rounded="2xl"
        overflow="hidden"
        bg="gray.100"
        position="relative"
        boxShadow="md"
        w="320px"
        h="160px"
        mx="auto"
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={160}
          style={{ display: "block" }}
        />
      </Box>

      {/* 슬라이더 컨트롤러 */}
      <VStack spacing={2} px={1} w="full" maxW="320px" mx="auto">
        <Box position="relative" w="full" py={2}>
          <input
            type="range"
            min={10}
            max={270}
            step={1}
            value={sliderX}
            onChange={(e) => setSliderX(Number(e.target.value))}
            style={{
              width: "100%",
              height: "10px",
              borderRadius: "9999px",
              background: `linear-gradient(to right, #805AD5, #6B46C1 ${(sliderX - 10) / (270 - 10) * 100}%, #EDF2F7 ${(sliderX - 10) / (270 - 10) * 100}%)`,
              outline: "none",
              border: "1px solid #E2E8F0",
              WebkitAppearance: "none",
              appearance: "none",
              cursor: "pointer",
            }}
            className="custom-range-input"
          />
          <style>{`
            .custom-range-input::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #805AD5;
              border: 2px solid white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              cursor: pointer;
              transition: transform 0.1s, background-color 0.1s;
            }
            .custom-range-input::-webkit-slider-thumb:hover {
              background: #6B46C1;
            }
            .custom-range-input::-webkit-slider-thumb:active {
              background: #553C9A;
              transform: scale(1.15);
            }
            .custom-range-input::-moz-range-thumb {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #805AD5;
              border: 2px solid white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              cursor: pointer;
              transition: transform 0.1s, background-color 0.1s;
            }
            .custom-range-input::-moz-range-thumb:hover {
              background: #6B46C1;
            }
            .custom-range-input::-moz-range-thumb:active {
              background: #553C9A;
              transform: scale(1.15);
            }
          `}</style>
        </Box>
      </VStack>

      {/* 피드백 경고창 */}
      {errorMsg && (
        <Alert status="error" size="sm" py={2} px={3} rounded="xl" fontSize="12px">
          <AlertIcon />
          {errorMsg}
        </Alert>
      )}

      {/* 하단 확인 버튼 */}
      <Button
        colorScheme="purple"
        w="full"
        maxW="320px"
        mx="auto"
        size="lg"
        h="52px"
        fontWeight="bold"
        rounded="xl"
        bg="purple.600"
        _hover={{ bg: "purple.700" }}
        _active={{ bg: "purple.800" }}
        onClick={handleSubmit}
      >
        인증 완료하기
      </Button>
    </VStack>
  );
};

export default PuzzleScreen;
