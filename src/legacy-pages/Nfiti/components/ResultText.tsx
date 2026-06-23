import {
  Box,
  Text,
  Heading,
  Flex,
  Container,
  Badge,
  VStack,
  HStack,
  Image,
  useColorModeValue,
  chakra,
  shouldForwardProp,
  Icon,
} from "@chakra-ui/react";
import { motion, isValidMotionProp, Variants } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FaLightbulb } from "react-icons/fa";
import { TbMoonStars } from "react-icons/tb";

// Proper typing for motion components
const ChakraBox = chakra(Box, {
  shouldForwardProp: (prop) =>
    isValidMotionProp(prop) || shouldForwardProp(prop),
});

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  opacity: number;
  size: number;
}

const SnowfallEffect = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const createSnowflake = (): Snowflake => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 10,
      opacity: 0.4 + Math.random() * 0.4,
      size: 3 + Math.random() * 7,
    });

    const generateSnowflakes = () => {
      const newSnowflakes = Array.from({ length: 50 }, () => createSnowflake());
      setSnowflakes(newSnowflakes);
    };

    generateSnowflakes();
    const interval = setInterval(generateSnowflakes, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
      zIndex={10}
      overflow="hidden"
    >
      {snowflakes.map((snowflake) => (
        <Box
          key={snowflake.id}
          position="absolute"
          left={`${snowflake.left}%`}
          top="-10px"
          width={`${snowflake.size}px`}
          height={`${snowflake.size}px`}
          backgroundColor="white"
          borderRadius="50%"
          opacity={snowflake.opacity}
          animation={`fall ${snowflake.animationDuration}s linear infinite`}
          sx={{
            "@keyframes fall": {
              "0%": {
                transform: "translateY(-10px) rotate(0deg)",
              },
              "100%": {
                transform: `translateY(100vh) rotate(360deg)`,
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

interface TestResult {
  title: string;
  imageUrl: string;
  details: {
    reason: string;
    reasonText: string;
    keyPoints: {
      title: string;
      description: string[];
    };
    dayPlan: {
      title: string;
      description: {
        title: string;
        content: string;
      }[];
    };
    hashtags: string;
  };
}

interface ResultDisplayProps {
  testResult: TestResult;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ testResult }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const headingColor = useColorModeValue("blue.600", "blue.300");
  const hashtagBg = useColorModeValue("purple.50", "purple.900");
  const keyPointsBg = useColorModeValue(
    "rgba(251, 211, 141, 0.1)",
    "rgba(66, 30, 0, 0.9)"
  );
  const dayPlanBg = useColorModeValue(
    "rgba(154, 230, 180, 0.1)",
    "rgba(0, 66, 37, 0.9)"
  );

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <Box position="relative" fontFamily="'Noto Sans KR', sans-serif">
      <SnowfallEffect />
      <Container maxW="4xl" py={10}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Title Section */}
          <VStack spacing={6} mb={10}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Heading
                size="2xl"
                bgGradient="linear(to-r, blue.400, purple.500)"
                bgClip="text"
                textAlign="center"
                mb={4}
                fontFamily="'Noto Sans KR', sans-serif"
              >
                {testResult.title}
              </Heading>
            </motion.div>
          </VStack>

          {/* Hashtags Section */}
          <Flex direction="column" align="center" gap={3} mb={8}>
            <Flex justify="center" gap={3}>
              {testResult.details.hashtags
                .split(" ")
                .slice(0, 3)
                .map((tag, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HStack
                      bg={hashtagBg}
                      px={4}
                      py={2}
                      borderRadius="full"
                      shadow="md"
                    >
                      <Text fontSize="sm" fontWeight="bold" fontFamily="'Noto Sans KR', sans-serif">
                        {tag.trim()}
                      </Text>
                    </HStack>
                  </motion.div>
                ))}
            </Flex>
            <Flex justify="center" gap={3}>
              {testResult.details.hashtags
                .split(" ")
                .slice(3)
                .map((tag, idx) => (
                  <motion.div
                    key={idx + 3}
                    variants={itemVariants}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HStack
                      bg={hashtagBg}
                      px={4}
                      py={2}
                      borderRadius="full"
                      shadow="md"
                    >
                      <Text fontSize="sm" fontWeight="bold" fontFamily="'Noto Sans KR', sans-serif">
                        {tag.trim()}
                      </Text>
                    </HStack>
                  </motion.div>
                ))}
            </Flex>
          </Flex>

          {/* Reason Section */}
          <motion.div
            variants={itemVariants}
            style={{
              padding: "1.5rem",
              borderRadius: "1.25rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              marginBottom: "1.5rem",
              background: cardBg,
              width: "100%",
            }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <VStack spacing={4}>
              <Heading size="md" color={headingColor} fontFamily="'Noto Sans KR', sans-serif">
                <Text fontSize="xl" textAlign="center">
                  {testResult.details.reason}
                </Text>
              </Heading>
              <Text
                fontSize="md"
                textAlign="center"
                color={textColor}
                lineHeight="1.6"
                px={2}
                fontFamily="'Noto Sans KR', sans-serif"
              >
                {testResult.details.reasonText}
              </Text>
            </VStack>
          </motion.div>

          {/* Key Points Section */}
          <motion.div
            variants={itemVariants}
            style={{
              background: keyPointsBg,
              padding: "1.5rem",
              borderRadius: "1.25rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              marginBottom: "1.5rem",
              width: "100%",
            }}
          >
            <VStack spacing={5}>
              <Heading size="lg" color="orange.500" textAlign="center" fontFamily="'Noto Sans KR', sans-serif">
                🔮 비장의 무기 🔮
              </Heading>
              <Heading size="md" color="orange.500" textAlign="center" fontFamily="'Noto Sans KR', sans-serif">
                {testResult.details.keyPoints.title}
              </Heading>
              <VStack spacing={3} align="stretch" width="100%">
                {testResult.details.keyPoints.description.map((point, idx) => (
                  <HStack spacing={3} alignItems="flex-start">
                    <Text color={textColor} fontSize="md" fontFamily="'Noto Sans KR', sans-serif">
                      💡 {point}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </motion.div>

          {/* Day Plan Section */}
          <motion.div
            variants={itemVariants}
            style={{
              background: dayPlanBg,
              padding: "1.5rem",
              borderRadius: "1.25rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              width: "100%",
            }}
          >
            <VStack spacing={6}>
              <Heading
                size="md"
                color="green.600"
                textAlign="center"
                whiteSpace="pre-line"
                px={2}
                fontWeight="extrabold"
                textTransform="uppercase"
                letterSpacing="wide"
                fontFamily="'Noto Sans KR', sans-serif"
              >
                {testResult.details.dayPlan.title}
              </Heading>
              <VStack align="stretch" width="100%" spacing={4}>
                {testResult.details.dayPlan.description.map((plan, idx) => (
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={3}>
                      <Heading 
                        size="sm" 
                        color="green.600"
                        fontWeight="bold"
                        fontFamily="'Noto Sans KR', sans-serif"
                      >
                        🌟 {plan.title}
                      </Heading>
                    </HStack>
                    <Text
                      color={textColor}
                      whiteSpace="pre-line"
                      fontSize="md"
                      fontFamily="'Noto Sans KR', sans-serif"
                    >
                      {plan.content}
                    </Text>
                  </VStack>
                ))}
              </VStack>
            </VStack>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ResultDisplay;
