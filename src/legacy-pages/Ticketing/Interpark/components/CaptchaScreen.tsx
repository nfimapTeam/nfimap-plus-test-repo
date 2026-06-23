import React, { useState, useEffect, useRef } from "react";
import {
  VStack,
  Text,
  Input,
  Button,
  Box,
  HStack,
  IconButton,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { RefreshCw, Volume2 } from "lucide-react";

interface CaptchaScreenProps {
  onSuccess: () => void;
}

const CaptchaScreen = ({ onSuccess }: CaptchaScreenProps) => {
  const [captchaText, setCaptchaText] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate a random 6-character captcha string
  const generateCaptchaText = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Excluded confusing characters like I, O
    let text = "";
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Clear and fill background with deep textured navy blue
    ctx.fillStyle = "#0c1550";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw white/cyan background noise dots
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#00ffff";
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
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.2)" : "rgba(0,255,255,0.2)";
      ctx.lineWidth = Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // 4. Draw distorted letters
    ctx.font = "bold 32px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    
    const letterSpacing = canvas.width / 7;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Save canvas state before translation and rotation
      ctx.save();
      
      // Translate to character position
      const x = letterSpacing * (i + 0.8) + (Math.random() * 4 - 2);
      const y = canvas.height / 2 + (Math.random() * 12 - 6);
      ctx.translate(x, y);

      // Rotate slightly (-20 to 20 degrees)
      const angle = ((Math.random() * 40 - 20) * Math.PI) / 180;
      ctx.rotate(angle);

      // Scale character slightly
      const scaleX = 0.9 + Math.random() * 0.2;
      const scaleY = 0.9 + Math.random() * 0.2;
      ctx.scale(scaleX, scaleY);

      // Draw character shadow/offset
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillText(char, 2, 2);

      // Draw character
      ctx.fillStyle = "#00ffff"; // Cyan letters like Interpark captcha
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }

    // 5. Draw a thick pink crossing horizontal line
    ctx.strokeStyle = "#ff007f"; // Bright pink/magenta line
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, canvas.height / 2 + (Math.random() * 10 - 5));
    // Curved Bezier line across letters
    ctx.bezierCurveTo(
      canvas.width / 3,
      canvas.height / 2 - 15,
      (canvas.width * 2) / 3,
      canvas.height / 2 + 15,
      canvas.width - 10,
      canvas.height / 2 + (Math.random() * 10 - 5)
    );
    ctx.stroke();
  };

  const handleRefresh = () => {
    const newText = generateCaptchaText();
    setCaptchaText(newText);
    setUserInput("");
    setErrorMsg("");
    drawCaptcha(newText);
  };

  useEffect(() => {
    const text = generateCaptchaText();
    setCaptchaText(text);
    // Timeout to make sure canvas ref is mounted and ready
    const timeout = setTimeout(() => {
      drawCaptcha(text);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (userInput.toUpperCase() === captchaText) {
      onSuccess();
    } else {
      setErrorMsg("입력한 보안문자가 일치하지 않습니다.");
      setUserInput("");
      // Refresh captcha on failure
      const newText = generateCaptchaText();
      setCaptchaText(newText);
      drawCaptcha(newText);
    }
  };

  return (
    <VStack
      spacing={5}
      p={6}
      bg="white"
      h="full"
      justify="center"
      align="stretch"
      maxW="400px"
      mx="auto"
    >
      {/* 안심예매 헤더 */}
      <VStack spacing={1} align="center" py={2}>
        <Box
          bg="blue.50"
          color="blue.600"
          px={3}
          py={1}
          rounded="full"
          fontSize="12px"
          fontWeight="bold"
        >
          ✓ 안심예매
        </Box>
        <Text fontSize="18px" fontWeight="900" color="gray.800" mt={1}>
          보안문자를 입력해주세요
        </Text>
      </VStack>

      {/* 캡차 캔버스 박스 */}
      <Box
        border="1px solid"
        borderColor="gray.300"
        rounded="xl"
        overflow="hidden"
        bg="gray.50"
        position="relative"
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={100}
          style={{ width: "100%", height: "100px", display: "block" }}
        />

        {/* 캡차 컨트롤 버튼 */}
        <HStack
          position="absolute"
          right={2}
          top="0"
          bottom="0"
          flexDirection="column"
          justifyContent="center"
          spacing={2}
        >
          <IconButton
            icon={<RefreshCw size={18} />}
            aria-label="보안문자 새로고침"
            size="sm"
            colorScheme="gray"
            rounded="full"
            onClick={handleRefresh}
          />
          <IconButton
            icon={<Volume2 size={18} />}
            aria-label="보안문자 음성듣기"
            size="sm"
            colorScheme="gray"
            rounded="full"
            isDisabled
          />
        </HStack>
      </Box>

      {/* 입력 양식 */}
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <Input
            placeholder="문자를 입력하세요 (대소문자 구분 없음)"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.toUpperCase())}
            size="lg"
            rounded="xl"
            textAlign="center"
            fontSize="18px"
            fontWeight="bold"
            letterSpacing="2px"
            autoFocus
            border="2px solid"
            borderColor="blue.300"
            _focus={{ borderColor: "blue.500", boxShadow: "none" }}
          />

          <Text fontSize="12px" color="gray.400" textAlign="center">
            * 영문 알파벳 대소문자 구분 없이 입력해주세요.
          </Text>

          {errorMsg && (
            <Alert status="error" size="sm" py={2} px={3} rounded="xl" fontSize="13px">
              <AlertIcon />
              {errorMsg}
            </Alert>
          )}

          <Button
            type="submit"
            colorScheme="blue"
            w="full"
            size="lg"
            h="54px"
            fontWeight="bold"
            rounded="xl"
            bg="blue.600"
            _hover={{ bg: "blue.700" }}
          >
            입력완료
          </Button>
        </VStack>
      </form>
    </VStack>
  );
};

export default CaptchaScreen;
