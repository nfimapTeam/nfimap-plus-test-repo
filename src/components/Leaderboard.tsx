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
}

interface RankingEntry {
  name: string;
  score: number;
  created_at: string;
}

const mockRankings: RankingEntry[] = [
  { name: "회승이목청대장", score: 85200, created_at: new Date().toISOString() },
  { name: "옥탑방고양이", score: 76400, created_at: new Date().toISOString() },
  { name: "재현이의스틱", score: 68900, created_at: new Date().toISOString() },
  { name: "승협보컬갓", score: 61200, created_at: new Date().toISOString() },
  { name: "차훈고양이발톱", score: 55600, created_at: new Date().toISOString() },
  { name: "동성베이스폭주", score: 48900, created_at: new Date().toISOString() },
  { name: "환절기무한반복", score: 42100, created_at: new Date().toISOString() },
  { name: "엔플라잉짱짱맨", score: 35000, created_at: new Date().toISOString() },
  { name: "티켓팅마스터", score: 29000, created_at: new Date().toISOString() },
  { name: "이선좌컬렉터", score: 18000, created_at: new Date().toISOString() },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  ticketType,
  currentUserName,
  currentUserScore,
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
            .select("name, score, created_at")
            .eq("ticket_type", ticketType)
            .order("score", { ascending: false })
            .limit(100);

          if (error) throw error;
          
          let rawList = (data as RankingEntry[]) || [];

          // Deduplicate names, keeping the highest score (first occurrence)
          const uniqueList: RankingEntry[] = [];
          const seenNames = new Set<string>();
          for (const item of rawList) {
            if (!seenNames.has(item.name)) {
              seenNames.add(item.name);
              uniqueList.push(item);
            }
          }

          // If current user is not in top unique list, append
          if (currentUserName && currentUserScore !== undefined) {
            const hasUser = uniqueList.some((item) => item.name === currentUserName);
            if (!hasUser) {
              uniqueList.push({
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
            const existingIdx = savedList.findIndex((item) => item.name === currentUserName);
            if (existingIdx !== -1) {
              if (currentUserScore > savedList[existingIdx].score) {
                savedList[existingIdx].score = currentUserScore;
              }
            } else {
              savedList.push({
                name: currentUserName,
                score: currentUserScore,
                created_at: new Date().toISOString(),
              });
            }
          }

          savedList.sort((a, b) => b.score - a.score);
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
  }, [ticketType, currentUserName, currentUserScore]);

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
    if (currentUserName && currentUserScore !== undefined && rankings.length > 0) {
      const userIndex = rankings.findIndex(
        (item) => item.name === currentUserName && item.score === currentUserScore
      );
      if (userIndex !== -1 && userIndex < 50) {
        const userPage = Math.floor(userIndex / itemsPerPage) + 1;
        setCurrentPage(userPage);
      }
    }
  }, [rankings, currentUserName, currentUserScore]);

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
        color="purple.300"
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
      bg="rgba(10, 8, 20, 0.95)"
      border="1px solid"
      borderColor="rgba(168, 85, 247, 0.25)"
      p={5}
      rounded="2xl"
      shadow="0 15px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      color="white"
      maxW="400px"
      mx="auto"
      position="relative"
      backdropFilter="blur(12px)"
    >
      <VStack spacing={2} w="full" align="center">
        <Heading
          fontSize="22px"
          fontWeight="900"
          bgGradient="linear(to-r, #FFFFFF, #E2E8F0, #A78BFA)"
          bgClip="text"
          textAlign="center"
          letterSpacing="2px"
        >
          대환장모드 랭킹
        </Heading>
        <Box
          px={3}
          py={1}
          bg="rgba(255, 255, 255, 0.04)"
          border="1px solid rgba(255, 255, 255, 0.08)"
          borderRadius="full"
          boxShadow="inset 0 1px 1px rgba(255,255,255,0.1)"
        >
          <Text
            fontSize="9px"
            color="purple.200"
            fontWeight="black"
            letterSpacing="1.5px"
            textAlign="center"
          >
            {ticketType === "nfiapark" ? "엔피아파크" : "엔피아링크"} CRAZY MODE TOP 50
          </Text>
        </Box>
      </VStack>

      {loading ? (
        <VStack py={20} h="380px" justify="center">
          <Spinner color="purple.400" size="xl" thickness="4px" />
          <Text fontSize="12px" color="purple.300" mt={3} fontWeight="bold" letterSpacing="1px">
            서버 동기화 중...
          </Text>
        </VStack>
      ) : error ? (
        <VStack py={20} h="380px" justify="center" textAlign="center">
          <Text fontSize="14px" color="red.400" fontWeight="bold">
            {error}
          </Text>
        </VStack>
      ) : (
        <VStack w="full" spacing={4}>
          <Box
            w="full"
            h="360px"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.06)"
            rounded="xl"
            bg="rgba(255, 255, 255, 0.01)"
            overflow="hidden"
          >
            <Table size="sm" variant="unstyled">
              <Thead bg="rgba(255, 255, 255, 0.03)" borderBottom="1px solid" borderColor="rgba(255, 255, 255, 0.08)">
                <Tr>
                  <Th py={3} color="purple.200" fontSize="10px" fontWeight="black" textAlign="center" w="80px" letterSpacing="1px">RANK</Th>
                  <Th py={3} color="purple.200" fontSize="10px" fontWeight="black" letterSpacing="1px">PLAYER</Th>
                  <Th py={3} color="purple.200" fontSize="10px" fontWeight="black" textAlign="right" pr={5} letterSpacing="1px">SCORE</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedRankings.map((entry, idx) => {
                  const rank = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isCurrentUser = entry.name === currentUserName;
                  
                  return (
                    <Tr
                      key={idx}
                      bg={isCurrentUser ? "rgba(168, 85, 247, 0.12)" : "transparent"}
                      borderBottom="1px solid"
                      borderColor="rgba(255, 255, 255, 0.03)"
                      _hover={{ bg: isCurrentUser ? "rgba(168, 85, 247, 0.18)" : "rgba(255, 255, 255, 0.03)", transform: "translateX(2px)" }}
                      transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                    >
                      <Td py={2.5} textAlign="center" verticalAlign="middle">
                        {getRankBadge(rank)}
                      </Td>
                      <Td py={2.5} verticalAlign="middle">
                        <HStack spacing={1.5} display="inline-flex" verticalAlign="middle">
                          <Text
                            fontSize="13px"
                            fontWeight={isCurrentUser ? "950" : "bold"}
                            color={isCurrentUser ? "#F472B6" : "gray.200"}
                            noOfLines={1}
                            maxW="110px"
                          >
                            {entry.name}
                          </Text>
                          {isCurrentUser && (
                            <Badge flexShrink={0} bg="#EC4899" color="white" fontSize="9px" px={1.5} py={0.1} rounded="md" shadow="0 0 5px #EC4899">
                              YOU
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td py={2.5} textAlign="right" verticalAlign="middle" pr={5}>
                        <Text
                          fontSize="14px"
                          fontWeight="black"
                          fontFamily="monospace"
                          color={isCurrentUser ? "#FFEA79" : "purple.100"}
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
              _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
              _active={{ bg: "rgba(255, 255, 255, 0.1)" }}
              px={2}
              minW="28px"
              h="26px"
              fontSize="11px"
              borderColor="rgba(255, 255, 255, 0.08)"
              color="purple.300"
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
                  shadow={isActive ? "0 2px 8px rgba(139, 92, 246, 0.4)" : "none"}
                  _hover={!isActive ? { bg: "rgba(255, 255, 255, 0.05)" } : {}}
                  borderColor={isActive ? "transparent" : "rgba(255, 255, 255, 0.08)"}
                  color={isActive ? "white" : "purple.300"}
                  bg={isActive ? "linear-gradient(to-r, #EC4899, #8B5CF6)" : "transparent"}
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
              _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
              _active={{ bg: "rgba(255, 255, 255, 0.1)" }}
              px={2}
              minW="28px"
              h="26px"
              fontSize="11px"
              borderColor="rgba(255, 255, 255, 0.08)"
              color="purple.300"
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
