import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  Badge,
  VStack,
  HStack,
  Heading,
  Button,
} from "@chakra-ui/react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";

interface LeaderboardProps {
  ticketType: "nfiapark" | "nfialink";
  currentUserName?: string;
  currentUserScore?: number;
  currentUserId?: number;
}

interface RankingEntry {
  id: number;
  name: string;
  score: number;
  created_at: string;
}

const mockRankings: RankingEntry[] = [
  { id: 1, name: "회승이목청대장", score: 85200, created_at: new Date().toISOString() },
  { id: 2, name: "옥탑방고양이", score: 76400, created_at: new Date().toISOString() },
  { id: 3, name: "재현이의스틱", score: 68900, created_at: new Date().toISOString() },
  { id: 4, name: "승협보컬갓", score: 61200, created_at: new Date().toISOString() },
  { id: 5, name: "차훈고양이발톱", score: 55600, created_at: new Date().toISOString() },
  { id: 6, name: "동성베이스폭주", score: 48900, created_at: new Date().toISOString() },
  { id: 7, name: "환절기무한반복", score: 42100, created_at: new Date().toISOString() },
  { id: 8, name: "엔플라잉짱짱맨", score: 35000, created_at: new Date().toISOString() },
  { id: 9, name: "티켓팅마스터", score: 29000, created_at: new Date().toISOString() },
  { id: 10, name: "이선좌컬렉터", score: 18000, created_at: new Date().toISOString() },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  ticketType,
  currentUserName,
  currentUserScore,
  currentUserId,
}) => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        if (hasSupabaseConfig) {
          const { data, error } = await supabase
            .from("ticket_rankings")
            .select("id, name, score, created_at")
            .eq("ticket_type", ticketType)
            .order("score", { ascending: false })
            .limit(50);

          if (error) throw error;
          
          let rawList = (data as RankingEntry[]) || [];
          let uniqueList = [...rawList];

          // If current user is not in top list, append
          if (currentUserId && currentUserName && currentUserScore !== undefined) {
            const hasUser = uniqueList.some((item) => item.id === currentUserId);
            if (!hasUser) {
              uniqueList.push({
                id: currentUserId,
                name: currentUserName,
                score: currentUserScore,
                created_at: new Date().toISOString(),
              });
              uniqueList.sort((a, b) => b.score - a.score);
            }
          } else if (currentUserName && currentUserScore !== undefined) {
            const hasUser = uniqueList.some((item) => item.name === currentUserName && item.score === currentUserScore);
            if (!hasUser) {
              uniqueList.push({
                id: 99999,
                name: currentUserName,
                score: currentUserScore,
                created_at: new Date().toISOString(),
              });
              uniqueList.sort((a, b) => b.score - a.score);
            }
          }

          setRankings(uniqueList);
        } else {
          // Use simulated fallback local storage + mock data
          const localKey = `mock_rankings_${ticketType}`;
          let savedList: RankingEntry[] = [];
          
          try {
            const savedStr = localStorage.getItem(localKey);
            if (savedStr) {
              savedList = JSON.parse(savedStr);
            }
          } catch (e) {
            console.error("Failed to parse local mock rankings", e);
          }

          if (savedList.length === 0) {
            savedList = [...mockRankings];
          }

          if (currentUserName && currentUserScore !== undefined) {
            const existingIdx = currentUserId 
              ? savedList.findIndex((item) => item.id === currentUserId)
              : savedList.findIndex((item) => item.name === currentUserName && item.score === currentUserScore);

            if (existingIdx !== -1) {
              if (currentUserScore > savedList[existingIdx].score) {
                savedList[existingIdx].score = currentUserScore;
              }
            } else {
              savedList.push({
                id: currentUserId || Math.floor(Math.random() * 9000) + 1000,
                name: currentUserName,
                score: currentUserScore,
                created_at: new Date().toISOString(),
              });
            }
          }

          savedList.sort((a, b) => b.score - a.score);
          savedList = savedList.slice(0, 50); // Cap at 50 entries (5 pages)
          localStorage.setItem(localKey, JSON.stringify(savedList));
          setRankings(savedList);
        }
      } catch (err: any) {
        console.error("Leaderboard fetch error:", err);
        setError("랭킹 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [ticketType, currentUserName, currentUserScore, currentUserId]);

  // Keep up to 50 rankings for display
  const maxRankingsToShow = rankings.slice(0, 50);
  const totalPages = Math.max(1, Math.ceil(maxRankingsToShow.length / itemsPerPage));

  // Clamp current page if list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Auto-focus page containing the current user's entry
  useEffect(() => {
    if (rankings.length > 0) {
      const userIndex = currentUserId 
        ? rankings.findIndex((item) => item.id === currentUserId)
        : (currentUserName && currentUserScore !== undefined)
          ? rankings.findIndex((item) => item.name === currentUserName && item.score === currentUserScore)
          : -1;

      if (userIndex !== -1 && userIndex < 50) {
        const userPage = Math.floor(userIndex / itemsPerPage) + 1;
        setCurrentPage(userPage);
      }
    }
  }, [rankings, currentUserId, currentUserName, currentUserScore]);

  const displayedRankings = maxRankingsToShow.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge
          bgGradient="linear(to-br, #FDE047, #CA8A04)"
          color="black"
          px={2.5}
          py={0.5}
          rounded="full"
          fontWeight="black"
          fontSize="9px"
          border="1px solid rgba(255,255,255,0.2)"
          shadow="0 2px 8px rgba(234, 179, 8, 0.4)"
        >
          1ST
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge
          bgGradient="linear(to-br, #E2E8F0, #64748B)"
          color="black"
          px={2.5}
          py={0.5}
          rounded="full"
          fontWeight="black"
          fontSize="9px"
          border="1px solid rgba(255,255,255,0.2)"
          shadow="0 2px 8px rgba(148, 163, 184, 0.25)"
        >
          2ND
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge
          bgGradient="linear(to-br, #FED7AA, #9A3412)"
          color="white"
          px={2.5}
          py={0.5}
          rounded="full"
          fontWeight="black"
          fontSize="9px"
          border="1px solid rgba(255,255,255,0.1)"
          shadow="0 2px 8px rgba(194, 65, 12, 0.25)"
        >
          3RD
        </Badge>
      );
    }
    return (
      <Text
        fontSize="11px"
        fontWeight="bold"
        color="purple.600"
        textAlign="center"
        fontFamily="monospace"
      >
        {rank}
      </Text>
    );
  };

  return (
    <VStack
      spacing={4}
      w="full"
      bg="white"
      border="1px solid"
      borderColor="purple.100"
      p={5}
      rounded="2xl"
      shadow="lg"
      color="gray.800"
      maxW="400px"
      mx="auto"
      position="relative"
    >
      <VStack spacing={2} w="full" align="center">
        <Heading
          fontSize="20px"
          fontWeight="900"
          color="purple.800"
          textAlign="center"
          letterSpacing="1px"
        >
          대환장모드 랭킹
        </Heading>
        <Box
          px={3}
          py={1}
          bg="purple.50"
          border="1px solid"
          borderColor="purple.100"
          borderRadius="full"
        >
          <Text
            fontSize="9px"
            color="purple.600"
            fontWeight="black"
            letterSpacing="1.5px"
            textAlign="center"
          >
            {ticketType === "nfiapark" ? "엔피아파크" : "엔피아링크"} CRAZY MODE TOP 50
          </Text>
        </Box>
      </VStack>

      {loading ? (
        <VStack py={20} justify="center">
          <Spinner color="purple.500" size="xl" thickness="4px" />
          <Text fontSize="12px" color="purple.600" mt={3} fontWeight="bold" letterSpacing="1px">
            서버 동기화 중...
          </Text>
        </VStack>
      ) : error ? (
        <VStack py={20} justify="center" textAlign="center">
          <Text fontSize="14px" color="red.500" fontWeight="bold">
            {error}
          </Text>
        </VStack>
      ) : (
        <VStack w="full" spacing={4}>
          <Box
            w="full"
            minH="0"
            border="1px solid"
            borderColor="gray.200"
            rounded="xl"
            bg="gray.50"
            overflow="hidden"
          >
            <Table size="sm" variant="unstyled">
              <Thead bg="purple.50" borderBottom="1px solid" borderColor="purple.100">
                <Tr>
                  <Th py={3} color="purple.700" fontSize="10px" fontWeight="black" textAlign="center" w="65px" letterSpacing="1px">RANK</Th>
                  <Th py={3} color="purple.700" fontSize="10px" fontWeight="black" letterSpacing="1px">PLAYER</Th>
                  <Th py={3} color="purple.700" fontSize="10px" fontWeight="black" textAlign="right" pr={5} w="90px" letterSpacing="1px">SCORE</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedRankings.map((entry, idx) => {
                  const rank = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isCurrentUser = currentUserId 
                    ? entry.id === currentUserId 
                    : (entry.name === currentUserName && entry.score === currentUserScore);
                  
                  return (
                    <Tr
                      key={idx}
                      bg={isCurrentUser ? "purple.100" : "transparent"}
                      borderBottom="1px solid"
                      borderColor="gray.200"
                      _hover={{ bg: isCurrentUser ? "purple.200" : "gray.100", transform: "translateX(2px)" }}
                      transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                    >
                      <Td py={2.5} textAlign="center" verticalAlign="middle" w="65px">
                        {getRankBadge(rank)}
                      </Td>
                      <Td py={2.5} verticalAlign="middle" minW={0}>
                        <HStack spacing={0.5} display="flex" w="full" minW={0} alignItems="center">
                          <Text
                            fontSize="13px"
                            fontWeight={isCurrentUser ? "950" : "bold"}
                            color={isCurrentUser ? "purple.800" : "gray.750"}
                            noOfLines={1}
                            flexShrink={1}
                            minW={0}
                            whiteSpace="nowrap"
                          >
                            {entry.name}
                          </Text>
                          {entry.id && (
                            <Text
                              as="span"
                              flexShrink={0}
                              fontSize="10px"
                              color={isCurrentUser ? "purple.600" : "gray.400"}
                              fontWeight="bold"
                              fontFamily="monospace"
                              whiteSpace="nowrap"
                            >
                              -{entry.id}
                            </Text>
                          )}
                          {isCurrentUser && (
                            <Badge
                              flexShrink={0}
                              bg="purple.500"
                              color="white"
                              fontSize="9px"
                              px={1.5}
                              py={0.1}
                              rounded="md"
                              ml={1.5}
                            >
                              YOU
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td py={2.5} textAlign="right" verticalAlign="middle" pr={5} w="90px">
                        <Text
                          fontSize="14px"
                          fontWeight="black"
                          fontFamily="monospace"
                          color={isCurrentUser ? "purple.900" : "purple.700"}
                        >
                          {entry.score.toLocaleString()}
                        </Text>
                      </Td>
                    </Tr>
                  );
                })}
                {/* Pad empty rows if page is not full to keep height stable */}
                {displayedRankings.length < itemsPerPage && 
                  Array.from({ length: itemsPerPage - displayedRankings.length }).map((_, i) => (
                    <Tr key={`empty-${i}`} h="34px">
                      <Td colSpan={3}></Td>
                    </Tr>
                  ))
                }
              </Tbody>
            </Table>
          </Box>

          {/* Sleek Pagination Controls */}
          <HStack spacing={1.5} justify="center" w="full">
            <Button
              size="xs"
              variant="outline"
              isDisabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              _hover={{ bg: "gray.100" }}
              _active={{ bg: "gray.200" }}
              px={2}
              minW="28px"
              h="26px"
              fontSize="11px"
              borderColor="gray.200"
              color="purple.600"
              fontWeight="black"
            >
              &lt;
            </Button>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === currentPage;
              return (
                <Button
                  key={pageNum}
                  size="xs"
                  variant={isActive ? "solid" : "outline"}
                  onClick={() => setCurrentPage(pageNum)}
                  fontSize="11px"
                  fontWeight="black"
                  h="26px"
                  w="26px"
                  minW="auto"
                  shadow={isActive ? "sm" : "none"}
                  _hover={!isActive ? { bg: "gray.100" } : {}}
                  borderColor={isActive ? "transparent" : "gray.200"}
                  color={isActive ? "white" : "purple.600"}
                  bg={isActive ? "purple.600" : "transparent"}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              size="xs"
              variant="outline"
              isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              _hover={{ bg: "gray.100" }}
              _active={{ bg: "gray.200" }}
              px={2}
              minW="28px"
              h="26px"
              fontSize="11px"
              borderColor="gray.200"
              color="purple.600"
              fontWeight="black"
            >
              &gt;
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
};
